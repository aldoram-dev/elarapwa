-- Corregir el trigger para usar la tabla 'usuarios' en lugar de 'perfiles'

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar en usuarios (solo columnas que existen)
  INSERT INTO public.usuarios (id, email, name, nivel, active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.raw_user_meta_data->>'name', NEW.email),
    'Usuario',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Nota: La columna 'tipo' no existe en la tabla usuarios
-- Si necesitas esta funcionalidad, primero agrega la columna:
-- ALTER TABLE usuarios ADD COLUMN tipo TEXT;
-- 
-- Luego descomenta esta función:
-- CREATE OR REPLACE FUNCTION fn_sync_perfil_tipo_from_roles() 
-- RETURNS TRIGGER AS $$ 
-- DECLARE 
--   uid UUID; 
-- BEGIN 
--   uid := COALESCE(NEW.user_id, OLD.user_id); 
--   UPDATE usuarios SET tipo = get_primary_role_name(uid) WHERE id = uid; 
--   RETURN NULL; 
-- END;
-- $$ LANGUAGE plpgsql;
