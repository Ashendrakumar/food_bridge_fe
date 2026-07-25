# FoodBridge Frontend — Plan & Integration Status

Tracks how far the Angular client has been wired to the real backend. Phases
mirror the backend's `docs/PLAN.md` so the two stay aligned: a frontend module is
"integrated" only once the matching backend phase is complete AND the page calls
the real API (no mock).

Legend: ✅ integrated (real API) · 🟡 built on mock data (backend not ready) · ⬜ not started

## Phase 0 — Scaffold & cross-cutting
- [x] Standalone app, routing (auth layout + role-guarded shell), path aliases.
- [x] `ApiService` (HttpClient wrapper), `BaseCrudService`, shared UI kit, theme/toast/storage services.
- [x] Global error handler, title strategy.

## Phase 1 — Auth & Registration — ✅
Backend: Phase 2 complete.
- [x] `send-otp → verify-otp → register` flow via `AuthService` + `AuthApiService`.
- [x] JWT persisted; `authTokenInterceptor` attaches it; `apiEnvelopeInterceptor` unwraps responses.
- [x] New-user session-token branch → register; existing-user branch → sign in.
- [x] Login, OTP, Register pages wired; role/session guards.

## Phase 2 — User / Profile — ✅
Backend: Phase 3 complete.
- [x] Profile page loads `GET /users/{id}`, saves `PUT /users/{id}`.
- [x] Availability toggle (`PATCH /users/{id}/availability`) for volunteers/recipients.
- [x] Avatar upload (`POST /users/{id}/avatar`), served via the `/uploads` proxy.
- [x] `UserService` + `UserProfile`/`UpdateProfileBody` models.

## Phase 3 — Listings: Donor — ✅
Backend: Phase 4 complete.
- [x] Create listing (`POST /listings`) + image upload (`POST /listings/{id}/images`).
- [x] My Listings (`GET /listings`, status tabs), detail + rescue timeline.
- [x] Edit while Pending (`PUT /listings/{id}`), cancel (`POST /listings/{id}/cancel`).
- [x] `ListingService` + `listing-api.model.ts`.

## Phase 4 — Listings: Volunteer — ✅
Backend: Phase 5 complete.
- [x] Nearby (`GET /listings/nearby`, uses the volunteer's saved location, 10 km).
- [x] Claim (`POST /listings/{id}/claim`) → adds to `VolunteerDeliveriesStore`.
- [x] Confirm pickup / delivery with required photo (`.../confirm-pickup`, `.../confirm-delivery`).
- Known gap: active-deliveries list is session-scoped (no backend list endpoint until Phase 8).

## Phase 5 — Recipient side — 🟡
Backend: Phase 6 **not done**.
- [ ] Incoming, accept/reject, confirm-receipt, distribution history.
- Pages exist (`recipient/incoming`, `recipient/track`, `recipient/reports`) on the mock `ListingStore`.

## Phase 6 — Real-time (SignalR) + tracking — ⬜
Backend: Phase 7 not done.
- [ ] Live notifications (topbar bell), delivery tracking map, notification list/read.
- `socket.ts`, `notification*.service.ts`, `tracking.service.ts` are scaffolds.

## Phase 7 — Certificates, Leaderboard, Reports — 🟡
Backend: Phase 8 not done.
- [ ] Donor certificates + PDF, volunteer leaderboard, donor/recipient report charts.
- Pages exist on mock data.

## Phase 8 — Admin — 🟡
Backend: Phase 9 not done.
- [ ] Dashboard stats, all-listings, verifications (verify/suspend), disputes, platform reports.
- Pages exist on mock data.

## Phase 9 — Polish & hardening — ⬜
- [ ] Remove remaining demo copy (e.g. the "Demo OTP: 123456" hint in `otp.html`).
- [ ] Loading/skeleton + error states across all integrated pages (done for Phases 1–4).
- [ ] Retire the mock `ListingStore` once recipient/admin/dashboard are on the real API.
- [ ] `npm start` script that includes the proxy flag.
- [ ] Production `environment.prod.ts` API base + build config.

## Current run state
- Frontend `http://localhost:4201`, backend `http://localhost:5101` (proxied via `/api`, `/uploads`).
- Dev login: any mobile, OTP **`123456`**. Seed accounts: donor `9999900001`, volunteer `9999900003`, recipient `9999900007`, admin `9999900000`.
