import { useState, useCallback } from 'react';
import { supabase } from '../core/supabaseClient';
import { useNetworkStatus } from './useNetworkStatus';
import { db } from '../../db/database';
import { logSecurityEvent, getUserAgent } from '../services/securityEventService';

export interface ResetPasswordRequest {
  id: string;
  email: string;
  timestamp: Date;
  status: 'pending' | 'sent' | 'failed' | 'expired';
  attempts: number;
  lastAttempt?: Date;
}

export interface ResetPasswordResult {
  success: boolean;
  message: string;
  isPending?: boolean;
  requestId?: string;
}

export function useResetPassword() {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<ResetPasswordRequest[]>([]);
  const { isOnline, addPendingRequest, removePendingRequest } = useNetworkStatus();

  // Configuración: rate limit y expiración
  const RATE_LIMIT_SECONDS = 60; // tiempo mínimo entre solicitudes por email
  const EXPIRATION_HOURS = 24;   // caducidad de una solicitud

  const isExpired = (ts: Date) => ((Date.now() - ts.getTime()) / (1000 * 60 * 60)) > EXPIRATION_HOURS;

  // Cargar solicitudes guardadas desde IndexedDB
  const loadSavedRequests = useCallback(async () => {
    try {
      // Usar IndexedDB para almacenar solicitudes de reset password
      const saved = localStorage.getItem('reset_password_requests');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Normalizar y limpiar expiradas
        const normalized: ResetPasswordRequest[] = parsed.map((req: any) => ({
          ...req,
          timestamp: new Date(req.timestamp),
          lastAttempt: req.lastAttempt ? new Date(req.lastAttempt) : undefined,
          status: isExpired(new Date(req.timestamp)) ? 'expired' : req.status
        }));
        const filtered = normalized.filter(r => r.status !== 'expired');
        setRequests(filtered);
        // Persistir limpieza
        localStorage.setItem('reset_password_requests', JSON.stringify(filtered));
      }
    } catch (error) {
      console.error('Error cargando solicitudes guardadas:', error);
    }
  }, []);

  // Guardar solicitudes en localStorage
  const saveRequests = useCallback((newRequests: ResetPasswordRequest[]) => {
    try {
      localStorage.setItem('reset_password_requests', JSON.stringify(newRequests));
      setRequests(newRequests);
    } catch (error) {
      console.error('Error guardando solicitudes:', error);
    }
  }, []);

  // Solicitar reset password
  const requestPasswordReset = useCallback(async (email: string): Promise<ResetPasswordResult> => {
    if (!email || !email.includes('@')) {
      return {
        success: false,
        message: 'Por favor ingresa un email válido'
      };
    }

    setLoading(true);

    // Rate limit: bloquear si última solicitud para este email fue hace menos de RATE_LIMIT_SECONDS
    const lastForEmail = [...requests]
      .filter(r => r.email.toLowerCase() === email.toLowerCase())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    if (lastForEmail) {
      const lastTs = lastForEmail.lastAttempt ?? lastForEmail.timestamp;
      const elapsedSec = Math.floor((Date.now() - lastTs.getTime()) / 1000);
      if (elapsedSec < RATE_LIMIT_SECONDS) {
        return {
          success: false,
          message: `Espera ${RATE_LIMIT_SECONDS - elapsedSec}s antes de solicitar otro correo`
        };
      }
      // Si la última solicitud expiró, la ignoramos y continuamos
    }

    // Crear solicitud
    const request: ResetPasswordRequest = {
      id: crypto.randomUUID(),
      email: email.toLowerCase().trim(),
      timestamp: new Date(),
      status: 'pending',
      attempts: 1,
      lastAttempt: new Date()
    };

    try {
      if (isOnline) {
        // Intentar enviar inmediatamente si hay conexión
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          // Unificar ruta de confirmación con configuración de Supabase: /reset
          redirectTo: `${window.location.origin}/reset`
        });

        if (error) {
          // Guardar como fallida pero pendiente para reintento
          const failedRequest = {
            ...request,
            status: 'failed' as const,
            attempts: 1
          };
          
          const newRequests = [...requests, failedRequest];
          saveRequests(newRequests);

          // Agregar a cola de reintentos si es un error de red
          if (error.message.includes('network') || error.message.includes('connection')) {
            addPendingRequest('reset_password', { email, requestId: request.id });
          }

          return {
            success: false,
            message: `Error al enviar email: ${error.message}`
          };
        }

        // Éxito - guardar como enviado
        const successRequest = {
          ...request,
          status: 'sent' as const,
          lastAttempt: new Date()
        };
        
        const newRequests = [...requests, successRequest];
        saveRequests(newRequests);

        // Registrar evento de seguridad
        logSecurityEvent('password_reset_request', {
          email,
          userAgent: getUserAgent() || undefined,
          metadata: { online: true, requestId: request.id }
        }).catch(err => console.warn('Error logging security event:', err));

        return {
          success: true,
          message: 'Se ha enviado un email con las instrucciones para restablecer tu contraseña'
        };

      } else {
        // Sin conexión - guardar para enviar después
        const pendingRequest = {
          ...request,
          status: 'pending' as const
        };
        
        const newRequests = [...requests, pendingRequest];
        saveRequests(newRequests);

        // Agregar a cola para procesar cuando vuelva la conexión
        const pendingId = addPendingRequest('reset_password', { email, requestId: request.id });

        return {
          success: true,
          message: 'Sin conexión a internet. La solicitud se enviará automáticamente cuando se restablezca la conexión.',
          isPending: true,
          requestId: request.id
        };
      }

    } catch (error) {
      const failedRequest = {
        ...request,
        status: 'failed' as const
      };
      
      const newRequests = [...requests, failedRequest];
      saveRequests(newRequests);

      return {
        success: false,
        message: `Error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    } finally {
      setLoading(false);
    }
  }, [isOnline, requests, saveRequests, addPendingRequest]);

  // Reenviar solicitud específica
  const resendRequest = useCallback(async (requestId: string): Promise<ResetPasswordResult> => {
    const request = requests.find(r => r.id === requestId);
    if (!request) {
      return {
        success: false,
        message: 'Solicitud no encontrada'
      };
    }

    // Verificar si no ha pasado mucho tiempo (límite de 24 horas)
    const hoursSinceRequest = (new Date().getTime() - request.timestamp.getTime()) / (1000 * 60 * 60);
    if (hoursSinceRequest > 24) {
      return {
        success: false,
        message: 'La solicitud ha expirado. Por favor, realiza una nueva solicitud.'
      };
    }

    return await requestPasswordReset(request.email);
  }, [requests, requestPasswordReset]);

  // Cancelar solicitud pendiente
  const cancelRequest = useCallback((requestId: string) => {
    const newRequests = requests.filter(r => r.id !== requestId);
    saveRequests(newRequests);
    removePendingRequest(requestId);
  }, [requests, saveRequests, removePendingRequest]);

  // Limpiar solicitudes antiguas (más de 7 días)
  const cleanupOldRequests = useCallback(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newRequests = requests.filter(r => r.timestamp > sevenDaysAgo);
    if (newRequests.length !== requests.length) {
      saveRequests(newRequests);
    }
  }, [requests, saveRequests]);

  // Obtener estadísticas de solicitudes
  const getRequestStats = useCallback(() => {
    const pending = requests.filter(r => r.status === 'pending').length;
    const sent = requests.filter(r => r.status === 'sent').length;
    const failed = requests.filter(r => r.status === 'failed').length;

    return {
      total: requests.length,
      pending,
      sent,
      failed,
      lastRequest: requests.length > 0 ? requests[requests.length - 1] : null
    };
  }, [requests]);

  return {
    loading,
    requests,
    isOnline,
    requestPasswordReset,
    resendRequest,
    cancelRequest,
    cleanupOldRequests,
    getRequestStats,
    loadSavedRequests
  };
}
