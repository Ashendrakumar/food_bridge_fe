import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutService } from '@core/services/layout.service';
import { LocationPermissionModal } from '@shared/ui/location-permission-modal/location-permission-modal';
import { Sidebar } from './sidebar/sidebar';
import { Topbar } from './topbar/topbar';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Sidebar, Topbar, LocationPermissionModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.html',
  styles: `
    .fb-shell {
      display: flex;
      min-height: 100dvh;
    }
    .fb-main {
      margin-left: 260px;
      flex: 1;
      min-width: 0;
      transition: margin-left 0.2s ease;
    }
    @media (min-width: 1024px) {
      .fb-main.collapsed {
        margin-left: 76px;
      }
    }
    .fb-page-body {
      padding: 18px 16px 48px;
    }
    @media (min-width: 768px) {
      .fb-page-body {
        padding: 26px 28px 60px;
      }
    }
    .fb-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 1029;
    }
    @media (max-width: 1023px) {
      .fb-main {
        margin-left: 0;
      }
    }
  `,
})
export class Shell {
  protected readonly layout = inject(LayoutService);
}
