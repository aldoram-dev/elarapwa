# CHECKLIST DE IMPLEMENTACIÓN: Administración de Obra

**Objetivo:** Validar que cada problema está resuelto  
**Actualizado:** 27 de Enero de 2026  
**Responsable:** Equipo de Desarrollo  

---

## ✅ FASE 1: DATOS (Semana 1-2)

### ✅ Problema #1: Carátula se recalcula diferente (IMPLEMENTADO - 27 Ene 2026)

**Objetivo:** Guardar montos en solicitud, no recalcular al abrir

#### Backend ✅
- [x] Actualizar `types/solicitud-pago.ts`
  - [x] Agregar `subtotal_calculo: DECIMAL`
  - [x] Agregar `amortizacion_porcentaje: DECIMAL`
  - [x] Agregar `amortizacion_aplicada: DECIMAL`
  - [x] Agregar `retencion_porcentaje: DECIMAL`
  - [x] Agregar `retencion_ordinaria_aplicada: DECIMAL`
  - [x] Agregar `retenciones_esp_aplicadas: DECIMAL`
  - [x] Agregar `retenciones_esp_regresadas: DECIMAL`
  - [x] Agregar `tratamiento_iva: TEXT`
  - [x] Agregar `iva_porcentaje: DECIMAL`
  - [x] Agregar `caratura_generada: BOOLEAN`
  - [x] Agregar `caratura_bloqueada: BOOLEAN`
  - [x] Agregar `fecha_bloqueo_caratura: TIMESTAMPTZ`

- [x] Actualizar `types/requisicion-pago.ts`
  - [x] Agregar `amortizacion_porcentaje: DECIMAL`
  - [x] Agregar `amortizacion_base_contrato: DECIMAL`
  - [x] Agregar `amortizacion_metodo: ENUM`
  - [x] Agregar `retencion_ordinaria_porcentaje: DECIMAL`
  - [x] Agregar `tratamiento_iva: TEXT`
  - [x] Agregar `iva_porcentaje: DECIMAL`

- [x] Crear migraciones SQL
  - [x] `20240101000000_add_frozen_fields_requisiciones.sql`
  - [x] `20240101000001_add_frozen_fields_solicitudes.sql`

- [x] Actualizar componente de requisiciones
  - [x] `RequisicionPagoForm.tsx`: GUARDAR valores calculados
  - [x] Guardar porcentajes y método de cálculo
  - [x] Log de valores congelados guardados

- [x] Actualizar componente de solicitudes
  - [x] `SolicitudPagoForm.tsx`: COPIAR valores (no recalcular)
  - [x] Calcular proporción para solicitudes parciales
  - [x] Log de valores copiados vs recalculados

#### Frontend (Pendiente)
- [ ] Componente de solicitud
  - [ ] No mostrar cálculos dinámicos
  - [ ] Solo mostrar valores guardados
  - [ ] Mostrar "BLOQUEADA" si `caratura_bloqueada = true`

- [ ] Componente de carátula
  - [ ] No permitir editar si está bloqueada
  - [ ] Mostrar exactamente lo guardado
  - [ ] Mensaje: "Esta carátula está bloqueada para proteger el pago autorizado"

#### Testing (Pendiente)
- [ ] Crear requisición con montos específicos
- [ ] Crear solicitud desde requisición
- [ ] Cambiar contrato después de crear solicitud
- [ ] Verificar: Montos de solicitud NO cambiaron
- [ ] Abrir carátula 10 veces → siempre igual
- [ ] Aprobar solicitud
- [ ] Verificar: `caratura_bloqueada = true`
- [ ] Intentar modificar después → ERROR

---

### Problema #2: Amortización de anticipo inconsistente

**Objetivo:** Guardar % y $ de amortización por requisición

#### Backend
- [ ] Actualizar `types/requisicion-pago.ts`
  - [ ] Agregar `amortizacion_porcentaje: DECIMAL`
  - [ ] Agregar `amortizacion_monto: DECIMAL`
  - [ ] Agregar `amortizacion_base_contrato: DECIMAL` (para auditoría)
  - [ ] Agregar `amortizacion_metodo: ENUM` ('PORCENTAJE_CONTRATO', 'MONTO_FIJO')

