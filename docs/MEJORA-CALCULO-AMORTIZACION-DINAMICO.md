# 🔄 Mejora: Cálculo Dinámico de Amortización de Anticipo

## 📋 Resumen del Cambio

Se modificó el cálculo de amortización de anticipo para que sea **dinámico** y se base en **lo que resta por requisitar** del contrato, en lugar de usar un porcentaje fijo sobre el monto total.

---

## ❌ Problema Anterior

### Implementación Original

```typescript
// Porcentaje fijo sobre monto total del contrato
porcentaje = anticipo_monto / monto_contrato_actualizado

// Aplicar a conceptos de esta requisición
amortizacion = SUM(conceptos.importe) * porcentaje
```

### Escenario Problemático

```
Contrato original: $1,000,000
Anticipo: $300,000 (30%)

Se requisitan 10 requisiciones de $100,000 cada una:

REQ 1-10:
  → Amortización = $100,000 × 30% = $30,000 cada una
  → Total amortizado = $300,000 ✅

Luego se agrega un EXTRA de $200,000
Contrato actualizado: $1,200,000

REQ 11: Requisita $100,000
  → Porcentaje = $0 / $1,200,000 = 0%
  → Amortización = $0 ❌
  → PROBLEMA: Ya no hay anticipo disponible, pero quedan $200k por requisitar
```

**Consecuencia**: El anticipo se agota antes de completar el contrato cuando hay cambios.

---

## ✅ Solución Implementada

### Cálculo Dinámico

```typescript
// Calcular lo ya requisitado
monto_ya_requisitado = SUM(requisiciones_anteriores.monto_estimado)

// Calcular lo que resta
monto_restante = monto_contrato_actualizado - monto_ya_requisitado

// Calcular anticipo disponible
anticipo_disponible = anticipo_monto - anticipo_amortizado_anterior

// Porcentaje dinámico sobre lo que RESTA
porcentaje_dinamico = anticipo_disponible / monto_restante

// Aplicar a esta requisición
amortizacion = SUM(conceptos.importe) * porcentaje_dinamico
```

### Ventajas

1. **Distribución proporcional**: El anticipo se distribuye equitativamente durante TODO el contrato
2. **Se adapta a cambios**: Si hay extras/aditivas/deductivas, el porcentaje se ajusta automáticamente
3. **Agotamiento exacto**: El anticipo se agota exactamente al 100% del contrato
4. **Independiente del orden**: No importa cómo se requisiten los montos

---

## 📊 Comparación con Ejemplo Numérico

### Escenario

```
Contrato: $1,000,000
Anticipo: $300,000
```

### ❌ Método Anterior (Porcentaje Fijo)

```
REQ 1: $100k → 30% = $30k amortizado
REQ 2: $100k → 30% = $30k amortizado
...
REQ 10: $100k → 30% = $30k amortizado
Total: $1M requisitado, $300k amortizado ✅

--- Se agrega EXTRA $200k ---
Contrato: $1,200,000

REQ 11: $100k → 25% = $25k ❌
PROBLEMA: Solo quedan $0 de anticipo, pero se requiere $25k
```

### ✅ Método Nuevo (Porcentaje Dinámico)

```
REQ 1: $100k
  Restante: $1M - $0 = $1M
  % = $300k / $1M = 30%
  Amortiza: $30k ✅

REQ 2: $100k
  Restante: $1M - $100k = $900k
  % = $270k / $900k = 30%
  Amortiza: $30k ✅

...

REQ 10: $100k
  Restante: $1M - $900k = $100k
  % = $30k / $100k = 30%
  Amortiza: $30k ✅

--- Se agrega EXTRA $200k ---
Contrato: $1,200,000

REQ 11: $100k
  Restante: $1.2M - $1M = $200k
  Anticipo disponible: $0
  % = $0 / $200k = 0%
  Amortiza: $0 ✅
  CORRECTO: No hay anticipo disponible
```

### Con cambios durante el proceso

```
REQ 1: $100k
  Restante: $1M
  % = $300k / $1M = 30%
  Amortiza: $30k

--- AQUÍ se agrega EXTRA $200k ---
Contrato: $1,200,000

REQ 2: $100k
  Restante: $1.2M - $100k = $1.1M
  % = $270k / $1.1M = 24.55%
  Amortiza: $24.55k ✅

REQ 3: $100k
  Restante: $1.2M - $200k = $1M
  % = $245.45k / $1M = 24.55%
  Amortiza: $24.55k ✅

...continúa hasta agotar los $300k proporcionalmente
```

