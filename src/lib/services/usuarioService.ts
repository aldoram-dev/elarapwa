import { Usuario } from '@/types/usuario'
import { supabase, SUPABASE_URL } from '@/lib/core/supabaseClient'
import { db } from '@/db/database'

const isOnline = () => navigator.onLine

export async function fetchUsuarios(): Promise<Usuario[]> {
  try {
    // Intentar primero desde Supabase si hay conexión
    if (isOnline()) {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('name', { ascending: true })
      
      if (!error && data) {
        console.log('📊 Datos crudos de perfiles (online):', data)
        
        // Mapear campos de BD a interfaz Usuario
        const usuarios = data.map(perfil => ({
          id: perfil.id,
          email: perfil.email,
          nombre: perfil.name,
          telefono: perfil.telefono,
          avatar_url: perfil.avatar_url,
          contratista_id: perfil.contratista_id,
          nivel: perfil.nivel,
          active: perfil.active,
          created_at: perfil.created_at,
          updated_at: perfil.updated_at
        }))
        
        // Guardar en IndexedDB para uso offline
        await Promise.all(usuarios.map(async (usuario) => {
          await db.usuarios.put({
            ...usuario,
            _dirty: false,
            last_sync: new Date().toISOString()
          })
        }))
        
        console.log('👥 Usuarios mapeados y guardados en IndexedDB:', usuarios)
        return usuarios
      }
    }
  } catch (err) {
    console.warn('⚠️ Error obteniendo usuarios de Supabase, usando IndexedDB:', err)
  }
  
  // Fallback a IndexedDB si no hay conexión o falla Supabase
  console.log('📱 Cargando usuarios desde IndexedDB (offline)')
  const usuariosDB = await db.getActiveUsuarios() // Trae todos (activos e inactivos)
  return usuariosDB.map(u => ({
    id: u.id,
    email: u.email,
    nombre: u.nombre,
    telefono: u.telefono,
    avatar_url: u.avatar_url,
    contratista_id: u.contratista_id,
    nivel: u.nivel,
    active: u.active,
    created_at: u.created_at,
    updated_at: u.updated_at
  }))
}

export async function fetchUsuario(id: string): Promise<Usuario | null> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  
  return {
    id: data.id,
    email: data.email,
    nombre: data.name,
    telefono: data.telefono,
    avatar_url: data.avatar_url,
    contratista_id: data.contratista_id,
    nivel: data.nivel,
    active: data.active,
    created_at: data.created_at,
    updated_at: data.updated_at
  }
}

/**
 * Crea un nuevo usuario usando la Edge Function (admin)
 * Esto evita que el usuario que crea quede auto-logueado
 */
export async function createUsuario(data: Partial<Usuario> & { password: string }): Promise<Usuario> {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('No hay sesión activa')
  }

  // Llamar a la Edge Function
  const payload = {
    email: data.email,
    password: data.password,
    nombre: data.nombre,
    telefono: data.telefono,
    contratista_id: data.contratista_id,  // ID del contratista
    roles: data.roles,                     // Array de roles
    nivel: data.nivel,
    avatar_url: data.avatar_url
  }
  
  console.log('📤 Enviando datos a create-user:', payload)

  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-user`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Error creando usuario')
  }

  return result.user
}

export async function updateUsuario(id: string, data: Partial<Usuario>): Promise<Usuario> {
  const updated_at = new Date().toISOString()
  
  // Primero guardar en IndexedDB (offline-first)
  const existingUser = await db.usuarios.get(id)
  const updatedUser: Usuario = {
    id,
    email: existingUser?.email || '',
    nombre: data.nombre ?? existingUser?.nombre ?? '',
    telefono: data.telefono ?? existingUser?.telefono,
    avatar_url: data.avatar_url ?? existingUser?.avatar_url,
    contratista_id: data.contratista_id ?? existingUser?.contratista_id,
    nivel: data.nivel ?? existingUser?.nivel,
    roles: data.roles ?? existingUser?.roles,
    active: data.active ?? existingUser?.active ?? true,
    created_at: existingUser?.created_at || updated_at,
    updated_at
  }
  
  await db.usuarios.put({
    ...updatedUser,
    _dirty: true, // Marcar para sincronización
    last_sync: existingUser?.last_sync
  })
  
  console.log('💾 Usuario actualizado en IndexedDB:', updatedUser)
  
  // Intentar sincronizar con Supabase si hay conexión
  if (isOnline()) {
    try {
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .update({
          name: data.nombre,
          telefono: data.telefono,
          avatar_url: data.avatar_url,
          contratista_id: data.contratista_id,
          nivel: data.nivel,
          active: data.active,
        })
        .eq('id', id)
        .select()
        .single()
      
      if (!error && usuario) {
        // Marcar como sincronizado
        await db.usuarios.update(id, { 
          _dirty: false, 
          last_sync: new Date().toISOString() 
        })
        console.log('☁️ Usuario sincronizado con Supabase')
        
        return {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.name,
          telefono: usuario.telefono,
          avatar_url: usuario.avatar_url,
          contratista_id: usuario.contratista_id,
          nivel: usuario.nivel,
          active: usuario.active,
          created_at: usuario.created_at,
          updated_at: usuario.updated_at
        }
      }
    } catch (err) {
      console.warn('⚠️ Error sincronizando con Supabase, cambios guardados localmente:', err)
    }
  } else {
    console.log('📱 Sin conexión, cambios guardados localmente para sync posterior')
  }
  
  return updatedUser
}

export async function deleteUsuario(id: string): Promise<void> {
  // Soft delete en IndexedDB
  await db.usuarios.update(id, {
    active: false,
    _dirty: true,
    updated_at: new Date().toISOString()
  })
  
  console.log('💾 Usuario desactivado en IndexedDB')
  
  // Intentar sincronizar con Supabase si hay conexión
  if (isOnline()) {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ active: false })
        .eq('id', id)
      
      if (!error) {
        await db.usuarios.update(id, { 
          _dirty: false, 
          last_sync: new Date().toISOString() 
        })
        console.log('☁️ Desactivación sincronizada con Supabase')
      }
    } catch (err) {
      console.warn('⚠️ Error sincronizando desactivación, se sincronizará después:', err)
    }
  }
}

/**
 * Envía email para resetear password
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // Unificar con ruta configurada en Supabase: /reset
    redirectTo: `${window.location.origin}/reset`,
  })
  
  if (error) throw error
}
