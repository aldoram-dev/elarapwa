export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationTargetType = 'all' | 'empresa' | 'users' | 'user' | 'roles' | 'role' | 'groups' | 'group';

export interface UserNotification {
  id: string;
  user_id: string;
  notification_id?: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  read: boolean;
  is_read?: boolean;
  is_dismissed?: boolean;
  dismissed_at?: string;
  read_at?: string;
  clicked_at?: string;
  action_url?: string;
  action_label?: string;
  icon?: string;
  metadata?: Record<string, any>;
  created_at: string;
  expires_at?: string;
  created_by?: string;
  target_type?: NotificationTargetType;
  target_empresa_id?: string;
  target_user_ids?: string[];
  target_roles?: string[];
  target_group_ids?: string[];
  user_notification_id?: string;
  is_new?: boolean;
}

export interface NotificationFilters {
  unreadOnly?: boolean;
  unread_only?: boolean;
  dismissed?: boolean;
  type?: NotificationType;
  priority?: NotificationPriority;
  search?: string;
  from_date?: string;
  to_date?: string;
  offset?: number;
  limit?: number;
}

export interface CreateNotificationInput {
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  action_url?: string;
  action_label?: string;
  icon?: string;
  metadata?: Record<string, any>;
  expires_at?: string;
  target_type: NotificationTargetType;
  target_empresa_id?: string;
  target_user_ids?: string[];
  target_roles?: string[];
  target_group_ids?: string[];
}

// Tipos adicionales para servicios
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  action_url?: string | null;
  icon?: string | null;
  created_at: string;
  created_by?: string | null;
  expires_at?: string | null;
  metadata?: Record<string, any>;
  target_type: NotificationTargetType;
  target_empresa_id?: string;
  target_user_ids?: string[] | null;
  target_roles?: string[] | null;
  target_group_ids?: string[] | null;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  by_type?: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}

export interface NotificationServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
  notification?: Notification;
}

export interface GetUserNotificationsResult {
  id: string;
  notification_id?: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  action_url?: string;
  icon?: string;
  created_by?: string;
  created_at: string;
  expires_at?: string;
  metadata?: Record<string, any>;
  target_type: NotificationTargetType;
  target_group_ids?: string[];
  user_notification_id: string;
  is_read: boolean;
  read_at?: string;
  clicked_at?: string;
  is_dismissed: boolean;
  dismissed_at?: string;
}
