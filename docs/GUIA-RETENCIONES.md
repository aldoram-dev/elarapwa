# Guía de Implementación: Sistema de Retenciones de Contrato

## 📋 Resumen

Se ha implementado un nuevo sistema de **Retenciones de Contrato** que permite:

1. **Dar de alta retenciones** en el contrato (similar a deducciones extras)
2. **Aplicar retenciones** en requisiciones (restando del monto)
3. **Regresar retenciones** en requisiciones posteriores (sumando al monto)

## ✅ Cambios Completados

### 1. Tipos y Base de Datos

#### **Archivo**: `src/types/cambio-contrato.ts`
- ✅ Agregado tipo `'RETENCION'` a `TipoCambioContrato`
- ✅ Creada interface `RetencionContrato` con campos:
  - `monto`: Monto total de la retención
  - `monto_aplicado`: Monto ya aplicado (restado) en requisiciones
  - `monto_regresado`: Monto ya regresado (sumado) en requisiciones
  - `monto_disponible`: Monto disponible = monto - monto_aplicado + monto_regresado
- ✅ Agregado `retenciones_contrato` a `CambioContratoConRelaciones`
- ✅ Agregado `total_retenciones` a `ResumenCambiosContrato`

#### **Archivo**: `src/db/database.ts`
- ✅ Importada `RetencionContrato`
- ✅ Creado tipo `RetencionContratoDB`
- ✅ Agregada tabla `retenciones_contrato` a Dexie
- ✅ Agregada en método `getDirtyRecords()`

#### **Archivo**: `supabase/crear-tabla-retenciones.sql`
- ✅ Script SQL completo para crear la tabla en Supabase
- ✅ Índices para optimización
- ✅ Triggers para `updated_at` y cálculo automático de `monto_disponible`
- ✅ Políticas RLS (Row Level Security)
- ✅ Actualización del constraint de `tipo_cambio` en `cambios_contrato`

### 2. Componente de Gestión

#### **Archivo**: `src/components/obra/RetencionesContrato.tsx` (NUEVO)
Componente completo para gestionar retenciones con:
- ✅ Listado de retenciones registradas
- ✅ Formulario para crear nuevas retenciones
- ✅ Sistema de aprobación (BORRADOR → APLICADO/RECHAZADO)
- ✅ Indicadores visuales de progreso:
  - Monto total
  - Monto aplicado (con barra de progreso roja)
  - Monto regresado (con barra de progreso verde)
  - Monto disponible
- ✅ Control de permisos (readOnly para contratistas)

### 3. Interfaz de Usuario

#### **Archivo**: `src/components/obra/ContratoConceptosModal.tsx`
- ✅ Importado `RetencionesContrato` component
- ✅ Importado icono `Shield` de lucide-react
- ✅ Agregada pestaña "Retenciones" con icono Shield
- ✅ Agregado `TabPanel` para retenciones (index 5)
- ✅ Ajustado índice de pestaña "Extraordinario" a 6

## 🚧 Pendiente de Implementación

### 3. Aplicación en Requisiciones

Para completar la funcionalidad, es necesario modificar los siguientes archivos:

#### **A. `src/types/requisicion-pago.ts`**
```typescript
// Agregar nuevos tipos para retenciones en requisiciones
export interface RetencionAplicada {
  retencion_contrato_id: string;
  descripcion: string;
  monto: number; // Positivo para aplicar (restar), negativo para regresar (sumar)
  tipo_aplicacion: 'APLICAR' | 'REGRESAR';
}

// Modificar RequisicionPago para incluir retenciones
export interface RequisicionPago {
  // ... campos existentes
  retenciones_aplicadas?: RetencionAplicada[]; // 🆕
}
```

#### **B. `src/components/obra/RequisicionConceptosSelector.tsx`**

**Agregar estados:**
```typescript
const [retencionesDisponibles, setRetencionesDisponibles] = useState<any[]>([]);
const [retencionesSeleccionadas, setRetencionesSeleccionadas] = useState<Record<string, {
  monto: number;
  tipo: 'APLICAR' | 'REGRESAR';
}>>({});
```

