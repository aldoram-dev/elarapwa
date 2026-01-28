# Plan de Acción: Mejoras a Administración de Obra

**Documento:** Guía práctica de implementación  
**Versión:** 1.0  
**Prioridad:** Crítico  
**Estimado:** 6-8 semanas  

---

## 🎯 Resumen Ejecutivo

Tu aplicación tiene una arquitectura sólida, pero tiene **8 problemas críticos** que generan inconsistencias en datos y auditoría. Este documento detalla:

1. El problema específico
2. Impacto en el negocio
3. Causa raíz
4. Solución técnica
5. Pasos de implementación

---

## 🔴 PROBLEMA #1: CARÁTULA DE PAGO SE RECALCULA DIFERENTE

### Descripción
Cuando abres una carátula de pago ya aprobada, los montos pueden ser diferentes cada vez que la abres.

### Impacto
- ⚠️ **CRÍTICO:** Se pagan montos diferentes a los autorizados
- Conflictos con contratistas (dice que se aprobó X, pero se le paga Y)
- Problemas legales y fiscales
- Imposible auditar qué se autorizó

### Causa Raíz
Los montos en solicitud se recalculan dinámicamente en lugar de estar almacenados.

### Solución Técnica

**Paso 1: Garantizar que solicitudes_pago GUARDA todos los montos**

```typescript
// types/solicitud-pago.ts - ACTUALIZAR
export interface SolicitudPago {
  // ... campos existentes ...
  
  // ✅ GUARDAR ESTOS (NO recalcular después)
  conceptos_detalle: ConceptoSolicitud[];  // Array con cantidades, precios, importes
  
  // Montos guarnecer (del momento de requisición)
  subtotal_calculo: DECIMAL;        // Suma de importes - sin descuentos
  amortizacion_aplicada: DECIMAL;   // $ de amortización (anticipo)
  retencion_aplicada: DECIMAL;      // $ de retención ordinaria (5% fondo)
  retenciones_esp_aplicadas: DECIMAL;  // $ retenciones especiales aplicadas
  retenciones_esp_regresadas: DECIMAL; // $ retenciones especiales regresadas
  deducciones_extras_total: DECIMAL;   // $ de deducciones extra
  subtotal_descuentos: DECIMAL;     // subtotal_calculo - amortizacion - retencion - deducciones
  iva_monto: DECIMAL;               // $ de IVA (si aplica)
  total_final: DECIMAL;             // Total a pagar
  
  // Meta
  caratura_generada: BOOLEAN;       // Si se generó carátula
  caratura_url: TEXT;               // URL de carátula en PDF
  caratura_firmada: BOOLEAN;        // Si está firmada por Finanzas + Desarrolladora
  caratura_bloqueada: BOOLEAN;      // Una vez firmada, no se puede recalcular
}
```

**Paso 2: Al crear solicitud, COPIAR valores de requisición**

```typescript
// services/solicitudPagoService.ts
async function crearSolicitudDesdeRequisicion(requisicion_id: string) {
  // 1. Obtener requisición
  const requisicion = await obtenerRequisicion(requisicion_id);
  
  // 2. Crear solicitud con copia de montos (NO CALCULAR)
  const solicitud = {
    requisicion_id,
    folio: generarFolio('SOL'),
    
    // COPIAR DIRECTAMENTE DE REQUISICIÓN
    conceptos_detalle: requisicion.conceptos,  // Mismo array
    subtotal_calculo: requisicion.monto_estimado,
    amortizacion_aplicada: requisicion.amortizacion,
    retencion_aplicada: requisicion.retencion,
    retenciones_esp_aplicadas: requisicion.retenciones_aplicadas || 0,
    retenciones_esp_regresadas: requisicion.retenciones_regresadas || 0,
    deducciones_extras_total: requisicion.otros_descuentos || 0,
    subtotal_descuentos: requisicion.subtotal,
    iva_monto: requisicion.iva,
    total_final: requisicion.total,
    
    // Control
    caratura_bloqueada: false,
    estado: 'pendiente',
    // ... otros campos ...
  };
  
  return await insertarSolicitud(solicitud);
}
```

