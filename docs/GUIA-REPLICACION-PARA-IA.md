# 🤖 Guía de Replicación para IA: Sistema de Administración de Presupuesto

## 📋 Propósito de este Documento

Este documento está diseñado para ser compartido con una IA (ChatGPT, Claude, etc.) para que replique la lógica completa del sistema de administración de presupuesto en otro proyecto.

---

## 🎯 Contexto del Sistema

Sistema de administración de presupuestos para construcción que gestiona el ciclo completo desde la contratación hasta el pago final.

**Stack Tecnológico**:
- **Frontend**: React + TypeScript + Material UI
- **Base de Datos Local**: Dexie.js (IndexedDB)
- **Backend**: Supabase (PostgreSQL)
- **Sincronización**: Offline-first con sync a Supabase
- **Storage**: Supabase Storage para documentos

---

## 🎯 Instrucciones para IA

Si estás replicando este sistema en otro proyecto, sigue estas instrucciones:

### 1. Estructura de Base de Datos

Crea las siguientes tablas en el orden indicado:

#### Tabla: `contratistas`
```sql
CREATE TABLE contratistas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  localizacion TEXT,
  telefono TEXT,
  correo_contacto TEXT,
  numero_cuenta_bancaria TEXT,
  banco TEXT,
  nombre_cuenta TEXT,
  csf_url TEXT,
  cv_url TEXT,
  acta_constitutiva_url TEXT,
  repse_url TEXT,
  ine_url TEXT,
  registro_patronal_url TEXT,
  comprobante_domicilio_url TEXT,
  active BOOLEAN DEFAULT true,
  notas TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

#### Tabla: contratos

```typescript
interface Contrato {
  id: string
  numero_contrato?: string
  nombre?: string
  clave_contrato?: string
  tipo_contrato?: TipoContrato
  tratamiento?: TratamientoIVA // ⚠️ Controla si lleva IVA
  contratista_id: string
  monto_contrato: number
  anticipo_monto?: number
  retencion_porcentaje?: number
  fecha_inicio?: string
  fecha_fin?: string
  catalogo_aprobado?: boolean // 🔑 CRÍTICO
  // ... más campos
}
```

### 2. Catálogo de Conceptos

```typescript
interface ConceptoContrato {
  id: string
  contrato_id: string
  clave: string
  concepto: string
  unidad: string
  cantidad_catalogo: number
  precio_unitario_catalogo: number
  importe_catalogo: number
  // ... campos calculados
}
```

### 3. Cambios de Contrato

```typescript
// 5 tipos de cambios
type TipoCambioContrato = 
  | 'ADITIVA'          // +cantidad concepto existente
  | 'DEDUCTIVA'        // -cantidad concepto existente
  | 'EXTRA'            // Concepto nuevo
  | 'DEDUCCION_EXTRA'  // Descuento directo
  | 'RETENCION'        // Retención aplicar/regresar
```

### 4. Requisiciones

```typescript
interface RequisicionPago {
  id: string
  contrato_id: string
  numero: string // REQ-001
  conceptos: RequisicionConcepto[]
  
  // Cálculos
  monto_estimado: number
  amortizacion: number
  retencion: number
  retenciones_aplicadas?: number
  retenciones_regresadas?: number
  lleva_iva?: boolean
  subtotal: number
  iva: number
  total: number
  
  factura_url?: string // 🔑 Factura del contratista
}
```

### 5. Solicitudes

```typescript
interface SolicitudPago {
  id: string
  folio: string // SOL-001
  requisicion_id: string
  concepto_ids: string[]
  
  // Descuentos proporcionales
  amortizacion_aplicada?: number
  retencion_aplicada?: number
  
  subtotal: number
  iva: number
  total: number
  
  // Vo.Bo. requerido
  vobo_gerencia?: boolean // 🔑 CRÍTICO para pagos
  vobo_gerencia_por?: string
}
```

---

## 🔄 FLUJO DE TRABAJO

### Flujo Básico (Feliz)

```
1. Alta Contratista
   → Subir documentos (CSF, CV, Acta, etc.)

