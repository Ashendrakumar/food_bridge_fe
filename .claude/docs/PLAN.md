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

## Phase 6 — Real-time (SignalR) + tracking — 🟡 *(REST baseline done)*
Backend: Phase 7.
- [x] **Notifications**: topbar bell loads `GET /api/notifications` and **marks read** (`PATCH .../read`); unread badge. (`NotificationService` hydrates on sign-in.)
- [ ] Live SignalR push (`/hubs/notifications`, `/hubs/tracking`) — needs the `@microsoft/signalr` client. Currently REST-only.
- [ ] Delivery tracking map (`GET /listings/{id}/track`) — `TrackingService` wired; `recipient/track` page still mock.
- [x] `GeocodingService` uses the app's reverse-geocode path already (register autofill).

## Phase 7 — Certificates, Leaderboard, Reports — ✅ *(newly completed)*
Backend: Phase 8.
- [x] **Certificates** (donor): `GET /certificates` + **PDF download** (blob, auth header attached).
- [x] **Leaderboard** (volunteer): `GET /leaderboard` + `GET /leaderboard/me` in one `forkJoin` (a failing `me` degrades to the caller's row in the ranked page rather than blanking the board). Your-standing hero card with points-to-next-place, top-3 podium, and a full ranking with medal-tinted rank pills and share-of-leader rails.
- [x] **Reports** (recipient): `GET /reports/recipient` — 4 stat tiles (two reported, two derived: meals/delivery and active months), monthly bar chart beside a month-by-month breakdown with a best-month callout, and **CSV export** (`shared/util/csv.ts`).
- [x] **History** (volunteer + recipient): totals + monthly chart from the role's report endpoint; rows from `GET /listings/history` (recipient) or `VolunteerDeliveriesStore.completed` (volunteer, with an on-page note that older deliveries aren't listed individually). CSV export on both.
- [x] Report services for donor/volunteer/platform exist (`ReportService`) — the volunteer report now backs the History page; no dedicated donor report *page* yet (could feed the dashboard).

## Phase 8 — Admin — 🟡 *(service wired, pages pending)*
Backend: Phase 9.
- [x] `AdminService` wired to real endpoints: dashboard, listings, accounts, verify/suspend, disputes (list/raise/resolve), platform report.
- [ ] Admin pages (dashboard, all-listings, verifications, disputes, platform reports) still render mock data.

## Phase 9 — Phase-11 backend additions (frontend TODO) — 🟡
Backend: Phase 11 added these; frontend not yet using them.
- [ ] Show **contact info** on listings (`donorName`/`donorMobile`, etc. — already on `ApiListing`, gated by backend).
- [ ] **Diet/meal filters** on My Listings. *(Nearby done — server-side `dietType`/`mealType`.)*
- [x] **Unclaim** button for volunteers (`POST /listings/{id}/unclaim`) — on the Nearby card after a claim.
- [ ] **Raise a dispute** action (`POST /disputes`) for any party on a listing.

## Phase 12 — Dashboards, pickup ETA, drop-off & notifications — ✅ *(newly completed)*
Backend: consolidated dashboard endpoints + listing/claim/notification additions.
- [x] **Consolidated dashboards** — `DashboardService` calls `GET /dashboard/{donor|volunteer|recipient}`; the shared `Dashboard` component now renders **real** stat tiles, a monthly bar chart (`*ByMonth`), and role lists (recent activity, nearby recipients, open listings, badges, incoming food, top donors). Admin tab uses the existing `admin/dashboard` incl. new `listingsByStatus`/`accountsByStatus`. Mock `STATS`/`ListingStore` no longer used here.
- [x] **Pickup ETA on claim** — `ListingService.claim(id, estimatedPickupAtUtc?)` sends the optional `?estimatedPickupAtUtc=` query; volunteer **claim dialog** lets them set an optional ETA (bounded by the pickup deadline; keeps dialog open on 422 to adjust).
- [x] **`estimatedPickupAtUtc` + `suggestedDropOffLocation`** added to `ApiListing`; deliveries cards show the ETA and a **drop-off banner** (with tailored confirm-pickup toast) when no recipient could be matched.
- [x] **Notification type → icon/colour** map (`notificationMeta`) in the topbar, covering `NewListingNearby`, `DropOffLocationSuggested`, `DonationConfirmed`, `PointsAwarded`, `Local`. (Still REST-only — no SignalR hub client yet.)
- [x] `DropOffLocation` model + `dropoff-locations` endpoints registered (admin CRUD UI not built — surfaces only via `suggestedDropOffLocation`).

## Phase 10 — Polish & hardening — 🟡
- [x] Demo copy removed from login/OTP; toast dedupe + fixed width; button borders normalized.
- [x] Loading/skeleton + error states on all integrated list pages.
- [ ] Retire the mock `ListingStore` once dashboard + admin + tracking are on the real API.
- [x] `npm start` includes the proxy; `npm run backend` runs the API (roll-forward).
- [ ] Production `environment.prod.ts` API base + build config.

## Current run state
- Frontend `http://localhost:4201`, backend `http://localhost:5101` (proxied via `/api`, `/uploads`).
- Dev login: any mobile, OTP **`123456`**. Seed accounts: donor `9999900001`, volunteer `9999900003`, recipient `9999900006`/`9999900007`, admin `9999900000`.
