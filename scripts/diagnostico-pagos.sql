-- Diagnóstico: Ver qué está mal con los pagos
-- Ejecutar este SQL en Supabase para ver el problema

-- Ver solicitudes PAGADAS y sus pagos
select 
  s.folio,
  s.estatus_pago,
  s.total as total_solicitud,
  s.subtotal,
  s.iva,
  count(p.id) as num_pagos_activos,
  sum(p.monto_neto_pagado) as suma_pagos,
  coalesce(s.total, 0) - coalesce(sum(p.monto_neto_pagado), 0) as diferencia
from public.solicitudes_pago s
left join public.pagos_realizados p 
  on (p.solicitud_pago_id::text = s.id::text or p.folio_solicitud = s.folio)
  and p.active = true
where s.estatus_pago in ('PAGADO', 'PAGADO PARCIALMENTE')
group by s.id, s.folio, s.estatus_pago, s.total, s.subtotal, s.iva
order by s.folio;
