import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { APP_ROUTES } from '@core/config/app-routes';
import { ApiListingSummary, toListingStatus } from '@core/models/listing-api.model';
import { ListingStatus, STATUS_ICONS, STATUS_LABELS } from '@core/models/listing.model';
import { ListingService } from '@core/services/listing.service';
import { ToastService } from '@core/services/toast.service';
import { InfiniteScroll } from '@shared/directives/infinite-scroll.directive';
import { ListingCard } from '@shared/ui/listing-card/listing-card';
import { ListingGrid } from '@shared/ui/listing-grid/listing-grid';
import { Pill } from '@shared/ui/pill/pill';
import { RescueTimeline } from '@shared/ui/rescue-timeline/rescue-timeline';

type Tab = 'all' | ListingStatus;

const PAGE_SIZE = 9;

@Component({
  selector: 'app-my-listings',
  imports: [RescueTimeline, DatePipe, InfiniteScroll, ListingCard, ListingGrid, Pill],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="page-title">My Listings</h3>
    <p class="page-subtitle">Track every donation from post to certificate.</p>

    <div class="flex flex-wrap gap-2 mb-4">
      @for (t of tabs; track t) {
        <button [class]="'tab-pill ' + tabClass(t)" (click)="tab.set(t)">
          <i [class]="tabIcon[t]"></i><span>{{ tabLabel[t] }}</span>
        </button>
      }
    </div>

    <app-listing-grid
      [loading]="loading()"
      [empty]="!filtered().length"
      emptyIcon="fa-solid fa-box-open"
      emptyText="No listings in this category yet"
    >
      @for (l of filtered(); track l.id) {
        <app-listing-card [listing]="l" [clickable]="true" (cardClick)="selected.set(l)" />
      }
    </app-listing-grid>

    @if (!loading()) {
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

          @if (isEnded(statusOf(l))) {
            <div class="ended-banner">
              <i class="fa-solid fa-circle-exclamation"></i>
              <span>{{ endedMessage(l.status) }}</span>
            </div>
          } @else {
            <app-rescue-timeline [status]="statusOf(l)" />
          }

          <div class="flex flex-wrap gap-2 mt-4">
            <app-pill type="quantity" [value]="l.quantityMeals" />
            <app-pill type="diet" [value]="l.dietType" />
            <app-pill type="meal" [value]="l.mealType" />
            <app-pill type="freshness" [value]="l.freshnessTag" />
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
    .ended-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 12px;
      padding: 14px 16px;
      border-radius: 14px;
      background: #f1f1f1;
      color: #7a7a7a;
      font-size: 14px;
      font-weight: 500;
    }
    :host-context(body.dark) .ended-banner {
      background: var(--fb-bg);
      color: var(--fb-muted);
    }
    .ended-banner i {
      font-size: 18px;
    }
    .tab-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 6px 16px;
      font-size: 13.5px;
      font-weight: 600;
      border-radius: 999px;
      border: 1.5px solid transparent;
      background: transparent;
      cursor: pointer;
      transition:
        background 0.15s ease,
        color 0.15s ease,
        border-color 0.15s ease;
    }
    .tab-pill i {
      font-size: 0.9em;
    }
    /* Per-status colours (match the status badges) */
    .t-all {
      color: var(--fb-primary-deep);
      border-color: var(--fb-primary);
    }
    .t-all:hover {
      background: var(--fb-primary-soft);
    }
    .t-all.active {
      background: var(--fb-primary);
      border-color: var(--fb-primary);
      color: #fff;
    }
    .t-pending {
      color: #ea580c;
      border-color: #ea580c;
    }
    .t-pending:hover {
      background: rgba(234, 88, 12, 0.1);
    }
    .t-pending.active {
      background: #ea580c;
      border-color: #ea580c;
      color: #fff;
    }
    .t-claimed {
      color: #d97706;
      border-color: #d97706;
    }
    .t-claimed:hover {
      background: rgba(217, 119, 6, 0.1);
    }
    .t-claimed.active {
      background: #d97706;
      border-color: #d97706;
      color: #fff;
    }
    .t-delivered {
      color: #059669;
      border-color: #059669;
    }
    .t-delivered:hover {
      background: rgba(5, 150, 105, 0.1);
    }
    .t-delivered.active {
      background: #059669;
      border-color: #059669;
      color: #fff;
    }
    .t-expired {
      color: #64748b;
      border-color: #94a3b8;
    }
    .t-expired:hover {
      background: rgba(100, 116, 139, 0.1);
    }
    .t-expired.active {
      background: #64748b;
      border-color: #64748b;
      color: #fff;
    }
    .t-pickedup {
      color: #4f46e5;
      border-color: #6366f1;
    }
    .t-pickedup:hover {
      background: rgba(79, 70, 229, 0.1);
    }
    .t-pickedup.active {
      background: #4f46e5;
      border-color: #4f46e5;
      color: #fff;
    }
    .t-confirmed {
      color: #0d9488;
      border-color: #14b8a6;
    }
    .t-confirmed:hover {
      background: rgba(13, 148, 136, 0.1);
    }
    .t-confirmed.active {
      background: #0d9488;
      border-color: #0d9488;
      color: #fff;
    }
    .t-cancelled {
      color: #dc2626;
      border-color: #ef4444;
    }
    .t-cancelled:hover {
      background: rgba(220, 38, 38, 0.1);
    }
    .t-cancelled.active {
      background: #dc2626;
      border-color: #dc2626;
      color: #fff;
    }
    .t-rejected {
      color: #e11d48;
      border-color: #f43f5e;
    }
    .t-rejected:hover {
      background: rgba(225, 29, 72, 0.1);
    }
    .t-rejected.active {
      background: #e11d48;
      border-color: #e11d48;
      color: #fff;
    }
  `,
})
export class MyListings {
  private readonly listingService = inject(ListingService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly tabs: Tab[] = [
    'all',
    'pending',
    'claimed',
    'pickedup',
    'delivered',
    'confirmed',
    'expired',
    'cancelled',
    'rejected',
  ];
  protected readonly tab = signal<Tab>('all');

  /** Icon per tab (colour handled by the `.t-*` component styles). */
  protected readonly tabIcon: Record<Tab, string> = {
    all: 'fa-solid fa-layer-group',
    ...STATUS_ICONS,
  };

  /** Label per tab. */
  protected readonly tabLabel: Record<Tab, string> = {
    all: 'All',
    ...STATUS_LABELS,
  };

  protected tabClass(t: Tab): string {
    return `t-${t}${this.tab() === t ? ' active' : ''}`;
  }

  protected readonly selected = signal<ApiListingSummary | null>(null);
  protected readonly listings = signal<ApiListingSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly done = signal(false);
  protected readonly cancelling = signal(false);

  private page = 1;

  protected readonly filtered = computed(() => {
    const tab = this.tab();
    if (tab === 'all') {
      return this.listings();
    }
    return this.listings().filter((l) => this.statusOf(l) === tab);
  });

  /** Ended off the happy path (expired / cancelled / rejected). */
  protected isEnded(s: ListingStatus): boolean {
    return s === 'expired' || s === 'cancelled' || s === 'rejected';
  }

  constructor() {
    this.loadInitial();
  }

  protected statusOf(l: ApiListingSummary): ListingStatus {
    return toListingStatus(l.status);
  }

  /** Message for a listing that ended off the happy path (expired/cancelled/rejected). */
  protected endedMessage(status: ApiListingSummary['status']): string {
    switch (status) {
      case 'Cancelled':
        return 'This listing was cancelled.';
      case 'Rejected':
        return 'This listing was rejected.';
      case 'Expired':
        return 'This listing’s pickup window expired before it was claimed.';
      default:
        return 'This listing is no longer active.';
    }
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
