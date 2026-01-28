-- Actualiza montos de pagos_realizados usando el total_neto de la solicitud
-- Para solicitudes PAGADO o PAGADO PARCIALMENTE
-- Distribuye el total_neto entre los conceptos pagados proporcionalmente

create or replace function public.actualizar_montos_pagos_desde_solicitud(dry_run boolean default true)
returns table(
  solicitudes_procesadas int,
  pagos_actualizados int,
  monto_antes numeric,
  monto_despues numeric
)
language plpgsql
as $$
declare
  v_solicitudes_procesadas int := 0;
  v_pagos_actualizados int := 0;
  v_monto_antes numeric := 0;
  v_monto_despues numeric := 0;
begin
  if dry_run then
    -- Solo reportar qué se haría
    return query
    with solicitudes_pagadas as (
      select
        s.id as solicitud_id,
        s.folio,
        s.total_neto,
        s.estatus_pago,
        count(p.id) as num_pagos,
        sum(p.monto_neto_pagado) as monto_actual
      from public.solicitudes_pago s
      inner join public.pagos_realizados p
        on (p.solicitud_pago_id = s.id::text or p.folio_solicitud = s.folio)
        and p.active = true
      where s.estatus_pago in ('PAGADO', 'PAGADO PARCIALMENTE')
        and s.total_neto is not null
        and s.total_neto > 0
      group by s.id, s.folio, s.total_neto, s.estatus_pago
    )
    select
      count(*)::int as solicitudes_procesadas,
      sum(num_pagos)::int as pagos_actualizados,
      sum(monto_actual)::numeric as monto_antes,
      sum(total_neto)::numeric as monto_despues
    from solicitudes_pagadas;
    
    return;
  end if;

  -- Ejecutar actualización
  with solicitudes_pagadas as (
    select
      s.id as solicitud_id,
      s.folio,
      s.total_neto,
      coalesce(s.subtotal_calculo, s.subtotal, 0) as subtotal_bruto,
      s.iva_porcentaje,
      s.lleva_iva,
      s.retencion_porcentaje,
      s.amortizacion_porcentaje,
      coalesce(s.retencion_aplicada, 0) as retencion_monto,
      coalesce(s.amortizacion_aplicada, 0) as amortizacion_monto
    from public.solicitudes_pago s
    where s.estatus_pago in ('PAGADO', 'PAGADO PARCIALMENTE')
      and s.total_neto is not null
      and s.total_neto > 0
  ),
  pagos_por_solicitud as (
    select
      sp.solicitud_id,
      sp.folio,
      sp.total_neto,
      sp.subtotal_bruto,
      sp.iva_porcentaje,
      sp.lleva_iva,
      sp.retencion_porcentaje,
      sp.amortizacion_porcentaje,
      sp.retencion_monto,
      sp.amortizacion_monto,
      p.id as pago_id,
      p.importe_concepto as importe_actual,
      p.monto_neto_pagado as monto_actual,
      row_number() over (partition by sp.solicitud_id order by p.created_at) as rn,
      count(*) over (partition by sp.solicitud_id) as total_pagos
    from solicitudes_pagadas sp
    inner join public.pagos_realizados p
      on (p.solicitud_pago_id = sp.solicitud_id::text or p.folio_solicitud = sp.folio)
      and p.active = true
  ),
  calculos as (
    select
      pago_id,
      total_neto,
      subtotal_bruto,
      iva_porcentaje,
      lleva_iva,
      retencion_porcentaje,
      amortizacion_porcentaje,
      monto_actual,
      importe_actual,
      -- Dividir totales de la solicitud entre número de pagos
      round((coalesce(subtotal_bruto, 0) / total_pagos)::numeric, 2) as nuevo_monto_bruto,
      round((coalesce(retencion_monto, 0) / total_pagos)::numeric, 2) as nuevo_retencion_monto,
      round((coalesce(amortizacion_monto, 0) / total_pagos)::numeric, 2) as nuevo_anticipo_monto,
      -- Subtotal = bruto - retenciones - anticipo
      round((coalesce(subtotal_bruto, 0) / total_pagos - 
             coalesce(retencion_monto, 0) / total_pagos - 
             coalesce(amortizacion_monto, 0) / total_pagos)::numeric, 2) as nuevo_subtotal,
      -- IVA sobre el subtotal
      case
        when coalesce(iva_porcentaje, 0) > 0 or lleva_iva = true then
          round(((coalesce(subtotal_bruto, 0) / total_pagos - 
                  coalesce(retencion_monto, 0) / total_pagos - 
                  coalesce(amortizacion_monto, 0) / total_pagos) * 
                 coalesce(iva_porcentaje, 16) / 100)::numeric, 2)
        else
          0
      end as nuevo_iva,
      -- Total neto = subtotal + iva
      round((total_neto / total_pagos)::numeric, 2) as nuevo_monto_neto_pagado
    from pagos_por_solicitud
  ),
  stats_before as (
    select
      count(distinct solicitud_id) as num_sol,
      count(*) as num_pagos,
      sum(monto_actual) as suma_antes
    from pagos_por_solicitud
  ),
  updated as (
    update public.pagos_realizados p
    set
      monto_bruto = c.nuevo_monto_bruto,
      importe_concepto = c.nuevo_monto_bruto,
      retencion_porcentaje = c.retencion_porcentaje,
      retencion_monto = c.nuevo_retencion_monto,
      anticipo_porcentaje = c.amortizacion_porcentaje,
      anticipo_monto = c.nuevo_anticipo_monto,
      subtotal = c.nuevo_subtotal,
      iva = c.nuevo_iva,
      lleva_iva = c.lleva_iva,
      monto_neto_pagado = c.nuevo_monto_neto_pagado,
      updated_at = now()
    from calculos c
    where p.id = c.pago_id
    returning p.id, c.nuevo_monto_neto_pagado
  ),
  stats_after as (
    select
      count(*) as num_actualizados,
      sum(nuevo_monto_neto_pagado) as suma_despues
    from updated
  )
  select
    sb.num_sol::int,
    sa.num_actualizados::int,
    sb.suma_antes::numeric,
    sa.suma_despues::numeric
  from stats_before sb, stats_after sa;

  return;
end;
$$;

comment on function public.actualizar_montos_pagos_desde_solicitud(boolean)
  is 'Actualiza montos de pagos_realizados usando total_neto de solicitud. dry_run=true solo reporta.';