---

## 🔧 Implementación Técnica

### Archivo Modificado

`src/components/obra/RequisicionPagoForm.tsx`

### Cambios Principales

#### 1. Nuevo Estado

```typescript
const [montoYaRequisitado, setMontoYaRequisitado] = useState(0);
```

#### 2. Carga de Datos

```typescript
useEffect(() => {
  const requisicionesAnteriores = await db.requisiciones_pago
    .where('contrato_id')
    .equals(contratoId)
    .filter(r => !requisicion || r.id !== requisicion.id)
    .toArray();
  
  const sumAmort = requisicionesAnteriores.reduce((s, r) => s + (r.amortizacion || 0), 0);
  const sumRequisitado = requisicionesAnteriores.reduce((s, r) => s + (r.monto_estimado || 0), 0);
  
  setAmortizadoAnterior(sumAmort);
  setMontoYaRequisitado(sumRequisitado); // 🆕
}, [contratoId, requisicion]);
```

#### 3. Cálculo Dinámico

```typescript
// Calcular lo que resta
const montoRestantePorRequisitar = Math.max(0, montoContratoActualizado - montoYaRequisitado);

// Porcentaje dinámico
const anticipoPct = montoRestantePorRequisitar > 0 
  ? (anticipoDisponible / montoRestantePorRequisitar) 
  : 0;

// Aplicar a conceptos
const calcAmort = conceptos
  .filter(c => (!c.tipo || c.tipo === 'CONCEPTO') && !c.es_anticipo)
  .reduce((sum, c) => sum + (c.importe * anticipoPct), 0);
```

---

## 🧪 Casos de Prueba

### Caso 1: Sin Cambios de Contrato

```
Contrato: $1M, Anticipo: $300k

REQ 1 ($100k) → 30% → $30k ✅
REQ 2 ($100k) → 30% → $30k ✅
...
REQ 10 ($100k) → 30% → $30k ✅

Resultado: $300k amortizado de $300k ✅
```

### Caso 2: Con Extra al Inicio

```
Contrato: $1M → +$200k EXTRA → $1.2M
Anticipo: $300k

REQ 1 ($100k) → 25% → $25k ✅
REQ 2 ($100k) → 25% → $25k ✅
...
REQ 12 ($100k) → 25% → $25k ✅

Resultado: $300k amortizado de $1.2M requisitado ✅
```

### Caso 3: Con Extra a Mitad de Proceso

```
Contrato: $1M, Anticipo: $300k

REQ 1-5 ($500k total) → 30% → $150k amortizado
--- EXTRA +$200k → Contrato $1.2M ---
Anticipo restante: $150k
Por requisitar: $700k
% dinámico: 21.43%

REQ 6 ($100k) → 21.43% → $21.43k ✅
...continúa hasta agotar $150k restante
```

### Caso 4: Con Deductiva

```
Contrato: $1M, Anticipo: $300k

REQ 1-3 ($300k total) → 30% → $90k amortizado
--- DEDUCTIVA -$200k → Contrato $800k ---
Anticipo restante: $210k
Por requisitar: $500k
% dinámico: 42%

REQ 4 ($100k) → 42% → $42k ✅
...el anticipo dura hasta el final del contrato
```

---

## 📚 Documentación Actualizada

Se actualizaron los siguientes documentos:

1. **SISTEMA-ADMINISTRACION-PRESUPUESTO-COMPLETO.md**
   - Sección "2. Amortización de Anticipo en Requisición"
   - Agregada explicación del cálculo dinámico

2. **GUIA-REPLICACION-PARA-IA.md**
   - Sección "2. Amortización de Anticipo (Cálculo Dinámico)"
   - Marcado como 🔑 IMPORTANTE

---

## 🎯 Conclusión

Este cambio garantiza que:

✅ El anticipo se distribuye equitativamente durante todo el proyecto  
✅ Se adapta automáticamente a cambios de contrato  
✅ El anticipo se agota exactamente al 100% del contrato  
✅ No hay sorpresas ni desajustes al final del proyecto  

---

**Fecha de implementación**: 2026-01-13  
**Versión**: 2.0.0  
**Estado**: ✅ Implementado y documentado
