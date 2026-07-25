export interface Certificate {
  id: number | string;
  donorId: number | string;
  donor: string;
  listingId: number | string;
  meals: number;
  recipient: string;
  issuedAt: string;
}
