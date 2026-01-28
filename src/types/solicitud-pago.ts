export interface SolicitudPago {
  id?: number;
  folio: string; // SOL-001, SOL-002, etc.
  requisicion_id: string;
  concepto_ids: string[]; // IDs de los conceptos a pagar
  conceptos_detalle: ConceptoSolicitud[];
  deducciones_extra?: DeduccionExtraSolicitud[]; // 📌 Deducciones extra incluidas en la solicitud
  lleva_iva?: boolean; // 🆕 Indica si la solicitud lleva IVA (16%)
  
  // 🔒 MONTOS CONGELADOS - Se copian de requisición y NO se recalculan
  // Estos valores se guardan cuando se crea la solicitud y permanecen fijos
  subtotal_calculo?: number; // Suma de importes de conceptos (antes de descuentos)
  amortizacion_porcentaje?: number; // % de amortización aplicado (ej: 30)
  amortizacion_aplicada?: number; // Monto de amortización (anticipo) aplicado a esta solicitud
  retencion_porcentaje?: number; // % de retención aplicado (ej: 5)
  retencion_aplicada?: number; // Monto de retención (fondo de garantía) aplicado a esta solicitud
  retenciones_esp_aplicadas?: number; // Retenciones especiales que se aplican (restan)
  retenciones_esp_regresadas?: number; // Retenciones especiales que se regresan (suman)
  otros_descuentos_aplicados?: number; // Otros descuentos aplicados a esta solicitud
  deducciones_extras_total?: number; // Suma total de deducciones extras
  subtotal_descuentos?: number; // Subtotal después de descuentos, antes de IVA
  iva_porcentaje?: number; // % de IVA (16 o 0)
  iva_monto?: number; // Monto de IVA calculado
  total_final?: number; // Total final (subtotal_descuentos + iva_monto)
  
  // 📄 Control de carátula
  caratura_generada?: boolean; // Si se generó la carátula
  caratura_url?: string; // URL del PDF de la carátula
  caratura_fecha_generacion?: string; // Cuándo se generó
  caratura_bloqueada?: boolean; // Si está bloqueada (no se puede recalcular)
  
  // Totales financieros (DEPRECATED - usar los campos congelados arriba)
  subtotal: number; // Subtotal después de deducciones, antes de IVA
  iva: number; // Monto de IVA (16%) si lleva_iva = true, 0 si no
  total: number; // subtotal + iva
  fecha: string;
  estado: 'pendiente' | 'aprobada' | 'pagada' | 'rechazada';
  notas?: string;
  
  // Aprobación
  aprobada?: boolean;
  aprobada_por?: string;
  aprobada_fecha?: string;
  
  // Pago
  monto_pagado?: number;
  fecha_pago?: string;
  fecha_pago_esperada?: string; // Calculada: fecha solicitud + 15 días (ajustada a viernes)
  referencia_pago?: string;
  comprobante_pago_url?: string; // URL del PDF de la factura
  factura_xml_url?: string; // URL del XML de la factura (opcional)
  estatus_pago?: 'NO PAGADO' | 'PAGADO' | 'PAGADO PARCIALMENTE';
  
  // Vo.Bo. Gerencia (REQUERIDO antes de aparecer en Pagos)
  vobo_gerencia?: boolean;
  vobo_gerencia_por?: string;
  vobo_gerencia_fecha?: string;
  observaciones_gerencia?: string;
  
  // Vo.Bo. Desarrollador
  vobo_desarrollador?: boolean;
  vobo_desarrollador_por?: string;
  vobo_desarrollador_fecha?: string;
  
  // Vo.Bo. Finanzas
  vobo_finanzas?: boolean;
  vobo_finanzas_por?: string;
  vobo_finanzas_fecha?: string;
  
  // Observaciones
  observaciones_desarrollador?: string;
  
  created_at: string;
  updated_at: string;
  _dirty?: boolean;
}

export interface ConceptoSolicitud {
  concepto_id: string;
  concepto_clave: string;
  concepto_descripcion: string;
  cantidad: number;
  precio_unitario: number;
  importe: number;
  
  // Pago por concepto individual
  pagado?: boolean;
  monto_pagado?: number;
  comprobante_url?: string;
  fecha_pago?: string;
  respaldo_documental?: string;
}

export interface DeduccionExtraSolicitud {
  deduccion_id: string;
  descripcion: string;
  monto: number;
  observaciones?: string;
  
  // Pago
  pagado?: boolean;
  fecha_pago?: string;
  comprobante_url?: string;
}
