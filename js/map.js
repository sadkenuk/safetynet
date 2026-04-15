// L is the Leaflet global, loaded via <script> tag before this module.
import { colour, label, fmtMonth, severityColour, severity } from './config.js';
import { state } from './state.js';

/* ── Tile layer config ───────────────────────────────── */
const TILES = {
  dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
};
const TILE_OPTS = {
  attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>, © <a href="https://carto.com">CARTO</a>',
  subdomains: 'abcd', maxZoom: 19,
};

let tileLayer   = null;
let currentTheme = 'dark';

/* ── Initialise map ──────────────────────────────────── */
export function initMap() {
  state.map = L.map('map', { zoomControl: false }).setView([state.lat, state.lng], 15);

  tileLayer = L.tileLayer(TILES.dark, TILE_OPTS).addTo(state.map);

  L.control.zoom({ position: 'bottomright' }).addTo(state.map);

  state.searchCircle = L.circle([state.lat, state.lng], {
    radius: 1609, color: '#4a8c62', weight: 1,
    fillColor: '#4a8c62', fillOpacity: 0.04, dashArray: '4 6',
  }).addTo(state.map);

  const centreIcon = L.divIcon({
    className: '',
    html: `<div style="width:12px;height:12px;background:#4a8c62;border:2px solid #f2ede3;border-radius:50%;box-shadow:0 0 0 5px rgba(74,140,98,0.2)"></div>`,
    iconSize: [12, 12], iconAnchor: [6, 6],
  });

  state.centreMarker = L.marker([state.lat, state.lng], { icon: centreIcon }).addTo(state.map);
  updateCentrePopup();
}

export function updateCentrePopup() {
  state.centreMarker.bindPopup(`
    <div class="popup-eyebrow" style="color:#4a8c62">Search origin</div>
    <div class="popup-street">${state.locationName}</div>
    <div class="popup-outcome">1 mile radius search area</div>
  `);
}

export function toggleMapTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  if (tileLayer) state.map.removeLayer(tileLayer);
  tileLayer = L.tileLayer(TILES[currentTheme], TILE_OPTS).addTo(state.map);
  tileLayer.bringToBack();

  const btn = document.getElementById('map-theme-btn');
  btn.textContent = currentTheme === 'dark' ? '☀ Light map' : '◑ Dark map';
  btn.classList.toggle('light-active', currentTheme === 'light');
}

export function moveMap(lat, lng) {
  state.map.setView([lat, lng], 15);
  state.searchCircle.setLatLng([lat, lng]);
  state.centreMarker.setLatLng([lat, lng]);
  updateCentrePopup();
}

/* ── Crime markers ───────────────────────────────────────
 * Receives an already-filtered array of crimes. All crimes
 * passed in are rendered — filtering happens before this call.
 * ───────────────────────────────────────────────────────── */
export function renderCrimeMarkers(crimes) {
  Object.values(state.crimeGroups).forEach(g => state.map.removeLayer(g));
  state.crimeGroups = {};

  const byCat = {};
  crimes.forEach(c => { (byCat[c.category] = byCat[c.category] || []).push(c); });

  // Group all crimes by location point, then render one marker per point
  const byLocation = {};
  crimes.forEach(c => {
    const key = `${c.location.latitude},${c.location.longitude}`;
    (byLocation[key] = byLocation[key] || []).push(c);
  });

  const g = L.layerGroup();

  Object.entries(byLocation).forEach(([key, group]) => {
    const [lat, lng] = key.split(',').map(parseFloat);
    const count = group.length;

    // Colour by highest severity crime at this location
    const worstCat = group.reduce((worst, c) =>
      severity(c.category) > severity(worst) ? c.category : worst,
      group[0].category
    );
    const col = severityColour(worstCat);

    // Dot size: fixed 20px for single crime, grows for multiples, wide enough for 3 digits
    const size     = count === 1 ? 20 : count < 10 ? 26 : count < 100 ? 32 : 38;
    const fontSize = count < 10 ? 11 : count < 100 ? 9 : 8;
    const label_   = count > 1 ? `${count}` : '';

    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:${size}px; height:${size}px; border-radius:50%;
        background:${col}; opacity:0.85;
        border:2px solid rgba(255,255,255,0.4);
        display:flex; align-items:center; justify-content:center;
        font-family:'Azeret Mono',monospace; font-size:${fontSize}px;
        font-weight:700; color:#fff; letter-spacing:-0.02em;
        box-shadow:0 2px 6px rgba(0,0,0,0.4);
      ">${label_}</div>`,
      iconSize: [size, size],
      iconAnchor: [size/2, size/2],
    });

    // Build popup listing all crimes at this point
    const rows = group.map(c => `
      <div class="popup-row" style="padding:4px 0; border-bottom:1px solid #1b3024">
        <span style="color:${severityColour(c.category)};font-size:9px;text-transform:uppercase;
          letter-spacing:0.1em;font-family:'Azeret Mono',monospace">${label(c.category)}</span><br>
        <span style="font-size:11px;color:#d8e8da">${c.outcome_status?.category ?? 'No outcome recorded'}</span><br>
        <span style="font-size:9px;color:#4f6f52">${fmtMonth(c.month)}</span>
      </div>`).join('');

    L.marker([lat, lng], { icon }).bindPopup(`
      <div class="popup-street">${group[0].location.street.name}</div>
      <div style="font-size:9px;color:#4f6f52;margin:3px 0 8px;font-family:'Azeret Mono',monospace">
        ${count} incident${count > 1 ? 's' : ''} at this location
      </div>
      ${rows}
    `, { maxHeight: 220 }).addTo(g);
  });

  state.crimeGroups['_all'] = g;
  g.addTo(state.map);
}

/* ── Stop & Search markers ───────────────────────────── */
export function renderStopMarkers(stops) {
  if (state.stopsGroup) state.map.removeLayer(state.stopsGroup);
  state.stopsGroup = L.layerGroup();

  stops.forEach(s => {
    if (!s.location) return;

    const icon = L.divIcon({
      className: '',
      html: `<div style="width:9px;height:9px;background:#f97316;transform:rotate(45deg);border:1.5px solid rgba(255,255,255,0.7);opacity:0.85"></div>`,
      iconSize: [9, 9], iconAnchor: [4, 4],
    });

    L.marker(
      [parseFloat(s.location.latitude), parseFloat(s.location.longitude)],
      { icon }
    ).bindPopup(`
      <div class="popup-eyebrow" style="color:#f97316">Stop &amp; Search</div>
      <div class="popup-street">${s.location.street?.name || 'Unknown street'}</div>
      <div class="popup-row"><strong>Reason:</strong> ${s.object_of_search || '—'}</div>
      <div class="popup-row"><strong>Outcome:</strong> ${s.outcome || '—'}</div>
      <div class="popup-row"><strong>Age:</strong> ${s.age_range || '—'} · <strong>Gender:</strong> ${s.gender || '—'}</div>
      <div class="popup-month">${s.datetime ? s.datetime.slice(0, 7) : ''}</div>
    `).addTo(state.stopsGroup);
  });

  if (state.showStops) state.stopsGroup.addTo(state.map);
}
