export interface Notification {
  id: number | string;
  userId: number | string;
  icon: string;
  text: string;
  time: string;
  read: boolean;
}
