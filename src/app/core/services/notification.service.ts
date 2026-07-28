import { computed, effect, inject, Injectable, signal } from '@angular/core';
import {
  Notification,
  NOTIFICATION_FILTERS,
  NotificationFilter,
  matchesNotificationFilter,
} from '@core/models/notification.model';
import { AuthService } from './auth.service';
import { NotificationApiService } from './notification-api.service';

/** Rows fetched per request — also the "is there another page?" probe size. */
const PAGE_SIZE = 20;

/** A locally pushed notification has no server row to PATCH. */
const LOCAL_ID_PREFIX = 'local-';

/**
 * In-app notification state, shared by the topbar bell and the notifications
 * inbox page. Hydrates from the REST API (`GET /api/notifications`) whenever a
 * user is signed in; `push` adds a local client-side event (e.g. an optimistic
 * toast mirror). Live SignalR push is a follow-up — this is the REST-backed
 * baseline.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly api = inject(NotificationApiService);
  private readonly auth = inject(AuthService);

  /** Newest first — the ordering `latest` and the inbox both rely on. */
  readonly notifications = signal<Notification[]>([]);

  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  /** True while a mark-read request is in flight (bulk or single). */
  readonly marking = signal(false);
  /** False once a page comes back short — nothing left to page through. */
  readonly hasMore = signal(false);

  readonly unreadCount = computed(() => this.notifications().filter((n) => !n.isRead).length);
  /** Back-compat alias used by the topbar badge. */
  readonly count = this.unreadCount;

  /**
   * Row count per filter chip, keyed by filter id. Computed once here rather
   * than per chip so the filter row stays a dumb renderer.
   */
  readonly filterCounts = computed<Record<NotificationFilter, number>>(() => {
    const list = this.notifications();
    const counts = {} as Record<NotificationFilter, number>;
    for (const { id } of NOTIFICATION_FILTERS) {
      counts[id] = list.filter((n) => matchesNotificationFilter(n, id)).length;
    }
    return counts;
  });

  /** Page most recently fetched — `loadMore` asks for the next one. */
  private page = 1;

  constructor() {
    // (Re)load whenever the signed-in user changes.
    effect(() => {
      if (this.auth.currentUser()) {
        this.load();
      } else {
        this.reset();
      }
    });
  }

  /** Fetch the first page, replacing whatever is held. */
  load(): void {
    this.loading.set(true);
    this.page = 1;
    this.api.list(undefined, 1, PAGE_SIZE).subscribe({
      next: (rows) => {
        this.notifications.set(sortByNewest(rows));
        this.hasMore.set(rows.length === PAGE_SIZE);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /**
   * Append the next page (inbox infinite scroll). The paged envelope's total
   * count is dropped by the API interceptor, so a short page is what tells us
   * we've reached the end.
   */
  loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) {
      return;
    }

    const next = this.page + 1;
    this.loadingMore.set(true);
    this.api.list(undefined, next, PAGE_SIZE).subscribe({
      next: (rows) => {
        this.page = next;
        // Locally pushed rows shift the server's offsets, so a page can repeat
        // a row we already hold — merge on id rather than blindly appending.
        this.notifications.update((list) => mergeById(list, rows));
        this.hasMore.set(rows.length === PAGE_SIZE);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }

  markRead(id: string): void {
    if (isLocal(id)) {
      this.applyRead([id]);
      return;
    }
    this.api.markRead(id).subscribe({
      next: () => this.applyRead([id]),
      error: () => undefined,
    });
  }

  /** Mark every currently held unread notification read. */
  markAllRead(): void {
    const unread = this.notifications().filter((n) => !n.isRead);
    if (!unread.length || this.marking()) {
      return;
    }

    const ids = unread.map((n) => n.id);
    const remoteIds = ids.filter((id) => !isLocal(id));
    if (!remoteIds.length) {
      this.applyRead(ids);
      return;
    }

    this.marking.set(true);
    this.api.markManyRead(remoteIds).subscribe({
      next: () => {
        this.applyRead(ids);
        this.marking.set(false);
      },
      error: () => this.marking.set(false),
    });
  }

  /** Add a local client-side notification (used by optimistic in-app events). */
  push(_icon: string, text: string): void {
    this.notifications.update((list) => [
      {
        id: `${LOCAL_ID_PREFIX}${list.length}-${text.length}`,
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

  private applyRead(ids: readonly string[]): void {
    const marked = new Set(ids);
    this.notifications.update((list) =>
      list.map((n) => (marked.has(n.id) ? { ...n, isRead: true } : n)),
    );
  }

  private reset(): void {
    this.notifications.set([]);
    this.hasMore.set(false);
    this.page = 1;
  }
}

function isLocal(id: string): boolean {
  return id.startsWith(LOCAL_ID_PREFIX);
}

function sortByNewest(rows: readonly Notification[]): Notification[] {
  return [...rows].sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc));
}

/** Existing rows win, so an already-read local update isn't clobbered by a refetch. */
function mergeById(
  existing: readonly Notification[],
  incoming: readonly Notification[],
): Notification[] {
  const seen = new Set(existing.map((n) => n.id));
  return sortByNewest([...existing, ...incoming.filter((n) => !seen.has(n.id))]);
}
