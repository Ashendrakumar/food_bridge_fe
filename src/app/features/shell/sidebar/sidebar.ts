import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { APP_ROUTES } from '@core/config/app-routes';
import { viewsForRole } from '@core/config/routes.config';
import { AuthService } from '@core/services/auth.service';
import { LayoutService } from '@core/services/layout.service';
import { FbLogo } from '@shared/ui/logo/logo';
import { RoleBadge } from '@shared/ui/role-badge/role-badge';
import { Avatar } from '@shared/ui/avatar/avatar';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, FbLogo, RoleBadge, Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.html',
  styles: `
    .sidebar {
      width: 260px;
      background: var(--fb-surface);
      border-right: 1px solid var(--fb-line);
      padding: 22px 16px 6px;
      position: fixed;
      top: 0;
      left: 0;
      height: 100dvh;
      z-index: 1030;
      display: flex;
      flex-direction: column;
      transition:
        transform 0.25s ease,
        width 0.2s ease,
        padding 0.2s ease;
    }
    .nav-scroll {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      margin: 0 -4px;
      padding: 0 4px;
    }
    .nav-fb a {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 14px;
      border-radius: 12px;
      color: var(--fb-muted);
      text-decoration: none;
      font-weight: 500;
      font-size: 14.5px;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
      overflow: hidden;
    }
    .nav-fb a i {
      width: 20px;
      text-align: center;
      flex-shrink: 0;
    }
    .nav-fb a:hover {
      background: var(--fb-primary-soft);
      color: var(--fb-primary-deep);
    }
    .nav-fb a.active {
      background: linear-gradient(135deg, var(--fb-primary), var(--fb-primary-deep));
      color: #fff;
      box-shadow: 0 6px 16px var(--fb-glow-primary-deep);
    }

    /* User footer + popover */
    .side-user {
      position: relative;
      padding-top: 6px;
      border-top: 1px solid var(--fb-line);
      flex-shrink: 0;
    }
    .side-user-btn {
      display: flex;
      align-items: center;
      gap: 11px;
      width: 100%;
      padding: 9px 10px;
      border-radius: 14px;
      border: 1px solid transparent;
      background: transparent;
      cursor: pointer;
      text-align: left;
      color: inherit;
      transition: all 0.15s ease;
    }
    .side-user-btn:hover,
    .side-user-btn.is-open {
      background: var(--fb-primary-soft);
      border-color: var(--fb-primary);
    }
    .side-user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
      background: linear-gradient(135deg, var(--fb-accent), var(--fb-accent-deep));
      object-fit: cover;
    }
    .side-user-info {
      min-width: 0;
      flex: 1;
    }
    .side-user-name {
      font-weight: 600;
      font-size: 13.5px;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .side-user-role {
      color: var(--fb-muted);
      font-size: 11.5px;
    }
    .side-user-chev {
      color: var(--fb-muted);
      font-size: 12px;
      flex-shrink: 0;
      transition: transform 0.15s ease;
    }
    .side-user-btn.is-open .side-user-chev {
      transform: rotate(180deg);
    }
    .user-popover {
      position: absolute;
      left: 0;
      right: 0;
      bottom: calc(100% + 6px);
      z-index: 1040;
      background: var(--fb-surface);
      border: 1px solid var(--fb-line);
      border-radius: 16px;
      box-shadow: var(--fb-shadow-lg);
      padding: 8px;
    }
    .popover-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 14px;
      color: inherit;
      white-space: nowrap;
    }
    .popover-item i {
      width: 18px;
      text-align: center;
    }
    .popover-item:hover {
      background: var(--fb-primary-soft);
      color: var(--fb-primary-deep);
    }
    .popover-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1039;
    }

    @media (max-width: 1023px) {
      .sidebar {
        transform: translateX(-100%);
      }
      .sidebar.show {
        transform: translateX(0);
      }
    }

    /* Collapsed icon-only rail — desktop only */
    @media (min-width: 1024px) {
      .sidebar.collapsed {
        width: 76px;
        padding: 22px 12px;
      }
      .sidebar.collapsed .brand-text,
      .sidebar.collapsed .nav-label,
      .sidebar.collapsed .side-user-info,
      .sidebar.collapsed .side-user-chev {
        display: none;
      }
      .sidebar.collapsed .brand,
      .sidebar.collapsed .nav-fb a,
      .sidebar.collapsed .side-user-btn {
        justify-content: center;
        gap: 0;
      }
      .sidebar.collapsed .nav-fb a {
        padding: 11px 0;
      }
      .sidebar.collapsed .user-popover {
        left: 0;
        right: auto;
        min-width: 190px;
      }
    }
  `,
})
export class Sidebar {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly layout = inject(LayoutService);
  protected readonly routes = APP_ROUTES;

  protected readonly userMenuOpen = signal(false);

  protected readonly navItems = computed(() => {
    const role = this.auth.currentUser()?.role;
    return role ? viewsForRole(role) : [];
  });

  protected readonly userName = computed(() => this.auth.currentUser()?.name ?? '');

  protected readonly role = computed(() => this.auth.currentUser()?.role ?? null);

  protected readonly avatarUrl = computed(() => this.auth.currentUser()?.avatarUrl ?? null);

  protected onNavigate(): void {
    this.userMenuOpen.set(false);
    this.layout.closeSidebar();
  }

  protected toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
  }

  protected goto(view: string): void {
    this.onNavigate();
    this.router.navigate([this.routes.app, view]);
  }

  protected logout(): void {
    this.userMenuOpen.set(false);
    this.layout.closeSidebar();
    this.auth.logout();
    this.router.navigate([this.routes.login]);
  }
}
