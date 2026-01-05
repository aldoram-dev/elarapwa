-- Migración para limpiar requisiciones_pago
-- Fecha: 2026-01-03

-- 1. Eliminar columna proyecto_id (ya no se usa)
ALTER TABLE requisiciones_pago 
DROP COLUMN IF EXISTS proyecto_id;

-- 2. Agregar columna updated_by si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'requisiciones_pago' 
    AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE requisiciones_pago 
    ADD COLUMN updated_by uuid REFERENCES auth.users(id);
    
    COMMENT ON COLUMN requisiciones_pago.updated_by IS 'Usuario que modificó por última vez';
  END IF;
END $$;

-- 3. Asegurar que _deleted existe y tiene valor por defecto
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'requisiciones_pago' 
    AND column_name = '_deleted'
  ) THEN
    ALTER TABLE requisiciones_pago 
    ADD COLUMN _deleted boolean DEFAULT false NOT NULL;
    
    COMMENT ON COLUMN requisiciones_pago._deleted IS 'Borrado lógico - true si fue eliminado';
  ELSE
    -- Si existe pero no tiene default, agregarlo
    ALTER TABLE requisiciones_pago 
    ALTER COLUMN _deleted SET DEFAULT false;
    
    -- Asegurar que los valores null se conviertan en false
    UPDATE requisiciones_pago 
    SET _deleted = false 
    WHERE _deleted IS NULL;
    
    -- Hacer NOT NULL
    ALTER TABLE requisiciones_pago 
    ALTER COLUMN _deleted SET NOT NULL;
  END IF;
END $$;

-- 4. Crear índice en _deleted para mejorar queries que filtran eliminados
CREATE INDEX IF NOT EXISTS idx_requisiciones_pago_deleted 
ON requisiciones_pago(_deleted) 
WHERE _deleted = false;

-- 5. Actualizar política RLS para respetar borrado lógico (opcional pero recomendado)
-- Esto asegura que las requisiciones eliminadas no sean visibles
DROP POLICY IF EXISTS "Ver requisiciones no eliminadas" ON requisiciones_pago;
CREATE POLICY "Ver requisiciones no eliminadas" 
ON requisiciones_pago FOR SELECT 
USING (_deleted = false OR _deleted IS NULL);

COMMENT ON TABLE requisiciones_pago IS 'Requisiciones de pago por concepto con sistema de borrado lógico';
