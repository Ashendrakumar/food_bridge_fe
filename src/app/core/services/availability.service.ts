import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { switchMap } from 'rxjs';
import { UpdateProfileBody } from '@core/models/user.model';
import { FbLatLng } from '@shared/ui/map/fb-map.model';
import { AuthService } from './auth.service';
import { GeolocationError, GeolocationService } from './geolocation.service';
import { NotificationService } from './notification.service';
import { ToastService } from './toast.service';
import { UserService } from './user.service';

/**
 * Online/availability state for Volunteers ("Available") and Recipients ("Accepting").
 * Single source of truth shared by the topbar pill and the Profile toggle.
 *
 * Going active is location-gated: we capture the device's current position, sync it to
 * the user's profile (so donors/recipients are matched to where they actually are), then
 * flip availability on the backend. If location permission is blocked, `permissionModalOpen`
 * is raised so the UI can guide the user to enable it.
 */
@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private readonly auth = inject(AuthService);
  private readonly users = inject(UserService);
  private readonly geo = inject(GeolocationService);
  private readonly toast = inject(ToastService);
  private readonly notifications = inject(NotificationService);

  readonly isActive = signal(false);
  /** True while locating / syncing / calling the backend. */
  readonly busy = signal(false);
  /** Raised when the user tries to go active but location permission is blocked. */
  readonly permissionModalOpen = signal(false);

  private hydrated = false;

  readonly appliesToCurrentUser = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role === 'volunteer' || role === 'recipient';
  });

  readonly label = computed(() => {
    if (!this.isActive()) {
      return 'Offline';
    }
    return this.auth.currentUser()?.role === 'volunteer' ? 'Available' : 'Accepting';
  });

  constructor() {
    // Reflect the real backend state once a volunteer/recipient is signed in.
    effect(() => {
      const user = this.auth.currentUser();
      if (user?.id && this.appliesToCurrentUser() && !this.hydrated) {
        this.hydrated = true;
        this.users.getProfile(user.id).subscribe({
          next: (p) => this.isActive.set(p.isAvailable),
          error: () => undefined,
        });
      }
    });
  }

  /** Sync the toggle state from a freshly-loaded profile, without side effects. */
  hydrate(isAvailable: boolean): void {
    this.hydrated = true;
    this.isActive.set(isAvailable);
  }

  toggle(): void {
    if (this.busy()) {
      return;
    }
    if (this.isActive()) {
      this.deactivate();
    } else {
      this.activate();
    }
  }

  /**
   * Go active: capture live GPS → sync location → enable on the backend.
   *
   * The modal is shown ONLY when location permission is actually blocked. If permission is
   * granted (or merely unprompted) but the device simply can't produce a fix right now
   * (Windows location off, no GPS, timeout), we don't nag — we go active with the user's
   * saved location so they aren't stuck.
   */
  activate(): void {
    const id = this.auth.currentUser()?.id;
    if (!id) {
      return;
    }
    this.busy.set(true);
    this.geo.permissionStatus().then((status) => {
      if (status?.state === 'denied') {
        this.busy.set(false);
        this.openPermissionModal();
        return;
      }
      this.geo.current().subscribe({
        next: (loc) => this.syncThenEnable(id, loc),
        error: (err: unknown) => {
          if (err instanceof GeolocationError && err.denied) {
            // Permission was blocked (e.g. denied at the prompt) → guide to enable it.
            this.busy.set(false);
            this.openPermissionModal();
          } else {
            // Permission is fine; the device just couldn't get a fix → activate anyway.
            const reason = err instanceof Error ? err.message : 'Could not read your location';
            this.enableWithoutLocation(id, `${reason} — activated with your saved location.`);
          }
        },
      });
    });
  }

  private openPermissionModal(): void {
    this.permissionModalOpen.set(true);
    // Auto-retry the moment the user grants permission from the browser UI.
    this.geo.permissionStatus().then((status) => {
      if (!status) {
        return;
      }
      const onChange = () => {
        if (status.state === 'granted' && this.permissionModalOpen()) {
          status.removeEventListener('change', onChange);
          this.retryFromModal();
        } else if (status.state !== 'prompt') {
          status.removeEventListener('change', onChange);
        }
      };
      status.addEventListener('change', onChange);
    });
  }

  deactivate(): void {
    const id = this.auth.currentUser()?.id;
    if (!id) {
      return;
    }
    this.busy.set(true);
    this.users.setAvailability(id, false).subscribe({
      next: (p) => {
        this.isActive.set(p.isAvailable);
        this.busy.set(false);
        this.toast.show('fa-solid fa-moon', "You're now offline — you won't be matched");
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not update availability');
      },
    });
  }

  /** Retry from the permission modal after the user enables location. */
  retryFromModal(): void {
    this.permissionModalOpen.set(false);
    this.activate();
  }

  closeModal(): void {
    this.permissionModalOpen.set(false);
  }

  private syncThenEnable(id: string, loc: FbLatLng): void {
    this.users
      .getProfile(id)
      .pipe(
        switchMap((p) => {
          const body: UpdateProfileBody = {
            name: p.name,
            city: p.city,
            address: p.address,
            latitude: loc.lat,
            longitude: loc.lng,
            capacityMeals: p.capacityMeals,
          };
          return this.users.updateProfile(id, body);
        }),
        switchMap(() => this.users.setAvailability(id, true)),
      )
      .subscribe({
        next: (p) => {
          const role = this.auth.currentUser()?.role;
          this.onActivated(
            p.isAvailable,
            'fa-solid fa-circle-check',
            role === 'volunteer'
              ? "Location updated — you're now available for pickups"
              : "Location updated — you're now accepting deliveries",
          );
        },
        error: (err: Error) => {
          this.busy.set(false);
          this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not sync your location');
        },
      });
  }

  /** Enable availability without a fresh location fix (permission is fine; device couldn't locate). */
  private enableWithoutLocation(id: string, note: string): void {
    this.users.setAvailability(id, true).subscribe({
      next: (p) => this.onActivated(p.isAvailable, 'fa-solid fa-location-dot', note),
      error: (err: Error) => {
        this.busy.set(false);
        this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not update availability');
      },
    });
  }

  private onActivated(isAvailable: boolean, icon: string, message: string): void {
    this.isActive.set(isAvailable);
    this.busy.set(false);
    this.toast.show(icon, message);
    if (isAvailable && this.auth.currentUser()?.role === 'recipient') {
      this.notifications.push(
        'fa-solid fa-box-open',
        "You're active — new surplus food is available near you to accept",
      );
    }
  }
}
