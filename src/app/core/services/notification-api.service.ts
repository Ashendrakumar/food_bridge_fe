import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { API_ENDPOINTS } from '@core/config/api-endpoints';
import { ApiService } from '@core/http/api.service';
import { Notification } from '@core/models/notification.model';
import { socket$ } from '@core/http/socket';

/**
 * HTTP + WebSocket calls for the notifications module. The in-app toast/bell
 * UI state lives in {@link NotificationService}; this is the transport layer.
 */
@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private readonly api = inject(ApiService);

  /** Fetch a user's notification list. */
  list(userId: string | number): Observable<Notification[]> {
    return this.api.get<Notification[]>(API_ENDPOINTS.notifications.base, { user_id: userId });
  }

  /** Mark a single notification as read. */
  markRead(id: string | number): Observable<Notification> {
    return this.api.patch<Notification>(API_ENDPOINTS.notifications.read(id));
  }

  /** Push new notifications live (WS /ws/notifications/:userId). */
  live(userId: string | number): Observable<Notification> {
    return socket$<Notification>(environment.apiUrl, API_ENDPOINTS.notifications.ws(userId));
  }
}
