import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ApiListingSummary } from '@core/models/listing-api.model';
import { RecipientService } from '@core/services/recipient.service';
import { RecipientStore } from '@core/services/recipient-store.service';
import { ToastService } from '@core/services/toast.service';
import { ListingCard } from '@shared/ui/listing-card/listing-card';
import { ListingGrid } from '@shared/ui/listing-grid/listing-grid';

@Component({
  selector: 'app-incoming',
  imports: [ListingCard, ListingGrid],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="page-title">Incoming Food</h3>
    <p class="page-subtitle">Accept to confirm you'll receive it, or reject to free it up for another NGO.</p>

    <app-listing-grid
      [loading]="loading()"
      [empty]="!incoming().length"
      emptyIcon="fa-solid fa-box-open"
      emptyText="Nothing incoming right now"
    >
      @for (l of incoming(); track l.id) {
        <app-listing-card [listing]="l" icon="fa-solid fa-truck" iconBg="var(--fb-orange)" [hasFooter]="true">
          <div cardFooter class="flex gap-2.5">
            <button class="btn-fb-outline flex-1 !py-2 !text-sm !text-red-600" [disabled]="busyId() === l.id" (click)="reject(l)">
              <i class="fa-solid fa-xmark mr-1"></i>Reject
            </button>
            <button class="btn-fb flex-1 !py-2 !text-sm" [disabled]="busyId() === l.id" (click)="accept(l)">
              <i class="fa-solid fa-check mr-1"></i>Accept
            </button>
          </div>
        </app-listing-card>
      }
    </app-listing-grid>

    @if (store.accepted().length) {
      <h6 class="section-title mt-8">Awaiting Your Confirmation</h6>
      <p class="text-muted text-xs mb-3">Confirm receipt once the volunteer has delivered the food.</p>
      <app-listing-grid [loading]="false" [empty]="false">
        @for (l of store.accepted(); track l.id) {
          <app-listing-card
            [listing]="l"
            icon="fa-solid fa-box-open"
            iconBg="linear-gradient(135deg, var(--fb-success), var(--fb-success-deep))"
            [hasFooter]="true"
          >
            <div cardFooter>
              <button class="btn-fb w-full !py-2 !text-sm" [disabled]="busyId() === l.id" (click)="confirmReceipt(l.id)">
                <i class="fa-solid fa-check-double mr-1"></i>{{ busyId() === l.id ? 'Confirming…' : 'Confirm Receipt' }}
              </button>
            </div>
          </app-listing-card>
        }
      </app-listing-grid>
    }
  `,
})
export class Incoming {
  private readonly recipientService = inject(RecipientService);
  protected readonly store = inject(RecipientStore);
  private readonly toast = inject(ToastService);

  protected readonly incoming = signal<ApiListingSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly busyId = signal<string | null>(null);

  constructor() {
    this.load();
  }

  protected accept(l: ApiListingSummary): void {
    this.busyId.set(l.id);
    this.recipientService.accept(l.id).subscribe({
      next: (listing) => {
        this.busyId.set(null);
        this.store.track(listing);
        this.incoming.update((rows) => rows.filter((r) => r.id !== l.id));
        this.toast.show('fa-solid fa-circle-check', "Accepted — you're expecting this delivery");
      },
      error: (err: Error) => {
        this.busyId.set(null);
        this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not accept');
      },
    });
  }

  protected reject(l: ApiListingSummary): void {
    this.busyId.set(l.id);
    this.recipientService.reject(l.id).subscribe({
      next: (listing) => {
        this.busyId.set(null);
        this.incoming.update((rows) => rows.filter((r) => r.id !== l.id));
        const note = listing.timeline?.[listing.timeline.length - 1]?.note ?? 'Reassigned to another recipient.';
        this.toast.show('fa-solid fa-rotate', note);
      },
      error: (err: Error) => {
        this.busyId.set(null);
        this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not reject');
      },
    });
  }

  protected confirmReceipt(id: string): void {
    this.busyId.set(id);
    this.store.confirmReceipt(id).subscribe({
      next: (res) => {
        this.busyId.set(null);
        this.toast.show(
          'fa-solid fa-award',
          `Receipt confirmed — certificate ${res.certificateNumber} issued, ${res.pointsAwarded} pts awarded`,
        );
      },
      error: (err: Error) => {
        this.busyId.set(null);
        this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not confirm receipt');
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.recipientService.incoming().subscribe({
      next: (rows) => {
        this.incoming.set(rows);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not load incoming donations');
      },
    });
  }
}
