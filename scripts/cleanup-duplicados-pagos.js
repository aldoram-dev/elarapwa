/*
  Limpieza de pagos_realizados duplicados en Supabase.
  - NO borra registros ni links
  - Desactiva duplicados (active=false)
  - Conserva el registro con comprobante_pago_url si existe
  - En caso de empate, conserva el más reciente por created_at

  Requisitos:
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY

  Uso:
    DRY_RUN=true node scripts/cleanup-duplicados-pagos.js
    DRY_RUN=false node scripts/cleanup-duplicados-pagos.js
*/

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = (process.env.DRY_RUN || 'true').toLowerCase() !== 'false';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function keyPago(p) {
  const solicitudKey = p.solicitud_pago_id || p.folio_solicitud || 'SIN_SOL';
  const conceptoKey = p.concepto_contrato_id || p.concepto_clave || 'SIN_CONCEPTO';
  const fechaKey = p.fecha_pago || 'SIN_FECHA';
  const montoKey = Number(p.monto_neto_pagado || 0).toFixed(2);
  return [solicitudKey, conceptoKey, fechaKey, montoKey].join('|');
}

function hasComprobante(p) {
  return !!(p.comprobante_pago_url && String(p.comprobante_pago_url).trim());
}

function compareByCreatedAtDesc(a, b) {
  const aDate = new Date(a.created_at || 0).getTime();
  const bDate = new Date(b.created_at || 0).getTime();
  return bDate - aDate;
}

async function fetchAllPagos() {
  const pageSize = 1000;
  let from = 0;
  let all = [];

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('pagos_realizados')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

async function deactivateIds(ids) {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from('pagos_realizados')
    .update({ active: false, updated_at: new Date().toISOString() })
    .in('id', ids);
  if (error) throw error;
}

async function main() {
  console.log(`DRY_RUN=${DRY_RUN}`);
  const pagos = await fetchAllPagos();
  console.log(`Pagos activos cargados: ${pagos.length}`);

  const grupos = new Map();
  for (const p of pagos) {
    const key = keyPago(p);
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key).push(p);
  }

  let totalDuplicados = 0;
  let toDeactivate = [];

  for (const [key, items] of grupos.entries()) {
    if (items.length <= 1) continue;

    // Preferir con comprobante, luego por created_at más reciente
    const conComprobante = items.filter(hasComprobante).sort(compareByCreatedAtDesc);
    const sinComprobante = items.filter(p => !hasComprobante(p)).sort(compareByCreatedAtDesc);

    const keep = conComprobante.length > 0 ? conComprobante[0] : items.sort(compareByCreatedAtDesc)[0];
    const remove = items.filter(p => p.id !== keep.id);

    totalDuplicados += remove.length;
    toDeactivate.push(...remove.map(p => p.id));

    console.log(`Duplicado: ${key}`);
    console.log(`  keep=${keep.id} comprobante=${hasComprobante(keep)}`);
    console.log(`  remove=${remove.map(r => r.id).join(', ')}`);
  }

  console.log(`Duplicados a desactivar: ${totalDuplicados}`);

  if (!DRY_RUN && toDeactivate.length > 0) {
    // batch de 500 para evitar límites
    const batchSize = 500;
    for (let i = 0; i < toDeactivate.length; i += batchSize) {
      const batch = toDeactivate.slice(i, i + batchSize);
      await deactivateIds(batch);
      console.log(`Desactivados ${batch.length}`);
    }
  } else {
    console.log('DRY_RUN activo: no se desactivó nada.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
