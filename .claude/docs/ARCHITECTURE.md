# FoodBridge Frontend — Architecture

The Angular client for the FoodBridge food-donation platform. Talks to the
FoodBridge .NET API (see `../../FoodBridgeBE/docs/`). This doc mirrors the
backend's `docs/ARCHITECTURE.md` for the frontend side.

## Tech stack
- **Angular 20** — standalone components only (no NgModules), signals-first.
- **TypeScript 5.9** — strict mode, no `any`.
- **RxJS 7.8** — HTTP calls return observables; state is signals.
- **Tailwind CSS 3.4** + a small set of app utility classes (`.card-fb`, `.btn-fb*`, `.badge-fb`, CSS variables `--fb-*`).
- **Reactive Forms** everywhere (no template-driven forms).
- **Zone.js 0.15** with `provideZoneChangeDetection({ eventCoalescing: true })`.

Conventions enforced (see `.claude/CLAUDE.md`): standalone components, `input()`/`output()`
functions, `computed()` for derived state, `inject()` over constructor injection,
`ChangeDetectionStrategy.OnPush`, native control flow (`@if`/`@for`/`@switch`),
`class`/`style` bindings (never `ngClass`/`ngStyle`), signals never mutated in place.

## Folder structure
```
src/app/
├── app.config.ts            → providers: router, HttpClient + interceptors, error handler, title strategy
├── app.routes.ts            → route table (auth layout + role-guarded app shell)
├── core/                    → app-wide, non-visual concerns
│   ├── config/              → api-endpoints, app-routes, routes.config (APP_VIEWS), nav.config
│   ├── guards/              → authGuard, roleGuard
│   ├── http/                → api.service (HttpClient wrapper), base-crud.service, api.interceptor
│   ├── models/              → typed DTOs / view models
│   └── services/            → feature/data services + signal stores
├── features/                → one folder per screen (lazy-loaded standalone components)
│   ├── auth/                → auth-layout, login, otp, register
│   ├── donor/               → create-listing, my-listings, certificates
│   ├── volunteer/           → nearby, deliveries, leaderboard
│   ├── recipient/           → incoming, track, reports
│   ├── admin/               → all-listings, verifications, disputes, admin-reports
│   ├── shell/               → shell, sidebar, topbar, coming-soon
│   ├── dashboard, history, profile, settings
├── shared/ui/               → reusable presentational components (button, input, map, toast, status-badge, rescue-timeline, empty-state, route-map)
└── environments/            → environment.ts (dev) / environment.prod.ts
```

Path aliases: `@core/*`, `@features/*`, `@shared/*`, `@env/*`.

## Layering & data flow
```
Component (signals, forms)
    → feature Service (ListingService, UserService, AuthApiService, …)
        → ApiService (typed HttpClient wrapper, prefixes environment.apiUrl)
            → HTTP interceptors (auth token + envelope unwrap)
                → FoodBridge .NET API
```
- **Components** hold local state in signals, drive reactive forms, and call services. No direct `HttpClient` use.
- **Services** own one responsibility each (`providedIn: 'root'` singletons) and return observables of typed models.
- **`ApiService`** centralises the base URL and query-param handling.
- **Signal stores** (`ListingStore`, `VolunteerDeliveriesStore`) hold cross-component state.

## HTTP cross-cutting (mirrors the backend envelope)
Every backend response uses the `ApiResponse<T>` / `PagedResponse<T>` envelope
(`{ success, message, data, errors, traceId }`). Two functional interceptors in
`core/http/api.interceptor.ts` (registered in `app.config.ts`) handle this:

1. **`authTokenInterceptor`** — attaches `Authorization: Bearer <jwt>` to requests whose URL starts with `environment.apiUrl`. Token is read from `localStorage` (`foodbridge.token`).
2. **`apiEnvelopeInterceptor`** — unwraps the envelope so callers receive the inner `data` directly, and converts error responses into an `Error` carrying the server's `message` (falling back to the first field error, then a generic message). This is why services type their returns as the inner payload, and lists return the `data` array directly.

