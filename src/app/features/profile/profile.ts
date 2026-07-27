import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '@core/services/auth.service';
import { AvailabilityService } from '@core/services/availability.service';
import { GeocodingService } from '@core/services/geocoding.service';
import { PickupAddress, PickupAddressService } from '@core/services/pickup-address.service';
import { ToastService } from '@core/services/toast.service';
import { UserService } from '@core/services/user.service';
import { UpdateProfileBody, UserProfile } from '@core/models/user.model';
import { FbButton } from '@shared/ui/button/button';
import { FbInput } from '@shared/ui/input/input';
import { FbMap } from '@shared/ui/map/fb-map';
import { FbLatLng, FbMapConfig } from '@shared/ui/map/fb-map.model';
import { RoleBadge } from '@shared/ui/role-badge/role-badge';
import { Avatar } from '@shared/ui/avatar/avatar';
import { environment } from '@env/environment';

/** Address-form controls that carry validation, in display order. */
const ADDR_FIELDS = ['label', 'address', 'pincode'] as const;

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, FbInput, FbButton, RoleBadge, Avatar, FbMap],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="page-title mb-4">Profile</h3>


    @if (loading()) {
      <div class="card-fb p-5 max-w-xl text-muted">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading your profile…
      </div>
    } @else if (profile(); as u) {
      <div class="grid gap-4 lg:grid-cols-2">
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
                {{ availability.isActive() ? 'Active — visible for matching' : 'Offline — not receiving new work' }}
              </div>
              @if (!availability.isActive()) {
                <div class="text-muted text-xs mt-0.5">
                  <i class="fa-solid fa-location-crosshairs mr-1"></i>Going active shares your current location.
                </div>
              }
            </div>
            <button
              type="button"
              [class]="(availability.isActive() ? 'btn-fb' : 'btn-fb-outline') + ' !py-1.5 !px-4 !text-sm'"
              [disabled]="availability.busy()"
              (click)="availability.toggle()"
            >
              @if (availability.busy()) {
                <i class="fa-solid fa-spinner fa-spin mr-1"></i>
              }
              {{ availability.isActive() ? 'Active' : 'Offline' }}
            </button>
          </div>
        }

        <div class="grid sm:grid-cols-2 gap-3">
          <app-input label="Mobile" prefix="+91" prefixIcon="fa-solid fa-phone" formControlName="mobile" />
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

      @if (isDonor()) {
        <div class="card-fb p-5 max-w-xl">
          <div class="flex items-center justify-between mb-3">
            <div class="font-bold"><i class="fa-solid fa-location-dot mr-2 text-primary"></i>Pickup Addresses</div>
            <button class="btn-fb-outline !py-1.5 !px-3 !text-sm" (click)="toggleAddForm()">
              <i class="fa-solid mr-1" [class]="addOpen() ? 'fa-xmark' : 'fa-plus'"></i>{{ addOpen() ? 'Close' : 'Add' }}
            </button>
          </div>

          @if (pickup.loading()) {
            <div class="text-muted text-sm"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading addresses…</div>
          }
          <div class="space-y-2">
            @for (a of pickup.addresses(); track a.id) {
              <div class="addr-row" [class.sel]="isDefault(a)">
                <i class="fa-solid mr-2 shrink-0" [class]="isDefault(a) ? 'fa-circle-check text-primary' : 'fa-location-dot text-muted'"></i>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-semibold truncate">{{ a.label }}</div>
                  <div class="text-xs text-muted truncate">{{ a.address }}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  class="addr-switch shrink-0"
                  [class.on]="isDefault(a)"
                  [attr.aria-checked]="isDefault(a)"
                  [disabled]="isDefault(a) || settingDefaultId() === a.id"
                  [title]="isDefault(a) ? 'Default pickup address' : 'Set as default'"
                  (click)="setDefault(a, $event)"
                >
                  <span class="knob"></span>
                  <span class="addr-switch-text">
                    @if (settingDefaultId() === a.id) {
                      <i class="fa-solid fa-spinner fa-spin"></i>&nbsp;Saving…
                    } @else {
                      {{ isDefault(a) ? 'Default' : 'Set default' }}
                    }
                  </span>
                </button>
                @if (confirmRemoveId() === a.id) {
                  <span class="addr-confirm-text">Remove?</span>
                  <button type="button" class="addr-x addr-x-danger" title="Confirm remove" [disabled]="removingId() === a.id" (click)="removeAddr(a.id, $event)">
                    @if (removingId() === a.id) {
                      <i class="fa-solid fa-spinner fa-spin"></i>
                    } @else {
                      <i class="fa-solid fa-check"></i>
                    }
                  </button>
                  <button type="button" class="addr-x" title="Keep address" (click)="cancelRemove($event)"><i class="fa-solid fa-xmark"></i></button>
                } @else {
                  <button type="button" class="addr-x" title="Edit" (click)="startEdit(a, $event)"><i class="fa-solid fa-pen"></i></button>
                  <button type="button" class="addr-x" title="Remove" (click)="askRemove(a.id, $event)"><i class="fa-solid fa-trash-can"></i></button>
                }
              </div>
            } @empty {
              @if (!pickup.loading()) {
                <div class="text-muted text-sm">No pickup addresses yet — add one below.</div>
              }
            }
          </div>

          @if (addOpen()) {
            <div class="mt-4 pt-4 border-t border-line">
              <div class="small-label mb-2">{{ editingId() ? 'Edit address' : 'New address' }} — pin the pickup location</div>
              <app-fb-map class="block mb-3" [config]="addMapConfig()" (locationChange)="onAddLocation($event)" />
              <div class="mb-3">
                <app-button variant="outline" icon="fa-solid fa-location-crosshairs" [block]="true" [loading]="geoBusy()" (clicked)="captureGps()">
                  Use current location
                </app-button>
              </div>
              <form [formGroup]="addrForm" class="grid sm:grid-cols-2 gap-3">
                <app-input class="sm:col-span-2" label="Label" formControlName="label" placeholder="e.g. Home, Main Branch" [required]="true" [maxlength]="100" hint="A short name to recognise this location." [error]="addrErr('label')" />
                <app-input class="sm:col-span-2" label="Address" formControlName="address" placeholder="e.g. C.G. Road, Navrangpura" [required]="true" [maxlength]="500" hint="Drop a pin or use GPS to auto-fill." [error]="addrErr('address')" />
                <app-input label="City" formControlName="city" placeholder="City" />
                <app-input label="Pincode" type="tel" [maxlength]="6" inputmode="numeric" formControlName="pincode" placeholder="Pincode" [error]="addrErr('pincode')" />
              </form>
              <div class="mt-4 flex gap-2">
                <app-button icon="fa-solid fa-check" [disabled]="savingAddr()" (clicked)="saveAddress()">
                  {{ savingAddr() ? 'Saving…' : editingId() ? 'Update Address' : 'Save Address' }}
                </app-button>
                <app-button variant="ghost" (clicked)="toggleAddForm()">Cancel</app-button>
              </div>
            </div>
          }
        </div>
      }
      </div>
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
    .addr-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid var(--fb-line);
      transition:
        border-color 0.15s ease,
        background 0.15s ease;
    }
    .addr-row.sel {
      border-color: var(--fb-primary);
      background: var(--fb-primary-soft);
    }
    /* Default toggle switch */
    .addr-switch {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--fb-line);
      background: var(--fb-bg);
      border-radius: 999px;
      padding: 3px 12px 3px 3px;
      cursor: pointer;
      color: var(--fb-muted);
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      transition:
        border-color 0.15s ease,
        color 0.15s ease,
        background 0.15s ease;
    }
    .addr-switch:hover:not(:disabled) {
      border-color: var(--fb-primary);
      color: var(--fb-primary-deep);
    }
    .addr-switch .knob {
      position: relative;
      display: inline-block;
      width: 34px;
      height: 18px;
      border-radius: 999px;
      background: var(--fb-line);
      transition: background 0.15s ease;
    }
    .addr-switch .knob::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
      transition: transform 0.15s ease;
    }
    .addr-switch.on {
      color: var(--fb-primary-deep);
      border-color: var(--fb-primary);
      background: var(--fb-primary-soft);
      cursor: default;
    }
    .addr-switch.on .knob {
      background: var(--fb-primary);
    }
    .addr-switch.on .knob::after {
      transform: translateX(16px);
    }
    .addr-switch:disabled:not(.on) {
      cursor: default;
      opacity: 0.7;
    }
    .addr-x {
      border: 0;
      background: transparent;
      color: var(--fb-muted);
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 6px;
      flex-shrink: 0;
    }
    .addr-x:hover {
      color: #e04434;
      background: var(--fb-bg);
    }
    .addr-x-danger {
      color: #e04434;
    }
    .addr-confirm-text {
      font-size: 12px;
      font-weight: 600;
      color: #e04434;
      white-space: nowrap;
    }
  `,
})
export class Profile {
  private readonly auth = inject(AuthService);
  private readonly users = inject(UserService);
  private readonly toast = inject(ToastService);
  protected readonly pickup = inject(PickupAddressService);
  protected readonly availability = inject(AvailabilityService);
  private readonly geocoding = inject(GeocodingService);

  protected readonly profile = signal<UserProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);

  // ---- Pickup address management (donors) ----
  protected readonly isDonor = computed(() => this.profile()?.role?.toLowerCase() === 'donor');
  protected readonly addOpen = signal(false);
  protected readonly geoBusy = signal(false);
  protected readonly savingAddr = signal(false);
  protected readonly addLocation = signal<FbLatLng | null>(null);
  protected readonly editingId = signal<string | null>(null);
  protected readonly removingId = signal<string | null>(null);
  protected readonly settingDefaultId = signal<string | null>(null);
  /** Address awaiting delete confirmation (inline two-step confirm). */
  protected readonly confirmRemoveId = signal<string | null>(null);

  protected isDefault(a: PickupAddress): boolean {
    return a.id === this.pickup.selected()?.id;
  }

  protected readonly addMapConfig = computed<FbMapConfig>(() => ({
    mode: 'picker',
    height: 200,
    zoom: 15,
    initialLocation: this.addLocation() ?? environment.mapDefaultCenter,
    clickToPlace: true,
    placeholderText: 'Pin the pickup location',
  }));

  protected readonly addrForm = new FormGroup({
    label: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    address: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(500)] }),
    city: new FormControl('', { nonNullable: true }),
    pincode: new FormControl('', { nonNullable: true, validators: [Validators.pattern(/^\d{0,6}$/)] }),
  });

  /** Per-field validation messages shown beneath each input (mirrors the register form). */
  protected readonly addrErrors = signal<Record<string, string>>({});
  /** True once a save has been attempted — enables live re-validation on change. */
  private addrValidated = false;

  protected addrErr(field: string): string {
    return this.addrErrors()[field] ?? '';
  }

  /** Icon + colour class for an account status pill. */
  protected statusMeta(status: string): { icon: string; cls: string; } {
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
    // Re-validate the address fields on every change, once a save has been attempted.
    this.addrForm.valueChanges.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => {
      if (this.addrValidated) {
        this.refreshAddrErrors();
      }
    });

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

  protected toggleAddForm(): void {
    const open = !this.addOpen();
    this.addOpen.set(open);
    if (!open) {
      this.resetAddForm();
    }
  }

  protected onAddLocation(pos: FbLatLng): void {
    this.addLocation.set(pos);
    this.reverseFill(pos, false);
  }

  protected captureGps(): void {
    if (!navigator.geolocation) {
      this.toast.warning('Geolocation is not supported on this device.');
      return;
    }
    this.geoBusy.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
        this.addLocation.set(loc);
        this.reverseFill(loc, true);
      },
      () => {
        this.geoBusy.set(false);
        this.toast.warning('Could not read your location — drop a pin on the map instead.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  /** Reverse-geocode the pinned point to auto-fill the address fields. */
  private reverseFill(loc: FbLatLng, fromGps: boolean): void {
    this.geocoding.reverseGeocode(loc.lat, loc.lng).subscribe({
      next: (a) => {
        if (fromGps) {
          this.geoBusy.set(false);
        }
        this.addrForm.patchValue({
          address: a.address || this.addrForm.controls.address.value,
          city: a.city || this.addrForm.controls.city.value,
          pincode: a.pincode || this.addrForm.controls.pincode.value,
        });
      },
      error: () => {
        if (fromGps) {
          this.geoBusy.set(false);
        }
      },
    });
  }

  /** Make this address the default (selected) pickup address. */
  protected setDefault(a: PickupAddress, event: Event): void {
    event.stopPropagation();
    if (this.isDefault(a) || this.settingDefaultId()) {
      return;
    }
    this.settingDefaultId.set(a.id);
    this.pickup.select(a.id).subscribe({
      next: () => {
        this.settingDefaultId.set(null);
        this.toast.show('fa-solid fa-circle-check', `“${a.label}” is now your default pickup address`);
      },
      error: (err: Error) => {
        this.settingDefaultId.set(null);
        this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not set the default address');
      },
    });
  }

  /** Load an existing address into the form for editing. */
  protected startEdit(a: PickupAddress, event: Event): void {
    event.stopPropagation();
    this.editingId.set(a.id);
    this.addLocation.set({ lat: a.latitude, lng: a.longitude });
    this.addrForm.reset({ label: a.label, address: a.address, city: '', pincode: '' });
    this.addrValidated = false;
    this.addrErrors.set({});
    this.addOpen.set(true);
  }

  protected saveAddress(): void {
    this.addrValidated = true;
    this.addrForm.markAllAsTouched();
    this.refreshAddrErrors();
    const firstError = this.firstAddrError();
    if (firstError) {
      this.toast.show('fa-solid fa-triangle-exclamation', firstError);
      return;
    }

    const loc = this.addLocation();
    if (!loc) {
      this.toast.show('fa-solid fa-triangle-exclamation', 'Drop a pin or use your current location');
      return;
    }

    const v = this.addrForm.getRawValue();
    const label = v.label.trim();
    const address = [v.address.trim(), v.city.trim(), v.pincode.trim()].filter(Boolean).join(', ');

    const editId = this.editingId();
    this.savingAddr.set(true);
    const request$ = editId
      ? this.pickup.update(editId, label, address, loc.lat, loc.lng, this.isDefaultOf(editId))
      : this.pickup.create(label, address, loc.lat, loc.lng);

    request$.subscribe({
      next: () => {
        this.savingAddr.set(false);
        this.addOpen.set(false);
        this.resetAddForm();
        this.toast.show('fa-solid fa-circle-check', editId ? 'Address updated' : 'Pickup address added');
      },
      error: (err: Error) => {
        this.savingAddr.set(false);
        this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not save the address');
      },
    });
  }

  /** Ask for confirmation before deleting (arms the inline confirm on this row). */
  protected askRemove(id: string, event: Event): void {
    event.stopPropagation();
    this.confirmRemoveId.set(id);
  }

  /** Dismiss the delete confirmation, keeping the address. */
  protected cancelRemove(event: Event): void {
    event.stopPropagation();
    this.confirmRemoveId.set(null);
  }

  protected removeAddr(id: string, event: Event): void {
    event.stopPropagation();
    this.removingId.set(id);
    this.pickup.remove(id).subscribe({
      next: () => {
        this.removingId.set(null);
        this.confirmRemoveId.set(null);
        this.toast.show('fa-solid fa-circle-check', 'Address removed');
      },
      error: (err: Error) => {
        this.removingId.set(null);
        this.confirmRemoveId.set(null);
        this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not remove the address');
      },
    });
  }

  private isDefaultOf(id: string): boolean {
    return this.pickup.addresses().find((a) => a.id === id)?.isDefault ?? false;
  }

  /** Message for an invalid address-form control, derived from its Angular error state. */
  private addrControlError(name: string): string {
    const control = this.addrForm.get(name);
    if (!control || control.valid) {
      return '';
    }
    switch (name) {
      case 'label':
        return control.hasError('required') ? 'A label is required' : 'Label must be 100 characters or fewer';
      case 'address':
        return control.hasError('required') ? 'The address is required' : 'Address must be 500 characters or fewer';
      case 'pincode':
        return 'Pincode must be up to 6 digits';
      default:
        return 'This field is required';
    }
  }

  private refreshAddrErrors(): void {
    const next: Record<string, string> = {};
    for (const name of ADDR_FIELDS) {
      const message = this.addrControlError(name);
      if (message) {
        next[name] = message;
      }
    }
    this.addrErrors.set(next);
  }

  private firstAddrError(): string {
    for (const name of ADDR_FIELDS) {
      const message = this.addrControlError(name);
      if (message) {
        return message;
      }
    }
    return '';
  }

  private resetAddForm(): void {
    this.editingId.set(null);
    this.addLocation.set(null);
    this.addrValidated = false;
    this.addrErrors.set({});
    this.addrForm.reset({ label: '', address: '', city: '', pincode: '' });
  }

  private applyProfile(p: UserProfile): void {
    this.profile.set(p);
    this.availability.hydrate(p.isAvailable);
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
