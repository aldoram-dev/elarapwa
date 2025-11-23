import { Forum } from '@/types/forum'
import { supabase } from '@/lib/core/supabaseClient'
import { db } from '@/db/database'
import notificationService from '@/lib/services/notificationService'

const isOnline = () => navigator.onLine

export async function fetchForos(): Promise<Forum[]> {
  try {
    if (isOnline()) {
      const { data, error } = await supabase
        .from('foros')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) {
        await Promise.all(data.map(async (foro) => {
          await db.cache.put({
            key: `foro-${foro.id}`,
            data: foro,
            expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
            created_at: new Date().toISOString()
          })
        }))
        return data
      }
    }
  } catch (err) {
    console.warn('⚠️ Error obteniendo foros de Supabase, usando cache:', err)
  }
  // Fallback a cache local
  const cached = await db.cache.where('key').startsWith('foro-').toArray()
  return cached.map(c => c.data)
}

export async function createForo(data: Partial<Forum>): Promise<Forum> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const foro: Forum = {
    id,
    nombre: data.titulo || data.nombre || 'Foro sin nombre',
    titulo: data.titulo,
    descripcion: data.descripcion,
    tipo: data.tipo || 'general',
    activo: data.activo !== undefined ? data.activo : true,
    usuarios_asignados: data.usuarios_asignados || [],
    created_at: now,
    updated_at: now
  }
  await db.cache.put({
    key: `foro-${id}`,
    data: foro,
    expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    created_at: now
  })
  if (isOnline()) {
    try {
      const { data: res, error } = await supabase
        .from('foros')
        .insert({
          id,
          titulo: foro.titulo,
          descripcion: foro.descripcion,
          usuarios_asignados: foro.usuarios_asignados,
          created_at: foro.created_at,
          updated_at: foro.updated_at
        })
        .select()
        .single()
      if (error) {
        console.error('❌ Error creando foro en Supabase:', error)
        throw new Error(`Error de Supabase: ${error.message}. ¿Ya aplicaste la migración 20251107_foros_table.sql?`)
      }
      if (res) {
        await db.cache.put({
          key: `foro-${id}`,
          data: res,
          expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
          created_at: now
        })
        console.log('✅ Foro creado en Supabase:', res)
        return res
      }
    } catch (err: any) {
      console.error('⚠️ Error creando foro:', err)
      throw err
    }
  }
  console.log('📴 Foro guardado offline (sin conexión)')
  return foro
}

export async function updateForo(id: string, data: Partial<Forum>): Promise<Forum> {
  const now = new Date().toISOString()
  const cached = await db.cache.get(`foro-${id}`)
  const foro: Forum = {
    id,
    nombre: data.nombre ?? data.titulo ?? cached?.data.titulo ?? cached?.data.nombre ?? 'Foro sin nombre',
    titulo: data.titulo ?? cached?.data.titulo,
    descripcion: data.descripcion ?? cached?.data.descripcion,
    tipo: data.tipo ?? cached?.data.tipo ?? 'general',
    activo: data.activo ?? cached?.data.activo ?? true,
    usuarios_asignados: data.usuarios_asignados ?? cached?.data.usuarios_asignados ?? [],
    created_at: cached?.data.created_at ?? now,
    updated_at: now
  }
  await db.cache.put({
    key: `foro-${id}`,
    data: foro,
    expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    created_at: foro.created_at || now
  })
  if (isOnline()) {
    try {
      const { data: res, error } = await supabase
        .from('foros')
        .update({
          titulo: foro.titulo,
          descripcion: foro.descripcion,
          usuarios_asignados: foro.usuarios_asignados,
          updated_at: foro.updated_at
        })
        .eq('id', id)
        .select()
        .single()
      if (!error && res) {
        await db.cache.put({
          key: `foro-${id}`,
          data: res,
          expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
          created_at: foro.created_at || now
        })
        // Notificar usuarios asignados
        await notifyForoUpdate(res)
        return res
      }
    } catch (err) {
      console.warn('⚠️ Error actualizando foro en Supabase:', err)
    }
  }
  return foro
}

export async function notifyForoUpdate(foro: Forum) {
  if (!foro.usuarios_asignados || foro.usuarios_asignados.length === 0) return
  await notificationService.sendNotification({
    title: `Foro actualizado: ${foro.titulo}`,
    message: `El foro "${foro.titulo}" fue actualizado.`,
    target_type: 'user',
    target_user_ids: foro.usuarios_asignados,
    type: 'info',
    priority: 'normal',
    metadata: { foroId: foro.id }
  })
}
