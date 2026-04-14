import { colour, label, outcomeLabel, outcomeColour, fmtMonth, fmtMonthShort, fmtMonthAbbr } from './config.js';
import { computeOutcomeRate } from './analytics.js';
import { state } from './state.js';

/* ── Loading overlay ─────────────────────────────────── */
export function setLoading(show) {
  document.getElementById('loading').classList.toggle('hidden', !show);
}

export function setLoadingLabel(text) {
  document.getElementById('loading-label').textContent = text;
}

/* ── Stats grid ──────────────────────────────────────── */
export function renderStats(crimes, from, to) {
  const counts = {};
  crimes.forEach(c => { counts[c.category] = (counts[c.category] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  const total      = crimes.length;
  const outcomeRate = computeOutcomeRate(crimes);
  const unresolved  = crimes.filter(c => c.outcome_status === null).length;

  document.getElementById('stat-total').textContent        = total;
  document.getElementById('stat-unresolved').textContent   = unresolved;
  document.getElementById('stat-outcome-rate').textContent = outcomeRate + '%';
  document.getElementById('stat-top').textContent          = sorted[0] ? label(sorted[0][0]) : '—';
  document.getElementById('stat-period').textContent       = from === to
    ? fmtMonth(from)
    : `${fmtMonthShort(from)} – ${fmtMonthShort(to)}`;

  return sorted;
}

/* ── Monthly trend SVG chart ─────────────────────────── */
export function renderTrendChart(byMonth) {
  const months = Object.keys(byMonth).sort();
  const values = months.map(m => byMonth[m]);
  const max    = Math.max(...values, 1);
  const W = 248, barH = 54, labelH = 16, H = barH + labelH;
  const n = months.length, gap = 3;
  const barW = Math.floor((W - gap * (n - 1)) / n);

  const bars = months.map((m, i) => {
    const v = values[i];
    const h = Math.max(Math.round((v / max) * barH), v > 0 ? 2 : 0);
    const x = i * (barW + gap);
    const y = barH - h;
    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="#4a8c62" rx="1" opacity="0.75"/>
      <text x="${x + barW / 2}" y="${y - 3}" text-anchor="middle" font-size="8" fill="#74bf90" font-family="Azeret Mono,monospace">${v}</text>
      <text x="${x + barW / 2}" y="${H - 1}" text-anchor="middle" font-size="8" fill="#4f6f52" font-family="Azeret Mono,monospace">${fmtMonthAbbr(m)}</text>
    `;
  }).join('');

  document.getElementById('trend-chart').innerHTML =
    `<svg viewBox="0 0 ${W} ${H + 4}" width="100%" style="display:block;overflow:visible">${bars}</svg>`;
}

/* ── Generic toggleable list ─────────────────────────── */
function makeToggleList(containerId, items, hiddenSet, getKey, getName, getColour, onToggle) {
  const max  = items[0]?.[1] || 1;
  const list = document.getElementById(containerId);
  list.innerHTML = '';

  items.forEach(([key, count]) => {
    const col = getColour(key);
    const pct = Math.round((count / max) * 100);
    const row = document.createElement('div');
    row.className   = 'cat-row' + (hiddenSet.has(key) ? ' hidden' : '');
    row.dataset.key = key;
    row.innerHTML   = `
      <div class="cat-pip" style="background:${col}"></div>
      <div class="cat-name">${getName(key)}</div>
      <div class="cat-bar-wrap"><div class="cat-bar" style="width:${pct}%;background:${col}30;border-right:2px solid ${col}80"></div></div>
      <div class="cat-count">${count}</div>
    `;
    row.addEventListener('click', () => onToggle(key, row));
    list.appendChild(row);
  });
}

/* ── Category list ───────────────────────────────────── */
export function renderCatList(sorted, onToggle) {
  makeToggleList(
    'cat-list', sorted,
    state.hiddenCategories,
    k => k,
    k => label(k),
    k => colour(k),
    onToggle
  );
}

/* ── Outcomes breakdown ──────────────────────────────── */
export function renderOutcomeList(breakdown, onToggle) {
  makeToggleList(
    'outcome-list', breakdown,
    state.hiddenOutcomes,
    k => k,
    k => outcomeLabel(k),
    k => outcomeColour(k),
    onToggle
  );
}

/* ── Top streets ─────────────────────────────────────── */
export function renderStreetsList(topStreets, onToggle) {
  const max  = topStreets[0]?.[1] || 1;
  const list = document.getElementById('streets-list');
  list.innerHTML = '';

  topStreets.forEach(([street, count], i) => {
    const pct = Math.round((count / max) * 100);
    const isHidden = state.hiddenStreets.has(street);
    const row = document.createElement('div');
    row.className   = 'cat-row' + (isHidden ? ' hidden' : '');
    row.dataset.key = street;
    row.innerHTML   = `
      <div class="rank-num">${i + 1}</div>
      <div class="cat-name">${street}</div>
      <div class="cat-bar-wrap"><div class="cat-bar" style="width:${pct}%;background:#4a8c6230;border-right:2px solid #4a8c6280"></div></div>
      <div class="cat-count">${count}</div>
    `;
    row.addEventListener('click', () => onToggle(street, row));
    list.appendChild(row);
  });
}

/* ── Stop & Search summary ───────────────────────────── */
export function renderStopsSection(stops) {
  if (stops.length === 0) {
    document.getElementById('stops-content').innerHTML =
      '<span class="info-text">No stop &amp; search data recorded for this area and period.</span>';
    return;
  }

  const reasons = {}, outcomes = {};
  let nothingFound = 0;

  stops.forEach(s => {
    if (s.object_of_search) reasons[s.object_of_search]  = (reasons[s.object_of_search]  || 0) + 1;
    if (s.outcome)          outcomes[s.outcome]           = (outcomes[s.outcome]           || 0) + 1;
    if (s.outcome && /nothing|no further/i.test(s.outcome)) nothingFound++;
  });

  const topReason  = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0];
  const topOutcome = Object.entries(outcomes).sort((a, b) => b[1] - a[1])[0];
  const nothingPct = Math.round((nothingFound / stops.length) * 100);

  document.getElementById('stops-content').innerHTML = `
    <div class="stops-stats">
      <div class="stops-stat">
        <span class="stops-stat-label">People stopped</span>
        <span class="stops-stat-value">${stops.length}</span>
      </div>
      <div class="stops-stat">
        <span class="stops-stat-label">Most common reason</span>
        <span class="stops-stat-value">${topReason?.[0] || '—'}</span>
      </div>
      <div class="stops-stat">
        <span class="stops-stat-label">Most common outcome</span>
        <span class="stops-stat-value">${topOutcome?.[0] || '—'}</span>
      </div>
      <div class="stops-stat">
        <span class="stops-stat-label">Nothing found</span>
        <span class="stops-stat-value">${nothingPct}% of stops</span>
      </div>
    </div>
  `;

  document.getElementById('stat-stops').textContent      = stops.length;
  document.getElementById('stops-map-btn').style.display = '';
}

/* ── Neighbourhood priorities ────────────────────────── */
export function renderPriorities(priorities) {
  const el = document.getElementById('priorities-list');
  if (!priorities || !priorities.length) {
    el.innerHTML = '<span class="info-text">No priorities data published for this area.</span>';
    return;
  }
  el.innerHTML = priorities.map(p => `
    <div class="priority-item">
      <div class="priority-issue">${p.issue || '—'}</div>
      ${p.action ? `<div class="priority-action">${p.action}</div>` : ''}
      <div class="priority-date">${(p['issue-date'] || '').slice(0, 10)}</div>
    </div>
  `).join('');
}

/* ── Date range selects ──────────────────────────────── */
export function populateSelects(allMonths) {
  const fromEl = document.getElementById('range-from');
  const toEl   = document.getElementById('range-to');
  fromEl.innerHTML = toEl.innerHTML = '';

  allMonths.forEach(m => {
    fromEl.appendChild(Object.assign(document.createElement('option'), { value: m, textContent: fmtMonth(m) }));
  });
  [...allMonths].reverse().forEach(m => {
    toEl.appendChild(Object.assign(document.createElement('option'), { value: m, textContent: fmtMonth(m) }));
  });

  fromEl.value = allMonths[allMonths.length - 1];
  toEl.value   = allMonths[allMonths.length - 1];
}

/* ── Reset secondary panels to loading state ─────────── */
export function resetSecondaryPanels() {
  document.getElementById('stat-stops').textContent      = '—';
  document.getElementById('stops-map-btn').style.display = 'none';
  document.getElementById('stops-content').innerHTML     = '<span class="info-text"><span class="mini-spinner"></span>Loading…</span>';
  document.getElementById('priorities-list').innerHTML   = '<span class="info-text"><span class="mini-spinner"></span>Loading…</span>';
}
