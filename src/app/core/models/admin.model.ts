/** GET /api/admin/dashboard. */
export interface AdminDashboard {
  totalDonors: number;
  totalVolunteers: number;
  totalRecipients: number;
  pendingRecipients: number;
  totalListings: number;
  pendingListings: number;
  activeListings: number;
  confirmedListings: number;
  totalMealsDonated: number;
  totalCertificatesIssued: number;
  totalVolunteerPointsAwarded: number;
  openDisputes: number;
  resolvedDisputes: number;
}

/** GET /api/admin/accounts row. */
export interface AdminAccount {
  id: string;
  name: string;
  mobile: string;
  role: string;
  city: string | null;
  accountStatus: string;
  createdAtUtc: string;
}
