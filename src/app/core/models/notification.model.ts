/** Notification — GET /api/notifications (`NotificationResponse`). */
export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  payloadJson: string | null;
  isRead: boolean;
  createdAtUtc: string;
}
