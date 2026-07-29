export const environment = {
  production: true,
  apiUrl: '/api',
  /** SignalR hub root — mapped at the origin root by the backend, not under `/api`. */
  hubUrl: '/hubs',
  useMockAuth: false,
  // Google Maps JavaScript API key. Leave empty to fall back to a static
  // placeholder; supply your key (or inject at build time) to enable the map.
  googleMapsApiKey: '',
  mapDefaultCenter: { lat: 23.0225, lng: 72.5714 },
  mapDefaultZoom: 13,
};