**Paso 3: Función para MOSTRAR (no recalcular)**

```typescript
// services/caraturaPagoService.ts
async function obtenerCaraturaParaMostrar(solicitud_id: string) {
  // Obtener solicitud con montos guardados
  const solicitud = await obtenerSolicitud(solicitud_id);
  
  // DEVOLVER MONTOS GUARDADOS
  return {
    solicitud_id,
    folio: solicitud.folio,
    fecha: solicitud.fecha,
    proyecto: solicitud.proyecto,
    contrato: solicitud.contrato,
    contratista: solicitud.contratista,
    
    // Conceptos CON MONTOS ORIGINALES
    conceptos: solicitud.conceptos_detalle,  // SIN RECALCULAR
    
    // Desglose GUARDADO
    subtotal: solicitud.subtotal_calculo,
    amortizacion: {
      porcentaje: solicitud.amortizacion_porcentaje,  // Guardar %
      monto: solicitud.amortizacion_aplicada
    },
    retencion: {
      porcentaje: solicitud.retencion_porcentaje,  // Guardar %
      monto: solicitud.retencion_aplicada
    },
    retenciones_especiales: {
      aplicadas: solicitud.retenciones_esp_aplicadas,
      regresadas: solicitud.retenciones_esp_regresadas
    },
    deducciones_extras: solicitud.deducciones_extras_total,
    subtotal_descuentos: solicitud.subtotal_descuentos,
    iva: {
      aplica: solicitud.lleva_iva,
      monto: solicitud.iva_monto
    },
    total: solicitud.total_final,
    
    // Control
    bloqueada: solicitud.caratura_bloqueada,
    puede_recalcular: !solicitud.caratura_bloqueada,
    aprobaciones: {
      gerencia: solicitud.vobo_gerencia,
      desarrolladora: solicitud.vobo_desarrollador,
      finanzas: solicitud.vobo_finanzas
    },
    firmada_por: solicitud.caratura_firmada ? 
      [solicitud.vobo_finanzas_por, solicitud.vobo_desarrollador_por] : null
  };
}
```

**Paso 4: Bloquear cambios una vez aprobada**

```typescript
// Cuando se aprueba la solicitud
async function aprobarSolicitud(solicitud_id: string, por: 'gerencia' | 'desarrolladora' | 'finanzas') {
  const solicitud = await obtenerSolicitud(solicitud_id);
  
  // Actualizar aprobación correspondiente
  const update = {
    [`vobo_${por}`]: true,
    [`vobo_${por}_por`]: auth.currentUser.id,
    [`vobo_${por}_fecha`]: new Date(),
  };
  
  // Si tiene TODAS las aprobaciones
  if (solicitud.vobo_gerencia && solicitud.vobo_desarrolladora && solicitud.vobo_finanzas) {
    update.caratura_bloqueada = true;  // ✅ BLOQUEAR RECÁLCULOS
  }
  
  return await actualizarSolicitud(solicitud_id, update);
}
```

### Pasos de Implementación

1. ✅ Actualizar schema de `solicitudes_pago` para guardar montos
2. ✅ Actualizar función de creación de solicitud (copiar en lugar de calcular)
3. ✅ Actualizar vista de carátula (mostrar guardado, no recalcular)
4. ✅ Agregar lógica de bloqueo
5. ✅ Crear migración en Supabase

### Testing
- [ ] Crear solicitud, aprob, luego reabrir → debe ser idéntico
- [ ] Intentar cambiar contrato después de aprobación → debe ser inmodificable
- [ ] Verificar PDF generado muestra valores guardados

---

## 🔴 PROBLEMA #2: AMORTIZACIÓN DE ANTICIPO INCONSISTENTE

### Descripción
El contrato original tenía 30% de anticipo. Se hizo una aditiva. ¿Ahora es 30% del monto original o del nuevo?

### Impacto
- ⚠️ **CRÍTICO:** Se pueden pagar cantidades incorrectas de amortización
- Confusión en pagos
- Discrepancias en estados de cuenta

