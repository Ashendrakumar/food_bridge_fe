import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="page-title">Reports</h3>
    <p class="page-subtitle">Statistics for your own records and funders.</p>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      <div class="card-fb stat-card">
        <div class="stat-icon" style="background:var(--fb-primary)"><i class="fa-solid fa-bowl-food"></i></div>
        <div class="stat-value">1,240</div><div class="stat-label">Meals This Month</div>
      </div>
      <div class="card-fb stat-card">
        <div class="stat-icon" style="background:var(--fb-orange)"><i class="fa-solid fa-truck"></i></div>
        <div class="stat-value">46</div><div class="stat-label">Deliveries Received</div>
      </div>
      <div class="card-fb stat-card">
        <div class="stat-icon" style="background:#2258c7"><i class="fa-solid fa-building"></i></div>
        <div class="stat-value">12</div><div class="stat-label">Partner Donors</div>
      </div>
    </div>

    <div class="card-fb p-5">
      <h6 class="section-title">Meals Received Over Time</h6>
      <div class="flex items-end gap-3 h-40">
        @for (bar of bars; track $index) {
          <div class="flex-1 flex flex-col items-center gap-2">
            <div class="w-full rounded-t-lg" style="background:var(--fb-primary)" [style.height.%]="bar.pct"></div>
            <span class="text-muted text-xs">{{ bar.label }}</span>
          </div>
        }
      </div>
    </div>

    <button class="btn-fb-outline mt-4 !text-sm" (click)="exportReport()">
      <i class="fa-solid fa-file-export mr-2"></i>Export Report
    </button>
  `,
})
export class Reports {
  private readonly toast = inject(ToastService);

  protected readonly bars = [
    { label: 'Jan', pct: 55 },
    { label: 'Feb', pct: 66 },
    { label: 'Mar', pct: 78 },
    { label: 'Apr', pct: 72 },
    { label: 'May', pct: 90 },
    { label: 'Jun', pct: 82 },
  ];

  protected exportReport(): void {
    this.toast.show('fa-solid fa-file-export', 'Report exported (demo)');
  }
}
