/**
 * Tipos para Contrato
 * Sistema de administración de obra
 */

export type TipoContrato = 
  | 'PRECIO_ALZADO'
  | 'PRECIO_UNITARIO'
  | 'ADMINISTRACION'
  | 'MIXTO'
  | 'Orden de Trabajo'
  | 'Orden de Compra'
  | 'Llave en Mano'
  | 'Prestacion de Servicios'

export type EstatusContrato = 
  | 'BORRADOR'
  | 'EN_REVISION'
  | 'APROBADO'
  | 'ACTIVO'
  | 'FINALIZADO'
  | 'CANCELADO'

export type TratamientoIVA = 
  | 'IVA EXENTO'     // No lleva IVA
  | 'MAS IVA'        // Lleva IVA adicional (16%)
  | 'IVA TASA 0'     // IVA al 0%

export interface Contrato {
  id: string
  created_at: string
  updated_at: string
  
  // Información básica
  numero_contrato?: string // Folio único
  nombre?: string
  clave_contrato?: string // Clave de Contrato
  descripcion?: string
  tipo_contrato?: TipoContrato
  tratamiento?: TratamientoIVA // Tratamiento de IVA del contrato
  
  // Relaciones
  contratista_id: string
  empresa_id?: string
  
  // Categorización (de contratista)
  categoria?: string
  partida?: string
  subpartida?: string
  
  // Montos
  monto_contrato: number // Monto Neto Contratado
  moneda?: string // 'MXN', 'USD'
  anticipo_monto?: number // Monto Neto de Anticipo
  
  // Retenciones y penalizaciones
  retencion_porcentaje?: number // % Retención
  penalizacion_maxima_porcentaje?: number // % Penalización Máxima
  penalizacion_por_dia?: number // Penalización por Día
  
  // Fechas
  fecha_inicio?: string // Fecha de Inicio
  fecha_fin?: string // Fecha de Fin
  fecha_fin_real?: string
  duracion_dias?: number
  
  // Estado
  estatus?: EstatusContrato
  porcentaje_avance?: number
  
  // Estado de Catálogo (Punto 3 - Aprobación de Catálogos)
  catalogo_aprobado?: boolean // Si el catálogo fue aprobado
  catalogo_aprobado_por?: string // ID del usuario que aprobó
  catalogo_fecha_aprobacion?: string // Fecha de aprobación
  catalogo_observaciones?: string // Observaciones de aprobación/rechazo
  
  // Documentos
  contrato_pdf_url?: string // Contrato (PDF)
  documentos_adjuntos?: string[] // URLs de documentos adicionales
  
  // Pagos y finanzas
  forma_pago?: string
  condiciones_pago?: string
  
  // Alcance y especificaciones
  alcance_trabajo?: string
  especificaciones_tecnicas?: string
  
  // Metadata y notas
  notas?: string
  metadata?: Record<string, any>
  
  // Auditoría
  active?: boolean
  created_by?: string
  aprobado_por?: string
  fecha_aprobacion?: string
}

export type ContratoFormData = Omit<Contrato, 'id' | 'created_at' | 'updated_at'>

// Tipos para relaciones expandidas
export interface ContratoWithRelations extends Contrato {
  contratista?: {
    id: string
    nombre: string
    razon_social?: string
    telefono?: string
    email?: string
  }
  proyecto?: {
    id: string
    nombre: string
  }
}
