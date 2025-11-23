// =====================================================
// HOOK: useNotifications
// =====================================================
// Hook conveniente para consumir el contexto de notificaciones
// y filtrar notificaciones según necesidades específicas

import { useMemo } from 'react';
import { useNotificationContext } from '../../context/NotificationContext';
import type { UserNotification, NotificationFilters } from '../../types/notification';

/**
 * Hook principal para consumir notificaciones
 */
export function useNotifications(filters?: NotificationFilters) {
  const context = useNotificationContext();

  // Aplicar filtros localmente si se proporcionan
  const filteredNotifications = useMemo(() => {
    if (!filters) return context.notifications;

    let filtered = [...context.notifications];

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
  }, [context.notifications, filters]);

  return {
    ...context,
    notifications: filteredNotifications,
  };
}

/**
 * Hook para obtener solo notificaciones no leídas
 */
export function useUnreadNotifications() {
  return useNotifications({ unread_only: true, dismissed: false });
}

/**
 * Hook para obtener solo notificaciones urgentes
 */
export function useUrgentNotifications() {
  return useNotifications({ priority: 'urgent', unread_only: true, dismissed: false });
}

/**
 * Hook para obtener el contador de notificaciones no leídas
 */
export function useUnreadCount() {
  const { unreadCount } = useNotificationContext();
  return unreadCount;
}

/**
 * Hook para obtener las notificaciones recientes (últimas 24 horas)
 */
export function useRecentNotifications(limit = 10) {
  const yesterday = new Date();
  yesterday.setHours(yesterday.getHours() - 24);

  return useNotifications({
    from_date: yesterday.toISOString(),
    limit,
    dismissed: false,
  });
}

/**
 * Hook para obtener estadísticas de notificaciones
 */
export function useNotificationStats() {
  const { stats } = useNotificationContext();
  return stats;
}

/**
 * Hook para controlar el centro de notificaciones
 */
export function useNotificationCenter() {
  const {
    isCenterOpen,
    openCenter,
    closeCenter,
    toggleCenter,
  } = useNotificationContext();

  return {
    isOpen: isCenterOpen,
    open: openCenter,
    close: closeCenter,
    toggle: toggleCenter,
  };
}

/**
 * Hook para acciones de notificaciones individuales
 */
export function useNotificationActions() {
  const {
    markAsRead,
    markAllAsRead,
    dismiss,
    click,
    refresh,
  } = useNotificationContext();

  return {
    markAsRead,
    markAllAsRead,
    dismiss,
    click,
    refresh,
  };
}

/**
 * Hook para funciones de admin (envío y eliminación)
 */
export function useNotificationAdmin() {
  const {
    sendNotification,
    deleteNotification,
  } = useNotificationContext();

  return {
    sendNotification,
    deleteNotification,
  };
}

/**
 * Hook para obtener una notificación específica por ID
 */
export function useNotification(notificationId: string): UserNotification | undefined {
  const { notifications } = useNotificationContext();
  return notifications.find(n => n.id === notificationId);
}

/**
 * Hook para obtener notificaciones agrupadas por tipo
 */
export function useNotificationsByType() {
  const { notifications } = useNotificationContext();

  return useMemo(() => {
    return {
      info: notifications.filter(n => n.type === 'info'),
      success: notifications.filter(n => n.type === 'success'),
      warning: notifications.filter(n => n.type === 'warning'),
      error: notifications.filter(n => n.type === 'error'),
    };
  }, [notifications]);
}

/**
 * Hook para obtener notificaciones agrupadas por prioridad
 */
export function useNotificationsByPriority() {
  const { notifications } = useNotificationContext();

  return useMemo(() => {
    return {
      urgent: notifications.filter(n => n.priority === 'urgent'),
      high: notifications.filter(n => n.priority === 'high'),
      normal: notifications.filter(n => n.priority === 'normal'),
      low: notifications.filter(n => n.priority === 'low'),
    };
  }, [notifications]);
}

export default useNotifications;
