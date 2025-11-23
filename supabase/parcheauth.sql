-- =====================================================
-- parcheauth.sql - Reglas, RLS y funciones para auth
-- Aplica después de crear el primer usuario manualmente
-- =====================================================

-- Habilitar RLS en todas las tablas principales
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permisos_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE foros ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para perfiles (simples: solo autenticados)
DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Users can view their own profile" ON perfiles';
  EXECUTE 'DROP POLICY IF EXISTS "Users can update their own profile" ON perfiles';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can view all profiles" ON perfiles';
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view profiles" ON perfiles';
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON perfiles';
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can update profiles" ON perfiles';
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can delete profiles" ON perfiles';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Solo usuarios autenticados pueden hacer operaciones (control de roles en código)
CREATE POLICY "Authenticated users can view profiles" ON perfiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert profiles" ON perfiles
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update profiles" ON perfiles
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete profiles" ON perfiles
  FOR DELETE TO authenticated USING (true);

-- Políticas para permisos
DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view permissions" ON permisos';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can insert permissions" ON permisos';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can update permissions" ON permisos';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can delete permissions" ON permisos';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Authenticated users can view permissions" ON permisos
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can insert permissions" ON permisos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() 
      AND nivel = 'Administrador'
    )
  );
CREATE POLICY "Admins can update permissions" ON permisos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() 
      AND nivel = 'Administrador'
    )
  );
CREATE POLICY "Admins can delete permissions" ON permisos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() 
      AND nivel = 'Administrador'
    )
  );

-- Políticas para roles
DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view roles" ON roles';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can insert roles" ON roles';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can update roles" ON roles';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can delete roles" ON roles';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Authenticated users can view roles" ON roles
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can insert roles" ON roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() 
      AND nivel = 'Administrador'
    )
  );
CREATE POLICY "Admins can update roles" ON roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() 
      AND nivel = 'Administrador'
    )
  );
CREATE POLICY "Admins can delete roles" ON roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() 
      AND nivel = 'Administrador'
    )
  );

-- Políticas para permisos_usuario
DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Users can view their own permissions" ON permisos_usuario';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can insert user permissions" ON permisos_usuario';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can update user permissions" ON permisos_usuario';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can delete user permissions" ON permisos_usuario';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Users can view their own permissions" ON permisos_usuario
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() 
      AND nivel = 'Administrador'
    )
  );
CREATE POLICY "Admins can insert user permissions" ON permisos_usuario
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() 
      AND nivel = 'Administrador'
    )
  );
CREATE POLICY "Admins can update user permissions" ON permisos_usuario
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() 
      AND nivel = 'Administrador'
    )
  );
CREATE POLICY "Admins can delete user permissions" ON permisos_usuario
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() 
      AND nivel = 'Administrador'
    )
  );

-- Políticas para roles_usuario
DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Users can view their own roles" ON roles_usuario';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can insert user roles" ON roles_usuario';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can update user roles" ON roles_usuario';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can delete user roles" ON roles_usuario';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Users can view their own roles" ON roles_usuario
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() 
      AND nivel = 'Administrador'
    )
  );
CREATE POLICY "Admins can insert user roles" ON roles_usuario
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() 
      AND nivel = 'Administrador'
    )
  );
CREATE POLICY "Admins can update user roles" ON roles_usuario
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() 
      AND nivel = 'Administrador'
    )
  );
CREATE POLICY "Admins can delete user roles" ON roles_usuario
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() 
      AND nivel = 'Administrador'
    )
  );

-- Políticas para proyectos
DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Users can view projects" ON proyectos';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can insert projects" ON proyectos';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can update projects" ON proyectos';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can delete projects" ON proyectos';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Users can view projects" ON proyectos
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can insert projects" ON proyectos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() 
      AND nivel = 'Administrador'
    )
  );
CREATE POLICY "Admins can update projects" ON proyectos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() 
      AND nivel = 'Administrador'
    )
  );
CREATE POLICY "Admins can delete projects" ON proyectos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() 
      AND nivel = 'Administrador'
    )
  );

-- Políticas para empresas
DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Users can view empresas" ON empresas';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can insert empresas" ON empresas';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can update empresas" ON empresas';
  EXECUTE 'DROP POLICY IF EXISTS "Admins can delete empresas" ON empresas';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Users can view empresas" ON empresas
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can insert empresas" ON empresas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() AND nivel = 'Administrador'
    )
  );
CREATE POLICY "Admins can update empresas" ON empresas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() AND nivel = 'Administrador'
    )
  );
