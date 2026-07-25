import { ListingStatus } from './listing.model';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  address: string;
  location: LatLng;
}

/** Live tracking snapshot returned by GET /listings/:id/track and the WS feed. */
export interface TrackingSnapshot {
  listingId: number | string;
  status: ListingStatus;
  volunteerLocation: LatLng | null;
  etaMinutes: number | null;
  updatedAt: string;
}
