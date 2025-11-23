import { useEffect, useState } from 'react';
import { routes } from '../routing/routes';
import { discoverPermissionsFromRoutes, syncPermissionsToDatabase } from '../core/permissionRegistry';
import { isSupabaseUrlLikelyValid } from '../core/supabaseClient';

// Módulo-scope flag: evita re-ejecuciones múltiples en React Strict Mode
let permissionSyncAttempted = false;

/**
 * Hook para sincronizar permisos descubiertos de las rutas con la base de datos
 * Se ejecuta una vez al iniciar la aplicación
 */
export function usePermissionSync() {
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function syncPermissions() {
      // DESHABILITADO: Ahora manejamos permisos en el cliente, no en base de datos
      // Los permisos se controlan con usePermissions hook basado en roles
      console.info('ℹ️ Sync de permisos deshabilitado - Permisos manejados en cliente por roles');
      return;

      // Permitir desactivar completamente por env var
      const disable = import.meta.env.VITE_DISABLE_PERMISSION_SYNC === 'true';
      if (disable) {
        console.info('🛑 Sync de permisos desactivado por VITE_DISABLE_PERMISSION_SYNC=true');
        return;
      }

      // Only try once per session (and once per module) to avoid loops on Strict Mode
      if (permissionSyncAttempted || attempted || synced || syncing) return;

      setSyncing(true);
      setAttempted(true);
      permissionSyncAttempted = true;
      setError(null);

      try {
        // Skip if offline or supabase URL invalid
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          console.info('🔌 Offline: omitimos sync de permisos hasta volver a estar en línea');
          return;
        }
        if (!isSupabaseUrlLikelyValid()) {
          console.warn('⚠️ Supabase URL inválida o no configurada. Omitiendo sync de permisos.');
          return;
        }

        // Descubrir permisos de las rutas
        const discoveredPermissions = discoverPermissionsFromRoutes(routes);
        
        console.log(`🔍 Descubiertos ${discoveredPermissions.length} permisos de las rutas`);
        
        // Sincronizar con la base de datos
        const result = await syncPermissionsToDatabase(discoveredPermissions);
        
        if (result.success) {
          setSynced(true);
        } else {
          // Do not retry automatically; show error once
          throw result.error;
        }
      } catch (err) {
        console.error('Error en sincronización de permisos:', err);
        setError(err as Error);
      } finally {
        setSyncing(false);
      }
    }

    syncPermissions();
  }, [attempted, synced, syncing]);

  return { syncing, synced, error };
}
