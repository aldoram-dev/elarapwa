-- Migración: Crear tabla de presupuestos
-- Fecha: 2025-12-22
-- Descripción: Tabla para gestionar presupuestos de obra con volumetría de arranque

-- Crear tabla de presupuestos
CREATE TABLE IF NOT EXISTS presupuestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Información del catálogo (usando catálogo de obra)
  categoria TEXT NOT NULL,
  partida TEXT NOT NULL,
  subpartida TEXT NOT NULL,
  ubicacion TEXT,
  concepto_id TEXT NOT NULL, -- ID único del concepto (ej: PRES-001)
  
  -- Unidad de medida
  unidad TEXT NOT NULL, -- M2, M3, PZA, etc.
  
  -- Volumetría y precios
  volumetria_arranque DECIMAL(15,4) NOT NULL DEFAULT 0,
  pu_parametrico DECIMAL(15,2) NOT NULL DEFAULT 0,
  presupuesto_base DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Presupuestos calculados/capturados
  presupuesto_concursado DECIMAL(15,2) DEFAULT 0,
  presupuesto_contratado DECIMAL(15,2) DEFAULT 0,
  presupuesto_ejercido DECIMAL(15,2) DEFAULT 0,
  
  -- Relación con proyecto
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE,
  
  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Control de versiones
  version INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT TRUE
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_presupuestos_proyecto_id ON presupuestos(proyecto_id);
CREATE INDEX idx_presupuestos_categoria ON presupuestos(categoria);
CREATE INDEX idx_presupuestos_partida ON presupuestos(partida);
CREATE INDEX idx_presupuestos_subpartida ON presupuestos(subpartida);
CREATE INDEX idx_presupuestos_concepto_id ON presupuestos(concepto_id);
CREATE INDEX idx_presupuestos_active ON presupuestos(active);
CREATE INDEX idx_presupuestos_created_at ON presupuestos(created_at DESC);

-- Índice compuesto para búsquedas por proyecto y categoría
CREATE INDEX idx_presupuestos_proyecto_categoria ON presupuestos(proyecto_id, categoria, partida, subpartida);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_presupuestos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_presupuestos_updated_at
  BEFORE UPDATE ON presupuestos
  FOR EACH ROW
  EXECUTE FUNCTION update_presupuestos_updated_at();

-- Políticas RLS (Row Level Security)
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios autenticados pueden ver presupuestos
CREATE POLICY "Users can view presupuestos"
  ON presupuestos
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Política: Usuarios autenticados pueden insertar presupuestos
-- (Los permisos de rol se controlarán desde la aplicación)
CREATE POLICY "Authenticated users can insert presupuestos"
  ON presupuestos
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política: Usuarios autenticados pueden actualizar presupuestos
CREATE POLICY "Authenticated users can update presupuestos"
  ON presupuestos
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Política: Usuarios autenticados pueden eliminar presupuestos
CREATE POLICY "Authenticated users can delete presupuestos"
  ON presupuestos
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Comentarios para documentación
COMMENT ON TABLE presupuestos IS 'Tabla de presupuestos de obra con volumetría de arranque y control de costos';
COMMENT ON COLUMN presupuestos.volumetria_arranque IS 'Cantidad o volumen inicial del concepto';
COMMENT ON COLUMN presupuestos.pu_parametrico IS 'Precio unitario paramétrico de referencia';
COMMENT ON COLUMN presupuestos.presupuesto_base IS 'Volumetría x P.U. Paramétrico (presupuesto inicial)';
COMMENT ON COLUMN presupuestos.presupuesto_concursado IS 'Presupuesto resultante del concurso/licitación';
COMMENT ON COLUMN presupuestos.presupuesto_contratado IS 'Presupuesto final contratado';
COMMENT ON COLUMN presupuestos.presupuesto_ejercido IS 'Monto ejercido/gastado del presupuesto';

-- Vista para resumen de presupuestos por cuenta
CREATE OR REPLACE VIEW vw_resumen_presupuestos AS
SELECT 
  p.proyecto_id,
  p.categoria,
  p.partida,
  p.subpartida,
  COUNT(*) as total_conceptos,
  SUM(p.presupuesto_base) as presupuesto_base_total,
  SUM(p.presupuesto_concursado) as presupuesto_concursado_total,
  SUM(p.presupuesto_contratado) as presupuesto_contratado_total,
  SUM(
    CASE 
      WHEN p.presupuesto_contratado > 0 THEN p.presupuesto_contratado 
      ELSE p.presupuesto_base 
    END
  ) as presupuesto_real_total,
  SUM(p.presupuesto_ejercido) as presupuesto_ejercido_total,
  SUM(
    CASE 
      WHEN p.presupuesto_contratado > 0 THEN p.presupuesto_contratado 
      ELSE p.presupuesto_base 
    END - p.presupuesto_ejercido
  ) as faltante_por_pagar_total
FROM presupuestos p
WHERE p.active = TRUE
GROUP BY p.proyecto_id, p.categoria, p.partida, p.subpartida;

COMMENT ON VIEW vw_resumen_presupuestos IS 'Vista resumen de presupuestos agrupados por cuenta (categoría-partida-subpartida)';
