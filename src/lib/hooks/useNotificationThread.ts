import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/core/supabaseClient'
import type { UserNotification } from '@/types/notification'

export interface NotificationThread {
  parent: UserNotification
  replies: UserNotification[]
}

/**
 * Hook para manejar hilos de respuestas de notificaciones
 */
export function useNotificationThread(notificationId: string, userId: string) {
  const [thread, setThread] = useState<NotificationThread | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadThread = useCallback(async () => {
    if (!notificationId || !userId) return

    try {
      setLoading(true)
      setError(null)

      // 1) Obtener TODAS las notificaciones del usuario para poder localizar el nodo padre y sus metadatos
      const { data: allData, error: parentError } = await supabase
        .rpc('get_user_notifications', { p_user_id: userId })

      if (parentError) throw parentError

      const all = (allData as any[]) || []
      let parent = all.find(n => n.notification_id === notificationId)
      if (!parent) {
        setError('Notificación no encontrada')
        return
      }

      // 2) Resolver el padre RAÍZ: subir por la cadena de parent_id hasta que no haya más
      //    Usamos la tabla notifications para inspeccionar metadatos
      let rootId = parent.notification_id as string
      // Seguridad contra bucles
      const visited = new Set<string>()
      while (true) {
        if (visited.has(rootId)) break
        visited.add(rootId)
        const { data: ninfo, error: nerr } = await supabase
          .from('notifications')
          .select('id, metadata')
          .eq('id', rootId)
          .single()
        if (nerr || !ninfo) break
        const pid = (ninfo as any)?.metadata?.parent_id as string | undefined
        if (!pid) break
        rootId = pid
      }

      // Si el root es distinto al seleccionado, re-asignar parent al root (desde allData)
      if (rootId !== parent.notification_id) {
        const root = all.find(n => n.notification_id === rootId)
        if (root) parent = root
      }

      // 3) Traer TODA la cadena de respuestas desde el root hacia abajo en forma iterativa (BFS)
      const replies: UserNotification[] = []
      let frontier: string[] = [rootId]
      const maxDepth = 8
      const maxTotal = 200
      let depth = 0
      while (frontier.length > 0 && replies.length < maxTotal && depth < maxDepth) {
        // Buscar notificaciones cuyo metadata->>parent_id esté en la frontera actual
        const { data: batch, error: batchErr } = await supabase
          .from('notifications')
          .select(`
            *,
            user_notifications!inner(
              id,
              user_id,
              read_at,
              dismissed_at,
              clicked_at
            )
          `)
          .eq('user_notifications.user_id', userId)
          // @ts-ignore: PostgREST permite columnas calculadas
          .in('metadata->>parent_id', frontier as any)
          .order('created_at', { ascending: true })

        if (batchErr) throw batchErr

        const mapped: UserNotification[] = (batch || []).map((r: any) => {
          const un = r.user_notifications?.[0] || {}
          return {
            id: r.id,
            user_id: un.user_id || '',
            title: r.title,
            message: r.message,
            type: r.type,
            priority: r.priority,
            read: !!un.read_at,
            action_url: r.action_url,
            icon: r.icon,
            created_by: r.created_by,
            created_at: r.created_at,
            expires_at: r.expires_at,
            metadata: r.metadata,
            target_type: r.target_type,
            user_notification_id: un.id || undefined,
            read_at: un.read_at || undefined,
            dismissed_at: un.dismissed_at || undefined,
            clicked_at: un.clicked_at || undefined,
            is_read: !!un.read_at,
            is_dismissed: !!un.dismissed_at,
            is_new: false,
          }
        })

        replies.push(...mapped)
        frontier = mapped.map(m => m.id)
        depth += 1
      }

      // 4) Armar objeto thread con el padre raíz
      //    Nota: usamos target_type real y tratamos de conservar target_group_ids si viene en metadatos
      const parentUN: UserNotification = {
        id: parent.notification_id || parent.id,
        user_id: parent.user_id,
        notification_id: parent.notification_id,
        title: parent.title,
        message: parent.message,
        type: parent.type,
        priority: parent.priority,
        read: parent.read,
        action_url: parent.action_url,
        icon: parent.icon,
        created_by: parent.created_by,
        created_at: parent.created_at,
        expires_at: parent.expires_at,
        metadata: parent.metadata,
        target_type: parent.target_type,
        user_notification_id: parent.user_notification_id,
        read_at: parent.read_at,
        clicked_at: parent.clicked_at,
        is_read: !!parent.read_at,
        is_dismissed: !!parent.is_dismissed,
        is_new: false,
      }

      // Orden cronológico ascendente por fecha de creación
      replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      setThread({
        parent: parentUN,
        replies,
      })
    } catch (e: any) {
      console.error('Error loading thread:', e)
      setError(e.message || 'Error cargando el hilo')
    } finally {
      setLoading(false)
    }
  }, [notificationId, userId])

  useEffect(() => {
    loadThread()
  }, [loadThread])

  return { thread, loading, error, refresh: loadThread }
}

export default useNotificationThread
