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
│   ├── realtime/            → SignalR: hub-connection (builder), notifications-hub, tracking-hub, location-broadcast
│   └── services/            → feature/data services + signal stores
├── features/                → one folder per screen (lazy-loaded standalone components)
│   ├── auth/                → auth-layout, login, otp, register
│   ├── donor/               → create-listing, my-listings, certificates
│   ├── volunteer/           → nearby, deliveries, leaderboard
│   ├── recipient/           → incoming, track, reports
│   ├── admin/               → all-listings, verifications, disputes, dropoff-locations, admin-reports
│   ├── shell/               → shell, sidebar, topbar, coming-soon
│   ├── dashboard, history, profile, settings
├── shared/ui/               → reusable presentational components (page-wrapper, listing-card, listing-grid, status-badge, deadline-meter, avatar, role-badge, success-anim, button, input, select, date-picker, map, toast, dialog, rescue-timeline, empty-state, bar-chart, route-map, route-dialog, notification-item, notification-filters)
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
(`{ success, message, data, errors, traceId }`). Three functional interceptors in
`core/http/api.interceptor.ts` (registered in `app.config.ts`, **in this order**) handle this:

1. **`authTokenInterceptor`** — attaches `Authorization: Bearer <jwt>` to requests whose URL starts with `environment.apiUrl`. Token is read from `localStorage` (`foodbridge.token`).
2. **`apiEnvelopeInterceptor`** — unwraps the envelope so callers receive the inner `data` directly, and converts error responses into an **`ApiError`** (`core/http/api-error.ts`) carrying the server's `message` (falling back to the first field error, then a generic message) **plus the HTTP `status`**. This is why services type their returns as the inner payload, and lists return the `data` array directly.
3. **`sessionExpiryInterceptor`** — on a **401** from any session-bearing endpoint it calls `AuthService.clearSession()`, toasts "Your session has expired", and navigates to `/login`, then re-throws. Registered last (closest to the backend) so it inspects the raw `HttpErrorResponse` before step 2 normalises it. The anonymous auth endpoints (`send-otp`, `verify-otp`, `register`) are excluded — their 401 means "wrong OTP" and must stay a form error. A module-level `signingOut` latch keeps a burst of parallel 401s to one toast + one navigation.

`ApiError` exists because a plain `Error` dropped the status, so nothing could tell an
expired session from a validation failure. It still extends `Error`, so existing
`err instanceof Error ? err.message : …` handling is unaffected.

## Real-time (`core/realtime/`)
Two SignalR hubs, one shared connection builder. See ROUTES.md for the method names.

```
Component / Service
    → NotificationsHubService | TrackingHubService     (root singletons)
        → buildHubConnection(path, () => auth.token())  (accessTokenFactory + reconnect)
            → /hubs/{notifications,tracking}            (origin root, proxied with "ws": true)
```

Three things are load-bearing and easy to break:
- **The hub URL is not under `environment.apiUrl`.** The backend maps hubs at `/hubs/…`;
  `/api` is a sibling. `environment.hubUrl` exists for exactly this, and `/hubs` needs its own
  `proxy.conf.json` entry with `"ws": true` or the upgrade never reaches the API.
- **Auth is via `accessTokenFactory`, not a header.** Both hubs are `[Authorize]` and the
  WebSocket transport cannot set `Authorization`, so SignalR appends `?access_token=`. The
  backend honours that only for `/hubs` paths (`JwtBearerEvents.OnMessageReceived`).
- **`LocationBroadcastService` is the only writer to the backend's tracking store.**
  `GET /listings/{id}/track` reads an in-memory store that only `TrackingHub.UpdateLocation`
  fills. It is mounted on `Shell` (not the Deliveries page) so a volunteer stays on the map
  while browsing, and self-gates on `inTransit()` so no other role opens a socket.

Live push **augments** REST, never replaces it: a hub only carries rows created while
connected, so `NotificationService` still hydrates over HTTP and refetches on reconnect.
A failed handshake is therefore a silent degradation, not a user-facing error.

