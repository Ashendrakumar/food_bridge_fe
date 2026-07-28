import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '@core/services/toast.service';
import { PageWrapper } from '@shared/ui/page-wrapper/page-wrapper';

@Component({
  selector: 'app-admin-reports',
  imports: [PageWrapper],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-wrapper
      title="Platform Reports"
      description="CSR-ready, platform-wide impact for funders and partners."
    >
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div class="card-fb stat-card"><div class="stat-icon" style="background:var(--fb-primary)"><i class="fa-solid fa-bowl-food"></i></div><div class="stat-value">8,420</div><div class="stat-label">Meals Rescued</div></div>
        <div class="card-fb stat-card"><div class="stat-icon" style="background:var(--fb-orange)"><i class="fa-solid fa-users"></i></div><div class="stat-value">156</div><div class="stat-label">Active Volunteers</div></div>
        <div class="card-fb stat-card"><div class="stat-icon" style="background:#2258c7"><i class="fa-solid fa-building"></i></div><div class="stat-value">38</div><div class="stat-label">Partner Orgs</div></div>
        <div class="card-fb stat-card"><div class="stat-icon" style="background:var(--fb-success)"><i class="fa-solid fa-leaf"></i></div><div class="stat-value">2.1t</div><div class="stat-label">CO₂ Avoided</div></div>
      </div>

      <div class="card-fb p-5">
        <h6 class="section-title">Meals Rescued Over Time</h6>
        <div class="flex items-end gap-3 h-40">
          @for (bar of bars; track $index) {
            <div class="flex-1 flex flex-col items-center gap-2">
              <div class="w-full rounded-t-lg" style="background:var(--fb-primary)" [style.height.%]="bar.pct"></div>
              <span class="text-muted text-xs">{{ bar.label }}</span>
            </div>
          }
        </div>
      </div>

      <button class="btn-fb-outline mt-4 !text-sm" (click)="exportCsr()">
        <i class="fa-solid fa-file-export mr-2"></i>Export CSR Report
      </button>
    </app-page-wrapper>
  `,
})
export class AdminReports {
  private readonly toast = inject(ToastService);

  protected readonly bars = [
    { label: 'Jan', pct: 54 },
    { label: 'Feb', pct: 68 },
    { label: 'Mar', pct: 77 },
    { label: 'Apr', pct: 89 },
    { label: 'May', pct: 100 },
    { label: 'Jun', pct: 98 },
  ];

  protected exportCsr(): void {
    this.toast.show('fa-solid fa-file-export', 'Platform CSR report exported (demo)');
  }
}
