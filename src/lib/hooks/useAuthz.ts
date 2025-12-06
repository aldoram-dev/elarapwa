/**
 * Hook unificado de autorización (Authorization)
 * Centraliza TODA la lógica de permisos en un solo lugar
 * 
 * Reemplaza:
 * - usePermissions
 * - useRoles (parcialmente)
 * - permissions-config (lógica dispersa)
 */

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { ReactNode } from 'react';

// ============================================
// DEFINICIÓN DE ROLES
// ============================================

export const ROLES = {
  GERENTE_PLATAFORMA: 'Gerente Plataforma',
  GERENCIA: 'Gerencia',
  DESARROLLADOR: 'Desarrollador',
  SISTEMAS: 'Sistemas',
  SUPERVISOR_ELARA: 'Supervisor Elara',
  ADMINISTRACION: 'Administración',
  FINANZAS: 'Finanzas',
  CONTRATISTA: 'CONTRATISTA',
  USUARIO: 'USUARIO',
} as const;

// Grupos de roles con permisos específicos
export const ROLE_GROUPS = {
  ADMIN: [
    ROLES.GERENTE_PLATAFORMA,
    ROLES.SISTEMAS,
    ROLES.DESARROLLADOR,
  ],
  GESTION_CONTRATOS: [
    ROLES.GERENTE_PLATAFORMA,
    ROLES.GERENCIA,
    ROLES.SISTEMAS,
    ROLES.DESARROLLADOR,
    ROLES.ADMINISTRACION,
  ],
  FINANZAS: [
    ROLES.GERENTE_PLATAFORMA,
    ROLES.SISTEMAS,
    ROLES.FINANZAS,
  ],
  APROBADORES: [
    ROLES.GERENTE_PLATAFORMA,
    ROLES.GERENCIA,
    ROLES.SISTEMAS,
    ROLES.DESARROLLADOR,
    ROLES.ADMINISTRACION,
    ROLES.SUPERVISOR_ELARA,
    ROLES.FINANZAS,
  ],
  READONLY: [
    ROLES.CONTRATISTA,
    ROLES.USUARIO,
  ],
} as const;

// ============================================
// DEFINICIÓN DE MÓDULOS Y ACCIONES
// ============================================

export type ModuloSistema = 
  | 'contratistas'
  | 'contratos'
  | 'catalogos'
  | 'cambios_contrato'
  | 'requisiciones'
  | 'solicitudes'
  | 'pagos'
  | 'estado_cuenta'
  | 'configuracion'
  | 'usuarios';

