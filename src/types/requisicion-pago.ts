/**
 * Tipos para el módulo de Requisiciones de Pago
 * Sistema de pagos por conceptos de contrato con cálculos de amortización y retenciones
 */

// Concepto individual dentro de una requisición
export interface RequisicionConcepto {
  concepto_contrato_id: string; // ID del concepto del catálogo del contrato
  clave: string; // CLAVE del concepto para referencia
  concepto: string; // Descripción del concepto
  unidad: string;
  cantidad_catalogo: number; // Cantidad total en catálogo
  cantidad_pagada_anterior: number; // Suma de cantidades pagadas en requisiciones anteriores
  cantidad_esta_requisicion: number; // Cantidad que se paga en esta requisición
  precio_unitario: number;
  importe: number; // cantidad_esta_requisicion * precio_unitario
  es_general?: boolean; // true si es un concepto libre (no del catálogo)
  tipo?: 'CONCEPTO' | 'DEDUCCION'; // tipo de item: concepto normal o deducción extra
}

// Requisición de Pago principal
export interface RequisicionPago {
  id: string; // UUID
  contrato_id: string; // FK al contrato
  proyecto_id?: string; // Heredado del contrato
  numero: string; // Número consecutivo de requisición (ej: "REQ-001")
  fecha: string; // ISO date string
  
  // Conceptos pagados en esta requisición
  conceptos: RequisicionConcepto[];
  
  // Montos calculados
  monto_estimado: number; // Suma de importes de conceptos
  amortizacion: number; // Monto de amortización (ej: anticipo)
  retencion: number; // Retenciones (ej: 5% fondo de garantía)
  otros_descuentos: number; // Otros descuentos aplicables
  retenciones_aplicadas?: number; // 🆕 Retenciones de contrato aplicadas (se restan)
  retenciones_regresadas?: number; // 🆕 Retenciones de contrato regresadas (se suman)
  total: number; // monto_estimado - amortizacion - retencion - otros_descuentos - retenciones_aplicadas + retenciones_regresadas
  
  // Documentación
  descripcion_general?: string; // Descripción general de los trabajos
  notas?: string;
  respaldo_documental?: string[]; // URLs o referencias a archivos
  factura_url?: string; // URL de la factura subida por el contratista
  
  // Estado
  estado: 'borrador' | 'enviada' | 'aprobada' | 'pagada' | 'cancelada';
  
  // Estatus de Pago (se actualiza automáticamente con los pagos registrados)
  estatus_pago?: 'NO PAGADO' | 'PAGADO' | 'PAGADO PARCIALMENTE';
  
  // Visto Bueno (Aprobación)
  visto_bueno?: boolean; // Si se dio visto bueno
  visto_bueno_por?: string; // Usuario que dio visto bueno
  visto_bueno_fecha?: string; // ISO timestamp cuando se dio
  fecha_pago_estimada?: string; // ISO date string - calculada al dar visto bueno
  
  // Metadata de auditoría
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  created_by?: string; // Usuario que creó
  
  // Sincronización
  _dirty?: boolean;
  _deleted?: boolean;
  last_sync?: string;
}

// DTO para crear/actualizar requisición
export interface RequisicionPagoInput {
  contrato_id: string;
  numero?: string;
  fecha: string;
  conceptos: RequisicionConcepto[];
  amortizacion?: number;
  retencion?: number;
  otros_descuentos?: number;
  notas?: string;
  respaldo_documental?: string[];
  factura_url?: string;
  estado?: 'borrador' | 'enviada' | 'aprobada' | 'pagada' | 'cancelada';
}

// Resumen de avances por concepto (para reportes)
export interface AvanceConcepto {
  concepto_contrato_id: string;
  clave: string;
  concepto: string;
  cantidad_catalogo: number;
  cantidad_pagada_total: number; // Suma de todas las requisiciones
  porcentaje_avance: number; // (cantidad_pagada_total / cantidad_catalogo) * 100
  monto_catalogo: number;
  monto_pagado_total: number;
}

// Resumen de avance del contrato
export interface AvanceContrato {
  contrato_id: string;
  monto_total_contrato: number;
  monto_pagado_total: number;
  porcentaje_avance: number;
  numero_requisiciones: number;
  conceptos: AvanceConcepto[];
}
