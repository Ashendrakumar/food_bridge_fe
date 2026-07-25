import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { ListingStore } from '@core/services/listing-store.service';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { StatusBadge } from '@shared/ui/status-badge/status-badge';

@Component({
  selector: 'app-history',
  imports: [StatusBadge, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="page-title">{{ isVolunteer() ? 'Delivery History' : 'Distribution History' }}</h3>
    <p class="page-subtitle">
      {{ isVolunteer() ? 'Every completed delivery, all in one place.' : 'Meals your organization has received.' }}
    </p>

    <div class="card-fb p-3">
      @for (l of rows(); track l.id) {
        <div class="flex justify-between items-center py-2.5 border-b border-line last:border-0">
          <div>
            @if (isVolunteer()) {
              <div class="text-sm font-semibold">{{ l.donor }} → {{ l.recipient }}</div>
              <div class="text-muted text-xs">{{ l.foodType }} · {{ l.quantity }}</div>
            } @else {
              <div class="text-sm font-semibold">{{ l.foodType }} — {{ l.quantity }}</div>
              <div class="text-muted text-xs">From {{ l.donor }} · via {{ l.volunteer }}</div>
            }
          </div>
          <app-status-badge [status]="l.status" />
        </div>
      } @empty {
        <app-empty-state icon="fa-solid fa-clock-rotate-left" text="No completed history yet" />
      }
    </div>
  `,
})
export class History {
  private readonly auth = inject(AuthService);
  private readonly store = inject(ListingStore);

  protected readonly isVolunteer = computed(() => this.auth.currentUser()?.role === 'volunteer');

  protected readonly rows = computed(() => {
    const me = this.auth.currentUser()?.name;
    if (this.isVolunteer()) {
      return this.store
        .listings()
        .filter((l) => l.volunteer === me && (l.status === 'delivered' || l.status === 'confirmed'));
    }
    return this.store.listings().filter((l) => l.recipient === me && l.status === 'confirmed');
  });
}
