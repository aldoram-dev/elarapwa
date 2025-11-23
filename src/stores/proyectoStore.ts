import { create } from 'zustand'
import { Proyecto } from '@/types/proyecto'
import { fetchProyectos, createProyecto, updateProyecto, deleteProyecto } from '@/lib/services/proyectoService'
import { db } from '@/db/database'

export interface ProyectoState {
  proyectos: Proyecto[]
  loading: boolean
  error: string | null
  lastFetch: number | null
  fetchProyectos: () => Promise<void>
  addProyecto: (data: Partial<Proyecto>) => Promise<void>
  updateProyecto: (id: string, data: Partial<Proyecto>) => Promise<void>
  deleteProyecto: (id: string) => Promise<void>
}

let fetchInProgress = false
const CACHE_TIME = 30000

export const useProyectoStore = create<ProyectoState>((set, get) => ({
  proyectos: [],
  loading: false,
  error: null,
  lastFetch: null,
  fetchProyectos: async () => {
    if (fetchInProgress) {
      console.log('⏳ fetchProyectos ya en progreso, ignorando...')
      return
    }
    
    const now = Date.now()
    const { lastFetch, proyectos } = get()
    if (lastFetch && (now - lastFetch) < CACHE_TIME && proyectos.length > 0) {
      console.log('💾 Usando cache en memoria de proyectos (fetched hace', Math.round((now - lastFetch) / 1000), 's)')
      return
    }
    
    fetchInProgress = true
    set({ loading: true, error: null })
    
    try {
      // PASO 1: Cargar primero del cache local (IndexedDB)
      const cachedProyectos = await db.proyectos.toArray()
      if (cachedProyectos.length > 0) {
        console.log('📦 Cargando', cachedProyectos.length, 'proyectos desde IndexedDB (offline-first)')
        set({ proyectos: cachedProyectos, loading: false, lastFetch: Date.now() })
      }
      
      // PASO 2: Intentar actualizar desde Supabase en segundo plano
      if (navigator.onLine) {
        console.log('🌐 Sincronizando proyectos con Supabase en background...')
        const proyectosOnline = await fetchProyectos()
        set({ proyectos: proyectosOnline, lastFetch: Date.now() })
        console.log('✅ Proyectos sincronizados con Supabase')
      } else {
        console.log('📴 Sin conexión, mostrando datos del cache')
      }
    } catch (e: any) {
      console.error('❌ Error en fetchProyectos:', e.message)
      // Si ya cargamos del cache, no marcar como error
      const { proyectos } = get()
      if (proyectos.length === 0) {
        set({ error: e.message, loading: false })
      }
    } finally {
      fetchInProgress = false
      set({ loading: false })
    }
  },
  addProyecto: async (data) => {
    set({ loading: true, error: null })
    try {
      const proyecto = await createProyecto(data)
      set(state => ({ proyectos: [...state.proyectos, proyecto], loading: false, lastFetch: null }))
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },
  updateProyecto: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const proyecto = await updateProyecto(id, data)
      set(state => ({
        proyectos: state.proyectos.map(p => p.id === id ? proyecto : p),
        loading: false,
        lastFetch: null
      }))
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },
  deleteProyecto: async (id) => {
    set({ loading: true, error: null })
    try {
      await deleteProyecto(id)
      set(state => ({
        proyectos: state.proyectos.filter(p => p.id !== id),
        loading: false,
        lastFetch: null
      }))
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },
}))
