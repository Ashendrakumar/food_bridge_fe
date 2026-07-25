import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { UserService } from '@core/services/user.service';
import { UpdateProfileBody, UserProfile } from '@core/models/user.model';
import { FbButton } from '@shared/ui/button/button';
import { FbInput } from '@shared/ui/input/input';
import { RoleBadge } from '@shared/ui/role-badge/role-badge';
import { Avatar } from '@shared/ui/avatar/avatar';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, FbInput, FbButton, RoleBadge, Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="page-title mb-4">Profile</h3>

    @if (loading()) {
      <div class="card-fb p-5 max-w-xl text-muted">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading your profile…
      </div>
    } @else if (profile(); as u) {
      <form [formGroup]="form" class="card-fb p-5 max-w-xl">
        <div class="flex items-center gap-3 mb-5">
          <div class="relative">
            <app-avatar [name]="u.name" [imageUrl]="u.avatarUrl" [size]="64" />
            <button type="button" class="photo-btn" title="Change photo" (click)="photoInput.click()">
              <i class="fa-solid fa-camera"></i>
            </button>
            <input #photoInput type="file" accept="image/jpeg,image/png" hidden (change)="onPhoto($event)" />
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-semibold text-lg">{{ u.name }}</span>
              @if (statusMeta(u.accountStatus); as s) {
                <span class="acc-badge" [class]="s.cls">
                  <i [class]="s.icon" aria-hidden="true"></i>{{ u.accountStatus }}
                </span>
              }
            </div>
            <div class="flex items-center gap-2 flex-wrap mt-1.5">
              <app-role-badge [role]="u.role" size="sm" />
              <span class="text-muted text-sm">{{ u.city || '—' }}</span>
            </div>
          </div>
        </div>

        @if (canToggleAvailability()) {
          <div class="flex items-center justify-between card-fb p-3 mb-4">
            <div>
              <div class="font-semibold text-sm">Availability</div>
              <div class="text-muted text-xs">
                {{ available() ? 'Active — visible for matching' : 'Offline — not receiving new work' }}
              </div>
            </div>
            <button
              type="button"
              [class]="(available() ? 'btn-fb' : 'btn-fb-outline') + ' !py-1.5 !px-4 !text-sm'"
              [disabled]="savingAvailability()"
              (click)="toggleAvailability()"
            >
              {{ available() ? 'Active' : 'Offline' }}
            </button>
          </div>
        }

        <div class="grid sm:grid-cols-2 gap-3">
          <app-input label="Mobile" prefix="+91" formControlName="mobile" />
          <app-input label="City" formControlName="city" />
          <app-input class="sm:col-span-2" label="Full Name" formControlName="name" />
          <app-input class="sm:col-span-2" label="Address" formControlName="address" />
          @if (isRecipient()) {
            <app-input label="Recipient Type" formControlName="recipientType" />
            <app-input
              type="number"
              [label]="u.recipientType === 'Organization' ? 'Serving Capacity (meals/day)' : 'Household Size'"
              formControlName="capacity"
            />
          }
        </div>
        <div class="mt-5">
          <app-button icon="fa-solid fa-floppy-disk" [disabled]="saving()" (clicked)="save()">
            {{ saving() ? 'Saving…' : 'Save Changes' }}
          </app-button>
        </div>
      </form>
    } @else {
      <div class="card-fb p-5 max-w-xl text-muted">Could not load your profile.</div>
    }
  `,
  styles: `
    .photo-btn {
      position: absolute;
      right: -2px;
      bottom: -5px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--fb-surface);
      border: 1px solid var(--fb-line);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.14);
      color: var(--fb-muted);
      font-size: 10px;
      cursor: pointer;
      transition:
        color 0.15s ease,
        border-color 0.15s ease;
    }
    .photo-btn:hover {
      color: var(--fb-primary-deep);
      border-color: var(--fb-primary);
    }
    .acc-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
      padding: 4px 10px;
      border-radius: 999px;
    }
    .acc-badge.verified {
      background: var(--fb-success-soft);
      color: var(--fb-success-deep);
    }
    .acc-badge.pending {
      background: var(--fb-orange-soft);
      color: #b4551e;
    }
    .acc-badge.suspended {
      background: rgba(224, 68, 52, 0.14);
      color: #c0392b;
    }
  `,
})
export class Profile {
  private readonly auth = inject(AuthService);
  private readonly users = inject(UserService);
  private readonly toast = inject(ToastService);

  protected readonly profile = signal<UserProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly savingAvailability = signal(false);
  protected readonly available = signal(false);

  /** Icon + colour class for an account status pill. */
  protected statusMeta(status: string): { icon: string; cls: string } {
    switch (status) {
      case 'Verified':
        return { icon: 'fa-solid fa-circle-check', cls: 'verified' };
      case 'Pending':
        return { icon: 'fa-solid fa-clock', cls: 'pending' };
      case 'Suspended':
        return { icon: 'fa-solid fa-ban', cls: 'suspended' };
      default:
        return { icon: 'fa-solid fa-circle-info', cls: '' };
    }
  }

  protected readonly isRecipient = computed(() => this.profile()?.role?.toLowerCase() === 'recipient');
  protected readonly canToggleAvailability = computed(() => {
    const role = this.profile()?.role?.toLowerCase();
    return role === 'volunteer' || role === 'recipient';
  });

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    city: new FormControl('', { nonNullable: true }),
    address: new FormControl('', { nonNullable: true }),
    capacity: new FormControl('', { nonNullable: true }),
    mobile: new FormControl({ value: '', disabled: true }, { nonNullable: true }),
    recipientType: new FormControl({ value: '', disabled: true }, { nonNullable: true }),
  });

  constructor() {
    const id = this.auth.currentUser()?.id;
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.users.getProfile(id).subscribe({
      next: (p) => this.applyProfile(p),
      error: (err: Error) => {
        this.loading.set(false);
        this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not load profile');
      },
    });
  }

  protected toggleAvailability(): void {
    const id = this.profile()?.id;
    if (!id) {
      return;
    }
    const next = !this.available();
    this.savingAvailability.set(true);
    this.users.setAvailability(id, next).subscribe({
      next: (p) => {
        this.available.set(p.isAvailable);
        this.savingAvailability.set(false);
        this.toast.show('fa-solid fa-circle-check', p.isAvailable ? 'You are now active' : 'You are now offline');
      },
      error: (err: Error) => {
        this.savingAvailability.set(false);
        this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not update availability');
      },
    });
  }

  protected onPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const id = this.profile()?.id;
    if (!file || !id) {
      return;
    }
    this.users.uploadAvatar(id, file).subscribe({
      next: (res) => {
        this.profile.update((p) => (p ? { ...p, avatarUrl: res.avatarUrl } : p));
        this.auth.patchCurrentUser({ avatarUrl: res.avatarUrl });
        this.toast.show('fa-solid fa-circle-check', 'Photo updated');
      },
      error: (err: Error) =>
        this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not upload photo'),
    });
  }

  protected save(): void {
    const id = this.profile()?.id;
    if (!id) {
      return;
    }
    const v = this.form.getRawValue();
    const body: UpdateProfileBody = {
      name: v.name.trim(),
      city: v.city.trim() || null,
      address: v.address.trim() || null,
      latitude: this.profile()?.latitude ?? null,
      longitude: this.profile()?.longitude ?? null,
      capacityMeals: this.isRecipient() ? this.parseCapacity(v.capacity) : null,
    };
    this.saving.set(true);
    this.users.updateProfile(id, body).subscribe({
      next: (p) => {
        this.applyProfile(p);
        this.saving.set(false);
        this.auth.patchCurrentUser({ name: p.name, city: p.city ?? undefined });
        this.toast.show('fa-solid fa-circle-check', 'Profile updated');
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not save profile');
      },
    });
  }

  private applyProfile(p: UserProfile): void {
    this.profile.set(p);
    this.available.set(p.isAvailable);
    this.loading.set(false);
    this.auth.patchCurrentUser({ avatarUrl: p.avatarUrl ?? undefined });
    this.form.patchValue(
      {
        name: p.name,
        city: p.city ?? '',
        address: p.address ?? '',
        capacity: p.capacityMeals != null ? String(p.capacityMeals) : '',
        mobile: p.mobile,
        recipientType: p.recipientType ?? '',
      },
      { emitEvent: false },
    );
  }

  private parseCapacity(value: string): number | null {
    const n = Number.parseInt(value.trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
}
