/**
 * Central registry of backend API endpoints — mirrors the FoodBridge API
 * Specification (46 REST endpoints + 2 WebSocket channels across 11 modules).
 *
 * Paths are **relative** — `ApiService` prefixes `environment.apiUrl`.
 * Never inline endpoint strings in services/components; add them here so the
 * whole app has a single source of truth for the API surface.
 */

type Id = string | number;

export const API_ENDPOINTS = {
  // 1. Authentication & Registration (5)
  auth: {
    sendOtp: 'auth/send-otp',
    verifyOtp: 'auth/verify-otp',
    register: 'auth/register',
    logout: 'auth/logout',
    me: 'auth/me',
    refresh: 'auth/refresh',
  },

  // 2. User / Profile (4)
  users: {
    base: 'users',
    register: 'auth/register',
    byId: (id: Id) => `users/${id}`,
    byMobile: (mobile: string) => `users/by-mobile/${mobile}`,
    availability: (id: Id) => `users/${id}/availability`,
    avatar: (id: Id) => `users/${id}/avatar`,
  },

  // 3 & 4. Listings — Donor + Volunteer side (10)
  listings: {
    base: 'listings',
    byId: (id: Id) => `listings/${id}`,
    cancel: (id: Id) => `listings/${id}/cancel`,
    images: (id: Id) => `listings/${id}/images`,
    // Volunteer
    nearby: 'listings/nearby',
    claim: (id: Id) => `listings/${id}/claim`,
    confirmPickup: (id: Id) => `listings/${id}/confirm-pickup`,
    confirmDelivery: (id: Id) => `listings/${id}/confirm-delivery`,
    // Recipient
    accept: (id: Id) => `listings/${id}/accept`,
    reject: (id: Id) => `listings/${id}/reject`,
    confirmReceipt: (id: Id) => `listings/${id}/confirm-receipt`,
    // Tracking
    track: (id: Id) => `listings/${id}/track`,
  },

  // 5. Volunteer Data (3)
  volunteers: {
    deliveries: (id: Id) => `volunteers/${id}/deliveries`,
    history: (id: Id) => `volunteers/${id}/history`,
    leaderboard: 'leaderboard',
  },

  // 6. Recipient Side (2 GETs; the listing actions live under `listings`)
  recipients: {
    incoming: (id: Id) => `recipients/${id}/incoming`,
    history: (id: Id) => `recipients/${id}/history`,
  },

  // 7. Tracking / Maps (2 REST + 1 WS)
  tracking: {
    geocode: 'geocode',
    ws: (listingId: Id) => `ws/tracking/${listingId}`,
  },

  // 8. Certificates (3)
  certificates: {
    base: 'certificates',
    byId: (id: Id) => `certificates/${id}`,
    pdf: (id: Id) => `certificates/${id}/pdf`,
  },

  // 9. Notifications (2 REST + 1 WS)
  notifications: {
    base: 'notifications',
    read: (id: Id) => `notifications/${id}/read`,
    ws: (userId: Id) => `ws/notifications/${userId}`,
  },

  // 10. Admin (8)
  admin: {
    dashboardStats: 'admin/dashboard-stats',
    listings: 'admin/listings',
    accounts: 'admin/accounts',
    verifyAccount: (id: Id) => `admin/accounts/${id}/verify`,
    suspendAccount: (id: Id) => `admin/accounts/${id}/suspend`,
    disputes: 'admin/disputes',
    resolveDispute: (id: Id) => `admin/disputes/${id}/resolve`,
    reports: 'admin/reports',
  },

  // 11. Reports (Donor / Recipient) (2)
  reports: {
    donor: (id: Id) => `reports/donor/${id}`,
    recipient: (id: Id) => `reports/recipient/${id}`,
  },
} as const;
