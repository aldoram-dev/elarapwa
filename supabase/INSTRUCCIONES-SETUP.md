# 🚀 GUÍA DE CONFIGURACIÓN SUPABASE - 3 PASOS

## ✅ Tu teoría es CORRECTA

**Orden de ejecución:**

1. ✅ **`schema.sql`** → Crea SOLO tablas, índices, funciones (SIN RLS ni triggers auth)
2. ✅ **`seed.sql`** → Inserta datos iniciales (roles Sistemas/Gerente, empresas, proyectos)
3. ✅ **Dashboard Supabase** → Crear primer usuario manualmente
4. ✅ **`parcheauth.sql`** → Aplicar RLS y políticas que dependen de auth.uid()

---

## 📋 PASO 1: Ejecutar schema.sql

### En Supabase Dashboard:
1. Ve a **SQL Editor**
2. Copia TODO el contenido de `schema.sql`
3. **Ejecuta** (Run)
4. ✅ Deberías ver: Tablas creadas, funciones creadas, buckets storage creados

### ¿Qué hace?
- ✅ Crea tipos ENUM (`user_level`, `notification_type`, etc.)
- ✅ Crea TODAS las tablas (perfiles, roles, permisos, empresas, proyectos, etc.)
- ✅ Crea índices
- ✅ Crea funciones básicas
- ✅ Crea buckets de storage
- ❌ **NO** crea políticas RLS (eso viene después)

---

## 📋 PASO 2: Ejecutar seed.sql

### En Supabase Dashboard:
1. Ve a **SQL Editor**
2. Copia TODO el contenido de `seed.sql`
3. **Ejecuta** (Run)
4. ✅ Deberías ver:
   - Roles creados: `Sistemas` (oculto) y `Gerente Plataforma`
   - Proyectos de ejemplo
   - Funciones helper creadas

### ¿Qué hace?
- ✅ Inserta roles maestros protegidos
- ✅ Inserta datos de ejemplo (proyectos, empresas)
- ✅ Crea funciones para setup de usuarios (`setup_super_admin`, `assign_sistemas_role`)

---

## 📋 PASO 3: Crear primer usuario en Dashboard

### En Supabase Dashboard:
1. Ve a **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Completa:
   - **Email**: `tu@email.com`
   - **Password**: `TuPassword123!`
   - **Auto Confirm User**: ✅ **ON** (importante!)
4. Click **Create user**

### Verificar:
```sql
SELECT * FROM auth.users WHERE email = 'tu@email.com';
```

---

## 📋 PASO 4: Asignar rol al usuario

### Opción A: Asignar rol "Gerente Plataforma" (recomendado para inicio)

En **SQL Editor**, ejecuta:

```sql
SELECT setup_super_admin('tu@email.com');
```

✅ Esto:
- Crea empresa "Coctel"
- Asigna rol "Gerente Plataforma" al usuario
- Configura nivel = 'Administrador' en perfil

### Opción B: Asignar rol "Sistemas" (super admin oculto)

En **SQL Editor**, ejecuta:

```sql
SELECT assign_sistemas_role('tu@email.com');
```

✅ Esto:
- Asigna rol "Sistemas" (omnipotente)
- Configura nivel = 'Administrador' en perfil

---

## 📋 PASO 5: Ejecutar parcheauth.sql

### En Supabase Dashboard:
1. Ve a **SQL Editor**
2. Copia TODO el contenido de `parcheauth.sql`
3. **Ejecuta** (Run)
4. ✅ Deberías ver: "Completed successfully" (o similar)

### ¿Qué hace?
- ✅ Habilita RLS en TODAS las tablas (`ENABLE ROW LEVEL SECURITY`)
- ✅ Crea políticas que usan `auth.uid()` y `auth.role()`
- ✅ Crea políticas de storage (documents, branding, forum-attachments)

---

## ✅ VERIFICACIÓN FINAL

### 1. Verificar usuario creado:
```sql
SELECT 
  u.email,
  p.name,
  p.nivel,
  p.tipo,
  p.active
FROM auth.users u
LEFT JOIN perfiles p ON p.id = u.id
WHERE u.email = 'tu@email.com';
```

### 2. Verificar rol asignado:
```sql
SELECT 
  u.email,
  r.name as rol,
  r.protected
FROM auth.users u
JOIN roles_usuario ru ON ru.user_id = u.id
JOIN roles r ON r.id = ru.role_id
WHERE u.email = 'tu@email.com';
```

### 3. Verificar RLS habilitado:
```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
ORDER BY tablename;
```

Deberías ver TODAS las tablas principales con `rowsecurity = true`.

### 4. Verificar políticas creadas:
```sql
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Deberías ver múltiples políticas por tabla.

---

## 🔥 TROUBLESHOOTING

### ❌ Error: "relation does not exist"
**Causa**: Intentaste ejecutar `parcheauth.sql` antes de `schema.sql`

**Solución**: Ejecuta en orden correcto (schema → seed → crear usuario → parcheauth)

### ❌ Error: "function auth.uid() does not exist"
**Causa**: Intentaste ejecutar políticas RLS antes de crear usuario

**Solución**: Crea usuario en Dashboard primero, luego ejecuta `parcheauth.sql`

### ❌ Error: "duplicate key value violates unique constraint"
**Causa**: Ya ejecutaste `seed.sql` antes

**Solución**: Es normal si ya existen los datos. Ignora o resetea la BD.

### ❌ Usuario no puede leer datos
**Causa**: RLS habilitado pero políticas no aplicadas

**Solución**: Ejecuta `parcheauth.sql` completo

---

## 🎯 RESUMEN EJECUTIVO

```bash
# 1. Crea estructura (tablas, funciones)
→ schema.sql

# 2. Inserta datos iniciales (roles, ejemplos)
→ seed.sql

# 3. Crea usuario en Dashboard
→ Authentication > Users > Add user

# 4. Asigna rol al usuario
→ SELECT setup_super_admin('tu@email.com');

# 5. Aplica seguridad (RLS, políticas)
→ parcheauth.sql
```

---

## 📝 NOTAS IMPORTANTES

1. **NO ejecutes `schema.sql` si `auth.users` tiene usuarios y quieres preservarlos**
   - `schema.sql` tiene `CREATE TABLE IF NOT EXISTS`, es seguro re-ejecutar
   - Pero mejor hacer backup antes

2. **`seed.sql` es idempotente**
   - Usa `ON CONFLICT DO NOTHING` o `ON CONFLICT DO UPDATE`
   - Seguro re-ejecutar múltiples veces

3. **`parcheauth.sql` es idempotente**
   - Usa `DROP POLICY IF EXISTS` antes de `CREATE POLICY`
   - Seguro re-ejecutar si necesitas actualizar políticas

4. **Storage policies pueden fallar si no eres owner**
   - Normal, Supabase maneja esto automáticamente
   - Las políticas se aplicarán para tu proyecto

---

## 🚨 ORDEN CORRECTO (RECORDATORIO)

```
1. schema.sql     ← Estructura (tablas, funciones)
2. seed.sql       ← Datos iniciales (roles, ejemplos)
3. Dashboard      ← Crear primer usuario manualmente
4. setup_super_admin() ← Asignar rol al usuario
5. parcheauth.sql ← Seguridad (RLS, políticas)
```

**NO SALTES PASOS. NO INVIERTAS EL ORDEN.**

---

## ✅ ¡LISTO!

Si seguiste todos los pasos, tu base de datos Supabase está completamente configurada y lista para usar.

Para verificar que todo funciona, intenta hacer login con el usuario creado y verifica que puede acceder a los datos.
