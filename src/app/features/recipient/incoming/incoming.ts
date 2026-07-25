import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { AvailabilityService } from '@core/services/availability.service';
import { ListingStore } from '@core/services/listing-store.service';
import { EmptyState } from '@shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-incoming',
  imports: [EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="page-title">Incoming Food</h3>
    <p class="page-subtitle">Accept to confirm you'll receive it, or reject to free it up for another NGO.</p>

    @if (availability.isActive()) {
      <div class="card-fb p-4 mb-5 border-0" style="background:var(--fb-success-soft)">
        <div class="flex items-center gap-3">
          <div class="stat-icon !mb-0" style="background:linear-gradient(135deg,var(--fb-success),var(--fb-success-deep))"><i class="fa-solid fa-bell"></i></div>
          <div class="flex-1">
            <div class="font-bold text-success-deep">You're accepting food intake</div>
            <div class="text-muted text-xs">You'll be notified when donations are available nearby</div>
          </div>
          <span class="badge-fb badge-delivered inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-success"></span>Live</span>
        </div>
      </div>

      <div class="grid gap-3">
        @for (l of incoming(); track l.id) {
          <div class="card-fb p-4 flex flex-wrap justify-between items-center gap-3">
            <div class="flex items-center gap-3">
              <div class="stat-icon !mb-0 !w-11 !h-11" style="background:var(--fb-orange)"><i class="fa-solid fa-truck"></i></div>
              <div>
                <div class="font-semibold text-sm">{{ l.foodType }} · {{ l.mealType }} — {{ l.quantity }}</div>
                <div class="text-muted text-xs">From {{ l.donor }} · via {{ l.volunteer }}</div>
              </div>
            </div>
            <div class="flex gap-2">
              <button class="btn-fb-outline !py-2 !px-3 !text-sm" (click)="store.reject(l.id)"><i class="fa-solid fa-xmark mr-1"></i>Reject</button>
              <button class="btn-fb !py-2 !px-3 !text-sm" (click)="store.accept(l.id)"><i class="fa-solid fa-check mr-1"></i>Accept</button>
            </div>
          </div>
        } @empty {
          <app-empty-state icon="fa-solid fa-box-open" text="Nothing incoming right now" />
        }
      </div>
    } @else {
      <div class="card-fb p-6 mb-5 text-center border-dashed" style="border:1.5px dashed var(--fb-line)">
        <i class="fa-solid fa-moon text-3xl text-muted mb-2"></i>
        <div class="font-bold">You're offline</div>
        <div class="text-muted text-sm mb-3">Turn on <b>Accepting</b> to get notified when surplus food is available near you.</div>
        <button class="btn-fb" (click)="availability.toggle()"><i class="fa-solid fa-power-off mr-2"></i>Go Active &amp; Get Notified</button>
      </div>
    }

    <h6 class="section-title mt-6">Awaiting Your Confirmation</h6>
    <div class="grid gap-3">
      @for (l of awaiting(); track l.id) {
        <div class="card-fb p-4 flex flex-wrap justify-between items-center gap-3">
          <div>
            <div class="font-semibold text-sm">{{ l.foodType }} — {{ l.quantity }}</div>
            <div class="text-muted text-xs">Delivered by {{ l.volunteer }}</div>
          </div>
          <button class="btn-fb !py-2 !px-3 !text-sm" (click)="store.confirmReceipt(l.id)"><i class="fa-solid fa-check-double mr-1"></i>Confirm Receipt</button>
        </div>
      } @empty {
        <app-empty-state icon="fa-solid fa-clipboard-check" text="Nothing awaiting confirmation" />
      }
    </div>
  `,
})
export class Incoming {
  private readonly auth = inject(AuthService);
  protected readonly store = inject(ListingStore);
  protected readonly availability = inject(AvailabilityService);

  protected readonly incoming = this.store.incoming;
  protected readonly awaiting = computed(() => {
    const me = this.auth.currentUser()?.name;
    return this.store.listings().filter((l) => l.status === 'delivered' && l.recipient === me);
  });
}
