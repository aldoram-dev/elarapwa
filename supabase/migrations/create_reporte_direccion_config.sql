-- Tabla para almacenar la configuración del reporte de dirección
CREATE TABLE IF NOT EXISTS reporte_direccion_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    looker_studio_url TEXT NOT NULL,
    actualizado_por UUID REFERENCES auth.users(id),
    actualizado_en TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE reporte_direccion_config ENABLE ROW LEVEL SECURITY;

-- Política: Solo usuarios autenticados pueden leer (validación de roles en código)
CREATE POLICY "Usuarios autenticados pueden ver configuración"
ON reporte_direccion_config
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Política: Solo usuarios autenticados pueden insertar (validación de roles en código)
CREATE POLICY "Usuarios autenticados pueden crear configuración"
ON reporte_direccion_config
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Política: Solo usuarios autenticados pueden actualizar (validación de roles en código)
CREATE POLICY "Usuarios autenticados pueden actualizar configuración"
ON reporte_direccion_config
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_reporte_direccion_config_actualizado_por 
ON reporte_direccion_config(actualizado_por);

-- Comentarios
COMMENT ON TABLE reporte_direccion_config IS 'Configuración del enlace al reporte de dirección en Looker Studio';
COMMENT ON COLUMN reporte_direccion_config.looker_studio_url IS 'URL del dashboard de Looker Studio';
COMMENT ON COLUMN reporte_direccion_config.actualizado_por IS 'Usuario que realizó la última actualización';
COMMENT ON COLUMN reporte_direccion_config.actualizado_en IS 'Fecha y hora de la última actualización';