- [ ] Crear migración SQL
  ```sql
  ALTER TABLE requisiciones_pago ADD COLUMN amortizacion_porcentaje DECIMAL(5,2);
  ALTER TABLE requisiciones_pago ADD COLUMN amortizacion_monto DECIMAL(15,2);
  ALTER TABLE requisiciones_pago ADD COLUMN amortizacion_base_contrato DECIMAL(15,2);
  ALTER TABLE requisiciones_pago ADD COLUMN amortizacion_metodo VARCHAR(30);
  ```

- [ ] Función: `calcularAmortizacion(contrato_id)`
  - [ ] Obtener último cambio de amortización
  - [ ] Obtener monto actual del contrato
  - [ ] Calcular: monto × porcentaje
  - [ ] Devolver: { porcentaje, monto, base, metodo }

- [ ] Actualizar `crearRequisicion()`
  - [ ] Llamar a `calcularAmortizacion()`
  - [ ] Guardar % y $ (no solo %)

#### Frontend
- [ ] Formulario de requisición
  - [ ] Mostrar % de amortización actual
  - [ ] Mostrar $ calculado
  - [ ] Mostrar histórico de cambios de amortización

#### Testing
- [ ] Crear requisición: verificar amortización guardada
- [ ] Hacer aditiva que cambia monto
- [ ] Crear nueva requisición: verificar que usa nuevo monto
- [ ] Historial muestra diferentes amortizaciones por requisición
- [ ] Auditoría: "El 30% se aprobó el 1/1, cambió a 20% el 1/8"

---

### Problema #5: IVA no consistente

**Objetivo:** Guardar tratamiento de IVA por requisición

#### Backend
- [ ] Actualizar `types/requisicion-pago.ts`
  - [ ] Agregar `tratamiento_iva: ENUM` ('IVA EXENTO', 'MAS IVA', 'IVA TASA 0')
  - [ ] Agregar `lleva_iva: BOOLEAN`
  - [ ] Agregar `iva_porcentaje: DECIMAL`

- [ ] Crear migración SQL
  ```sql
  ALTER TABLE requisiciones_pago ADD COLUMN tratamiento_iva VARCHAR(20);
  ALTER TABLE requisiciones_pago ADD COLUMN iva_porcentaje DECIMAL(5,2);
  ```

- [ ] Actualizar `crearRequisicion()`
  - [ ] Copiar `tratamiento_iva` de contrato
  - [ ] Calcular `lleva_iva = (tratamiento_iva === 'MAS IVA')`
  - [ ] Guardar `iva_porcentaje` (16 o 0)

#### Frontend
- [ ] Mostrar claramente si lleva IVA o no
- [ ] Mostrar % de IVA
- [ ] En carátula: "IVA 16%" o "EXENTO" claramente

#### Testing
- [ ] Contrato MAS IVA → requisición calcula 16%
- [ ] Contrato EXENTO → requisición sin IVA
- [ ] Cambiar contrato a EXENTO → siguiente requisición sin IVA
- [ ] Requisiciones previas mantienen su IVA

---

## ✅ FASE 2: CAMBIOS (Semana 2-3)

### Problema #3: Retenciones especiales no rastreadas

**Objetivo:** Tabla específica para requisicion_retenciones

#### Backend
- [ ] Crear tabla `requisicion_retenciones`
  ```sql
  CREATE TABLE requisicion_retenciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisicion_id UUID REFERENCES requisiciones_pago(id),
    tipo TEXT NOT NULL,          -- 'FONDO_GARANTIA', 'GARANTIA_TERM', etc
    descripcion TEXT,
    monto_retenido DECIMAL(15,2),
    modo VARCHAR(10),            -- 'APLICAR' o 'REGRESAR'
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
  );
  CREATE INDEX idx_requisicion_retenciones_requisicion_id 
    ON requisicion_retenciones(requisicion_id);
  ```

- [ ] Actualizar `types/requisicion-pago.ts`
  - [ ] Agregar `retenciones_especiales_ids: STRING[]`
  - [ ] Agregar `retencion_ordinaria_porcentaje: DECIMAL`
  - [ ] Agregar `retencion_ordinaria_monto: DECIMAL`
  - [ ] Agregar `total_retenciones_aplicadas: DECIMAL`
  - [ ] Agregar `total_retenciones_regresadas: DECIMAL`

- [ ] Función: `agregarRetencionEspecial()`
  - [ ] Insertar en `requisicion_retenciones`
  - [ ] Actualizar array de IDs en requisición
  - [ ] Recalcular totales
  - [ ] Guardar en requisición

