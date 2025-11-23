# Instrucciones para Aplicar Migración de Administración de Obra

## Archivo de Migración
`supabase/migrations/20251112_crear_modulo_obra.sql`

## Opción 1: Aplicar con Supabase CLI (Recomendado)

Si tienes el CLI de Supabase instalado:

```bash
# Aplicar la migración
supabase db push

# O aplicar solo este archivo específico
psql -h <DB_HOST> -U postgres -d postgres -f supabase/migrations/20251112_crear_modulo_obra.sql
```

## Opción 2: Aplicar desde el Dashboard de Supabase

1. Ve a tu proyecto en https://supabase.com/dashboard
2. Navega a **SQL Editor**
3. Copia el contenido del archivo `supabase/migrations/20251112_crear_modulo_obra.sql`
4. Pégalo en el editor SQL
5. Haz clic en **Run** para ejecutar la migración

## Opción 3: Aplicar Manualmente en PostgreSQL

```bash
# Conectarse a la base de datos
psql -h <DB_HOST> -U postgres -d postgres

# Ejecutar el archivo de migración
\i supabase/migrations/20251112_crear_modulo_obra.sql
```

## Qué Crea Esta Migración

### Tablas Creadas:

1. **contratistas**
   - Almacena información de contratistas y proveedores
   - Campos: nombre, categoría, partida, localización, contacto, documentos, etc.
   - 7 URLs para documentos (CSF, CV, Acta Constitutiva, REPSE, INE, Registro Patronal, Comprobante)

2. **contratos**
   - Almacena contratos con contratistas
   - Campos: clave, tipo, tratamiento, montos, retenciones, penalizaciones, fechas
   - Relación con contratistas, proyectos y empresas

### Seguridad (RLS):

- ✅ Row Level Security habilitado en ambas tablas
- ✅ Usuarios solo ven datos de su empresa
- ✅ Solo usuarios nivel "Administrador" pueden crear/editar

### Índices:

- ✅ Índices en campos clave para rendimiento óptimo
- ✅ Índices en relaciones (empresa_id, proyecto_id, contratista_id)

### Triggers:

- ✅ Auto-actualización de campo `updated_at`

### Realtime:

- ✅ Habilitado para subscripciones en tiempo real

## Verificación Post-Migración

Ejecuta estas consultas para verificar que todo se creó correctamente:

```sql
-- Verificar que las tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('contratistas', 'contratos');

-- Verificar políticas RLS
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('contratistas', 'contratos');

-- Verificar índices
SELECT tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('contratistas', 'contratos');
```

## Rutas Agregadas en la Aplicación

El módulo de Administración de Obra ya está configurado en el sidebar:

- **📋 Administración de Obra**
  - 👷 Contratistas (`/obra/contratistas`)
  - 📄 Contratos (`/obra/contratos`)

## Componentes Disponibles

### Formularios:
- ✅ `ContratistaForm.tsx` - Registro completo de contratistas
- ✅ `ContratoForm.tsx` - Registro completo de contratos

### Páginas:
- ✅ `ContratistasPage.tsx` - Vista principal de contratistas
- ✅ `ContratosPage.tsx` - Vista principal de contratos

## Próximos Pasos (TODO)

1. Crear hooks personalizados:
   - `useContratistas()` - Para CRUD de contratistas
   - `useContratos()` - Para CRUD de contratos

2. Crear componentes de lista:
   - `ContratistaList.tsx` - Tabla/grid de contratistas
   - `ContratoList.tsx` - Tabla/grid de contratos

3. Integrar con Supabase Storage:
   - Crear bucket `contractor-documents` para documentos de contratistas
   - Crear bucket `contract-documents` para PDFs de contratos

4. Agregar permisos específicos en el sistema ACL si es necesario

## Notas Importantes

- 🔒 Solo usuarios con rol "Administrador" pueden crear/editar contratistas y contratos
- 🏢 Los datos están aislados por empresa (RLS habilitado)
- 📱 Soporte para offline-first con Dexie ya configurado
- ⚡ Realtime habilitado para actualizaciones en tiempo real
