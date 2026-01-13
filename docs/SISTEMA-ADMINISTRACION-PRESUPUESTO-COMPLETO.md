# 📊 Sistema Completo de Administración de Presupuesto y Pagos

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura General](#arquitectura-general)
3. [Modelo de Datos](#modelo-de-datos)
4. [Flujo de Trabajo](#flujo-de-trabajo)
5. [Cálculos Financieros](#cálculos-financieros)
6. [Validaciones y Reglas de Negocio](#validaciones-y-reglas-de-negocio)
7. [Estados y Transiciones](#estados-y-transiciones)
8. [Componentes Principales](#componentes-principales)

---

## 📖 Resumen Ejecutivo

Este sistema gestiona el ciclo completo de administración de presupuestos de construcción, desde la contratación hasta el pago final, incluyendo:

- **Gestión de Contratistas**: Registro con documentación legal y bancaria
- **Contratos**: Diferentes tipos con montos, fechas y condiciones
- **Catálogos de Conceptos**: Sistema de aprobación para conceptos ordinarios
- **Cambios de Contrato**: Aditivas, deductivas, extras, deducciones y retenciones
- **Requisiciones de Pago**: Avances periódicos con conceptos específicos
- **Solicitudes de Pago**: División de requisiciones para aprobación
- **Pagos Realizados**: Registro con comprobantes
- **Estado de Cuenta**: Vista consolidada del avance financiero

---

## 🏗️ Arquitectura General

### Jerarquía de Entidades

```
Proyecto
  └── Contratistas
       └── Contratos
            ├── Conceptos del Contrato (Catálogo Ordinario)
            ├── Cambios de Contrato
            │    ├── Aditivas (modifican cantidad de conceptos existentes)
            │    ├── Deductivas (restan cantidad de conceptos existentes)
            │    ├── Extras (conceptos extraordinarios nuevos)
            │    ├── Deducciones Extra (descuentos directos)
            │    └── Retenciones (montos que se aplican/regresan)
            ├── Requisiciones de Pago
            │    └── Conceptos Requisitados (con volúmenes)
            ├── Solicitudes de Pago
            │    ├── Conceptos de la Solicitud
            │    └── Deducciones Extra
            └── Pagos Realizados
```

### Capas del Sistema

1. **Capa de Datos** (`src/types/`): TypeScript interfaces para todos los modelos
2. **Capa de Persistencia** (`src/db/database.ts`): Dexie.js (IndexedDB) con sincronización a Supabase
3. **Capa de Validación** (`src/lib/validators/`): Reglas de negocio y flujo
4. **Capa de Servicios** (`src/lib/services/`): Lógica de negocio
5. **Capa de Presentación** (`src/components/`, `src/pages/`): React + Material UI

---

## 📊 Modelo de Datos

### 1. Contratista

**Archivo**: `src/types/contratista.ts`

```typescript
interface Contratista {
  id: string
  nombre: string // Razón Social
  localizacion?: string // Dirección Fiscal
  telefono?: string
  correo_contacto?: string
  
  // Información Bancaria
  numero_cuenta_bancaria?: string
  banco?: string
  nombre_cuenta?: string
  
  // Documentos (URLs en Supabase Storage)
  csf_url?: string // Constancia de Situación Fiscal
  cv_url?: string
  acta_constitutiva_url?: string
  repse_url?: string // Registro de Prestadoras de Servicios
  ine_url?: string
  registro_patronal_url?: string
  comprobante_domicilio_url?: string
  
  active: boolean
  created_at: string
  updated_at: string
}
```

**Características**:
- Soporta hasta 7 documentos en Storage
- Validación de campos obligatorios
- Soft delete con campo `active`

---

### 2. Contrato

**Archivo**: `src/types/contrato.ts`

```typescript
type TipoContrato = 
  | 'PRECIO_ALZADO'
  | 'PRECIO_UNITARIO'
  | 'ADMINISTRACION'
  | 'MIXTO'
  | 'Orden de Trabajo'
  | 'Orden de Compra'
  | 'Llave en Mano'
  | 'Prestacion de Servicios'

type EstatusContrato = 
  | 'BORRADOR'
  | 'EN_REVISION'
  | 'APROBADO'
  | 'ACTIVO'
  | 'FINALIZADO'
  | 'CANCELADO'

type TratamientoIVA = 
  | 'IVA EXENTO'     // No lleva IVA
  | 'MAS IVA'        // Lleva IVA adicional (16%)
  | 'IVA TASA 0'     // IVA al 0%

interface Contrato {
  id: string
  numero_contrato?: string
  nombre?: string
  clave_contrato?: string
  descripcion?: string
  tipo_contrato?: TipoContrato
  tratamiento?: TratamientoIVA // 🔑 Determina si lleva IVA
  
  // Relaciones
  contratista_id: string
  empresa_id?: string
  
  // Montos
  monto_contrato: number // Monto Neto Contratado
  anticipo_monto?: number // Monto Neto de Anticipo
  
  // Retenciones y penalizaciones
  retencion_porcentaje?: number // % Retención (ej: 5% fondo de garantía)
  penalizacion_maxima_porcentaje?: number
  penalizacion_por_dia?: number
  
  // Fechas
  fecha_inicio?: string
  fecha_fin?: string
  duracion_dias?: number
  
  // Estado
  estatus?: EstatusContrato
  
  // 🔑 Estado de Catálogo (Punto crítico del flujo)
  catalogo_aprobado?: boolean // DEBE ser true para crear requisiciones
  catalogo_aprobado_por?: string
  catalogo_fecha_aprobacion?: string
  catalogo_observaciones?: string
  
  // Documentos
  contrato_pdf_url?: string
  documentos_adjuntos?: string[]
  
  created_at: string
  updated_at: string
}
```

**Características Clave**:
- **Tratamiento IVA**: Controla si las requisiciones llevan IVA
- **Catálogo Aprobado**: Bloquea creación de requisiciones hasta aprobación
- **Anticipo**: Monto que se amortiza proporcionalmente en requisiciones
- **Retención %**: Se aplica automáticamente a cada requisición

---

### 3. Concepto de Contrato (Catálogo Ordinario)

**Archivo**: `src/types/concepto-contrato.ts`

```typescript
interface ConceptoContrato {
  id: string
  contrato_id: string
  
  // Categorización
  partida: string
  subpartida: string
  actividad: string
  clave: string
  
  // Descripción
  concepto: string
  unidad: string // m2, m3, pza, kg, etc.
  
  // 🔑 Cantidades y precios FIJOS (catálogo original)
  cantidad_catalogo: number // Cantidad original del catálogo
  precio_unitario_catalogo: number
  importe_catalogo: number // cantidad_catalogo * precio_unitario_catalogo
  
  // 🔑 Cantidades y precios VIVOS (estimaciones)
  cantidad_estimada: number
  precio_unitario_estimacion: number
  importe_estimado: number
  
  // Volumen y monto estimado a la fecha
  volumen_estimado_fecha: number
  monto_estimado_fecha: number
  
  // Campos calculados
  cantidad_pagada_anterior?: number // Ya pagado en requisiciones anteriores
  tiene_cambios?: boolean // Si tiene aditivas/deductivas aplicadas
  
  orden: number
  active: boolean
  created_at: string
  updated_at: string
}
```

**Características**:
- **Doble contabilidad**: Valores de catálogo (fijos) vs valores vivos (actualizados)
- **Cantidad pagada anterior**: Se calcula consultando todas las requisiciones previas
- **Cantidad disponible**: `cantidad_catalogo - cantidad_pagada_anterior`

---

### 4. Cambios de Contrato

**Archivo**: `src/types/cambio-contrato.ts`

```typescript
type TipoCambioContrato = 
  | 'ADITIVA'          // Aumenta cantidad de conceptos existentes
  | 'DEDUCTIVA'        // Disminuye cantidad de conceptos existentes
  | 'EXTRA'            // Conceptos nuevos extraordinarios
  | 'DEDUCCION_EXTRA'  // Deducciones directas
  | 'RETENCION'        // Retenciones que se aplican/regresan

type EstatusCambio = 
  | 'BORRADOR' 
  | 'EN_REVISION' 
  | 'APROBADO' 
  | 'RECHAZADO' 
  | 'APLICADO'

interface CambioContrato {
  id: string
  contrato_id: string
  numero_cambio: string // ADT-001, DED-001, EXT-001, etc.
  tipo_cambio: TipoCambioContrato
  descripcion: string
  
  // Montos
  monto_cambio: number // Positivo o negativo según tipo
  monto_contrato_anterior: number
  monto_contrato_nuevo: number
  
  // Fechas
  fecha_cambio: string
  fecha_aprobacion?: string
  fecha_aplicacion?: string
  
  estatus: EstatusCambio
  
  // Documentos
  archivo_plantilla_url?: string // Excel con conceptos extras
  archivo_aprobacion_url?: string
  
  created_at: string
  updated_at: string
}
```

#### 4.1 Detalle de Aditiva/Deductiva

```typescript
interface DetalleAditivaDeductiva {
  id: string
  cambio_contrato_id: string
  concepto_contrato_id: string // Concepto del catálogo ordinario
  
  // Datos originales
  concepto_clave: string
  concepto_descripcion: string
  precio_unitario: number
  
  // 🔑 Cantidades
  cantidad_original: number // Del catálogo
  cantidad_modificacion: number // +/- según sea aditiva/deductiva
  cantidad_nueva: number // original + modificacion
  
  // Importes
  importe_modificacion: number // cantidad_modificacion * precio_unitario
  
  created_at: string
  updated_at: string
}
```

**Lógica**:
- **ADITIVA**: `cantidad_modificacion > 0` → aumenta cantidad disponible
- **DEDUCTIVA**: `cantidad_modificacion < 0` → disminuye cantidad disponible
- Se actualiza `concepto_contrato.cantidad_catalogo` al aplicar

#### 4.2 Detalle de Extra (Extraordinarios)

```typescript
interface DetalleExtra {
  id: string
  cambio_contrato_id: string
  
  // 🔑 Conceptos nuevos (NO están en catálogo ordinario)
  partida?: string
  subpartida?: string
  concepto_clave: string
  concepto_descripcion: string
  concepto_unidad: string
  
  cantidad: number
  precio_unitario: number
  importe: number
  
  created_at: string
  updated_at: string
}
```

**Lógica**:
- Son conceptos completamente nuevos
- NO modifican el catálogo ordinario
- Se pueden requisitar como cualquier otro concepto

#### 4.3 Deducción Extra

```typescript
interface DeduccionExtra {
  id: string
  cambio_contrato_id: string
  descripcion: string
  monto: number // Monto positivo (se convierte a negativo en cambio)
  
  created_at: string
  updated_at: string
}
```

**Lógica**:
- Deducciones directas que NO están ligadas a un concepto
- Se pueden aplicar en solicitudes de pago
- Reducen el monto total a pagar

#### 4.4 Retención de Contrato

```typescript
interface RetencionContrato {
  id: string
  cambio_contrato_id: string
  descripcion: string
  
  // 🔑 Montos
  monto: number // Monto total de la retención
  monto_aplicado: number // Ya retenido en requisiciones
  monto_regresado: number // Ya devuelto en requisiciones
  monto_disponible: number // Calculado: monto - monto_aplicado + monto_regresado
  
  created_at: string
  updated_at: string
}
```

**Lógica Especial**:
- **Aplicar retención**: Se resta del total de la requisición (`modo_retencion: 'APLICAR'`)
- **Regresar retención**: Se suma al total de la requisición (`modo_retencion: 'REGRESAR'`)
- `monto_disponible` se actualiza automáticamente al aplicar/regresar
- Ver documento detallado: `docs/ARQUITECTURA-RETENCIONES.md`

---

### 5. Requisición de Pago

**Archivo**: `src/types/requisicion-pago.ts`

```typescript
interface RequisicionConcepto {
  concepto_contrato_id: string
  clave: string
  concepto: string
  unidad: string
  
  // Cantidades
  cantidad_catalogo: number
  cantidad_pagada_anterior: number // Acumulado de requisiciones previas
  cantidad_esta_requisicion: number // Lo que se paga AHORA
  
  precio_unitario: number
  importe: number // cantidad_esta_requisicion * precio_unitario
  
  // Tipos especiales
  tipo?: 'CONCEPTO' | 'DEDUCCION' | 'RETENCION' | 'EXTRA' | 'ANTICIPO'
  modo_retencion?: 'APLICAR' | 'REGRESAR' // Solo para tipo RETENCION
  es_anticipo?: boolean
}

interface RequisicionPago {
  id: string
  contrato_id: string
  numero: string // REQ-001, REQ-002, etc.
  fecha: string
  
  // Conceptos
  conceptos: RequisicionConcepto[]
  
  // 🔑 Cálculos Financieros
  monto_estimado: number // Suma de importes de conceptos
  amortizacion: number // Anticipo proporcional
  retencion: number // Fondo de garantía (%)
  otros_descuentos: number
  retenciones_aplicadas?: number // Retenciones de contrato aplicadas
  retenciones_regresadas?: number // Retenciones de contrato regresadas
  
  lleva_iva?: boolean // Se hereda del contrato.tratamiento
  subtotal: number // Antes de IVA
  iva: number // 16% si lleva_iva = true
  total: number // subtotal + iva
  
  // Documentación
  descripcion_general?: string
  notas?: string
  respaldo_documental?: string[] // URLs de archivos
  factura_url?: string // 🔑 Factura subida por contratista
  
  // Estado
  estado: 'borrador' | 'enviada' | 'aprobada' | 'pagada' | 'cancelada'
  estatus_pago?: 'NO PAGADO' | 'PAGADO' | 'PAGADO PARCIALMENTE'
  
  // Visto Bueno
  visto_bueno?: boolean
  visto_bueno_por?: string
  visto_bueno_fecha?: string
  fecha_pago_estimada?: string // Se calcula al dar visto bueno
  
  created_at: string
  updated_at: string
}
```

**Fórmulas de Cálculo**:

```typescript
// 1. Monto Estimado (suma de todos los conceptos)
monto_estimado = conceptos.reduce((sum, c) => sum + c.importe, 0)

// 2. Amortización (anticipo proporcional)
// Se calcula sobre el monto del contrato ACTUALIZADO (con extras/aditivas/deductivas)
porcentaje_anticipo = anticipo_monto / monto_contrato_actualizado
amortizacion = monto_estimado * porcentaje_anticipo
// ⚠️ EXCLUIR conceptos tipo ANTICIPO del cálculo

// 3. Retención (fondo de garantía)
retencion = monto_estimado * (contrato.retencion_porcentaje / 100)

// 4. Subtotal (antes de IVA)
subtotal = monto_estimado - amortizacion - retencion - otros_descuentos 
           - retenciones_aplicadas + retenciones_regresadas

// 5. IVA
iva = lleva_iva ? (subtotal * 0.16) : 0

// 6. Total
total = subtotal + iva
```

**Validaciones**:
- No se puede crear si `contrato.catalogo_aprobado == false`
- No se puede exceder `cantidad_catalogo - cantidad_pagada_anterior` por concepto
- El subtotal no puede ser negativo (a menos que solo tenga deducciones)

---

### 6. Solicitud de Pago

**Archivo**: `src/types/solicitud-pago.ts`

```typescript
interface ConceptoSolicitud {
  concepto_id: string
  concepto_clave: string
  concepto_descripcion: string
  cantidad: number
  precio_unitario: number
  importe: number
  
  // Pago individual
  pagado?: boolean
  monto_pagado?: number
  fecha_pago?: string
  comprobante_url?: string
}

interface DeduccionExtraSolicitud {
  deduccion_id: string
  descripcion: string
  monto: number
  observaciones?: string
}

interface SolicitudPago {
  id?: number
  folio: string // SOL-001, SOL-002, etc.
  requisicion_id: string
  
  concepto_ids: string[] // IDs de conceptos a pagar
  conceptos_detalle: ConceptoSolicitud[]
  deducciones_extra?: DeduccionExtraSolicitud[]
  
  // 🔑 Descuentos Proporcionales
  // Se calculan según la proporción de conceptos seleccionados
  amortizacion_aplicada?: number
  retencion_aplicada?: number
  otros_descuentos_aplicados?: number
  deducciones_extras_total?: number
  
  lleva_iva?: boolean
  subtotal: number
  iva: number
  total: number
  
  fecha: string
  estado: 'pendiente' | 'aprobada' | 'pagada' | 'rechazada'
  
  // 🔑 Vo.Bo. Gerencia (REQUERIDO antes de aparecer en Pagos)
  vobo_gerencia?: boolean
  vobo_gerencia_por?: string
  vobo_gerencia_fecha?: string
  
  // Vo.Bo. Desarrollador
  vobo_desarrollador?: boolean
  vobo_desarrollador_por?: string
  vobo_desarrollador_fecha?: string
  
  // Vo.Bo. Finanzas
  vobo_finanzas?: boolean
  vobo_finanzas_por?: string
  vobo_finanzas_fecha?: string
  
  // Pago
  monto_pagado?: number
  fecha_pago?: string
  fecha_pago_esperada?: string // fecha + 15 días (viernes)
  estatus_pago?: 'NO PAGADO' | 'PAGADO' | 'PAGADO PARCIALMENTE'
  
  created_at: string
  updated_at: string
}
```

**Lógica de Proporcionalidad**:

```typescript
// Cuando se crea una solicitud con solo algunos conceptos de la requisición

// 1. Calcular subtotal de conceptos seleccionados
subtotal_conceptos = conceptos_seleccionados.reduce((sum, c) => sum + c.importe, 0)

// 2. Calcular proporción
total_conceptos_requisicion = requisicion.conceptos.reduce((sum, c) => sum + c.importe, 0)
proporcion = subtotal_conceptos / total_conceptos_requisicion

// 3. Aplicar proporción a descuentos
amortizacion_aplicada = requisicion.amortizacion * proporcion
retencion_aplicada = requisicion.retencion * proporcion
otros_descuentos_aplicados = requisicion.otros_descuentos * proporcion

// 4. Calcular totales
subtotal_sin_descuentos = subtotal_conceptos
subtotal = subtotal_sin_descuentos - amortizacion_aplicada - retencion_aplicada - otros_descuentos_aplicados
iva = lleva_iva ? (subtotal * 0.16) : 0
total = subtotal + iva
```

**Validaciones**:
- Solo se pueden crear solicitudes de requisiciones con `estado != 'borrador'`
- Debe tener al menos un concepto seleccionado
- `vobo_gerencia` es REQUERIDO antes de poder pagar

---

### 7. Pago Realizado

**Archivo**: `src/types/pago-realizado.ts`

```typescript
interface PagoRealizado {
  id: string
  solicitud_pago_id: string
  requisicion_pago_id: string
  contrato_id: string
  concepto_contrato_id: string
  contratista_id?: string
  
  // Información del concepto
  concepto_clave: string
  concepto_descripcion: string
  cantidad: number
  precio_unitario: number
  importe_concepto: number
  
  // 🔑 Desglose del pago
  monto_bruto: number
  retencion_porcentaje: number
  retencion_monto: number
  anticipo_porcentaje: number
  anticipo_monto: number
  
  lleva_iva?: boolean
  subtotal?: number
  iva?: number
  monto_neto_pagado: number // Total pagado
  
  // Información de pago
  fecha_pago: string
  numero_pago?: string
  metodo_pago?: 'TRANSFERENCIA' | 'CHEQUE' | 'EFECTIVO' | 'OTRO'
  referencia_pago?: string
  
  // Documentos
  comprobante_pago_url?: string
  factura_url?: string
  xml_url?: string
  
  // Folios relacionados
  folio_solicitud: string
  folio_requisicion: string
  numero_contrato?: string
  
  estatus: 'PAGADO' | 'REVERTIDO' | 'CANCELADO'
  pagado_por?: string
  
  created_at: string
  updated_at: string
}
```

**Lógica**:
- Se crea un registro por cada concepto pagado
- Se puede pagar parcialmente una solicitud (concepto por concepto)
- Al pagar, se actualiza `solicitud.monto_pagado` y `solicitud.estatus_pago`

---

## 🔄 Flujo de Trabajo

### Flujo Completo del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ALTA DE CONTRATISTA                                      │
│    - Registro con documentación legal                       │
│    - Subida de documentos (CSF, CV, Acta, etc.)            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. CREACIÓN DE CONTRATO                                     │
│    - Definir tipo, monto, fechas                           │
│    - Configurar anticipo, retenciones                       │
│    - Establecer tratamiento IVA                             │
│    - Estado: catalogo_aprobado = false                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. SUBIDA DE CATÁLOGO (por Contratista)                    │
│    - Subir Excel con conceptos ordinarios                   │
│    - Sistema crea ConceptoContrato por cada fila           │
│    - Estado permanece: catalogo_aprobado = false            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. APROBACIÓN DE CATÁLOGO (por Admin/Gerente)              │
│    - Revisar conceptos del catálogo                         │
│    - Aprobar o rechazar                                     │
│    - Si aprueba: catalogo_aprobado = true ✅                │
│    🔑 SIN ESTE PASO NO SE PUEDEN CREAR REQUISICIONES        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. CAMBIOS DE CONTRATO (Opcional)                          │
│    A. ADITIVAS - Aumentar cantidades de conceptos          │
│    B. DEDUCTIVAS - Disminuir cantidades de conceptos       │
│    C. EXTRAS - Conceptos extraordinarios nuevos             │
│    D. DEDUCCIONES EXTRA - Descuentos directos              │
│    E. RETENCIONES - Montos que se aplican/regresan         │
│    - Estado: BORRADOR → EN_REVISION → APROBADO → APLICADO  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. CREACIÓN DE REQUISICIÓN (por Contratista)               │
│    - Seleccionar conceptos a requisitar                     │
│    - Ingresar volúmenes/cantidades                          │
│    - Sistema calcula amortización y retención               │
│    - Subir factura (factura_url)                           │
│    - Cambiar estado: borrador → enviada                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. CREACIÓN DE SOLICITUD (por Admin/Gerente)               │
│    - Seleccionar conceptos de requisición a pagar           │
│    - Sistema calcula descuentos proporcionales              │
│    - Se puede dividir una requisición en múltiples          │
│      solicitudes                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. VO.BO. GERENCIA (por Gerente)                           │
│    - Revisar solicitud                                      │
│    - Dar Vo.Bo.: vobo_gerencia = true                       │
│    - Sistema calcula fecha_pago_esperada (fecha + 15 días) │
│    🔑 REQUERIDO para que aparezca en Registro de Pagos      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. REGISTRO DE PAGO (por Finanzas/Admin)                   │
│    - Solo aparecen solicitudes con vobo_gerencia = true     │
│    - Se puede pagar total o parcialmente                    │
│    - Subir comprobante de pago                              │
│    - Sistema actualiza estatus_pago                         │
│    - Crea registros en pagos_realizados                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. ESTADO DE CUENTA                                        │
│     - Vista consolidada del contrato                        │
│     - Muestra avances, pagos, saldos                        │
│     - Calcula penalizaciones por atraso                     │
└─────────────────────────────────────────────────────────────┘
```

### Estados y Transiciones

#### Contrato
```
BORRADOR → EN_REVISION → APROBADO → ACTIVO → FINALIZADO
                                            ↓
                                        CANCELADO
```

#### Cambio de Contrato
```
BORRADOR → EN_REVISION → APROBADO → APLICADO
                      ↓
                  RECHAZADO
```

#### Requisición
```
borrador → enviada → aprobada → pagada
                              ↓
                          cancelada
```

#### Solicitud
```
pendiente → aprobada → pagada
         ↓
     rechazada
```

---

## 💰 Cálculos Financieros Detallados

### 1. Monto del Contrato Actualizado

```typescript
// Monto base del contrato
monto_base = contrato.monto_contrato

// Obtener todos los cambios APLICADOS
cambios_aplicados = cambios_contrato.filter(c => c.estatus === 'APLICADO')

// Calcular ajustes
monto_extras = cambios.filter(c => c.tipo_cambio === 'EXTRA')
  .reduce((sum, c) => sum + c.monto_cambio, 0)

monto_aditivas = cambios.filter(c => c.tipo_cambio === 'ADITIVA')
  .reduce((sum, c) => sum + c.monto_cambio, 0)

monto_deductivas = cambios.filter(c => c.tipo_cambio === 'DEDUCTIVA')
  .reduce((sum, c) => sum + Math.abs(c.monto_cambio), 0) // Ya son negativos

// Monto actualizado del contrato
monto_contrato_actualizado = monto_base + monto_extras + monto_aditivas - monto_deductivas
```

### 2. Amortización de Anticipo en Requisición (Cálculo Dinámico)

```typescript
// Obtener anticipo del contrato
anticipo_monto = contrato.anticipo_monto || 0

// Obtener monto del contrato actualizado (con extras/aditivas/deductivas)
monto_contrato_actualizado = calcularMontoContratoActualizado(contrato)

// Calcular anticipo ya amortizado y monto ya requisitado en requisiciones anteriores
requisiciones_anteriores = await db.requisiciones_pago
  .where('contrato_id')
  .equals(contrato_id)
  .and(r => r.id !== requisicion_actual.id) // Excluir la actual
  .toArray()

anticipo_amortizado_anterior = requisiciones_anteriores
  .reduce((sum, r) => sum + (r.amortizacion || 0), 0)

monto_ya_requisitado = requisiciones_anteriores
  .reduce((sum, r) => sum + (r.monto_estimado || 0), 0)

// Calcular anticipo disponible y monto restante por requisitar
anticipo_disponible = anticipo_monto - anticipo_amortizado_anterior
monto_restante_por_requisitar = Math.max(0, monto_contrato_actualizado - monto_ya_requisitado)

// 🔑 CALCULAR PORCENTAJE DINÁMICO sobre lo que resta por requisitar
// Esto asegura que el anticipo se distribuya proporcionalmente en todo el contrato
// y se ajuste automáticamente cuando hay cambios de contrato (extras, aditivas, deductivas)
porcentaje_anticipo_dinamico = monto_restante_por_requisitar > 0 
  ? (anticipo_disponible / monto_restante_por_requisitar) 
  : 0

// Calcular amortización para esta requisición
// ⚠️ IMPORTANTE: Excluir conceptos tipo ANTICIPO
monto_conceptos_normales = requisicion.conceptos
  .filter(c => (!c.tipo || c.tipo === 'CONCEPTO') && !c.es_anticipo)
  .reduce((sum, c) => sum + c.importe, 0)

amortizacion_calculada = monto_conceptos_normales * porcentaje_anticipo_dinamico

// Limitar a anticipo disponible (por seguridad)
amortizacion_final = Math.min(amortizacion_calculada, anticipo_disponible)
```

**🔑 VENTAJAS DEL CÁLCULO DINÁMICO:**
- El anticipo se distribuye proporcionalmente durante todo el contrato
- Se ajusta automáticamente cuando hay extras/aditivas/deductivas
- El anticipo se agota exactamente cuando se completa el 100% del contrato
- No importa el orden o tamaño de las requisiciones

### 3. Retención de Fondo de Garantía

```typescript
// Obtener porcentaje de retención del contrato
retencion_porcentaje = contrato.retencion_porcentaje || 0

// Calcular retención sobre monto estimado
// ⚠️ IMPORTANTE: Aplicar sobre TODOS los conceptos, incluyendo extras
monto_estimado = requisicion.conceptos
  .reduce((sum, c) => sum + c.importe, 0)

retencion = monto_estimado * (retencion_porcentaje / 100)
```

### 4. Retenciones de Contrato (Aplicar/Regresar)

```typescript
// Ver documento detallado: docs/ARQUITECTURA-RETENCIONES.md

// Al APLICAR una retención (restar del monto)
conceptos.push({
  concepto_contrato_id: retencion.id,
  clave: retencion.numero_cambio,
  concepto: retencion.descripcion,
  cantidad_esta_requisicion: 1, // Volumen = 1
  precio_unitario: monto_a_aplicar, // El monto ingresado
  importe: -monto_a_aplicar, // ⚠️ NEGATIVO
  tipo: 'RETENCION',
  modo_retencion: 'APLICAR'
})

// Al REGRESAR una retención (sumar al monto)
conceptos.push({
  concepto_contrato_id: retencion.id,
  clave: retencion.numero_cambio,
  concepto: retencion.descripcion,
  cantidad_esta_requisicion: 1,
  precio_unitario: monto_a_regresar,
  importe: monto_a_regresar, // ⚠️ POSITIVO
  tipo: 'RETENCION',
  modo_retencion: 'REGRESAR'
})

// Actualizar monto_aplicado o monto_regresado en retenciones_contrato
// Recalcular monto_disponible automáticamente
```

### 5. Cálculo de Subtotal, IVA y Total

```typescript
// 1. Calcular monto estimado (suma de conceptos)
monto_estimado = conceptos.reduce((sum, c) => sum + c.importe, 0)

// 2. Aplicar descuentos
subtotal = monto_estimado 
         - amortizacion 
         - retencion 
         - otros_descuentos
         - retenciones_aplicadas // De retenciones de contrato
         + retenciones_regresadas // De retenciones de contrato

// 3. Calcular IVA (solo si lleva_iva = true)
lleva_iva = requisicion.lleva_iva // Heredado de contrato.tratamiento
iva = lleva_iva ? (subtotal * 0.16) : 0

// 4. Total
total = subtotal + iva

// ⚠️ IMPORTANTE: Redondear a 2 decimales
subtotal = parseFloat(subtotal.toFixed(2))
iva = parseFloat(iva.toFixed(2))
total = parseFloat(total.toFixed(2))
```

### 6. Descuentos Proporcionales en Solicitudes

```typescript
// Cuando se crea una solicitud con solo algunos conceptos de una requisición

// 1. Calcular subtotal de conceptos seleccionados
subtotal_conceptos_seleccionados = conceptos_seleccionados
  .reduce((sum, c) => sum + c.importe, 0)

// 2. Calcular proporción
total_requisicion = requisicion.conceptos
  .reduce((sum, c) => sum + c.importe, 0)

proporcion = subtotal_conceptos_seleccionados / total_requisicion

// 3. Aplicar proporción a TODOS los descuentos
amortizacion_proporcional = (requisicion.amortizacion || 0) * proporcion
retencion_proporcional = (requisicion.retencion || 0) * proporcion
otros_descuentos_proporcional = (requisicion.otros_descuentos || 0) * proporcion

// 4. Calcular totales de la solicitud
subtotal = subtotal_conceptos_seleccionados 
         - amortizacion_proporcional 
         - retencion_proporcional 
         - otros_descuentos_proporcional

lleva_iva = requisicion.lleva_iva
iva = lleva_iva ? (subtotal * 0.16) : 0
total = subtotal + iva
```

### 7. Estado de Cuenta del Contrato

```typescript
// 1. Monto total del contrato (base + cambios)
monto_contrato_total = calcularMontoContratoActualizado(contrato)

// 2. Obtener todas las requisiciones del contrato
requisiciones = await db.requisiciones_pago
  .where('contrato_id')
  .equals(contrato_id)
  .toArray()

// 3. Calcular totales
total_requisitado_bruto = requisiciones
  .reduce((sum, r) => sum + (r.monto_estimado || 0), 0)

total_amortizado = requisiciones
  .reduce((sum, r) => sum + (r.amortizacion || 0), 0)

total_retenido = requisiciones
  .reduce((sum, r) => sum + (r.retencion || 0), 0)

total_requisitado_neto = requisiciones
  .reduce((sum, r) => sum + (r.total || 0), 0)

// 4. Obtener solicitudes y calcular pagos
solicitudes = await obtenerSolicitudesDelContrato(contrato_id)

total_pagado = solicitudes
  .reduce((sum, s) => sum + (s.monto_pagado || 0), 0)

// 5. Calcular saldos
saldo_anticipo = (contrato.anticipo_monto || 0) - total_amortizado

saldo_por_ejercer = monto_contrato_total - total_requisitado_bruto

saldo_por_pagar = total_requisitado_neto - total_pagado

// 6. Porcentaje de avance
porcentaje_avance = (total_pagado / monto_contrato_total) * 100
```

---

## ✅ Validaciones y Reglas de Negocio

**Archivo**: `src/lib/validators/flujoValidator.ts`

### 1. Validación de Aprobación de Catálogo

```typescript
FlujoValidator.validarAprobacionCatalogo(contrato, conceptos)
```

**Reglas**:
- El catálogo NO debe estar ya aprobado (`catalogo_aprobado == false`)
- Debe tener al menos un concepto
- El monto total debe ser > 0

### 2. Validación de Creación de Requisición

```typescript
FlujoValidator.validarCreacionRequisicion(contrato, conceptos)
```

**Reglas**:
- El catálogo DEBE estar aprobado (`catalogo_aprobado == true`)
- Debe tener al menos un concepto
- No se puede exceder la cantidad disponible por concepto

### 3. Validación de Cantidades Disponibles

```typescript
// Para cada concepto requisitado
cantidad_disponible = concepto.cantidad_catalogo - cantidad_pagada_anterior

if (cantidad_requisitada > cantidad_disponible) {
  throw new Error('No hay suficiente cantidad disponible')
}
```

### 4. Validación de Creación de Solicitud

```typescript
FlujoValidator.validarCreacionSolicitud(requisicion)
```

**Reglas**:
- La requisición NO debe estar en estado 'borrador'
- Debe tener al menos un concepto seleccionado

### 5. Validación de Realización de Pago

```typescript
FlujoValidator.validarRealizacionPago(solicitud, montoPago)
```

**Reglas**:
- La solicitud DEBE tener `vobo_gerencia = true`
- El estado debe ser 'aprobada' o 'pendiente'
- El monto del pago debe ser > 0
- El monto no puede exceder el total de la solicitud

### 6. Constraint de Subtotal e IVA

```sql
-- En Supabase
ALTER TABLE requisiciones_pago
ADD CONSTRAINT check_subtotal_iva_total 
CHECK (ABS(total - (subtotal + iva)) < 0.05);
```

**Regla**:
- `total` debe ser igual a `subtotal + iva` (con tolerancia de $0.05 por redondeo)

---

## 🎨 Componentes Principales

### 1. Gestión de Contratistas

**Ubicación**: `src/components/obra/`

- `ContratistasList.tsx`: Listado con búsqueda y filtros
- `ContratistaForm.tsx`: Formulario de alta/edición
- Subida de documentos: 7 tipos de archivos a Supabase Storage

### 2. Gestión de Contratos

**Ubicación**: `src/components/obra/`

- `ContratosList.tsx`: Listado de contratos
- `ContratoForm.tsx`: Formulario de alta/edición
- `ContratoConceptosModal.tsx`: Gestión completa de:
  - Tab 1: Conceptos del catálogo ordinario
  - Tab 2: Cambios aditivos/deductivos
  - Tab 3: Cambios extraordinarios (extras)
  - Tab 4: Deducciones extra
  - Tab 5: Retenciones
  - Tab 6: Extraordinario (tab legacy)

**Funcionalidades clave**:
- Subida de Excel con conceptos
- Aprobación de catálogo
- Creación de cambios de contrato
- Aplicación de cambios

### 3. Requisiciones

**Ubicación**: `src/pages/obra/RequisicionesPagoPage.tsx`

**Componentes relacionados**:
- `RequisicionPagoForm.tsx`: Formulario de creación/edición
- `RequisicionConceptosSelector.tsx`: Selector de conceptos con cantidades
- `CaratulaRequisicionModal.tsx`: Vista previa e impresión

**Flujo**:
1. Seleccionar contrato (solo con `catalogo_aprobado = true`)
2. Seleccionar conceptos del catálogo
3. Ingresar cantidades (respetando cantidad disponible)
4. Sistema calcula amortización y retención automáticamente
5. Opcional: Aplicar/regresar retenciones de contrato
6. Subir factura
7. Enviar (`estado: 'enviada'`)

### 4. Solicitudes

**Ubicación**: `src/pages/obra/SolicitudesPagoPage.tsx`

**Componentes relacionados**:
- `SolicitudPagoForm.tsx`: Formulario de creación
- `DesgloseSolicitudModal.tsx`: Desglose de conceptos y descuentos

**Flujo**:
1. Seleccionar requisiciones (estado != 'borrador')
2. Seleccionar conceptos a pagar
3. Sistema calcula descuentos proporcionales
4. Crear solicitud
5. Dar Vo.Bo. Gerencia (REQUERIDO)
6. Opcional: Vo.Bo. Desarrollador y Finanzas

### 5. Registro de Pagos

**Ubicación**: `src/pages/obra/PagosRealizadosPage.tsx`

**Flujo**:
1. Solo aparecen solicitudes con `vobo_gerencia = true`
2. Se puede pagar total o parcialmente
3. Subir comprobante de pago
4. Sistema crea registros en `pagos_realizados`
5. Actualiza `solicitud.monto_pagado` y `estatus_pago`

### 6. Estado de Cuenta

**Ubicación**: `src/pages/obra/EstadoCuentaPage.tsx`

**Vista consolidada**:
- Monto del contrato (base + cambios)
- Total requisitado (bruto y neto)
- Total pagado
- Saldos (anticipo, por ejercer, por pagar)
- Porcentaje de avance
- Penalizaciones por atraso (si aplica)

---

## 📁 Estructura de Archivos Relevantes

```
src/
├── types/
│   ├── contratista.ts
│   ├── contrato.ts
│   ├── concepto-contrato.ts
│   ├── cambio-contrato.ts
│   ├── requisicion-pago.ts
│   ├── solicitud-pago.ts
│   └── pago-realizado.ts
│
├── db/
│   └── database.ts (Dexie.js + IndexedDB)
│
├── lib/
│   ├── validators/
│   │   └── flujoValidator.ts
│   ├── services/
│   │   ├── pagoRealizadoService.ts
│   │   └── ...
│   └── hooks/
│       └── useContratos.ts
│
├── components/
│   └── obra/
│       ├── ContratistaForm.tsx
│       ├── ContratoForm.tsx
│       ├── ContratoConceptosModal.tsx
│       ├── CambiosContratoTabs.tsx
│       ├── RetencionesContrato.tsx
│       ├── RequisicionPagoForm.tsx
│       ├── RequisicionConceptosSelector.tsx
│       ├── SolicitudPagoForm.tsx
│       ├── DesgloseSolicitudModal.tsx
│       └── CaratulaRequisicionModal.tsx
│
└── pages/
    └── obra/
        ├── RequisicionesPagoPage.tsx
        ├── SolicitudesPagoPage.tsx
        ├── PagosRealizadosPage.tsx
        ├── EstadoCuentaPage.tsx
        └── VigenciaContratosPage.tsx

supabase/
└── migrations/
    ├── 20260105_add_subtotal_iva.sql
    └── crear-tabla-retenciones.sql

docs/
├── ARQUITECTURA-RETENCIONES.md
├── GUIA-RETENCIONES.md
└── SISTEMA-ADMINISTRACION-PRESUPUESTO-COMPLETO.md (este archivo)
```

---

## 🔑 Puntos Críticos de Implementación

### 1. Aprobación de Catálogo es OBLIGATORIA

```typescript
// NO permitir crear requisiciones si el catálogo no está aprobado
if (!contrato.catalogo_aprobado) {
  throw new Error('El catálogo debe estar aprobado')
}
```

### 2. Tratamiento de IVA se Hereda del Contrato

```typescript
// Al crear requisición, heredar de contrato
const llevaIva = contrato.tratamiento === 'MAS IVA'
```

### 3. Amortización NO se Aplica a Conceptos de Anticipo

```typescript
// Excluir conceptos tipo ANTICIPO del cálculo
const conceptosNormales = conceptos.filter(c => 
  (!c.tipo || c.tipo === 'CONCEPTO') && !c.es_anticipo
)
```

### 4. Retenciones de Contrato Tienen Modo Explícito

```typescript
// Guardar modo_retencion explícitamente (NO inferir del signo)
concepto.modo_retencion = 'APLICAR' // o 'REGRESAR'
```

### 5. Vo.Bo. Gerencia es REQUERIDO para Pagos

```typescript
// Solo mostrar en Registro de Pagos si tiene Vo.Bo.
if (!solicitud.vobo_gerencia) {
  // No mostrar
}
```

### 6. Descuentos Proporcionales en Solicitudes

```typescript
// Al crear solicitud con solo algunos conceptos, aplicar proporción
const proporcion = subtotal_seleccionados / total_requisicion
const amortizacion_aplicada = requisicion.amortizacion * proporcion
```

### 7. Redondeo a 2 Decimales

```typescript
// Siempre redondear para evitar errores de precisión
subtotal = parseFloat(subtotal.toFixed(2))
iva = parseFloat(iva.toFixed(2))
total = parseFloat(total.toFixed(2))
```

---

## 📚 Documentos Relacionados

- **ARQUITECTURA-RETENCIONES.md**: Sistema de retenciones con modo explícito
- **GUIA-RETENCIONES.md**: Guía de implementación de retenciones
- **MODO-ONLINE-FORZADO.md**: Sincronización con Supabase
- **SISTEMAS-OPTIMIZACION.md**: Validadores y servicios

---

## 🎯 Conclusión

Este sistema implementa un flujo completo de administración de presupuesto de construcción con:

✅ Gestión de contratistas con documentación legal  
✅ Contratos con diferentes tipos y tratamientos de IVA  
✅ Sistema de aprobación de catálogos  
✅ Cambios de contrato (aditivas, deductivas, extras, deducciones, retenciones)  
✅ Requisiciones con cálculo automático de descuentos  
✅ Solicitudes con descuentos proporcionales  
✅ Registro de pagos con Vo.Bo. obligatorio  
✅ Estado de cuenta consolidado  

El sistema garantiza integridad de datos mediante:
- Validaciones en TypeScript (FlujoValidator)
- Constraints en base de datos (Supabase)
- Sincronización offline-first (Dexie.js + IndexedDB)
- Auditoría completa de cambios

---

**Fecha de creación**: 2026-01-13  
**Versión**: 1.0.0  
**Autor**: Sistema Elara
