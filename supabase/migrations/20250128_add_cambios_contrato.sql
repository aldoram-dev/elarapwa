-- =============================================
-- MIGRACIÓN: CAMBIOS DE CONTRATO
-- Descripción: Aditivas, Deductivas, Extras y Deducciones Extra
-- Fecha: 2025-01-28
-- =============================================

-- Tabla: cambios_contrato
CREATE TABLE IF NOT EXISTS cambios_contrato (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Relaciones
  contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  
  -- Información básica
  numero_cambio TEXT NOT NULL, -- ADT-001, DED-001, EXT-001 (extraordinario), EXTDED-001 (deducción extra)
  tipo_cambio TEXT NOT NULL CHECK (tipo_cambio IN ('ADITIVA', 'DEDUCTIVA', 'EXTRA', 'DEDUCCION_EXTRA')),
  descripcion TEXT NOT NULL,
  
  -- Montos
  monto_cambio DECIMAL(15,2) NOT NULL DEFAULT 0, -- Positivo o negativo
  monto_contrato_anterior DECIMAL(15,2) NOT NULL,
  monto_contrato_nuevo DECIMAL(15,2) NOT NULL,
  
  -- Fechas
  fecha_cambio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_aprobacion TIMESTAMPTZ,
  fecha_aplicacion TIMESTAMPTZ,
  
  -- Estado
  estatus TEXT NOT NULL DEFAULT 'BORRADOR' CHECK (estatus IN ('BORRADOR', 'EN_REVISION', 'APROBADO', 'RECHAZADO', 'APLICADO')),
  
  -- Documentos
  archivo_plantilla_url TEXT,
  archivo_aprobacion_url TEXT,
  documentos_soporte TEXT[], -- Array de URLs
  
  -- Aprobaciones
  solicitado_por TEXT,
  aprobado_por TEXT,
  revisado_por TEXT,
  
  -- Observaciones
  motivo_cambio TEXT,
  observaciones TEXT,
  notas_aprobacion TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  
  -- Constraints
  CONSTRAINT cambios_contrato_numero_cambio_unique UNIQUE (contrato_id, numero_cambio)
);

-- Tabla: detalles_aditiva_deductiva
CREATE TABLE IF NOT EXISTS detalles_aditiva_deductiva (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Relaciones
  cambio_contrato_id UUID NOT NULL REFERENCES cambios_contrato(id) ON DELETE CASCADE,
  concepto_contrato_id UUID NOT NULL REFERENCES conceptos_contrato(id) ON DELETE CASCADE,
  
  -- Datos del concepto
  concepto_clave TEXT NOT NULL,
  concepto_descripcion TEXT NOT NULL,
  concepto_unidad TEXT NOT NULL,
  precio_unitario DECIMAL(15,2) NOT NULL,
  
  -- Cantidades
  cantidad_original DECIMAL(15,3) NOT NULL,
  cantidad_modificacion DECIMAL(15,3) NOT NULL, -- Positivo o negativo
  cantidad_nueva DECIMAL(15,3) NOT NULL,
  
  -- Importes
  importe_modificacion DECIMAL(15,2) NOT NULL, -- cantidad_modificacion * precio_unitario
  
  -- Observaciones
  observaciones TEXT,
  active BOOLEAN DEFAULT TRUE
);

-- Tabla: detalles_extra (para conceptos extraordinarios con plantilla)
CREATE TABLE IF NOT EXISTS detalles_extra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Relaciones
  cambio_contrato_id UUID NOT NULL REFERENCES cambios_contrato(id) ON DELETE CASCADE,
  
  -- Datos del concepto extra (extraordinario)
  concepto_clave TEXT NOT NULL,
  concepto_descripcion TEXT NOT NULL,
  concepto_unidad TEXT NOT NULL,
  
  -- Cantidades y precios
  cantidad DECIMAL(15,3) NOT NULL,
  precio_unitario DECIMAL(15,2) NOT NULL,
  importe DECIMAL(15,2) NOT NULL, -- cantidad * precio_unitario
  
  -- Observaciones
  observaciones TEXT,
  active BOOLEAN DEFAULT TRUE
);

