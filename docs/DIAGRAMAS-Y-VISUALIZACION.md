# Diagramas y Visualización del Flujo

---

## 🔄 FLUJO COMPLETO: PRESUPUESTO → PAGO

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ADMINISTRACIÓN DE OBRA - FLUJO PRINCIPAL                 │
└─────────────────────────────────────────────────────────────────────────────┘

FASE 1: PRESUPUESTO
═════════════════════════════════════════════════════════════════════════════
   Gerencia/Finanzas
        │
        ├─→ Crea PRESUPUESTO
        │   ├─ Cuentas (categoría-partida-subpartida)
        │   ├─ Volumetría inicial
        │   └─ Precios paramétricos
        │
        └─→ Guarda en: presupuestos
            ├─ volumetria_arranque
            ├─ pu_parametrico
            └─ presupuesto_base


FASE 2: CONTRATISTAS
═════════════════════════════════════════════════════════════════════════════
   Dirección/Admin
        │
        ├─→ Da de alta CONTRATISTA
        │   ├─ Datos bancarios
        │   ├─ RFC
        │   └─ Categoría
        │
        └─→ Guarda en: contratistas


FASE 3: CONTRATOS (NÚCLEO)
═════════════════════════════════════════════════════════════════════════════
   Dirección
        │
        ├─→ Crea CONTRATO (Header)
        │   ├─ Monto neto
        │   ├─ Anticipo (% y monto)
        │   ├─ Retención (%)
        │   ├─ Tratamiento IVA
        │   └─ Estatus: BORRADOR
        │
        ├─→ Contratista sube CATÁLOGO DE CONCEPTOS
        │   ├─ CSV/Excel/Manual
        │   └─ Cada concepto:
        │       ├─ Clave
        │       ├─ Descripción
        │       ├─ Cantidad en catálogo
        │       └─ Precio unitario
        │
        ├─→ Gerencia APRUEBA CATÁLOGO
        │   ├─ Revisa que sum = monto
        │   └─ Estatus: EN_REVISION → APROBADO
        │
        └─→ Guarda en: contratos, conceptos_contrato
            ├─ monto_contrato ← GUARDADO EN ESTE MOMENTO
            ├─ anticipo_porcentaje ← GUARDADO EN ESTE MOMENTO
            ├─ retencion_porcentaje ← GUARDADO EN ESTE MOMENTO
            └─ tratamiento_iva ← GUARDADO EN ESTE MOMENTO


FASE 3.1: CAMBIOS A CONTRATO (Opcional)
═════════════════════════════════════════════════════════════════════════════
   Dirección/Contratista
        │
        ├─→ Solicita ADITIVA (suma conceptos existentes)
        │   ├─ Concepto CON-001 tenía 100 M3
        │   ├─ Se agregan 50 M3
        │   └─ Nueva cantidad: 150 M3
        │
        ├─→ Solicita DEDUCTIVA (resta conceptos)
        │   └─ Cantidad se reduce
        │
        ├─→ Solicita EXTRAORDINARIO (nuevos conceptos)
        │   ├─ EXT-001: Obra no prevista
        │   └─ Se agrega nuevo concepto al catálogo
        │
        ├─→ Solicita DEDUCCIÓN EXTRA (descuento directo)
        │   └─ Sin relación a concepto
        │
        ├─→ Solicita RETENCIÓN (garantía que se aplica/regresa)
        │   └─ Se rastrea aplicación y regreso
        │
        └─→ Cambios se aprueban: BORRADOR → APROBADO → APLICADO
            Guarda en: cambios_contrato, detalles_aditiva_deductiva,
                       detalles_extra, deducciones_extra, retenciones_contrato
            
            ⚠️ IMPORTANTE:
            - Si cambia MONTO: requisiciones futuras usan nuevo monto
            - Si cambia ANTICIPO %: requisiciones futuras usan nuevo %
            - Si cambia TRATAMIENTO IVA: requisiciones futuras sin/con IVA
            - Requisiciones PASADAS quedan con sus valores (auditoría)


