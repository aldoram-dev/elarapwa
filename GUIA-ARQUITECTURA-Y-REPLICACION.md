# 🏗️ GUÍA COMPLETA DE ARQUITECTURA Y REPLICACIÓN - ELARA

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Estructura de Datos](#estructura-de-datos)
4. [Sistema de Roles y Permisos](#sistema-de-roles-y-permisos)
5. [Arquitectura de Supabase](#arquitectura-de-supabase)
6. [Módulos y Áreas Funcionales](#módulos-y-áreas-funcionales)
7. [Base de Datos Offline (Dexie)](#base-de-datos-offline-dexie)
8. [Contextos y Estado Global](#contextos-y-estado-global)
9. [Servicios y Lógica de Negocio](#servicios-y-lógica-de-negocio)
10. [Guía de Replicación](#guía-de-replicación)

---

## 1. Resumen Ejecutivo

**ELARA** es una aplicación PWA (Progressive Web App) para **administración y control de obra**. Permite gestionar proyectos, contratos, contratistas, presupuestos, requisiciones de pago, solicitudes de pago, pagos realizados, y cambios de contrato (aditivas, deductivas, extras).

### Características Principales:
- ✅ **Offline-First**: Funciona sin internet usando IndexedDB (Dexie)
- ✅ **Multi-proyecto**: Selector de proyecto activo
- ✅ **Sistema de Roles**: 8 roles predefinidos con permisos granulares
- ✅ **Flujo Financiero Completo**: Requisiciones → Solicitudes → Pagos → Estado de Cuenta
- ✅ **Control de Cambios**: Aditivas, Deductivas, Extras, Deducciones, Retenciones
- ✅ **Documentación**: Visualizador Autodesk, Recorrido 360°, Minutas, Reglamento
- ✅ **Reportes**: Dashboard dirección, estados de cuenta, vigencia contratos

---

## 2. Stack Tecnológico

### Frontend
```json
{
  "core": {
    "framework": "React 19.1.1",
    "language": "TypeScript 5.9.3",
    "bundler": "Vite (Rolldown 7.1.14)",
    "routing": "React Router DOM 6.30.1"
  },
  "ui": {
    "styling": "Tailwind CSS + CSS Custom Properties",
    "components": "Material-UI 7.3.5",
    "icons": "Lucide React + MUI Icons"
  },
  "state": {
    "global": "Zustand 5.0.8",
    "server": "TanStack Query 5.90.5",
    "context": "React Context API"
  },
  "database": {
    "local": "Dexie 4.2.1 (IndexedDB)",
    "remote": "Supabase 2.77.0"
  },
  "utilities": {
    "pdf": "@react-pdf/renderer 4.3.1",
    "excel": "xlsx 0.18.5",
    "csv": "papaparse 5.5.3",
    "charts": "recharts 3.4.1"
  },
  "pwa": {
    "workbox": "7.3.0",
    "plugin": "vite-plugin-pwa 1.1.0"
  }
}
```

### PWA (Progressive Web App)
**Configuración**:
- **Service Worker**: Generado automáticamente por vite-plugin-pwa
- **Workbox**: Estrategias de cache avanzadas
- **Manifest**: `public/manifest.webmanifest`
- **Iconos**: Generados desde `public/icons/`

**Archivos Generados** (en `dev-dist/` y `dist/`):
- `sw.js` - Service Worker principal
- `registerSW.js` - Script de registro del SW
- `workbox-*.js` - Librerías de Workbox

**Estrategias de Cache**:
- **Network First**: Datos dinámicos (Supabase)
- **Cache First**: Assets estáticos (CSS, JS, imágenes)
- **Stale While Revalidate**: API calls

**Funcionalidades PWA**:
- ✅ Instalable en dispositivos
- ✅ Funciona offline (IndexedDB + Service Worker)
- ✅ Actualizaciones automáticas
- ✅ Push notifications (preparado)
- ✅ Splash screens
- ✅ Iconos adaptables (Android/iOS)

### Backend (Supabase)
- **Base de Datos**: PostgreSQL 15
- **Autenticación**: Supabase Auth (JWT)
- **Storage**: Supabase Storage (documents, avatars)
- **RLS**: Row Level Security simplificado (política "all" permisiva)
- **Funciones**: Edge Functions (si necesario)

---

## 3. Estructura de Datos

### 3.1. Jerarquía de Entidades

```
Empresa (organización principal)
  └── Proyecto (sucursal, edificio, tienda, etc.)
       ├── Contratistas
       │    └── Contratos
       │         ├── Conceptos de Contrato (catálogo)
       │         ├── Cambios de Contrato
       │         │    ├── Aditivas/Deductivas
       │         │    ├── Extras
       │         │    ├── Deducciones Extra
       │         │    └── Retenciones
       │         ├── Requisiciones de Pago
       │         │    └── Solicitudes de Pago
       │         │         └── Pagos Realizados
       │         └── Estado de Cuenta
       ├── Presupuesto
       └── Configuraciones (Reglamento, Minutas, etc.)
```

### 3.2. Modelos de Datos Principales

#### **Empresa**
```typescript
interface Empresa {
  id: string
  nombre: string
  telefono?: string | null
  correo?: string | null
  logo_url?: string | null
  metadata?: Record<string, any>
  created_at?: string
  updated_at?: string
}
```

#### **Proyecto**
```typescript
interface Proyecto {
  id: string
  nombre: string
  descripcion?: string
  empresa_id?: string
  portada_url?: string
  
  // Ubicación
  direccion?: string
  ciudad?: string
  estado?: string
  pais?: string
  codigo_postal?: string
  
  // Configuración
  tipo?: 'sucursal' | 'edificio' | 'tienda' | 'oficina' | 'almacen' | 'otro'
  color?: string
  icono?: string
  active?: boolean
  orden?: number
  
  // Soft delete
  deleted?: boolean
  deleted_at?: string
  
  // Timestamps
  created_at: string
  updated_at: string
}
```

#### **Contratista**
```typescript
interface Contratista {
  id: string
  nombre: string
  razon_social?: string
  rfc?: string
  telefono?: string
  email?: string
  direccion?: string
  representante_legal?: string
  representante_telefono?: string
  representante_email?: string
  banco?: string
  cuenta_bancaria?: string
  clabe_interbancaria?: string
  activo: boolean
  notas?: string
  empresa_id?: string
  created_at: string
  updated_at: string
}
```

#### **Contrato**
```typescript
type TipoContrato = 
  | 'PRECIO_ALZADO'
  | 'PRECIO_UNITARIO'
  | 'ADMINISTRACION'
  | 'MIXTO'
  | 'Orden de Trabajo'
  | 'Orden de Compra'
  | 'Llave en Mano'
  | 'Prestacion de Servicios'

type TratamientoIVA = 
  | 'IVA EXENTO'     // No lleva IVA
  | 'MAS IVA'        // Lleva IVA adicional (16%)
  | 'IVA TASA 0'     // IVA al 0%

interface Contrato {
  id: string
  created_at: string
  updated_at: string
  
  // Información básica
  numero_contrato?: string
  nombre?: string
  clave_contrato?: string
  descripcion?: string
  tipo_contrato?: TipoContrato
  tratamiento?: TratamientoIVA
  
  // Relaciones
  contratista_id: string
  empresa_id?: string
  
  // Categorización
  categoria?: string
  partida?: string
  subpartida?: string
  
  // Montos
  monto_contrato: number // Monto Neto Contratado
  moneda?: string
  anticipo_monto?: number // Monto Neto de Anticipo
  
  // Retenciones y penalizaciones
  retencion_porcentaje?: number
  penalizacion_maxima_porcentaje?: number
  penalizacion_por_dia?: number
  
  // Fechas
  fecha_inicio?: string
  fecha_fin?: string
  fecha_fin_real?: string
  duracion_dias?: number
  
  // Estado
  estatus?: 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'ACTIVO' | 'FINALIZADO' | 'CANCELADO'
  porcentaje_avance?: number
  
  // Catálogo (Aprobación)
  catalogo_aprobado?: boolean
  catalogo_aprobado_por?: string
  catalogo_fecha_aprobacion?: string
  
  // Documentos
  contrato_pdf_url?: string
  documentos_adjuntos?: string[]
}
```

#### **ConceptoContrato** (Catálogo del Contrato)
```typescript
interface ConceptoContrato {
  id: string
  created_at: string
  updated_at: string
  
  // Relación
  contrato_id: string
  
  // Categorización
  partida: string
  subpartida: string
  actividad: string
  clave: string
  
  // Descripción
  concepto: string
  unidad: string
  
  // FIJOS (catálogo original)
  cantidad_catalogo: number
  precio_unitario_catalogo: number
  importe_catalogo: number
  
  // VIVOS (estimaciones)
  cantidad_estimada: number
  precio_unitario_estimacion: number
  importe_estimado: number
  volumen_estimado_fecha: number
  monto_estimado_fecha: number
  
  // Metadata
  notas: string | null
  orden: number
  active: boolean
}
```

#### **CambioContrato** (Aditivas, Deductivas, Extras)
```typescript
type TipoCambioContrato = 'ADITIVA' | 'DEDUCTIVA' | 'EXTRA' | 'DEDUCCION_EXTRA' | 'RETENCION'

interface CambioContrato {
  id: string
  created_at: string
  updated_at: string
  
  contrato_id: string
  numero_cambio: string // ADT-001, DED-001, EXT-001
  tipo_cambio: TipoCambioContrato
  descripcion: string
  
  // Montos
  monto_cambio: number
  monto_contrato_anterior: number
  monto_contrato_nuevo: number
  
  // Fechas
  fecha_cambio: string
  fecha_aprobacion?: string
  
  // Estado
  estatus: 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'RECHAZADO' | 'APLICADO'
  
  // Documentos
  archivo_plantilla_url?: string
  archivo_aprobacion_url?: string
  
  // Metadata
  motivo_cambio?: string
  observaciones?: string
}

// Detalles de Aditiva/Deductiva (conceptos del catálogo modificados)
interface DetalleAditivaDeductiva {
  id: string
  cambio_contrato_id: string
  concepto_contrato_id: string
  cantidad_original: number
  cantidad_modificacion: number
  cantidad_nueva: number
  importe_modificacion: number
}

// Detalles de Extra (conceptos nuevos no en catálogo)
interface DetalleExtra {
  id: string
  cambio_contrato_id: string
  concepto_clave: string
  concepto_descripcion: string
  concepto_unidad: string
  cantidad: number
  precio_unitario: number
  importe: number
}

// Deducción Extra (deducciones directas)
interface DeduccionExtra {
  id: string
  cambio_contrato_id: string
  descripcion: string
  monto: number
}

// Retención de Contrato (retenciones aplicadas/regresadas)
interface RetencionContrato {
  id: string
  cambio_contrato_id: string
  descripcion: string
  monto: number
  monto_aplicado: number
  monto_regresado: number
  monto_disponible: number
}
```

#### **RequisicionPago**
```typescript
interface RequisicionPago {
  id: string
  contrato_id: string
  numero: string // REQ-001
  fecha: string
  
  // Conceptos
  conceptos: RequisicionConcepto[] // [{concepto_contrato_id, cantidad, precio, importe}]
  
  // Cálculos financieros
  monto_estimado: number
  amortizacion: number
  retencion: number
  otros_descuentos: number
  retenciones_aplicadas?: number
  retenciones_regresadas?: number
  lleva_iva?: boolean
  subtotal: number // antes de IVA
  iva: number // 16% si lleva_iva=true
  total: number // subtotal + iva
  
  // Documentación
  descripcion_general?: string
  notas?: string
  respaldo_documental?: string[]
  factura_url?: string
  
  // Estado
  estado: 'borrador' | 'enviada' | 'aprobada' | 'pagada' | 'cancelada'
  estatus_pago?: 'NO PAGADO' | 'PAGADO' | 'PAGADO PARCIALMENTE'
  
  // Visto Bueno
  visto_bueno?: boolean
  visto_bueno_por?: string
  visto_bueno_fecha?: string
  fecha_pago_estimada?: string
  
  created_at: string
  updated_at: string
}

interface RequisicionConcepto {
  concepto_contrato_id: string
  clave: string
  concepto: string
  unidad: string
  cantidad_catalogo: number
  cantidad_pagada_anterior: number
  cantidad_esta_requisicion: number
  precio_unitario: number
  importe: number
  tipo?: 'CONCEPTO' | 'DEDUCCION' | 'RETENCION' | 'EXTRA' | 'ANTICIPO'
  modo_retencion?: 'APLICAR' | 'REGRESAR'
  es_anticipo?: boolean
}
```

#### **SolicitudPago**
```typescript
interface SolicitudPago {
  id?: number
  folio: string // SOL-001
  requisicion_id: string
  concepto_ids: string[]
  conceptos_detalle: ConceptoSolicitud[]
  deducciones_extra?: DeduccionExtraSolicitud[]
  lleva_iva?: boolean
  
  // Descuentos aplicados
  amortizacion_aplicada?: number
  retencion_aplicada?: number
  otros_descuentos_aplicados?: number
  deducciones_extras_total?: number
  
  // Totales
  subtotal: number
  iva: number
  total: number
  fecha: string
  estado: 'pendiente' | 'aprobada' | 'pagada' | 'rechazada'
  notas?: string
  
  // Aprobaciones (Vo.Bo.)
  vobo_gerencia?: boolean
  vobo_gerencia_por?: string
  vobo_gerencia_fecha?: string
  
  vobo_desarrollador?: boolean
  vobo_desarrollador_por?: string
  vobo_desarrollador_fecha?: string
  
  vobo_finanzas?: boolean
  vobo_finanzas_por?: string
  vobo_finanzas_fecha?: string
  
  // Pago
  monto_pagado?: number
  fecha_pago?: string
  fecha_pago_esperada?: string // fecha solicitud + 15 días (ajustada a viernes)
  referencia_pago?: string
  comprobante_pago_url?: string // URL del PDF de la factura
  factura_xml_url?: string // URL del XML de la factura
  estatus_pago?: 'NO PAGADO' | 'PAGADO' | 'PAGADO PARCIALMENTE'
  
  created_at: string
  updated_at: string
}
```

#### **PagoRealizado**
```typescript
interface PagoRealizado {
  id: string
  solicitud_pago_id?: number
  requisicion_pago_id?: string
  contrato_id: string
  concepto_contrato_id?: string
  
  // Montos
  monto_pagado: number
  monto_original?: number
  
  // Fechas
  fecha_pago: string
  fecha_programada?: string
  
  // Documentación
  referencia_pago?: string
  comprobante_pago_url?: string
  metodo_pago?: string
  
  // Estado
  estatus: 'PENDIENTE' | 'PAGADO' | 'CANCELADO'
  
  // Metadata
  notas?: string
  tipo_pago?: 'NORMAL' | 'PARCIAL' | 'ANTICIPO' | 'FINIQUITO'
  
  created_at: string
  updated_at: string
}
```

#### **Presupuesto**
```typescript
interface ConceptoPresupuesto {
  id: string
  categoria: string
  partida: string
  subpartida: string
  ubicacion: string
  concepto_id: string
  unidad: string
  volumetria_arranque: number
  pu_parametrico: number
  presupuesto_base: number
  presupuesto_concursado?: number
  presupuesto_contratado?: number
  presupuesto_ejercido?: number
  proyecto_id?: string
  created_at?: string
  updated_at?: string
}
```

#### **DocumentoAuditoria** (Control Documental)
```typescript
interface DocumentoAuditoria {
  id: string
  especialidad: string // Categoría del documento (Seguros, Licencias, Permisos, etc.)
  numero: number // Número correlativo
  descripcion: string // Descripción del documento
  estatus: 'OK' | 'FALTA' // Estado del documento
  no_se_requiere: boolean // Si el documento no aplica
  fecha_emision?: string
  fecha_vencimiento?: string
  control?: string // Número de control
  archivo_url?: string // URL del archivo en Storage
  archivo_nombre?: string // Nombre original del archivo
  updated_at?: string
  updated_by?: string
  created_at?: string
}
```

#### **Usuario**
```typescript
interface Usuario {
  id: string
  email: string
  nombre?: string
  telefono?: string
  avatar_url?: string
  contratista_id?: string  // Solo contratista, NO empresa
  nivel?: string           // Usuario, Administrador
  roles?: string[]         // Array de roles múltiples
  active?: boolean
  created_at: string
  updated_at: string
}
```

---

## 4. Sistema de Roles y Permisos

### 4.1. Roles Predefinidos

El sistema tiene **8 roles fijos** visibles en la UI:

```typescript
const FIXED_ROLES = [
  {
    id: 'gerente-plataforma',
    name: 'Gerente Plataforma',
    description: 'Administrador principal con acceso completo (rol master intocable)',
    color: '#22C55E', // Verde
    protected: true,
    order: 0
  },
  {
    id: 'gerencia',
    name: 'Gerencia',
    description: 'Rol de gerencia con acceso a gestión de proyectos y contratos',
    color: '#8B5CF6', // Morado
    order: 1
  },
  {
    id: 'desarrollador',
    name: 'DESARROLLADOR',
    description: 'Acceso a herramientas de desarrollo y configuración técnica',
    color: '#3B82F6', // Azul
    order: 2
  },
  {
    id: 'supervisor-elara',
    name: 'SUPERVISOR ELARA',
    description: 'Supervisor general de operaciones de Elara',
    color: '#6366F1', // Índigo
    order: 3
  },
  {
    id: 'contratista',
    name: 'CONTRATISTA',
    description: 'Usuario externo con acceso limitado a proyectos específicos',
    color: '#F59E0B', // Amarillo
    order: 4
  },
  {
    id: 'administracion',
    name: 'ADMINISTRACIÓN',
    description: 'Personal administrativo con acceso a gestión y documentación',
    color: '#10B981', // Verde
    order: 5
  },
  {
    id: 'finanzas',
    name: 'FINANZAS',
    description: 'Acceso a información financiera y reportes económicos',
    color: '#06B6D4', // Cyan
    order: 6
  },
  {
    id: 'usuario',
    name: 'USUARIO',
    description: 'Usuario básico con acceso limitado',
    color: '#6B7280', // Gris
    order: 7
  }
]
```

**Nota**: Existe un rol oculto **"Sistemas"** (super admin) que NO se muestra en la UI y se asigna manualmente por el owner.

### 4.2. Permisos por Ruta

```typescript
// Ejemplo de permisos configurados
const ROUTE_PERMISSIONS = {
  '/inicio': {
    allowedRoles: ['*'], // Todos
  },
  '/obra': {
    allowedRoles: ['Gerente Plataforma', 'Gerencia', 'Desarrollador', 'ADMINISTRACIÓN', 'CONTRATISTA', 'Supervisor Elara', 'FINANZAS'],
  },
  '/obra/presupuesto': {
    allowedRoles: ['Gerente Plataforma', 'Gerencia', 'Desarrollador'],
  },
  '/obra/contratos': {
    allowedRoles: ['Gerente Plataforma', 'Gerencia', 'Desarrollador', 'ADMINISTRACIÓN', 'CONTRATISTA', 'Supervisor Elara', 'FINANZAS'],
  },
  '/configuracion': {
    allowedRoles: ['Gerente Plataforma', 'Sistemas', 'Desarrollador'],
  },
  // ... más rutas
}
```

### 4.3. Roles Admin

```typescript
const ADMIN_ROLES = [
  'Gerente Plataforma',
  'Sistemas',
  'SISTEMAS',
  'Desarrollador',
  'DESARROLLADOR'
]
```

Los roles admin tienen acceso a todas las rutas automáticamente.

### 4.4. Asignación de Roles

Los roles se asignan en la tabla `roles_usuario`:
```sql
CREATE TABLE roles_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Arquitectura de Supabase

### 5.1. Tablas Principales

```
✅ auth.users (Supabase Auth)
✅ public.usuarios (perfiles extendidos)
✅ public.roles (roles del sistema)
✅ public.roles_usuario (asignación de roles)
✅ public.empresas
✅ public.proyectos
✅ public.contratistas
✅ public.contratos
✅ public.conceptos_contrato
✅ public.cambios_contrato
✅ public.detalles_aditiva_deductiva
✅ public.detalles_extra
✅ public.deducciones_extra
✅ public.retenciones_contrato
✅ public.requisiciones_pago
✅ public.solicitudes_pago
✅ public.pagos_realizados
✅ public.conceptos_presupuesto
✅ public.reglamento_config
✅ public.minutas_config
✅ public.fuerza_trabajo_config
✅ public.programa_obra_config
✅ public.recorrido360_config
✅ public.documentos_auditoria
✅ public.visualizador_areas
✅ public.visualizador_links
✅ public.reporte_direccion_config
✅ public.notifications
✅ public.notification_groups
✅ public.security_events
```

### 5.2. Row Level Security (RLS)

**Política Simplificada**: Todas las tablas tienen una política "all" permisiva:

```sql
CREATE POLICY "all" 
ON public.{tabla} 
AS PERMISSIVE 
FOR ALL 
TO public 
USING (true);
```

Esto significa que **cualquier usuario autenticado** puede hacer cualquier operación en cualquier tabla. El control de acceso se maneja en la **capa de aplicación** usando roles y permisos.

### 5.3. Migraciones

Las migraciones están en `supabase/migrations/`:
- `20251222_create_presupuestos.sql`
- `20251227_add_lleva_iva_requisiciones.sql`
- `20251229_add_lleva_iva_solicitudes.sql`
- `20251230_add_lleva_iva_completo.sql`
- `20260102_remove_categoria_partida_contratistas.sql`
- `20260103_fix_requisiciones_pago.sql`
- `20260104_simplify_rls.sql` ← **Simplificación de RLS**
- `20260105_add_subtotal_iva.sql`
- `20260105_fix_constraint_negative_values.sql`
- `20260120_add_factura_xml_url.sql`
- `create_reporte_direccion_config.sql`

### 5.4. Storage

Buckets configurados:
- **documents**: Archivos privados (contratos PDF, comprobantes, facturas, etc.)
- **avatars**: Fotos de perfil de usuarios

---

## 6. Módulos y Áreas Funcionales

### 6.1. Módulo: INICIO (Dashboard)
- **Ruta**: `/inicio`
- **Permisos**: Todos los usuarios autenticados
- **Funcionalidad**: Dashboard principal con resumen de proyectos y notificaciones

### 6.2. Módulo: DIRECCIÓN
- **Ruta**: `/direccion`
- **Permisos**: Gerente Plataforma, Desarrollador
- **Páginas**:
  - `/direccion/reporte`: Reporte de dirección (configuración dinámica de URLs)

### 6.3. Módulo: OBRA (Administración de Obra)
- **Ruta**: `/obra`
- **Permisos**: Gerencia, Admin, Finanzas, Contratista, Supervisor
- **Páginas**:
  1. **Reglamento** (`/obra/reglamento`): Enlace a documento de reglamento
  2. **Presupuesto** (`/obra/presupuesto`): Gestión de presupuesto base/concursado/contratado/ejercido
  3. **Contratistas** (`/obra/contratistas`): CRUD de contratistas
  4. **Contratos** (`/obra/contratos`): CRUD de contratos + gestión de catálogo de conceptos + cambios (aditivas, deductivas, extras)
  5. **Vigencia Contratos** (`/obra/vigencia-contratos`): Vista de contratos por fecha de vencimiento
  6. **Requisiciones de Pago** (`/obra/requisiciones-pago`): Crear/editar requisiciones por contrato
  7. **Solicitudes de Pago** (`/obra/solicitudes-pago`): Desglose de requisiciones en solicitudes + Vo.Bo. gerencia/desarrollador/finanzas
  8. **Pagos** (`/obra/registro-pagos`): Registro de pagos realizados + comprobantes
  9. **Estado de Cuenta** (`/obra/estado-cuenta`): Resumen financiero por contrato (monto, pagado, pendiente)
  10. **Minutas** (`/obra/minutas`): Enlace a Google Drive de minutas
  11. **Fuerza Laboral** (`/obra/fuerzas-trabajo`): Enlace a Buba (sistema de control de asistencia)
  12. **Auditoría Documental** (`/obra/auditoria-documental`): Control de documentos por especialidad (seguros, licencias, permisos)

### 6.4. Módulo: PROYECTO
- **Ruta**: `/proyecto`
- **Permisos**: Gerencia, Admin, Supervisor, Finanzas
- **Páginas**:
  1. **Info Proyecto** (`/proyecto/info`): Información general del proyecto (dirección, teléfono, etc.)
  2. **Visualizador Autodesk** (`/proyecto/visualizador`): Links a modelos Autodesk por área

### 6.5. Módulo: CONSTRUCCIÓN
- **Ruta**: `/construccion`
- **Permisos**: Gerencia, Admin, Supervisor
- **Páginas**:
  1. **Avance de Obra** (`/construccion/avance-obra`): Dashboard de avance físico
  2. **Programa de Obra** (`/construccion/programa-obra`): Enlace a programa de obra (MS Project, Gantt)
  3. **Recorrido 360°** (`/construccion/recorrido-360`): Enlace a tours virtuales

### 6.6. Módulo: CONFIGURACIÓN
- **Ruta**: `/configuracion`
- **Permisos**: Gerente Plataforma, Sistemas, Desarrollador
- **Páginas**:
  1. **Usuarios** (`/configuracion/usuarios`): CRUD de usuarios + asignación de roles
  2. **Importar Datos** (`/configuracion/importacion`): Importación masiva de contratos/conceptos desde Excel
  3. **Migrar Amortizaciones** (`/configuracion/migrar-amortizaciones`): Script de migración de datos legacy
  4. **Mi Perfil** (`/configuracion/perfil`): Gestión de perfil de usuario (avatar, datos personales)
  5. **Proyectos** (`/configuracion/proyectos`): Gestión de proyectos (solo admin)
  6. **Notificaciones Admin** (`/configuracion/notificaciones`): Administración de notificaciones del sistema
  7. **Sandbox** (`/configuracion/sandbox`): Página de pruebas y desarrollo (solo desarrolladores)

---

## 7. Base de Datos Offline (Dexie)

### 7.1. Estructura

La app usa **Dexie.js** (wrapper de IndexedDB) para funcionar offline.

```typescript
class ElaraDB extends Dexie {
  usuarios!: Table<UsuarioDB>
  permissions!: Table<Permission>
  userPermissions!: Table<UserPermission>
  roles!: Table<Role>
  userRoles!: Table<UserRole>
  empresas!: Table<EmpresaDB>
  proyectos!: Table<ProyectoDB>
  contratistas!: Table<ContratistaDB>
  contratos!: Table<ContratoDB>
  conceptos_contrato!: Table<ConceptoContratoDB>
  requisiciones_pago!: Table<RequisicionPagoDB>
  solicitudes_pago!: Table<SolicitudPagoDB>
  pagos_realizados!: Table<PagoRealizadoDB>
  cambios_contrato!: Table<CambioContratoDB>
  detalles_aditiva_deductiva!: Table<DetalleAditivaDeductivaDB>
  detalles_extra!: Table<DetalleExtraDB>
  deducciones_extra!: Table<DeduccionExtraDB>
  retenciones_contrato!: Table<RetencionContratoDB>
  reglamento_config!: Table<ReglamentoConfig>
  minutas_config!: Table<MinutasConfig>
  fuerza_trabajo_config!: Table<FuerzaTrabajoConfig>
  programa_obra_config!: Table<ProgramaObraConfig>
  recorrido360_config!: Table<Recorrido360Config>
  documentos_auditoria!: Table<DocumentoAuditoria>
  syncMetadata!: Table<SyncMetadata>
  cache!: Table<CacheEntry>
}
```

### 7.2. Campos de Sincronización

Todos los registros tienen campos:
```typescript
interface DexieSyncFields {
  last_sync?: string     // Última sincronización con Supabase
  _dirty?: boolean       // Indica si necesita sincronización
  _deleted?: boolean     // Soft delete local
}
```

### 7.3. Hooks Automáticos

```typescript
// Al crear un registro
table.hook('creating', (primKey, obj, trans) => {
  obj._dirty = true
  obj.created_at = obj.created_at || new Date().toISOString()
  obj.updated_at = new Date().toISOString()
})

// Al actualizar un registro
table.hook('updating', (modifications, primKey, obj, trans) => {
  modifications._dirty = true
  modifications.updated_at = new Date().toISOString()
})
```

---

## 8. Contextos y Estado Global

### 8.1. AuthContext
```typescript
// src/context/AuthContext.tsx
interface AuthState {
  session: Session | null
  user: User | null
  perfil: Perfil | null  // {id, nivel, roles[], contratista_id, active}
  loading: boolean
  signOut: () => Promise<void>
}
```

**Responsabilidades**:
- Cargar sesión de Supabase Auth
- Cargar perfil del usuario desde `usuarios`
- Cargar roles del usuario desde `roles_usuario`
- Fallback a datos offline (Dexie) si falla la carga online

### 8.2. ProjectContext
```typescript
// src/context/ProjectContext.tsx
interface ProjectContextType {
  currentProject: Proyecto | null
  selected: Proyecto | null
  setCurrentProject: (proyecto: Proyecto | null) => void
}
```

**Responsabilidades**:
- Mantener el proyecto activo seleccionado
- Filtrar datos por `proyecto_id` en toda la app

### 8.3. PermissionsDataProvider
```typescript
// src/context/PermissionsDataProvider.tsx
interface PermData {
  allRoles: Role[]
  allPermissions: Permission[]
  userRoles: UserRole[]
  userPermissions: UserPermission[]
}
```

**Responsabilidades**:
- Proveer datos de roles y permisos a toda la app
- Usado por componentes de configuración

### 8.4. NotificationContext
```typescript
// src/context/NotificationContext.tsx
interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
}

// Tipos de notificaciones
type NotificationType = 'info' | 'success' | 'warning' | 'error'
type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'
type NotificationTargetType = 'all' | 'empresa' | 'users' | 'user' | 'roles' | 'role' | 'groups' | 'group'

interface UserNotification {
  id: string
  user_id: string
  notification_id?: string
  title: string
  message: string
  type: NotificationType
  priority: NotificationPriority
  read: boolean
  read_at?: string
  clicked_at?: string
  action_url?: string
  action_label?: string
  icon?: string
  metadata?: Record<string, any>
  created_at: string
  expires_at?: string
  target_type?: NotificationTargetType
  target_empresa_id?: string
  target_user_ids?: string[]
  target_roles?: string[]
  target_group_ids?: string[]
}

interface NotificationGroup {
  id: string
  name: string
  description?: string
  user_ids: string[]
  created_at: string
  updated_at: string
}
```

**Características del Sistema de Notificaciones**:
- ✅ Notificaciones en tiempo real
- ✅ Múltiples niveles de prioridad (low, normal, high, urgent)
- ✅ Tipos de notificación (info, success, warning, error)
- ✅ Targeting flexible (todos, empresa, usuarios específicos, roles, grupos)
- ✅ Acciones personalizadas con URLs
- ✅ Notificaciones con expiración
- ✅ Grupos de notificaciones para envío masivo
- ✅ Estadísticas de lectura y clicks

### 8.5. Stores (Zustand)

```typescript
// src/stores/empresaStore.ts
interface EmpresaStore {
  empresa: Empresa | null
  setEmpresa: (empresa: Empresa | null) => void
}

// src/stores/proyectoStore.ts
interface ProyectoStore {
  proyectoActual: Proyecto | null
  setProyectoActual: (proyecto: Proyecto | null) => void
}

// src/stores/userStore.ts
interface UserStore {
  user: User | null
  setUser: (user: User | null) => void
}

// src/stores/usuarioStore.ts
interface UsuarioStore {
  usuarios: Usuario[]
  loadUsuarios: () => Promise<void>
}
```

---

## 9. Servicios y Lógica de Negocio

### 9.1. Servicios Disponibles

```
src/lib/services/
├── empresaService.ts          # CRUD empresas
├── proyectoService.ts         # CRUD proyectos
├── usuarioService.ts          # CRUD usuarios
├── notificationService.ts     # Envío/recepción notificaciones
├── notificationGroupsService.ts  # Grupos de notificaciones
├── pagoRealizadoService.ts    # CRUD pagos realizados
├── securityEventService.ts    # Log de eventos de seguridad
├── forumMessageService.ts     # Mensajes de foro (comentarios)
└── googleSheetsService.ts     # Integración con Google Sheets (importación)
```

### 9.2. TanStack Query (React Query)

La app usa **TanStack Query** para:
- Cache de datos del servidor
- Invalidación automática
- Persistencia offline

Configuración:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      cacheTime: 1000 * 60 * 30, // 30 minutos
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})
```

---

## 10. Guía de Replicación

### 10.1. Checklist Pre-Replicación

Antes de replicar la app en otro entorno, asegúrate de tener:

✅ **Cuenta de Supabase** (nueva instancia)
✅ **URL y anon key** de Supabase
✅ **PostgreSQL 15+** (incluido en Supabase)
✅ **Node.js 18+** y **pnpm**
✅ **Git** para clonar el repo

### 10.2. Pasos de Replicación

#### **Paso 1: Clonar el Proyecto**
```bash
git clone [URL_DEL_REPO] elara-nuevo
cd elara-nuevo
pnpm install
```

#### **Paso 2: Configurar Variables de Entorno**
Crear archivo `.env.local`:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

#### **Paso 3: Ejecutar Migraciones en Supabase**

**Opción A: Usando Supabase CLI** (recomendado)
```bash
# Instalar Supabase CLI
npm install -g supabase

# Inicializar proyecto
supabase init

# Linkear con tu proyecto
supabase link --project-ref tu-proyecto-ref

# Ejecutar migraciones
supabase db push
```

**Opción B: Manualmente en SQL Editor**
1. Ir a Supabase Dashboard → SQL Editor
2. Ejecutar los archivos SQL en orden:
   ```
   1. 20251222_create_presupuestos.sql
   2. 20251227_add_lleva_iva_requisiciones.sql
   3. 20251229_add_lleva_iva_solicitudes.sql
   4. 20251230_add_lleva_iva_completo.sql
   5. 20260102_remove_categoria_partida_contratistas.sql
   6. 20260103_fix_requisiciones_pago.sql
   7. 20260104_simplify_rls.sql
   8. 20260105_add_subtotal_iva.sql
   9. 20260105_fix_constraint_negative_values.sql
   10. 20260120_add_factura_xml_url.sql
   11. create_reporte_direccion_config.sql
   12. EJECUTAR-EN-SUPABASE.sql (visualizador)
   ```

#### **Paso 4: Ejecutar Script de Schema Base**

Si no tienes un archivo `schema.sql` completo, deberás crear las tablas manualmente siguiendo la estructura de tipos TypeScript. Las tablas principales son:

```sql
-- Empresas
CREATE TABLE empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  telefono TEXT,
  correo TEXT,
  logo_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proyectos
CREATE TABLE proyectos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  empresa_id UUID REFERENCES empresas(id),
  portada_url TEXT,
  direccion TEXT,
  ciudad TEXT,
  estado TEXT,
  pais TEXT,
  codigo_postal TEXT,
  tipo TEXT,
  color TEXT,
  icono TEXT,
  active BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usuarios (perfiles extendidos)
CREATE TABLE usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre TEXT,
  telefono TEXT,
  avatar_url TEXT,
  contratista_id UUID REFERENCES contratistas(id),
  nivel TEXT,
  roles TEXT[],
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roles
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT,
  permissions TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roles Usuario
CREATE TABLE roles_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contratistas
CREATE TABLE contratistas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  razon_social TEXT,
  rfc TEXT,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  representante_legal TEXT,
  representante_telefono TEXT,
  representante_email TEXT,
  banco TEXT,
  cuenta_bancaria TEXT,
  clabe_interbancaria TEXT,
  activo BOOLEAN DEFAULT true,
  notas TEXT,
  empresa_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contratos
CREATE TABLE contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_contrato TEXT,
  nombre TEXT,
  clave_contrato TEXT,
  descripcion TEXT,
  tipo_contrato TEXT,
  tratamiento TEXT,
  contratista_id UUID REFERENCES contratistas(id),
  empresa_id UUID,
  categoria TEXT,
  partida TEXT,
  subpartida TEXT,
  monto_contrato NUMERIC NOT NULL,
  moneda TEXT DEFAULT 'MXN',
  anticipo_monto NUMERIC,
  retencion_porcentaje NUMERIC,
  penalizacion_maxima_porcentaje NUMERIC,
  penalizacion_por_dia NUMERIC,
  fecha_inicio DATE,
  fecha_fin DATE,
  fecha_fin_real DATE,
  duracion_dias INTEGER,
  estatus TEXT,
  porcentaje_avance NUMERIC,
  catalogo_aprobado BOOLEAN DEFAULT false,
  catalogo_aprobado_por UUID,
  catalogo_fecha_aprobacion TIMESTAMPTZ,
  catalogo_observaciones TEXT,
  contrato_pdf_url TEXT,
  documentos_adjuntos TEXT[],
  forma_pago TEXT,
  condiciones_pago TEXT,
  alcance_trabajo TEXT,
  especificaciones_tecnicas TEXT,
  notas TEXT,
  metadata JSONB,
  active BOOLEAN DEFAULT true,
  created_by UUID,
  aprobado_por UUID,
  fecha_aprobacion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conceptos Contrato
CREATE TABLE conceptos_contrato (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID REFERENCES contratos(id) ON DELETE CASCADE,
  partida TEXT NOT NULL,
  subpartida TEXT NOT NULL,
  actividad TEXT NOT NULL,
  clave TEXT NOT NULL,
  concepto TEXT NOT NULL,
  unidad TEXT NOT NULL,
  cantidad_catalogo NUMERIC NOT NULL,
  precio_unitario_catalogo NUMERIC NOT NULL,
  importe_catalogo NUMERIC NOT NULL,
  cantidad_estimada NUMERIC DEFAULT 0,
  precio_unitario_estimacion NUMERIC DEFAULT 0,
  importe_estimado NUMERIC DEFAULT 0,
  volumen_estimado_fecha NUMERIC DEFAULT 0,
  monto_estimado_fecha NUMERIC DEFAULT 0,
  cantidad_pagada_anterior NUMERIC DEFAULT 0,
  tiene_cambios BOOLEAN DEFAULT false,
  cantidad_catalogo_original NUMERIC,
  notas TEXT,
  orden INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cambios Contrato
CREATE TABLE cambios_contrato (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID REFERENCES contratos(id) ON DELETE CASCADE,
  numero_cambio TEXT NOT NULL,
  tipo_cambio TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  monto_cambio NUMERIC NOT NULL,
  monto_contrato_anterior NUMERIC NOT NULL,
  monto_contrato_nuevo NUMERIC NOT NULL,
  fecha_cambio DATE NOT NULL,
  fecha_aprobacion DATE,
  fecha_aplicacion DATE,
  estatus TEXT NOT NULL,
  archivo_plantilla_url TEXT,
  archivo_aprobacion_url TEXT,
  documentos_soporte TEXT[],
  solicitado_por UUID,
  aprobado_por UUID,
  revisado_por UUID,
  motivo_cambio TEXT,
  observaciones TEXT,
  notas_aprobacion TEXT,
  metadata JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detalles Aditiva Deductiva
CREATE TABLE detalles_aditiva_deductiva (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cambio_contrato_id UUID REFERENCES cambios_contrato(id) ON DELETE CASCADE,
  concepto_contrato_id UUID REFERENCES conceptos_contrato(id),
  concepto_clave TEXT NOT NULL,
  concepto_descripcion TEXT NOT NULL,
  concepto_unidad TEXT NOT NULL,
  precio_unitario NUMERIC NOT NULL,
  cantidad_original NUMERIC NOT NULL,
  cantidad_modificacion NUMERIC NOT NULL,
  cantidad_nueva NUMERIC NOT NULL,
  importe_modificacion NUMERIC NOT NULL,
  observaciones TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detalles Extra
CREATE TABLE detalles_extra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cambio_contrato_id UUID REFERENCES cambios_contrato(id) ON DELETE CASCADE,
  partida TEXT,
  subpartida TEXT,
  actividad TEXT,
  concepto_clave TEXT NOT NULL,
  concepto_descripcion TEXT NOT NULL,
  concepto_unidad TEXT NOT NULL,
  cantidad NUMERIC NOT NULL,
  precio_unitario NUMERIC NOT NULL,
  importe NUMERIC NOT NULL,
  observaciones TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deducciones Extra
CREATE TABLE deducciones_extra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cambio_contrato_id UUID REFERENCES cambios_contrato(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  monto NUMERIC NOT NULL,
  observaciones TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Retenciones Contrato
CREATE TABLE retenciones_contrato (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cambio_contrato_id UUID REFERENCES cambios_contrato(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  monto NUMERIC NOT NULL,
  monto_aplicado NUMERIC DEFAULT 0,
  monto_regresado NUMERIC DEFAULT 0,
  monto_disponible NUMERIC DEFAULT 0,
  observaciones TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Requisiciones Pago
CREATE TABLE requisiciones_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID REFERENCES contratos(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  fecha DATE NOT NULL,
  conceptos JSONB NOT NULL,
  monto_estimado NUMERIC NOT NULL,
  amortizacion NUMERIC DEFAULT 0,
  retencion NUMERIC DEFAULT 0,
  otros_descuentos NUMERIC DEFAULT 0,
  retenciones_aplicadas NUMERIC DEFAULT 0,
  retenciones_regresadas NUMERIC DEFAULT 0,
  lleva_iva BOOLEAN DEFAULT false,
  subtotal NUMERIC NOT NULL,
  iva NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  descripcion_general TEXT,
  notas TEXT,
  respaldo_documental TEXT[],
  factura_url TEXT,
  estado TEXT NOT NULL,
  estatus_pago TEXT,
  visto_bueno BOOLEAN DEFAULT false,
  visto_bueno_por UUID,
  visto_bueno_fecha TIMESTAMPTZ,
  fecha_pago_estimada DATE,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Solicitudes Pago
CREATE TABLE solicitudes_pago (
  id SERIAL PRIMARY KEY,
  folio TEXT NOT NULL,
  requisicion_id UUID REFERENCES requisiciones_pago(id) ON DELETE CASCADE,
  concepto_ids TEXT[],
  conceptos_detalle JSONB,
  deducciones_extra JSONB,
  lleva_iva BOOLEAN DEFAULT false,
  amortizacion_aplicada NUMERIC DEFAULT 0,
  retencion_aplicada NUMERIC DEFAULT 0,
  otros_descuentos_aplicados NUMERIC DEFAULT 0,
  deducciones_extras_total NUMERIC DEFAULT 0,
  subtotal NUMERIC NOT NULL,
  iva NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  fecha DATE NOT NULL,
  estado TEXT NOT NULL,
  notas TEXT,
  aprobada BOOLEAN DEFAULT false,
  aprobada_por UUID,
  aprobada_fecha TIMESTAMPTZ,
  monto_pagado NUMERIC DEFAULT 0,
  fecha_pago DATE,
  fecha_pago_esperada DATE,
  referencia_pago TEXT,
  comprobante_pago_url TEXT,
  estatus_pago TEXT,
  vobo_gerencia BOOLEAN DEFAULT false,
  vobo_gerencia_por UUID,
  vobo_gerencia_fecha TIMESTAMPTZ,
  observaciones_gerencia TEXT,
  vobo_desarrollador BOOLEAN DEFAULT false,
  vobo_desarrollador_por UUID,
  vobo_desarrollador_fecha TIMESTAMPTZ,
  vobo_finanzas BOOLEAN DEFAULT false,
  vobo_finanzas_por UUID,
  vobo_finanzas_fecha TIMESTAMPTZ,
  observaciones_desarrollador TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pagos Realizados
CREATE TABLE pagos_realizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_pago_id INTEGER REFERENCES solicitudes_pago(id),
  requisicion_pago_id UUID REFERENCES requisiciones_pago(id),
  contrato_id UUID REFERENCES contratos(id) NOT NULL,
  concepto_contrato_id UUID REFERENCES conceptos_contrato(id),
  monto_pagado NUMERIC NOT NULL,
  monto_original NUMERIC,
  fecha_pago DATE NOT NULL,
  fecha_programada DATE,
  referencia_pago TEXT,
  comprobante_pago_url TEXT,
  metodo_pago TEXT,
  estatus TEXT NOT NULL,
  notas TEXT,
  tipo_pago TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **Paso 5: Ejecutar Política RLS Simplificada**

```sql
-- Ejecutar 20260104_simplify_rls.sql
-- Esto crea política "all" permisiva en todas las tablas
```

#### **Paso 6: Crear Roles Iniciales**

```sql
-- Seed de roles
INSERT INTO roles (id, name, description, color) VALUES
  (gen_random_uuid(), 'Gerente Plataforma', 'Administrador principal', '#22C55E'),
  (gen_random_uuid(), 'Gerencia', 'Rol de gerencia', '#8B5CF6'),
  (gen_random_uuid(), 'DESARROLLADOR', 'Desarrollador', '#3B82F6'),
  (gen_random_uuid(), 'SUPERVISOR ELARA', 'Supervisor', '#6366F1'),
  (gen_random_uuid(), 'CONTRATISTA', 'Contratista', '#F59E0B'),
  (gen_random_uuid(), 'ADMINISTRACIÓN', 'Administración', '#10B981'),
  (gen_random_uuid(), 'FINANZAS', 'Finanzas', '#06B6D4'),
  (gen_random_uuid(), 'USUARIO', 'Usuario básico', '#6B7280');
```

#### **Paso 7: Configurar Storage**

En Supabase Dashboard → Storage:
1. Crear bucket `documents` (privado)
2. Crear bucket `avatars` (público)
3. Configurar políticas RLS para storage (opcional si RLS simplificado)

#### **Paso 8: Crear Primer Usuario Admin**

```sql
-- Registrar usuario en Supabase Auth (desde la UI de signup)
-- Luego asignar rol de Gerente Plataforma

INSERT INTO roles_usuario (user_id, role_id)
VALUES (
  'UUID_DEL_USUARIO',
  (SELECT id FROM roles WHERE name = 'Gerente Plataforma')
);
```

#### **Paso 9: Iniciar la Aplicación**

```bash
pnpm dev
```

La app estará corriendo en `http://localhost:5173`

#### **Paso 10: Desplegar (Vercel/Netlify)**

**Vercel**:
```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel

# Configurar variables de entorno en Vercel Dashboard
```

**Netlify**:
```bash
# Instalar Netlify CLI
npm i -g netlify-cli

# Desplegar
netlify deploy --prod

# Configurar variables de entorno en Netlify Dashboard
```

### 10.3. Personalizaciones Comunes

#### Cambiar Nombre de la App
```typescript
// src/config/app-config.ts
export const APP_CONFIG = {
  name: 'TU NOMBRE AQUÍ',
  shortName: 'TU SIGLA',
  description: 'Tu descripción',
  // ...
}
```

#### Cambiar Colores
```css
/* src/styles/theme.css */
:root {
  --primary: 220 70% 50%;  /* Azul principal */
  --secondary: 280 60% 50%;  /* Morado secundario */
  /* ... */
}
```

#### Cambiar Logo
```
public/icons/icon-192x192.png
public/icons/icon-512x512.png
public/branding/logo.svg
```

#### Agregar/Quitar Módulos
```typescript
// src/lib/routing/routes.tsx
export const routes: AppRoute[] = [
  // Agregar o comentar rutas aquí
]
```

---

## 11. Consideraciones Finales

### 11.1. Seguridad

⚠️ **IMPORTANTE**: La política RLS simplificada (`USING (true)`) es **permisiva** y no restringe acceso a nivel de base de datos. El control de acceso se hace en la **capa de aplicación**.

**Recomendaciones**:
- Implementar RLS granular en producción si se requiere seguridad estricta
- Validar permisos en el backend (edge functions) para operaciones críticas
- Nunca exponer claves API sensibles en el frontend

### 11.2. Sincronización Offline

La app tiene sincronización básica implementada:
- Detecta cambios offline (`_dirty = true`)
- Sincroniza al volver online
- Usa `last_sync` para tracking de sincronización
- Tabla `syncMetadata` para control de versiones

**Hooks de Sincronización Automática**:
```typescript
// Al crear un registro
table.hook('creating', (primKey, obj, trans) => {
  obj._dirty = true
  obj.created_at = obj.created_at || new Date().toISOString()
  obj.updated_at = new Date().toISOString()
})

// Al actualizar un registro
table.hook('updating', (modifications, primKey, obj, trans) => {
  modifications._dirty = true
  modifications.updated_at = new Date().toISOString()
})
```

**Limitaciones actuales**:
- No maneja conflictos de sincronización (último escrito gana)
- No hay cola de sincronización persistente
- No hay retry automático en caso de fallo

**Mejoras recomendadas**:
- Implementar resolución de conflictos (CRDTs, timestamps)
- Agregar indicador de estado de sincronización en la UI
- Implementar sincronización incremental (solo cambios)
- Cola de sincronización con retry exponencial
- Sincronización en background con Service Worker

### 11.3. Performance

**Optimizaciones implementadas**:
- Lazy loading de rutas (React.lazy)
- TanStack Query con cache persistente
- IndexedDB para datos offline

**Mejoras recomendadas**:
- Implementar virtualización para listas grandes (react-window)
- Optimizar queries de Supabase con índices
- Implementar paginación en tablas grandes

### 11.4. Mantenimiento

**Backups**:
- Supabase hace backups automáticos diarios
- Exportar datos críticos periódicamente

**Logs**:
- `security_events` registra logins, logouts, intentos fallidos
- Revisar logs regularmente

**Actualizaciones**:
- Revisar dependencias con `pnpm outdated`
- Actualizar con cuidado (probar en desarrollo primero)

---

## 12. Recursos y Contacto

### Documentación Relacionada
- [README.md](README.md) - Documentación principal
- [docs/GUIA-RETENCIONES.md](docs/GUIA-RETENCIONES.md) - Sistema de retenciones
- [docs/SISTEMA-ADMINISTRACION-PRESUPUESTO-COMPLETO.md](docs/SISTEMA-ADMINISTRACION-PRESUPUESTO-COMPLETO.md) - Gestión presupuestaria

### Stack Docs
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Supabase](https://supabase.com/docs)
- [Dexie.js](https://dexie.org/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Material-UI](https://mui.com/)

---

**Última actualización**: Enero 2026

**Autor**: Equipo de Desarrollo Elara

**Licencia**: Propietaria
