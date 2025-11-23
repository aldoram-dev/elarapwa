import { useMemo } from 'react'
import { hasAtLeast, resolvePermForResource, collectAncestors } from './acl'
import type { Context, Grant, Perm, ResourceNode } from './permissions'

// ⚠️ Por ahora: recursos y grants hardcode (luego vendrán de Supabase / Dexie)
const DEMO_RESOURCES: ResourceNode[] = [
  { id: 'root', projectId: 'p1', parentId: null, key: 'proyecto', path: 'proyecto' },
  { id: 'fin', projectId: 'p1', parentId: 'root', key: 'finanzas', path: 'proyecto/finanzas' },
  { id: 'ing', projectId: 'p1', parentId: 'fin',  key: 'ingresos', path: 'proyecto/finanzas/ingresos' },
  { id: 'egr', projectId: 'p1', parentId: 'fin',  key: 'egresos',  path: 'proyecto/finanzas/egresos' },
]

const DEMO_GRANTS: Grant[] = [
  { id:'g1', projectId:'p1', resourceId:'root', principalType:'nivel',  principalId:'Administrador', perm:'edit' },
  { id:'g2', projectId:'p1', resourceId:'fin',  principalType:'tipo',   principalId:'Gerencia',      perm:'edit' },
  { id:'g3', projectId:'p1', resourceId:'ing',  principalType:'user',   principalId:'USER123',       perm:'admin' },
  // ejemplo deny:
  // { id:'g4', projectId:'p1', resourceId:'egr', principalType:'user', principalId:'USER123', perm:'edit', effect:'deny' },
]

export function usePermissions(ctx: Context | null) {
  const resources = DEMO_RESOURCES
  const grants = DEMO_GRANTS

  const can = useMemo(() => {
    return (resourcePath: string, required: Perm) => {
      if (!ctx) return false
      const node = resources.find(r => r.path === resourcePath)
      if (!node) return false
      const ancestors = collectAncestors(resources, node)
      const perm = resolvePermForResource(ctx, resourcePath, ancestors, grants)
      return hasAtLeast(perm, required)
    }
  }, [ctx])

  return { can }
}
