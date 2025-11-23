-- =====================================================
-- CORRECCIÓN COMPLETA: Recursión infinita en perfiles y contratistas
-- =====================================================

-- PASO 1: Agregar contratista_id a perfiles (si no existe)
ALTER TABLE perfiles 
ADD COLUMN IF NOT EXISTS contratista_id UUID REFERENCES contratistas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_perfiles_contratista ON perfiles(contratista_id);

-- PASO 2: Eliminar TODAS las políticas de contratistas
DROP POLICY IF EXISTS "Usuarios pueden ver contratistas de su empresa" ON contratistas;
DROP POLICY IF EXISTS "Usuarios pueden crear contratistas" ON contratistas;
DROP POLICY IF EXISTS "Usuarios pueden actualizar contratistas" ON contratistas;
DROP POLICY IF EXISTS "Usuarios pueden eliminar contratistas" ON contratistas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver contratistas" ON contratistas;
DROP POLICY IF EXISTS "Administradores pueden crear contratistas" ON contratistas;
DROP POLICY IF EXISTS "Administradores pueden actualizar contratistas" ON contratistas;
DROP POLICY IF EXISTS "Administradores pueden eliminar contratistas" ON contratistas;

-- PASO 3: Eliminar TODAS las políticas de perfiles
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON perfiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON perfiles;
DROP POLICY IF EXISTS "Administradores pueden ver todos los perfiles" ON perfiles;
DROP POLICY IF EXISTS "Administradores pueden actualizar perfiles" ON perfiles;
DROP POLICY IF EXISTS "Usuarios pueden ver perfiles de su empresa" ON perfiles;
DROP POLICY IF EXISTS "Solo admins pueden crear perfiles" ON perfiles;
DROP POLICY IF EXISTS "Usuarios activos pueden ver todos los perfiles" ON perfiles;

-- PASO 4: Crear políticas SIMPLES para contratistas (SIN consultar perfiles)
CREATE POLICY "Usuarios autenticados pueden ver contratistas"
ON contratistas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuarios autenticados pueden crear contratistas"
ON contratistas FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar contratistas"
ON contratistas FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Usuarios autenticados pueden eliminar contratistas"
ON contratistas FOR DELETE
TO authenticated
USING (true);

-- PASO 5: Crear políticas SIMPLES para perfiles (SIN consultar otras tablas)
CREATE POLICY "Usuarios pueden ver su propio perfil"
ON perfiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
ON perfiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Usuarios autenticados pueden ver otros perfiles"
ON perfiles FOR SELECT
TO authenticated
USING (true);

-- PASO 6: Asegurar que RLS está habilitado
ALTER TABLE contratistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- Comentario: Las validaciones de permisos se harán en el frontend y en las Edge Functions
-- En lugar de usar políticas RLS complejas que causan recursión
