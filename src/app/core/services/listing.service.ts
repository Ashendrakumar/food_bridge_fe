import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '@core/config/api-endpoints';
import { ApiService, QueryParams } from '@core/http/api.service';
import {
  ApiListing,
  ApiListingStatus,
  ApiListingSummary,
  ApiNearbyListing,
  ListingWriteBody,
} from '@core/models/listing-api.model';

/** Result of POST /listings/{id}/images. */
export interface ImageUploadResult {
  imageId: string;
  imageUrl: string;
}

/**
 * HTTP client for the Donor (Phase 4) and Volunteer (Phase 5) listing endpoints.
 * Responses are already unwrapped from the `ApiResponse`/`PagedResponse` envelope
 * by the API interceptor, so list calls return the inner array directly.
 */
@Injectable({ providedIn: 'root' })
export class ListingService {
  private readonly api = inject(ApiService);

  // ---- Donor ----

  create(body: ListingWriteBody): Observable<ApiListing> {
    return this.api.post<ApiListing>(API_ENDPOINTS.listings.base, body);
  }

  /** The caller's own listings, optionally filtered by status. */
  listMine(status?: ApiListingStatus, page = 1, pageSize = 50): Observable<ApiListingSummary[]> {
    const params: QueryParams = { page, pageSize, status };
    return this.api.get<ApiListingSummary[]>(API_ENDPOINTS.listings.base, params);
  }

  getById(id: string): Observable<ApiListing> {
    return this.api.get<ApiListing>(API_ENDPOINTS.listings.byId(id));
  }

  update(id: string, body: ListingWriteBody): Observable<ApiListing> {
    return this.api.put<ApiListing>(API_ENDPOINTS.listings.byId(id), body);
  }

  cancel(id: string): Observable<ApiListing> {
    return this.api.post<ApiListing>(API_ENDPOINTS.listings.cancel(id));
  }

  uploadImage(id: string, file: File): Observable<ImageUploadResult> {
    const form = new FormData();
    form.append('file', file);
    return this.api.post<ImageUploadResult>(API_ENDPOINTS.listings.images(id), form);
  }

  // ---- Volunteer ----

  /** Pending listings within `radiusKm`, ordered by ascending distance. */
  nearby(
    latitude: number,
    longitude: number,
    radiusKm = 10,
    page = 1,
    pageSize = 12,
  ): Observable<ApiNearbyListing[]> {
    const params: QueryParams = { latitude, longitude, radiusKm, page, pageSize };
    return this.api.get<ApiNearbyListing[]>(API_ENDPOINTS.listings.nearby, params);
  }

  claim(id: string): Observable<ApiListing> {
    return this.api.post<ApiListing>(API_ENDPOINTS.listings.claim(id));
  }

  confirmPickup(id: string, photo: File): Observable<ApiListing> {
    return this.api.post<ApiListing>(API_ENDPOINTS.listings.confirmPickup(id), this.photo(photo));
  }

  confirmDelivery(id: string, photo: File): Observable<ApiListing> {
    return this.api.post<ApiListing>(API_ENDPOINTS.listings.confirmDelivery(id), this.photo(photo));
  }

  private photo(file: File): FormData {
    const form = new FormData();
    form.append('photo', file);
    return form;
  }
}
