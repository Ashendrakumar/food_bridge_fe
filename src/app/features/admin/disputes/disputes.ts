import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Dispute, DISPUTES } from '@core/data/mock-data';
import { ToastService } from '@core/services/toast.service';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { PageWrapper } from '@shared/ui/page-wrapper/page-wrapper';

@Component({
  selector: 'app-disputes',
  imports: [EmptyState, PageWrapper],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-wrapper
      title="Dispute Resolution"
      description="Investigate and resolve issues raised on deliveries."
    >
      <h6 class="section-title">Open <span class="badge-fb badge-pending ml-1">{{ open().length }}</span></h6>
      <div class="grid gap-3 lg:grid-cols-2 mb-6">
        @for (d of open(); track d.id) {
          <div class="card-fb p-4" [style.borderLeft]="'4px solid ' + color(d.priority)">
            <div class="flex justify-between items-start mb-2">
              <div class="font-semibold text-sm">{{ d.listing }}</div>
              <span class="badge-fb" [style.background]="color(d.priority) + '22'" [style.color]="color(d.priority)">{{ d.priority }} priority</span>
            </div>
            <div class="text-muted text-xs mb-2"><i class="fa-solid fa-user mr-1"></i>Raised by {{ d.raisedBy }}</div>
            <div class="text-sm mb-3">"{{ d.reason }}"</div>
            <div class="flex gap-2">
              <button class="btn-fb flex-1 !py-2 !text-sm" (click)="resolve(d)"><i class="fa-solid fa-check mr-1"></i>Mark Resolved</button>
              <button class="btn-fb-outline !py-2 !px-3 !text-sm" (click)="contact()"><i class="fa-solid fa-envelope"></i></button>
            </div>
          </div>
        } @empty {
          <div class="lg:col-span-2">
            <app-empty-state
              tone="positive"
              icon="fa-solid fa-circle-check"
              title="No open disputes"
              text="Everything is clear. New reports will appear here as soon as they are raised."
            />
          </div>
        }
      </div>

      @if (resolved().length) {
        <h6 class="section-title">Resolved</h6>
        <div class="grid gap-3 lg:grid-cols-2">
          @for (d of resolved(); track d.id) {
            <div class="card-fb p-4 opacity-70">
              <div class="flex justify-between items-start">
                <div class="font-semibold text-sm">{{ d.listing }}</div>
                <span class="badge-fb badge-confirmed">Resolved</span>
              </div>
              <div class="text-muted text-xs mt-1">{{ d.reason }}</div>
            </div>
          }
        </div>
      }
    </app-page-wrapper>
  `,
})
export class Disputes {
  private readonly toast = inject(ToastService);
  protected readonly disputes = signal<Dispute[]>(structuredClone(DISPUTES));

  protected readonly open = computed(() => this.disputes().filter((d) => d.status === 'open'));
  protected readonly resolved = computed(() => this.disputes().filter((d) => d.status === 'resolved'));

  protected color(priority: Dispute['priority']): string {
    const map = { high: '#c7442a', medium: 'var(--fb-orange)', low: 'var(--fb-muted)' };
    return map[priority];
  }

  protected resolve(d: Dispute): void {
    this.disputes.update((list) => list.map((x) => (x.id === d.id ? { ...x, status: 'resolved' } : x)));
    this.toast.show('fa-solid fa-circle-check', 'Dispute marked resolved');
  }

  protected contact(): void {
    this.toast.show('fa-solid fa-envelope', 'Contacted both parties (demo)');
  }
}