CREATE POLICY "Admins can delete empresas" ON empresas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() AND nivel = 'Administrador'
    )
  );

-- Políticas para roles_audit
DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Admins read roles_audit" ON roles_audit';
  EXECUTE 'DROP POLICY IF EXISTS "Masters read roles_audit" ON roles_audit';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Admins read roles_audit" ON roles_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() 
        AND nivel = 'Administrador'
    )
  );
CREATE POLICY "Masters read roles_audit" ON roles_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 
      FROM roles_usuario ru 
      JOIN roles r ON r.id = ru.role_id 
      WHERE ru.user_id = auth.uid() 
        AND lower(r.name) IN ('sistemas','gerente plataforma')
    )
  );

-- Políticas para notification_groups y notification_group_members
DROP POLICY IF EXISTS "Authenticated can view notification groups" ON notification_groups;
DROP POLICY IF EXISTS "Authenticated can view group members" ON notification_group_members;
DROP POLICY IF EXISTS "Admins/Sistemas can manage notification groups" ON notification_groups;
DROP POLICY IF EXISTS "Admins/Sistemas can manage notification group members" ON notification_group_members;
CREATE POLICY "Authenticated can view notification groups" ON notification_groups
  FOR SELECT USING (
    auth.role() = 'authenticated'
    OR EXISTS (
      SELECT 1 FROM roles_usuario ru
      JOIN roles r ON r.id = ru.role_id
      WHERE ru.user_id = auth.uid() AND lower(r.name) = 'sistemas'
    )
  );
CREATE POLICY "Authenticated can view group members" ON notification_group_members
  FOR SELECT USING (
    auth.role() = 'authenticated'
    OR EXISTS (
      SELECT 1 FROM roles_usuario ru
      JOIN roles r ON r.id = ru.role_id
      WHERE ru.user_id = auth.uid() AND lower(r.name) = 'sistemas'
    )
  );
CREATE POLICY "Admins/Sistemas can manage notification groups" ON notification_groups
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND nivel = 'Administrador')
    OR EXISTS (
      SELECT 1 FROM roles_usuario ru
      JOIN roles r ON r.id = ru.role_id
      WHERE ru.user_id = auth.uid() AND lower(r.name) = 'sistemas'
    )
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND nivel = 'Administrador')
    OR EXISTS (
      SELECT 1 FROM roles_usuario ru
      JOIN roles r ON r.id = ru.role_id
      WHERE ru.user_id = auth.uid() AND lower(r.name) = 'sistemas'
    )
  );
CREATE POLICY "Admins/Sistemas can manage notification group members" ON notification_group_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND nivel = 'Administrador')
    OR EXISTS (
      SELECT 1 FROM roles_usuario ru
      JOIN roles r ON r.id = ru.role_id
      WHERE ru.user_id = auth.uid() AND lower(r.name) = 'sistemas'
    )
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND nivel = 'Administrador')
    OR EXISTS (
      SELECT 1 FROM roles_usuario ru
      JOIN roles r ON r.id = ru.role_id
      WHERE ru.user_id = auth.uid() AND lower(r.name) = 'sistemas'
    )
  );

-- Políticas para platform_settings
DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Users view platform settings" ON platform_settings';
  EXECUTE 'DROP POLICY IF EXISTS "Admins manage platform settings" ON platform_settings';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Users view platform settings" ON platform_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage platform settings" ON platform_settings FOR ALL USING (EXISTS (SELECT 1 FROM perfiles p WHERE p.id = auth.uid() AND p.nivel = 'Administrador')) WITH CHECK (EXISTS (SELECT 1 FROM perfiles p WHERE p.id = auth.uid() AND p.nivel = 'Administrador'));

-- Políticas para notifications y user_notifications
DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Usuarios pueden ver notificaciones dirigidas a ellos" ON notifications';
  EXECUTE 'DROP POLICY IF EXISTS "Solo admins pueden crear notificaciones" ON notifications';
  EXECUTE 'DROP POLICY IF EXISTS "Solo admins pueden actualizar notificaciones" ON notifications';
  EXECUTE 'DROP POLICY IF EXISTS "Solo admins pueden eliminar notificaciones" ON notifications';
  EXECUTE 'DROP POLICY IF EXISTS "Usuarios pueden ver sus propias notificaciones" ON user_notifications';
  EXECUTE 'DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propias notificaciones" ON user_notifications';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Usuarios pueden ver notificaciones dirigidas a ellos" ON notifications FOR SELECT USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND nivel = 'Administrador') OR EXISTS (SELECT 1 FROM user_notifications WHERE user_id = auth.uid() AND notification_id = notifications.id));
