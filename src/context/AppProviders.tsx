import React from 'react'
import { AuthProvider } from './AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePermissionSync } from '../lib/hooks/usePermissionSync'

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, gcTime: 1000 * 60 * 60, retry: 1 } }
})

/**
 * Hook wrapper que sincroniza permisos al montar
 */
const PermissionSyncWrapper: React.FC<React.PropsWithChildren> = ({ children }) => {
  usePermissionSync();
  return <>{children}</>;
};

export const AppProviders: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <PermissionSyncWrapper>
          {children}
        </PermissionSyncWrapper>
      </AuthProvider>
    </QueryClientProvider>
  )
}
