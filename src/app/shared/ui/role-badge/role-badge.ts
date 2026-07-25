import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Role } from '@core/models/user.model';

type RoleStyle = { label: string; icon: string; color: string; bg: string };

/** Distinct, good-looking pill per user role. Case-insensitive on the input. */
const ROLE_STYLES: Record<Role, RoleStyle> = {
  donor: { label: 'Donor', icon: 'fa-solid fa-utensils', color: '#b4551e', bg: 'rgba(216, 119, 87, 0.14)' },
  volunteer: { label: 'Volunteer', icon: 'fa-solid fa-truck-fast', color: '#2258c7', bg: '#e4eeff' },
  recipient: { label: 'Recipient', icon: 'fa-solid fa-hand-holding-heart', color: '#0f7a45', bg: '#ddf6e6' },
  admin: { label: 'Admin', icon: 'fa-solid fa-user-shield', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.13)' },
};

@Component({
  selector: 'app-role-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (style(); as s) {
      <span class="role-badge" [class]="size()" [style.color]="s.color" [style.background]="s.bg">
        @if (showIcon()) {
          <i [class]="s.icon" aria-hidden="true"></i>
        }
        <span>{{ s.label }}</span>
      </span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .role-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      line-height: 1;
      border-radius: 999px;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }
    .role-badge.sm {
      font-size: 10.5px;
      padding: 4px 9px;
    }
    .role-badge.md {
      font-size: 12px;
      padding: 6px 12px;
    }
    .role-badge.lg {
      font-size: 13px;
      padding: 8px 14px;
    }
    .role-badge i {
      font-size: 0.92em;
    }
  `,
})
export class RoleBadge {
  /** User role — accepts any casing (e.g. 'Donor' from the backend). */
  readonly role = input.required<string | Role | null | undefined>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly showIcon = input(true);

  protected readonly style = computed<RoleStyle | null>(() => {
    const key = (this.role() ?? '').toString().toLowerCase() as Role;
    return ROLE_STYLES[key] ?? null;
  });
}