### Causa Raíz
No se guarda el % de amortización EN CADA REQUISICIÓN, se calcula dinámicamente.

### Solución Técnica

**Paso 1: En tabla requisiciones_pago, guardar amortización**

```typescript
// types/requisicion-pago.ts
export interface RequisicionPago {
  // ... campos existentes ...
  
  // ✅ GUARDAR ESTOS (no calcular después)
  amortizacion_porcentaje: number;  // % de amortización (ej: 30)
  amortizacion_monto: number;       // $ de amortización (% del contrato vigente)
  
  // Metadata: cómo se calculó
  amortizacion_base_contrato: number;  // Monto del contrato usado como base
  amortizacion_metodo: 'PORCENTAJE_CONTRATO' | 'PORCENTAJE_REQUISICION' | 'MONTO_FIJO';
}
```

**Paso 2: En cambios_contrato, permitir cambiar amortización**

```typescript
// types/cambio-contrato.ts
export interface CambioContrato {
  // ... campos existentes ...
  
  // ✅ Nuevo: cambiar términos de pago
  cambio_amortizacion?: boolean;           // Si cambia amortización
  amortizacion_porcentaje_anterior?: number;  // % anterior
  amortizacion_porcentaje_nuevo?: number;     // % nuevo
  
  // Ejemplo: Cambio ADITIVA que también cambia amortización
  // "Aditiva por $100k, y amortización baja de 30% a 20%"
}
```

**Paso 3: Función para calcular amortización AL CREAR REQUISICIÓN**

```typescript
// services/requisicionPagoService.ts
async function calcularAmortizacion(contrato_id: string) {
  // 1. Obtener contrato actual (con todos sus cambios aplicados)
  const contrato = await obtenerContratoConCambios(contrato_id);
  
  // 2. Obtener última amortización conocida del contrato
  const ultimaCambio = await obtenerUltimoCambioAmortizacion(contrato_id);
  
  const amortizacion = ultimaCambio 
    ? ultimaCambio.amortizacion_porcentaje_nuevo
    : contrato.anticipo_porcentaje;  // Original
  
  // 3. Calcular monto
  const montoBase = contrato.monto_contrato_actual;  // Con cambios aplicados
  const montoAmortizacion = (montoBase * amortizacion) / 100;
  
  return {
    porcentaje: amortizacion,
    monto: montoAmortizacion,
    base: montoBase,
    metodo: 'PORCENTAJE_CONTRATO'
  };
}

async function crearRequisicion(datos: RequisicionPagoInput) {
  // ... lógica existente ...
  
  // Calcular amortización EN ESTE MOMENTO
  const amortizacion = await calcularAmortizacion(datos.contrato_id);
  
  // Guardar
  const requisicion = {
    ...datos,
    amortizacion_porcentaje: amortizacion.porcentaje,
    amortizacion_monto: amortizacion.monto,
    amortizacion_base_contrato: amortizacion.base,
    amortizacion_metodo: amortizacion.metodo,
    // ... otros campos ...
  };
  
  return await insertarRequisicion(requisicion);
}
```

### Pasos de Implementación

1. ✅ Actualizar tipos para guardar amortización
2. ✅ Agregar campos a tabla requisiciones_pago
3. ✅ Crear función de cálculo
4. ✅ Actualizar lógica de creación de requisición
5. ✅ Crear migración

### Testing
- [ ] Crear requisición antes de cambio, guardar % y monto
- [ ] Hacer aditiva que cambia amortización
- [ ] Crear nueva requisición, verificar que usa nuevo %
- [ ] Historial de requisiciones debe mostrar amortización de cada una

---

## 🔴 PROBLEMA #3: RETENCIONES ESPECIALES NO BIEN MANEJADAS

### Descripción
Hay retenciones ordinarias (5% fondo de garantía) y retenciones especiales que se aplican y regresan. Sistema no distingue bien.

### Impacto
- ⚠️ **CRÍTICO:** Se pierden montos retenidos
- Contratistas no saben cuánto se les debe devolver
- Imposible auditar retenciones

### Causa Raíz
No hay tabla específica para rastrea retenciones aplicadas/regresadas por requisición.

