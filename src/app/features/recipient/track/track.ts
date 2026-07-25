import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { ListingStore } from '@core/services/listing-store.service';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { RescueTimeline } from '@shared/ui/rescue-timeline/rescue-timeline';
import { RouteMap } from '@shared/ui/route-map/route-map';
import { StatusBadge } from '@shared/ui/status-badge/status-badge';

@Component({
  selector: 'app-track',
  imports: [RescueTimeline, RouteMap, StatusBadge, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="page-title">Track Delivery</h3>
    <p class="page-subtitle">Follow your incoming food in real time — from pickup to your doorstep.</p>

    @for (l of tracking(); track l.id) {
      <div class="card-fb p-5 mb-4">
        <div class="flex justify-between items-start mb-3 flex-wrap gap-2">
          <div>
            <div class="font-bold">{{ l.foodType }} · {{ l.mealType }} — {{ l.quantity }}</div>
            <div class="text-muted text-xs">From {{ l.donor }}</div>
          </div>
          <div class="flex items-center gap-2">
            @if (l.status === 'pickedup') {
              <span class="badge-fb badge-delivered inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-success"></span>Live</span>
            }
            <app-status-badge [status]="l.status" />
          </div>
        </div>

        <app-rescue-timeline [status]="l.status" />

        <div class="grid gap-4 lg:grid-cols-2 mt-3">
          <app-route-map
            [pickup]="l.donor"
            [drop]="l.recipient || 'You'"
            [height]="320"
            [eta]="l.status === 'pickedup' ? 'Volunteer en route' : 'Delivered'"
          />
          <div>
            <div class="card-fb p-3 mb-3 border-0" style="background:var(--fb-primary-soft)">
              <div class="small-label mb-1">{{ l.status === 'pickedup' ? 'Estimated arrival' : 'Status' }}</div>
              <div class="text-xl font-bold text-primary-deep">
                {{ l.status === 'pickedup' ? '~12 min away' : 'Delivered — awaiting confirmation' }}
              </div>
            </div>
            <div class="small-label mb-2">Volunteer</div>
            <div class="flex items-center gap-2 mb-3">
              <div class="avatar-circle !w-9 !h-9 !text-[13px]">{{ (l.volunteer || 'V').charAt(0) }}</div>
              <div class="text-sm font-semibold">{{ l.volunteer || 'Assigned volunteer' }}</div>
            </div>
            @if (l.status === 'delivered') {
              <button class="btn-fb w-full" (click)="store.confirmReceipt(l.id)"><i class="fa-solid fa-check-double mr-2"></i>Confirm Receipt</button>
            }
          </div>
        </div>
      </div>
    } @empty {
      <app-empty-state icon="fa-solid fa-location-crosshairs" text="No active deliveries to track — check Incoming Food" />
    }
  `,
})
export class Track {
  private readonly auth = inject(AuthService);
  protected readonly store = inject(ListingStore);

  protected readonly tracking = computed(() => {
    const me = this.auth.currentUser()?.name;
    return this.store
      .listings()
      .filter((l) => l.recipient === me && (l.status === 'pickedup' || l.status === 'delivered'));
  });
}
