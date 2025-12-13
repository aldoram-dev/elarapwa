# Arquitectura de Retenciones - Mejoras Implementadas

## Problema Identificado

### Antes:
- El modo (aplicar/regresar) se infería del **signo** del `precio_unitario` (1 o -1)
- Al cargar una requisición guardada, se intentaba detectar el modo por el signo
- **Problema**: Estado ambiguo y frágil que causaba confusión al editar requisiciones

### Síntomas:
- Req 11: Aplicar retención (resta) ✓
- Req 12: Debería salir para regresar (suma) ✓
- Al regresar a Req 11: Aparece como sumando ✗ (estado incorrecto)

## Solución Implementada

### 1. Campo Explícito `modo_retencion`

**Tipo actualizado** (`RequisicionConcepto`):
```typescript
interface RequisicionConcepto {
  // ... campos existentes
  tipo?: 'CONCEPTO' | 'DEDUCCION' | 'RETENCION' | 'EXTRA';
  modo_retencion?: 'APLICAR' | 'REGRESAR'; // ✨ NUEVO CAMPO
}
```

### 2. Guardado Explícito

**Antes**:
```typescript
precio_unitario: retencionesRegresadas > 0 ? 1 : -1  // Implícito
```

**Ahora**:
```typescript
const modoRetencion = esRegreso ? 'REGRESAR' : 'APLICAR';
// ...
modo_retencion: modoRetencion  // ✨ Explícito
```

### 3. Restauración Robusta

**Antes**:
```typescript
const esDevolucion = retencionGuardada.precio_unitario > 0;  // Frágil
```

**Ahora**:
```typescript
const modoRetencion = retencionGuardada.modo_retencion || 
                     (retencionGuardada.importe > 0 ? 'REGRESAR' : 'APLICAR');
const esDevolucion = modoRetencion === 'REGRESAR';  // ✨ Robusto
```

## Beneficios

1. ✅ **Claridad**: El modo está explícito en los datos
2. ✅ **Retrocompatibilidad**: Funciona con datos antiguos (usa fallback al signo)
3. ✅ **Mantenibilidad**: Fácil de entender y depurar
4. ✅ **Consistencia**: El estado se preserva correctamente entre ediciones

## Flujo de Datos

### Guardar Requisición:
```
Usuario selecciona modo → 
  modo_retencion: 'APLICAR' | 'REGRESAR' →
    Guardar en RequisicionConcepto →
      Persistir en IndexedDB →
        Sincronizar con Supabase
```

### Cargar Requisición:
```
Leer de IndexedDB →
  Obtener modo_retencion →
    Restaurar estado UI (aplicadas/regresadas) →
      Usuario ve el modo correcto ✓
```

## Recomendaciones Futuras

### Arquitectura de Estado

1. **Normalizar Retenciones**:
   ```typescript
   // Separar tabla de "movimientos de retención"
   interface MovimientoRetencion {
     id: string;
     retencion_id: string;
     requisicion_id: string;
     tipo: 'APLICACION' | 'DEVOLUCION';
     monto: number;
     fecha: string;
   }
   ```

2. **Estado Derivado**:
   - No guardar `monto_aplicado`, `monto_regresado` en `retenciones_contrato`
   - Calcular dinámicamente desde `movimientos`
   - Fuente única de verdad (Single Source of Truth)

3. **Máquina de Estados**:
   ```typescript
   type EstadoRetencion = 
     | 'DISPONIBLE'     // Puede aplicarse
     | 'APLICADA'       // Ya aplicada en requisición
     | 'EN_SOLICITUD'   // En solicitud de pago
     | 'PAGADA'         // Solicitud pagada
     | 'DEVUELTA'       // Devuelta en requisición posterior
   ```

### Mejoras de UI

1. **Indicadores Visuales Claros**:
   - 🔴 APLICAR: Badge rojo "Retener"
   - 🟢 REGRESAR: Badge verde "Devolver"
   - Mostrar historial de movimientos

2. **Validaciones**:
   - No permitir aplicar si ya está en solicitud
   - No permitir regresar si no hay monto aplicado
   - Advertir si afecta solicitudes existentes

3. **Auditabilidad**:
   - Log de cambios en retenciones
   - Quién aplicó/regresó y cuándo
   - Trazabilidad completa

## Migración de Datos

Para datos existentes sin `modo_retencion`:
```sql
-- Script de migración (ejecutar en Supabase)
UPDATE requisiciones_pago
SET conceptos = (
  SELECT jsonb_agg(
    CASE 
      WHEN (c->>'tipo') = 'RETENCION' AND (c->>'precio_unitario')::numeric > 0 
      THEN c || '{"modo_retencion": "REGRESAR"}'
      WHEN (c->>'tipo') = 'RETENCION' AND (c->>'precio_unitario')::numeric < 0
      THEN c || '{"modo_retencion": "APLICAR"}'
      ELSE c
    END
  )
  FROM jsonb_array_elements(conceptos) AS c
)
WHERE conceptos @> '[{"tipo": "RETENCION"}]'::jsonb;
```

## Testing

### Casos de Prueba:

1. **Crear Req 11 con retención aplicada**
   - ✓ Guardar con `modo_retencion: 'APLICAR'`
   - ✓ Verificar importe negativo
   - ✓ Reabrir y verificar modo correcto

2. **Crear Req 12 con retención regresada**
   - ✓ Guardar con `modo_retencion: 'REGRESAR'`
   - ✓ Verificar importe positivo
   - ✓ Reabrir y verificar modo correcto

3. **Editar Req 11 después de crear Req 12**
   - ✓ Debe seguir mostrando APLICAR
   - ✓ No debe cambiar a REGRESAR

4. **Datos legacy sin modo_retencion**
   - ✓ Debe inferir del signo correctamente
   - ✓ Al guardar, debe agregar el campo

---

**Fecha de implementación**: 2025-12-12  
**Versión**: 1.1.0  
**Estado**: ✅ Implementado y probado
