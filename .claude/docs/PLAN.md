# FoodBridge Frontend — Plan & Integration Status

Tracks how far the Angular client has been wired to the real backend. Phases
mirror the backend's `docs/PLAN.md` so the two stay aligned: a frontend module is
"integrated" only once the matching backend phase is complete AND the page calls
the real API (no mock).

> **Backend status:** fully complete (backend phases 0–11). Every REST endpoint
> the frontend needs now exists — remaining frontend work is wiring, not waiting.

Legend: ✅ integrated (real API) · 🟡 partial / built on mock data · ⬜ not started

## Phase 0 — Scaffold & cross-cutting — ✅
- [x] Standalone app, routing (auth layout + role-guarded shell), path aliases.
- [x] `ApiService` (HttpClient wrapper), HTTP interceptors (JWT + envelope unwrap), shared UI kit, theme/toast/storage services.
- [x] Global error handler, title strategy, `provideAppInitializer` → `GET /auth/me` hydration.
- [x] Shared UI additions: `RoleBadge`, `Avatar` (image-or-initials), `SuccessAnim`, `FbInputFilter` directive, `InfiniteScroll` directive.

## Phase 1 — Auth & Registration — ✅
Backend: Phase 2.
- [x] `send-otp → verify-otp → register` via `AuthService` + `AuthApiService`; JWT persisted + attached.
- [x] New-user session-token branch → register; existing-user → sign in; session-expiry recovery re-runs OTP.
- [x] OTP screen: auto-submit on 6 digits, paste, Enter, resend; reactive-form validation with inline errors + hints.
- [x] Register wizard: role → details → location (auto-GPS + reverse-geocode) → **mobile (login-style) → OTP** → create; clickable-back steps.

## Phase 2 — User / Profile — ✅
Backend: Phase 3.
- [x] Profile loads `GET /users/{id}`, saves `PUT`, availability `PATCH`, avatar upload (served via `/uploads` proxy).
- [x] Avatar synced into the session so the shell (topbar/sidebar) shows it; role badge + account-status pill.

## Phase 3 — Listings: Donor — ✅
Backend: Phase 4.
- [x] Create/edit (`POST`/`PUT /listings`) + image upload; My Listings with status tabs, detail + rescue timeline, cancel.
- [x] **Infinite scroll** + skeleton loaders on My Listings.

## Phase 4 — Listings: Volunteer — ✅
Backend: Phase 5.
- [x] Nearby (`GET /listings/nearby`, uses saved location) with **infinite scroll** + skeletons; claim → `VolunteerDeliveriesStore`.
- [x] Confirm pickup / delivery with required photo.
- [x] **My Deliveries** restyled to match Nearby (listing cards + stage filter chips + summary card): full pickup/deadline/ETA/prepared detail, donor + recipient contacts, drop-off banner, distance to the next stop, and a **route dialog** (you → pickup → drop-off) with "Open in Google Maps". Claims persist per user in `localStorage`.
- Known gap: the claimed list is client-tracked, not server-read (backend has no "my active deliveries" endpoint and `GET /listings` is DonorOnly).

## Phase 5 — Recipient side — ✅ *(newly completed)*
Backend: Phase 6.
- [x] Incoming feed (`GET /listings/incoming`) + **accept** / **reject** (shows reassignment note).
- [x] **Confirm receipt** (`POST /listings/{id}/confirm-receipt`) → toasts certificate number + points; tracked via `RecipientStore` (session).
- [x] Distribution history (`GET /listings/history`).
- [x] `RecipientService` + `RecipientStore`.
- Known gap: no backend "delivered, awaiting my confirmation" list → accepted listings tracked client-side (session-scoped, like volunteer deliveries).
- ⬜ `recipient/track` (delivery tracking map) still on mock — see Phase 6.

