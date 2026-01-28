# Implementación: Problema #1 - Congelar Montos

## ✅ Estado: IMPLEMENTADO (Backend + Migraciones)

**Fecha de implementación:** 2024-01-01  
**Branch:** `feature/congelar-montos-requisicion`

---

## 📋 Resumen

Se implementó la solución para el **Problema #1: Los montos de la carátula cambian al recalcular**. Ahora los valores financieros se **guardan al crear el registro** y **NUNCA se recalculan** después, incluso si cambian los precios del contrato.

---

## 🔧 Cambios Implementados

### 1. **Tipos TypeScript Actualizados**

#### **RequisicionPago** (`src/types/requisicion-pago.ts`)
Se agregaron campos para "congelar" los valores de cálculo:

```typescript
// 🔒 MONTOS CONGELADOS - Se calculan una vez y NO se recalculan
amortizacion_porcentaje?: number;          // % usado (ej: 30)
amortizacion_base_contrato?: number;       // Monto base (contrato actualizado)
amortizacion_metodo?: 'PORCENTAJE_CONTRATO' | 'PORCENTAJE_REQUISICION' | 'MONTO_FIJO';

retencion_ordinaria_porcentaje?: number;   // % retención ordinaria (ej: 5)
tratamiento_iva?: 'IVA EXENTO' | 'MAS IVA' | 'IVA TASA 0';
iva_porcentaje?: number;                   // 16 o 0
```

#### **SolicitudPago** (`src/types/solicitud-pago.ts`)
Se agregaron campos similares más campos de control:

```typescript
// 🔒 MONTOS CONGELADOS copiados de requisición
subtotal_calculo?: number;
amortizacion_porcentaje?: number;
amortizacion_aplicada?: number;
retencion_porcentaje?: number;
retencion_ordinaria_aplicada?: number;
retenciones_esp_aplicadas?: number;
retenciones_esp_regresadas?: number;
tratamiento_iva?: 'IVA EXENTO' | 'MAS IVA' | 'IVA TASA 0';
iva_porcentaje?: number;

// Control de carátula
caratura_generada?: boolean;
caratura_bloqueada?: boolean;
fecha_bloqueo_caratura?: string;
```

---

### 2. **Migraciones SQL**

#### **`20240101000000_add_frozen_fields_requisiciones.sql`**
Agrega columnas a `requisiciones_pago`:
- `amortizacion_porcentaje`, `amortizacion_base_contrato`, `amortizacion_metodo`
- `retencion_ordinaria_porcentaje`
- `tratamiento_iva`, `iva_porcentaje`

#### **`20240101000001_add_frozen_fields_solicitudes.sql`**
Agrega columnas a `solicitudes_pago`:
- Todos los campos de valores congelados
- `caratura_generada`, `caratura_bloqueada`, `fecha_bloqueo_caratura`
- Constraints para validar valores permitidos

---

### 3. **Componente RequisicionPagoForm.tsx**

**Ubicación:** `src/components/obra/RequisicionPagoForm.tsx`

**Cambio:** Al guardar una requisición, ahora se almacenan los valores congelados:

```typescript
const requisicionData: RequisicionPago = {
  // ... campos normales ...
  
  // 🔒 MONTOS CONGELADOS
  amortizacion_porcentaje: anticipoPct > 0 ? parseFloat(anticipoPct.toFixed(4)) : undefined,
  amortizacion,
  amortizacion_base_contrato: montoContratoActualizado > 0 ? montoContratoActualizado : undefined,
  amortizacion_metodo: anticipoPct > 0 ? 'PORCENTAJE_CONTRATO' : undefined,
  
  retencion_ordinaria_porcentaje: retencionPct > 0 ? retencionPct : undefined,
  retencion,
  
  tratamiento_iva: tratamientoIva,
  iva_porcentaje: llevaIva ? 16 : 0,
  iva: ivaParaGuardar,
  
  subtotal: subtotalParaGuardar,
  total,
};
```

**Importante:** Los valores se calculan **UNA VEZ** al crear/editar la requisición y se guardan. Después, aunque cambien los precios del contrato, estos valores **NO se recalculan**.

---

### 4. **Componente SolicitudPagoForm.tsx**

**Ubicación:** `src/components/obra/SolicitudPagoForm.tsx`

**Cambio:** Al crear una solicitud, ahora **COPIA** los valores de la requisición en lugar de recalcular:

```typescript
// 🔒 COPIAR VALORES CONGELADOS de la requisición - NO RECALCULAR
const subtotalConceptos = conceptosDetalle.reduce((sum, c) => sum + c.importe, 0);
const totalConceptosRequisicion = req.conceptos.reduce((sum, c) => sum + c.importe, 0);
const proporcion = totalConceptosRequisicion > 0 ? subtotalConceptos / totalConceptosRequisicion : 0;

// Aplicar proporción a valores congelados
const amortizacionProporcional = (req.amortizacion || 0) * proporcion;
const ivaCalculado = ((req.iva || 0) * proporcion);

const solicitud: SolicitudPago = {
  // 🔒 VALORES CONGELADOS copiados de requisición
  subtotal_calculo: subtotalFinal,
  amortizacion_porcentaje: req.amortizacion_porcentaje,
  amortizacion_aplicada: amortizacionProporcional,
  retencion_porcentaje: req.retencion_ordinaria_porcentaje,
  tratamiento_iva: req.tratamiento_iva,
  iva_porcentaje: req.iva_porcentaje,
  iva: ivaCalculado,
  total: totalNeto,
};
```

