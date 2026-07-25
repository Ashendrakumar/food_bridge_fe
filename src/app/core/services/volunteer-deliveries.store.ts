import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiListing } from '@core/models/listing-api.model';
import { ListingService } from './listing.service';

/**
 * Holds the listings this volunteer has claimed during the current session and
 * drives their pickup/delivery confirmations.
 *
 * The backend (Phases 2–5) has no "list my active deliveries" endpoint yet — that
 * arrives with the Volunteer Data module (Phase 8) — so active deliveries are
 * tracked client-side from claim time. They do not survive a full reload.
 */
@Injectable({ providedIn: 'root' })
export class VolunteerDeliveriesStore {
  private readonly listingService = inject(ListingService);

  private readonly items = signal<ApiListing[]>([]);

  /** Still-in-progress deliveries (claimed or picked up). */
  readonly active = computed(() =>
    this.items().filter((l) => l.status === 'Claimed' || l.status === 'PickedUp'),
  );

  /** Add a freshly claimed listing (or replace an existing entry). */
  track(listing: ApiListing): void {
    this.upsert(listing);
  }

  confirmPickup(id: string, photo: File): Observable<ApiListing> {
    return this.listingService.confirmPickup(id, photo).pipe(tap((l) => this.upsert(l)));
  }

  confirmDelivery(id: string, photo: File): Observable<ApiListing> {
    return this.listingService.confirmDelivery(id, photo).pipe(tap((l) => this.upsert(l)));
  }

  private upsert(listing: ApiListing): void {
    this.items.update((list) => {
      const rest = list.filter((l) => l.id !== listing.id);
      return [listing, ...rest];
    });
  }
}