FASE 4: REQUISICIONES (Contratista estima avance)
═════════════════════════════════════════════════════════════════════════════
   Contratista (Semanal)
        │
        ├─→ Crea REQUISICIÓN DE PAGO
        │   ├─ Selecciona CONCEPTOS actualizados (con cambios)
        │   │  └─ Muestra cantidad que falta pagar
        │   ├─ Ingresa cantidad que avanzó ESTA SEMANA
        │   ├─ Sistema calcula IMPORTE (cantidad × precio)
        │   └─ Estatus: BORRADOR
        │
        ├─→ Sistema CALCULA automáticamente:
        │   ├─ Subtotal = suma de importes
        │   ├─ Amortización = subtotal × % anticipo ← GUARDADO
        │   ├─ Retención = subtotal × % fondo garantía ← GUARDADO
        │   ├─ Retenciones especiales (aplicadas/regresadas) ← GUARDADO
        │   ├─ Subtotal neto = subtotal - descuentos
        │   ├─ IVA = subtotal × 16% (si aplica) ← GUARDADO
        │   └─ TOTAL = subtotal + IVA
        │
        ├─→ ✅ CRÍTICO: GUARDA TODO EN LA TABLA
        │   └─ Porque después:
        │       • El contrato puede cambiar (aditiva)
        │       • El precio unitario puede variar
        │       • % de amortización puede cambiar
        │       • Queremos historial de "cómo estaba en ese momento"
        │
        ├─→ Contratista sube FACTURA
        │   ├─ PDF de factura
        │   └─ XML (opcional)
        │
        ├─→ Contratista carga DOCUMENTACIÓN
        │   └─ Fotos, reportes, etc.
        │
        ├─→ Gerencia da VISTO BUENO
        │   ├─ Revisa que trabajo corresponda con factura
        │   ├─ Aprueba: visto_bueno = true
        │   └─ Estatus: BORRADOR → APROBADA
        │
        └─→ Guarda en: requisiciones_pago
            ├─ concepto (con clave, descripción)
            ├─ cantidad_catalogo (inicial)
            ├─ cantidad_pagada_anterior (acumulada)
            ├─ cantidad_esta_requisicion (NUEVA)
            ├─ precio_unitario ← EN ESTE MOMENTO
            ├─ importe ← GUARDADO
            ├─ amortizacion_porcentaje ← GUARDADO
            ├─ amortizacion_monto ← GUARDADO
            ├─ retencion_ordinaria_porcentaje ← GUARDADO
            ├─ retencion_ordinaria_monto ← GUARDADO
            ├─ retenciones_especiales_ids ← GUARDADO
            ├─ lleva_iva ← GUARDADO
            ├─ subtotal ← GUARDADO
            ├─ iva_monto ← GUARDADO
            └─ total ← GUARDADO


FASE 5: SOLICITUDES (Gerencia/Dirección autoriza)
═════════════════════════════════════════════════════════════════════════════
   Gerencia/Dirección
        │
        ├─→ Selecciona REQUISICIONES APROBADAS
        │
        ├─→ Crea SOLICITUD DE PAGO
        │   ├─ Folio: SOL-001
        │   ├─ Copia datos de requisición
        │   │  └─ ⚠️ NO RECALCULA, SOLO COPIA
        │   ├─ Puede seleccionar CONCEPTOS PARCIALES
        │   └─ Estatus: PENDIENTE
        │
        ├─→ Aprobaciones en CASCADA:
        │   ├─ Gerencia: vobo_gerencia = true
        │   ├─ Desarrolladora: vobo_desarrollador = true
        │   └─ Finanzas: vobo_finanzas = true
        │
        ├─→ Sistema GENERA CARÁTULA
        │   ├─ PDF con:
        │   │  ├─ Conceptos a pagar
        │   │  ├─ Cantidades, precios, importes
        │   │  ├─ Amortización (% y $)
        │   │  ├─ Retención (% y $)
        │   │  ├─ Retenciones especiales
        │   │  ├─ Deducciones extra
        │   │  ├─ Subtotal, IVA, TOTAL
        │   │  └─ Espacios para firmas
        │   │
        │   └─ ⚠️ Una vez generada: BLOQUEAR para no recalcular
        │
        ├─→ Carátula se IMPRIME y se FIRMA
        │   ├─ Firma: Finanzas
        │   └─ Firma: Desarrolladora
        │
        └─→ Guarda en: solicitudes_pago
            ├─ folio: 'SOL-001'
            ├─ conceptos_detalle ← COPIADO (no recalculado)
            ├─ amortizacion_aplicada ← GUARDADO
            ├─ retencion_aplicada ← GUARDADO
            ├─ retenciones_esp_aplicadas ← GUARDADO
            ├─ retenciones_esp_regresadas ← GUARDADO
            ├─ deducciones_extras_total ← GUARDADO
            ├─ subtotal ← GUARDADO
            ├─ iva_monto ← GUARDADO
            ├─ total ← GUARDADO
            ├─ caratura_url ← Referencia a PDF
            ├─ caratura_bloqueada = true
            ├─ vobo_gerencia, vobo_desarrollador, vobo_finanzas ← Aprobaciones
            └─ estado: 'aprobada'