## Auth & session
- OTP-based, matching the backend: `send-otp → verify-otp → (register if new) → JWT`.
- `AuthService` owns the flow: `pendingMobile`, `otpContext`, `mobileVerified`, `registrationDraft`, `registrationSessionToken` (all signals; transient flow persisted to `sessionStorage`, session + JWT to `localStorage`).
- **New mobile:** `verify-otp` returns a short-lived registration **session token** → passed to `register`. **Existing mobile:** returns a full auth **JWT** → user signed in.
- `authGuard` blocks the `/app` shell unless signed in; `roleGuard` enforces `route.data.roles` per view.
- **Guards alone are not enough.** They only test the cached session snapshot, so a token that expired *server-side* still passes them — `sessionExpiryInterceptor` is what turns the resulting 401 into a sign-out + redirect. Anything that bypasses `ApiService`/`HttpClient` (e.g. a hub handshake) therefore needs to handle its own 401.
- Dev fixed OTP: the backend uses `Otp:FixedDevelopmentCode = 123456` in Development, so any number logs in with `123456` (also printed to the backend log by `MockSmsProvider`).

## Enum & naming conventions (frontend ↔ backend)
The backend uses PascalCase enum **names** on the wire; the app maps them:
- **Role:** backend `Donor|Volunteer|Recipient|Admin` ↔ app lowercase `donor|volunteer|recipient|admin` (mapped in `AuthService.mapUser` / `toApiRole`).
- **Listing status:** backend `Pending|Claimed|PickedUp|Delivered|Confirmed|Expired|Cancelled|Rejected` → app lowercase `ListingStatus` via `toListingStatus()` for the shared `StatusBadge`/`RescueTimeline` components.
- **DietType** `Veg|NonVeg`, **MealType** `Breakfast|Lunch|Dinner|Snacks`, **FreshnessTag** `JustCooked|FewHoursOld|Packaged` — kept as backend names in `listing-api.model.ts`, with `DIET_LABELS`/`FRESHNESS_LABELS` for display.

## Reusable UI components (`shared/ui`)
Prefer these over re-building card/list/badge markup. All are standalone, OnPush,
and theme-aware. The listing card/grid are the canonical way to render any list of
listings (My Listings, Incoming, History — bring new listing views onto them too).

### `<app-page-wrapper>` — `shared/ui/page-wrapper/`
**Every in-app page starts with this.** It owns the heading block — title,
description, and optional header actions — above the page's own content, so the
`.page-title`/`.page-subtitle`/`.page-header` utilities it replaced were deleted
from `styles.scss`. The title renders as the page's `<h1>` (the shell chrome has no
heading of its own).
- Inputs: `title` (required), `description`, `hasActions` (bool).
- Actions: project `<div pageActions>…</div>` and set `[hasActions]="true"`. The
  wrapper is already a flex row with a gap — don't add another flex div inside it.
  Bind `hasActions` to a condition when the buttons themselves are conditional.
```html
<app-page-wrapper title="My Deliveries" description="Confirm each step." [hasActions]="true">
  <div pageActions>
    <app-button icon="fa-solid fa-rotate" (clicked)="reload()">Refresh</app-button>
  </div>
  …page content…
</app-page-wrapper>
<!-- dynamic copy: <app-page-wrapper [title]="greeting()" [description]="subtitle()"> -->
```

### `<app-listing-card>` — `shared/ui/listing-card/`
One card for a listing: icon tile + title + food type, colour **status badge**,
attribute **chips** (meals · diet · meal · freshness), an optional **deadline meter**,
and a **projected footer for action buttons**.
- Inputs: `listing` (required, `ListingCardData` — satisfied by `ApiListingSummary` **and** `ApiListing`), `icon` (FA class), `iconBg` (any CSS background), `deadline` (bool, default `true`), `clickable` (bool), `hasFooter` (bool).
- Output: `cardClick` (fires only when `clickable`).
- Footer: project `<div cardFooter>…</div>` and set `[hasFooter]="true"`. Footer content keeps the parent's context, so loop vars / component methods work inside it.
```html
<app-listing-card [listing]="l" icon="fa-solid fa-truck" iconBg="var(--fb-orange)" [hasFooter]="true">
  <div cardFooter class="flex gap-2.5">
    <button class="btn-fb-outline flex-1 !py-2 !text-sm" (click)="reject(l)">Reject</button>
    <button class="btn-fb flex-1 !py-2 !text-sm" (click)="accept(l)">Accept</button>
  </div>
</app-listing-card>
<!-- read-only variant: <app-listing-card [listing]="l" [deadline]="false" /> -->
<!-- clickable variant:  <app-listing-card [listing]="l" [clickable]="true" (cardClick)="open(l)" /> -->
```

