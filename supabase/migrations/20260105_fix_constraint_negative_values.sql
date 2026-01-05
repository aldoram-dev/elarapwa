-- Arreglar constraint para permitir valores negativos en requisiciones
-- El constraint anterior era muy estricto y no permitía casos donde solo hay retenciones

-- Eliminar el constraint anterior
ALTER TABLE requisiciones_pago
DROP CONSTRAINT IF EXISTS check_requisiciones_total_matches_subtotal_iva;

-- Agregar un constraint más flexible que permita valores negativos
ALTER TABLE requisiciones_pago
ADD CONSTRAINT check_requisiciones_total_matches_subtotal_iva
CHECK (
  -- Permitir si la diferencia es menor a 0.05 (redondeo)
  ABS(total - (subtotal + iva)) < 0.05
  -- O si no lleva IVA y el total = subtotal
  OR (lleva_iva = false AND ABS(total - subtotal) < 0.05)
  -- O si IVA es 0 y total = subtotal (caso de retenciones sin IVA)
  OR (iva = 0 AND ABS(total - subtotal) < 0.05)
);

-- Hacer lo mismo para solicitudes_pago
ALTER TABLE solicitudes_pago
DROP CONSTRAINT IF EXISTS check_solicitudes_total_matches_subtotal_iva;

ALTER TABLE solicitudes_pago
ADD CONSTRAINT check_solicitudes_total_matches_subtotal_iva
CHECK (
  ABS(total - (subtotal + iva)) < 0.05
  OR (lleva_iva = false AND ABS(total - subtotal) < 0.05)
  OR (iva = 0 AND ABS(total - subtotal) < 0.05)
);