export type Accion = 'view' | 'create' | 'edit' | 'delete' | 'approve';

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useAuthz() {
  const { perfil, user } = useAuth();

  // Obtener roles del usuario (preferir perfil, fallback a user_metadata)
  const userRoles = useMemo(() => {
    return perfil?.roles || user?.user_metadata?.roles || [];
  }, [perfil, user]);

  // Verificar si el usuario tiene al menos uno de los roles especificados
  const hasRole = (roles: string | string[]): boolean => {
    if (!perfil && !user) return false;
    const rolesToCheck = Array.isArray(roles) ? roles : [roles];
    return userRoles.some((role: string) => rolesToCheck.includes(role));
  };

  // Verificar si el usuario tiene todos los roles especificados
  const hasAllRoles = (roles: string[]): boolean => {
    if (!perfil && !user) return false;
    return roles.every(role => userRoles.includes(role));
  };

  // Verificar si el usuario pertenece a un grupo de roles
  const hasRoleGroup = (group: keyof typeof ROLE_GROUPS): boolean => {
    return hasRole([...ROLE_GROUPS[group]]);
  };

  // ============================================
  // PERMISOS POR MÓDULO
  // ============================================

  const canAccessModule = (modulo: ModuloSistema, accion: Accion): boolean => {
    if (!perfil && !user) return false;

    // Admins pueden hacer todo
    if (hasRoleGroup('ADMIN')) return true;

    // Permisos específicos por módulo
    switch (modulo) {
      case 'contratistas':
        if (accion === 'view') return hasRoleGroup('GESTION_CONTRATOS') || hasRole(ROLES.SUPERVISOR_ELARA);
        if (accion === 'create' || accion === 'edit' || accion === 'delete') return hasRoleGroup('GESTION_CONTRATOS');
        return false;

      case 'contratos':
        if (accion === 'view') return hasRoleGroup('GESTION_CONTRATOS') || hasRole(ROLES.CONTRATISTA) || hasRole(ROLES.FINANZAS);
        if (accion === 'create' || accion === 'edit') return hasRoleGroup('GESTION_CONTRATOS');
        if (accion === 'delete') return hasRoleGroup('ADMIN');
        return false;

      case 'catalogos':
        if (accion === 'view') return true; // Todos pueden ver catálogos de sus contratos
        if (accion === 'create' || accion === 'edit') return hasRole(ROLES.CONTRATISTA) || hasRoleGroup('GESTION_CONTRATOS');
        if (accion === 'approve') return hasRoleGroup('APROBADORES') && !hasRole(ROLES.CONTRATISTA);
        return false;

      case 'cambios_contrato':
        if (accion === 'view') return true; // Todos pueden ver cambios
        if (accion === 'create' || accion === 'edit') return hasRoleGroup('GESTION_CONTRATOS') && !hasRole(ROLES.CONTRATISTA);
        if (accion === 'approve') return hasRole([ROLES.DESARROLLADOR, ROLES.GERENTE_PLATAFORMA, ROLES.SISTEMAS]);
        return false;

      case 'requisiciones':
        if (accion === 'view') return true; // Todos pueden ver requisiciones de sus contratos
        if (accion === 'create' || accion === 'edit') return hasRole(ROLES.CONTRATISTA) || hasRoleGroup('GESTION_CONTRATOS');
        if (accion === 'delete') return hasRole(ROLES.CONTRATISTA) || hasRoleGroup('ADMIN');
        return false;

      case 'solicitudes':
        if (accion === 'view') return true; // Todos pueden ver solicitudes
        if (accion === 'create' || accion === 'edit') return hasRoleGroup('GESTION_CONTRATOS') || hasRoleGroup('FINANZAS');
        if (accion === 'approve') return hasRole([ROLES.DESARROLLADOR, ROLES.FINANZAS, ROLES.GERENTE_PLATAFORMA, ROLES.SISTEMAS]);
        return false;

      case 'pagos':
        if (accion === 'view') return true; // Todos pueden ver pagos
        if (accion === 'create' || accion === 'edit') return hasRoleGroup('FINANZAS') || hasRoleGroup('GESTION_CONTRATOS');
        return false;

      case 'estado_cuenta':
        return accion === 'view'; // Todos pueden ver estado de cuenta

      case 'configuracion':
        return hasRoleGroup('ADMIN');

      case 'usuarios':
        if (accion === 'view') return hasRoleGroup('ADMIN');
        if (accion === 'create' || accion === 'edit' || accion === 'delete') return hasRoleGroup('ADMIN');
        return false;

      default:
        return false;
    }
  };

  // ============================================
  // PERMISOS ESPECÍFICOS
  // ============================================

  const isAdmin = (): boolean => hasRoleGroup('ADMIN');
  const isContratista = (): boolean => hasRole([ROLES.CONTRATISTA, ROLES.USUARIO]);
  const isFinanzas = (): boolean => hasRole(ROLES.FINANZAS) || hasRoleGroup('ADMIN');

  const canApproveContract = (): boolean => hasRoleGroup('APROBADORES') && !isContratista();
  const canApproveChanges = (): boolean => hasRole([ROLES.DESARROLLADOR, ROLES.GERENTE_PLATAFORMA, ROLES.SISTEMAS]);
  const canApprovePayment = (): boolean => hasRole([ROLES.DESARROLLADOR, ROLES.FINANZAS, ROLES.GERENTE_PLATAFORMA, ROLES.SISTEMAS]);

  const canManageUsers = (): boolean => hasRoleGroup('ADMIN');
  const canAccessConfig = (): boolean => hasRoleGroup('ADMIN');

  // ============================================
  // UTILIDADES
  // ============================================

  const getContratistaId = (): string | null => {
    return perfil?.contratista_id || null;
  };

  const canAccessRoute = (route: string): boolean => {
    if (!perfil && !user) return false;

    // Rutas públicas (después de login)
    const publicRoutes = ['/', '/inicio', '/home', '/dashboard'];
    if (publicRoutes.includes(route)) return true;

    // Mapeo de rutas a módulos
    const routeModuleMap: Record<string, ModuloSistema> = {
      '/obra/contratistas': 'contratistas',
      '/obra/contratos': 'contratos',
      '/obra/requisiciones-pago': 'requisiciones',
      '/obra/solicitudes-pago': 'solicitudes',
      '/obra/registro-pagos': 'pagos',
      '/obra/estado-cuenta': 'estado_cuenta',
      '/configuracion': 'configuracion',
      '/config/usuarios': 'usuarios',
    };

    // Buscar coincidencia de ruta
    for (const [path, modulo] of Object.entries(routeModuleMap)) {
      if (route.startsWith(path)) {
        return canAccessModule(modulo, 'view');
      }
    }

    // Por defecto, permitir acceso si está autenticado
    return true;
  };

  // ============================================
  // RETORNO DEL HOOK
  // ============================================

  return {
    // Estado básico
    userRoles,
    perfil,
    user,

    // Verificación de roles
    hasRole,
    hasAllRoles,
    hasRoleGroup,

    // Permisos por módulo
    canAccessModule,
    canAccessRoute,

    // Identificadores de rol
    isAdmin,
    isContratista,
    isFinanzas,

    // Permisos específicos de aprobación
    canApproveContract,
    canApproveChanges,
    canApprovePayment,

    // Permisos de gestión
    canManageUsers,
    canAccessConfig,

    // Utilidades
    getContratistaId,

    // Constantes exportadas
    ROLES,
    ROLE_GROUPS,
  };
}

