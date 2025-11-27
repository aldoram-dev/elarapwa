/**
 * Tipos para Pagos Realizados
 * Sistema de administración de obra
 */

export interface PagoRealizado {
  id: string
  created_at: string
  updated_at: string
  
  // Relaciones
  solicitud_pago_id: string
  requisicion_pago_id: string
  contrato_id: string
  concepto_contrato_id: string
  contratista_id?: string
  
  // Información del concepto
  concepto_clave: string
  concepto_descripcion: string
  concepto_unidad?: string
  
  // Cantidades y montos originales
  cantidad: number
  precio_unitario: number
  importe_concepto: number // Importe total del concepto
  
  // Desglose del pago
  monto_bruto: number // Monto sin descuentos
  retencion_porcentaje: number
  retencion_monto: number
  anticipo_porcentaje: number
  anticipo_monto: number
  monto_neto_pagado: number // Monto final pagado (bruto - retención - anticipo)
  
  // Información de pago
  fecha_pago: string
  numero_pago?: string // Número de transferencia/cheque
  metodo_pago?: 'TRANSFERENCIA' | 'CHEQUE' | 'EFECTIVO' | 'OTRO'
  referencia_pago?: string
  
  // Documentos
  comprobante_pago_url?: string // Comprobante de transferencia/cheque
  factura_url?: string
  xml_url?: string
  respaldo_documental?: string
  
  // Folios relacionados
  folio_solicitud: string
  folio_requisicion: string
  numero_contrato?: string
  
  // Estado y control
  estatus: 'PAGADO' | 'REVERTIDO' | 'CANCELADO'
  pagado_por?: string // ID del usuario que registró el pago
  aprobado_por?: string // ID del usuario que aprobó
  
  // Observaciones
  notas?: string
  metadata?: Record<string, any>
  
  // Auditoría
  active: boolean
  _dirty?: boolean
  last_sync?: string
}

export interface PagoRealizadoConRelaciones extends PagoRealizado {
  solicitud?: {
    id: string
    folio: string
    fecha_solicitud: string
  }
  requisicion?: {
    id: string
    folio: string
    periodo: string
  }
  contrato?: {
    id: string
    numero_contrato?: string
    nombre?: string
  }
  contratista?: {
    id: string
    nombre: string
    razon_social?: string
  }
}

export type PagoRealizadoFormData = Omit<PagoRealizado, 'id' | 'created_at' | 'updated_at'>

// Tipos para resúmenes y reportes
export interface ResumenPagosPorContrato {
  contrato_id: string
  numero_contrato?: string
  total_pagado: number
  total_retenido: number
  total_amortizado: number
  cantidad_pagos: number
}

export interface ResumenPagosPorPeriodo {
  periodo: string // YYYY-MM
  total_pagado: number
  total_retenido: number
  total_amortizado: number
  cantidad_pagos: number
}
