import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Notification } from '@core/models/notification.model';
import { AuthService } from './auth.service';
import { NotificationApiService } from './notification-api.service';

/**
 * In-app notification state for the topbar bell. Hydrates from the REST API
 * (`GET /api/notifications`) whenever a user is signed in; `push` adds a local
 * client-side event (e.g. an optimistic toast mirror). Live SignalR push is a
 * follow-up — this is the REST-backed baseline.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly api = inject(NotificationApiService);
  private readonly auth = inject(AuthService);

  readonly notifications = signal<Notification[]>([]);
  readonly unreadCount = computed(() => this.notifications().filter((n) => !n.isRead).length);
  /** Back-compat alias used by the topbar badge. */
  readonly count = this.unreadCount;

  constructor() {
    // (Re)load whenever the signed-in user changes.
    effect(() => {
      if (this.auth.currentUser()) {
        this.load();
      } else {
        this.notifications.set([]);
      }
    });
  }

  load(): void {
    this.api.list().subscribe({
      next: (rows) => this.notifications.set(rows),
      error: () => undefined,
    });
  }

  markRead(id: string): void {
    if (id.startsWith('local-')) {
      this.notifications.update((list) => list.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      return;
    }
    this.api.markRead(id).subscribe({
      next: () =>
        this.notifications.update((list) => list.map((n) => (n.id === id ? { ...n, isRead: true } : n))),
      error: () => undefined,
    });
  }

  /** Add a local client-side notification (used by optimistic in-app events). */
  push(_icon: string, text: string): void {
    this.notifications.update((list) => [
      {
        id: `local-${list.length}-${text.length}`,
        type: 'Local',
        title: text,
        body: '',
        payloadJson: null,
        isRead: false,
        createdAtUtc: new Date().toISOString(),
      },
      ...list,
    ]);
  }
}
