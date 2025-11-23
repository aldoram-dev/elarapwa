import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnline: Date | null;
  lastOffline: Date | null;
}

export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    wasOffline: false,
    lastOnline: navigator.onLine ? new Date() : null,
    lastOffline: navigator.onLine ? null : new Date()
  });

  const [pendingRequests, setPendingRequests] = useState<Array<{
    id: string;
    type: 'reset_password' | 'login' | 'sync';
    data: any;
    timestamp: Date;
    retries: number;
  }>>([]);

  const updateOnlineStatus = useCallback(() => {
    const isOnline = navigator.onLine;
    const now = new Date();
    
    setNetworkStatus(prev => ({
      isOnline,
      wasOffline: !isOnline || prev.wasOffline,
      lastOnline: isOnline ? now : prev.lastOnline,
      lastOffline: !isOnline ? now : prev.lastOffline
    }));
  }, []);

  // Agregar solicitud pendiente para ejecutar cuando vuelva la conexión
  const addPendingRequest = useCallback((type: string, data: any) => {
    const request = {
      id: crypto.randomUUID(),
      type: type as any,
      data,
      timestamp: new Date(),
      retries: 0
    };
    
    setPendingRequests(prev => [...prev, request]);
    
    // Guardar en localStorage para persistencia
    const stored = localStorage.getItem('pending_network_requests');
    const existing = stored ? JSON.parse(stored) : [];
    localStorage.setItem('pending_network_requests', JSON.stringify([...existing, request]));
    
    return request.id;
  }, []);

  // Remover solicitud pendiente
  const removePendingRequest = useCallback((id: string) => {
    setPendingRequests(prev => prev.filter(req => req.id !== id));
    
    // Actualizar localStorage
    const stored = localStorage.getItem('pending_network_requests');
    if (stored) {
      const existing = JSON.parse(stored);
      const filtered = existing.filter((req: any) => req.id !== id);
      localStorage.setItem('pending_network_requests', JSON.stringify(filtered));
    }
  }, []);

  // Procesar solicitudes pendientes cuando vuelva la conexión
  const processPendingRequests = useCallback(async () => {
    if (!networkStatus.isOnline || pendingRequests.length === 0) return;

    for (const request of pendingRequests) {
      try {
        console.log(`Procesando solicitud pendiente: ${request.type}`, request.data);
        
        // Procesar según el tipo de solicitud
        switch (request.type) {
          case 'reset_password':
            // Importar dinámicamente supabase para evitar problemas de dependencias
            const { supabase } = await import('../core/supabaseClient');
            // Verificar expiración de la solicitud antes de enviar (24h)
            const EXPIRATION_HOURS = 24;
            const resetRequestsStr = localStorage.getItem('reset_password_requests');
            if (resetRequestsStr) {
              try {
                const list = JSON.parse(resetRequestsStr);
                const found = list.find((r: any) => r.id === request.data.requestId);
                if (found) {
                  const ts = new Date(found.timestamp);
                  const hours = (Date.now() - ts.getTime()) / (1000 * 60 * 60);
                  if (hours > EXPIRATION_HOURS) {
                    // Marcar como expirado y remover de pendientes
                    const updated = list.map((r: any) => r.id === found.id ? { ...r, status: 'expired', lastAttempt: new Date().toISOString() } : r);
                    localStorage.setItem('reset_password_requests', JSON.stringify(updated.filter((r: any) => r.status !== 'expired')));
                    removePendingRequest(request.id);
                    console.warn(`⏳ Solicitud ${request.id} expirada. No se enviará.`);
                    continue;
                  }
                }
              } catch (e) {
                console.warn('No se pudo verificar expiración de reset_password_requests:', e);
              }
            }
            const { error } = await supabase.auth.resetPasswordForEmail(request.data.email, {
              // Usar ruta corta /reset para confirmación
              redirectTo: `${window.location.origin}/reset`
            });
            
            if (error) {
              throw new Error(`Error enviando reset password: ${error.message}`);
            }
            
            // Actualizar localStorage de reset password requests
            const resetRequests = localStorage.getItem('reset_password_requests');
            if (resetRequests) {
              const parsed = JSON.parse(resetRequests);
              const updated = parsed.map((req: any) => 
                req.id === request.data.requestId 
                  ? { ...req, status: 'sent', lastAttempt: new Date().toISOString() }
                  : req
              );
              localStorage.setItem('reset_password_requests', JSON.stringify(updated));
            }
            break;
            
          case 'sync':
            // Aquí se puede agregar lógica de sincronización de datos
            console.log('Sincronizando datos pendientes...');
            break;
            
          default:
            console.warn(`Tipo de solicitud no soportado: ${request.type}`);
        }
        
        removePendingRequest(request.id);
        console.log(`✅ Solicitud ${request.id} procesada exitosamente`);
        
      } catch (error) {
        console.error(`❌ Error procesando solicitud ${request.id}:`, error);
        
        // Incrementar reintentos
        setPendingRequests(prev => 
          prev.map(req => 
            req.id === request.id 
              ? { ...req, retries: req.retries + 1 }
              : req
          )
        );
        
        // Si ha fallado muchas veces, remover
        if (request.retries >= 3) {
          console.warn(`🗑️ Removiendo solicitud ${request.id} después de ${request.retries + 1} intentos fallidos`);
          removePendingRequest(request.id);
        }
      }
    }
  }, [networkStatus.isOnline, pendingRequests, removePendingRequest]);

  // Restaurar solicitudes pendientes del localStorage al cargar
  useEffect(() => {
    const stored = localStorage.getItem('pending_network_requests');
    if (stored) {
      try {
        const requests = JSON.parse(stored);
        setPendingRequests(requests);
      } catch (error) {
        console.error('Error restaurando solicitudes pendientes:', error);
        localStorage.removeItem('pending_network_requests');
      }
    }
  }, []);

  // Escuchar eventos de red
  useEffect(() => {
    const handleOnline = () => updateOnlineStatus();
    const handleOffline = () => updateOnlineStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateOnlineStatus]);

  // Procesar solicitudes pendientes cuando vuelva la conexión
  useEffect(() => {
    if (networkStatus.isOnline && networkStatus.wasOffline) {
      processPendingRequests();
    }
  }, [networkStatus.isOnline, networkStatus.wasOffline, processPendingRequests]);

  return {
    ...networkStatus,
    pendingRequests,
    addPendingRequest,
    removePendingRequest,
    processPendingRequests
  };
}
