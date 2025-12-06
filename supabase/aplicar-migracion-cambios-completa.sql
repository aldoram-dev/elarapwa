-- =============================================
-- APLICAR MIGRACIÓN COMPLETA: CAMBIOS_CONTRATO
-- =============================================
-- Este script aplica toda la migración de cambios_contrato
-- incluyendo las políticas RLS necesarias

-- 1. Actualizar CHECK constraint de tipo_cambio
ALTER TABLE cambios_contrato 
  DROP CONSTRAINT IF EXISTS cambios_contrato_tipo_cambio_check;

ALTER TABLE cambios_contrato 
  ADD CONSTRAINT cambios_contrato_tipo_cambio_check 
  CHECK (tipo_cambio IN ('ADITIVA', 'DEDUCTIVA', 'EXTRA', 'DEDUCCION_EXTRA'));

-- 2. Habilitar RLS en todas las tablas si no está habilitado
ALTER TABLE cambios_contrato ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalles_aditiva_deductiva ENABLE ROW LEVEL SECURITY;
ALTER TABLE deducciones_extra ENABLE ROW LEVEL SECURITY;

-- 3. Políticas para cambios_contrato
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver cambios_contrato" ON cambios_contrato;
CREATE POLICY "Usuarios autenticados pueden ver cambios_contrato"
  ON cambios_contrato FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar cambios_contrato" ON cambios_contrato;
CREATE POLICY "Usuarios autenticados pueden insertar cambios_contrato"
  ON cambios_contrato FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar cambios_contrato" ON cambios_contrato;
CREATE POLICY "Usuarios autenticados pueden actualizar cambios_contrato"
  ON cambios_contrato FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar cambios_contrato" ON cambios_contrato;
CREATE POLICY "Usuarios autenticados pueden eliminar cambios_contrato"
  ON cambios_contrato FOR DELETE
  TO authenticated
  USING (true);

-- 4. Políticas para detalles_aditiva_deductiva
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver detalles_aditiva_deductiva" ON detalles_aditiva_deductiva;
CREATE POLICY "Usuarios autenticados pueden ver detalles_aditiva_deductiva"
  ON detalles_aditiva_deductiva FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar detalles_aditiva_deductiva" ON detalles_aditiva_deductiva;
CREATE POLICY "Usuarios autenticados pueden insertar detalles_aditiva_deductiva"
  ON detalles_aditiva_deductiva FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar detalles_aditiva_deductiva" ON detalles_aditiva_deductiva;
CREATE POLICY "Usuarios autenticados pueden actualizar detalles_aditiva_deductiva"
  ON detalles_aditiva_deductiva FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar detalles_aditiva_deductiva" ON detalles_aditiva_deductiva;
CREATE POLICY "Usuarios autenticados pueden eliminar detalles_aditiva_deductiva"
  ON detalles_aditiva_deductiva FOR DELETE
  TO authenticated
  USING (true);

-- 5. Políticas para deducciones_extra
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver deducciones_extra" ON deducciones_extra;
CREATE POLICY "Usuarios autenticados pueden ver deducciones_extra"
  ON deducciones_extra FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar deducciones_extra" ON deducciones_extra;
CREATE POLICY "Usuarios autenticados pueden insertar deducciones_extra"
  ON deducciones_extra FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar deducciones_extra" ON deducciones_extra;
CREATE POLICY "Usuarios autenticados pueden actualizar deducciones_extra"
  ON deducciones_extra FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar deducciones_extra" ON deducciones_extra;
CREATE POLICY "Usuarios autenticados pueden eliminar deducciones_extra"
  ON deducciones_extra FOR DELETE
  TO authenticated
  USING (true);

-- 6. Verificar que todo está bien
SELECT 
  'cambios_contrato' as tabla,
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'cambios_contrato'::regclass
  AND conname = 'cambios_contrato_tipo_cambio_check'

UNION ALL

SELECT 
  tablename as tabla,
  policyname as constraint_name,
  'RLS Policy' as definition
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('cambios_contrato', 'detalles_aditiva_deductiva', 'deducciones_extra')
ORDER BY tabla, constraint_name;
