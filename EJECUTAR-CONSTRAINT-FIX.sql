-- ===============================================
-- ⚠️ EJECUTAR ESTO PRIMERO EN SUPABASE SQL EDITOR
-- ===============================================

-- 1. REQUISICIONES_PAGO: Actualizar constraint
ALTER TABLE requisiciones_pago
DROP CONSTRAINT IF EXISTS check_requisiciones_total_matches_subtotal_iva;

ALTER TABLE requisiciones_pago
ADD CONSTRAINT check_requisiciones_total_matches_subtotal_iva
CHECK (
  -- Caso 1: La suma subtotal + iva está dentro del margen de redondeo
  ABS(total - (subtotal + iva)) < 0.05
  -- Caso 2: No lleva IVA, entonces total debe ser igual a subtotal
  OR (lleva_iva = false AND ABS(total - subtotal) < 0.05)
  -- Caso 3: IVA es 0 (puede ser por redondeo o porque no lleva), entonces total = subtotal
  OR (iva = 0 AND ABS(total - subtotal) < 0.05)
);

-- 2. SOLICITUDES_PAGO: Actualizar constraint
ALTER TABLE solicitudes_pago
DROP CONSTRAINT IF EXISTS check_solicitudes_total_matches_subtotal_iva;

ALTER TABLE solicitudes_pago
ADD CONSTRAINT check_solicitudes_total_matches_subtotal_iva
CHECK (
  -- Caso 1: La suma subtotal + iva está dentro del margen de redondeo
  ABS(total - (subtotal + iva)) < 0.05
  -- Caso 2: No lleva IVA, entonces total debe ser igual a subtotal
  OR (lleva_iva = false AND ABS(total - subtotal) < 0.05)
  -- Caso 3: IVA es 0, entonces total = subtotal
  OR (iva = 0 AND ABS(total - subtotal) < 0.05)
);

-- 3. Verificar que se aplicó correctamente
SELECT 
  'requisiciones_pago' as tabla,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'requisiciones_pago'::regclass
  AND conname LIKE '%subtotal%'
UNION ALL
SELECT 
  'solicitudes_pago' as tabla,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'solicitudes_pago'::regclass
  AND conname LIKE '%subtotal%';
