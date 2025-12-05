import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const Center: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <div style={{display:'grid',placeItems:'center',minHeight:'60vh'}}>{children}</div>
)

const Spinner = () => <Center>Verificando sesión…</Center>

const RequireAuth: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { loading, user } = useAuth()
  const loc = useLocation()
  const [showTimeout, setShowTimeout] = useState(false)

  // Detectar timeout prolongado (12s) para ofrecer reintentar
  useEffect(() => {
    if (!loading) {
      setShowTimeout(false)
      return
    }
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('[RequireAuth] Loading prolongado (12s), mostrando mensaje de error')
        setShowTimeout(true)
      }
    }, 12000)
    return () => clearTimeout(timer)
  }, [loading])

  if (loading) {
    if (showTimeout) {
      return (
        <Center>
          <div className="text-center space-y-4">
            <div className="text-slate-700 font-medium">Hubo un problema cargando tu sesión</div>
            <p className="text-sm text-slate-500">Intenta recargar la página o volver a iniciar sesión</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Recargar página
            </button>
          </div>
        </Center>
      )
    }
    return <Spinner />
  }
  
  if (!user) {
    // guarda la ruta para volver tras login
    return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />
  }
  return <>{children}</>
}

export default RequireAuth