**Función para cargar retenciones:**
```typescript
// Agregar en loadExtrasYDeducciones()
const cambiosRetenciones = await db.cambios_contrato
  .where('contrato_id')
  .equals(contratoId)
  .and(c => c.active === true && c.estatus === 'APLICADO' && c.tipo_cambio === 'RETENCION')
  .toArray();

const retenciones: any[] = [];
for (const cambio of cambiosRetenciones) {
  const detalles = await db.retenciones_contrato
    .where('cambio_contrato_id')
    .equals(cambio.id)
    .and(r => r.active !== false && r.monto_disponible > 0)
    .toArray();
  
  detalles.forEach(detalle => {
    retenciones.push({
      id: detalle.id,
      cambio_numero: cambio.numero_cambio,
      descripcion: detalle.descripcion,
      monto_total: detalle.monto,
      monto_disponible: detalle.monto_disponible,
      monto_aplicado: detalle.monto_aplicado,
      monto_regresado: detalle.monto_regresado,
      tipo: 'RETENCION'
    });
  });
}
setRetencionesDisponibles(retenciones);
```

**Agregar sección en la tabla:**
```tsx
{/* Sección de Retenciones */}
{mostrarExtras && retencionesDisponibles.length > 0 && (
  <Box sx={{ mt: 4 }}>
    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
      Retenciones Disponibles
      <Chip label={retencionesDisponibles.length} size="small" color="primary" />
    </Typography>
    <TableContainer>
      <Table>
        <TableHead className="bg-gradient-to-r from-blue-600 to-blue-500">
          <TableRow>
            <TableCell>Folio</TableCell>
            <TableCell>Descripción</TableCell>
            <TableCell align="right">Disponible</TableCell>
            <TableCell align="right">Monto a Aplicar/Regresar</TableCell>
            <TableCell>Acción</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {retencionesDisponibles.map((retencion) => (
            <TableRow key={retencion.id}>
              <TableCell>{retencion.cambio_numero}</TableCell>
              <TableCell>
                {retencion.descripcion}
                <Typography variant="caption" display="block">
                  Aplicado: ${retencion.monto_aplicado.toFixed(2)} | 
                  Regresado: ${retencion.monto_regresado.toFixed(2)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                ${retencion.monto_disponible.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell align="right">
                <TextField
                  type="number"
                  size="small"
                  value={retencionesSeleccionadas[retencion.id]?.monto || ''}
                  onChange={(e) => handleRetencionChange(retencion.id, parseFloat(e.target.value) || 0)}
                  disabled={readOnly || readonly}
                  inputProps={{ step: 0.01, min: 0, max: retencion.monto_disponible }}
                />
              </TableCell>
              <TableCell>
                <Select
                  size="small"
                  value={retencionesSeleccionadas[retencion.id]?.tipo || 'APLICAR'}
                  onChange={(e) => handleRetencionTipoChange(retencion.id, e.target.value as 'APLICAR' | 'REGRESAR')}
                  disabled={readOnly || readonly}
                >
                  <MenuItem value="APLICAR">
                    <TrendingDown /> Aplicar (Restar)
                  </MenuItem>
                  <MenuItem value="REGRESAR">
                    <TrendingUp /> Regresar (Sumar)
                  </MenuItem>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
```

**Handlers:**
```typescript
const handleRetencionChange = (retencionId: string, monto: number) => {
  setRetencionesSeleccionadas(prev => ({
    ...prev,
    [retencionId]: {
      monto,
      tipo: prev[retencionId]?.tipo || 'APLICAR'
    }
  }));
};

const handleRetencionTipoChange = (retencionId: string, tipo: 'APLICAR' | 'REGRESAR') => {
  setRetencionesSeleccionadas(prev => ({
    ...prev,
    [retencionId]: {
      monto: prev[retencionId]?.monto || 0,
      tipo
    }
  }));
};
```

**Callback al componente padre:**
```typescript
// Agregar prop al componente
onRetencionesChange?: (retenciones: Array<{ 
  id: string; 
  monto: number; 
  tipo: 'APLICAR' | 'REGRESAR' 
}>) => void;

// Notificar cambios
useEffect(() => {
  if (onRetencionesChange) {
    const retenciones = Object.entries(retencionesSeleccionadas)
      .filter(([_, data]) => data.monto > 0)
      .map(([id, data]) => ({ id, monto: data.monto, tipo: data.tipo }));
    onRetencionesChange(retenciones);
  }
}, [retencionesSeleccionadas, onRetencionesChange]);
```

#### **C. `src/components/obra/RequisicionPagoForm.tsx`**

**Agregar estado:**
```typescript
const [retenciones, setRetenciones] = useState<Array<{ 
  id: string; 
  monto: number; 
  tipo: 'APLICAR' | 'REGRESAR' 
}>>([]);
```

