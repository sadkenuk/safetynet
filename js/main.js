import { state } from './state.js';
import { getMonths, getCrimesForRange, getStopsForRange, getNeighbourhoodPriorities, lookupPostcode } from './api.js';
import { computeOutcomeBreakdown, computeTrendByMonth, computeTopStreets } from './analytics.js';
import { initMap, moveMap, toggleMapTheme, renderCrimeMarkers, renderStopMarkers } from './map.js';
import {
  setLoading, setLoadingLabel,
  renderStats, renderTrendChart,
  renderCatList, renderOutcomeList, renderStreetsList,
  renderStopsSection, renderPriorities,
  populateSelects, resetSecondaryPanels,
} from './render.js';

/* ── Filtering ───────────────────────────────────────── */
function getVisibleCrimes() {
  return state.crimes.filter(c => {
    if (state.hiddenCategories.has(c.category)) return false;
    const outcomeKey = c.outcome_status?.category ?? 'No outcome recorded';
    if (state.hiddenOutcomes.has(outcomeKey)) return false;
    if (state.hiddenStreets.has(c.location.street.name)) return false;
    return true;
  });
}

function refreshMapMarkers() {
  renderCrimeMarkers(getVisibleCrimes());
}

/* ── Category toggles ────────────────────────────────── */
function toggleCategory(cat, row) {
  state.hiddenCategories.has(cat)
    ? (state.hiddenCategories.delete(cat), row.classList.remove('hidden'))
    : (state.hiddenCategories.add(cat),    row.classList.add('hidden'));
  refreshMapMarkers();
}

function setAllCategories(show) {
  document.querySelectorAll('#cat-list .cat-row').forEach(row => {
    const cat = row.dataset.key;
    if (show) { state.hiddenCategories.delete(cat); row.classList.remove('hidden'); }
    else       { state.hiddenCategories.add(cat);   row.classList.add('hidden');    }
  });
  refreshMapMarkers();
}

/* ── Outcome toggles ─────────────────────────────────── */
function toggleOutcome(rawOutcome, row) {
  state.hiddenOutcomes.has(rawOutcome)
    ? (state.hiddenOutcomes.delete(rawOutcome), row.classList.remove('hidden'))
    : (state.hiddenOutcomes.add(rawOutcome),    row.classList.add('hidden'));
  refreshMapMarkers();
}

function setAllOutcomes(show) {
  document.querySelectorAll('#outcome-list .cat-row').forEach(row => {
    const key = row.dataset.key;
    if (show) { state.hiddenOutcomes.delete(key); row.classList.remove('hidden'); }
    else       { state.hiddenOutcomes.add(key);   row.classList.add('hidden');    }
  });
  refreshMapMarkers();
}

/* ── Street toggles ──────────────────────────────────── */
function toggleStreet(street, row) {
  state.hiddenStreets.has(street)
    ? (state.hiddenStreets.delete(street), row.classList.remove('hidden'))
    : (state.hiddenStreets.add(street),    row.classList.add('hidden'));
  refreshMapMarkers();
}

function setAllStreets(show) {
  document.querySelectorAll('#streets-list .cat-row').forEach(row => {
    const key = row.dataset.key;
    if (show) { state.hiddenStreets.delete(key); row.classList.remove('hidden'); }
    else       { state.hiddenStreets.add(key);   row.classList.add('hidden');    }
  });
  refreshMapMarkers();
}

/* ── Stop & Search map toggle ────────────────────────── */
function toggleStopSearch() {
  state.showStops = !state.showStops;
  if (state.stopsGroup) {
    state.showStops ? state.stopsGroup.addTo(state.map) : state.map.removeLayer(state.stopsGroup);
  }
  const btn = document.getElementById('stops-map-btn');
  btn.textContent = state.showStops ? 'Hide on map' : 'Show on map';
  btn.classList.toggle('active', state.showStops);
}

