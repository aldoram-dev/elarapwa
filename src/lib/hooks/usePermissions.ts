import { useAuth } from '@/context/AuthContext';

/**
 * Hook para verificar permisos basados en roles del usuario
 * 
 * ESTRATEGIA DE PERMISOS:
 * - Todo el control de acceso se maneja en el CLIENTE
 * - RLS en Supabase solo verifica autenticación
 * - Este hook controla qué páginas y acciones puede ver/hacer cada rol
 * 
 * ROLES Y SUS PERMISOS:
 * - Administrador: Acceso total
 * - Gerente Plataforma: Acceso total (gestión completa)
 * - Sistemas: Acceso total (soporte técnico)
 * - Desarrollador: Acceso total (desarrollo y debugging)
 * - Supervisor Elara: Acceso limitado (solo visualización de proyectos/reportes)
 * - Contratista: Solo ve sus contratos y requisiciones de pago
 * - Finanzas: Gestión de pagos y reportes financieros
 */

// Roles con acceso administrativo completo
const ADMIN_ROLES = ['Gerente Plataforma', 'Sistemas', 'Desarrollador'];

// Roles con acceso a gestión de usuarios
const USER_MANAGEMENT_ROLES = ['Gerente Plataforma', 'Sistemas', 'Desarrollador'];

// Roles con acceso a configuración
const CONFIG_ROLES = ['Gerente Plataforma', 'Sistemas', 'Desarrollador'];

// Roles con acceso a reportes financieros
const FINANCE_ROLES = ['Gerente Plataforma', 'Gerencia', 'Finanzas', 'Sistemas'];

// Roles con acceso a gestión de contratos
const CONTRACT_MANAGEMENT_ROLES = ['Gerente Plataforma', 'Gerencia', 'Sistemas', 'Desarrollador'];

// Roles que pueden ver proyectos
const PROJECT_VIEW_ROLES = ['Gerente Plataforma', 'Gerencia', 'Sistemas', 'Desarrollador', 'Supervisor Elara', 'Contratista'];

export const usePermissions = () => {
  const { user, perfil } = useAuth();

  // Obtener roles del usuario
  const userRoles = perfil?.roles || [];

  /**
   * Verifica si el usuario tiene al menos uno de los roles especificados
   */
  const hasRole = (roles: string | string[]): boolean => {
    if (!user || !perfil) return false;
    
    const rolesToCheck = Array.isArray(roles) ? roles : [roles];
    return userRoles.some(role => rolesToCheck.includes(role));
  };

  /**
   * Verifica si el usuario tiene acceso administrativo
   */
  const isAdmin = (): boolean => {
    return hasRole(ADMIN_ROLES);
  };

  /**
   * Verifica si el usuario puede gestionar otros usuarios
   */
  const canManageUsers = (): boolean => {
    return hasRole(USER_MANAGEMENT_ROLES);
  };

  /**
   * Verifica si el usuario puede acceder a configuración
   */
  const canAccessConfig = (): boolean => {
    return hasRole(CONFIG_ROLES);
  };

  /**
   * Verifica si el usuario puede ver reportes financieros
   */
  const canViewFinance = (): boolean => {
    return hasRole(FINANCE_ROLES);
  };

  /**
   * Verifica si el usuario puede gestionar contratos
   */
  const canManageContracts = (): boolean => {
    return hasRole(CONTRACT_MANAGEMENT_ROLES);
  };

  /**
   * Verifica si el usuario puede ver proyectos
   */
  const canViewProjects = (): boolean => {
    return hasRole(PROJECT_VIEW_ROLES);
  };

  /**
   * Verifica si el usuario es un contratista
   */
  const isContratista = (): boolean => {
    return hasRole('Contratista');
  };

  /**
   * Verifica si el usuario tiene acceso a una página específica
   */
  const canAccessPage = (page: string): boolean => {
    if (!user || !perfil) return false;

    // Páginas públicas (después de login)
    const publicPages = ['/', '/home', '/dashboard'];
    if (publicPages.includes(page)) return true;

    // Páginas de configuración
    const configPages = ['/config/usuarios', '/config/roles', '/config/permisos', '/config/empresas'];
    if (configPages.includes(page)) return canAccessConfig();

    // Páginas de usuarios
    if (page === '/config/usuarios') return canManageUsers();

    // Páginas de contratos
    if (page.startsWith('/contratos')) return canManageContracts() || isContratista();

    // Páginas de proyectos
    if (page.startsWith('/proyectos')) return canViewProjects();

    // Páginas financieras
    if (page.startsWith('/finanzas') || page.startsWith('/pagos')) return canViewFinance();

    // Por defecto, permitir acceso si está autenticado
    return true;
  };

  /**
   * Obtiene el ID del contratista del usuario (si aplica)
   */
  const getContratistaId = (): string | null => {
    return perfil?.contratista_id || null;
  };

  /**
   * Verifica si el usuario puede editar un recurso
   * Los contratistas generalmente solo pueden ver, no editar
   */
  const canEdit = (resourceType: 'contrato' | 'proyecto' | 'pago' | 'usuario'): boolean => {
    // Los contratistas no pueden editar nada
    if (isContratista() && !isAdmin()) return false;

    switch (resourceType) {
      case 'usuario':
        return canManageUsers();
      case 'contrato':
        return canManageContracts();
      case 'proyecto':
        return isAdmin();
      case 'pago':
        return canViewFinance();
      default:
        return isAdmin();
    }
  };

  return {
    // Estado
    user,
    perfil,
    userRoles,
    
    // Verificaciones de roles
    hasRole,
    isAdmin,
    isContratista,
    
    // Permisos específicos
    canManageUsers,
    canAccessConfig,
    canViewFinance,
    canManageContracts,
    canViewProjects,
    canAccessPage,
    canEdit,
    
    // Utilidades
    getContratistaId,
    
    // Constantes exportadas
    ADMIN_ROLES,
    USER_MANAGEMENT_ROLES,
    CONFIG_ROLES,
    FINANCE_ROLES,
    CONTRACT_MANAGEMENT_ROLES,
    PROJECT_VIEW_ROLES,
  };
};
