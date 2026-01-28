-- ============================================================================
-- MIGRACIÓN: Problema #1 - Congelar Montos de Requisiciones y Solicitudes
-- ============================================================================
-- Fecha: 27 de Enero de 2026
-- Objetivo: Agregar campos para guardar valores calculados permanentemente
--           Los montos se calculan UNA VEZ y NO se recalculan después
-- ============================================================================

-- INSTRUCCIONES:
-- 1. Abrir Supabase Dashboard: https://app.supabase.com/project/_/sql
-- 2. Copiar TODO este archivo
-- 3. Pegar en el editor SQL
-- 4. Ejecutar (RUN)
-- 5. Verificar que aparece "Success" sin errores

BEGIN;

-- ============================================================================
-- PARTE 1: Tabla requisiciones_pago
-- ============================================================================

-- Agregar campos de amortización (anticipo)
ALTER TABLE requisiciones_pago
ADD COLUMN IF NOT EXISTS amortizacion_porcentaje numeric,
ADD COLUMN IF NOT EXISTS amortizacion_base_contrato numeric,
ADD COLUMN IF NOT EXISTS amortizacion_metodo text;

-- Agregar campos de retención ordinaria
ALTER TABLE requisiciones_pago
ADD COLUMN IF NOT EXISTS retencion_ordinaria_porcentaje numeric;

-- Agregar campos de IVA
ALTER TABLE requisiciones_pago
ADD COLUMN IF NOT EXISTS tratamiento_iva text,
ADD COLUMN IF NOT EXISTS iva_porcentaje numeric;

-- Agregar comentarios para documentación
COMMENT ON COLUMN requisiciones_pago.amortizacion_porcentaje IS 'Porcentaje de amortización aplicado al crear la requisición (CONGELADO)';
COMMENT ON COLUMN requisiciones_pago.amortizacion_base_contrato IS 'Monto del contrato usado como base para calcular amortización (CONGELADO)';
COMMENT ON COLUMN requisiciones_pago.amortizacion_metodo IS 'Método usado: PORCENTAJE_CONTRATO, PORCENTAJE_REQUISICION, MONTO_FIJO (CONGELADO)';
COMMENT ON COLUMN requisiciones_pago.retencion_ordinaria_porcentaje IS 'Porcentaje de retención ordinaria (fondo de garantía) aplicado (CONGELADO)';
COMMENT ON COLUMN requisiciones_pago.tratamiento_iva IS 'Tratamiento de IVA copiado del contrato: IVA EXENTO, MAS IVA, IVA TASA 0 (CONGELADO)';
COMMENT ON COLUMN requisiciones_pago.iva_porcentaje IS 'Porcentaje de IVA aplicado (16 o 0) (CONGELADO)';

-- Agregar o modificar restricciones
DO $$ 
BEGIN
    -- Check constraint para amortizacion_metodo
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_amortizacion_metodo'
    ) THEN
        ALTER TABLE requisiciones_pago
        ADD CONSTRAINT check_amortizacion_metodo 
        CHECK (amortizacion_metodo IS NULL OR amortizacion_metodo IN ('PORCENTAJE_CONTRATO', 'PORCENTAJE_REQUISICION', 'MONTO_FIJO'));
    END IF;

    -- Check constraint para tratamiento_iva
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_tratamiento_iva'
    ) THEN
        ALTER TABLE requisiciones_pago
        ADD CONSTRAINT check_tratamiento_iva 
        CHECK (tratamiento_iva IS NULL OR tratamiento_iva IN ('IVA EXENTO', 'MAS IVA', 'IVA TASA 0'));
    END IF;
END $$;

-- ============================================================================
-- PARTE 2: Tabla solicitudes_pago
-- ============================================================================

-- Agregar campos de cálculo congelado
ALTER TABLE solicitudes_pago
ADD COLUMN IF NOT EXISTS subtotal_calculo numeric,
ADD COLUMN IF NOT EXISTS amortizacion_porcentaje numeric,
ADD COLUMN IF NOT EXISTS amortizacion_aplicada numeric,
ADD COLUMN IF NOT EXISTS amortizacion_base_contrato numeric,
ADD COLUMN IF NOT EXISTS amortizacion_metodo text,
ADD COLUMN IF NOT EXISTS retencion_porcentaje numeric,
ADD COLUMN IF NOT EXISTS retencion_ordinaria_aplicada numeric,
ADD COLUMN IF NOT EXISTS retenciones_esp_aplicadas numeric,
ADD COLUMN IF NOT EXISTS retenciones_esp_regresadas numeric,
ADD COLUMN IF NOT EXISTS tratamiento_iva text,
ADD COLUMN IF NOT EXISTS iva_porcentaje numeric;

-- Campos de control de carátula
ALTER TABLE solicitudes_pago
ADD COLUMN IF NOT EXISTS caratura_generada boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS caratura_bloqueada boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fecha_bloqueo_caratura timestamptz;

