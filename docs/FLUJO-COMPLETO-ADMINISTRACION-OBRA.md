# Flujo Completo: Administración de Obra - Proyecto Elara

**Documento:** Gestión integral de dineros, contratos, requisiciones y pagos  
**Versión:** 1.0  
**Fecha:** Enero 27, 2026  
**Estado:** Arquitectura Base Documentada

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Flujo de Datos: Presupuesto](#1-flujo-de-datos-presupuesto)
3. [Flujo de Datos: Contratistas](#2-flujo-de-datos-contratistas)
4. [Flujo de Datos: Contratos](#3-flujo-de-datos-contratos)
5. [Flujo de Datos: Requisiciones](#4-flujo-de-datos-requisiciones)
6. [Flujo de Datos: Solicitudes](#5-flujo-de-datos-solicitudes)
7. [Flujo de Datos: Pagos](#6-flujo-de-datos-pagos)
8. [Historial y Auditoría](#auditoría-y-historial)
9. [Problemas Identificados](#problemas-identificados)
10. [Plan de Mejora](#plan-de-mejora)

---

## 🎯 Visión General

La aplicación Elara es un sistema de administración de obra para proyectos inmobiliarios que gestiona:
- El flujo de contratos con contratistas
- La ejecución de trabajos mediante conceptos y cambios (aditivas, deductivas, extraordinarios)
- Las requisiciones de pago semanales
- Las solicitudes de autorización y pagos reales
- El historial completo de cómo se movieron los datos

**Estructura de Seguridad y Replicabilidad:**
- Base de datos centralizada en Supabase con RLS (Row Level Security)
- Sincronización offline usando Dexie (IndexedDB local)
- Auditoría completa con timestamps y user_id en cada operación
- Diseño preparado para replicar para otros proyectos inmobiliarios

---

## 1. Flujo de Datos: PRESUPUESTO

### 📌 Propósito
Establecer las cuentas y volumetría inicial del proyecto para asignar a contratos posteriormente.

### 📊 Tabla: `presupuestos`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `proyecto_id` | UUID | FK a proyectos |
| `categoria` | TEXT | Categoría de partida (ej: OBRA CIVIL) |
| `partida` | TEXT | Partida presupuestaria (ej: EXCAVACIÓN) |
| `subpartida` | TEXT | Subpartida (ej: EXCAVACIÓN A MANO) |
| `concepto_id` | TEXT | ID único del concepto (ej: PRES-001) |
| `unidad` | TEXT | M2, M3, PZA, etc. |
| `volumetria_arranque` | DECIMAL | Volumen inicial estimado |
| `pu_parametrico` | DECIMAL | Precio unitario de referencia |
| `presupuesto_base` | DECIMAL | volumetria_arranque × pu_parametrico |
| `presupuesto_concursado` | DECIMAL | Presupuesto después de licitación |
| `presupuesto_contratado` | DECIMAL | Presupuesto final contratado |
| `presupuesto_ejercido` | DECIMAL | Monto gastado/pagado |
| `created_at` | TIMESTAMPTZ | Auditoría |
| `updated_at` | TIMESTAMPTZ | Auditoría |
| `created_by` | UUID | Usuario que creó |
| `updated_by` | UUID | Usuario que actualizó |

### 🔄 Flujo

1. **Gerencia/Finanzas** dan de alta el presupuesto del proyecto
2. Se crea estructura de cuentas (categoría-partida-subpartida)
3. Se establece volumetría y precios paramétricos iniciales
4. Estas cuentas sirven como **referencias para asignar contratos**

### ✅ Estado Actual
- ✅ Tabla implementada
- ✅ RLS configurado
- ✅ Auditoría en lugar

---

## 2. Flujo de Datos: CONTRATISTAS

### 📌 Propósito
Mantener registro de los contratistas disponibles en el proyecto.

### 📊 Tabla: `contratistas`

| Campo | Descripción |
|-------|-------------|
| `id` | UUID - Identificador único |
| `nombre` | Nombre comercial del contratista |
| `razon_social` | Razón social oficial |
| `rfc` | RFC del contratista |
| `telefono` | Contacto |
| `email` | Email |
| `banco_id` | Banco para transferencias |
| `cuenta_bancaria` | Número de cuenta |
| `categoria` | Categoría de especialidad |
| `activo` | Boolean |

### 🔄 Flujo

1. Se da de alta al contratista en el sistema
2. Se registran datos bancarios y de contacto
3. Se pueden crear múltiples contratos con el mismo contratista

### ✅ Estado Actual
- ✅ Tabla implementada
- ✅ Sin cambios complejos

---

## 3. Flujo de Datos: CONTRATOS

### 📌 Propósito
**NÚCLEO DEL SISTEMA** - Documento que formaliza el trabajo, montos y términos de pago.

### 📊 Tablas Relacionadas

#### Tabla: `contratos` (Header)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `numero_contrato` | TEXT | Folio único (CTR-001, etc.) |
| `contratista_id` | UUID | FK a contratistas |
| `proyecto_id` | UUID | FK a proyectos |
| `tipo_contrato` | ENUM | PRECIO_ALZADO, PRECIO_UNITARIO, ADMINISTRACIÓN, etc. |
| `monto_contrato` | DECIMAL | **Monto neto contratado** |
| `anticipo_monto` | DECIMAL | Monto de anticipo (ej: 30% del contrato) |
| `retencion_porcentaje` | DECIMAL | % de retención (ej: 5% fondo de garantía) |
| `tratamiento` | ENUM | IVA EXENTO, MAS IVA, IVA TASA 0 |
| `catalogo_aprobado` | BOOLEAN | Si el catálogo de conceptos fue aprobado |
| `estatus` | ENUM | BORRADOR, EN_REVISION, APROBADO, ACTIVO, FINALIZADO |
| `fecha_inicio` | DATE | Fecha de inicio de trabajo |
| `fecha_fin` | DATE | Fecha de término |
| `created_at` | TIMESTAMPTZ | Auditoría |
| `updated_at` | TIMESTAMPTZ | Auditoría |

#### Tabla: `conceptos_contrato` (Catálogo Ordinario)

| Campo | Descripción |
|-------|-------------|
| `id` | UUID |
| `contrato_id` | FK a contratos |
| `clave` | Clave única del concepto (ej: CON-001) |
| `concepto` | Descripción del concepto |
| `unidad` | Unidad de medida (M2, M3, PZA, etc.) |
| `cantidad_catalogo` | Cantidad total en el catálogo ordinario |
| `precio_unitario` | Precio por unidad |
| `importe_total` | cantidad × precio_unitario |
| `cantidad_pagada_anterior` | Cantidad pagada en requisiciones anteriores (calculado) |
| `cantidad_disponible` | Cantidad que falta pagar |
| `metadata` | JSON con info adicional |
| `created_at` | Auditoría |
| `updated_at` | Auditoría |

### 🔄 Flujo: CREACIÓN DE CONTRATO

#### Fase 1: Información General
```
1. Se crea contrato con:
   - Número de contrato (CTR-001)
   - Contratista
   - Monto inicial
   - Anticipo (monto y %)
   - Retención (%)
   - Tratamiento de IVA
   - Fechas de inicio/fin

2. Estatus: BORRADOR
3. Se guarda info general
```

#### Fase 2: Carga de Catálogo de Conceptos
```
1. Se cargan conceptos del contrato:
   - Vía CSV/Excel (subida por usuario)
   - Vía entrada manual
   - El contratista puede subir su propio documento

2. Cada concepto tiene:
   - Clave (CON-001, CON-002...)
   - Descripción
   - Unidad de medida
   - Cantidad total en catálogo
   - Precio unitario

3. Validación:
   - ¿La suma de conceptos = monto del contrato?
   - ¿O usamos el monto del contrato como referencia y la suma de conceptos es flexible?
   
4. Estatus: BORRADOR → EN_REVISION (esperando aprobación de catálogo)

5. Se guarda:
   - IMPORTANTE: Guardar monto del contrato EN ESE MOMENTO
   - Porque después puede cambiar por aditivas/deductivas
```

#### Fase 3: Aprobación del Catálogo
```
1. Gerencia/Dirección revisa catálogo
2. Puede:
   - Aprobar tal cual (catalogo_aprobado = true)
   - Rechazar y solicitar cambios
   - Aprobar con observaciones

3. Estatus: EN_REVISION → APROBADO
4. Timestamp de aprobación: catalogo_fecha_aprobacion
5. Usuario que aprobó: catalogo_aprobado_por
```

#### Fase 4: Cambios al Contrato
Una vez aprobado el catálogo, pueden ocurrir cambios...

---

## 3.1 Cambios a Contratos: ADITIVAS, DEDUCTIVAS, EXTRAORDINARIOS

### 📌 Propósito
Registrar modificaciones al contrato y sus conceptos a lo largo de la ejecución.

### 📊 Tablas Relacionadas

#### Tabla: `cambios_contrato` (Header)

| Campo | Descripción |
|-------|-------------|
| `id` | UUID |
| `contrato_id` | FK a contratos |
| `numero_cambio` | Folio único (ADT-001, DED-001, EXT-001) |
| `tipo_cambio` | ADITIVA, DEDUCTIVA, EXTRA, DEDUCCION_EXTRA, RETENCION |
| `monto_cambio` | Monto del cambio (+ o -) |
| `monto_contrato_anterior` | Monto antes del cambio |
| `monto_contrato_nuevo` | Monto después del cambio |
| `estatus` | BORRADOR, EN_REVISION, APROBADO, APLICADO |
| `fecha_cambio` | Cuando ocurre el cambio |
| `fecha_aprobacion` | Cuando se aprueba |
| `fecha_aplicacion` | Cuando entra en vigencia |
| `archivo_plantilla_url` | Documento con cambios |
| `created_at` | Auditoría |

#### Tabla: `detalles_aditiva_deductiva`

**Cuando se modifica un concepto que EXISTE en el catálogo ordinario**

| Campo | Descripción |
|-------|-------------|
| `id` | UUID |
| `cambio_contrato_id` | FK a cambios_contrato |
| `concepto_contrato_id` | FK al concepto original |
| `clave` | Clave del concepto (ej: CON-001) |
| `concepto_descripcion` | Descripción |
| `cantidad_original` | Cantidad en catálogo ordinario |
| `cantidad_modificacion` | Cantidad que se suma/resta |
| `cantidad_nueva` | cantidad_original + cantidad_modificacion |
| `precio_unitario` | Precio unitario (puede cambiar o no) |
| `importe_modificacion` | cantidad_modificacion × precio_unitario |

**Ejemplo:** 
- Concepto CON-001 (Excavación) tenía 100 M3
- Se hace ADITIVA: se suman 50 M3 más
- Ahora la cantidad_nueva = 150 M3

#### Tabla: `detalles_extra`

**Cuando se AGREGAN conceptos que NO existen en el catálogo ordinario**

| Campo | Descripción |
|-------|-------------|
| `id` | UUID |
| `cambio_contrato_id` | FK a cambios_contrato |
| `concepto_clave` | Clave nueva (EXT-001, EXT-002...) |
| `concepto_descripcion` | Descripción del concepto extra |
| `cantidad` | Cantidad |
| `precio_unitario` | Precio |
| `importe` | cantidad × precio_unitario |

**Ejemplo:**
- Se descubre que falta instalar tubería especial
- Se crea CONCEPTO EXTRAORDINARIO: "Tubería especial anticorosiva" con precio propuesto

#### Tabla: `deducciones_extra`

**Cuando se descuentan montos directos sin relación a conceptos**

| Campo | Descripción |
|-------|-------------|
| `id` | UUID |
| `cambio_contrato_id` | FK a cambios_contrato |
| `descripcion` | Razón de la deducción |
| `monto` | Monto a descontar |
| `observaciones` | Por qué se descuenta |

#### Tabla: `retenciones_contrato`

**Retenciones especiales que se aplican y regresan en requisiciones**

| Campo | Descripción |
|-------|-------------|
| `id` | UUID |
| `cambio_contrato_id` | FK a cambios_contrato |
| `descripcion` | Tipo de retención (ej: "Garantía por terminación") |
| `monto` | Monto total de retención |
| `monto_aplicado` | Cantidad ya aplicada en requisiciones |
| `monto_regresado` | Cantidad ya devuelta |
| `monto_disponible` | monto - monto_aplicado + monto_regresado |

### 🔄 Flujo: PROCESAR CAMBIOS

```
1. Se solicita cambio (aditiva/deductiva/extra/deducción/retención)

2. Se registra:
   - Monto del contrato ANTES
   - Detalles específicos según tipo
   - Monto del contrato DESPUÉS

3. Estatus: BORRADOR → EN_REVISION → APROBADO → APLICADO

4. Una vez APLICADO:
   - Los conceptos nuevos/modificados están disponibles en requisiciones
   - Los montos actualizados se usan para cálculos de amortización
   - El historial queda guardado permanentemente
```

---

## 4. Flujo de Datos: REQUISICIONES

### 📌 Propósito
El contratista estima el avance de trabajo semanal y solicita pago por conceptos ejecutados.

### 📊 Tabla: `requisiciones_pago`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `contrato_id` | UUID | FK a contratos |
| `numero` | TEXT | Folio (REQ-001, REQ-002...) |
| `fecha` | DATE | Fecha de la requisición |
| `conceptos` | JSONB | Array de RequisicionConcepto |
| `monto_estimado` | DECIMAL | Suma de importes de conceptos |
| `amortizacion` | DECIMAL | Monto de anticipo a amortizar |
| `retencion` | DECIMAL | Monto a retener (5% fondo de garantía) |
| `retenciones_aplicadas` | DECIMAL | Retenciones de contrato que se aplican |
| `retenciones_regresadas` | DECIMAL | Retenciones que regresan |
| `lleva_iva` | BOOLEAN | Si incluye IVA (16%) |
| `subtotal` | DECIMAL | Subtotal después de descuentos |
| `iva` | DECIMAL | Monto de IVA |
| `total` | DECIMAL | Total final |
| `estado` | ENUM | borrador, enviada, aprobada, pagada |
| `visto_bueno` | BOOLEAN | Si Gerencia dio visto bueno |
| `visto_bueno_por` | UUID | Usuario que dio VB |
| `visto_bueno_fecha` | TIMESTAMPTZ | Timestamp |
| `factura_url` | TEXT | URL de factura PDF |
| `factura_xml_url` | TEXT | URL de factura XML |
| `created_at` | TIMESTAMPTZ | Auditoría |
| `updated_at` | TIMESTAMPTZ | Auditoría |
| `created_by` | UUID | Usuario que creó |

#### Sub-estructura: `RequisicionConcepto` (dentro de JSONB)

```typescript
{
  concepto_contrato_id: string      // ID del concepto en catálogo
  clave: string                      // ej: CON-001
  concepto: string                   // Descripción
  unidad: string                     // M2, M3, PZA
  cantidad_catalogo: number          // Total en catálogo ordinario
  cantidad_pagada_anterior: number   // Ya pagado en requisiciones anteriores
  cantidad_esta_requisicion: number  // Lo que se paga AHORA
  precio_unitario: number            // Precio actual (puede haber cambiado)
  importe: number                    // cantidad_esta_requisicion × precio_unitario
  tipo: string                       // 'CONCEPTO', 'DEDUCCION', 'RETENCION', 'EXTRA', 'ANTICIPO'
  modo_retencion?: string            // 'APLICAR' o 'REGRESAR' (solo para RETENCION)
}
```

### 🔄 Flujo: CREAR Y PROCESAR REQUISICIÓN

#### Paso 1: Contratista estima avance (Semanal)
```
1. Accede a "Crear Requisición"
2. Sistema muestra:
   - Conceptos actualizados del contrato (incluye cambios)
   - Cantidad ya pagada en requisiciones anteriores
   - Cantidad disponible en catálogo
   - Precio unitario actual

3. Contratista ingresa:
   - Cantidad que avanzó de CADA concepto
   - Puede incluir deducciones extra si aplica
   - Puede solicitar aplicación/regreso de retenciones

4. Sistema calcula:
   - Importe = cantidad × precio_unitario
   - Subtotal = suma de importes
   - Amortización de anticipo (% del contrato inicial o monto fijo)
   - Retención = subtotal × % (ej: 5%)
   - Retenciones de contrato: aplicadas/regresadas
   - IVA si aplica
   - Total = subtotal - amortización - retención + IVA

5. Se GUARDA TODO EN LA TABLA:
   - Concepto, cantidad, precio, importe (EN ESE MOMENTO)
   - Amortización (% o monto aplicado)
   - Retención (% y monto)
   - Retenciones especiales
   - IVA (si aplica)
   - Subtotal e IVA (si aplica)
   - Total

6. Estado: BORRADOR

⚠️ CRÍTICO: Guardar TODA la información porque:
   - Después el contrato puede cambiar
   - El precio unitario puede variar
   - % de amortización puede cambiar
   - Queremos el historial de "cómo estaba al momento de pedir pago"
```

#### Paso 2: Contratista sube factura (Opcional inicial)
```
1. Contratista sube:
   - Factura PDF
   - XML de factura (opcional)

2. Se almacenan URLs en:
   - factura_url
   - factura_xml_url

3. Nota: La factura es LA EVIDENCIA del trabajo realizado
   - Se valida que coincida con lo requisitado
```

#### Paso 3: Gerencia da Visto Bueno
```
1. Gerencia/Dirección revisa requisición
2. Valida que el trabajo en la factura corresponde con lo requisitado
3. Si aprueba:
   - visto_bueno = true
   - visto_bueno_por = user_id
   - visto_bueno_fecha = NOW()
   - Estado: ENVIADA → APROBADA
   - Se calcula fecha_pago_estimada (típicamente en 15 días)

4. Si rechaza:
   - Estado: CANCELADA
   - Se libera la cantidad para poder re-requisitar
```

#### Paso 4: Transición a Solicitud
```
1. Una vez aprobada, la requisición pasa a:
   - Tabla: solicitudes_pago
   - Como base para que Finanzas y Desarrolladora autoricen pago
```

---

## 5. Flujo de Datos: SOLICITUDES

### 📌 Propósito
Documento formal de autorización de pago que requiere aprobación de múltiples áreas (Gerencia, Finanzas, Desarrolladora).

### 📊 Tabla: `solicitudes_pago`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `folio` | TEXT | Folio único (SOL-001, SOL-002...) |
| `requisicion_id` | UUID | FK a requisiciones_pago |
| `concepto_ids` | UUID[] | IDs de conceptos incluidos |
| `conceptos_detalle` | JSONB | Array de ConceptoSolicitud |
| `deducciones_extra` | JSONB | Deducciones extra incluidas |
| `lleva_iva` | BOOLEAN | Si incluye IVA |
| `amortizacion_aplicada` | DECIMAL | Anticipo aplicado |
| `retencion_aplicada` | DECIMAL | Retención aplicada |
| `deducciones_extras_total` | DECIMAL | Total de deducciones |
| `subtotal` | DECIMAL | Subtotal |
| `iva` | DECIMAL | IVA |
| `total` | DECIMAL | Total |
| `fecha` | DATE | Fecha de solicitud |
| `estado` | ENUM | pendiente, aprobada, pagada, rechazada |
| **Aprobación Gerencia** | | |
| `vobo_gerencia` | BOOLEAN | Visto bueno de gerencia |
| `vobo_gerencia_por` | UUID | Usuario |
| `vobo_gerencia_fecha` | TIMESTAMPTZ | Timestamp |
| `observaciones_gerencia` | TEXT | Observaciones |
| **Aprobación Desarrolladora** | | |
| `vobo_desarrollador` | BOOLEAN | Visto bueno |
| `vobo_desarrollador_por` | UUID | Usuario |
| `vobo_desarrollador_fecha` | TIMESTAMPTZ | Timestamp |
| `observaciones_desarrollador` | TEXT | Observaciones |
| **Aprobación Finanzas** | | |
| `vobo_finanzas` | BOOLEAN | Visto bueno |
| `vobo_finanzas_por` | UUID | Usuario |
| `vobo_finanzas_fecha` | TIMESTAMPTZ | Timestamp |
| **Pago** | | |
| `monto_pagado` | DECIMAL | Monto pagado |
| `fecha_pago` | DATE | Fecha real de pago |
| `fecha_pago_esperada` | DATE | Fecha estimada |
| `referencia_pago` | TEXT | Número de transferencia |
| `estatus_pago` | ENUM | NO PAGADO, PAGADO, PAGADO PARCIALMENTE |
| `comprobante_pago_url` | TEXT | Comprobante |
| `created_at` | TIMESTAMPTZ | Auditoría |
| `updated_at` | TIMESTAMPTZ | Auditoría |

#### Sub-estructura: `ConceptoSolicitud`

```typescript
{
  concepto_id: string           // ID del concepto
  concepto_clave: string        // ej: CON-001
  concepto_descripcion: string  // Descripción
  cantidad: number              // Cantidad solicitada
  precio_unitario: number       // Precio en requisición
  importe: number               // Importe solicitado
  pagado?: boolean              // Si se pagó
  monto_pagado?: number         // Monto pagado (si es pago parcial)
  fecha_pago?: string           // Fecha de pago
}
```

### 🔄 Flujo: CREAR Y PROCESAR SOLICITUD

#### Paso 1: Crear Solicitud desde Requisición
```
1. Gerencia/Admin selecciona:
   - Requisición(es) aprobada(s)
   - Qué conceptos incluir (puede ser parcial)

2. Sistema crea SOLICITUD:
   - Copia concepto_ids y conceptos_detalle
   - Calcula montos (usa los guardados en requisición)
   - Estado: PENDIENTE
   - Múltiples VoBo vacíos (gerencia, desarrollador, finanzas)

3. Se guarda TODA la información:
   - Conceptos con cantidades y precios (del momento)
   - Montos de descuentos
   - Subtotal, IVA, Total
   - Importante: NO SE RECALCULA, se usa lo guardado en requisición

4. Se envía a proceso de aprobaciones en cascada
```

#### Paso 2: Aprobaciones en Cascada

**Flujo de Aprobaciones:**
```
PENDIENTE 
  ↓
Gerencia revisa y aprueba (vobo_gerencia = true)
  ↓
Desarrolladora revisa y aprueba (vobo_desarrollador = true)
  ↓
Finanzas revisa y aprueba (vobo_finanzas = true)
  ↓
APROBADA → Lista para PAGO
```

**Cada aprobación:**
- Requiere confirmación manual (botón "Aprobar")
- Guarda: user_id, timestamp, observaciones
- Puede añadir observaciones

**Caratula de Pago:**
```
La caratula de pago es un documento que:
1. Muestra los conceptos solicitados
2. Detalla cantidades, precios, importes
3. Muestra amortización, retención, IVA
4. Cuadra el TOTAL
5. Debe ser **FIRMADA** por Finanzas y Desarrolladora

⚠️ IMPORTANTE: 
  - NO se debe recalcular en cada apertura
  - Se debe mostrar exactamente lo guardado
  - Actualmente hay problema: se recalcula diferente cada vez
```

#### Paso 3: Generar Caratula (antes de pagar)
```
1. Sistema genera PDF con:
   - Encabezado del proyecto
   - Número de contrato
   - Contratista
   - Folio de solicitud
   - Fecha
   - Tabla de conceptos (cantidad, precio, importe)
   - Subtotal
   - Descuentos (amortización, retención)
   - Deducciones extra
   - Subtotal después de descuentos
   - IVA (si aplica)
   - TOTAL
   - Espacios para firmas

2. Se imprime y firma por:
   - Finanzas
   - Desarrolladora (Dirección)

3. Se sube escaneado como comprobante
```

---

## 6. Flujo de Datos: PAGOS

### 📌 Propósito
Registrar los pagos reales realizados al contratista y sus detalles.

### 📊 Tabla: `pagos_realizados`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `solicitud_pago_id` | UUID | FK a solicitudes_pago |
| `requisicion_pago_id` | UUID | FK a requisiciones_pago |
| `contrato_id` | UUID | FK a contratos |
| `concepto_contrato_id` | UUID | FK a concepto específico |
| `contratista_id` | UUID | FK a contratista |
| **Información del Concepto** | | |
| `concepto_clave` | TEXT | ej: CON-001 |
| `concepto_descripcion` | TEXT | Descripción |
| `concepto_unidad` | TEXT | Unidad |
| **Cantidades y Montos** | | |
| `cantidad` | DECIMAL | Cantidad pagada |
| `precio_unitario` | DECIMAL | Precio unitario |
| `importe_concepto` | DECIMAL | Importe total |
| **Desglose Financiero** | | |
| `monto_bruto` | DECIMAL | Monto sin descuentos |
| `retencion_porcentaje` | DECIMAL | % de retención |
| `retencion_monto` | DECIMAL | $ de retención |
| `anticipo_porcentaje` | DECIMAL | % de amortización |
| `anticipo_monto` | DECIMAL | $ de amortización |
| `lleva_iva` | BOOLEAN | Si incluye IVA |
| `subtotal` | DECIMAL | Subtotal sin IVA |
| `iva` | DECIMAL | Monto de IVA |
| `monto_neto_pagado` | DECIMAL | Total pagado al contratista |
| **Información de Pago** | | |
| `fecha_pago` | DATE | Fecha real de pago |
| `numero_pago` | TEXT | Número de transferencia |
| `metodo_pago` | ENUM | TRANSFERENCIA, CHEQUE, EFECTIVO, OTRO |
| `referencia_pago` | TEXT | Referencia/folio |
| `comprobante_pago_url` | TEXT | Comprobante de pago |
| `factura_url` | TEXT | Factura PDF |
| `xml_url` | TEXT | Factura XML |
| **Folios Relacionados** | | |
| `folio_solicitud` | TEXT | SOL-001 |
| `folio_requisicion` | TEXT | REQ-001 |
| `numero_contrato` | TEXT | CTR-001 |
| **Control** | | |
| `estatus` | ENUM | PAGADO, REVERTIDO, CANCELADO |
| `pagado_por` | UUID | Usuario que registró pago |
| `aprobado_por` | UUID | Usuario que aprobó |
| `notas` | TEXT | Observaciones |
| `created_at` | TIMESTAMPTZ | Auditoría |
| `updated_at` | TIMESTAMPTZ | Auditoría |

### 🔄 Flujo: PROCESAR PAGO

#### Paso 1: Solicitud Aprobada
```
1. Solicitud tiene todos los VoBo:
   - Gerencia ✓
   - Desarrolladora ✓
   - Finanzas ✓

2. Estado: APROBADA

3. Se imprime caratula (PDF) y se firma
```

#### Paso 2: Contratista sube Facturas y Comprobantes
```
1. Contratista accede a módulo de "Requisiciones"
2. Para cada requisición con pago autorizado:
   - Sube factura PDF (si no la subió antes)
   - Sube XML de factura (opcional)

3. Después de subir factura:
   - Puede subir comprobante de pago
   - Si sube comprobante PARCIAL:
     * Especifica QUÉ CONCEPTOS se pagaron
     * Sistema calcula cuota de pago por concepto
     * El volumen no pagado se libera para futuras requisiciones
   
   - Si sube comprobante COMPLETO:
     * Se entiende que se pagó todo lo solicitado
     * Ya no hay saldo pendiente de esa requisición

4. Se registra en tabla pagos_realizados
```

#### Paso 3: Registrar Pago Individual (Por Concepto)
```
1. Para CADA concepto que se pagó:
   - Se crea fila en pagos_realizados
   - Se guarda:
     * Concepto y su clave
     * Cantidad pagada (puede ser parcial)
     * Precio unitario (del momento de requisición)
     * Importe pagado
     * Retención aplicada (% y $)
     * Amortización aplicada (% y $)
     * IVA (si aplica)
     * Monto neto pagado
     * Fecha de pago real
     * Comprobante de pago
     * Factura

2. IMPORTANTE: Se guardan TODOS estos datos porque:
   - El contrato puede cambiar después
   - Los porcentajes pueden cambiar
   - Queremos saber exactamente qué se pagó en qué momento
   - Para auditoría y estados de cuenta
```

#### Paso 4: Actualizar Requisición/Solicitud
```
1. Una vez registrado pago:
   - requisicion_pago.estado = 'pagada' (o 'pagada_parcialmente')
   - requisicion_pago.estatus_pago = 'PAGADO' (o 'PAGADO PARCIALMENTE')
   
2. Si fue pago PARCIAL:
   - Se libera cantidad no pagada
   - Contratista puede crear nueva requisición con esa cantidad pendiente
```

---

## 🔐 Auditoría y Historial

### 🎯 Propósito
Registrar cómo se movieron los datos, quién hizo qué, cuándo y por qué.

### 📋 Estrategia de Auditoría

Cada tabla tiene:
- `created_at` / `updated_at` - Timestamps
- `created_by` / `updated_by` - IDs de usuarios
- `_dirty` / `_deleted` - Sincronización offline

Además:

#### Tabla: `audit_log` (Propuesta)
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Qué se modificó
  tabla TEXT NOT NULL,           -- ej: 'requisiciones_pago'
  registro_id UUID NOT NULL,     -- ID del registro modificado
  operacion VARCHAR(10),         -- INSERT, UPDATE, DELETE
  
  -- Datos antes/después
  datos_anteriores JSONB,        -- Valores antes del cambio
  datos_nuevos JSONB,            -- Valores después del cambio
  
  -- Quién y cuándo
  usuario_id UUID REFERENCES auth.users(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contexto
  razon TEXT,                    -- Por qué se cambió
  metadata JSONB,                -- Datos adicionales
  
  -- Índices
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_tabla_registro 
  ON audit_log(tabla, registro_id);
CREATE INDEX idx_audit_log_usuario_timestamp 
  ON audit_log(usuario_id, timestamp DESC);
```

### 📊 Datos Críticos a Guardar

En CADA requisición/solicitud/pago guardamos:

1. **Concepto:**
   - Clave, descripción, unidad (estado actual en ese momento)

2. **Cantidades:**
   - Cantidad en catálogo
   - Cantidad pagada anterior
   - Cantidad en esta requisición/solicitud/pago

3. **Precios:**
   - Precio unitario (EN ESE MOMENTO - puede haber cambiado)

4. **Descuentos:**
   - % y $ de amortización (EN ESE MOMENTO)
   - % y $ de retención (EN ESE MOMENTO)
   - Retenciones especiales (aplicadas/regresadas)

5. **IVA:**
   - Si lleva IVA
   - Monto de IVA

6. **Totales:**
   - Subtotal
   - Total

**¿Por qué?**
- Después el contrato puede cambiar (aditiva/deductiva)
- Precio unitario puede variar
- % de amortización puede variar
- Queremos el historial de "cómo estaba al momento de requisitar/pagar"
- Para auditoría, estados de cuenta y resolución de conflictos

---

## ⚠️ Problemas Identificados

### 1. **RECÁLCULO DE CARATULAS**
**Problema:** Cuando se abre una caratula, se recalcula diferente cada vez
- Puede haber cambios en precios, amortización, retención
- El usuario ve números diferentes cuando abre el mismo documento

**Causa:** 
- Los montos se calculan dinámicamente en lugar de estar guardados

**Solución:**
- Guardar todos los montos en tabla solicitudes_pago
- En caratula, NO recalcular, SOLO mostrar lo guardado
- Hacer que sea read-only una vez aprobada

---

### 2. **AMORTIZACIÓN DE ANTICIPO INCONSISTENTE**
**Problema:** 
- Contrato tenía 30% de anticipo
- Se hizo aditiva que cambió el monto
- ¿Cómo se amortiza ahora?

**Causa:**
- No se sabe si la amortización sigue siendo 30% del monto original o del nuevo
- No hay registro de "cómo era al momento de requisitar"

**Solución:**
- Guardar amortización (% y $) EN CADA REQUISICIÓN
- Hacer que sea configurable por cambio de contrato
- Guardar histórico de cambios en amortización

---

### 3. **RETENCIONES DINÁMICAS**
**Problema:**
- Hay retenciones por fondo de garantía (5%)
- Hay retenciones especiales que se aplican y regresan
- Sistema actual no maneja bien las retenciones dinámicas

**Causa:**
- No se distinguen bien retenciones ordinarias de extraordinarias
- No se rastrea aplicación/regreso de retenciones

**Solución:**
- `retencion_porcentaje` = retención ordinaria (fondo de garantía)
- `retencion_monto` = monto calculado
- `retenciones_aplicadas` = retenciones especiales que se aplican
- `retenciones_regresadas` = retenciones especiales que regresan
- Guardar todo en requisición para auditoría

---

### 4. **IVA NO CONSISTENTE**
**Problema:**
- No está claro qué conceptos llevan IVA
- Algunos pueden llevar, otros no
- Cambios sin IVA vs con IVA

**Causa:**
- Campo `tratamiento` en contrato, pero no se usa en requisiciones

**Solución:**
- Campo `lleva_iva` en requisiciones_pago
- Si es true: subtotal × 1.16 = total
- Si es false: subtotal = total
- Guardar en requisición

---

### 5. **PAGO PARCIAL NO BIEN MANEJADO**
**Problema:**
- Si se paga solo ALGUNOS de los conceptos solicitados
- ¿Cómo se actualiza cantidad_pagada_anterior?
- ¿Se libera el resto para futuras requisiciones?

**Causa:**
- Lógica incompleta en actualización de quantities

**Solución:**
- Cuando se registra pago:
  - Si es pago parcial: especificar QUÉ conceptos se pagaron
  - Actualizar cantidad_pagada_anterior solo de esos conceptos
  - Liberar cantidad no pagada para futuras requisiciones
- Tabla pagos_realizados tiene `cantidad` por concepto

---

### 6. **SUPABASE ESTÁ DESORGANIZADO**
**Problema:** 
- Muchas migraciones pequeñas y sin documentación clara
- Difícil entender el estado final del esquema
- RLS no está claro
- Faltan índices en lugares críticos

**Causa:**
- Evolución incremental sin consolidación

**Solución:**
- Crear "SCHEMA CONSOLIDADO" con todas las tablas
- Documentar RLS explícitamente
- Agregar índices estratégicos
- Crear vistas para reportes comunes

---

### 7. **CARATULA DE PAGO INCOMPLETA**
**Problema:**
- Carátula no muestra toda la información necesaria
- Cálculos no coinciden con lo guardado
- Falta info de deducciones extra
- Falta info de retenciones especiales

**Solución:**
- Carátula debe mostrar:
  * Conceptos solicitados (cantidad, precio, importe)
  * Amortización (% y $)
  * Retención ordinaria (% y $)
  * Retenciones especiales (aplicadas/regresadas)
  * Deducciones extra
  * Subtotal
  * IVA (si aplica)
  * TOTAL
  * Firma de Finanzas
  * Firma de Desarrolladora
  * Fecha

---

### 8. **SINCRONIZACIÓN OFFLINE/ONLINE**
**Problema:**
- Dexie usa IndexedDB local
- Datos pueden divergir entre dispositivos
- Sincronización puede perder datos

**Causa:**
- Estrategia de sincronización incompleta
- No hay mecanismo de conflicto resolution bien definido

**Solución:**
- Revisar sync/syncService.ts
- Implementar last-write-wins o merging inteligente
- Guardar metadata de última sincronización
- Tener logs de sync (cuándo, qué, con quién)

---

## 📋 Plan de Mejora

### **Fase 1: Consolidación de Datos** (Semana 1-2)

#### 1.1 Crear Schema Consolidado
- [ ] Consolidar migraciones en 1 archivo maestro
- [ ] Documentar cada tabla y relaciones
- [ ] Validar RLS está bien configurado
- [ ] Agregar índices donde falten

#### 1.2 Auditoría Completa
- [ ] Crear tabla `audit_log`
- [ ] Implementar triggers para log automático
- [ ] Documentar qué se audita y por qué

### **Fase 2: Correcciones Críticas** (Semana 2-3)

#### 2.1 Caratula de Pago
- [ ] NO recalcular, usar datos guardados
- [ ] Mostrar deducciones extra
- [ ] Mostrar retenciones especiales
- [ ] Hacer read-only una vez aprobada

#### 2.2 Pago Parcial
- [ ] Especificar QUÉ conceptos se pagan
- [ ] Actualizar cantidad_pagada_anterior correctamente
- [ ] Liberar cantidad no pagada

#### 2.3 Amortización de Anticipo
- [ ] Guardar % y $ EN CADA REQUISICIÓN
- [ ] Hacerla configurable por cambio
- [ ] Guardar histórico de cambios

### **Fase 3: Mejoras UX** (Semana 3-4)

#### 3.1 Estados de Cuenta
- [ ] Crear vista clara del historial
- [ ] Mostrar cómo se llegó a cada monto
- [ ] Auditoría visible al usuario

#### 3.2 Reportes
- [ ] Reporte de avance por concepto
- [ ] Reporte de pagos por periodo
- [ ] Reporte de cambios a contrato

### **Fase 4: Documentación y Capacitación** (Semana 4)

#### 4.1 Documentación
- [ ] Manual de usuario por rol
- [ ] Guía de procedimientos
- [ ] FAQ troubleshooting

#### 4.2 Capacitación
- [ ] Sesión con Gerencia
- [ ] Sesión con Finanzas
- [ ] Sesión con Dirección

---

## 📊 Anexo: Estructura de Relaciones

```
PROYECTOS
  ├─ PRESUPUESTOS (cuentas)
  │   └─ (categoría-partida-subpartida)
  │
  └─ CONTRATOS
      ├─ CONTRATISTAS
      ├─ CONCEPTOS_CONTRATO (catálogo ordinario)
      │   ├─ cantidad_catalogo
      │   └─ precio_unitario
      │
      └─ CAMBIOS_CONTRATO
          ├─ DETALLES_ADITIVA_DEDUCTIVA (modifican conceptos existentes)
          ├─ DETALLES_EXTRA (nuevos conceptos)
          ├─ DEDUCCIONES_EXTRA (descuentos directos)
          └─ RETENCIONES_CONTRATO (retenciones especiales)
      
      └─ REQUISICIONES_PAGO
          ├─ Copia de conceptos actualizados
          ├─ Cantidad pagada anterior (acumulada)
          ├─ Cantidad esta requisición
          ├─ Precios (EN ESE MOMENTO)
          ├─ Amortización (%, $) EN ESE MOMENTO
          ├─ Retención (%, $) EN ESE MOMENTO
          ├─ Retenciones especiales
          ├─ IVA (si aplica)
          └─ TOTAL guardado
      
      └─ SOLICITUDES_PAGO
          ├─ Referencia a requisiciones aprobadas
          ├─ Conceptos seleccionados
          ├─ Montos copiados de requisición
          ├─ NO recalcular
          └─ APROBACIONES:
              ├─ Gerencia (vobo_gerencia)
              ├─ Desarrolladora (vobo_desarrollador)
              └─ Finanzas (vobo_finanzas)
      
      └─ PAGOS_REALIZADOS
          ├─ Por cada concepto pagado
          ├─ Cantidad pagada
          ├─ Precio unitario (del momento)
          ├─ Amortización (%, $) aplicada
          ├─ Retención (%, $) aplicada
          ├─ IVA aplicado
          └─ Monto neto pagado
```

---

## 🎯 Conclusión

El sistema tiene la estructura base correcta, pero necesita:

1. **Consistencia en Datos:** Guardar montos EN CADA TRANSACCIÓN para auditoría
2. **No Recalcular:** Una vez aprobado, mostrar lo guardado, no recalcular
3. **Historial Completo:** Audit log de todos los cambios
4. **Manejo Correcto de Cambios:** Aditivas/deductivas/extras bien integradas
5. **Sincronización Robusta:** Mecanismo offline/online bien definido

Con estos cambios, el sistema será **auditable, repetible y escalable a otros proyectos**.

