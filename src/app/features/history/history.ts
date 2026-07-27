import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ApiListingSummary } from '@core/models/listing-api.model';
import { AuthService } from '@core/services/auth.service';
import { RecipientService } from '@core/services/recipient.service';
import { ToastService } from '@core/services/toast.service';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { ListingCard } from '@shared/ui/listing-card/listing-card';
import { ListingGrid } from '@shared/ui/listing-grid/listing-grid';

@Component({
  selector: 'app-history',
  imports: [EmptyState, ListingCard, ListingGrid, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="page-title">{{ isVolunteer() ? 'Delivery History' : 'Distribution History' }}</h3>
    <p class="page-subtitle">
      {{ isVolunteer() ? 'Every completed delivery, all in one place.' : 'Meals your organization has received.' }}
    </p>

    @if (isVolunteer()) {
      <app-empty-state
        icon="fa-solid fa-ranking-star"
        text="See your completed deliveries and points on the Leaderboard."
      />
    } @else {
      <app-listing-grid
        [loading]="loading()"
        [empty]="!rows().length"
        emptyIcon="fa-solid fa-clock-rotate-left"
        emptyText="No completed history yet"
      >
        @for (l of rows(); track l.id) {
          <app-listing-card
            [listing]="l"
            icon="fa-solid fa-hand-holding-heart"
            iconBg="linear-gradient(135deg, var(--fb-success), var(--fb-success-deep))"
            [deadline]="false"
            [hasFooter]="true"
          >
            <div cardFooter class="text-muted text-xs">
              <i class="fa-regular fa-calendar-check mr-1"></i>Received {{ l.createdAtUtc | date: 'MMM d, y' }}
            </div>
          </app-listing-card>
        }
      </app-listing-grid>
    }
  `,
})
export class History {
  private readonly auth = inject(AuthService);
  private readonly recipientService = inject(RecipientService);
  private readonly toast = inject(ToastService);

  protected readonly isVolunteer = computed(() => this.auth.currentUser()?.role === 'volunteer');
  protected readonly rows = signal<ApiListingSummary[]>([]);
  protected readonly loading = signal(true);

  constructor() {
    if (this.isVolunteer()) {
      this.loading.set(false);
      return;
    }
    this.recipientService.history().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not load history');
      },
    });
  }
}