-- Tabla: deducciones_extra (deducciones directas sin concepto del catálogo)
CREATE TABLE IF NOT EXISTS deducciones_extra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Relaciones
  cambio_contrato_id UUID NOT NULL REFERENCES cambios_contrato(id) ON DELETE CASCADE,
  
  -- Datos de la deducción
  descripcion TEXT NOT NULL,
  monto DECIMAL(15,2) NOT NULL, -- Monto de la deducción (positivo, se convierte a negativo en cambio_contrato)
  
  -- Observaciones
  observaciones TEXT,
  active BOOLEAN DEFAULT TRUE
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_cambios_contrato_contrato_id ON cambios_contrato(contrato_id);
CREATE INDEX IF NOT EXISTS idx_cambios_contrato_tipo_cambio ON cambios_contrato(tipo_cambio);
CREATE INDEX IF NOT EXISTS idx_cambios_contrato_estatus ON cambios_contrato(estatus);
CREATE INDEX IF NOT EXISTS idx_cambios_contrato_fecha_cambio ON cambios_contrato(fecha_cambio);

CREATE INDEX IF NOT EXISTS idx_detalles_aditiva_deductiva_cambio_id ON detalles_aditiva_deductiva(cambio_contrato_id);
CREATE INDEX IF NOT EXISTS idx_detalles_aditiva_deductiva_concepto_id ON detalles_aditiva_deductiva(concepto_contrato_id);

CREATE INDEX IF NOT EXISTS idx_detalles_extra_cambio_id ON detalles_extra(cambio_contrato_id);
CREATE INDEX IF NOT EXISTS idx_deducciones_extra_cambio_id ON deducciones_extra(cambio_contrato_id);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_cambios_contrato_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cambios_contrato_updated_at ON cambios_contrato;
CREATE TRIGGER trigger_cambios_contrato_updated_at
  BEFORE UPDATE ON cambios_contrato
  FOR EACH ROW
  EXECUTE FUNCTION update_cambios_contrato_updated_at();

DROP TRIGGER IF EXISTS trigger_detalles_aditiva_deductiva_updated_at ON detalles_aditiva_deductiva;
CREATE TRIGGER trigger_detalles_aditiva_deductiva_updated_at
  BEFORE UPDATE ON detalles_aditiva_deductiva
  FOR EACH ROW
  EXECUTE FUNCTION update_cambios_contrato_updated_at();

DROP TRIGGER IF EXISTS trigger_detalles_extra_updated_at ON detalles_extra;
CREATE TRIGGER trigger_detalles_extra_updated_at
  BEFORE UPDATE ON detalles_extra
  FOR EACH ROW
  EXECUTE FUNCTION update_cambios_contrato_updated_at();

DROP TRIGGER IF EXISTS trigger_deducciones_extra_updated_at ON deducciones_extra;
CREATE TRIGGER trigger_deducciones_extra_updated_at
  BEFORE UPDATE ON deducciones_extra
  FOR EACH ROW
  EXECUTE FUNCTION update_cambios_contrato_updated_at();

-- Función para calcular monto actual de contrato
CREATE OR REPLACE FUNCTION get_monto_contrato_actual(p_contrato_id UUID)
RETURNS DECIMAL(15,2) AS $$
DECLARE
  v_monto_original DECIMAL(15,2);
  v_monto_cambios DECIMAL(15,2);
BEGIN
  -- Obtener monto original del contrato
  SELECT monto_contrato INTO v_monto_original
  FROM contratos
  WHERE id = p_contrato_id;
  
  -- Sumar cambios aplicados
  SELECT COALESCE(SUM(monto_cambio), 0) INTO v_monto_cambios
  FROM cambios_contrato
  WHERE contrato_id = p_contrato_id
    AND estatus = 'APLICADO'
    AND active = TRUE;
  
  RETURN v_monto_original + v_monto_cambios;
END;
$$ LANGUAGE plpgsql;

-- Vista para resumen de cambios por contrato
DROP VIEW IF EXISTS resumen_cambios_contrato;
CREATE VIEW resumen_cambios_contrato AS
SELECT 
  c.id AS contrato_id,
  c.numero_contrato,
  c.nombre AS contrato_nombre,
  c.monto_contrato AS monto_original,
  COALESCE(SUM(CASE WHEN cc.tipo_cambio = 'ADITIVA' AND cc.estatus = 'APLICADO' THEN cc.monto_cambio ELSE 0 END), 0) AS total_aditivas,
  COALESCE(SUM(CASE WHEN cc.tipo_cambio = 'DEDUCTIVA' AND cc.estatus = 'APLICADO' THEN cc.monto_cambio ELSE 0 END), 0) AS total_deductivas,
  COALESCE(SUM(CASE WHEN cc.tipo_cambio = 'EXTRA' AND cc.estatus = 'APLICADO' THEN cc.monto_cambio ELSE 0 END), 0) AS total_extras,
  COALESCE(SUM(CASE WHEN cc.tipo_cambio = 'DEDUCCION_EXTRA' AND cc.estatus = 'APLICADO' THEN cc.monto_cambio ELSE 0 END), 0) AS total_deducciones_extra,
  get_monto_contrato_actual(c.id) AS monto_actual,
  COUNT(cc.id) FILTER (WHERE cc.active = TRUE) AS cantidad_cambios
