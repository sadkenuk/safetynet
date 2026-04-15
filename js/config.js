/* ── API endpoints ───────────────────────────────────── */
// /api is proxied to data.police.uk via nginx — no CORS issues in Docker.
export const POLICE_API   = '/api';
export const POSTCODE_API = 'https://api.postcodes.io';

/* ── Crime category colours & labels ─────────────────── */
export const COLOURS = {
  'anti-social-behaviour':        '#f97316',
  'bicycle-theft':                '#fbbf24',
  'burglary':                     '#ef4444',
  'criminal-damage-arson':        '#b91c1c',
  'drugs':                        '#a78bfa',
  'other-crime':                  '#94a3b8',
  'other-theft':                  '#64748b',
  'possession-of-weapons':        '#7c3aed',
  'public-order':                 '#60a5fa',
  'robbery':                      '#fb923c',
  'shoplifting':                  '#2dd4bf',
  'theft-from-the-person':        '#f472b6',
  'vehicle-crime':                '#38bdf8',
  'violent-crime':                '#f87171',
  'violence-and-sexual-offences': '#f87171',
  'weapons-possession':           '#7c3aed',
};

export const LABELS = {
  'anti-social-behaviour':        'Anti-social behaviour',
  'bicycle-theft':                'Bicycle theft',
  'burglary':                     'Burglary',
  'criminal-damage-arson':        'Criminal damage & arson',
  'drugs':                        'Drugs',
  'other-crime':                  'Other crime',
  'other-theft':                  'Other theft',
  'possession-of-weapons':        'Possession of weapons',
  'public-order':                 'Public order',
  'robbery':                      'Robbery',
  'shoplifting':                  'Shoplifting',
  'theft-from-the-person':        'Theft from person',
  'vehicle-crime':                'Vehicle crime',
  'violent-crime':                'Violence & sexual offences',
  'violence-and-sexual-offences': 'Violence & sexual offences',
  'weapons-possession':           'Possession of weapons',
};

/* ── Outcome labels & colours ────────────────────────── */
export const OUTCOME_LABELS = {
  'Investigation complete; no suspect identified':       'No suspect identified',
  'Unable to prosecute suspect':                         'Unable to prosecute',
  'Local resolution':                                    'Local resolution',
  'Offender given a caution':                            'Given caution',
  'Suspect charged as part of another case':             'Charged (other case)',
  'Court result unavailable':                            'Court result pending',
  'Awaiting court outcome':                              'Awaiting court',
  'Offender given a penalty notice':                     'Penalty notice',
  'Offender fined':                                      'Fined',
  'Offender sent to prison':                             'Sent to prison',
  'Defendant found not guilty':                          'Not guilty',
  'Offender given a community sentence':                 'Community sentence',
  'Offender deprived of property':                       'Deprived of property',
  'Formal action is not in the public interest':         'Not in public interest',
  'Action to be taken by another organisation':          'Referred elsewhere',
  'Further investigation is not in the public interest': 'Investigation not pursued',
  'Offender otherwise dealt with':                       'Otherwise dealt with',
  'Status update unavailable':                           'Status unavailable',
  'No outcome recorded':                                 'No outcome recorded',
};

export const OUTCOME_COLOURS = {
  'No outcome recorded':       '#374151',
  'No suspect identified':     '#64748b',
  'Unable to prosecute':       '#94a3b8',
  'Investigation not pursued': '#64748b',
  'Not in public interest':    '#64748b',
  'Referred elsewhere':        '#60a5fa',
  'Status unavailable':        '#4b5563',
  'Court result pending':      '#fbbf24',
  'Awaiting court':            '#fbbf24',
  'Local resolution':          '#2dd4bf',
  'Given caution':             '#34d399',
  'Penalty notice':            '#34d399',
  'Community sentence':        '#34d399',
  'Fined':                     '#34d399',
  'Charged (other case)':      '#60a5fa',
  'Otherwise dealt with':      '#60a5fa',
  'Sent to prison':            '#ef4444',
  'Not guilty':                '#fb923c',
  'Deprived of property':      '#a78bfa',
};

/* ── Severity scale (1=low → 5=high) ─────────────────── */
// Used to colour map dots: blue → teal → amber → orange → red
export const SEVERITY = {
  'anti-social-behaviour':        1,
  'bicycle-theft':                1,
  'shoplifting':                  1,
  'other-theft':                  1,
  'other-crime':                  2,
  'vehicle-crime':                2,
  'public-order':                 3,
  'drugs':                        3,
  'theft-from-the-person':        3,
  'criminal-damage-arson':        4,  // arson component makes this medium-high
  'burglary':                     4,
  'robbery':                      5,  // involves force/threat — closer to violent crime
  'possession-of-weapons':        5,
  'weapons-possession':           5,
  'violent-crime':                6,
  'violence-and-sexual-offences': 6,
};

const SEVERITY_COLOURS = {
  1: '#4a90d9',  // blue        — low (ASB, theft, shoplifting)
  2: '#38b2a3',  // teal        — low-medium (vehicle crime, other)
  3: '#7bc67a',  // green       — medium (drugs, public order, theft from person)
  4: '#d4a017',  // amber       — medium-high (burglary, robbery, criminal damage)
  5: '#e07020',  // orange      — high (possession of weapons)
  6: '#d63030',  // red         — very high (violent crime, sexual offences)
};

export const severityColour = cat => SEVERITY_COLOURS[SEVERITY[cat] || 2];
export const severity       = cat => SEVERITY[cat] || 2;

/* ── Helper functions ────────────────────────────────── */
export const colour       = cat => COLOURS[cat] || '#888';
export const label        = cat => LABELS[cat]  || cat.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
export const outcomeLabel = o   => OUTCOME_LABELS[o] || o;
export const outcomeColour = o  => OUTCOME_COLOURS[outcomeLabel(o)] || '#64748b';

export function fmtMonth(yyyymm) {
  const [y, m] = yyyymm.split('-');
  return new Date(+y, +m - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}

export function fmtMonthShort(yyyymm) {
  const [y, m] = yyyymm.split('-');
  return new Date(+y, +m - 1, 1).toLocaleString('en-GB', { month: 'short' }) + " '" + String(y).slice(2);
}

export function fmtMonthAbbr(yyyymm) {
  const [y, m] = yyyymm.split('-');
  return new Date(+y, +m - 1, 1).toLocaleString('en-GB', { month: 'short' });
}