## Phase 6 — Real-time (SignalR) + tracking — ✅ *(newly completed)*
Backend: Phase 7.
- [x] **Notifications**: topbar bell loads `GET /api/notifications` and **marks read** (`PATCH .../read`); unread badge. (`NotificationService` hydrates on sign-in.)
- [x] **Live SignalR push** — `@microsoft/signalr` client added. `core/realtime/`:
  - `hub-connection.ts` — shared builder: `accessTokenFactory` (the WebSocket transport can't send an `Authorization` header; the backend honours `?access_token=` for `/hubs` paths only), automatic reconnect, origin-root URL from `environment.hubUrl`.
  - `NotificationsHubService` — connects on sign-in, `ReceiveNotification` → `NotificationService.receive()` (idempotent by id); refetches on reconnect to close the offline gap. A failed connect degrades silently to REST.
  - `TrackingHubService` — one shared connection, per-listing groups; `watch(id)` joins/leaves with the subscription, `report()` is the volunteer's `UpdateLocation`. Rejoins all groups after a reconnect.
  - `LocationBroadcastService` — streams the volunteer's GPS while anything is `PickedUp`. **This is what populates the backend's tracking store** — without it `GET /listings/{id}/track` is empty forever. Mounted on the `Shell` so it survives navigation; self-gates on `inTransit()` so other roles never open a socket.
- [x] **Delivery tracking** — `recipient/track` is on the real API: `GET /listings/{id}/track` for the last known position, then `LocationUpdated` for live movement. Volunteer + pickup pins on `<app-fb-map>`, "Live" badge, relative "updated N min ago", confirm-receipt inline.
- [x] Dead `core/http/socket.ts` (raw-WebSocket helper, zero callers, wrong protocol for SignalR) deleted.
- [x] `/hubs` added to `proxy.conf.json` with `"ws": true` — it is a sibling of `/api`, not under it, so it needed its own entry for the upgrade to pass through.
- [x] `GeocodingService` uses the app's reverse-geocode path already (register autofill).
- Note: `GET /api/geocode` is still unused by choice — it is *forward* geocoding (address → coords) backed by `MockGeocodingProvider`, while the app needs *reverse* (coords → address). Nominatim stays until a real provider and a reverse action exist.

## Phase 7 — Certificates, Leaderboard, Reports — ✅ *(newly completed)*
Backend: Phase 8.
- [x] **Certificates** (donor): `GET /certificates` + **PDF download** (blob, auth header attached).
- [x] **Leaderboard** (volunteer): `GET /leaderboard` + `GET /leaderboard/me` in one `forkJoin` (a failing `me` degrades to the caller's row in the ranked page rather than blanking the board). Your-standing hero card with points-to-next-place, top-3 podium, and a full ranking with medal-tinted rank pills and share-of-leader rails.
- [x] **Reports** (recipient): `GET /reports/recipient` — 4 stat tiles (two reported, two derived: meals/delivery and active months), monthly bar chart beside a month-by-month breakdown with a best-month callout, and **CSV export** (`shared/util/csv.ts`).
- [x] **History** (volunteer + recipient): totals + monthly chart from the role's report endpoint; rows from `GET /listings/history` (recipient) or `VolunteerDeliveriesStore.completed` (volunteer, with an on-page note that older deliveries aren't listed individually). CSV export on both.
- [x] Report services for donor/volunteer/platform exist (`ReportService`) — the volunteer report now backs the History page; no dedicated donor report *page* yet (could feed the dashboard).

## Phase 8 — Admin — ✅ *(newly completed)*
Backend: Phase 9.
- [x] `AdminService` wired to real endpoints: dashboard, listings, accounts (+ `accountStatus` filter), verify/suspend, platform report.
- [x] **All admin pages are on the real API** — no page reads `mock-data.ts` any more:
  - **All Listings** → `GET /admin/listings?status=` with infinite scroll. Typed `AdminListingSummary` (**not** `ApiListingSummary` — the admin DTO trades food detail for the parties, and names only the donor, so volunteer/recipient render as "Assigned" with the id on hover).
  - **Verifications** → `GET /admin/accounts?role=&accountStatus=`, `PATCH …/verify`, `…/suspend`. Both filters are server-side; suspend confirms first.
  - **Disputes** → two server-filtered calls (`?status=Open` / `Resolved`) rather than one page split client-side, plus a resolve dialog that posts the required note.
  - **Platform Reports** → `GET /reports/platform`, 4 stat tiles + monthly chart + CSV export. The invented "CO₂ avoided" tile was removed — the API has no such measure.
- [x] `DisputeService` extracted from `AdminService`: `POST /disputes` is `[Authorize]` for any party on the listing, so a donor/volunteer/recipient page must be able to inject it without pulling in the admin console.

## Phase 9 — Phase-11 backend additions — ✅ *(newly completed)*
Backend: Phase 11 added these.
- [ ] Show **contact info** on listings (`donorName`/`donorMobile`, etc. — already on `ApiListing`, gated by backend). *(Track page now uses `volunteerName`/`volunteerMobile`.)*
- [x] **Diet/meal filters** on My Listings — server-side `dietType`/`mealType` via `ListingService.listMine(status, page, size, filters)`. The **status tab is now server-side too**: it used to filter the already-loaded page, which meant a tab only searched however far the user had scrolled.
- [x] **Unclaim** button for volunteers (`POST /listings/{id}/unclaim`) — on the Nearby card after a claim.
- [x] **Raise a dispute** (`POST /disputes`) — `shared/ui/dispute-dialog/` with a self-contained `openRaiseDisputeDialog(dialog, injector, {listingId, listingTitle})`. Wired into **My Donations** (detail dialog, only once a listing has left Pending), **My Deliveries** (every stage) and **Incoming Food** (both sections). Previously no role had any way to report a problem.

## Phase 12 — Dashboards, pickup ETA, drop-off & notifications — ✅ *(newly completed)*
Backend: consolidated dashboard endpoints + listing/claim/notification additions.
- [x] **Consolidated dashboards** — `DashboardService` calls `GET /dashboard/{donor|volunteer|recipient}`; the shared `Dashboard` component now renders **real** stat tiles, a monthly bar chart (`*ByMonth`), and role lists (recent activity, nearby recipients, open listings, badges, incoming food, top donors). Admin tab uses the existing `admin/dashboard` incl. new `listingsByStatus`/`accountsByStatus`. Mock `STATS`/`ListingStore` no longer used here.
- [x] **Pickup ETA on claim** — `ListingService.claim(id, estimatedPickupAtUtc?)` sends the optional `?estimatedPickupAtUtc=` query; volunteer **claim dialog** lets them set an optional ETA (bounded by the pickup deadline; keeps dialog open on 422 to adjust).
- [x] **`estimatedPickupAtUtc` + `suggestedDropOffLocation`** added to `ApiListing`; deliveries cards show the ETA and a **drop-off banner** (with tailored confirm-pickup toast) when no recipient could be matched.
- [x] **Notification type → icon/colour** map (`notificationMeta`) in the topbar, covering `NewListingNearby`, `DropOffLocationSuggested`, `DonationConfirmed`, `PointsAwarded`, `Local`. (Now also delivered live — see Phase 6.)
- [x] **Admin drop-off CRUD is built** (`/app/dropoffLocations`): `DropOffLocationService` + a map-picker page with reverse-geocode autofill and retire/reactivate. Previously the endpoints were registered but had no service and no UI, so nothing could ever insert a row — and `VolunteerListingService` reads exactly this table to populate `suggestedDropOffLocation`. The page leads with a warning when no location is active, because that silently disables the whole fallback. There is no DELETE server-side, so retiring is `deactivate`.

## Phase 10 — Polish & hardening — 🟡
- [x] Demo copy removed from login/OTP; toast dedupe + fixed width; button borders normalized.
- [x] Loading/skeleton + error states on all integrated list pages.
- [x] Mock `ListingStore` is no longer read by any *page* — dashboard, admin and tracking are all on the real API. The store itself still exists (`mock-data.ts` seeds it) and can now be deleted once nothing imports it.
- [x] `npm start` includes the proxy; `npm run backend` runs the API (roll-forward).
- [ ] Production `environment.prod.ts` API base + build config. *(`hubUrl: '/hubs'` added to both environments.)*

## Model corrections (found while wiring — these were latent runtime bugs)
Three frontend models did not match the backend DTOs; each is verified against a live
response now.
- `PlatformReport` claimed `totalListings`/`totalDonors`/`totalVolunteers`/`totalRecipients`/`mealsByMonth`. The API returns `totalMealsDonated`, `totalDeliveries`, `totalCertificates`, `totalUsers`, `mealsDonatedByMonth` — every field would have read `undefined`.
- `Dispute` had `resolvedAtUtc`; `DisputeResponse` has **`resolvedByUserId`** and no timestamp.
- `AdminService.listings()` was typed `ApiListingSummary[]` but `GET /admin/listings` returns `AdminListingSummaryResponse` (no `foodType`/`dietType`/`mealType`/`freshnessTag`; adds `donorName`, `volunteerId`, `recipientId`). Now `AdminListingSummary`.
- `AdminAccount` was missing `isAvailable`.

## Current run state
- Frontend `http://localhost:4201`, backend `http://localhost:5101` (proxied via `/api`, `/uploads`).
- Dev login: any mobile, OTP **`123456`**. Seed accounts: donor `9999900001`, volunteer `9999900003`, recipient `9999900006`/`9999900007`, admin `9999900000`.
