-- =====================================================
-- SCRIPT DE CORRECCIÓN RÁPIDA - Copiar y pegar en SQL Editor
-- =====================================================

-- PASO 1: Agregar contratista_id a perfiles (si no existe)
ALTER TABLE perfiles 
ADD COLUMN IF NOT EXISTS contratista_id UUID REFERENCES contratistas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_perfiles_contratista ON perfiles(contratista_id);

-- PASO 2: Eliminar TODAS las políticas de contratistas (nuevas y viejas)
DROP POLICY IF EXISTS "Usuarios pueden ver contratistas de su empresa" ON contratistas;
DROP POLICY IF EXISTS "Usuarios pueden crear contratistas" ON contratistas;
DROP POLICY IF EXISTS "Usuarios pueden actualizar contratistas" ON contratistas;
DROP POLICY IF EXISTS "Usuarios pueden eliminar contratistas" ON contratistas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver contratistas" ON contratistas;
DROP POLICY IF EXISTS "Administradores pueden crear contratistas" ON contratistas;
DROP POLICY IF EXISTS "Administradores pueden actualizar contratistas" ON contratistas;
DROP POLICY IF EXISTS "Administradores pueden eliminar contratistas" ON contratistas;

-- PASO 3: Crear políticas simplificadas SIN recursión
CREATE POLICY "Usuarios autenticados pueden ver contratistas"
ON contratistas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Administradores pueden crear contratistas"
ON contratistas FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM perfiles
    WHERE perfiles.id = auth.uid()
    AND perfiles.active = true
    AND (perfiles.nivel = 'Administrador' OR 'Administrador' = ANY(perfiles.roles))
  )
);

CREATE POLICY "Administradores pueden actualizar contratistas"
ON contratistas FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM perfiles
    WHERE perfiles.id = auth.uid()
    AND perfiles.active = true
    AND (perfiles.nivel = 'Administrador' OR 'Administrador' = ANY(perfiles.roles))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM perfiles
    WHERE perfiles.id = auth.uid()
    AND perfiles.active = true
    AND (perfiles.nivel = 'Administrador' OR 'Administrador' = ANY(perfiles.roles))
  )
);

CREATE POLICY "Administradores pueden eliminar contratistas"
ON contratistas FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM perfiles
    WHERE perfiles.id = auth.uid()
    AND perfiles.active = true
    AND (perfiles.nivel = 'Administrador' OR 'Administrador' = ANY(perfiles.roles))
  )
);

-- Asegurar que RLS está habilitado
ALTER TABLE contratistas ENABLE ROW LEVEL SECURITY;
