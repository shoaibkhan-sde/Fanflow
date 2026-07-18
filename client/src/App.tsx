import { useState, useEffect, useCallback } from 'react';
import type { CrowdZone, VenueGate, TransitHub, Incident } from './types';
import { StadiumMap } from './components/StadiumMap';
import { FanConcierge } from './components/FanConcierge';
import { OpsDashboard } from './components/OpsDashboard';
import { LoadingScreen } from './components/LoadingScreen';
import { NavBar } from './components/NavBar';
import { Footer } from './components/Footer';
import { MotionConfig, AnimatePresence } from 'framer-motion';
import { Compass, LayoutDashboard, Info, Menu, X, Wrench, Shield } from 'lucide-react';

function App() {
  // Views toggle: 'fan' | 'ops'
  const [activePersona, setActivePersona] = useState<'fan' | 'ops'>('fan');
  const [showLoader, setShowLoader] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('fanflow-loaded');
    }
    return true;
  });

  // Backend state
  const [venueName, setVenueName] = useState('Fanflow Arena');
  const [zones, setZones] = useState<CrowdZone[]>([]);
  const [gates, setGates] = useState<VenueGate[]>([]);
  const [transitHubs, setTransitHubs] = useState<TransitHub[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Concierge highlighted gates/zones/transits
  const [mapHighlights, setMapHighlights] = useState<string[]>([]);
  const [accessibilityMode, setAccessibilityMode] = useState(false);

  // Toast alert notification states
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'info' | 'success' | 'warn' }[]>([]);
  const [externalQuery, setExternalQuery] = useState<string | undefined>(undefined);
  const [demoStep, setDemoStep] = useState(1);

  const showToast = (message: string, type: 'info' | 'success' | 'warn') => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Fetch static layouts
  const fetchStaticLayout = async () => {
    try {
      const res = await fetch('/api/venue');
      if (res.ok) {
        const data = await res.json();
        setVenueName(data.stadiumName);
        setGates(data.gates);
        setTransitHubs(data.transitHubs);
      }
    } catch (e) {
      console.error('Failed fetching venue metadata', e);
    }
  };

  // Fetch live crowd capacities and incidents
  const fetchLiveTelemetry = useCallback(async () => {
    setIsLoading(true);
    try {
      const [crowdRes, incidentRes] = await Promise.all([
        fetch('/api/crowd'),
        fetch('/api/incidents')
      ]);

      if (crowdRes.ok) {
        const crowdData = await crowdRes.json();
        setZones(crowdData);
      }

      if (incidentRes.ok) {
        const incidentData = await incidentRes.json();
        setIncidents(prev => {
          // If there's a new incident, push a toast alert
          if (incidentData.length > prev.length && prev.length > 0) {
            const newInc = incidentData[0];
            showToast(`Incident Alert: ${newInc.summary} reported in ${newInc.zoneId}!`, 'warn');
          }
          return incidentData;
        });
      }
    } catch (e) {
      console.error('Failed syncing telemetry updates', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Manual debug trigger to shift densities and verify AI rerouting
  const handleAdjustDensity = async (zoneId: string, percentChange: number) => {
    try {
      const res = await fetch('/api/test/density', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneId, changePercent: percentChange })
      });
      if (res.ok) {
        const updatedZones = await res.json();
        setZones(updatedZones);
      }
    } catch (e) {
      console.error('Failed manual density adjustment', e);
    }
  };

  // Seeding effect
  useEffect(() => {
    fetchStaticLayout();
    fetchLiveTelemetry();

    // Setup polling every 10 seconds for live simulation ticks to avoid rate limiting
    const pollId = setInterval(() => {
      fetchLiveTelemetry();
    }, 10000);

    return () => clearInterval(pollId);
  }, [fetchLiveTelemetry]);

  // Extract zone IDs that have active, unresolved incidents
  const activeIncidentZones = incidents
    .filter(i => i.status === 'active')
    .map(i => i.zoneId);

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        {showLoader && (
          <LoadingScreen
            onComplete={() => {
              sessionStorage.setItem('fanflow-loaded', 'true');
              setShowLoader(false);
            }}
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-emerald-950 flex flex-col relative overflow-hidden">
        
        {/* Header navigation bar */}
        <NavBar 
          venueName={venueName}
          activePersona={activePersona}
          setActivePersona={setActivePersona}
          setMapHighlights={setMapHighlights}
          accessibilityMode={accessibilityMode}
          setAccessibilityMode={setAccessibilityMode}
        />

        {/* Main layout container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {activePersona === 'fan' ? (
              <>
                {/* Left side: Interactive Map */}
                <div className="lg:col-span-12 space-y-4">
                  <StadiumMap
                    zones={zones}
                    gates={gates}
                    transitHubs={transitHubs}
                    highlights={mapHighlights}
                    activeIncidentZones={activeIncidentZones}
                    onElementClick={(_id, name, type) => {
                      let queryText = '';
                      if (type === 'zone') {
                        queryText = `What is the current crowd status at ${name}? Is it safe to go there?`;
                      } else if (type === 'gate') {
                         queryText = `Tell me about ${name}. What is the density and can I use it to enter?`;
                      } else if (type === 'transit') {
                        queryText = `How do I navigate to ${name}? Are there any carbon-friendly guidelines?`;
                      }
                      setActivePersona('fan');
                      setExternalQuery(queryText);
                      showToast(`Querying Fanflow AI about ${name}...`, 'info');
                    }}
                  />
                </div>


              </>
            ) : (
              <>
                {/* Left side column: Interactive map */}
                <div className="lg:col-span-5 space-y-4">
                  <StadiumMap
                    zones={zones}
                    gates={gates}
                    transitHubs={transitHubs}
                    highlights={mapHighlights}
                    activeIncidentZones={activeIncidentZones}
                    onElementClick={(_id, name, type) => {
                      let queryText = '';
                      if (type === 'zone') {
                        queryText = `What is the current crowd status at ${name}? Is it safe to go there?`;
                      } else if (type === 'gate') {
                         queryText = `Tell me about ${name}. What is the density and can I use it to enter?`;
                      } else if (type === 'transit') {
                        queryText = `How do I navigate to ${name}? Are there any carbon-friendly guidelines?`;
                      }
                      setActivePersona('fan');
                      setExternalQuery(queryText);
                      showToast(`Querying Fanflow AI about ${name}...`, 'info');
                    }}
                  />
                </div>

                {/* Right side column: Active view panel */}
                <div className="lg:col-span-7">
                  <div id="ops-view-panel" role="tabpanel" aria-labelledby="ops-tab">
                    <OpsDashboard
                      zones={zones}
                      incidents={incidents}
                      onIncidentReported={fetchLiveTelemetry}
                      onRefreshData={fetchLiveTelemetry}
                      onAdjustDensity={handleAdjustDensity}
                      isLoading={isLoading}
                      onShowToast={showToast}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </main>

        {/* Floating Fan Concierge AI Widget (small bouncing robot button + floating card) */}
        <FanConcierge
          onResponseReceived={(highlights) => setMapHighlights(highlights)}
          accessibilityMode={accessibilityMode}
          setAccessibilityMode={setAccessibilityMode}
          externalQuery={externalQuery}
          onClearExternalQuery={() => setExternalQuery(undefined)}
        />

        {/* Footer */}
        <Footer />

        {/* Fixed Toast alerts container */}
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`p-4 rounded-xl shadow-lg border text-xs font-bold transition-all flex items-center gap-2 pointer-events-auto ${
                t.type === 'success' ? 'bg-emerald-950 border-emerald-500 text-emerald-400' :
                t.type === 'warn' ? 'bg-rose-950 border-rose-500 text-rose-400' :
                'bg-slate-900 border-slate-850 text-teal-400'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current animate-ping"></span>
              {t.message}
            </div>
          ))}
        </div>
      </div>
    </MotionConfig>
  );
}

export default App;
