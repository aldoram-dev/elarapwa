/**
 * Configuración de permisos por rol
 * Define qué rutas puede ver cada rol del sistema
 */

export interface RoutePermissions {
  allowedRoles: string[];
  description: string;
}

/**
 * Mapeo de rutas a roles permitidos
 */
export const ROUTE_PERMISSIONS: Record<string, RoutePermissions> = {
  '/inicio': {
    allowedRoles: ['*'],
    description: 'Dashboard principal'
  },

  '/obra': {
    allowedRoles: ['Gerente Plataforma', 'Sistemas', 'SISTEMAS', 'Desarrollador', 'DESARROLLADOR', 'ADMINISTRACIÓN', 'Administrador', 'CONTRATISTA', 'Supervisor Elara'],
    description: 'Módulo de obra'
  },

  '/obra/contratistas': {
    allowedRoles: ['Gerente Plataforma', 'Sistemas', 'SISTEMAS', 'Desarrollador', 'DESARROLLADOR', 'ADMINISTRACIÓN', 'Administrador', 'Supervisor Elara'],
    description: 'Gestión de contratistas'
  },
  
  '/obra/contratos': {
    allowedRoles: ['Gerente Plataforma', 'Sistemas', 'SISTEMAS', 'Desarrollador', 'DESARROLLADOR', 'ADMINISTRACIÓN', 'Administrador', 'CONTRATISTA'],
    description: 'Gestión de contratos'
  },
  
  '/obra/requisiciones-pago': {
    allowedRoles: ['Gerente Plataforma', 'Sistemas', 'SISTEMAS', 'Desarrollador', 'DESARROLLADOR', 'ADMINISTRACIÓN', 'Administrador', 'FINANZAS', 'CONTRATISTA'],
    description: 'Requisiciones de pago'
  },
  
  '/obra/solicitudes-pago': {
    allowedRoles: ['Gerente Plataforma', 'Sistemas', 'SISTEMAS', 'Desarrollador', 'DESARROLLADOR', 'ADMINISTRACIÓN', 'Administrador', 'FINANZAS', 'CONTRATISTA'],
    description: 'Solicitudes de pago'
  },
  
  '/obra/registro-pagos': {
    allowedRoles: ['Gerente Plataforma', 'Sistemas', 'SISTEMAS', 'Desarrollador', 'DESARROLLADOR', 'ADMINISTRACIÓN', 'Administrador', 'FINANZAS', 'CONTRATISTA'],
    description: 'Registro de pagos'
  },

  '/configuracion': {
    allowedRoles: ['Gerente Plataforma', 'Sistemas', 'SISTEMAS', 'Desarrollador', 'DESARROLLADOR'],
    description: 'Configuración del sistema'
  }
};

export const ADMIN_ROLES = [
  'Gerente Plataforma',
  'Sistemas',
  'SISTEMAS',
  'Desarrollador',
  'DESARROLLADOR'
];

export function canAccessRoute(route: string, userRoles: string[]): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  if (userRoles.some(role => ADMIN_ROLES.includes(role))) return true;

  const matchingRoutes = Object.keys(ROUTE_PERMISSIONS)
    .filter(key => route.startsWith(key))
    .sort((a, b) => b.length - a.length);

  if (matchingRoutes.length === 0) return false;

  const routeConfig = ROUTE_PERMISSIONS[matchingRoutes[0]];
  if (routeConfig.allowedRoles.includes('*')) return true;

  return userRoles.some(role => routeConfig.allowedRoles.includes(role));
}

export function filterRoutesByRole(routes: any[], userRoles: string[]): any[] {
  return routes
    .map(route => {
      const canAccess = canAccessRoute(route.path, userRoles);
      
      if (!canAccess) return null;

      if (route.children && route.children.length > 0) {
        const fullPath = route.path;
        const filteredChildren = route.children
          .filter((child: any) => {
            const childPath = child.path?.startsWith('/') 
              ? child.path 
              : `${fullPath}/${child.path}`;
            return canAccessRoute(childPath, userRoles);
          });

        return {
          ...route,
          children: filteredChildren
        };
      }

      return route;
    })
    .filter(route => route !== null);
}