// ============================================
// TIPOS PARA COMPONENTE DE PROTECCIÓN
// ============================================
// NOTA: El componente RequireAuthz debe crearse en un archivo .tsx separado
// debido a que este archivo es .ts y no soporta JSX

export interface RequireAuthzProps {
  modulo: ModuloSistema;
  accion: Accion;
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

/**
 * Para crear el componente RequireAuthz, usa este código en un archivo .tsx:
 * 
 * import React from 'react';
 * import { Navigate } from 'react-router-dom';
 * import { Alert, Container } from '@mui/material';
 * import { useAuthz, RequireAuthzProps } from '@/lib/hooks/useAuthz';
 * 
 * export const RequireAuthz: React.FC<RequireAuthzProps> = ({
 *   modulo,
 *   accion,
 *   children,
 *   fallback,
 *   redirectTo,
 * }) => {
 *   const { canAccessModule } = useAuthz();
 * 
 *   if (!canAccessModule(modulo, accion)) {
 *     if (redirectTo) {
 *       return <Navigate to={redirectTo} replace />;
 *     }
 * 
 *     if (fallback) {
 *       return <>{fallback}</>;
 *     }
 * 
 *     return (
 *       <Container maxWidth="md" sx={{ mt: 4 }}>
 *         <Alert severity="error">
 *           No tienes permisos para {accion === 'view' ? 'ver' : 'acceder a'} este módulo.
 *         </Alert>
 *       </Container>
 *     );
 *   }
 * 
 *   return <>{children}</>;
 * };
 */
