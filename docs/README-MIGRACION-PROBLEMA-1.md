# 🚀 EJECUTAR MIGRACIÓN: Problema #1 - Congelar Montos

## ⚡ Opción Rápida: Supabase Dashboard (RECOMENDADO)

### 📋 Pasos:

1. **Abrir Supabase Dashboard**
   - Ir a: https://app.supabase.com
   - Seleccionar tu proyecto
   - Click en "SQL Editor" (ícono de base de datos en sidebar)

2. **Ejecutar Migración**
   - Abrir el archivo: `supabase/migrations/EJECUTAR-EN-DASHBOARD.sql`
   - Copiar TODO el contenido
   - Pegar en el editor SQL de Supabase
   - Click en **"RUN"** (o Ctrl+Enter)

3. **Verificar Éxito**
   - Debe aparecer mensaje: **"Success. No rows returned"**
   - En los mensajes debe aparecer:
     ```
     ✅ Verificación completada:
        - requisiciones_pago: 6 columnas agregadas (esperado: 6)
        - solicitudes_pago: 12 columnas agregadas (esperado: 12)
     🎉 ¡Migración exitosa! Todas las columnas fueron creadas.
     ```

---

## 🔧 Opción Alternativa: Script TypeScript

Si prefieres ejecutar desde código:

```bash
# Asegúrate de tener tsx instalado
npm install -D tsx

# Ejecutar script
npx tsx scripts/ejecutar-migracion-problema1.ts
```

---

## ✅ Después de Ejecutar la Migración

### 1. Verificar en Supabase Dashboard

**Tabla requisiciones_pago:**
- Ir a: Database → Tables → requisiciones_pago
- Verificar que existen las columnas:
  - `amortizacion_porcentaje`
  - `amortizacion_base_contrato`
  - `amortizacion_metodo`
  - `retencion_ordinaria_porcentaje`
  - `tratamiento_iva`
  - `iva_porcentaje`

**Tabla solicitudes_pago:**
- Ir a: Database → Tables → solicitudes_pago
- Verificar que existen las columnas:
  - `subtotal_calculo`
  - `amortizacion_porcentaje`
  - `amortizacion_aplicada`
  - `retencion_porcentaje`
  - `retencion_ordinaria_aplicada`
  - `retenciones_esp_aplicadas`
  - `retenciones_esp_regresadas`
  - `tratamiento_iva`
  - `iva_porcentaje`
  - `caratura_generada`
  - `caratura_bloqueada`
  - `fecha_bloqueo_caratura`

### 2. Probar en la Aplicación

Seguir la guía completa: **[docs/GUIA-PRUEBA-PROBLEMA-1.md](./GUIA-PRUEBA-PROBLEMA-1.md)**

**Resumen de la prueba:**
1. Crear requisición con concepto a $10,000
2. Guardar (debe mostrar Total: $75,400)
3. Cambiar precio del concepto a $15,000
4. Abrir requisición → **DEBE seguir mostrando $75,400** ✅
5. Crear solicitud desde requisición
6. Solicitud debe mostrar $75,400 (NO $113,100) ✅

---

## 📊 ¿Qué hace esta migración?

Agrega campos para **guardar permanentemente** los valores calculados:

### Requisiciones (requisiciones_pago):
- Guarda el % de amortización usado (ej: 30%)
- Guarda el monto base del contrato usado
- Guarda el % de retención (ej: 5%)
- Guarda el tratamiento de IVA ("MAS IVA", "IVA EXENTO", "IVA TASA 0")
- Guarda el % de IVA (16 o 0)

### Solicitudes (solicitudes_pago):
- **COPIA** todos los valores de la requisición
- Agrega control de carátula (bloqueada/generada)
- Guarda fecha de bloqueo

---

## 🎯 Resultado

**ANTES:**
- Usuario aprueba pago por $75,400
- 2 días después, precio cambia
- Sistema muestra $83,200 ❌
- **No se sabe qué monto se autorizó**

**DESPUÉS:**
- Usuario aprueba pago por $75,400
- 2 días después, precio cambia
- Sistema sigue mostrando $75,400 ✅
- **El monto autorizado está protegido**

---

## 🐛 Troubleshooting

### Error: "column already exists"
**Solución:** Las columnas ya existen, la migración ya se ejecutó anteriormente. Ignorar el error.

### Error: "permission denied"
**Solución:** Tu usuario de Supabase no tiene permisos para modificar schema. Contactar al administrador del proyecto.

### Error: "syntax error"
**Solución:** Asegúrate de copiar TODO el archivo SQL, incluyendo `BEGIN;` y `COMMIT;`

### No aparece el mensaje de verificación
**Solución:** Revisar en Database → Tables manualmente que las columnas existen.

---

## 📚 Documentación Relacionada

- **[IMPLEMENTACION-PROBLEMA-1.md](./IMPLEMENTACION-PROBLEMA-1.md)** - Documentación técnica completa
- **[GUIA-PRUEBA-PROBLEMA-1.md](./GUIA-PRUEBA-PROBLEMA-1.md)** - Guía de prueba detallada
- **[PLAN-DE-ACCION-MEJORAS.md](./PLAN-DE-ACCION-MEJORAS.md)** - Plan completo de mejoras

---

## ✅ Checklist

```
[ ] Ejecutar migración en Supabase Dashboard
[ ] Verificar mensaje de éxito
[ ] Verificar columnas en tabla requisiciones_pago
[ ] Verificar columnas en tabla solicitudes_pago
[ ] Ejecutar prueba: Crear requisición
[ ] Ejecutar prueba: Cambiar precio de concepto
[ ] Ejecutar prueba: Verificar que requisición NO cambia
[ ] Ejecutar prueba: Crear solicitud
[ ] Ejecutar prueba: Verificar que solicitud copia valores
[ ] ✅ Migración completa y funcional
```
