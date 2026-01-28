-- Migration: Agregar campos congelados a solicitudes_pago
-- Problema #1: Congelar montos para que NO recalculen después de aprobación
-- Los valores se COPIAN de la requisición al crear la solicitud y NO se recalculan NUNCA

-- Agregar campos de cálculo congelado
ALTER TABLE solicitudes_pago
ADD COLUMN IF NOT EXISTS subtotal_calculo numeric,
ADD COLUMN IF NOT EXISTS amortizacion_porcentaje numeric,
ADD COLUMN IF NOT EXISTS amortizacion_aplicada numeric,
ADD COLUMN IF NOT EXISTS amortizacion_base_contrato numeric,
ADD COLUMN IF NOT EXISTS amortizacion_metodo text,
ADD COLUMN IF NOT EXISTS retencion_porcentaje numeric,
ADD COLUMN IF NOT EXISTS retencion_ordinaria_aplicada numeric,
ADD COLUMN IF NOT EXISTS retenciones_esp_aplicadas numeric,
ADD COLUMN IF NOT EXISTS retenciones_esp_regresadas numeric,
ADD COLUMN IF NOT EXISTS tratamiento_iva text,
ADD COLUMN IF NOT EXISTS iva_porcentaje numeric;

-- Campos de control de carátula
ALTER TABLE solicitudes_pago
ADD COLUMN IF NOT EXISTS caratura_generada boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS caratura_bloqueada boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fecha_bloqueo_caratura timestamptz;

-- Agregar comentarios
COMMENT ON COLUMN solicitudes_pago.subtotal_calculo IS 'Subtotal copiado de requisición (CONGELADO, NO RECALCULAR)';
COMMENT ON COLUMN solicitudes_pago.amortizacion_porcentaje IS 'Porcentaje de amortización copiado de requisición (CONGELADO)';
COMMENT ON COLUMN solicitudes_pago.amortizacion_aplicada IS 'Monto de amortización copiado de requisición (CONGELADO)';
COMMENT ON COLUMN solicitudes_pago.amortizacion_base_contrato IS 'Base de cálculo de amortización (CONGELADO)';
COMMENT ON COLUMN solicitudes_pago.amortizacion_metodo IS 'Método de amortización usado (CONGELADO)';
COMMENT ON COLUMN solicitudes_pago.retencion_porcentaje IS 'Porcentaje de retención ordinaria (CONGELADO)';
COMMENT ON COLUMN solicitudes_pago.retencion_ordinaria_aplicada IS 'Monto de retención ordinaria (CONGELADO)';
COMMENT ON COLUMN solicitudes_pago.retenciones_esp_aplicadas IS 'Retenciones especiales aplicadas de contrato (CONGELADO)';
COMMENT ON COLUMN solicitudes_pago.retenciones_esp_regresadas IS 'Retenciones especiales regresadas de contrato (CONGELADO)';
COMMENT ON COLUMN solicitudes_pago.tratamiento_iva IS 'Tratamiento de IVA: IVA EXENTO, MAS IVA, IVA TASA 0 (CONGELADO)';
COMMENT ON COLUMN solicitudes_pago.iva_porcentaje IS 'Porcentaje de IVA aplicado (CONGELADO)';
COMMENT ON COLUMN solicitudes_pago.caratura_generada IS 'Indica si ya se generó la carátula (PDF)';
COMMENT ON COLUMN solicitudes_pago.caratura_bloqueada IS 'Indica si la carátula está bloqueada (no permite recalcular)';
COMMENT ON COLUMN solicitudes_pago.fecha_bloqueo_caratura IS 'Fecha en que se bloqueó la carátula';

-- Agregar restricciones
ALTER TABLE solicitudes_pago
ADD CONSTRAINT check_amortizacion_metodo_solicitud
  CHECK (amortizacion_metodo IS NULL OR amortizacion_metodo IN ('PORCENTAJE_CONTRATO', 'PORCENTAJE_REQUISICION', 'MONTO_FIJO'));

ALTER TABLE solicitudes_pago
ADD CONSTRAINT check_tratamiento_iva_solicitud
  CHECK (tratamiento_iva IS NULL OR tratamiento_iva IN ('IVA EXENTO', 'MAS IVA', 'IVA TASA 0'));

-- Índices para mejorar consultas de carátulas bloqueadas
CREATE INDEX IF NOT EXISTS idx_solicitudes_caratura_bloqueada ON solicitudes_pago(caratura_bloqueada);
CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha_bloqueo ON solicitudes_pago(fecha_bloqueo_caratura);
