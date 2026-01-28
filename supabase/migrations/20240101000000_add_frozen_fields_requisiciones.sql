-- Migration: Agregar campos congelados a requisiciones_pago
-- Problema #1: Congelar montos para que NO recalculen después de aprobación
-- Los valores se calculan UNA VEZ al crear la requisición y se guardan permanentemente

-- Agregar campos de amortización (anticipo)
ALTER TABLE requisiciones_pago
ADD COLUMN IF NOT EXISTS amortizacion_porcentaje numeric,
ADD COLUMN IF NOT EXISTS amortizacion_base_contrato numeric,
ADD COLUMN IF NOT EXISTS amortizacion_metodo text;

-- Agregar campos de retención ordinaria
ALTER TABLE requisiciones_pago
ADD COLUMN IF NOT EXISTS retencion_ordinaria_porcentaje numeric;

-- Agregar campos de IVA
ALTER TABLE requisiciones_pago
ADD COLUMN IF NOT EXISTS tratamiento_iva text,
ADD COLUMN IF NOT EXISTS iva_porcentaje numeric;

-- Agregar comentarios para documentar el propósito
COMMENT ON COLUMN requisiciones_pago.amortizacion_porcentaje IS 'Porcentaje de amortización aplicado al crear la requisición (CONGELADO)';
COMMENT ON COLUMN requisiciones_pago.amortizacion_base_contrato IS 'Monto del contrato usado como base para calcular amortización (CONGELADO)';
COMMENT ON COLUMN requisiciones_pago.amortizacion_metodo IS 'Método usado: PORCENTAJE_CONTRATO, PORCENTAJE_REQUISICION, MONTO_FIJO (CONGELADO)';
COMMENT ON COLUMN requisiciones_pago.retencion_ordinaria_porcentaje IS 'Porcentaje de retención ordinaria (fondo de garantía) aplicado (CONGELADO)';
COMMENT ON COLUMN requisiciones_pago.tratamiento_iva IS 'Tratamiento de IVA copiado del contrato: IVA EXENTO, MAS IVA, IVA TASA 0 (CONGELADO)';
COMMENT ON COLUMN requisiciones_pago.iva_porcentaje IS 'Porcentaje de IVA aplicado (16 o 0) (CONGELADO)';

-- Agregar restricciones
ALTER TABLE requisiciones_pago
ADD CONSTRAINT check_amortizacion_metodo 
  CHECK (amortizacion_metodo IS NULL OR amortizacion_metodo IN ('PORCENTAJE_CONTRATO', 'PORCENTAJE_REQUISICION', 'MONTO_FIJO'));

ALTER TABLE requisiciones_pago
ADD CONSTRAINT check_tratamiento_iva 
  CHECK (tratamiento_iva IS NULL OR tratamiento_iva IN ('IVA EXENTO', 'MAS IVA', 'IVA TASA 0'));