## Auth & session
- OTP-based, matching the backend: `send-otp → verify-otp → (register if new) → JWT`.
- `AuthService` owns the flow: `pendingMobile`, `otpContext`, `mobileVerified`, `registrationDraft`, `registrationSessionToken` (all signals; transient flow persisted to `sessionStorage`, session + JWT to `localStorage`).
- **New mobile:** `verify-otp` returns a short-lived registration **session token** → passed to `register`. **Existing mobile:** returns a full auth **JWT** → user signed in.
- `authGuard` blocks the `/app` shell unless signed in; `roleGuard` enforces `route.data.roles` per view.
- Dev fixed OTP: the backend uses `Otp:FixedDevelopmentCode = 123456` in Development, so any number logs in with `123456` (also printed to the backend log by `MockSmsProvider`).

## Enum & naming conventions (frontend ↔ backend)
The backend uses PascalCase enum **names** on the wire; the app maps them:
- **Role:** backend `Donor|Volunteer|Recipient|Admin` ↔ app lowercase `donor|volunteer|recipient|admin` (mapped in `AuthService.mapUser` / `toApiRole`).
- **Listing status:** backend `Pending|Claimed|PickedUp|Delivered|Confirmed|Expired|Cancelled|Rejected` → app lowercase `ListingStatus` via `toListingStatus()` for the shared `StatusBadge`/`RescueTimeline` components.
- **DietType** `Veg|NonVeg`, **MealType** `Breakfast|Lunch|Dinner|Snacks`, **FreshnessTag** `JustCooked|FewHoursOld|Packaged` — kept as backend names in `listing-api.model.ts`, with `DIET_LABELS`/`FRESHNESS_LABELS` for display.

## Models
- `listing-api.model.ts` — backend-faithful listing DTOs (`ApiListing`, `ApiListingSummary`, `ApiNearbyListing`, `ListingWriteBody`) + enum types + label maps + `toListingStatus`.
- `listing.model.ts` — the legacy/view `Listing` + lowercase `ListingStatus`, `STATUS_LABELS`, `TIMELINE_STEPS` (still used by shared UI and the not-yet-integrated mock pages).
- `user.model.ts` — session `User` (+ `id`), full `UserProfile`, `UpdateProfileBody`.
- `registration.model.ts` — `RegistrationDraft` / `RegisterPayload`.

## Dev run topology (current machine)
- Frontend: `ng serve --port 4201 --proxy-config proxy.conf.json` (port 4200 is taken by another project).
- Backend: `http://localhost:5101` (run the built DLL via `DOTNET_ROLL_FORWARD=Major` because only .NET 8/9/10 runtimes are installed, not .NET 6). Rebuild (`dotnet build`) after any backend source change before restarting.
- **`proxy.conf.json`** routes `/api` and `/uploads` to the backend, so the browser sees everything same-origin — no CORS needed, and `environment.apiUrl` is the relative `/api`.

## Decisions log
- **Additive integration.** Real backend wiring (Auth, Profile, Donor listings, Volunteer listings) was added alongside the existing mock `ListingStore` rather than replacing it, so pages whose backend isn't built yet (recipient, dashboard, history, certificates, admin) keep working on mock data.
- **Listings show title + food details, not names.** The Phase 2–5 endpoints return IDs, not donor/volunteer/recipient names, so listing cards render `title` + food info.
- **Volunteer "My Deliveries" is session-scoped.** No "list my active deliveries" endpoint exists until backend Phase 8, so `VolunteerDeliveriesStore` tracks listings claimed during the session and drives the real confirm-pickup/confirm-delivery calls. It does not survive a full reload.
- **Dev proxy over absolute API URL.** Chosen so the app is CORS-free on any port and needs no backend change.
