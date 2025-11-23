import React, { useState, useEffect } from 'react';
import { SolicitudPago } from '@/types/solicitud-pago';
import { RequisicionPago } from '@/types/requisicion-pago';
import { db } from '@/db/database';
import { useContratos } from '@/lib/hooks/useContratos';
import { useContratistas } from '@/lib/hooks/useContratistas';
import { useAuth } from '@/context/AuthContext';
import { useContratistaFilters } from '@/lib/hooks/useContratistaFilters';
import { DesgloseSolicitudModal } from '@/components/obra/DesgloseSolicitudModal';
import { SimpleFileUpload } from '@/components/general/SimpleFileUpload';
import { useProyectoStore } from '@/stores/proyectoStore';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select as MuiSelect,
  Stack,
  Typography,
  Checkbox,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  IconButton,
} from '@mui/material';
import {
  AttachMoney as AttachMoneyIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ClockIcon,
  Cancel as XCircleIcon,
  ThumbUp as ThumbUpIcon,
  Visibility as VisibilityIcon,
  Description as FileIcon,
  Assessment as AssessmentIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import { syncService } from '../../sync/syncService';

export const RegistroPagosPage: React.FC = () => {
  const { perfil } = useAuth();
  const { proyectos } = useProyectoStore();
  const proyectoActual = proyectos[0];
  const [solicitudes, setSolicitudes] = useState<SolicitudPago[]>([]);
  const [requisiciones, setRequisiciones] = useState<RequisicionPago[]>([]);
  const [loading, setLoading] = useState(true);
  const { contratos } = useContratos();
  const { contratistas } = useContratistas();
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudPago | null>(null);
  const [mostrarDesglose, setMostrarDesglose] = useState(false);
  
  // Filtros
  const [filtroEstatus, setFiltroEstatus] = useState<string>('');

  // Hook para filtros de contratista
  const { filterSolicitudes, isContratista } = useContratistaFilters();

  // Permisos basados en ROLES
  const userRole = perfil?.roles?.[0] || perfil?.nivel || '';
  const esContratista = userRole === 'CONTRATISTA' || userRole === 'USUARIO';
  const canApproveDesa = userRole && ['DESARROLLADOR', 'Sistemas', 'SISTEMAS', 'Gerente Plataforma', 'Desarrollador'].includes(userRole);
  // Gerente Plataforma y Sistemas TAMBIÉN pueden dar Vo.Bo. de Finanzas (son todopoderosos)
  const canApproveFinanzas = userRole && ['FINANZAS', 'Gerente Plataforma', 'Sistemas', 'SISTEMAS'].includes(userRole);
  // Mostrar Vo.Bo. Finanzas solo si NO eres FINANZAS puro (Gerente Plataforma y Sistemas ven TODO)
  const mostrarVoBoFinanzas = userRole !== 'FINANZAS';
  // Contratistas NO pueden editar ni subir nada
  const canEditOrUpload = !esContratista;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Sincronizar automÃ¡ticamente si hay internet
      if (navigator.onLine) {
        try {
          console.log('ðŸ”„ Sincronizando solicitudes automÃ¡ticamente...');
          await syncService.syncAll();
          console.log('âœ… SincronizaciÃ³n completada');
        } catch (syncError) {
          console.warn('âš ï¸ Error en sincronizaciÃ³n automÃ¡tica:', syncError);
        }
      }
      
      const solicitudesData = await db.solicitudes_pago.toArray();
      const requisicionesData = await db.requisiciones_pago.toArray();
      
      // 🔒 Filtrar solo solicitudes con Vo.Bo. de gerencia
      // TEMPORALMENTE DESHABILITADO - Mostrar todas las solicitudes
      let solicitudesConVoBo = solicitudesData; // .filter(s => s.vobo_gerencia === true);
      
      // 🔒 Si es contratista, filtrar solo sus solicitudes
      if (esContratista && perfil?.contratista_id) {
        solicitudesConVoBo = solicitudesConVoBo.filter(s => {
          const requisicion = requisicionesData.find(r => r.id?.toString() === s.requisicion_id?.toString());
          const contrato = contratos.find(c => c.id === requisicion?.contrato_id);
          return contrato?.contratista_id === perfil.contratista_id;
        });
      }
      
      console.log('📊 Total solicitudes en DB:', solicitudesData.length);
      console.log('📊 Solicitudes con Vo.Bo:', solicitudesData.filter(s => s.vobo_gerencia).length);
      console.log('📊 Solicitudes filtradas para usuario:', solicitudesConVoBo.length);
      
      setSolicitudes(solicitudesConVoBo.sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      ));
      setRequisiciones(requisicionesData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVoBoDesa = async (solicitud: SolicitudPago, checked: boolean) => {
    if (!canApproveDesa) {
      alert('No tienes permisos para dar Vo.Bo. de Desarrollador');
      return;
    }

    try {
      // Determinar si ambos Vo.Bo. estarÃ¡n activos
      const ambosVoBos = checked && solicitud.vobo_finanzas;
      
      const updated: SolicitudPago = {
        ...solicitud,
        vobo_desarrollador: checked,
        vobo_desarrollador_por: checked ? (perfil?.email || userRole || 'Usuario') : undefined,
        vobo_desarrollador_fecha: checked ? new Date().toISOString() : undefined,
        estado: ambosVoBos ? 'aprobada' : solicitud.estado, // âœ… Auto-aprobar
        _dirty: true,
      };

      await db.solicitudes_pago.put(updated);
      await syncService.forcePush();
      await loadData();
      alert(checked ? 'Vo.Bo. Desarrollador registrado' : 'Vo.Bo. Desarrollador removido');
    } catch (error) {
      console.error('Error actualizando Vo.Bo. Desa:', error);
      alert('Error al actualizar Vo.Bo.');
    }
  };

  const handleVoBoFinanzas = async (solicitud: SolicitudPago, checked: boolean) => {
    if (!canApproveFinanzas) {
      alert('No tienes permisos para dar Vo.Bo. de Finanzas');
      return;
    }

    try {
      // Determinar si ambos Vo.Bo. estarÃ¡n activos despuÃ©s de este cambio
      const ambosVoBos = checked && solicitud.vobo_desarrollador;
      
      const updated: SolicitudPago = {
        ...solicitud,
        vobo_finanzas: checked,
        vobo_finanzas_por: checked ? (perfil?.email || userRole || 'Usuario') : undefined,
        vobo_finanzas_fecha: checked ? new Date().toISOString() : undefined,
        estado: ambosVoBos ? 'aprobada' : solicitud.estado, // âœ… Actualizar estado si ambos VoBos
        _dirty: true,
      };

      await db.solicitudes_pago.put(updated);
      await syncService.forcePush();
      await loadData();
      alert(checked ? 'Vo.Bo. Finanzas registrado' : 'Vo.Bo. Finanzas removido');
    } catch (error) {
      console.error('Error actualizando Vo.Bo. Finanzas:', error);
      alert('Error al actualizar Vo.Bo.');
    }
  };



  const handleComprobanteSubido = async (solicitud: SolicitudPago, url: string) => {
    try {
      console.group('ðŸ“Ž COMPROBANTE SUBIDO - PAGO COMPLETO');
      console.log('URL recibida:', url);
      console.log('Solicitud ID:', solicitud.id);
      
      if (!url) {
        console.error('âŒ URL vacÃ­a recibida');
        console.groupEnd();
        alert('âŒ Error: No se recibiÃ³ URL vÃ¡lida del archivo');
        return;
      }

      // ðŸŽ¯ PAGO COMPLETO: Marcar toda la solicitud como PAGADA
      const fechaPago = new Date().toISOString();
      
      // Marcar TODOS los conceptos como pagados
      const conceptosActualizados = solicitud.conceptos_detalle.map(c => ({
        ...c,
        pagado: true,
        monto_pagado: c.importe,
        comprobante_url: url, // Mismo comprobante para todos
        fecha_pago: fechaPago,
      }));

      const updated: SolicitudPago = {
        ...solicitud,
        comprobante_pago_url: url,
        conceptos_detalle: conceptosActualizados,
        estatus_pago: 'PAGADO',
        estado: 'pagada', // âœ… Actualizar estado tambiÃ©n
        monto_pagado: solicitud.total,
        fecha_pago: fechaPago,
        _dirty: true,
      };

      console.log('ðŸ’° Marcando solicitud completa como PAGADA:', {
        total: solicitud.total,
        conceptos_pagados: conceptosActualizados.length,
        fecha_pago: fechaPago,
      });

      const result = await db.solicitudes_pago.put(updated);
      console.log('âœ… Guardado en DB. ID:', result);
      
      // Actualizar el estado local inmediatamente
      setSolicitudes(prev => {
        const newState = prev.map(s => {
          if (s.id === solicitud.id) {
            console.log('âœ… Actualizando estado local para solicitud:', s.id);
            return updated;
          }
          return s;
        });
        console.log('Nuevas solicitudes en estado:', newState.length);
        return newState;
      });
      
      console.log('Iniciando sincronizaciÃ³n con servidor...');
      // Sincronizar con el servidor
      syncService.forcePush().then(() => {
        console.log('âœ… SincronizaciÃ³n completada');
      }).catch(err => {
        console.error('âš ï¸ Error sincronizando:', err);
      });
      
      console.groupEnd();
      
      // Confirmar al usuario
      setTimeout(() => {
        alert('âœ… Pago completo registrado!\n\n' +
              `â€¢ Total pagado: $${solicitud.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n` +
              `â€¢ ${conceptosActualizados.length} conceptos marcados como pagados\n` +
              'â€¢ Estatus: PAGADO');
      }, 800);
    } catch (error) {
      console.error('âŒ Error guardando comprobante:', error);
      console.groupEnd();
      alert('âŒ Error al guardar el comprobante: ' + (error instanceof Error ? error.message : 'Desconocido'));
    }
  };

  const handleAbrirDesglose = (solicitud: SolicitudPago) => {
    setSolicitudSeleccionada(solicitud);
    setMostrarDesglose(true);
  };

  const getEstatusPagoBadge = (estatus?: string) => {
    if (!estatus) return <Chip label="NO PAGADO" color="default" size="small" />;
    
    const config = {
      'NO PAGADO': { color: 'default' as const },
      'PAGADO': { color: 'success' as const },
      'PAGADO PARCIALMENTE': { color: 'warning' as const }
    };

    const color = config[estatus as keyof typeof config]?.color || 'default';
    return <Chip label={estatus} color={color} size="small" sx={{ fontWeight: 600 }} />;
  };

  const solicitudesFiltradas = solicitudes.filter(sol => {
    if (filtroEstatus && sol.estatus_pago !== filtroEstatus) return false;
    return true;
  });

  const totalPendiente = solicitudesFiltradas
    .filter(s => s.estatus_pago === 'NO PAGADO')
    .reduce((sum, s) => sum + s.total, 0);

  const totalPagado = solicitudesFiltradas
    .filter(s => s.estatus_pago === 'PAGADO')
    .reduce((sum, s) => sum + s.total, 0);

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 2, md: 3 } }}>
      <Container maxWidth={false} sx={{ px: { xs: 2, sm: 2, md: 2, lg: 3, xl: 4 }, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <AssessmentIcon sx={{ fontSize: 40, color: '#334155' }} />
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  Registro y Aprobación de Pagos
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Gestión completa de pagos por solicitud y concepto
                </Typography>
              </Box>
            </Stack>
            <Button
              variant="outlined"
              onClick={async () => {
                try {
                  await syncService.syncAll();
                  await loadData();
                  alert('âœ… SincronizaciÃ³n completada');
                } catch (error) {
                  console.error('Error sincronizando:', error);
                  alert('âŒ Error en sincronizaciÃ³n');
                }
              }}
            >
              Sincronizar
            </Button>
          </Stack>
        </Box>

        {/* Resumen */}
        <Paper sx={{ p: { xs: 2, md: 2.5 }, mb: 2 }}>
          <Typography variant="h6" gutterBottom fontWeight={600}>
            Resumen
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
            <Paper elevation={3} sx={{ p: 2.5, bgcolor: '#42a5f5', color: 'white', borderRadius: 2 }}>
              <Typography variant="body2" fontWeight={500} sx={{ opacity: 0.9 }}>Total Pendiente</Typography>
              <Typography variant="h4" fontWeight={700}>
                ${totalPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </Typography>
            </Paper>
            <Paper elevation={3} sx={{ p: 2.5, bgcolor: '#66bb6a', color: 'white', borderRadius: 2 }}>
              <Typography variant="body2" fontWeight={500} sx={{ opacity: 0.9 }}>Total Pagado</Typography>
              <Typography variant="h4" fontWeight={700}>
                ${totalPagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </Typography>
            </Paper>
            <Paper elevation={3} sx={{ p: 2.5, bgcolor: '#ffa726', color: 'white', borderRadius: 2 }}>
              <Typography variant="body2" fontWeight={500} sx={{ opacity: 0.9 }}>Total Solicitudes</Typography>
              <Typography variant="h4" fontWeight={700}>
                {solicitudes.length}
              </Typography>
            </Paper>
          </Box>
        </Paper>

        {/* Filtros */}
        <Paper sx={{ p: { xs: 1.5, md: 2 }, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Estatus Pago</InputLabel>
              <MuiSelect
                value={filtroEstatus}
                onChange={(e) => setFiltroEstatus(e.target.value)}
                label="Estatus Pago"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="NO PAGADO">NO PAGADO</MenuItem>
                <MenuItem value="PAGADO">PAGADO</MenuItem>
                <MenuItem value="PAGADO PARCIALMENTE">PAGADO PARCIALMENTE</MenuItem>
              </MuiSelect>
            </FormControl>
          </Stack>
        </Paper>

        {/* Tabla */}
        {loading ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="body1" sx={{ mt: 2 }}>Cargando...</Typography>
          </Paper>
        ) : solicitudesFiltradas.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="h6">No hay solicitudes</Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} elevation={3} sx={{ maxHeight: { xs: 'calc(100vh - 360px)', md: 'calc(100vh - 320px)' }, overflowX: 'auto' }}>
            <Table stickyHeader size="medium" sx={{ minWidth: 1400 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>Folio</TableCell>
                  <TableCell sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>Requisición</TableCell>
                  <TableCell sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>Contrato</TableCell>
                  <TableCell sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>Contratista</TableCell>
                  <TableCell sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>Concepto General</TableCell>
                  <TableCell sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>Factura</TableCell>
                  <TableCell sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>Fecha</TableCell>
                  <TableCell sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>Fecha Pago Esperada</TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>Total</TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>Monto Pagado</TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>Faltante</TableCell>
                  <TableCell sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>Comprobante</TableCell>
                  <TableCell sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>Fecha Pago</TableCell>
                  <TableCell align="center" sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>Estatus</TableCell>
                  {canApproveDesa && (
                    <TableCell align="center" sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>Vo.Bo. Desarr.</TableCell>
                  )}
                  {mostrarVoBoFinanzas && (
                    <TableCell align="center" sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>Vo.Bo. Finanzas</TableCell>
                  )}
                  <TableCell sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, minWidth: 200, py: 1.5 }}>Observaciones</TableCell>
                  <TableCell align="center" sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>Detalles</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {solicitudesFiltradas.map((solicitud) => {
                  const requisicion = requisiciones.find(r => r.id?.toString() === solicitud.requisicion_id.toString());
                  const contrato = contratos.find(c => c.id === requisicion?.contrato_id);
                  const contratista = contratistas.find(ct => ct.id === contrato?.contratista_id);
                  const faltante = solicitud.total - (solicitud.monto_pagado || 0);
                  
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
                        <Typography variant="body2" fontWeight={600}>
                          {contrato?.numero_contrato || contrato?.clave_contrato || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {contratista?.nombre || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 250 }}>
                        <Typography variant="body2" noWrap title={requisicion?.descripcion_general || ''}>
                          {requisicion?.descripcion_general || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {requisicion?.factura_url ? (
                          <a href={requisicion.factura_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                            <Button size="small" startIcon={<FileIcon />} variant="outlined">
                              Ver Factura
                            </Button>
                          </a>
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
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
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700} color="success.dark">
                          ${solicitud.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          ${(solicitud.monto_pagado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color={faltante > 0 ? 'warning.main' : 'text.secondary'}>
                          ${faltante.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 180 }}>
                        {(() => {
                          // Validar que tenga ambos Vo.Bo. antes de subir comprobante
                          const tieneVoBoDesa = !!solicitud.vobo_desarrollador;
                          const tieneVoBoFinanzas = !!solicitud.vobo_finanzas;
                          const puedeSubirComprobante = tieneVoBoDesa && tieneVoBoFinanzas && canEditOrUpload;
                          
                          if (solicitud.comprobante_pago_url) {
                            // Ya hay comprobante - mostrar opciones de ver/cambiar
                            return (
                              <Stack direction="row" spacing={1}>
                                <a 
                                  href={solicitud.comprobante_pago_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{ textDecoration: 'none', flex: 1 }}
                                >
                                  <Button size="small" startIcon={<FileIcon />} variant="outlined" fullWidth>
                                    Ver archivo
                                  </Button>
                                </a>
                                <Tooltip title={puedeSubirComprobante ? "Cambiar comprobante" : "Requiere Vo.Bo. Desa. y Finanzas"}>
                                  <span>
                                    <IconButton
                                      size="small"
                                      disabled={!puedeSubirComprobante}
                                      onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'application/pdf,image/*';
                                        input.onchange = (e) => {
                                          const file = (e.target as HTMLInputElement).files?.[0];
                                          if (file) {
                                            // Trigger upload through SimpleFileUpload
                                            const fileEvent = new Event('change', { bubbles: true });
                                            document.getElementById(`catalogo-upload-${solicitud.id}`)?.dispatchEvent(fileEvent);
                                          }
                                        };
                                        input.click();
                                      }}
                                      sx={{ color: 'primary.main' }}
                                    >
                                      <CloudUploadIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </Stack>
                            );
                          }
                          
                          // No hay comprobante - validar antes de permitir subir
                          if (!puedeSubirComprobante) {
                            const faltantes = [];
                            if (!tieneVoBoDesa) faltantes.push('Vo.Bo. Desa.');
                            if (!tieneVoBoFinanzas) faltantes.push('Vo.Bo. Finanzas');
                            
                            return (
                              <Tooltip title={`âš ï¸ Requiere: ${faltantes.join(' y ')}`}>
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
                          
                          // Puede subir comprobante
                          return (
                            <SimpleFileUpload
                              onUploadComplete={(url) => handleComprobanteSubido(solicitud, url)}
                              accept={['application/pdf', 'image/*']}
                              uploadType="document"
                              compact
                            />
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {solicitud.fecha_pago 
                            ? new Date(solicitud.fecha_pago).toLocaleDateString('es-MX')
                            : '—'
                          }
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {getEstatusPagoBadge(solicitud.estatus_pago)}
                      </TableCell>
                      {canApproveDesa && (
                        <TableCell align="center">
                          {canApproveDesa && canEditOrUpload ? (
                            <Checkbox
                              checked={!!solicitud.vobo_desarrollador}
                              onChange={(e) => handleVoBoDesa(solicitud, e.target.checked)}
                              icon={<ThumbUpIcon />}
                              checkedIcon={<CheckCircleIcon />}
                              sx={{
                                color: 'success.main',
                                '&.Mui-checked': { color: 'success.main' },
                              }}
                            />
                          ) : solicitud.vobo_desarrollador ? (
                            <Tooltip title={`Aprobado por ${solicitud.vobo_desarrollador_por} el ${solicitud.vobo_desarrollador_fecha ? new Date(solicitud.vobo_desarrollador_fecha).toLocaleDateString('es-MX') : ''}`}>
                              <CheckCircleIcon sx={{ color: 'success.main' }} />
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.secondary">â€”</Typography>
                          )}
                        </TableCell>
                      )}
                      {mostrarVoBoFinanzas && (
                        <TableCell align="center">
                          {canApproveFinanzas && canEditOrUpload ? (
                            <Checkbox
                              checked={!!solicitud.vobo_finanzas}
                              onChange={(e) => handleVoBoFinanzas(solicitud, e.target.checked)}
                              icon={<ThumbUpIcon />}
                              checkedIcon={<CheckCircleIcon />}
                              sx={{
                                color: 'success.main',
                                '&.Mui-checked': { color: 'success.main' },
                              }}
                            />
                          ) : solicitud.vobo_finanzas ? (
                            <Tooltip title={`Aprobado por ${solicitud.vobo_finanzas_por} el ${solicitud.vobo_finanzas_fecha ? new Date(solicitud.vobo_finanzas_fecha).toLocaleDateString('es-MX') : ''}`}>
                              <CheckCircleIcon sx={{ color: 'success.main' }} />
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.secondary">â€”</Typography>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          multiline
                          maxRows={2}
                          value={solicitud.observaciones_desarrollador || ''}
                          onChange={async (e) => {
                            const updated = { ...solicitud, observaciones_desarrollador: e.target.value, _dirty: true };
                            await db.solicitudes_pago.put(updated);
                          }}
                          placeholder={canEditOrUpload ? "Agregar observación..." : "Sin observaciones"}
                          disabled={!canEditOrUpload}
                          InputProps={{
                            readOnly: !canEditOrUpload
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleAbrirDesglose(solicitud)}
                          startIcon={<VisibilityIcon />}
                        >
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>

      {/* Modal Desglose */}
      <DesgloseSolicitudModal
        open={mostrarDesglose}
        onClose={() => {
          setMostrarDesglose(false);
          setSolicitudSeleccionada(null);
        }}
        solicitud={solicitudSeleccionada}
        onSave={loadData}
        readOnly={esContratista}
      />
    </Box>
  );
};

export default RegistroPagosPage;
