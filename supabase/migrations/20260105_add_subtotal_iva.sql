-- Migración: Agregar campos subtotal e iva a tablas financieras
-- Fecha: 2026-01-05
-- Descripción: Guardar valores calculados de subtotal e IVA para mantener historial preciso
--              independiente de cambios futuros en el porcentaje de IVA
--              También se agregan campos de descuentos proporcionales en solicitudes

-- ============================================
-- 1. REQUISICIONES_PAGO
-- ============================================

-- Agregar columnas subtotal e iva
ALTER TABLE requisiciones_pago
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS iva DECIMAL(15,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS retenciones_aplicadas DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS retenciones_regresadas DECIMAL(15,2) DEFAULT 0;

COMMENT ON COLUMN requisiciones_pago.subtotal IS 'Subtotal después de descuentos (amortización, retención) antes de IVA';
COMMENT ON COLUMN requisiciones_pago.iva IS 'Monto de IVA (16%) aplicado al subtotal si lleva_iva = true';
COMMENT ON COLUMN requisiciones_pago.retenciones_aplicadas IS 'Retenciones de contrato aplicadas (se restan del total)';
COMMENT ON COLUMN requisiciones_pago.retenciones_regresadas IS 'Retenciones de contrato regresadas (se suman al total)';

-- Calcular valores para registros existentes
-- Si lleva_iva = true: subtotal = total / 1.16, iva = (total / 1.16) * 0.16
-- Si lleva_iva = false: subtotal = total, iva = 0
UPDATE requisiciones_pago
SET 
  subtotal = CASE 
    WHEN lleva_iva = true THEN ROUND(total / 1.16, 2)
    ELSE total
  END,
  iva = CASE 
    WHEN lleva_iva = true THEN ROUND((total / 1.16) * 0.16, 2)
    ELSE 0
  END
WHERE subtotal = 0 AND iva = 0;

-- ============================================
-- 2. SOLICITUDES_PAGO
-- ============================================

-- Verificar y agregar columnas necesarias
DO $$ 
BEGIN
  -- Agregar columna iva (subtotal ya existe en el schema actual)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'solicitudes_pago' 
    AND column_name = 'iva'
  ) THEN
    ALTER TABLE solicitudes_pago 
    ADD COLUMN iva DECIMAL(15,2) DEFAULT 0 NOT NULL;
    
    COMMENT ON COLUMN solicitudes_pago.iva IS 'Monto de IVA (16%) aplicado al subtotal si lleva_iva = true';
  END IF;
  
  -- Asegurar que subtotal existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'solicitudes_pago' 
    AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE solicitudes_pago 
    ADD COLUMN subtotal DECIMAL(15,2) DEFAULT 0 NOT NULL;
    
    COMMENT ON COLUMN solicitudes_pago.subtotal IS 'Subtotal de conceptos después de deducciones, antes de IVA';
  END IF;
  
  -- 🆕 Agregar campos de descuentos proporcionales
  -- Estos guardan los montos de amortización, retención y otros descuentos
  -- que se aplican a los conceptos de esta solicitud (proporcionalmente)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'solicitudes_pago' 
    AND column_name = 'amortizacion_aplicada'
  ) THEN
    ALTER TABLE solicitudes_pago 
    ADD COLUMN amortizacion_aplicada DECIMAL(15,2) DEFAULT 0;
    
    COMMENT ON COLUMN solicitudes_pago.amortizacion_aplicada IS 'Monto de amortización (anticipo) aplicado proporcionalmente a los conceptos de esta solicitud';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'solicitudes_pago' 
    AND column_name = 'retencion_aplicada'
  ) THEN
    ALTER TABLE solicitudes_pago 
    ADD COLUMN retencion_aplicada DECIMAL(15,2) DEFAULT 0;
    
    COMMENT ON COLUMN solicitudes_pago.retencion_aplicada IS 'Monto de retención (fondo de garantía) aplicado proporcionalmente a los conceptos de esta solicitud';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'solicitudes_pago' 
    AND column_name = 'otros_descuentos_aplicados'
  ) THEN
    ALTER TABLE solicitudes_pago 
    ADD COLUMN otros_descuentos_aplicados DECIMAL(15,2) DEFAULT 0;
    
    COMMENT ON COLUMN solicitudes_pago.otros_descuentos_aplicados IS 'Otros descuentos aplicados proporcionalmente a los conceptos de esta solicitud';
  END IF;
  
  -- 🆕 Agregar campo para guardar deducciones extras totales
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'solicitudes_pago' 
    AND column_name = 'deducciones_extras_total'
  ) THEN
    ALTER TABLE solicitudes_pago 
    ADD COLUMN deducciones_extras_total DECIMAL(15,2) DEFAULT 0;
    
    COMMENT ON COLUMN solicitudes_pago.deducciones_extras_total IS 'Suma total de deducciones extras incluidas en esta solicitud';
  END IF;
