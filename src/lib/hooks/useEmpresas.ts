import { useEffect } from 'react'
import { useEmpresaStore } from '../../stores/empresaStore'

export function useEmpresas() {
  const empresas = useEmpresaStore(state => state.empresas)
  const loading = useEmpresaStore(state => state.loading)
  const fetchEmpresas = useEmpresaStore(state => state.fetchEmpresas)

  useEffect(() => {
    console.log('🔄 Inicializando useEmpresas hook')
    fetchEmpresas()
  }, []) // Sin dependencias: store tiene cache y dedup

  return { empresas, loading }
}