FROM contratos c
LEFT JOIN cambios_contrato cc ON cc.contrato_id = c.id AND cc.active = TRUE
WHERE c.active = TRUE
GROUP BY c.id, c.numero_contrato, c.nombre, c.monto_contrato;

-- RLS (Row Level Security) - Solo autenticados
ALTER TABLE cambios_contrato ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalles_aditiva_deductiva ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalles_extra ENABLE ROW LEVEL SECURITY;
ALTER TABLE deducciones_extra ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios autenticados
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver cambios_contrato" ON cambios_contrato;
CREATE POLICY "Usuarios autenticados pueden ver cambios_contrato"
  ON cambios_contrato FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar cambios_contrato" ON cambios_contrato;
CREATE POLICY "Usuarios autenticados pueden insertar cambios_contrato"
  ON cambios_contrato FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar cambios_contrato" ON cambios_contrato;
CREATE POLICY "Usuarios autenticados pueden actualizar cambios_contrato"
  ON cambios_contrato FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar cambios_contrato" ON cambios_contrato;
CREATE POLICY "Usuarios autenticados pueden eliminar cambios_contrato"
  ON cambios_contrato FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para detalles_aditiva_deductiva
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver detalles_aditiva_deductiva" ON detalles_aditiva_deductiva;
CREATE POLICY "Usuarios autenticados pueden ver detalles_aditiva_deductiva"
  ON detalles_aditiva_deductiva FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar detalles_aditiva_deductiva" ON detalles_aditiva_deductiva;
CREATE POLICY "Usuarios autenticados pueden insertar detalles_aditiva_deductiva"
  ON detalles_aditiva_deductiva FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar detalles_aditiva_deductiva" ON detalles_aditiva_deductiva;
CREATE POLICY "Usuarios autenticados pueden actualizar detalles_aditiva_deductiva"
  ON detalles_aditiva_deductiva FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar detalles_aditiva_deductiva" ON detalles_aditiva_deductiva;
CREATE POLICY "Usuarios autenticados pueden eliminar detalles_aditiva_deductiva"
  ON detalles_aditiva_deductiva FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para detalles_extra
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver detalles_extra" ON detalles_extra;
CREATE POLICY "Usuarios autenticados pueden ver detalles_extra"
  ON detalles_extra FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar detalles_extra" ON detalles_extra;
CREATE POLICY "Usuarios autenticados pueden insertar detalles_extra"
  ON detalles_extra FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar detalles_extra" ON detalles_extra;
CREATE POLICY "Usuarios autenticados pueden actualizar detalles_extra"
  ON detalles_extra FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar detalles_extra" ON detalles_extra;
CREATE POLICY "Usuarios autenticados pueden eliminar detalles_extra"
  ON detalles_extra FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para deducciones_extra
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver deducciones_extra" ON deducciones_extra;
CREATE POLICY "Usuarios autenticados pueden ver deducciones_extra"
  ON deducciones_extra FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar deducciones_extra" ON deducciones_extra;
CREATE POLICY "Usuarios autenticados pueden insertar deducciones_extra"
  ON deducciones_extra FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar deducciones_extra" ON deducciones_extra;
CREATE POLICY "Usuarios autenticados pueden actualizar deducciones_extra"
  ON deducciones_extra FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar deducciones_extra" ON deducciones_extra;
CREATE POLICY "Usuarios autenticados pueden eliminar deducciones_extra"
  ON deducciones_extra FOR DELETE
  TO authenticated
  USING (true);

-- Comentarios para documentación
COMMENT ON TABLE cambios_contrato IS 'Registro de cambios al contrato: aditivas, deductivas, extras y deducciones extra';
COMMENT ON TABLE detalles_aditiva_deductiva IS 'Detalle de conceptos modificados en aditivas/deductivas (conceptos del catálogo ordinario)';
COMMENT ON TABLE detalles_extra IS 'Detalle de conceptos extraordinarios (fuera de catálogo ordinario, con plantilla)';
COMMENT ON TABLE deducciones_extra IS 'Deducciones directas al contrato (sin concepto de catálogo, descuentos arbitrarios)';
COMMENT ON FUNCTION get_monto_contrato_actual IS 'Calcula el monto actual del contrato incluyendo cambios aplicados';
COMMENT ON VIEW resumen_cambios_contrato IS 'Vista con resumen de cambios por contrato';
