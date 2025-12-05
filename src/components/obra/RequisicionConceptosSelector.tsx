import React, { useMemo, useState } from 'react';
import { ConceptoContrato } from '@/types/concepto-contrato';
import { RequisicionConcepto } from '@/types/requisicion-pago';
import { TextField, Tooltip, Stack, Typography, Box, FormControlLabel, Switch, Autocomplete, Chip } from '@mui/material';
import { db } from '@/db/database';

interface RequisicionConceptosSelectorProps {
  conceptosContrato: ConceptoContrato[];
  conceptosSeleccionados: RequisicionConcepto[];
  onConceptosChange: (conceptos: RequisicionConcepto[]) => void;
  contratoId?: string;
  readonly?: boolean;
  readOnly?: boolean;
  esContratista?: boolean;
}

export const RequisicionConceptosSelector: React.FC<RequisicionConceptosSelectorProps> = ({
  conceptosContrato,
  conceptosSeleccionados,
  onConceptosChange,
  contratoId,
  readonly = false,
  readOnly = false,
  esContratista = false
}) => {
  const isReadOnly = readonly || readOnly;
  const [cantidadesInput, setCantidadesInput] = useState<Record<string, string>>({});
  
  // Estados de filtros
  const [filtroPartida, setFiltroPartida] = useState<string | null>(null);
  const [filtroSubpartida, setFiltroSubpartida] = useState<string | null>(null);
  const [filtroBusqueda, setFiltroBusqueda] = useState<string>('');
  const [soloCompletos, setSoloCompletos] = useState<boolean>(false);
  const [soloPendientes, setSoloPendientes] = useState<boolean>(false);
  const [soloModificados, setSoloModificados] = useState<boolean>(false);
  const [soloOriginales, setSoloOriginales] = useState<boolean>(false);
  const [mostrarExtras, setMostrarExtras] = useState<boolean>(true);
  
  // Estados para extras y deducciones
  const [conceptosExtras, setConceptosExtras] = useState<any[]>([]);
  const [deduccionesExtra, setDeduccionesExtra] = useState<any[]>([]);

  const conceptosMap = useMemo(() => {
    const map = new Map<string, RequisicionConcepto>();
    conceptosSeleccionados.forEach(c => map.set(c.concepto_contrato_id, c));
    return map;
  }, [conceptosSeleccionados]);

  // Función para cargar extras y deducciones
  const loadExtrasYDeducciones = React.useCallback(async () => {
    if (!contratoId) return;

    try {
      console.log('🔵 Cargando extras y deducciones para contrato:', contratoId);
      
      // Cargar cambios tipo EXTRA aplicados
      const cambiosExtras = await db.cambios_contrato
        .where('contrato_id')
        .equals(contratoId)
        .and(c => c.active === true && c.estatus === 'APLICADO' && c.tipo_cambio === 'EXTRA')
        .toArray();
      
      console.log('🔵 Cambios EXTRA encontrados:', cambiosExtras.length, cambiosExtras);

      const extras: any[] = [];
      for (const cambio of cambiosExtras) {
        const detalles = await db.detalles_extra
          .where('cambio_contrato_id')
          .equals(cambio.id)
          .and(d => d.active !== false)
          .toArray();
        
        console.log(`🔵 Detalles extra para ${cambio.numero_cambio}:`, detalles.length, detalles);
        
        detalles.forEach(detalle => {
          extras.push({
            id: detalle.id,
            cambio_numero: cambio.numero_cambio,
            clave: detalle.concepto_clave,
            concepto: detalle.concepto_descripcion,
            unidad: detalle.concepto_unidad,
            cantidad: detalle.cantidad,
            precio_unitario: detalle.precio_unitario,
            importe: detalle.importe,
            tipo: 'EXTRA'
          });
        });
      }
      console.log('✅ Total conceptos extras:', extras.length);
      setConceptosExtras(extras);

      // Cargar deducciones extra solo si NO es contratista
      if (!esContratista) {
        const cambiosDeducciones = await db.cambios_contrato
          .where('contrato_id')
          .equals(contratoId)
          .and(c => c.active === true && c.estatus === 'APLICADO' && c.tipo_cambio === 'DEDUCCION_EXTRA')
          .toArray();

        console.log('🔵 Cambios DEDUCCION_EXTRA encontrados:', cambiosDeducciones.length);

        const deducciones: any[] = [];
        for (const cambio of cambiosDeducciones) {
          const detalles = await db.deducciones_extra
            .where('cambio_contrato_id')
            .equals(cambio.id)
            .and(d => d.active !== false)
            .toArray();
          
          detalles.forEach(detalle => {
            deducciones.push({
              id: detalle.id,
              cambio_numero: cambio.numero_cambio,
              descripcion: detalle.descripcion,
              monto: detalle.monto,
              tipo: 'DEDUCCION_EXTRA'
            });
          });
        }
        console.log('✅ Total deducciones extra:', deducciones.length);
        setDeduccionesExtra(deducciones);
      }
    } catch (error) {
      console.error('❌ Error cargando extras y deducciones:', error);
    }
  }, [contratoId, esContratista]);

  // Cargar conceptos extraordinarios y deducciones extra
  React.useEffect(() => {
    if (contratoId) {
      loadExtrasYDeducciones();
    }
  }, [contratoId, loadExtrasYDeducciones]);

  // Obtener opciones únicas para filtros
  const partidasUnicas = useMemo(() => {
    const partidas = new Set(conceptosContrato.map(c => c.partida));
    return Array.from(partidas).sort();
  }, [conceptosContrato]);

  const subpartidasUnicas = useMemo(() => {
    const conceptosFiltrados = filtroPartida 
      ? conceptosContrato.filter(c => c.partida === filtroPartida)
      : conceptosContrato;
    const subpartidas = new Set(conceptosFiltrados.map(c => c.subpartida));
    return Array.from(subpartidas).sort();
  }, [conceptosContrato, filtroPartida]);

  // Filtrar conceptos
  const conceptosFiltrados = useMemo(() => {
    return conceptosContrato.filter((concepto: any) => {
      const pagadaAnterior = concepto.cantidad_pagada_anterior || 0;
      const disponible = Math.max(0, concepto.cantidad_catalogo - pagadaAnterior);
      const estaCompleto = disponible === 0;
      const estaPendiente = disponible > 0;
      const esModificado = concepto.tiene_cambios === true;

      // Filtro de completos/pendientes
      if (soloCompletos && !estaCompleto) return false;
      if (soloPendientes && !estaPendiente) return false;

      // Filtro de modificados/originales
      if (soloModificados && !esModificado) return false;
      if (soloOriginales && esModificado) return false;

      // Filtro de partida
      if (filtroPartida && concepto.partida !== filtroPartida) return false;

      // Filtro de subpartida
      if (filtroSubpartida && concepto.subpartida !== filtroSubpartida) return false;

      // Filtro de búsqueda (clave o concepto)
      if (filtroBusqueda) {
        const busqueda = filtroBusqueda.toLowerCase();
        const matchClave = concepto.clave.toLowerCase().includes(busqueda);
        const matchConcepto = concepto.concepto.toLowerCase().includes(busqueda);
        if (!matchClave && !matchConcepto) return false;
      }

      return true;
    });
  }, [conceptosContrato, filtroPartida, filtroSubpartida, filtroBusqueda, soloCompletos, soloPendientes, soloModificados, soloOriginales]);

  const handleToggleConcepto = (concepto: ConceptoContrato & { cantidad_pagada_anterior?: number }) => {
    if (isReadOnly) return;

    const existe = conceptosMap.has(concepto.id);
    if (existe) {
      const nuevos = conceptosSeleccionados.filter(c => c.concepto_contrato_id !== concepto.id);
      onConceptosChange(nuevos);
    } else {
      const nuevo: RequisicionConcepto = {
        concepto_contrato_id: concepto.id,
        clave: concepto.clave,
        concepto: concepto.concepto,
        unidad: concepto.unidad,
        cantidad_catalogo: concepto.cantidad_catalogo,
        cantidad_pagada_anterior: concepto.cantidad_pagada_anterior || 0,
        cantidad_esta_requisicion: 0,
        precio_unitario: concepto.precio_unitario_catalogo,
        importe: 0
      };
      onConceptosChange([...conceptosSeleccionados, nuevo]);
    }
  };
  // Calcular totales
  const totales = useMemo(() => {
    return conceptosSeleccionados.reduce((acc, c) => ({
      importe: acc.importe + c.importe
    }), { importe: 0 });
  }, [conceptosSeleccionados]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Conceptos del Catálogo
        </h3>
        <div className="text-sm text-gray-600">
          {conceptosSeleccionados.length} de {conceptosContrato.length} seleccionados
          {conceptosFiltrados.length !== conceptosContrato.length && ` (${conceptosFiltrados.length} mostrados)`}
        </div>
      </div>

      {/* Filtros */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        {/* Filtro de Partida */}
        <Autocomplete
          size="small"
          value={filtroPartida}
          onChange={(_, newValue) => {
            setFiltroPartida(newValue);
            setFiltroSubpartida(null); // Reset subpartida cuando cambia partida
          }}
          options={partidasUnicas}
          sx={{ minWidth: 200 }}
          renderInput={(params) => <TextField {...params} label="Partida" placeholder="Todas" />}
        />

        {/* Filtro de Subpartida */}
        <Autocomplete
          size="small"
          value={filtroSubpartida}
          onChange={(_, newValue) => setFiltroSubpartida(newValue)}
          options={subpartidasUnicas}
          disabled={!filtroPartida}
          sx={{ minWidth: 200 }}
          renderInput={(params) => <TextField {...params} label="Subpartida" placeholder="Todas" />}
        />

        {/* Búsqueda por clave o concepto */}
        <TextField
          size="small"
          label="Buscar"
          placeholder="Clave o concepto..."
          value={filtroBusqueda}
          onChange={(e) => setFiltroBusqueda(e.target.value)}
          sx={{ minWidth: 250 }}
        />

        {/* Switch Pendientes/Completos */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={soloPendientes}
                onChange={(e) => {
                  setSoloPendientes(e.target.checked);
                  if (e.target.checked) setSoloCompletos(false);
                }}
                color="success"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2">Pendientes</Typography>
                <Chip label={conceptosContrato.filter((c: any) => {
                  const disponible = Math.max(0, c.cantidad_catalogo - (c.cantidad_pagada_anterior || 0));
                  return disponible > 0;
                }).length} size="small" color="success" />
              </Box>
            }
          />
          <FormControlLabel
            control={
              <Switch
                checked={soloCompletos}
                onChange={(e) => {
                  setSoloCompletos(e.target.checked);
                  if (e.target.checked) setSoloPendientes(false);
                }}
                color="error"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2">Completos</Typography>
                <Chip label={conceptosContrato.filter((c: any) => {
                  const disponible = Math.max(0, c.cantidad_catalogo - (c.cantidad_pagada_anterior || 0));
                  return disponible === 0;
                }).length} size="small" color="error" />
              </Box>
            }
          />
        </Box>

        {/* Switch Modificados/Originales */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={soloModificados}
                onChange={(e) => {
                  setSoloModificados(e.target.checked);
                  if (e.target.checked) setSoloOriginales(false);
                }}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2">Modificados</Typography>
                <Chip label={conceptosContrato.filter((c: any) => c.tiene_cambios === true).length} size="small" color="primary" />
              </Box>
            }
          />
          <FormControlLabel
            control={
              <Switch
                checked={soloOriginales}
                onChange={(e) => {
                  setSoloOriginales(e.target.checked);
                  if (e.target.checked) setSoloModificados(false);
                }}
                color="default"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2">Originales</Typography>
                <Chip label={conceptosContrato.filter((c: any) => c.tiene_cambios !== true).length} size="small" variant="outlined" />
              </Box>
            }
          />
        </Box>

        {/* Switch Mostrar Extras */}
        <FormControlLabel
          control={
            <Switch
              checked={mostrarExtras}
              onChange={(e) => setMostrarExtras(e.target.checked)}
              color="secondary"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2">Mostrar Extras</Typography>
              <Chip label={conceptosExtras.length + deduccionesExtra.length} size="small" color="secondary" />
            </Box>
          }
        />
      </Box>

      {/* Tabla de conceptos */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <Tooltip title="Conceptos con aditivas/deductivas aplicadas">
                  <span>Estado</span>
                </Tooltip>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partida</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subpartida</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actividad</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clave</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concepto</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                <Tooltip title="Cantidad después de aplicar aditivas/deductivas">
                  <span>Cantidad Actualizada Catálogo</span>
                </Tooltip>
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Disponible</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unitario</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad a Pagar</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Importe</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {conceptosFiltrados.map((concepto: any) => {
              const conceptoReq = conceptosMap.get(concepto.id);
              const isSelected = !!conceptoReq;
              const cantidadPagar = conceptoReq?.cantidad_esta_requisicion || 0;
              const importe = conceptoReq?.importe || 0;
              const pagadaAnterior = concepto.cantidad_pagada_anterior || 0;
              const maxRemaining = Math.max(0, concepto.cantidad_catalogo - pagadaAnterior);
              const yaRequisitado = pagadaAnterior > 0;

              return (
                <tr
                  key={concepto.id}
                  className={`${isSelected ? 'bg-slate-50' : ''} ${yaRequisitado ? 'bg-yellow-50' : ''} hover:bg-gray-50 transition-colors`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500"
                      disabled={isReadOnly || maxRemaining <= 0}
                      checked={isSelected}
                      onChange={() => handleToggleConcepto(concepto)}
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    {(concepto as any).tiene_cambios ? (
                      <Tooltip title={`Cantidad modificada: Original ${(concepto as any).cantidad_catalogo_original?.toLocaleString('es-MX', { minimumFractionDigits: 2 })} → Actual ${concepto.cantidad_catalogo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}>
                        <Chip 
                          label="Modificado" 
                          size="small" 
                          sx={{ 
                            bgcolor: 'primary.main', 
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.7rem'
                          }} 
                        />
                      </Tooltip>
                    ) : (
                      <Chip 
                        label="Original" 
                        size="small" 
                        variant="outlined"
                        sx={{ 
                          borderColor: 'grey.300',
                          color: 'grey.600',
                          fontSize: '0.7rem'
                        }}
                      />
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700">{concepto.partida}</td>
                  <td className="px-3 py-3 text-sm text-gray-700">{concepto.subpartida}</td>
                  <td className="px-3 py-3 text-sm text-gray-700">{concepto.actividad}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 font-medium">
                    {concepto.clave}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700">
                    {concepto.concepto}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600">
                    {concepto.unidad}
                  </td>
                  <td className="px-3 py-3 text-sm text-right font-mono">
                    <Stack direction="column" spacing={0.5} alignItems="flex-end">
                      <span className={`${(concepto as any).tiene_cambios ? 'text-blue-700 font-bold' : 'text-gray-900'}`}>
                        {concepto.cantidad_catalogo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                      {(concepto as any).tiene_cambios && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', textDecoration: 'line-through' }}>
                          Orig: {(concepto as any).cantidad_catalogo_original?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      )}
                    </Stack>
                  </td>
                  <td className="px-3 py-3 text-sm text-right font-mono">
                    <Tooltip title={yaRequisitado ? `Requisitado anterior: ${pagadaAnterior.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'Sin requisiciones previas'}>
                      <span className={`${
                        maxRemaining === 0 ? 'text-red-600 font-bold' : 
                        yaRequisitado ? 'text-yellow-700 font-semibold' : 
                        'text-green-700'
                      }`}>
                        {maxRemaining.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        {maxRemaining === 0 && <span className="ml-1 text-xs">(Agotado)</span>}
                      </span>
                    </Tooltip>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-900 text-right font-mono">
                    ${concepto.precio_unitario_catalogo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {isSelected ? (
                      (() => {
                        const enteredStr =
                          cantidadesInput[concepto.id] !== undefined
                            ? cantidadesInput[concepto.id]
                            : (cantidadPagar ? String(cantidadPagar) : '');
                        const normalizedForError = enteredStr.replace(',', '.');
                        const parsedForError = normalizedForError === '' ? 0 : parseFloat(normalizedForError);
                        const exceeds = parsedForError > maxRemaining;
                        return (
                          <Tooltip
                            placement="top"
                            title={
                              <Stack spacing={0.5}>
                                <Typography variant="caption">Catálogo: {concepto.cantidad_catalogo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                                <Typography variant="caption">Pagado anterior: {pagadaAnterior.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                                <Typography variant="caption">Máximo disponible: {maxRemaining.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                              </Stack>
                            }
                          >
                            <TextField
                              size="small"
                              type="text"
                              inputMode="decimal"
                              value={enteredStr}
                              disabled={isReadOnly}
                              onChange={(e) => {
                                const entered = e.target.value;
                                if (!/^\d*(?:[\.,]\d*)?$/.test(entered)) return;
                                // Siempre reflejar lo tecleado, incluso '.' o ','.
                                setCantidadesInput(prev => ({ ...prev, [concepto.id]: entered }));

                                const normalized = entered.replace(',', '.');
                                const cantidad = normalized === '' || normalized === '.' ? NaN : parseFloat(normalized);
                                if (Number.isNaN(cantidad)) return; // esperar a que sea número válido (ej. '.5')

                                let cantidadAplicar = cantidad;
                                let displayValue = entered;
                                if (cantidad > maxRemaining) {
                                  cantidadAplicar = maxRemaining;
                                  const sep = entered.includes(',') ? ',' : '.';
                                  displayValue = String(maxRemaining).replace('.', sep);
                                  setCantidadesInput(prev => ({ ...prev, [concepto.id]: displayValue }));
                                }

                                const nuevos = conceptosSeleccionados.map(c => {
                                  if (c.concepto_contrato_id === concepto.id) {
                                    return {
                                      ...c,
                                      cantidad_esta_requisicion: cantidadAplicar,
                                      importe: cantidadAplicar * c.precio_unitario
                                    };
                                  }
                                  return c;
                                });
                                onConceptosChange(nuevos);
                              }}
                              onBlur={() => {
                                const current = cantidadesInput[concepto.id] ?? '';
                                if (current.startsWith('.') || current.startsWith(',')) {
                                  const fixed = '0' + current;
                                  setCantidadesInput(prev => ({ ...prev, [concepto.id]: fixed }));
                                }
                              }}
                              error={exceeds}
                              helperText={exceeds ? `Máximo: ${maxRemaining.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : ' '}
                              placeholder="0.00"
                              sx={{ 
                                width: 140, 
                                '& input': { 
                                  textAlign: 'right', 
                                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                                },
                                '& .Mui-disabled': {
                                  backgroundColor: '#f3f4f6',
                                  cursor: 'not-allowed'
                                }
                              }}
                            />
                          </Tooltip>
                        );
                      })()
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm text-right font-mono">
                    {isSelected ? (
                      <span className="font-semibold text-slate-700">
                        ${importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {conceptosSeleccionados.length > 0 && (
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td colSpan={12} className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
                  Total Monto Estimado:
                </td>
                <td className="px-3 py-3 text-right text-sm font-bold text-slate-700">
                  ${totales.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {conceptosContrato.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay conceptos en el catálogo del contrato
        </div>
      )}

      {conceptosContrato.length > 0 && conceptosFiltrados.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay conceptos que coincidan con los filtros aplicados
        </div>
      )}

      {/* Sección de Conceptos Extraordinarios */}
      {mostrarExtras && conceptosExtras.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            Conceptos Extraordinarios
            <Chip label={conceptosExtras.length} size="small" color="info" />
          </Typography>
          <div className="overflow-x-auto border border-blue-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Folio</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clave</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidad</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">P.U.</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Importe</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {conceptosExtras.map((extra) => (
                  <tr key={extra.id} className="bg-blue-50/30">
                    <td className="px-3 py-3 text-sm text-blue-700 font-semibold">{extra.cambio_numero}</td>
                    <td className="px-3 py-3 text-sm text-gray-900">{extra.clave}</td>
                    <td className="px-3 py-3 text-sm text-gray-700">{extra.concepto}</td>
                    <td className="px-3 py-3 text-sm text-gray-600">{extra.unidad}</td>
                    <td className="px-3 py-3 text-sm text-right font-mono">{extra.cantidad.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-3 text-sm text-right font-mono">${extra.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-3 text-sm text-right font-mono font-semibold">${extra.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            ℹ️ Los conceptos extraordinarios ya están aplicados al contrato y se muestran solo como referencia
          </Typography>
        </Box>
      )}

      {/* Sección de Deducciones Extra (solo para desarrollador) */}
      {mostrarExtras && !esContratista && deduccionesExtra.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            Deducciones Extra
            <Chip label={deduccionesExtra.length} size="small" color="error" />
          </Typography>
          <div className="overflow-x-auto border border-red-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-red-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Folio</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto Deducido</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deduccionesExtra.map((deduccion) => (
                  <tr key={deduccion.id} className="bg-red-50/30">
                    <td className="px-3 py-3 text-sm text-red-700 font-semibold">{deduccion.cambio_numero}</td>
                    <td className="px-3 py-3 text-sm text-gray-700">{deduccion.descripcion}</td>
                    <td className="px-3 py-3 text-sm text-right font-mono font-semibold text-red-700">
                      -${deduccion.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            ⚠️ Estas deducciones ya están aplicadas al contrato y reducen el monto total del mismo
          </Typography>
        </Box>
      )}
    </div>
  );
};
