import { supabase } from '@/lib/core/supabaseClient'

/**
 * Tipos de eventos de seguridad que se pueden registrar
 */
export type SecurityEventType =
  | 'password_reset_request'
  | 'password_reset_success'
  | 'password_change'
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'password_recovery_link_used'
  | 'session_expired'
  | 'unauthorized_access_attempt'

/**
 * Interfaz para los datos de un evento de seguridad
 */
export interface SecurityEvent {
  id: string
  user_id?: string | null
  event_type: SecurityEventType
  email?: string | null
  ip_address?: string | null
  user_agent?: string | null
  metadata?: Record<string, any>
  created_at: string
}

/**
 * Registra un evento de seguridad en la base de datos
 * Usa la función log_security_event del backend para simplificar inserción
 */
export async function logSecurityEvent(
  eventType: SecurityEventType,
  options?: {
    userId?: string | null
    email?: string | null
    ipAddress?: string | null
    userAgent?: string | null
    metadata?: Record<string, any>
  }
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('log_security_event', {
      p_user_id: options?.userId || null,
      p_event_type: eventType,
      p_email: options?.email || null,
      p_ip_address: options?.ipAddress || null,
      p_user_agent: options?.userAgent || null,
      p_metadata: options?.metadata || {}
    })

    if (error) {
      console.error('[Security Event] Error logging event:', error)
      return { success: false, error: error.message }
    }

    return { success: true, eventId: data }
  } catch (err) {
    console.error('[Security Event] Exception logging event:', err)
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }
  }
}

/**
 * Obtiene los eventos de seguridad del usuario actual
 * (limitado por RLS a sus propios eventos o todos si es admin)
 */
export async function getUserSecurityEvents(
  userId?: string,
  limit: number = 50
): Promise<{ data: SecurityEvent[] | null; error: string | null }> {
  try {
    let query = supabase
      .from('security_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    return { 
      data: null, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }
  }
}

/**
 * Obtiene estadísticas de eventos de seguridad (solo admins)
 */
export async function getSecurityEventStats(
  startDate?: Date,
  endDate?: Date
): Promise<{
  data: {
    eventType: SecurityEventType
    count: number
  }[] | null
  error: string | null
}> {
  try {
    let query = supabase
      .from('security_events')
      .select('event_type')

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }

    if (endDate) {
      query = query.lte('created_at', endDate.toISOString())
    }

    const { data, error } = await query

    if (error) {
      return { data: null, error: error.message }
    }

    // Agrupar por tipo de evento
    const stats = data?.reduce((acc, event) => {
      const existing = acc.find(s => s.eventType === event.event_type)
      if (existing) {
        existing.count++
      } else {
        acc.push({ eventType: event.event_type, count: 1 })
      }
      return acc
    }, [] as { eventType: SecurityEventType; count: number }[])

    return { data: stats || [], error: null }
  } catch (err) {
    return { 
      data: null, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }
  }
}

/**
 * Helper para obtener IP del cliente (solo funciona en servidor o con headers disponibles)
 * En producción usa headers de proxy (X-Forwarded-For, CF-Connecting-IP, etc.)
 */
export function getClientIP(): string | null {
  // En cliente no hay acceso directo a IP real
  // Esto debe implementarse en el servidor o Edge Function si necesitas IP precisa
  return null
}

/**
 * Helper para obtener User Agent del navegador
 */
export function getUserAgent(): string | null {
  if (typeof window !== 'undefined' && window.navigator) {
    return window.navigator.userAgent
  }
  return null
}
