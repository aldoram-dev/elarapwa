# 🎯 RESUMEN RÁPIDO - 5 PASOS

## ¿Qué hace cada archivo?

| Archivo | Qué hace | Cuándo ejecutar |
|---------|----------|-----------------|
| `schema.sql` | Crea tablas, índices, funciones | ✅ PRIMERO |
| `seed.sql` | Inserta roles y datos iniciales | ✅ SEGUNDO |
| *Dashboard* | Crear usuario manualmente | ✅ TERCERO |
| *SQL Editor* | `SELECT setup_super_admin('tu@email.com');` | ✅ CUARTO |
| `parcheauth.sql` | Habilita RLS y crea políticas | ✅ QUINTO |

---

## ⚡ EJECUCIÓN RÁPIDA

### 1️⃣ Schema (estructura)
```sql
-- Ejecuta schema.sql en SQL Editor
-- ✅ Crea todas las tablas
-- ✅ Crea funciones
-- ✅ Crea buckets storage
-- ❌ NO crea RLS aún
```

### 2️⃣ Seed (datos iniciales)
```sql
-- Ejecuta seed.sql en SQL Editor
-- ✅ Crea roles: Sistemas, Gerente Plataforma
-- ✅ Crea proyectos de ejemplo
-- ✅ Crea funciones helper
```

### 3️⃣ Crear usuario (Dashboard)
```
Authentication → Users → Add user
- Email: tu@email.com
- Password: TuPassword123!
- Auto Confirm: ✅ ON
```

### 4️⃣ Asignar rol (SQL Editor)
```sql
-- Para admin visible (recomendado):
SELECT setup_super_admin('tu@email.com');

-- O para super admin oculto:
SELECT assign_sistemas_role('tu@email.com');
```

### 5️⃣ Parcheauth (seguridad)
```sql
-- Ejecuta parcheauth.sql en SQL Editor
-- ✅ Habilita RLS en todas las tablas
-- ✅ Crea políticas con auth.uid()
-- ✅ Crea políticas de storage
```

---

## ✅ VERIFICACIÓN

```sql
-- ¿Usuario creado?
SELECT * FROM auth.users WHERE email = 'tu@email.com';

-- ¿Perfil creado?
SELECT * FROM perfiles WHERE email = 'tu@email.com';

-- ¿Rol asignado?
SELECT u.email, r.name 
FROM auth.users u
JOIN roles_usuario ru ON ru.user_id = u.id
JOIN roles r ON r.id = ru.role_id
WHERE u.email = 'tu@email.com';

-- ¿RLS habilitado?
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
```

---

## 🚨 ERRORES COMUNES

| Error | Causa | Solución |
|-------|-------|----------|
| `relation does not exist` | Ejecutaste parcheauth antes de schema | Ejecuta schema.sql primero |
| `auth.uid() does not exist` | Ejecutaste RLS sin crear usuario | Crea usuario en Dashboard primero |
| `duplicate key` | Ya ejecutaste seed.sql | Ignora o resetea BD |
| Usuario no ve datos | RLS habilitado sin políticas | Ejecuta parcheauth.sql |

---

## 🎯 TU TEORÍA ERA CORRECTA

✅ **schema.sql** → estructura (tablas, NO auth)  
✅ **seed.sql** → datos mínimos (roles, ejemplos)  
✅ **Dashboard** → crear usuario manualmente  
✅ **parcheauth.sql** → seguridad (RLS, políticas con auth)

**¡EXACTO!** 🎉

---

## 📞 Si algo falla

1. Revisa logs del SQL Editor
2. Verifica que ejecutaste EN ORDEN
3. Verifica que el usuario existe: `SELECT * FROM auth.users;`
4. Si todo falla, resetea y vuelve a empezar desde schema.sql
