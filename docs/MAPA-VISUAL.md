# 📋 MAPA VISUAL: Cómo Funciona Elara y Qué Falla

**Propósito:** Entender en 5 minutos qué está mal y qué arreglar  
**Formato:** Visual + Mínimo texto  
**Audiencia:** Todos  

---

## 🎯 EL FLUJO (Paso a Paso)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ SEMANA 1: Contratista Estima Avance (REQUISICIÓN)                          │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Contratista dice: "Excavar 100 M3 esta semana"                            │
│  Sistema calcula:                                                           │
│  ├─ Precio: $1,000/M3                                                      │
│  ├─ Importe: 100 × $1,000 = $100,000                                      │
│  ├─ Amortización: 30% = $30,000                                            │
│  ├─ Retención: 5% = $5,000                                                 │
│  ├─ Subtotal: $65,000                                                      │
│  ├─ IVA 16%: $10,400                                                       │
│  └─ TOTAL: $75,400                                                         │
│                                                                             │
│  ✅ DEBE GUARDAR ESTOS NÚMEROS EN LA TABLA                                │
│                                                                             │
│  requisiciones_pago {                                                      │
│    id: "req-001",                                                          │
│    concepto: "Excavación",                                                 │
│    cantidad: 100,                                                          │
│    precio_unitario: 1000,        ← GUARDADO EN ESTE MOMENTO              │
│    importe: 100000,              ← GUARDADO                              │
│    amortizacion_monto: 30000,    ← GUARDADO                              │
│    retencion_monto: 5000,        ← GUARDADO                              │
│    subtotal: 65000,              ← GUARDADO                              │
│    iva_monto: 10400,             ← GUARDADO                              │
│    total: 75400                  ← GUARDADO                              │
│  }                                                                          │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌────────────────────────────────────────────────────────────────────────────┐
│ SEMANA 2: Gerencia Aprueba Requisición                                     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Gerencia revisa factura y aprueba                                         │
│  visto_bueno = true                                                        │
│  Requisición pasa a: APROBADA                                              │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌────────────────────────────────────────────────────────────────────────────┐
│ SEMANA 2: Se crea SOLICITUD DE PAGO (Copia de Requisición)                │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ DEBE COPIAR (NO RECALCULAR)                                            │
│                                                                             │
│  solicitudes_pago {                                                        │
│    id: "sol-001",                                                          │
│    concepto: "Excavación",       ← COPIADO de requisición                 │
│    cantidad: 100,                ← COPIADO                                 │
│    precio_unitario: 1000,        ← COPIADO (ahora podría ser $1200)      │
│    importe: 100000,              ← COPIADO (no $120,000)                 │
│    amortizacion_monto: 30000,    ← COPIADO                                │
│    retencion_monto: 5000,        ← COPIADO                                │
│    subtotal: 65000,              ← COPIADO                                │
│    iva_monto: 10400,             ← COPIADO                                │
│    total: 75400,                 ← COPIADO                                │
│    caratura_bloqueada: false     ← Todavía NO bloqueada                  │
│  }                                                                          │
│                                                                             │
│  ⚠️ PROBLEMA #1: Actualmente Sistema RECALCULA                           │
│     - Precio es ahora $1,200/M3 (contrato cambió)                        │
│     - Sistema calcula: 100 × $1,200 = $120,000 ❌ INCORRECTO             │
│     - Importe se convierte en $120,000 (fue $100,000 en requisición)     │
│     - Total se convierte en $83,200 (fue $75,400)                        │
│                                                                             │
│  📌 SOLUCIÓN: Guardar = COPIAR, no recalcular                            │
│     - Mantener $100,000 de la requisición                                 │
│     - Mantener $75,400 de la requisición                                  │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌────────────────────────────────────────────────────────────────────────────┐
│ SEMANA 2: Aprobaciones en Cascada (Gerencia → Desarrolladora → Finanzas)  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Gerencia da Visto Bueno    ✓                                           │
│  2. Desarrolladora da VB       ✓                                           │
│  3. Finanzas da VB             ✓                                           │
│                                                                             │
│  Una vez tienen TODAS las aprobaciones:                                    │
│  ├─ Generar Carátula en PDF                                               │
│  ├─ caratura_bloqueada = true  ✅ (NO se puede recalcular después)        │
│  └─ Imprimir y firmar          (Finanzas + Desarrolladora)                │
│                                                                             │
│  ⚠️ PROBLEMA #8: Carátula incompleta, le falta:                          │
│     - Retenciones especiales                                               │
│     - Deducciones extra                                                    │
│     - Espacios para firmas                                                 │
│                                                                             │
│  📌 SOLUCIÓN: PDF con TODOS los campos + firmas digitales                │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌────────────────────────────────────────────────────────────────────────────┐
│ SEMANA 3: Finanzas Ejecuta TRANSFERENCIA (PAGO)                           │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Finanzas transfiere: $75,400 al contratista                              │
│                                                                             │
│  Registra en pagos_realizados:                                             │
│  ├─ cantidad_pagada: 100 M3                                               │
│  ├─ precio_unitario: 1000        ← DEL MOMENTO (para auditoría)          │
│  ├─ importe_pagado: 100000       ← GUARDADO                              │
│  ├─ amortizacion: 30000          ← GUARDADO                              │
│  ├─ retencion: 5000              ← GUARDADO                              │
│  ├─ iva_monto: 10400             ← GUARDADO                              │
│  ├─ monto_neto: 75400            ← GUARDADO                              │
│  ├─ fecha_pago: "2026-02-03"                                              │
│  └─ comprobante_pago_url: "..."                                           │
│                                                                             │
│  ⚠️ PROBLEMA #4: Si es pago PARCIAL                                       │
│     Ej: Pagar solo $50,000 de los $75,400                                 │
│     Sistema debe:                                                          │
│     ├─ Especificar QUÉ conceptos se pagan (ej: 50 M3 de Excavación)     │
│     ├─ Registrar pago de esos 50 M3                                       │
│     ├─ Liberar 50 M3 restantes para futura requisición                   │
│     └─ Marcar requisición: PAGADO PARCIALMENTE                            │
│                                                                             │
│  📌 SOLUCIÓN: Tabla de conceptos pagados por requisición                 │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌────────────────────────────────────────────────────────────────────────────┐
│ ESTADO DE CUENTA (Hoy)                                                    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Contrato: $1,000,000                                                      │
│  Requisicionado: $75,400 (REQ-001)                                         │
│  Pagado: $75,400                                                           │
│  Saldo: $924,600                                                           │
│                                                                             │
│  ✅ Estos números están CORRECTOS porque están GUARDADOS                 │
│                                                                             │
│  ❌ Si el sistema RECALCULARA:                                            │
│     - Requisicionado: $83,200 (incorrecto, precio cambió)                │
│     - Pagado: $83,200                                                     │
│     - Saldo: $916,800 (incorrecto)                                        │
│     - Usuario: "¿Por qué me cobran de más?"                               │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔴 LOS 8 PROBLEMAS VISUALIZADOS

