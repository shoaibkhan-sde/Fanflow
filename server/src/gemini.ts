import { GoogleGenerativeAI } from '@google/generative-ai';
import { logJSON } from './middleware';
import { getVenueLayout, getCrowdDensities, getIncidents, CrowdZone, VenueGate, TransitHub, Incident } from './db';

// Initialize the Gemini API client if key is present
const apiKey = process.env.GEMINI_API_KEY;
let genAI: GoogleGenerativeAI | null = null;

if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
  logJSON('INFO', { requestId: 'BOOT', method: 'GEMINI', url: 'init', message: 'Gemini API client initialized successfully.' });
} else {
  logJSON('WARN', { requestId: 'BOOT', method: 'GEMINI', url: 'init', message: 'GEMINI_API_KEY is not defined. Fanflow will use high-fidelity mock AI fallbacks.' });
}

// Interfaces for structured AI outputs
export interface ChatAIResponse {
  text: string;
  highlights: string[];
  detectedLanguage: string;
}

export interface IncidentAIResponse {
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  category: 'security' | 'medical' | 'maintenance' | 'transit' | 'other';
  summary: string;
}

// 1. Process Chat with Live Context and Auto-Translation
export async function processChat(
  message: string,
  accessibilityMode: boolean,
  sessionId: string,
  requestId: string
): Promise<ChatAIResponse> {
  // Fetch real-time context
  const venue = await getVenueLayout();
  const densities = await getCrowdDensities();
  const incidents = await getIncidents().then(list => list.filter(i => i.status === 'active'));

  // If no Gemini Client, run mock fallback
  if (!genAI) {
    return generateMockChat(message, accessibilityMode, densities, incidents, requestId);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const systemPrompt = `You are the Fanflow AI Concierge, a real-time, context-aware digital assistant for the FIFA World Cup 2026.
Your job is to provide navigation, accessibility, and transit assistance to fans.

CURRENT VENUE LAYOUT CONTEXT:
${JSON.stringify(venue)}

REAL-TIME CROWD DENSITIES:
${JSON.stringify(densities)}

ACTIVE INCIDENTS REPORTED BY STAFF/VOLUNTEERS:
${JSON.stringify(incidents)}

ACCESSIBILITY MODE ACTIVE: ${accessibilityMode}

INSTRUCTIONS:
1. Auto-detect the language of the user query and respond in the SAME language.
2. If accessibilityMode is true OR if the user mentions accessibility constraints (wheelchair, walking issues, ramps, elevators), prioritize routing them through ADA-compliant gates (Gate-1, Gate-3) and highlight accessibility paths.
3. Crowd-Aware Routing: Look at the REAL-TIME CROWD DENSITIES. Reroute fans away from HIGH density zones or gates (e.g. density > 80%) or zones with active incident blockages (e.g. scanner failures, security). Direct them to gates connected to LOW or MEDIUM density zones.
4. Zero-Emission Transit Guidance: If they ask about transit, rideshares, or leaving, advise them to take public transit like Metro (Hub-1) or Bus (Hub-2) which are zero-emission, unless there is a capacity bottleneck or incident there.
5. Return a JSON object matching this schema:
{
  "text": "Your helpful response string. Use Markdown. Speak in their detected language.",
  "highlights": ["Gate-3", "Zone-C"], // List of Gate IDs (Gate-1, Gate-2, Gate-3, Gate-4), Zone IDs (Zone-A, Zone-B, Zone-C, Zone-D), or Transit Hub IDs (Hub-1, Hub-2, Hub-3) referenced in your guidance.
  "detectedLanguage": "ISO-2 language code (e.g. en, es, fr)"
}
Return ONLY the raw JSON object, no wrapping markdown blocks (e.g. no \`\`\`json).`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Input: "${message}"` }] }]
    });

    const responseText = result.response.text();
    const data = JSON.parse(responseText.trim()) as ChatAIResponse;
    return data;
  } catch (err: any) {
    logJSON('ERROR', { requestId, method: 'GEMINI', url: 'chat', message: 'Gemini chat processing failed. Falling back to mock engine.', error: err.message });
    return generateMockChat(message, accessibilityMode, densities, incidents, requestId);
  }
}

// 2. Process and Triage Incident Reports
export async function triageIncident(
  description: string,
  reportedBy: 'volunteer' | 'staff',
  zoneId: string,
  requestId: string
): Promise<IncidentAIResponse> {
  if (!genAI) {
    return generateMockIncident(description, reportedBy, zoneId, requestId);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `You are the Fanflow Ops Intelligence Agent. Your job is to process incoming incident reports from on-ground volunteers and staff, categorize them, and assign a priority level.

INCIDENT REPORT DETAILS:
- Reporter type: ${reportedBy}
- Zone: ${zoneId}
- Raw description: "${description}"

INSTRUCTIONS:
1. Assess the urgency and impact of the incident.
2. Assign a priority:
   - HIGH: Security threats, fires, medical emergencies, structural failures, or major flow blockages.
   - MEDIUM: Scanner/turnstile breakdowns, minor maintenance issues (leaks, broken seats), moderate crowd delays.
   - LOW: General questions, minor spills, lost items, routine reports.
3. Assign a category: "security", "medical", "maintenance", "transit", or "other".
4. Write a concise, 1-sentence summary of the incident (max 10-12 words).
5. Return a JSON object matching this schema:
{
  "priority": "LOW" | "MEDIUM" | "HIGH",
  "category": "security" | "medical" | "maintenance" | "transit" | "other",
  "summary": "Concise summary sentence"
}
Return ONLY the raw JSON object, no wrapping markdown blocks.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const data = JSON.parse(responseText.trim()) as IncidentAIResponse;
    return data;
  } catch (err: any) {
    logJSON('ERROR', { requestId, method: 'GEMINI', url: 'triage', message: 'Gemini incident triage failed. Falling back to mock engine.', error: err.message });
    return generateMockIncident(description, reportedBy, zoneId, requestId);
  }
}

