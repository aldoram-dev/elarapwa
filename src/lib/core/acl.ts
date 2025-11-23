import { PERM_RANK } from './permissions'
import type { Context, Grant, Perm, ResourceNode } from './permissions'

// Devuelve [nodo, padre, abuelo, ...] (0 = más específico)
export function collectAncestors(all: ResourceNode[], node: ResourceNode) {
  const chain: ResourceNode[] = [node]
  let current = node
  while (current.parentId) {
    const parent = all.find(r => r.id === current.parentId)
    if (!parent) break
    chain.push(parent)
    current = parent
  }
  return chain
}

export function resolvePermForResource(
  ctx: Context,
  resourcePath: string,
  ancestors: ResourceNode[],
  grants: Grant[],
): Perm | 'none' {
  // Filtra grants por nodos en el chain
  const relevant = grants.filter(g => ancestors.some(n => n.id === g.resourceId))

  // Aplica a este usuario/empresa/tipo/nivel
  const applies = relevant.filter(g => {
    if (g.principalType === 'user') return g.principalId === ctx.userId
    if (g.principalType === 'empresa') return g.principalId && g.principalId === (ctx.empresaId ?? '')
    if (g.principalType === 'tipo') return g.principalId === ctx.tipo
    if (g.principalType === 'nivel') return g.principalId === ctx.nivel
    return false
  })

  if (!applies.length) return 'none'

  // Orden por especificidad (nodo primero)
  const order = (id:string) => ancestors.findIndex(n => n.id === id)
  applies.sort((a,b) => order(a.resourceId) - order(b.resourceId))

  // Deny override
  const hasDeny = applies.some(g => g.effect === 'deny')
  if (hasDeny) return 'none'

  // Máximo permiso entre allows
  let best: Perm = 'view'
  for (const g of applies) {
    if ((g.effect ?? 'allow') === 'allow' && PERM_RANK[g.perm] > PERM_RANK[best]) {
      best = g.perm
    }
  }
  return best
}

export function hasAtLeast(current: Perm | 'none', required: Perm) {
  if (current === 'none') return false
  return PERM_RANK[current] >= PERM_RANK[required]
}
