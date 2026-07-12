import React, { useMemo } from 'react';
import type { CrowdZone, VenueGate, TransitHub } from '../types';

interface StadiumMapProps {
  zones: CrowdZone[];
  gates: VenueGate[];
  transitHubs: TransitHub[];
  highlights: string[];
  activeIncidentZones: string[];
  onElementClick?: (id: string, name: string, type: 'zone' | 'gate' | 'transit') => void;
}

export const StadiumMap: React.FC<StadiumMapProps> = ({
  zones,
  gates,
  transitHubs,
  highlights,
  activeIncidentZones,
  onElementClick
}) => {
  // Convert list to lookup maps for O(1) rendering efficiency
  const zonesMap = useMemo(() => {
    const map = new Map<string, CrowdZone>();
    zones.forEach(z => map.set(z.zoneId, z));
    return map;
  }, [zones]);

  const gatesMap = useMemo(() => {
    const map = new Map<string, VenueGate>();
    gates.forEach(g => map.set(g.gateId, g));
    return map;
  }, [gates]);

  const transitMap = useMemo(() => {
    const map = new Map<string, TransitHub>();
    transitHubs.forEach(t => map.set(t.hubId, t));
    return map;
  }, [transitHubs]);

  // Color mapping based on density threshold
  const getDensityColor = (density: number) => {
    if (density > 80) return '#f43f5e'; // rose-500 (HIGH)
    if (density > 50) return '#eab308'; // yellow-500 (MEDIUM)
    return '#10b981'; // emerald-500 (LOW)
  };

  const getDensityClass = (density: number) => {
    if (density > 80) return 'text-rose-400 bg-rose-950/40 border-rose-500/50';
    if (density > 50) return 'text-yellow-400 bg-yellow-950/40 border-yellow-500/50';
    return 'text-cyan-400 bg-cyan-950/40 border-cyan-500/50';
  };

  const handleItemClick = (id: string, name: string, type: 'zone' | 'gate' | 'transit') => {
    if (onElementClick) {
      onElementClick(id, name, type);
    }
  };

  return (
    <div className="w-full bg-emerald-900 border border-emerald-800 rounded-2xl p-6 flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-emerald-50 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-lime-400 animate-pulse"></span>
            Interactive Stadium Visualizer
          </h3>
          <p className="text-xs text-emerald-300">Click stand, gate, or transit to ask AI about it directly.</p>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-cyan-500"></span>
            <span className="text-emerald-200">Low (&le;50%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-yellow-500"></span>
            <span className="text-emerald-200">Mid (51-80%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500"></span>
            <span className="text-emerald-200">High (&gt;80%)</span>
          </div>
        </div>
      </div>

      {/* Interactive SVG Stadium */}
      <div className="relative w-full max-w-[500px] aspect-square bg-emerald-950/50 rounded-xl border border-emerald-900/60 p-4">
        <svg viewBox="0 0 400 400" className="w-full h-full select-none">
          {/* Outer Ring boundary */}
          <circle cx="200" cy="200" r="185" fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />

          {/* Central Soccer Pitch */}
          <g transform="translate(145, 160)">
            <rect width="110" height="80" fill="#0f172a" stroke="#475569" strokeWidth="2" rx="4" />
            <circle cx="55" cy="40" r="18" fill="none" stroke="#475569" strokeWidth="1.5" />
            <line x1="55" y1="0" x2="55" y2="80" stroke="#475569" strokeWidth="1.5" />
            <rect x="0" y="20" width="12" height="40" fill="none" stroke="#475569" strokeWidth="1.5" />
            <rect x="98" y="20" width="12" height="40" fill="none" stroke="#475569" strokeWidth="1.5" />
          </g>

          {/* STANDS (ZONES) */}
          {/* Zone-A: North Stand (Top) */}
          {(() => {
            const z = zonesMap.get('Zone-A');
            const density = z?.density || 0;
            const hasHighlight = highlights.includes('Zone-A');
            const color = getDensityColor(density);
            const isIncident = activeIncidentZones.includes('Zone-A');

            return (
              <g 
                onClick={() => handleItemClick('Zone-A', 'Zone A (North Stand)', 'zone')}
                className="cursor-pointer group"
              >
                <path
                  d="M 80,110 A 150,150 0 0,1 320,110 L 290,140 A 110,110 0 0,0 110,140 Z"
                  fill={color}
                  fillOpacity={hasHighlight ? 0.95 : 0.45}
                  stroke={hasHighlight ? '#14b8a6' : isIncident ? '#ef4444' : '#1e293b'}
                  strokeWidth={hasHighlight ? 4 : isIncident ? 2.5 : 1.5}
                  className="transition-all duration-300 group-hover:fill-opacity-80"
                />
                <title>{`Zone A (North Stand)\nDensity: ${density}%\nCapacity: ${z?.currentCount.toLocaleString()} / ${z?.capacity.toLocaleString()}`}</title>
                {/* Highlight Glow Effect */}
                {hasHighlight && (
                  <path
                    d="M 80,110 A 150,150 0 0,1 320,110"
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="8"
                    opacity="0.4"
                    className="animate-pulse"
                  />
                )}
                {/* Incident Warning marker */}
                {isIncident && (
                  <circle cx="200" cy="115" r="8" fill="#ef4444" className="animate-ping" />
                )}
                <text x="200" y="130" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="700">ZONE A</text>
              </g>
            );
          })()}

          {/* Zone-B: East Stand (Right) */}
          {(() => {
            const z = zonesMap.get('Zone-B');
            const density = z?.density || 0;
            const hasHighlight = highlights.includes('Zone-B');
            const color = getDensityColor(density);
            const isIncident = activeIncidentZones.includes('Zone-B');

            return (
              <g 
                onClick={() => handleItemClick('Zone-B', 'Zone B (East Stand)', 'zone')}
                className="cursor-pointer group"
              >
                <path
                  d="M 330,120 A 150,150 0 0,1 330,280 L 295,250 A 110,110 0 0,0 295,150 Z"
                  fill={color}
                  fillOpacity={hasHighlight ? 0.95 : 0.45}
                  stroke={hasHighlight ? '#14b8a6' : isIncident ? '#ef4444' : '#1e293b'}
                  strokeWidth={hasHighlight ? 4 : isIncident ? 2.5 : 1.5}
                  className="transition-all duration-300 group-hover:fill-opacity-80"
                />
                <title>{`Zone B (East Stand)\nDensity: ${density}%\nCapacity: ${z?.currentCount.toLocaleString()} / ${z?.capacity.toLocaleString()}`}</title>
                {hasHighlight && (
                  <path
                    d="M 330,120 A 150,150 0 0,1 330,280"
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="8"
                    opacity="0.4"
                    className="animate-pulse"
                  />
                )}
                {isIncident && (
                  <circle cx="310" cy="200" r="8" fill="#ef4444" className="animate-ping" />
                )}
                <text x="310" y="204" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="700" transform="rotate(90, 310, 200)">ZONE B</text>
              </g>
            );
          })()}

          {/* Zone-C: South Stand (Bottom) */}
          {(() => {
            const z = zonesMap.get('Zone-C');
            const density = z?.density || 0;
            const hasHighlight = highlights.includes('Zone-C');
            const color = getDensityColor(density);
            const isIncident = activeIncidentZones.includes('Zone-C');

            return (
              <g 
                onClick={() => handleItemClick('Zone-C', 'Zone C (South Stand)', 'zone')}
                className="cursor-pointer group"
              >
                <path
                  d="M 320,290 A 150,150 0 0,1 80,290 L 110,260 A 110,110 0 0,0 290,260 Z"
                  fill={color}
                  fillOpacity={hasHighlight ? 0.95 : 0.45}
                  stroke={hasHighlight ? '#14b8a6' : isIncident ? '#ef4444' : '#1e293b'}
                  strokeWidth={hasHighlight ? 4 : isIncident ? 2.5 : 1.5}
                  className="transition-all duration-300 group-hover:fill-opacity-80"
                />
                <title>{`Zone C (South Stand)\nDensity: ${density}%\nCapacity: ${z?.currentCount.toLocaleString()} / ${z?.capacity.toLocaleString()}`}</title>
                {hasHighlight && (
                  <path
                    d="M 320,290 A 150,150 0 0,1 80,290"
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="8"
                    opacity="0.4"
                    className="animate-pulse"
                  />
                )}
                {isIncident && (
                  <circle cx="200" cy="285" r="8" fill="#ef4444" className="animate-ping" />
                )}
                <text x="200" y="278" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="700">ZONE C</text>
              </g>
            );
          })()}

          {/* Zone-D: West Stand (Left) */}
          {(() => {
            const z = zonesMap.get('Zone-D');
            const density = z?.density || 0;
            const hasHighlight = highlights.includes('Zone-D');
            const color = getDensityColor(density);
            const isIncident = activeIncidentZones.includes('Zone-D');

            return (
              <g 
                onClick={() => handleItemClick('Zone-D', 'Zone D (West Stand)', 'zone')}
                className="cursor-pointer group"
              >
                <path
                  d="M 70,280 A 150,150 0 0,1 70,120 L 105,150 A 110,110 0 0,0 105,250 Z"
                  fill={color}
                  fillOpacity={hasHighlight ? 0.95 : 0.45}
                  stroke={hasHighlight ? '#14b8a6' : isIncident ? '#ef4444' : '#1e293b'}
                  strokeWidth={hasHighlight ? 4 : isIncident ? 2.5 : 1.5}
                  className="transition-all duration-300 group-hover:fill-opacity-80"
                />
                <title>{`Zone D (West Stand)\nDensity: ${density}%\nCapacity: ${z?.currentCount.toLocaleString()} / ${z?.capacity.toLocaleString()}`}</title>
                {hasHighlight && (
                  <path
                    d="M 70,280 A 150,150 0 0,1 70,120"
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="8"
                    opacity="0.4"
                    className="animate-pulse"
                  />
                )}
                {isIncident && (
                  <circle cx="90" cy="200" r="8" fill="#ef4444" className="animate-ping" />
                )}
                <text x="90" y="204" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="700" transform="rotate(-90, 90, 200)">ZONE D</text>
              </g>
            );
          })()}

          {/* GATES (OUTER PERIMETER POINTS) */}
          {/* Gate-1: Top/North */}
          {(() => {
            const g = gatesMap.get('Gate-1');
            const hasHighlight = highlights.includes('Gate-1');
            return (
              <g 
                onClick={() => handleItemClick('Gate-1', 'Gate 1 (North Entrance)', 'gate')}
                className="cursor-pointer group"
              >
                <circle
                  cx="200"
                  cy="40"
                  r="14"
                  fill={hasHighlight ? '#14b8a6' : '#1e293b'}
                  stroke={hasHighlight ? '#2dd4bf' : '#475569'}
                  strokeWidth={hasHighlight ? 3 : 1.5}
                  className="transition-all duration-300 group-hover:scale-110"
                />
                <text x="200" y="44" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="800">G1</text>
                <title>{`Gate 1 (North Entrance)\nAccessibility: ADA Compliant\nNotes: ${g?.notes || ''}`}</title>
                
                {/* ADA Glowing Blue Indicator */}
                {g?.isADACompliant && (
                  <g transform="translate(210, 30)">
                    <circle r="6" fill="#0ea5e9" stroke="#0f172a" strokeWidth="1" className="animate-pulse" />
                    <text y="2.2" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">♿</text>
                  </g>
                )}
                {hasHighlight && (
                  <circle cx="200" cy="40" r="22" fill="none" stroke="#14b8a6" strokeWidth="2" opacity="0.6" className="animate-ping" />
                )}
              </g>
            );
          })()}

          {/* Gate-2: Right/East */}
          {(() => {
            const g = gatesMap.get('Gate-2');
            const hasHighlight = highlights.includes('Gate-2');
            return (
              <g 
                onClick={() => handleItemClick('Gate-2', 'Gate 2 (East Entrance)', 'gate')}
                className="cursor-pointer group"
              >
                <circle
                  cx="360"
                  cy="200"
                  r="14"
                  fill={hasHighlight ? '#14b8a6' : '#1e293b'}
                  stroke={hasHighlight ? '#2dd4bf' : '#475569'}
                  strokeWidth={hasHighlight ? 3 : 1.5}
                  className="transition-all duration-300 group-hover:scale-110"
                />
                <text x="360" y="204" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="800">G2</text>
                <title>{`Gate 2 (East Entrance)\nAccessibility: Stairs only\nNotes: ${g?.notes || ''}`}</title>
                {hasHighlight && (
                  <circle cx="360" cy="200" r="22" fill="none" stroke="#14b8a6" strokeWidth="2" opacity="0.6" className="animate-ping" />
                )}
              </g>
            );
          })()}

          {/* Gate-3: Bottom/South */}
          {(() => {
            const g = gatesMap.get('Gate-3');
            const hasHighlight = highlights.includes('Gate-3');
            return (
              <g 
                onClick={() => handleItemClick('Gate-3', 'Gate 3 (South Entrance)', 'gate')}
                className="cursor-pointer group"
              >
                <circle
                  cx="200"
                  cy="360"
                  r="14"
                  fill={hasHighlight ? '#14b8a6' : '#1e293b'}
                  stroke={hasHighlight ? '#2dd4bf' : '#475569'}
                  strokeWidth={hasHighlight ? 3 : 1.5}
                  className="transition-all duration-300 group-hover:scale-110"
                />
                <text x="200" y="364" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="800">G3</text>
                <title>{`Gate 3 (South Entrance)\nAccessibility: ADA Compliant\nNotes: ${g?.notes || ''}`}</title>
                
                {/* ADA Glowing Blue Indicator */}
                {g?.isADACompliant && (
                  <g transform="translate(210, 350)">
                    <circle r="6" fill="#0ea5e9" stroke="#0f172a" strokeWidth="1" className="animate-pulse" />
                    <text y="2.2" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">♿</text>
                  </g>
                )}
                {hasHighlight && (
                  <circle cx="200" cy="360" r="22" fill="none" stroke="#14b8a6" strokeWidth="2" opacity="0.6" className="animate-ping" />
                )}
              </g>
            );
          })()}

          {/* Gate-4: Left/West */}
          {(() => {
            const g = gatesMap.get('Gate-4');
            const hasHighlight = highlights.includes('Gate-4');
            return (
              <g 
                onClick={() => handleItemClick('Gate-4', 'Gate 4 (West Entrance)', 'gate')}
                className="cursor-pointer group"
              >
                <circle
                  cx="40"
                  cy="200"
                  r="14"
                  fill={hasHighlight ? '#14b8a6' : '#1e293b'}
                  stroke={hasHighlight ? '#2dd4bf' : '#475569'}
                  strokeWidth={hasHighlight ? 3 : 1.5}
                  className="transition-all duration-300 group-hover:scale-110"
                />
                <text x="40" y="204" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="800">G4</text>
                <title>{`Gate 4 (West Entrance)\nAccessibility: Turnstiles only\nNotes: ${g?.notes || ''}`}</title>
                {hasHighlight && (
                  <circle cx="40" cy="200" r="22" fill="none" stroke="#14b8a6" strokeWidth="2" opacity="0.6" className="animate-ping" />
                )}
              </g>
            );
          })()}

          {/* TRANSIT HUBS */}
          {/* Hub-1: Metro Central (Top Right) */}
          {(() => {
            const h = transitMap.get('Hub-1');
            const hasHighlight = highlights.includes('Hub-1');
            return (
              <g 
                onClick={() => handleItemClick('Hub-1', 'Metro Station Central', 'transit')}
                className="cursor-pointer group"
              >
                <rect
                  x="280"
                  y="20"
                  width="44"
                  height="22"
                  rx="4"
                  fill={hasHighlight ? '#14b8a6' : '#0f172a'}
                  stroke={hasHighlight ? '#2dd4bf' : '#334155'}
                  strokeWidth={hasHighlight ? 2.5 : 1.5}
                  className="transition-all duration-300 group-hover:fill-emerald-800"
                />
                <text x="302" y="34" textAnchor="middle" fill={hasHighlight ? '#0f172a' : '#38bdf8'} fontSize="8" fontWeight="800">METRO</text>
                <title>{`Transit: ${h?.name || ''}\nType: Train (Zero Emission)\nNear: Gate 1 & Gate 2`}</title>
              </g>
            );
          })()}

          {/* Hub-2: Bus Terminal West (Left Bottom) */}
          {(() => {
            const h = transitMap.get('Hub-2');
            const hasHighlight = highlights.includes('Hub-2');
            return (
              <g 
                onClick={() => handleItemClick('Hub-2', 'Bus Terminal West', 'transit')}
                className="cursor-pointer group"
              >
                <rect
                  x="15"
                  y="270"
                  width="44"
                  height="22"
                  rx="4"
                  fill={hasHighlight ? '#14b8a6' : '#0f172a'}
                  stroke={hasHighlight ? '#2dd4bf' : '#334155'}
                  strokeWidth={hasHighlight ? 2.5 : 1.5}
                  className="transition-all duration-300 group-hover:fill-emerald-800"
                />
                <text x="37" y="284" textAnchor="middle" fill={hasHighlight ? '#0f172a' : '#10b981'} fontSize="8" fontWeight="800">BUS</text>
                <title>{`Transit: ${h?.name || ''}\nType: Electric Shuttle (Zero Emission)\nNear: Gate 4`}</title>
              </g>
            );
          })()}

          {/* Hub-3: Rideshare South (Bottom South) */}
          {(() => {
            const h = transitMap.get('Hub-3');
            const hasHighlight = highlights.includes('Hub-3');
            return (
              <g 
                onClick={() => handleItemClick('Hub-3', 'Rideshare Zone South', 'transit')}
                className="cursor-pointer group"
              >
                <rect
                  x="230"
                  y="350"
                  width="48"
                  height="22"
                  rx="4"
                  fill={hasHighlight ? '#14b8a6' : '#0f172a'}
                  stroke={hasHighlight ? '#2dd4bf' : '#334155'}
                  strokeWidth={hasHighlight ? 2.5 : 1.5}
                  className="transition-all duration-300 group-hover:fill-emerald-800"
                />
                <text x="254" y="364" textAnchor="middle" fill={hasHighlight ? '#0f172a' : '#fb923c'} fontSize="8" fontWeight="800">RIDE</text>
                <title>{`Transit: ${h?.name || ''}\nType: Taxi/Rideshare\nNear: Gate 3`}</title>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Density status overlay cards */}
      <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        {zones.map(z => {
          const isIncident = activeIncidentZones.includes(z.zoneId);
          return (
            <div
              key={z.zoneId}
              onClick={() => handleItemClick(z.zoneId, z.name, 'zone')}
              className={`p-3 rounded-xl border transition-all cursor-pointer hover:border-lime-500/50 ${getDensityClass(z.density)} ${
                highlights.includes(z.zoneId) ? 'ring-2 ring-lime-400 scale-[1.02]' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider">{z.name}</span>
                {isIncident && (
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>
                )}
              </div>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-xl font-extrabold tracking-tight">{z.density}%</span>
                <span className="text-[10px] opacity-75">cap</span>
              </div>
              <div className="mt-1 w-full bg-emerald-950/60 rounded-full h-1">
                <div
                  className="h-1 rounded-full transition-all duration-500"
                  style={{
                    width: `${z.density}%`,
                    backgroundColor: getDensityColor(z.density)
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
