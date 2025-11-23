import React, { useState, useEffect } from 'react';
import { RequisicionPago } from '@/types/requisicion-pago';
import { SolicitudPago } from '@/types/solicitud-pago';
import { db } from '@/db/database';
import { useContratos } from '@/lib/hooks/useContratos';
import { useAuth } from '@/context/AuthContext';
import { SolicitudPagoForm } from '@/components/obra/SolicitudPagoForm';
import { VistoBuenoSolicitudDialog } from '@/components/obra/VistoBuenoSolicitudDialog';
import { useProyectoStore } from '@/stores/proyectoStore';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Schedule as ClockIcon,
  Cancel as XCircleIcon,
  Send as SendIcon,
  AttachMoney as AttachMoneyIcon,
  Description as DescriptionIcon,
  ThumbUp as ThumbUpIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { syncService } from '../../sync/syncService';

export const SolicitudesPagoPage: React.FC = () => {
  const { perfil } = useAuth();
  const { proyectos } = useProyectoStore();
  const proyectoActual = proyectos[0];
  const [solicitudes, setSolicitudes] = useState<SolicitudPago[]>([]);
  const [requisiciones, setRequisiciones] = useState<RequisicionPago[]>([]);
  const [loading, setLoading] = useState(true);
  const { contratos } = useContratos();
  const [mostrarFormSolicitud, setMostrarFormSolicitud] = useState(false);
  const [solicitudVoBo, setSolicitudVoBo] = useState<SolicitudPago | null>(null);
  const [solicitudVer, setSolicitudVer] = useState<SolicitudPago | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Determinar el estado real basado en estatus_pago y Vo.Bo.
  const getEstadoReal = (solicitud: SolicitudPago): SolicitudPago['estado'] => {
    // Si está pagada según estatus_pago, el estado debe ser 'pagada'
    if (solicitud.estatus_pago === 'PAGADO') {
      return 'pagada';
    }
    
    // Si tiene ambos Vo.Bo., está aprobada
    if (solicitud.vobo_desarrollador && solicitud.vobo_finanzas) {
      return 'aprobada';
    }
    
    // Siempre mantener pendiente hasta que se apruebe
    return solicitud.estado || 'pendiente';
    
    // Si tiene fecha_pago o comprobante, está pagada
    if (solicitud.fecha_pago || solicitud.comprobante_pago_url) {
      return 'pagada';
    }
    
    // De lo contrario, mantener estado actual o pendiente
    return solicitud.estado || 'pendiente';
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const solicitudesData = await db.solicitudes_pago.toArray();
      const requisicionesData = await db.requisiciones_pago.toArray();
      
      // Corregir estados inconsistentes
      const solicitudesCorregidas = await Promise.all(
        solicitudesData.map(async (solicitud) => {
          const estadoReal = getEstadoReal(solicitud);
          
          // Si el estado no coincide con la realidad, actualizarlo
          if (solicitud.estado !== estadoReal) {
            console.log(`⚠️ Corrigiendo estado de ${solicitud.folio}: ${solicitud.estado} → ${estadoReal}`);
            const solicitudActualizada = { ...solicitud, estado: estadoReal };
            await db.solicitudes_pago.put(solicitudActualizada);
            return solicitudActualizada;
          }
          
          return solicitud;
        })
      );
      
      setSolicitudes(solicitudesCorregidas.sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      ));
      setRequisiciones(requisicionesData);
      
      // Sincronizar cambios si se corrigieron estados
      if (solicitudesCorregidas.some((s, i) => s.estado !== solicitudesData[i].estado)) {
        await syncService.forcePush();
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSolicitudEstadoBadge = (estado: SolicitudPago['estado']) => {
    const config = {
      pendiente: { color: 'warning' as const, icon: <ClockIcon sx={{ fontSize: 16 }} />, label: 'Pendiente' },
      aprobada: { color: 'success' as const, icon: <CheckCircleIcon sx={{ fontSize: 16 }} />, label: 'Aprobada' },
      pagada: { color: 'secondary' as const, icon: <AttachMoneyIcon sx={{ fontSize: 16 }} />, label: 'Pagada' },
      rechazada: { color: 'error' as const, icon: <XCircleIcon sx={{ fontSize: 16 }} />, label: 'Rechazada' }
    };

    const { color, icon, label } = config[estado];

    return (
      <Chip
        icon={icon}
        label={label}
        color={color}
        size="small"
        sx={{ fontWeight: 600 }}
      />
    );
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 2, md: 3 } }}>
      <Container maxWidth={false} sx={{ px: { xs: 2, sm: 2, md: 2, lg: 3, xl: 4 }, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{ mb: 3 }}
          >
            <Box>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
                <CheckCircleIcon sx={{ fontSize: 32, color: 'success.main' }} />
                <Typography variant="h4" fontWeight="bold" color="text.primary">
                  Solicitudes de Pago
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Gestiona tus solicitudes de pago creadas
              </Typography>
            </Box>
            {/* Botón Nueva Solicitud - Solo para roles administrativos */}
            {perfil?.roles && !perfil.roles.includes('CONTRATISTA') && !perfil.roles.includes('USUARIO') && (
              <Box>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => setMostrarFormSolicitud(true)}
                  startIcon={<SendIcon />}
                  sx={{
                    px: 4,
                    fontWeight: 600,
                    boxShadow: 3,
                    '&:hover': { boxShadow: 6 }
                  }}
                >
                  Nueva Solicitud
                </Button>
              </Box>
            )}
          </Stack>
        </Box>

        {/* Tabla de Solicitudes */}
        {loading ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Stack alignItems="center" spacing={2}>
              <CircularProgress size={40} />
              <Typography variant="body1" color="text.secondary" fontWeight={500}>
                Cargando solicitudes...
              </Typography>
            </Stack>
          </Paper>
        ) : solicitudes.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <DescriptionIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.primary" fontWeight={600} gutterBottom>
              No hay solicitudes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Crea tu primera solicitud de pago presionando el botón "Nueva Solicitud"
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} elevation={2} sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 1200 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#334155' }}>
                  <TableCell sx={{ color: '#fff', fontWeight: 700, py: 1.25, width: 120 }}>Folio</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 700, py: 1.25, width: 140 }}>Requisición</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 700, py: 1.25, width: 120 }}>Fecha</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 700, py: 1.25, width: 150 }}>Fecha Esperada Pago</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 700, py: 1.25, width: 220 }}>Estado</TableCell>
                  <TableCell align="right" sx={{ color: '#fff', fontWeight: 700, py: 1.25, width: 100 }}>Conceptos</TableCell>
                  <TableCell align="right" sx={{ color: '#fff', fontWeight: 700, py: 1.25, width: 150 }}>Total</TableCell>
                  <TableCell align="center" sx={{ color: '#fff', fontWeight: 700, py: 1.25, width: 120 }}>Factura</TableCell>
                  <TableCell align="center" sx={{ color: '#fff', fontWeight: 700, py: 1.25, width: 150 }}>Vo.Bo. / Pago</TableCell>
                  <TableCell align="center" sx={{ color: '#fff', fontWeight: 700, py: 1.25, width: 100 }}>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {solicitudes.map((solicitud) => {
                  const requisicion = requisiciones.find(r => r.id?.toString() === solicitud.requisicion_id.toString());
                  return (
                    <TableRow key={solicitud.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} color="primary">
                          {solicitud.folio}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {requisicion?.numero || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(solicitud.fecha).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} color="info.main">
                          {solicitud.fecha_pago_esperada
                            ? new Date(solicitud.fecha_pago_esperada).toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })
                            : '—'
                          }
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          {getSolicitudEstadoBadge(solicitud.estado)}
                          {solicitud.estatus_pago === 'PAGADO' && (
                            <Chip 
                              label="PAGADO" 
                              size="small" 
                              sx={{ 
                                bgcolor: 'success.main', 
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '0.7rem'
                              }} 
                            />
                          )}
                          {solicitud.estatus_pago === 'PAGADO PARCIALMENTE' && (
                            <Chip 
                              label="PARCIAL" 
                              size="small" 
                              sx={{ 
                                bgcolor: 'warning.main', 
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '0.7rem'
                              }} 
                            />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {solicitud.concepto_ids.length}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700} color="success.dark">
                          ${solicitud.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {requisicion?.factura_url ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<DescriptionIcon />}
                            onClick={() => window.open(requisicion.factura_url, '_blank')}
                          >
                            Ver
                          </Button>
                        ) : (
                          <Tooltip title="Se requiere factura para dar Vo.Bo.">
                            <Chip 
                              label="Sin factura" 
                              size="small" 
                              color="error"
                              variant="outlined"
                              sx={{ fontWeight: 600 }}
                            />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                          {/* Vo.Bo. Desarrollador */}
                          {solicitud.vobo_desarrollador ? (
                            <Tooltip title={`Vo.Bo. Desarrollador: ${solicitud.vobo_desarrollador_por || 'Aprobado'}`}>
                              <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                            </Tooltip>
                          ) : (
                            <Tooltip title="Vo.Bo. Desarrollador pendiente">
                              <ClockIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                            </Tooltip>
                          )}
                          
                          {/* Vo.Bo. Finanzas */}
                          {solicitud.vobo_finanzas ? (
                            <Tooltip title={`Vo.Bo. Finanzas: ${solicitud.vobo_finanzas_por || 'Aprobado'}`}>
                              <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                            </Tooltip>
                          ) : (
                            <Tooltip title="Vo.Bo. Finanzas pendiente">
                              <ClockIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                            </Tooltip>
                          )}
                          
                          {/* Indicador de Pago */}
                          {solicitud.estatus_pago === 'PAGADO' && (
                            <Tooltip title={`Pagado el ${solicitud.fecha_pago ? new Date(solicitud.fecha_pago).toLocaleDateString('es-MX') : 'N/A'}`}>
                              <AttachMoneyIcon sx={{ color: 'success.dark', fontSize: 22, fontWeight: 'bold' }} />
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                          {/* Botón Vo.Bo. - Solo para SUPERVISION_ELARA y GERENTE_PLATAFORMA */}
                          {!solicitud.vobo_gerencia && 
                           solicitud.estado === 'pendiente' && 
                           perfil?.roles && 
                           (perfil.roles.includes('SUPERVISION_ELARA') || 
                            perfil.roles.includes('GERENTE_PLATAFORMA') ||
                            perfil.roles.includes('Gerente Plataforma')) && (
                            <Tooltip title={
                              !requisicion?.factura_url 
                                ? "No se puede dar Vo.Bo. sin factura" 
                                : "Dar Visto Bueno"
                            }>
                              <span>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => {
                                    if (!requisicion?.factura_url) {
                                      alert('⚠️ No se puede dar Visto Bueno sin factura.\n\nPor favor, solicita al contratista que suba la factura en la requisición antes de aprobar.');
                                      return;
                                    }
                                    setSolicitudVoBo(solicitud);
                                  }}
                                  disabled={!requisicion?.factura_url}
                                  sx={{
                                    bgcolor: requisicion?.factura_url ? 'primary.lighter' : 'action.disabledBackground',
                                    '&:hover': { bgcolor: requisicion?.factura_url ? 'primary.light' : 'action.disabledBackground' },
                                    '&.Mui-disabled': {
                                      bgcolor: 'action.disabledBackground',
                                      color: 'action.disabled'
                                    }
                                  }}
                                >
                                  <ThumbUpIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                          {solicitud.vobo_gerencia && (
                            <Chip 
                              label="Vo.Bo. Dado" 
                              size="small" 
                              color="success"
                              sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                            />
                          )}
                          
                          {/* Botón Ver */}
                          <Tooltip title="Ver solicitud">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => setSolicitudVer(solicitud)}
                              sx={{
                                bgcolor: 'info.lighter',
                                '&:hover': { bgcolor: 'info.light' }
                              }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>

      {/* Modal Formulario de Nueva Solicitud */}
      <SolicitudPagoForm
        open={mostrarFormSolicitud}
        onClose={() => setMostrarFormSolicitud(false)}
        onSave={async () => { 
          await syncService.forcePush(); 
          await loadData();
          setMostrarFormSolicitud(false); 
        }}
        proyectoId={proyectoActual?.id}
      />

      {/* Modal Ver Solicitud (Solo Lectura) */}
      <Dialog
        open={!!solicitudVer}
        onClose={() => setSolicitudVer(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={600}>
              Solicitud {solicitudVer?.folio}
            </Typography>
            <IconButton onClick={() => setSolicitudVer(null)} size="small">
              <XCircleIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {solicitudVer && (
            <Stack spacing={2}>
              {/* Info General */}
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>Información General</Typography>
                <Stack spacing={1}>
                  <Typography variant="body2"><strong>Requisición:</strong> {requisiciones.find(r => r.id === solicitudVer.requisicion_id)?.numero || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Fecha:</strong> {new Date(solicitudVer.fecha).toLocaleDateString('es-MX')}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" component="span"><strong>Estado:</strong></Typography>
                    {getSolicitudEstadoBadge(solicitudVer.estado)}
                  </Box>
                  <Typography variant="body2"><strong>Total:</strong> ${solicitudVer.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                  {solicitudVer.notas && (
                    <Typography variant="body2"><strong>Notas:</strong> {solicitudVer.notas}</Typography>
                  )}
                </Stack>
              </Paper>

              {/* Documentos de la Requisición */}
              {(() => {
                const requisicion = requisiciones.find(r => r.id === solicitudVer.requisicion_id);
                if (requisicion?.respaldo_documental && requisicion.respaldo_documental.length > 0) {
                  return (
                    <Paper sx={{ p: 2, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.main' }}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ color: 'info.dark' }}>
                        📎 Documentos de la Requisición
                      </Typography>
                      <Stack spacing={1}>
                        {requisicion.respaldo_documental.map((url, idx) => {
                          const fileName = url.split('/').pop() || 'archivo';
                          const fileExtension = fileName.split('.').pop()?.toUpperCase() || 'FILE';
                          return (
                            <Box 
                              key={idx}
                              component="a"
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1,
                                p: 1,
                                bgcolor: 'white',
                                borderRadius: 1,
                                textDecoration: 'none',
                                color: 'inherit',
                                '&:hover': { bgcolor: 'action.hover', textDecoration: 'underline' }
                              }}
                            >
                              <Chip 
                                label={fileExtension} 
                                size="small" 
                                color={fileExtension === 'PDF' ? 'error' : 'success'}
                                sx={{ minWidth: 50 }}
                              />
                              <Typography variant="body2">
                                {fileName}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Stack>
                    </Paper>
                  );
                }
                return null;
              })()}

              {/* Factura de la Requisición */}
              {(() => {
                const requisicion = requisiciones.find(r => r.id === solicitudVer.requisicion_id);
                if (requisicion?.factura_url) {
                  const fileName = requisicion.factura_url.split('/').pop() || 'factura.pdf';
                  return (
                    <Paper sx={{ p: 2, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.main' }}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ color: 'warning.dark' }}>
                        🧾 Factura
                      </Typography>
                      <Box 
                        component="a"
                        href={requisicion.factura_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          p: 1,
                          bgcolor: 'white',
                          borderRadius: 1,
                          textDecoration: 'none',
                          color: 'inherit',
                          '&:hover': { bgcolor: 'action.hover', textDecoration: 'underline' }
                        }}
                      >
                        <Chip 
                          label="PDF" 
                          size="small" 
                          color="error"
                          sx={{ minWidth: 50 }}
                        />
                        <Typography variant="body2">
                          {fileName}
                        </Typography>
                      </Box>
                    </Paper>
                  );
                }
                return null;
              })()}

              {/* Conceptos */}
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>Conceptos ({solicitudVer.conceptos_detalle.length})</Typography>
                <Stack spacing={1}>
                  {solicitudVer.conceptos_detalle.map((concepto, idx) => (
                    <Box key={idx} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="body2" fontWeight={500}>{concepto.concepto_descripcion}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Clave: {concepto.concepto_clave} | Cantidad: {concepto.cantidad} | P.U.: ${concepto.precio_unitario.toLocaleString('es-MX')} | Importe: ${concepto.importe.toLocaleString('es-MX')}
                      </Typography>
                      
                      {/* Documentos de Respaldo */}
                      {concepto.respaldo_documental && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.light' }}>
                          <Typography variant="caption" fontWeight={600} sx={{ color: 'info.dark', display: 'block', mb: 0.5 }}>
                            📎 Documento
                          </Typography>
                          {(() => {
                            const urls = concepto.respaldo_documental.split(',').map(u => u.trim());
                            return urls.map((url, urlIdx) => {
                              const fileName = url.split('/').pop() || 'archivo';
                              const fileExtension = fileName.split('.').pop()?.toUpperCase() || 'FILE';
                              return (
                                <Box 
                                  key={urlIdx}
                                  component="a"
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 0.5,
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    '&:hover': { textDecoration: 'underline' }
                                  }}
                                >
                                  <Chip 
                                    label={fileExtension} 
                                    size="small" 
                                    color={fileExtension === 'PDF' ? 'error' : 'success'}
                                    sx={{ minWidth: 45, height: 20, fontSize: '0.65rem' }}
                                  />
                                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                                    {fileName}
                                  </Typography>
                                </Box>
                              );
                            });
                          })()}
                        </Box>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Paper>

              {/* Estado de Pagos */}
              {(solicitudVer.monto_pagado || solicitudVer.fecha_pago) && (
                <Paper sx={{ p: 2, bgcolor: 'success.lighter' }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>Información de Pago</Typography>
                  <Stack spacing={1}>
                    {solicitudVer.monto_pagado && (
                      <Typography variant="body2"><strong>Monto Pagado:</strong> ${solicitudVer.monto_pagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    )}
                    {solicitudVer.fecha_pago && (
                      <Typography variant="body2"><strong>Fecha de Pago:</strong> {new Date(solicitudVer.fecha_pago).toLocaleDateString('es-MX')}</Typography>
                    )}
                    {solicitudVer.referencia_pago && (
                      <Typography variant="body2"><strong>Referencia:</strong> {solicitudVer.referencia_pago}</Typography>
                    )}
                  </Stack>
                </Paper>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de Visto Bueno */}
      <VistoBuenoSolicitudDialog
        open={!!solicitudVoBo}
        solicitud={solicitudVoBo}
        onClose={() => setSolicitudVoBo(null)}
        onSaved={async () => { await syncService.forcePush(); await loadData(); }}
      />
    </Box>
  );
};

export default SolicitudesPagoPage;
