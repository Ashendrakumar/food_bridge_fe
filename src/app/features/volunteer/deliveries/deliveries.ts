import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ApiListing, toListingStatus } from '@core/models/listing-api.model';
import { ListingStatus } from '@core/models/listing.model';
import { ToastService } from '@core/services/toast.service';
import { VolunteerDeliveriesStore } from '@core/services/volunteer-deliveries.store';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { StatusBadge } from '@shared/ui/status-badge/status-badge';

type PendingAction = { id: string; action: 'pickup' | 'delivery' };

@Component({
  selector: 'app-deliveries',
  imports: [StatusBadge, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="page-title">My Deliveries</h3>
    <p class="page-subtitle">Complete pickup and delivery to keep the chain moving.</p>

    <div class="grid gap-3 md:grid-cols-2">
      @for (l of active(); track l.id) {
        <div class="card-fb p-4">
          <div class="flex justify-between items-start mb-2">
            <div class="font-semibold">{{ l.title }}</div>
            <app-status-badge [status]="statusOf(l)" />
          </div>
          <div class="text-muted text-xs mb-3">{{ l.foodType }} · {{ l.quantityMeals }} meals · {{ l.pickupAddress }}</div>
          @if (l.status === 'Claimed') {
            <button class="btn-orange w-full !py-2 !text-sm" [disabled]="busyId() === l.id" (click)="start(l.id, 'pickup')">
              <i class="fa-solid fa-hand mr-1"></i>{{ busyId() === l.id ? 'Uploading…' : 'Confirm Pickup' }}
            </button>
          } @else {
            <button class="btn-fb w-full !py-2 !text-sm" [disabled]="busyId() === l.id" (click)="start(l.id, 'delivery')">
              <i class="fa-solid fa-truck mr-1"></i>{{ busyId() === l.id ? 'Uploading…' : 'Confirm Delivery' }}
            </button>
          }
          <p class="text-muted text-xs mt-2">A photo is required to confirm this step.</p>
        </div>
      } @empty {
        <div class="md:col-span-2">
          <app-empty-state icon="fa-solid fa-truck" text="No active deliveries — claim a listing to get started" />
        </div>
      }
    </div>

    <input #photoInput type="file" accept="image/jpeg,image/png" hidden (change)="onPhoto($event)" />
  `,
  styles: `
    .btn-orange {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      border: 0;
      border-radius: var(--fb-radius);
      font-weight: 600;
      background: linear-gradient(135deg, var(--fb-accent), var(--fb-accent-deep));
    }
    .btn-orange:disabled {
      opacity: 0.6;
    }
  `,
})
export class Deliveries {
  protected readonly store = inject(VolunteerDeliveriesStore);
  private readonly toast = inject(ToastService);

  protected readonly active = this.store.active;
  protected readonly busyId = signal<string | null>(null);
  private pending: PendingAction | null = null;

  protected statusOf(l: ApiListing): ListingStatus {
    return toListingStatus(l.status);
  }

  /** Buttons trigger the (shared) file picker; the upload runs once a file is chosen. */
  protected start(id: string, action: 'pickup' | 'delivery'): void {
    this.pending = { id, action };
    const input = document.querySelector<HTMLInputElement>('app-deliveries input[type=file]');
    input?.click();
  }

  protected onPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const pending = this.pending;
    this.pending = null;
    if (!file || !pending) {
      return;
    }

    this.busyId.set(pending.id);
    const request$ =
      pending.action === 'pickup'
        ? this.store.confirmPickup(pending.id, file)
        : this.store.confirmDelivery(pending.id, file);

    request$.subscribe({
      next: (l) => {
        this.busyId.set(null);
        this.toast.show(
          'fa-solid fa-circle-check',
          l.status === 'PickedUp' ? 'Pickup confirmed — deliver to the matched recipient' : 'Delivery confirmed — thank you!',
        );
      },
      error: (err: Error) => {
        this.busyId.set(null);
        this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not confirm this step');
      },
    });
  }
}
