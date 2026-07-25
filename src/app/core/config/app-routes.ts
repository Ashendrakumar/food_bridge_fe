/**
 * Central registry of client-side route paths (absolute, for navigation).
 *
 * Use these constants for `router.navigate([...])` and `routerLink` instead of
 * hard-coding strings. The route *table* itself lives in `app.routes.ts`;
 * these mirror its paths for type-safe navigation.
 */
export const APP_ROUTES = {
  login: '/login',
  otp: '/otp',
  register: '/register',
  app: '/app',
  dashboard: '/app/dashboard',
  /** Build an in-app view path, e.g. appView('profile') → '/app/profile'. */
  appView: (view: string) => `/app/${view}`,
} as const;
