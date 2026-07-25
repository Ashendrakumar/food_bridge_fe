export interface AdminDashboardStats {
  totalListings: number;
  pendingVerifications: number;
  openDisputes: number;
  mealsServed: number;
}

export type AccountStatus = 'pending' | 'verified' | 'suspended';

export interface AdminAccount {
  id: number | string;
  name: string;
  type: 'Volunteer' | 'Organization' | 'Donor';
  city: string;
  status: AccountStatus;
  joined: string;
}
