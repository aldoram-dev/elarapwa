# Problemas 7-8 + Resumen Ejecutivo

---

## 🔴 PROBLEMA #7: SUPABASE ESTÁ DESORGANIZADO

### Descripción
Muchas migraciones pequeñas sin consolidación, esquema final poco claro, RLS no documentado, faltan índices críticos.

### Impacto
- 🔶 **MEDIO-ALTO:** Performance lenta con datos grandes
- Difícil mantener y debuggear
- Riesgo de inconsistencias de datos
- Difícil replicar a otros proyectos

### Causa Raíz
Evolución incremental sin documentación ni refactorización.

### Solución Técnica

**Paso 1: Crear Schema Consolidado**

```sql
-- supabase/schema-elara-consolidated.sql
-- Este archivo reemplaza todas las migraciones
-- Aplicar SOLO UNA VEZ al inicializar

-- ============================================
-- TABLAS CORE: PROYECTOS Y USUARIOS
-- ============================================

CREATE TABLE IF NOT EXISTS proyectos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  ubicacion TEXT,
  estado VARCHAR(20) DEFAULT 'ACTIVO',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  active BOOLEAN DEFAULT TRUE
);

-- (... todas las demás tablas con definiciones completas ...)

-- ============================================
-- ÍNDICES CRÍTICOS
-- ============================================

-- Contatos: búsqueda por proyecto y estatus
CREATE INDEX idx_contratos_proyecto_estatus 
  ON contratos(proyecto_id, estatus);

-- Requisiciones: búsqueda por contrato y estado
CREATE INDEX idx_requisiciones_pago_contrato_estado 
  ON requisiciones_pago(contrato_id, estado);

-- Solicitudes: búsqueda por requisición
CREATE INDEX idx_solicitudes_pago_requisicion 
  ON solicitudes_pago(requisicion_id);

-- Pagos: búsqueda por contrato y fecha
CREATE INDEX idx_pagos_realizados_contrato_fecha 
  ON pagos_realizados(contrato_id, fecha_pago DESC);

-- Cambios: historial del contrato
CREATE INDEX idx_cambios_contrato_fecha 
  ON cambios_contrato(contrato_id, fecha_cambio DESC);

-- ============================================
-- TRIGGERS Y VISTAS
-- ============================================

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a todas las tablas
-- ... (for each table) ...

-- Vista: Resumen de contrato con cambios
CREATE OR REPLACE VIEW vw_contrato_con_cambios AS
SELECT 
  c.id,
  c.numero_contrato,
  c.monto_contrato as monto_original,
  COALESCE(c.monto_contrato + COALESCE(SUM(CASE 
    WHEN cc.tipo_cambio IN ('ADITIVA', 'EXTRA') THEN cc.monto_cambio
    WHEN cc.tipo_cambio IN ('DEDUCTIVA', 'DEDUCCION_EXTRA') THEN -cc.monto_cambio
    ELSE 0
  END), 0), c.monto_contrato) as monto_actual,
  COUNT(DISTINCT cc.id) as cantidad_cambios,
  MAX(cc.fecha_cambio) as ultimo_cambio_fecha
FROM contratos c
LEFT JOIN cambios_contrato cc ON c.id = cc.contrato_id AND cc.estatus = 'APLICADO'
WHERE c.active = TRUE
GROUP BY c.id, c.numero_contrato, c.monto_contrato;

-- Vista: Avance por contrato
CREATE OR REPLACE VIEW vw_avance_contrato AS
SELECT 
  c.id as contrato_id,
  c.numero_contrato,
  c.monto_contrato,
  COALESCE(SUM(rp.total), 0) as total_pagado,
  c.monto_contrato - COALESCE(SUM(rp.total), 0) as saldo_pendiente,
  ROUND((COALESCE(SUM(rp.total), 0) / c.monto_contrato * 100)::NUMERIC, 2) as porcentaje_avance
FROM contratos c
LEFT JOIN requisiciones_pago rp ON c.id = rp.contrato_id 
  AND rp.estado IN ('aprobada', 'pagada')
WHERE c.active = TRUE
GROUP BY c.id, c.numero_contrato, c.monto_contrato;

-- ============================================
-- RLS (ROW LEVEL SECURITY) - DOCUMENTADO
-- ============================================

/*
RLS POLICY SUMMARY:
- Todo usuario autenticado puede VER sus datos según rol
- ADMIN ve todo
- DIRECCIÓN ve su proyecto
- FINANZAS ve registros aprobados
- CONTRATISTA ve solo sus requisiciones
*/

-- Habilitar RLS en todas las tablas
ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
-- ... (para todas) ...

-- Políticas por tabla
-- PROYECTOS: Solo usuarios del proyecto
CREATE POLICY "Users can view their projects"
  ON proyectos
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_proyecto_roles WHERE proyecto_id = proyectos.id
    )
    OR auth.jwt() ->> 'role' = 'admin'
  );

-- CONTRATOS: Solo usuarios del proyecto
CREATE POLICY "Users can view contratos in their projects"
  ON contratos
  FOR SELECT
  USING (
    proyecto_id IN (
      SELECT id FROM proyectos WHERE id IN (
        SELECT proyecto_id FROM user_proyecto_roles WHERE user_id = auth.uid()
      )
    )
    OR auth.jwt() ->> 'role' = 'admin'
  );

-- REQUISICIONES: Contratista ve sus, otros ven aprobadas
CREATE POLICY "Users can view requisiciones"
  ON requisiciones_pago
  FOR SELECT
  USING (
    contrato_id IN (
      SELECT id FROM contratos WHERE proyecto_id IN (
        SELECT proyecto_id FROM user_proyecto_roles WHERE user_id = auth.uid()
      )
    )
    OR created_by = auth.uid()  -- Contratista ve las suyas
    OR auth.jwt() ->> 'role' = 'admin'
  );

-- ... más políticas ...
```

