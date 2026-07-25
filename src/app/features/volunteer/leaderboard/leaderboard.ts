import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { VOLUNTEER_NAMES } from '@core/data/mock-data';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-leaderboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="page-title">Leaderboard</h3>
    <p class="page-subtitle">Top volunteers this month.</p>

    <div class="card-fb p-3">
      @for (row of rows(); track row.name; let i = $index) {
        <div class="flex items-center gap-3 py-2.5 border-b border-line last:border-0">
          <div class="rank-pill">#{{ i + 1 }}</div>
          <div class="avatar-circle !w-9 !h-9 !text-[13px]">{{ row.name.charAt(0) }}</div>
          <div class="flex-1">
            <div class="text-sm font-semibold">
              {{ row.name }}@if (row.name === me()) {<span class="text-muted"> (you)</span>}
            </div>
            <div class="text-muted text-xs">{{ row.deliveries }} deliveries</div>
          </div>
          <div class="font-bold text-primary-deep">{{ row.points }} pts</div>
        </div>
      }
    </div>
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
  `,
})
export class Leaderboard {
  private readonly auth = inject(AuthService);
  protected readonly me = computed(() => this.auth.currentUser()?.name ?? '');

  protected readonly rows = computed(() =>
    VOLUNTEER_NAMES.map((name, i) => ({ name, points: 720 - i * 95, deliveries: 34 - i * 5 })).sort(
      (a, b) => b.points - a.points,
    ),
  );
}
