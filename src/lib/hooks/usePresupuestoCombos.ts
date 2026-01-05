import { useState, useEffect } from 'react'
import { supabase } from '@/lib/core/supabaseClient'

export interface ComboPresupuesto {
  id: string // concatenación única de categoria-partida-subpartida
  categoria: string
  partida: string
  subpartida: string
  label: string // formato: "Categoria - Partida - Subpartida"
}

/**
 * Hook para obtener las combinaciones únicas de categoria-partida-subpartida
 * del presupuesto validado que se subió al sistema
 */
export function usePresupuestoCombos() {
  const [combos, setCombos] = useState<ComboPresupuesto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCombos()
  }, [])

  const fetchCombos = async () => {
    try {
      setLoading(true)
      setError(null)

      // Obtener todas las combinaciones únicas del presupuesto
      const { data, error: fetchError } = await supabase
        .from('presupuestos')
        .select('categoria, partida, subpartida')
        .eq('active', true)

      if (fetchError) throw fetchError

      if (!data || data.length === 0) {
        setCombos([])
        return
      }

      // Crear un Set para eliminar duplicados basado en la combinación completa
      const combosMap = new Map<string, ComboPresupuesto>()

      data.forEach(item => {
        // Crear ID único basado en la combinación
        const id = `${item.categoria}|${item.partida}|${item.subpartida}`.toLowerCase()
        
        // Solo agregar si no existe ya
        if (!combosMap.has(id)) {
          const label = item.subpartida 
            ? `${item.categoria} - ${item.partida} - ${item.subpartida}`
            : `${item.categoria} - ${item.partida}`

          combosMap.set(id, {
            id,
            categoria: item.categoria,
            partida: item.partida,
            subpartida: item.subpartida || '',
            label
          })
        }
      })

      // Convertir el Map a array y ordenar alfabéticamente
      const combosArray = Array.from(combosMap.values()).sort((a, b) => 
        a.label.localeCompare(b.label, 'es-MX')
      )

      console.log('✅ Combos de presupuesto cargados:', combosArray.length)
      setCombos(combosArray)
    } catch (err: any) {
      console.error('Error al cargar combos de presupuesto:', err)
      setError(err.message || 'Error al cargar combinaciones del presupuesto')
    } finally {
      setLoading(false)
    }
  }

  return {
    combos,
    loading,
    error,
    refetch: fetchCombos
  }
}