2. Crear Contrato
   → Definir monto, anticipo, retención, IVA
   → Estado: catalogo_aprobado = false

3. Subir Catálogo (Contratista)
   → Excel con conceptos
   → Crear ConceptoContrato[]
   → Estado: catalogo_aprobado = false

4. Aprobar Catálogo (Admin/Gerente)
   → Revisar conceptos
   → Estado: catalogo_aprobado = true ✅
   🔑 SIN ESTE PASO NO HAY REQUISICIONES

5. Cambios Contrato (Opcional)
   → Aditivas/Deductivas/Extras/Deducciones/Retenciones
   → Estado: BORRADOR → APROBADO → APLICADO

6. Crear Requisición (Contratista)
   → Seleccionar conceptos
   → Ingresar cantidades
   → Sistema calcula amortización/retención
   → Subir factura
   → Estado: borrador → enviada

7. Crear Solicitud (Admin/Gerente)
   → Seleccionar conceptos de requisición
   → Sistema calcula descuentos proporcionales
   → Puede dividir en múltiples solicitudes

8. Dar Vo.Bo. Gerencia
   → vobo_gerencia = true ✅
   🔑 REQUERIDO para que aparezca en Pagos

9. Registrar Pago (Finanzas)
   → Solo solicitudes con Vo.Bo.
   → Pago total o parcial
   → Subir comprobante
```

### Estados y Transiciones

| Entidad | Estados |
|---------|---------|
| Contrato | BORRADOR → EN_REVISION → APROBADO → ACTIVO → FINALIZADO/CANCELADO |
| Cambio | BORRADOR → EN_REVISION → APROBADO → APLICADO / RECHAZADO |
| Requisición | borrador → enviada → aprobada → pagada / cancelada |
| Solicitud | pendiente → aprobada → pagada / rechazada |

---

## 💰 CÁLCULOS CLAVE

### 1. Monto Contrato Actualizado

```typescript
monto_total = monto_base 
            + SUM(extras) 
            + SUM(aditivas) 
            - SUM(deductivas)
```

### 2. Amortización de Anticipo (Cálculo Dinámico) 🔑

```typescript
// PASO 1: Calcular lo ya amortizado y requisitado
anticipo_amortizado = SUM(requisiciones_anteriores.amortizacion)
monto_ya_requisitado = SUM(requisiciones_anteriores.monto_estimado)

// PASO 2: Calcular disponible y restante
anticipo_disponible = anticipo_monto - anticipo_amortizado
monto_restante = monto_contrato_actualizado - monto_ya_requisitado

// PASO 3: Porcentaje DINÁMICO sobre lo que resta
pct_dinamico = anticipo_disponible / monto_restante

// PASO 4: Amortización de esta requisición
// ⚠️ EXCLUIR conceptos tipo ANTICIPO
amortizacion = SUM(conceptos_normales.importe) * pct_dinamico

// PASO 5: Limitar a anticipo disponible (seguridad)
amortizacion = MIN(amortizacion, anticipo_disponible)
```

**🔑 IMPORTANTE**: El porcentaje se recalcula dinámicamente en CADA requisición basándose en lo que resta por requisitar. Esto garantiza que el anticipo se distribuya proporcionalmente durante todo el contrato y se ajuste automáticamente cuando hay cambios (extras, aditivas, deductivas).

### 3. Subtotal, IVA, Total

```typescript
subtotal = monto_estimado 
         - amortizacion 
         - retencion 
         - otros_descuentos
         - retenciones_aplicadas
         + retenciones_regresadas

iva = lleva_iva ? (subtotal * 0.16) : 0

total = subtotal + iva