FASE 6: PAGOS (Finanzas ejecuta transferencia)
═════════════════════════════════════════════════════════════════════════════
   Finanzas
        │
        ├─→ Solicitud APROBADA entra en "Pagos Pendientes"
        │
        ├─→ Finanzas PREPARA TRANSFERENCIA
        │   ├─ Datos del contratista
        │   ├─ Banco y cuenta
        │   └─ Monto total
        │
        ├─→ Ejecuta TRANSFERENCIA
        │   ├─ Se registra número de transferencia
        │   └─ Se genera comprobante de pago
        │
        ├─→ Contratista puede hacer PAGO PARCIAL
        │   ├─ Se pagan solo ALGUNOS conceptos
        │   ├─ Se especifica cuál se pagó
        │   ├─ Sistema calcula cantidad pendiente
        │   └─ Cantidad no pagada se LIBERA para futura requisición
        │
        ├─→ Se registra PAGO POR CONCEPTO
        │   └─ Para CADA concepto pagado:
        │       ├─ cantidad_pagada (puede ser parcial)
        │       ├─ precio_unitario (del momento)
        │       ├─ importe_pagado (cantidad × precio)
        │       ├─ amortizacion_aplicada (% y $)
        │       ├─ retencion_aplicada (% y $)
        │       ├─ iva_aplicado (si aplica)
        │       ├─ monto_neto_pagado
        │       └─ Todo guardado para auditoría
        │
        └─→ Guarda en: pagos_realizados
            ├─ concepto_contrato_id
            ├─ cantidad_pagada
            ├─ precio_unitario ← DEL MOMENTO
            ├─ importe_pagado
            ├─ amortizacion_monto ← DEL MOMENTO
            ├─ retencion_monto ← DEL MOMENTO
            ├─ iva_monto ← DEL MOMENTO
            ├─ monto_neto_pagado
            ├─ fecha_pago (real)
            ├─ numero_transferencia
            ├─ comprobante_pago_url
            ├─ factura_url
            ├─ xml_url
            └─ estatus: 'PAGADO'


FASE 7: ESTADOS DE CUENTA
═════════════════════════════════════════════════════════════════════════════
   Cualquier usuario
        │
        ├─→ Solicita ESTADO DE CUENTA DE CONTRATO
        │   ├─ Muestra historial completo
        │   ├─ Cada requisición con sus montos
        │   ├─ Cada solicitud con sus aprobaciones
        │   ├─ Cada pago con sus detalles
        │   └─ Saldo pendiente = monto contrato - pagado
        │
        ├─→ Solicita REPORTE DE CAMBIOS
        │   ├─ Aditivas aplicadas
        │   ├─ Deductivas aplicadas
        │   ├─ Extraordinarios
        │   └─ Monto actual vs original
        │
        ├─→ Solicita RETENCIONES
        │   ├─ Retenciones aplicadas
        │   ├─ Retenciones regresadas
        │   └─ Saldo de retenciones
        │
        └─→ Datos vienen de TABLAS (no se recalculan)
            └─ Por eso guardamos TODO en cada transacción

```

---

## 📊 MODELO DE DATOS: RELACIONES

```
┌──────────────┐
│  PROYECTOS   │
├──────────────┤
│ id           │
│ nombre       │
│ descripcion  │
│ ubicacion    │
└──────────────┘
      │
      ├─────────────────────────────────────┬──────────────────────┐
      │                                     │                      │
      ▼                                     ▼                      ▼
