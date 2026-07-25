export interface LeaderboardEntry {
  rank: number;
  volunteerId: number | string;
  name: string;
  points: number;
  deliveries: number;
  city?: string;
}
