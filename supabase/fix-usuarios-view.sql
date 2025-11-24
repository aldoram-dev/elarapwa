-- Crear vista 'usuarios' que apunta a la tabla 'perfiles'
-- Esto permite que el código que usa 'usuarios' siga funcionando

DROP VIEW IF EXISTS usuarios CASCADE;

CREATE VIEW usuarios AS
SELECT 
  id,
  email,
  name,
  telefono,
  avatar_url,
  empresa_id as contratista_id,
  tipo,
  nivel,
  internal,
  source,
  metadata,
  active,
  created_at,
  updated_at
FROM perfiles;

-- Permitir operaciones INSERT/UPDATE/DELETE en la vista
CREATE OR REPLACE RULE usuarios_insert AS
ON INSERT TO usuarios DO INSTEAD
INSERT INTO perfiles (id, email, name, telefono, avatar_url, empresa_id, tipo, nivel, internal, source, metadata, active)
VALUES (NEW.id, NEW.email, NEW.name, NEW.telefono, NEW.avatar_url, NEW.contratista_id, NEW.tipo, NEW.nivel, NEW.internal, NEW.source, NEW.metadata, NEW.active)
RETURNING *;

CREATE OR REPLACE RULE usuarios_update AS
ON UPDATE TO usuarios DO INSTEAD
UPDATE perfiles SET
  email = NEW.email,
  name = NEW.name,
  telefono = NEW.telefono,
  avatar_url = NEW.avatar_url,
  empresa_id = NEW.contratista_id,
  tipo = NEW.tipo,
  nivel = NEW.nivel,
  internal = NEW.internal,
  source = NEW.source,
  metadata = NEW.metadata,
  active = NEW.active,
  updated_at = NOW()
WHERE id = OLD.id
RETURNING *;

CREATE OR REPLACE RULE usuarios_delete AS
ON DELETE TO usuarios DO INSTEAD
DELETE FROM perfiles WHERE id = OLD.id
RETURNING *;
