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
  onDeduccionesChange?: (deducciones: Array<{ id: string; cantidad: number; importe: number }>) => void;
  deduccionesIniciales?: Array<{ id: string; cantidad: number; importe: number }>;
}

export const RequisicionConceptosSelector: React.FC<RequisicionConceptosSelectorProps> = ({
  conceptosContrato,
  conceptosSeleccionados,
  onConceptosChange,
  contratoId,
  readonly = false,
  readOnly = false,
  esContratista = false,
  onDeduccionesChange,
  deduccionesIniciales
}) => {
  const isReadOnly = readonly || readOnly;
  const [cantidadesInput, setCantidadesInput] = useState<Record<string, string>>({});
  const [deduccionesSeleccionadas, setDeduccionesSeleccionadas] = useState<Record<string, { cantidad: number; importe: number }>>({});
  const [deduccionesInicializadas, setDeduccionesInicializadas] = useState(false);

  // Sincronizar deducciones iniciales SOLO una vez al cargar (evitar loop)
  React.useEffect(() => {
    if (deduccionesIniciales && deduccionesIniciales.length > 0 && !deduccionesInicializadas) {
      const deduccionesMap = deduccionesIniciales.reduce((acc, ded) => {
        acc[ded.id] = { cantidad: ded.cantidad, importe: ded.importe };
        return acc;
      }, {} as Record<string, { cantidad: number; importe: number }>);
      setDeduccionesSeleccionadas(deduccionesMap);
      setDeduccionesInicializadas(true);
    }
  }, [deduccionesIniciales, deduccionesInicializadas]);
  
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

      // Cargar deducciones extra (visibles para todos, pero contratistas no pueden editar)
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

  // Combinar conceptos del catálogo con deducciones extra en una sola lista
  const todosLosConceptos = useMemo(() => {
    const items: any[] = [];
    
    // Agregar conceptos normales del catálogo
    conceptosFiltrados.forEach((concepto: any) => {
      items.push({
        ...concepto,
        tipo: 'CONCEPTO',
        id_unico: `concepto_${concepto.id}`
      });
    });
    
    // Agregar deducciones extra al final (convertidas a formato similar)
    deduccionesExtra.forEach((deduccion) => {
      items.push({
        id: deduccion.id,
        id_unico: `deduccion_${deduccion.id}`,
        tipo: 'DEDUCCION',
        clave: deduccion.cambio_numero,
        concepto: deduccion.descripcion,
        unidad: 'PZA',
        cantidad_catalogo: 1,
        precio_unitario_catalogo: deduccion.monto * -1, // Negativo para mostrar como deducción
        cantidad_pagada_anterior: 0,
        partida: 'DEDUCCIONES',
        subpartida: 'EXTRA',
        actividad: '-',
        tiene_cambios: false,
        esDeduccion: true,
        montoOriginal: deduccion.monto
      });
    });
    
    return items;
  }, [conceptosFiltrados, deduccionesExtra]);

  const handleToggleConcepto = (item: any) => {
    if (isReadOnly) return;
    
    // Si es contratista y es deducción, no permitir
    if (esContratista && item.tipo === 'DEDUCCION') return;

    // Manejar deducciones
    if (item.tipo === 'DEDUCCION') {
      handleToggleDeduccion(item.id, { monto: item.montoOriginal });
      return;
    }

    // Manejar conceptos normales
    const concepto = item;
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
  // Memoizar el array de deducciones para evitar recreaciones
  const deduccionesArray = React.useMemo(() => {
    return Object.entries(deduccionesSeleccionadas).map(([id, data]) => ({
      id,
      cantidad: data.cantidad,
      importe: data.importe
    }));
  }, [deduccionesSeleccionadas]);

  // Sincronizar deducciones con el padre (sin incluir onDeduccionesChange en deps para evitar loop)
  React.useEffect(() => {
    if (onDeduccionesChange) {
      onDeduccionesChange(deduccionesArray);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deduccionesArray]);

  // Manejar selección de deducciones
  const handleToggleDeduccion = (deduccionId: string, deduccion: any) => {
    if (isReadOnly || esContratista) return;
    
    const nuevasSeleccionadas = { ...deduccionesSeleccionadas };
    if (nuevasSeleccionadas[deduccionId]) {
      delete nuevasSeleccionadas[deduccionId];
    } else {
      nuevasSeleccionadas[deduccionId] = {
        cantidad: 1,
        importe: deduccion.monto * -1 // Negativo porque es deducción
      };
    }
    setDeduccionesSeleccionadas(nuevasSeleccionadas);
  };

  const handleCantidadDeduccionChange = (deduccionId: string, cantidad: number, montoUnitario: number) => {
    if (isReadOnly || esContratista) return;
    
    const nuevasSeleccionadas = { ...deduccionesSeleccionadas };
    if (nuevasSeleccionadas[deduccionId]) {
      nuevasSeleccionadas[deduccionId] = {
        cantidad,
        importe: (montoUnitario * cantidad) * -1 // Negativo porque es deducción
      };
      setDeduccionesSeleccionadas(nuevasSeleccionadas);
    }
  };

  // Calcular totales (incluyendo deducciones)
  const totales = useMemo(() => {
    const totalConceptos = conceptosSeleccionados.reduce((acc, c) => acc + c.importe, 0);
    const totalDeducciones = Object.values(deduccionesSeleccionadas).reduce((acc, d) => acc + d.importe, 0);
    return {
      importe: totalConceptos + totalDeducciones // totalDeducciones ya es negativo
    };
  }, [conceptosSeleccionados, deduccionesSeleccionadas]);

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
      <div className="border-2 border-gray-300 rounded-xl shadow-lg" style={{ width: '100%', overflowX: 'auto', display: 'block' }}>
        <table className="divide-y divide-gray-200" style={{ minWidth: '2000px', width: 'auto', display: 'table' }}>
          <thead className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700">
            <tr>
              <th className="px-3 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-slate-500"></th>
              <th className="px-3 py-4 text-center text-xs font-bold text-white uppercase tracking-wider border-r border-slate-500">
                <Tooltip title="Conceptos con aditivas/deductivas aplicadas">
                  <span>Estado</span>
                </Tooltip>
              </th>
              <th className="px-3 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-slate-500">Partida</th>
              <th className="px-3 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-slate-500">Subpartida</th>
              <th className="px-3 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-slate-500">Actividad</th>
              <th className="px-3 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-slate-500">Clave</th>
              <th className="px-3 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-slate-500">Concepto</th>
              <th className="px-3 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-slate-500" style={{ minWidth: '80px' }}>Unidad</th>
              <th className="px-3 py-4 text-right text-xs font-bold text-white uppercase tracking-wider border-r border-slate-500" style={{ minWidth: '130px' }}>
                <Tooltip title="Cantidad después de aplicar aditivas/deductivas">
                  <span>Cant. Actualizada</span>
                </Tooltip>
              </th>
              <th className="px-3 py-4 text-right text-xs font-bold text-white uppercase tracking-wider border-r border-slate-500" style={{ minWidth: '130px' }}>Disponible</th>
              <th className="px-3 py-4 text-right text-xs font-bold text-white uppercase tracking-wider border-r border-slate-500" style={{ minWidth: '130px' }}>Precio Unit.</th>
              <th className="px-3 py-4 text-right text-xs font-bold text-white uppercase tracking-wider border-r border-slate-500" style={{ minWidth: '150px' }}>Cant. a Pagar</th>
              <th className="px-3 py-4 text-right text-xs font-bold text-white uppercase tracking-wider" style={{ minWidth: '130px' }}>Importe</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {todosLosConceptos.map((item: any, index: number) => {
              const esDeduccion = item.tipo === 'DEDUCCION';
              
              // Para deducciones, usar el estado de deduccionesSeleccionadas
              const deduccionSeleccionada = esDeduccion ? deduccionesSeleccionadas[item.id] : null;
              
              // Para conceptos normales, usar conceptosMap
              const conceptoReq = esDeduccion ? null : conceptosMap.get(item.id);
              
              const isSelected = esDeduccion ? !!deduccionSeleccionada : !!conceptoReq;
              const cantidadPagar = esDeduccion 
                ? (deduccionSeleccionada?.cantidad || 0)
                : (conceptoReq?.cantidad_esta_requisicion || 0);
              const importe = esDeduccion 
                ? (deduccionSeleccionada?.importe || 0)
                : (conceptoReq?.importe || 0);
              
              const pagadaAnterior = item.cantidad_pagada_anterior || 0;
              const maxRemaining = esDeduccion ? 999 : Math.max(0, item.cantidad_catalogo - pagadaAnterior);
              const yaRequisitado = !esDeduccion && pagadaAnterior > 0;

              const baseColor = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';
              let rowClass = baseColor;
              if (esDeduccion && isSelected) {
                rowClass = 'bg-red-50 border-l-4 border-l-red-600';
              } else if (esDeduccion) {
                rowClass = index % 2 === 0 ? 'bg-red-50/30' : 'bg-red-50/50';
              } else if (isSelected) {
                rowClass = 'bg-blue-50 border-l-4 border-l-blue-600';
              } else if (yaRequisitado) {
                rowClass = 'bg-amber-50 border-l-4 border-l-amber-500';
              }
              
              return (
                <tr
                  key={item.id_unico}
                  className={`${rowClass} hover:${esDeduccion ? 'bg-red-100' : 'bg-blue-100'} hover:shadow-md transition-all duration-200`}
                >
                  <td className="px-3 py-3 border-r border-gray-200">
                    <input
                      type="checkbox"
                      className={`w-5 h-5 rounded border-gray-400 ${esDeduccion ? 'text-red-600 focus:ring-red-500' : 'text-blue-600 focus:ring-blue-500'} cursor-pointer`}
                      disabled={isReadOnly || (!esDeduccion && maxRemaining <= 0) || (esDeduccion && esContratista)}
                      checked={isSelected}
                      onChange={() => handleToggleConcepto(item)}
                    />
                  </td>
                  <td className="px-3 py-3 text-center border-r border-gray-200">
                    {esDeduccion ? (
                      <Chip 
                        label="Deducción" 
                        size="small" 
                        sx={{ 
                          bgcolor: 'error.main', 
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          boxShadow: 1
                        }} 
                      />
                    ) : (item as any).tiene_cambios ? (
                      <Tooltip title={`Cantidad modificada: Original ${(item as any).cantidad_catalogo_original?.toLocaleString('es-MX', { minimumFractionDigits: 2 })} → Actual ${item.cantidad_catalogo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}>
                        <Chip 
                          label="Modificado" 
                          size="small" 
                          sx={{ 
                            bgcolor: 'primary.main', 
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            boxShadow: 1
                          }} 
                        />
                      </Tooltip>
                    ) : (
                      <Chip 
                        label="Original" 
                        size="small" 
                        variant="outlined"
                        sx={{ 
                          borderColor: 'success.main',
                          color: 'success.dark',
                          fontSize: '0.7rem',
                          fontWeight: 600
                        }}
                      />
                    )}
                  </td>
                  <td className={`px-3 py-3 text-sm font-medium border-r border-gray-200 ${esDeduccion ? 'text-red-700' : 'text-gray-800'}`}>{item.partida}</td>
                  <td className={`px-3 py-3 text-sm border-r border-gray-200 ${esDeduccion ? 'text-red-600' : 'text-gray-700'}`}>{item.subpartida}</td>
                  <td className={`px-3 py-3 text-sm border-r border-gray-200 ${esDeduccion ? 'text-red-600' : 'text-gray-700'}`}>{item.actividad}</td>
                  <td className={`px-3 py-3 text-sm font-bold border-r border-gray-200 ${esDeduccion ? 'text-red-700' : 'text-blue-700'}`}>
                    {item.clave}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-800 border-r border-gray-200" style={{ maxWidth: '450px' }}>
                    <Tooltip title={item.concepto} arrow placement="top" enterDelay={300}>
                      <div style={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        cursor: 'help',
                        fontWeight: 500
                      }}>
                        {item.concepto}
                      </div>
                    </Tooltip>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700 font-medium text-center border-r border-gray-200">
                    {item.unidad}
                  </td>
                  <td className={`px-3 py-3 text-sm text-right font-mono border-r border-gray-200 ${esDeduccion ? 'bg-red-50/30' : 'bg-slate-50/50'}`} style={{ minWidth: '120px' }}>
                    {(item as any).tiene_cambios ? (
                      <Tooltip title={`Original: ${(item as any).cantidad_catalogo_original?.toLocaleString('es-MX', { minimumFractionDigits: 2 })} → Modificado: ${item.cantidad_catalogo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}>
                        <div>
                          <div className="text-blue-700 font-extrabold">
                            {item.cantidad_catalogo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </Tooltip>
                    ) : (
                      <div className={`${esDeduccion ? 'text-red-700' : 'text-gray-900'} font-semibold`}>
                        {item.cantidad_catalogo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </div>
                    )}
                  </td>
                  <td className={`px-3 py-3 text-sm text-right font-mono border-r border-gray-200 ${esDeduccion ? 'bg-red-50/30' : 'bg-green-50/30'}`} style={{ minWidth: '120px' }}>
                    {esDeduccion ? (
                      <div className="text-gray-500 font-semibold">N/A</div>
                    ) : (
                      <Tooltip title={yaRequisitado ? `Requisitado anterior: ${pagadaAnterior.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'Sin requisiciones previas'}>
                        <div className={`inline-block ${
                          maxRemaining === 0 ? 'text-red-700 font-extrabold bg-red-100 px-2 py-1 rounded' : 
                          yaRequisitado ? 'text-amber-700 font-bold' : 
                          'text-green-700 font-semibold'
                        }`}>
                          {maxRemaining.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          {maxRemaining === 0 && <span className="ml-1 text-xs">(Agotado)</span>}
                        </div>
                      </Tooltip>
                    )}
                  </td>
                  <td className={`px-3 py-3 text-sm text-right font-mono font-semibold border-r border-gray-200 ${esDeduccion ? 'text-red-700' : 'text-gray-900'}`} style={{ minWidth: '130px' }}>
                    {esDeduccion ? '-' : ''}${Math.abs(item.precio_unitario_catalogo).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-3 text-right border-r border-gray-200" style={{ minWidth: '150px' }}>
                    {isSelected ? (
                      esDeduccion ? (
                        // Para deducciones: TextField simple o texto si es contratista
                        esContratista ? (
                          <span className="text-sm text-red-700 font-semibold">{cantidadPagar}</span>
                        ) : (
                          <TextField
                            type="number"
                            value={cantidadPagar}
                            onChange={(e) => handleCantidadDeduccionChange(item.id, parseFloat(e.target.value) || 0, item.montoOriginal)}
                            size="small"
                            disabled={isReadOnly}
                            inputProps={{ min: 0, step: 1 }}
                            sx={{ 
                              width: '100px',
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: 'white',
                                '&:hover': {
                                  backgroundColor: '#fef2f2'
                                }
                              },
                              '& input': {
                                textAlign: 'right',
                                fontFamily: 'ui-monospace, SFMono-Regular'
                              }
                            }}
                          />
                        )
                      ) : (
                        // Para conceptos normales: lógica existente
                        (() => {
                          const enteredStr =
                            cantidadesInput[item.id] !== undefined
                              ? cantidadesInput[item.id]
                              : (cantidadPagar ? String(cantidadPagar) : '');
                          const normalizedForError = enteredStr.replace(',', '.');
                          const parsedForError = normalizedForError === '' ? 0 : parseFloat(normalizedForError);
                          const exceeds = parsedForError > maxRemaining;
                          return (
                            <Tooltip
                              placement="top"
                              title={
                                <Stack spacing={0.5}>
                                  <Typography variant="caption">Catálogo: {item.cantidad_catalogo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
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
                                  setCantidadesInput(prev => ({ ...prev, [item.id]: entered }));

                                  const normalized = entered.replace(',', '.');
                                  const cantidad = normalized === '' || normalized === '.' ? NaN : parseFloat(normalized);
                                  if (Number.isNaN(cantidad)) return; // esperar a que sea número válido (ej. '.5')

                                  let cantidadAplicar = cantidad;
                                  let displayValue = entered;
                                  if (cantidad > maxRemaining) {
                                    cantidadAplicar = maxRemaining;
                                    const sep = entered.includes(',') ? ',' : '.';
                                    displayValue = String(maxRemaining).replace('.', sep);
                                    setCantidadesInput(prev => ({ ...prev, [item.id]: displayValue }));
                                  }

                                  const nuevos = conceptosSeleccionados.map(c => {
                                    if (c.concepto_contrato_id === item.id) {
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
                                  const current = cantidadesInput[item.id] ?? '';
                                  if (current.startsWith('.') || current.startsWith(',')) {
                                    const fixed = '0' + current;
                                    setCantidadesInput(prev => ({ ...prev, [item.id]: fixed }));
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
                      )
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className={`px-3 py-3 text-sm text-right font-mono ${esDeduccion ? 'bg-red-50/40' : 'bg-blue-50/40'}`} style={{ minWidth: '130px' }}>
                    {isSelected ? (
                      <span className={`font-bold ${esDeduccion ? 'text-red-700' : 'text-blue-700'}`}>
                        {esDeduccion && '-'}${Math.abs(importe).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {(conceptosSeleccionados.length > 0 || Object.keys(deduccionesSeleccionadas).length > 0) && (
            <tfoot className="bg-gradient-to-r from-slate-100 to-slate-200 border-t-4 border-slate-400">
              {conceptosSeleccionados.length > 0 && (
                <tr>
                  <td colSpan={12} className="px-3 py-3 text-right text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Subtotal Conceptos:
                  </td>
                  <td className="px-3 py-3 text-right text-base font-bold text-gray-900">
                    ${conceptosSeleccionados.reduce((acc, c) => acc + c.importe, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )}
              {Object.keys(deduccionesSeleccionadas).length > 0 && (
                <tr>
                  <td colSpan={12} className="px-3 py-3 text-right text-sm font-semibold text-red-700 uppercase tracking-wide">
                    Deducciones:
                  </td>
                  <td className="px-3 py-3 text-right text-base font-bold text-red-700">
                    -${Math.abs(Object.values(deduccionesSeleccionadas).reduce((acc, d) => acc + d.importe, 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-slate-500">
                <td colSpan={12} className="px-3 py-4 text-right text-base font-bold text-gray-900 uppercase tracking-wide">
                  Total Neto:
                </td>
                <td className="px-3 py-4 text-right text-lg font-extrabold text-blue-700 bg-blue-50">
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
          <div className="overflow-x-auto border-2 border-blue-300 rounded-xl shadow-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600">
                <tr>
                  <th className="px-3 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-blue-400">Folio</th>
                  <th className="px-3 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-blue-400">Clave</th>
                  <th className="px-3 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-blue-400">Concepto</th>
                  <th className="px-3 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-blue-400">Unidad</th>
                  <th className="px-3 py-4 text-right text-xs font-bold text-white uppercase tracking-wider border-r border-blue-400">Cantidad</th>
                  <th className="px-3 py-4 text-right text-xs font-bold text-white uppercase tracking-wider border-r border-blue-400">P.U.</th>
                  <th className="px-3 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">Importe</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {conceptosExtras.map((extra, index) => (
                  <tr key={extra.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'} hover:bg-blue-100 hover:shadow-md transition-all duration-200`}>
                    <td className="px-3 py-3 text-sm text-blue-700 font-bold border-r border-gray-200">{extra.cambio_numero}</td>
                    <td className="px-3 py-3 text-sm text-blue-700 font-bold border-r border-gray-200">{extra.clave}</td>
                    <td className="px-3 py-3 text-sm text-gray-800 border-r border-gray-200" style={{ maxWidth: '450px' }}>
                      <Tooltip title={extra.concepto} arrow placement="top" enterDelay={300}>
                        <div style={{ 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          cursor: 'help',
                          fontWeight: 500
                        }}>
                          {extra.concepto}
                        </div>
                      </Tooltip>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 font-medium text-center border-r border-gray-200">{extra.unidad}</td>
                    <td className="px-3 py-3 text-sm text-right font-mono font-semibold border-r border-gray-200">{extra.cantidad.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-3 text-sm text-right font-mono font-semibold border-r border-gray-200">${extra.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-3 text-sm text-right font-mono font-bold text-blue-700 bg-blue-50/40">${extra.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
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
    </div>
  );
};