### Solución Técnica

**Paso 1: Crear tabla para desglose de retenciones**

```sql
-- Tabla auxiliar: Desglose de retenciones por requisición
CREATE TABLE IF NOT EXISTS requisicion_retenciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicion_id UUID REFERENCES requisiciones_pago(id) ON DELETE CASCADE,
  
  -- Tipo de retención
  tipo TEXT NOT NULL,  -- 'FONDO_GARANTIA', 'GARANTIA_TERMINACION', 'OTRA'
  descripcion TEXT,
  
  -- Montos
  monto_retenido DECIMAL(15,2),    -- $ que se retiene
  modo VARCHAR(10),                 -- 'APLICAR' (resta) o 'REGRESAR' (suma)
  
  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_requisicion_retenciones_requisicion_id 
  ON requisicion_retenciones(requisicion_id);
```

**Paso 2: En requisiciones_pago, referencia a retenciones**

```typescript
// types/requisicion-pago.ts
export interface RequisicionPago {
  // ... campos existentes ...
  
  // Retención ordinaria (fondo de garantía)
  retencion_ordinaria_porcentaje: number;   // % (ej: 5)
  retencion_ordinaria_monto: number;        // $ calculado
  
  // Retenciones especiales (guardadas en tabla relacionada)
  retenciones_especiales_ids: string[];  // IDs de requisicion_retenciones
  
  // Totales
  total_retenciones_aplicadas: number;   // Suma de todas las APLICAR
  total_retenciones_regresadas: number;  // Suma de todas las REGRESAR
}
```

**Paso 3: Función para agregar retenciones a requisición**

```typescript
// services/retencionService.ts
async function agregarRetencionEspecialARequisicion(
  requisicion_id: string,
  tipo: string,
  monto: number,
  modo: 'APLICAR' | 'REGRESAR',
  descripcion?: string
) {
  // 1. Insertar en tabla requisicion_retenciones
  const retencion = await insertarRequisicionRetencion({
    requisicion_id,
    tipo,
    descripcion,
    monto_retenido: monto,
    modo
  });
  
  // 2. Actualizar requisicion_pago
  const requisicion = await obtenerRequisicion(requisicion_id);
  
  // Agregar ID a array
  const nuevas_ids = [...(requisicion.retenciones_especiales_ids || []), retencion.id];
  
  // Recalcular totales
  const retencionesEspeciales = await obtenerRetencionesDe Requisicion(requisicion_id);
  const totalAplicadas = retencionesEspeciales
    .filter(r => r.modo === 'APLICAR')
    .reduce((sum, r) => sum + r.monto_retenido, 0);
  const totalRegresadas = retencionesEspeciales
    .filter(r => r.modo === 'REGRESAR')
    .reduce((sum, r) => sum + r.monto_retenido, 0);
  
  // Actualizar requisición
  await actualizarRequisicion(requisicion_id, {
    retenciones_especiales_ids: nuevas_ids,
    retenciones_aplicadas: totalAplicadas,
    retenciones_regresadas: totalRegresadas,
    subtotal: calcularSubtotal(requisicion),
    iva: calcularIVA(requisicion),
    total: calcularTotal(requisicion)
  });
}
```

**Paso 4: Vista para ver historial de retenciones por contrato**

```sql
CREATE VIEW vw_historial_retenciones_contrato AS
SELECT 
  c.id as contrato_id,
  c.numero_contrato,
  rp.id as requisicion_id,
  rp.numero as requisicion_numero,
  rr.tipo,
  rr.descripcion,
  rr.monto_retenido,
  rr.modo,
  rr.created_at,
  
  -- Acumulado hasta esta requisición
  SUM(CASE WHEN rr.modo = 'APLICAR' THEN rr.monto_retenido ELSE 0 END) 
    OVER (PARTITION BY c.id, rr.tipo ORDER BY rp.fecha) as acumulado_aplicado,
  SUM(CASE WHEN rr.modo = 'REGRESAR' THEN rr.monto_retenido ELSE 0 END) 
    OVER (PARTITION BY c.id, rr.tipo ORDER BY rp.fecha) as acumulado_regresado
FROM contratos c
JOIN requisiciones_pago rp ON c.id = rp.contrato_id
JOIN requisicion_retenciones rr ON rp.id = rr.requisicion_id
ORDER BY c.id, rp.fecha, rr.created_at;
```

