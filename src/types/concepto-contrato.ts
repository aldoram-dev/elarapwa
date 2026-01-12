export interface ConceptoContrato {
  id: string;
  created_at: string;
  updated_at: string;
  
  // Relación
  contrato_id: string;
  
  // Categorización
  partida: string;
  subpartida: string;
  actividad: string;
  clave: string;
  
  // Descripción
  concepto: string; // Descripción del concepto
  unidad: string; // m2, m3, pza, kg, etc.
  
  // Cantidades y precios FIJOS (catálogo original)
  cantidad_catalogo: number; // Cantidad original del catálogo
  precio_unitario_catalogo: number; // PU original
  importe_catalogo: number; // cantidad_catalogo * precio_unitario_catalogo
  
  // Cantidades y precios VIVOS (estimaciones)
  cantidad_estimada: number; // Cantidad estimada a la fecha
  precio_unitario_estimacion: number; // PU por estimación
  importe_estimado: number; // cantidad_estimada * precio_unitario_estimacion
  
  // Volumen y monto estimado a la fecha
  volumen_estimado_fecha: number; // VOL estimado a la fecha
  monto_estimado_fecha: number; // $$ estimado a la fecha
  
  // Campos calculados (opcionales, usados en validaciones)
  cantidad_pagada_anterior?: number; // Cantidad ya pagada en requisiciones anteriores
  tiene_cambios?: boolean; // Indica si el concepto tiene cambios aplicados
  cantidad_catalogo_original?: number; // Cantidad original antes de aditivas/deductivas
  
  // Metadata
  notas: string | null;
  orden: number; // Para ordenar conceptos en la UI
  active: boolean;
  metadata: Record<string, any>;
}

export interface ConceptoContratoInsert {
  contrato_id: string;
  partida: string;
  subpartida: string;
  actividad: string;
  clave: string;
  concepto: string;
  unidad: string;
  cantidad_catalogo: number;
  precio_unitario_catalogo: number;
  importe_catalogo?: number; // Se calcula automáticamente
  cantidad_estimada?: number;
  precio_unitario_estimacion?: number;
  importe_estimado?: number;
  volumen_estimado_fecha?: number;
  monto_estimado_fecha?: number;
  notas?: string;
  orden?: number;
}

export interface ConceptoContratoUpdate {
  partida?: string;
  subpartida?: string;
  actividad?: string;
  clave?: string;
  concepto?: string;
  unidad?: string;
  cantidad_catalogo?: number;
  precio_unitario_catalogo?: number;
  importe_catalogo?: number;
  cantidad_estimada?: number;
  precio_unitario_estimacion?: number;
  importe_estimado?: number;
  volumen_estimado_fecha?: number;
  monto_estimado_fecha?: number;
  notas?: string;
  orden?: number;
  active?: boolean;
}

// Para la base de datos offline
export interface ConceptoContratoDB extends ConceptoContrato {
  _dirty: boolean;
  _deleted: boolean;
  last_sync: string | null;
}

// Resumen de conceptos por contrato
export interface ResumenConceptosContrato {
  contrato_id: string;
  total_conceptos: number;
  total_importe_catalogo: number;
  total_importe_estimado: number;
  total_monto_estimado_fecha: number;
  porcentaje_avance: number; // (total_monto_estimado_fecha / total_importe_catalogo) * 100
}
