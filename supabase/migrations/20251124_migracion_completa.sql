-- =====================================================
-- MIGRACIÓN CONSOLIDADA: Sistema Completo de Gestión de Obra
-- Fecha: 2025-11-24
-- Descripción: Migración única que incluye todas las tablas, campos, triggers, RLS y configuraciones
-- =====================================================

-- =====================================================
-- TABLA: contratistas
-- Gestiona información de contratistas y proveedores
-- =====================================================
CREATE TABLE IF NOT EXISTS contratistas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Información básica
  nombre TEXT NOT NULL,
  categoria TEXT,
  partida TEXT,
  
  -- Localización y contacto
  localizacion TEXT,
  telefono TEXT,
  correo_contacto TEXT,
  
  -- Información bancaria
  numero_cuenta_bancaria TEXT,
  banco TEXT,
  nombre_cuenta TEXT,
  
  -- Documentos (7 URLs en Supabase Storage - bucket: documents, folder: contratistas)
  csf_url TEXT,
  cv_url TEXT,
  acta_constitutiva_url TEXT,
  repse_url TEXT,
  ine_url TEXT,
  registro_patronal_url TEXT,
  comprobante_domicilio_url TEXT,
  
  -- Estado y metadata
  active BOOLEAN NOT NULL DEFAULT true,
  notas TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Relaciones
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL,
  created_by UUID REFERENCES perfiles(id) ON DELETE SET NULL
);

