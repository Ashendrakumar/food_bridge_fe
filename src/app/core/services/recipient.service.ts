import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '@core/config/api-endpoints';
import { ApiService, QueryParams } from '@core/http/api.service';
import { ApiListing, ApiListingSummary, ConfirmReceiptResult } from '@core/models/listing-api.model';

/**
 * Recipient listing endpoints (Phase 6): the incoming feed, accept/reject the
 * match, confirm receipt (atomic points + certificate + notifications), history.
 */
@Injectable({ providedIn: 'root' })
export class RecipientService {
  private readonly api = inject(ApiService);

  /** Listings matched to the caller, awaiting an accept/reject decision. */
  incoming(page = 1, pageSize = 50): Observable<ApiListingSummary[]> {
    const params: QueryParams = { page, pageSize };
    return this.api.get<ApiListingSummary[]>(API_ENDPOINTS.listings.incoming, params);
  }

  /** Acknowledge the match (status unchanged). */
  accept(id: string): Observable<ApiListing> {
    return this.api.post<ApiListing>(API_ENDPOINTS.listings.accept(id));
  }

  /** Decline — auto-reassigns to another available recipient (or none). */
  reject(id: string): Observable<ApiListing> {
    return this.api.post<ApiListing>(API_ENDPOINTS.listings.reject(id));
  }

  /** Confirm receipt (Delivered → Confirmed) — awards points + issues a certificate. */
  confirmReceipt(id: string): Observable<ConfirmReceiptResult> {
    return this.api.post<ConfirmReceiptResult>(API_ENDPOINTS.listings.confirmReceipt(id));
  }

  /** The caller's past confirmed receipts. */
  history(page = 1, pageSize = 50): Observable<ApiListingSummary[]> {
    const params: QueryParams = { page, pageSize };
    return this.api.get<ApiListingSummary[]>(API_ENDPOINTS.listings.history, params);
  }
}
