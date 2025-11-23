/**
 * Wrapper simplificado para proteger subsecciones específicas
 * Sistema simple: Administrador vs Usuario
 */

import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface PermissionGateProps {
  /** Recurso a verificar */
  resource: string;
  /** Acción requerida */
  action: 'view' | 'create' | 'edit' | 'delete' | string;
  /** Contenido a mostrar cuando NO hay permiso */
  fallback?: React.ReactNode;
  /** Hijos a renderizar si el usuario tiene permiso */
  children: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  resource,
  action,
  fallback = null,
  children,
}) => {
  const { user, perfil } = useAuth();

  // Admin tiene todos los permisos
  if (perfil?.nivel === 'Administrador') {
    return <>{children}</>;
  }

  // Usuario solo tiene acceso a inicio y perfil (view)
  const allowedResources = ['inicio', 'perfil'];
  const resourceBase = resource.split('.')[0];
  
  if (action === 'view' && allowedResources.includes(resourceBase)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

/**
 * Hook simplificado para verificar permisos programáticamente
 */
export function usePermissionCheck() {
  const { user, perfil } = useAuth();

  function checkPermission(resource: string, action: string): boolean {
    if (!user) return false;
    
    // Admin tiene todos los permisos
    if (perfil?.nivel === 'Administrador') return true;
    
    // Usuario solo tiene acceso a inicio y perfil (view)
    const allowedResources = ['inicio', 'perfil'];
    const resourceBase = resource.split('.')[0];
    
    return action === 'view' && allowedResources.includes(resourceBase);
  }

  return { checkPermission };
}
