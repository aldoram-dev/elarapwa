-- =====================================================
-- Proyecto Louva - Datos de ejemplo para desarrollo
-- =====================================================

-- NOTA: Los permisos se registran automáticamente desde las rutas de la aplicación
-- al iniciar. Aquí solo insertamos permisos del sistema que no están ligados a rutas.

-- Crear roles básicos (los permisos se asignarán dinámicamente desde la UI)
DO $$
DECLARE
  has_name_col BOOLEAN;
  has_desc_col BOOLEAN;
  has_permissions_col BOOLEAN;
  name_col TEXT;
  desc_col TEXT;
  perms_col TEXT;
BEGIN
  -- Detectar nombres de columnas según esquema actual
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'name'
  ) INTO has_name_col;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'description'
  ) INTO has_desc_col;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'permissions'
  ) INTO has_permissions_col;

  name_col := CASE WHEN has_name_col THEN 'name' ELSE 'nombre' END;
  desc_col := CASE WHEN has_desc_col THEN 'description' ELSE 'descripcion' END;
  perms_col := CASE WHEN has_permissions_col THEN 'permissions' ELSE 'permisos' END;

  -- =====================================================
  -- ROLES DEL SISTEMA
  -- =====================================================
  -- Roles protegidos que no se pueden modificar ni eliminar
  
  -- ROLES OCULTOS (solo para owner/instalación, no se muestran en UI)
  -- 1. Sistemas (super admin oculto, acceso omnipotente implícito)
  EXECUTE format(
    'INSERT INTO roles (%I, %I, color, %I, protected, metadata) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, color = EXCLUDED.color, protected = EXCLUDED.protected, metadata = EXCLUDED.metadata',
    name_col, desc_col, perms_col
  ) USING 'Sistemas', 'Rol omnipotente oculto para administración del sistema (no visible en UI estándar)', '#EF4444', ARRAY[]::UUID[], true, '{"hidden": true, "omnipotent": true}'::jsonb;

  -- 2. Gerente Plataforma (administrador master, visible pero intocable)
  EXECUTE format(
    'INSERT INTO roles (%I, %I, color, %I, protected, metadata) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, color = EXCLUDED.color, protected = EXCLUDED.protected, metadata = EXCLUDED.metadata',
    name_col, desc_col, perms_col
  ) USING 'Gerente Plataforma', 'Administrador principal de la plataforma con acceso completo', '#22C55E', ARRAY[]::UUID[], true, '{"order": 0, "visible": true, "master": true}'::jsonb;

  -- ROLES VISIBLES EN UI (para asignar a usuarios de la plataforma)
  -- 3. ADMINISTRADOR (acceso completo visible)
  EXECUTE format(
    'INSERT INTO roles (%I, %I, color, %I, protected, metadata) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, color = EXCLUDED.color, protected = EXCLUDED.protected, metadata = EXCLUDED.metadata',
    name_col, desc_col, perms_col
  ) USING 'ADMINISTRADOR', 'Acceso completo a todas las funcionalidades del sistema', '#EF4444', ARRAY[]::UUID[], true, '{"order": 1, "visible": true}'::jsonb;

  -- 4. DESARROLLADOR (herramientas técnicas)
  EXECUTE format(
    'INSERT INTO roles (%I, %I, color, %I, protected, metadata) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, color = EXCLUDED.color, protected = EXCLUDED.protected, metadata = EXCLUDED.metadata',
    name_col, desc_col, perms_col
  ) USING 'DESARROLLADOR', 'Acceso a herramientas de desarrollo y configuración técnica', '#3B82F6', ARRAY[]::UUID[], true, '{"order": 2, "visible": true}'::jsonb;

  -- 5. SUPERVISOR LOUVA (operaciones)
  EXECUTE format(
    'INSERT INTO roles (%I, %I, color, %I, protected, metadata) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, color = EXCLUDED.color, protected = EXCLUDED.protected, metadata = EXCLUDED.metadata',
    name_col, desc_col, perms_col
  ) USING 'SUPERVISOR LOUVA', 'Supervisor general de operaciones de Louva', '#8B5CF6', ARRAY[]::UUID[], true, '{"order": 3, "visible": true}'::jsonb;

  -- 6. CONTRATISTA (acceso limitado)
  EXECUTE format(
    'INSERT INTO roles (%I, %I, color, %I, protected, metadata) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, color = EXCLUDED.color, protected = EXCLUDED.protected, metadata = EXCLUDED.metadata',
    name_col, desc_col, perms_col
  ) USING 'CONTRATISTA', 'Usuario externo con acceso limitado a proyectos específicos', '#F59E0B', ARRAY[]::UUID[], true, '{"order": 4, "visible": true}'::jsonb;

  -- 7. ADMINISTRACIÓN (gestión y documentación)
  EXECUTE format(
    'INSERT INTO roles (%I, %I, color, %I, protected, metadata) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, color = EXCLUDED.color, protected = EXCLUDED.protected, metadata = EXCLUDED.metadata',
    name_col, desc_col, perms_col
  ) USING 'ADMINISTRACIÓN', 'Personal administrativo con acceso a gestión y documentación', '#10B981', ARRAY[]::UUID[], true, '{"order": 5, "visible": true}'::jsonb;

  -- 8. FINANZAS (información financiera)
  EXECUTE format(
    'INSERT INTO roles (%I, %I, color, %I, protected, metadata) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, color = EXCLUDED.color, protected = EXCLUDED.protected, metadata = EXCLUDED.metadata',
    name_col, desc_col, perms_col
  ) USING 'FINANZAS', 'Acceso a información financiera y reportes económicos', '#06B6D4', ARRAY[]::UUID[], true, '{"order": 6, "visible": true}'::jsonb;

  RAISE NOTICE '✓ Roles ocultos creados: Sistemas, Gerente Plataforma';
  RAISE NOTICE '✓ Roles visibles creados: ADMINISTRADOR, DESARROLLADOR, SUPERVISOR LOUVA, CONTRATISTA, ADMINISTRACIÓN, FINANZAS';
