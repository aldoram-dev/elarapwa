-- =====================================================
-- Tabla: pagos_realizados
-- Descripción: Registro detallado de pagos realizados concepto por concepto
-- =====================================================

CREATE TABLE IF NOT EXISTS public.pagos_realizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Relaciones
  solicitud_pago_id INTEGER REFERENCES public.solicitudes_pago(id) ON DELETE CASCADE,
  requisicion_pago_id UUID REFERENCES public.requisiciones_pago(id) ON DELETE CASCADE,
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE CASCADE,
  concepto_contrato_id UUID REFERENCES public.conceptos_contrato(id) ON DELETE CASCADE,
  contratista_id UUID REFERENCES public.contratistas(id) ON DELETE CASCADE,
  
  -- Información del concepto
  concepto_clave TEXT NOT NULL,
  concepto_descripcion TEXT NOT NULL,
  concepto_unidad TEXT,
  
  -- Cantidades y montos originales
  cantidad NUMERIC NOT NULL DEFAULT 0,
  precio_unitario NUMERIC NOT NULL DEFAULT 0,
  importe_concepto NUMERIC NOT NULL DEFAULT 0,
  
  -- Desglose del pago
  monto_bruto NUMERIC NOT NULL DEFAULT 0,
  retencion_porcentaje NUMERIC NOT NULL DEFAULT 0,
  retencion_monto NUMERIC NOT NULL DEFAULT 0,
  anticipo_porcentaje NUMERIC NOT NULL DEFAULT 0,
  anticipo_monto NUMERIC NOT NULL DEFAULT 0,
  monto_neto_pagado NUMERIC NOT NULL DEFAULT 0,
  
  -- Información de pago
  fecha_pago TIMESTAMPTZ NOT NULL,
  numero_pago TEXT,
  metodo_pago TEXT CHECK (metodo_pago IN ('TRANSFERENCIA', 'CHEQUE', 'EFECTIVO', 'OTRO')),
  referencia_pago TEXT,
  
  -- Documentos
  comprobante_pago_url TEXT,
  factura_url TEXT,
  xml_url TEXT,
  respaldo_documental TEXT,
  
  -- Folios relacionados
  folio_solicitud TEXT NOT NULL,
  folio_requisicion TEXT NOT NULL,
  numero_contrato TEXT,
  
  -- Estado y control
  estatus TEXT NOT NULL DEFAULT 'PAGADO' CHECK (estatus IN ('PAGADO', 'REVERTIDO', 'CANCELADO')),
  pagado_por UUID REFERENCES public.usuarios(id),
  aprobado_por UUID REFERENCES public.usuarios(id),
  
  -- Observaciones
  notas TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Estado
  active BOOLEAN NOT NULL DEFAULT TRUE
);

-- =====================================================
-- Índices para mejorar el rendimiento de consultas
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_pagos_realizados_solicitud ON public.pagos_realizados(solicitud_pago_id);
CREATE INDEX IF NOT EXISTS idx_pagos_realizados_requisicion ON public.pagos_realizados(requisicion_pago_id);
CREATE INDEX IF NOT EXISTS idx_pagos_realizados_contrato ON public.pagos_realizados(contrato_id);
CREATE INDEX IF NOT EXISTS idx_pagos_realizados_concepto ON public.pagos_realizados(concepto_contrato_id);
CREATE INDEX IF NOT EXISTS idx_pagos_realizados_fecha ON public.pagos_realizados(fecha_pago);
CREATE INDEX IF NOT EXISTS idx_pagos_realizados_estatus ON public.pagos_realizados(estatus);
CREATE INDEX IF NOT EXISTS idx_pagos_realizados_active ON public.pagos_realizados(active);

-- =====================================================
-- Trigger para updated_at automático
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_pagos_realizados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pagos_realizados_updated_at
  BEFORE UPDATE ON public.pagos_realizados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pagos_realizados_updated_at();

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

ALTER TABLE public.pagos_realizados ENABLE ROW LEVEL SECURITY;

-- Los usuarios autenticados pueden ver todos los pagos
CREATE POLICY "Usuarios pueden ver pagos"
  ON public.pagos_realizados
  FOR SELECT
  TO authenticated
  USING (true);

-- Los usuarios autenticados pueden crear pagos
CREATE POLICY "Usuarios pueden crear pagos"
  ON public.pagos_realizados
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Los usuarios autenticados pueden actualizar pagos
CREATE POLICY "Usuarios pueden actualizar pagos"
  ON public.pagos_realizados
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Los usuarios autenticados pueden eliminar pagos
CREATE POLICY "Usuarios pueden eliminar pagos"
  ON public.pagos_realizados
  FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- Comentarios
-- =====================================================

COMMENT ON TABLE public.pagos_realizados IS 'Registro detallado de pagos realizados concepto por concepto con desglose de retenciones y amortizaciones';
COMMENT ON COLUMN public.pagos_realizados.monto_bruto IS 'Monto del pago antes de retenciones y amortizaciones';
COMMENT ON COLUMN public.pagos_realizados.retencion_monto IS 'Monto retenido (% del monto_bruto)';
COMMENT ON COLUMN public.pagos_realizados.anticipo_monto IS 'Monto amortizado del anticipo (% del monto_bruto)';
COMMENT ON COLUMN public.pagos_realizados.monto_neto_pagado IS 'Monto final pagado = monto_bruto - retencion_monto - anticipo_monto';
