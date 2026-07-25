import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { APP_ROUTES } from '@core/config/app-routes';
import { ApiNearbyListing, DIET_LABELS, FRESHNESS_LABELS } from '@core/models/listing-api.model';
import { AuthService } from '@core/services/auth.service';
import { ListingService } from '@core/services/listing.service';
import { ToastService } from '@core/services/toast.service';
import { UserService } from '@core/services/user.service';
import { VolunteerDeliveriesStore } from '@core/services/volunteer-deliveries.store';
import { InfiniteScroll } from '@shared/directives/infinite-scroll.directive';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { RouteMap } from '@shared/ui/route-map/route-map';
import { environment } from '@env/environment';

const RADIUS_KM = 10;
const PAGE_SIZE = 12;

@Component({
  selector: 'app-nearby',
  imports: [RouteMap, EmptyState, DecimalPipe, InfiniteScroll],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h3 class="page-title">Nearby Listings</h3>
        <p class="page-subtitle !mb-0">Sorted by distance — claim what you can deliver.</p>
      </div>
      <div class="flex gap-2">
        <button [class]="(view() === 'card' ? 'btn-fb' : 'btn-fb-outline') + ' !py-1.5 !px-3 !text-sm'" (click)="view.set('card')"><i class="fa-solid fa-list mr-1"></i>Card</button>
        <button [class]="(view() === 'map' ? 'btn-fb' : 'btn-fb-outline') + ' !py-1.5 !px-3 !text-sm'" (click)="view.set('map')"><i class="fa-solid fa-map mr-1"></i>Map</button>
      </div>
    </div>

    <div class="card-fb p-4 mb-4 flex items-center justify-between flex-wrap gap-2">
      <div class="flex items-center gap-3">
        <div class="stat-icon !mb-0" style="background:linear-gradient(135deg,var(--fb-success),var(--fb-success-deep))">
          <i class="fa-solid fa-utensils"></i>
        </div>
        <div>
          <div class="font-bold"><span class="text-success-deep">{{ listings().length }}</span> open listings loaded</div>
          <div class="text-muted text-xs">Within {{ radiusKm }} km · pending pickups only</div>
        </div>
      </div>
      <button class="btn-fb-outline !py-1.5 !px-3 !text-sm" [disabled]="loading()" (click)="reload()">
        <i class="fa-solid fa-rotate mr-1" [class.fa-spin]="loading()"></i>Refresh
      </button>
    </div>

    @if (view() === 'card') {
      @if (loading()) {
        <div class="grid gap-3">
          @for (s of skeletons; track s) {
            <div class="card-fb p-4 flex items-center gap-3">
              <div class="skeleton !rounded-full w-11 h-11 shrink-0"></div>
              <div class="flex-1">
                <div class="skeleton h-4 w-1/3 mb-2"></div>
                <div class="skeleton h-3 w-2/3 mb-1.5"></div>
                <div class="skeleton h-3 w-1/2"></div>
              </div>
              <div class="skeleton h-9 w-20"></div>
            </div>
          }
        </div>
      } @else {
        <div class="grid gap-3">
          @for (l of listings(); track l.id) {
            <div class="card-fb p-4 flex flex-wrap justify-between items-center gap-3 transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <div class="flex items-center gap-3">
                <div class="stat-icon !mb-0 !w-11 !h-11" style="background:var(--fb-primary)"><i class="fa-solid fa-utensils"></i></div>
                <div>
                  <div class="font-semibold text-sm">{{ l.title }}</div>
                  <div class="text-muted text-xs">{{ l.foodType }} · {{ dietLabel(l) }} · {{ l.quantityMeals }} meals · {{ freshnessLabel(l) }}</div>
                  <div class="text-muted text-xs"><i class="fa-solid fa-location-dot mr-1"></i>{{ l.pickupAddress }} · {{ l.distanceKm | number: '1.0-1' }} km</div>
                </div>
              </div>
              <button class="btn-fb !py-2 !px-4 !text-sm" [disabled]="claimingId() === l.id" (click)="claim(l)">
                <i class="fa-solid fa-hand mr-1"></i>{{ claimingId() === l.id ? 'Claiming…' : 'Claim' }}
              </button>
            </div>
          } @empty {
            <app-empty-state icon="fa-solid fa-map" text="No open listings right now — check back soon" />
          }
        </div>

        <div
          appInfiniteScroll
          [appInfiniteScrollDisabled]="loadingMore() || done()"
          (scrolled)="loadMore()"
          class="py-5 text-center text-muted text-sm"
        >
          @if (loadingMore()) {
            <i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading more…
          } @else if (done() && listings().length) {
            <span class="opacity-70">You've reached the end</span>
          }
        </div>
      }
    } @else {
      <app-route-map [height]="480" />
    }
  `,
  styles: `
    .skeleton {
      border-radius: 8px;
      background: linear-gradient(90deg, var(--fb-line) 25%, var(--fb-bg) 37%, var(--fb-line) 63%);
      background-size: 400% 100%;
      animation: fb-shimmer 1.3s ease-in-out infinite;
    }
    @keyframes fb-shimmer {
      0% {
        background-position: 100% 0;
      }
      100% {
        background-position: -100% 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .skeleton {
        animation: none;
      }
    }
  `,
})
export class Nearby {
  private readonly listingService = inject(ListingService);
  private readonly users = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly deliveries = inject(VolunteerDeliveriesStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly radiusKm = RADIUS_KM;
  protected readonly skeletons = Array.from({ length: 5 });
  protected readonly view = signal<'card' | 'map'>('card');
  protected readonly listings = signal<ApiNearbyListing[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly done = signal(false);
  protected readonly claimingId = signal<string | null>(null);

  private center = { lat: environment.mapDefaultCenter.lat, lng: environment.mapDefaultCenter.lng };
  private page = 1;

  constructor() {
    // Prefer the volunteer's saved location; fall back to the map default centre.
    const id = this.auth.currentUser()?.id;
    if (id) {
      this.users.getProfile(id).subscribe({
        next: (p) => {
          if (p.latitude != null && p.longitude != null) {
            this.center = { lat: p.latitude, lng: p.longitude };
          }
          this.reload();
        },
        error: () => this.reload(),
      });
    } else {
      this.reload();
    }
  }

  protected dietLabel(l: ApiNearbyListing): string {
    return l.dietType ? DIET_LABELS[l.dietType] : '—';
  }

  protected freshnessLabel(l: ApiNearbyListing): string {
    return FRESHNESS_LABELS[l.freshnessTag];
  }

  protected reload(): void {
    this.page = 1;
    this.done.set(false);
    this.loading.set(true);
    this.fetch(this.page).subscribe({
      next: (rows) => {
        this.listings.set(rows);
        this.page++;
        this.done.set(rows.length < PAGE_SIZE);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not load nearby listings');
      },
    });
  }

  protected loadMore(): void {
    if (this.loading() || this.loadingMore() || this.done()) {
      return;
    }
    this.loadingMore.set(true);
    this.fetch(this.page).subscribe({
      next: (rows) => {
        this.listings.update((cur) => [...cur, ...rows]);
        this.page++;
        this.done.set(rows.length < PAGE_SIZE);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }

  protected claim(l: ApiNearbyListing): void {
    this.claimingId.set(l.id);
    this.listingService.claim(l.id).subscribe({
      next: (listing) => {
        this.claimingId.set(null);
        this.deliveries.track(listing);
        this.listings.update((rows) => rows.filter((r) => r.id !== l.id));
        this.toast.show('fa-solid fa-circle-check', 'Listing claimed — starting delivery');
        this.router.navigate([APP_ROUTES.appView('deliveries')]);
      },
      error: (err: Error) => {
        this.claimingId.set(null);
        // 409 → someone else claimed it first; drop it from the list.
        this.listings.update((rows) => rows.filter((r) => r.id !== l.id));
        this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not claim this listing');
      },
    });
  }

  private fetch(page: number) {
    return this.listingService.nearby(this.center.lat, this.center.lng, RADIUS_KM, page, PAGE_SIZE);
  }
}
