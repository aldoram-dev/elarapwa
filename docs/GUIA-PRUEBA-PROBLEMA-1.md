# 🧪 Guía de Prueba: Problema #1 - Valores Congelados

**Objetivo:** Verificar que los montos NO cambian después de cambiar precios del contrato

---

## 📋 Pre-requisitos

✅ Migración ejecutada en Supabase  
✅ Código actualizado en branch `feature/congelar-montos-requisicion`  
✅ Aplicación corriendo en modo desarrollo

---

## 🔬 Prueba 1: Requisiciones con Valores Congelados

### Paso 1: Preparar Contrato
1. Ir a **Contratos**
2. Seleccionar o crear un contrato con:
   - Anticipo: 30%
   - Retención: 5%
   - Tratamiento IVA: "MAS IVA"
3. Agregar concepto de prueba:
   - Clave: `TEST-001`
   - Descripción: "Concepto de Prueba"
   - Unidad: m³
   - Cantidad: 10.00
   - **Precio Unitario: $10,000.00**
   - **Importe Total: $100,000.00**

### Paso 2: Crear Requisición
1. Ir a **Requisiciones de Pago**
2. Clic en "Nueva Requisición"
3. Seleccionar el contrato
4. Agregar el concepto TEST-001:
   - Cantidad esta requisición: **1.00 m³**
5. **Abrir Consola del Navegador** (F12)
6. Guardar requisición
7. **Buscar en consola:**
   ```
   🔒 Valores congelados guardados en requisición: {
     amortizacion_porcentaje: 30,
     amortizacion: 30000,
     retencion_porcentaje: 5,
     retencion: 5000,
     tratamiento_iva: "MAS IVA",
     iva_porcentaje: 16,
     iva: 10400
   }
   ```

### Paso 3: Verificar Valores Guardados
**Valores esperados:**
- Monto Estimado: $100,000.00
- Amortización (30%): -$30,000.00
- Retención (5%): -$5,000.00
- **Subtotal: $65,000.00**
- IVA (16%): +$10,400.00
- **TOTAL: $75,400.00** ✅

**Guardar estos valores para comparar después**

---

## 🧪 Prueba 2: Cambiar Precio del Contrato

### Paso 4: Modificar Precio del Concepto
1. Ir a **Contratos**
2. Abrir el contrato de prueba
3. Editar concepto TEST-001:
   - **Nuevo Precio Unitario: $15,000.00** (antes $10,000.00)
   - **Nuevo Importe Total: $150,000.00** (antes $100,000.00)
4. Guardar cambio

### Paso 5: Abrir Requisición (Verificar NO Cambia)
1. Volver a **Requisiciones de Pago**
2. Abrir la requisición creada
3. **Verificar en pantalla:**
   - Monto Estimado: **$100,000.00** (NO cambió a $150,000) ✅
   - Amortización: **$30,000.00** (NO cambió) ✅
   - Retención: **$5,000.00** (NO cambió) ✅
   - Subtotal: **$65,000.00** (NO cambió) ✅
   - IVA: **$10,400.00** (NO cambió) ✅
   - **TOTAL: $75,400.00** (NO cambió) ✅

4. **Abrir Consola del Navegador**
5. Verificar que NO hay logs de recálculo
6. Si hay log, debe decir:
   ```
   📋 Requisición existente - usando valores guardados: {
     amortizacion: 30000,
     retencion: 5000
   }
   ```

---

## 🧪 Prueba 3: Solicitudes Copian Valores

### Paso 6: Crear Solicitud desde Requisición
1. Ir a **Solicitudes de Pago**
2. Clic en "Nueva Solicitud"
3. Seleccionar la requisición de prueba
4. Marcar el concepto TEST-001
5. **Abrir Consola del Navegador**
6. Guardar solicitud
7. **Buscar en consola:**
   ```
   🔒 Valores COPIADOS de requisición (NO recalculados): {
     es_solicitud_completa: true,
     proporcion: "100.00%",
     valores_requisicion: {
       amortizacion_pct: 30,
       amortizacion: 30000,
       retencion_pct: 5,
       retencion: 5000,
       tratamiento_iva: "MAS IVA",
       iva: 10400
     },
     valores_solicitud: {
       subtotal: 65000,
       iva: 10400,
       total: 75400,
       ...
     }
   }
   ```

### Paso 7: Verificar Valores de Solicitud
**Valores esperados (deben ser IGUALES a requisición):**
- Subtotal: **$65,000.00** ✅
- IVA: **$10,400.00** ✅
- **TOTAL: $75,400.00** ✅

---

## 🎯 Prueba 4: Solicitud NO Cambia con Precio Nuevo

