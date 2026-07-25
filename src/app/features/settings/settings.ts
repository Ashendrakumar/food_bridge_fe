import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from '@core/services/theme.service';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="page-title mb-4">Settings</h3>
    <div class="card-fb p-5 max-w-xl divide-y divide-line">
      <div class="flex justify-between items-center py-3 first:pt-0">
        <div>
          <div class="text-sm font-semibold">Dark Mode</div>
          <div class="text-muted text-xs">Switch between light and dark theme</div>
        </div>
        <button class="fb-switch" [class.on]="theme.darkMode()" (click)="theme.toggle()" role="switch" [attr.aria-checked]="theme.darkMode()">
          <span class="knob"></span>
        </button>
      </div>
      <div class="flex justify-between items-center py-3">
        <div>
          <div class="text-sm font-semibold">Push Notifications</div>
          <div class="text-muted text-xs">New listings, claims, confirmations</div>
        </div>
        <button class="fb-switch on" (click)="noop()" role="switch" aria-checked="true"><span class="knob"></span></button>
      </div>
      <div class="flex justify-between items-center py-3 last:pb-0">
        <div>
          <div class="text-sm font-semibold">Email Updates</div>
          <div class="text-muted text-xs">Weekly summary of your activity</div>
        </div>
        <button class="fb-switch" (click)="noop()" role="switch" aria-checked="false"><span class="knob"></span></button>
      </div>
    </div>
  `,
  styles: `
    .fb-switch {
      width: 44px;
      height: 24px;
      border-radius: 999px;
      background: var(--fb-line);
      border: 0;
      position: relative;
      cursor: pointer;
      transition: background 0.2s ease;
      flex-shrink: 0;
    }
    .fb-switch.on {
      background: var(--fb-primary);
    }
    .fb-switch .knob {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #fff;
      transition: transform 0.2s ease;
    }
    .fb-switch.on .knob {
      transform: translateX(20px);
    }
  `,
})
export class Settings {
  protected readonly theme = inject(ThemeService);

  protected noop(el?: EventTarget): void {
    // Demo toggles (push/email) — persistence hook goes here.
    void el;
  }
}
