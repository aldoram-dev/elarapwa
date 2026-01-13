import React, { useMemo, useState } from 'react';
import { ConceptoContrato } from '@/types/concepto-contrato';
import { RequisicionConcepto } from '@/types/requisicion-pago';
import { TextField, Tooltip, Stack, Typography, Box, FormControlLabel, Switch, Autocomplete, Chip, Button } from '@mui/material';
import { db } from '@/db/database';

interface RequisicionConceptosSelectorProps {
  conceptosContrato: ConceptoContrato[];
  conceptosSeleccionados: RequisicionConcepto[];
  onConceptosChange: (conceptos: RequisicionConcepto[]) => void;
  contratoId?: string;
  requisicionId?: string; // 🆕 ID de la requisición actual (para excluir al bloquear deducciones)
  readonly?: boolean;
  readOnly?: boolean;
  esContratista?: boolean;
  onDeduccionesChange?: (deducciones: Array<{ id: string; cantidad: number; importe: number }>) => void;
  deduccionesIniciales?: Array<{ id: string; cantidad: number; importe: number }>;
  onRetencionesChange?: (retenciones: { aplicadas: number; regresadas: number; volumen?: number; retencionSeleccionada: any | null }) => void;
  retencionesIniciales?: { aplicadas: number; regresadas: number };
  porcentajeAmortizacion?: number; // 🆕 % de amortización del anticipo (ej: 30 para 30%)
  porcentajeRetencion?: number; // 🆕 % de retención/fondo de garantía (ej: 10 para 10%)
}

