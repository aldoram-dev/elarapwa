-- Migración: Agregar campo lleva_iva a requisiciones y solicitudes de pago
-- Fecha: 2025-12-30
-- Descripción: Agrega el campo booleano para indicar si incluye IVA (16%) en el cálculo del total

-- Agregar columna lleva_iva a requisiciones_pago
ALTER TABLE requisiciones_pago
ADD COLUMN IF NOT EXISTS lleva_iva BOOLEAN DEFAULT false;

-- Comentario para requisiciones
COMMENT ON COLUMN requisiciones_pago.lleva_iva IS 'Indica si la requisición incluye IVA (16%) en el cálculo del total';

-- Agregar columna lleva_iva a solicitudes_pago
ALTER TABLE solicitudes_pago
ADD COLUMN IF NOT EXISTS lleva_iva BOOLEAN DEFAULT false;

-- Comentario para solicitudes
COMMENT ON COLUMN solicitudes_pago.lleva_iva IS 'Indica si la solicitud incluye IVA (16%) en el cálculo del total. Se hereda de la requisición.';
