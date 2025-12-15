-- ============================================================================
-- Script para eliminar proyecto_id de todas las tablas de configuración
-- ============================================================================
-- Este script elimina la columna proyecto_id de las 5 tablas de configuración
-- ya que la aplicación ahora funciona como sistema de proyecto único (ELARA)
--
-- Ejecutar en: Supabase SQL Editor
-- Fecha: 2025-12-13
-- ============================================================================

-- 1. Eliminar columna proyecto_id de reglamento_config
ALTER TABLE reglamento_config
DROP COLUMN IF EXISTS proyecto_id CASCADE;

-- 2. Eliminar columna proyecto_id de minutas_config
ALTER TABLE minutas_config
DROP COLUMN IF EXISTS proyecto_id CASCADE;

-- 3. Eliminar columna proyecto_id de fuerza_trabajo_config
ALTER TABLE fuerza_trabajo_config
DROP COLUMN IF EXISTS proyecto_id CASCADE;

-- 4. Eliminar columna proyecto_id de programa_obra_config
ALTER TABLE programa_obra_config
DROP COLUMN IF EXISTS proyecto_id CASCADE;

-- 5. Eliminar columna proyecto_id de recorrido360_config
ALTER TABLE recorrido360_config
DROP COLUMN IF EXISTS proyecto_id CASCADE;

-- ============================================================================
-- Verificar que las columnas se eliminaron correctamente
-- ============================================================================

-- Verificar reglamento_config
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'reglamento_config' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar minutas_config
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'minutas_config' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar fuerza_trabajo_config
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'fuerza_trabajo_config' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar programa_obra_config
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'programa_obra_config' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar recorrido360_config
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'recorrido360_config' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- * CASCADE elimina automáticamente cualquier constraint, índice o foreign key
--   que dependa de esta columna
-- * Después de ejecutar este script, las páginas de configuración podrán
--   guardar datos sin necesidad de proyecto_id
-- * Los datos existentes se conservan, solo se elimina la columna proyecto_id
-- ============================================================================