**Paso 2: Crear documento de migraciones futuras**

```markdown
# MIGRACIONES FUTURAS

Después del schema consolidado, cada cambio es una migración incremental:

```sql
-- 20260128_nombre_cambio.sql
-- Descripción: Qué se cambió y por qué
-- Dependencias: Requiere schema consolidado

ALTER TABLE requisiciones_pago ADD COLUMN nuevo_campo TEXT;

-- RLS
DROP POLICY IF EXISTS "policy_name" ON tabla;
CREATE POLICY "New policy" ON tabla FOR SELECT ...

-- Índices si aplica
CREATE INDEX idx_nuevo_campo ON requisiciones_pago(nuevo_campo);
```

Reglas:
- Una migración = un cambio conceptual
- Incluir comentarios explicativos
- Incluir índices requeridos
- Incluir cambios de RLS
- Probar en ambiente de desarrollo primero
```

**Paso 3: Documentar RLS en archivo separado**

```markdown
# RLS (Row Level Security) - Política de Acceso

## Rol: ADMIN
- Acceso a TODO
- Sin restricciones de RLS
- Puede ver auditoría completa

## Rol: DIRECCIÓN (Director de Proyecto)
- Acceso a su proyecto
- Puede ver y aprobar requisiciones/solicitudes
- Puede autorizar pagos
- Puede ver auditoría de su proyecto

## Rol: FINANZAS
- Acceso a todas las solicitudes aprobadas
- Puede autorizar pagos
- Puede ver movimientos contables
- RESTRICCIÓN: No ve datos en borrador

## Rol: CONTRATISTA
- Solo ve sus requisiciones y pagos
- No ve requisiciones de otros contratistas
- Puede cargar facturas
- Puede ver su estado de cuenta

## Rol: GERENCIA (PM)
- Acceso a su proyecto
- Puede aprobar requisiciones
- Puede rechazar y devolver
- Puede ver auditoría

## Tabla: PROYECTOS
- SELECT: Si user está en proyecto
- INSERT/UPDATE: Solo ADMIN
- DELETE: Solo ADMIN

## Tabla: CONTRATOS
- SELECT: Si user está en proyecto del contrato
- INSERT/UPDATE: Si es DIRECCIÓN o ADMIN
- DELETE: Solo ADMIN

## Tabla: REQUISICIONES_PAGO
- SELECT: Si user está en proyecto O creó la requisición
- INSERT: Si es CONTRATISTA del contrato
- UPDATE: Si creó la requisición O es DIRECCIÓN (solo ciertos campos)
- DELETE: Si creó la requisición O es ADMIN

## Tabla: SOLICITUDES_PAGO
- SELECT: Si está en proyecto O es FINANZAS O creó
- INSERT/UPDATE: Si es DIRECCIÓN o GERENCIA o ADMIN
- DELETE: Solo ADMIN

## Tabla: PAGOS_REALIZADOS
- SELECT: Si está en proyecto O es FINANZAS
- INSERT/UPDATE: Solo FINANZAS o ADMIN
- DELETE: No se permite (audit trail)

## Tabla: AUDIT_LOG
- SELECT: Si está en proyecto O es ADMIN
- INSERT: Automático por trigger
- UPDATE/DELETE: No permitir
```

