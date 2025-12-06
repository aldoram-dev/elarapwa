-- =============================================
-- FIX: Actualizar CHECK constraint de tipo_cambio
-- =============================================
-- El constraint actual solo permite: 'ADITIVA', 'DEDUCTIVA', 'EXTRA'
-- Necesitamos agregar: 'DEDUCCION_EXTRA'

-- 1. Eliminar el constraint antiguo
ALTER TABLE cambios_contrato 
  DROP CONSTRAINT IF EXISTS cambios_contrato_tipo_cambio_check;

-- 2. Agregar el constraint actualizado con DEDUCCION_EXTRA
ALTER TABLE cambios_contrato 
  ADD CONSTRAINT cambios_contrato_tipo_cambio_check 
  CHECK (tipo_cambio IN ('ADITIVA', 'DEDUCTIVA', 'EXTRA', 'DEDUCCION_EXTRA'));

-- 3. Verificar el constraint
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'cambios_contrato'::regclass
  AND conname = 'cambios_contrato_tipo_cambio_check';
