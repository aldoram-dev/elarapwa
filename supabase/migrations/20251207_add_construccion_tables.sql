-- Crear tablas para módulo de Construcción

-- Tabla para Programa de Obra
CREATE TABLE IF NOT EXISTS programa_obra_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  programa_url TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proyecto_id)
);

-- Tabla para Recorrido 360°
CREATE TABLE IF NOT EXISTS recorrido360_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  recorrido_url TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proyecto_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_programa_obra_config_proyecto ON programa_obra_config(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_recorrido360_config_proyecto ON recorrido360_config(proyecto_id);

-- RLS (Row Level Security)
ALTER TABLE programa_obra_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE recorrido360_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para programa_obra_config
CREATE POLICY "Usuarios autenticados pueden ver programa_obra_config"
  ON programa_obra_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo administradores pueden modificar programa_obra_config"
  ON programa_obra_config FOR ALL
  TO authenticated
  USING (true);

-- Políticas RLS para recorrido360_config  
CREATE POLICY "Usuarios autenticados pueden ver recorrido360_config"
  ON recorrido360_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo administradores pueden modificar recorrido360_config"
  ON recorrido360_config FOR ALL
  TO authenticated
  USING (true);

-- Comentarios
COMMENT ON TABLE programa_obra_config IS 'Configuración de enlaces al programa de obra (Google Sheets, etc.)';
COMMENT ON TABLE recorrido360_config IS 'Configuración de enlaces a recorridos virtuales 360° (Matterport, Kuula, etc.)';
