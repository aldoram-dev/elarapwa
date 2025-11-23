// src/context/PermissionsDataProvider.tsx
import React, { createContext, useContext, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@lib/core/supabaseClient'
import { useProject } from './ProjectContext'

export type ResourceNode = {
  id: string
  project_id: string
  parent_id: string | null
  key: string
  path: string
  kind?: string
  meta?: any
}
export type Grant = {
  id: string
  project_id: string
  resource_id: string
  principal_type: 'user' | 'empresa' | 'tipo' | 'nivel'
  principal_id: string
  perm: 'view' | 'edit' | 'admin'
  effect?: 'allow' | 'deny'
}

type PermData = {
  resources: ResourceNode[]
  grants: Grant[]
  loading: boolean
  error?: unknown
}

const PermDataCtx = createContext<PermData | undefined>(undefined)

export const PermissionsDataProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { selected } = useProject()
  const pid = selected ?? ''

  const {
    data: resources = [],
    isLoading: lr,
    error: errRes,
  } = useQuery({
    queryKey: ['resources', pid],
    queryFn: async () => {
      if (!pid) return []
      const { data, error } = await supabase
        .from('resources')
        .select('id, project_id, parent_id, key, path, kind, meta')
        .eq('project_id', pid)
      if (error) throw error
      return data as ResourceNode[]
    },
    enabled: !!pid,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const {
    data: grants = [],
    isLoading: lg,
    error: errGrants,
  } = useQuery({
    queryKey: ['grants', pid],
    queryFn: async () => {
      if (!pid) return []
      const { data, error } = await supabase
        .from('grants')
        .select('id, project_id, resource_id, principal_type, principal_id, perm, effect')
        .eq('project_id', pid)
      if (error) throw error
      return data as Grant[]
    },
    enabled: !!pid,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const value = useMemo<PermData>(() => ({
    resources,
    grants,
    loading: lr || lg,
    error: errRes ?? errGrants ?? undefined,
  }), [resources, grants, lr, lg, errRes, errGrants])

  return <PermDataCtx.Provider value={value}>{children}</PermDataCtx.Provider>
}

export const usePermissionsData = () => {
  const ctx = useContext(PermDataCtx)
  if (!ctx) throw new Error('usePermissionsData debe usarse dentro de PermissionsDataProvider')
  return ctx
}
