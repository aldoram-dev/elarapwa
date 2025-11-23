/**
 * Configuración de Roles Visibles del Sistema
 * 
 * Estos son los roles que se muestran en la UI para asignar a usuarios de la plataforma.
 * Son predefinidos y no se pueden modificar desde la UI.
 * Se sincronizan con la base de datos a través del seed.sql
 * 
 * NOTA: El rol "Sistemas" es el único OCULTO que NO se muestra en la UI.
 * Se asigna solo manualmente por el owner usando: SELECT assign_sistemas_role('email')
 */

export interface RoleConfig {
  id: string // Identificador único (se usará para generar UUID consistente)
  name: string
  displayName: string // Nombre a mostrar en la UI
  description: string
  color: string // Color en formato hexadecimal
  protected: boolean // Si es true, no se puede eliminar ni modificar
  order: number // Orden de visualización
}

/**
 * Roles VISIBLES para asignar a usuarios de la plataforma
 * Incluye Gerente Plataforma (master admin visible pero intocable)
 */
export const FIXED_ROLES: RoleConfig[] = [
  {
    id: 'gerente-plataforma',
    name: 'Gerente Plataforma',
    displayName: 'Gerente Plataforma',
    description: 'Administrador principal con acceso completo (rol master intocable)',
    color: '#22C55E', // Verde
    protected: true,
    order: 0
  },
  {
    id: 'gerencia',
    name: 'Gerencia',
    displayName: 'Gerencia',
    description: 'Rol de gerencia con acceso a gestión de proyectos y contratos',
    color: '#8B5CF6', // Morado
    protected: true,
    order: 1
  },
  {
    id: 'desarrollador',
    name: 'DESARROLLADOR',
    displayName: 'Desarrollador',
    description: 'Acceso a herramientas de desarrollo y configuración técnica',
    color: '#3B82F6', // Azul
    protected: true,
    order: 2
  },
  {
    id: 'supervisor-louva',
    name: 'SUPERVISOR LOUVA',
    displayName: 'Supervisor Louva',
    description: 'Supervisor general de operaciones de Louva',
    color: '#6366F1', // Índigo
    protected: true,
    order: 3
  },
  {
    id: 'contratista',
    name: 'CONTRATISTA',
    displayName: 'Contratista',
    description: 'Usuario externo con acceso limitado a proyectos específicos',
    color: '#F59E0B', // Amarillo/Ámbar
    protected: true,
    order: 4
  },
  {
    id: 'administracion',
    name: 'ADMINISTRACIÓN',
    displayName: 'Administración',
    description: 'Personal administrativo con acceso a gestión y documentación',
    color: '#10B981', // Verde
    protected: true,
    order: 5
  },
  {
    id: 'finanzas',
    name: 'FINANZAS',
    displayName: 'Finanzas',
    description: 'Acceso a información financiera y reportes económicos',
    color: '#06B6D4', // Cyan
    protected: true,
    order: 6
  },
  {
    id: 'usuario',
    name: 'USUARIO',
    displayName: 'Usuario',
    description: 'Usuario básico con acceso limitado',
    color: '#6B7280', // Gris
    protected: true,
    order: 7
  }
]

/**
 * Obtener rol por nombre
 */
export const getRoleByName = (name: string): RoleConfig | undefined => {
  return FIXED_ROLES.find(role => role.name === name)
}

/**
 * Obtener rol por ID
 */
export const getRoleById = (id: string): RoleConfig | undefined => {
  return FIXED_ROLES.find(role => role.id === id)
}

/**
 * Obtener color de un rol por nombre
 */
export const getRoleColor = (name: string): string => {
  // Manejar rol Sistemas (oculto pero con color)
  if (name === 'Sistemas') {
    return '#EF4444' // Rojo fuerte para super admin
  }
  
  const role = getRoleByName(name)
  return role?.color || '#6B7280' // Gris por defecto
}

/**
 * Obtener todos los nombres de roles
 */
export const getAllRoleNames = (): string[] => {
  return FIXED_ROLES.map(role => role.name)
}

/**
 * Mapeo de roles a sus colores MUI
 */
export const ROLE_COLORS: Record<string, 'error' | 'primary' | 'secondary' | 'warning' | 'success' | 'info'> = {
  'Gerente Plataforma': 'success',
  'Gerencia': 'secondary',
  'DESARROLLADOR': 'primary',
  'SUPERVISOR LOUVA': 'secondary',
  'CONTRATISTA': 'warning',
  'ADMINISTRACIÓN': 'success',
  'FINANZAS': 'info',
  'USUARIO': 'secondary'
}
