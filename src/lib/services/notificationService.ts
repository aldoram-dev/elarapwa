// =====================================================
// SERVICIO DE NOTIFICACIONES
// =====================================================
// Maneja toda la lógica de notificaciones:
// - Fetch de notificaciones del usuario
// - Envío de notificaciones (admin)
// - Marcar como leída/descartada/clickeada
// - Estadísticas
// - Integración con Supabase Realtime

import { supabase } from '../core/supabaseClient';
import type {
  Notification,
  UserNotification,
  CreateNotificationInput,
  NotificationFilters,
  NotificationStats,
  NotificationServiceResponse,
  GetUserNotificationsResult,
} from '../../types/notification';

/**
 * Servicio de notificaciones
 */
class NotificationService {
  /**
   * Obtener todas las notificaciones del usuario actual
   */
  async getUserNotifications(userId: string, filters?: NotificationFilters): Promise<UserNotification[]> {
    try {
      // Llamar a la función SQL que hace todo el filtrado
      const { data, error } = await supabase
        .rpc('get_user_notifications', { p_user_id: userId });

      if (error) throw error;

      // Transformar resultado a UserNotification
      const notifications: UserNotification[] = (data as GetUserNotificationsResult[]).map(item => ({
        id: item.notification_id || item.id,
        user_id: userId,
        notification_id: item.notification_id,
        title: item.title,
        message: item.message,
        type: item.type,
        priority: item.priority,
        read: !!item.read_at,
        action_url: item.action_url,
        icon: item.icon,
        created_by: item.created_by,
        created_at: item.created_at,
        expires_at: item.expires_at,
        metadata: item.metadata,
        target_type: item.target_type,
        target_group_ids: item.target_group_ids || undefined,
        user_notification_id: item.user_notification_id,
        read_at: item.read_at,
        dismissed_at: item.dismissed_at,
        clicked_at: item.clicked_at,
        is_read: !!item.read_at,
        is_dismissed: !!item.dismissed_at,
        is_new: this.isNewNotification(item.created_at),
      }));

      // Aplicar filtros adicionales si existen
      return this.applyFilters(notifications, filters);
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  /**
   * Obtener el contador de notificaciones no leídas
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('get_unread_notification_count', { p_user_id: userId });

      if (error) throw error;

      return data as number || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  /**
   * Marcar notificación como leída
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .rpc('mark_notification_as_read', {
          p_user_id: userId,
          p_notification_id: notificationId,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      // Obtener todas las notificaciones no leídas
      const notifications = await this.getUserNotifications(userId, { unread_only: true });

      // Marcar cada una como leída
      const promises = notifications.map(n => this.markAsRead(userId, n.id));
      await Promise.all(promises);
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  }

  /**
   * Marcar notificación como clickeada (y leída)
   */
  async markAsClicked(userId: string, notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .rpc('mark_notification_as_clicked', {
          p_user_id: userId,
          p_notification_id: notificationId,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as clicked:', error);
      throw error;
    }
  }

  /**
   * Descartar notificación (y marcar como leída)
   */
  async dismiss(userId: string, notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .rpc('dismiss_notification', {
          p_user_id: userId,
          p_notification_id: notificationId,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error dismissing notification:', error);
      throw error;
    }
  }

  /**
   * Enviar una nueva notificación (solo para admins)
   */
  async sendNotification(input: CreateNotificationInput): Promise<NotificationServiceResponse> {
    try {
      // Validar input
      const validation = this.validateNotificationInput(input);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Preparar datos
      const { data: authInfo } = await supabase.auth.getUser();
      const creatorId = authInfo?.user?.id || null;
      // Asegurar que metadata incluya target_group_ids cuando se envía a grupos (mejora de resiliencia del frontend)
      const mergedMetadata = (() => {
        const base = (input.metadata && typeof input.metadata === 'object') ? { ...input.metadata } : {}
        if (input.target_type === 'group' && Array.isArray(input.target_group_ids)) {
          // Duplicamos en metadata para que el cliente pueda agrupar aunque el RPC no retorne el campo
          ;(base as any).target_group_ids = input.target_group_ids
        }
        return base
      })()
      const notificationData: Partial<Notification> = {
        title: input.title,
        message: input.message,
        type: input.type || 'info',
        priority: input.priority || 'normal',
        action_url: input.action_url || undefined,
        icon: input.icon || undefined,
        expires_at: input.expires_at || undefined,
        target_type: input.target_type,
        target_empresa_id: input.target_empresa_id || undefined,
        target_user_ids: input.target_user_ids || undefined,
        target_roles: input.target_roles || undefined,
        metadata: mergedMetadata,
        target_group_ids: input.target_group_ids || undefined,
        // Intentamos setear created_by para soportar respuestas correctas incluso si el backend no lo establece por defecto
        created_by: creatorId,
      };

      // Insertar en la base de datos
      const { data, error } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data as Notification,
        notification: data as Notification,
      };
    } catch (error: any) {
      console.error('Error sending notification:', error);
      return {
        success: false,
        error: error.message || 'Error al enviar la notificación',
      };
    }
  }

  /**
   * Eliminar una notificación (solo para admins)
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de notificaciones del usuario
   */
  async getStats(userId: string): Promise<NotificationStats> {
    try {
      const notifications = await this.getUserNotifications(userId);

      const stats: NotificationStats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.is_read).length,
        byType: {
          info: notifications.filter(n => n.type === 'info').length,
          success: notifications.filter(n => n.type === 'success').length,
          warning: notifications.filter(n => n.type === 'warning').length,
          error: notifications.filter(n => n.type === 'error').length,
        },
        byPriority: {
          low: notifications.filter(n => n.priority === 'low').length,
          normal: notifications.filter(n => n.priority === 'normal').length,
          high: notifications.filter(n => n.priority === 'high').length,
          urgent: notifications.filter(n => n.priority === 'urgent').length,
        },
      };

      return stats;
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      throw error;
    }
  }

  /**
   * Suscribirse a nuevas notificaciones en tiempo real
   */
  subscribeToNotifications(
    userId: string,
    onNotification: (notification: UserNotification) => void
  ) {
    // Suscribirse a cambios en la tabla notifications
    const notificationsChannel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        async (payload) => {
          console.log('Nueva notificación recibida:', payload);
          
          // Verificar si esta notificación es para este usuario
          const notification = payload.new as Notification;
          const isForUser = await this.isNotificationForUser(notification, userId);
          
          if (isForUser) {
            // Transformar a UserNotification
            const userNotification: UserNotification = {
              id: notification.id,
              user_id: userId,
              notification_id: notification.id,
              title: notification.title,
              message: notification.message,
              type: notification.type,
              priority: notification.priority,
              read: false,
              action_url: notification.action_url || undefined,
              icon: notification.icon || undefined,
              created_at: notification.created_at,
              created_by: notification.created_by || undefined,
              expires_at: notification.expires_at || undefined,
              metadata: notification.metadata,
              target_type: notification.target_type,
              target_empresa_id: notification.target_empresa_id,
              target_user_ids: notification.target_user_ids || undefined,
              target_roles: notification.target_roles || undefined,
              target_group_ids: notification.target_group_ids || undefined,
              user_notification_id: undefined,
              read_at: undefined,
              dismissed_at: undefined,
              clicked_at: undefined,
              is_read: false,
              is_dismissed: false,
              is_new: true,
            };
            
            onNotification(userNotification);
          }
        }
      )
      .subscribe();

    // También suscribirse a cambios en user_notifications
    const userNotificationsChannel = supabase
      .channel('user-notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Cambio en user_notifications:', payload);
          // Aquí puedes manejar updates de estado (leído, descartado, etc.)
        }
      )
      .subscribe();

    // Retornar función para desuscribirse
    return () => {
      notificationsChannel.unsubscribe();
      userNotificationsChannel.unsubscribe();
    };
  }

  // ===================================
  // MÉTODOS PRIVADOS
  // ===================================

  /**
   * Verificar si una notificación es para un usuario específico
   */
  private async isNotificationForUser(notification: Notification, userId: string): Promise<boolean> {
    try {
      // Si es para todos
      if (notification.target_type === 'all') {
        return true;
      }

      // Obtener info del usuario (perfil) y sus roles
      const { data: perfil, error: perfilError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userId)
        .single();

      if (perfilError || !perfil) return false;

      const { data: roleRows, error: rolesError } = await supabase
        .from('roles_usuario')
        .select('roles(name), role_id')
        .eq('user_id', userId);
      if (rolesError) return false;
      const userRoleNames = (roleRows || [])
        .map((r: any) => r.roles?.name)
        .filter(Boolean);

      // Si es para una empresa específica
      if (notification.target_type === 'empresa') {
        return notification.target_empresa_id === perfil.empresa_id;
      }

      // Si es para usuarios específicos
      if (notification.target_type === 'user') {
        return notification.target_user_ids?.includes(userId) || false;
      }

      // Si es para roles específicos
      if (notification.target_type === 'role') {
        return notification.target_roles?.some(r => userRoleNames.includes(r)) || false;
      }

      // Si es para grupos (verificar membresía)
      if (notification.target_type === 'group') {
        if (!notification.target_group_ids || notification.target_group_ids.length === 0) return false;
        const { data: groupMembers, error: gmError } = await supabase
          .from('notification_group_members')
          .select('group_id')
          .in('group_id', notification.target_group_ids)
          .eq('user_id', userId);
        if (gmError) return false;
        return (groupMembers || []).length > 0;
      }

      return false;
    } catch (error) {
      console.error('Error checking if notification is for user:', error);
      return false;
    }
  }

  /**
   * Validar input de notificación
   */
  private validateNotificationInput(input: CreateNotificationInput): { valid: boolean; error?: string } {
    if (!input.title || input.title.trim().length === 0) {
      return { valid: false, error: 'El título es requerido' };
    }

    if (!input.message || input.message.trim().length === 0) {
      return { valid: false, error: 'El mensaje es requerido' };
    }

    if (!input.target_type) {
      return { valid: false, error: 'El tipo de destinatario es requerido' };
    }

    // Validar targeting específico
    if (input.target_type === 'empresa' && !input.target_empresa_id) {
      return { valid: false, error: 'Debes seleccionar una empresa' };
    }

    if (input.target_type === 'user' && (!input.target_user_ids || input.target_user_ids.length === 0)) {
      return { valid: false, error: 'Debes seleccionar al menos un usuario' };
    }

    if (input.target_type === 'role' && (!input.target_roles || input.target_roles.length === 0)) {
      return { valid: false, error: 'Debes seleccionar al menos un rol' };
    }

    if (input.target_type === 'group' && (!input.target_group_ids || input.target_group_ids.length === 0)) {
      return { valid: false, error: 'Debes seleccionar al menos un grupo' };
    }

    return { valid: true };
  }

  /**
   * Determinar si una notificación es "nueva" (creada hace menos de 5 segundos)
   */
  private isNewNotification(createdAt: string): boolean {
    const created = new Date(createdAt);
    const now = new Date();
    const diffInSeconds = (now.getTime() - created.getTime()) / 1000;
    return diffInSeconds < 5;
  }

  /**
   * Aplicar filtros adicionales a las notificaciones
   */
  private applyFilters(notifications: UserNotification[], filters?: NotificationFilters): UserNotification[] {
    if (!filters) return notifications;

    let filtered = [...notifications];

    // Filtrar por tipo
    if (filters.type) {
      filtered = filtered.filter(n => n.type === filters.type);
    }

    // Filtrar por prioridad
    if (filters.priority) {
      filtered = filtered.filter(n => n.priority === filters.priority);
    }

    // Solo no leídas
    if (filters.unread_only) {
      filtered = filtered.filter(n => !n.is_read);
    }

    // Filtrar por descartadas
    if (filters.dismissed !== undefined) {
      filtered = filtered.filter(n => !!n.is_dismissed === filters.dismissed);
    }

    // Filtrar por rango de fechas
    if (filters.from_date) {
      const fromDate = new Date(filters.from_date);
      filtered = filtered.filter(n => new Date(n.created_at) >= fromDate);
    }

    if (filters.to_date) {
      const toDate = new Date(filters.to_date);
      filtered = filtered.filter(n => new Date(n.created_at) <= toDate);
    }

    // Aplicar limit y offset
    if (filters.offset) {
      filtered = filtered.slice(filters.offset);
    }

    if (filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }
}

// Exportar instancia singleton
export const notificationService = new NotificationService();
export default notificationService;
