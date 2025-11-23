import { Proyecto } from '@/types/proyecto'
import { supabase } from '@/lib/core/supabaseClient'
import { db } from '@/db/database'

const isOnline = () => navigator.onLine

/**
 * Obtener todos los proyectos (offline-first)
 * Intenta obtener desde Supabase, si falla usa IndexedDB
 */
export async function fetchProyectos(): Promise<Proyecto[]> {
  try {
    // Intentar desde Supabase si hay conexión
    if (isOnline()) {
      const { data, error } = await supabase
        .from('proyectos')
        .select('*')
        .eq('deleted', false)
        .order('orden', { ascending: true })
        .order('nombre', { ascending: true })
      
      if (!error && data) {
        console.log('📊 Proyectos desde Supabase (online):', data.length)
        
        // Guardar en IndexedDB para uso offline
        if (data.length > 0) {
          await db.proyectos.bulkPut(data.map(p => ({
            ...p,
            _dirty: false,
            _deleted: false,
            last_sync: new Date().toISOString()
          })))
        }

        // Mapear portada_url a objeto para UI
        return data.map(p => ({
          ...p,
          portada: p.portada_url
            ? {
                id: `portada-${p.id}`,
                nombre: `portada-${p.nombre}`,
                path: p.portada_url,
                url: p.portada_url,
                bucket: 'documents',
                isPublic: false,
              }
            : undefined,
        }))
      }
    }
  } catch (error) {
    console.warn('⚠️ Error obteniendo proyectos de Supabase, usando IndexedDB:', error)
  }
  
  // Fallback a IndexedDB (modo offline)
  console.log('📱 Cargando proyectos desde IndexedDB (offline)')
  const offlineData = await db.proyectos
    .filter(p => !p._deleted && p.deleted !== true)
    .toArray()
  
  return offlineData.map(p => ({
    ...p,
    portada: p.portada_url
      ? {
          id: `portada-${p.id}`,
          nombre: `portada-${p.nombre}`,
          path: p.portada_url,
          url: p.portada_url,
          bucket: 'documents',
          isPublic: false,
        }
      : undefined,
  }))
}

/**
 * Crear un nuevo proyecto (offline-first)
 * Guarda primero en IndexedDB, luego sincroniza con Supabase
 */
export async function createProyecto(data: Partial<Proyecto>): Promise<Proyecto> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  
  const proyectoData: Proyecto = {
    id,
    nombre: data.nombre!,
    descripcion: data.descripcion,
    empresa_id: data.empresa_id!,
    portada_url: data.portada_url,
    active: data.active ?? true,
    direccion: data.direccion,
    ciudad: data.ciudad,
    estado: data.estado,
    pais: data.pais,
    codigo_postal: data.codigo_postal,
    telefono: data.telefono,
    email: data.email,
    tipo: data.tipo,
    color: data.color,
    icono: data.icono,
    orden: data.orden ?? 0,
    deleted: false,
    deleted_at: null as any,
    created_at: now,
    updated_at: now
  }

  // Guardar primero en IndexedDB
  await db.proyectos.put({
    ...proyectoData,
    _dirty: true,
    _deleted: false,
    last_sync: undefined
  })
  
  console.log('💾 Proyecto creado en IndexedDB:', proyectoData)

  // Intentar sincronizar con Supabase si hay conexión
  if (isOnline()) {
    try {
      const { data: proyecto, error } = await supabase
        .from('proyectos')
        .insert(proyectoData)
        .select()
        .single()
      
      if (!error && proyecto) {
        // Marcar como sincronizado
        await db.proyectos.update(id, {
          ...proyecto,
          _dirty: false,
          last_sync: new Date().toISOString()
        })
        console.log('☁️ Proyecto sincronizado con Supabase')
        
        return proyecto
      }
    } catch (error) {
      console.warn('⚠️ Error sincronizando proyecto, guardado localmente:', error)
    }
  } else {
    console.log('📱 Sin conexión, proyecto guardado localmente para sync posterior')
  }
  
  return proyectoData as Proyecto
}

/**
 * Actualizar un proyecto existente (offline-first)
 * Actualiza primero en IndexedDB, luego sincroniza con Supabase
 */
export async function updateProyecto(id: string, data: Partial<Proyecto>): Promise<Proyecto> {
  const existing = await db.proyectos.get(id)
  const updated_at = new Date().toISOString()
  
  const updateData = {
    nombre: data.nombre,
    descripcion: data.descripcion,
    empresa_id: data.empresa_id,
    portada_url: data.portada_url,
    active: data.active,
    direccion: data.direccion,
    ciudad: data.ciudad,
    estado: data.estado,
    pais: data.pais,
    codigo_postal: data.codigo_postal,
    telefono: data.telefono,
    email: data.email,
    tipo: data.tipo,
    color: data.color,
    icono: data.icono,
    orden: data.orden,
    deleted: data.deleted,
    deleted_at: data.deleted_at,
  }

  // Actualizar en IndexedDB primero
  await db.proyectos.update(id, {
    ...updateData,
    updated_at,
    _dirty: true
  })
  
  console.log('💾 Proyecto actualizado en IndexedDB')

  // Intentar sincronizar con Supabase si hay conexión
  if (isOnline()) {
    try {
      const { data: proyecto, error } = await supabase
        .from('proyectos')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
      
      if (!error && proyecto) {
        // Actualizar con datos sincronizados
        await db.proyectos.update(id, {
          ...proyecto,
          _dirty: false,
          last_sync: new Date().toISOString()
        })
        console.log('☁️ Proyecto sincronizado con Supabase')
        
        return proyecto
      }
    } catch (error) {
      console.warn('⚠️ Error sincronizando proyecto, guardado localmente:', error)
    }
  }
  
  // Retornar datos locales
  const updatedProyecto = await db.proyectos.get(id)
  if (!updatedProyecto) throw new Error('Proyecto not found in offline storage')
  
  return updatedProyecto as Proyecto
}