┌──────────────┐                  ┌──────────────┐      ┌──────────────┐
│ PRESUPUESTOS │                  │ CONTRATOS    │      │ CAMBIOS_     │
├──────────────┤                  ├──────────────┤      │ CONTRATO     │
│ id           │                  │ id           │◄─────┤──────────────│
│ proyecto_id  │──┐               │ proyecto_id  │      │ id           │
│ categoria    │  │               │ contratista_ │      │ contrato_id  │
│ partida      │  │               │ id           │      │ tipo_cambio  │
│ subpartida   │  │               │ monto_       │      │ monto_cambio │
│ concepto_id  │  │               │ contrato     │      │ estatus      │
│ volumetria   │  │               │ anticipo_    │      │ ...          │
│ pu_           │  │               │ monto        │      └──────────────┘
│ parametrico  │  │               │ retencion_   │             │
│ presupuesto_ │  │               │ porcentaje   │             ├─────────┬────────┬───────────┐
│ base         │  │               │ tratamiento_ │             │         │        │           │
└──────────────┘  │               │ iva          │             ▼         ▼        ▼           ▼
                  │               │ catalogo_    │       ┌─────────┐ ┌─────┐ ┌──────┐ ┌────────────┐
                  │               │ aprobado     │       │DETALLES_│ │DETA-│ │DEDU- │ │RETENCIONES│
                  │               │ estatus      │       │ADITIVA_ │ │LLES_│ │CCIO- │ │_CONTRATO  │
                  │               │ ...          │       │DEDUCTIVA│ │EXTRA│ │NES_  │ │────────────│
                  │               └──────────────┘       │─────────│ │EXTRA│ │EXTRA │ │id          │
                  │                     │               │id        │ │─────│ │──────│ │cambio_id   │
                  │                     │               │cambio_id │ │id   │ │id    │ │descripcion │
                  │                     │               │concepto_ │ │cam- │ │cam-  │ │monto       │
                  │                     │               │id        │ │bio_ │ │bio_  │ │monto_      │
                  │                     │               │cantidad_ │ │id   │ │id    │ │aplicado    │
                  │                     │               │original  │ │con- │ │des-  │ │monto_      │
                  │                     │               │cantidad_ │ │cepto│ │crip- │ │regresado   │
                  │                     │               │modif     │ │_id  │ │cion  │ │...         │
                  │                     │               │cantidad_ │ │des- │ │monto │ └────────────┘
                  │                     │               │nueva     │ │crip│ │...   │
                  │                     │               │...       │ │cion│ └──────┘
                  │                     │               └─────────┘ │...│
                  │                     │                           │───│
                  │                     │                           └───┘
                  │                     │
                  │                     ├─────────────────────────────────────────────────────┐
                  │                     │                                                     │
                  │                     ▼                                                     ▼
                  └──────────────┬─────────────────┐                                  ┌────────────────┐
                                 │                 │                                  │ CONTRATISTAS   │
                                 ▼                 ▼                                  ├────────────────┤
                          ┌─────────────────┐ ┌──────────────┐                       │ id             │
                          │ CONCEPTOS_      │ │ REQUISICIONES│                       │ nombre         │
                          │ CONTRATO        │ │ _PAGO        │                       │ rfc            │
                          ├─────────────────┤ ├──────────────┤                       │ banco_id       │
                          │ id              │ │ id           │                       │ cuenta_        │
                          │ contrato_id     │ │ contrato_id  │                       │ bancaria       │
                          │ clave           │ │ numero       │                       │ ...            │
                          │ concepto        │ │ fecha        │                       └────────────────┘
                          │ unidad          │ │ conceptos    │ (JSON Array con todos los detalles)
                          │ cantidad_       │ │ monto_       │
                          │ catalogo        │ │ estimado     │                   ┌──────────────────────┐
                          │ precio_         │ │ amortizacion │◄──────────┬────────│ REQUISICION_         │
                          │ unitario        │ │ retencion    │           │       │ RETENCIONES          │
                          │ importe_total   │ │ retenciones_ │           │       ├──────────────────────┤
                          │ cantidad_pagada │ │ aplicadas    │           │       │ id                   │
                          │ _anterior       │ │ retenciones_ │           │       │ requisicion_id       │
                          │ cantidad_       │ │ regresadas   │           │       │ tipo                 │
                          │ disponible      │ │ lleva_iva    │           │       │ descripcion          │
                          │ metadata        │ │ subtotal     │           │       │ monto_retenido       │
                          │ ...             │ │ iva          │           │       │ modo (APLICAR/       │
                          └─────────────────┘ │ total        │           │       │       REGRESAR)      │
                                 │            │ estado       │           │       │ ...                  │
                                 │            │ visto_bueno  │           │       └──────────────────────┘
                                 │            │ visto_bueno_ │           │
                                 │            │ por          │           │
                                 │            │ factura_url  │           │
                                 │            │ factura_xml_ │           │
                                 │            │ url          │           │
                                 │            │ ...          │           │
                                 │            └──────────────┘           │
                                 │                   │                   │
                                 │                   ├───────────────────┘
                                 │                   │
                                 │                   ▼
                                 │            ┌──────────────┐
                                 │            │ SOLICITUDES_ │
                                 │            │ PAGO         │
                                 │            ├──────────────┤
                                 │            │ id           │
                                 │            │ folio        │
                                 │            │ requisicion_ │
                                 │            │ id           │
                                 │            │ concepto_ids │
                                 │            │ conceptos_   │
                                 │            │ detalle      │
                                 │            │ amortizacion │
                                 │            │ retencion    │
                                 │            │ lleva_iva    │
                                 │            │ subtotal     │
                                 │            │ iva          │
                                 │            │ total        │
                                 │            │ vobo_        │
                                 │            │ gerencia     │
                                 │            │ vobo_        │
                                 │            │ desarrollador│
                                 │            │ vobo_        │
                                 │            │ finanzas     │
                                 │            │ caratura_url │
                                 │            │ caratura_    │
                                 │            │ bloqueada    │
                                 │            │ ...          │
                                 │            └──────────────┘
                                 │                   │
                                 │                   ▼
                                 │            ┌────────────────┐
                                 │            │ PAGOS_         │
                                 │            │ REALIZADOS     │
                                 │            ├────────────────┤
                                 │            │ id             │
                                 │            │ solicitud_id   │
                                 │            │ requisicion_id │
                                 │            │ concepto_id    │
                                 │            │ cantidad_pagada│
                                 │            │ precio_        │
                                 │            │ unitario       │
                                 │            │ importe_pagado │
                                 │            │ amortizacion_  │
                                 │            │ monto          │
                                 │            │ retencion_     │
                                 │            │ monto          │
                                 │            │ iva_monto      │
                                 │            │ monto_neto_    │
                                 │            │ pagado         │
                                 │            │ fecha_pago     │
                                 │            │ numero_        │
                                 │            │ transferencia  │
                                 │            │ comprobante_   │
                                 │            │ pago_url       │
                                 │            │ estatus        │
                                 │            │ ...            │
                                 │            └────────────────┘
                                 │
                                 └──────────────────────────────────────────────────
                                          (Relación indirecta a través de conceptos)

