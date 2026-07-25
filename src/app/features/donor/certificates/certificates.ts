import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ListingStore } from '@core/services/listing-store.service';
import { ToastService } from '@core/services/toast.service';
import { EmptyState } from '@shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-certificates',
  imports: [EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="page-title">Certificates</h3>
    <p class="page-subtitle">CSR-ready proof for every completed donation.</p>

    <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      @for (l of done(); track l.id) {
        <div class="card-fb p-4 text-center">
          <i class="fa-solid fa-award text-3xl text-primary mb-2"></i>
          <div class="font-semibold text-sm">{{ l.foodType }} — {{ l.quantity }}</div>
          <div class="text-muted text-xs mb-3">Delivered to {{ l.recipient }}</div>
          <button class="btn-fb-outline w-full !py-2 !text-sm" (click)="download()">
            <i class="fa-solid fa-download mr-1"></i>View &amp; Download
          </button>
        </div>
      } @empty {
        <div class="md:col-span-2 lg:col-span-3">
          <app-empty-state icon="fa-solid fa-award" text="No certificates yet — complete a delivery to earn one" />
        </div>
      }
    </div>

    @if (done().length) {
      <button class="btn-fb-outline mt-4 !text-sm" (click)="exportCsr()">
        <i class="fa-solid fa-file-export mr-2"></i>Export CSR Report ({{ done().length }})
      </button>
    }
  `,
})
export class Certificates {
  private readonly store = inject(ListingStore);
  private readonly toast = inject(ToastService);

  protected readonly done = computed(() =>
    this.store.mine().filter((l) => l.status === 'confirmed'),
  );

  protected download(): void {
    this.toast.show('fa-solid fa-download', 'Certificate PDF downloaded (demo)');
  }

  protected exportCsr(): void {
    this.toast.show('fa-solid fa-file-export', 'CSR donation report exported (demo)');
  }
}
