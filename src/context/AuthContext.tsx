import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/core/supabaseClient'
import { logSecurityEvent, getUserAgent } from '../lib/services/securityEventService'
import { db } from '../db/database'

type Perfil = {
  id: string
  nivel?: 'Administrador' | 'Usuario' | null  // Nivel jerárquico
  tipo?: 'DESARROLLADOR' | 'CONTRATISTA' | null  // Tipo de usuario
  roles?: string[] | null                     // Array de roles múltiples (Gerente Plataforma, Sistemas, etc.)
  name?: string | null
  email?: string | null
  avatar_url?: string | null
  contratista_id?: string | null              // ID del contratista asociado (sin empresa_id)
  active?: boolean
}

type AuthState = {
  session: Session | null
  user: User | null
  perfil: Perfil | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthCtx = createContext<AuthState | undefined>(undefined)

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loadingPerfil, setLoadingPerfil] = useState(true)

  useEffect(() => {
    console.log('[AuthContext] Inicializando auth subscription')
    supabase.auth.getSession().then(({ data }: any) => {
      console.log('[AuthContext] Session inicial:', data.session?.user?.id || 'ninguna')
      setSession(data.session ?? null)
      setUser(data.session?.user ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event: any, s: any) => {
      console.log('[AuthContext] Auth state change:', event, s?.user?.id)
      if (event === 'PASSWORD_RECOVERY') {
        try {
          window.location.replace('/reset')
          if (s?.user) {
            logSecurityEvent('password_recovery_link_used', {
              userId: s.user.id,
              email: s.user.email,
              userAgent: getUserAgent() || undefined
            }).catch((err: any) => console.warn('Error logging security event:', err))
          }
        } catch {}
      }
      
      if (event === 'SIGNED_IN' && s?.user) {
        logSecurityEvent('login_success', {
          userId: s.user.id,
          email: s.user.email,
          userAgent: getUserAgent() || undefined
        }).catch((err: any) => console.warn('Error logging security event:', err))
      }
      
      if (event === 'SIGNED_OUT') {
        logSecurityEvent('logout', {
          userId: user?.id,
          email: user?.email,
          userAgent: getUserAgent() || undefined
        }).catch((err: any) => console.warn('Error logging security event:', err))
      }
      
      setSession(s)
      setUser(s?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoadingPerfil(true)
      console.log('[AuthContext] Iniciando carga perfil para user:', user?.id)

      try {
        if (!user) {
          console.log('[AuthContext] No user, limpiando perfil')
          if (!cancelled) setPerfil(null)
          if (!cancelled) setLoadingPerfil(false)
          return
        }

        const perfilPromise = supabase
          .from('usuarios')
          .select('id, nivel, email, avatar_url, contratista_id, active, roles')
          .eq('id', user.id)
          .maybeSingle()

        const result = await Promise.race([
          perfilPromise,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Perfil timeout')), 10000))
        ])

        const { data, error } = result as any
        if (error) throw error

        // Cargar roles del usuario desde roles_usuario
        let roles: string[] = []
        try {
          const { data: rolesData, error: rolesError } = await supabase
            .from('roles_usuario')
            .select('role_id, roles!inner(name)')
            .eq('user_id', user.id)
          
          console.log('[AuthContext] Query roles_usuario resultado:', { rolesData, rolesError })
          
          if (rolesData && Array.isArray(rolesData)) {
            roles = rolesData
              .filter((r: any) => r.roles?.name)
              .map((r: any) => r.roles.name)
          }
          console.log('[AuthContext] Roles cargados:', roles)
        } catch (rolesError) {
          console.warn('[AuthContext] Error cargando roles:', rolesError)
        }

        // Combinar roles de la tabla usuarios con roles de roles_usuario
        const rolesFinales = [...new Set([...(roles || []), ...((data as any)?.roles || [])])]
        
        // Determinar tipo basado en roles o contratista_id
        let tipo: 'DESARROLLADOR' | 'CONTRATISTA' | null = null
        if (rolesFinales.includes('Desarrollador') || rolesFinales.includes('Gerente Plataforma')) {
          tipo = 'DESARROLLADOR'
        } else if ((data as any)?.contratista_id || rolesFinales.includes('Contratista')) {
          tipo = 'CONTRATISTA'
        }

        const perfilConRoles = { 
          ...data, 
          name: (data as any)?.email ?? null,
          tipo,
          roles: rolesFinales 
        }
        console.log('[AuthContext] Perfil cargado (online) con roles:', perfilConRoles)
        if (!cancelled) setPerfil(perfilConRoles as Perfil)
      } catch (err) {
        console.warn('[AuthContext] Fallback a perfil offline por error/timeout:', err)
        if (user) {
          try {
            const local = await db.usuarios.get(user.id)
            
            // Intentar cargar roles desde Supabase incluso si el perfil viene de IndexedDB
            let roles: string[] = []
            try {
              const { data: rolesData, error: rolesError } = await supabase
                .from('roles_usuario')
                .select('role_id, roles!inner(name)')
                .eq('user_id', user.id)
              
              console.log('[AuthContext] Roles desde Supabase (fallback):', { rolesData, rolesError })
              
              if (rolesData && Array.isArray(rolesData)) {
                roles = rolesData
                  .filter((r: any) => r.roles?.name)
                  .map((r: any) => r.roles.name)
              }
            } catch (rolesErr) {
              console.warn('[AuthContext] Error cargando roles en fallback:', rolesErr)
              // Usar roles de IndexedDB si existen
              roles = local?.roles || []
            }
            
            if (local) {
              const rolesFinales = roles.length > 0 ? roles : (local.roles || [])
              
              // Determinar tipo basado en roles o contratista_id
              let tipo: 'DESARROLLADOR' | 'CONTRATISTA' | null = null
              if (rolesFinales.includes('Desarrollador') || rolesFinales.includes('Gerente Plataforma')) {
                tipo = 'DESARROLLADOR'
              } else if (local.contratista_id || rolesFinales.includes('Contratista')) {
                tipo = 'CONTRATISTA'
              }
              
              const offlinePerfil: Perfil = {
                id: local.id,
                nivel: (local.nivel as any) ?? null,
                name: local.nombre ?? local.email ?? null,
                email: local.email ?? null,
                avatar_url: local.avatar_url ?? null,
                tipo,
                roles: rolesFinales,
              }
              console.log('[AuthContext] Perfil desde IndexedDB con roles actualizados:', offlinePerfil)
              if (!cancelled) setPerfil(offlinePerfil)
            } else {
              console.warn('[AuthContext] No se encontró perfil en IndexedDB')
              if (!cancelled) setPerfil(null)
            }
          } catch (e) {
            console.error('[AuthContext] Error leyendo perfil offline:', e)
            if (!cancelled) setPerfil(null)
          }
        } else {
          if (!cancelled) setPerfil(null)
        }
      } finally {
        if (!cancelled) setLoadingPerfil(false)
      }
    })()

    return () => { cancelled = true }
  }, [user?.id])

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setPerfil(null)
  }

  const loading = loadingPerfil

  const value = useMemo<AuthState>(() => ({
    session, 
    user, 
    perfil, 
    loading, 
    signOut
  }), [session, user, perfil, loadingPerfil])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}

export function useAuthRole() {
  const { user, perfil, loading } = useAuth()
  return {
    user,
    nivel: perfil?.nivel ?? null,
    loading,
  }
}