### Pasos de Implementación

1. ✅ Crear tabla requisicion_retenciones
2. ✅ Actualizar tipos requisicion-pago
3. ✅ Crear servicio para gestionar retenciones
4. ✅ Crear vista de historial
5. ✅ UI para ver retenciones especiales

### Testing
- [ ] Agregar retención especial APLICAR, debe aparecer en subtotal
- [ ] Agregar retención especial REGRESAR, debe sumarse a total
- [ ] Vista de historial muestra acumulado correcto
- [ ] Al pagar, registrar retención como "regresada"

---

## 🔴 PROBLEMA #4: PAGO PARCIAL NO BIEN MANEJADO

### Descripción
Si se paga solo ALGUNOS de los conceptos solicitados, no se actualiza correctamente cantidad_pagada_anterior ni se libera lo no pagado.

### Impacto
- ⚠️ **ALTO:** Conceptos quedan "perdidos"
- Contratista no puede re-requisitar lo no pagado
- Estados de cuenta incorrectos

### Causa Raíz
No hay mecanismo para especificar "qué conceptos se pagaron" en pagos parciales.

### Solución Técnica

**Paso 1: Actualizar tabla pagos_realizados para soporte parcial**

```typescript
// types/pago-realizado.ts
export interface PagoRealizado {
  // ... campos existentes ...
  
  // Pago parcial
  es_pago_parcial: boolean;        // Si es parcial
  concepto_contrato_id: string;    // ID del concepto específico
  cantidad_pagada_concepto: number; // Cantidad pagada de ESTE concepto
  cantidad_pendiente_concepto: number; // Cantidad que falta pagar
  
  // Cálculo por concepto
  cantidad_requisitada: number;    // Total que se requisitó
  cantidad_pagada: number;         // Lo que se pagó ahora
  cantidad_quedar_pendiente: number; // Lo que queda pendiente
}
```

**Paso 2: Función para registrar pago parcial**

```typescript
// services/pagoService.ts
async function registrarPagoParcial(solicitud_id: string, conceptosPagados: {
  concepto_id: string;
  cantidad_pagada: number;
  comprobante_url: string;
}[]) {
  // 1. Obtener solicitud
  const solicitud = await obtenerSolicitud(solicitud_id);
  
  // 2. Para CADA concepto pagado
  for (const pago of conceptosPagados) {
    // Obtener concepto del array
    const conceptoEnSolicitud = solicitud.conceptos_detalle.find(
      c => c.concepto_id === pago.concepto_id
    );
    
    if (!conceptoEnSolicitud) continue;
    
    // 3. Calcular cantidad pendiente
    const cantidadPendiente = conceptoEnSolicitud.cantidad - pago.cantidad_pagada;
    
    // 4. Registrar pago individual
    const pagoRealizado = {
      solicitud_pago_id: solicitud_id,
      requisicion_pago_id: solicitud.requisicion_id,
      contrato_id: solicitud.contrato_id,
      concepto_contrato_id: pago.concepto_id,
      
      // Cantidades
      cantidad_requisitada: conceptoEnSolicitud.cantidad,
      cantidad_pagada: pago.cantidad_pagada,
      cantidad_pendiente_concepto: cantidadPendiente,
      es_pago_parcial: true,
      
      // Montos (prorrateo)
      importe_concepto: conceptoEnSolicitud.importe,
      precio_unitario: conceptoEnSolicitud.precio_unitario,
      importe_pagado: (pago.cantidad_pagada / conceptoEnSolicitud.cantidad) * 
                      conceptoEnSolicitud.importe,
      
      // Otros
      comprobante_pago_url: pago.comprobante_url,
      fecha_pago: new Date(),
      estatus: 'PAGADO'
    };
    
    await insertarPagoRealizado(pagoRealizado);
  }
  
  // 5. Actualizar requisición
  await actualizarRequisicion(solicitud.requisicion_id, {
    estatus_pago: 'PAGADO PARCIALMENTE',
    // ... fecha última actualización ...
  });
  
  // 6. LIBERAR cantidades no pagadas
  for (const pago of conceptosPagados) {
    const cantidadPendiente = /* calcular como arriba */;
    
    // Actualizar cantidad_pagada_anterior en concepto del catálogo
    await actualizarConceptoContrato(pago.concepto_id, {
      cantidad_pagada_anterior: MANTENER IGUAL  // NO actualizar aún
    });
    
    // Crear "nota" para contratista: puede re-requisitar X cantidad
    // (Implementar en siguiente requisición, el sistema calcula disponible)
  }
}
```