// --- MOCK FALLBACK IMPLEMENTATIONS ---

function generateMockChat(
  message: string,
  accessibilityMode: boolean,
  densities: CrowdZone[],
  incidents: Incident[],
  requestId: string
): ChatAIResponse {
  logJSON('INFO', { requestId, method: 'GEMINI_MOCK', url: 'chat', message: 'Generating simulated chat response.' });

  const text = message.toLowerCase();
  
  // 1. Language Detection
  let lang = 'en';
  let greeting = 'Hello! Welcome to Fanflow Arena.';
  let gateIntro = 'For your entry/exit,';
  let routeRec = 'We suggest using';
  let accessInfo = 'All accessibility routes are operational.';
  let densityWarning = 'Please note that some areas are experiencing heavy capacity.';
  let transitGuidance = 'We recommend taking zero-emission transit like the Metro (Central Station) or Bus (Terminal West) to minimize carbon footprints.';
  
  if (text.startsWith('hola') || text.includes('como') || text.includes('dónde') || text.includes('gracias') || text.includes('puerta')) {
    lang = 'es';
    greeting = '¡Hola! Bienvenido a Fanflow Arena.';
    gateIntro = 'Para su entrada o salida,';
    routeRec = 'Sugerimos utilizar';
    accessInfo = 'Todas las rutas de accesibilidad están operativas.';
    densityWarning = 'Tenga en cuenta que algunas áreas están experimentando una alta densidad de personas.';
    transitGuidance = 'Recomendamos tomar transporte público de cero emisiones como el Metro (Estación Central) o el Autobús (Terminal Oeste).';
  } else if (text.startsWith('bonjour') || text.includes('comment') || text.includes('où') || text.includes('porte') || text.includes('merci')) {
    lang = 'fr';
    greeting = 'Bonjour! Bienvenue à Fanflow Arena.';
    gateIntro = 'Pour votre entrée/sortie,';
    routeRec = 'Nous vous suggérons d\'utiliser';
    accessInfo = 'Toutes les voies d\'accessibilité sont opérationnelles.';
    densityWarning = 'Veuillez noter que certaines zones connaissent une forte affluence.';
    transitGuidance = 'Nous vous conseillons d\'emprunter des transports à zéro émission comme le Métro (Station Centrale) ou le Bus (Terminal Ouest).';
  }

  // 2. Check for Accessibility Intent
  const hasAccessIntent = accessibilityMode || text.includes('wheelchair') || text.includes('silla') || text.includes('rampa') || text.includes('ramp') || text.includes('elevator') || text.includes('ascensor') || text.includes('disabled') || text.includes('incapacitado') || text.includes('handicap');
  
  // 3. Crowd-Aware Routing logic
  // Find the lowest density zones
  const sortedZones = [...densities].sort((a, b) => a.density - b.density);
  const bestZone = sortedZones[0]; // Zone with lowest crowd density
  const worstZone = sortedZones[sortedZones.length - 1]; // Zone with highest crowd density

  // Select recommended gates
  let recommendedGate = 'Gate-1'; // Default
  let fallbackGate = 'Gate-3';

  // Check if there is an active incident at Gate-1 or Zone-A
  const zoneAIncident = incidents.some(i => i.zoneId === 'Zone-A');
  const zoneBIncident = incidents.some(i => i.zoneId === 'Zone-B');
  const zoneCIncident = incidents.some(i => i.zoneId === 'Zone-C');
  const zoneDIncident = incidents.some(i => i.zoneId === 'Zone-D');

  // Route to the lowest density zone gate
  if (bestZone.zoneId === 'Zone-A' && !zoneAIncident) {
    recommendedGate = 'Gate-1';
  } else if (bestZone.zoneId === 'Zone-B' && !zoneBIncident) {
    recommendedGate = 'Gate-2';
  } else if (bestZone.zoneId === 'Zone-C' && !zoneCIncident) {
    recommendedGate = 'Gate-3';
  } else if (bestZone.zoneId === 'Zone-D' && !zoneDIncident) {
    recommendedGate = 'Gate-4';
  } else {
    // If best zone has incidents, pick the second best
    const secondBest = sortedZones[1];
    if (secondBest.zoneId === 'Zone-A') recommendedGate = 'Gate-1';
    else if (secondBest.zoneId === 'Zone-B') recommendedGate = 'Gate-2';
    else if (secondBest.zoneId === 'Zone-C') recommendedGate = 'Gate-3';
    else recommendedGate = 'Gate-4';
  }

  // If accessibility is flagged, override to ensure an ADA-compliant gate (Gate-1 or Gate-3)
  const highlights: string[] = [];
  let responseText = `${greeting}\n\n`;

  if (hasAccessIntent) {
    // Re-route to Gate-3 (South) or Gate-1 (North) based on lower density
    const zoneADensity = densities.find(d => d.zoneId === 'Zone-A')?.density || 50;
    const zoneCDensity = densities.find(d => d.zoneId === 'Zone-C')?.density || 50;
    
    if (zoneCDensity <= zoneADensity && !zoneCIncident) {
      recommendedGate = 'Gate-3';
      highlights.push('Gate-3', 'Zone-C');
    } else {
      recommendedGate = 'Gate-1';
      highlights.push('Gate-1', 'Zone-A');
    }

    if (lang === 'es') {
      responseText += `♿ **Modo de Accesibilidad Activado**: Recomendamos ingresar por la **Puerta 3 (Sur)** o **Puerta 1 (Norte)**. Ambas cuentan con rampas de acceso especiales y personal de asistencia. La **Puerta 3** tiene una densidad de personas de sólo el ${zoneCDensity}%.`;
    } else if (lang === 'fr') {
      responseText += `♿ **Mode Accessibilité Activé**: Nous vous recommandons d'entrer par la **Porte 3 (Sud)** ou la **Porte 1 (Nord)**. Elles disposent de rampes d'accès adaptées. La **Porte 3** affiche une affluence de seulement ${zoneCDensity}%.`;
    } else {
      responseText += `♿ **Accessibility Assistance Mode Active**: We recommend entering through **Gate 3 (South)** or **Gate 1 (North)**. These gates feature low-grade ramps, elevator access, and dedicated volunteers. Currently, **Gate 3** has a low crowd density of ${zoneCDensity}%.`;
    }
  } else {
    // Standard crowd-aware routing
    highlights.push(recommendedGate, bestZone.zoneId);
    
    // Add warning if the worst zone is highly congested
    let warningSnippet = '';
    if (worstZone.density > 80) {
      warningSnippet = ` **${worstZone.name}** is currently heavily congested (${worstZone.density}% capacity). Please avoid Gate-${worstZone.zoneId.split('-')[1].toLowerCase()} and route through **Gate-${recommendedGate.split('-')[1]}** instead which has a much lower density (${bestZone.density}%).`;
    }

    if (lang === 'es') {
      responseText += `${gateIntro} ${routeRec} **Puerta ${recommendedGate.split('-')[1]}** (${bestZone.name}), que actualmente se encuentra muy despejada (capacidad del ${bestZone.density}%).${warningSnippet ? warningSnippet.replace('Gate-', 'Puerta ').replace('is currently heavily congested', 'está muy congestionado') : ''}`;
    } else if (lang === 'fr') {
      responseText += `${gateIntro} ${routeRec} **Porte ${recommendedGate.split('-')[1]}** (${bestZone.name}), qui est actuellement très fluide (${bestZone.density}% de capacité).${warningSnippet ? warningSnippet.replace('Gate-', 'Porte ').replace('is currently heavily congested', 'est très encombré') : ''}`;
    } else {
      responseText += `${gateIntro} ${routeRec} **Gate ${recommendedGate.split('-')[1]}** (${bestZone.name}) which is currently highly clear (${bestZone.density}% capacity).${warningSnippet}`;
    }
  }

  // 4. Transit guidance
  if (text.includes('metro') || text.includes('bus') || text.includes('leave') || text.includes('exit') || text.includes('transito') || text.includes('ir') || text.includes('salir') || text.includes('transit') || text.includes('station') || text.includes('shuttle')) {
    responseText += `\n\n${transitGuidance}`;
    highlights.push('Hub-1', 'Hub-2');
  }

  // 5. Add details of active incidents if relevant to routing
  const relevantIncidents = incidents.filter(i => i.zoneId === bestZone.zoneId || i.zoneId === worstZone.zoneId);
  if (relevantIncidents.length > 0) {
    responseText += `\n\n⚠️ **Operational Updates**: `;
    relevantIncidents.forEach((inc, idx) => {
      if (idx > 0) responseText += ', ';
      responseText += `${inc.summary} (${inc.priority} priority)`;
    });
  }

  return {
    text: responseText,
    highlights,
    detectedLanguage: lang
  };
}

