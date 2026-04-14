/**
 * Shared mutable application state.
 * All modules import this object and mutate it directly.
 */
export const state = {
  // Current search location
  lat:          50.8726,
  lng:          -1.5774,
  locationName: 'Lyndhurst High Street',
  forceName:    'Hampshire Constabulary',

  // Leaflet instances
  map:          null,
  searchCircle: null,
  centreMarker: null,

  // Map layer groups (keyed by category slug)
  crimeGroups:  {},
  stopsGroup:   null,

  // Response caches — keys are `${lat},${lng},${month}`
  crimeCache:   {},
  stopsCache:   {},

  // Available months from the API (YYYY-MM strings, sorted asc)
  allMonths:    [],

  // Active date range
  rangeFrom:    null,
  rangeTo:      null,

  // Full crime dataset for the current range (used for re-filtering)
  crimes:       [],

  // Filter state — sets of keys that are HIDDEN from the map
  hiddenCategories: new Set(),  // crime category slugs
  hiddenOutcomes:   new Set(),  // raw outcome_status.category strings
  hiddenStreets:    new Set(),  // location.street.name strings

  // Stop & Search UI state
  showStops: false,
};