```

---

## 📈 ESTADIOS DEL DOCUMENTO POR FASE

```
CONTRATO
═══════
BORRADOR
  ↓ (Se carga catálogo)
EN_REVISION
  ↓ (Se aprueba catálogo)
APROBADO
  ↓ (Se puede empezar a requisitar)
ACTIVO
  ↓ (Se finaliza)
FINALIZADO


REQUISICIÓN
═════════════
BORRADOR
  ↓ (Contratista envía, Gerencia revisa)
ENVIADA
  ↓ (Gerencia aprueba)
APROBADA
  ↓ (Se convierte en solicitud)
PAGADA (o PAGADA PARCIALMENTE)
  ↓
FINALIZADA (o pendiente si hay saldo)


SOLICITUD
══════════
PENDIENTE
  ↓ (Gerencia aprueba)
PENDIENTE VB_DESARROLLADOR
  ↓ (Desarrolladora aprueba)
PENDIENTE VB_FINANZAS
  ↓ (Finanzas aprueba)
APROBADA
  ↓ (Se genera caratula, se imprime y firma)
CARATURA_LISTA
  ↓ (Se ejecuta transferencia)
PAGADA (o PAGADA PARCIALMENTE)


CAMBIO
═══════════
BORRADOR
  ↓ (Se solicita aprobación)