### Pasos de Implementación

1. ✅ Crear `schema-elara-consolidated.sql` con toda la estructura
2. ✅ Documentar RLS en archivo separado
3. ✅ Documentar índices y por qué existen
4. ✅ Crear template para futuras migraciones
5. ✅ Limpiar migraciones antiguas (archivar)
6. ✅ Testing: crear ambiente nuevo desde schema consolidado

### Testing
- [ ] Crear proyecto nuevo desde schema consolidado
- [ ] Verificar RLS: contratista no ve otros contratos
- [ ] Verificar índices: queries rápidas
- [ ] Verificar triggers: updated_at se actualiza automáticamente

---

## 🔴 PROBLEMA #8: CARÁTULA DE PAGO INCOMPLETA

### Descripción
La carátula de pago no muestra toda la información requerida para firma, faltan deducciones extra y retenciones especiales.

### Impacto
- ⚠️ **CRÍTICO:** Se firman documentos incompletos
- Conflictos legales con contratistas
- CFDI puede ser rechazado

### Causa Raíz
Carátula se genera dinámicamente sin considerar todos los campos de solicitud_pago.

### Solución Técnica

**Paso 1: Definir estructura completa de carátula**

```typescript
// types/caratura-pago.ts
export interface CaraturaPago {
  // Encabezado
  numero_solicitud: string;        // SOL-001
  folio_proyecto: string;          // Proyecto Elara
  fecha: string;                   // ISO date
  
  // Datos del contrato
  numero_contrato: string;         // CTR-001
  contratista_nombre: string;
  contratista_rfc: string;
  
  // Datos de requisición original
  numero_requisicion: string;      // REQ-001
  
  // Conceptos pagados
  conceptos: ConceptoCaratura[];
  
  // Desglose de montos
  subtotal_conceptos: number;      // Suma de importes de conceptos
  
  // Descuentos
  descuentos: {
    amortizacion: {
      descripcion: string;
      porcentaje: number;
      monto: number;
    };
    retencion_ordinaria: {
      descripcion: string;  // "Fondo de Garantía"
      porcentaje: number;
      monto: number;
    };
    retenciones_especiales: EspecialRetencion[];
    deducciones_extras: DeduccionExtra[];
  };
  
  // Totales
  total_descuentos: number;        // Suma de todos los descuentos
  subtotal_neto: number;           // subtotal_conceptos - total_descuentos
  iva_aplica: boolean;
  iva_tasa: number;                // 16 o 0
  iva_monto: number;
  total_a_pagar: number;           // subtotal_neto + iva
  
  // Aprobaciones y firmas
  aprobaciones: {
    gerencia: {
      aprobada: boolean;
      por: string;
      fecha: string;
    };
    desarrolladora: {
      aprobada: boolean;
      por: string;
      fecha: string;
    };
    finanzas: {
      aprobada: boolean;
      por: string;
      fecha: string;
    };
  };
  
  // Espacios para firma física
  firma_finanzas: string;          // "Nombre\nPuesto\nFecha"
  firma_desarrolladora: string;    // "Nombre\nPuesto\nFecha"
  
  // Nota al pie
  notas: string;
  
  // Control de impresión
  numero_copia: number;            // Copia 1 de 3, etc.
  fecha_impresion: string;
  estado_documento: 'BORRADOR' | 'APROBADO' | 'FIRMADO' | 'PAGADO';
}

export interface ConceptoCaratura {
  clave: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  importe: number;
}

export interface EspecialRetencion {
  descripcion: string;
  tipo: string;
  monto: number;
  modo: 'APLICAR' | 'REGRESAR';
}
```

**Paso 2: Servicio para generar carátula**

