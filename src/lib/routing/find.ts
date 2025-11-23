import type { AppRoute } from './schema'
import { flattenRoutes } from './nav'

export function findRouteByPath(all: AppRoute[], path: string): AppRoute | undefined {
  return flattenRoutes(all).find(r => r.path === path)
}