- [ ] Vista SQL: `vw_historial_retenciones_contrato`
  - [ ] Mostrar retenciones por contrato
  - [ ] Mostrar acumulado (aplicado/regresado)

#### Frontend
- [ ] Formulario de requisición
  - [ ] Tabla de retenciones especiales
  - [ ] Botón: Agregar retención APLICAR
  - [ ] Botón: Agregar retención REGRESAR
  - [ ] Mostrar acumulado

#### Testing
- [ ] Crear requisición con retención APLICAR
  - [ ] Debe disminuir el total
- [ ] Crear requisición con retención REGRESAR
  - [ ] Debe aumentar el total
- [ ] Vista de historial muestra acumulado correcto
- [ ] Al pagar, registrar retención como "regresada"

---

### Problema #4: Pago parcial no bien registrado

**Objetivo:** Especificar qué conceptos se pagan

#### Backend
- [ ] Actualizar `types/pago-realizado.ts`
  - [ ] Agregar `es_pago_parcial: BOOLEAN`
  - [ ] Agregar `cantidad_requisitada: DECIMAL`
  - [ ] Agregar `cantidad_pagada_concepto: DECIMAL`
  - [ ] Agregar `cantidad_pendiente_concepto: DECIMAL`

- [ ] Crear migración SQL
  ```sql
  ALTER TABLE pagos_realizados ADD COLUMN es_pago_parcial BOOLEAN;
  ALTER TABLE pagos_realizados ADD COLUMN cantidad_requisitada DECIMAL(15,4);
  ALTER TABLE pagos_realizados ADD COLUMN cantidad_pendiente_concepto DECIMAL(15,4);
  ```

- [ ] Función: `registrarPagoParcial(solicitud_id, conceptosPagados[])`
  - [ ] Para cada concepto:
    - [ ] Calcular cantidad pendiente
    - [ ] Insertar en `pagos_realizados` con `es_pago_parcial = true`
    - [ ] Actualizar requisición: `estatus_pago = 'PAGADO PARCIALMENTE'`
  - [ ] Liberar cantidad no pagada (ya disponible en siguiente requisición)

- [ ] Función: `obtenerDisponibleConcepto()`
  - [ ] Sumar TODAS las requisiciones del concepto
  - [ ] Restar de cantidad en catálogo
  - [ ] Devolver disponible

- [ ] Actualizar `conceptos_contrato`
  - [ ] `cantidad_disponible` se calcula dinámicamente
  - [ ] = cantidad_catalogo - (sum de todas las requisiciones)

#### Frontend
- [ ] Formulario de pago
  - [ ] Checkbox: "Pago parcial"
  - [ ] Si está checkeado:
    - [ ] Mostrar tabla de conceptos
    - [ ] Permitir especificar cantidad pagada por concepto
    - [ ] Mostrar cantidad pendiente
  - [ ] Si no está checkeado:
    - [ ] Pago total (automático)

- [ ] Vista de requisición
  - [ ] Mostrar cantidad disponible (en catálogo menos requisiciones)
  - [ ] Mostrar cantidad pagada
  - [ ] Mostrar cantidad pendiente

#### Testing
- [ ] Requisición con 3 conceptos
- [ ] Pago parcial: pagar solo 2 conceptos
- [ ] Verificar:
  - [ ] El 3er concepto muestra "cantidad pendiente"
  - [ ] Nueva requisición permite re-requisitar esa cantidad
- [ ] Cantidad disponible en siguiente requisición es correcta

---

## ✅ FASE 3: INFRAESTRUCTURA (Semana 3-4)

### Problema #7: Supabase desorganizado

**Objetivo:** Schema consolidado + RLS documentado

#### Backend
- [ ] Crear `supabase/schema-elara-consolidated.sql`
  - [ ] Todas las tablas en UN archivo
  - [ ] Índices estratégicos
  - [ ] Triggers para updated_at
  - [ ] Vistas para reportes

- [ ] Documentar RLS
  - [ ] Crear `docs/RLS-POLICIES.md`
  - [ ] Documentar rol ADMIN, DIRECCIÓN, FINANZAS, CONTRATISTA
  - [ ] Documentar qué puede ver/hacer cada uno

- [ ] Crear template para futuras migraciones
  - [ ] Archivo: `supabase/migrations/template.sql`
  - [ ] Incluir: comentarios, índices, RLS, triggers