END $$;

-- Crear algunos proyectos de ejemplo
INSERT INTO proyectos (nombre, descripcion, active) VALUES
('Proyecto Alpha', 'Proyecto de desarrollo de aplicación web', true),
('Proyecto Beta', 'Sistema de gestión empresarial', true),
('Proyecto Gamma', 'Plataforma de e-commerce', false);

-- Inicializar platform_settings para empresas existentes
INSERT INTO platform_settings(empresa_id, nombre_publico) SELECT id, nombre FROM empresas ON CONFLICT (empresa_id) DO NOTHING;
INSERT INTO platform_settings(empresa_id, nombre_publico, primary_color, secondary_color) VALUES (NULL, 'Plataforma', '59 130 246', '34 197 94') ON CONFLICT (empresa_id) DO NOTHING;

-- =====================================================
-- Función para mostrar los roles creados
-- =====================================================
CREATE OR REPLACE FUNCTION create_example_users()
RETURNS VOID AS $$
DECLARE
  sistemas_role_id UUID;
  gerente_role_id UUID;
  admin_role_id UUID;
  dev_role_id UUID;
  supervisor_role_id UUID;
  contratista_role_id UUID;
  administracion_role_id UUID;
  finanzas_role_id UUID;
BEGIN
  -- Obtener IDs de roles ocultos (solo para owner)
  SELECT id INTO sistemas_role_id FROM roles WHERE name = 'Sistemas';
  SELECT id INTO gerente_role_id FROM roles WHERE name = 'Gerente Plataforma';
  
  -- Obtener IDs de los roles visibles (para usuarios de plataforma)
  SELECT id INTO admin_role_id FROM roles WHERE name = 'ADMINISTRADOR';
  SELECT id INTO dev_role_id FROM roles WHERE name = 'DESARROLLADOR';
  SELECT id INTO supervisor_role_id FROM roles WHERE name = 'SUPERVISOR LOUVA';
  SELECT id INTO contratista_role_id FROM roles WHERE name = 'CONTRATISTA';
  SELECT id INTO administracion_role_id FROM roles WHERE name = 'ADMINISTRACIÓN';
  SELECT id INTO finanzas_role_id FROM roles WHERE name = 'FINANZAS';
  
  -- Nota: En un entorno real, los usuarios se crearían a través del auth de Supabase
  
  RAISE NOTICE '=== ROLES OCULTOS (Solo Owner) ===';
  RAISE NOTICE '  • Sistemas: %', sistemas_role_id;
  RAISE NOTICE '  • Gerente Plataforma: %', gerente_role_id;
  RAISE NOTICE '';
  RAISE NOTICE '=== ROLES VISIBLES (Usuarios Plataforma) ===';
  RAISE NOTICE '  1. ADMINISTRADOR: %', admin_role_id;
  RAISE NOTICE '  2. DESARROLLADOR: %', dev_role_id;
  RAISE NOTICE '  3. SUPERVISOR LOUVA: %', supervisor_role_id;
  RAISE NOTICE '  4. CONTRATISTA: %', contratista_role_id;
  RAISE NOTICE '  5. ADMINISTRACIÓN: %', administracion_role_id;
  RAISE NOTICE '  6. FINANZAS: %', finanzas_role_id;
  
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la función
SELECT create_example_users();

