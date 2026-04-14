import { POLICE_API, POSTCODE_API, fmtMonth } from './config.js';
import { state } from './state.js';

export const delay = ms => new Promise(r => setTimeout(r, ms));

/* ── Available months ────────────────────────────────── */
export async function getMonths() {
  const res = await fetch(`${POLICE_API}/crimes-street-dates`);
  if (!res.ok) throw new Error(`dates API returned HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || !data.length) throw new Error('No available months returned');
  return data.map(e => e.date).filter(Boolean).sort();
}

/* ── Crime data ──────────────────────────────────────── */
export async function getCrimes(month) {
  const key = `${state.lat},${state.lng},${month}`;
  if (state.crimeCache[key]) return state.crimeCache[key];

  const res = await fetch(
    `${POLICE_API}/crimes-street/all-crime?lat=${state.lat}&lng=${state.lng}&date=${month}`
  );
  if (!res.ok) throw new Error(`crimes API HTTP ${res.status}`);

  const data = await res.json();
  state.crimeCache[key] = Array.isArray(data) ? data : [];
  return state.crimeCache[key];
}

export async function getCrimesForRange(from, to, onProgress) {
  const months = state.allMonths.filter(m => m >= from && m <= to);
  const all = [];
  for (let i = 0; i < months.length; i++) {
    onProgress?.(`Fetching crimes ${i + 1} of ${months.length}…`);
    if (i > 0 && !state.crimeCache[`${state.lat},${state.lng},${months[i]}`]) await delay(600);
    all.push(...await getCrimes(months[i]));
  }
  return all;
}

/* ── Stop & Search data ──────────────────────────────── */
export async function getStops(month) {
  const key = `${state.lat},${state.lng},${month}`;
  if (state.stopsCache[key]) return state.stopsCache[key];

  const res = await fetch(
    `${POLICE_API}/stops-street?lat=${state.lat}&lng=${state.lng}&date=${month}`
  );
  // 404 = no data for this area/month — not an error
  if (!res.ok) { state.stopsCache[key] = []; return []; }

  const data = await res.json();
  state.stopsCache[key] = Array.isArray(data) ? data : [];
  return state.stopsCache[key];
}

export async function getStopsForRange(from, to) {
  const months = state.allMonths.filter(m => m >= from && m <= to);
  const all = [];
  for (let i = 0; i < months.length; i++) {
    if (i > 0 && !state.stopsCache[`${state.lat},${state.lng},${months[i]}`]) await delay(600);
    all.push(...await getStops(months[i]));
  }
  return all;
}

/* ── Neighbourhood priorities ────────────────────────── */
export async function getNeighbourhoodPriorities() {
  const locRes = await fetch(`${POLICE_API}/locate-neighbourhood?q=${state.lat},${state.lng}`);
  if (!locRes.ok) return null;

  const loc = await locRes.json();
  if (!loc.force || !loc.neighbourhood) return null;

  const prioRes = await fetch(`${POLICE_API}/${loc.force}/${loc.neighbourhood}/priorities`);
  if (!prioRes.ok) return null;

  return prioRes.json();
}

/* ── Postcode lookup (postcodes.io — supports CORS) ─── */
export async function lookupPostcode(postcode) {
  const clean = postcode.trim().toUpperCase().replace(/\s+/g, '');
  const res   = await fetch(`${POSTCODE_API}/postcodes/${encodeURIComponent(clean)}`);
  if (!res.ok) throw new Error('Postcode not found. Please check and try again.');

  const data = await res.json();
  if (data.status !== 200) throw new Error('Postcode not found.');

  const r = data.result;
  return {
    lat:   r.latitude,
    lng:   r.longitude,
    name:  r.parish || r.admin_ward || r.admin_district || postcode.toUpperCase(),
    force: r.pfa    || 'Local Police',
  };
}
