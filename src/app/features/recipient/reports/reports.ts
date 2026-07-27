import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ChartPoint, RecipientReport } from '@core/models/report.model';
import { ReportService } from '@core/services/report.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="page-title">Reports</h3>
    <p class="page-subtitle">Statistics for your own records and funders.</p>

    @if (loading()) {
      <div class="card-fb p-6 text-muted"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading your impact…</div>
    } @else if (report(); as r) {
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div class="card-fb stat-card">
          <div class="stat-icon" style="background:var(--fb-primary)"><i class="fa-solid fa-bowl-food"></i></div>
          <div class="stat-value">{{ r.totalMealsReceived }}</div><div class="stat-label">Meals Received</div>
        </div>
        <div class="card-fb stat-card">
          <div class="stat-icon" style="background:var(--fb-orange)"><i class="fa-solid fa-truck"></i></div>
          <div class="stat-value">{{ r.totalDeliveriesReceived }}</div><div class="stat-label">Deliveries Received</div>
        </div>
      </div>

      <div class="card-fb p-5">
        <h6 class="section-title">Meals Received Over Time</h6>
        @if (bars().length) {
          <div class="flex items-end gap-3 h-40">
            @for (bar of bars(); track bar.label) {
              <div class="flex-1 flex flex-col items-center gap-2">
                <div class="w-full rounded-t-lg" style="background:var(--fb-primary)" [style.height.%]="bar.pct" [title]="bar.value + ' meals'"></div>
                <span class="text-muted text-xs">{{ bar.label }}</span>
              </div>
            }
          </div>
        } @else {
          <p class="text-muted text-sm">No data yet — confirmed receipts will appear here.</p>
        }
      </div>
    }
  `,
})
export class Reports {
  private readonly reportService = inject(ReportService);
  private readonly toast = inject(ToastService);

  protected readonly report = signal<RecipientReport | null>(null);
  protected readonly loading = signal(true);

  protected readonly bars = computed(() => {
    const series = this.report()?.mealsReceivedByMonth ?? [];
    const max = Math.max(1, ...series.map((p) => p.value));
    return series.map((p: ChartPoint) => ({
      label: this.monthLabel(p.period),
      value: p.value,
      pct: Math.round((p.value / max) * 100),
    }));
  });

  constructor() {
    this.reportService.recipient().subscribe({
      next: (r) => {
        this.report.set(r);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not load your report');
      },
    });
  }

  /** "2026-07" → "Jul". */
  private monthLabel(period: string): string {
    const month = Number.parseInt(period.split('-')[1] ?? '0', 10);
    const names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return names[month] ?? period;
  }
}