EN_REVISION
  ↓ (Se aprueba)
APROBADO
  ↓ (Se aplica a contrato)
APLICADO
```

---

## 🔑 CAMPOS CRÍTICOS QUE DEBEN GUARDARSE

```
REQUISICIONES_PAGO
══════════════════

POR CADA CONCEPTO, GUARDAR:
├─ concepto_contrato_id      (Referencia)
├─ clave                      (ej: CON-001)
├─ concepto                   (Descripción)
├─ unidad                     (M2, M3, PZA)
├─ cantidad_catalogo          (Total en catálogo ordinario)
├─ cantidad_pagada_anterior   (Suma de requisiciones previas)
├─ cantidad_esta_requisicion  (NUEVA) ← AQUÍ INGRESA CONTRATISTA
├─ precio_unitario            (Precio en ESTE MOMENTO) ← GUARDADO
├─ importe                    (cantidad × precio) ← GUARDADO
├─ es_general                 (Si es concepto libre)
├─ tipo                       ('CONCEPTO', 'DEDUCCION', 'RETENCION', etc)
└─ modo_retencion             ('APLICAR' o 'REGRESAR')

CÁLCULOS GUARDADOS:
├─ subtotal                   (Suma de importes) ← GUARDADO
├─ amortizacion_porcentaje    (% anticipo) ← GUARDADO
├─ amortizacion_monto         ($ anticipo) ← GUARDADO
├─ retencion_ordinaria_%      (5% fondo de garantía) ← GUARDADO
├─ retencion_ordinaria_monto  ($ retención) ← GUARDADO
├─ retenciones_aplicadas      ($ retenciones especiales APLICAR) ← GUARDADO
├─ retenciones_regresadas     ($ retenciones especiales REGRESAR) ← GUARDADO
├─ otros_descuentos           (Deducciones extra) ← GUARDADO
├─ subtotal_neto              (Después de descuentos) ← GUARDADO
├─ lleva_iva                  (Boolean) ← GUARDADO
├─ iva_porcentaje             (16 o 0) ← GUARDADO
├─ iva_monto                  ($ IVA) ← GUARDADO
└─ total                       (Final) ← GUARDADO

META DE AUDITORÍA:
"Si alguien pregunta '¿cuál fue la requisición #5?', tengo TODA la info
 exactamente como estaba cuando se creó, sin importar que el contrato
 cambió después"


SOLICITUDES_PAGO
════════════════

COPIAR DE REQUISICIÓN (NO RECALCULAR):
├─ conceptos_detalle          (Mismo array) ← NO CALCULAR
├─ amortizacion_aplicada      (De requisición) ← NO CALCULAR
├─ retencion_aplicada         (De requisición) ← NO CALCULAR
├─ retenciones_esp_aplicadas  (De requisición) ← NO CALCULAR
├─ retenciones_esp_regresadas (De requisición) ← NO CALCULAR
├─ deducciones_extras_total   (De requisición) ← NO CALCULAR
├─ subtotal                   (De requisición) ← NO CALCULAR
├─ iva_monto                  (De requisición) ← NO CALCULAR
└─ total                       (De requisición) ← NO CALCULAR

AGREGAR:
├─ caratura_url               (Referencia a PDF)
├─ caratura_bloqueada = true  (Una vez aprobada)
└─ caratura_fecha_generacion  (Timestamp)

APROBACIONES:
├─ vobo_gerencia              (Boolean)
├─ vobo_gerencia_por          (user_id)
├─ vobo_gerencia_fecha        (Timestamp)
├─ vobo_desarrollador         (Boolean)
├─ vobo_desarrollador_por     (user_id)
├─ vobo_desarrollador_fecha   (Timestamp)
├─ vobo_finanzas              (Boolean)
├─ vobo_finanzas_por          (user_id)
└─ vobo_finanzas_fecha        (Timestamp)