export const RequisicionConceptosSelector: React.FC<RequisicionConceptosSelectorProps> = ({
  conceptosContrato,
  conceptosSeleccionados,
  onConceptosChange,
  contratoId,
  requisicionId,
  readonly = false,
  readOnly = false,
  esContratista = false,
  onDeduccionesChange,
  deduccionesIniciales,
  onRetencionesChange,
  retencionesIniciales,
  porcentajeAmortizacion = 0, // 🆕 % de amortización (ej: 30 para 30%)
  porcentajeRetencion = 0 // 🆕 % de retención (ej: 10 para 10%)
}) => {
  const isReadOnly = readonly || readOnly;
  const [cantidadesInput, setCantidadesInput] = useState<Record<string, string>>({});
  const [cantidadesCache, setCantidadesCache] = useState<Record<string, number>>({}); // 🆕 Cache para restaurar cantidades
  const [deduccionesSeleccionadas, setDeduccionesSeleccionadas] = useState<Record<string, { cantidad: number; importe: number }>>({});
  const [deduccionesInicializadas, setDeduccionesInicializadas] = useState(false);
  const [retencionSeleccionada, setRetencionSeleccionada] = useState<any | null>(null);
  const [retencionesInicializadas, setRetencionesInicializadas] = useState(false);
  const [montoRetencionInput, setMontoRetencionInput] = useState<string>(''); // 🆕 Monto ingresado por el usuario
  const [tipoRetencion, setTipoRetencion] = useState<'APLICAR' | 'REGRESAR'>('APLICAR'); // 🆕 Tipo de operación
  
  // Estados de filtros
  const [filtroPartida, setFiltroPartida] = useState<string | null>(null);
  const [filtroSubpartida, setFiltroSubpartida] = useState<string | null>(null);
  const [filtroBusqueda, setFiltroBusqueda] = useState<string>('');
  const [soloCompletos, setSoloCompletos] = useState<boolean>(false);
  const [soloPendientes, setSoloPendientes] = useState<boolean>(false);
  const [soloModificados, setSoloModificados] = useState<boolean>(false);
  const [soloOriginales, setSoloOriginales] = useState<boolean>(false);
  const [mostrarExtras, setMostrarExtras] = useState<boolean>(true);
  
  // Estados para extras, deducciones y retenciones
  const [conceptosExtras, setConceptosExtras] = useState<any[]>([]);
  const [deduccionesExtra, setDeduccionesExtra] = useState<any[]>([]);
  const [deduccionesYaUtilizadas, setDeduccionesYaUtilizadas] = useState<Set<string>>(new Set());
  const [retencionesDisponibles, setRetencionesDisponibles] = useState<any[]>([]);
  
  // 🆕 Estados para el concepto virtual de anticipo
  const [conceptoAnticipo, setConceptoAnticipo] = useState<any | null>(null);
  const [contrato, setContrato] = useState<any | null>(null);

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

  // Sincronizar retenciones iniciales SOLO una vez al cargar
  React.useEffect(() => {
    if (retencionesIniciales && !retencionesInicializadas && retencionesDisponibles.length > 0) {
      // Si hay retención aplicada o regresada, seleccionar la retención correspondiente
      if ((retencionesIniciales.aplicadas > 0 || retencionesIniciales.regresadas > 0) && retencionesDisponibles.length > 0) {
        // Buscar la retención específica (normalmente será la primera, pero por seguridad buscamos)
        const retencionInicial = retencionesDisponibles[0];
        setRetencionSeleccionada(retencionInicial);
        
        // Determinar el tipo y monto
        if (retencionesIniciales.regresadas > 0) {
          setTipoRetencion('REGRESAR');
          setMontoRetencionInput(String(retencionesIniciales.regresadas));
        } else {
          setTipoRetencion('APLICAR');
          setMontoRetencionInput(String(retencionesIniciales.aplicadas));
        }
        
        console.log('🔄 Retención restaurada:', {
          aplicadas: retencionesIniciales.aplicadas,
          regresadas: retencionesIniciales.regresadas,
          tipo: retencionesIniciales.regresadas > 0 ? 'REGRESAR' : 'APLICAR'
        });
      }
      setRetencionesInicializadas(true);
    }
  }, [retencionesIniciales, retencionesInicializadas, retencionesDisponibles]);

  const conceptosMap = useMemo(() => {
    const map = new Map<string, RequisicionConcepto>();
    conceptosSeleccionados.forEach(c => map.set(c.concepto_contrato_id, c));
    return map;
  }, [conceptosSeleccionados]);

  // 🆕 Función para cargar el contrato y calcular el concepto virtual de anticipo
  const loadConceptoAnticipo = React.useCallback(async () => {
    if (!contratoId) {
      setConceptoAnticipo(null);
      setContrato(null);
      return;
    }

    try {
      console.log('💰 Cargando información de anticipo para contrato:', contratoId);
      
      // Cargar el contrato
      const contratoData = await db.contratos.get(contratoId);
      if (!contratoData) {
        console.warn('⚠️ Contrato no encontrado:', contratoId);
        setConceptoAnticipo(null);
        setContrato(null);
        return;
      }
      
      setContrato(contratoData);
      
      // Verificar si el contrato tiene anticipo
      const anticipoMonto = contratoData.anticipo_monto || 0;
      if (anticipoMonto <= 0) {
        console.log('ℹ️ Contrato sin anticipo');
        setConceptoAnticipo(null);
        return;
      }

      // Calcular cuánto anticipo ya se ha requisitado en OTRAS requisiciones
      const requisiciones = await db.requisiciones_pago
        .where('contrato_id')
        .equals(contratoId)
        .toArray();
      
      let anticipoYaRequisitado = 0;
      requisiciones.forEach(req => {
        // ✅ Excluir la requisición actual para permitir re-edición
        if (req.id === requisicionId) return;
        
        req.conceptos?.forEach(concepto => {
          if (concepto.tipo === 'ANTICIPO' || concepto.es_anticipo) {
            anticipoYaRequisitado += concepto.importe;
          }
        });
      });

      const anticipoDisponible = anticipoMonto - anticipoYaRequisitado;
      
      console.log('💰 Cálculo de anticipo:', {
        anticipoMonto,
        anticipoYaRequisitado,
        anticipoDisponible,
        requisicionActual: requisicionId
      });

      // Si ya no hay anticipo disponible, no mostrar el concepto
      if (anticipoDisponible <= 0) {
        console.log('✅ Anticipo completamente requisitado');
        setConceptoAnticipo(null);
        return;
      }

      // Crear el concepto virtual de anticipo
      const conceptoVirtual = {
        id: 'ANTICIPO-VIRTUAL',
        id_unico: 'anticipo_virtual',
        tipo: 'ANTICIPO',
        clave: 'ANTICIPO',
        concepto: '💰 ANTICIPO DEL CONTRATO',
        unidad: 'LS',
        cantidad_catalogo: 1,
        precio_unitario_catalogo: anticipoDisponible,
        cantidad_pagada_anterior: 0,
        partida: 'ANTICIPO',
        subpartida: 'CONTRATO',
        actividad: '-',
        tiene_cambios: false,
        esAnticipo: true,
        anticipoMonto,
        anticipoYaRequisitado,
        anticipoDisponible
      };

      setConceptoAnticipo(conceptoVirtual);
      console.log('✅ Concepto de anticipo creado:', conceptoVirtual);
    } catch (error) {
      console.error('❌ Error cargando concepto de anticipo:', error);
      setConceptoAnticipo(null);
    }
  }, [contratoId, requisicionId]);

  // Cargar concepto de anticipo cuando cambie el contrato
  React.useEffect(() => {
    if (contratoId) {
      loadConceptoAnticipo();
    }
  }, [contratoId, requisicionId, loadConceptoAnticipo]);

  // Función para cargar extras y deducciones
  const loadExtrasYDeducciones = React.useCallback(async () => {
    if (!contratoId) return;

    try {
      console.log('🔵 Cargando extras y deducciones para contrato:', contratoId);
      
      // Cargar deducciones ya utilizadas en OTRAS requisiciones (excluyendo la actual)
      const requisiciones = await db.requisiciones_pago
        .where('contrato_id')
        .equals(contratoId)
        .toArray();
      
      const deduccionesUsadas = new Set<string>();
      requisiciones.forEach(req => {
        // ✅ Excluir la requisición actual para permitir re-edición
        if (req.id === requisicionId) return;
        
        req.conceptos?.forEach(concepto => {
          if (concepto.tipo === 'DEDUCCION') {
            deduccionesUsadas.add(concepto.concepto_contrato_id);
          }
        });
      });
      
      console.log('🔒 Deducciones bloqueadas (solo otras requisiciones):', Array.from(deduccionesUsadas), 'Requisición actual excluida:', requisicionId);
      setDeduccionesYaUtilizadas(deduccionesUsadas);
      
      // Cargar cambios tipo EXTRA aplicados o aprobados
      const cambiosExtras = await db.cambios_contrato
        .where('contrato_id')
        .equals(contratoId)
        .and(c => c.active === true && (c.estatus === 'APLICADO' || c.estatus === 'APROBADO') && c.tipo_cambio === 'EXTRA')
        .toArray();
      
      console.log('🔵 Cambios EXTRA encontrados:', cambiosExtras.length, cambiosExtras.map(c => ({
        id: c.id,
        numero: c.numero_cambio,
        descripcion: c.descripcion,
        monto: c.monto_cambio,
        estatus: c.estatus,
        tipo: c.tipo_cambio,
        fecha: c.fecha_cambio
      })));

      const extras: any[] = [];
      for (const cambio of cambiosExtras) {
        const detalles = await db.detalles_extra
          .where('cambio_contrato_id')
          .equals(cambio.id)
          .and(d => d.active !== false)
          .toArray();
        
        console.log(`📦 Detalles extra para ${cambio.numero_cambio} (${cambio.id}):`, {
          total: detalles.length,
          detalles: detalles.map(d => ({
            id: d.id,
            clave: d.concepto_clave,
            concepto: d.concepto_descripcion.substring(0, 50) + '...',
            cantidad: d.cantidad,
            pu: d.precio_unitario,
            importe: d.importe,
            active: d.active
          }))
        });
        
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
      console.log('✅ Total conceptos extras agregados:', extras.length, extras.slice(0, 3).map(e => ({
        clave: e.clave,
        concepto: e.concepto.substring(0, 40),
        cantidad: e.cantidad,
        importe: e.importe
      })));
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
          // Agregar TODAS las deducciones, marcando si ya están utilizadas
          deducciones.push({
            id: detalle.id,
            cambio_numero: cambio.numero_cambio,
            descripcion: detalle.descripcion,
            monto: detalle.monto,
            tipo: 'DEDUCCION_EXTRA',
            yaUtilizada: deduccionesUsadas.has(detalle.id) // 🔒 Bandera para deshabilitar
          });
        });
      }
      console.log('✅ Total deducciones extra:', deducciones.length, '(utilizadas:', deduccionesUsadas.size, ')');
      setDeduccionesExtra(deducciones);

      // Cargar retenciones disponibles (solo las aprobadas con monto disponible > 0)
      const cambiosRetenciones = await db.cambios_contrato
        .where('contrato_id')
        .equals(contratoId)
        .and(c => c.active === true && c.estatus === 'APLICADO' && c.tipo_cambio === 'RETENCION')
        .toArray();

      console.log('🔵 Cambios RETENCION encontrados:', cambiosRetenciones.length);

      // Obtener todas las solicitudes del contrato
      // Nota: solicitudes_pago no tiene contrato_id indexado, necesitamos filtrar via requisiciones
      const requisicionesDelContrato = await db.requisiciones_pago
        .where('contrato_id')
        .equals(contratoId)
        .toArray();
      
      const requisicionIds = new Set(requisicionesDelContrato.map(r => r.id));
      
      const todasSolicitudes = await db.solicitudes_pago
        .toArray()
        .then(sols => sols.filter(s => requisicionIds.has(s.requisicion_id)));
      
      console.log(`📋 Solicitudes del contrato encontradas: ${todasSolicitudes.length}`);
      
      // Crear Map de retenciones en solicitudes con su modo (APLICAR/REGRESAR)
      // Map<retencion_id, modo_retencion[]>
      const retencionesEnSolicitudes = new Map<string, string[]>();
      todasSolicitudes.forEach(sol => {
        sol.conceptos_detalle?.forEach(concepto => {
          if (concepto.concepto_clave?.startsWith('RET-')) {
            const modos = retencionesEnSolicitudes.get(concepto.concepto_id) || [];
            // El modo puede venir en el concepto o inferirse del importe
            const modo = (concepto as any).modo_retencion || 
                         (concepto.importe < 0 ? 'APLICAR' : 'REGRESAR');
            modos.push(modo);
            retencionesEnSolicitudes.set(concepto.concepto_id, modos);
          }
        });
      });
      
      console.log('🔒 Retenciones en solicitudes:', 
        Array.from(retencionesEnSolicitudes.entries()).map(([id, modos]) => ({
          id, 
          modos,
          aplicada: modos.includes('APLICAR'),
          regresada: modos.includes('REGRESAR')
        }))
      );

      const retenciones: any[] = [];
      for (const cambio of cambiosRetenciones) {
        const detalles = await db.retenciones_contrato
          .where('cambio_contrato_id')
          .equals(cambio.id)
          .and(r => r.active !== false)
          .toArray();
        
        console.log(`🔍 Retención ${cambio.numero_cambio} cargada de BD:`, detalles.map(d => ({
          id: d.id,
          descripcion: d.descripcion,
          monto_total: d.monto,
          monto_aplicado: d.monto_aplicado,
          monto_regresado: d.monto_regresado,
          monto_disponible: d.monto_disponible
        })));
        
        detalles.forEach(detalle => {
          // Verificar en qué modos está en solicitudes
          const modosEnSolicitudes = retencionesEnSolicitudes.get(detalle.id) || [];
          const yaAplicadaEnSolicitud = modosEnSolicitudes.includes('APLICAR');
          const yaRegresadaEnSolicitud = modosEnSolicitudes.includes('REGRESAR');
          
          console.log(`📊 Validación retención ${detalle.descripcion}:`, {
            id: detalle.id,
            monto_disponible: detalle.monto_disponible,
            monto_aplicado: detalle.monto_aplicado,
            monto_regresado: detalle.monto_regresado,
            enSolicitudes: {
              aplicada: yaAplicadaEnSolicitud,
              regresada: yaRegresadaEnSolicitud
            }
          });
          
          // Lógica del ciclo de retención:
          // 1. Nueva → Puede APLICAR (restar)
          // 2. Aplicada en solicitud → Puede REGRESAR (devolver/sumar)
          // 3. Aplicada Y regresada en solicitudes → AGOTADA (ciclo completo)
          
          const puedeAplicar = detalle.monto_disponible > 0 && !yaAplicadaEnSolicitud;
          const puedeRegresar = (detalle.monto_aplicado || 0) > (detalle.monto_regresado || 0) && 
                                yaAplicadaEnSolicitud && !yaRegresadaEnSolicitud;
          
          // Está agotada si ya completó ambos pasos en solicitudes
          const estaAgotada = yaAplicadaEnSolicitud && yaRegresadaEnSolicitud;
          
          // Mostrar TODAS: las disponibles Y las agotadas (bloqueadas)
          retenciones.push({
            id: detalle.id,
            cambio_numero: cambio.numero_cambio,
            descripcion: detalle.descripcion,
            monto_total: detalle.monto,
            monto_aplicado: detalle.monto_aplicado,
            monto_regresado: detalle.monto_regresado,
            monto_disponible: detalle.monto_disponible,
            puede_aplicar: puedeAplicar,
            puede_regresar: puedeRegresar,
            esta_agotada: estaAgotada,
            tipo: 'RETENCION'
          });
        });
      }
      console.log('✅ Total retenciones disponibles:', retenciones.length);
      setRetencionesDisponibles(retenciones);
    } catch (error) {
      console.error('❌ Error cargando extras, deducciones y retenciones:', error);
    }
  }, [contratoId, esContratista]);

  // Cargar conceptos extraordinarios y deducciones extra
  React.useEffect(() => {
    if (contratoId) {
      loadExtrasYDeducciones();
    }
  }, [contratoId, requisicionId, loadExtrasYDeducciones]);

  // Obtener opciones únicas para filtros
  const partidasUnicas = useMemo(() => {
    const partidas = new Set(conceptosContrato.map(c => c.partida));
    return Array.from(partidas).sort();
  }, [conceptosContrato]);

  const subpartidasUnicas = useMemo(() => {
    // ✅ Permitir filtrar subpartidas independientemente de si hay partida seleccionada
    const subpartidas = new Set(conceptosContrato.map(c => c.subpartida));
    return Array.from(subpartidas).sort();
  }, [conceptosContrato]);

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

  // Combinar conceptos del catálogo con extras, deducciones y retenciones en una sola lista
  const todosLosConceptos = useMemo(() => {
    const items: any[] = [];
    
    // 🆕 Agregar concepto de anticipo al principio si está disponible
    if (conceptoAnticipo) {
      items.push(conceptoAnticipo);
    }
    
    // Agregar conceptos normales del catálogo
    conceptosFiltrados.forEach((concepto: any) => {
      items.push({
        ...concepto,
        tipo: 'CONCEPTO',
        id_unico: `concepto_${concepto.id}`
      });
    });
    
    // Agregar conceptos extraordinarios (convertidos a formato similar)
    conceptosExtras.forEach((extra) => {
      items.push({
        id: extra.id,
        id_unico: `extra_${extra.id}`,
        tipo: 'EXTRA',
        clave: extra.clave,
        concepto: extra.concepto,
        unidad: extra.unidad,
        cantidad_catalogo: extra.cantidad,
        precio_unitario_catalogo: extra.precio_unitario,
        cantidad_pagada_anterior: 0,
        partida: extra.cambio_numero,
        subpartida: 'EXTRAORDINARIO',
        actividad: '-',
        tiene_cambios: false,
        esExtra: true,
        cambio_numero: extra.cambio_numero
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
        montoOriginal: deduccion.monto,
        yaUtilizada: deduccion.yaUtilizada // 🔒 Pasar propiedad de bloqueo
      });
    });

    // Agregar retenciones disponibles (convertidas a formato similar)
    retencionesDisponibles.forEach((retencion) => {
      items.push({
        id: retencion.id,
        id_unico: `retencion_${retencion.id}`,
        tipo: 'RETENCION',
        clave: retencion.cambio_numero,
        concepto: retencion.descripcion,
        unidad: 'LS',
        cantidad_catalogo: 1,
        precio_unitario_catalogo: retencion.monto_disponible,
        cantidad_pagada_anterior: 0,
        partida: 'RETENCIONES',
        subpartida: 'CONTRATO',
        actividad: '-',
        tiene_cambios: false,
        esRetencion: true,
        // Ambas notaciones para compatibilidad
        montoTotal: retencion.monto_total,
        montoAplicado: retencion.monto_aplicado,
        montoRegresado: retencion.monto_regresado,
        montoDisponible: retencion.monto_disponible,
        monto_total: retencion.monto_total,
        monto_disponible: retencion.monto_disponible,
        monto_aplicado: retencion.monto_aplicado,
        monto_regresado: retencion.monto_regresado,
        puede_aplicar: retencion.puede_aplicar,
        puede_regresar: retencion.puede_regresar,
        esta_agotada: retencion.esta_agotada
      });
    });
    
    return items;
  }, [conceptosFiltrados, conceptosExtras, deduccionesExtra, retencionesDisponibles, conceptoAnticipo]);

  const handleToggleConcepto = (item: any) => {
    if (isReadOnly) return;
    
    // Si es contratista y es deducción o retención, no permitir
    if (esContratista && (item.tipo === 'DEDUCCION' || item.tipo === 'RETENCION')) return;

    // 🆕 Manejar concepto de anticipo
    if (item.tipo === 'ANTICIPO') {
      const conceptoReq = conceptosMap.get(item.id);
      
      if (conceptoReq) {
        // Deseleccionar anticipo
        const nuevosConceptos = conceptosSeleccionados.filter(c => c.concepto_contrato_id !== item.id);
        onConceptosChange(nuevosConceptos);
        console.log('💰 Anticipo deseleccionado');
      } else {
        // Seleccionar anticipo con su monto disponible
        const nuevoConcepto: RequisicionConcepto = {
          concepto_contrato_id: item.id,
          clave: item.clave,
          concepto: item.concepto,
          unidad: item.unidad,
          cantidad_catalogo: 1,
          cantidad_pagada_anterior: 0,
          cantidad_esta_requisicion: 1,
          precio_unitario: item.anticipoDisponible,
          importe: item.anticipoDisponible,
          tipo: 'ANTICIPO',
          es_anticipo: true
        };
        
        onConceptosChange([...conceptosSeleccionados, nuevoConcepto]);
        console.log('💰 Anticipo seleccionado:', nuevoConcepto);
      }
      return;
    }

    // Manejar deducciones
    if (item.tipo === 'DEDUCCION') {
      handleToggleDeduccion(item.id, { monto: item.montoOriginal });
      return;
    }

    // Manejar retenciones
    if (item.tipo === 'RETENCION') {
      console.log('Retención seleccionada:', item);
      
      // 🔒 Si está agotada, NO permitir selección
      if (item.esta_agotada) {
        console.log('⛔ Retención agotada, no se puede seleccionar');
        return;
      }
      
      // Toggle: si ya está seleccionada, deseleccionar
      if (retencionSeleccionada?.id === item.id) {
        setRetencionSeleccionada(null);
        setMontoRetencionInput('');
        if (onRetencionesChange) {
          onRetencionesChange({ aplicadas: 0, regresadas: 0, volumen: 0, retencionSeleccionada: null });
        }
      } else {
        // Seleccionar esta retención
        setRetencionSeleccionada(item);
        
        // Determinar automáticamente el tipo basado en estado:
        // - Si tiene monto_disponible > 0: APLICAR (restar/aplicar retención)
        // - Si tiene monto_aplicado > 0: REGRESAR (devolver/sumar retención)
        const puedeAplicar = item.monto_disponible > 0;
        const puedeRegresar = (item.monto_aplicado || 0) > 0;
        
        let tipo: 'APLICAR' | 'REGRESAR';
        if (puedeAplicar && !puedeRegresar) {
          tipo = 'APLICAR'; // Solo puede aplicar
        } else if (!puedeAplicar && puedeRegresar) {
          tipo = 'REGRESAR'; // Solo puede regresar
        } else if (puedeAplicar && puedeRegresar) {
          tipo = 'APLICAR'; // Ambos posibles, preferir aplicar
        } else {
          tipo = 'APLICAR'; // Default
        }
        
        setTipoRetencion(tipo);
        
        // 🆕 PONER VOLUMEN = 1 AUTOMÁTICAMENTE Y CALCULAR MONTO
        const volumenInicial = 1;
        setMontoRetencionInput(volumenInicial.toString());
        
        // Calcular precio unitario según el tipo (usar valor absoluto)
        const precioUnitario = tipo === 'APLICAR' 
          ? Math.abs(item.monto_disponible || 0)
          : Math.abs(item.monto_aplicado || 0);
        
        // Calcular monto: volumen × precio unitario
        const montoCalculado = volumenInicial * precioUnitario;
        
        console.log('📋 Estado de retención seleccionada:', {
          clave: item.clave,
          monto_total: item.montoTotal,
          disponible: item.monto_disponible,
          aplicado: item.monto_aplicado,
          regresado: item.monto_regresado,
          puedeAplicar,
          puedeRegresar,
          tipoSeleccionado: tipo,
          volumenInicial,
          precioUnitario,
          montoCalculado,
          accion: tipo === 'APLICAR' ? '➖ RESTARÁ del total' : '➕ SUMARÁ al total'
        });
        
        // Notificar al padre con el volumen y monto inicial
        if (onRetencionesChange) {
          if (tipo === 'APLICAR') {
            onRetencionesChange({ 
              aplicadas: montoCalculado, 
              regresadas: 0,
              volumen: volumenInicial,
              retencionSeleccionada: item 
            });
          } else {
            onRetencionesChange({ 
              aplicadas: 0, 
              regresadas: montoCalculado,
              volumen: volumenInicial, 
              retencionSeleccionada: item 
            });
          }
        }
      }
      return;
    }

    // Manejar conceptos normales
    const concepto = item;
    const existe = conceptosMap.has(concepto.id);
    
    // ✅ Si ya existe, guardar cantidad en cache y quitar de la lista
    if (existe) {
      const conceptoActual = conceptosMap.get(concepto.id);
      if (conceptoActual && conceptoActual.cantidad_esta_requisicion > 0) {
        // Guardar en cache para restaurar después
        setCantidadesCache(prev => ({
          ...prev,
          [concepto.id]: conceptoActual.cantidad_esta_requisicion
        }));
      }
      const nuevos = conceptosSeleccionados.filter(c => c.concepto_contrato_id !== concepto.id);
      onConceptosChange(nuevos);
    } else {
      // ✅ Agregar nuevo concepto - restaurar del cache si existe
      const cantidadRestaurada = cantidadesCache[concepto.id] || 0;
      const disponible = Math.max(0, concepto.cantidad_catalogo - (concepto.cantidad_pagada_anterior || 0));
      const cantidadInicial = cantidadRestaurada > 0 && cantidadRestaurada <= disponible ? cantidadRestaurada : 0;
      
      const nuevo: RequisicionConcepto = {
        concepto_contrato_id: concepto.id,
        clave: concepto.clave,
        concepto: concepto.concepto,
        unidad: concepto.unidad,
        cantidad_catalogo: concepto.cantidad_catalogo,
        cantidad_pagada_anterior: concepto.cantidad_pagada_anterior || 0,
        cantidad_esta_requisicion: cantidadInicial,
        precio_unitario: concepto.precio_unitario_catalogo,
        importe: cantidadInicial * concepto.precio_unitario_catalogo
      };
      
      // Si restauramos una cantidad, actualizar también el input visual
      if (cantidadInicial > 0) {
        setCantidadesInput(prev => ({
          ...prev,
          [concepto.id]: cantidadInicial.toString()
        }));
      }
      
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
    
    // 🔒 Prevenir selección de deducciones ya utilizadas
    if (deduccion.yaUtilizada) {
      console.log('⛔ Deducción ya utilizada en otra requisición:', deduccionId);
      return;
    }
    
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
    
    // Calcular el monto de la retención si está seleccionada
    let totalRetenciones = 0;
    if (retencionSeleccionada && montoRetencionInput) {
      const volumen = parseFloat(montoRetencionInput) || 0;
      const precioUnitario = tipoRetencion === 'APLICAR' 
        ? Math.abs(retencionSeleccionada.monto_disponible || 0)
        : Math.abs(retencionSeleccionada.monto_aplicado || 0);
      totalRetenciones = tipoRetencion === 'APLICAR' 
        ? -(volumen * precioUnitario)
        : (volumen * precioUnitario);
    }
    
    return {
      importe: totalConceptos + totalDeducciones + totalRetenciones
    };
  }, [conceptosSeleccionados, deduccionesSeleccionadas, retencionSeleccionada, montoRetencionInput, tipoRetencion]);

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
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant={!soloPendientes && !soloCompletos ? "contained" : "outlined"}
            size="small"
            onClick={() => {
              setSoloPendientes(false);
              setSoloCompletos(false);
            }}
            sx={{ textTransform: 'none', minWidth: 'auto' }}
          >
            Todos
          </Button>
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
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant={!soloModificados && !soloOriginales ? "contained" : "outlined"}
            size="small"
            onClick={() => {
              setSoloModificados(false);
              setSoloOriginales(false);
            }}
            sx={{ textTransform: 'none', minWidth: 'auto' }}
          >
            Todos
          </Button>
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
              <th className="px-3 py-4 text-right text-xs font-bold text-white uppercase tracking-wider border-r border-slate-500" style={{ minWidth: '130px' }}>Importe</th>
              <th className="px-3 py-4 text-right text-xs font-bold text-amber-300 uppercase tracking-wider border-r border-slate-500" style={{ minWidth: '110px' }}>
                <Tooltip title={`Amortización del anticipo (${porcentajeAmortizacion}% del importe)`}>
                  <span>Amort.</span>
                </Tooltip>
              </th>
              <th className="px-3 py-4 text-right text-xs font-bold text-red-300 uppercase tracking-wider" style={{ minWidth: '110px' }}>
                <Tooltip title={`Fondo de garantía (${porcentajeRetencion}% del importe)`}>
                  <span>Ret.</span>
                </Tooltip>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {todosLosConceptos.map((item: any, index: number) => {
              const esDeduccion = item.tipo === 'DEDUCCION';
              const esRetencion = item.tipo === 'RETENCION';
              const esAnticipo = item.tipo === 'ANTICIPO'; // 🆕 Detectar concepto de anticipo
              
              // Para deducciones, usar el estado de deduccionesSeleccionadas
              const deduccionSeleccionada = esDeduccion ? deduccionesSeleccionadas[item.id] : null;
              
              // Para retenciones, verificar si está seleccionada
              const retencionEstaSeleccionada = esRetencion && retencionSeleccionada?.id === item.id;
              
              // Para conceptos normales (incluye anticipo), usar conceptosMap
              const conceptoReq = (esDeduccion || esRetencion) ? null : conceptosMap.get(item.id);
              
              const isSelected = esRetencion ? retencionEstaSeleccionada : (esDeduccion ? !!deduccionSeleccionada : !!conceptoReq);
              const cantidadPagar = esDeduccion 
                ? (deduccionSeleccionada?.cantidad || 0)
                : esAnticipo 
                  ? 1 // 🆕 Anticipo siempre cantidad = 1
                  : (conceptoReq?.cantidad_esta_requisicion || 0);
              
              // Calcular importe según el tipo
              let importe = 0;
              if (esRetencion && retencionEstaSeleccionada) {
                // Para retenciones: calcular volumen × precio unitario con signo correcto
                const volumen = parseFloat(montoRetencionInput) || 0;
                const precioUnitario = tipoRetencion === 'APLICAR' 
                  ? Math.abs(item.monto_disponible || 0)
                  : Math.abs(item.monto_aplicado || 0);
                
                // El importe es negativo para APLICAR (resta) y positivo para REGRESAR (suma)
                importe = tipoRetencion === 'APLICAR' 
                  ? -(volumen * precioUnitario)
                  : (volumen * precioUnitario);
              } else if (esDeduccion) {
                importe = deduccionSeleccionada?.importe || 0;
              } else {
                importe = conceptoReq?.importe || 0;
              }
              
              const pagadaAnterior = item.cantidad_pagada_anterior || 0;
              const cantidadEstaReq = conceptoReq?.cantidad_esta_requisicion || 0;
              
              // ✅ maxRemaining = volumen disponible (catálogo ACTUALIZADO - pagado en OTRAS requisiciones)
              // IMPORTANTE: 
              // - Usar cantidad_catalogo que ya incluye aditivas/deductivas
              // - cantidad_pagada_anterior NO debe incluir la requisición actual
              const cantidadCatalogoActualizada = item.cantidad_catalogo; // Ya incluye aditivas/deductivas
              const maxRemaining = (esDeduccion || esRetencion || esAnticipo) ? 999 : Math.max(0, cantidadCatalogoActualizada - pagadaAnterior); // 🆕 Anticipo siempre disponible
              
              // 🐛 Log para debug de cantidades
              if (!esDeduccion && !esRetencion && isSelected) {
                console.log(`📊 Disponible para concepto ${item.clave}:`, {
                  cantidad_original: (item as any).cantidad_catalogo_original,
                  cantidad_actualizada: cantidadCatalogoActualizada,
                  pagada_anterior: pagadaAnterior,
                  maxRemaining,
                  tiene_cambios: (item as any).tiene_cambios
                });
              }
              
              const yaRequisitado = !esDeduccion && !esRetencion && pagadaAnterior > 0;
              
              // ✅ Solo bloquear conceptos que:
              // 1. NO están seleccionados en esta requisición (!isSelected)
              // 2. Y NO tienen volumen disponible (maxRemaining <= 0)
              // Si ya está seleccionado, NUNCA se bloquea (permite edición)
              const conceptoAgotado = !esDeduccion && !esRetencion && !isSelected && maxRemaining <= 0;

              const baseColor = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';
              const deduccionBloqueada = esDeduccion && (item as any).yaUtilizada;
              let rowClass = baseColor;
              if (deduccionBloqueada) {
                rowClass = 'bg-gray-100 border-l-4 border-l-gray-400 opacity-60'; // 🔒 Estilo bloqueado
              } else if (esAnticipo && isSelected) {
                // 🆕 Estilo especial para anticipo seleccionado
                rowClass = 'bg-green-50 border-l-4 border-l-green-600';
              } else if (esAnticipo) {
                // 🆕 Estilo especial para anticipo no seleccionado
                rowClass = 'bg-green-50/40 border-l-4 border-l-green-400';
              } else if (esRetencion && isSelected) {
                rowClass = 'bg-blue-50 border-l-4 border-l-blue-600';
              } else if (esRetencion) {
                rowClass = `${baseColor} border-l-4 border-l-blue-400`;
              } else if (esDeduccion && isSelected) {
                rowClass = 'bg-red-50 border-l-4 border-l-red-600';
              } else if (esDeduccion) {
                rowClass = index % 2 === 0 ? 'bg-red-50/30' : 'bg-red-50/50';
              } else if (isSelected) {
                rowClass = 'bg-blue-50 border-l-4 border-l-blue-600';
              } else if (yaRequisitado) {
                rowClass = 'bg-amber-50 border-l-4 border-l-amber-500';
              } else if (conceptoAgotado) {
                rowClass = 'bg-gray-100 border-l-4 border-l-gray-400 opacity-60'; // 🔒 Estilo agotado
              }
              
              return (
                <tr
                  key={item.id_unico}
                  className={`${rowClass} hover:${esRetencion ? 'bg-blue-100' : esDeduccion ? 'bg-red-100' : 'bg-blue-100'} hover:shadow-md transition-all duration-200`}
                >
                  <td className="px-3 py-3 border-r border-gray-200">
                    {esDeduccion && (item as any).yaUtilizada ? (
                      <Tooltip title="Esta deducción ya fue aplicada en otra requisición y no puede reutilizarse" arrow>
                        <span>
                          <input
                            type="checkbox"
                            className="w-5 h-5 rounded border-gray-400 text-gray-400 cursor-not-allowed opacity-40"
                            disabled={true}
                            checked={false}
                            onChange={() => {}}
                          />
                        </span>
                      </Tooltip>
                    ) : conceptoAgotado ? (
                      <Tooltip title={`Volumen agotado. Catálogo: ${item.cantidad_catalogo.toLocaleString('es-MX', {minimumFractionDigits: 2})}, Ya pagado: ${pagadaAnterior.toLocaleString('es-MX', {minimumFractionDigits: 2})}`} arrow>
                        <span>
                          <input
                            type="checkbox"
                            className="w-5 h-5 rounded border-gray-400 text-gray-400 cursor-not-allowed opacity-40"
                            disabled={true}
                            checked={false}
                            onChange={() => {}}
                          />
                        </span>
                      </Tooltip>
                    ) : (item as any).esta_agotada ? (
                      <Tooltip title="Retención agotada. Ya fue aplicada y regresada completamente." arrow>
                        <span>
                          <input
                            type="checkbox"
                            className="w-5 h-5 rounded border-gray-400 text-gray-400 cursor-not-allowed opacity-40"
                            disabled={true}
                            checked={false}
                            onChange={() => {}}
                          />
                        </span>
                      </Tooltip>
                    ) : (
                      <input
                        type="checkbox"
                        className={`w-5 h-5 rounded border-gray-400 ${esRetencion ? 'text-blue-600 focus:ring-blue-500' : esDeduccion ? 'text-red-600 focus:ring-red-500' : 'text-blue-600 focus:ring-blue-500'} cursor-pointer`}
                        disabled={isReadOnly || ((esDeduccion || esRetencion) && esContratista)}
                        checked={isSelected}
                        onChange={() => handleToggleConcepto(item)}
                      />
                    )}
                  </td>
                  <td className="px-3 py-3 text-center border-r border-gray-200">
                    {item.tipo === 'ANTICIPO' ? (
                      // 🆕 Chip especial para anticipo
                      <Chip 
                        label="💰 ANTICIPO" 
                        size="small" 
                        sx={{ 
                          bgcolor: 'success.main', 
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          boxShadow: 2
                        }} 
                      />
                    ) : item.tipo === 'EXTRA' ? (
                      <Chip 
                        label="Extraordinario" 
                        size="small" 
                        sx={{ 
                          bgcolor: 'warning.main', 
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          boxShadow: 1
                        }} 
                      />
                    ) : esRetencion ? (
                      (item as any).esta_agotada ? (
                        <Chip 
                          label="🔒 AGOTADA" 
                          size="small" 
                          sx={{ 
                            bgcolor: 'grey.400', 
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            boxShadow: 1
                          }} 
                        />
                      ) : (
                        <Chip 
                          label="Retención" 
                          size="small" 
                          sx={{ 
                            bgcolor: 'primary.main', 
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            boxShadow: 1
                          }} 
                        />
                      )
                    ) : esDeduccion ? (
                      (item as any).yaUtilizada ? (
                        <Tooltip title="Esta deducción ya fue aplicada en otra requisición" arrow>
                          <Chip 
                            label="Ya Utilizada" 
                            size="small" 
                            sx={{ 
                              bgcolor: 'grey.500', 
                              color: 'white',
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              boxShadow: 1
                            }} 
                          />
                        </Tooltip>
                      ) : (
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
                      )
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
                    <Tooltip 
                      title={
                        esRetencion ? (
                          <Box sx={{ p: 0.5 }}>
                            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.9rem' }}>
                              Retención {item.clave}
                            </div>
                            <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                              <div><strong>Total:</strong> ${((item as any).montoTotal || 0).toFixed(2)}</div>
                              <div><strong>Aplicado:</strong> ${((item as any).montoAplicado || 0).toFixed(2)}</div>
                              <div><strong>Regresado:</strong> ${((item as any).montoRegresado || 0).toFixed(2)}</div>
                              <div><strong>Disponible:</strong> ${((item as any).montoDisponible || 0).toFixed(2)}</div>
                              <div style={{ 
                                marginTop: 8, 
                                paddingTop: 8, 
                                borderTop: '1px solid rgba(255,255,255,0.3)',
                                fontWeight: 700,
                                color: (item as any).esta_agotada ? '#ef4444' : (item as any).puede_aplicar ? '#22c55e' : '#f59e0b'
                              }}>
                                Estado: {
                                  (item as any).esta_agotada 
                                    ? 'CICLO COMPLETO ❌' 
                                    : (item as any).puede_aplicar && (item as any).puede_regresar
                                      ? 'DISPONIBLE (Aplicar/Regresar) ✓'
                                      : (item as any).puede_aplicar
                                        ? 'DISPONIBLE (Aplicar) ✓'
                                        : 'DISPONIBLE (Regresar) ✓'
                                }
                              </div>
                            </div>
                          </Box>
                        ) : (
                          item.concepto
                        )
                      } 
                      arrow 
                      placement="top" 
                      enterDelay={300}
                    >
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
                  <td className={`px-3 py-3 text-sm text-right font-mono border-r border-gray-200 ${esRetencion ? 'bg-blue-50/30' : esDeduccion ? 'bg-red-50/30' : 'bg-green-50/30'}`} style={{ minWidth: '120px' }}>
                    {esRetencion ? (
                      (item as any).esta_agotada ? (
                        <Tooltip title={`Aplicado: $${((item as any).monto_aplicado || 0).toFixed(2)} | Regresado: $${((item as any).monto_regresado || 0).toFixed(2)}`}>
                          <div className="text-gray-700 font-extrabold bg-gray-200 px-2 py-1 rounded">
                            AGOTADA
                            <div className="text-xs mt-1">
                              {((item as any).monto_aplicado || 0).toFixed(2)} = {((item as any).monto_regresado || 0).toFixed(2)}
                            </div>
                          </div>
                        </Tooltip>
                      ) : (
                        <Tooltip title={
                          (item as any).puede_aplicar && (item as any).puede_regresar 
                            ? `Aplicar: ${((item as any).monto_disponible || 0).toFixed(2)} | Regresar: ${(((item as any).monto_aplicado || 0) - ((item as any).monto_regresado || 0)).toFixed(2)}`
                            : (item as any).puede_aplicar 
                              ? 'Disponible para aplicar'
                              : 'Disponible para regresar'
                        }>
                          <div className="space-y-1">
                            {(item as any).puede_aplicar && (
                              <div className="text-red-700 font-bold">
                                -{((item as any).monto_disponible || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </div>
                            )}
                            {(item as any).puede_regresar && (
                              <div className="text-green-700 font-bold">
                                +{(((item as any).monto_aplicado || 0) - ((item as any).monto_regresado || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </div>
                            )}
                          </div>
                        </Tooltip>
                      )
                    ) : esDeduccion ? (
                      (item as any).yaUtilizada ? (
                        <div className="text-gray-700 font-extrabold bg-gray-200 px-2 py-1 rounded">
                          0.00
                          <span className="ml-1 text-xs">(Utilizada)</span>
                        </div>
                      ) : (
                        <div className="text-gray-500 font-semibold">N/A</div>
                      )
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
                      esAnticipo ? (
                        // 🆕 Para anticipo: cantidad fija de 1, no editable
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Tooltip title="El anticipo siempre tiene cantidad = 1" arrow>
                            <span className="text-sm text-green-700 font-bold bg-green-50 px-3 py-2 rounded border-2 border-green-300">
                              1.00
                            </span>
                          </Tooltip>
                        </Box>
                      ) : esRetencion ? (
                        // Para retenciones: TextField para ingresar monto
                        esContratista ? (
                          <span className="text-sm text-blue-700 font-semibold">N/A</span>
                        ) : (
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <TextField
                              type="number"
                              value={montoRetencionInput}
                              onChange={(e) => {
                                const valor = e.target.value;
                                setMontoRetencionInput(valor);
                                const volumen = parseFloat(valor) || 0;
                                
                                // Calcular monto: Volumen × Precio Unitario
                                // Para APLICAR: usar monto_disponible
                                // Para REGRESAR: usar monto_total o monto_aplicado
                                const precioUnitario = tipoRetencion === 'APLICAR' 
                                  ? (item.montoDisponible || item.monto_disponible || 0)
                                  : (item.montoAplicado || item.monto_aplicado || item.montoTotal || item.monto_total || 0);
                                
                                const monto = volumen * precioUnitario;
                                
                                console.log('💰 Cambio en retención:', { 
                                  valor, 
                                  volumen,
                                  precioUnitario,
                                  monto, 
                                  tipo: tipoRetencion,
                                  calculo: `${volumen} × $${precioUnitario} = $${monto}`
                                });
                                
                                // Notificar al padre según el tipo de operación
                                if (onRetencionesChange) {
                                  if (tipoRetencion === 'APLICAR') {
                                    onRetencionesChange({ 
                                      aplicadas: monto, 
                                      regresadas: 0,
                                      volumen: volumen,
                                      retencionSeleccionada: item 
                                    });
                                  } else {
                                    onRetencionesChange({ 
                                      aplicadas: 0, 
                                      regresadas: monto,
                                      volumen: volumen, 
                                      retencionSeleccionada: item 
                                    });
                                  }
                                }
                              }}
                              size="small"
                              disabled={isReadOnly}
                              placeholder="Monto"
                              inputProps={{ 
                                step: 0.01 
                              }}
                              sx={{ 
                                width: '100px',
                                '& .MuiOutlinedInput-root': {
                                  backgroundColor: 'white',
                                  borderColor: tipoRetencion === 'APLICAR' ? 'error.main' : 'success.main',
                                  '&:hover': {
                                    backgroundColor: tipoRetencion === 'APLICAR' ? '#fee' : '#efe'
                                  }
                                },
                                '& input': {
                                  textAlign: 'right',
                                  fontFamily: 'ui-monospace, SFMono-Regular',
                                  color: tipoRetencion === 'APLICAR' ? 'error.main' : 'success.main',
                                  fontWeight: 600
                                }
                              }}
                            />
                            <Chip 
                              label={tipoRetencion === 'APLICAR' ? '-' : '+'} 
                              size="small"
                              color={tipoRetencion === 'APLICAR' ? 'error' : 'success'}
                              onClick={() => {
                                if (!isReadOnly && item.puede_aplicar && item.puede_regresar) {
                                  const nuevoTipo = tipoRetencion === 'APLICAR' ? 'REGRESAR' : 'APLICAR';
                                  setTipoRetencion(nuevoTipo);
                                  // Actualizar inmediatamente con el nuevo tipo
                                  const volumen = parseFloat(montoRetencionInput) || 0;
                                  const precioUnitario = nuevoTipo === 'APLICAR' 
                                    ? (item.montoDisponible || item.monto_disponible || 0)
                                    : (item.montoAplicado || item.monto_aplicado || item.montoTotal || item.monto_total || 0);
                                  const monto = volumen * precioUnitario;
                                  
                                  if (onRetencionesChange && volumen > 0) {
                                    onRetencionesChange({ 
                                      aplicadas: nuevoTipo === 'APLICAR' ? monto : 0,
                                      regresadas: nuevoTipo === 'REGRESAR' ? monto : 0,
                                      volumen: volumen,
                                      retencionSeleccionada: item 
                                    });
                                  }
                                }
                              }}
                              sx={{ 
                                cursor: (item.puede_aplicar && item.puede_regresar && !isReadOnly) ? 'pointer' : 'default',
                                minWidth: '32px'
                              }}
                            />
                          </Box>
                        )
                      ) : esDeduccion ? (
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
                          
                          // Preparar info para el tooltip
                          const cantidadOriginal = (item as any).cantidad_catalogo_original;
                          const cantidadActualizada = item.cantidad_catalogo;
                          const tooltipText = cantidadOriginal && cantidadOriginal !== cantidadActualizada
                            ? `Original: ${cantidadOriginal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} | Actualizada: ${cantidadActualizada.toLocaleString('es-MX', { minimumFractionDigits: 2 })} | Pagado: ${pagadaAnterior.toLocaleString('es-MX', { minimumFractionDigits: 2 })} | Disponible: ${maxRemaining.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                            : `Catálogo: ${cantidadActualizada.toLocaleString('es-MX', { minimumFractionDigits: 2 })} | Pagado: ${pagadaAnterior.toLocaleString('es-MX', { minimumFractionDigits: 2 })} | Disponible: ${maxRemaining.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
                          
                          return (
                            <Tooltip
                              placement="top"
                              title={tooltipText}
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
                  <td className={`px-3 py-3 text-sm text-right font-mono ${esDeduccion || esRetencion ? 'bg-red-50/40' : 'bg-blue-50/40'}`} style={{ minWidth: '130px' }}>
                    {isSelected ? (
                      <span className={`font-bold ${
                        importe < 0 ? 'text-red-700' : importe > 0 && !esDeduccion && !esRetencion ? 'text-blue-700' : 'text-green-700'
                      }`}>
                        {importe < 0 ? '-' : importe > 0 && esRetencion ? '+' : ''}${Math.abs(importe).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  {/* Amortización (% del importe) */}
                  <td className="px-3 py-3 text-sm text-right font-mono bg-amber-50/40 border-r border-gray-200" style={{ minWidth: '110px' }}>
                    {(() => {
                      // 🆕 NO calcular amortización para anticipo (sería circular)
                      if (esAnticipo) {
                        return (
                          <Tooltip title="El anticipo no se amortiza a sí mismo" arrow>
                            <span className="text-gray-400 text-xs font-semibold">N/A</span>
                          </Tooltip>
                        );
                      }
                      
                      // NO calcular amortización para deducciones/retenciones
                      if (esDeduccion || esRetencion) {
                        return <span className="text-gray-400 text-xs">-</span>;
                      }
                      
                      // No calcular si no está seleccionado
                      if (!isSelected) {
                        return <span className="text-gray-400 text-xs">-</span>;
                      }
                      
                      // Calcular amortización: importe × porcentaje
                      // Ejemplo: $10,000 × 30% = $3,000
                      const amortizacionConcepto = (importe * porcentajeAmortizacion) / 100;
                      
                      return (
                        <span className="text-amber-700 text-xs font-semibold">
                          -${Math.abs(amortizacionConcepto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      );
                    })()}
                  </td>
                  {/* Retención/Fondo de Garantía (% del importe) */}
                  <td className="px-3 py-3 text-sm text-right font-mono bg-red-50/40" style={{ minWidth: '110px' }}>
                    {(() => {
                      // 🆕 NO calcular retención para anticipo
                      if (esAnticipo) {
                        return (
                          <Tooltip title="El anticipo no lleva retención" arrow>
                            <span className="text-gray-400 text-xs font-semibold">N/A</span>
                          </Tooltip>
                        );
                      }
                      
                      // NO calcular retención para deducciones/retenciones
                      if (esDeduccion || esRetencion) {
                        return <span className="text-gray-400 text-xs">-</span>;
                      }
                      
                      // No calcular si no está seleccionado
                      if (!isSelected) {
                        return <span className="text-gray-400 text-xs">-</span>;
                      }
                      
                      // Calcular retención: importe × porcentaje
                      // Ejemplo: $10,000 × 10% = $1,000
                      const retencionConcepto = (importe * porcentajeRetencion) / 100;
                      
                      return (
                        <span className="text-red-700 text-xs font-semibold">
                          -${Math.abs(retencionConcepto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {(conceptosSeleccionados.length > 0 || Object.keys(deduccionesSeleccionadas).length > 0 || retencionSeleccionada) && (
            <tfoot className="bg-gradient-to-r from-slate-100 to-slate-200 border-t-4 border-slate-400">
              {conceptosSeleccionados.length > 0 && (
                <tr>
                  <td colSpan={13} className="px-3 py-3 text-right text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Subtotal Conceptos:
                  </td>
                  <td colSpan={2} className="px-3 py-3 text-right text-base font-bold text-gray-900">${conceptosSeleccionados.reduce((acc, c) => acc + c.importe, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )}
              {Object.keys(deduccionesSeleccionadas).length > 0 && (
                <tr>
                  <td colSpan={13} className="px-3 py-3 text-right text-sm font-semibold text-red-700 uppercase tracking-wide">
                    Deducciones:
                  </td>
                  <td colSpan={2} className="px-3 py-3 text-right text-base font-bold text-red-700">
                    -${Math.abs(Object.values(deduccionesSeleccionadas).reduce((acc, d) => acc + d.importe, 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )}
              {retencionSeleccionada && montoRetencionInput && (
                <tr>
                  <td colSpan={13} className={`px-3 py-3 text-right text-sm font-semibold uppercase tracking-wide ${
                    tipoRetencion === 'APLICAR' ? 'text-red-700' : 'text-green-700'
                  }`}>
                    Retención ({tipoRetencion === 'APLICAR' ? 'Aplicar' : 'Regresar'}):
                  </td>
                  <td colSpan={2} className={`px-3 py-3 text-right text-base font-bold ${
                    tipoRetencion === 'APLICAR' ? 'text-red-700' : 'text-green-700'
                  }`}>
                    {(() => {
                      const volumen = parseFloat(montoRetencionInput) || 0;
                      const precioUnitario = tipoRetencion === 'APLICAR' 
                        ? Math.abs(retencionSeleccionada.monto_disponible || 0)
                        : Math.abs(retencionSeleccionada.monto_aplicado || 0);
                      const monto = volumen * precioUnitario;
                      return tipoRetencion === 'APLICAR' 
                        ? `-$${monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                        : `+$${monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
                    })()}
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-slate-500">
                <td colSpan={13} className="px-3 py-4 text-right text-base font-bold text-gray-900 uppercase tracking-wide">
                  Total Neto:
                </td>
                <td colSpan={2} className="px-3 py-4 text-right text-lg font-extrabold text-blue-700 bg-blue-50">
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
    </div>
  );
};