/**
 * Desactivar un proyecto (soft delete, offline-first)
 * Marca como inactivo primero en IndexedDB, luego sincroniza
 */
export async function deleteProyecto(id: string): Promise<void> {
  const now = new Date().toISOString()
  
  // Marcar como eliminado en IndexedDB primero
  await db.proyectos.update(id, {
    active: false,
    deleted: true,
    deleted_at: now,
    _dirty: true,
    _deleted: true,
    updated_at: now
  })
  
  console.log('💾 Proyecto marcado como eliminado en IndexedDB')
  
  // Intentar sincronizar con Supabase si hay conexión
  if (isOnline()) {
    try {
      const { error } = await supabase
        .from('proyectos')
        .update({ active: false, deleted: true, deleted_at: now })
        .eq('id', id)
      
      if (!error) {
        await db.proyectos.update(id, {
          _dirty: false,
          last_sync: new Date().toISOString()
        })
        console.log('☁️ Eliminación sincronizada con Supabase')
      }
    } catch (error) {
      console.warn('⚠️ Error sincronizando eliminación, se sincronizará después:', error)
    }
  }
}

/**
 * Obtener proyectos activos para el selector
 * Optimizado para el selector del header
 */
export async function fetchProyectosActivos(): Promise<Proyecto[]> {
  try {
    const { data, error } = await supabase
      .from('proyectos')
      .select('*')
      .eq('active', true)
      .eq('deleted', false)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true })
    
    if (error) throw error
    
    return data || []
  } catch (error) {
    console.warn('Error fetching active projects, using offline data:', error)
    
    // Fallback a Dexie
    const offlineData = await db.proyectos
      .filter(p => p.active === true && !p._deleted && p.deleted !== true)
      .toArray()
    
    return offlineData.sort((a, b) => {
      if (a.orden !== b.orden) return (a.orden || 0) - (b.orden || 0)
      return (a.nombre || '').localeCompare(b.nombre || '')
    })
  }
}

/**
 * Sincronizar cambios pendientes de Dexie a Supabase
 */
export async function syncPendingProyectos(): Promise<{ success: number; errors: number }> {
  const dirtyProyectos = await db.proyectos.filter(p => p._dirty === true).toArray()
  
  let success = 0
  let errors = 0
  
  for (const proyecto of dirtyProyectos) {
    try {
      if (proyecto._deleted) {
        // Es una eliminación pendiente
        await supabase
          .from('proyectos')
          .update({ active: false })
          .eq('id', proyecto.id)
      } else if (proyecto.created_at === proyecto.updated_at) {
        // Es una creación pendiente
        const { data, error } = await supabase
          .from('proyectos')
          .insert({
            nombre: proyecto.nombre,
            descripcion: proyecto.descripcion,
            empresa_id: proyecto.empresa_id,
            active: proyecto.active,
            portada_url: proyecto.portada_url,
            direccion: proyecto.direccion,
            ciudad: proyecto.ciudad,
            estado: proyecto.estado,
            pais: proyecto.pais,
            codigo_postal: proyecto.codigo_postal,
            telefono: proyecto.telefono,
            email: proyecto.email,
            tipo: proyecto.tipo,
            color: proyecto.color,
            icono: proyecto.icono,
            orden: proyecto.orden,
            deleted: proyecto.deleted ?? false,
            deleted_at: proyecto.deleted_at ?? null,
          })
          .select()
          .single()
        
        if (error) throw error
        
        // Reemplazar el ID temporal con el real
        await db.proyectos.delete(proyecto.id)
        await db.proyectos.put({
          ...data,
          _dirty: false,
          _deleted: false,
          last_sync: new Date().toISOString()
        })
      } else {
        // Es una actualización pendiente
        await supabase
          .from('proyectos')
          .update({
            nombre: proyecto.nombre,
            descripcion: proyecto.descripcion,
            empresa_id: proyecto.empresa_id,
            active: proyecto.active,
            portada_url: proyecto.portada_url,
            direccion: proyecto.direccion,
            ciudad: proyecto.ciudad,
            estado: proyecto.estado,
            pais: proyecto.pais,
            codigo_postal: proyecto.codigo_postal,
            telefono: proyecto.telefono,
            email: proyecto.email,
            tipo: proyecto.tipo,
            color: proyecto.color,
            icono: proyecto.icono,
            orden: proyecto.orden,
            deleted: proyecto.deleted,
            deleted_at: proyecto.deleted_at,
          })
          .eq('id', proyecto.id)
        
        // Marcar como sincronizado
        await db.proyectos.update(proyecto.id, {
          _dirty: false,
          last_sync: new Date().toISOString()
        })
      }
      
      success++
    } catch (error) {
      console.error('Error syncing proyecto:', proyecto.id, error)
      errors++
    }
  }
  
  return { success, errors }
}
