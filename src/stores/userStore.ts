import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { UsuarioDB, db } from '../db/database'

interface UserState {
  // Estado
  users: UsuarioDB[]
  currentUser: UsuarioDB | null
  loading: boolean
  error: string | null
  lastSync: string | null
  
  // Filtros y búsqueda
  searchTerm: string
  typeFilter: string | null
  activeFilter: boolean | null
  
  // Acciones
  setUsers: (users: UsuarioDB[]) => void
  setCurrentUser: (user: UsuarioDB | null) => void
  addUser: (user: UsuarioDB) => void
  updateUser: (id: string, updates: Partial<UsuarioDB>) => void
  deleteUser: (id: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setLastSync: (lastSync: string) => void
  
  // Filtros
  setSearchTerm: (term: string) => void
  setTypeFilter: (type: string | null) => void
  setActiveFilter: (active: boolean | null) => void
  clearFilters: () => void
  
  // Operaciones de DB local
  loadUsersFromDB: () => Promise<void>
  saveUserToDB: (user: UsuarioDB) => Promise<void>
  syncUsers: () => Promise<void>
  
  // Getters computados
  getFilteredUsers: () => UsuarioDB[]
  getUserById: (id: string) => UsuarioDB | undefined
  getUsersByType: (type: string) => UsuarioDB[]
  getActiveUsersCount: () => number
}

export const useUserStore = create<UserState>()(
  subscribeWithSelector((set, get) => ({
    // Estado inicial
    users: [],
    currentUser: null,
    loading: false,
    error: null,
    lastSync: null,
    
    // Filtros
    searchTerm: '',
    typeFilter: null,
    activeFilter: null,
    
    // Acciones básicas
    setUsers: (users) => set({ users }),
    setCurrentUser: (user) => set({ currentUser: user }),
    addUser: (user) => set((state) => ({ 
      users: [...state.users, user] 
    })),
    updateUser: (id, updates) => set((state) => ({
      users: state.users.map(user => 
        user.id === id ? { ...user, ...updates } : user
      )
    })),
    deleteUser: (id) => set((state) => ({
      users: state.users.filter(user => user.id !== id)
    })),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    setLastSync: (lastSync) => set({ lastSync }),
    
    // Filtros
    setSearchTerm: (term) => set({ searchTerm: term }),
    setTypeFilter: (type) => set({ typeFilter: type }),
    setActiveFilter: (active) => set({ activeFilter: active }),
    clearFilters: () => set({ 
      searchTerm: '', 
      typeFilter: null, 
      activeFilter: null 
    }),
    
    // Operaciones de DB
    loadUsersFromDB: async () => {
      try {
        set({ loading: true, error: null })
        const users = await db.getActiveUsuarios()
        set({ users, loading: false })
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Error cargando usuarios', 
          loading: false 
        })
      }
    },
    
    saveUserToDB: async (user) => {
      try {
        await db.usuarios.put(user)
        get().addUser(user)
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Error guardando usuario' 
        })
      }
    },
    
    syncUsers: async () => {
      try {
        set({ loading: true })
        // Importar el servicio de sincronización desde la ruta correcta
        const { syncService } = await import('../sync/syncService')
        await syncService.syncAll()
        await get().loadUsersFromDB()
        set({ lastSync: new Date().toISOString(), loading: false })
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Error sincronizando', 
          loading: false 
        })
      }
    },
    
    // Getters computados
    getFilteredUsers: () => {
      const { users, searchTerm, typeFilter, activeFilter } = get()
      
      return users.filter(user => {
        // Filtro de búsqueda (adaptado a tu estructura)
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase()
          const matchesSearch = 
            user.nombre?.toLowerCase().includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower) ||
            user.telefono?.toLowerCase().includes(searchLower)
          if (!matchesSearch) return false
        }
        
        // Filtro por tipo (adaptado a tu campo 'tipo')
        if (typeFilter && user.roles?.[0] !== typeFilter) return false
        
        // Filtro por estado activo (adaptado a tu campo 'active')
        if (activeFilter !== null) {
          const isActive = user.active === true
          if (isActive !== activeFilter) return false
        }
        
        return true
      })
    },
    
    getUserById: (id) => {
      return get().users.find(user => user.id === id)
    },
    
    getUsersByType: (type) => {
      return get().users.filter(user => user.roles?.[0] === type)
    },
    
    getActiveUsersCount: () => {
      return get().users.filter(user => user.active === true).length
    }
  }))
)

// Selector hooks para optimizar re-renders
export const useUsers = () => useUserStore(state => state.users)
export const useCurrentUser = () => useUserStore(state => state.currentUser)
export const useUserLoading = () => useUserStore(state => state.loading)
export const useUserError = () => useUserStore(state => state.error)
export const useFilteredUsers = () => useUserStore(state => state.getFilteredUsers())

// Hook para acciones
export const useUserActions = () => useUserStore(state => ({
  addUser: state.addUser,
  updateUser: state.updateUser,
  deleteUser: state.deleteUser,
  loadUsersFromDB: state.loadUsersFromDB,
  saveUserToDB: state.saveUserToDB,
  syncUsers: state.syncUsers,
  setSearchTerm: state.setSearchTerm,
  setTypeFilter: state.setTypeFilter,
  setActiveFilter: state.setActiveFilter,
  clearFilters: state.clearFilters,
}))
