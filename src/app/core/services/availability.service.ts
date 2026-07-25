import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { ToastService } from './toast.service';

/**
 * Online/availability state for Volunteers ("Available") and
 * Recipients ("Accepting"). Other roles don't use it.
 */
@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly notifications = inject(NotificationService);

  readonly isActive = signal(true);

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

  toggle(): void {
    this.isActive.update((active) => !active);
    const role = this.auth.currentUser()?.role;

    if (!this.isActive()) {
      this.toast.show('fa-solid fa-moon', "You're now offline — you won't be matched");
      return;
    }

    this.toast.show(
      'fa-solid fa-circle-check',
      role === 'volunteer'
        ? "You're now available for pickups"
        : "You're now accepting deliveries",
    );
    if (role === 'recipient') {
      this.notifications.push(
        'fa-solid fa-box-open',
        "You're active — new surplus food is available near you to accept",
      );
    }
  }
}