-- Agregar comentarios
COMMENT ON COLUMN solicitudes_pago.subtotal_calculo IS 'Subtotal copiado de requisición (CONGELADO, NO RECALCULAR)';
COMMENT ON COLUMN solicitudes_pago.amortizacion_porcentaje IS 'Porcentaje de amortización copiado de requisición (CONGELADO)';
COMMENT ON COLUMN solicitudes_pago.amortizacion_aplicada IS 'Monto de amortización copiado de requisición (CONGELADO)';
COMMENT ON COLUMN solicitudes_pago.amortizacion_base_contrato IS 'Base de cálculo de amortización (CONGELADO)';
COMMENT ON COLUMN solicitudes_pago.amortizacion_metodo IS 'Método de amortización usado (CONGELADO)';
COMMENT ON COLUMN solicitudes_pago.retencion_porcentaje IS 'Porcentaje de retención ordinaria (CONGELADO)';
COMMENT ON COLUMN solicitudes_pago.retencion_ordinaria_aplicada IS 'Monto de retención ordinaria (CONGELADO)';
COMMENT ON COLUMN solicitudes_pago.retenciones_esp_aplicadas IS 'Retenciones especiales aplicadas de contrato (CONGELADO)';
COMMENT ON COLUMN solicitudes_pago.retenciones_esp_regresadas IS 'Retenciones especiales regresadas de contrato (CONGELADO)';
COMMENT ON COLUMN solicitudes_pago.tratamiento_iva IS 'Tratamiento de IVA: IVA EXENTO, MAS IVA, IVA TASA 0 (CONGELADO)';
COMMENT ON COLUMN solicitudes_pago.iva_porcentaje IS 'Porcentaje de IVA aplicado (CONGELADO)';
COMMENT ON COLUMN solicitudes_pago.caratura_generada IS 'Indica si ya se generó la carátula (PDF)';
COMMENT ON COLUMN solicitudes_pago.caratura_bloqueada IS 'Indica si la carátula está bloqueada (no permite recalcular)';
COMMENT ON COLUMN solicitudes_pago.fecha_bloqueo_caratura IS 'Fecha en que se bloqueó la carátula';

-- Agregar o modificar restricciones
DO $$ 
BEGIN
    -- Check constraint para amortizacion_metodo_solicitud
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_amortizacion_metodo_solicitud'
    ) THEN
        ALTER TABLE solicitudes_pago
        ADD CONSTRAINT check_amortizacion_metodo_solicitud
        CHECK (amortizacion_metodo IS NULL OR amortizacion_metodo IN ('PORCENTAJE_CONTRATO', 'PORCENTAJE_REQUISICION', 'MONTO_FIJO'));
    END IF;

    -- Check constraint para tratamiento_iva_solicitud
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_tratamiento_iva_solicitud'
    ) THEN
        ALTER TABLE solicitudes_pago
        ADD CONSTRAINT check_tratamiento_iva_solicitud
        CHECK (tratamiento_iva IS NULL OR tratamiento_iva IN ('IVA EXENTO', 'MAS IVA', 'IVA TASA 0'));
    END IF;
END $$;

-- Índices para mejorar consultas de carátulas bloqueadas
CREATE INDEX IF NOT EXISTS idx_solicitudes_caratura_bloqueada ON solicitudes_pago(caratura_bloqueada);
CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha_bloqueo ON solicitudes_pago(fecha_bloqueo_caratura);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que las columnas se crearon correctamente
DO $$ 
DECLARE
    col_count_req integer;
    col_count_sol integer;
BEGIN
    -- Contar columnas nuevas en requisiciones_pago
    SELECT COUNT(*) INTO col_count_req
    FROM information_schema.columns
    WHERE table_name = 'requisiciones_pago'
    AND column_name IN ('amortizacion_porcentaje', 'amortizacion_base_contrato', 'amortizacion_metodo',
                        'retencion_ordinaria_porcentaje', 'tratamiento_iva', 'iva_porcentaje');
    
    -- Contar columnas nuevas en solicitudes_pago
    SELECT COUNT(*) INTO col_count_sol
    FROM information_schema.columns
    WHERE table_name = 'solicitudes_pago'
    AND column_name IN ('subtotal_calculo', 'amortizacion_porcentaje', 'amortizacion_aplicada',
                        'retencion_porcentaje', 'retencion_ordinaria_aplicada', 'retenciones_esp_aplicadas',
                        'retenciones_esp_regresadas', 'tratamiento_iva', 'iva_porcentaje',
                        'caratura_generada', 'caratura_bloqueada', 'fecha_bloqueo_caratura');
    
    RAISE NOTICE '✅ Verificación completada:';
    RAISE NOTICE '   - requisiciones_pago: % columnas agregadas (esperado: 6)', col_count_req;
    RAISE NOTICE '   - solicitudes_pago: % columnas agregadas (esperado: 12)', col_count_sol;
    
    IF col_count_req = 6 AND col_count_sol = 12 THEN
        RAISE NOTICE '🎉 ¡Migración exitosa! Todas las columnas fueron creadas.';
    ELSE
        RAISE WARNING '⚠️  Algunas columnas pueden haber existido previamente. Verificar manualmente.';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
-- Próximos pasos:
-- 1. Verificar que el mensaje "Success" aparece en Supabase
-- 2. Crear una requisición de prueba y verificar que guarda valores congelados
-- 3. Ver logs en navegador: "🔒 Valores congelados guardados en requisición"
-- 4. Crear solicitud desde esa requisición
-- 5. Ver logs: "🔒 Valores COPIADOS de requisición (NO recalculados)"
-- 6. Cambiar precio de un concepto del contrato
-- 7. Abrir requisición/solicitud → Verificar que montos NO cambiaron ✅
-- ============================================================================