**Pasar al selector:**
```tsx
<RequisicionConceptosSelector
  // ... props existentes
  onRetencionesChange={setRetenciones}
  retencionesIniciales={retenciones} // Para modo edición
/>
```

**Calcular total con retenciones:**
```typescript
// En calculateTotals()
const totalRetenciones = retenciones.reduce((sum, ret) => {
  // APLICAR resta, REGRESAR suma
  return sum + (ret.tipo === 'APLICAR' ? -ret.monto : ret.monto);
}, 0);

const totalFinal = totalConceptos + totalDeducciones + totalRetenciones - amortizacion - retencion - otrosDescuentos;
```

**Guardar con retenciones:**
```typescript
// En handleSubmit()
const requisicionData: RequisicionPago = {
  // ... campos existentes
  retenciones_aplicadas: retenciones.map(ret => ({
    retencion_contrato_id: ret.id,
    descripcion: '', // Buscar de la base de datos
    monto: ret.tipo === 'APLICAR' ? ret.monto : -ret.monto,
    tipo_aplicacion: ret.tipo
  }))
};

// Después de guardar, actualizar montos en retenciones_contrato
for (const ret of retenciones) {
  const retencionDB = await db.retenciones_contrato.get(ret.id);
  if (retencionDB) {
    const nuevoAplicado = ret.tipo === 'APLICAR' 
      ? retencionDB.monto_aplicado + ret.monto 
      : retencionDB.monto_aplicado;
    
    const nuevoRegresado = ret.tipo === 'REGRESAR'
      ? retencionDB.monto_regresado + ret.monto
      : retencionDB.monto_regresado;
    
    await db.retenciones_contrato.update(ret.id, {
      monto_aplicado: nuevoAplicado,
      monto_regresado: nuevoRegresado,
      monto_disponible: retencionDB.monto - nuevoAplicado + nuevoRegresado,
      updated_at: new Date().toISOString(),
      _dirty: true
    });
  }
}
```

#### **D. Actualizar vistas de requisiciones y carátulas**

**Archivos a modificar:**
- `src/components/obra/CaratulaRequisicionModal.tsx`: Mostrar retenciones aplicadas
- `src/pages/obra/EstadoCuentaPage.tsx`: Incluir retenciones en cálculos

## 🎯 Flujo Completo

1. **Gerente crea retención** en Contrato → Tab "Retenciones"
2. **Gerente aprueba retención** → Cambia a estado APLICADO
3. **Contratista crea requisición**
4. **Gerente aplica retención** en requisición:
   - Selecciona retención disponible
   - Elige "Aplicar (Restar)" o "Regresar (Sumar)"
   - Ingresa monto
5. **Sistema actualiza automáticamente**:
   - `monto_aplicado` o `monto_regresado` en `retenciones_contrato`
   - `monto_disponible` recalculado
   - Total de requisición ajustado

## 🔍 Validaciones Importantes

1. **Monto aplicado no puede exceder monto disponible**
2. **Monto regresado no puede exceder monto aplicado**
3. **Solo gerentes/administradores pueden aplicar/regresar retenciones**
4. **Retenciones deben estar en estado APLICADO**
5. **Al editar requisición, restaurar montos de retenciones previas**

## 📊 Base de Datos Supabase

**Ejecutar el script:**
```bash
psql -h <host> -U <user> -d <database> -f supabase/crear-tabla-retenciones.sql
```

O ejecutar directamente en Supabase Dashboard → SQL Editor.

## ✨ Características Implementadas

- ✅ CRUD completo de retenciones en contratos
- ✅ Sistema de aprobación (Borrador → Aplicado/Rechazado)
- ✅ Indicadores visuales de progreso con barras
- ✅ Cálculo automático de montos disponibles
- ✅ Restricciones de seguridad (RLS)
- ✅ Sincronización offline con Dexie
- ⏳ Aplicación en requisiciones (pendiente)
- ⏳ Regreso de retenciones (pendiente)

## 🎨 UI/UX

- **Color primario** para retenciones: Azul (`primary`)
- **Icono**: Shield (🛡️)
- **Aplicar**: Flecha hacia abajo roja (TrendingDown)
- **Regresar**: Flecha hacia arriba verde (TrendingUp)

---

**Siguiente paso**: Implementar la lógica de aplicación/regreso en requisiciones siguiendo los pasos detallados en la sección "🚧 Pendiente de Implementación".
