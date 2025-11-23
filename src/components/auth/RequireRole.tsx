import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@context/AuthContext'

interface RequireRoleProps {
  allowedNiveles?: string[]      // ej. ['Administrador']
  redirectTo?: string            // ruta de fallback
  children: React.ReactNode
}

/**
 * Protege una sección según el nivel del usuario.
 * Sistema simplificado: solo Administrador o Usuario
 */
export const RequireRole: React.FC<RequireRoleProps> = ({
  allowedNiveles,
  redirectTo = '/inicio',
  children,
}) => {
  const { perfil, loading } = useAuth()

  if (loading) return null

  // Verificar si el nivel del usuario está permitido
  const nivelOk = !allowedNiveles || allowedNiveles.includes(perfil?.nivel ?? '')

  if (!nivelOk) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