/* ── Load & render all primary data ──────────────────── */
async function loadData() {
  // Reset all filter state on each fresh load
  state.hiddenCategories = new Set();
  state.hiddenOutcomes   = new Set();
  state.hiddenStreets    = new Set();
  state.showStops        = false;
  resetSecondaryPanels();
  setLoading(true);

  try {
    const crimes    = await getCrimesForRange(state.rangeFrom, state.rangeTo, setLoadingLabel);
    state.crimes    = crimes;

    renderCrimeMarkers(crimes);
    const sorted = renderStats(crimes, state.rangeFrom, state.rangeTo);
    renderCatList(sorted, toggleCategory);
    renderTrendChart(computeTrendByMonth(crimes, state.rangeFrom, state.rangeTo));
    renderOutcomeList(computeOutcomeBreakdown(crimes), toggleOutcome);
    renderStreetsList(computeTopStreets(crimes), toggleStreet);

  } catch (e) {
    console.error(e);
    document.getElementById('cat-list').innerHTML =
      `<div class="error-panel">Could not load data<br><small>${e.message}</small></div>`;
  } finally {
    setLoading(false);
    window.dispatchEvent(new Event('safetynet:dataLoaded'));
  }

  // Background: stops + priorities — non-blocking
  setTimeout(async () => {
    try {
      const stops = await getStopsForRange(state.rangeFrom, state.rangeTo);
      renderStopsSection(stops);
      renderStopMarkers(stops);
    } catch {
      document.getElementById('stops-content').innerHTML =
        '<span class="info-text">Stop &amp; search data unavailable.</span>';
    }
    try {
      renderPriorities(await getNeighbourhoodPriorities());
    } catch {
      document.getElementById('priorities-list').innerHTML =
        '<span class="info-text">Priorities data unavailable.</span>';
    }
  }, 1200);
}

/* ── Date range apply ────────────────────────────────── */
async function applyRange() {
  const from = document.getElementById('range-from').value;
  const to   = document.getElementById('range-to').value;
  state.rangeFrom = from <= to ? from : to;
  state.rangeTo   = from <= to ? to   : from;

  document.getElementById('apply-range').disabled = true;
  await loadData();
  document.getElementById('apply-range').disabled = false;
}

/* ── Postcode search ─────────────────────────────────── */
async function handlePostcodeSearch() {
  const input = document.getElementById('postcode-input');
  const btn   = document.getElementById('postcode-btn');
  const errEl = document.getElementById('postcode-error');
  errEl.style.display = 'none';

  const raw = input.value.trim();
  if (!raw) return;

  btn.disabled    = true;
  btn.textContent = '…';

  try {
    const loc = await lookupPostcode(raw);

    state.lat          = loc.lat;
    state.lng          = loc.lng;
    state.locationName = loc.name;
    state.forceName    = loc.force;

    // Caches are location-specific — clear on location change
    state.crimeCache = {};
    state.stopsCache = {};

    moveMap(loc.lat, loc.lng);

    document.getElementById('force-eyebrow').textContent  = loc.force;
    document.getElementById('location-label').textContent = loc.name;

    // Analytics: log outward code only (e.g. "SO43") — safe, no individual identified
    // UK inward codes are always exactly 3 chars, so strip them to get outward district
    const clean   = raw.trim().toUpperCase().replace(/\s+/g, '');
    const outward = clean.slice(0, -3); // e.g. "SO437NY" → "SO43"
    window.gtag?.('event', 'postcode_search', {
      outward_code:  outward,
      location_name: loc.name,
      police_force:  loc.force,
    });

    await loadData();

  } catch (e) {
    errEl.textContent   = e.message;
    errEl.style.display = 'block';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Search';
  }
}

