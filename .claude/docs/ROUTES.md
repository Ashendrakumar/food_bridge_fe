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
| `dashboard` | Dashboard | all | (aggregates; mock) | 🟡 |
| `create` | Create Listing | donor | `POST /listings`, `PUT /listings/{id}`, `GET /listings/{id}`, `POST /listings/{id}/images` | ✅ |
| `listings` | My Listings | donor | `GET /listings?status=&page=&pageSize=`, `POST /listings/{id}/cancel` | ✅ |
| `certificates` | Certificates | donor | `GET /certificates`, `GET /certificates/{id}/pdf` | 🟡 |
| `nearby` | Nearby Listings | volunteer | `GET /listings/nearby?latitude=&longitude=&radiusKm=`, `POST /listings/{id}/claim`, `GET /users/{id}` (own location) | ✅ |
| `deliveries` | My Deliveries | volunteer | `POST /listings/{id}/confirm-pickup`, `POST /listings/{id}/confirm-delivery` (session-tracked list) | ✅ |
| `leaderboard` | Leaderboard | volunteer | `GET /leaderboard` | 🟡 |
| `incoming` | Incoming Food | recipient | `POST /listings/{id}/accept`, `POST /listings/{id}/reject` | 🟡 |
| `track` | Track Delivery | recipient | `GET /listings/{id}/track`, `POST /listings/{id}/confirm-receipt` | 🟡 |
| `reports` | Reports | recipient | `GET /reports/recipient/{id}` | 🟡 |
| `history` | History | volunteer, recipient | `GET /volunteers/{id}/history` / `GET /recipients/{id}/history` | 🟡 |
| `adminListings` | All Listings | admin | `GET /admin/listings` | 🟡 |
| `verifications` | Verifications | admin | `GET /admin/accounts`, `POST /admin/accounts/{id}/verify`, `.../suspend` | 🟡 |
| `disputes` | Disputes | admin | `GET /admin/disputes`, `POST /admin/disputes/{id}/resolve` | 🟡 |
| `adminReports` | Reports | admin | `GET /admin/reports` | 🟡 |
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
- **ListingService** → `listings` (POST/GET), `listings/{id}` (GET/PUT), `listings/{id}/cancel`, `listings/{id}/images` (multipart `file`), `listings/nearby`, `listings/{id}/claim`, `listings/{id}/confirm-pickup` / `confirm-delivery` (multipart `photo`)

### Query params (as the backend expects)
- `GET /listings` — `page`, `pageSize`, `status` (Listings.Status enum name).
- `GET /listings/nearby` — `latitude`, `longitude`, `radiusKm` (≤50), `page`, `pageSize`.

## Notes
- `POST /listings/{id}/images` field is `file`; pickup/delivery photo field is `photo`; avatar field is `file` — these matched the backend after fixing earlier speculative names.
- Paged list endpoints return the `PagedResponse` envelope; the interceptor unwraps `data` to the array (page metadata is dropped client-side — pages currently fetch a large `pageSize`).
- Mock (🟡) rows call endpoints that will exist in backend Phases 6–9; today those pages read the in-memory `ListingStore` / `mock-data.ts` instead.
