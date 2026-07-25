/** A single point in a monthly time-series used by report charts. */
export interface MonthlyStat {
  month: string;
  meals: number;
  listings?: number;
}

export interface DonorReport {
  donorId: number | string;
  totalMeals: number;
  totalListings: number;
  certificates: number;
  chart: MonthlyStat[];
}

export interface RecipientReport {
  recipientId: number | string;
  totalReceived: number;
  totalDistributions: number;
  chart: MonthlyStat[];
}

export interface AdminReport {
  totalMeals: number;
  totalListings: number;
  totalDonors: number;
  totalVolunteers: number;
  totalRecipients: number;
  chart: MonthlyStat[];
}