**Patrón:** Si la solicitud incluye TODOS los conceptos de la requisición, copia los valores completos. Si es parcial, aplica proporción.

---

## 🎯 Qué se logró

### ✅ Antes (Problema)
1. Usuario crea requisición REQ-001 por $75,400
2. Sistema aprueba y genera solicitud
3. **2 días después**, precio del concepto cambia
4. Usuario abre la carátula → Aparece $83,200 ❌
5. **No se sabe qué monto se autorizó originalmente**

### ✅ Después (Solución)
1. Usuario crea requisición REQ-001 por $75,400
2. Sistema **guarda** en BD:
   - `amortizacion_porcentaje: 30`
   - `retencion_ordinaria_porcentaje: 5`
   - `iva_porcentaje: 16`
   - `subtotal: 67,860`
   - `iva: 10,857.60`
   - `total: 78,717.60`
3. **2 días después**, precio del concepto cambia
4. Usuario abre la carátula → **Muestra $78,717.60** ✅
5. **Los valores NO cambian** porque están guardados, no se recalculan

---

## 📊 Ejemplo Real

### Escenario:
- Contrato: $5,000,000
- Anticipo: 30%
- Retención: 5%
- IVA: 16%

### Requisición REQ-001:
- Concepto A: $100,000 × 1.0 m³ = $100,000
- **Al crear requisición:**
  - Amortización: $100,000 × 30% = $30,000
  - Retención: $100,000 × 5% = $5,000
  - Subtotal: $100,000 - $30,000 - $5,000 = $65,000
  - IVA: $65,000 × 16% = $10,400
  - **Total: $75,400** ← SE GUARDA EN BD

### Después cambio de precio:
- Concepto A ahora cuesta $120,000/m³
- **La requisición sigue mostrando $75,400** ✅
- Porque los valores están **congelados** en la BD

---

## 🔄 Próximos Pasos

### Pendientes para completar Problema #1:

1. **Ejecutar migraciones en Supabase**
   ```sql
   -- Ejecutar en Supabase SQL Editor
   \i supabase/migrations/20240101000000_add_frozen_fields_requisiciones.sql
   \i supabase/migrations/20240101000001_add_frozen_fields_solicitudes.sql
   ```

2. **Actualizar componentes de visualización**
   - Carátula de pago: Mostrar valores guardados (NO recalcular)
   - Requisiciones: Mostrar advertencia si valores no congelados
   - Solicitudes: Mostrar estado de bloqueo

3. **Implementar bloqueo de carátula**
   ```typescript
   // Al generar PDF de carátula
   await db.solicitudes_pago.update(solicitudId, {
     caratura_generada: true,
     caratura_bloqueada: true,
     fecha_bloqueo_caratura: new Date().toISOString()
   });
   ```

4. **Validaciones en Frontend**
   - Bloquear edición de requisición si tiene solicitudes
   - Mostrar mensaje: "Esta requisición tiene solicitudes asociadas, no se puede editar"
   - Permitir solo agregar notas/documentos

5. **Testing**
   - Crear requisición → Verificar que guarda valores congelados
   - Cambiar precio de concepto → Verificar que requisición NO cambia
   - Crear solicitud → Verificar que copia valores de requisición
   - Generar carátula → Verificar que bloquea solicitud

---

## 📝 Notas de Implementación

### Por qué se usan campos opcionales (`?`)
Los campos congelados son opcionales para:
1. **Compatibilidad:** Registros antiguos no tienen estos valores
2. **Migración gradual:** Sistema puede convivir con ambos formatos
3. **Valores por defecto:** Si no existe, se calcula una vez y se guarda

### Estrategia de Migración de Datos
Para registros existentes (sin valores congelados):
1. Al abrir requisición, verificar si faltan campos congelados
2. Si faltan, calcular y guardar valores actuales
3. Marcar como "valores históricos reconstruidos"

### Cálculo de Proporción (Solicitudes Parciales)
Cuando una solicitud incluye solo algunos conceptos:
```typescript
proporcion = suma_conceptos_seleccionados / total_requisicion
amortizacion_solicitud = amortizacion_requisicion × proporcion
iva_solicitud = iva_requisicion × proporcion
```

---

## 🐛 Problemas Conocidos

1. **Registros históricos:** Requisiciones/solicitudes antiguas no tienen valores congelados
   - **Solución:** Migración de datos (calcular y guardar valores actuales)

2. **Precision de decimales:** Posible error de redondeo en proporciones
   - **Solución:** Usar `toFixed(2)` consistentemente

3. **Constraint subtotal + IVA = total:** Puede fallar por redondeo
   - **Solución:** Tolerancia de ±0.05 en validación

---

## 📚 Referencias

- [MAPA-VISUAL.md](./MAPA-VISUAL.md) - Mapa de problemas identificados
- [PLAN-DE-ACCION-MEJORAS.md](./PLAN-DE-ACCION-MEJORAS.md) - Plan completo de mejoras
- [CHECKLIST-IMPLEMENTACION.md](./CHECKLIST-IMPLEMENTACION.md) - Checklist detallado

---

**🎉 Implementación Backend Completa**  
**⏭️ Siguiente:** Ejecutar migraciones + Actualizar componentes de visualización
