import { Empresa } from '@/types/empresa'
import { supabase } from '@/lib/core/supabaseClient'
import { db } from '@/db/database'

const isOnline = () => navigator.onLine

export async function fetchEmpresas(): Promise<Empresa[]> {
  try {
    // Intentar desde Supabase si hay conexión
    if (isOnline()) {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('nombre', { ascending: true })
      
      if (!error && data) {
        console.log('📊 Empresas desde Supabase (online):', data.length)
        
        // Transformar y guardar en IndexedDB
        const empresas = data.map(empresa => ({
          ...empresa,
          logo: empresa.logo_url ? {
            id: `logo-${empresa.id}`,
            nombre: `logo-${empresa.nombre}`,
            path: empresa.logo_url,
            url: empresa.logo_url,
            bucket: 'documents',
            isPublic: true
          } : undefined
        }))
        
        // Guardar en IndexedDB
        await Promise.all(empresas.map(async (empresa) => {
          await db.empresas.put({
            id: empresa.id!,
            nombre: empresa.nombre,
            telefono: empresa.telefono,
            correo: empresa.correo,
            logo_url: empresa.logo_url,
            metadata: empresa.metadata,
            created_at: empresa.created_at,
            updated_at: empresa.updated_at,
            _dirty: false,
            last_sync: new Date().toISOString()
          })
        }))
        
        return empresas
      }
    }
  } catch (err) {
    console.warn('⚠️ Error obteniendo empresas de Supabase, usando IndexedDB:', err)
  }
  
  // Fallback a IndexedDB
  console.log('📱 Cargando empresas desde IndexedDB (offline)')
  const empresasDB = await db.empresas.filter(e => !e._deleted).toArray()
  return empresasDB.map(e => ({
    id: e.id,
    nombre: e.nombre,
    telefono: e.telefono,
    correo: e.correo,
    logo_url: e.logo_url,
    metadata: e.metadata,
    created_at: e.created_at,
    updated_at: e.updated_at,
    logo: e.logo_url ? {
      id: `logo-${e.id}`,
      nombre: `logo-${e.nombre}`,
      path: e.logo_url,
      url: e.logo_url,
      bucket: 'documents',
      isPublic: true
    } : undefined
  }))
}

export async function createEmpresa(data: Partial<Empresa>): Promise<Empresa> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  
  const newEmpresa: Empresa = {
    id,
    nombre: data.nombre!,
    telefono: data.telefono,
    correo: data.correo,
    logo_url: data.logo_url,
    metadata: data.metadata,
    created_at: now,
    updated_at: now
  }
  
  // Guardar primero en IndexedDB
  await db.empresas.put({
    ...newEmpresa,
    _dirty: true,
    last_sync: undefined
  })
  
  console.log('💾 Empresa creada en IndexedDB:', newEmpresa)
  
  // Intentar sincronizar con Supabase si hay conexión
  if (isOnline()) {
    try {
      const { data: empresa, error } = await supabase
        .from('empresas')
        .insert({
          id,
          nombre: data.nombre,
          telefono: data.telefono,
          correo: data.correo,
          logo_url: data.logo_url,
          metadata: data.metadata,
        })
        .select()
        .single()
      
      if (!error && empresa) {
        await db.empresas.update(id, { 
          _dirty: false, 
          last_sync: new Date().toISOString(),
          ...empresa
        })
        console.log('☁️ Empresa sincronizada con Supabase')
        
        return {
          ...empresa,
          logo: empresa.logo_url ? {
            id: `logo-${empresa.id}`,
            nombre: `logo-${empresa.nombre}`,
            path: empresa.logo_url,
            url: empresa.logo_url,
            bucket: 'documents',
            isPublic: true
          } : undefined
        }
      }
    } catch (err) {
      console.warn('⚠️ Error sincronizando empresa, se guardó localmente:', err)
    }
  }
  
  return newEmpresa;
}

export async function updateEmpresa(id: string, data: Partial<Empresa>): Promise<Empresa> {
  const existing = await db.empresas.get(id)
  const updated_at = new Date().toISOString()
  
  const updatedEmpresa: Empresa = {
    id,
    nombre: data.nombre ?? existing?.nombre!,
    telefono: data.telefono ?? existing?.telefono,
    correo: data.correo ?? existing?.correo,
    logo_url: data.logo_url ?? existing?.logo_url,
    metadata: data.metadata ?? existing?.metadata,
    created_at: existing?.created_at || updated_at,
    updated_at
  }
  
  // Actualizar en IndexedDB
  await db.empresas.put({
    ...updatedEmpresa,
    _dirty: true,
    last_sync: existing?.last_sync
  })
  
  console.log('💾 Empresa actualizada en IndexedDB:', updatedEmpresa)
  
  // Intentar sincronizar con Supabase si hay conexión
  if (isOnline()) {
    try {
      const { data: empresa, error } = await supabase
        .from('empresas')
        .update({
          nombre: data.nombre,
          telefono: data.telefono,
          correo: data.correo,
          logo_url: data.logo_url,
          metadata: data.metadata,
        })
        .eq('id', id)
        .select()
        .single()
      
      if (!error && empresa) {
        await db.empresas.update(id, { 
          _dirty: false, 
          last_sync: new Date().toISOString() 
        })
        console.log('☁️ Empresa sincronizada con Supabase')
        
        return {
          ...empresa,
          logo: empresa.logo_url ? {
            id: `logo-${empresa.id}`,
            nombre: `logo-${empresa.nombre}`,
            path: empresa.logo_url,
            url: empresa.logo_url,
            bucket: 'documents',
            isPublic: true
          } : undefined
        }
      }
    } catch (err) {
      console.warn('⚠️ Error sincronizando empresa:', err)
    }
  }
  
  return updatedEmpresa;
}

export async function deleteEmpresa(id: string): Promise<void> {
  // Soft delete en IndexedDB
  await db.empresas.update(id, {
    _deleted: true,
    _dirty: true,
    updated_at: new Date().toISOString()
  })
  
  console.log('💾 Empresa marcada como eliminada en IndexedDB')
  
  // Intentar sincronizar con Supabase si hay conexión
  if (isOnline()) {
    try {
      const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', id)
      
      if (!error) {
        // Eliminar completamente de IndexedDB tras sync exitoso
        await db.empresas.delete(id)
        console.log('☁️ Empresa eliminada de Supabase e IndexedDB')
      }
    } catch (err) {
      console.warn('⚠️ Error eliminando empresa de Supabase, se sincronizará después:', err)
    }
  }
}