// ⚠️ Redondear a 2 decimales
subtotal = parseFloat(subtotal.toFixed(2))
iva = parseFloat(iva.toFixed(2))
total = parseFloat(total.toFixed(2))
```

### 4. Descuentos Proporcionales (Solicitudes)

```typescript
// Si se seleccionan solo algunos conceptos
proporcion = subtotal_seleccionados / total_requisicion

amortizacion_proporcional = requisicion.amortizacion * proporcion
retencion_proporcional = requisicion.retencion * proporcion
```

---

## ✅ VALIDACIONES CRÍTICAS

### 1. Catálogo Aprobado

```typescript
// NO permitir crear requisiciones sin aprobación
if (!contrato.catalogo_aprobado) {
  throw new Error('Catálogo debe estar aprobado')
}
```

### 2. Cantidad Disponible

```typescript
disponible = concepto.cantidad_catalogo - cantidad_pagada_anterior
if (cantidad_requisitada > disponible) {
  throw new Error('Excede cantidad disponible')
}
```

### 3. Vo.Bo. Gerencia

```typescript
// NO permitir pagar sin Vo.Bo.
if (!solicitud.vobo_gerencia) {
  throw new Error('Requiere Vo.Bo. de Gerencia')
}
```

### 4. Constraint Subtotal + IVA

```sql
-- En Supabase
CHECK (ABS(total - (subtotal + iva)) < 0.05)
```

---

## 🔑 PUNTOS CRÍTICOS

### ⚠️ REQUERIMIENTOS OBLIGATORIOS

1. **Catálogo aprobado** antes de requisiciones
2. **Vo.Bo. Gerencia** antes de pagos
3. **Factura** en requisición (sube contratista)
4. **Comprobante** en pago (sube finanzas)

### ⚠️ CÁLCULOS AUTOMÁTICOS

1. **Amortización**: Proporcional al monto del contrato actualizado
2. **Retención**: Porcentaje fijo del contrato
3. **IVA**: Según `tratamiento` del contrato
4. **Descuentos proporcionales**: En solicitudes parciales

### ⚠️ EXCLUSIONES ESPECIALES

1. **Conceptos tipo ANTICIPO**: NO se amortizan a sí mismos
2. **Deducciones/Retenciones**: NO se les aplica amortización ni retención

### ⚠️ RETENCIONES DE CONTRATO

- Tienen **modo explícito**: `'APLICAR'` o `'REGRESAR'`
- **APLICAR**: importe negativo (resta)
- **REGRESAR**: importe positivo (suma)
- Actualiza `monto_disponible` automáticamente

---

## 📁 ARCHIVOS CLAVE

```
src/types/
  - contratista.ts
  - contrato.ts
  - concepto-contrato.ts
  - cambio-contrato.ts (5 tipos)
  - requisicion-pago.ts
  - solicitud-pago.ts
  - pago-realizado.ts

src/components/obra/
  - ContratoConceptosModal.tsx (6 tabs)
  - RequisicionPagoForm.tsx
  - RequisicionConceptosSelector.tsx
  - SolicitudPagoForm.tsx
  - DesgloseSolicitudModal.tsx

src/pages/obra/
  - RequisicionesPagoPage.tsx
  - SolicitudesPagoPage.tsx
  - PagosRealizadosPage.tsx
  - EstadoCuentaPage.tsx

src/lib/validators/
  - flujoValidator.ts (TODAS las validaciones)

docs/
  - SISTEMA-ADMINISTRACION-PRESUPUESTO-COMPLETO.md
  - ARQUITECTURA-RETENCIONES.md
  - GUIA-RETENCIONES.md
