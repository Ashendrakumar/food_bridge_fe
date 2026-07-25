export type ListingStatus =
  | 'pending'
  | 'claimed'
  | 'pickedup'
  | 'delivered'
  | 'confirmed'
  | 'expired';

export interface Listing {
  id: number;
  donor: string;
  foodType: 'Veg' | 'Non-Veg';
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';
  quantity: string;
  freshness: string;
  pickupTime: string;
  address: string;
  status: ListingStatus;
  volunteer: string | null;
  recipient: string | null;
  notes: string;
}

export const STATUS_LABELS: Record<ListingStatus, string> = {
  pending: 'Posted',
  claimed: 'Claimed',
  pickedup: 'Picked Up',
  delivered: 'Delivered',
  confirmed: 'Confirmed',
  expired: 'Expired',
};

export interface TimelineStep {
  status: ListingStatus;
  label: string;
  icon: string;
}

/** Ordered lifecycle used by the rescue timeline. */
export const TIMELINE_STEPS: readonly TimelineStep[] = [
  { status: 'pending', label: 'Posted', icon: 'fa-clipboard-check' },
  { status: 'claimed', label: 'Claimed', icon: 'fa-hand' },
  { status: 'pickedup', label: 'Picked Up', icon: 'fa-box' },
  { status: 'delivered', label: 'Delivered', icon: 'fa-truck' },
  { status: 'confirmed', label: 'Confirmed', icon: 'fa-circle-check' },
];
