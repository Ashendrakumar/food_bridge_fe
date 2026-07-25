import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { LeaderboardEntry } from '@core/models/leaderboard.model';
import { VolunteerService } from '@core/services/volunteer.service';
import { EmptyState } from '@shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-leaderboard',
  imports: [EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="page-title">Leaderboard</h3>
    <p class="page-subtitle">Top volunteers by rescue points.</p>

    @if (loading()) {
      <div class="card-fb p-6 text-muted"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading rankings…</div>
    } @else {
      <div class="card-fb p-3">
        @for (row of rows(); track row.volunteerId) {
          <div
            class="flex items-center gap-3 py-2.5 border-b border-line last:border-0"
            [class.is-me]="row.volunteerId === myId()"
          >
            <div class="rank-pill">#{{ row.rank }}</div>
            <div class="avatar-circle !w-9 !h-9 !text-[13px]">{{ row.name.charAt(0) }}</div>
            <div class="flex-1">
              <div class="text-sm font-semibold">
                {{ row.name }}@if (row.volunteerId === myId()) {<span class="text-muted"> (you)</span>}
              </div>
              <div class="text-muted text-xs">{{ row.totalDeliveries }} deliveries</div>
            </div>
            <div class="font-bold text-primary-deep">{{ row.totalPoints }} pts</div>
          </div>
        } @empty {
          <app-empty-state icon="fa-solid fa-ranking-star" text="No ranked volunteers yet" />
        }
      </div>
    }
  `,
  styles: `
    .rank-pill {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: var(--fb-primary-soft);
      color: var(--fb-primary-deep);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
      flex-shrink: 0;
    }
    .is-me {
      background: var(--fb-primary-soft);
      border-radius: 12px;
      margin: 0 -6px;
      padding-left: 6px;
      padding-right: 6px;
    }
  `,
})
export class Leaderboard {
  private readonly auth = inject(AuthService);
  private readonly volunteers = inject(VolunteerService);

  protected readonly rows = signal<LeaderboardEntry[]>([]);
  protected readonly loading = signal(true);
  protected readonly myId = computed(() => this.auth.currentUser()?.id ?? '');

  constructor() {
    this.volunteers.leaderboard().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
