import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '@core/config/api-endpoints';
import { ApiService } from '@core/http/api.service';
import { LeaderboardEntry } from '@core/models/leaderboard.model';
import { Listing } from '@core/models/listing.model';

/** Volunteer data endpoints (deliveries, history, leaderboard). */
@Injectable({ providedIn: 'root' })
export class VolunteerService {
  private readonly api = inject(ApiService);

  /** Active deliveries (claimed / picked-up). */
  deliveries(id: string | number): Observable<Listing[]> {
    return this.api.get<Listing[]>(API_ENDPOINTS.volunteers.deliveries(id));
  }

  /** Completed deliveries. */
  history(id: string | number): Observable<Listing[]> {
    return this.api.get<Listing[]>(API_ENDPOINTS.volunteers.history(id));
  }

  /** Ranked volunteers by points. */
  leaderboard(): Observable<LeaderboardEntry[]> {
    return this.api.get<LeaderboardEntry[]>(API_ENDPOINTS.volunteers.leaderboard);
  }
}