-- Opcional: bloque usado en desarrollo para resetear un usuario demo.
-- Comentado por seguridad. Si quieres usarlo en desarrollo, descomenta y ajusta el email.
-- DO $$
-- DECLARE
--   uid UUID;
-- BEGIN
--   SELECT id INTO uid FROM auth.users WHERE email = 'lotorresm10@gmail.com';
--   IF uid IS NOT NULL THEN
--     DELETE FROM public.perfiles WHERE id = uid;
--     DELETE FROM public.roles_usuario WHERE user_id = uid;
--     DELETE FROM auth.users WHERE id = uid;
--   END IF;
-- END $$;

-- Ejemplo seguro (no destructivo): crear/actualizar perfil y asignar rol 'ADMINISTRADOR' si el usuario ya existe.
-- (Se ejecuta solo si existe el usuario en auth.users)
INSERT INTO public.perfiles (id, email, name, tipo, nivel, active)
SELECT id, email, email, 'ADMINISTRADOR', 'Administrador', true FROM auth.users WHERE email = 'lotorresm10@gmail.com'
ON CONFLICT (id) DO UPDATE SET tipo = 'ADMINISTRADOR', nivel = 'Administrador', active = true;

INSERT INTO public.roles_usuario (user_id, role_id, assigned_by)
SELECT u.id, r.id, u.id
FROM auth.users u
JOIN roles r ON r.name = 'ADMINISTRADOR'
WHERE u.email = 'lotorresm10@gmail.com'
ON CONFLICT (user_id, role_id) DO NOTHING;


-- =====================================================
-- Trigger para crear perfil automáticamente cuando se registra un usuario
-- =====================================================
-- Limpieza de artefactos legacy (funciones/triggers anteriores en español)
DO $$ BEGIN
  -- Si existe un trigger previo con el mismo nombre, eliminarlo para evitar que llame funciones antiguas
  IF EXISTS (
    SELECT 1 
    FROM pg_trigger t 
    JOIN pg_class c ON c.oid = t.tgrelid 
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'on_auth_user_created' 
      AND c.relname = 'users' 
      AND n.nspname = 'auth'
  ) THEN
    DROP TRIGGER on_auth_user_created ON auth.users;
  END IF;
END $$;

-- Eliminar funciones legacy si existen (ingles/español) antes de crear la nueva
DROP FUNCTION IF EXISTS public.manejar_nuevo_usuario() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar perfil básico, ignorando campos nulos
  INSERT INTO public.perfiles (id, email, name, tipo, nivel, active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NULL,
    'Usuario'::public.user_level,
    true
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se ejecuta cuando se crea un nuevo usuario en auth.users
-- Elimina el trigger si existe y créalo de nuevo correctamente
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger t 
    JOIN pg_class c ON c.oid = t.tgrelid 
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'on_auth_user_created' 
      AND c.relname = 'users' 
      AND n.nspname = 'auth'
  ) THEN
    DROP TRIGGER on_auth_user_created ON auth.users;
  END IF;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =====================================================
-- Bootstrap: Empresa demo y usuario administrador de Coctel
-- =====================================================
-- NOTA: El usuario administrador de Coctel debe crearse manualmente desde Supabase Dashboard:
-- 1. Authentication → Users → Add user
-- 2. Email: admin@coctel.com, Password: (asignar), Auto Confirm: ON
-- 3. Después de crear, ejecuta esta función para asignar empresa y rol ADMINISTRADOR:

CREATE OR REPLACE FUNCTION setup_coctel_admin(admin_email TEXT)
RETURNS JSONB AS $$
DECLARE
  company_id UUID;
  admin_role UUID;
  admin_user_id UUID;
  result JSONB;
