# 🚀 Sistemas de Optimización - Guía de Implementación

## 📋 Índice

1. [Sistema de Permisos Unificado (useAuthz)](#1-sistema-de-permisos-unificado-useauthz)
2. [Sistema de Estados de Solicitud (useSolicitudEstado)](#2-sistema-de-estados-de-solicitud-usesolicitudestado)
3. [Validador de Flujo (FlujoValidator)](#3-validador-de-flujo-flujovalidator)
4. [Sistema de Caché (DataCache)](#4-sistema-de-caché-datacache)
5. [Sistema de Auditoría (AuditService)](#5-sistema-de-auditoría-auditservice)
6. [Ejemplos de Integración](#6-ejemplos-de-integración)

---

## 1. Sistema de Permisos Unificado (useAuthz)

### 🎯 Propósito
Centraliza **TODA** la lógica de permisos en un solo lugar, reemplazando los sistemas dispersos anteriores.

### 📁 Ubicación
`src/lib/hooks/useAuthz.ts`

### 🔧 Uso Básico

```tsx
import { useAuthz } from '@/lib/hooks/useAuthz';

function MiComponente() {
  const { 
    canAccessModule, 
    canApproveContract,
    isContratista,
    isAdmin 
  } = useAuthz();

  // Verificar permiso de módulo + acción
  const puedeEditar = canAccessModule('contratos', 'edit');
  const puedeAprobar = canApproveContract();
  
  return (
    <div>
      {puedeEditar && <Button>Editar</Button>}
      {puedeAprobar && <Button>Aprobar</Button>}
    </div>
  );
}
```

### 🔐 Módulos y Acciones Disponibles

**Módulos:**
- `contratistas` - Gestión de contratistas
- `contratos` - Gestión de contratos
- `catalogos` - Catálogos de conceptos
- `cambios_contrato` - Aditivas/Deductivas
- `requisiciones` - Requisiciones de pago
- `solicitudes` - Solicitudes de pago
- `pagos` - Registro de pagos
- `estado_cuenta` - Estado de cuenta
- `configuracion` - Configuración del sistema
- `usuarios` - Gestión de usuarios

**Acciones:**
- `view` - Ver/leer
- `create` - Crear
- `edit` - Editar
- `delete` - Eliminar
- `approve` - Aprobar

### 🛡️ Componente de Protección

```tsx
import { RequireAuthz } from '@/components/auth/RequireAuthz';

function PaginaProtegida() {
  return (
    <RequireAuthz 
      modulo="contratos" 
      accion="edit"
      fallback={<Alert>Sin permisos</Alert>}
    >
      {/* Contenido protegido */}
    </RequireAuthz>
  );
}
```

---

## 2. Sistema de Estados de Solicitud (useSolicitudEstado)

### 🎯 Propósito
Centraliza toda la lógica de estados de solicitudes de pago.

### 📁 Ubicación
`src/lib/hooks/useSolicitudEstado.ts`

### 🔧 Uso Básico

```tsx
import { useSolicitudEstado } from '@/lib/hooks/useSolicitudEstado';

function SolicitudCard({ solicitud }) {
  const { 
    estado,
    isPagada,
    isAprobada,
    puedeAprobar,
    puedePagar,
    tieneAmbosVoBos,
    descripcion 
  } = useSolicitudEstado(solicitud);

  return (
    <div>
      <h3>Estado: {estado}</h3>
      <p>{descripcion}</p>
      {puedeAprobar && <Button>Aprobar</Button>}
      {puedePagar && <Button>Pagar</Button>}
    </div>
  );
}
```

### 📊 Estados Posibles

- **`pendiente`** - Sin Vo.Bo. completo
- **`aprobada`** - Con ambos Vo.Bo. (Desarrollador + Finanzas)
- **`pagada`** - Con comprobante de pago
- **`rechazada`** - Rechazada explícitamente

### 🎨 Hook para Badge

```tsx
import { useSolicitudBadge } from '@/lib/hooks/useSolicitudEstado';

function SolicitudBadge({ solicitud }) {
  const { color, label, icon } = useSolicitudBadge(solicitud);
  
  return <Chip color={color} label={`${icon} ${label}`} />;
}
```

---

## 3. Validador de Flujo (FlujoValidator)

### 🎯 Propósito
Valida que se cumplan todos los requisitos del flujo de negocio antes de ejecutar acciones.

### 📁 Ubicación
`src/lib/validators/flujoValidator.ts`

### 🔧 Uso Básico

```tsx
import { FlujoValidator, FlujoValidationError } from '@/lib/validators/flujoValidator';

async function crearRequisicion(contrato, conceptos) {
  try {
    // Validar antes de crear
    FlujoValidator.validarCreacionRequisicion(contrato, conceptos);
    
    // Si pasa, crear requisición
    await db.requisiciones_pago.add(...);
    
  } catch (error) {
    if (error instanceof FlujoValidationError) {
      alert(error.message);
      console.error('Código de error:', error.code);
    }
  }
}
```

### ✅ Validaciones Disponibles

**Contratos:**
- `validarCreacionContrato(data)` - Contratista, número, monto
- `validarSubidaCatalogo(contrato, conceptos)` - Conceptos válidos
- `validarAprobacionCatalogo(contrato, conceptos)` - No aprobado anteriormente

**Cambios:**
- `validarCreacionCambio(contrato, tipo, detalles)` - Catálogo aprobado
- `validarAprobacionCambio(cambio)` - No aplicado/rechazado
- `validarAplicacionCambio(cambio)` - Estado aprobado

**Requisiciones:**
- `validarCreacionRequisicion(contrato, conceptos)` - Catálogo aprobado
- `validarSubidaFactura(requisicion)` - No tiene factura previa

**Solicitudes:**
- `validarCreacionSolicitud(requisicion)` - Tiene factura
- `validarVoBo(solicitud, tipo)` - No pagada/rechazada

**Pagos:**
- `validarRealizacionPago(solicitud, monto)` - Ambos Vo.Bo., monto válido
- `validarSubidaComprobante(solicitud)` - Ambos Vo.Bo.

### 🚨 Manejo de Errores

```tsx
try {
  FlujoValidator.validarCreacionRequisicion(contrato, conceptos);
} catch (error) {
  if (error instanceof FlujoValidationError) {
    console.log('Mensaje:', error.message);
    console.log('Código:', error.code);
    console.log('Detalles:', error.details);
    
    // Mostrar al usuario
    alert(error.message);
  }
}
```

---

## 4. Sistema de Caché (DataCache)

### 🎯 Propósito
Optimiza la carga de datos reduciendo llamadas innecesarias a la BD.

### 📁 Ubicación
`src/lib/cache/dataCache.ts`

### 🔧 Uso Básico

```tsx
import { DataCache, cacheKeyContratos } from '@/lib/cache/dataCache';

async function loadContratos() {
  const contratos = await DataCache.get(
    cacheKeyContratos(), // Clave única
    async () => {
      // Función para cargar datos si no están en caché
      return await db.contratos.toArray();
    },
    {
      ttl: 60000, // 1 minuto (opcional)
      forceRefresh: false, // Forzar recarga (opcional)
    }
  );
  
  return contratos;
}
```

### ⏱️ TTL por Defecto

- **Contratos:** 1 minuto
- **Contratistas:** 5 minutos
- **Requisiciones:** 30 segundos
- **Solicitudes:** 30 segundos
- **Conceptos:** 1 minuto
- **Cambios:** 1 minuto
- **Pagos:** 30 segundos

### 🗑️ Invalidación de Caché

```tsx
import { DataCache } from '@/lib/cache/dataCache';

// Invalidar una entrada específica
DataCache.invalidate('contratos:all');

// Invalidar por patrón (regex)
DataCache.invalidatePattern(/^contratos:/);

// Invalidar todo lo relacionado con un contrato
DataCache.invalidateContrato(contratoId);

// Invalidar todas las requisiciones
DataCache.invalidateRequisiciones();

// Invalidar todas las solicitudes
DataCache.invalidateSolicitudes();

// Limpiar todo
DataCache.clear();
```

### 🔑 Helper Functions

```tsx
import {
  cacheKeyContratos,
  cacheKeyContrato,
  cacheKeyConceptos,
  cacheKeyCambios,
  cacheKeyRequisiciones,
  cacheKeySolicitudes,
  cacheKeyContratistas,
} from '@/lib/cache/dataCache';

// Generar claves consistentes
const key1 = cacheKeyContratos(); // 'contratos:all'
const key2 = cacheKeyContrato('abc-123'); // 'contrato:abc-123'
const key3 = cacheKeyConceptos('abc-123', 'ORDINARIO'); // 'conceptos:contrato:abc-123:ORDINARIO'
```

### 📊 Estadísticas

```tsx
const stats = DataCache.getStats();
console.log('Total entradas:', stats.total);
console.log('Activas:', stats.active);
console.log('Expiradas:', stats.expired);
console.log('Tamaño:', stats.sizeBytes, 'bytes');
```

---

## 5. Sistema de Auditoría (AuditService)

### 🎯 Propósito
Registra todas las acciones críticas para cumplimiento y trazabilidad.

### 📁 Ubicación
`src/lib/audit/auditLog.ts`

### 🔧 Uso Básico

```tsx
import { AuditService } from '@/lib/audit/auditLog';

async function aprobarCatalogo(contrato, usuario) {
  // Realizar acción
  await db.contratos.update(...);
  
  // Registrar en auditoría
  await AuditService.logCatalogoAprobado(
    contrato.id,
    contrato.numero_contrato,
    {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    }
  );
}
```

### 📝 Métodos Específicos

**Catálogos:**
- `logCatalogoSubido(contratoId, numero, usuario, conceptosCount)`
- `logCatalogoAprobado(contratoId, numero, usuario)`

**Cambios:**
- `logCambioCreado(cambioId, tipo, folio, contratoId, usuario, monto)`
- `logCambioAprobado(cambioId, folio, contratoId, usuario)`
- `logCambioAplicado(cambioId, folio, contratoId, usuario)`

**Requisiciones:**
- `logRequisicionCreada(requisicionId, numero, contratoId, usuario, monto)`
- `logFacturaSubida(requisicionId, numero, contratoId, usuario, facturaUrl)`

**Solicitudes:**
- `logSolicitudCreada(solicitudId, folio, usuario, monto)`
- `logVoBoDesarrollador(solicitudId, folio, usuario, dado)`
- `logVoBoFinanzas(solicitudId, folio, usuario, dado)`

**Pagos:**
- `logPagoRealizado(solicitudId, folio, usuario, monto, esTotal)`
- `logComprobanteSubido(solicitudId, folio, usuario, url)`

### 📊 Consultas

```tsx
// Historial de un recurso
const logs = await AuditService.getHistorial(contratoId, 'contrato');

// Logs de un usuario
const logsUsuario = await AuditService.getLogsByUsuario(userId, 50);

// Logs por tipo de acción
const logsAprobaciones = await AuditService.getLogsByTipo('CATALOGO_APROBADO');

// Estadísticas
const stats = await AuditService.getStats();
console.log('Total logs:', stats.total);
console.log('Últimos 7 días:', stats.ultimos7Dias);
console.log('Por tipo:', stats.porTipo);
```

---

## 6. Ejemplos de Integración

### 🔹 Ejemplo Completo: Aprobar Catálogo

```tsx
import { useAuthz } from '@/lib/hooks/useAuthz';
import { FlujoValidator } from '@/lib/validators/flujoValidator';
import { AuditService } from '@/lib/audit/auditLog';
import { DataCache } from '@/lib/cache/dataCache';

function ContratosPage() {
  const { canApproveContract } = useAuthz();
  const { user, perfil } = useAuth();

  const handleAprobarCatalogo = async (contrato: Contrato) => {
    // 1. Verificar permisos
    if (!canApproveContract()) {
      alert('No tienes permisos para aprobar catálogos');
      return;
    }

    // 2. Confirmar con usuario
    const confirmar = window.confirm('¿Aprobar este catálogo?');
    if (!confirmar) return;

    try {
      // 3. Cargar conceptos
      const conceptos = await db.conceptos_contrato
        .where('contrato_id')
        .equals(contrato.id)
        .toArray();

      // 4. Validar con FlujoValidator
      FlujoValidator.validarAprobacionCatalogo(contrato, conceptos);

      // 5. Aprobar en BD
      await supabase
        .from('contratos')
        .update({
          catalogo_aprobado: true,
          catalogo_aprobado_por: user?.id,
          catalogo_fecha_aprobacion: new Date().toISOString(),
        })
        .eq('id', contrato.id);

      // 6. Registrar en auditoría
      await AuditService.logCatalogoAprobado(
        contrato.id,
        contrato.numero_contrato,
        {
          id: user?.id || '',
          email: user?.email || '',
          rol: perfil?.roles?.[0] || '',
        }
      );

      // 7. Invalidar caché
      DataCache.invalidateContrato(contrato.id);

      alert('✅ Catálogo aprobado exitosamente');
      window.location.reload();
      
    } catch (error) {
      if (error instanceof FlujoValidationError) {
        alert(error.message);
      } else {
        alert('Error al aprobar catálogo');
      }
    }
  };

  return (
    <Button onClick={() => handleAprobarCatalogo(contrato)}>
      Aprobar Catálogo
    </Button>
  );
}
```

### 🔹 Ejemplo Completo: Crear Requisición con Caché

```tsx
import { DataCache, cacheKeyContratos, cacheKeyConceptos } from '@/lib/cache/dataCache';
import { FlujoValidator } from '@/lib/validators/flujoValidator';
import { AuditService } from '@/lib/audit/auditLog';
import { FlujoNotificationService } from '@/lib/notifications/flujoNotifications';

async function loadDataWithCache() {
  // Usar caché para contratos
  const contratos = await DataCache.get(
    cacheKeyContratos(),
    () => db.contratos.toArray(),
    { ttl: 60000 }
  );

  // Usar caché para conceptos
  const conceptos = await DataCache.get(
    cacheKeyConceptos(contratoId),
    () => db.conceptos_contrato.where('contrato_id').equals(contratoId).toArray(),
    { ttl: 60000 }
  );

  return { contratos, conceptos };
}

async function crearRequisicion(contrato, conceptos, usuario) {
  try {
    // 1. Validar
    FlujoValidator.validarCreacionRequisicion(contrato, conceptos);

    // 2. Crear
    const requisicion = await db.requisiciones_pago.add({
      contrato_id: contrato.id,
      numero: 'REQ-001',
      conceptos,
      total: conceptos.reduce((sum, c) => sum + c.importe_avance, 0),
    });

    // 3. Auditoría
    await AuditService.logRequisicionCreada(
      requisicion.id,
      requisicion.numero,
      contrato.id,
      usuario,
      requisicion.total
    );

    // 4. Notificar
    await FlujoNotificationService.notificarRequisicionCreada(requisicion, contrato);

    // 5. Invalidar caché
    DataCache.invalidateRequisiciones();

    return requisicion;
  } catch (error) {
    if (error instanceof FlujoValidationError) {
      alert(error.message);
    }
    throw error;
  }
}
```

---

## 🎯 Beneficios de los Nuevos Sistemas

### ✅ **Código Limpio**
- Lógica centralizada en un solo lugar
- Fácil de mantener y actualizar
- Menos duplicación de código

### ✅ **Seguridad Mejorada**
- Validaciones consistentes en todo el sistema
- Permisos unificados y claros
- Auditoría completa de acciones

### ✅ **Performance**
- Caché automático reduce llamadas a BD
- TTL configurable por tipo de dato
- Invalidación inteligente

### ✅ **Transparencia**
- Notificaciones automáticas
- Logs de auditoría completos
- Trazabilidad total del flujo

### ✅ **Experiencia de Usuario**
- Mensajes de error claros y específicos
- Validaciones en tiempo real
- Feedback inmediato de acciones

---

## 🚨 Recordatorios Importantes

1. **Siempre validar antes de ejecutar acciones críticas**
2. **Registrar en auditoría después de cambios importantes**
3. **Enviar notificaciones para mantener informados a los usuarios**
4. **Invalidar caché después de modificaciones**
5. **Usar useAuthz para verificar permisos**
6. **Manejar FlujoValidationError apropiadamente**

---

## 📞 Soporte

Para dudas o problemas con los sistemas:
1. Revisar esta documentación
2. Verificar los comentarios en el código fuente
3. Consultar los ejemplos de integración
4. Revisar logs de consola para debugging

---

**¡Sistema de Optimizaciones v1.0 - Listo para Producción! 🚀**