CREATE POLICY "Solo admins pueden crear notificaciones" ON notifications FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND nivel = 'Administrador'));
CREATE POLICY "Solo admins pueden actualizar notificaciones" ON notifications FOR UPDATE USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND nivel = 'Administrador'));
CREATE POLICY "Solo admins pueden eliminar notificaciones" ON notifications FOR DELETE USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND nivel = 'Administrador'));
CREATE POLICY "Usuarios pueden ver sus propias notificaciones" ON user_notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Usuarios pueden actualizar sus propias notificaciones" ON user_notifications FOR UPDATE USING (user_id = auth.uid());

-- Políticas para security_events
DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Admins ven todos los eventos de seguridad" ON security_events';
  EXECUTE 'DROP POLICY IF EXISTS "Usuarios ven sus propios eventos de seguridad" ON security_events';
  EXECUTE 'DROP POLICY IF EXISTS "Sistema puede insertar eventos de seguridad" ON security_events';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Admins ven todos los eventos de seguridad" ON security_events FOR SELECT USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND nivel = 'Administrador'));
CREATE POLICY "Usuarios ven sus propios eventos de seguridad" ON security_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Sistema puede insertar eventos de seguridad" ON security_events FOR INSERT WITH CHECK (true);

-- Políticas para foros y forum_messages
DROP POLICY IF EXISTS "Administradores y master pueden ver foros" ON foros;
DROP POLICY IF EXISTS "Administradores y master pueden crear foros" ON foros;
DROP POLICY IF EXISTS "Administradores y master pueden actualizar foros" ON foros;
DROP POLICY IF EXISTS "Administradores y master pueden eliminar foros" ON foros;
CREATE POLICY "Administradores y master pueden ver foros" ON foros FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM perfiles WHERE perfiles.id = auth.uid() AND (perfiles.nivel = 'Administrador' OR EXISTS (SELECT 1 FROM roles_usuario ru JOIN roles r ON ru.role_id = r.id WHERE ru.user_id = auth.uid() AND r.name IN ('Sistemas','Gerente Plataforma'))) ) OR auth.uid() = ANY(usuarios_asignados));
CREATE POLICY "Administradores y master pueden crear foros" ON foros FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE perfiles.id = auth.uid() AND (perfiles.nivel = 'Administrador' OR EXISTS (SELECT 1 FROM roles_usuario ru JOIN roles r ON ru.role_id = r.id WHERE ru.user_id = auth.uid() AND r.name IN ('Sistemas','Gerente Plataforma'))) ));
CREATE POLICY "Administradores y master pueden actualizar foros" ON foros FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM perfiles WHERE perfiles.id = auth.uid() AND (perfiles.nivel = 'Administrador' OR EXISTS (SELECT 1 FROM roles_usuario ru JOIN roles r ON ru.role_id = r.id WHERE ru.user_id = auth.uid() AND r.name IN ('Sistemas','Gerente Plataforma'))) )) WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE perfiles.id = auth.uid() AND (perfiles.nivel = 'Administrador' OR EXISTS (SELECT 1 FROM roles_usuario ru JOIN roles r ON ru.role_id = r.id WHERE ru.user_id = auth.uid() AND r.name IN ('Sistemas','Gerente Plataforma'))) ));
CREATE POLICY "Administradores y master pueden eliminar foros" ON foros FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM perfiles WHERE perfiles.id = auth.uid() AND (perfiles.nivel = 'Administrador' OR EXISTS (SELECT 1 FROM roles_usuario ru JOIN roles r ON ru.role_id = r.id WHERE ru.user_id = auth.uid() AND r.name IN ('Sistemas','Gerente Plataforma'))) ));
DROP POLICY IF EXISTS "Los usuarios pueden ver mensajes de sus foros" ON forum_messages;
DROP POLICY IF EXISTS "Los usuarios pueden enviar mensajes a sus foros" ON forum_messages;
DROP POLICY IF EXISTS "Los usuarios pueden editar sus propios mensajes" ON forum_messages;
DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios mensajes" ON forum_messages;
CREATE POLICY "Los usuarios pueden ver mensajes de sus foros" ON forum_messages FOR SELECT USING (EXISTS (SELECT 1 FROM foros f WHERE f.id = forum_messages.foro_id AND (auth.uid() = ANY(f.usuarios_asignados) OR EXISTS (SELECT 1 FROM roles_usuario ru JOIN roles r ON ru.role_id = r.id WHERE ru.user_id = auth.uid() AND r.name IN ('Sistemas','Gerente Plataforma'))) ));
CREATE POLICY "Los usuarios pueden enviar mensajes a sus foros" ON forum_messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM foros f WHERE f.id = forum_messages.foro_id AND (auth.uid() = ANY(f.usuarios_asignados) OR EXISTS (SELECT 1 FROM roles_usuario ru JOIN roles r ON ru.role_id = r.id WHERE ru.user_id = auth.uid() AND r.name IN ('Sistemas','Gerente Plataforma'))) ));
CREATE POLICY "Los usuarios pueden editar sus propios mensajes" ON forum_messages FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Los usuarios pueden eliminar sus propios mensajes" ON forum_messages FOR DELETE USING (user_id = auth.uid());

