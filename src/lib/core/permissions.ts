// Principales (targets a quienes otorgas permisos)
export type PrincipalType = 'user' | 'empresa' | 'tipo' | 'nivel'

// Tipos de usuario (ajústalo a tu realidad)
export type UserTipo = 'Plataforma' | 'Desarrollador' | 'Gerencia' | 'Supervision' | 'Contratista'
export type UserNivel = 'Administrador' | 'Usuario'

// Permisos atómicos
export type Perm = 'view' | 'edit' | 'admin'
export const PERM_RANK: Record<Perm, number> = { view: 1, edit: 2, admin: 3 }

// Árbol de recursos
export interface ResourceNode {
  id: string
  projectId: string
  parentId: string | null
  key: string            // ej: "finanzas", "ingresos"
  path: string           // ej: "proyecto/finanzas/ingresos" (único)
  kind?: string          // "area" | "subarea" | "topic" | "page" | ...
  meta?: Record<string, any>
}

// Otorgamientos (ACL)
export interface Grant {
  id: string
  projectId: string
  resourceId: string
  principalType: PrincipalType  // user|empresa|tipo|nivel
  principalId: string
  perm: Perm                    // view|edit|admin
  effect?: 'allow' | 'deny'     // default 'allow'
}

// Contexto del usuario actual
export interface Context {
  userId: string
  empresaId?: string
  tipo: UserTipo
  nivel: UserNivel
}
