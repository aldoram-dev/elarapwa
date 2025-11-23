# 🏗️ Guía de Implementación - Sistema de Gestión de Obra

> **Versión Consolidada** - Última actualización: Noviembre 2025  
> Esta guía unifica todas las instrucciones de implementación del sistema.

---

## 📋 Índice

1. [Resumen del Sistema](#resumen-del-sistema)
2. [Estructura de Base de Datos](#estructura-de-base-de-datos)
3. [Configuración de Supabase Storage](#configuración-de-supabase-storage)
4. [Roles y Permisos](#roles-y-permisos)
5. [Flujo de Trabajo Completo](#flujo-de-trabajo-completo)
6. [Características Implementadas](#características-implementadas)
7. [Instrucciones de Despliegue](#instrucciones-de-despliegue)

---

## 🎯 Resumen del Sistema

Sistema PWA completo para gestión de contratos de obra con las siguientes capacidades:

### Módulos Principales
- **Contratistas**: Registro con 7 documentos (CSF, CV, Acta, REPSE, INE, etc.)
- **Contratos**: Gestión de contratos con tipos: Precio Alzado, Precio Unitario, Administración, Mixto, Orden de Trabajo, Orden de Compra, Llave en Mano, Prestación de Servicios, Contrato
- **Catálogo de Conceptos**: Subida por contratista, aprobación por administración
- **Requisiciones**: Creadas por contratistas con conceptos del catálogo
- **Solicitudes de Pago**: Generadas desde requisiciones con Vo.Bo. de Gerencia
- **Registro de Pagos**: Control de pagos con factura y fecha de pago esperada
- **Estado de Cuenta**: Vista completa por contratista y por contrato con penalizaciones

### Tecnologías
- **Frontend**: React 19 + TypeScript + Material-UI v6
- **Backend**: Supabase (PostgreSQL + Storage + Auth)
- **Offline**: IndexedDB con Dexie.js
- **Icons**: Lucide React + Material Icons

---

## 🗄️ Estructura de Base de Datos

### Tablas Principales

#### `contratistas`
```sql
- id (UUID, PK)
- nombre, categoria, partida
- localizacion, telefono, correo_contacto
- numero_cuenta_bancaria, banco, nombre_cuenta
- 7 URLs de documentos (csf_url, cv_url, acta_constitutiva_url, etc.)
- active, notas, metadata
- empresa_id, proyecto_id, created_by
```

#### `contratos`
```sql
- id (UUID, PK)
- numero_contrato, nombre, clave_contrato, descripcion
- tipo_contrato (9 opciones consolidadas)
- contratista_id (FK → contratistas)
- monto_contrato, anticipo_monto
- retencion_porcentaje, penalizacion_maxima_porcentaje, penalizacion_por_dia
- fecha_inicio, fecha_fin, fecha_fin_real
- estatus, porcentaje_avance
- contrato_pdf_url
```

#### `conceptos_contrato`
```sql
- id (UUID, PK)
- contrato_id (FK → contratos)
- partida, subpartida, actividad, clave, concepto, unidad
- cantidad_catalogo, precio_unitario_catalogo, importe_catalogo
- cantidad_estimada, precio_unitario_estimacion, importe_estimado
- catalogo_aprobado (boolean)
- fecha_aprobacion_catalogo, aprobado_por
```

**Importante**: El catálogo debe ser aprobado antes de crear requisiciones.

#### `requisiciones_pago`
```sql
- id (UUID, PK)
- contrato_id (FK → contratos)
- numero_requisicion, descripcion_general
- monto_estimado, amortizacion_anticipo, retencion_fondo
- monto_neto
- estatus ('borrador', 'enviada', 'aprobada', 'rechazada')
- factura_url (PDF de factura)
- respaldo_documental (array de URLs)
```

#### `solicitudes_pago`
```sql
- id (UUID, PK)
- requisicion_id (FK → requisiciones_pago)
- contrato_id, contratista_id
- monto_solicitado
- vobo_gerencia (boolean) - Requerido para aparecer en Registro de Pagos
- fecha_pago_esperada (fecha_solicitud + 15 días → viernes)
- estatus_pago ('pendiente', 'procesando', 'pagado')
```

#### `pagos`
```sql
- id (UUID, PK)
- solicitud_id (FK → solicitudes_pago)
- monto_pagado, fecha_pago
- metodo_pago, numero_referencia
- comprobante_url
- notas
```

---

## 💾 Configuración de Supabase Storage

### Bucket: `documents`

**Configuración Manual Requerida:**

1. Ve a **Supabase Dashboard** → **Storage**
2. Click en **"New bucket"**
3. Configurar:
   - **Nombre**: `documents`
   - **Public**: ✅ (activado)
   - **Límite de tamaño**: 50 MB
   - **Tipos MIME**: `application/pdf, image/jpeg, image/png, image/jpg, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

### Estructura de Carpetas

El sistema creará automáticamente:
```
documents/
├── contratistas/           # Documentos de contratistas (CSF, CV, etc.)
├── contratos/              # Contratos PDF
├── requisiciones/
│   ├── respaldos/         # Documentación de soporte
│   └── facturas/          # Facturas PDF
└── pagos/                 # Comprobantes de pago
```

### Políticas RLS (Ejecutadas por migración)

- **SELECT**: Público (cualquiera puede leer)
- **INSERT**: Solo usuarios autenticados
- **UPDATE**: Solo el propietario del archivo
- **DELETE**: Solo el propietario del archivo

---

## 👥 Roles y Permisos

### Roles del Sistema

| Rol | Descripción | Permisos Clave |
|-----|-------------|----------------|
| **Gerente Plataforma** | Administrador total | Todo |
| **Gerencia** | Gestión de proyecto | Todo excepto configuración |
| **Desarrollador** | Acceso técnico | Todo + Vo.Bo. especial |
| **Supervisor Elara** | Supervisión de obra | Todo excepto config |
| **Finanzas** | Control financiero | Ver todo + Aprobar pagos |
| **Administracion** | Control administrativo | Ver todo + Crear/Editar contratos |
| **CONTRATISTA** | Contratista externo | Solo sus contratos + Subir catálogo + Crear requisiciones |
| **USUARIO** | Usuario limitado | Solo lectura de asignados |

### Matriz de Permisos Detallada

| Acción | GP/Ger/Dev/SL | Admin | Finanzas | Contratista | Usuario |
|--------|---------------|-------|----------|-------------|---------|
| **Crear Contratista** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Ver Contratistas** | ✅ Todos | ✅ Todos | ✅ Todos | ✅ Propio | ✅ Asignados |
| **Crear Contrato** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Ver Contratos** | ✅ Todos | ✅ Todos | ✅ Todos | ✅ Propios | ✅ Asignados |
| **Subir Catálogo** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Aprobar Catálogo** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Crear Requisición** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Ver Requisiciones** | ✅ Todas | ✅ Todas | ✅ Todas | ✅ Propias | ✅ Asignadas |
| **Aprobar Requisición** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Vo.Bo. Gerencia** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Ver Solicitudes** | ✅ Todas | ✅ Todas | ✅ Todas | ✅ Propias | ❌ |
| **Registrar Pago** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Ver Estado de Cuenta** | ✅ Todos | ✅ Todos | ✅ Todos | ✅ Propio | ❌ |

---

## 🔄 Flujo de Trabajo Completo

### 1️⃣ Alta de Contrato

**Quién**: Gerente Plataforma, Gerencia, Desarrollador, Admin

1. Ir a **Contratos** → **Nuevo Contrato**
2. Seleccionar contratista existente o crear uno nuevo
3. Llenar información:
   - Número de contrato, nombre, clave
   - **Tipo de contrato** (9 opciones disponibles)
   - Monto del contrato
   - **Anticipo** (opcional)
   - **Retención %** (fondo de garantía, ej. 10%)
   - **Penalización por día** (ej. $5,000)
   - **Penalización máxima %** (ej. 5% del contrato)
   - Fechas: inicio y fin
4. Subir PDF del contrato (opcional)
5. Guardar

### 2️⃣ Subida de Catálogo por Contratista

**Quién**: CONTRATISTA

1. Ir a **Catálogo de Conceptos**
2. Seleccionar su contrato
3. Click en **"Importar Catálogo Excel/CSV"**
4. Subir archivo con columnas:
   - Partida, Subpartida, Actividad
   - Clave, Concepto, Unidad
   - Cantidad, Precio Unitario
5. Verificar importación
6. Guardar (estado: `catalogo_aprobado = false`)

**Nota**: El contratista puede agregar/editar conceptos hasta que sea aprobado.

### 3️⃣ Aprobación de Catálogo

**Quién**: Gerente Plataforma, Gerencia, Desarrollador, Admin

1. Ir a **Catálogo de Conceptos**
2. Seleccionar contrato del contratista
3. Revisar conceptos (partidas, claves, cantidades, precios)
4. Click en **"Aprobar Catálogo"**
5. El sistema marca: `catalogo_aprobado = true`, `fecha_aprobacion_catalogo = NOW()`

**Importante**: Una vez aprobado, el contratista NO puede modificar conceptos. Solo administradores pueden editar.

### 4️⃣ Creación de Requisición (Contratista)

**Quién**: CONTRATISTA

1. Ir a **Requisiciones de Pago** → **Nueva Requisición**
2. Seleccionar su contrato (solo muestra contratos con catálogo aprobado)
3. Agregar conceptos:
   - Buscar por partida/clave/concepto
   - Ingresar **cantidad a pagar en esta requisición**
   - El sistema calcula automáticamente:
     * Importe = cantidad × precio_unitario
     * Amortización de anticipo (si aplica)
     * Retención (% configurado en contrato)
4. Agregar **descripción general** de la requisición
5. **Subir documentos de respaldo** (opcional, múltiples archivos)
6. Guardar como borrador o **Enviar** (cambia a `estatus = 'enviada'`)

**Después de enviar**:
7. Aparece sección **"Subir Factura"** (naranja)
8. Seleccionar PDF de factura
9. Click en "Ver Factura" para verificar
10. Guardar requisición para asociar factura

### 5️⃣ Aprobación de Requisición y Creación de Solicitud

**Quién**: Gerente Plataforma, Gerencia, Desarrollador, Admin

1. Ir a **Requisiciones de Pago**
2. Ver requisiciones con estado `'enviada'`
3. Click en botón de ojo 👁️ para ver detalles
4. Revisar:
   - Conceptos y cantidades
   - Montos calculados
   - Documentos de respaldo
   - Factura (debe estar presente)
5. Click en **"Aprobar y Crear Solicitud"**
6. El sistema:
   - Cambia requisición a `estatus = 'aprobada'`
   - Crea registro en `solicitudes_pago`
   - Calcula `fecha_pago_esperada = fecha_solicitud + 15 días → viernes`
   - Requiere `vobo_gerencia = false` inicialmente

### 6️⃣ Vo.Bo. de Gerencia

**Quién**: Gerente Plataforma, Gerencia

1. Ir a **Solicitudes de Pago**
2. Ver solicitudes pendientes
3. Click en **"Dar Vo.Bo."**
4. El sistema marca: `vobo_gerencia = true`, `vobo_gerencia_fecha = NOW()`

**Importante**: Solo las solicitudes con `vobo_gerencia = true` aparecen en **Registro de Pagos**.

### 7️⃣ Registro de Pago

**Quién**: Gerente Plataforma, Gerencia, Finanzas, Admin

1. Ir a **Registro de Pagos**
2. Ver solicitudes con Vo.Bo. de Gerencia
3. Columnas visibles:
   - Contratista
   - Contrato
   - Requisición
   - Monto Solicitado
   - **Factura** (botón "Ver")
   - **Fecha Pago Esperada** (fecha_solicitud + 15 días → viernes)
   - Estatus
4. Click en **"Registrar Pago"**
5. Llenar:
   - Monto pagado
   - Fecha de pago
   - Método de pago
   - Número de referencia
   - **Subir comprobante de pago** (PDF/imagen)
6. Guardar → `estatus_pago = 'pagado'`

### 8️⃣ Estado de Cuenta

**Quién**: Todos (según permisos)

#### Vista por Contratista:
1. Ir a **Estado de Cuenta** → Tab "Por Contratista"
2. Seleccionar contratista (o automático si es CONTRATISTA)
3. Ver tabla resumen:
   - Por cada contrato del contratista
   - Monto total del contrato
   - Total requisicionado
   - Total pagado
   - Pendiente por pagar

#### Vista por Contrato:
1. Ir a **Estado de Cuenta** → Tab "Por Contrato"
2. Seleccionar contratista y luego contrato
3. Ver información detallada:

**Sección 1: Información del Contrato**
- Monto contratado
- Extraordinarios, aditivas, deductivas
- Importe total de los trabajos

**Sección 2: Anticipo**
- Monto de anticipo
- Total amortizado (suma de amortizaciones)
- Saldo por amortizar

**Sección 3: Retenciones (Fondo de Garantía)**
- % de retención configurado
- Total retenido (suma de retenciones)

**Sección 4: Penalizaciones por Atraso** ⚠️
- Solo aparece si `fecha_fin` < fecha actual
- Muestra:
  * **Días de atraso** (en rojo)
  * **Penalización por día** configurada
  * **Penalización calculada** (días × tarifa)
  * **Límite máximo** (penalizacion_maxima_porcentaje del contrato)
  * **Penalización aplicada** (respeta el límite)
- Si no hay atraso: "Sin atrasos" (en verde)

**Alerta de Atraso**: Banner rojo superior si hay días de atraso

**Sección 5: Desglose de Requisiciones**
- Tabla con todas las requisiciones del contrato
- Botón 👁️ para ver detalles de cada requisición
- Modal read-only con conceptos, montos, documentos

---

## ✨ Características Implementadas

### 🎨 Interfaz de Usuario
- ✅ Material-UI v6 con tema personalizado
- ✅ Responsive design
- ✅ Modo offline con IndexedDB
- ✅ PWA con manifest y service worker
- ✅ Icons de Lucide React

### 📄 Gestión de Documentos
- ✅ Upload múltiple de archivos
- ✅ Vista previa de documentos (botón "Ver")
- ✅ Botón "Cambiar" para reemplazar archivos
- ✅ Validación de tipos (PDF, imágenes, Office)
- ✅ Límite de 50MB por archivo
- ✅ Organización automática en carpetas

### 💰 Cálculos Automáticos
- ✅ **Fecha de pago esperada**: fecha_solicitud + 15 días calendario → ajustada al viernes siguiente
- ✅ **Amortización de anticipo**: Proporcional al monto requisicionado
- ✅ **Retención**: Porcentaje configurado en el contrato
- ✅ **Penalizaciones por atraso**:
  ```javascript
  diasAtraso = (hoy - fecha_fin) en días
  montoPenalizacion = diasAtraso × penalizacion_por_dia
  penalizacionAplicada = Math.min(
    montoPenalizacion,
    (monto_contrato × penalizacion_maxima_porcentaje / 100)
  )
  ```
- ✅ **Monto neto**: monto_estimado - amortizacion - retencion

### 🔐 Seguridad y Permisos
- ✅ Row Level Security (RLS) en todas las tablas
- ✅ Políticas específicas por rol
- ✅ Filtrado automático por contratista_id para CONTRATISTA
- ✅ Validación de permisos en frontend y backend

### 📊 Reportes y Vistas
- ✅ Estado de cuenta por contratista
- ✅ Estado de cuenta por contrato con penalizaciones
- ✅ Desglose detallado de requisiciones (modal read-only)
- ✅ Visualización de facturas y comprobantes
- ✅ Indicadores visuales de estatus

---

## 🚀 Instrucciones de Despliegue

### Prerequisitos
- Node.js 18+
- pnpm
- Cuenta de Supabase
- Acceso a proyecto de Supabase

### Paso 1: Configurar Supabase

1. **Crear bucket `documents`** (manual):
   - Dashboard → Storage → New bucket
   - Nombre: `documents`
   - Public: ✅
   - Tamaño: 50MB
   - Tipos: PDF, imágenes, Office

2. **Ejecutar migración consolidada**:
   ```sql
   -- En Supabase SQL Editor
   -- Ejecutar: supabase/migrations/20251124_migracion_completa.sql
   ```

3. **Verificar tablas creadas**:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

### Paso 2: Configurar Variables de Entorno

Crear `.env.local`:
```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### Paso 3: Instalar Dependencias

```bash
pnpm install
```

### Paso 4: Ejecutar en Desarrollo

```bash
pnpm dev
```

### Paso 5: Build para Producción

```bash
pnpm build
pnpm preview
```

### Paso 6: Verificar Funcionalidad

1. Login con usuario admin
2. Crear contratista de prueba
3. Crear contrato
4. Login como contratista
5. Subir catálogo
6. Login como admin
7. Aprobar catálogo
8. Login como contratista
9. Crear requisición
10. Verificar flujo completo

---

## 📝 Notas Importantes

### Catálogo de Conceptos
- ⚠️ **Debe estar aprobado** antes de crear requisiciones
- ⚠️ Una vez aprobado, el contratista **NO puede editar**
- ✅ Administradores pueden editar conceptos aprobados si es necesario

### Requisiciones y Solicitudes
- ⚠️ La **factura es obligatoria** antes de aprobar requisición
- ⚠️ `vobo_gerencia` debe ser `true` para aparecer en Registro de Pagos
- ✅ Sistema calcula automáticamente fecha de pago esperada

### Penalizaciones
- ⚠️ Se calculan **fuera del flujo de requisiciones**
- ⚠️ No afectan el monto de las requisiciones
- ✅ Aparecen en estado de cuenta por contrato
- ✅ Se aplica límite máximo configurado

### Estado de Cuenta
- ✅ Modal de desglose es **read-only** cuando se abre desde Estado de Cuenta
- ✅ Muestra retenciones reales (no hardcoded)
- ✅ Calcula penalizaciones automáticamente si hay atraso

---

## 🔧 Troubleshooting

### Problema: No aparecen solicitudes en Registro de Pagos
**Solución**: Verificar que `vobo_gerencia = true` en la solicitud

### Problema: No se puede crear requisición
**Solución**: Verificar que el catálogo esté aprobado (`catalogo_aprobado = true`)

### Problema: Error al subir archivos
**Solución**: 
1. Verificar que el bucket `documents` existe
2. Verificar políticas RLS del bucket
3. Verificar que el usuario está autenticado

### Problema: Penalizaciones no aparecen
**Solución**: 
1. Verificar que `fecha_fin` del contrato esté en el pasado
2. Verificar que `penalizacion_por_dia` esté configurada
3. Verificar que `penalizacion_maxima_porcentaje` esté configurada

### Problema: Fecha de pago esperada incorrecta
**Solución**: La función ajusta al viernes siguiente automáticamente. Verificar que:
1. `fecha_pago_esperada` existe en la tabla
2. Se ejecutó la migración correctamente

---

## 📞 Soporte

Para dudas o problemas:
1. Revisar esta guía completa
2. Verificar logs de Supabase
3. Verificar consola del navegador
4. Contactar al equipo de desarrollo

---

**Última actualización**: Noviembre 24, 2025  
**Versión**: 1.0 (Consolidada)
