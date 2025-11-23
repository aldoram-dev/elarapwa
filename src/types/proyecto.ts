export interface Proyecto {
  id: string
  nombre: string
  descripcion?: string
  empresa_id?: string
  portada_url?: string
  // Mapeo opcional para UI
  portada?: import('./files').DocumentW
  // Soft delete flags (en Supabase)
  deleted?: boolean
  deleted_at?: string
  
  // Información de ubicación (opcional)
  direccion?: string
  ciudad?: string
  estado?: string
  pais?: string
  codigo_postal?: string
  
  // Datos de contacto (opcional)
  telefono?: string
  email?: string
  
  // Configuración
  tipo?: 'sucursal' | 'edificio' | 'tienda' | 'oficina' | 'almacen' | 'otro'
  color?: string // Color para identificación visual en el selector
  icono?: string // Nombre del icono (opcional)
  
  // Estado y metadatos
  active?: boolean
  orden?: number // Para ordenar en el selector
  
  // Timestamps
  created_at: string
  updated_at: string
}

// Tipo para crear un nuevo proyecto (sin id ni timestamps)
export type CreateProyectoInput = Omit<Proyecto, 'id' | 'created_at' | 'updated_at'>

// Tipo para actualizar un proyecto (todos los campos opcionales excepto los que no se pueden cambiar)
export type UpdateProyectoInput = Partial<Omit<Proyecto, 'id' | 'created_at' | 'updated_at'>>

// Opciones de tipo de proyecto
export const TIPOS_PROYECTO = [
  { value: 'sucursal', label: 'Sucursal', icon: '🏢' },
  { value: 'edificio', label: 'Edificio', icon: '🏗️' },
  { value: 'tienda', label: 'Tienda', icon: '🏪' },
  { value: 'oficina', label: 'Oficina', icon: '🏢' },
  { value: 'almacen', label: 'Almacén', icon: '📦' },
  { value: 'otro', label: 'Otro', icon: '📍' },
] as const
