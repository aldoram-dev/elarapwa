import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Alert,
  Stack,
  IconButton,
  Chip,
} from '@mui/material';
import { Visibility as VisibilityIcon, CalendarMonth as CalendarIcon, Download as DownloadIcon } from '@mui/icons-material';
import { db } from '@/db/database';
import { RequisicionPago, RequisicionConcepto } from '@/types/requisicion-pago';
import { SolicitudPago, ConceptoSolicitud } from '@/types/solicitud-pago';
import { getLocalMexicoISO } from '@/lib/utils/dateUtils';

/**
 * Calcula la fecha de pago esperada: fecha de solicitud + 15 días, ajustada al viernes siguiente
 * @param fechaSolicitud - Fecha de solicitud (Date o string ISO)
 * @returns String ISO de la fecha de pago esperada
 */
function calcularFechaPagoEsperada(fechaSolicitud: Date | string): string {
  const fecha = typeof fechaSolicitud === 'string' ? new Date(fechaSolicitud) : fechaSolicitud;
  
  // Agregar 15 días calendario
  const fechaMas15Dias = new Date(fecha);
  fechaMas15Dias.setDate(fechaMas15Dias.getDate() + 15);
  
  // Obtener el día de la semana (0=Domingo, 5=Viernes)
  const diaSemana = fechaMas15Dias.getDay();
  
  // Si no es viernes (5), avanzar al próximo viernes
  if (diaSemana !== 5) {
    const diasHastaViernes = diaSemana === 6 ? 6 : (5 - diaSemana + 7) % 7;
    fechaMas15Dias.setDate(fechaMas15Dias.getDate() + diasHastaViernes);
  }
  
  return fechaMas15Dias.toISOString();
}