### `<app-listing-grid>` — `shared/ui/listing-grid/`
Wraps a grid of listing cards and owns the **shared loading (skeletons)** and
**empty** states. Project the cards as content.
- Inputs: `loading` (bool → skeletons), `empty` (bool → empty state), `emptyIcon`, `emptyText`, `skeletonCount` (default 6), `gridClass` (responsive col utilities appended to `grid gap-4`, default `md:grid-cols-2 lg:grid-cols-3`).
```html
<app-listing-grid [loading]="loading()" [empty]="!rows().length" emptyText="Nothing here yet" gridClass="lg:grid-cols-3 2xl:grid-cols-4">
  @for (l of rows(); track l.id) { <app-listing-card [listing]="l" /> }
</app-listing-grid>
```

### `DialogService` — `core/services/dialog.service.ts` + `shared/ui/dialog/`
The one way to open a modal. Do **not** hand-roll another fixed-position overlay
with its own backdrop and z-index.

`DialogService.open(config)` pushes onto a signal stack rendered by
`<app-dialog-host />` (mounted once in `app.html`, beside `<app-toast />`), so any
service, guard or component can open a dialog without a `ViewContainerRef`.
Each entry renders as a **native modal `<dialog>`** via `showModal()` — that is
what makes the page behind genuinely inert (unclickable, untabbable, hidden from
screen readers) and puts the panel in the top layer. The blurred backdrop is
`::backdrop`; `DialogService` also toggles `body.fb-dialog-open` for the scroll lock.

- **Config:** `header` (string or `{title, subtitle, icon, iconBg, showClose}`), `content` (body component `Type`), `message` (plain-text body), `data` (→ `DIALOG_DATA`), `inputs` (→ `setInput`), `actions`, `size` (`sm|md|lg|xl|full`), `disableClose`, `panelClass`, `allowOverflow`.
- **Actions:** `{id, label, icon, variant, align, disabled, close, result, handler}`. `close: true` dismisses with `result`; otherwise `handler(ref)` decides and calls `ref.close(v)`. A Promise/Observable returned from `handler` keeps that button spinning, disables the others, and blocks Esc/backdrop until it settles.
- **`DialogRef`:** `closed` (Observable, emits once), `close(result)`, `body<T>()` (the body component instance), `config` signal + `patch()` to retitle or swap actions while open, `busyAction`.
- Inside the body component: `inject(DIALOG_DATA)` and `inject(DialogRef)`.
- **`dialog.confirm({title, message, confirmVariant: 'danger'})`** → `Promise<boolean>` for yes/no cases.

```ts
const ref = this.dialog.open({
  header: { title: 'Cancel listing?', icon: 'fa-solid fa-ban' },
  content: CancelReasonForm,
  data: { id },
  actions: [
    { id: 'back', label: 'Keep it', variant: 'ghost', close: true },
    { id: 'go', label: 'Cancel listing', variant: 'danger',
      handler: (r) => this.listings.cancel(id).pipe(tap(() => r.close(true))) },
  ],
});
ref.closed.subscribe((cancelled) => cancelled && this.reload());
```

**Three gotchas worth knowing before you write one:**
- **A form field with a popover needs `allowOverflow: true`.** `<app-date-picker>` and a
  searchable `<app-select>` open an *absolutely positioned* panel anchored to their
  field, and the body's `overflow-y: auto` clips it. `allowOverflow` turns clipping off
  on both the panel and the body — only safe when the body is short enough never to
  scroll, since tall content then escapes the panel instead. Size up too (`md` at least
  for `mode="datetime"`, whose panel is a calendar beside a time column).
- **Annotate `ref` when an action reads it back.** `disabled: () => !ref.body()?.valid()`
  makes the `const ref = dialog.open(...)` initializer self-referential, and TS then
  infers `any` (TS7022/TS7023). Write `const ref: DialogRef<R, C> = this.dialog.open<D, R, C>({…})`.
- **A failing `handler` request escalates to the global error handler.** That is right
  for a bug but wrong for an expected 4xx, so pipe `catchError` → toast → `EMPTY`: the
  spinner stops on `complete` and the dialog stays open with the user's input intact
  (a rejected claim ETA or a lost race is retried, not lost).

**Every modal in the app goes through it** — there is no other overlay markup left:

| Dialog | Body component | Opened by |
|---|---|---|
| Claim a pickup (optional ETA) | `ClaimDialog` (`features/volunteer/nearby/`) | Nearby → Claim |
| Listing detail + rescue timeline | `ListingDetailDialog` (`features/donor/my-listings/`) | My Donations → card click |
| Route preview (map + stops + contacts) | `RoutePanel` (`shared/ui/route-dialog/`) | Nearby → Route, Deliveries → Navigate, via `openRouteDialog()` |
| Take a photo | `CameraDialog` (`shared/ui/image-picker/`) | `<app-image-picker>` → camera button |
| Turn on location | `LocationPermissionModal` (`shared/ui/`) | `AvailabilityService` when permission is blocked |
| Confirmations (release claim, cancel donation) | — (`message` only) | `dialog.confirm()` |

- `openRouteDialog(dialog, {heading, subheading, stops, contacts, note})` in
  `shared/ui/route-dialog/route-dialog.ts` is the one call site shape for the route
  preview — it owns the header, the size and the "Open in Google Maps" action, so a
  page only supplies data. Contacts are **data** (`RouteContact[]`), not projected
  markup: `DialogService` instantiates a body component, so there is no `ng-content`
  to project into.
- The two remaining `role="dialog"` elements — the `<app-date-picker>` calendar and
  the notification bell dropdown — are **anchored popovers**, not modals. They must
  stay positioned against their trigger and must *not* make the page inert, so they
  deliberately do not use `DialogService`.

### Form controls (`shared/ui`)
All four implement `ControlValueAccessor`, so they take `formControlName` /
`[(ngModel)]` directly, and share the same label / `required` / `hint` / `error`
chrome. Reach for these instead of raw `<input>`/`<select>`/`<button>` markup.