-- Índices para contratistas
CREATE INDEX IF NOT EXISTS idx_contratistas_empresa ON contratistas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contratistas_proyecto ON contratistas(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_contratistas_active ON contratistas(active);
CREATE INDEX IF NOT EXISTS idx_contratistas_nombre ON contratistas(nombre);
CREATE INDEX IF NOT EXISTS idx_contratistas_categoria ON contratistas(categoria);

-- =====================================================
-- TABLA: contratos
-- Gestiona contratos con contratistas
-- CONSOLIDADO: tipo_contrato ahora incluye TODOS los tipos (Precio Alzado + Orden de Trabajo + etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Información básica
  numero_contrato TEXT,
  nombre TEXT,
  clave_contrato TEXT,
  descripcion TEXT,
  
  -- CONSOLIDADO: tipo_contrato con 9 opciones (incluye todos los tipos)
  tipo_contrato TEXT CHECK (tipo_contrato IN (
    'PRECIO_ALZADO', 
    'PRECIO_UNITARIO', 
    'ADMINISTRACION', 
    'MIXTO',
    'Orden de Trabajo',
    'Orden de Compra',
    'Llave en Mano',
    'Prestacion de Servicios',
    'Contrato'
  )),
  tratamiento TEXT,
  
  -- Relaciones
  contratista_id UUID NOT NULL REFERENCES contratistas(id) ON DELETE RESTRICT,
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL,
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  
  -- Categorización
  categoria TEXT,
  partida TEXT,
  subpartida TEXT,
  
  -- Montos
  monto_contrato NUMERIC(15, 2) NOT NULL,
  moneda TEXT DEFAULT 'MXN' CHECK (moneda IN ('MXN', 'USD')),
  anticipo_monto NUMERIC(15, 2),
  
  -- Retenciones y penalizaciones
  retencion_porcentaje NUMERIC(5, 2) DEFAULT 0,
  penalizacion_maxima_porcentaje NUMERIC(5, 2) DEFAULT 0,
  penalizacion_por_dia NUMERIC(15, 2) DEFAULT 0,
  
  -- Fechas
  fecha_inicio DATE,
  fecha_fin DATE,
  fecha_fin_real DATE,
  duracion_dias INTEGER,
  
  -- Estado
  estatus TEXT DEFAULT 'BORRADOR' CHECK (estatus IN ('BORRADOR', 'EN_REVISION', 'APROBADO', 'ACTIVO', 'FINALIZADO', 'CANCELADO')),
  porcentaje_avance NUMERIC(5, 2) DEFAULT 0,
  
  -- Documentos (bucket: documents, folder: contratos)
  contrato_pdf_url TEXT,
  documentos_adjuntos TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Pagos y finanzas
  forma_pago TEXT,
  condiciones_pago TEXT,
  
  -- Alcance y especificaciones
  alcance_trabajo TEXT,
  especificaciones_tecnicas TEXT,
  
  -- Metadata y notas
  notas TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Auditoría
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  aprobado_por UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  fecha_aprobacion TIMESTAMPTZ
);

-- Índices para contratos
CREATE INDEX IF NOT EXISTS idx_contratos_contratista ON contratos(contratista_id);
CREATE INDEX IF NOT EXISTS idx_contratos_proyecto ON contratos(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_contratos_empresa ON contratos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contratos_estatus ON contratos(estatus);
CREATE INDEX IF NOT EXISTS idx_contratos_active ON contratos(active);
CREATE INDEX IF NOT EXISTS idx_contratos_numero ON contratos(numero_contrato);
CREATE INDEX IF NOT EXISTS idx_contratos_tipo ON contratos(tipo_contrato);

-- =====================================================
-- TABLA: conceptos_contrato
-- Catálogo de conceptos para cada contrato
-- IMPORTANTE: Incluye catalogo_aprobado para sistema de aprobaciones
-- =====================================================
CREATE TABLE IF NOT EXISTS conceptos_contrato (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Relación
  contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  
  -- Categorización
  partida TEXT NOT NULL,
  subpartida TEXT,
  actividad TEXT,
  clave TEXT NOT NULL,
  
  -- Descripción
  concepto TEXT NOT NULL,
  unidad TEXT NOT NULL, -- m2, m3, pza, kg, etc.
  
  -- CATÁLOGO FIJO (cantidades y precios originales)
  cantidad_catalogo NUMERIC(15, 4) NOT NULL DEFAULT 0,
  precio_unitario_catalogo NUMERIC(15, 4) NOT NULL DEFAULT 0,
  importe_catalogo NUMERIC(15, 2) GENERATED ALWAYS AS (cantidad_catalogo * precio_unitario_catalogo) STORED,
  
  -- ESTIMACIONES VIVAS (cantidades y precios actualizados)
  cantidad_estimada NUMERIC(15, 4) DEFAULT 0,
  precio_unitario_estimacion NUMERIC(15, 4) DEFAULT 0,
  importe_estimado NUMERIC(15, 2) GENERATED ALWAYS AS (cantidad_estimada * precio_unitario_estimacion) STORED,
  
  -- Volumen y monto estimado a la fecha
  volumen_estimado_fecha NUMERIC(15, 4) DEFAULT 0,
  monto_estimado_fecha NUMERIC(15, 2) DEFAULT 0,
  
  -- SISTEMA DE APROBACIÓN DE CATÁLOGO
  catalogo_aprobado BOOLEAN DEFAULT FALSE,
  fecha_aprobacion_catalogo TIMESTAMPTZ,
  aprobado_por UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  
  -- Metadata
  notas TEXT,
  orden INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para conceptos_contrato
CREATE INDEX IF NOT EXISTS idx_conceptos_contrato_contrato ON conceptos_contrato(contrato_id);
CREATE INDEX IF NOT EXISTS idx_conceptos_contrato_partida ON conceptos_contrato(partida);
CREATE INDEX IF NOT EXISTS idx_conceptos_contrato_clave ON conceptos_contrato(clave);
CREATE INDEX IF NOT EXISTS idx_conceptos_contrato_active ON conceptos_contrato(active);
CREATE INDEX IF NOT EXISTS idx_conceptos_contrato_orden ON conceptos_contrato(orden);
CREATE INDEX IF NOT EXISTS idx_conceptos_catalogo_aprobado ON conceptos_contrato(catalogo_aprobado);

-- =====================================================
-- TABLA: requisiciones_pago
-- Requisiciones creadas por contratistas con conceptos del catálogo
-- =====================================================
CREATE TABLE IF NOT EXISTS requisiciones_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Relaciones
  contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  contratista_id UUID REFERENCES contratistas(id) ON DELETE SET NULL,
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL,
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  
  -- Información básica
  numero_requisicion TEXT,
  descripcion_general TEXT,
  periodo_inicio DATE,
  periodo_fin DATE,
  
  -- Montos calculados
  monto_estimado NUMERIC(15, 2) DEFAULT 0,
  amortizacion_anticipo NUMERIC(15, 2) DEFAULT 0,
  retencion_fondo NUMERIC(15, 2) DEFAULT 0,
  otros_descuentos NUMERIC(15, 2) DEFAULT 0,
  monto_neto NUMERIC(15, 2) DEFAULT 0,
  
  -- Estado
  estatus TEXT DEFAULT 'borrador' CHECK (estatus IN ('borrador', 'enviada', 'aprobada', 'rechazada')),
  fecha_envio TIMESTAMPTZ,
  fecha_aprobacion TIMESTAMPTZ,
  
  -- Documentos (bucket: documents, folders: requisiciones/respaldos y requisiciones/facturas)
  respaldo_documental TEXT[] DEFAULT ARRAY[]::TEXT[],
  factura_url TEXT, -- PDF de factura (subido después de enviar requisición)
  
  -- Metadata
  notas TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Auditoría
  created_by UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  aprobado_por UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  rechazado_por UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  motivo_rechazo TEXT
);

-- Índices para requisiciones_pago
CREATE INDEX IF NOT EXISTS idx_requisiciones_contrato ON requisiciones_pago(contrato_id);
CREATE INDEX IF NOT EXISTS idx_requisiciones_contratista ON requisiciones_pago(contratista_id);
CREATE INDEX IF NOT EXISTS idx_requisiciones_proyecto ON requisiciones_pago(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_requisiciones_empresa ON requisiciones_pago(empresa_id);
CREATE INDEX IF NOT EXISTS idx_requisiciones_estatus ON requisiciones_pago(estatus);
CREATE INDEX IF NOT EXISTS idx_requisiciones_numero ON requisiciones_pago(numero_requisicion);
CREATE INDEX IF NOT EXISTS idx_requisiciones_factura ON requisiciones_pago(factura_url) WHERE factura_url IS NOT NULL;

-- =====================================================
-- TABLA: conceptos_requisicion
-- Conceptos incluidos en cada requisición (referencia a conceptos_contrato)
-- =====================================================
CREATE TABLE IF NOT EXISTS conceptos_requisicion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Relaciones
  requisicion_id UUID NOT NULL REFERENCES requisiciones_pago(id) ON DELETE CASCADE,
  concepto_contrato_id UUID NOT NULL REFERENCES conceptos_contrato(id) ON DELETE RESTRICT,
  
  -- Cantidades de esta requisición
  cantidad_requisicion NUMERIC(15, 4) NOT NULL DEFAULT 0,
  precio_unitario NUMERIC(15, 4) NOT NULL DEFAULT 0,
  importe NUMERIC(15, 2) GENERATED ALWAYS AS (cantidad_requisicion * precio_unitario) STORED,
  
  -- Metadata
  notas TEXT,
  orden INTEGER DEFAULT 0
);

-- Índices para conceptos_requisicion
CREATE INDEX IF NOT EXISTS idx_conceptos_req_requisicion ON conceptos_requisicion(requisicion_id);
CREATE INDEX IF NOT EXISTS idx_conceptos_req_concepto ON conceptos_requisicion(concepto_contrato_id);

-- =====================================================
-- TABLA: solicitudes_pago
-- Solicitudes generadas desde requisiciones aprobadas
-- IMPORTANTE: Incluye vobo_gerencia y fecha_pago_esperada
-- =====================================================
CREATE TABLE IF NOT EXISTS solicitudes_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Relaciones
  requisicion_id UUID NOT NULL REFERENCES requisiciones_pago(id) ON DELETE CASCADE,
  contrato_id UUID REFERENCES contratos(id) ON DELETE SET NULL,
  contratista_id UUID REFERENCES contratistas(id) ON DELETE SET NULL,
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL,
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  
  -- Información de solicitud
  numero_solicitud TEXT,
  monto_solicitado NUMERIC(15, 2) NOT NULL,
  fecha_solicitud TIMESTAMPTZ DEFAULT NOW(),
  
  -- FECHA DE PAGO ESPERADA: fecha_solicitud + 15 días → viernes
  fecha_pago_esperada TIMESTAMPTZ,
  
  -- SISTEMA DE VO.BO. DE GERENCIA (requerido para aparecer en Registro de Pagos)
  vobo_gerencia BOOLEAN DEFAULT FALSE,
  vobo_gerencia_fecha TIMESTAMPTZ,
  vobo_gerencia_usuario UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  
  -- Estado del pago
  estatus_pago TEXT DEFAULT 'pendiente' CHECK (estatus_pago IN ('pendiente', 'procesando', 'pagado', 'rechazado')),
  
  -- Metadata
  notas TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Auditoría
  created_by UUID REFERENCES perfiles(id) ON DELETE SET NULL
);

-- Índices para solicitudes_pago
CREATE INDEX IF NOT EXISTS idx_solicitudes_requisicion ON solicitudes_pago(requisicion_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_contrato ON solicitudes_pago(contrato_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_contratista ON solicitudes_pago(contratista_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_proyecto ON solicitudes_pago(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_empresa ON solicitudes_pago(empresa_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estatus ON solicitudes_pago(estatus_pago);
CREATE INDEX IF NOT EXISTS idx_solicitudes_vobo_gerencia ON solicitudes_pago(vobo_gerencia);
CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha_pago_esperada ON solicitudes_pago(fecha_pago_esperada);

-- =====================================================
-- TABLA: pagos
-- Registro de pagos realizados a solicitudes
-- =====================================================
CREATE TABLE IF NOT EXISTS pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Relaciones
  solicitud_id UUID NOT NULL REFERENCES solicitudes_pago(id) ON DELETE CASCADE,
  contrato_id UUID REFERENCES contratos(id) ON DELETE SET NULL,
  contratista_id UUID REFERENCES contratistas(id) ON DELETE SET NULL,
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL,
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  
  -- Información del pago
  monto_pagado NUMERIC(15, 2) NOT NULL,
  fecha_pago DATE NOT NULL,
  metodo_pago TEXT,
  numero_referencia TEXT,
  
  -- Documentos (bucket: documents, folder: pagos)
  comprobante_url TEXT,
  
  -- Metadata
  notas TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Auditoría
  created_by UUID REFERENCES perfiles(id) ON DELETE SET NULL
);

-- Índices para pagos
CREATE INDEX IF NOT EXISTS idx_pagos_solicitud ON pagos(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_pagos_contrato ON pagos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_pagos_contratista ON pagos(contratista_id);
CREATE INDEX IF NOT EXISTS idx_pagos_proyecto ON pagos(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_pagos_empresa ON pagos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON pagos(fecha_pago);

-- =====================================================
-- TRIGGERS: Auto-actualización de updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contratistas_updated_at ON contratistas;
CREATE TRIGGER update_contratistas_updated_at
  BEFORE UPDATE ON contratistas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contratos_updated_at ON contratos;
CREATE TRIGGER update_contratos_updated_at
  BEFORE UPDATE ON contratos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conceptos_contrato_updated_at ON conceptos_contrato;
CREATE TRIGGER update_conceptos_contrato_updated_at
  BEFORE UPDATE ON conceptos_contrato
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_requisiciones_updated_at ON requisiciones_pago;
CREATE TRIGGER update_requisiciones_updated_at
  BEFORE UPDATE ON requisiciones_pago
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_solicitudes_updated_at ON solicitudes_pago;
CREATE TRIGGER update_solicitudes_updated_at
  BEFORE UPDATE ON solicitudes_pago
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pagos_updated_at ON pagos;
CREATE TRIGGER update_pagos_updated_at
  BEFORE UPDATE ON pagos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- SIMPLIFICADO: Authenticated users can do everything
-- =====================================================
ALTER TABLE contratistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE conceptos_contrato ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisiciones_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE conceptos_requisicion ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

-- Políticas simples: Usuarios autenticados pueden hacer todo
-- (El control de permisos se hace en la aplicación)

-- Contratistas
DROP POLICY IF EXISTS "Authenticated users full access" ON contratistas;
CREATE POLICY "Authenticated users full access" ON contratistas
  FOR ALL USING (auth.role() = 'authenticated');

-- Contratos
DROP POLICY IF EXISTS "Authenticated users full access" ON contratos;
CREATE POLICY "Authenticated users full access" ON contratos
  FOR ALL USING (auth.role() = 'authenticated');

-- Conceptos Contrato
DROP POLICY IF EXISTS "Authenticated users full access" ON conceptos_contrato;
CREATE POLICY "Authenticated users full access" ON conceptos_contrato
  FOR ALL USING (auth.role() = 'authenticated');

-- Requisiciones
DROP POLICY IF EXISTS "Authenticated users full access" ON requisiciones_pago;
CREATE POLICY "Authenticated users full access" ON requisiciones_pago
  FOR ALL USING (auth.role() = 'authenticated');

-- Conceptos Requisición
DROP POLICY IF EXISTS "Authenticated users full access" ON conceptos_requisicion;
CREATE POLICY "Authenticated users full access" ON conceptos_requisicion
  FOR ALL USING (auth.role() = 'authenticated');

-- Solicitudes
DROP POLICY IF EXISTS "Authenticated users full access" ON solicitudes_pago;
CREATE POLICY "Authenticated users full access" ON solicitudes_pago
  FOR ALL USING (auth.role() = 'authenticated');

-- Pagos
DROP POLICY IF EXISTS "Authenticated users full access" ON pagos;
CREATE POLICY "Authenticated users full access" ON pagos
  FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- STORAGE: Políticas para bucket 'documents'
-- IMPORTANTE: El bucket debe crearse manualmente en Supabase Dashboard
-- =====================================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- Permitir lectura pública (cualquiera puede descargar)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

-- Permitir subida solo a usuarios autenticados
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
);

-- Permitir actualización solo al usuario que subió el archivo
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents' 
  AND auth.uid() = owner::uuid
);

-- Permitir eliminación solo al usuario que subió el archivo
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' 
  AND auth.uid() = owner::uuid
);

-- =====================================================
-- REALTIME: Habilitar subscripciones en tiempo real
-- =====================================================
DO $$
BEGIN
  -- Contratistas
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE contratistas;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'contratistas ya está en supabase_realtime';
  END;
  
  -- Contratos
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE contratos;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'contratos ya está en supabase_realtime';
  END;
  
  -- Conceptos Contrato
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE conceptos_contrato;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'conceptos_contrato ya está en supabase_realtime';
  END;
  
  -- Requisiciones
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE requisiciones_pago;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'requisiciones_pago ya está en supabase_realtime';
  END;
  
  -- Conceptos Requisición
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE conceptos_requisicion;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'conceptos_requisicion ya está en supabase_realtime';
  END;
  
  -- Solicitudes
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE solicitudes_pago;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'solicitudes_pago ya está en supabase_realtime';
  END;
  
  -- Pagos
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE pagos;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pagos ya está en supabase_realtime';
  END;
END $$;

-- =====================================================
-- COMENTARIOS: Documentación de tablas
-- =====================================================
COMMENT ON TABLE contratistas IS 'Contratistas y proveedores del proyecto con 7 documentos en Storage';
COMMENT ON TABLE contratos IS 'Contratos con contratistas - tipo_contrato consolidado con 9 opciones';
COMMENT ON TABLE conceptos_contrato IS 'Catálogo de conceptos por contrato - incluye sistema de aprobación';
COMMENT ON TABLE requisiciones_pago IS 'Requisiciones creadas por contratistas con conceptos del catálogo';
COMMENT ON TABLE conceptos_requisicion IS 'Conceptos incluidos en cada requisición';
COMMENT ON TABLE solicitudes_pago IS 'Solicitudes de pago generadas desde requisiciones - requiere Vo.Bo. Gerencia';
COMMENT ON TABLE pagos IS 'Registro de pagos realizados a solicitudes';

-- Comentarios de campos clave
COMMENT ON COLUMN contratos.tipo_contrato IS 'Tipo de contrato: PRECIO_ALZADO, PRECIO_UNITARIO, ADMINISTRACION, MIXTO, Orden de Trabajo, Orden de Compra, Llave en Mano, Prestacion de Servicios, Contrato';
COMMENT ON COLUMN contratos.penalizacion_por_dia IS 'Monto de penalización por día de retraso';
COMMENT ON COLUMN contratos.penalizacion_maxima_porcentaje IS 'Porcentaje máximo de penalización sobre monto_contrato';
COMMENT ON COLUMN contratos.retencion_porcentaje IS 'Porcentaje de retención (fondo de garantía)';

COMMENT ON COLUMN conceptos_contrato.catalogo_aprobado IS 'TRUE = catálogo aprobado, contratista NO puede editar';
COMMENT ON COLUMN conceptos_contrato.fecha_aprobacion_catalogo IS 'Fecha en que se aprobó el catálogo';

COMMENT ON COLUMN requisiciones_pago.factura_url IS 'URL del PDF de factura - subido después de enviar requisición';

COMMENT ON COLUMN solicitudes_pago.vobo_gerencia IS 'TRUE = tiene Vo.Bo. de Gerencia - aparece en Registro de Pagos';
COMMENT ON COLUMN solicitudes_pago.fecha_pago_esperada IS 'Fecha esperada de pago: fecha_solicitud + 15 días → viernes';

-- =====================================================
-- DATOS INICIALES (OPCIONAL)
-- Arreglar solicitudes existentes que tienen proyecto_id en NULL
-- =====================================================
UPDATE solicitudes_pago s
SET proyecto_id = r.proyecto_id
FROM requisiciones_pago r
WHERE s.requisicion_id::text = r.id::text
  AND s.proyecto_id IS NULL
  AND r.proyecto_id IS NOT NULL;

-- =====================================================
-- FIN DE MIGRACIÓN CONSOLIDADA
-- =====================================================

-- NOTA: Recuerda crear el bucket 'documents' manualmente en Supabase Dashboard:
-- 1. Ve a Storage en el Dashboard de Supabase
-- 2. Haz clic en "New bucket"
-- 3. Nombre: documents
-- 4. Public bucket: ✓ (activado)
-- 5. Límite de tamaño: 50MB
-- 6. Tipos MIME permitidos: application/pdf, image/jpeg, image/png, image/jpg, etc.
