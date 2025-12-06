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
import { Visibility as VisibilityIcon, CalendarMonth as CalendarIcon } from '@mui/icons-material';
import { db } from '@/db/database';
import { RequisicionPago, RequisicionConcepto } from '@/types/requisicion-pago';
import { SolicitudPago, ConceptoSolicitud } from '@/types/solicitud-pago';

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
  proyectoId?: string;
}

export const SolicitudPagoForm: React.FC<SolicitudPagoFormProps> = ({
  open,
  onClose,
  onSave,
  proyectoId,
}) => {
  const [requisiciones, setRequisiciones] = useState<RequisicionPago[]>([]);
  const [conceptosSeleccionados, setConceptosSeleccionados] = useState<Map<string, Set<string>>>(new Map());
  const [totalCalculado, setTotalCalculado] = useState(0);
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [requisicionesExpandidas, setRequisicionesExpandidas] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      loadRequisiciones();
    }
  }, [open]);

  useEffect(() => {
    calcularTotalGlobal();
  }, [conceptosSeleccionados, requisiciones]);

  const loadRequisiciones = async () => {
    try {
      // Cargar todas las solicitudes existentes para saber qué conceptos ya están solicitados
      const todasSolicitudes = await db.solicitudes_pago.toArray();
      
      // Crear un Set de conceptos ya solicitados
      const conceptosYaSolicitados = new Set<string>();
      todasSolicitudes.forEach(sol => {
        sol.concepto_ids.forEach(id => conceptosYaSolicitados.add(id));
      });
      
      console.log('📋 Conceptos ya solicitados:', conceptosYaSolicitados.size);
      
      // Cargar requisiciones y filtrar sus conceptos
      const reqs = await db.requisiciones_pago
        .filter(req => req.estado !== 'pagada' && req.conceptos && req.conceptos.length > 0)
        .toArray();
      
      // Filtrar conceptos ya solicitados de cada requisición
      const reqsFiltradas = reqs.map(req => ({
        ...req,
        conceptos: req.conceptos?.filter(c => !conceptosYaSolicitados.has(c.concepto_contrato_id)) || []
      })).filter(req => req.conceptos.length > 0); // Solo mostrar requisiciones con conceptos disponibles
      
      console.log(`✅ Requisiciones: ${reqs.length} → ${reqsFiltradas.length} con conceptos disponibles`);
      setRequisiciones(reqsFiltradas);
      
      // Expandir todas por defecto
      setRequisicionesExpandidas(new Set(reqsFiltradas.map(r => r.id!)));
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

        const total = conceptosDetalle.reduce((sum, c) => sum + c.importe, 0);

        // Los porcentajes se aplican desde el contrato cuando se marca como pagado
        // No se calculan aquí porque no tenemos acceso directo al contrato en este punto

        const fechaSolicitud = new Date();
        const solicitud: SolicitudPago = {
          folio: `${folio}-${reqId.substring(0, 4)}`,
          proyecto_id: proyectoId || '',
          requisicion_id: req.id!,
          concepto_ids: Array.from(conceptoIds),
          conceptos_detalle: conceptosDetalle,
          subtotal: total,
          total: total,
          monto_pagado: 0, // Se llenará cuando se marque como pagado con el monto neto
          fecha: fechaSolicitud.toISOString(),
          fecha_pago_esperada: calcularFechaPagoEsperada(fechaSolicitud),
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
              
              return (
                <Paper key={req.id} elevation={2} sx={{ p: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={isExpanded ? 2 : 0}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <IconButton size="small" onClick={() => toggleRequisicion(req.id!)}>
                        {isExpanded ? <VisibilityIcon /> : <VisibilityIcon />}
                      </IconButton>
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="h6">{req.numero}</Typography>
                          {req.respaldo_documental && req.respaldo_documental.length > 0 && (
                            <Chip 
                              label={`${req.respaldo_documental.length} archivo(s)`} 
                              size="small" 
                              color="info"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {req.conceptos?.length || 0} conceptos - Total: ${req.total.toLocaleString('es-MX')}
                        </Typography>
                      </Box>
                    </Box>
                    <Box display="flex" gap={1} alignItems="center">
                      <Chip label={req.estado} color={req.estado === 'aprobada' ? 'success' : 'default'} size="small" />
                      <Button size="small" onClick={() => handleSelectAllRequisicion(req.id!, req.conceptos!)}>
                        {todosSeleccionados ? 'Deseleccionar' : 'Seleccionar'} Todo
                      </Button>
                    </Box>
                  </Box>

                  {isExpanded && (
                    <>
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
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {req.conceptos.map((concepto) => (
                                <TableRow key={concepto.concepto_contrato_id} hover>
                                  <TableCell padding="checkbox">
                                    <Checkbox
                                      checked={reqConceptosSeleccionados.has(concepto.concepto_contrato_id)}
                                      onChange={() => handleToggleConcepto(req.id!, concepto.concepto_contrato_id)}
                                    />
                                  </TableCell>
                                  <TableCell><Typography variant="body2">{concepto.clave}</Typography></TableCell>
                                  <TableCell><Typography variant="body2">{concepto.concepto}</Typography></TableCell>
                                  <TableCell align="right">{concepto.cantidad_esta_requisicion}</TableCell>
                                  <TableCell align="right">
                                    ${concepto.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography fontWeight={600} color="success.dark">
                                      ${concepto.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ))}
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