- [ ] Limpiar migraciones antiguas
  - [ ] Archivar en `supabase/migrations/old/`
  - [ ] Documentar qué hizo cada una

#### Testing
- [ ] Crear proyecto nuevo desde schema consolidado
  - [ ] Todos los datos están presentes
  - [ ] Índices funcionan
  - [ ] RLS está habilitado
  - [ ] Vistas funcionan

---

### Problema #8: Carátula de pago incompleta

**Objetivo:** PDF con todos los detalles + firmas

#### Backend
- [ ] Crear tipo `CaraturaPago` (en types/)
  - [ ] Incluir: conceptos, descuentos, retenciones, IVA, total
  - [ ] Incluir: aprobaciones, firmas

- [ ] Función: `generarCaraturaPago(solicitud_id)`
  - [ ] Obtener solicitud con todos datos
  - [ ] Armar estructura `CaraturaPago`
  - [ ] COPIAR de solicitud (no recalcular)

- [ ] Función: `generarPDFCaratura(caratura)`
  - [ ] Usar librería PDF (pdfkit o similar)
  - [ ] Incluir:
    - [ ] Encabezado (folio, fecha, proyecto)
    - [ ] Datos contrato/contratista
    - [ ] Tabla de conceptos (cantidad, precio, importe)
    - [ ] Subtotal
    - [ ] Descuentos (amortización, retención)
    - [ ] Retenciones especiales
    - [ ] Deducciones extra
    - [ ] Subtotal neto
    - [ ] IVA
    - [ ] TOTAL
    - [ ] Espacios para firmas (Finanzas + Desarrolladora)
    - [ ] Fecha de impresión
    - [ ] Nota al pie

- [ ] Función: `guardarCaraturaPDF(solicitud_id)`
  - [ ] Generar PDF
  - [ ] Subir a Supabase Storage
  - [ ] Guardar URL en solicitud
  - [ ] Bloquear para no recalcular

#### Frontend
- [ ] Botón: "Descargar Carátula"
  - [ ] Genera PDF
  - [ ] Usuario puede descargar
  - [ ] Usuario puede imprimir

- [ ] Vista de carátula (en pantalla)
  - [ ] Mostrar exactamente lo del PDF
  - [ ] No permitir editar
  - [ ] Botón: "Aprobar y firmar digitalmente" (opcional)

#### Testing
- [ ] Generar carátula: verificar que muestra todos los conceptos
- [ ] Verificar que todos los descuentos están presentes
- [ ] PDF se genera sin errores
- [ ] PDF se puede descargar
- [ ] PDF se puede imprimir
- [ ] Intentar cambiar concepto después de generar PDF → ERROR

---

## ✅ FASE 4: OFFLINE (Semana 4-5)

### Problema #6: Sincronización offline incompleta

**Objetivo:** Mecanismo de conflicto robusto

#### Backend
- [ ] Actualizar `src/sync/syncService.ts`
  - [ ] Implementar `syncDataFromSupabase()`
    - [ ] Last-Write-Wins (LWW)
    - [ ] Solo cambios recientes
  - [ ] Implementar `pushDirtyDataToSupabase()`
    - [ ] Detectar conflictos
    - [ ] Registrar en log
  - [ ] Implementar `saveLastSyncTime()`

- [ ] Crear tabla `sync_log`
  ```sql
  CREATE TABLE sync_log (
    id UUID PRIMARY KEY,
    tabla TEXT,
    registro_id UUID,
    operacion VARCHAR(10),    -- PUSH, PULL, CONFLICT
    resultado VARCHAR(20),    -- SUCCESS, CONFLICT, ERROR
    conflicto_razon TEXT,
    timestamp TIMESTAMPTZ,
    dispositivo TEXT,
    app_version TEXT
  );
  CREATE INDEX idx_sync_log_timestamp ON sync_log(timestamp DESC);
  ```

- [ ] Interfaz: `ConflictoSync`
  - [ ] Incluir: tabla, registro_id, valor_local, valor_remoto
  - [ ] Incluir: timestamps, método de resolución

- [ ] Función: `resolverConflicto(conflicto)`
  - [ ] Soportar: USAR_LOCAL, USAR_REMOTO, FUSIONAR
  - [ ] Registrar en sync_log
  - [ ] Actualizar local y remoto

