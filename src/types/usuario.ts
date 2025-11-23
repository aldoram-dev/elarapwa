export interface Usuario {
  id: string
  email: string
  nombre?: string
  telefono?: string
  avatar_url?: string
  contratista_id?: string  // Solo contratista, NO empresa
  nivel?: string           // Nivel jerárquico: Usuario, Administrador, etc.
  roles?: string[]         // Array de roles múltiples
  active?: boolean
  created_at: string
  updated_at: string
}

// Alias para mantener compatibilidad temporal
export type Perfil = Usuario
