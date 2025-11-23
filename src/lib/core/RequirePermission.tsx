// src/lib/core/RequirePermission.tsx
import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export const RequirePermission: React.FC<{
  resource: string
  require?: 'view' | 'edit' | 'admin'
  children: React.ReactNode
}> = ({ resource, require = 'view', children }) => {
  const { user, perfil, loading } = useAuth()
  
  // Bypass completo para Administradores - tienen acceso a todo
  if (perfil?.nivel === 'Administrador') {
    return <>{children}</>
  }
  
  // Usuarios básicos solo tienen acceso a inicio y perfil
  // TODO: Implementar sistema de permisos por ruta cuando se diseñe el nuevo sistema

  // Si está cargando, mostrar spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // Si no hay usuario logueado, redirigir al login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Para Usuarios básicos, solo permitir inicio y perfil
  if (perfil?.nivel === 'Usuario') {
    const allowedResources = ['inicio', 'perfil']
    const resourceBase = resource.split('.')[0]
    
    if (!allowedResources.includes(resourceBase)) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Acceso restringido</h3>
            <p className="mt-1 text-sm text-gray-500">
              No tienes permisos para acceder a esta sección
            </p>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}
