-- ================================================================
-- SCRIPT: Corregir monto_pagado en solicitudes_pago
-- ================================================================
-- PROPÓSITO: Recalcular el monto_pagado para reflejar el monto NETO
--            (después de retención y anticipo) en lugar del bruto
-- FECHA: 2025-12-06
-- ================================================================

BEGIN;

-- Mostrar estado actual antes de la corrección
SELECT 
  s.folio,
  c.numero_contrato,
  s.total as importe_bruto,
  COALESCE(c.retencion_porcentaje, 0) as porc_retencion,
  COALESCE((c.anticipo_monto / NULLIF(c.monto_contrato, 0)) * 100, 0) as porc_anticipo,
  ROUND((s.total * COALESCE(c.retencion_porcentaje, 0) / 100)::numeric, 2) as monto_retencion,
  ROUND((s.total * COALESCE((c.anticipo_monto / NULLIF(c.monto_contrato, 0)) * 100, 0) / 100)::numeric, 2) as monto_anticipo,
  ROUND((s.total - 
         (s.total * COALESCE(c.retencion_porcentaje, 0) / 100) - 
         (s.total * COALESCE((c.anticipo_monto / NULLIF(c.monto_contrato, 0)) * 100, 0) / 100))::numeric, 2) as monto_neto_calculado,
  s.monto_pagado as monto_pagado_actual,
  s.estatus_pago
FROM solicitudes_pago s
INNER JOIN requisiciones_pago r ON s.requisicion_id = r.id
INNER JOIN contratos c ON r.contrato_id = c.id
WHERE s.estatus_pago = 'PAGADO'
ORDER BY s.folio;

-- Actualizar monto_pagado con el cálculo correcto (monto neto)
-- Usando los porcentajes del CONTRATO, no de la requisición
UPDATE solicitudes_pago s
SET 
  monto_pagado = ROUND(
    (s.total - 
     (s.total * COALESCE(c.retencion_porcentaje, 0) / 100) - 
     (s.total * COALESCE((c.anticipo_monto / NULLIF(c.monto_contrato, 0)) * 100, 0) / 100)
    )::numeric, 
    2
  ),
  updated_at = NOW()
FROM requisiciones_pago r
INNER JOIN contratos c ON r.contrato_id = c.id
WHERE s.requisicion_id = r.id
  AND s.estatus_pago = 'PAGADO'
  AND s.monto_pagado IS NOT NULL;

-- Mostrar estado después de la corrección
SELECT 
  s.folio,
  c.numero_contrato,
  s.total as importe_bruto,
  COALESCE(c.retencion_porcentaje, 0) as porc_retencion,
  COALESCE((c.anticipo_monto / NULLIF(c.monto_contrato, 0)) * 100, 0) as porc_anticipo,
  ROUND((s.total * COALESCE(c.retencion_porcentaje, 0) / 100)::numeric, 2) as monto_retencion,
  ROUND((s.total * COALESCE((c.anticipo_monto / NULLIF(c.monto_contrato, 0)) * 100, 0) / 100)::numeric, 2) as monto_anticipo,
  s.monto_pagado as monto_neto_corregido,
  s.estatus_pago
FROM solicitudes_pago s
INNER JOIN requisiciones_pago r ON s.requisicion_id = r.id
INNER JOIN contratos c ON r.contrato_id = c.id
WHERE s.estatus_pago = 'PAGADO'
ORDER BY s.folio;

COMMIT;

-- ================================================================
-- NOTAS:
-- ================================================================
-- 1. Este script solo afecta solicitudes con estatus_pago = 'PAGADO'
-- 2. El cálculo es: monto_neto = total - (total * retención%) - (total * anticipo%)
-- 3. Se redondea a 2 decimales para consistencia
-- 4. Se actualiza updated_at para tracking
-- ================================================================
