import { supabase } from '@/lib/core/supabaseClient'
import { db } from '@/db/database'
import type { ForumMessage, ForumAttachment } from '@/types/forumMessage'

const isOnline = () => navigator.onLine

export async function fetchForumMessages(foroId: string): Promise<ForumMessage[]> {
  try {
    if (isOnline()) {
      const { data, error } = await supabase
        .from('forum_messages')
        .select(`
          id,
          foro_id,
          user_id,
          message,
          attachments,
          metadata,
          created_at,
          updated_at
        `)
        .eq('foro_id', foroId)
        .order('created_at', { ascending: true })

      if (!error && data) {
        // Fetch perfiles in a separate batch to avoid failing FK join
        const userIds = Array.from(new Set((data || []).map((m: any) => m.user_id)))
        let perfilesMap: Record<string, any> = {}
        if (userIds.length > 0) {
          const { data: perfiles } = await supabase
            .from('usuarios')
            .select('id, name, email, avatar_url')
            .in('id', userIds)
          perfilesMap = Object.fromEntries((perfiles || []).map(p => [p.id, p]))
        }

        // For each attachment, generate a fresh signed URL if we have a path
        const bucket = 'forum-attachments'
        const enriched = await Promise.all(data.map(async (m: any) => {
          const atts = await Promise.all((m.attachments || []).map(async (att: any) => {
            let path = att?.path as string | undefined
            // Backward-compat: try to infer path from public url if exists
            if (!path && att?.url) {
              try {
                const url = new URL(att.url)
                const parts = url.pathname.split('/forum-attachments/')
                if (parts.length > 1) path = parts[1]
              } catch {}
            }
            if (path) {
              const { data: signed } = await supabase.storage
                .from(bucket)
                .createSignedUrl(path, 60 * 60)
              return {
                ...att,
                path,
                signedUrl: signed?.signedUrl,
                bucket
              }
            }
            return att
          }))
          const perfil = perfilesMap[m.user_id]
          return {
            id: m.id,
            foro_id: m.foro_id,
            user_id: m.user_id,
            message: m.message,
            attachments: atts,
            metadata: m.metadata || {},
            created_at: m.created_at,
            updated_at: m.updated_at,
            user: perfil ? {
              id: perfil.id,
              nombre: perfil.name,
              email: perfil.email,
              avatar_url: perfil.avatar_url
            } : undefined
          } as ForumMessage
        }))

        // Cache enriched messages
        await Promise.all(enriched.map(async (msg) => {
          await db.cache.put({
            key: `forum-message-${msg.id}`,
            data: msg,
            expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
            created_at: new Date().toISOString()
          })
        }))
        return enriched
      }
    }
  } catch (err) {
    console.warn('⚠️ Error obteniendo mensajes de foro, usando cache:', err)
  }
  
  // Fallback a cache local
  const cached = await db.cache.where('key').startsWith(`forum-message-`).toArray()
  return cached
    .map(c => c.data)
    .filter((m: any) => m.foro_id === foroId)
    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

export async function uploadForumAttachment(file: File, foroId: string): Promise<ForumAttachment> {
  const fileName = `${foroId}/${Date.now()}-${file.name}`
  const bucket = 'forum-attachments'
  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })
  if (error) throw error

  // Generate a short-lived signed URL (e.g., 1 hour)
  const { data: signed } = await supabase.storage
    .from(bucket)
    .createSignedUrl(fileName, 60 * 60) // 3600 seconds

  const fileType = file.type.startsWith('image/') ? 'image'
    : file.type.startsWith('video/') ? 'video'
    : file.type.startsWith('audio/') ? 'audio'
    : file.type.includes('pdf') || file.type.includes('document') ? 'document'
    : 'other'

  return {
    message_id: '',
    file_name: file.name,
    file_url: signed?.signedUrl || '',
    file_type: fileType,
    path: fileName,
    signedUrl: signed?.signedUrl,
    name: file.name,
    size: file.size,
    file_size: file.size,
    type: fileType,
    mimeType: file.type,
    bucket
  }
}

export async function sendForumMessage(
  foroId: string, 
  userId: string, 
  message?: string,
  attachments?: ForumAttachment[]
): Promise<ForumMessage> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  
  const newMessage: ForumMessage = {
    id,
    forum_id: foroId,
    foro_id: foroId,
    user_id: userId,
    mensaje: message?.trim() || '',
    message: message?.trim() || undefined,
    attachments: attachments || [],
    created_at: now,
    updated_at: now
  }

  // Guardar en cache
  await db.cache.put({
    key: `forum-message-${id}`,
    data: newMessage,
    expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    created_at: now
  })

  if (isOnline()) {
    try {
      const { data, error } = await supabase
        .from('forum_messages')
        .insert({
          id,
          foro_id: foroId,
          user_id: userId,
          message: newMessage.message,
          attachments: (newMessage.attachments || []).map(att => ({
            // Persist only essential fields; signedUrl will be regenerated on fetch
            path: att.path,
            name: att.name,
            size: att.size,
            type: att.type,
            mimeType: att.mimeType,
            bucket: att.bucket
          })),
          created_at: now,
          updated_at: now
        })
        .select(`
          id,
          foro_id,
          user_id,
          message,
          attachments,
          metadata,
          created_at,
          updated_at
        `)
        .single()

      if (error) {
        console.error('❌ Error enviando mensaje al foro:', error)
        throw new Error(`Error de Supabase: ${error.message}`)
      }

      if (data) {
        // Generate signed URLs for attachments in response
        const bucket = 'forum-attachments'
        const withSigned = await Promise.all((data.attachments || []).map(async (att: any) => {
          if (att?.path) {
            const { data: signed } = await supabase.storage
              .from(bucket)
              .createSignedUrl(att.path, 60 * 60)
            return { ...att, signedUrl: signed?.signedUrl, bucket }
          }
          return att
        }))
        // Fetch perfil for the user
        const { data: perfil } = await supabase
          .from('usuarios')
          .select('id, name, email, avatar_url')
          .eq('id', data.user_id)
          .single()

        const msgWithUser: ForumMessage = {
          id: data.id,
          forum_id: data.foro_id || '',
          foro_id: data.foro_id,
          user_id: data.user_id,
          mensaje: data.message || '',
          message: data.message,
          attachments: withSigned,
          metadata: data.metadata || {},
          created_at: data.created_at,
          updated_at: data.updated_at,
          user: perfil ? {
            id: perfil.id,
            nombre: perfil.name,
            email: perfil.email,
            avatar_url: perfil.avatar_url
          } : undefined
        }
        await db.cache.put({
          key: `forum-message-${id}`,
          data: msgWithUser,
          expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
          created_at: now
        })
        return msgWithUser
      }
    } catch (err: any) {
      console.error('⚠️ Error enviando mensaje:', err)
      throw err
    }
  }
  
  console.log('📴 Mensaje guardado offline (sin conexión)')
  return newMessage
}

export async function deleteForumMessage(messageId: string): Promise<void> {
  await db.cache.delete(`forum-message-${messageId}`)
  
  if (isOnline()) {
    const { error } = await supabase
      .from('forum_messages')
      .delete()
      .eq('id', messageId)
    
    if (error) throw error
  }
}
