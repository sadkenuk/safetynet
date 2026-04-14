// L is the Leaflet global, loaded via <script> tag before this module.
import { colour, label, fmtMonth } from './config.js';
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

  Object.entries(byCat).forEach(([cat, items]) => {
    const col = colour(cat);
    const g   = L.layerGroup();

    items.forEach(c => {
      L.circleMarker(
        [parseFloat(c.location.latitude), parseFloat(c.location.longitude)],
        { radius: 6.5, color: col, fillColor: col, fillOpacity: 0.6, weight: 1.5 }
      ).bindPopup(`
        <div class="popup-eyebrow" style="color:${col}">${label(cat)}</div>
        <div class="popup-street">${c.location.street.name}</div>
        <div class="popup-outcome">${c.outcome_status ? c.outcome_status.category : 'No outcome recorded yet'}</div>
        <div class="popup-month">${fmtMonth(c.month)}</div>
      `).addTo(g);
    });

    state.crimeGroups[cat] = g;
    g.addTo(state.map);
  });
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
