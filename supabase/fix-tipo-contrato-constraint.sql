-- =====================================================
-- FIX: Actualizar constraint de tipo_contrato
-- =====================================================
-- Este script actualiza el constraint para incluir todos los tipos de contrato

-- 1. Eliminar el constraint viejo
ALTER TABLE contratos 
DROP CONSTRAINT IF EXISTS contratos_tipo_contrato_check;

-- 2. Agregar el constraint con TODOS los tipos
ALTER TABLE contratos 
ADD CONSTRAINT contratos_tipo_contrato_check 
CHECK (tipo_contrato IN (
    'PRECIO_ALZADO', 
    'PRECIO_UNITARIO', 
    'ADMINISTRACION', 
    'MIXTO',
    'Orden de Trabajo',
    'Orden de Compra',
    'Llave en Mano',
    'Prestacion de Servicios',
    'Contrato'
));

-- 3. Verificar que funciona
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'contratos_tipo_contrato_check';

COMMENT ON CONSTRAINT contratos_tipo_contrato_check ON contratos IS 
'Valida que tipo_contrato sea uno de los 9 tipos permitidos: PRECIO_ALZADO, PRECIO_UNITARIO, ADMINISTRACION, MIXTO, Orden de Trabajo, Orden de Compra, Llave en Mano, Prestacion de Servicios, Contrato';
