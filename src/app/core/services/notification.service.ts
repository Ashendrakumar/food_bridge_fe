import { computed, Injectable, signal } from '@angular/core';

export interface AppNotification {
  icon: string;
  text: string;
  time: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly notifications = signal<AppNotification[]>([
    {
      icon: 'fa-solid fa-circle-plus',
      text: 'New listing posted near you — 40 servings, MG Road',
      time: '5 min ago',
    },
    { icon: 'fa-solid fa-truck', text: 'Priya Sharma claimed your listing', time: '22 min ago' },
    {
      icon: 'fa-solid fa-award',
      text: 'Certificate generated for Green Leaf Bakery',
      time: '1 hr ago',
    },
  ]);

  readonly count = computed(() => this.notifications().length);

  push(icon: string, text: string): void {
    this.notifications.update((list) => [{ icon, text, time: 'just now' }, ...list]);
  }
}
