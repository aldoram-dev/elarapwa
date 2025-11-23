# Migrations (Flattened)

Este directorio fue vaciado tras la consolidación del esquema el 2025-11-10.

La fuente de la verdad ahora es:

* `../schema.sql` – definición completa (tipos, tablas, índices, funciones, triggers, RLS, buckets).
* `../seed.sql` – datos iniciales.

## Flujo para un entorno nuevo

1. Ejecutar `schema.sql` completo.
2. Ejecutar `seed.sql`.
3. (Opcional) Añadir datos específicos de desarrollo/pruebas.

## Cómo introducir cambios futuros

Modifica directamente `schema.sql` manteniendo estos principios:

* Idempotencia: usa `CREATE TABLE IF NOT EXISTS`, `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;`.
* Antes de crear triggers/índices/policies haz `DROP ... IF EXISTS` o `CREATE ... IF NOT EXISTS`.
* Agrupa secciones con cabeceras claras `-- =====================================================`.
* Agrega `COMMENT ON` para documentar funciones y tablas importantes.

Workflow sugerido para cambios grandes:
1. Crea un archivo temporal aquí (ej: `draft_feature_x.sql`).
2. Aplícalo localmente para iterar rápido.
3. Copia los bloques definitivos a `schema.sql`.
4. Borra el archivo temporal antes del commit final.

## ¿Por qué se eliminaron las migraciones históricas?

Eran fragmentadas, con duplicaciones (ej. notificaciones, foros, policies storage) y pasos de corrección posteriores. Consolidar reduce:

* Riesgo de drift entre entornos.
* Tiempo de provisión.
* Confusión sobre el orden correcto.

## Si algún día necesitas reconstruir migraciones incrementales

Puedes partir de `schema.sql` y extraer en orden:
1. Tipos ENUM.
2. Tablas y relaciones.
3. Índices.
4. RLS Policies.
5. Funciones & triggers.
6. Buckets y políticas de storage.
7. Comentarios / documentación.
8. Seed (parcial si aplica).

## Checklist de buenas prácticas al editar schema.sql

- [ ] Nuevas tablas con índices esenciales (búsquedas frecuentes, FKs).
- [ ] Políticas RLS definidas inmediatamente después de habilitar RLS.
- [ ] Triggers usan funciones reutilizables cuando posible (`update_updated_at_column`).
- [ ] Funciones sensibles usan `SECURITY DEFINER` solo si realmente se requiere.
- [ ] Comentarios añadidos para nuevas funciones públicas.
- [ ] Enums ampliados sin romper valores existentes.
- [ ] Índices parciales justificados (ej: unread notifications).
- [ ] Revisión de nombres: consistencia snake_case.

## Seguridad

El esquema consolidado ya incluye:
* RLS activado en tablas sensibles.
* Auditoría de roles (`roles_audit`).
* Eventos de seguridad (`security_events`).
* Proyección relacional `roles_permisos`.
* Políticas de storage estrictas (`documents`, `branding`, `forum-attachments`).

---
Última actualización: 2025-11-10 (flatten)