#### Frontend
- [ ] UI para sincronización
  - [ ] Mostrar estado: "Sincronizando...", "Sincronizado", "Error"
  - [ ] Mostrar último sync
  - [ ] Permitir sincronizar manualmente

- [ ] UI para conflictos
  - [ ] Mostrar qué conflictó
  - [ ] Mostrar valores anterior/actual
  - [ ] Permitir elegir: USAR_LOCAL, USAR_REMOTO, FUSIONAR
  - [ ] Mostrar histórico de conflictos

#### Testing
- [ ] Editar dato offline
  - [ ] Cambiar online en otra ventana
  - [ ] Sincronizar
  - [ ] Verificar que aparece conflicto
  - [ ] Resolver manual
  - [ ] Verificar estado final

- [ ] Múltiples dispositivos
  - [ ] Dispositivo A edita
  - [ ] Dispositivo B edita (offline)
  - [ ] Ambos se conectan
  - [ ] Verificar conflicto y resolución

---

## ✅ FASE 5: TESTING + GO-LIVE (Semana 5-8)

### Testing Exhaustivo

- [ ] **Test de Datos**
  - [ ] Crear contrato con todos los cambios (aditiva, deductiva, extraordinaria)
  - [ ] Crear 5 requisiciones (seguimiento semanal)
  - [ ] Crear solicitudes con pago parcial
  - [ ] Verificar que cada requisición/solicitud/pago tiene datos guardados
  - [ ] Cambiar contrato DESPUÉS de requisición → datos no cambian

- [ ] **Test de Auditoría**
  - [ ] Cada cambio está registrado
  - [ ] Se sabe quién hizo qué, cuándo y por qué
  - [ ] Estados de cuenta cuadran exacto

- [ ] **Test de Performance**
  - [ ] Con 100 contratos
  - [ ] Con 1000 requisiciones
  - [ ] Índices funcionan
  - [ ] Queries son rápidas

- [ ] **Test de RLS**
  - [ ] Contratista ve solo sus datos
  - [ ] Finanzas ve solo aprobados
  - [ ] Dirección ve su proyecto
  - [ ] Admin ve todo

- [ ] **Test Offline**
  - [ ] Editar offline, sincronizar online
  - [ ] Conflictos resuelven correctamente
  - [ ] Sin perder datos

### Documentación
- [ ] Manual de usuario (por rol)
- [ ] Guía de troubleshooting
- [ ] Procedimientos estándar
- [ ] FAQ

### Capacitación
- [ ] Sesión con Gerencia
- [ ] Sesión con Dirección
- [ ] Sesión con Finanzas
- [ ] Sesión con Contratistas

### Go-Live
- [ ] Validar último requisito
- [ ] Hacer backup de producción
- [ ] Aplicar migraciones
- [ ] Testing en producción (con datos reales)
- [ ] Habilitar acceso a usuarios
- [ ] Monitoreo 24/7 primer día
- [ ] Helpdesk disponible

---

## 📊 Checklist de Validación Final

Antes de dar por completo el proyecto:

- [ ] **Problema #1:** Carátula NO recalcula ✅
- [ ] **Problema #2:** Amortización guardada por requisición ✅
- [ ] **Problema #3:** Retenciones rastreadas ✅
- [ ] **Problema #4:** Pago parcial registrado correctamente ✅
- [ ] **Problema #5:** IVA consistente ✅
- [ ] **Problema #6:** Sincronización offline estable ✅
- [ ] **Problema #7:** Supabase consolidado y documentado ✅
- [ ] **Problema #8:** Carátula completa con firmas ✅

- [ ] **Estados de Cuenta:** Sin discrepancias
- [ ] **Auditoría:** Completa y trazable
- [ ] **Performance:** < 2 seg queries
- [ ] **RLS:** Funcionando correctamente
- [ ] **Offline:** Sincroniza sin perder datos

- [ ] **Documentación:** Completa y actualizada
- [ ] **Capacitación:** Usuarios entrenados
- [ ] **Backup:** Realizado
- [ ] **Testing:** 100% de casos cubiertos
- [ ] **Go-Live:** Aprobado

---

## 🎯 Notas

- Este checklist es **living document** - actualizar conforme avanza
- Cada ítem marcado con ✅ es evidencia de completitud
- Usar para reportes de progreso semanal
- Si algo se atasca > 3 días, escalar