function generateMockIncident(
  description: string,
  reportedBy: 'volunteer' | 'staff',
  zoneId: string,
  requestId: string
): IncidentAIResponse {
  logJSON('INFO', { requestId, method: 'GEMINI_MOCK', url: 'triage', message: 'Generating simulated incident triage.' });

  const text = description.toLowerCase();
  let priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let category: 'security' | 'medical' | 'maintenance' | 'transit' | 'other' = 'other';
  let summary = 'Routine issue reported.';

  // 1. Tag Category & Priority
  if (text.includes('fire') || text.includes('smoke') || text.includes('alarm') || text.includes('fight') || text.includes('weapon') || text.includes('threat') || text.includes('danger')) {
    priority = 'HIGH';
    category = 'security';
    summary = 'Security alert: Urgent hazard or safety issue detected.';
  } else if (text.includes('medical') || text.includes('injury') || text.includes('hurt') || text.includes('collapse') || text.includes('cpr') || text.includes('heart') || text.includes('bleed')) {
    priority = 'HIGH';
    category = 'medical';
    summary = 'Medical emergency: Volunteer requesting immediate first aid.';
  } else if (text.includes('broken scanner') || text.includes('scanner down') || text.includes('turnstile') || text.includes('scanner failure') || text.includes('gate closed')) {
    priority = 'MEDIUM';
    category = 'transit';
    summary = 'Scanner gate failure causing entrance delays.';
  } else if (text.includes('delay') || text.includes('traffic') || text.includes('shuttle stop') || text.includes('bus delay') || text.includes('train')) {
    priority = 'MEDIUM';
    category = 'transit';
    summary = 'Transit delay at stadium connections.';
  } else if (text.includes('leak') || text.includes('flood') || text.includes('water') || text.includes('structural') || text.includes('broken seat') || text.includes('spill')) {
    priority = 'MEDIUM';
    category = 'maintenance';
    summary = 'Maintenance report: Physical infrastructure update required.';
  } else {
    priority = 'LOW';
    category = 'other';
    summary = `Report: ${description.slice(0, 30)}...`;
  }

  // Staff reports default to higher urgency if borderline
  if (reportedBy === 'staff' && priority === 'LOW') {
    priority = 'MEDIUM';
  }

  return {
    priority,
    category,
    summary
  };
}
