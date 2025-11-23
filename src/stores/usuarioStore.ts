import { create } from 'zustand'
import { Usuario } from '@/types/usuario'
import { fetchUsuarios, fetchUsuario, updateUsuario, deleteUsuario } from '@/lib/services/usuarioService'
import { db } from '@/db/database'

export interface UsuarioState {
  usuarios: Usuario[]
  currentUsuario: Usuario | null
  loading: boolean
  error: string | null
  lastFetch: number | null
  fetchUsuarios: () => Promise<void>
  fetchUsuario: (id: string) => Promise<void>
  updateUsuario: (id: string, data: Partial<Usuario>) => Promise<void>
  deleteUsuario: (id: string) => Promise<void>
}

let fetchInProgress = false
const CACHE_TIME = 30000 // 30 segundos

export const useUsuarioStore = create<UsuarioState>((set, get) => ({
  usuarios: [],
  currentUsuario: null,
  loading: false,
  error: null,
  lastFetch: null,
  fetchUsuarios: async () => {
    // Evitar llamadas duplicadas
    if (fetchInProgress) {
      console.log('⏳ fetchUsuarios ya en progreso, ignorando...')
      return
    }
    
    // Cache en memoria: si ya fetched hace menos de 30s, usar cache
    const now = Date.now()
    const { lastFetch, usuarios } = get()
    if (lastFetch && (now - lastFetch) < CACHE_TIME && usuarios.length > 0) {
      console.log('💾 Usando cache en memoria de usuarios (fetched hace', Math.round((now - lastFetch) / 1000), 's)')
      return
    }
    
    fetchInProgress = true
    set({ loading: true, error: null })
    
    try {
      // PASO 1: Cargar primero del cache local (IndexedDB) para mostrar algo inmediatamente
      const cachedUsuarios = await db.usuarios.toArray()
      if (cachedUsuarios.length > 0) {
        console.log('📦 Cargando', cachedUsuarios.length, 'usuarios desde IndexedDB (offline-first)')
        set({ usuarios: cachedUsuarios, loading: false, lastFetch: Date.now() })
      }
      
      // PASO 2: Intentar actualizar desde Supabase en segundo plano (sin timeout que bloquee)
      if (navigator.onLine) {
        console.log('🌐 Sincronizando usuarios con Supabase en background...')
        const usuariosOnline = await fetchUsuarios()
        set({ usuarios: usuariosOnline, lastFetch: Date.now() })
        console.log('✅ Usuarios sincronizados con Supabase')
      } else {
        console.log('📴 Sin conexión, mostrando datos del cache')
      }
    } catch (e: any) {
      console.error('❌ Error en fetchUsuarios:', e.message)
      // Si ya cargamos del cache, no marcar como error
      const { usuarios } = get()
      if (usuarios.length === 0) {
        set({ error: e.message, loading: false })
      }
    } finally {
      fetchInProgress = false
      set({ loading: false })
    }
  },
  fetchUsuario: async (id) => {
    set({ loading: true, error: null })
    const timeoutId = setTimeout(() => {
      set({ error: 'Timeout fetching usuario', loading: false })
    }, 5000)
    
    try {
      const usuario = await Promise.race([
        fetchUsuario(id),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ])
      clearTimeout(timeoutId)
      set({ currentUsuario: usuario, loading: false })
    } catch (e: any) {
      clearTimeout(timeoutId)
      set({ error: e.message, loading: false })
    }
  },
  updateUsuario: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const usuario = await updateUsuario(id, data)
      // Invalidar cache
      set(state => ({
        usuarios: state.usuarios.map(u => u.id === id ? usuario : u),
        loading: false,
        lastFetch: null
      }))
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },
  deleteUsuario: async (id) => {
    set({ loading: true, error: null })
    try {
      await deleteUsuario(id)
      // Invalidar cache
      set(state => ({
        usuarios: state.usuarios.filter(u => u.id !== id),
        loading: false,
        lastFetch: null
      }))
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },
}))
