-- Migración: Agregar campo lleva_iva a requisiciones_pago
-- Fecha: 2025-12-27
-- Descripción: Agregar campo booleano para indicar si la requisición lleva IVA

-- Agregar columna lleva_iva (por defecto false)
ALTER TABLE requisiciones_pago
ADD COLUMN IF NOT EXISTS lleva_iva BOOLEAN DEFAULT false;

-- Comentario para documentación
COMMENT ON COLUMN requisiciones_pago.lleva_iva IS 'Indica si la requisición incluye IVA (16%) en el cálculo del total';
