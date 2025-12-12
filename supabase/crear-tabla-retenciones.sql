-- ============================================
-- SCRIPT PARA AGREGAR RETENCIONES DE CONTRATO
-- Sistema de Retenciones que se aplican y regresan en requisiciones
-- ============================================

-- 1. Crear tabla retenciones_contrato
CREATE TABLE IF NOT EXISTS retenciones_contrato (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Relaciones
  cambio_contrato_id UUID NOT NULL REFERENCES cambios_contrato(id) ON DELETE CASCADE,
  
  -- Datos de la retención
  descripcion TEXT NOT NULL,
  monto NUMERIC(15, 2) NOT NULL CHECK (monto >= 0), -- Monto total de la retención
  monto_aplicado NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (monto_aplicado >= 0), -- Monto ya aplicado (restado) en requisiciones
  monto_regresado NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (monto_regresado >= 0), -- Monto ya regresado (sumado) en requisiciones
  monto_disponible NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (monto_disponible >= 0), -- Monto disponible para aplicar
  
  -- Metadata
  observaciones TEXT,
  active BOOLEAN DEFAULT TRUE,
  
  -- Constraints
  CONSTRAINT retenciones_monto_aplicado_valido CHECK (monto_aplicado <= monto),
  CONSTRAINT retenciones_monto_regresado_valido CHECK (monto_regresado <= monto_aplicado),
  CONSTRAINT retenciones_disponible_valido CHECK (monto_disponible = (monto - monto_aplicado + monto_regresado))
);

-- 2. Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_retenciones_contrato_cambio ON retenciones_contrato(cambio_contrato_id);
CREATE INDEX IF NOT EXISTS idx_retenciones_contrato_active ON retenciones_contrato(active);
CREATE INDEX IF NOT EXISTS idx_retenciones_contrato_disponible ON retenciones_contrato(monto_disponible) WHERE monto_disponible > 0;

-- 3. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_retenciones_contrato_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_retenciones_contrato_updated_at
  BEFORE UPDATE ON retenciones_contrato
  FOR EACH ROW
  EXECUTE FUNCTION update_retenciones_contrato_updated_at();

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE retenciones_contrato ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de seguridad (RLS Policies)
-- Política permisiva: permitir todas las operaciones para usuarios autenticados
-- (Las validaciones de permisos se manejan en la capa de aplicación)
CREATE POLICY "Permitir todo a usuarios autenticados"
  ON retenciones_contrato
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 6. Comentarios de la tabla y campos
COMMENT ON TABLE retenciones_contrato IS 'Retenciones de contrato que se aplican (restan) y regresan (suman) en requisiciones';
COMMENT ON COLUMN retenciones_contrato.monto IS 'Monto total disponible de la retención';
COMMENT ON COLUMN retenciones_contrato.monto_aplicado IS 'Monto ya aplicado (restado) en requisiciones';
COMMENT ON COLUMN retenciones_contrato.monto_regresado IS 'Monto ya regresado (sumado) en requisiciones';
COMMENT ON COLUMN retenciones_contrato.monto_disponible IS 'Monto disponible = monto - monto_aplicado + monto_regresado';

-- 7. Función para actualizar monto_disponible automáticamente
CREATE OR REPLACE FUNCTION calcular_monto_disponible_retencion()
RETURNS TRIGGER AS $$
BEGIN
  NEW.monto_disponible := NEW.monto - NEW.monto_aplicado + NEW.monto_regresado;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_monto_disponible
  BEFORE INSERT OR UPDATE ON retenciones_contrato
  FOR EACH ROW
  EXECUTE FUNCTION calcular_monto_disponible_retencion();

-- ============================================
-- VERIFICACIÓN Y MENSAJES
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Tabla retenciones_contrato creada exitosamente';
  RAISE NOTICE '✅ Índices creados';
  RAISE NOTICE '✅ Triggers configurados';
  RAISE NOTICE '✅ RLS habilitado con políticas';
  RAISE NOTICE '';
  RAISE NOTICE '📋 SIGUIENTE PASO:';
  RAISE NOTICE '   Actualizar el tipo TipoCambioContrato para incluir RETENCION';
  RAISE NOTICE '   en la aplicación y en cualquier constraint de tipo_cambio';
END $$;

-- 8. Verificar que no existan constraints en cambios_contrato que limiten tipo_cambio
-- Si existe un constraint de tipo_cambio, hay que actualizarlo:
DO $$
BEGIN
  -- Intentar eliminar el constraint anterior si existe
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'cambios_contrato' 
      AND constraint_name LIKE '%tipo_cambio%'
  ) THEN
    EXECUTE 'ALTER TABLE cambios_contrato DROP CONSTRAINT IF EXISTS cambios_contrato_tipo_cambio_check';
    RAISE NOTICE '✅ Constraint anterior eliminado';
  END IF;
  
  -- Agregar nuevo constraint con RETENCION incluida
  ALTER TABLE cambios_contrato 
    ADD CONSTRAINT cambios_contrato_tipo_cambio_check 
    CHECK (tipo_cambio IN ('ADITIVA', 'DEDUCTIVA', 'EXTRA', 'DEDUCCION_EXTRA', 'RETENCION'));
  
  RAISE NOTICE '✅ Constraint actualizado para incluir RETENCION';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ No se pudo actualizar el constraint. Verifica manualmente si existe.';
END $$;