```typescript
// services/caraturaPagoService.ts

export async function generarCaraturaPago(solicitud_id: string): Promise<CaraturaPago> {
  // 1. Obtener solicitud con todos sus datos
  const solicitud = await obtenerSolicitud(solicitud_id);
  const requisicion = await obtenerRequisicion(solicitud.requisicion_id);
  const contrato = await obtenerContrato(solicitud.contrato_id);
  const contratista = await obtenerContratista(solicitud.contratista_id);
  
  // 2. Armarse carátula
  const caratura: CaraturaPago = {
    // Encabezado
    numero_solicitud: solicitud.folio,
    folio_proyecto: 'Proyecto Elara',
    fecha: solicitud.fecha,
    
    // Datos
    numero_contrato: contrato.numero_contrato,
    contratista_nombre: contratista.razon_social,
    contratista_rfc: contratista.rfc,
    numero_requisicion: requisicion.numero,
    
    // Conceptos
    conceptos: solicitud.conceptos_detalle.map(c => ({
      clave: c.concepto_clave,
      descripcion: c.concepto_descripcion,
      unidad: c.unidad,
      cantidad: c.cantidad,
      precio_unitario: c.precio_unitario,
      importe: c.importe
    })),
    
    subtotal_conceptos: solicitud.conceptos_detalle.reduce((sum, c) => sum + c.importe, 0),
    
    // Descuentos (COPIADOS DE SOLICITUD, NO RECALCULADOS)
    descuentos: {
      amortizacion: {
        descripcion: 'Amortización de Anticipo',
        porcentaje: solicitud.amortizacion_porcentaje,  // Guardar %
        monto: solicitud.amortizacion_aplicada
      },
      retencion_ordinaria: {
        descripcion: 'Fondo de Garantía',
        porcentaje: 5,  // O el que corresponda
        monto: solicitud.retencion_aplicada
      },
      retenciones_especiales: solicitud.retenciones_especiales || [],
      deducciones_extras: solicitud.deducciones_extra || []
    },
    
    total_descuentos: (solicitud.amortizacion_aplicada || 0) +
                      (solicitud.retencion_aplicada || 0) +
                      (solicitud.retenciones_esp_aplicadas || 0) -
                      (solicitud.retenciones_esp_regresadas || 0) +
                      (solicitud.deducciones_extras_total || 0),
    
    subtotal_neto: solicitud.subtotal,
    
    // IVA (GUARDADO EN SOLICITUD)
    iva_aplica: solicitud.lleva_iva,
    iva_tasa: solicitud.lleva_iva ? 16 : 0,
    iva_monto: solicitud.iva || 0,
    total_a_pagar: solicitud.total,
    
    // Aprobaciones
    aprobaciones: {
      gerencia: {
        aprobada: solicitud.vobo_gerencia,
        por: solicitud.vobo_gerencia_por,
        fecha: solicitud.vobo_gerencia_fecha
      },
      desarrolladora: {
        aprobada: solicitud.vobo_desarrollador,
        por: solicitud.vobo_desarrollador_por,
        fecha: solicitud.vobo_desarrollador_fecha
      },
      finanzas: {
        aprobada: solicitud.vobo_finanzas,
        por: solicitud.vobo_finanzas_por,
        fecha: solicitud.vobo_finanzas_fecha
      }
    },
    
    // Firmas (placeholders)
    firma_finanzas: `${solicitud.vobo_finanzas_por}\n[Firma]\n${solicitud.vobo_finanzas_fecha}`,
    firma_desarrolladora: `${solicitud.vobo_desarrollador_por}\n[Firma]\n${solicitud.vobo_desarrollador_fecha}`,
    
    estado_documento: solicitud.caratura_bloqueada ? 'FIRMADO' : 'APROBADO'
  };
  
  // 3. Guardar referencia en solicitud
  await actualizarSolicitud(solicitud_id, {
    caratura_generada: true,
    caratura_fecha_generacion: new Date().toISOString()
  });
  
  return caratura;
}
```

**Paso 3: Generar PDF**

