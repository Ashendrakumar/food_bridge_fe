import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { API_ENDPOINTS } from '@core/config/api-endpoints';
import { ApiService } from '@core/http/api.service';
import { GeocodeResult, TrackingSnapshot } from '@core/models/tracking.model';
import { socket$ } from '@core/http/socket';

/** Tracking / maps endpoints — address geocoding + live location stream. */
@Injectable({ providedIn: 'root' })
export class TrackingService {
  private readonly api = inject(ApiService);

  /** Live status + volunteer location / ETA (one-shot REST snapshot). */
  snapshot(listingId: string | number): Observable<TrackingSnapshot> {
    return this.api.get<TrackingSnapshot>(API_ENDPOINTS.listings.track(listingId));
  }

  /** Convert an address to lat/lng. */
  geocode(address: string): Observable<GeocodeResult> {
    return this.api.get<GeocodeResult>(API_ENDPOINTS.tracking.geocode, { address });
  }

  /** Real-time location push over WebSocket (WS /ws/tracking/:listingId). */
  liveTrack(listingId: string | number): Observable<TrackingSnapshot> {
    return socket$<TrackingSnapshot>(environment.apiUrl, API_ENDPOINTS.tracking.ws(listingId));
  }
}