```

---

## 🤖 PARA REPLICAR EN OTRO PROYECTO

### Paso 1: Crear Base de Datos

```sql
-- Ver migraciones en supabase/migrations/
-- Tablas principales:
- contratistas
- contratos
- conceptos_contrato
- cambios_contrato
- detalles_aditiva_deductiva
- detalles_extra
- deducciones_extra
- retenciones_contrato
- requisiciones_pago
- solicitudes_pago
- pagos_realizados
```

### Paso 2: Implementar Tipos TypeScript

Copiar TODOS los archivos de `src/types/`:
- Mantener interfaces EXACTAS
- Respetar campos obligatorios
- Conservar enums y unions

### Paso 3: Implementar Validador de Flujo

**CRÍTICO**: `src/lib/validators/flujoValidator.ts`

```typescript
// Implementar TODAS las validaciones:
- validarAprobacionCatalogo()
- validarCreacionRequisicion()
- validarCreacionSolicitud()
- validarRealizacionPago()
```

### Paso 4: Implementar Cálculos

**CRÍTICO**: Usar las fórmulas exactas de este documento

```typescript
// Amortización
porcentaje = anticipo / monto_actualizado
amortizacion = SUM(conceptos_normales) * porcentaje

// Subtotal, IVA, Total
subtotal = monto_estimado - descuentos
iva = lleva_iva ? subtotal * 0.16 : 0
total = subtotal + iva

// Redondear SIEMPRE a 2 decimales
```

### Paso 5: Implementar Componentes

**Orden recomendado**:
1. Contratistas (simple)
2. Contratos (medio)
3. Catálogo de Conceptos (complejo)
4. Cambios de Contrato (complejo)
5. Requisiciones (muy complejo)
6. Solicitudes (medio)
7. Pagos (simple)
8. Estado de Cuenta (complejo)

### Paso 6: Integrar Storage

```typescript
// Para documentos:
- 7 documentos de contratista
- PDF de contrato
- Factura de requisición
- Comprobante de pago
```

### Paso 7: Probar Flujo Completo

```
✅ Crear contratista
✅ Crear contrato
✅ Subir catálogo
✅ Aprobar catálogo (CRÍTICO)
✅ Crear requisición
✅ Crear solicitud
✅ Dar Vo.Bo. Gerencia (CRÍTICO)
✅ Registrar pago
✅ Verificar Estado de Cuenta
```

---

## ⚡ PUNTOS DE ATENCIÓN PARA IA

### 🔴 CRÍTICO - NO OMITIR

1. **`catalogo_aprobado = true`**: Requerido para requisiciones
2. **`vobo_gerencia = true`**: Requerido para pagos
3. **Excluir ANTICIPO de amortización**: `filter(c => !c.es_anticipo)`
4. **Modo explícito en retenciones**: Guardar `modo_retencion`
5. **Redondear a 2 decimales**: Siempre `parseFloat(x.toFixed(2))`
6. **Proporcionalidad en solicitudes**: Usar fórmula exacta

### 🟡 IMPORTANTE - CONSIDERAR

1. Monto contrato actualizado incluye extras/aditivas/deductivas
2. Retención % es fija del contrato, aplicada a cada requisición
3. IVA se hereda del `tratamiento` del contrato
4. Fecha pago esperada = fecha solicitud + 15 días (viernes)
5. Se puede pagar parcialmente (concepto por concepto)

### 🟢 RECOMENDABLE - MEJORAR

1. Auditoría de cambios (quién, cuándo, qué)
2. Notificaciones por estado
3. Exportación a Excel/PDF
4. Gráficas de avance
5. Dashboard ejecutivo

---

## 📊 EJEMPLO COMPLETO

```typescript
// 1. Crear contrato
const contrato = {
  monto_contrato: 1000000,
  anticipo_monto: 300000, // 30%
  retencion_porcentaje: 5,
  tratamiento: 'MAS IVA',
  catalogo_aprobado: false // ⚠️
}

// 2. Subir catálogo (100 conceptos)
// Total: $1,000,000

// 3. Aprobar catálogo
contrato.catalogo_aprobado = true // ✅

// 4. Crear extra
const extra = {
  tipo_cambio: 'EXTRA',
  monto_cambio: 50000
}
// Monto actualizado: $1,050,000