```
PROBLEMA #1: CARÁTULA SE RECALCULA
═══════════════════════════════════════════════════════════════════════
Requisición: TOTAL = $75,400 ✓
      ↓
Solicitud: TOTAL = $75,400 ✓ (Se COPIA)
      ↓
Abres carátula (vez 1): TOTAL = $75,400 ✓
      ↓
Abres carátula (vez 2): TOTAL = $83,200 ❌ (Se RECALCULA - PRECIO CAMBIÓ)

SOLUCIÓN: Guardar en solicitud, bloquear post-aprobación


PROBLEMA #2: AMORTIZACIÓN INCONSISTENTE
═══════════════════════════════════════════════════════════════════════
Contrato: Monto = $1,000,000, Anticipo = 30%
      ↓
Requisición #1: Amortización = $1M × 30% = $300,000 ✓
      ↓
CAMBIO: Aditiva de +$100,000. Nuevo monto = $1,100,000
      ↓
Requisición #2: ¿Amortización es...?
  ├─ 30% del monto original ($1M) = $300,000? ❌
  ├─ 30% del nuevo monto ($1.1M) = $330,000? ❌
  └─ Sin cambio en % = $30,000 prorateo? ❌ Indeterminado

SOLUCIÓN: Guardar % y $ por requisición + historial de cambios


PROBLEMA #3: RETENCIONES ESPECIALES NO RASTREADAS
═══════════════════════════════════════════════════════════════════════
Requisición normal: Retención 5% (fondo de garantía)

PERO TAMBIÉN PUEDE HABER:
├─ Retención por garantía de terminación (se aplica)
├─ Retención por multa (se aplica)
├─ Retención anterior que se devuelve (se regresa)
└─ Sistema no rastrea cuáles se aplican/regresan

EJEMPLO:
├─ Requisición #1: Retención de $500 por garantía (se resta)
├─ Requisición #2: Retención de $500 se regresa (se suma)
├─ ¿Cuánto se debe devolver? ❌ Imposible saber

SOLUCIÓN: Tabla específica (requisicion_retenciones)


PROBLEMA #4: PAGO PARCIAL NO REGISTRADO
═══════════════════════════════════════════════════════════════════════
Solicitud: Excavación 100 M3 por $100,000

Realidad: Contratista solo excava 60 M3
Paga: $60,000

Requisición dice: 100 M3 requisicionados
¿Cuánto está disponible para siguiente requisición?
  ├─ 0 M3? ❌ (porque 100 ya se requisitaron)
  ├─ 40 M3? ✓ (que faltaron de los 100)
  └─ Sistema no rastrea: "Se pagaron 60 de 100"

SOLUCIÓN: Especificar qué conceptos se pagaron en pago parcial


PROBLEMA #5: IVA NO CONSISTENTE
═══════════════════════════════════════════════════════════════════════
Contrato: "MAS IVA" (16%)

Requisición #1: IVA = $10,400 (16%) ✓
      ↓
CAMBIO: Contrato ahora "EXENTO"

Requisición #2: ¿IVA es...?
  ├─ Todavía $10,400 (porque contrato fue MAS IVA)? ❌
  ├─ $0 (porque contrato ahora EXENTO)? ✓
  └─ Indeterminado

SOLUCIÓN: Guardar tratamiento_iva en requisición


PROBLEMA #6: SINCRONIZACIÓN OFFLINE INCOMPLETA
═══════════════════════════════════════════════════════════════════════
Usuario A (iPad, offline):
├─ Edita requisición
└─ Guarda en IndexedDB local

Usuario B (Escritorio, online):
├─ Edita mismo documento
└─ Guarda en Supabase

Ambos se conectan:
├─ ¿Qué versión prevalece?
├─ ¿Se pierden cambios de A?
├─ ¿Se pierden cambios de B?
└─ Sistema no define mecanismo

SOLUCIÓN: Last-Write-Wins (LWW) + historial de conflictos


PROBLEMA #7: SUPABASE DESORGANIZADO
═══════════════════════════════════════════════════════════════════════
20 migraciones pequeñas
├─ No hay schema consolidado
├─ RLS no está documentado
├─ Faltan índices críticos
├─ Difícil de mantener
└─ Imposible replicar a otros proyectos

SOLUCIÓN: Schema consolidado + RLS documentado + índices optimizados


PROBLEMA #8: CARÁTULA INCOMPLETA
═══════════════════════════════════════════════════════════════════════
Carátula actual: Solo conceptos + subtotal + total

Carátula DEBE tener:
├─ Conceptos (cantidad, precio, importe) ✓
├─ Subtotal ✓
├─ Amortización (%, $) ❌ FALTA
├─ Retención ordinaria (%, $) ❌ FALTA
├─ Retenciones especiales ❌ FALTA
├─ Deducciones extra ❌ FALTA
├─ IVA ❌ FALTA
├─ TOTAL ✓
├─ Espacios para firmas ❌ FALTA
└─ Fecha de impresión ❌ FALTA

SOLUCIÓN: PDF con todos los campos + firmas
```

