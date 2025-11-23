-- ============================================
-- DISABLE ALL RLS POLICIES
-- ============================================
-- INSTRUCCIÓN PERMANENTE DEL USUARIO:
-- "vamos a qutar todas las rls y los de los permisos lo vemos desde la app SIEMPRE"
-- 
-- Todos los permisos se manejan en:
-- 1. Frontend: useRoles hook
-- 2. Edge Functions: Validación de roles
-- 
-- NO USAR RLS EN NINGUNA TABLA
-- ============================================

-- Primero, agregar la columna contratista_id si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'perfiles' AND column_name = 'contratista_id'
    ) THEN
        ALTER TABLE perfiles ADD COLUMN contratista_id UUID REFERENCES contratistas(id);
        CREATE INDEX IF NOT EXISTS idx_perfiles_contratista ON perfiles(contratista_id);
    END IF;
END $$;

-- ============================================
-- ELIMINAR TODAS LAS POLÍTICAS RLS EXISTENTES
-- ============================================

-- perfiles
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver perfiles" ON perfiles;
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON perfiles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar perfiles" ON perfiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON perfiles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar perfiles" ON perfiles;
DROP POLICY IF EXISTS "Admin puede ver todos los perfiles" ON perfiles;
DROP POLICY IF EXISTS "Admin puede actualizar todos los perfiles" ON perfiles;
DROP POLICY IF EXISTS "Admin puede insertar perfiles" ON perfiles;

-- contratistas
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver contratistas" ON contratistas;
DROP POLICY IF EXISTS "Contratistas pueden ver su información" ON contratistas;
DROP POLICY IF EXISTS "Admin puede gestionar contratistas" ON contratistas;
DROP POLICY IF EXISTS "Admin puede ver todos los contratistas" ON contratistas;
DROP POLICY IF EXISTS "Admin puede actualizar contratistas" ON contratistas;
DROP POLICY IF EXISTS "Admin puede insertar contratistas" ON contratistas;

-- contratos
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver contratos" ON contratos;
DROP POLICY IF EXISTS "Admin puede gestionar contratos" ON contratos;

-- empresas
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver empresas" ON empresas;
DROP POLICY IF EXISTS "Admin puede gestionar empresas" ON empresas;

-- proyectos
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver proyectos" ON proyectos;
DROP POLICY IF EXISTS "Admin puede gestionar proyectos" ON proyectos;

-- roles_usuario
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver roles_usuario" ON roles_usuario;
DROP POLICY IF EXISTS "Admin puede gestionar roles_usuario" ON roles_usuario;

-- roles
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver roles" ON roles;
DROP POLICY IF EXISTS "Admin puede gestionar roles" ON roles;

-- catalogo_roles
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver catalogo_roles" ON catalogo_roles;
DROP POLICY IF EXISTS "Admin puede gestionar catalogo_roles" ON catalogo_roles;

-- permisos
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver permisos" ON permisos;
DROP POLICY IF EXISTS "Admin puede gestionar permisos" ON permisos;
DROP POLICY IF EXISTS "Anyone can read permissions" ON permisos;
DROP POLICY IF EXISTS "Only admins can insert permissions" ON permisos;
DROP POLICY IF EXISTS "Only admins can update permissions" ON permisos;
DROP POLICY IF EXISTS "Only admins can delete permissions" ON permisos;

-- permisos_usuario
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver permisos_usuario" ON permisos_usuario;
DROP POLICY IF EXISTS "Admin puede gestionar permisos_usuario" ON permisos_usuario;

-- requisiciones_pago
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver requisiciones_pago" ON requisiciones_pago;
DROP POLICY IF EXISTS "Admin puede gestionar requisiciones_pago" ON requisiciones_pago;
DROP POLICY IF EXISTS "authenticated_access" ON requisiciones_pago;

-- solicitudes_pago
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver solicitudes_pago" ON solicitudes_pago;
DROP POLICY IF EXISTS "Admin puede gestionar solicitudes_pago" ON solicitudes_pago;
DROP POLICY IF EXISTS "authenticated_access" ON solicitudes_pago;

-- pagos
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver pagos" ON pagos;
DROP POLICY IF EXISTS "Admin puede gestionar pagos" ON pagos;
DROP POLICY IF EXISTS "authenticated_access" ON pagos;

-- ============================================
-- DESHABILITAR RLS EN TODAS LAS TABLAS
-- ============================================

ALTER TABLE perfiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE contratistas DISABLE ROW LEVEL SECURITY;
ALTER TABLE contratos DISABLE ROW LEVEL SECURITY;
ALTER TABLE empresas DISABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles_usuario DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE permisos DISABLE ROW LEVEL SECURITY;
ALTER TABLE permisos_usuario DISABLE ROW LEVEL SECURITY;
ALTER TABLE requisiciones_pago DISABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_pago DISABLE ROW LEVEL SECURITY;
ALTER TABLE pagos DISABLE ROW LEVEL SECURITY;

-- ============================================
-- CONFIRMACIÓN
-- ============================================

SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
    AND tablename IN (
        'perfiles',
        'contratistas',
        'contratos',
        'empresas',
        'proyectos',
        'roles_usuario',
        'roles',
        'catalogo_roles',
        'permisos',
        'permisos_usuario',
        'requisiciones_pago',
        'solicitudes_pago',
        'pagos'
    )
ORDER BY tablename;

-- Si rowsecurity = false para todas las tablas, RLS está correctamente deshabilitado
