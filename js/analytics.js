import { state } from './state.js';

/**
 * Returns outcome categories sorted by frequency, e.g.
 * [['No outcome recorded', 42], ['Unable to prosecute suspect', 7], ...]
 */
export function computeOutcomeBreakdown(crimes) {
  const counts = {};
  crimes.forEach(c => {
    const key = c.outcome_status ? c.outcome_status.category : 'No outcome recorded';
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

/**
 * Returns a month → count map for every month in the selected range,
 * filling zero for months that have no matching crimes.
 */
export function computeTrendByMonth(crimes, from, to) {
  const months  = state.allMonths.filter(m => m >= from && m <= to);
  const byMonth = Object.fromEntries(months.map(m => [m, 0]));
  crimes.forEach(c => { if (c.month in byMonth) byMonth[c.month]++; });
  return byMonth;
}

/**
 * Returns the top n streets by incident count, e.g.
 * [['On or near High Street', 12], ...]
 */
export function computeTopStreets(crimes, n = 8) {
  const counts = {};
  crimes.forEach(c => {
    const name = c.location.street.name;
    counts[name] = (counts[name] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n);
}

/**
 * Returns the percentage of crimes that have any outcome recorded (0–100).
 */
export function computeOutcomeRate(crimes) {
  if (!crimes.length) return 0;
  const withOutcome = crimes.filter(c => c.outcome_status !== null).length;
  return Math.round((withOutcome / crimes.length) * 100);
}