---

## ✅ SOLUCIÓN UNIVERSAL

Todos los 8 problemas tienen **UNA SOLUCIÓN COMÚN**:

```
          CUANDO SE CREA               CUANDO SE USA
          ─────────────               ────────────
                 ↓                            ↓

    GUARDAR TODOS LOS DATOS       MOSTRAR LO GUARDADO
    ────────────────────────      ────────────────────
    
    • Concepto                     • NO recalcular
    • Cantidad                     • NO cambiar porcentajes
    • Precio EN ESE MOMENTO        • NO modificar
    • % amortización               • BLOQUEAR para edición
    • $ amortización               • SOLO LEER
    • % retención
    • $ retención
    • Retenciones especiales
    • Deducciones
    • Subtotal
    • IVA
    • TOTAL

    RAZÓN: Auditoría
    ┌───────────────────────────────────────────────┐
    │ Si alguien pregunta:                           │
    │ "¿Cuánto se autorizó el 1º de febrero?"       │
    │ RESPUESTA:                                     │
    │ "Exactamente $75,400 porque está guardado"    │
    │                                                │
    │ Aunque ahora el precio sea $1,200/M3,          │
    │ Aunque el contrato cambió,                     │
    │ Aunque la amortización sea 20%,                │
    │ SE AUTORIZÓ $75,400 y eso se debe pagar.     │
    └───────────────────────────────────────────────┘
```

