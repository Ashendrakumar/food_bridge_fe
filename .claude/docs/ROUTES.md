# FoodBridge Frontend — Routes & API Surface

All client-side routes, their guards/roles, and the backend endpoints each page
consumes. Route table lives in `app.routes.ts`; the in-app views come from
`core/config/routes.config.ts` (`APP_VIEWS`), which is the single source of truth
for both the router children and the sidebar (`nav.config.ts`).

API paths are relative to `environment.apiUrl` (`/api`, proxied to the backend).
Full request/response contracts are in `../../FoodBridgeBE/docs/API-CONTRACTS.md`.

Legend: ✅ real API · 🟡 mock data (backend not ready)

## Route structure
```
''  (AuthLayout)                          public
├── ''            → redirect to /login
├── login         → Login
├── otp           → Otp
└── register      → Register

'app'  (Shell)                            [authGuard]
├── ''            → redirect to /app/dashboard
├── <APP_VIEWS>   → each view [roleGuard] with data.roles   (see table)
└── '**'          → ComingSoon

'**' → redirect to /login
```
Navigation constants: `APP_ROUTES` in `core/config/app-routes.ts`
(`/login`, `/otp`, `/register`, `/app`, `/app/dashboard`, `appView(id) → /app/{id}`).

## Guards
- **`authGuard`** — on `/app`; redirects to `/login` when no `currentUser`.
- **`roleGuard`** — on each view; redirects to `/app/dashboard` if the user's role isn't in `route.data.roles`.

## Auth routes → API
| Path | Component | API called | Status |
|---|---|---|---|
| `/login` | Login | `POST /auth/send-otp` | ✅ |
| `/otp` | Otp | `POST /auth/verify-otp` | ✅ |
| `/register` | Register | `POST /auth/send-otp`, `POST /auth/verify-otp`, `POST /auth/register` | ✅ |
| (session) | AuthService | `POST /auth/logout`, `GET /auth/me` | ✅ |

## In-app views (`/app/{id}`)
| id (`/app/{id}`) | Title | Roles | API called | Status |
|---|---|---|---|---|
| `dashboard` | Dashboard | all | `GET /dashboard/donor`, `/dashboard/volunteer`, `/dashboard/recipient` (opt. `?latitude=&longitude=`); admin → `GET /admin/dashboard` | ✅ |
| `create` | New Donation | donor | `POST /listings`, `PUT /listings/{id}`, `GET /listings/{id}`, `POST /listings/{id}/images` | ✅ |
| `listings` | My Donations | donor | `GET /listings?status=&dietType=&mealType=&page=&pageSize=`, `POST /listings/{id}/cancel`, `POST /disputes` | ✅ |
| `certificates` | Certificates | donor | `GET /certificates`, `GET /certificates/{id}/pdf` | ✅ |
| `nearby` | Nearby Listings | volunteer | `GET /listings/nearby?latitude=&longitude=&radiusKm=&dietType=&mealType=`, `POST /listings/{id}/claim?estimatedPickupAtUtc=` (opt. ETA), `POST /listings/{id}/unclaim` (release), live GPS via `GeolocationService` | ✅ |
| `deliveries` | My Deliveries | volunteer | `POST /listings/{id}/confirm-pickup`, `POST /listings/{id}/confirm-delivery`, `POST /listings/{id}/unclaim` (release) — list is client-tracked (`VolunteerDeliveriesStore`, localStorage per user), not server-read. **No location on load**: the page's data comes from the claims themselves, so GPS is resolved only when a volunteer presses Navigate, then cached for the session | ✅ |
| `leaderboard` | Leaderboard | volunteer | `GET /leaderboard`, `GET /leaderboard/me` | ✅ |
| `incoming` | Incoming Food | recipient | `GET /listings/incoming`, `POST /listings/{id}/accept`, `POST /listings/{id}/reject`, `GET /listings/available-nearby?latitude=&longitude=&radiusKm=`, `POST`/`DELETE /listings/{id}/request`, live GPS via `GeolocationService` | ✅ |
| `track` | Track Delivery | recipient | `GET /listings/incoming`, `GET /listings/{id}/track`, **hub** `/hubs/tracking` (`JoinTracking` → `LocationUpdated`), `POST /listings/{id}/confirm-receipt` | ✅ |
| `reports` | Reports | recipient | `GET /reports/recipient` | ✅ |
| `history` | History | volunteer, recipient | `GET /reports/volunteer` / `GET /reports/recipient` + `GET /listings/history` | ✅ |
| `adminListings` | All Listings | admin | `GET /admin/listings?status=&page=&pageSize=` | ✅ |
| `verifications` | Verifications | admin | `GET /admin/accounts?role=&accountStatus=`, `PATCH /admin/accounts/{id}/verify`, `.../suspend` | ✅ |
| `disputes` | Disputes | admin | `GET /disputes?status=`, `PATCH /disputes/{id}/resolve` | ✅ |
| `dropoffLocations` | Drop-off Points | admin | `GET`/`POST /dropoff-locations`, `PATCH /dropoff-locations/{id}/activate`, `.../deactivate` | ✅ |
| `adminReports` | Reports | admin | `GET /reports/platform` | ✅ |
| `notifications` | Notifications | all | `GET /notifications?page=&pageSize=`, `PATCH /notifications/{id}/read` | ✅ |
| `profile` | Profile | all | `GET /users/{id}`, `PUT /users/{id}`, `PATCH /users/{id}/availability`, `POST /users/{id}/avatar` | ✅ |
| `settings` | Settings | all | (local prefs; theme) | 🟡 |

