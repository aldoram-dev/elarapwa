import { useEffect, useRef } from 'react'
import { useUsuarioStore } from '../../stores/usuarioStore'
import { supabase } from '../core/supabaseClient'

export function useUsuarios() {
  const usuarios = useUsuarioStore(state => state.usuarios)
  const loading = useUsuarioStore(state => state.loading)
  const fetchUsuarios = useUsuarioStore(state => state.fetchUsuarios)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    // Solo fetch si no hay canal activo (evita duplicados en re-renders)
    if (!channelRef.current) {
      console.log('🔄 Inicializando useUsuarios hook')
      fetchUsuarios()

      // Suscripción realtime a cambios en la tabla perfiles
      const channel = supabase
        .channel('perfiles-changes')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'perfiles' 
        },
          (payload) => {
            console.log('🔄 Cambio en perfiles detectado:', payload.eventType)
            // Store tiene cache y dedup, no se refetch innecesariamente
            fetchUsuarios()
          }
        )
        .subscribe((status) => {
          console.log('📡 Estado de suscripción realtime:', status)
        })

      channelRef.current = channel
    }

    // Cleanup al desmontar el componente
    return () => {
      if (channelRef.current) {
        console.log('🔌 Desconectando suscripción realtime')
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, []) // Sin dependencias: solo se ejecuta en mount/unmount

  return { usuarios, loading }
}
