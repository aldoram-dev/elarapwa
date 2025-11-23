import { useState, useEffect } from 'react';
import { useNetworkStatus } from '../../lib/hooks/useNetworkStatus';

interface NetworkNotification {
  id: string;
  type: 'online' | 'offline' | 'sync_success' | 'sync_error';
  message: string;
  timestamp: Date;
}

export default function NetworkStatusNotification() {
  const { isOnline, wasOffline, pendingRequests } = useNetworkStatus();
  const [notifications, setNotifications] = useState<NetworkNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Mostrar notificaciones cuando cambie el estado de red
  useEffect(() => {
    if (isOnline && wasOffline) {
      const notification: NetworkNotification = {
        id: crypto.randomUUID(),
        type: 'online',
        message: pendingRequests.length > 0 
          ? `Conexión restablecida. Procesando ${pendingRequests.length} solicitud${pendingRequests.length > 1 ? 'es' : ''} pendiente${pendingRequests.length > 1 ? 's' : ''}...`
          : 'Conexión restablecida',
        timestamp: new Date()
      };
      
      setNotifications(prev => [notification, ...prev]);
      setShowNotifications(true);

      // Ocultar después de 4 segundos
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 4000);
    } else if (!isOnline) {
      const notification: NetworkNotification = {
        id: crypto.randomUUID(),
        type: 'offline',
        message: 'Sin conexión a internet. Los cambios se guardarán localmente.',
        timestamp: new Date()
      };
      
      setNotifications(prev => [notification, ...prev]);
      setShowNotifications(true);

      // Ocultar después de 3 segundos
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 3000);
    }
  }, [isOnline, wasOffline, pendingRequests.length]);

  // Ocultar notificaciones si no hay ninguna
  useEffect(() => {
    if (notifications.length === 0) {
      setShowNotifications(false);
    }
  }, [notifications.length]);

  if (!showNotifications || notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            transform transition-all duration-300 ease-in-out
            animate-in slide-in-from-top-2
            rounded-lg p-4 shadow-lg border
            ${notification.type === 'online' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : notification.type === 'offline'
              ? 'bg-orange-50 border-orange-200 text-orange-800'
              : notification.type === 'sync_success'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-red-50 border-red-200 text-red-800'
            }
          `}
        >
          <div className="flex">
            <div className="flex-shrink-0">
              {notification.type === 'online' && (
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {notification.type === 'offline' && (
                <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              {notification.type === 'sync_success' && (
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              )}
              {notification.type === 'sync_error' && (
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">
                {notification.message}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  type="button"
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  className={`inline-flex rounded-md p-1.5 hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2 
                    ${notification.type === 'online' 
                      ? 'text-green-500 hover:bg-green-100 focus:ring-green-600' 
                      : notification.type === 'offline'
                      ? 'text-orange-500 hover:bg-orange-100 focus:ring-orange-600'
                      : notification.type === 'sync_success'
                      ? 'text-blue-500 hover:bg-blue-100 focus:ring-blue-600'
                      : 'text-red-500 hover:bg-red-100 focus:ring-red-600'
                    }
                  `}
                >
                  <span className="sr-only">Cerrar</span>
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