- **`<app-input>`** — `shared/ui/input/` — the config-driven field: `type` picks input / textarea / native select. Inputs: `type`, `label`, `placeholder`, `hint`, `error`, `icon`, `prefix`, `prefixIcon`, `required`, `rows`, `maxlength`, `inputmode`, `autocomplete`, `options`.
- **`<app-select>`** — `shared/ui/select/` — **searchable** select (combobox). Use when the list is long enough that scanning it is work, or when options carry an icon / second line — pass `[searchable]="false"` for a short list where the icons are the point (New Donation's Meal Type and Freshness do this). `<app-input type="select">` stays fine for plain choices with no adornment. Type-to-filter (matches label, description and value), full keyboard support (↑↓, Home/End, Enter, Esc, Tab), wraps past disabled options, flips above the field when there's no room below. Inputs: `options`, `label`, `placeholder`, `searchPlaceholder`, `emptyText`, `hint`, `error`, `icon`, `required`, `clearable`, `searchable`, `loading`. Outputs: `opened`, `closed`.
- **`<app-date-picker>`** — `shared/ui/date-picker/` — calendar + time-column picker replacing the unstylable native `date`/`time`/`datetime-local` widgets. Inputs: `mode` (`date` | `time` | `datetime`), `label`, `placeholder`, `hint`, `error`, `required`, `clearable`, `min`, `max`, `minuteStep` (default 5), `use12Hour` (default true), `weekStartsOn` (0 = Sun), `closeOnSelect`. Outputs: `opened`, `closed`.
- **`<app-button>`** — `shared/ui/button/` — `variant` (solid/outline/ghost/danger/success), `size`, `icon`, `iconPosition`, `iconOnly`, `loading` (own spinner, self-disabling), `block`.

> **`<app-date-picker>` value contract.** The control value uses the *same*
> string format as the native input it replaces — `YYYY-MM-DD`, `HH:mm`, or
> `YYYY-MM-DDTHH:mm`, all **local wall-clock**. `min`/`max` take the same. So it
> is a drop-in swap for an existing `type="datetime-local"` field, and the
> existing `new Date(v).toISOString()` mapping at the API boundary is unchanged.
> Parsing/formatting/grid maths live in `shared/util/date-value.ts` (pure, unit-tested).

```html
<app-select label="City" [options]="cities" formControlName="city" [clearable]="true" />
<app-date-picker mode="datetime" label="Pickup Deadline" formControlName="pickupDeadline"
                 [min]="nowValue" [required]="true" [error]="err('pickupDeadline')" />
```

Shared styling for the two popover controls (`.fb-trigger`, `.fb-popover`,
`.fb-msg`) lives in `styles.scss` — one copy, and it keeps each component's own
style block inside the 4kB `anyComponentStyle` budget.

### Other shared pieces
- `<app-status-badge [status]>` — icon + theme-aware colour per lowercase `ListingStatus` (Tailwind literal classes, not purge-affected).
- `<app-deadline-meter [deadline] [createdAt]>` — pickup-window progress bar (green→amber→red→grey), ticked by the app-wide `ClockService`.
- `<app-avatar [name] [imageUrl] [size]>` — image-or-2-letter-initials, `(error)` falls back to initials.
- `<app-role-badge [role] [size]>` — coloured role pill; `<app-success-anim>` — animated verified/success SVG.
- `[fbInputFilter]` directive — restricts typing to the input's `type` (tel/number → digits). `[appInfiniteScroll] (scrolled)` — IntersectionObserver sentinel for lazy paging.

## Models
- `listing-api.model.ts` — backend-faithful listing DTOs (`ApiListing`, `ApiListingSummary`, `ApiNearbyListing`, `ListingWriteBody`) + enum types + label maps + `toListingStatus`. `ListingCardData` (in `listing-card.ts`) is the minimal card shape both `ApiListing`/`ApiListingSummary` satisfy.
- `listing.model.ts` — the legacy/view `Listing` + lowercase `ListingStatus`, `STATUS_LABELS`, `TIMELINE_STEPS` (still used by shared UI and the not-yet-integrated mock pages).
- `user.model.ts` — session `User` (+ `id`), full `UserProfile`, `UpdateProfileBody`.
- `registration.model.ts` — `RegistrationDraft` / `RegisterPayload`.

## Dev run topology (current machine)
- Frontend: `ng serve --port 4201 --proxy-config proxy.conf.json` (port 4200 is taken by another project).
- Backend: `http://localhost:5101` (run the built DLL via `DOTNET_ROLL_FORWARD=Major` because only .NET 8/9/10 runtimes are installed, not .NET 6). Rebuild (`dotnet build`) after any backend source change before restarting.
- **`proxy.conf.json`** routes `/api` and `/uploads` to the backend, so the browser sees everything same-origin — no CORS needed, and `environment.apiUrl` is the relative `/api`.

## Decisions log
- **Additive integration, now complete.** Real backend wiring was originally added alongside the mock `ListingStore` so unbuilt pages kept working. Every page is now on the real API; `ListingStore`/`mock-data.ts` are no longer read by any screen and can be deleted once nothing imports them.
- **Filter on the server, not the client.** The envelope interceptor drops `TotalCount`, so a paged list only holds what has been scrolled in — filtering that locally under-reports without any visible symptom. Every status/role/diet/meal filter goes into the query string. The one deliberate exception is the notifications inbox, whose read-progress ring and category breakdown are *defined* over the whole loaded set.
- **`DisputeService` is separate from `AdminService`.** `POST /disputes` is open to any party on a listing; only list/resolve are admin. Keeping them together forced donor/volunteer/recipient pages to inject the admin console to report a problem.
- **Admin listings get their own model.** `GET /admin/listings` returns `AdminListingSummaryResponse`, not `ListingSummaryResponse` — it trades the food detail for the parties, and names only the donor. The table therefore shows volunteer/recipient as "Assigned" with the id on hover rather than inventing names the API never sent.
- **The platform report shows only what the API reports.** A hardcoded "CO₂ avoided" tile was removed: there is no such measure in `PlatformReportResponse`, and a fabricated figure on a page labelled "CSR-ready" is worse than an absent one.
- **Nominatim stays for reverse-geocoding.** `GET /api/geocode` is *forward* (address → coords) and backed by `MockGeocodingProvider`; the app needs coords → address. Switching would need a new backend action and a real provider.
- **Listings show title + food details, not names.** The Phase 2–5 endpoints return IDs, not donor/volunteer/recipient names, so listing cards render `title` + food info.
- **Volunteer "My Deliveries" is client-tracked, not server-read.** No "list my active deliveries" endpoint exists until backend Phase 8, and `GET /listings` is `DonorOnly`, so a volunteer's claims cannot be re-read from the API at all. `VolunteerDeliveriesStore` therefore tracks them from claim time and drives the real confirm-pickup/confirm-delivery calls. It mirrors the list into `localStorage` under `foodbridge.volunteerDeliveries.{userId}` (one bucket per account) so the page survives a reload; a claim released via `store.release()` is dropped from both. Demo/mock users without a backend `id` stay in-memory only.
- **Dev proxy over absolute API URL.** Chosen so the app is CORS-free on any port and needs no backend change.
