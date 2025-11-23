-- ============================================
-- FORZAR LIMPIEZA COMPLETA DE RLS
-- ============================================

-- 1. DESHABILITAR RLS TEMPORALMENTE
ALTER TABLE perfiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE contratistas DISABLE ROW LEVEL SECURITY;
ALTER TABLE contratos DISABLE ROW LEVEL SECURITY;
ALTER TABLE empresas DISABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles_usuario DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_roles DISABLE ROW LEVEL SECURITY;

-- 2. ELIMINAR TODAS LAS POLÍTICAS (forzado con CASCADE si es necesario)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('perfiles', 'contratistas', 'contratos', 'empresas', 'proyectos', 'roles_usuario', 'roles', 'catalogo_roles')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
        RAISE NOTICE 'Eliminada política % en tabla %', pol.policyname, pol.tablename;
    END LOOP;
END $$;

-- 3. AGREGAR COLUMNA contratista_id SI NO EXISTE
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'perfiles' AND column_name = 'contratista_id'
    ) THEN
        ALTER TABLE perfiles ADD COLUMN contratista_id UUID REFERENCES contratistas(id);
        CREATE INDEX IF NOT EXISTS idx_perfiles_contratista ON perfiles(contratista_id);
        RAISE NOTICE 'Columna contratista_id agregada a perfiles';
    ELSE
        RAISE NOTICE 'Columna contratista_id ya existe en perfiles';
    END IF;
END $$;

-- 4. HABILITAR RLS NUEVAMENTE
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_roles ENABLE ROW LEVEL SECURITY;

-- 5. CREAR POLÍTICAS SIMPLES (SOLO AUTENTICADOS)
CREATE POLICY "authenticated_access" ON perfiles
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_access" ON contratistas
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_access" ON contratos
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_access" ON empresas
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_access" ON proyectos
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_access" ON roles_usuario
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_access" ON roles
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_access" ON catalogo_roles
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 6. VERIFICACIÓN
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) 
     FROM pg_policies 
     WHERE schemaname = 'public' 
     AND tablename = pt.tablename) as policy_count,
    (SELECT string_agg(policyname, ', ')
     FROM pg_policies 
     WHERE schemaname = 'public' 
     AND tablename = pt.tablename) as policies
FROM pg_tables pt
WHERE schemaname = 'public'
    AND tablename IN (
        'perfiles',
        'contratistas',
        'contratos',
        'empresas',
        'proyectos',
        'roles_usuario',
        'roles',
        'catalogo_roles'
    )
ORDER BY tablename;

-- Debe mostrar:
-- rls_enabled = true
-- policy_count = 1
-- policies = 'authenticated_access'