---

## 📊 TABLA: ANTES vs DESPUÉS

```
                    AHORA ❌                    DESPUÉS ✅
═════════════════════════════════════════════════════════════════════
Carátula            Se recalcula cada          Guardada, idéntica
                    vez que la abres           10 veces que la abres

Amortización        Varía si cambias           Fija, no cambia
                    el contrato                aunque cambies contrato

Retenciones         No se rastrea cuál         Tabla específica
                    se aplicó/devolvió         con historial

Pago parcial        No sabe cuánto se          Especifica conceptos
                    pagó vs requisitó          pagados vs pendientes

IVA                 Recalcula en cada          Guardado en requisición
                    requisición                desde el inicio

Offline             Sincronización             Mecanismo de conflicto
                    puede perder datos         con historial

Supabase            20 migraciones             1 schema consolidado
                    desorganizadas             + documentación

Carátula PDF        Incompleta                 Todos los campos
                    (falta mucha info)         + firmas
```

---

## 🎯 PRÓXIMOS PASOS (EN ORDEN)

```
SEMANA 1-2: Problemas #1, #2, #5 (Fijar Datos)
├─ Agregar campos a tablas
├─ Cambiar "calcular" a "guardar"
├─ Bloquear post-aprobación

SEMANA 2-3: Problemas #3, #4 (Cambios)
├─ Tabla de retenciones
├─ Especificar pago parcial
├─ Liberar cantidad no pagada

SEMANA 3-4: Problemas #7, #8 (Infraestructura)
├─ Schema consolidado
├─ Carátula completa en PDF

SEMANA 4-5: Problema #6 (Offline)
├─ Mecanismo de conflicto
├─ Historial de sincronización

SEMANA 5-8: Testing + Go-Live
├─ Casos de prueba
├─ Validación
├─ Capacitación
```

---

## 🚀 LO MÁS IMPORTANTE

```
┌─────────────────────────────────────────┐
│  GUARDAR ≠ RECALCULAR                   │
│                                          │
│  Cuando creas un documento:              │
│  GUARDA los números                      │
│  EN LA TABLA                             │
│                                          │
│  Cuando lo abres después:                │
│  MUESTRA lo guardado                     │
│  SIN RECALCULAR                          │
│                                          │
│  Así aunque el mundo cambie,             │
│  Tienes auditoría de qué se autorizó     │
└─────────────────────────────────────────┘
```

---

**Este documento resume TODO en 1 página visual.**  
**Para más detalles, ver los otros documentos en /docs/**

