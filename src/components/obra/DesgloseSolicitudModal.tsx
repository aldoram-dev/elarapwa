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

  // Sincronizar conceptos cuando cambia la solicitud
  useEffect(() => {
    if (solicitud) {
      setConceptosActualizados([...solicitud.conceptos_detalle]);
    }
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
    // Solo seleccionar conceptos que tengan comprobante y no estén pagados
    const conceptosSeleccionables = conceptosActualizados.filter(c => c.comprobante_url && !c.pagado);
    
    if (conceptosSeleccionados.size === conceptosSeleccionables.length) {
      setConceptosSeleccionados(new Set());
    } else {
      setConceptosSeleccionados(new Set(conceptosSeleccionables.map(c => c.concepto_id)));
    }
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
      // Actualizar conceptos seleccionados como pagados
      const conceptosConPagos = conceptosActualizados.map(concepto => {
        if (conceptosSeleccionados.has(concepto.concepto_id)) {
          return {
            ...concepto,
            pagado: true,
            monto_pagado: concepto.importe,
            fecha_pago: new Date().toISOString(),
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
        fecha_pago: todosPagados ? new Date().toISOString() : solicitud.fecha_pago,
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

  const conceptosSeleccionables = conceptosActualizados.filter(c => c.comprobante_url && !c.pagado);
  const allSelected = conceptosSeleccionados.size === conceptosSeleccionables.length && conceptosSeleccionables.length > 0;
  const someSelected = conceptosSeleccionados.size > 0 && !allSelected;

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
        sx={{ bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Typography component="span" variant="h6" fontWeight="bold">
          Desglose de la Solicitud {solicitud.folio}
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(80vh - 200px)' }}>
          <Table stickyHeader size="small">
            <TableHead sx={{ '& th': { bgcolor: '#334155', color: '#fff', fontWeight: 700, py: 1 } }}>
              <TableRow>
                {!readOnly && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={handleToggleAll}
                    />
                  </TableCell>
                )}
                <TableCell>Clave</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell align="right">Cantidad</TableCell>
                <TableCell align="right">Precio Unit.</TableCell>
                <TableCell align="right">Importe</TableCell>
                <TableCell align="center">Pagado</TableCell>
                <TableCell align="right">Monto Pagado</TableCell>
                <TableCell>Fecha Pago</TableCell>
                <TableCell>Comprobante</TableCell>
                <TableCell>Respaldo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {conceptosActualizados.map((concepto) => {
                const tieneComprobante = !!concepto.comprobante_url;
                const yaPagado = !!concepto.pagado;
                
                return (
                <TableRow key={concepto.concepto_id} hover sx={{ bgcolor: yaPagado ? 'rgba(76, 175, 80, 0.05)' : 'inherit' }}>
                  {!readOnly && (
                    <TableCell padding="checkbox">
                      <Tooltip title={!tieneComprobante ? '⚠️ Sube el comprobante primero' : yaPagado ? 'Ya está pagado' : 'Seleccionar para pagar'}>
                        <span>
                          <Checkbox
                            checked={conceptosSeleccionados.has(concepto.concepto_id)}
                            onChange={() => handleToggleConcepto(concepto.concepto_id)}
                            disabled={!tieneComprobante || yaPagado}
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
                  )}
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {concepto.concepto_clave}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 400 }}>
                      {concepto.concepto_descripcion}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {concepto.cantidad}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      ${concepto.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={700} color="success.dark">
                      ${concepto.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {concepto.pagado ? (
                      <Typography variant="caption" color="success.main" fontWeight={600}>✓ SÍ</Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">NO</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {concepto.monto_pagado 
                        ? `$${concepto.monto_pagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                        : '—'
                      }
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {concepto.fecha_pago 
                        ? new Date(concepto.fecha_pago).toLocaleDateString('es-MX')
                        : '—'
                      }
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 200 }}>
                    {(() => {
                      // Validar Vo.Bo. antes de permitir subir comprobantes
                      const tieneVoBoDesa = !!solicitud.vobo_desarrollador;
                      const tieneVoBoFinanzas = !!solicitud.vobo_finanzas;
                      const puedeSubirComprobante = tieneVoBoDesa && tieneVoBoFinanzas;
                      
                      if (concepto.comprobante_url) {
                        // Ya hay comprobante
                        return (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <a 
                              href={concepto.comprobante_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ textDecoration: 'none' }}
                            >
                              <Button size="small" startIcon={<FileIcon />} variant="outlined">
                                Ver archivo
                              </Button>
                            </a>
                          </Stack>
                        );
                      }
                      
                      // No hay comprobante - validar Vo.Bo.
                      if (!puedeSubirComprobante) {
                        const faltantes = [];
                        if (!tieneVoBoDesa) faltantes.push('Vo.Bo. Desa.');
                        if (!tieneVoBoFinanzas) faltantes.push('Vo.Bo. Finanzas');
                        
                        return (
                          <Tooltip title={`⚠️ Requiere: ${faltantes.join(' y ')}`}>
                            <span>
                              <Button
                                size="small"
                                variant="outlined"
                                disabled
                                fullWidth
                                sx={{ color: 'text.disabled' }}
                              >
                                Bloqueado
                              </Button>
                            </span>
                          </Tooltip>
                        );
                      }
                      
                      // Puede subir comprobante (solo si no es readOnly)
                      if (readOnly) {
                        return <Typography variant="body2" color="text.secondary">—</Typography>;
                      }
                      
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
                  <TableCell>
                    {concepto.respaldo_documental ? (
                      <a 
                        href={concepto.respaldo_documental} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none' }}
                      >
                        <Button size="small" startIcon={<FileIcon />} variant="text">
                          Ver
                        </Button>
                      </a>
                    ) : (
                      <Typography variant="caption" color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        {!readOnly && (
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1, ml: 1 }}>
            {conceptosSeleccionados.size} concepto(s) seleccionado(s)
          </Typography>
        )}
        <Button onClick={onClose} color="inherit">
          {readOnly ? 'Cerrar' : 'Cancelar'}
        </Button>
        {!readOnly && (
          <Button 
            onClick={handleGuardarPagos} 
            variant="contained" 
            color="success"
            disabled={conceptosSeleccionados.size === 0 || guardando}
          >
            {guardando ? 'Guardando...' : 'Guardar pagos seleccionados'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
