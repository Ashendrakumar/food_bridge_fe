import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { APP_ROUTES } from '@core/config/app-routes';
import { AuthService } from '@core/services/auth.service';
import { PickupAddressService } from '@core/services/pickup-address.service';
import { RoleBadge } from '@shared/ui/role-badge/role-badge';
import { Avatar } from '@shared/ui/avatar/avatar';
import { AvailabilityService } from '@core/services/availability.service';
import { LayoutService } from '@core/services/layout.service';
import { NotificationService } from '@core/services/notification.service';
import { ThemeService } from '@core/services/theme.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-topbar',
  imports: [RoleBadge, Avatar, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './topbar.html',
  styles: `
    .topbar {
      background: var(--fb-surface);
      border-bottom: 1px solid var(--fb-line);
      padding: 14px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      position: sticky;
      top: 0;
      z-index: 1020;
      flex-wrap: wrap;
    }
    .search-box {
      position: relative;
      max-width: 340px;
      width: 100%;
    }
    .avatar-btn {
      border: 0;
      background: transparent;
      padding: 0;
      cursor: pointer;
      border-radius: 50%;
      display: inline-flex;
    }
    .addr-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 42px;
      padding: 0 14px;
      border-radius: 999px;
      border: 1px solid var(--fb-line);
      background: var(--fb-surface);
      color: var(--fb-ink);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      max-width: 260px;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .addr-btn:hover {
      border-color: var(--fb-primary);
      background: var(--fb-primary-soft);
    }
    .dropdown-panel.left-0 {
      right: auto;
      left: 0;
    }
    .addr-item {
      display: flex;
      align-items: center;
      padding: 8px 10px;
      border-radius: 10px;
      cursor: pointer;
    }
    .addr-item:hover {
      background: var(--fb-primary-soft);
    }
    .addr-item.sel {
      background: var(--fb-primary-soft);
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
    .addr-input {
      flex: 1;
      min-width: 0;
      border-radius: 10px;
      border: 1px solid var(--fb-line);
      padding: 8px 12px;
      font-size: 13px;
      background: var(--fb-bg);
      color: var(--fb-ink);
      outline: none;
    }
    .addr-input:focus {
      border-color: var(--fb-primary);
    }
    .search-box input {
      border-radius: 12px;
      border: 1px solid var(--fb-line);
      padding: 10px 14px 10px 38px;
      width: 100%;
      background: var(--fb-bg);
      color: var(--fb-ink);
    }
    .search-box i {
      position: absolute;
      left: 13px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--fb-muted);
    }
    .notif-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      background: var(--fb-orange);
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      width: 17px;
      height: 17px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .active-toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 42px;
      padding: 0 14px;
      border-radius: 999px;
      border: 1px solid var(--fb-line);
      background: var(--fb-surface);
      font-size: 13px;
      font-weight: 600;
      color: var(--fb-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .active-toggle .dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--fb-muted);
    }
    .active-toggle.is-on {
      border-color: var(--fb-success);
      color: var(--fb-success-deep);
      background: var(--fb-success-soft);
    }
    .active-toggle.is-on .dot {
      background: var(--fb-success);
      box-shadow: 0 0 0 4px rgba(30, 158, 92, 0.18);
    }
    .dropdown-panel {
      position: absolute;
      right: 0;
      top: 52px;
      z-index: 1040;
      background: var(--fb-surface);
      border: 1px solid var(--fb-line);
      border-radius: 16px;
      box-shadow: var(--fb-shadow-lg);
      padding: 8px;
    }
    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 14px;
      color: inherit;
    }
    .dropdown-item:hover {
      background: var(--fb-primary-soft);
      color: var(--fb-primary-deep);
    }
    .notif-item {
      display: flex;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
    }
    .notif-item:hover {
      background: var(--fb-primary-soft);
    }
    .notif-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--fb-orange);
      flex-shrink: 0;
      margin-top: 6px;
    }
    .menu-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1035;
    }
  `,
})
export class Topbar {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly theme = inject(ThemeService);
  protected readonly layout = inject(LayoutService);
  protected readonly notifications = inject(NotificationService);
  protected readonly availability = inject(AvailabilityService);
  protected readonly pickup = inject(PickupAddressService);

  protected readonly notifOpen = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly addrOpen = signal(false);
  protected readonly addingAddr = signal(false);
  protected readonly isDonor = computed(() => this.auth.currentUser()?.role === 'donor');

  protected readonly userName = computed(() => this.auth.currentUser()?.name ?? '');
  protected readonly avatarUrl = computed(() => this.auth.currentUser()?.avatarUrl ?? null);
  protected readonly role = computed(() => this.auth.currentUser()?.role ?? null);

  protected toggleNotif(): void {
    this.menuOpen.set(false);
    this.addrOpen.set(false);
    this.notifOpen.update((open) => !open);
  }

  protected toggleMenu(): void {
    this.notifOpen.set(false);
    this.addrOpen.set(false);
    this.menuOpen.update((open) => !open);
  }

  protected toggleAddr(): void {
    this.notifOpen.set(false);
    this.menuOpen.set(false);
    this.addrOpen.update((open) => !open);
  }

  protected selectAddr(id: string): void {
    this.pickup.select(id);
    this.addrOpen.set(false);
  }

  protected removeAddr(id: string, event: Event): void {
    event.stopPropagation();
    this.pickup.remove(id);
  }

  protected addAddr(input: HTMLInputElement): void {
    const label = input.value.trim();
    if (!label || this.addingAddr()) {
      return;
    }
    this.addingAddr.set(true);
    this.pickup.add(label).subscribe({
      next: () => {
        this.addingAddr.set(false);
        input.value = '';
        this.toast.show('fa-solid fa-location-dot', 'Pickup address added');
      },
      error: (err: Error) => {
        this.addingAddr.set(false);
        this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not add that address');
      },
    });
  }

  protected closeMenus(): void {
    this.notifOpen.set(false);
    this.menuOpen.set(false);
    this.addrOpen.set(false);
  }

  protected go(view: string): void {
    this.closeMenus();
    this.router.navigate([APP_ROUTES.app, view]);
  }

  protected helpSoon(): void {
    this.closeMenus();
    this.toast.show('fa-solid fa-circle-info', 'Help center coming soon');
  }

  protected logout(): void {
    this.closeMenus();
    this.auth.logout();
    this.router.navigate([APP_ROUTES.login]);
  }
}
