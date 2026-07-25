import { TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Account, ACCOUNTS } from '@core/data/mock-data';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-verifications',
  imports: [TitleCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="page-title">Verifications</h3>
    <p class="page-subtitle">Approve or suspend volunteers and organizations. Individuals self-register.</p>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      @for (a of sorted(); track a.id) {
        <div class="card-fb p-4">
          <div class="flex items-center gap-2 mb-2">
            <div class="avatar-circle" [style.background]="a.type === 'Organization' ? 'linear-gradient(135deg,var(--fb-success),var(--fb-success-deep))' : 'linear-gradient(135deg,var(--fb-primary),var(--fb-primary-deep))'">{{ a.name.charAt(0) }}</div>
            <div class="flex-1">
              <div class="font-semibold text-sm">{{ a.name }}</div>
              <div class="text-muted text-xs"><i class="fa-solid mr-1" [class]="a.type === 'Organization' ? 'fa-building' : 'fa-user'"></i>{{ a.type }} · {{ a.city }}</div>
            </div>
            <span class="badge-fb" [class]="badgeClass(a.status)">{{ a.status | titlecase }}</span>
          </div>
          <div class="text-muted text-xs mb-3"><i class="fa-solid fa-clock mr-1"></i>Joined {{ a.joined }}</div>
          <div class="flex gap-2">
            @switch (a.status) {
              @case ('pending') {
                <button class="btn-fb flex-1 !py-2 !text-sm" (click)="verify(a)"><i class="fa-solid fa-check mr-1"></i>Verify</button>
                <button class="btn-fb-outline flex-1 !py-2 !text-sm !text-red-600" (click)="suspend(a)">Reject</button>
              }
              @case ('verified') {
                <button class="btn-fb-outline flex-1 !py-2 !text-sm !text-red-600" (click)="suspend(a)"><i class="fa-solid fa-ban mr-1"></i>Suspend</button>
              }
              @default {
                <button class="btn-fb flex-1 !py-2 !text-sm" (click)="verify(a)"><i class="fa-solid fa-rotate-left mr-1"></i>Reinstate</button>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class Verifications {
  private readonly toast = inject(ToastService);
  protected readonly accounts = signal<Account[]>(structuredClone(ACCOUNTS));

  private readonly order = { pending: 0, verified: 1, suspended: 2 };
  protected readonly sorted = computed(() =>
    [...this.accounts()].sort((a, b) => this.order[a.status] - this.order[b.status]),
  );

  protected badgeClass(status: Account['status']): string {
    const map = { verified: 'badge-confirmed', pending: 'badge-pending', suspended: 'badge-expired' };
    return map[status];
  }

  protected verify(a: Account): void {
    this.set(a.id, 'verified');
    this.toast.show('fa-solid fa-user-check', `${a.name} verified`);
  }

  protected suspend(a: Account): void {
    this.set(a.id, 'suspended');
    this.toast.show('fa-solid fa-ban', `${a.name} suspended`);
  }

  private set(id: number, status: Account['status']): void {
    this.accounts.update((list) => list.map((a) => (a.id === id ? { ...a, status } : a)));
  }
}
