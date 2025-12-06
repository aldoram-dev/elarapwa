-- =============================================
-- SCRIPT DE VERIFICACIÓN Y APLICACIÓN
-- Verifica si las tablas de cambios_contrato existen
-- y aplica la migración si es necesario
-- =============================================

-- 1. Verificar si la tabla cambios_contrato existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'cambios_contrato'
  ) THEN
    RAISE NOTICE '✅ Tabla cambios_contrato ya existe';
  ELSE
    RAISE NOTICE '❌ Tabla cambios_contrato NO existe - Se aplicará la migración';
  END IF;
END $$;

-- 2. Verificar si tiene los campos de archivos
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cambios_contrato'
    AND column_name = 'documentos_soporte'
  ) THEN
    RAISE NOTICE '✅ Campo documentos_soporte existe';
  ELSE
    RAISE NOTICE '❌ Campo documentos_soporte NO existe';
  END IF;
  
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cambios_contrato'
    AND column_name = 'archivo_plantilla_url'
  ) THEN
    RAISE NOTICE '✅ Campo archivo_plantilla_url existe';
  ELSE
    RAISE NOTICE '❌ Campo archivo_plantilla_url NO existe';
  END IF;
  
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cambios_contrato'
    AND column_name = 'archivo_aprobacion_url'
  ) THEN
    RAISE NOTICE '✅ Campo archivo_aprobacion_url existe';
  ELSE
    RAISE NOTICE '❌ Campo archivo_aprobacion_url NO existe';
  END IF;
END $$;

-- 3. Si falta algo, aplicar la migración completa
-- Ejecuta esto manualmente si los checks anteriores fallan:
-- \i supabase/migrations/20250128_add_cambios_contrato.sql

-- 4. Verificar estructura de tablas relacionadas
SELECT 
  'cambios_contrato' as tabla,
  COUNT(*) as total_registros
FROM cambios_contrato
UNION ALL
SELECT 
  'detalles_aditiva_deductiva' as tabla,
  COUNT(*) as total_registros
FROM detalles_aditiva_deductiva
UNION ALL
SELECT 
  'deducciones_extra' as tabla,
  COUNT(*) as total_registros
FROM deducciones_extra;

-- 5. Mostrar estructura de cambios_contrato
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'cambios_contrato'
ORDER BY ordinal_position;
