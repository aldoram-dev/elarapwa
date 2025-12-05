-- Verificar si las tablas de cambios_contrato existen
SELECT 
  'cambios_contrato' as tabla,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'cambios_contrato'
  ) as existe
UNION ALL
SELECT 
  'detalles_aditiva_deductiva' as tabla,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'detalles_aditiva_deductiva'
  ) as existe
UNION ALL
SELECT 
  'detalles_extra' as tabla,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'detalles_extra'
  ) as existe
UNION ALL
SELECT 
  'deducciones_extra' as tabla,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'deducciones_extra'
  ) as existe;

-- Si alguna tabla no existe, ejecutar la migración:
-- \i supabase/migrations/20250128_add_cambios_contrato.sql