END $$;

-- Calcular valores para solicitudes existentes
UPDATE solicitudes_pago
SET 
  subtotal = CASE 
    WHEN lleva_iva = true THEN ROUND(total / 1.16, 2)
    ELSE total
  END,
  iva = CASE 
    WHEN lleva_iva = true THEN ROUND((total / 1.16) * 0.16, 2)
    ELSE 0
  END
WHERE (iva = 0 OR iva IS NULL);

-- ============================================
-- 3. PAGOS_REALIZADOS
-- ============================================

-- Agregar columnas para consistencia
ALTER TABLE pagos_realizados
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS iva DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lleva_iva BOOLEAN DEFAULT false;

COMMENT ON COLUMN pagos_realizados.subtotal IS 'Subtotal del pago antes de IVA';
COMMENT ON COLUMN pagos_realizados.iva IS 'Monto de IVA (16%) incluido en el pago';
COMMENT ON COLUMN pagos_realizados.lleva_iva IS 'Indica si el pago incluye IVA';

-- Calcular valores para pagos existentes basados en la solicitud relacionada
-- Convertir ambos lados a text para evitar conflictos de tipo
UPDATE pagos_realizados pr
SET 
  lleva_iva = COALESCE(
    (SELECT lleva_iva FROM solicitudes_pago WHERE id::text = pr.solicitud_pago_id::text LIMIT 1),
    false
  );

UPDATE pagos_realizados
SET 
  subtotal = CASE 
    WHEN lleva_iva = true THEN ROUND(monto_neto_pagado / 1.16, 2)
    ELSE monto_neto_pagado
  END,
  iva = CASE 
    WHEN lleva_iva = true THEN ROUND((monto_neto_pagado / 1.16) * 0.16, 2)
    ELSE 0
  END
WHERE (subtotal = 0 OR subtotal IS NULL) AND (iva = 0 OR iva IS NULL);

-- ============================================
-- 4. CONSTRAINTS DE VALIDACIÓN (OPCIONAL)
-- ============================================

-- Agregar constraint para validar que subtotal + iva = total en requisiciones
-- Nota: Puede haber pequeñas diferencias por redondeo, por eso usamos ABS y un margen de 0.05
-- También permitimos valores negativos (casos donde solo hay retenciones/deducciones)
ALTER TABLE requisiciones_pago
DROP CONSTRAINT IF EXISTS check_requisiciones_total_matches_subtotal_iva;

ALTER TABLE requisiciones_pago
ADD CONSTRAINT check_requisiciones_total_matches_subtotal_iva
CHECK (
  -- Caso 1: La suma subtotal + iva está dentro del margen de redondeo
  ABS(total - (subtotal + iva)) < 0.05
  -- Caso 2: No lleva IVA, entonces total debe ser igual a subtotal
  OR (lleva_iva = false AND ABS(total - subtotal) < 0.05)
  -- Caso 3: IVA es 0 (puede ser por redondeo o porque no lleva), entonces total = subtotal
  OR (iva = 0 AND ABS(total - subtotal) < 0.05)
);

-- Agregar constraint similar para solicitudes
ALTER TABLE solicitudes_pago
DROP CONSTRAINT IF EXISTS check_solicitudes_total_matches_subtotal_iva;

ALTER TABLE solicitudes_pago
ADD CONSTRAINT check_solicitudes_total_matches_subtotal_iva
CHECK (
  -- Caso 1: La suma subtotal + iva está dentro del margen de redondeo
  ABS(total - (subtotal + iva)) < 0.05
  -- Caso 2: No lleva IVA, entonces total debe ser igual a subtotal
  OR (lleva_iva = false AND ABS(total - subtotal) < 0.05)
  -- Caso 3: IVA es 0, entonces total = subtotal
  OR (iva = 0 AND ABS(total - subtotal) < 0.05)
);

-- ============================================
-- 5. ÍNDICES PARA MEJORAR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_requisiciones_pago_subtotal_iva 
ON requisiciones_pago(subtotal, iva) 
WHERE _deleted = false;

CREATE INDEX IF NOT EXISTS idx_solicitudes_pago_subtotal_iva 
ON solicitudes_pago(subtotal, iva);

CREATE INDEX IF NOT EXISTS idx_solicitudes_pago_descuentos
ON solicitudes_pago(amortizacion_aplicada, retencion_aplicada, otros_descuentos_aplicados);

