export interface SolicitudPago {
  id?: number;
  folio: string; // SOL-001, SOL-002, etc.
  requisicion_id: string;
  concepto_ids: string[]; // IDs de los conceptos a pagar
  conceptos_detalle: ConceptoSolicitud[];
  deducciones_extra?: DeduccionExtraSolicitud[]; // 📌 Deducciones extra incluidas en la solicitud
  lleva_iva?: boolean; // 🆕 Indica si la solicitud lleva IVA (16%)
  
  // Montos de descuentos aplicados proporcionalmente
  amortizacion_aplicada?: number; // Monto de amortización (anticipo) aplicado a esta solicitud
  retencion_aplicada?: number; // Monto de retención (fondo de garantía) aplicado a esta solicitud  
  otros_descuentos_aplicados?: number; // Otros descuentos aplicados a esta solicitud
  deducciones_extras_total?: number; // Suma total de deducciones extras
  
  // Totales financieros
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
