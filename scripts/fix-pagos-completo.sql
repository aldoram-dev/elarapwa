-- Script completo: Limpia duplicados y actualiza montos de pagos_realizados
-- Ejecutar en 2 pasos para verificar

-- ============================================================
-- PASO 1: Limpiar duplicados (marca duplicados como inactive)
-- ============================================================

create or replace function public.paso1_limpiar_duplicados_pagos(dry_run boolean default true)
returns table(
  total_pagos_activos int,
  total_grupos_unicos int,
  total_duplicados int
)
language plpgsql
as $$
begin
  if dry_run then
    return query
    with base as (
      select
        id,
        active,
        created_at,
        nullif(trim(comprobante_pago_url), '') as comprobante,
        coalesce(solicitud_pago_id::text, folio_solicitud) as solicitud_key,
        coalesce(concepto_contrato_id::text, concepto_clave) as concepto_key,
        fecha_pago,
        round(coalesce(monto_neto_pagado, 0)::numeric, 2) as monto_key
      from public.pagos_realizados
      where active is true
    ), ranked as (
      select
        *,
        row_number() over (
          partition by solicitud_key, concepto_key, fecha_pago, monto_key
          order by (comprobante is not null) desc, created_at desc
        ) as rn
      from base
    )
    select
      count(*)::int as total_pagos_activos,
      count(distinct (solicitud_key, concepto_key, fecha_pago, monto_key))::int as total_grupos_unicos,
      count(*) filter (where rn > 1)::int as total_duplicados
    from ranked;
    return;
  end if;

  -- Ejecutar: desactivar duplicados
  with base as (
    select
      id,
      active,
      created_at,
      nullif(trim(comprobante_pago_url), '') as comprobante,
      coalesce(solicitud_pago_id::text, folio_solicitud) as solicitud_key,
      coalesce(concepto_contrato_id::text, concepto_clave) as concepto_key,
      fecha_pago,
      round(coalesce(monto_neto_pagado, 0)::numeric, 2) as monto_key
    from public.pagos_realizados
    where active is true
  ), ranked as (
    select
      *,
      row_number() over (
        partition by solicitud_key, concepto_key, fecha_pago, monto_key
        order by (comprobante is not null) desc, created_at desc
      ) as rn
    from base
  ), to_deactivate as (
    select id from ranked where rn > 1
  ), updated as (
    update public.pagos_realizados p
    set active = false, updated_at = now()
    where p.id in (select id from to_deactivate)
    returning p.id
  )
  select
    (select count(*) from base)::int as total_pagos_activos,
    (select count(distinct (solicitud_key, concepto_key, fecha_pago, monto_key)) from ranked)::int as total_grupos_unicos,
    (select count(*) from updated)::int as total_duplicados;
end;
$$;

-- ============================================================
-- PASO 2: Actualizar montos usando datos de solicitud
-- ============================================================

create or replace function public.paso2_actualizar_montos_pagos(dry_run boolean default true)
returns table(
  solicitudes_procesadas int,
  pagos_actualizados int,
  suma_antes numeric,
  suma_despues numeric
)
language plpgsql
as $$
begin
  if dry_run then
    return query
    with solicitudes_pagadas as (
      select
        s.id as solicitud_id,
        s.folio,
        s.total,
        s.estatus_pago,
        count(p.id) as num_pagos,
        sum(p.monto_neto_pagado) as monto_actual
      from public.solicitudes_pago s
      inner join public.pagos_realizados p
        on (p.solicitud_pago_id::text = s.id::text or p.folio_solicitud = s.folio)
        and p.active = true
      where s.estatus_pago in ('PAGADO', 'PAGADO PARCIALMENTE')
        and s.total is not null
        and s.total > 0
      group by s.id, s.folio, s.total, s.estatus_pago
    )
    select
      count(*)::int as solicitudes_procesadas,
      sum(num_pagos)::int as pagos_actualizados,
      sum(monto_actual)::numeric as suma_antes,
      sum(total)::numeric as suma_despues
    from solicitudes_pagadas;
    return;
  end if;

  -- Ejecutar: actualizar montos
  with solicitudes_pagadas as (
    select
      s.id as solicitud_id,
      s.folio,
      s.total,
      s.subtotal,
      s.iva,
      s.lleva_iva
    from public.solicitudes_pago s
    where s.estatus_pago in ('PAGADO', 'PAGADO PARCIALMENTE')
      and s.total > 0
  ),
  pagos_por_solicitud as (
    select
      sp.*,
      p.id as pago_id,
      p.monto_neto_pagado as monto_actual,
      count(*) over (partition by sp.solicitud_id) as total_pagos
    from solicitudes_pagadas sp
    inner join public.pagos_realizados p
      on (p.solicitud_pago_id::text = sp.solicitud_id::text or p.folio_solicitud = sp.folio)
      and p.active = true
  ),
  calculos as (
    select
      pago_id,
      folio,
      monto_actual,
      -- USAR s.total (que es el monto correcto) dividido entre pagos
      round((total / total_pagos)::numeric, 2) as nuevo_monto_neto_pagado,
      -- Calcular subtotal e IVA retroactivamente
      round((subtotal / total_pagos)::numeric, 2) as nuevo_subtotal,
      round((iva / total_pagos)::numeric, 2) as nuevo_iva,
      lleva_iva
    from pagos_por_solicitud
  ),
  stats_before as (
    select count(*) as num_pagos, sum(monto_actual) as suma_antes
    from pagos_por_solicitud
  ),
  updated as (
    update public.pagos_realizados p
    set
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
      count(distinct c.folio)::int as num_solicitudes,
      count(*) as num_actualizados,
      sum(nuevo_monto_neto_pagado) as suma_despues
    from updated u
    inner join calculos c on u.id = c.pago_id
  )
  select
    sa.num_solicitudes::int,
    sa.num_actualizados::int,
    sb.suma_antes::numeric,
    sa.suma_despues::numeric
  from stats_before sb, stats_after sa;

  return;
end;
$$;

-- ============================================================
-- INSTRUCCIONES DE USO:
-- ============================================================
-- 1. Dry-run limpieza:    select * from paso1_limpiar_duplicados_pagos(true);
-- 2. Ejecutar limpieza:   select * from paso1_limpiar_duplicados_pagos(false);
-- 3. Dry-run actualizar:  select * from paso2_actualizar_montos_pagos(true);
-- 4. Ejecutar actualizar: select * from paso2_actualizar_montos_pagos(false);
