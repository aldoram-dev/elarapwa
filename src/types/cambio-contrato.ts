/**
 * Tipos para Cambios de Contrato (Aditivas, Deductivas, Extras)
 * Sistema de administración de obra
 */

export type TipoCambioContrato = 'ADITIVA' | 'DEDUCTIVA' | 'EXTRA' | 'DEDUCCION_EXTRA' | 'RETENCION';

export type EstatusCambio = 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'RECHAZADO' | 'APLICADO';

// Cambio de Contrato (Header)
export interface CambioContrato {
  id: string;
  created_at: string;
  updated_at: string;
  
  // Relaciones
  contrato_id: string;
  
  // Información básica
  numero_cambio: string; // Folio del cambio (ADT-001, DED-001, EXT-001)
  tipo_cambio: TipoCambioContrato;
  descripcion: string;
  
  // Montos
  monto_cambio: number; // Monto total del cambio (positivo o negativo)
  monto_contrato_anterior: number; // Monto del contrato antes del cambio
  monto_contrato_nuevo: number; // Monto del contrato después del cambio
  
  // Fechas
  fecha_cambio: string;
  fecha_aprobacion?: string;
  fecha_aplicacion?: string;
  
  // Estado
  estatus: EstatusCambio;
  
  // Documentos (para EXTRA especialmente)
  archivo_plantilla_url?: string; // Plantilla subida con conceptos extras
  archivo_aprobacion_url?: string; // Documento de aprobación del cambio
  documentos_soporte?: string[]; // Documentos adicionales
  
  // Aprobaciones
  solicitado_por?: string;
  aprobado_por?: string;
  revisado_por?: string;
  
  // Observaciones
  motivo_cambio?: string;
  observaciones?: string;
  notas_aprobacion?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  active: boolean;
  _dirty?: boolean;
  last_sync?: string;
}

// Detalle de Aditiva/Deductiva (conceptos modificados del catálogo ordinario)
export interface DetalleAditivaDeductiva {
  id: string;
  created_at: string;
  updated_at: string;
  
  // Relaciones
  cambio_contrato_id: string;
  concepto_contrato_id: string; // Concepto original del catálogo
  
  // Datos del concepto original
  concepto_clave: string;
  concepto_descripcion: string;
  concepto_unidad: string;
  precio_unitario: number;
  
  // Cantidades
  cantidad_original: number; // Cantidad en el catálogo ordinario
  cantidad_modificacion: number; // Cantidad que se suma o resta
  cantidad_nueva: number; // Cantidad resultante (original + modificacion)
  
  // Importes
  importe_modificacion: number; // Importe del cambio (cantidad_modificacion * precio_unitario)
  
  // Metadata
  observaciones?: string;
  active: boolean;
  _dirty?: boolean;
  last_sync?: string;
}

// Detalle de Extra (conceptos extraordinarios - nuevos conceptos no contemplados en catálogo ordinario)
export interface DetalleExtra {
  id: string;
  created_at: string;
  updated_at: string;
  
  // Relaciones
  cambio_contrato_id: string;
  
  // Datos del concepto extra
  partida?: string;
  subpartida?: string;
  actividad?: string;
  concepto_clave: string;
  concepto_descripcion: string;
  concepto_unidad: string;
  
  // Cantidades y precios
  cantidad: number;
  precio_unitario: number;
  importe: number; // cantidad * precio_unitario
  
  // Metadata
  observaciones?: string;
  active: boolean;
  _dirty?: boolean;
  last_sync?: string;
}

// Deducción Extra (deducciones directas sin concepto de catálogo)
export interface DeduccionExtra {
  id: string;
  created_at: string;
  updated_at: string;
  
  // Relaciones
  cambio_contrato_id: string;
  
  // Datos de la deducción
  descripcion: string;
  monto: number; // Monto positivo (se convierte a negativo en cambio_contrato)
  
  // Metadata
  observaciones?: string;
  active: boolean;
  _dirty?: boolean;
  last_sync?: string;
}

// Retención de Contrato (retenciones que se aplican y regresan en requisiciones)
export interface RetencionContrato {
  id: string;
  created_at: string;
  updated_at: string;
  
  // Relaciones
  cambio_contrato_id: string;
  
  // Datos de la retención
  descripcion: string;
  monto: number; // Monto total de la retención
  monto_aplicado: number; // Monto ya aplicado en requisiciones
  monto_regresado: number; // Monto ya regresado en requisiciones
  monto_disponible: number; // Monto disponible = monto - monto_aplicado + monto_regresado
  
  // Metadata
  observaciones?: string;
  active: boolean;
  _dirty?: boolean;
  last_sync?: string;
}

// Tipos para relaciones expandidas
export interface CambioContratoConRelaciones extends CambioContrato {
  contrato?: {
    id: string;
    numero_contrato?: string;
    nombre?: string;
    monto_contrato: number;
  };
  detalles_aditiva_deductiva?: DetalleAditivaDeductiva[];
  detalles_extra?: DetalleExtra[];
  deducciones_extra?: DeduccionExtra[];
  retenciones_contrato?: RetencionContrato[];
}

export interface ResumenCambiosContrato {
  contrato_id: string;
  monto_original: number;
  total_aditivas: number;
  total_deductivas: number;
  total_extras: number;
  total_deducciones_extra: number;
  total_retenciones: number;
  monto_actual: number;
  cantidad_cambios: number;
  cambios: CambioContratoConRelaciones[];
}

export type CambioContratoFormData = Omit<CambioContrato, 'id' | 'created_at' | 'updated_at'>;
export type DetalleAditivaDeductivaFormData = Omit<DetalleAditivaDeductiva, 'id' | 'created_at' | 'updated_at'>;
export type DetalleExtraFormData = Omit<DetalleExtra, 'id' | 'created_at' | 'updated_at'>;
export type DeduccionExtraFormData = Omit<DeduccionExtra, 'id' | 'created_at' | 'updated_at'>;
export type RetencionContratoFormData = Omit<RetencionContrato, 'id' | 'created_at' | 'updated_at'>;
