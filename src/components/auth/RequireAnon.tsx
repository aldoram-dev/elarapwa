import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@context/AuthContext'

export const RequireAnon: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { loading, user } = useAuth()
  const loc = useLocation()

  if (loading) return null // o un pequeño spinner si prefieres

  // Si ya está logueado, lo redirige a la última ruta conocida o al inicio
  if (user) {
    const redirect = (loc.state as any)?.from ?? '/inicio'
    return <Navigate to={redirect} replace />
  }

  // Si no está logueado, deja pasar
  return <>{children}</>
}
