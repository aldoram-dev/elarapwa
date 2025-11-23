-- =====================================================
-- Proyecto Louva - Schema de base de datos Supabase
-- Adaptado a estructura existente
-- =====================================================

-- =====================================================
-- TIPOS ENUM para perfil
-- =====================================================
-- Solo mantenemos user_level para control de permisos básico
DO $$ BEGIN
  CREATE TYPE public.user_level AS ENUM ('Administrador', 'Usuario');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- TABLA: perfiles (perfil público 1:1 con auth.users)
-- =====================================================
-- Nota: 'tipo' es TEXT libre, los tipos/roles reales vienen de la tabla 'roles'
-- solo 'nivel' usa ENUM para control de permisos básicos (Admin/Usuario)
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email TEXT,
    name TEXT,
    telefono TEXT,
    avatar_url TEXT,
    empresa_id UUID,
    tipo TEXT DEFAULT 'Usuario',  -- Campo libre, se puede omitir ya que usamos roles
    nivel public.user_level DEFAULT 'Usuario',  -- Solo para RLS básico
    internal BOOLEAN NOT NULL DEFAULT false,
    source TEXT NOT NULL DEFAULT 'auto' CHECK (source IN ('auto','custom')),
    metadata JSONB DEFAULT '{}'::jsonb,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(id)
  );
END $$;

-- =====================================================
-- Auditoría de roles
-- =====================================================
-- TABLA: permisos (catálogo de permisos)
-- =====================================================
CREATE TABLE IF NOT EXISTS permisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resource, action)
);
CREATE TABLE IF NOT EXISTS roles_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- =====================================================
-- TABLA: roles (catálogo de roles funcionales)
-- =====================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#0EA5E9',
  permissions UUID[] DEFAULT ARRAY[]::UUID[],
  protected BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: permisos_usuario (ACL directa por usuario)
-- =====================================================
CREATE TABLE IF NOT EXISTS permisos_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);
CREATE INDEX IF NOT EXISTS idx_permisos_usuario_user ON permisos_usuario(user_id);
CREATE INDEX IF NOT EXISTS idx_permisos_usuario_permission ON permisos_usuario(permission_id);

-- =====================================================
-- TABLA: roles_usuario (asignación de roles a usuarios)
-- =====================================================
CREATE TABLE IF NOT EXISTS roles_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_roles_usuario_user ON roles_usuario(user_id);
CREATE INDEX IF NOT EXISTS idx_roles_usuario_role ON roles_usuario(role_id);

-- =====================================================
-- TABLA: empresas (catálogo de organizaciones)
-- =====================================================
CREATE TABLE IF NOT EXISTS empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  telefono TEXT,
  correo TEXT,
  logo_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: proyectos (afiliados a empresas)
-- =====================================================
CREATE TABLE IF NOT EXISTS proyectos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  portada_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  direccion TEXT,
  ciudad TEXT,
  estado TEXT,
  pais TEXT,
  codigo_postal TEXT,
  telefono TEXT,
  email TEXT,
  tipo TEXT,
  color TEXT,
  icono TEXT,
  orden INTEGER DEFAULT 0,
  deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proyectos_empresa ON proyectos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_active ON proyectos(active);

-- =====================================================
-- NOTA IMPORTANTE: NO crear políticas RLS aquí
-- Las políticas se aplican DESPUÉS en parcheauth.sql
-- una vez que exista el primer usuario en auth.users
-- =====================================================



-- =====================================================
-- FUNCIONES DE UTILIDAD
-- =====================================================

