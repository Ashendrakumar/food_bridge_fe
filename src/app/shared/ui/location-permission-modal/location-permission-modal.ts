import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AvailabilityService } from '@core/services/availability.service';
import { FbButton } from '@shared/ui/button/button';

/**
 * Global dialog raised by {@link AvailabilityService} when a user tries to go active but
 * the browser has blocked location access. Explains why location is needed and how to
 * re-enable it, then lets the user retry. Mounted once in the app shell.
 */
@Component({
  selector: 'app-location-permission-modal',
  imports: [FbButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (availability.permissionModalOpen()) {
      <div class="lpm-backdrop" (click)="availability.closeModal()">
        <div class="lpm-card" role="dialog" aria-modal="true" aria-labelledby="lpm-title" (click)="$event.stopPropagation()">
          <div class="lpm-icon"><i class="fa-solid fa-location-crosshairs"></i></div>
          <h3 class="lpm-title" id="lpm-title">Turn on location to go active</h3>
          <p class="lpm-text">
            We use your current location to match you with the closest donations. Your browser has
            location access blocked — enable it, then try again.
          </p>
          <ol class="lpm-steps">
            <li>Open the site permissions from the <i class="fa-solid fa-lock"></i> icon in your browser's address bar.</li>
            <li>Set <strong>Location</strong> to <strong>Allow</strong>.</li>
            <li>Come back and press <strong>Try again</strong>.</li>
          </ol>
          <div class="lpm-actions">
            <app-button variant="ghost" (clicked)="availability.closeModal()">Not now</app-button>
            <app-button icon="fa-solid fa-rotate-right" [loading]="availability.busy()" (clicked)="availability.retryFromModal()">
              Try again
            </app-button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .lpm-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(0, 0, 0, 0.5);
      animation: lpm-fade 0.15s ease;
    }
    .lpm-card {
      width: 100%;
      max-width: 420px;
      background: var(--fb-surface, #fff);
      color: var(--fb-text);
      border: 1px solid var(--fb-line);
      border-radius: 18px;
      padding: 26px 24px 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
      animation: lpm-pop 0.15s ease;
    }
    .lpm-icon {
      width: 54px;
      height: 54px;
      margin: 0 auto 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 22px;
      color: var(--fb-primary-deep);
      background: var(--fb-primary-soft);
    }
    .lpm-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .lpm-text {
      font-size: 14px;
      color: var(--fb-muted);
      margin-bottom: 14px;
    }
    .lpm-steps {
      text-align: left;
      font-size: 13px;
      color: var(--fb-text);
      background: var(--fb-bg);
      border: 1px solid var(--fb-line);
      border-radius: 12px;
      padding: 12px 14px 12px 30px;
      margin-bottom: 18px;
      list-style: decimal;
      display: grid;
      gap: 6px;
    }
    .lpm-steps i {
      color: var(--fb-muted);
    }
    .lpm-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }
    @keyframes lpm-fade {
      from {
        opacity: 0;
      }
    }
    @keyframes lpm-pop {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }
    }
  `,
})
export class LocationPermissionModal {
  protected readonly availability = inject(AvailabilityService);
}