/* ── Mobile bottom sheet drawer ─────────────────────── */
function initMobileDrawer() {
  const sidebar = document.getElementById('sidebar');
  const handle  = document.getElementById('mobile-handle');
  const header  = document.getElementById('sidebar-header');
  if (!handle) return;

  // Three states: 'hidden' (just handle), 'peek' (header visible), 'open' (full)
  let state = 'peek';

  function snapOffset(s) {
    const h = sidebar.offsetHeight;
    if (s === 'open')   return 0;
    if (s === 'peek')   return h - 240;
    /* hidden */        return h - 52;
  }

  function setState(s, animate = true) {
    state = s;
    if (!animate) sidebar.style.transition = 'none';
    sidebar.style.transform = '';
    sidebar.classList.toggle('drawer-open',   s === 'open');
    sidebar.classList.toggle('drawer-hidden', s === 'hidden');
    if (!animate) requestAnimationFrame(() => { sidebar.style.transition = ''; });
  }

  // Tap: hidden→peek, peek→open, open→peek
  function tapToggle() {
    setState(state === 'open' ? 'peek' : state === 'hidden' ? 'peek' : 'open');
  }

  // ── Touch drag ──────────────────────────────────────
  let startY = 0, startOffset = 0, lastY = 0, lastT = 0, vel = 0, didDrag = false;

  handle.addEventListener('touchstart', e => {
    startY      = e.touches[0].clientY;
    startOffset = snapOffset(state);
    lastY       = startY;
    lastT       = Date.now();
    vel         = 0;
    didDrag     = false;
    sidebar.style.transition = 'none';
  }, { passive: true });

  handle.addEventListener('touchmove', e => {
    const dy  = e.touches[0].clientY - startY;
    const now = Date.now();
    const dt  = now - lastT;
    if (dt > 0) vel = (e.touches[0].clientY - lastY) / dt;
    lastY = e.touches[0].clientY;
    lastT = now;

    if (Math.abs(dy) > 4) didDrag = true;
    if (!didDrag) return;

    const h      = sidebar.offsetHeight;
    const clamped = Math.max(0, Math.min(h - 52, startOffset + dy));
    sidebar.style.transform = `translateY(${clamped}px)`;
  }, { passive: true });

  handle.addEventListener('touchend', e => {
    sidebar.style.transition = '';

    if (!didDrag) { tapToggle(); return; }

    const dy         = e.changedTouches[0].clientY - startY;
    const currentOff = startOffset + dy;
    const FLICK      = 0.35; // px/ms

    let next;
    if (vel > FLICK) {
      next = state === 'open' ? 'peek' : 'hidden';
    } else if (vel < -FLICK) {
      next = state === 'hidden' ? 'peek' : 'open';
    } else {
      // Snap to nearest snap point
      const states = ['open', 'peek', 'hidden'];
      next = states.reduce((best, s) =>
        Math.abs(currentOff - snapOffset(s)) < Math.abs(currentOff - snapOffset(best)) ? s : best
      );
    }
    setState(next);
  });

  // Tapping the header area (not inputs/buttons/selects) also toggles
  header.addEventListener('click', e => {
    if (window.innerWidth > 680) return;
    if (e.target.closest('input, button, select')) return;
    tapToggle();
  });

  // Auto-expand drawer after data loads so user knows there's content
  window.addEventListener('safetynet:dataLoaded', () => {
    if (window.innerWidth <= 680) setState('open');
  });
}

/* ── Share ───────────────────────────────────────────── */
function initShare() {
  document.getElementById('share-btn').addEventListener('click', () => {
    const url = new URL(window.location.href);
    url.searchParams.set('postcode', document.getElementById('postcode-input').value.trim());
    url.searchParams.set('from', state.rangeFrom);
    url.searchParams.set('to',   state.rangeTo);

    if (navigator.share) {
      navigator.share({ title: 'SafetyNet', url: url.toString() });
    } else {
      navigator.clipboard.writeText(url.toString()).then(() => {
        const btn = document.getElementById('share-btn');
        const original = btn.innerHTML;
        btn.textContent = '✓';
        setTimeout(() => btn.innerHTML = original, 2000);
      });
    }
  });
}

