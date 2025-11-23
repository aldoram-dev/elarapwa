/**
 * Tipo para Empresa
 * Representa una organización que gestiona proyectos y usuarios
 */
export interface Empresa {
  id: string
  nombre: string
  telefono?: string | null
  correo?: string | null
  logo_url?: string | null
  metadata?: Record<string, any>
  created_at?: string
  updated_at?: string
}
