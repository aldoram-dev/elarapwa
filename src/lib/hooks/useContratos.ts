import { useState, useEffect } from 'react'
import { supabase } from '@/lib/core/supabaseClient'
import { Contrato } from '@/types/contrato'
import { useAuth } from '@/context/AuthContext'
import { db } from '@/db/database'

export function useContratos(proyectoId?: string) {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  // Cargar contratos
  const fetchContratos = async () => {
    try {
      setLoading(true)
      setError(null)

      // Obtener info del usuario actual desde la BD
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('id, contratista_id')
        .eq('id', user?.id)
        .single()

      // Obtener roles del usuario
      const { data: rolesData } = await supabase
        .from('roles_usuario')
        .select('roles!inner(name)')
        .eq('user_id', user?.id)

      const roles = rolesData?.map((r: any) => r.roles.name) || []
      const esContratista = roles.some((rol: string) => rol.toLowerCase() === 'contratista')

      console.log('[useContratos] Usuario:', user?.id)
      console.log('[useContratos] Roles:', roles)
      console.log('[useContratos] Es Contratista?', esContratista)
      console.log('[useContratos] contratista_id del usuario:', usuarioData?.contratista_id)

      let query = supabase
        .from('contratos')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })

      if (proyectoId) {
        query = query.eq('proyecto_id', proyectoId)
      }

      // Si es contratista, filtrar por su contratista_id
      if (esContratista) {
        if (!usuarioData?.contratista_id) {
          console.log('[useContratos] ⚠️ Usuario contratista SIN contratista_id - no verá contratos')
          setContratos([])
          setLoading(false)
          return
        }

        console.log('[useContratos] 🎯 Filtrando contratos por contratista_id:', usuarioData.contratista_id)
        query = query.eq('contratista_id', usuarioData.contratista_id)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      console.log('[useContratos] 📦 Contratos obtenidos:', data?.length)

      // Sincronizar contratos a IndexedDB
      if (data && data.length > 0) {
        for (const contrato of data) {
          await db.contratos.put({
            ...contrato,
            _dirty: false,
            created_at: contrato.created_at || new Date().toISOString(),
            updated_at: contrato.updated_at || new Date().toISOString(),
          })
        }
        console.log(`✅ Sincronizados ${data.length} contratos a IndexedDB`)
      }

      setContratos(data || [])
    } catch (err: any) {
      console.error('Error al cargar contratos:', err)
      setError(err.message || 'Error al cargar contratos')
    } finally {
      setLoading(false)
    }
  }

  // Crear contrato
  const createContrato = async (contrato: Partial<Contrato>) => {
    try {
      setError(null)

      const newContrato = {
        ...contrato,
        created_by: user?.id,
      }

      const { data, error: insertError } = await supabase
        .from('contratos')
        .insert(newContrato)
        .select()
        .single()

      if (insertError) throw insertError

      // También guardar en IndexedDB local
      await db.contratos.put({
        ...data,
        _dirty: false,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
      })

      setContratos([data, ...contratos])
      return { data, error: null }
    } catch (err: any) {
      console.error('Error al crear contrato:', err)
      const errorMsg = err.message || 'Error al crear contrato'
      setError(errorMsg)
      return { data: null, error: errorMsg }
    }
  }

  // Actualizar contrato
  const updateContrato = async (id: string, updates: Partial<Contrato>) => {
    try {
      setError(null)

      const { data, error: updateError } = await supabase
        .from('contratos')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      // También actualizar en IndexedDB local
      await db.contratos.update(id, {
        ...updates,
        updated_at: data.updated_at || new Date().toISOString(),
      })

      setContratos(contratos.map(c => c.id === id ? data : c))
      return { data, error: null }
    } catch (err: any) {
      console.error('Error al actualizar contrato:', err)
      const errorMsg = err.message || 'Error al actualizar contrato'
      setError(errorMsg)
      return { data: null, error: errorMsg }
    }
  }

  // Eliminar contrato (soft delete)
  const deleteContrato = async (id: string) => {
    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from('contratos')
        .update({ active: false })
        .eq('id', id)

      if (deleteError) throw deleteError

      setContratos(contratos.filter(c => c.id !== id))
      return { error: null }
    } catch (err: any) {
      console.error('Error al eliminar contrato:', err)
      const errorMsg = err.message || 'Error al eliminar contrato'
      setError(errorMsg)
      return { error: errorMsg }
    }
  }

  // Obtener un contrato por ID
  const getContratoById = async (id: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('contratos')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      return { data, error: null }
    } catch (err: any) {
      console.error('Error al obtener contrato:', err)
      return { data: null, error: err.message }
    }
  }

  useEffect(() => {
    fetchContratos()

    // Suscripción a cambios en tiempo real
    const channel = supabase
      .channel('contratos_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contratos',
        },
        (payload) => {
          console.log('Cambio en contratos:', payload)
          fetchContratos()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [proyectoId])

  return {
    contratos,
    loading,
    error,
    createContrato,
    updateContrato,
    deleteContrato,
    getContratoById,
    refetch: fetchContratos,
  }
}
