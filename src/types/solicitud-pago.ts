export interface SolicitudPago {
  id?: number;
  folio: string; // SOL-001, SOL-002, etc.
  proyecto_id: string;
  requisicion_id: string;
  concepto_ids: string[]; // IDs de los conceptos a pagar
  conceptos_detalle: ConceptoSolicitud[];
  deducciones_extra?: DeduccionExtraSolicitud[]; // 📌 Deducciones extra incluidas en la solicitud
  subtotal: number;
  total: number;
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
  comprobante_pago_url?: string;
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