PAGOS_REALIZADOS
════════════════

POR CADA PAGO (por concepto, puede haber múltiples):
├─ concepto_contrato_id       (Referencia)
├─ concepto_clave             (ej: CON-001)
├─ concepto_descripcion       (Descripción)
├─ cantidad_requisitada       (Total que se requisitó)
├─ cantidad_pagada            (Lo que realmente se pagó)
├─ precio_unitario            (Del momento) ← GUARDADO
├─ importe_pagado             (cantidad × precio) ← GUARDADO
├─ amortizacion_porcentaje    (%) ← GUARDADO
├─ amortizacion_monto         ($) ← GUARDADO
├─ retencion_porcentaje       (%) ← GUARDADO
├─ retencion_monto            ($) ← GUARDADO
├─ iva_monto                  ($) ← GUARDADO
├─ monto_neto_pagado          (Final) ← GUARDADO
├─ fecha_pago                 (Real)
├─ numero_transferencia       (De pago)
├─ comprobante_pago_url       (Referencia)
└─ estatus                    ('PAGADO')

"Si alguien pregunta '¿cuánto se pagó del concepto CON-001 en la requisición #5?',
 tengo EXACTAMENTE cuánto se pagó, a qué precio, con qué retenciones,
 sin que nada se haya recalculado"
```

---

## 📋 CHECKLIST: "ESTÁ GUARDADO" vs "SE CALCULA"

```
✅ DEBE ESTAR GUARDADO en requisiciones_pago:
   ├─ Montos de conceptos (cantidad × precio)
   ├─ Porcentaje de amortización (EN ESE MOMENTO)
   ├─ Monto de amortización (EN ESE MOMENTO)
   ├─ Porcentaje de retención ordinaria (EN ESE MOMENTO)
   ├─ Monto de retención ordinaria (EN ESE MOMENTO)
   ├─ Retenciones especiales (aplicadas/regresadas)
   ├─ Tratamiento de IVA (copiado del contrato)
   ├─ Monto de IVA (si aplica)
   ├─ Subtotal
   └─ Total

❌ NUNCA RECALCULAR en solicitudes_pago:
   ├─ Concepto (copiado de requisición)
   ├─ Cantidades (copiadas de requisición)
   ├─ Precios (copiados de requisición)
   ├─ Montos (copiados de requisición)
   ├─ IVA (copiado de requisición)
   └─ Total (copiado de requisición)

⚠️ BLOQUEAR después de aprobación:
   ├─ caratura_bloqueada = true
   └─ Sistema rechaza intentos de recálculo

📊 MOSTRAR en carátula:
   ├─ Exactamente lo que está guardado
   ├─ Sin redondeos adicionales
   ├─ Con auditoría visible
   └─ Con firmas de autorización
```

---

## 🎯 DATOS DE EJEMPLO

```
CONTRATO CTR-001
════════════════
Monto Original: $1,000,000
Anticipo: 30% = $300,000
Retención: 5% (fondo de garantía)
Tratamiento: MAS IVA (16%)


CONCEPTOS DEL CATÁLOGO ORDINARIO
═════════════════════════════════
CON-001: Excavación
  Unidad: M3
  Cantidad: 100 M3
  Precio: $1,000 / M3
  Importe: $100,000

CON-002: Cimentación
  Unidad: M3
  Cantidad: 50 M3
  Precio: $2,000 / M3
  Importe: $100,000

CON-003: Estructura
  Unidad: M3
  Cantidad: 30 M3
  Precio: $3,000 / M3
  Importe: $90,000

... (otros 7 conceptos más = $710,000)

TOTAL CATÁLOGO: $1,000,000 ✓ Cuadra


REQUISICIÓN REQ-001 (Semana 1)
═════════════════════════════════

Contratista dice: "Esta semana avancé:"
├─ CON-001 (Excavación): 20 M3 (de 100)
├─ CON-002 (Cimentación): 10 M3 (de 50)
└─ CON-003 (Estructura): 0 M3 (de 30)

CÁLCULO (GUARDADO EN TABLA):
├─ Subtotal = (20 × $1,000) + (10 × $2,000) + (0 × $3,000)
│           = $20,000 + $20,000 + $0
│           = $40,000

