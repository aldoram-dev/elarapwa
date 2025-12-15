-- Corregir monto_pagado en solicitudes_pago para que use el total (neto) no el bruto
-- El monto_pagado debe ser igual al total de la solicitud (que ya tiene descuentos aplicados)

-- Ver estado actual
SELECT 
  s.folio,
  s.subtotal as monto_bruto,
  s.total as monto_neto,
  s.monto_pagado as monto_pagado_actual,
  s.estatus_pago,
  CASE 
    WHEN s.estatus_pago IN ('PAGADO', 'PAGADO PARCIALMENTE') 
      AND s.monto_pagado != s.total 
    THEN 'INCORRECTO'
    ELSE 'CORRECTO'
  END as estado
FROM solicitudes_pago s
WHERE s.estatus_pago IN ('PAGADO', 'PAGADO PARCIALMENTE')
ORDER BY s.created_at;

-- Actualizar las solicitudes pagadas para que monto_pagado = total (neto)
UPDATE solicitudes_pago
SET 
  monto_pagado = total,
  updated_at = NOW()
WHERE 
  estatus_pago IN ('PAGADO', 'PAGADO PARCIALMENTE')
  AND monto_pagado != total;

-- Verificar cambios
SELECT 
  s.folio,
  s.subtotal as monto_bruto,
  s.total as monto_neto,
  s.monto_pagado as monto_pagado_corregido,
  s.estatus_pago
FROM solicitudes_pago s
WHERE s.estatus_pago IN ('PAGADO', 'PAGADO PARCIALMENTE')
ORDER BY s.created_at;
