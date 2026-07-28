import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ListingStatus, STATUS_LABELS } from '@core/models/listing.model';
import { ListingStore } from '@core/services/listing-store.service';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { StatusBadge } from '@shared/ui/status-badge/status-badge';
import { PageWrapper } from '@shared/ui/page-wrapper/page-wrapper';

type Filter = 'all' | ListingStatus;

@Component({
  selector: 'app-all-listings',
  imports: [StatusBadge, EmptyState, PageWrapper],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-wrapper
      title="All Listings"
      description="Full live status trail across every listing on the platform."
    >
      <div class="flex flex-wrap gap-2 mb-4">
        @for (f of filters; track f) {
          <button [class]="(filter() === f ? 'btn-fb' : 'btn-fb-outline') + ' !py-1.5 !px-3 !text-sm'" (click)="filter.set(f)">
            {{ f === 'all' ? 'All' : STATUS_LABELS[f] }}
          </button>
        }
      </div>

      <div class="card-fb overflow-hidden !p-0">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left" style="background:var(--fb-primary-soft)">
                <th class="small-label px-4 py-3">Donor</th>
                <th class="small-label py-3">Food</th>
                <th class="small-label py-3">Volunteer</th>
                <th class="small-label py-3">Recipient</th>
                <th class="small-label py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              @for (l of rows(); track l.id) {
                <tr class="border-t border-line">
                  <td class="px-4 py-3 font-semibold">{{ l.donor }}</td>
                  <td class="py-3 text-muted">{{ l.foodType }} · {{ l.quantity }}</td>
                  <td class="py-3 text-muted">{{ l.volunteer || '—' }}</td>
                  <td class="py-3 text-muted">{{ l.recipient || '—' }}</td>
                  <td class="py-3"><app-status-badge [status]="l.status" /></td>
                </tr>
              } @empty {
                <tr><td colspan="5"><app-empty-state size="sm" icon="fa-solid fa-inbox" text="No listings match this filter" /></td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </app-page-wrapper>
  `,
})
export class AllListings {
  private readonly store = inject(ListingStore);

  protected readonly STATUS_LABELS = STATUS_LABELS;
  protected readonly filters: Filter[] = ['all', 'pending', 'claimed', 'pickedup', 'delivered', 'confirmed', 'expired'];
  protected readonly filter = signal<Filter>('all');

  protected readonly rows = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.store.listings() : this.store.listings().filter((l) => l.status === f);
  });
}
