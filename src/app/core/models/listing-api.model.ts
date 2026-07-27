import { ListingStatus } from './listing.model';

/**
 * Backend-facing listing types — mirror the FoodBridge API DTOs
 * (`ListingResponse`, `ListingSummaryResponse`, `ListingNearbyResponse`).
 * Enum fields are the backend's PascalCase string names.
 */

export type DietType = 'Veg' | 'NonVeg';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';
export type FreshnessTag = 'JustCooked' | 'FewHoursOld' | 'Packaged';

/** Backend `Listings.Status` enum names. */
export type ApiListingStatus =
  | 'Pending'
  | 'Claimed'
  | 'PickedUp'
  | 'Delivered'
  | 'Confirmed'
  | 'Expired'
  | 'Cancelled'
  | 'Rejected';

export interface ApiListingImage {
  id: string;
  imageUrl: string;
  createdAtUtc: string;
}

export interface ApiListingTimelineEntry {
  fromStatus: string | null;
  toStatus: string;
  actorUserId: string;
  note: string | null;
  photoUrl: string | null;
  createdAtUtc: string;
}

/** Full detail — GET /listings/{id}, POST /claim, /confirm-pickup, /confirm-delivery, /cancel. */
export interface ApiListing {
  id: string;
  donorId: string;
  title: string;
  foodType: string;
  dietType: DietType | null;
  mealType: MealType | null;
  quantityMeals: number;
  freshnessTag: FreshnessTag;
  preparedAtUtc: string | null;
  pickupDeadlineUtc: string;
  pickupAddress: string;
  latitude: number;
  longitude: number;
  status: ApiListingStatus;
  volunteerId: string | null;
  recipientId: string | null;
  // Contact info (Phase 11) — gated to the listing's own parties, else null.
  donorName?: string | null;
  donorMobile?: string | null;
  volunteerName?: string | null;
  volunteerMobile?: string | null;
  recipientName?: string | null;
  recipientMobile?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  images: ApiListingImage[];
  timeline: ApiListingTimelineEntry[];
}

/** Result of POST /listings/{id}/confirm-receipt. */
export interface ConfirmReceiptResult {
  listing: ApiListing;
  certificateNumber: string;
  pointsAwarded: number;
}

/** Lightweight list shape — GET /listings. */
export interface ApiListingSummary {
  id: string;
  title: string;
  foodType: string;
  dietType: DietType | null;
  mealType: MealType | null;
  quantityMeals: number;
  freshnessTag: FreshnessTag;
  pickupDeadlineUtc: string;
  status: ApiListingStatus;
  createdAtUtc: string;
}

/** Nearby shape — GET /listings/nearby (adds distance, drops timeline/images). */
export interface ApiNearbyListing {
  id: string;
  title: string;
  foodType: string;
  dietType: DietType | null;
  mealType: MealType | null;
  quantityMeals: number;
  freshnessTag: FreshnessTag;
  pickupDeadlineUtc: string;
  pickupAddress: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
}

/**
 * Request body for POST /listings and PUT /listings/{id}.
 *
 * Pickup location is either/or: supply `donorAddressId` (a saved address from the
 * caller's own address book) OR the freeform `pickupAddress`/`latitude`/`longitude`
 * trio — never both, never neither (enforced server-side).
 */
export interface ListingWriteBody {
  title: string;
  foodType: string;
  dietType: DietType | null;
  mealType: MealType | null;
  quantityMeals: number;
  freshnessTag: FreshnessTag;
  preparedAtUtc: string | null;
  pickupDeadlineUtc: string;
  donorAddressId?: string;
  pickupAddress?: string;
  latitude?: number;
  longitude?: number;
}

export const DIET_LABELS: Record<DietType, string> = {
  Veg: 'Veg',
  NonVeg: 'Non-Veg',
};

export const FRESHNESS_LABELS: Record<FreshnessTag, string> = {
  JustCooked: 'Just Cooked',
  FewHoursOld: 'A Few Hours Old',
  Packaged: 'Packaged',
};

/** Map a backend status name to the app's lowercase {@link ListingStatus}. */
export function toListingStatus(status: ApiListingStatus): ListingStatus {
  switch (status) {
    case 'Pending':
      return 'pending';
    case 'Claimed':
      return 'claimed';
    case 'PickedUp':
      return 'pickedup';
    case 'Delivered':
      return 'delivered';
    case 'Confirmed':
      return 'confirmed';
    case 'Cancelled':
      return 'cancelled';
    case 'Rejected':
      return 'rejected';
    default:
      return 'expired';
  }
}
