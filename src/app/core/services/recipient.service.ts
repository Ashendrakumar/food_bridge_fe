import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '@core/config/api-endpoints';
import { ApiService } from '@core/http/api.service';
import { Listing } from '@core/models/listing.model';

/**
 * Recipient data endpoints. The listing-mutating actions (accept / reject /
 * confirm-receipt) live on {@link ListingService}; this covers the recipient
 * GET feeds.
 */
@Injectable({ providedIn: 'root' })
export class RecipientService {
  private readonly api = inject(ApiService);

  /** Food currently picked-up & headed their way. */
  incoming(id: string | number): Observable<Listing[]> {
    return this.api.get<Listing[]>(API_ENDPOINTS.recipients.incoming(id));
  }

  /** Distribution history. */
  history(id: string | number): Observable<Listing[]> {
    return this.api.get<Listing[]>(API_ENDPOINTS.recipients.history(id));
  }
}
