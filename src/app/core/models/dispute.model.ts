export type DisputeStatus = 'open' | 'resolved';

export interface Dispute {
  id: number | string;
  listingId: number | string;
  raisedBy: string;
  reason: string;
  status: DisputeStatus;
  createdAt: string;
  resolvedAt?: string;
}