**Paso 3: Función para calcular disponible en requisición siguiente**

```typescript
// En al crear nueva requisición
async function obtenerDisponibleConcepto(
  concepto_contrato_id: string,
  contrato_id: string
) {
  // 1. Obtener concepto del catálogo
  const concepto = await obtenerConcepto(concepto_contrato_id);
  
  // 2. Obtener TODAS las requisiciones de este contrato
  const requisiciones = await obtenerRequisicionesDelContrato(contrato_id);
  
  // 3. Para este concepto, sumar TODAS las cantidades requisitadas
  let cantidadTotalRequisitada = 0;
  for (const req of requisiciones) {
    const conceptoEnReq = req.conceptos.find(c => c.concepto_contrato_id === concepto_contrato_id);
    if (conceptoEnReq) {
      cantidadTotalRequisitada += conceptoEnReq.cantidad_esta_requisicion;
    }
  }
  
  // 4. Restar de cantidad en catálogo
  const disponible = concepto.cantidad_catalogo - cantidadTotalRequisitada;
  
  return disponible;
}
```

### Pasos de Implementación

1. ✅ Actualizar tipos de pagos_realizados
2. ✅ Crear función de pago parcial
3. ✅ Crear función de cálculo de disponible
4. ✅ UI para seleccionar conceptos a pagar (en requisición)
5. ✅ UI para ver cantidad disponible en catálogo

### Testing
- [ ] Requisición con 3 conceptos, pagar solo 2
- [ ] Cantidad de concepto no pagado debe estar disponible
- [ ] Nueva requisición muestra disponible correcto
- [ ] Estado de cuenta muestra cantidad pendiente

---

## 🔴 PROBLEMA #5: IVA NO CONSISTENTE

### Descripción
No está claro qué conceptos llevan IVA, se calcula inconstantemente.

### Impacto
- ⚠️ **ALTO:** Montos incorrectos en facturas
- Inconsistencia fiscal
- Problemas con CFDI

### Causa Raíz
Campo `tratamiento` en contrato no se propaga a requisiciones/solicitudes.

### Solución Técnica

**Paso 1: Actualizar requisiciones_pago**

```typescript
// types/requisicion-pago.ts
export interface RequisicionPago {
  // ... campos existentes ...
  
  tratamiento_iva: 'IVA EXENTO' | 'MAS IVA' | 'IVA TASA 0';
  lleva_iva: boolean;  // True si 'MAS IVA'
  
  // Cálculo de IVA
  subtotal_sin_iva: number;        // Suma de importes
  iva_porcentaje: number;          // 16 o 0
  iva_monto: number;               // subtotal_sin_iva × iva_porcentaje / 100
  total_con_iva: number;           // subtotal_sin_iva + iva_monto
}
```

**Paso 2: Al crear requisición, copiar tratamiento de contrato**

```typescript
// services/requisicionPagoService.ts
async function crearRequisicion(datos: RequisicionPagoInput) {
  // Obtener contrato
  const contrato = await obtenerContrato(datos.contrato_id);
  
  const tratamiento = contrato.tratamiento || 'MAS IVA';  // Default
  const lleva_iva = tratamiento === 'MAS IVA';
  const iva_porcentaje = lleva_iva ? 16 : 0;
  
  // Calcular montos
  const subtotal_sin_iva = datos.conceptos.reduce((sum, c) => sum + c.importe, 0);
  const iva_monto = (subtotal_sin_iva * iva_porcentaje) / 100;
  const total_con_iva = subtotal_sin_iva + iva_monto;
  
  // Guardar todo
  const requisicion = {
    ...datos,
    tratamiento_iva: tratamiento,
    lleva_iva,
    iva_porcentaje,
    subtotal_sin_iva,
    iva_monto,
    total_con_iva,
    // ... otros campos ...
  };
  
  return await insertarRequisicion(requisicion);
}
```