-- Trigger genérico para refrescar columnas updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener permisos efectivos de un usuario
CREATE OR REPLACE FUNCTION get_user_permissions(target_user_id UUID)
RETURNS TABLE (
  permission_id UUID,
  resource TEXT,
  action TEXT,
  source TEXT -- 'direct' o 'role'
) AS $$
BEGIN
  RETURN QUERY
  -- Permisos directos
  SELECT 
    up.permission_id,
    p.resource,
    p.action,
    'direct'::TEXT as source
  FROM permisos_usuario up
  JOIN permisos p ON p.id = up.permission_id
  WHERE up.user_id = target_user_id
    AND (up.expires_at IS NULL OR up.expires_at > NOW())
  
  UNION
  
  -- Permisos por roles
  SELECT 
    unnest(r.permissions) as permission_id,
    p.resource,
    p.action,
    'role'::TEXT as source
  FROM roles_usuario ur
  JOIN roles r ON r.id = ur.role_id
  JOIN permisos p ON p.id = ANY(r.permissions)
  WHERE ur.user_id = target_user_id
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- NOTIFICATION GROUPS (targeting por grupos)
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#0EA5E9',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES notification_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  added_by UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_group_members_group_id ON notification_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_notification_group_members_user_id ON notification_group_members(user_id);

-- Políticas RLS movidas a parcheauth.sql

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notification_groups; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notification_group_members; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- =====================================================
-- STORAGE: Buckets y Policies (para logos/documentos)
-- =====================================================

-- Crear bucket 'documents' si no existe (privado por defecto)
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('documents', 'documents', FALSE);
EXCEPTION WHEN unique_violation THEN
  NULL;
END $$;

-- Crear bucket 'branding' si no existe (público para logos y favicons)
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('branding', 'branding', TRUE);
EXCEPTION WHEN unique_violation THEN
  NULL;
END $$;

-- Políticas de storage movidas a parcheauth.sql

-- =====================================================
-- PLATFORM SETTINGS (branding/tema por empresa)
-- =====================================================
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nombre_publico TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  theme TEXT DEFAULT 'system' CHECK (theme IN ('system','light','dark')),
  idioma TEXT DEFAULT 'es',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id)
);

CREATE OR REPLACE FUNCTION fn_platform_settings_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_platform_settings_updated_at ON platform_settings;
CREATE TRIGGER update_platform_settings_updated_at BEFORE UPDATE ON platform_settings FOR EACH ROW EXECUTE FUNCTION fn_platform_settings_updated_at();

-- RLS movido a parcheauth.sql

CREATE OR REPLACE FUNCTION fn_init_platform_settings_for_empresa() RETURNS TRIGGER AS $$ BEGIN INSERT INTO platform_settings(empresa_id, nombre_publico) VALUES (NEW.id, NEW.nombre) ON CONFLICT (empresa_id) DO NOTHING; RETURN NEW; END;$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_empresas_init_platform_settings ON empresas;
CREATE TRIGGER trg_empresas_init_platform_settings AFTER INSERT ON empresas FOR EACH ROW EXECUTE FUNCTION fn_init_platform_settings_for_empresa();

