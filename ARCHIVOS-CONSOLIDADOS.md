# 📁 Archivos Consolidados del Sistema

> **IMPORTANTE**: Estos son los únicos archivos necesarios para implementar el sistema completo.

## ✅ Archivos Activos

### 📄 Documentación
- **`GUIA-IMPLEMENTACION.md`** - Guía completa y consolidada del sistema
  - Incluye: Estructura de BD, configuración, roles, flujo de trabajo, características

### 🗄️ Base de Datos
- **`20251124_migracion_completa.sql`** - Migración única con todas las tablas
  - Incluye: Todas las tablas, índices, triggers, RLS, Storage policies, Realtime

## 🗑️ Archivos Obsoletos

Los siguientes archivos están obsoletos y pueden ser eliminados o ignorados:

### Documentación Antigua
- `PROCESO-COMPLETO-CONTRATOS.md`
- `CONFIGURAR-STORAGE-REQUISICIONES.md`
- `IMPLEMENTACION-FACTURA-REQUISICIONES.md`
- `CATALOGO-IMPORT-EXPORT.md`
- `CONCEPTOS-CONTRATO.md`
- `ESTATUS-PAGO-VOBO-GERENCIA.md`
- `VISTO-BUENO-REQUISICIONES.md`
- `REQUISICIONES-PAGO.md`
- `GESTION-PAGOS-IMPLEMENTACION.md`
- `REORGANIZACION-PAGOS.md`
- Todos los demás archivos .md en `docs/`

### Migraciones Antiguas
- `20250123_catalogo_aprobacion.sql`
- `20250124_fecha_pago_esperada.sql`
- `20250124_fix_solicitudes_existentes.sql`
- `20250124_setup_documents_bucket.sql`
- `20250124_tipo_documento_contrato.sql`
- `20251112_crear_modulo_obra.sql`
- `20251113_*`
- `20251118_*`
- `20251119_*`
- `20251120_*`
- `20251121_*`
- `20251122_*`
- Todas las demás migraciones SQL

## 🚀 Cómo Implementar desde Cero

### 1. Configurar Supabase

**Crear Bucket 'documents' (Manual)**
1. Dashboard → Storage → New bucket
2. Nombre: `documents`
3. Public: ✅
4. Tamaño: 50MB

### 2. Ejecutar Migración

```sql
-- En Supabase SQL Editor
-- Ejecutar el contenido de: supabase/migrations/20251124_migracion_completa.sql
```

### 3. Verificar Instalación

```sql
-- Verificar tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Deben aparecer:
-- - contratistas
-- - contratos
-- - conceptos_contrato
-- - requisiciones_pago
-- - conceptos_requisicion
-- - solicitudes_pago
-- - pagos
```

### 4. Leer la Guía

Abre `GUIA-IMPLEMENTACION.md` para:
- Entender el flujo completo
- Configurar roles y permisos
- Aprender a usar cada módulo
- Ver troubleshooting

## 📋 Resumen de Características

### ✅ Sistema Completo Incluye:

- **Contratistas**: 7 documentos en Storage
- **Contratos**: 9 tipos consolidados
- **Catálogo**: Sistema de aprobación
- **Requisiciones**: Con factura y documentos
- **Solicitudes**: Vo.Bo. Gerencia + Fecha esperada
- **Pagos**: Registro con comprobantes
- **Estado de Cuenta**: Con penalizaciones por atraso

### 🎯 Flujo Completo:
1. Alta de contrato
2. Subida de catálogo (contratista)
3. Aprobación de catálogo
4. Creación de requisiciones
5. Vo.Bo. de Gerencia
6. Registro de pagos
7. Estado de cuenta con penalizaciones

## 🔄 Migración desde Versión Anterior

Si ya tienes el sistema instalado con migraciones antiguas:

### Opción 1: Fresh Install (Recomendado para nuevo proyecto)
1. Crear nuevo proyecto Supabase
2. Ejecutar solo `20251124_migracion_completa.sql`

### Opción 2: Actualizar Proyecto Existente
1. Verificar qué tablas ya existen
2. Comentar las secciones CREATE TABLE que ya tienes
3. Ejecutar solo las secciones nuevas:
   - Campos nuevos (ALTER TABLE)
   - Políticas Storage
   - Índices faltantes

## ⚠️ Notas Importantes

1. **Bucket 'documents'**: Debe crearse manualmente antes de ejecutar la migración
2. **Políticas RLS**: Simplificadas para usuarios autenticados
3. **Fecha Pago Esperada**: Se calcula automáticamente (+15 días → viernes)
4. **Penalizaciones**: Se calculan en frontend, fuera de requisiciones
5. **Vo.Bo. Gerencia**: Requerido para que solicitudes aparezcan en Registro de Pagos

## 📞 Soporte

Para dudas:
1. Revisar `GUIA-IMPLEMENTACION.md`
2. Verificar logs de Supabase
3. Contactar equipo de desarrollo

---

**Versión Consolidada**: Noviembre 24, 2025  
**Última actualización**: 2025-11-24
