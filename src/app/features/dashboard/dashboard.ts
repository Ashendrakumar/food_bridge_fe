import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ListingStore } from '@core/services/listing-store.service';
import { Role } from '@core/models/user.model';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { StatusBadge } from '@shared/ui/status-badge/status-badge';

interface Stat {
  icon: string;
  color: string;
  value: string;
  label: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, StatusBadge, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly auth = inject(AuthService);
  protected readonly store = inject(ListingStore);

  protected readonly user = this.auth.currentUser;
  protected readonly role = computed<Role>(() => this.user()?.role ?? 'donor');

  protected readonly greeting = computed(() => {
    const user = this.user();
    if (!user) {
      return 'Welcome';
    }
    const first = user.name.split(' ')[0];
    switch (user.role) {
      case 'donor':
        return `Good day, ${first} 👋`;
      case 'volunteer':
        return `Hey, ${first} 🚴`;
      case 'recipient':
        return `Welcome, ${user.name} ❤️`;
      default:
        return 'Admin Dashboard';
    }
  });

  protected readonly subtitle = computed(() => {
    switch (this.role()) {
      case 'donor':
        return "Here's your impact so far.";
      case 'volunteer':
        return 'Thanks for keeping food moving.';
      case 'recipient':
        return "Here's what's coming your way today.";
      default:
        return 'Platform-wide oversight at a glance.';
    }
  });

  protected readonly stats = computed<Stat[]>(() => STATS[this.role()]);
  protected readonly donorRecent = computed(() => this.store.mine().slice(0, 5));
  protected readonly openNearby = computed(() => this.store.openListings().slice(0, 4));
  protected readonly incoming = computed(() => this.store.incoming().slice(0, 4));
}

const STATS: Record<Role, Stat[]> = {
  donor: [
    { icon: 'fa-solid fa-bowl-food', color: 'var(--fb-primary)', value: '165', label: 'Meals Donated' },
    { icon: 'fa-solid fa-calendar-day', color: 'var(--fb-orange)', value: '40', label: "Today's Donation" },
    { icon: 'fa-solid fa-boxes-stacked', color: '#2258c7', value: '12', label: 'Total Donations' },
    { icon: 'fa-solid fa-award', color: '#9a6b00', value: '8', label: 'Certificates' },
  ],
  volunteer: [
    { icon: 'fa-solid fa-truck', color: 'var(--fb-primary)', value: '18', label: 'Total Deliveries' },
    { icon: 'fa-solid fa-star', color: 'var(--fb-orange)', value: '540', label: 'Points' },
    { icon: 'fa-solid fa-ranking-star', color: '#2258c7', value: '#3', label: 'Leaderboard Rank' },
    { icon: 'fa-solid fa-bowl-food', color: '#9a6b00', value: '890', label: 'Meals Helped' },
  ],
  recipient: [
    { icon: 'fa-solid fa-bowl-food', color: 'var(--fb-primary)', value: '180', label: "Today's Meals" },
    { icon: 'fa-solid fa-truck', color: 'var(--fb-orange)', value: '3', label: 'Upcoming Deliveries' },
    { icon: 'fa-solid fa-hourglass-half', color: '#2258c7', value: '1', label: 'Pending Deliveries' },
    { icon: 'fa-solid fa-warehouse', color: '#9a6b00', value: '72%', label: 'Storage Capacity' },
  ],
  admin: [
    { icon: 'fa-solid fa-list-check', color: 'var(--fb-primary)', value: '6', label: 'Total Listings' },
    { icon: 'fa-solid fa-user-shield', color: 'var(--fb-orange)', value: '2', label: 'Pending Verifications' },
    { icon: 'fa-solid fa-triangle-exclamation', color: '#c7442a', value: '3', label: 'Open Disputes' },
    { icon: 'fa-solid fa-bowl-food', color: 'var(--fb-success)', value: '1,240', label: 'Meals Rescued' },
  ],
};
