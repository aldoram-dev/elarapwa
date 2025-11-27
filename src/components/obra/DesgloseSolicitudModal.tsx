import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Paper,
  Typography,
  Stack,
  Box,
  IconButton,
  Tooltip,
  TextField,
} from '@mui/material';
import {
  Close as CloseIcon,
  UploadFile as UploadFileIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { SolicitudPago, ConceptoSolicitud } from '@/types/solicitud-pago';
import { SimpleFileUpload } from '@/components/general/SimpleFileUpload';
import { db } from '@/db/database';
import { syncService } from '@/sync/syncService';
import { createPagosRealizadosBatch } from '@/lib/services/pagoRealizadoService';
import { PagoRealizado } from '@/types/pago-realizado';

interface DesgloseSolicitudModalProps {
  open: boolean;
  onClose: () => void;
  solicitud: SolicitudPago | null;
  onSave?: () => void;
  readOnly?: boolean;
}

export const DesgloseSolicitudModal: React.FC<DesgloseSolicitudModalProps> = ({
  open,
  onClose,
  solicitud,
  onSave,
  readOnly = false,
}) => {
  const [conceptosSeleccionados, setConceptosSeleccionados] = useState<Set<string>>(new Set());
  const [conceptosActualizados, setConceptosActualizados] = useState<ConceptoSolicitud[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [retencionPorcentaje, setRetencionPorcentaje] = useState<{ [key: string]: number }>({});
  const [amortizacionPorcentaje, setAmortizacionPorcentaje] = useState<{ [key: string]: number }>({});
  const [retencionContrato, setRetencionContrato] = useState<number>(0);
  const [amortizacionContrato, setAmortizacionContrato] = useState<number>(0);

  // Obtener porcentajes del contrato y sincronizar conceptos cuando cambia la solicitud
  useEffect(() => {
    const cargarDatosContrato = async () => {
      if (!solicitud) return;

      setConceptosActualizados([...solicitud.conceptos_detalle]);
      
      // Obtener la requisición para conseguir el contrato_id
      try {
        const requisicion = await db.requisiciones_pago.get(solicitud.requisicion_id);
        
        if (requisicion?.contrato_id) {
          const contrato = await db.contratos.get(requisicion.contrato_id);
          
          if (contrato) {
            const retencionContratoValor = contrato.retencion_porcentaje || 0;
            
            // La amortización es el porcentaje de anticipo
            // Calcular el % de anticipo desde el monto
            let amortizacionContratoValor = 0;
            if (contrato.anticipo_monto && contrato.monto_contrato > 0) {
              amortizacionContratoValor = (contrato.anticipo_monto / contrato.monto_contrato) * 100;
            }
            
            setRetencionContrato(retencionContratoValor);
            setAmortizacionContrato(amortizacionContratoValor);
            
            console.log('📋 Porcentajes del contrato:', {
              retencion: retencionContratoValor,
              anticipo_amortizacion: amortizacionContratoValor.toFixed(2),
              anticipo_monto: contrato.anticipo_monto,
              monto_contrato: contrato.monto_contrato,
              contrato_id: contrato.id
            });
            
            // Inicializar porcentajes desde el contrato para todos los conceptos
            const retenciones: { [key: string]: number } = {};
            const amortizaciones: { [key: string]: number } = {};
            
            solicitud.conceptos_detalle.forEach(c => {
              retenciones[c.concepto_id] = retencionContratoValor;
              amortizaciones[c.concepto_id] = amortizacionContratoValor;
            });
            
            setRetencionPorcentaje(retenciones);
            setAmortizacionPorcentaje(amortizaciones);
          }
        }
      } catch (error) {
        console.error('Error cargando datos del contrato:', error);
        
        // Fallback: inicializar en 0
        const retenciones: { [key: string]: number } = {};
        const amortizaciones: { [key: string]: number } = {};
        
        solicitud.conceptos_detalle.forEach(c => {
          retenciones[c.concepto_id] = 0;
          amortizaciones[c.concepto_id] = 0;
        });
        
        setRetencionPorcentaje(retenciones);
        setAmortizacionPorcentaje(amortizaciones);
      }
    };

    cargarDatosContrato();
  }, [solicitud]);

  if (!solicitud) return null;

  const handleToggleConcepto = (conceptoId: string) => {
    const newSet = new Set(conceptosSeleccionados);
    if (newSet.has(conceptoId)) {
      newSet.delete(conceptoId);
    } else {
      newSet.add(conceptoId);
    }
    setConceptosSeleccionados(newSet);
  };

  const handleToggleAll = () => {
    // Solo seleccionar conceptos que no estén pagados
    const conceptosSeleccionables = conceptosActualizados.filter(c => !c.pagado);
    
    if (conceptosSeleccionados.size === conceptosSeleccionables.length) {
      setConceptosSeleccionados(new Set());
    } else {
      setConceptosSeleccionados(new Set(conceptosSeleccionables.map(c => c.concepto_id)));
    }
  };

  const handleRetencionChange = (conceptoId: string, porcentaje: number) => {
    setRetencionPorcentaje(prev => ({
      ...prev,
      [conceptoId]: Math.min(100, Math.max(0, porcentaje))
    }));
  };

  const handleAmortizacionChange = (conceptoId: string, porcentaje: number) => {
    setAmortizacionPorcentaje(prev => ({
      ...prev,
      [conceptoId]: Math.min(100, Math.max(0, porcentaje))
    }));
  };

  const aplicarPorcentajesContrato = () => {
    const retenciones: { [key: string]: number } = { ...retencionPorcentaje };
    const amortizaciones: { [key: string]: number } = { ...amortizacionPorcentaje };
    
    conceptosSeleccionados.forEach(conceptoId => {
      retenciones[conceptoId] = retencionContrato;
      amortizaciones[conceptoId] = amortizacionContrato;
    });
    
    setRetencionPorcentaje(retenciones);
    setAmortizacionPorcentaje(amortizaciones);
  };

  // Calcular resumen de conceptos seleccionados
  const calcularResumen = () => {
    let totalImporte = 0;
    let totalRetenciones = 0;
    let totalAmortizaciones = 0;
    
    conceptosActualizados.forEach(concepto => {
      if (conceptosSeleccionados.has(concepto.concepto_id)) {
        const importe = concepto.importe;
        const retencion = (importe * (retencionPorcentaje[concepto.concepto_id] || 0)) / 100;
        const amortizacion = (importe * (amortizacionPorcentaje[concepto.concepto_id] || 0)) / 100;
        
        totalImporte += importe;
        totalRetenciones += retencion;
        totalAmortizaciones += amortizacion;
      }
    });
    
    const totalAPagar = totalImporte - totalRetenciones - totalAmortizaciones;
    
    return {
      totalImporte,
      totalRetenciones,
      totalAmortizaciones,
      totalAPagar,
      cantidadConceptos: conceptosSeleccionados.size
    };
  };

  const handleFileUpload = async (conceptoId: string, url: string) => {
    console.log('📎 Comprobante cargado para concepto:', conceptoId, url);
    
    // Actualizar el concepto en el estado local
    setConceptosActualizados(prev => 
      prev.map(c => c.concepto_id === conceptoId 
        ? { ...c, comprobante_url: url }
        : c
      )
    );
  };

  const handleGuardarPagos = async () => {
    if (conceptosSeleccionados.size === 0) {
      alert('⚠️ Selecciona al menos un concepto para pagar');
      return;
    }

    // Validar que todos los conceptos seleccionados tengan comprobante
    const conceptosSinComprobante = conceptosActualizados.filter(
      c => conceptosSeleccionados.has(c.concepto_id) && !c.comprobante_url
    );

    if (conceptosSinComprobante.length > 0) {
      alert(`⚠️ NO PUEDES GUARDAR SIN COMPROBANTES\n\nLos siguientes conceptos NO tienen comprobante:\n\n${conceptosSinComprobante.map(c => `• ${c.concepto_clave}: ${c.concepto_descripcion}`).join('\n')}\n\n🚫 Sube el comprobante primero para cada concepto seleccionado.`);
      return;
    }

    setGuardando(true);
    
    try {
      // Obtener datos relacionales necesarios
      const requisicion = await db.requisiciones_pago.get(solicitud!.requisicion_id);
      if (!requisicion) throw new Error('Requisición no encontrada');
      
      const contrato = await db.contratos.get(requisicion.contrato_id);
      if (!contrato) throw new Error('Contrato no encontrado');
      
      const fechaPago = new Date().toISOString();
      
      // Crear registros detallados de pagos realizados
      const pagosRealizados: Omit<PagoRealizado, 'id' | 'created_at' | 'updated_at'>[] = [];
      
      // Cargar conceptos del contrato para obtener unidad
      const conceptosContrato = await db.conceptos_contrato
        .where('contrato_id')
        .equals(contrato.id)
        .toArray();
      
      const conceptosContratoMap = new Map(conceptosContrato.map(c => [c.id, c]));
      
      conceptosActualizados.forEach(concepto => {
        if (conceptosSeleccionados.has(concepto.concepto_id)) {
          const retencionPct = retencionPorcentaje[concepto.concepto_id] || 0;
          const amortizacionPct = amortizacionPorcentaje[concepto.concepto_id] || 0;
          
          const montoBruto = concepto.importe;
          const retencionMonto = montoBruto * (retencionPct / 100);
          const amortizacionMonto = montoBruto * (amortizacionPct / 100);
          const montoNeto = montoBruto - retencionMonto - amortizacionMonto;
          
          // Obtener unidad del concepto del contrato
          const conceptoContrato = conceptosContratoMap.get(concepto.concepto_id);
          const unidad = conceptoContrato?.unidad || 'PZA';
          
          pagosRealizados.push({
            solicitud_pago_id: solicitud!.id?.toString() || '',
            requisicion_pago_id: requisicion.id,
            contrato_id: contrato.id,
            concepto_contrato_id: concepto.concepto_id,
            contratista_id: contrato.contratista_id,
            
            // Datos del concepto
            concepto_clave: concepto.concepto_clave,
            concepto_descripcion: concepto.concepto_descripcion,
            concepto_unidad: unidad,
            cantidad: concepto.cantidad,
            precio_unitario: concepto.precio_unitario,
            importe_concepto: concepto.importe,
            
            // Desglose del pago
            monto_bruto: montoBruto,
            retencion_porcentaje: retencionPct,
            retencion_monto: retencionMonto,
            anticipo_porcentaje: amortizacionPct,
            anticipo_monto: amortizacionMonto,
            monto_neto_pagado: montoNeto,
            
            // Información del pago
            fecha_pago: fechaPago,
            numero_pago: solicitud!.folio || `SIN-FOLIO-${Date.now()}`,
            metodo_pago: 'TRANSFERENCIA', // Valor por defecto
            referencia_pago: '',
            
            // Documentos
            comprobante_pago_url: concepto.comprobante_url || '',
            factura_url: '', // ConceptoSolicitud no tiene este campo aún
            xml_url: '', // ConceptoSolicitud no tiene este campo aún
            respaldo_documental: concepto.respaldo_documental || '',
            
            // Folios relacionados
            folio_solicitud: solicitud!.folio || '',
            folio_requisicion: requisicion.numero?.toString() || '',
            numero_contrato: contrato.numero_contrato,
            
            // Estado
            estatus: 'PAGADO',
            pagado_por: '',  // Se puede obtener del usuario actual
            aprobado_por: solicitud!.aprobada_por || '',
            notas: `Pago registrado desde solicitud ${solicitud!.folio}`,
            metadata: {},
            active: true,
          });
        }
      });
      
      // Guardar pagos realizados en batch
      console.log('💾 Creando registros de pagos realizados:', pagosRealizados);
      await createPagosRealizadosBatch(pagosRealizados);
      
      // Actualizar conceptos seleccionados como pagados
      const conceptosConPagos = conceptosActualizados.map(concepto => {
        if (conceptosSeleccionados.has(concepto.concepto_id)) {
          return {
            ...concepto,
            pagado: true,
            monto_pagado: concepto.importe,
            fecha_pago: fechaPago,
          };
        }
        return concepto;
      });

      // Calcular totales
      const totalPagado = conceptosConPagos
        .filter(c => c.pagado)
        .reduce((sum, c) => sum + (c.monto_pagado || 0), 0);
      
      const todosPagados = conceptosConPagos.every(c => c.pagado);

      // Actualizar solicitud
      const solicitudActualizada: SolicitudPago = {
        ...solicitud,
        conceptos_detalle: conceptosConPagos,
        monto_pagado: totalPagado,
        estatus_pago: todosPagados ? 'PAGADO' : 'PAGADO PARCIALMENTE',
        fecha_pago: todosPagados ? fechaPago : solicitud!.fecha_pago,
        _dirty: true,
      };

      console.log('💾 Guardando solicitud actualizada:', solicitudActualizada);

      await db.solicitudes_pago.put(solicitudActualizada);
      await syncService.forcePush();

      alert(`✅ Pago guardado exitosamente\n\n• Conceptos pagados: ${conceptosSeleccionados.size}\n• Monto: $${totalPagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n• Estatus: ${solicitudActualizada.estatus_pago}`);
      
      if (onSave) onSave();
      setConceptosSeleccionados(new Set());
      onClose();
    } catch (error) {
      console.error('❌ Error guardando pagos:', error);
      alert('❌ Error al guardar los pagos. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const conceptosSeleccionables = conceptosActualizados.filter(c => !c.pagado);
  const allSelected = conceptosSeleccionados.size === conceptosSeleccionables.length && conceptosSeleccionables.length > 0;
  const someSelected = conceptosSeleccionados.size > 0 && !allSelected;
  
  const resumen = calcularResumen();

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xl" 
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '80vh',
          maxHeight: '90vh',
        }
      }}
    >
      <DialogTitle
        sx={{ bgcolor: 'primary.main', color: 'white' }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Desglose de la Solicitud {solicitud.folio}
            </Typography>
            {(retencionContrato > 0 || amortizacionContrato > 0) && (
              <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mt: 0.5 }}>
                📋 Contrato: Retención {retencionContrato.toFixed(2)}% | Anticipo {amortizacionContrato.toFixed(2)}%
              </Typography>
            )}
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {!readOnly && conceptosSeleccionados.size > 0 && (retencionContrato > 0 || amortizacionContrato > 0) && (
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={aplicarPorcentajesContrato}
              sx={{ textTransform: 'none' }}
            >
              📋 Aplicar porcentajes del contrato ({retencionContrato.toFixed(2)}% retención / {amortizacionContrato.toFixed(2)}% anticipo)
            </Button>
          </Box>
        )}
        
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(80vh - 200px)' }}>
          <Table stickyHeader size="small">
            <TableHead sx={{ '& th': { bgcolor: '#334155', color: '#fff', fontWeight: 600, py: 0.5, px: 1, fontSize: '0.75rem' } }}>
              <TableRow>
                {!readOnly && (
                  <TableCell padding="checkbox" sx={{ width: 40 }}>
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={handleToggleAll}
                      size="small"
                    />
                  </TableCell>
                )}
                <TableCell sx={{ width: 80 }}>Clave</TableCell>
                <TableCell sx={{ minWidth: 200, maxWidth: 300 }}>Descripción</TableCell>
                <TableCell align="right" sx={{ width: 60 }}>Cant.</TableCell>
                <TableCell align="right" sx={{ width: 80 }}>P.U.</TableCell>
                <TableCell align="right" sx={{ width: 100 }}>Importe</TableCell>
                {!readOnly && (
                  <>
                    <TableCell align="center" sx={{ width: 70 }}>Ret %</TableCell>
                    <TableCell align="right" sx={{ width: 90 }}>$ Ret</TableCell>
                    <TableCell align="center" sx={{ width: 70 }}>Ant %</TableCell>
                    <TableCell align="right" sx={{ width: 90 }}>$ Ant</TableCell>
                    <TableCell align="right" sx={{ bgcolor: '#1e40af', width: 100 }}>Total</TableCell>
                  </>
                )}
                <TableCell align="center" sx={{ width: 50 }}>Pag</TableCell>
                <TableCell align="right" sx={{ width: 100 }}>Monto</TableCell>
                <TableCell sx={{ width: 85 }}>Fecha</TableCell>
                <TableCell sx={{ width: 110 }}>Comprob.</TableCell>
                <TableCell sx={{ width: 80 }}>Resp.</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {conceptosActualizados.map((concepto) => {
                const tieneComprobante = !!concepto.comprobante_url;
                const yaPagado = !!concepto.pagado;
                const estaSeleccionado = conceptosSeleccionados.has(concepto.concepto_id);
                const retencion = (concepto.importe * (retencionPorcentaje[concepto.concepto_id] || 0)) / 100;
                const amortizacion = (concepto.importe * (amortizacionPorcentaje[concepto.concepto_id] || 0)) / 100;
                const totalAPagarConcepto = concepto.importe - retencion - amortizacion;
                
                return (
                <TableRow 
                  key={concepto.concepto_id} 
                  hover 
                  sx={{ 
                    bgcolor: yaPagado ? 'rgba(76, 175, 80, 0.05)' : estaSeleccionado ? 'rgba(59, 130, 246, 0.05)' : 'inherit',
                    borderLeft: estaSeleccionado ? '3px solid #3b82f6' : 'none'
                  }}
                >
                  {!readOnly && (
                    <TableCell padding="checkbox" sx={{ py: 0.5, px: 1 }}>
                      <Tooltip title={yaPagado ? 'Ya está pagado' : 'Seleccionar para pagar'}>
                        <span>
                          <Checkbox
                            checked={estaSeleccionado}
                            onChange={() => handleToggleConcepto(concepto.concepto_id)}
                            disabled={yaPagado}
                            size="small"
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
                  )}
                  <TableCell sx={{ py: 0.5, px: 1 }}>
                    <Typography variant="body2" fontWeight={600} fontSize="0.8rem">
                      {concepto.concepto_clave}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 0.5, px: 1 }}>
                    <Tooltip title={concepto.concepto_descripcion} arrow>
                      <Typography variant="body2" fontSize="0.8rem" sx={{ 
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.3,
                        cursor: 'help'
                      }}>
                        {concepto.concepto_descripcion}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5, px: 1 }}>
                    <Typography variant="body2" fontSize="0.8rem">
                      {concepto.cantidad}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5, px: 1 }}>
                    <Typography variant="body2" fontSize="0.8rem">
                      ${concepto.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5, px: 1 }}>
                    <Typography variant="body2" fontWeight={700} color="success.dark" fontSize="0.85rem">
                      ${concepto.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </Typography>
                  </TableCell>
                  {!readOnly && (
                    <>
                      <TableCell align="center" sx={{ py: 0.5, px: 0.5 }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={retencionPorcentaje[concepto.concepto_id] || 0}
                          onChange={(e) => handleRetencionChange(concepto.concepto_id, parseFloat(e.target.value) || 0)}
                          disabled={yaPagado || !estaSeleccionado}
                          style={{
                            width: '60px',
                            padding: '2px 4px',
                            textAlign: 'center',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.5, px: 1 }}>
                        <Typography variant="body2" color="error.main" fontWeight={600} fontSize="0.8rem">
                          ${retencion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5, px: 0.5 }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={amortizacionPorcentaje[concepto.concepto_id] || 0}
                          onChange={(e) => handleAmortizacionChange(concepto.concepto_id, parseFloat(e.target.value) || 0)}
                          disabled={yaPagado || !estaSeleccionado}
                          style={{
                            width: '60px',
                            padding: '2px 4px',
                            textAlign: 'center',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.5, px: 1 }}>
                        <Typography variant="body2" color="warning.main" fontWeight={600} fontSize="0.8rem">
                          ${amortizacion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ bgcolor: 'rgba(30, 64, 175, 0.08)', py: 0.5, px: 1 }}>
                        <Typography variant="body2" fontWeight={700} color="primary.main" fontSize="0.85rem">
                          ${totalAPagarConcepto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                    </>
                  )}
                  <TableCell align="center" sx={{ py: 0.5, px: 0.5 }}>
                    {concepto.pagado ? (
                      <Typography variant="caption" color="success.main" fontWeight={600} fontSize="0.7rem">✓</Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary" fontSize="0.7rem">—</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5, px: 1 }}>
                    <Typography variant="body2" fontSize="0.8rem">
                      {concepto.monto_pagado 
                        ? `$${concepto.monto_pagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                        : '—'
                      }
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 0.5, px: 1 }}>
                    <Typography variant="body2" fontSize="0.75rem">
                      {concepto.fecha_pago 
                        ? new Date(concepto.fecha_pago).toLocaleDateString('es-MX', { year: '2-digit', month: '2-digit', day: '2-digit' })
                        : '—'
                      }
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 0.5, px: 1 }}>
                    {(() => {
                      // Si ya hay comprobante, mostrar link para ver
                      if (concepto.comprobante_url) {
                        return (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <a 
                              href={concepto.comprobante_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ textDecoration: 'none' }}
                            >
                              <Button size="small" startIcon={<FileIcon />} variant="outlined" sx={{ fontSize: '0.7rem', py: 0.25, px: 0.75 }}>
                                Ver
                              </Button>
                            </a>
                          </Stack>
                        );
                      }
                      
                      // Si es readOnly, no mostrar nada
                      if (readOnly) {
                        return <Typography variant="body2" color="text.secondary">—</Typography>;
                      }
                      
                      // Si ya está pagado, no permitir subir
                      if (yaPagado) {
                        return <Typography variant="body2" color="text.secondary">—</Typography>;
                      }
                      
                      // Solo permitir subir si el concepto está seleccionado (checked)
                      if (!estaSeleccionado) {
                        return (
                          <Tooltip title="✓ Selecciona primero el concepto">
                            <span>
                              <Button
                                size="small"
                                variant="outlined"
                                disabled
                                sx={{ color: 'text.disabled', fontSize: '0.7rem', py: 0.25, px: 0.75 }}
                              >
                                Subir
                              </Button>
                            </span>
                          </Tooltip>
                        );
                      }
                      
                      // Concepto seleccionado - puede subir archivo
                      return (
                        <SimpleFileUpload
                          onUploadComplete={(url) => handleFileUpload(concepto.concepto_id, url)}
                          accept={['application/pdf', 'image/*']}
                          uploadType="document"
                          compact
                        />
                      );
                    })()}
                  </TableCell>
                  <TableCell sx={{ py: 0.5, px: 1 }}>
                    {concepto.respaldo_documental ? (
                      <a 
                        href={concepto.respaldo_documental} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none' }}
                      >
                        <Button size="small" startIcon={<FileIcon />} variant="text" sx={{ fontSize: '0.7rem', py: 0.25, px: 0.5 }}>
                          Ver
                        </Button>
                      </a>
                    ) : (
                      <Typography variant="caption" color="text.secondary" fontSize="0.7rem">—</Typography>
                    )}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      {/* Panel de Resumen */}
      {!readOnly && conceptosSeleccionados.size > 0 && (
        <Box sx={{ 
          p: 3, 
          bgcolor: 'rgba(59, 130, 246, 0.05)', 
          borderTop: '2px solid #3b82f6',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <Typography variant="h6" fontWeight={700} color="primary" gutterBottom>
            📋 Resumen de Pago
          </Typography>
          
          <Stack direction="row" spacing={4} flexWrap="wrap">
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Conceptos Seleccionados
              </Typography>
              <Typography variant="h5" fontWeight={700} color="primary.main">
                {resumen.cantidadConceptos}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Importe Total
              </Typography>
              <Typography variant="h5" fontWeight={700} color="success.dark">
                ${resumen.totalImporte.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                (-) Retenciones
              </Typography>
              <Typography variant="h5" fontWeight={700} color="error.main">
                ${resumen.totalRetenciones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                (-) Anticipo
              </Typography>
              <Typography variant="h5" fontWeight={700} color="warning.main">
                ${resumen.totalAmortizaciones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
            
            <Box sx={{ 
              bgcolor: 'white', 
              p: 2, 
              borderRadius: 2, 
              border: '2px solid #3b82f6',
              minWidth: 200
            }}>
              <Typography variant="caption" color="text.secondary" display="block">
                💰 TOTAL A PAGAR
              </Typography>
              <Typography variant="h4" fontWeight={800} color="primary.main">
                ${resumen.totalAPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Stack>
        </Box>
      )}

      <DialogActions sx={{ p: 2, gap: 1 }}>
        {!readOnly && (
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1, ml: 1 }}>
            {conceptosSeleccionados.size} concepto(s) seleccionado(s)
          </Typography>
        )}
        <Button onClick={onClose} color="inherit">
          {readOnly ? 'Cerrar' : 'Cancelar'}
        </Button>
        {!readOnly && (() => {
          // Validar que todos los seleccionados tengan comprobante
          const conceptosSinComprobante = conceptosActualizados.filter(
            c => conceptosSeleccionados.has(c.concepto_id) && !c.comprobante_url
          );
          const tieneSeleccionados = conceptosSeleccionados.size > 0;
          const todosTienenComprobante = conceptosSinComprobante.length === 0;
          const puedeGuardar = tieneSeleccionados && todosTienenComprobante && !guardando;
          
          return (
            <Button 
              onClick={handleGuardarPagos} 
              variant="contained" 
              color="success"
              disabled={!puedeGuardar}
            >
              {guardando ? 'Guardando...' : !tieneSeleccionados ? 'Guardar pagos seleccionados' : !todosTienenComprobante ? `⚠️ ${conceptosSinComprobante.length} sin comprobante` : 'Guardar pagos seleccionados'}
            </Button>
          );
        })()}
      </DialogActions>
    </Dialog>
  );
};