## API endpoint registry
Canonical relative paths live in `core/config/api-endpoints.ts` (`API_ENDPOINTS`),
grouped by module (auth, users, listings, volunteers, recipients, tracking,
certificates, notifications, admin, reports). Never inline endpoint strings in
services/components — add them there.

### Integrated endpoints (called by real services)
- **AuthApiService** → `auth/send-otp`, `auth/verify-otp`, `auth/register`, `auth/logout`, `auth/me`
- **UserService** → `users/{id}` (GET/PUT), `users/{id}/availability` (PATCH `{isAvailable}`), `users/{id}/avatar` (POST multipart `file`)
- **ListingService** → `listings` (POST/GET), `listings/{id}` (GET/PUT), `listings/{id}/cancel`, `listings/{id}/images` (multipart `file`), `listings/nearby`, `listings/{id}/claim`, `listings/{id}/unclaim`, `listings/{id}/confirm-pickup` / `confirm-delivery` (multipart `photo`)
- **RecipientService** → `listings/available-nearby`, `listings/{id}/request` (POST/DELETE), `listings/incoming`, `listings/{id}/accept` / `reject` / `confirm-receipt`, `listings/history`
- **NotificationApiService** → `notifications` (GET, paged, `isRead`), `notifications/{id}/read` (PATCH). `markManyRead` fans out one PATCH per id — there is no bulk endpoint yet.
- **AdminService** → `admin/dashboard`, `admin/listings`, `admin/accounts`, `admin/accounts/{id}/verify` / `suspend`, `reports/platform`
- **DisputeService** → `disputes` (POST any party / GET admin), `disputes/{id}/resolve` (PATCH admin)
- **DropOffLocationService** → `dropoff-locations` (GET/POST), `dropoff-locations/{id}/activate` / `deactivate`
- **TrackingService** → `listings/{id}/track`
- **CertificateService** → `certificates`, `certificates/{id}/pdf`
- **LeaderboardService (VolunteerService)** → `leaderboard`, `leaderboard/me`
- **ReportService** → `reports/donor`, `reports/volunteer`, `reports/recipient`
- **DashboardService** → `dashboard/donor` / `volunteer` / `recipient`
- **DonorAddressService** → `donor-addresses` (GET/POST), `donor-addresses/{id}` (PUT/DELETE)

### SignalR hubs (`core/realtime/`)
Mapped at the **origin root**, not under `apiUrl` — `environment.hubUrl` is `/hubs`, with its
own `proxy.conf.json` entry (`"ws": true`) for the WebSocket upgrade.
- **`/hubs/notifications`** (`NotificationsHubService`) — server pushes `ReceiveNotification` to the connection's `user:{id}` group → `NotificationService.receive()`.
- **`/hubs/tracking`** (`TrackingHubService`) — client invokes `JoinTracking` / `LeaveTracking` / `UpdateLocation`; server broadcasts `LocationUpdated` to the `listing:{id}` group.
- Both are `[Authorize]`. The WebSocket transport cannot set an `Authorization` header, so
  the client passes the JWT via `accessTokenFactory` → `?access_token=`; the backend's
  `JwtBearerEvents.OnMessageReceived` accepts that **only** for `/hubs` paths.
- `LocationBroadcastService` (mounted on `Shell`) streams the volunteer's GPS while any
  listing is `PickedUp`. It is the only writer to the backend's tracking store — without it
  `GET /listings/{id}/track` never returns a position.