**Paso 3: Función para cambiar IVA si se modifica contrato**

```typescript
// En cambios_contrato, permitir cambiar tratamiento
export interface CambioContrato {
  // ... campos existentes ...
  cambio_iva?: boolean;
  tratamiento_anterior?: TratamientoIVA;
  tratamiento_nuevo?: TratamientoIVA;
}

// Al aplicar cambio
async function aplicarCambioContrato(cambio_id: string) {
  const cambio = await obtenerCambio(cambio_id);
  const contrato = await obtenerContrato(cambio.contrato_id);
  
  if (cambio.cambio_iva && cambio.tratamiento_nuevo) {
    // Actualizar contrato
    await actualizarContrato(contrato.id, {
      tratamiento: cambio.tratamiento_nuevo
    });
    
    // Nota: Requisiciones futuras usarán nuevo tratamiento
    // Requisiciones pasadas quedan con su tratamiento guardado (auditoría)
  }
}
```

### Pasos de Implementación

1. ✅ Actualizar tipos
2. ✅ Actualizar lógica de creación de requisición
3. ✅ Permitir cambio de IVA en cambios_contrato
4. ✅ Documentar: "el IVA se copia del contrato en requisición"
5. ✅ Testing

### Testing
- [ ] Contrato CON IVA → requisición debe calcular IVA
- [ ] Contrato SIN IVA → requisición no debe tener IVA
- [ ] Cambiar contrato a SIN IVA → siguiente requisición sin IVA
- [ ] Requisiciones previas mantienen su IVA (auditoría)

---

## 🟡 PROBLEMA #6: SINCRONIZACIÓN OFFLINE INCOMPLETA

### Descripción
Dexie (IndexedDB) puede perder datos o divergir entre dispositivos.

### Impacto
- 🔶 **MEDIO:** Datos inconsistentes en equipos offline
- Sincronización puede sobrescribir cambios

### Causa Raíz
Estrategia de sync incompleta, sin mecanismo de conflicto claro.

### Solución Técnica

**Paso 1: Revisar syncService.ts**

```typescript
// src/sync/syncService.ts - Actualizar

export async function syncDataFromSupabase() {
  // Estrategia: Last-Write-Wins (LWW)
  // Si dato es más nuevo en Supabase, toma precedencia
  
  const tables = [
    'contratos',
    'conceptos_contrato',
    'requisiciones_pago',
    'solicitudes_pago',
    'pagos_realizados',
    // ...
  ];
  
  for (const table of tables) {
    const remoteData = await supabase
      .from(table)
      .select('*')
      .gt('updated_at', lastSyncTime);  // Solo cambios recientes
    
    for (const record of remoteData) {
      const local = await db.table(table).get(record.id);
      
      if (!local) {
        // No existe localmente → crear
        await db.table(table).add(record);
      } else if (new Date(record.updated_at) > new Date(local.updated_at)) {
        // Remote es más nuevo → actualizar
        await db.table(table).update(record.id, record);
      } else {
        // Local es más nuevo → marcar como dirty para enviar después
        await db.table(table).update(record.id, { _dirty: true });
      }
    }
  }
  
  // Actualizar último sync
  await saveLastSyncTime(new Date());
}

export async function pushDirtyDataToSupabase() {
  // Enviar cambios locales
  const tables = [/* ... */];
  
  for (const table of tables) {
    const dirty = await db.table(table).where('_dirty').equals(true).toArray();
    
    for (const record of dirty) {
      try {
        // Validar que no hay conflicto (last-write-wins)
        const remote = await supabase
          .from(table)
          .select('updated_at')
          .eq('id', record.id)
          .single();
        
        if (remote && new Date(remote.updated_at) > new Date(record.updated_at)) {
          // Conflicto: Remote es más nuevo
          // Opción 1: Descartar local
          await db.table(table).delete(record.id);
          // Opción 2: O guardar como conflicto para revisión manual
          console.warn(`Conflict in ${table}/${record.id}, keeping remote`);
        } else {
          // No hay conflicto → enviar
          const { data, error } = await supabase
            .from(table)
            .upsert([record], { onConflict: 'id' });
          
          if (!error) {
            await db.table(table).update(record.id, { _dirty: false, last_sync: new Date().toISOString() });
          }
        }
      } catch (err) {
        console.error(`Error pushing ${table}/${record.id}:`, err);
        // Mantener _dirty = true para reintentar
      }
    }
  }
}
```

