import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { APP_ROUTES } from '@core/config/app-routes';
import {
  ApiListingSummary,
  DIET_LABELS,
  FRESHNESS_LABELS,
  toListingStatus,
} from '@core/models/listing-api.model';
import { ListingStatus } from '@core/models/listing.model';
import { ListingService } from '@core/services/listing.service';
import { ToastService } from '@core/services/toast.service';
import { InfiniteScroll } from '@shared/directives/infinite-scroll.directive';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { RescueTimeline } from '@shared/ui/rescue-timeline/rescue-timeline';
import { StatusBadge } from '@shared/ui/status-badge/status-badge';

type Tab = 'all' | 'pending' | 'claimed' | 'delivered' | 'expired';

const PAGE_SIZE = 9;

@Component({
  selector: 'app-my-listings',
  imports: [StatusBadge, RescueTimeline, EmptyState, DatePipe, InfiniteScroll],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="page-title">My Listings</h3>
    <p class="page-subtitle">Track every donation from post to certificate.</p>

    <div class="flex flex-wrap gap-2 mb-4">
      @for (t of tabs; track t) {
        <button
          [class]="(tab() === t ? 'btn-fb' : 'btn-fb-outline') + ' !px-4 !py-1.5 !text-sm capitalize'"
          (click)="tab.set(t)"
        >
          {{ t }}
        </button>
      }
    </div>

    @if (loading()) {
      <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        @for (s of skeletons; track s) {
          <div class="card-fb p-4">
            <div class="skeleton h-4 w-24 mb-3"></div>
            <div class="skeleton h-5 w-3/4 mb-2"></div>
            <div class="skeleton h-3 w-1/2 mb-2"></div>
            <div class="skeleton h-3 w-2/3"></div>
          </div>
        }
      </div>
    } @else {
      <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        @for (l of filtered(); track l.id) {
          <div
            class="card-fb p-4 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg"
            (click)="selected.set(l)"
          >
            <div class="flex justify-between items-start mb-2">
              <span class="badge-fb bg-primary-soft text-primary-deep">{{ l.foodType }}</span>
              <app-status-badge [status]="statusOf(l)" />
            </div>
            <div class="font-semibold">{{ l.title }}</div>
            <div class="text-muted text-xs mt-1">{{ mealLabel(l) }} · {{ l.quantityMeals }} meals</div>
            <div class="text-muted text-xs">
              <i class="fa-regular fa-clock mr-1"></i>Pickup by {{ l.pickupDeadlineUtc | date: 'MMM d, h:mm a' }}
            </div>
          </div>
        } @empty {
          <div class="md:col-span-2 lg:col-span-3">
            <app-empty-state icon="fa-solid fa-box-open" text="No listings in this category yet" />
          </div>
        }
      </div>

      <!-- Infinite-scroll sentinel + status -->
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

    @if (selected(); as l) {
      <div class="fb-overlay" (click)="selected.set(null)">
        <div class="fb-modal" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-start mb-3">
            <div>
              <div class="font-semibold text-lg">{{ l.title }}</div>
              <div class="text-muted text-sm">{{ l.foodType }} · Pickup by {{ l.pickupDeadlineUtc | date: 'MMM d, h:mm a' }}</div>
            </div>
            <button class="btn-icon" (click)="selected.set(null)"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <app-rescue-timeline [status]="statusOf(l)" />

          <div class="grid sm:grid-cols-3 gap-3 mt-3">
            <div class="card-fb p-3">
              <div class="small-label mb-1">Diet</div>
              <div class="text-sm">{{ dietLabel(l) }}</div>
            </div>
            <div class="card-fb p-3">
              <div class="small-label mb-1">Meal</div>
              <div class="text-sm">{{ mealLabel(l) }}</div>
            </div>
            <div class="card-fb p-3">
              <div class="small-label mb-1">Freshness</div>
              <div class="text-sm">{{ freshnessLabel(l) }}</div>
            </div>
          </div>

          @if (statusOf(l) === 'pending') {
            <div class="flex gap-2 mt-4">
              <button class="btn-fb-outline flex-1" (click)="edit(l)"><i class="fa-solid fa-pen mr-1"></i>Edit</button>
              <button class="btn-fb-outline flex-1 !text-red-600" [disabled]="cancelling()" (click)="cancel(l.id)"><i class="fa-solid fa-ban mr-1"></i>Cancel</button>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .fb-overlay {
      position: fixed;
      inset: 0;
      z-index: 1050;
      background: rgba(0, 0, 0, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      overflow-y: auto;
    }
    .fb-modal {
      background: var(--fb-surface);
      border-radius: 22px;
      padding: 24px;
      width: 100%;
      max-width: 640px;
      margin: auto;
      box-shadow: var(--fb-shadow-lg);
    }
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
export class MyListings {
  private readonly listingService = inject(ListingService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly tabs: Tab[] = ['all', 'pending', 'claimed', 'delivered', 'expired'];
  protected readonly skeletons = Array.from({ length: 6 });
  protected readonly tab = signal<Tab>('all');
  protected readonly selected = signal<ApiListingSummary | null>(null);
  protected readonly listings = signal<ApiListingSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly done = signal(false);
  protected readonly cancelling = signal(false);

  private page = 1;

  protected readonly filtered = computed(() => {
    const tab = this.tab();
    return this.listings().filter((l) => {
      const s = this.statusOf(l);
      if (tab === 'all') {
        return true;
      }
      if (tab === 'delivered') {
        return s === 'delivered' || s === 'confirmed';
      }
      return s === (tab as ListingStatus);
    });
  });

  constructor() {
    this.loadInitial();
  }

  protected statusOf(l: ApiListingSummary): ListingStatus {
    return toListingStatus(l.status);
  }

  protected dietLabel(l: ApiListingSummary): string {
    return l.dietType ? DIET_LABELS[l.dietType] : '—';
  }

  protected mealLabel(l: ApiListingSummary): string {
    return l.mealType ?? '—';
  }

  protected freshnessLabel(l: ApiListingSummary): string {
    return FRESHNESS_LABELS[l.freshnessTag];
  }

  protected edit(l: ApiListingSummary): void {
    this.selected.set(null);
    this.router.navigate([APP_ROUTES.appView('create')], { queryParams: { edit: l.id } });
  }

  protected cancel(id: string): void {
    this.cancelling.set(true);
    this.listingService.cancel(id).subscribe({
      next: () => {
        this.cancelling.set(false);
        this.selected.set(null);
        this.toast.show('fa-solid fa-ban', 'Listing cancelled');
        this.loadInitial();
      },
      error: (err: Error) => {
        this.cancelling.set(false);
        this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not cancel listing');
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

  private loadInitial(): void {
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
        this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not load listings');
      },
    });
  }

  private fetch(page: number) {
    return this.listingService.listMine(undefined, page, PAGE_SIZE);
  }
}
