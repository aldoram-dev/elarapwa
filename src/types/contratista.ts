/**
 * Tipos para Contratista
 * Sistema de administración de obra inmobiliaria
 */

export interface Contratista {
  id: string
  created_at: string
  updated_at: string
  
  // Información básica
  nombre: string // Nombre o Razón Social
  categoria?: string // Categoría del contratista (ej: Obra Civil, Instalaciones, etc)
  partida?: string // Partida presupuestal
  
  // Localización y contacto
  localizacion?: string // Dirección Fiscal
  telefono?: string
  correo_contacto?: string // Correo Electrónico de Contacto
  
  // Información bancaria
  numero_cuenta_bancaria?: string
  banco?: string
  nombre_cuenta?: string // Nombre al que está la cuenta
  
  // Documentos (URLs en storage)
  csf_url?: string // Constancia de Situación Fiscal
  cv_url?: string // Curriculum Vitae
  acta_constitutiva_url?: string
  repse_url?: string // Registro de Prestadoras de Servicios Especializados
  ine_url?: string
  registro_patronal_url?: string
  comprobante_domicilio_url?: string
  
  // Estado y metadata
  active: boolean
  notas?: string
  metadata?: Record<string, any>
  
  // Relaciones
  created_by?: string
}

export type ContratistaFormData = Omit<Contratista, 'id' | 'created_at' | 'updated_at'>

// Tipos para insertar (sin campos auto-generados)
export type ContratistaInsert = Omit<Contratista, 'id' | 'created_at' | 'updated_at'>

// Tipos para actualizar (todos los campos opcionales excepto los del sistema)
export type ContratistaUpdate = Partial<Omit<Contratista, 'id' | 'created_at' | 'updated_at'>>

// Tipos para los archivos que se pueden subir
export interface ContratistaDocumentos {
  csf?: File
  cv?: File
  acta_constitutiva?: File
  repse?: File
  ine?: File
  registro_patronal?: File
  comprobante_domicilio?: File
}