/* ── About modal ─────────────────────────────────────── */
function initAbout() {
  const overlay  = document.getElementById('about-overlay');
  const openBtns = [
    document.getElementById('about-btn'),
    document.getElementById('footer-about-link'),
  ];
  const closeBtns = [
    document.getElementById('about-close'),
    document.getElementById('about-close-bottom'),
  ];

  const open  = e => { e?.preventDefault(); overlay.classList.remove('hidden'); document.body.style.overflow = 'hidden'; };
  const close = ()  => { overlay.classList.add('hidden');    document.body.style.overflow = '';       };

  openBtns.forEach(btn => btn?.addEventListener('click', open));

  // Legend ? button — open About and scroll to severity section
  document.getElementById('legend-info-btn')?.addEventListener('click', () => {
    open();
    setTimeout(() => {
      document.getElementById('about-severity')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  });
  closeBtns.forEach(btn => btn?.addEventListener('click', close));

  // Close on backdrop click
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  // Close on Escape
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

/* ── Boot: data fetch (retryable) ────────────────────── */
async function bootData() {
  const errorOverlay = document.getElementById('api-error-overlay');
  const retryBtn     = document.getElementById('api-error-retry-btn');
  const sidebar      = document.getElementById('sidebar');

  errorOverlay.classList.add('hidden');
  sidebar.classList.remove('sidebar-hidden');
  setLoading(true);

  try {
    state.allMonths = await getMonths();
    populateSelects(state.allMonths);

    // Load from shared URL params if present
    const params = new URLSearchParams(window.location.search);
    if (params.get('postcode')) {
      document.getElementById('postcode-input').value = params.get('postcode');
      await handlePostcodeSearch();
    }

    const fromParam = params.get('from');
    const toParam   = params.get('to');
    if (fromParam && toParam && state.allMonths.includes(fromParam) && state.allMonths.includes(toParam)) {
      state.rangeFrom = fromParam;
      state.rangeTo   = toParam;
      document.getElementById('range-from').value = fromParam;
      document.getElementById('range-to').value   = toParam;
    } else {
      // Default to last 3 months so rural areas with sparse data still look meaningful
      const last = state.allMonths.length - 1;
      state.rangeTo   = state.allMonths[last];
      state.rangeFrom = state.allMonths[Math.max(0, last - 2)];
    }

    await loadData();

  } catch (e) {
    console.error(e);
    setLoading(false);
    sidebar.classList.add('sidebar-hidden');
    errorOverlay.classList.remove('hidden');
  } finally {
    retryBtn.disabled = false;
    retryBtn.textContent = 'Retry';
  }
}

/* ── Boot: one-time init ─────────────────────────────── */
async function main() {
  initMap();
  initAbout();
  initShare();
  initMobileDrawer();

  // Wire up all UI controls once
  document.getElementById('apply-range').addEventListener('click', applyRange);
  document.getElementById('btn-cats-all').addEventListener('click',    () => setAllCategories(true));
  document.getElementById('btn-cats-none').addEventListener('click',   () => setAllCategories(false));
  document.getElementById('btn-outcomes-all').addEventListener('click',  () => setAllOutcomes(true));
  document.getElementById('btn-outcomes-none').addEventListener('click', () => setAllOutcomes(false));
  document.getElementById('btn-streets-all').addEventListener('click',  () => setAllStreets(true));
  document.getElementById('btn-streets-none').addEventListener('click', () => setAllStreets(false));
  document.getElementById('stops-map-btn').addEventListener('click', toggleStopSearch);
  document.getElementById('map-theme-btn').addEventListener('click', toggleMapTheme);
  document.getElementById('postcode-btn').addEventListener('click', handlePostcodeSearch);
  document.getElementById('postcode-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') handlePostcodeSearch();
  });

  document.getElementById('api-error-retry-btn').addEventListener('click', () => {
    const btn = document.getElementById('api-error-retry-btn');
    btn.disabled = true;
    btn.textContent = 'Retrying…';
    bootData();
  });

  await bootData();
}

main();
