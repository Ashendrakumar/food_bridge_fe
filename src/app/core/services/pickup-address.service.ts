import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { map, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { TrackingService } from './tracking.service';
import { UserService } from './user.service';

export interface PickupAddress {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
}

const KEY = 'foodbridge.pickupAddresses';
const SEL_KEY = 'foodbridge.pickupAddressId';

/**
 * The donor's set of pickup addresses (shown in the topbar dropdown, used by
 * Create Listing). Seeded from the profile address; extra addresses are geocoded
 * via the backend `/geocode` and persisted locally.
 */
@Injectable({ providedIn: 'root' })
export class PickupAddressService {
  private readonly storage = inject(StorageService);
  private readonly users = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly tracking = inject(TrackingService);

  readonly addresses = signal<PickupAddress[]>(this.storage.getItem<PickupAddress[]>(KEY) ?? []);
  readonly selectedId = signal<string | null>(this.storage.getItem<string>(SEL_KEY));

  readonly selected = computed<PickupAddress | null>(
    () => this.addresses().find((a) => a.id === this.selectedId()) ?? this.addresses()[0] ?? null,
  );

  constructor() {
    effect(() => this.storage.setItem(KEY, this.addresses()));
    effect(() => this.storage.setItem(SEL_KEY, this.selectedId()));
    this.seedFromProfile();
  }

  select(id: string): void {
    this.selectedId.set(id);
  }

  remove(id: string): void {
    this.addresses.update((list) => list.filter((a) => a.id !== id));
    if (this.selectedId() === id) {
      this.selectedId.set(this.addresses()[0]?.id ?? null);
    }
  }

  /** Add an address with known coordinates (from the map picker / GPS) and select it. */
  addWithCoords(label: string, latitude: number, longitude: number): PickupAddress {
    const addr: PickupAddress = {
      id: `addr-${Date.now()}`,
      label: label.trim(),
      latitude,
      longitude,
    };
    this.addresses.update((list) => [...list, addr]);
    this.selectedId.set(addr.id);
    return addr;
  }

  /** Geocode a free-form address and add + select it. */
  add(label: string): Observable<PickupAddress> {
    return this.tracking.geocode(label).pipe(
      map((g) => {
        const addr: PickupAddress = {
          id: `addr-${this.addresses().length}-${label.length}-${Math.floor(g.latitude * 1000)}`,
          label: label.trim(),
          latitude: g.latitude,
          longitude: g.longitude,
        };
        this.addresses.update((list) => [...list, addr]);
        this.selectedId.set(addr.id);
        return addr;
      }),
    );
  }

  /** On first use, seed the list with the donor's saved profile address. */
  private seedFromProfile(): void {
    const id = this.auth.currentUser()?.id;
    if (!id || this.addresses().length) {
      return;
    }
    this.users.getProfile(id).subscribe({
      next: (p) => {
        if (p.address && p.latitude != null && p.longitude != null && !this.addresses().length) {
          const addr: PickupAddress = {
            id: 'profile',
            label: p.address,
            latitude: p.latitude,
            longitude: p.longitude,
          };
          this.addresses.set([addr]);
          this.selectedId.set('profile');
        }
      },
      error: () => undefined,
    });
  }
}
