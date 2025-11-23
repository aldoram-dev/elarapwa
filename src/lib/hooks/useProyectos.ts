import { useEffect } from 'react'
import { useProyectoStore } from '../../stores/proyectoStore'

export function useProyectos() {
  const proyectos = useProyectoStore(state => state.proyectos)
  const loading = useProyectoStore(state => state.loading)
  const fetchProyectos = useProyectoStore(state => state.fetchProyectos)

  useEffect(() => {
    console.log('🔄 Inicializando useProyectos hook')
    fetchProyectos()
  }, []) // Sin dependencias: store tiene cache y dedup

  return { proyectos, loading }
}
