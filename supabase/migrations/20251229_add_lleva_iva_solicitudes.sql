-- Migración: Agregar campo lleva_iva a solicitudes_pago
-- Fecha: 2025-12-29
-- Descripción: Agrega el campo para indicar si la solicitud de pago incluye IVA (16%)

-- Agregar columna lleva_iva (por defecto false)
ALTER TABLE solicitudes_pago
ADD COLUMN IF NOT EXISTS lleva_iva BOOLEAN DEFAULT false;

-- Agregar comentario descriptivo
COMMENT ON COLUMN solicitudes_pago.lleva_iva IS 'Indica si la solicitud incluye IVA (16%) en el cálculo del total. Se hereda de la requisición.';
