import React, { useState, useEffect, useMemo } from 'react';
import { RequisicionPago, RequisicionConcepto } from '@/types/requisicion-pago';
import { Contrato } from '@/types/contrato';
import { ConceptoContrato } from '@/types/concepto-contrato';
import { RequisicionConceptosSelector } from './RequisicionConceptosSelector';
import { db } from '@/db/database';
import { uploadMultipleFiles, getPublicUrl } from '@/lib/utils/storageUtils';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/context/AuthContext';
import { getLocalDateString, localDateToISO } from '@/lib/utils/dateUtils';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Stack,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Description as DescriptionIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as AttachMoneyIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';

interface RequisicionPagoFormProps {
  requisicion?: RequisicionPago;
  contratos: Contrato[];
  onSave: (requisicion: RequisicionPago) => void;
  onCancel: () => void;
  readOnly?: boolean;
}

export const RequisicionPagoForm: React.FC<RequisicionPagoFormProps> = ({
  requisicion,
  contratos,
  onSave,
  onCancel,
  readOnly = false
}) => {
  const { user, perfil } = useAuth();
  // Solo mostrar deducciones extra si NO es contratista (por defecto no mostrar si no sabemos)
  const esContratista = perfil?.tipo === 'CONTRATISTA' || user?.user_metadata?.tipo === 'CONTRATISTA';
  
  const [contratoId, setContratoId] = useState('');
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState(getLocalDateString());
  const [conceptos, setConceptos] = useState<RequisicionConcepto[]>([]);
  const [deducciones, setDeducciones] = useState<Array<{ id: string; cantidad: number; importe: number }>>([]);
  const [retencionesAplicadas, setRetencionesAplicadas] = useState(0); // 🆕 Retenciones que se restan
  const [retencionesRegresadas, setRetencionesRegresadas] = useState(0); // 🆕 Retenciones que se suman
  const [volumenRetencion, setVolumenRetencion] = useState(0); // 🆕 Volumen/cantidad ingresada para la retención
  const [retencionSeleccionada, setRetencionSeleccionada] = useState<any | null>(null); // 🆕 Retención actualmente seleccionada
  const [amortizacion, setAmortizacion] = useState(0);
  const [retencion, setRetencion] = useState(0);
  const [otrosDescuentos, setOtrosDescuentos] = useState(0);
  const [amortizacionManual, setAmortizacionManual] = useState(false);
  const [retencionManual, setRetencionManual] = useState(false);
  const [llevaIva, setLlevaIva] = useState(false); // 🆕 Indica si la requisición lleva IVA (16%)
  const [amortizadoAnterior, setAmortizadoAnterior] = useState(0);
  const [montoContratoActualizado, setMontoContratoActualizado] = useState(0); // 🆕 Monto del contrato incluyendo extras/aditivas/deductivas
  const [descripcionGeneral, setDescripcionGeneral] = useState('');
  const [notas, setNotas] = useState('');
  const [estado, setEstado] = useState<RequisicionPago['estado']>('borrador');
  const [respaldoDocumental, setRespaldoDocumental] = useState<string[]>([]);
  const [facturaUrl, setFacturaUrl] = useState('');
  
  const [conceptosContrato, setConceptosContrato] = useState<ConceptoContrato[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Inicializar o resetear el formulario cuando cambie la requisición
  useEffect(() => {
    if (requisicion) {
      // Cargar datos de requisición existente
      setContratoId(requisicion.contrato_id || '');
      setNumero(requisicion.numero || '');
      setFecha(requisicion.fecha || new Date().toISOString().split('T')[0]);
      
      // Separar conceptos normales, deducciones y retenciones
      const conceptosNormales = (requisicion.conceptos || []).filter(c => c.tipo !== 'DEDUCCION' && c.tipo !== 'RETENCION');
      const deduccionesGuardadas = (requisicion.conceptos || []).filter(c => c.tipo === 'DEDUCCION');
      const retencionesGuardadas = (requisicion.conceptos || []).filter(c => c.tipo === 'RETENCION');
      
      setConceptos(conceptosNormales);
      
      // Restaurar deducciones en el formato correcto
      const deduccionesRestauradas = deduccionesGuardadas.map(d => ({
        id: d.concepto_contrato_id,
        cantidad: d.cantidad_esta_requisicion,
        importe: d.importe
      }));
      setDeducciones(deduccionesRestauradas);
      
      // 🔵 Restaurar retenciones guardadas
      if (retencionesGuardadas.length > 0) {
        const retencionGuardada = retencionesGuardadas[0]; // Solo una retención por requisición
        
        // Detectar el modo: primero usar modo_retencion si existe, sino deducir del signo
        const modoRetencion = retencionGuardada.modo_retencion || (retencionGuardada.importe > 0 ? 'REGRESAR' : 'APLICAR');
        const esDevolucion = modoRetencion === 'REGRESAR';
        const montoRetencion = Math.abs(retencionGuardada.importe);
        
        console.log('📋 Restaurando retención:', {
          clave: retencionGuardada.clave,
          importe: retencionGuardada.importe,
          modo_retencion: modoRetencion,
          esDevolucion
        });
        
        // Cargar el detalle completo de la retención desde la BD
        db.retenciones_contrato.get(retencionGuardada.concepto_contrato_id).then(retencionDetalle => {
          if (retencionDetalle) {
            setRetencionSeleccionada({
              id: retencionDetalle.id,
              clave: retencionGuardada.clave,
              concepto: retencionGuardada.concepto.replace(' (Devolución)', ''),
              unidad: retencionGuardada.unidad,
              monto_disponible: retencionDetalle.monto_disponible,
              monto_aplicado: retencionDetalle.monto_aplicado,
              monto_regresado: retencionDetalle.monto_regresado,
              tipo: 'RETENCION'
            });
            
            if (esDevolucion) {
              setRetencionesRegresadas(montoRetencion);
              setRetencionesAplicadas(0);
            } else {
              setRetencionesAplicadas(montoRetencion);
              setRetencionesRegresadas(0);
            }
          }
        });
      } else {
        // Si no hay retenciones guardadas, limpiar estados
        setRetencionSeleccionada(null);
        setRetencionesAplicadas(requisicion.retenciones_aplicadas || 0);
        setRetencionesRegresadas(requisicion.retenciones_regresadas || 0);
      }
      
      setAmortizacion(requisicion.amortizacion || 0);
      setRetencion(requisicion.retencion || 0);
      setOtrosDescuentos(requisicion.otros_descuentos || 0);
      
      // Si la requisición no tiene definido lleva_iva, inferirlo del contrato
      if (requisicion.lleva_iva !== undefined) {
        setLlevaIva(requisicion.lleva_iva);
      } else {
        const contrato = contratos.find(c => c.id === requisicion.contrato_id);
        const debeIncluirIva = contrato?.tratamiento === 'MAS IVA';
        setLlevaIva(debeIncluirIva);
        console.log('🔵 Inferir IVA de requisición existente desde contrato:', { tratamiento: contrato?.tratamiento, debeIncluirIva });
      }
      
      setDescripcionGeneral(requisicion.descripcion_general || '');
      setNotas(requisicion.notas || '');
      setEstado(requisicion.estado || 'borrador');
      setRespaldoDocumental(requisicion.respaldo_documental || []);
      setFacturaUrl(requisicion.factura_url || '');
    } else {
      // Resetear a valores por defecto para nueva requisición
      setContratoId('');
      setNumero('');
      setFecha(new Date().toISOString().split('T')[0]);
      setConceptos([]);
      setDeducciones([]);
      setAmortizacion(0);
      setRetencion(0);
      setOtrosDescuentos(0);
      setAmortizacionManual(false);
      setFacturaUrl('');
      setRetencionManual(false);
      setAmortizadoAnterior(0);
      setDescripcionGeneral('');
      setNotas('');
      setEstado('borrador');
      setRespaldoDocumental([]);
      setConceptosContrato([]);
      setErrors({});
    }
  }, [requisicion]);

  // Cargar conceptos del contrato seleccionado
  useEffect(() => {
    if (contratoId) {
      loadConceptosContrato(contratoId);
    } else {
      setConceptosContrato([]);
    }
  }, [contratoId]);

  const loadConceptosContrato = async (contratoId: string) => {
    setLoading(true);
    try {
      // 0. Obtener el contrato
      const contrato = contratos.find(c => c.id === contratoId);
      if (!contrato) {
        console.error('❌ Contrato no encontrado:', contratoId);
        setConceptosContrato([]);
        return;
      }
      
      // 🔵 Inicializar IVA automáticamente según el tratamiento del contrato
      if (!requisicion) { // Solo al crear nueva requisición
        const tratamiento = contrato.tratamiento;
        const debeIncluirIva = tratamiento === 'MAS IVA';
        console.log('🔵 Configurando IVA automáticamente:', { tratamiento, debeIncluirIva });
        setLlevaIva(debeIncluirIva);
      }
      
      // 1. Cargar conceptos ordinarios del catálogo
      const conceptosOrdinarios = await db.conceptos_contrato
        .where('contrato_id')
        .equals(contratoId)
        .and(c => c.active === true)
        .toArray();
      
      // 2. Cargar cambios de contrato aplicados (aditivas/deductivas)
      const cambiosAplicados = await db.cambios_contrato
        .where('contrato_id')
        .equals(contratoId)
        .and(c => c.active === true && c.estatus === 'APLICADO' && (c.tipo_cambio === 'ADITIVA' || c.tipo_cambio === 'DEDUCTIVA'))
        .sortBy('fecha_cambio');

      console.log('🔵 Cambios aplicados encontrados:', cambiosAplicados.length, cambiosAplicados.map(c => ({ numero: c.numero_cambio, tipo: c.tipo_cambio, estatus: c.estatus })));

      // 3. Calcular cantidades actualizadas por concepto (después de aditivas/deductivas)
      const cantidadesActualizadas = new Map<string, number>();
      
      // Inicializar con cantidades del catálogo
      conceptosOrdinarios.forEach(c => {
        cantidadesActualizadas.set(c.id, c.cantidad_catalogo);
      });

      console.log('🔵 Cantidades iniciales:', Array.from(cantidadesActualizadas.entries()).map(([id, cant]) => {
        const c = conceptosOrdinarios.find(co => co.id === id);
        return { clave: c?.clave, cantidad: cant };
      }).slice(0, 5));

      // Aplicar cambios cronológicamente
      for (const cambio of cambiosAplicados) {
        const detalles = await db.detalles_aditiva_deductiva
          .where('cambio_contrato_id')
          .equals(cambio.id)
          .and(d => d.active !== false)
          .toArray();
        
        console.log(`🔵 Aplicando ${cambio.tipo_cambio} ${cambio.numero_cambio}:`, detalles.length, 'detalles');
        
        detalles.forEach(detalle => {
          const conceptoOriginal = conceptosOrdinarios.find(c => c.id === detalle.concepto_contrato_id);
          const cantidadActual = cantidadesActualizadas.get(detalle.concepto_contrato_id) || 0;
          console.log(`  📊 ${detalle.concepto_clave}: ${cantidadActual} → ${detalle.cantidad_nueva}`, {
            concepto_encontrado: !!conceptoOriginal,
            concepto_id: detalle.concepto_contrato_id
          });
          cantidadesActualizadas.set(detalle.concepto_contrato_id, detalle.cantidad_nueva);
        });
      }

      console.log('✅ Cantidades finales después de cambios:', Array.from(cantidadesActualizadas.entries()).map(([id, cant]) => {
        const c = conceptosOrdinarios.find(co => co.id === id);
        return { id, clave: c?.clave, cantidad: cant };
      }).filter(x => x.cantidad === 0 || x.clave?.includes('023-005') || x.clave?.includes('022-005')));

      // 4. Cargar todas las requisiciones del contrato
      const todasRequisiciones = await db.requisiciones_pago
        .where('contrato_id')
        .equals(contratoId)
        .toArray();
      
      // 5. Cargar todas las solicitudes de pago para calcular cantidades REALMENTE solicitadas
      // 🆕 CAMBIO: Ahora solo contamos volumen de conceptos que están en SOLICITUDES, no en requisiciones
      const todasSolicitudes = await db.solicitudes_pago.toArray();
      
      console.log(`📋 Total solicitudes en DB: ${todasSolicitudes.length}`, {
        ejemploSolicitud: todasSolicitudes[0]
      });
      
      // Filtrar solicitudes del contrato actual
      const solicitudesDelContrato = todasSolicitudes.filter(sol => {
        return todasRequisiciones.some(req => req.id === sol.requisicion_id && req.contrato_id === contratoId);
      });
      
      console.log(`📋 Solicitudes filtradas del contrato: ${solicitudesDelContrato.length}`, 
        solicitudesDelContrato.map(s => ({ folio: s.folio, requisicion_id: s.requisicion_id, conceptos: s.concepto_ids?.length }))
      );
      
      console.log(`📊 Calculando volumen consumido para contrato ${contratoId}:`, {
        totalRequisiciones: todasRequisiciones.length,
        totalSolicitudes: solicitudesDelContrato.length,
        requisicionActual: requisicion?.id || 'NUEVA'
      });
      
      // Calcular cantidad pagada anterior por concepto SOLO de conceptos en solicitudes
      const cantidadesPagadas = new Map<string, number>();
      
      solicitudesDelContrato.forEach(sol => {
        // Excluir solicitudes de la requisición actual si estamos editando
        if (requisicion && sol.requisicion_id === requisicion.id) return;
        
        // Obtener la requisición asociada para tener los detalles completos
        const req = todasRequisiciones.find(r => r.id === sol.requisicion_id);
        if (!req || !req.conceptos) return;
        
        console.log(`  📋 Procesando solicitud ${sol.folio}:`, {
          requisicion: req.numero,
          conceptos_en_solicitud: sol.concepto_ids?.length,
          total_en_requisicion: req.conceptos?.length
        });
        
        // SOLO contar conceptos que están en concepto_ids de la solicitud
        // Esto permite que conceptos en requisiciones pero NO en solicitudes queden disponibles
        // EXCLUIR deducciones, retenciones y extras del cálculo de volumen
        sol.concepto_ids?.forEach(conceptoId => {
          const conceptoReq = req.conceptos?.find(c => c.concepto_contrato_id === conceptoId);
          if (conceptoReq && !conceptoReq.tipo) { // Solo conceptos NORMALES
            const actual = cantidadesPagadas.get(conceptoId) || 0;
            const nuevo = actual + conceptoReq.cantidad_esta_requisicion;
            cantidadesPagadas.set(conceptoId, nuevo);
            console.log(`    ✓ Concepto ${conceptoReq.clave}: ${actual.toFixed(2)} + ${conceptoReq.cantidad_esta_requisicion.toFixed(2)} = ${nuevo.toFixed(2)}`);
          } else if (conceptoReq?.tipo) {
            console.log(`    ⊘ Concepto especial ${conceptoReq.clave} (${conceptoReq.tipo}) excluido del volumen`);
          }
        });
      });
      
      console.log(`✅ Volumen consumido calculado. Conceptos con consumo:`, cantidadesPagadas.size);
      if (cantidadesPagadas.size > 0) {
        console.log('   Detalle de consumos:', Array.from(cantidadesPagadas.entries()).map(([id, cant]) => {
          const concepto = conceptosOrdinarios.find(c => c.id === id);
          return { clave: concepto?.clave, cantidad: cant.toFixed(2) };
        }));
      }
      
      // 6. Agregar info de cantidad actualizada y pagada a los conceptos
      const conceptosConInfo = conceptosOrdinarios.map(concepto => {
        // ✅ Usar ?? en lugar de || para permitir valor 0
        const cantidadActualizada = cantidadesActualizadas.get(concepto.id) ?? concepto.cantidad_catalogo;
        // ✅ Solo marcar como modificado si la cantidad realmente cambió
        const tieneCambios = cantidadActualizada !== concepto.cantidad_catalogo;
        
        return {
          ...concepto,
          cantidad_catalogo_original: concepto.cantidad_catalogo,
          cantidad_catalogo: cantidadActualizada,
          cantidad_pagada_anterior: cantidadesPagadas.get(concepto.id) ?? 0,
          tiene_cambios: tieneCambios
        };
      });
      
      console.log('📦 Conceptos modificados por deductivas:', conceptosConInfo.filter(c => 
        c.clave?.includes('023-005-004') || c.clave?.includes('022-005-005')
      ).map(c => ({
        clave: c.clave,
        cantidad_original: c.cantidad_catalogo_original,
        cantidad_actualizada: c.cantidad_catalogo,
        tiene_cambios: c.tiene_cambios,
        id: c.id
      })));
      
      setConceptosContrato(conceptosConInfo);
      
      // 🆕 Calcular monto actualizado del contrato (incluyendo extras, aditivas y deductivas)
      try {
        const montoBase = contrato.monto_contrato || 0;
        
        // 📊 Obtener cambios APLICADOS (aditivas/deductivas) y APROBADOS (extras)
        const todosCambios = await db.cambios_contrato
          .where('contrato_id')
          .equals(contratoId)
          .and(c => c.active === true && (c.estatus === 'APLICADO' || (c.estatus === 'APROBADO' && c.tipo_cambio === 'EXTRA')))
          .toArray();
        
        // Sumar montos por tipo de cambio
        const montosAditivas = todosCambios.filter(c => c.tipo_cambio === 'ADITIVA').reduce((sum, c) => sum + (c.monto_cambio || 0), 0);
        const montosDeductivas = todosCambios.filter(c => c.tipo_cambio === 'DEDUCTIVA').reduce((sum, c) => sum + (c.monto_cambio || 0), 0);
        const montosExtras = todosCambios.filter(c => c.tipo_cambio === 'EXTRA').reduce((sum, c) => sum + (c.monto_cambio || 0), 0);
        
        // 🔵 Monto actualizado = Monto Original + Aditivas + Deductivas (negativas) + Extras
        const montoActualizado = montoBase + montosAditivas + montosDeductivas + montosExtras;
        
        console.log('💰 Monto del contrato actualizado:', {
          montoOriginal: montoBase,
          aditivas: montosAditivas,
          deductivas: montosDeductivas,
          extras: montosExtras,
          montoActualizado,
          formula: `${montoBase} + ${montosAditivas} + (${montosDeductivas}) + ${montosExtras} = ${montoActualizado}`
        });
        
        setMontoContratoActualizado(montoActualizado);
      } catch (error) {
        console.error('Error calculando monto actualizado del contrato:', error);
        setMontoContratoActualizado(contrato.monto_contrato || 0);
      }
    } catch (error) {
      console.error('Error cargando conceptos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generar número automático si es nuevo
  useEffect(() => {
    if (!requisicion && contratoId && !numero) {
      generateNumeroRequisicion(contratoId);
    }
  }, [contratoId]);

  const generateNumeroRequisicion = async (contratoId: string) => {
    try {
      const requisiciones = await db.requisiciones_pago
        .where('contrato_id')
        .equals(contratoId)
        .toArray();
      
      const contrato = contratos.find(c => c.id === contratoId);
      const numeroContrato = contrato?.numero_contrato || 'CTR';
      
      // Buscar el máximo número existente para este contrato
      let maxNumero = 0;
      const regex = new RegExp(`^${numeroContrato.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-REQ-(\\d+)$`);
      
      requisiciones.forEach(req => {
        const match = req.numero.match(regex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumero) maxNumero = num;
        }
      });
      
      const siguiente = maxNumero + 1;
      setNumero(`${numeroContrato}-REQ-${String(siguiente).padStart(3, '0')}`);
    } catch (error) {
      console.error('Error generando número:', error);
      setNumero('REQ-001');
    }
  };

  // Handler para cambios en deducciones extra - actualiza automáticamente "Otros Descuentos"
  const handleDeduccionesChange = (nuevasDeducciones: Array<{ id: string; cantidad: number; importe: number }>) => {
    setDeducciones(nuevasDeducciones);
    // Calcular total de deducciones (importes ya vienen negativos, tomamos valor absoluto)
    const totalDeducciones = nuevasDeducciones.reduce((sum, d) => sum + Math.abs(d.importe), 0);
    setOtrosDescuentos(totalDeducciones);
  };

  // Handler para cambios en retenciones
  const handleRetencionesChange = (retenciones: { aplicadas: number; regresadas: number; volumen?: number; retencionSeleccionada: any | null }) => {
    console.log('📋 Retenciones actualizadas:', retenciones);
    
    if (retenciones.retencionSeleccionada) {
      console.log('🔍 Estado completo de la retención seleccionada:', {
        id: retenciones.retencionSeleccionada.id,
        clave: retenciones.retencionSeleccionada.clave,
        concepto: retenciones.retencionSeleccionada.concepto,
        montoTotal: retenciones.retencionSeleccionada.montoTotal,
        montoAplicado: retenciones.retencionSeleccionada.montoAplicado,
        montoRegresado: retenciones.retencionSeleccionada.montoRegresado,
        montoDisponible: retenciones.retencionSeleccionada.montoDisponible,
        puede_aplicar: retenciones.retencionSeleccionada.puede_aplicar,
        puede_regresar: retenciones.retencionSeleccionada.puede_regresar,
        esta_agotada: retenciones.retencionSeleccionada.esta_agotada
      });
    }
    
    setRetencionesAplicadas(retenciones.aplicadas);
    setRetencionesRegresadas(retenciones.regresadas);
    setVolumenRetencion(retenciones.volumen || 0);
    setRetencionSeleccionada(retenciones.retencionSeleccionada);
  };

  // Calcular montos
  const montoEstimado = useMemo(() => {
    // Calcular monto base (solo conceptos normales)
    const montoBase = conceptos
      .filter(c => !c.tipo || c.tipo === 'CONCEPTO')
      .reduce((sum, c) => sum + c.importe, 0);
    
    // Sumar/restar deducciones (negativos)
    const montoDeducciones = deducciones.reduce((sum, d) => sum - d.importe, 0);
    
    // Sumar/restar retenciones según el modo
    let montoRetenciones = 0;
    if (retencionesAplicadas > 0) {
      montoRetenciones -= retencionesAplicadas; // Restar cuando se aplica
    }
    if (retencionesRegresadas > 0) {
      montoRetenciones += retencionesRegresadas; // Sumar cuando se regresa
    }
    
    const total = montoBase + montoDeducciones + montoRetenciones;
    
    console.log('💰 Cálculo de Monto Estimado:', {
      montoBase,
      montoDeducciones,
      retencionesAplicadas,
      retencionesRegresadas,
      montoRetenciones,
      total
    });
    
    return total;
  }, [conceptos, deducciones, retencionesAplicadas, retencionesRegresadas]);

  // Cargar amortización pagada en requisiciones anteriores para este contrato
  useEffect(() => {
    let active = true;
    const loadPrev = async () => {
      if (!contratoId) { setAmortizadoAnterior(0); return; }
      try {
        const prev = await db.requisiciones_pago
          .where('contrato_id')
          .equals(contratoId)
          .toArray();
        // Excluir la requisición actual si estamos editando
        const sumAmort = prev
          .filter(r => !requisicion || r.id !== requisicion.id)
          .reduce((s, r) => s + (r.amortizacion || 0), 0);
        if (active) setAmortizadoAnterior(sumAmort);
      } catch (e) {
        console.warn('No se pudo cargar amortizaciones previas:', e);
        if (active) setAmortizadoAnterior(0);
      }
    };
    loadPrev();
    return () => { active = false; };
  }, [contratoId, requisicion]);

  // Autocalcular amortización (anticipo) y retención a partir del contrato
  useEffect(() => {
    const contrato = contratos.find(c => c.id === contratoId);
    if (!contrato) return;

    // Retención: SUMA de las retenciones individuales de cada concepto
    // 🆕 NO calcular sobre el monto total, sino sumar las retenciones de cada concepto
    if (!retencionManual) {
      const retPct = (contrato.retencion_porcentaje || 0) / 100;
      
      // 🆕 SUMAR retenciones individuales de cada concepto seleccionado
      const calcRet = conceptos
        .filter(c => !c.tipo || c.tipo === 'CONCEPTO') // Solo conceptos normales
        .reduce((sum, c) => sum + (c.importe * retPct), 0);
      
      setRetencion(parseFloat(Math.max(0, calcRet).toFixed(2)));
    }

    // Amortización de anticipo: SUMA de las amortizaciones individuales de cada concepto
    // 🆕 NO calcular sobre el monto total, sino sumar las amortizaciones de cada concepto
    if (!amortizacionManual) {
      const anticipoMonto = contrato.anticipo_monto || 0;
      const anticipoDisponible = Math.max(0, anticipoMonto - amortizadoAnterior);
      
      // Calcular porcentaje ajustado
      const montoContratoParaCalculo = montoContratoActualizado > 0 ? montoContratoActualizado : contrato.monto_contrato;
      const anticipoPct = montoContratoParaCalculo > 0 ? (anticipoMonto / montoContratoParaCalculo) : 0;
      
      // 🆕 SUMAR amortizaciones individuales de cada concepto seleccionado
      const calcAmort = conceptos
        .filter(c => !c.tipo || c.tipo === 'CONCEPTO') // Solo conceptos normales
        .reduce((sum, c) => sum + (c.importe * anticipoPct), 0);
      
      console.log('💰 Cálculo de amortización ajustada:', {
        anticipoMonto,
        montoContratoOriginal: contrato.monto_contrato,
        montoContratoActualizado: montoContratoParaCalculo,
        porcentajeOriginal: contrato.monto_contrato > 0 ? ((anticipoMonto / contrato.monto_contrato) * 100).toFixed(2) + '%' : '0%',
        porcentajeAjustado: (anticipoPct * 100).toFixed(2) + '%',
        conceptosSeleccionados: conceptos.filter(c => !c.tipo || c.tipo === 'CONCEPTO').length,
        amortizacionCalculada: calcAmort,
        anticipoDisponible
      });
      
      // Limitar amortización: no puede exceder anticipo disponible
      const amortizacionFinal = Math.min(calcAmort, anticipoDisponible);
      
      setAmortizacion(parseFloat(amortizacionFinal.toFixed(2)));
    }
  }, [contratoId, contratos, conceptos, amortizadoAnterior, amortizacionManual, retencionManual, montoContratoActualizado]);

  // Calcular subtotal (antes de IVA)
  const subtotalParaGuardar = useMemo(() => {
    // Permitir valores negativos cuando solo hay retenciones/deducciones sin conceptos
    const subtotal = montoEstimado - amortizacion - retencion - otrosDescuentos;
    return parseFloat(subtotal.toFixed(2)); // 🔵 Redondear a 2 decimales para evitar problemas de precisión
  }, [montoEstimado, amortizacion, retencion, otrosDescuentos]);
  
  // Calcular IVA
  const ivaParaGuardar = useMemo(() => {
    const iva = llevaIva ? subtotalParaGuardar * 0.16 : 0;
    return parseFloat(iva.toFixed(2)); // 🔵 Redondear a 2 decimales
  }, [subtotalParaGuardar, llevaIva]);

  // Calcular total (subtotal + IVA)
  const total = useMemo(() => {
    const totalCalculado = subtotalParaGuardar + ivaParaGuardar;
    return parseFloat(totalCalculado.toFixed(2)); // 🔵 Redondear a 2 decimales
  }, [subtotalParaGuardar, ivaParaGuardar]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!contratoId) {
      newErrors.contratoId = 'Debe seleccionar un contrato';
    }
    if (!numero) {
      newErrors.numero = 'El número es requerido';
    }
    if (!fecha) {
      newErrors.fecha = 'La fecha es requerida';
    }
    if (conceptos.length === 0) {
      newErrors.conceptos = 'Debe seleccionar al menos un concepto';
    }
    if (conceptos.some(c => c.cantidad_esta_requisicion <= 0)) {
      newErrors.cantidades = 'Todos los conceptos deben tener cantidad mayor a 0';
    }

    // Validar que ningún concepto exceda la cantidad disponible del catálogo
    const conceptosExcedidos = conceptos.filter(c => {
      const disponible = Math.max(0, c.cantidad_catalogo - c.cantidad_pagada_anterior);
      return c.cantidad_esta_requisicion > disponible;
    });
    if (conceptosExcedidos.length > 0) {
      const claves = conceptosExcedidos.map(c => c.clave).join(', ');
      newErrors.conceptos = `Los siguientes conceptos exceden la cantidad disponible: ${claves}`;
    }

    // Validar que el total no sea negativo
    if (total < 0) {
      newErrors.total = 'El total a pagar no puede ser negativo. Revise los descuentos aplicados.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Si estamos en modo factura (readOnly con estados enviada/aprobada o con facturaOnlyMode), solo actualizar factura
    const modoFactura = readOnly && ((estado === 'enviada' || estado === 'aprobada') || readOnly);
    
    if (!modoFactura && !validate()) {
      return;
    }

    // Si es modo factura, usar datos existentes de la requisición
    if (modoFactura && requisicion) {
      const requisicionData: RequisicionPago = {
        ...requisicion,
        factura_url: facturaUrl || undefined,
        updated_at: new Date().toISOString(),
        _dirty: true
      };
      
      onSave(requisicionData);
      return;
    }

    const contrato = contratos.find(c => c.id === contratoId);
    if (!contrato) return;

    // Convertir deducciones a formato de concepto para guardar
    const deduccionesComoConceptos: RequisicionConcepto[] = await Promise.all(
      deducciones.map(async (ded) => {
        // Buscar la descripción de la deducción en la base de datos
        let descripcion = `Deducción Extra: ${ded.id}`;
        try {
          const deduccionDB = await db.deducciones_extra.get(ded.id);
          if (deduccionDB) {
            descripcion = deduccionDB.descripcion;
          }
        } catch (error) {
          console.error('Error buscando deducción:', error);
        }
        
        return {
          concepto_contrato_id: ded.id,
          clave: ded.id.substring(0, 8),
          concepto: descripcion,
          unidad: 'LS',
          cantidad_catalogo: 0,
          cantidad_pagada_anterior: 0,
          cantidad_esta_requisicion: ded.cantidad,
          precio_unitario: ded.importe / ded.cantidad,
          importe: ded.importe,
          tipo: 'DEDUCCION' as const
        };
      })
    );

    // 🔵 Convertir retenciones a formato de concepto para guardar
    const retencionesComoConceptos: RequisicionConcepto[] = [];
    if (retencionSeleccionada && (retencionesAplicadas > 0 || retencionesRegresadas > 0)) {
      // Determinar el modo y monto
      const esRegreso = retencionesRegresadas > 0;
      const modoRetencion = esRegreso ? 'REGRESAR' : 'APLICAR';
      const montoRetencion = esRegreso ? retencionesRegresadas : -retencionesAplicadas;
      
      // Calcular precio unitario: monto de la retención disponible o aplicado
      const precioUnitarioRetencion = esRegreso 
        ? (retencionSeleccionada.montoAplicado || retencionSeleccionada.monto_aplicado || retencionSeleccionada.montoTotal || retencionSeleccionada.monto_total || 0)
        : (retencionSeleccionada.montoDisponible || retencionSeleccionada.monto_disponible || 0);
      
      console.log('💾 Guardando retención:', {
        modo: modoRetencion,
        volumen: volumenRetencion,
        precio_unitario: precioUnitarioRetencion,
        monto: montoRetencion,
        calculo: `${volumenRetencion} × $${precioUnitarioRetencion} = $${Math.abs(montoRetencion)}`
      });
      
      retencionesComoConceptos.push({
        concepto_contrato_id: retencionSeleccionada.id,
        clave: retencionSeleccionada.clave || 'RET-???',
        concepto: `${retencionSeleccionada.concepto || 'Retención'}${esRegreso ? ' (Devolución)' : ''}`,
        unidad: retencionSeleccionada.unidad || 'LS',
        cantidad_catalogo: 1,
        cantidad_pagada_anterior: 0,
        cantidad_esta_requisicion: volumenRetencion,
        precio_unitario: esRegreso ? precioUnitarioRetencion : -precioUnitarioRetencion,
        importe: montoRetencion,
        tipo: 'RETENCION' as const,
        modo_retencion: modoRetencion
      });
    }

    console.log('💾 Guardando requisición:', {
      conceptosNormales: conceptos.length,
      deduccionesCount: deduccionesComoConceptos.length,
      retencionesCount: retencionesComoConceptos.length,
      conceptosDetalle: conceptos.map(c => ({ clave: c.clave, importe: c.importe })),
      deduccionesDetalle: deduccionesComoConceptos.map(d => ({ clave: d.clave, importe: d.importe })),
      retencionesDetalle: retencionesComoConceptos.map(r => ({ clave: r.clave, importe: r.importe }))
    });

    // Combinar conceptos normales con deducciones y retenciones
    const todosConceptos = [...conceptos, ...deduccionesComoConceptos, ...retencionesComoConceptos];

    // 🔍 Validar constraint antes de guardar
    const diferenciaTotal = Math.abs(total - (subtotalParaGuardar + ivaParaGuardar));
    console.log('🔍 Validación de constraint antes de guardar:', {
      subtotal: subtotalParaGuardar,
      iva: ivaParaGuardar,
      total: total,
      suma_subtotal_iva: subtotalParaGuardar + ivaParaGuardar,
      diferencia: diferenciaTotal,
      constraint_pasa: diferenciaTotal < 0.05,
      lleva_iva: llevaIva,
      montoEstimado,
      amortizacion,
      retencion,
      otrosDescuentos
    });
    
    if (diferenciaTotal >= 0.05) {
      console.error('⚠️ ADVERTENCIA: El total no coincide con subtotal + IVA', {
        diferencia: diferenciaTotal,
        detalles: {
          'monto_estimado': montoEstimado,
          'menos_amortizacion': -amortizacion,
          'menos_retencion': -retencion,
          'menos_otros_descuentos': -otrosDescuentos,
          'subtotal_calculado': montoEstimado - amortizacion - retencion - otrosDescuentos,
          'iva_calculado': llevaIva ? (montoEstimado - amortizacion - retencion - otrosDescuentos) * 0.16 : 0,
          'total_calculado': total
        }
      });
    }

    const requisicionData: RequisicionPago = {
      id: requisicion?.id || uuidv4(),
      contrato_id: contratoId,
      numero,
      fecha,
      conceptos: todosConceptos,
      monto_estimado: montoEstimado,
      amortizacion,
      retencion,
      otros_descuentos: otrosDescuentos,
      retenciones_aplicadas: retencionesAplicadas, // 🆕 Guardar retenciones aplicadas
      retenciones_regresadas: retencionesRegresadas, // 🆕 Guardar retenciones regresadas
      lleva_iva: llevaIva, // 🆕 Guardar si lleva IVA
      subtotal: subtotalParaGuardar, // 🔵 Guardar subtotal calculado
      iva: ivaParaGuardar, // 🔵 Guardar IVA calculado
      total,
      descripcion_general: descripcionGeneral || undefined,
      notas: notas || undefined,
      respaldo_documental: respaldoDocumental.length > 0 ? respaldoDocumental : undefined,
      factura_url: facturaUrl || undefined,
      estado,
      // Preservar campos de visto bueno si existen
      visto_bueno: requisicion?.visto_bueno,
      visto_bueno_por: requisicion?.visto_bueno_por,
      visto_bueno_fecha: requisicion?.visto_bueno_fecha,
      fecha_pago_estimada: requisicion?.fecha_pago_estimada,
      estatus_pago: requisicion?.estatus_pago,
      created_at: requisicion?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: requisicion?.created_by || user?.id, // 🆕 Guardar usuario creador
      updated_by: user?.id, // 🆕 Guardar usuario que modificó
      _dirty: true,
      _deleted: requisicion?._deleted || false // 🆕 Preservar estado de borrado lógico
    };

    // 🔵 Actualizar tabla retenciones_contrato con los nuevos montos ANTES de guardar
    console.log('🔍 Verificando actualización de retención:', {
      hayRetencionSeleccionada: !!retencionSeleccionada,
      retencionSeleccionada_id: retencionSeleccionada?.id,
      retencionesAplicadas,
      retencionesRegresadas,
      debeActualizar: !!(retencionSeleccionada && (retencionesAplicadas > 0 || retencionesRegresadas > 0))
    });
    
    if (retencionSeleccionada && (retencionesAplicadas > 0 || retencionesRegresadas > 0)) {
      try {
        console.log('🔎 Buscando retención en BD con ID:', retencionSeleccionada.id);
        const retencion = await db.retenciones_contrato.get(retencionSeleccionada.id);
        
        console.log('📦 Retención encontrada en BD:', retencion ? {
          id: retencion.id,
          descripcion: retencion.descripcion,
          monto_total: retencion.monto,
          monto_aplicado_actual: retencion.monto_aplicado,
          monto_regresado_actual: retencion.monto_regresado,
          monto_disponible_actual: retencion.monto_disponible
        } : 'NO ENCONTRADA');
        
        if (retencion) {
          const nuevoMontoAplicado = (retencion.monto_aplicado || 0) + retencionesAplicadas;
          const nuevoMontoRegresado = (retencion.monto_regresado || 0) + retencionesRegresadas;
          // Disponible para aplicar = Total - Aplicado
          // (El monto regresado NO vuelve a estar disponible para aplicar)
          const nuevoMontoDisponible = retencion.monto - nuevoMontoAplicado;
          
          console.log('💰 Actualizando retención en BD:', {
            id: retencion.id,
            descripcion: retencion.descripcion,
            monto_aplicado_anterior: retencion.monto_aplicado,
            monto_regresado_anterior: retencion.monto_regresado,
            aplicando_ahora: retencionesAplicadas,
            regresando_ahora: retencionesRegresadas,
            nuevo_aplicado: nuevoMontoAplicado,
            nuevo_regresado: nuevoMontoRegresado,
            nuevo_disponible: nuevoMontoDisponible
          });
          
          const updateResult = await db.retenciones_contrato.update(retencion.id, {
            monto_aplicado: nuevoMontoAplicado,
            monto_regresado: nuevoMontoRegresado,
            monto_disponible: nuevoMontoDisponible,
            updated_at: new Date().toISOString(),
            _dirty: true
          });
          
          console.log('✅ Retención actualizada en BD. Resultado:', updateResult);
          
          // Verificar que se actualizó
          const retencionVerificacion = await db.retenciones_contrato.get(retencion.id);
          console.log('✔️ Verificación post-update:', {
            monto_aplicado: retencionVerificacion?.monto_aplicado,
            monto_regresado: retencionVerificacion?.monto_regresado,
            monto_disponible: retencionVerificacion?.monto_disponible
          });
        } else {
          console.error('❌ Retención NO encontrada en BD con ID:', retencionSeleccionada.id);
        }
      } catch (error) {
        console.error('❌ Error actualizando retención:', error);
      }
    } else {
      console.log('⏭️ Saltando actualización de retención (sin retención o montos en 0)');
    }

    onSave(requisicionData);
  };

  const contratoSeleccionado = contratos.find(c => c.id === contratoId);

  // Debug: Log de contratos disponibles
  useEffect(() => {
    console.log('Contratos disponibles:', contratos);
  }, [contratos]);

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ py: 3 }}>
      {/* Header con botones */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Typography variant="h4" fontWeight="bold">
          {readOnly 
            ? 'Subir Factura - Requisición de Pago'
            : requisicion ? 'Editar Requisición de Pago' : 'Nueva Requisición de Pago'}
        </Typography>
        {/* Ocultar botones del header si estamos en modo factura (se muestran abajo) */}
        {!readOnly && (
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<CloseIcon />}
              onClick={onCancel}
            >
              {readOnly ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!readOnly && (
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
              >
                Guardar
              </Button>
            )}
          </Stack>
        )}
      </Stack>

      {/* Información básica */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
          <DescriptionIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Información General
          </Typography>
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
          {/* Contrato */}
          <FormControl fullWidth error={!!errors.contratoId}>
            <InputLabel>Contrato *</InputLabel>
            <Select
              value={contratoId}
              label="Contrato *"
              onChange={(e) => {
                setContratoId(e.target.value);
                setConceptos([]); // Reset conceptos al cambiar contrato
              }}
              disabled={readOnly || !!requisicion} // No permitir cambio si es edición o solo lectura
            >
              <MenuItem value="">Seleccione un contrato</MenuItem>
              {contratos.map(contrato => (
                <MenuItem key={contrato.id} value={contrato.id}>
                  {contrato.clave_contrato || contrato.numero_contrato} - {contrato.categoria} / {contrato.partida} / {contrato.subpartida}
                </MenuItem>
              ))}
            </Select>
            {errors.contratoId && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                {errors.contratoId}
              </Typography>
            )}
          </FormControl>

          {/* Número */}
          <TextField
            label="Número de Requisición *"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="REQ-001"
            error={!!errors.numero}
            helperText={errors.numero}
            disabled={readOnly}
            fullWidth
          />

          {/* Fecha */}
          <TextField
            label="Fecha *"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            error={!!errors.fecha}
            helperText={errors.fecha}
            disabled={readOnly}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CalendarIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          {/* Estado */}
          <TextField
            label="Estado"
            value="Requisición"
            disabled
            fullWidth
          />
        </Box>

        {/* Descripción General */}
        <TextField
          label="Descripción General de la Requisición"
          value={descripcionGeneral}
          onChange={(e) => setDescripcionGeneral(e.target.value)}
          multiline
          rows={2}
          placeholder="Descripción general de los trabajos..."
          disabled={readOnly}
          fullWidth
          sx={{ mb: 2 }}
        />

        {/* Notas */}
        <TextField
          label="Notas / Observaciones"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          multiline
          rows={3}
          placeholder="Comentarios adicionales..."
          disabled={readOnly}
          fullWidth
        />
      </Paper>

      {/* Selector de Conceptos */}
      {contratoId && conceptosContrato.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <RequisicionConceptosSelector
            conceptosContrato={conceptosContrato}
            conceptosSeleccionados={conceptos}
            onConceptosChange={setConceptos}
            onDeduccionesChange={handleDeduccionesChange}
            deduccionesIniciales={deducciones}
            onRetencionesChange={handleRetencionesChange}
            retencionesIniciales={{ aplicadas: retencionesAplicadas, regresadas: retencionesRegresadas }}
            contratoId={contratoId}
            requisicionId={requisicion?.id} // 🆔 Pasar ID de requisición actual
            esContratista={esContratista}
            readOnly={readOnly}
            porcentajeAmortizacion={(() => {
              // Calcular porcentaje ajustado de amortización
              const contrato = contratos.find(c => c.id === contratoId);
              if (!contrato) return 0;
              const anticipoMonto = contrato.anticipo_monto || 0;
              const montoContratoParaCalculo = montoContratoActualizado > 0 ? montoContratoActualizado : contrato.monto_contrato;
              return montoContratoParaCalculo > 0 ? (anticipoMonto / montoContratoParaCalculo) * 100 : 0;
            })()}
            porcentajeRetencion={(() => {
              // Obtener porcentaje de retención del contrato
              const contrato = contratos.find(c => c.id === contratoId);
              return contrato?.retencion_porcentaje || 0;
            })()}
          />
          {errors.conceptos && (
            <Alert severity="error" sx={{ mt: 2 }}>{errors.conceptos}</Alert>
          )}
          {errors.cantidades && (
            <Alert severity="error" sx={{ mt: 2 }}>{errors.cantidades}</Alert>
          )}
        </Paper>
      )}



      {contratoId && loading && (
        <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">Cargando conceptos...</Typography>
        </Paper>
      )}

      {contratoId && !loading && conceptosContrato.length === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          El contrato seleccionado no tiene conceptos en su catálogo
        </Alert>
      )}

      {/* Montos y Descuentos */}
      {conceptos.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
            <AttachMoneyIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Cálculo de Montos
            </Typography>
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
            {/* Monto Estimado (calculado) */}
            <Paper elevation={2} sx={{ p: 3, bgcolor: 'primary.50', borderColor: 'primary.light', border: 1 }}>
              <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
                Monto Estimado (Calculado)
              </Typography>
              <Typography variant="h4" fontWeight={700} color="primary.dark">
                ${montoEstimado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </Typography>
            </Paper>

            {/* Amortización */}
            <TextField
              label="Amortización (Anticipo)"
              type="number"
              value={amortizacion}
              onChange={(e) => { setAmortizacion(parseFloat(e.target.value) || 0); setAmortizacionManual(true); }}
              error={!!errors.amortizacion}
              disabled={readOnly}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                inputProps: { min: 0, step: 0.01 }
              }}
              helperText={
                errors.amortizacion ||
                (contratoId && contratos.find(c => c.id === contratoId) ? 
                  (() => {
                    const contrato = contratos.find(c => c.id === contratoId)!;
                    const anticipoMonto = contrato.anticipo_monto || 0;
                    const montoOriginal = contrato.monto_contrato;
                    const montoActual = montoContratoActualizado > 0 ? montoContratoActualizado : montoOriginal;
                    const anticipoPctOriginal = montoOriginal > 0 ? ((anticipoMonto / montoOriginal) * 100).toFixed(2) : '0';
                    const anticipoPctActual = montoActual > 0 ? ((anticipoMonto / montoActual) * 100).toFixed(2) : '0';
                    const saldoAnticipo = Math.max(0, anticipoMonto - amortizadoAnterior);
                    
                    // Mostrar porcentaje ajustado si difiere del original
                    const mostrarAjuste = Math.abs(parseFloat(anticipoPctOriginal) - parseFloat(anticipoPctActual)) > 0.01;
                    const porcentajeTexto = mostrarAjuste 
                      ? `${anticipoPctOriginal}% → ${anticipoPctActual}% ajustado`
                      : `${anticipoPctOriginal}%`;
                    
                    return `Anticipo: $${anticipoMonto.toLocaleString('es-MX', { minimumFractionDigits: 2 })} (${porcentajeTexto}) | Saldo: $${saldoAnticipo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
                  })()
                : undefined)
              }
              fullWidth
            />

            {/* Retención */}
            <TextField
              label="Retención (Fondo de Garantía)"
              type="number"
              value={retencion}
              onChange={(e) => { setRetencion(parseFloat(e.target.value) || 0); setRetencionManual(true); }}
              disabled={readOnly}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                inputProps: { min: 0, step: 0.01 }
              }}
              helperText={
                contratoId && contratos.find(c => c.id === contratoId) ?
                  (() => {
                    const contrato = contratos.find(c => c.id === contratoId)!;
                    const retPct = contrato.retencion_porcentaje || 0;
                    return `Porcentaje de retención del contrato: ${retPct}%`;
                  })()
                : undefined
              }
              fullWidth
            />

            {/* Otros Descuentos (auto-calculado desde deducciones extra) */}
            <TextField
              label="Otros Descuentos"
              type="number"
              value={otrosDescuentos}
              onChange={(e) => setOtrosDescuentos(parseFloat(e.target.value) || 0)}
              disabled={true}
              helperText="Calculado automáticamente desde deducciones extra"
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                inputProps: { min: 0, step: 0.01 }
              }}
              fullWidth
            />

            {/* Info de retención seleccionada */}
            {retencionSeleccionada && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="bold">
                  Retención seleccionada: {retencionSeleccionada.clave} - {retencionSeleccionada.concepto}
                </Typography>
                <Typography variant="caption">
                  Monto total: ${retencionSeleccionada.monto?.toFixed(2) || '0.00'} | 
                  Disponible: ${retencionSeleccionada.monto_disponible?.toFixed(2) || '0.00'}
                </Typography>
              </Alert>
            )}

            {/* Retenciones Aplicadas (resta) */}
            <TextField
              label="Retenciones Aplicadas"
              type="number"
              value={retencionesAplicadas || ''}
              onChange={(e) => {
                const newValue = parseFloat(e.target.value) || 0;
                setRetencionesAplicadas(newValue);
              }}
              disabled={true}
              helperText={
                retencionSeleccionada 
                  ? `Monto ingresado en tabla: $${retencionesAplicadas.toFixed(2)} (Disponible: $${retencionSeleccionada.monto_disponible?.toFixed(2) || '0.00'})` 
                  : "Selecciona una retención en la tabla de arriba e ingresa el monto"
              }
              InputProps={{
                startAdornment: <InputAdornment position="start">-$</InputAdornment>,
                inputProps: { 
                  step: 0.01 
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'error.main' },
                  '&:hover fieldset': { borderColor: 'error.dark' },
                  backgroundColor: 'grey.100'
                }
              }}
              fullWidth
            />

            {/* Retenciones Regresadas (suma) */}
            <TextField
              label="Retenciones Regresadas"
              type="number"
              value={retencionesRegresadas}
              onChange={(e) => {
                const newValue = parseFloat(e.target.value) || 0;
                setRetencionesRegresadas(newValue);
              }}
              disabled={readOnly || esContratista || !retencionSeleccionada}
              helperText={
                retencionSeleccionada 
                  ? `Monto aplicado previamente: $${retencionSeleccionada.monto_aplicado?.toFixed(2) || '0.00'}` 
                  : "Selecciona una retención en la tabla de arriba"
              }
              InputProps={{
                startAdornment: <InputAdornment position="start">+$</InputAdornment>,
                inputProps: { min: 0, step: 0.01 }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'success.main' },
                  '&:hover fieldset': { borderColor: 'success.dark' },
                }
              }}
              fullWidth
            />
          </Box>

          {/* Checkbox: Lleva IVA */}
          <Box sx={{ mt: 2, p: 2, bgcolor: llevaIva ? 'primary.50' : 'grey.50', borderRadius: 1, border: '1px solid', borderColor: llevaIva ? 'primary.main' : 'grey.300' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={llevaIva}
                  onChange={(e) => setLlevaIva(e.target.checked)}
                  disabled={readOnly}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight={600}>
                    Incluir IVA (16%)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {contratos.find(c => c.id === contratoId)?.tratamiento === 'MAS IVA' 
                      ? '✓ Configurado automáticamente según el contrato (Tratamiento: MAS IVA)'
                      : 'Marca esta opción si la requisición lleva IVA agregado al total'}
                  </Typography>
                </Box>
              }
            />
            {llevaIva && (
              <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'primary.200' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    Subtotal sin IVA:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    ${(Math.max(0, montoEstimado - amortizacion - retencion - otrosDescuentos)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    IVA (16%):
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="primary.main">
                    +${(Math.max(0, montoEstimado - amortizacion - retencion - otrosDescuentos) * 0.16).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Stack>
              </Box>
            )}
          </Box>

          {/* Total a Pagar */}
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              bgcolor: errors.total ? 'error.50' : 'success.50', 
              borderColor: errors.total ? 'error.main' : 'success.main', 
              border: 2 
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight={600}>
                Total a Pagar:
              </Typography>
              <Typography 
                variant="h3" 
                fontWeight={700} 
                color={errors.total ? 'error.dark' : 'success.dark'}
              >
                ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </Typography>
            </Stack>
          </Paper>
          {errors.total && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errors.total}
            </Alert>
          )}
        </Paper>
      )}

      {/* Respaldo Documental */}
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            Respaldo Documental
          </Typography>
          {respaldoDocumental.length > 0 && !readOnly && (
            <Chip 
              label={`${respaldoDocumental.length} archivo(s)`} 
              color="primary" 
              size="small" 
            />
          )}
        </Stack>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="caption">
            Los archivos se suben inmediatamente al servidor, pero se asociarán a esta requisición al dar click en <strong>"Guardar Requisición"</strong>.
          </Typography>
        </Alert>
        <Paper
          variant="outlined"
          sx={{
            p: 4,
            textAlign: 'center',
            borderStyle: 'dashed',
            borderWidth: 2,
            borderColor: 'divider',
            bgcolor: 'background.default'
          }}
        >
          <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {uploading ? 'Subiendo archivos...' : 'Seleccionar archivos (PDF, imágenes, Office)'}
          </Typography>
          <Button
            component="label"
            variant="outlined"
            size="small"
            sx={{ mt: 1 }}
            disabled={uploading || readOnly}
          >
            {uploading ? 'Subiendo...' : 'Seleccionar Archivos'}
            <input
              type="file"
              multiple
              accept="application/pdf,image/*"
              hidden
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                if (files.length === 0) return;

                setUploading(true);
                try {
                  // Subir archivos a Supabase Storage
                  const uploadedPaths = await uploadMultipleFiles(
                    files,
                    'documents', // bucket name (ya existe)
                    'requisiciones/respaldos' // folder
                  );

                  if (uploadedPaths.length > 0) {
                    // Agregar las URLs públicas al estado
                    const newUrls = uploadedPaths.map((path: string) => 
                      getPublicUrl(path, 'documents')
                    );
                    setRespaldoDocumental([...respaldoDocumental, ...newUrls]);
                    console.log('✅ Archivos subidos a Storage:', uploadedPaths.length, 'archivo(s)');
                    console.log('⚠️ Las URLs se guardarán en la BD al dar click en "Guardar Requisición"');
                    // No mostrar alert para no interrumpir el flujo
                  } else {
                    alert('No se pudieron subir los archivos. Verifica tu conexión e intenta de nuevo.');
                  }
                } catch (error) {
                  console.error('Error subiendo archivos:', error);
                  alert('Error al subir los archivos');
                } finally {
                  setUploading(false);
                  // Limpiar el input
                  e.target.value = '';
                }
              }}
              disabled={uploading || readOnly}
            />
          </Button>
        </Paper>
        {respaldoDocumental.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
              Archivos adjuntos ({respaldoDocumental.length})
            </Typography>
            <List sx={{ bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              {respaldoDocumental.map((url, index) => {
                const fileName = url.split('/').pop() || 'archivo';
                const fileExtension = fileName.split('.').pop()?.toUpperCase() || 'FILE';
                const isPDF = fileExtension === 'PDF';
                const isImage = ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP'].includes(fileExtension);
                
                return (
                  <ListItem
                    key={index}
                    sx={{ 
                      borderBottom: index < respaldoDocumental.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <Box sx={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: 1, 
                      bgcolor: isPDF ? 'error.light' : isImage ? 'success.light' : 'primary.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2
                    }}>
                      <Typography variant="caption" fontWeight={700} color="white">
                        {fileExtension}
                      </Typography>
                    </Box>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={500}>
                          Archivo {index + 1}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary" sx={{ 
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '300px'
                        }}>
                          {fileName}
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityIcon />}
                          onClick={() => window.open(url, '_blank')}
                          sx={{ minWidth: 'auto' }}
                        >
                          Ver
                        </Button>
                        {!readOnly && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              if (confirm('¿Eliminar este archivo?')) {
                                setRespaldoDocumental(respaldoDocumental.filter((_, i) => i !== index));
                              }
                            }}
                            title="Eliminar"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        )}
      </Paper>

      {/* Factura (visible en modo readOnly o cuando está enviada/aprobada) */}
      {(readOnly || estado === 'enviada' || estado === 'aprobada') && (
        <Paper sx={{ p: 3, bgcolor: 'warning.50', border: '2px solid', borderColor: 'warning.main' }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={600} color="warning.dark">
              📄 Factura
            </Typography>
            {facturaUrl && (
              <Chip 
                label="Factura cargada" 
                color="success" 
                size="small" 
              />
            )}
          </Stack>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="caption">
              Subir la factura correspondiente a esta requisición. El archivo se guardará al dar click en <strong>"Guardar Factura"</strong>.
            </Typography>
          </Alert>
          
          {!facturaUrl ? (
            <Paper
              variant="outlined"
              sx={{
                p: 4,
                textAlign: 'center',
                borderStyle: 'dashed',
                borderWidth: 2,
                borderColor: 'warning.main',
                bgcolor: 'background.default'
              }}
            >
              <CloudUploadIcon sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {uploading ? 'Subiendo factura...' : 'Seleccionar factura (PDF)'}
              </Typography>
              <Button
                component="label"
                variant="outlined"
                color="warning"
                size="small"
                sx={{ mt: 1 }}
                disabled={uploading}
              >
                {uploading ? 'Subiendo...' : 'Seleccionar Factura'}
                <input
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;

                    setUploading(true);
                    try {
                      const uploadedPaths = await uploadMultipleFiles(
                        files,
                        'documents',
                        'requisiciones/facturas'
                      );

                      if (uploadedPaths.length > 0) {
                        const facturaPublicUrl = getPublicUrl(uploadedPaths[0], 'documents');
                        setFacturaUrl(facturaPublicUrl);
                        console.log('✅ Factura subida a Storage:', facturaPublicUrl);
                      } else {
                        alert('No se pudo subir la factura. Verifica tu conexión e intenta de nuevo.');
                      }
                    } catch (error) {
                      console.error('Error subiendo factura:', error);
                      alert('Error al subir la factura');
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
              </Button>
            </Paper>
          ) : (
            <Box sx={{ bgcolor: 'white', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'warning.main' }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{
                  bgcolor: 'error.main',
                  color: 'white',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  fontWeight: 700,
                  fontSize: '0.75rem'
                }}>
                  PDF
                </Box>
                <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>
                  Factura cargada
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    startIcon={<VisibilityIcon />}
                    onClick={() => window.open(facturaUrl, '_blank')}
                  >
                    Ver Factura
                  </Button>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      if (confirm('¿Eliminar la factura?')) {
                        setFacturaUrl('');
                      }
                    }}
                    title="Eliminar"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </Box>
          )}

          {/* Botón Guardar dentro de la sección de factura */}
          {readOnly && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<CloseIcon />}
                onClick={onCancel}
                size="large"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                color="warning"
                size="large"
              >
                Guardar Factura
              </Button>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};