**Paso 2: Crear tabla de log de sync**

```sql
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  tabla TEXT NOT NULL,
  registro_id UUID NOT NULL,
  operacion VARCHAR(10),  -- PUSH, PULL, CONFLICT
  
  resultado VARCHAR(20),  -- SUCCESS, CONFLICT, ERROR
  conflicto_razon TEXT,
  
  usuario_id UUID REFERENCES auth.users(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  dispositivo TEXT,       -- Identificador del dispositivo
  app_version TEXT
);

CREATE INDEX idx_sync_log_timestamp ON sync_log(timestamp DESC);
CREATE INDEX idx_sync_log_usuario ON sync_log(usuario_id, timestamp DESC);
```

**Paso 3: Mecanismo de conflicto manual**

```typescript
// Si hay conflicto, permitir revisión manual
export interface ConflictoSync {
  tabla: string;
  registro_id: string;
  valor_local: any;
  valor_remoto: any;
  updated_local: string;
  updated_remoto: string;
  resolucion: 'USAR_LOCAL' | 'USAR_REMOTO' | 'FUSIONAR';
}

export async function resolverConflicto(conflicto: ConflictoSync) {
  let valor_final;
  
  switch (conflicto.resolucion) {
    case 'USAR_LOCAL':
      valor_final = conflicto.valor_local;
      valor_final.updated_at = new Date().toISOString();
      break;
    case 'USAR_REMOTO':
      valor_final = conflicto.valor_remoto;
      break;
    case 'FUSIONAR':
      valor_final = { ...conflicto.valor_remoto, ...conflicto.valor_local };
      valor_final.updated_at = new Date().toISOString();
      break;
  }
  
  // Actualizar local
  await db.table(conflicto.tabla).update(conflicto.registro_id, valor_final);
  
  // Actualizar remoto
  await supabase
    .from(conflicto.tabla)
    .update(valor_final)
    .eq('id', conflicto.registro_id);
  
  // Registrar en log
  await insertarSyncLog({
    tabla: conflicto.tabla,
    registro_id: conflicto.registro_id,
    operacion: 'CONFLICT_RESOLVED',
    resultado: 'SUCCESS',
    resolucion: conflicto.resolucion
  });
}
```

### Pasos de Implementación

1. ✅ Actualizar syncService.ts
2. ✅ Crear tabla sync_log
3. ✅ Implementar mecanismo de conflicto
4. ✅ UI para ver log de sync
5. ✅ Testing offline

### Testing
- [ ] Editar dato offline, sincronizar online
- [ ] Editar mismo dato en 2 dispositivos, ver conflicto
- [ ] Resolver conflicto, verificar estado final

---

## Continuará...

Este documento tiene **8 problemas** pero el formato limita el espacio. Los problemas 7 y 8 están en archivo complementario.

Resumen de los 6 problemas cubiertos:
1. ✅ Carátula se recalcula diferente
2. ✅ Amortización inconsistente
3. ✅ Retenciones especiales mal manejadas
4. ✅ Pago parcial no bien registrado
5. ✅ IVA inconsistente
6. ✅ Sincronización offline incompleta

Problemas pendientes:
7. ⏳ Supabase está desorganizado
8. ⏳ Caratula de pago incompleta

