-- =====================================================
-- Migración: Agregar campo modo_retencion a conceptos
-- Fecha: 2025-12-12
-- Descripción: El campo modo_retencion se almacena dentro
-- del JSONB de conceptos en requisiciones_pago.
-- No requiere modificación de schema porque ya es JSONB.
-- =====================================================

-- NOTA IMPORTANTE:
-- El campo 'conceptos' en requisiciones_pago es JSONB,
-- por lo que modo_retencion se guarda automáticamente como
-- parte de cada concepto sin necesidad de ALTER TABLE.

-- Esta migración solo documenta el cambio y puede incluir
-- un trigger o función si se necesita validación en el futuro.

-- Verificar que la tabla existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'requisiciones_pago') THEN
    RAISE EXCEPTION 'La tabla requisiciones_pago no existe';
  END IF;
END $$;

-- Agregar comentario para documentar el nuevo campo
COMMENT ON COLUMN requisiciones_pago.conceptos IS 
'Array JSONB de conceptos. Cada concepto puede incluir:
- tipo: "CONCEPTO" | "DEDUCCION" | "RETENCION" | "EXTRA"
- modo_retencion: "APLICAR" | "REGRESAR" (solo para tipo=RETENCION)
- APLICAR: resta del total (aplicar retención)
- REGRESAR: suma al total (devolver retención aplicada)';

-- Verificación: Mostrar estructura actual
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'requisiciones_pago' 
  AND column_name = 'conceptos';

-- Mensaje de éxito
DO $$ 
BEGIN
  RAISE NOTICE '✅ Migración completada: El campo modo_retencion se puede usar en conceptos JSONB';
  RAISE NOTICE '📋 Estructura de concepto con retención:';
  RAISE NOTICE '   {';
  RAISE NOTICE '     "tipo": "RETENCION",';
  RAISE NOTICE '     "modo_retencion": "APLICAR" | "REGRESAR",';
  RAISE NOTICE '     "clave": "RET-001",';
  RAISE NOTICE '     "concepto": "Retención de garantía",';
  RAISE NOTICE '     "importe": -1000 (negativo para APLICAR, positivo para REGRESAR)';
  RAISE NOTICE '   }';
END $$;