-- Políticas para storage (forum-attachments, documents, branding)
DROP POLICY IF EXISTS "Admins pueden moderar archivos de foros" ON storage.objects;
DROP POLICY IF EXISTS "Los usuarios pueden ver archivos de sus foros" ON storage.objects;
DROP POLICY IF EXISTS "Los usuarios pueden subir archivos a sus foros" ON storage.objects;
DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios archivos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can select documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can insert documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can select branding" ON storage.objects;
DROP POLICY IF EXISTS "Admins can insert branding" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update branding" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete branding" ON storage.objects;

CREATE POLICY "Admins pueden moderar archivos de foros" ON storage.objects FOR DELETE USING (bucket_id = 'forum-attachments' AND EXISTS (SELECT 1 FROM perfiles p WHERE p.id = auth.uid() AND p.nivel = 'Administrador'));
CREATE POLICY "Los usuarios pueden ver archivos de sus foros" ON storage.objects FOR SELECT USING (bucket_id = 'forum-attachments' AND EXISTS (SELECT 1 FROM forum_messages fm JOIN foros f ON fm.foro_id = f.id WHERE fm.attachments::text LIKE '%' || storage.objects.name || '%' AND (auth.uid() = ANY(f.usuarios_asignados) OR EXISTS (SELECT 1 FROM roles_usuario ru JOIN roles r ON ru.role_id = r.id WHERE ru.user_id = auth.uid() AND r.name IN ('Sistemas','Gerente Plataforma'))) ));
CREATE POLICY "Los usuarios pueden subir archivos a sus foros" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'forum-attachments' AND auth.uid() IS NOT NULL);
CREATE POLICY "Los usuarios pueden eliminar sus propios archivos" ON storage.objects FOR DELETE USING (bucket_id = 'forum-attachments' AND owner = auth.uid());
CREATE POLICY "Authenticated can select documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND auth.role() = 'authenticated');
CREATE POLICY "Admins can insert documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND EXISTS (SELECT 1 FROM public.perfiles p WHERE p.id = auth.uid() AND p.nivel = 'Administrador'));
CREATE POLICY "Admins can update documents" ON storage.objects FOR UPDATE USING (bucket_id = 'documents' AND EXISTS (SELECT 1 FROM public.perfiles p WHERE p.id = auth.uid() AND p.nivel = 'Administrador')) WITH CHECK (bucket_id = 'documents' AND EXISTS (SELECT 1 FROM public.perfiles p WHERE p.id = auth.uid() AND p.nivel = 'Administrador'));
CREATE POLICY "Admins can delete documents" ON storage.objects FOR DELETE USING (bucket_id = 'documents' AND EXISTS (SELECT 1 FROM public.perfiles p WHERE p.id = auth.uid() AND p.nivel = 'Administrador'));
CREATE POLICY "Public can select branding" ON storage.objects FOR SELECT USING (bucket_id = 'branding');
CREATE POLICY "Admins can insert branding" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'branding' AND EXISTS (SELECT 1 FROM public.perfiles p WHERE p.id = auth.uid() AND p.nivel = 'Administrador'));
CREATE POLICY "Admins can update branding" ON storage.objects FOR UPDATE USING (bucket_id = 'branding' AND EXISTS (SELECT 1 FROM public.perfiles p WHERE p.id = auth.uid() AND p.nivel = 'Administrador')) WITH CHECK (bucket_id = 'branding' AND EXISTS (SELECT 1 FROM public.perfiles p WHERE p.id = auth.uid() AND p.nivel = 'Administrador'));
CREATE POLICY "Admins can delete branding" ON storage.objects FOR DELETE USING (bucket_id = 'branding' AND EXISTS (SELECT 1 FROM public.perfiles p WHERE p.id = auth.uid() AND p.nivel = 'Administrador'));