// 5. Crear requisición
const requisicion = {
  conceptos: [
    { importe: 100000 }
  ],
  monto_estimado: 100000,
  
  // Amortización: 30% ajustado
  // 300000 / 1050000 = 28.57%
  amortizacion: 100000 * 0.2857 = 28570,
  
  // Retención: 5%
  retencion: 100000 * 0.05 = 5000,
  
  // Subtotal
  subtotal: 100000 - 28570 - 5000 = 66430,
  
  // IVA (16%)
  iva: 66430 * 0.16 = 10628.80,
  
  // Total
  total: 66430 + 10628.80 = 77058.80
}

// 6. Crear solicitud (todos los conceptos)
const solicitud = {
  amortizacion_aplicada: 28570, // 100%
  retencion_aplicada: 5000, // 100%
  subtotal: 66430,
  iva: 10628.80,
  total: 77058.80,
  vobo_gerencia: false // ⚠️
}

// 7. Dar Vo.Bo.
solicitud.vobo_gerencia = true // ✅

// 8. Registrar pago
const pago = {
  monto_neto_pagado: 77058.80,
  fecha_pago: '2026-01-13'
}
```

---

## 🎓 CONCEPTOS CLAVE

| Concepto | Descripción |
|----------|-------------|
| **Catálogo Ordinario** | Conceptos originales del contrato (aprobación requerida) |
| **Aditiva** | Aumenta cantidad de concepto existente |
| **Deductiva** | Disminuye cantidad de concepto existente |
| **Extra** | Concepto nuevo extraordinario (no en catálogo) |
| **Deducción Extra** | Descuento directo sin concepto asociado |
| **Retención de Contrato** | Monto que se aplica/regresa en requisiciones |
| **Amortización** | Descuento de anticipo proporcional |
| **Retención (Fondo)** | Porcentaje fijo de garantía |
| **Requisición** | Solicitud de pago por avance de obra |
| **Solicitud** | División de requisición para aprobación/pago |
| **Vo.Bo. Gerencia** | Aprobación requerida antes de pagar |

---

## 📞 SOPORTE

Para dudas sobre:
- **Retenciones**: Ver `ARQUITECTURA-RETENCIONES.md`
- **Flujo completo**: Ver este documento
- **Validaciones**: Ver `src/lib/validators/flujoValidator.ts`
- **Cálculos**: Ver sección "CÁLCULOS CLAVE"

---

**Versión**: 2.0.0  
**Fecha**: 2026-01-13  
**Para**: Replicación en otros proyectos con IA

---

## 🚀 CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Fundación
- [ ] Crear base de datos (todas las tablas)
- [ ] Implementar tipos TypeScript (interfaces exactas)
- [ ] Configurar Storage para documentos

### Fase 2: Core
- [ ] Implementar `flujoValidator.ts` (CRÍTICO)
- [ ] Implementar cálculos financieros (fórmulas exactas)
- [ ] Implementar servicios base

### Fase 3: UI Básica
- [ ] Contratistas (CRUD + documentos)
- [ ] Contratos (CRUD básico)
- [ ] Catálogo de conceptos (subida + aprobación)

### Fase 4: Cambios
- [ ] Aditivas/Deductivas
- [ ] Extras
- [ ] Deducciones Extra
- [ ] Retenciones (con modo explícito)

### Fase 5: Flujo de Pago
- [ ] Requisiciones (con selector de conceptos)
- [ ] Solicitudes (con proporcionalidad)
- [ ] Registro de Pagos (con Vo.Bo.)
- [ ] Estado de Cuenta

### Fase 6: Validación
- [ ] Probar flujo completo end-to-end
- [ ] Validar cálculos (vs Excel)
- [ ] Verificar constraints de BD
- [ ] Auditar logs y trazabilidad

### Fase 7: Optimización
- [ ] Agregar caché donde aplique
- [ ] Optimizar queries
- [ ] Implementar sincronización offline
- [ ] Agregar notificaciones

---

✅ **Este documento contiene TODO lo necesario para replicar el sistema**