CREATE INDEX IF NOT EXISTS idx_pagos_realizados_subtotal_iva 
ON pagos_realizados(subtotal, iva) 
WHERE active = true;

-- ============================================
-- 6. VISTA MATERIALIZADA PARA REPORTES (OPCIONAL)
-- ============================================

-- Esta vista consolida información financiera de requisiciones, solicitudes y pagos
-- Útil para reportes y análisis sin necesidad de joins complejos
CREATE OR REPLACE VIEW v_resumen_financiero_completo AS
SELECT 
  r.id as requisicion_id,
  r.numero as requisicion_numero,
  r.fecha as requisicion_fecha,
  r.contrato_id,
  r.monto_estimado,
  r.amortizacion as req_amortizacion,
  r.retencion as req_retencion,
  r.otros_descuentos as req_otros_descuentos,
  r.retenciones_aplicadas,
  r.retenciones_regresadas,
  r.lleva_iva as req_lleva_iva,
  r.subtotal as req_subtotal,
  r.iva as req_iva,
  r.total as req_total,
  r.estado as req_estado,
  r.estatus_pago as req_estatus_pago,
  
  s.id as solicitud_id,
  s.folio as solicitud_folio,
  s.fecha as solicitud_fecha,
  s.subtotal as sol_subtotal,
  s.iva as sol_iva,
  s.total as sol_total,
  s.amortizacion_aplicada as sol_amortizacion,
  s.retencion_aplicada as sol_retencion,
  s.otros_descuentos_aplicados as sol_otros_descuentos,
  s.deducciones_extras_total as sol_deducciones_extras,
  s.monto_pagado as sol_monto_pagado,
  s.estado as sol_estado,
  s.estatus_pago as sol_estatus_pago,
  s.vobo_gerencia,
  s.vobo_desarrollador,
  s.vobo_finanzas,
  
  COUNT(DISTINCT p.id) as cantidad_pagos,
  COALESCE(SUM(p.monto_neto_pagado), 0) as total_pagado,
  COALESCE(SUM(p.subtotal), 0) as pagos_subtotal,
  COALESCE(SUM(p.iva), 0) as pagos_iva,
  COALESCE(SUM(p.retencion_monto), 0) as pagos_retencion,
  COALESCE(SUM(p.anticipo_monto), 0) as pagos_anticipo
  
FROM requisiciones_pago r
LEFT JOIN solicitudes_pago s ON s.requisicion_id::text = r.id::text
LEFT JOIN pagos_realizados p ON p.requisicion_pago_id::text = r.id::text
WHERE r._deleted = false
GROUP BY 
  r.id, r.numero, r.fecha, r.contrato_id, r.monto_estimado,
  r.amortizacion, r.retencion, r.otros_descuentos,
  r.retenciones_aplicadas, r.retenciones_regresadas,
  r.lleva_iva, r.subtotal, r.iva, r.total, r.estado, r.estatus_pago,
  s.id, s.folio, s.fecha, s.subtotal, s.iva, s.total,
  s.amortizacion_aplicada, s.retencion_aplicada, s.otros_descuentos_aplicados,
  s.deducciones_extras_total, s.monto_pagado, s.estado, s.estatus_pago,
  s.vobo_gerencia, s.vobo_desarrollador, s.vobo_finanzas;

COMMENT ON VIEW v_resumen_financiero_completo IS 'Vista consolidada de requisiciones, solicitudes y pagos con todos los montos financieros';

-- ============================================
-- 7. TRIGGER PARA AUTO-CALCULAR (OPCIONAL - COMENTADO)
-- ============================================

-- Este trigger calcularía automáticamente subtotal e iva basándose en total y lleva_iva
-- Se deja comentado porque preferimos que el código del frontend haga el cálculo
-- para tener control explícito de los valores

-- CREATE OR REPLACE FUNCTION calculate_subtotal_iva()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   IF NEW.lleva_iva = true THEN
--     NEW.subtotal := ROUND(NEW.total / 1.16, 2);
--     NEW.iva := ROUND((NEW.total / 1.16) * 0.16, 2);
--   ELSE
--     NEW.subtotal := NEW.total;
--     NEW.iva := 0;
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER trigger_calculate_requisiciones_subtotal_iva
--   BEFORE INSERT OR UPDATE OF total, lleva_iva ON requisiciones_pago
--   FOR EACH ROW
--   EXECUTE FUNCTION calculate_subtotal_iva();

-- CREATE TRIGGER trigger_calculate_solicitudes_subtotal_iva
--   BEFORE INSERT OR UPDATE OF total, lleva_iva ON solicitudes_pago
--   FOR EACH ROW
--   EXECUTE FUNCTION calculate_subtotal_iva();