```typescript
// services/pdfService.ts

import pdfkit from 'pdfkit';

export async function generarPDFCaratura(caratura: CaraturaPago): Promise<Buffer> {
  const doc = new PDFDocument({
    bufferPages: true,
    margin: 40
  });
  
  // Encabezado
  doc.fontSize(18).font('Helvetica-Bold')
    .text('CARÁTULA DE PAGO', { align: 'center' });
  
  doc.fontSize(10).font('Helvetica')
    .text(`Folio: ${caratura.numero_solicitud}`, { align: 'right' })
    .text(`Fecha: ${caratura.fecha}`, { align: 'right' });
  
  // Datos del contrato
  doc.moveDown();
  doc.fontSize(12).font('Helvetica-Bold')
    .text('DATOS DEL CONTRATO');
  doc.fontSize(10).font('Helvetica')
    .text(`Número de Contrato: ${caratura.numero_contrato}`)
    .text(`Contratista: ${caratura.contratista_nombre}`)
    .text(`RFC: ${caratura.contratista_rfc}`)
    .text(`Requisición: ${caratura.numero_requisicion}`);
  
  // Tabla de conceptos
  doc.moveDown();
  doc.fontSize(12).font('Helvetica-Bold')
    .text('CONCEPTOS A PAGAR');
  
  // Tabla header
  const tableTop = doc.y;
  const colWidth = 60;
  const cols = [
    { x: 50, label: 'CLAVE' },
    { x: 150, label: 'DESCRIPCIÓN' },
    { x: 350, label: 'CANTIDAD' },
    { x: 430, label: 'P.U.' },
    { x: 500, label: 'IMPORTE' }
  ];
  
  doc.fontSize(9).font('Helvetica-Bold');
  cols.forEach(col => {
    doc.text(col.label, col.x, tableTop);
  });
  
  // Tabla data
  let y = tableTop + 20;
  doc.fontSize(9).font('Helvetica');
  caratura.conceptos.forEach(concepto => {
    doc.text(concepto.clave, 50, y)
      .text(concepto.descripcion.substring(0, 25), 150, y, { width: 200 })
      .text(concepto.cantidad.toString(), 350, y, { align: 'right' })
      .text(`$${concepto.precio_unitario.toFixed(2)}`, 430, y, { align: 'right' })
      .text(`$${concepto.importe.toFixed(2)}`, 500, y, { align: 'right' });
    y += 20;
  });
  
  // Totales
  doc.moveDown();
  const rightX = 450;
  doc.fontSize(10).font('Helvetica-Bold')
    .text(`Subtotal: $${caratura.subtotal_conceptos.toFixed(2)}`, rightX, doc.y, { align: 'right' });
  
  // Descuentos
  doc.fontSize(9).font('Helvetica');
  if (caratura.descuentos.amortizacion.monto > 0) {
    doc.text(`Amortización (${caratura.descuentos.amortizacion.porcentaje}%): -$${caratura.descuentos.amortizacion.monto.toFixed(2)}`, rightX, doc.y, { align: 'right' });
  }
  if (caratura.descuentos.retencion_ordinaria.monto > 0) {
    doc.text(`${caratura.descuentos.retencion_ordinaria.descripcion}: -$${caratura.descuentos.retencion_ordinaria.monto.toFixed(2)}`, rightX, doc.y, { align: 'right' });
  }
  
  caratura.descuentos.retenciones_especiales.forEach(ret => {
    const signo = ret.modo === 'APLICAR' ? '-' : '+';
    doc.text(`${ret.descripcion}: ${signo}$${ret.monto.toFixed(2)}`, rightX, doc.y, { align: 'right' });
  });
  
  caratura.descuentos.deducciones_extras.forEach(ded => {
    doc.text(`${ded.descripcion}: -$${ded.monto.toFixed(2)}`, rightX, doc.y, { align: 'right' });
  });
  
  // Subtotal neto
  doc.fontSize(10).font('Helvetica-Bold')
    .text(`Subtotal Neto: $${caratura.subtotal_neto.toFixed(2)}`, rightX, doc.y, { align: 'right' });
  
  // IVA
  if (caratura.iva_aplica) {
    doc.fontSize(9).font('Helvetica')
      .text(`IVA (${caratura.iva_tasa}%): $${caratura.iva_monto.toFixed(2)}`, rightX, doc.y, { align: 'right' });
  }
  
  // Total
  doc.fontSize(11).font('Helvetica-Bold')
    .text(`TOTAL A PAGAR: $${caratura.total_a_pagar.toFixed(2)}`, rightX, doc.y, { align: 'right' });
  
  // Firmas
  doc.moveDown(3);
  doc.fontSize(10).font('Helvetica-Bold')
    .text('AUTORIZACIONES Y FIRMAS');
  
  doc.fontSize(9).font('Helvetica')
    .text('Finanzas:                           Desarrolladora:')
    .text('________________________           ________________________')
    .text(`${caratura.vobo_finanzas_por}                    ${caratura.vobo_desarrolladora_por}`)
    .text(`Fecha: ${caratura.vobo_finanzas_fecha}                    Fecha: ${caratura.vobo_desarrolladora_fecha}`);
  
  // Generar buffer
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}
```