-- =====================================================
-- SISTEMA DE NOTIFICACIONES
-- =====================================================
DO $$ BEGIN CREATE TYPE notification_type AS ENUM ('info','success','warning','error'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notification_priority AS ENUM ('low','normal','high','urgent'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notification_target_type AS ENUM ('all','empresa','user','role','group'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type DEFAULT 'info',
  priority notification_priority DEFAULT 'normal',
  action_url TEXT,
  icon TEXT,
  created_by UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  target_type notification_target_type DEFAULT 'all',
  target_empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  target_user_ids UUID[],
  target_roles TEXT[],
  target_group_ids UUID[],
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES perfiles(id) ON DELETE CASCADE,
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, notification_id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_target_type ON notifications(target_type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_notification_id ON user_notifications(notification_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON user_notifications(user_id) WHERE read_at IS NULL AND dismissed_at IS NULL;

CREATE OR REPLACE FUNCTION create_user_notifications() RETURNS TRIGGER AS $$
DECLARE target_user_id UUID; BEGIN
  IF NEW.target_type = 'all' THEN INSERT INTO user_notifications(user_id, notification_id) SELECT id, NEW.id FROM perfiles WHERE active = true ON CONFLICT DO NOTHING;
  ELSIF NEW.target_type = 'empresa' AND NEW.target_empresa_id IS NOT NULL THEN INSERT INTO user_notifications(user_id, notification_id) SELECT id, NEW.id FROM perfiles WHERE empresa_id = NEW.target_empresa_id AND active = true ON CONFLICT DO NOTHING;
  ELSIF NEW.target_type = 'user' AND NEW.target_user_ids IS NOT NULL THEN
    FOREACH target_user_id IN ARRAY NEW.target_user_ids LOOP INSERT INTO user_notifications(user_id, notification_id) VALUES (target_user_id, NEW.id) ON CONFLICT DO NOTHING; END LOOP;
  ELSIF NEW.target_type = 'role' AND NEW.target_roles IS NOT NULL THEN INSERT INTO user_notifications(user_id, notification_id)
    SELECT DISTINCT ru.user_id, NEW.id FROM roles_usuario ru JOIN roles r ON r.id = ru.role_id JOIN perfiles p ON p.id = ru.user_id WHERE r.name = ANY(NEW.target_roles) AND p.active = true ON CONFLICT DO NOTHING;
  ELSIF NEW.target_type = 'group' AND NEW.target_group_ids IS NOT NULL THEN INSERT INTO user_notifications(user_id, notification_id)
    SELECT DISTINCT ngm.user_id, NEW.id FROM notification_group_members ngm JOIN perfiles p ON p.id = ngm.user_id WHERE ngm.group_id = ANY(NEW.target_group_ids) AND p.active = true ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW; END;$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_notification_created ON notifications;
CREATE TRIGGER on_notification_created AFTER INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION create_user_notifications();

-- RLS movido a parcheauth.sql

-- =====================================================
-- get_user_notifications (versión final unificada)
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_notifications(p_user_id UUID)
RETURNS TABLE (
  notification_id UUID,
  title TEXT,
  message TEXT,
  type TEXT,
  priority TEXT,
  action_url TEXT,
  icon TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB,
  target_type TEXT,
  target_group_ids UUID[],
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  user_notification_id UUID
) AS $$
BEGIN
  RETURN QUERY
  WITH user_info AS (
    SELECT p.empresa_id FROM perfiles p WHERE p.id = p_user_id
  ), user_roles AS (
    SELECT r.name FROM roles_usuario ru JOIN roles r ON r.id = ru.role_id
    WHERE ru.user_id = p_user_id AND (ru.expires_at IS NULL OR ru.expires_at > NOW())
  )
  SELECT 
    n.id AS notification_id,
    n.title,
    n.message,
    n.type::TEXT,
    n.priority::TEXT,
    n.action_url,
    n.icon,
    n.created_by,
    n.created_at,
    n.expires_at,
    n.metadata,
    n.target_type::TEXT,
    n.target_group_ids,
    un.read_at,
    un.dismissed_at,
    un.clicked_at,
    un.id AS user_notification_id
  FROM notifications n
  CROSS JOIN user_info ui
  LEFT JOIN user_notifications un ON un.notification_id = n.id AND un.user_id = p_user_id
  WHERE (n.expires_at IS NULL OR n.expires_at > NOW())
    AND (
      n.target_type = 'all'
      OR (n.target_type = 'empresa' AND n.target_empresa_id = ui.empresa_id)
      OR (n.target_type = 'user' AND p_user_id = ANY(n.target_user_ids))
      OR (n.target_type = 'role' AND EXISTS (
        SELECT 1 FROM user_roles ur WHERE ur.name = ANY(n.target_roles)
      ))
      OR (n.target_type = 'group' AND EXISTS (
        SELECT 1 FROM notification_group_members ngm
        WHERE ngm.user_id = p_user_id AND ngm.group_id = ANY(n.target_group_ids)
      ))
    )
  ORDER BY n.created_at DESC;
END;$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_notifications(UUID) IS 'Devuelve todas las notificaciones visibles para un usuario (según empresa, roles, grupos, usuarios específicos) junto con el estado personal (read/dismissed/clicked).';

-- Ensure function is exposed via RPC (if using PostgREST default). For Supabase this just requires RLS allowing execution.
-- Grant execute to authenticated users (adjust as needed for anon visibility rules)
GRANT EXECUTE ON FUNCTION get_user_notifications(UUID) TO authenticated;

-- =====================================================
-- SECURITY EVENTS (auditoría de eventos sensibles)
-- =====================================================
DO $$ BEGIN 
  CREATE TYPE security_event_type AS ENUM (
    'password_reset_request',
    'password_reset_success',
    'password_change',
    'login_success',
    'login_failed',
    'logout',
    'password_recovery_link_used',
    'session_expired',
    'unauthorized_access_attempt'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type security_event_type NOT NULL,
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_email ON security_events(email);

-- RLS movido a parcheauth.sql

-- Función helper para registrar eventos (simplifica llamadas desde aplicación)
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_email TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO security_events (
    user_id,
    event_type,
    email,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    p_user_id,
    p_event_type::security_event_type,
    p_email,
    p_ip_address,
    p_user_agent,
    p_metadata
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Limpieza automática de eventos antiguos (>90 días) - ejecutar periódicamente
CREATE OR REPLACE FUNCTION cleanup_old_security_events() RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM security_events 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Sincronización perfil.tipo desde roles
-- =====================================================
CREATE OR REPLACE FUNCTION get_primary_role_name(target_user_id UUID) RETURNS TEXT AS $$
DECLARE role_names TEXT[]; primary_name TEXT; BEGIN
  SELECT array_agg(lower(r.name)) INTO role_names FROM roles_usuario ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = target_user_id AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
  IF role_names IS NULL OR array_length(role_names,1) IS NULL THEN RETURN NULL; END IF;
  -- Orden de prioridad: Sistemas > Gerente Plataforma > otros (alfabético)
  IF 'sistemas' = ANY(role_names) THEN RETURN 'Sistemas'; END IF;
  IF 'gerente plataforma' = ANY(role_names) THEN RETURN 'Gerente Plataforma'; END IF;
  SELECT initcap(min(rn)) INTO primary_name FROM unnest(role_names) rn; RETURN primary_name; END;$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_sync_perfil_tipo_from_roles() RETURNS TRIGGER AS $$ DECLARE uid UUID; BEGIN uid := COALESCE(NEW.user_id, OLD.user_id); UPDATE perfiles SET tipo = get_primary_role_name(uid) WHERE id = uid; RETURN NULL; END;$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_roles_usuario_sync_perfil_tipo_ins ON roles_usuario;
CREATE TRIGGER trg_roles_usuario_sync_perfil_tipo_ins AFTER INSERT ON roles_usuario FOR EACH ROW EXECUTE FUNCTION fn_sync_perfil_tipo_from_roles();
DROP TRIGGER IF EXISTS trg_roles_usuario_sync_perfil_tipo_upd ON roles_usuario;
CREATE TRIGGER trg_roles_usuario_sync_perfil_tipo_upd AFTER UPDATE ON roles_usuario FOR EACH ROW EXECUTE FUNCTION fn_sync_perfil_tipo_from_roles();
DROP TRIGGER IF EXISTS trg_roles_usuario_sync_perfil_tipo_del ON roles_usuario;
CREATE TRIGGER trg_roles_usuario_sync_perfil_tipo_del AFTER DELETE ON roles_usuario FOR EACH ROW EXECUTE FUNCTION fn_sync_perfil_tipo_from_roles();
UPDATE perfiles p SET tipo = get_primary_role_name(p.id);

-- =====================================================
-- Core roles full permissions (auto-grant solo a Sistemas y Gerente Plataforma)
-- =====================================================
CREATE OR REPLACE FUNCTION ensure_core_roles_full_permissions() RETURNS VOID AS $$
DECLARE all_perms UUID[] := ARRAY(SELECT id FROM permisos); core_role RECORD; BEGIN
  FOR core_role IN SELECT * FROM roles WHERE lower(name) IN ('sistemas','gerente plataforma') LOOP
    UPDATE roles SET permissions = all_perms, protected = true, updated_at = NOW() WHERE id = core_role.id;
  END LOOP; END;$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION fn_refresh_core_roles() RETURNS TRIGGER AS $$ BEGIN PERFORM ensure_core_roles_full_permissions(); RETURN NEW; END;$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_permisos_refresh_core_roles ON permisos;
CREATE TRIGGER trg_permisos_refresh_core_roles AFTER INSERT OR UPDATE OR DELETE ON permisos FOR EACH STATEMENT EXECUTE FUNCTION fn_refresh_core_roles();
UPDATE roles SET protected = true WHERE lower(name) IN ('sistemas', 'gerente plataforma');

-- Función para verificar si un usuario tiene un permiso específico
CREATE OR REPLACE FUNCTION user_has_permission(
  target_user_id UUID,
  target_resource TEXT,
  target_action TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM get_user_permissions(target_user_id)
    WHERE resource = target_resource AND action = target_action
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Función para sincronizar permisos (auto-discovery desde rutas)
-- SECURITY DEFINER permite bypass de RLS de forma controlada
-- =====================================================
CREATE OR REPLACE FUNCTION sync_permissions_from_routes(
  permissions_data JSONB
)
RETURNS JSONB AS $$
DECLARE
  perm JSONB;
  inserted_count INT := 0;
  updated_count INT := 0;
  result JSONB;
BEGIN
  -- Iterar sobre cada permiso en el JSON
  FOR perm IN SELECT * FROM jsonb_array_elements(permissions_data)
  LOOP
    -- Intentar insertar o actualizar el permiso
    INSERT INTO permisos (name, description, resource, action, metadata)
    VALUES (
      perm->>'name',
      perm->>'description',
      perm->>'resource',
      perm->>'action',
      COALESCE(perm->'metadata', '{}'::jsonb)
    )
    ON CONFLICT (resource, action) 
    DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      metadata = EXCLUDED.metadata,
      updated_at = NOW();
    
    -- Contar si fue inserción o actualización
    IF FOUND THEN
      IF (SELECT COUNT(*) FROM permisos WHERE resource = perm->>'resource' AND action = perm->>'action') = 1 THEN
        updated_count := updated_count + 1;
      ELSE
        inserted_count := inserted_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  result := jsonb_build_object(
    'success', true,
    'inserted', inserted_count,
    'updated', updated_count
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PROYECCIÓN RELACIONAL: roles_permisos (mirror de roles.permissions)
-- =====================================================
CREATE TABLE IF NOT EXISTS roles_permisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permiso_id UUID NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
  UNIQUE(role_id, permiso_id)
);

CREATE INDEX IF NOT EXISTS idx_roles_permisos_role ON roles_permisos(role_id);
CREATE INDEX IF NOT EXISTS idx_roles_permisos_perm ON roles_permisos(permiso_id);

-- Poblar inicial desde array existente (idempotente)
INSERT INTO roles_permisos(role_id, permiso_id)
SELECT r.id, p_id
FROM roles r
JOIN LATERAL unnest(r.permissions) p_id ON TRUE
ON CONFLICT DO NOTHING;

-- Trigger de sincronización ARRAY -> tabla espejo
CREATE OR REPLACE FUNCTION fn_sync_roles_permissions_array() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM roles_permisos WHERE role_id = NEW.id;
  IF NEW.permissions IS NOT NULL THEN
    INSERT INTO roles_permisos(role_id, permiso_id)
    SELECT NEW.id, unnest(NEW.permissions)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_roles_sync_permissions_array ON roles;
CREATE TRIGGER trg_roles_sync_permissions_array
AFTER INSERT OR UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION fn_sync_roles_permissions_array();

COMMENT ON TABLE roles_permisos IS 'Proyección relacional de roles.permissions (UUID[]) para consultas y auditoría';

-- =====================================================
-- FOROS (chat grupal básico) y MENSAJES
-- =====================================================
CREATE TABLE IF NOT EXISTS foros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  usuarios_asignados UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_foros_created_at ON foros(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_foros_usuarios_asignados ON foros USING GIN(usuarios_asignados);

-- RLS movido a parcheauth.sql

CREATE OR REPLACE FUNCTION update_foros_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS foros_updated_at ON foros;
CREATE TRIGGER foros_updated_at BEFORE UPDATE ON foros FOR EACH ROW EXECUTE FUNCTION update_foros_updated_at();

COMMENT ON TABLE foros IS 'Tabla de foros del sistema con usuarios asignados';
COMMENT ON COLUMN foros.usuarios_asignados IS 'Array de UUIDs de usuarios con acceso al foro';

CREATE TABLE IF NOT EXISTS forum_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foro_id UUID NOT NULL REFERENCES foros(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT message_or_attachments CHECK (
    (message IS NOT NULL AND message <> '') OR 
    (attachments IS NOT NULL AND jsonb_array_length(attachments) > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_forum_messages_foro_id ON forum_messages(foro_id);
CREATE INDEX IF NOT EXISTS idx_forum_messages_user_id ON forum_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_messages_created_at ON forum_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_messages_foro_created ON forum_messages(foro_id, created_at DESC);

-- RLS movido a parcheauth.sql

COMMENT ON TABLE forum_messages IS 'Mensajes de los foros tipo chat grupal';
COMMENT ON COLUMN forum_messages.foro_id IS 'ID del foro al que pertenece el mensaje';
COMMENT ON COLUMN forum_messages.user_id IS 'ID del usuario que escribió el mensaje';
COMMENT ON COLUMN forum_messages.message IS 'Contenido del mensaje';
COMMENT ON COLUMN forum_messages.attachments IS 'Array de archivos adjuntos [{url, name, size, type, bucket}]';
COMMENT ON COLUMN forum_messages.metadata IS 'Metadatos adicionales del mensaje';

CREATE OR REPLACE TRIGGER update_forum_messages_updated_at
  BEFORE UPDATE ON forum_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STORAGE: forum-attachments bucket
-- =====================================================
DO $$ BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('forum-attachments','forum-attachments', FALSE)
  ON CONFLICT (id) DO UPDATE SET public = FALSE;
EXCEPTION WHEN unique_violation THEN NULL; END $$;

-- Políticas de storage movidas a parcheauth.sql


-- =====================================================
-- REALTIME: Habilitar publicación para tablas principales
-- =====================================================
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE perfiles; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE permisos; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE roles; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE permisos_usuario; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE roles_usuario; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE empresas; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE proyectos; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE roles_audit; EXCEPTION WHEN duplicate_object THEN NULL; END;
  -- Al final del archivo, después de crear la tabla platform_settings y sus triggers/policies
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE platform_settings; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE security_events; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE foros; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE forum_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
-- =====================================================
-- ÍNDICES adicionales consolidación
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread_active ON user_notifications(user_id) WHERE read_at IS NULL AND dismissed_at IS NULL;

-- =====================================================
-- ADMINISTRACIÓN DE OBRA
-- =====================================================

-- TABLA: contratistas
-- =====================================================
CREATE TABLE IF NOT EXISTS contratistas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Información básica
  nombre TEXT NOT NULL, -- Nombre o Razón Social
  categoria TEXT, -- Categoría del contratista
  partida TEXT, -- Partida presupuestal
  
  -- Localización y contacto
  localizacion TEXT, -- Dirección Fiscal
  telefono TEXT,
  correo_contacto TEXT, -- Correo Electrónico de Contacto
  
  -- Información bancaria
  numero_cuenta_bancaria TEXT,
  banco TEXT,
  nombre_cuenta TEXT, -- Nombre al que está la cuenta
  
  -- Documentos (URLs en storage)
  csf_url TEXT, -- Constancia de Situación Fiscal
  cv_url TEXT, -- Curriculum Vitae
  acta_constitutiva_url TEXT,
  repse_url TEXT, -- Registro de Prestadoras de Servicios Especializados
  ine_url TEXT,
  registro_patronal_url TEXT,
  comprobante_domicilio_url TEXT,
  
  -- Estado y metadata
  active BOOLEAN NOT NULL DEFAULT true,
  notas TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Relaciones
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL,
  created_by UUID REFERENCES perfiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_contratistas_empresa ON contratistas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contratistas_proyecto ON contratistas(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_contratistas_active ON contratistas(active);
CREATE INDEX IF NOT EXISTS idx_contratistas_nombre ON contratistas(nombre);
CREATE INDEX IF NOT EXISTS idx_contratistas_categoria ON contratistas(categoria);

-- =====================================================
-- TABLA: contratos
-- =====================================================
CREATE TABLE IF NOT EXISTS contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Información básica
  numero_contrato TEXT,
  nombre TEXT,
  clave_contrato TEXT, -- Clave de Contrato
  descripcion TEXT,
  tipo_contrato TEXT CHECK (tipo_contrato IN ('PRECIO_ALZADO', 'PRECIO_UNITARIO', 'ADMINISTRACION', 'MIXTO')),
  tratamiento TEXT, -- Tratamiento del contrato
  
  -- Relaciones
  contratista_id UUID NOT NULL REFERENCES contratistas(id) ON DELETE RESTRICT,
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL,
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  
  -- Categorización (heredados del contratista)
  categoria TEXT,
  partida TEXT,
  subpartida TEXT,
  
  -- Montos
  monto_contrato NUMERIC(15, 2) NOT NULL, -- Monto Neto Contratado
  moneda TEXT DEFAULT 'MXN' CHECK (moneda IN ('MXN', 'USD')),
  anticipo_monto NUMERIC(15, 2), -- Monto Neto de Anticipo
  
  -- Retenciones y penalizaciones
  retencion_porcentaje NUMERIC(5, 2), -- % Retención
  penalizacion_maxima_porcentaje NUMERIC(5, 2), -- % Penalización Máxima
  penalizacion_por_dia NUMERIC(15, 2), -- Penalización por Día (monto)
  
  -- Fechas
  fecha_inicio DATE, -- Fecha de Inicio
  fecha_fin DATE, -- Fecha de Fin
  fecha_fin_real DATE,
  duracion_dias INTEGER,
  
  -- Estado
  estatus TEXT DEFAULT 'BORRADOR' CHECK (estatus IN ('BORRADOR', 'EN_REVISION', 'APROBADO', 'ACTIVO', 'FINALIZADO', 'CANCELADO')),
  porcentaje_avance NUMERIC(5, 2) DEFAULT 0,
  
  -- Documentos
  contrato_pdf_url TEXT, -- Contrato (PDF)
  documentos_adjuntos TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Pagos y finanzas
  forma_pago TEXT,
  condiciones_pago TEXT,
  
  -- Alcance y especificaciones
  alcance_trabajo TEXT,
  especificaciones_tecnicas TEXT,
  
  -- Metadata y notas
  notas TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Auditoría
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  aprobado_por UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  fecha_aprobacion TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_contratos_contratista ON contratos(contratista_id);
CREATE INDEX IF NOT EXISTS idx_contratos_proyecto ON contratos(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_contratos_empresa ON contratos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contratos_estatus ON contratos(estatus);
CREATE INDEX IF NOT EXISTS idx_contratos_active ON contratos(active);
CREATE INDEX IF NOT EXISTS idx_contratos_numero ON contratos(numero_contrato);

-- =====================================================
-- TRIGGERS para updated_at
-- =====================================================
CREATE TRIGGER update_contratistas_updated_at
  BEFORE UPDATE ON contratistas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contratos_updated_at
  BEFORE UPDATE ON contratos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================
ALTER TABLE contratistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;

-- Políticas para contratistas
CREATE POLICY "Usuarios pueden ver contratistas de su empresa"
  ON contratistas FOR SELECT
  USING (
    empresa_id IN (SELECT empresa_id FROM perfiles WHERE id = auth.uid())
    OR empresa_id IS NULL
  );

CREATE POLICY "Usuarios nivel Administrador pueden insertar contratistas"
  ON contratistas FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND nivel = 'Administrador')
  );

CREATE POLICY "Usuarios nivel Administrador pueden actualizar contratistas"
  ON contratistas FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND nivel = 'Administrador')
  );

-- Políticas para contratos
CREATE POLICY "Usuarios pueden ver contratos de su empresa"
  ON contratos FOR SELECT
  USING (
    empresa_id IN (SELECT empresa_id FROM perfiles WHERE id = auth.uid())
    OR empresa_id IS NULL
  );

CREATE POLICY "Usuarios nivel Administrador pueden insertar contratos"
  ON contratos FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND nivel = 'Administrador')
  );

CREATE POLICY "Usuarios nivel Administrador pueden actualizar contratos"
  ON contratos FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND nivel = 'Administrador')
  );

-- Habilitar realtime para administración de obra
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE contratistas; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE contratos; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