BEGIN
  -- Crear empresa Coctel si no existe
  INSERT INTO public.empresas (nombre, telefono, correo, logo_url)
  VALUES ('Coctel', '555-010-2030', admin_email, NULL)
  ON CONFLICT (nombre) DO UPDATE SET correo = EXCLUDED.correo
  RETURNING id INTO company_id;

  -- Obtener rol ADMINISTRADOR (visible en UI para usuarios de plataforma)
  SELECT id INTO admin_role FROM roles WHERE name = 'ADMINISTRADOR' LIMIT 1;

  -- Buscar el usuario por email
  SELECT id INTO admin_user_id FROM auth.users WHERE email = admin_email LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    result := jsonb_build_object(
      'success', false,
      'message', 'Usuario no encontrado. Créalo primero desde Authentication > Users'
    );
  ELSE
    -- Actualizar perfil con empresa y nivel admin
    UPDATE public.perfiles
    SET empresa_id = company_id, nivel = 'Administrador'
    WHERE id = admin_user_id;

    -- Asignar rol ADMINISTRADOR
    INSERT INTO public.roles_usuario (user_id, role_id, assigned_by)
    VALUES (admin_user_id, admin_role, admin_user_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    result := jsonb_build_object(
      'success', true,
      'message', 'Usuario administrador de Coctel configurado correctamente',
      'user_id', admin_user_id,
      'company_id', company_id,
      'role', 'ADMINISTRADOR'
    );
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ejemplo de uso después de crear el usuario manualmente:
-- SELECT setup_coctel_admin('admin@coctel.com');

-- =====================================================
-- FUNCIONES PARA ROLES OCULTOS (Solo Owner)
-- =====================================================

-- Limpiar funciones existentes si existen con firmas diferentes
DROP FUNCTION IF EXISTS assign_sistemas_role(TEXT);
DROP FUNCTION IF EXISTS assign_admin_role(TEXT);
DROP FUNCTION IF EXISTS assign_gerente_plataforma_role(TEXT);

-- ------------------------------------------------------------------
-- Asignar rol SISTEMAS (super admin oculto, omnipotente)
-- Uso: SELECT assign_sistemas_role('owner@email.com');
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assign_sistemas_role(owner_email TEXT)
RETURNS JSONB AS $$
DECLARE
  target_user_id UUID;
  sistemas_role_id UUID;
  result JSONB;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = owner_email LIMIT 1;
  SELECT id INTO sistemas_role_id FROM roles WHERE name = 'Sistemas' LIMIT 1;

  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Usuario no encontrado. Créalo primero desde Authentication → Users');
  END IF;

  IF sistemas_role_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Rol "Sistemas" no encontrado. Ejecuta seed.sql');
  END IF;

  -- Asegurar perfil
  INSERT INTO public.perfiles (id, email, name, tipo, nivel, active)
  VALUES (target_user_id, owner_email, owner_email, 'Sistemas', 'Administrador', true)
  ON CONFLICT (id) DO UPDATE SET tipo = 'Sistemas', nivel = 'Administrador', active = true;

  -- Asignar rol Sistemas
  INSERT INTO public.roles_usuario (user_id, role_id, assigned_by)
  VALUES (target_user_id, sistemas_role_id, target_user_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  result := jsonb_build_object('success', true, 'message', 'Rol SISTEMAS asignado correctamente (omnipotente)', 'user_id', target_user_id, 'role', 'Sistemas');
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------
-- Asignar rol GERENTE PLATAFORMA (master admin oculto)
-- Uso: SELECT assign_gerente_plataforma_role('owner@email.com');
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assign_gerente_plataforma_role(owner_email TEXT)
RETURNS JSONB AS $$
DECLARE
  target_user_id UUID;
  gerente_role_id UUID;
  result JSONB;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = owner_email LIMIT 1;
  SELECT id INTO gerente_role_id FROM roles WHERE name = 'Gerente Plataforma' LIMIT 1;

  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Usuario no encontrado. Créalo primero desde Authentication → Users');
  END IF;

  IF gerente_role_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Rol "Gerente Plataforma" no encontrado. Ejecuta seed.sql');
  END IF;

  -- Asegurar perfil
  INSERT INTO public.perfiles (id, email, name, tipo, nivel, active)
  VALUES (target_user_id, owner_email, owner_email, 'Gerente Plataforma', 'Administrador', true)
  ON CONFLICT (id) DO UPDATE SET tipo = 'Gerente Plataforma', nivel = 'Administrador', active = true;

  -- Asignar rol Gerente Plataforma
  INSERT INTO public.roles_usuario (user_id, role_id, assigned_by)
  VALUES (target_user_id, gerente_role_id, target_user_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  result := jsonb_build_object('success', true, 'message', 'Rol GERENTE PLATAFORMA asignado correctamente', 'user_id', target_user_id, 'role', 'Gerente Plataforma');
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Función para obtener estadísticas del sistema
-- =====================================================
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS TABLE (
  total_users BIGINT,
  active_users BIGINT,
  total_projects BIGINT,
  active_projects BIGINT,
  total_permissions BIGINT,
  total_roles BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM perfiles) as total_users,
    (SELECT COUNT(*) FROM perfiles WHERE active = true) as active_users,
    (SELECT COUNT(*) FROM proyectos) as total_projects,
    (SELECT COUNT(*) FROM proyectos WHERE active = true) as active_projects,
    (SELECT COUNT(*) FROM permisos) as total_permissions,
    (SELECT COUNT(*) FROM roles) as total_roles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
