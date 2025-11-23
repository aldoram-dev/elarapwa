import type { AppRoute } from './schema'

export function flattenRoutes(rs: AppRoute[], acc: AppRoute[] = []): AppRoute[] {
  for (const r of rs) {
    acc.push(r)
    if (r.children?.length) flattenRoutes(r.children, acc)
  }
  return acc
}

export function buildGroups(rs: AppRoute[]) {
  const map = new Map<string, AppRoute[]>()
  for (const r of flattenRoutes(rs)) {
    if (!r.group) continue
    if (!map.has(r.group)) map.set(r.group, [])
    // Menú clicable (hoja o explícito)
    if (!r.children || r.meta?.resourcePath?.includes('/')) map.get(r.group)!.push(r)
  }
  return map
}
