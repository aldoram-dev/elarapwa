/**
 * Componente de Protección de Rutas basado en Permisos
 * Usa el hook useAuthz para verificar permisos de módulos y acciones
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Container } from '@mui/material';
import { useAuthz, type RequireAuthzProps } from '@/lib/hooks/useAuthz';

/**
 * Componente que protege contenido basado en permisos de módulo y acción
 * 
 * @example
 * ```tsx
 * <RequireAuthz modulo="contratos" accion="edit">
 *   <Button>Editar Contrato</Button>
 * </RequireAuthz>
 * ```
 */
export const RequireAuthz: React.FC<RequireAuthzProps> = ({
  modulo,
  accion,
  children,
  fallback,
  redirectTo,
}) => {
  const { canAccessModule } = useAuthz();

  // Verificar si el usuario tiene permiso
  if (!canAccessModule(modulo, accion)) {
    // Redirigir a otra ruta si se especifica
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }

    // Mostrar fallback personalizado si se proporciona
    if (fallback) {
      return <>{fallback}</>;
    }

    // Mostrar mensaje de error por defecto
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          No tienes permisos para {accion === 'view' ? 'ver' : 'acceder a'} este módulo.
        </Alert>
      </Container>
    );
  }

  // Si tiene permiso, renderizar children
  return <>{children}</>;
};
