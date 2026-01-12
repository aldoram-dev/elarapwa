# MODO ONLINE FORZADO ACTIVADO 🟢

## ¿Qué cambió?

Se ha activado el **MODO ONLINE FORZADO** en toda la aplicación para garantizar que TODOS los usuarios vean EXACTAMENTE la misma información en todo momento.

## Problema que resuelve

**ANTES:**
- Los usuarios leían datos de IndexedDB (base de datos local del navegador)
- La sincronización con Supabase era periódica
- **Resultado:** Diferentes usuarios veían información diferente hasta que se sincronizaba
- **Riesgo:** Decisiones basadas en información desactualizada

**AHORA:**
- TODAS las consultas van directamente a Supabase
- IndexedDB solo se usa como cache de respaldo si falla Supabase
- **Resultado:** Todos los usuarios ven EXACTAMENTE la misma información en tiempo real
- **Beneficio:** Información 100% sincronizada siempre

## Archivos modificados

### 1. Configuración
- `src/config/sync-config.ts` - Configuración global con `FORCE_ONLINE_MODE = true`

### 2. Helpers de datos
- `src/lib/utils/dataHelpers.ts` - Funciones que consultan Supabase primero
  - `getRequisicionesPago()` - Obtiene requisiciones de Supabase
  - `getSolicitudesPago()` - Obtiene solicitudes de Supabase
  - `getContratos()` - Obtiene contratos de Supabase
  - `getContratistas()` - Obtiene contratistas de Supabase
  - `getPagosRealizados()` - Obtiene pagos de Supabase

### 3. Páginas actualizadas
- `src/pages/obra/RegistroPagosPage.tsx`
- `src/pages/obra/SolicitudesPagoPage.tsx`
- `src/pages/obra/RequisicionesPagoPage.tsx`

## ¿Cómo funciona?

```typescript
// Antes (INCORRECTO - causaba desincronización):
const solicitudes = await db.solicitudes_pago.toArray(); // Lee de IndexedDB local

// Ahora (CORRECTO - todos ven lo mismo):
const solicitudes = await getSolicitudesPago(); // Lee de Supabase directamente
```

## Fallback de seguridad

Si Supabase no está disponible, el sistema automáticamente usa el cache de IndexedDB como respaldo:

```typescript
try {
  // Intenta obtener de Supabase
  const data = await supabase.from('solicitudes_pago').select('*');
  return data;
} catch (error) {
  // Si falla, usa cache local
  return await db.solicitudes_pago.toArray();
}
```

## Requisitos

- **Conexión a Internet:** Requerida para operación normal
- **Sin conexión:** La app mostrará datos del cache (pueden estar desactualizados)

## Para deshabilitar (NO RECOMENDADO)

Si por alguna razón necesitas volver al modo offline:

```typescript
// En src/config/sync-config.ts
export const FORCE_ONLINE_MODE = false; // Cambiar a false
```

⚠️ **ADVERTENCIA:** Deshabilitar el modo online puede causar que diferentes usuarios vean información diferente.

## Beneficios

✅ **Sincronización 100% en tiempo real**
✅ **Todos los usuarios ven la misma información**
✅ **No hay riesgo de tomar decisiones con datos desactualizados**
✅ **Auditoría completa en Supabase**
✅ **Fallback automático al cache local si falla la conexión**

## Monitoreo

En la consola del navegador verás logs como:

```
✅ Obteniendo solicitudes desde Supabase...
✅ Cache actualizado en IndexedDB
```

O si hay error:

```
❌ Error al obtener solicitudes de Supabase, usando cache local
```

---

**Última actualización:** 12 de enero de 2026
**Estado:** ✅ ACTIVO Y FUNCIONANDO