interface SolicitudPagoFormProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const SolicitudPagoForm: React.FC<SolicitudPagoFormProps> = ({
  open,
  onClose,
  onSave,
}) => {
  const [requisiciones, setRequisiciones] = useState<RequisicionPago[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [contratistas, setContratistas] = useState<any[]>([]);
  const [conceptosSeleccionados, setConceptosSeleccionados] = useState<Map<string, Set<string>>>(new Map());
  const [totalCalculado, setTotalCalculado] = useState(0);
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [requisicionesExpandidas, setRequisicionesExpandidas] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      loadRequisiciones();
      loadContratosYContratistas();
    }
  }, [open]);

  useEffect(() => {
    calcularTotalGlobal();
  }, [conceptosSeleccionados, requisiciones]);

  const descargarConceptosCSV = (requisicion: RequisicionPago) => {
    if (!requisicion.conceptos || requisicion.conceptos.length === 0) {
      alert('Esta requisición no tiene conceptos');
      return;
    }

    // Crear encabezados del CSV
    const headers = ['Clave', 'Concepto', 'Unidad', 'Cantidad', 'Precio Unitario', 'Importe'];
    
    // Crear filas con los conceptos
    const rows = requisicion.conceptos.map(concepto => [
      concepto.clave || '',
      concepto.concepto || '',
      concepto.unidad || '',
      concepto.cantidad_esta_requisicion?.toString() || '0',
      concepto.precio_unitario?.toFixed(2) || '0.00',
      concepto.importe?.toFixed(2) || '0.00'
    ]);

    // Agregar fila de totales
    const totalImporte = requisicion.conceptos.reduce((sum, c) => sum + (c.importe || 0), 0);
    rows.push(['', '', '', '', 'TOTAL:', totalImporte.toFixed(2)]);

    // Construir el CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Crear y descargar el archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `conceptos_${requisicion.numero}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadContratosYContratistas = async () => {
    try {
      // Cargar contratos y contratistas
      const contratosData = await db.contratos.toArray();
      const contratistasData = await db.contratistas.toArray();
      
      console.log('✅ Contratos cargados:', contratosData.length, contratosData.map(c => ({ id: c.id, numero: c.numero_contrato, contratista_id: c.contratista_id })));
      console.log('✅ Contratistas cargados:', contratistasData.length, contratistasData.map(ct => ({ id: ct.id, nombre: ct.nombre })));
      
      // Si no hay contratistas en IndexedDB, intentar cargar desde Supabase
      if (contratistasData.length === 0) {
        console.warn('⚠️ No hay contratistas en IndexedDB, cargando desde Supabase...');
        const supabaseClient = (await import('@/lib/core/supabaseClient')).supabase;
        const { data, error } = await supabaseClient
          .from('contratistas')
          .select('*')
          .eq('active', true);
        
        if (error) {
          console.error('❌ Error cargando contratistas desde Supabase:', error);
        } else if (data) {
          console.log('✅ Contratistas cargados desde Supabase:', data.length);
          // Guardar en IndexedDB
          for (const ct of data) {
            await db.contratistas.put(ct);
          }
          setContratistas(data);
          setContratos(contratosData);
          return;
        }
      }
      
      setContratos(contratosData);
      setContratistas(contratistasData);
    } catch (error) {
      console.error('Error cargando contratos y contratistas:', error);
    }
  };

  const loadRequisiciones = async () => {
    try {
      // Cargar todas las solicitudes existentes para identificar requisiciones ya solicitadas
      const todasSolicitudes = await db.solicitudes_pago.toArray();
      
      // Crear un Set de IDs de requisiciones que ya tienen solicitud creada
      const requisicionesYaSolicitadas = new Set<string>();
      todasSolicitudes.forEach(sol => {
        if (sol.requisicion_id) {
          requisicionesYaSolicitadas.add(sol.requisicion_id);
        }
      });
      
      console.log('📋 Requisiciones ya incluidas en solicitudes:', requisicionesYaSolicitadas.size, Array.from(requisicionesYaSolicitadas));
      
      // Cargar TODAS las requisiciones que NO estén canceladas y que NO estén en solicitudes
      // Incluye: borrador, enviada, aprobada, pagada (excluyendo solo canceladas)
      const reqs = await db.requisiciones_pago
        .filter(req => 
          req.estado !== 'cancelada' && // ✅ Excluir solo canceladas
          req.conceptos && 
          req.conceptos.length > 0 &&
          !requisicionesYaSolicitadas.has(req.id!) // ✅ Excluir las que ya están en solicitudes
        )
        .toArray();
      
      console.log(`✅ Requisiciones disponibles para solicitar: ${reqs.length}`, reqs.map(r => ({ id: r.id, numero: r.numero, estado: r.estado, conceptos: r.conceptos?.length })));
      setRequisiciones(reqs);
      
      // Expandir todas por defecto
      setRequisicionesExpandidas(new Set(reqs.map(r => r.id!)));
    } catch (error) {
      console.error('Error cargando requisiciones:', error);
    }
  };

  const toggleRequisicion = (reqId: string) => {
    const newSet = new Set(requisicionesExpandidas);
    if (newSet.has(reqId)) {
      newSet.delete(reqId);
    } else {
      newSet.add(reqId);
    }
    setRequisicionesExpandidas(newSet);
  };

  const handleToggleConcepto = (reqId: string, conceptoId: string) => {
    const newMap = new Map(conceptosSeleccionados);
    const reqSet = newMap.get(reqId) || new Set<string>();
    
    if (reqSet.has(conceptoId)) {
      reqSet.delete(conceptoId);
    } else {
      reqSet.add(conceptoId);
    }
    
    if (reqSet.size > 0) {
      newMap.set(reqId, reqSet);
    } else {
      newMap.delete(reqId);
    }
    
    setConceptosSeleccionados(newMap);
  };

  const handleSelectAllRequisicion = (reqId: string, conceptos: RequisicionConcepto[]) => {
    const newMap = new Map(conceptosSeleccionados);
    const reqSet = newMap.get(reqId) || new Set<string>();
    
    if (reqSet.size === conceptos.length) {
      newMap.delete(reqId);
    } else {
      newMap.set(reqId, new Set(conceptos.map(c => c.concepto_contrato_id)));
    }
    
    setConceptosSeleccionados(newMap);
  };

  const calcularTotalGlobal = () => {
    let total = 0;
    conceptosSeleccionados.forEach((conceptoIds, reqId) => {
      const req = requisiciones.find(r => r.id === reqId);
      if (req && req.conceptos) {
        req.conceptos.forEach(c => {
          if (conceptoIds.has(c.concepto_contrato_id)) {
            total += c.importe;
          }
        });
      }
    });
    setTotalCalculado(total);
  };

  const getTotalSeleccionados = () => {
    let count = 0;
    conceptosSeleccionados.forEach(set => {
      count += set.size;
    });
    return count;
  };

  const generarFolio = async (): Promise<string> => {
    const solicitudes = await db.solicitudes_pago.toArray();
    const numero = solicitudes.length + 1;
    return `SOL-${numero.toString().padStart(3, '0')}`;
  };

  const handleSubmit = async () => {
    if (getTotalSeleccionados() === 0) {
      alert('Debe seleccionar al menos un concepto');
      return;
    }

    setLoading(true);
    try {
      const folio = await generarFolio();
      
      // Crear una solicitud por cada requisición que tenga conceptos seleccionados
      for (const [reqId, conceptoIds] of conceptosSeleccionados.entries()) {
        const req = requisiciones.find(r => r.id === reqId);
        if (!req || !req.conceptos) continue;

        const conceptosDetalle: ConceptoSolicitud[] = req.conceptos
          .filter(c => conceptoIds.has(c.concepto_contrato_id))
          .map(c => ({
            concepto_id: c.concepto_contrato_id,
            concepto_clave: c.clave,
            concepto_descripcion: c.concepto,
            cantidad: c.cantidad_esta_requisicion,
            precio_unitario: c.precio_unitario,
            importe: c.importe,
          }));

        // 🔒 COPIAR VALORES CONGELADOS de la requisición - NO RECALCULAR
        // Si la solicitud incluye TODOS los conceptos de la requisición, copiar valores completos
        // Si es parcial, calcular proporción
        
        const subtotalConceptos = conceptosDetalle.reduce((sum, c) => sum + c.importe, 0);
        const totalConceptosRequisicion = req.conceptos.reduce((sum, c) => sum + c.importe, 0);
        const proporcion = totalConceptosRequisicion > 0 ? subtotalConceptos / totalConceptosRequisicion : 0;
        const esSolicitudCompleta = Math.abs(proporcion - 1.0) < 0.001; // Tolerancia para errores de redondeo
        
        // 🔒 COPIAR valores congelados de la requisición (NO recalcular)
        const amortizacionProporcional = (req.amortizacion || 0) * proporcion;
        const retencionProporcional = (req.retencion || 0) * proporcion;
        const otrosDescuentosProporcional = (req.otros_descuentos || 0) * proporcion;
        const retencionesEspAplicadas = ((req.retenciones_aplicadas || 0) * proporcion);
        const retencionesEspRegresadas = ((req.retenciones_regresadas || 0) * proporcion);
        
        // 🔒 Calcular subtotal y total usando los valores congelados
        const subtotalFinal = parseFloat((subtotalConceptos - amortizacionProporcional - retencionProporcional - otrosDescuentosProporcional - retencionesEspAplicadas + retencionesEspRegresadas).toFixed(2));
        const ivaCalculado = parseFloat(((req.iva || 0) * proporcion).toFixed(2));
        const totalNeto = parseFloat((subtotalFinal + ivaCalculado).toFixed(2));
        
        console.log('🔒 Valores COPIADOS de requisición (NO recalculados):', {
          folio: `${folio}-${reqId.substring(0, 4)}`,
          es_solicitud_completa: esSolicitudCompleta,
          proporcion: (proporcion * 100).toFixed(2) + '%',
          valores_requisicion: {
            amortizacion_pct: req.amortizacion_porcentaje,
            amortizacion: req.amortizacion,
            retencion_pct: req.retencion_ordinaria_porcentaje,
            retencion: req.retencion,
            tratamiento_iva: req.tratamiento_iva,
            iva: req.iva
          },
          valores_solicitud: {
            subtotal: subtotalFinal,
            iva: ivaCalculado,
            total: totalNeto,
            amortizacion: amortizacionProporcional,
            retencion: retencionProporcional,
            retenciones_esp_aplicadas: retencionesEspAplicadas,
            retenciones_esp_regresadas: retencionesEspRegresadas
          }
        });

        const solicitud: SolicitudPago = {
          folio: `${folio}-${reqId.substring(0, 4)}`,
          requisicion_id: req.id!,
          concepto_ids: Array.from(conceptoIds),
          conceptos_detalle: conceptosDetalle,
          lleva_iva: req.lleva_iva || false,
          
          // 🔒 VALORES CONGELADOS copiados de requisición (NO recalcular)
          subtotal_calculo: subtotalFinal,
          amortizacion_porcentaje: req.amortizacion_porcentaje,
          amortizacion_aplicada: amortizacionProporcional,
          retencion_porcentaje: req.retencion_ordinaria_porcentaje,
          retencion_aplicada: retencionProporcional,
          retenciones_esp_aplicadas: retencionesEspAplicadas,
          retenciones_esp_regresadas: retencionesEspRegresadas,
          iva_porcentaje: req.iva_porcentaje,
          otros_descuentos_aplicados: otrosDescuentosProporcional,
          deducciones_extras_total: 0,
          
          // 🔒 Totales congelados
          subtotal: subtotalFinal,
          iva: ivaCalculado,
          total: totalNeto,
          monto_pagado: 0, // Se llenará cuando se marque como pagado con el monto neto
          fecha: getLocalMexicoISO(),
          fecha_pago_esperada: calcularFechaPagoEsperada(new Date()),
          estado: 'pendiente',
          vobo_gerencia: false,
          notas,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          _dirty: true,
        };

        console.log('💾 Guardando solicitud:', { 
          folio: solicitud.folio,
          requisicion_id: solicitud.requisicion_id,
          conceptos: solicitud.concepto_ids.length
        });

        await db.solicitudes_pago.add(solicitud);
        
        // Actualizar estado de la requisición a "enviada"
        await db.requisiciones_pago.update(req.id!, { 
          estado: 'enviada',
          _dirty: true,
          updated_at: new Date().toISOString()
        });
        console.log(`✅ Requisición ${req.numero} actualizada a estado: enviada`);
      }
      
      alert(`✅ Solicitud(es) ${folio} creada(s) exitosamente con ${getTotalSeleccionados()} conceptos`);
      onSave();
      handleClose();
    } catch (error) {
      console.error('Error guardando solicitud:', error);
      alert('Error al guardar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConceptosSeleccionados(new Map());
    setNotas('');
    setRequisicionesExpandidas(new Set());
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Nueva Solicitud de Pago</Typography>
          <Typography variant="body2" color="text.secondary">
            {getTotalSeleccionados()} conceptos seleccionados - Total: ${totalCalculado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Información de Fecha de Pago Esperada */}
          <Alert severity="info" icon={<CalendarIcon />} sx={{ mb: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="body2" fontWeight={600}>
                Fecha de Pago Esperada:
              </Typography>
              <Typography variant="body2" color="info.main" fontWeight={700}>
                {new Date(calcularFechaPagoEsperada(new Date())).toLocaleDateString('es-MX', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                
              </Typography>
            </Stack>
          </Alert>
          
          {requisiciones.length === 0 ? (
            <Alert severity="info">No hay requisiciones disponibles para crear solicitudes</Alert>
          ) : (
            requisiciones.map(req => {
              const isExpanded = requisicionesExpandidas.has(req.id!);
              const reqConceptosSeleccionados = conceptosSeleccionados.get(req.id!) || new Set();
              const todosSeleccionados = req.conceptos && reqConceptosSeleccionados.size === req.conceptos.length;
              
              // Obtener información del contrato y contratista
              const contrato = contratos.find(c => c.id === req.contrato_id);
              const contratista = contrato ? contratistas.find(ct => ct.id === contrato.contratista_id) : null;
              
              // Debug: verificar por qué no encuentra contratista
              if (!contratista) {
                console.log('🔍 DEBUG Requisición sin contratista:', {
                  requisicion_id: req.id,
                  requisicion_numero: req.numero,
                  contrato_id: req.contrato_id,
                  contrato_encontrado: !!contrato,
                  contrato_info: contrato ? { id: contrato.id, numero: contrato.numero_contrato, contratista_id: contrato.contratista_id } : null,
                  total_contratos: contratos.length,
                  total_contratistas: contratistas.length,
                  todos_contratistas: contratistas.map(ct => ({ id: ct.id, nombre: ct.nombre }))
                });
              }
              
              return (
                <Paper key={req.id} elevation={2} sx={{ p: 2, border: '2px solid', borderColor: 'primary.light' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={isExpanded ? 2 : 0}>
                    <Box display="flex" alignItems="center" gap={2} flex={1}>
                      <IconButton size="small" onClick={() => toggleRequisicion(req.id!)}>
                        {isExpanded ? <VisibilityIcon /> : <VisibilityIcon />}
                      </IconButton>
                      <Box flex={1}>
                        {/* Primera línea: Contratista y Contrato */}
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 0.5 }}>
                          <Chip 
                            label={contratista?.nombre || 'Sin contratista'} 
                            color="primary"
                            sx={{ 
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              height: 28
                            }}
                          />
                          <Chip 
                            label={contrato?.numero_contrato || contrato?.clave_contrato || 'Sin contrato'} 
                            variant="outlined"
                            color="secondary"
                            sx={{ 
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              height: 26
                            }}
                          />
                        </Stack>
                        {/* Segunda línea: Número de requisición */}
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            Requisición: {req.numero}
                          </Typography>
                          {req.respaldo_documental && req.respaldo_documental.length > 0 && (
                            <Chip 
                              label={`${req.respaldo_documental.length} archivo(s)`} 
                              size="small" 
                              color="info"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                        {/* Tercera línea: Info adicional */}
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Typography variant="caption" color="text.secondary">
                            {req.conceptos?.length || 0} conceptos
                          </Typography>
                          <Typography variant="caption" color="primary" fontWeight={600}>
                            Total: ${req.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </Typography>
                        </Stack>
                      </Box>
                    </Box>
                    <Box display="flex" gap={1} alignItems="center">
                      <Chip label={req.estado} color={req.estado === 'aprobada' ? 'success' : 'default'} size="small" />
                      <Button 
                        size="small" 
                        variant="outlined"
                        color="info"
                        startIcon={<DownloadIcon />}
                        onClick={() => descargarConceptosCSV(req)}
                      >
                        CSV
                      </Button>
                      <Button size="small" onClick={() => handleSelectAllRequisicion(req.id!, req.conceptos!)}>
                        {todosSeleccionados ? 'Deseleccionar' : 'Seleccionar'} Todo
                      </Button>
                    </Box>
                  </Box>

                  {isExpanded && (
                    <>
                      {/* Resumen de Montos */}
                      <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                          💰 Detalle de Montos
                        </Typography>
                        <Stack spacing={1}>
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">Monto Estimado (Conceptos):</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              ${req.monto_estimado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </Typography>
                          </Box>
                          {req.amortizacion > 0 && (
                            <Box display="flex" justifyContent="space-between">
                              <Typography variant="body2" color="warning.main">(-) Amortización:</Typography>
                              <Typography variant="body2" fontWeight={600} color="warning.main">
                                ${req.amortizacion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </Typography>
                            </Box>
                          )}
                          {req.retencion > 0 && (
                            <Box display="flex" justifyContent="space-between">
                              <Typography variant="body2" color="warning.main">(-) Retención:</Typography>
                              <Typography variant="body2" fontWeight={600} color="warning.main">
                                ${req.retencion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </Typography>
                            </Box>
                          )}
                          {req.otros_descuentos > 0 && (
                            <Box display="flex" justifyContent="space-between">
                              <Typography variant="body2" color="error.main">(-) Otros Descuentos (Deducciones):</Typography>
                              <Typography variant="body2" fontWeight={600} color="error.main">
                                ${req.otros_descuentos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </Typography>
                            </Box>
                          )}
                          {req.lleva_iva && (
                            <Box display="flex" justifyContent="space-between" sx={{ bgcolor: 'primary.50', p: 1, borderRadius: 1, mt: 1 }}>
                              <Typography variant="body2" color="primary.main" fontWeight={600}>(+) IVA (16%):</Typography>
                              <Typography variant="body2" fontWeight={600} color="primary.main">
                                ${((req.total / 1.16) * 0.16).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </Typography>
                            </Box>
                          )}
                          <Box 
                            display="flex" 
                            justifyContent="space-between" 
                            sx={{ 
                              pt: 1, 
                              borderTop: '2px solid', 
                              borderColor: 'primary.main',
                              mt: 1 
                            }}
                          >
                            <Typography variant="body1" fontWeight={700}>Total a Pagar:</Typography>
                            <Typography variant="body1" fontWeight={700} color="primary.main">
                              ${req.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>

                      {/* Documentos de Respaldo */}
                      {req.respaldo_documental && req.respaldo_documental.length > 0 && (
                        <Box sx={{ mb: 2, p: 2, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.main' }}>
                          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, color: 'info.dark' }}>
                            📎 Documentos de Respaldo
                          </Typography>
                          <Stack spacing={1}>
                            {req.respaldo_documental.map((url, index) => {
                              const fileName = url.split('/').pop() || 'archivo';
                              const fileExtension = fileName.split('.').pop()?.toUpperCase() || 'FILE';
                              
                              return (
                                <Box 
                                  key={index} 
                                  sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1,
                                    p: 1,
                                    bgcolor: 'white',
                                    borderRadius: 1,
                                    '&:hover': { bgcolor: 'action.hover' }
                                  }}
                                >
                                  <Chip 
                                    label={fileExtension} 
                                    size="small" 
                                    color={fileExtension === 'PDF' ? 'error' : 'success'}
                                    sx={{ minWidth: 50 }}
                                  />
                                  <Typography variant="caption" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {fileName}
                                  </Typography>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<VisibilityIcon />}
                                    onClick={() => window.open(url, '_blank')}
                                  >
                                    Ver
                                  </Button>
                                </Box>
                              );
                            })}
                          </Stack>
                        </Box>
                      )}

                      {/* Tabla de Conceptos */}
                      {req.conceptos && (
                        <TableContainer>
                          <Table size="small">
                            <TableHead sx={{ '& th': { bgcolor: '#334155', color: '#fff', fontWeight: 700, py: 1 } }}>
                              <TableRow>
                                <TableCell padding="checkbox"></TableCell>
                                <TableCell>Clave</TableCell>
                                <TableCell>Descripción</TableCell>
                                <TableCell align="right">Cantidad</TableCell>
                                <TableCell align="right">P. Unit.</TableCell>
                                <TableCell align="right">Importe</TableCell>
                                <TableCell align="right">Amortización</TableCell>
                                <TableCell align="right">Retención</TableCell>
                                <TableCell align="right">Otros Desc.</TableCell>
                                <TableCell align="right">Neto</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {req.conceptos.map((concepto) => {
                                // Deducciones, retenciones y extras NO amortizan ni retienen
                                const esDeduccion = concepto.tipo === 'DEDUCCION';
                                const esRetencion = concepto.tipo === 'RETENCION';
                                const esExtra = concepto.tipo === 'EXTRA';
                                const esEspecial = esDeduccion || esRetencion || esExtra;
                                
                                // Calcular deducciones proporcionales SOLO para conceptos normales
                                const proporcion = !esEspecial && req.monto_estimado > 0 ? concepto.importe / req.monto_estimado : 0;
                                const amortConcepto = req.amortizacion * proporcion;
                                const retencionConcepto = req.retencion * proporcion;
                                const otrosDescConcepto = req.otros_descuentos * proporcion;
                                const netoConcepto = concepto.importe - amortConcepto - retencionConcepto - otrosDescConcepto;
                                
                                return (
                                  <TableRow 
                                    key={concepto.concepto_contrato_id} 
                                    hover
                                    sx={esDeduccion ? { bgcolor: 'error.50' } : {}}
                                  >
                                    <TableCell padding="checkbox">
                                      <Checkbox
                                        checked={reqConceptosSeleccionados.has(concepto.concepto_contrato_id)}
                                        onChange={() => handleToggleConcepto(req.id!, concepto.concepto_contrato_id)}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="body2" color={esDeduccion ? 'error.main' : 'inherit'}>
                                        {concepto.clave}
                                      </Typography>
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: '400px' }}>
                                      <Typography 
                                        variant="body2" 
                                        color={esDeduccion ? 'error.main' : 'inherit'}
                                        sx={{
                                          maxHeight: '3.6em', // ~3 líneas
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          display: '-webkit-box',
                                          WebkitLineClamp: 3,
                                          WebkitBoxOrient: 'vertical',
                                          lineHeight: '1.2em'
                                        }}
                                        title={concepto.concepto}
                                      >
                                        {concepto.concepto}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right">{concepto.cantidad_esta_requisicion}</TableCell>
                                    <TableCell align="right">
                                      ${concepto.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography fontWeight={600} color={esDeduccion ? 'error.main' : 'success.dark'}>
                                        ${concepto.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography variant="body2" color="warning.main">
                                        {amortConcepto > 0 ? `-$${amortConcepto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '-'}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography variant="body2" color="warning.main">
                                        {retencionConcepto > 0 ? `-$${retencionConcepto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '-'}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography variant="body2" color="error.main">
                                        {otrosDescConcepto > 0 ? `-$${otrosDescConcepto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '-'}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography fontWeight={700} color="primary.main">
                                        ${netoConcepto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                      </Typography>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </>
                  )}
                </Paper>
              );
            })
          )}

          <TextField
            label="Notas (opcional)"
            multiline
            rows={2}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            fullWidth
          />

          {getTotalSeleccionados() === 0 && (
            <Alert severity="warning">
              Seleccione al menos un concepto para crear la solicitud
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading || getTotalSeleccionados() === 0}
        >
          {loading ? 'Guardando...' : 'Guardar Solicitud'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
