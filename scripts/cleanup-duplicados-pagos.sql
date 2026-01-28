-- Limpieza segura de duplicados en pagos_realizados (no borra links, solo desactiva active)
-- Criterio de duplicado:
--  - solicitud (solicitud_pago_id o folio_solicitud)
--  - concepto (concepto_contrato_id o concepto_clave)
--  - fecha_pago
--  - monto_neto_pagado (redondeado a 2 decimales)
--  - numero_pago o referencia_pago (si existen)
-- Conserva:
--  1) registro con comprobante_pago_url
--  2) si no hay, el más reciente por created_at

create or replace function public.cleanup_pagos_duplicados(dry_run boolean default true)
returns table(total_grupos int, total_duplicados int)
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
        round(coalesce(monto_neto_pagado, 0)::numeric, 2) as monto_key,
        coalesce(nullif(trim(numero_pago), ''), nullif(trim(referencia_pago), ''), 'SIN_REF') as ref_key
      from public.pagos_realizados
      where active is true
    ), ranked as (
      select
        *,
        row_number() over (
          partition by solicitud_key, concepto_key, fecha_pago, monto_key, ref_key
          order by (comprobante is not null) desc, created_at desc
        ) as rn
      from base
    )
    select
      count(distinct (solicitud_key, concepto_key, fecha_pago, monto_key, ref_key))::int as total_grupos,
      count(*) filter (where rn > 1)::int as total_duplicados
    from ranked;
    return;
  end if;

  with base as (
    select
      id,
      active,
      created_at,
      nullif(trim(comprobante_pago_url), '') as comprobante,
      coalesce(solicitud_pago_id::text, folio_solicitud) as solicitud_key,
      coalesce(concepto_contrato_id::text, concepto_clave) as concepto_key,
      fecha_pago,
      round(coalesce(monto_neto_pagado, 0)::numeric, 2) as monto_key,
      coalesce(nullif(trim(numero_pago), ''), nullif(trim(referencia_pago), ''), 'SIN_REF') as ref_key
    from public.pagos_realizados
    where active is true
  ), ranked as (
    select
      *,
      row_number() over (
        partition by solicitud_key, concepto_key, fecha_pago, monto_key, ref_key
        order by (comprobante is not null) desc, created_at desc
      ) as rn
    from base
  ), to_deactivate as (
    select id from ranked where rn > 1
  ), updated as (
    update public.pagos_realizados p
      set active = false,
          updated_at = now()
    where p.id in (select id from to_deactivate)
    returning p.id
  )
  select
    (select count(distinct (solicitud_key, concepto_key, fecha_pago, monto_key, ref_key)) from ranked)::int as total_grupos,
    (select count(*) from updated)::int as total_duplicados;
end;
$$;

comment on function public.cleanup_pagos_duplicados(boolean)
  is 'Desactiva pagos_realizados duplicados sin eliminar links. dry_run=true solo reporta.';