### Paso 8: Abrir Solicitud Después del Cambio de Precio
1. Abrir la solicitud creada
2. **Verificar montos:**
   - Subtotal: **$65,000.00** (NO cambió) ✅
   - IVA: **$10,400.00** (NO cambió) ✅
   - **TOTAL: $75,400.00** (NO cambió) ✅

### Paso 9: Crear Nueva Requisición (Debe Usar Precio Nuevo)
1. Crear NUEVA requisición del mismo contrato
2. Agregar concepto TEST-001:
   - Cantidad: **1.00 m³**
3. **Valores esperados (con precio nuevo $15,000):**
   - Monto Estimado: **$150,000.00** ✅ (precio nuevo)
   - Amortización (30%): -$45,000.00
   - Retención (5%): -$7,500.00
   - Subtotal: $97,500.00
   - IVA (16%): $15,600.00
   - **TOTAL: $113,100.00** ✅

**Esto confirma que:**
- ✅ Requisición VIEJA mantiene valores congelados ($75,400)
- ✅ Requisición NUEVA usa precio actualizado ($113,100)

---

## 📊 Tabla Comparativa (Resultados Esperados)

| Momento | Requisición Vieja | Requisición Nueva |
|---------|-------------------|-------------------|
| **Precio Concepto** | $10,000/m³ (original) | $15,000/m³ (nuevo) |
| **Monto Estimado** | $100,000 | $150,000 |
| **Amortización** | $30,000 | $45,000 |
| **Retención** | $5,000 | $7,500 |
| **Subtotal** | $65,000 | $97,500 |
| **IVA** | $10,400 | $15,600 |
| **TOTAL** | **$75,400** ✅ | **$113,100** ✅ |

---

## ✅ Criterios de Éxito

### ✅ Requisición Vieja:
- [ ] Montos NO cambian después de modificar precio
- [ ] Console log muestra "valores guardados" (no recalcula)
- [ ] Total permanece en $75,400

### ✅ Solicitud:
- [ ] Copia valores de requisición (NO recalcula)
- [ ] Console log muestra "COPIADOS de requisición"
- [ ] Total permanece en $75,400

### ✅ Requisición Nueva:
- [ ] Usa precio actualizado ($15,000)
- [ ] Total correcto ($113,100)
- [ ] Guarda nuevos valores congelados

---

## 🐛 Problemas Conocidos / Troubleshooting

### ❌ Si la requisición vieja cambia a $113,100:
**Problema:** Los valores NO se están congelando  
**Verificar:**
1. ¿Se ejecutaron las migraciones SQL?
2. ¿Los logs muestran "valores congelados guardados"?
3. ¿La tabla `requisiciones_pago` tiene columna `amortizacion_porcentaje`?

### ❌ Si la solicitud recalcula en lugar de copiar:
**Problema:** SolicitudPagoForm no está usando valores congelados  
**Verificar:**
1. ¿El log muestra "COPIADOS" o muestra cálculos?
2. ¿La solicitud tiene `subtotal_calculo` en la BD?

### ❌ Si hay error al guardar:
**Problema:** Constraint de BD o tipo de dato incorrecto  
**Verificar:**
1. Abrir Supabase Dashboard → SQL Editor
2. Ejecutar:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'requisiciones_pago' 
   AND column_name LIKE '%amortizacion%';
   ```

---

## 📝 Checklist de Prueba

```
[ ] 1. Crear requisición con precio $10,000 → Total $75,400
[ ] 2. Verificar log "valores congelados guardados"
[ ] 3. Cambiar precio a $15,000
[ ] 4. Abrir requisición vieja → Sigue en $75,400 ✅
[ ] 5. Crear solicitud desde requisición vieja
[ ] 6. Verificar log "valores COPIADOS"
[ ] 7. Solicitud muestra $75,400 ✅
[ ] 8. Crear requisición nueva → Total $113,100 ✅
[ ] 9. Verificar en BD que requisición vieja tiene amortizacion_porcentaje = 30
[ ] 10. Verificar en BD que solicitud tiene subtotal_calculo = 65000
```

---

## 🎉 Resultado Final Esperado

**Antes (Problema):**
- Requisición creada: $75,400
- Cambio de precio → Requisición ahora: $113,100 ❌
- **PROBLEMA:** No se sabe qué monto se autorizó

**Después (Solución):**
- Requisición creada: $75,400
- Cambio de precio → Requisición sigue: $75,400 ✅
- **SOLUCIÓN:** El monto autorizado queda registrado permanentemente

---

**✅ Si todas las pruebas pasan, el Problema #1 está RESUELTO**
