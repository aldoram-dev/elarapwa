import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/core/supabaseClient'
import { fetchForumMessages, sendForumMessage } from '@/lib/services/forumMessageService'
import type { ForumMessage } from '@/types/forumMessage'

export function useForumMessages(foroId: string, userId: string) {
  const [messages, setMessages] = useState<ForumMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const subscriptionRef = useRef<any>(null)

  // Cargar mensajes iniciales
  useEffect(() => {
    if (!foroId) return

    setLoading(true)
    fetchForumMessages(foroId)
      .then(setMessages)
      .catch(e => setError(e.message || 'Error cargando mensajes'))
      .finally(() => setLoading(false))
  }, [foroId])

  // Suscripción en tiempo real a nuevos mensajes
  useEffect(() => {
    if (!foroId) return

    const channel = supabase
      .channel(`forum-${foroId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'forum_messages',
          filter: `foro_id=eq.${foroId}`
        },
        async (payload) => {
          console.log('📨 Nuevo mensaje en foro:', payload)
          // Recargar mensajes para obtener datos del usuario
          const updated = await fetchForumMessages(foroId)
          setMessages(updated)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'forum_messages',
          filter: `foro_id=eq.${foroId}`
        },
        (payload) => {
          console.log('🗑️ Mensaje eliminado del foro:', payload)
          setMessages(prev => prev.filter(m => m.id !== payload.old.id))
        }
      )
      .subscribe()

    subscriptionRef.current = channel

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, [foroId])

  // Enviar mensaje
  const send = async (message?: string, attachments?: any[]) => {
    if ((!message || !message.trim()) && (!attachments || attachments.length === 0)) return
    if (!userId) return

    setSending(true)
    setError(null)

    try {
      const newMsg = await sendForumMessage(foroId, userId, message, attachments)
      // Agregar optimísticamente si no está en realtime
      setMessages(prev => [...prev, newMsg])
    } catch (e: any) {
      setError(e.message || 'Error enviando mensaje')
      throw e
    } finally {
      setSending(false)
    }
  }

  return {
    messages,
    loading,
    error,
    sending,
    send
  }
}
