-- Script para verificar constraints de requisiciones_pago y solicitudes_pago
-- Ejecutar en Supabase SQL Editor

-- Ver todos los constraints de requisiciones_pago
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'requisiciones_pago'::regclass
  AND conname LIKE '%subtotal%';

-- Ver todos los constraints de solicitudes_pago
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'solicitudes_pago'::regclass
  AND conname LIKE '%subtotal%';

-- Verificar registros que violan el constraint
SELECT 
  id,
  numero,
  subtotal,
  iva,
  total,
  lleva_iva,
  subtotal + iva as suma_calculada,
  total - (subtotal + iva) as diferencia,
  ABS(total - (subtotal + iva)) as diferencia_abs,
  CASE 
    WHEN ABS(total - (subtotal + iva)) < 0.05 THEN '✅ PASA'
    WHEN lleva_iva = false AND ABS(total - subtotal) < 0.05 THEN '✅ PASA (sin IVA)'
    WHEN iva = 0 AND ABS(total - subtotal) < 0.05 THEN '✅ PASA (IVA=0)'
    ELSE '❌ FALLA'
  END as estado_constraint
FROM requisiciones_pago
WHERE ABS(total - (subtotal + iva)) >= 0.05
  AND NOT (lleva_iva = false AND ABS(total - subtotal) < 0.05)
  AND NOT (iva = 0 AND ABS(total - subtotal) < 0.05)
ORDER BY created_at DESC
LIMIT 10;
