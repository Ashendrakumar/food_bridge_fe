export type DisputeStatus = 'Open' | 'Resolved';

/** Dispute — GET /api/disputes (`DisputeResponse`). */
export interface Dispute {
  id: string;
  listingId: string;
  raisedByUserId: string;
  reason: string;
  status: DisputeStatus;
  resolutionNote: string | null;
  createdAtUtc: string;
  resolvedAtUtc: string | null;
}

/** Request body for POST /api/disputes. */
export interface RaiseDisputeBody {
  listingId: string;
  reason: string;
}
