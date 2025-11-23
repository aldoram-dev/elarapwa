/**
 * Sistema de auto-registro de permisos basado en rutas
 * Los permisos se descubren dinámicamente desde las rutas definidas
 */

import { supabase, isSupabaseUrlLikelyValid } from './supabaseClient';
import type { AppRoute } from '../routing/schema';

export interface PermissionDefinition {
  name: string;
  description: string;
  resource: string;
  action: string;
  // Para subsecciones dentro de una página
  scope?: string;
}

export interface DiscoveredPermission extends PermissionDefinition {
  routePath: string;
  moduleLabel?: string;
}

/**
 * Acciones estándar que se pueden aplicar a cualquier recurso
 */
export const STANDARD_ACTIONS = ['view', 'create', 'edit', 'delete'] as const;

/**
 * Extrae permisos de las rutas definidas
 */
export function discoverPermissionsFromRoutes(
  routes: AppRoute[],
  parentPath = '',
  parentResource = ''
): DiscoveredPermission[] {
  const permissions: DiscoveredPermission[] = [];

  routes.forEach((route) => {
    const fullPath = `${parentPath}${route.path || ''}`;
    const meta = route.meta;

    if (meta?.resourcePath) {
      const resource = meta.resourcePath;
      const label = meta.label || route.label || 'Sin título';

      // Generar permisos para acciones estándar
      STANDARD_ACTIONS.forEach((action) => {
        permissions.push({
          name: `${capitalize(action)} ${label}`,
          description: `${getActionDescription(action)} ${label.toLowerCase()}`,
          resource,
          action,
          routePath: fullPath,
          moduleLabel: label,
        });
      });

      // Si tiene permisos personalizados definidos en meta
      if (meta.customPermissions) {
        meta.customPermissions.forEach((perm: PermissionDefinition) => {
          permissions.push({
            ...perm,
            routePath: fullPath,
            moduleLabel: label,
          });
        });
      }
    }

    // Recursivamente procesar rutas hijas
    if (route.children) {
      permissions.push(
        ...discoverPermissionsFromRoutes(route.children, fullPath, meta?.resourcePath || parentResource)
      );
    }
  });

  return permissions;
}

/**
 * Sincroniza permisos descubiertos con la base de datos
 * Usa función RPC SECURITY DEFINER para bypass seguro de RLS
 */
export async function syncPermissionsToDatabase(permissions: DiscoveredPermission[]) {
  try {
    // Skip if offline or misconfigured Supabase
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.info('🔌 Offline: omitimos sync de permisos hasta volver a estar en línea')
      return { success: false, error: new Error('offline') }
    }
    if (!isSupabaseUrlLikelyValid()) {
      console.warn('⚠️ Supabase URL inválida o no configurada. Omitiendo sync de permisos para evitar errores ruidosos.')
      return { success: false, error: new Error('supabase_url_invalid') }
    }

    // Preparar datos para la función RPC
    const permissionsData = permissions.map((p) => ({
      name: p.name,
      description: p.description,
      resource: p.resource,
      action: p.action,
      metadata: {},
    }));

    // Llamar a la función RPC que maneja el upsert con SECURITY DEFINER
    const { data, error } = await supabase.rpc('sync_permissions_from_routes', {
      permissions_data: permissionsData,
    });

    if (error) {
      console.warn('⚠️ No se pudieron sincronizar permisos automáticamente:', error.message);
      console.info('💡 Un administrador debe ejecutar el sync manualmente desde Configuración > Roles y Permisos');
      return { success: false, error };
    }

    console.log(`✅ Sincronizados ${data.inserted} permisos nuevos, ${data.updated} actualizados`);
    return { success: true, inserted: data.inserted, updated: data.updated };
  } catch (error) {
    console.error('Error sincronizando permisos:', error);
    return { success: false, error };
  }
}

/**
 * Obtener todos los permisos disponibles agrupados por recurso
 */
export async function getAvailablePermissions() {
  try {
    const { data, error } = await supabase
      .from('permisos')
      .select('*')
      .order('resource', { ascending: true })
      .order('action', { ascending: true });

    if (error) throw error;

    // Agrupar por recurso
    const grouped = data?.reduce((acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push(perm);
      return acc;
    }, {} as Record<string, any[]>);

    return { data: grouped, error: null };
  } catch (error) {
    console.error('Error obteniendo permisos:', error);
    return { data: null, error };
  }
}

// Utilidades
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getActionDescription(action: string): string {
  const descriptions: Record<string, string> = {
    view: 'Ver',
    create: 'Crear',
    edit: 'Editar',
    delete: 'Eliminar',
  };
  return descriptions[action] || action;
}
