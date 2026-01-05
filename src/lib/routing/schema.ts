import type React from 'react'
import type { PermissionDefinition } from '../core/permissionRegistry'

export interface RouteMeta {
  resourcePath: string         // ejemplo: "proyecto/finanzas/ingresos"
  label?: string               // Etiqueta legible para el permiso
  hideProjectSelector?: boolean
  // Permisos personalizados adicionales más allá de view/create/edit/delete
  customPermissions?: PermissionDefinition[]
  // Para subsecciones dentro de una página que requieren permisos específicos
  hasSubsectionPermissions?: boolean
  // Orden opcional para UI de tabs o menús (menor = más a la izquierda/arriba)
  order?: number
  // Ocultar en navegaciones dinámicas
  hidden?: boolean
  // Requiere que el usuario NO sea contratista
  requiresNotContratista?: boolean
}

export interface AppRoute {
  path: string
  label: string
  icon?: React.ReactNode
  element: React.LazyExoticComponent<React.FC>
  group?: string
  meta: RouteMeta
  children?: AppRoute[]
}