├─ Amortización = $40,000 × 30% = $12,000 ← GUARDADO
├─ Retención = $40,000 × 5% = $2,000 ← GUARDADO
├─ Subtotal Neto = $40,000 - $12,000 - $2,000 = $26,000
├─ IVA = $26,000 × 16% = $4,160 ← GUARDADO
└─ TOTAL = $26,000 + $4,160 = $30,160 ← GUARDADO


CAMBIO ADITIVA ADT-001 (Semana 2)
═════════════════════════════════════

Se descubre: necesita más excavación
├─ CON-001: Agregar 50 M3 más (de 100 a 150 M3)
└─ Monto del contrato: $1,000,000 → $1,050,000


REQUISICIÓN REQ-002 (Semana 2 - DESPUÉS del cambio)
══════════════════════════════════════════════════════════

Contratista dice: "Esta semana avancé:"
├─ CON-001 (Excavación): 30 M3 más (de los 150 disponibles)
│  Cantidad anterior: 20 M3 (de REQ-001)
│  Cantidad esta semana: 30 M3
├─ CON-002 (Cimentación): 15 M3 más (de los 50 disponibles)
│  Cantidad anterior: 10 M3 (de REQ-001)
│  Cantidad esta semana: 15 M3
└─ Retención especial a REGRESAR: $500 (de proyecto anterior)

CÁLCULO (GUARDADO EN TABLA):
├─ Subtotal = (30 × $1,000) + (15 × $2,000)
│           = $30,000 + $30,000
│           = $60,000

├─ Amortización = $60,000 × 30% = $18,000 ← GUARDADO
│  (Sigue siendo 30% porque no cambió)

├─ Retención ordinaria = $60,000 × 5% = $3,000 ← GUARDADO
├─ Retenciones especiales REGRESAR = +$500 ← GUARDADO
│  (Se suma porque se regresa)

├─ Subtotal Neto = $60,000 - $18,000 - $3,000 + $500 = $39,500
├─ IVA = $39,500 × 16% = $6,320 ← GUARDADO
└─ TOTAL = $39,500 + $6,320 = $45,820 ← GUARDADO


PAGO (Semana 3)
═════════════════

Finanzas executa transferencia de $45,820

Se registra PAGO_REALIZADO:
├─ Concepto: CON-001 (Excavación)
│  ├─ Cantidad pagada: 30 M3
│  ├─ Precio unitario: $1,000 ← GUARDADO (del momento de req)
│  ├─ Importe: 30 × $1,000 = $30,000
│  ├─ Amortización: $30,000 × 30% = $9,000 ← GUARDADO
│  └─ Retención: $30,000 × 5% = $1,500 ← GUARDADO

├─ Concepto: CON-002 (Cimentación)
│  ├─ Cantidad pagada: 15 M3
│  ├─ Precio unitario: $2,000 ← GUARDADO
│  ├─ Importe: 15 × $2,000 = $30,000
│  ├─ Amortización: $30,000 × 30% = $9,000 ← GUARDADO
│  └─ Retención: $30,000 × 5% = $1,500 ← GUARDADO

└─ Retención Especial REGRESAR: $500 ← GUARDADO

TOTAL PAGADO: $45,820


ESTADO DE CUENTA (Al día de hoy)
═════════════════════════════════════

Monto original del contrato: $1,000,000
Aditiva aplicada: +$50,000
Monto actual: $1,050,000

Requisiciones enviadas:
├─ REQ-001: $30,160
├─ REQ-002: $45,820
└─ Total requisicionado: $75,980

Pagado: $45,820 (REQ-002 completa)
Pendiente de pago: $30,160 (REQ-001) ← Requiere acción de Finanzas

Saldo del contrato: $1,050,000 - $45,820 = $1,004,180

Disponible para requisitar:
├─ CON-001 (Excavación): 150 - 20 - 30 = 100 M3 más
├─ CON-002 (Cimentación): 50 - 10 - 15 = 25 M3 más
└─ CON-003+ (Otros): disponibles

"Esta es la REALIDAD porque todos los números están GUARDADOS"
```

