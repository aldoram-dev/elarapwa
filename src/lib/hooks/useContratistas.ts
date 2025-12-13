import { useState, useEffect } from 'react'
import { supabase } from '@/lib/core/supabaseClient'
import { Contratista, ContratistaInsert, ContratistaUpdate } from '@/types/contratista'
import { useAuth } from '@/context/AuthContext'

export function useContratistas() {
  const [contratistas, setContratistas] = useState<Contratista[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  // Cargar contratistas
  const fetchContratistas = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('contratistas')
        .select('*')
        .eq('active', true)
        .order('nombre', { ascending: true })

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setContratistas(data || [])
    } catch (err: any) {
      console.error('Error al cargar contratistas:', err)
      setError(err.message || 'Error al cargar contratistas')
    } finally {
      setLoading(false)
    }
  }

  // Crear contratista
  const createContratista = async (contratista: ContratistaInsert) => {
    try {
      setError(null)

      const newContratista = {
        ...contratista,
        created_by: user?.id,
      }

      const { data, error: insertError } = await supabase
        .from('contratistas')
        .insert(newContratista)
        .select()
        .single()

      if (insertError) throw insertError

      setContratistas([...contratistas, data])
      return { data, error: null }
    } catch (err: any) {
      console.error('Error al crear contratista:', err)
      const errorMsg = err.message || 'Error al crear contratista'
      setError(errorMsg)
      return { data: null, error: errorMsg }
    }
  }

  // Actualizar contratista
  const updateContratista = async (id: string, updates: ContratistaUpdate) => {
    try {
      setError(null)

      const { data, error: updateError } = await supabase
        .from('contratistas')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      setContratistas(contratistas.map(c => c.id === id ? data : c))
      return { data, error: null }
    } catch (err: any) {
      console.error('Error al actualizar contratista:', err)
      const errorMsg = err.message || 'Error al actualizar contratista'
      setError(errorMsg)
      return { data: null, error: errorMsg }
    }
  }

  // Eliminar contratista (soft delete)
  const deleteContratista = async (id: string) => {
    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from('contratistas')
        .update({ active: false })
        .eq('id', id)

      if (deleteError) throw deleteError

      setContratistas(contratistas.filter(c => c.id !== id))
      return { error: null }
    } catch (err: any) {
      console.error('Error al eliminar contratista:', err)
      const errorMsg = err.message || 'Error al eliminar contratista'
      setError(errorMsg)
      return { error: errorMsg }
    }
  }

  // Obtener un contratista por ID
  const getContratistaById = async (id: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('contratistas')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      return { data, error: null }
    } catch (err: any) {
      console.error('Error al obtener contratista:', err)
      return { data: null, error: err.message }
    }
  }

  useEffect(() => {
    fetchContratistas()

    // Suscripción a cambios en tiempo real
    const channel = supabase
      .channel('contratistas_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contratistas',
        },
        (payload) => {
          console.log('Cambio en contratistas:', payload)
          fetchContratistas()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return {
    contratistas,
    loading,
    error,
    createContratista,
    updateContratista,
    deleteContratista,
    getContratistaById,
    refetch: fetchContratistas,
  }
}