### Query params (as the backend expects)
- `GET /listings` — `page`, `pageSize`, `status` (Listings.Status enum name), `dietType`, `mealType`.
- `GET /listings/nearby` — `latitude`, `longitude`, `radiusKm` (≤50), `dietType`, `mealType`, `page`, `pageSize`.
- `GET /notifications` — `isRead` (optional), `page`, `pageSize`.
- `GET /listings/available-nearby` — `latitude`, `longitude`, `radiusKm` (≤50), `page`, `pageSize`.
- `GET /admin/listings` — `status`, `page`, `pageSize`.
- `GET /admin/accounts` — `role`, `accountStatus`, `page`, `pageSize`.
- `GET /disputes` — `status` (`Open` | `Resolved`), `page`, `pageSize`.

> **Filter server-side, not client-side.** The envelope interceptor drops `TotalCount`, so a
> paged list only ever holds what has been scrolled in. Filtering that locally silently
> under-reports — which is why the My Donations status tab and every admin filter now go to
> the server. Client-side filtering is correct only where the page deliberately holds the
> whole set (the notifications inbox, whose read-progress ring and category breakdown are
> computed over all loaded rows).

## Notes
- `POST /listings/{id}/images` field is `file`; pickup/delivery photo field is `photo`; avatar field is `file` — these matched the backend after fixing earlier speculative names.
- Paged list endpoints return the `PagedResponse` envelope; the interceptor unwraps `data` to the array (page metadata is dropped client-side — pages currently fetch a large `pageSize`).
- No page reads `mock-data.ts` / `ListingStore` any more — every row above is on the real API.
- **Endpoints deliberately not called:** `GET /api/geocode` (forward geocoding backed by `MockGeocodingProvider`; the app needs *reverse*, so `GeocodingService` uses Nominatim), `GET /certificates/{id}` and `GET /donor-addresses/{id}` (same shape as the list rows, so no caller needs a second fetch). All three stay in `API_ENDPOINTS` as documentation of the surface.
- **Raise a dispute** is available to every non-admin role via `openRaiseDisputeDialog()` in `shared/ui/dispute-dialog/`. It resolves `DisputeService`/`ToastService` off the caller's `Injector`, so a page only supplies its `DialogService` and the listing.
- Notifications are one module across two surfaces: the topbar bell (`NotificationBell`, latest 4 + filters + "View all") and the `notifications` inbox page. Both render `NotificationItem` rows and `NotificationFilters` chips over the same `NotificationService` state, so a read on one shows on the other. Filter buckets and per-type icon/label/colour live in `core/models/notification.model.ts`.
- **Notification rows navigate.** Activating a row marks it read *and* opens the page it is about, via `NotificationRouter` (`core/services/notification-router.service.ts`): `NewListingNearby` → `nearby`, `DropOffLocationSuggested` → `deliveries`, `DonationConfirmed` → `certificates`, `PointsAwarded` → `leaderboard`; `Local` and unknown types stay inert. The destination is a *page*, not a record — the backend inserts every notification with `PayloadJson` null, so there is no id to deep-link to. The mapping is per-type (each backend type is dispatched to exactly one role) and re-checked against the signed-in role's `AppView.roles` before navigating, so a role never gets bounced by `roleGuard`. Rows render the destination as a "View nearby listings →" affordance, so an inert row doesn't look clickable-through.
- Inbox paging uses infinite scroll: since the envelope interceptor drops `TotalCount`, "is there more?" is inferred from a full-length page (`rows.length === pageSize`).
- **Recipients get food two ways.** *Push*: nothing involves the NGO until a volunteer confirms pickup, at which point the backend's `RecipientMatcher` assigns the nearest **Verified + available + located** recipient and it lands in `GET /listings/incoming` (`Status = PickedUp`). *Pull* (Incoming Food's "Available near you"): the NGO browses uncollected donations around its live GPS position and reserves one with `POST /listings/{id}/request`, which pre-sets `RecipientId` so confirm-pickup keeps it instead of running the matcher. Either way it still arrives in `incoming` for the usual accept/reject. `DELETE /listings/{id}/request` releases a reservation while the food is still uncollected — without it a stray request would pin the listing forever, since the matcher only runs when `RecipientId` is null.
- Because matching requires `AccountStatus = Verified`, an unverified NGO is never routed anything. Incoming Food surfaces that (and "offline", and "suspended") as an explicit note rather than an empty list — `AvailabilityService.accountStatus` carries it, read off the profile fetch that already hydrates the availability toggle.