**Paso 4: Almacenar PDF en Supabase**

```typescript
// services/caraturaPagoService.ts

export async function guardarCaraturaPDF(solicitud_id: string): Promise<string> {
  // Obtener carátula
  const caratura = await generarCaraturaPago(solicitud_id);
  
  // Generar PDF
  const pdfBuffer = await generarPDFCaratura(caratura);
  
  // Subir a Supabase Storage
  const fileName = `caratura-${solicitud_id}-${Date.now()}.pdf`;
  const path = `caratur-pagos/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('documentos')
    .upload(path, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false
    });
  
  if (error) throw error;
  
  // Obtener URL pública
  const { data: urlData } = supabase.storage
    .from('documentos')
    .getPublicUrl(path);
  
  // Guardar URL en solicitud
  await actualizarSolicitud(solicitud_id, {
    caratura_url: urlData.publicUrl,
    caratura_generada: true,
    caratura_bloqueada: true  // No se puede recalcular después
  });
  
  return urlData.publicUrl;
}
```

### Pasos de Implementación

1. ✅ Definir tipo CaraturaPago
2. ✅ Crear servicio de generación
3. ✅ Crear generador de PDF
4. ✅ Implementar almacenamiento en Supabase
5. ✅ Agregar botón "Descargar Carátula"
6. ✅ Testing

### Testing
- [ ] Generar carátula, verificar que muestra todos los conceptos
- [ ] Verificar descuentos, deducciones, retenciones
- [ ] PDF se genera correctamente
- [ ] PDF se puede descargar
- [ ] Intentar cambiar concepto después de generar → error

---

## 📊 RESUMEN EJECUTIVO

### Estado Actual
Tu aplicación Elara tiene:
- ✅ Arquitectura sólida con Supabase + Dexie offline
- ✅ Tipos TypeScript bien definidos
- ✅ Tablas de base de datos con relaciones
- ❌ **8 problemas críticos** que generan inconsistencias

### Problemas Principales (Por Impacto)

| # | Problema | Impacto | Esfuerzo |
|---|----------|---------|----------|
| 1 | Carátula se recalcula diferente | 🔴 CRÍTICO | 2-3 días |
| 2 | Amortización inconsistente | 🔴 CRÍTICO | 2-3 días |
| 3 | Retenciones especiales | 🔴 CRÍTICO | 3-4 días |
| 4 | Pago parcial no manejado | 🔴 CRÍTICO | 2-3 días |
| 5 | IVA no consistente | 🟡 ALTO | 1-2 días |
| 6 | Sincronización offline | 🟡 ALTO | 3-4 días |
| 7 | Supabase desorganizado | 🟡 MEDIO | 3-4 días |
| 8 | Carátula incompleta | 🔴 CRÍTICO | 2-3 días |

**Total Estimado: 6-8 semanas**

### Recomendación

1. **Semana 1-2:** Fijar datos en tablas (No recalcular)
   - Guardar montos en requisiciones/solicitudes
   - Guardar amortización por requisición
   - Guardar IVA por requisición

2. **Semana 2-3:** Manejar cambios
   - Retenciones especiales
   - Aditivas/deductivas que afecten amortización
   - Deducciones extra

3. **Semana 3-4:** Pagos
   - Registrar pagos parciales correctamente
   - Liberar cantidad no pagada
   - Carátula completa y no recalculable

4. **Semana 4-5:** Infraestructura
   - Schema consolidado en Supabase
   - RLS bien documentado
   - Índices optimizados

5. **Semana 5-6:** Sincronización
   - Mecanismo de conflicto offline/online
   - Logs de sincronización
   - Testing offline

6. **Semana 6-8:** Documentación y Testing
   - Manual de usuario
   - Capacitación de equipos
   - Testing exhaustivo

### Quick Wins (Puedes hacer HOY)

1. **Detener recálculos de carátula:** Solo usar datos guardados en solicitud
2. **Guardar amortización por requisición:** Agregar campos a tabla
3. **Crear audit_log:** Registrar quién cambió qué y cuándo
4. **Documentar RLS:** Clarificar qué puede ver cada rol

### Siguiente Paso

Recomienda empezar por **Problema #1 (Carátula se recalcula)** porque:
- Es el más crítico
- Es el más visible para usuarios
- Es relativamente rápido de fijar
- Tendrá impacto inmediato en precisión

