import { useState, useCallback, useEffect, useRef } from 'react';
import type { Usuario } from '../../types/usuario';
import { useUserStore, useUsers, useUserActions } from '../../stores/userStore';
import { syncService, SyncResult } from '../../sync/syncService';
import { supabase } from '../core/supabaseClient';

// ===================================
// HOOK SIMPLIFICADO PARA GESTIÓN DE USUARIOS
// ===================================

export function useUsersManagement() {
  const users = useUsers();
  const actions = useUserActions();
  const { loading, error } = useUserStore();

  const createUser = useCallback(async (userData: Omit<Usuario, 'id' | 'created_at' | 'updated_at'>) => {
    const newUser: any = {
      ...userData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _dirty: true
    };
    
    await actions.addUser(newUser);
    return newUser;
  }, [actions]);

  const updateUserData = useCallback(async (id: string, updates: Partial<Usuario>) => {
    await actions.updateUser(id, {
      ...updates,
      updated_at: new Date().toISOString(),
      _dirty: true
    } as any);
  }, [actions]);

  const removeUser = useCallback(async (id: string) => {
    await actions.deleteUser(id);
  }, [actions]);

  const loadData = useCallback(async () => {
    await actions.loadUsersFromDB();
  }, [actions]);

  return {
    users,
    loading,
    error,
    createUser,
    updateUser: updateUserData,
    removeUser,
    loadData,
    refreshData: loadData,
    // Acciones de filtrado
    setSearchTerm: actions.setSearchTerm,
    setTypeFilter: actions.setTypeFilter,
    setActiveFilter: actions.setActiveFilter,
    clearFilters: actions.clearFilters
  };
}

// ===================================
// HOOK SIMPLIFICADO PARA GESTIÓN DE PERMISOS
// ===================================
// NOTA: Comentado temporalmente - el sistema de permisos se simplificó
// y este hook necesita ser rediseñado para la nueva arquitectura sin roles
/*
export function usePermissionsManagement() {
  // TODO: Reimplementar para sistema simplificado de permisos
  return {
    permissions: [],
    loading: false,
    error: null,
    loadData: async () => {},
    refreshData: async () => {},
  };
}
*/

// ===================================
// HOOK PARA PERMISOS DE USUARIO ESPECÍFICO
// ===================================
// NOTA: Comentado temporalmente - el sistema de permisos se simplificó
// TODO: Reimplementar para sistema simplificado de permisos sin roles
/*
export function useUserPermissions(userId?: string) {
  return {
    loadUserPermissions: async () => {},
    assignPermission: async () => {},
    revokePermission: async () => {},
    checkPermission: () => false,
    loading: false,
    error: null
  };
}
*/

// ===================================
// HOOK PARA SINCRONIZACIÓN
// ===================================

export function useSync() {
  const [syncStatus, setSyncStatus] = useState(syncService.getSyncStatus());
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [loading, setLoading] = useState(false);

  const performSync = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const result = await syncService.syncAll();
      setLastSyncResult(result);
      setSyncStatus(syncService.getSyncStatus());
      return result;
    } catch (err) {
      const errorResult: SyncResult = {
        success: false,
        synced: 0,
        errors: [err instanceof Error ? err.message : 'Error de sincronización'],
        lastSync: new Date()
      };
      setLastSyncResult(errorResult);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const forcePull = useCallback(async () => {
    setLoading(true);
    try {
      const result = await syncService.forcePull();
      setLastSyncResult(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const forcePush = useCallback(async () => {
    setLoading(true);
    try {
      const result = await syncService.forcePush();
      setLastSyncResult(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleAutoSync = useCallback((enabled: boolean) => {
    syncService.updateConfig({ autoSync: enabled });
    setSyncStatus(syncService.getSyncStatus());
  }, []);

  const updateSyncInterval = useCallback((interval: number) => {
    syncService.updateConfig({ syncInterval: interval });
    setSyncStatus(syncService.getSyncStatus());
  }, []);

  // Actualizar estado cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus(syncService.getSyncStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    syncStatus,
    lastSyncResult,
    loading,
    performSync,
    forcePull,
    forcePush,
    toggleAutoSync,
    updateSyncInterval
  };
}

// ===================================
// HOOK PARA VERIFICACIÓN DE PERMISOS DEL USUARIO ACTUAL
// ===================================
// NOTA: Comentado temporalmente - el sistema de permisos se simplificó
// TODO: Reimplementar para sistema simplificado de permisos sin roles
/*
export function useCurrentUserPermissions() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasPermission = useCallback((resource: string, action: string): boolean => {
    // TODO: Implementar lógica simplificada
    return false;
  }, [currentUserId]);

  const hasAnyPermission = useCallback((permissionChecks: Array<{ resource: string; action: string }>): boolean => {
    return permissionChecks.some(({ resource, action }) => hasPermission(resource, action));
  }, [hasPermission]);

  const hasAllPermissions = useCallback((permissionChecks: Array<{ resource: string; action: string }>): boolean => {
    return permissionChecks.every(({ resource, action }) => hasPermission(resource, action));
  }, [hasPermission]);

  const loadCurrentUserPermissions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCurrentUserId(null);
      return;
    }
    setCurrentUserId(user.id);
  }, []);

  useEffect(() => {
    loadCurrentUserPermissions();
  }, [loadCurrentUserPermissions]);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions: loadCurrentUserPermissions,
    loading,
    error: null,
    currentUserId
  };
}
*/
