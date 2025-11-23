import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RequisicionPago } from '@/types/requisicion-pago';
import { Contrato } from '@/types/contrato';
import { RequisicionPagoForm } from '@/components/obra/RequisicionPagoForm';
import { db } from '@/db/database';
import { useContratos } from '@/lib/hooks/useContratos';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
  Tooltip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  AttachMoney as AttachMoneyIcon,
  CalendarToday as CalendarTodayIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ClockIcon,
  Cancel as XCircleIcon,
  Send as SendIcon,
  ThumbUp as ThumbUpIcon,
  EventAvailable as EventAvailableIcon,
  Visibility as VisibilityIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import { syncService } from '../../sync/syncService';

export const RequisicionesPagoPage: React.FC = () => {
  const navigate = useNavigate();
  const [requisiciones, setRequisiciones] = useState<RequisicionPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRequisicion, setEditingRequisicion] = useState<RequisicionPago | undefined>();
  const [viewingRequisicion, setViewingRequisicion] = useState<RequisicionPago | undefined>();
  const [facturaOnlyMode, setFacturaOnlyMode] = useState(false);
  const [requisicionesEnSolicitud, setRequisicionesEnSolicitud] = useState<Set<string>>(new Set());
  
  // Usar el hook useContratos que maneja la sincronización con Supabase
  const { contratos } = useContratos();
  
  // Filtros
  const [filtroContrato, setFiltroContrato] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');

  useEffect(() => {
    console.log('📝 Contratos disponibles:', contratos.map(c => ({
      id: c.id,
      numero: c.numero_contrato,
      nombre: c.nombre
    })));
  }, [contratos]);

  useEffect(() => {
    loadData(false); // Cargar desde IndexedDB, solo sync si está vacío
  }, []);

  const loadData = async (forceFullSync = false) => {
    setLoading(true);
    try {
      // Siempre sincronizar para traer cambios recientes
      console.log('🔄 Sincronizando datos desde Supabase...');
      await syncService.forcePull(true); // Forzar sync completo siempre
      console.log('✅ Sincronización completada');
      
      const requisicionesData = await db.requisiciones_pago.toArray();
      
      // Cargar solicitudes para verificar qué requisiciones ya están en solicitudes
      const solicitudesData = await db.solicitudes_pago.toArray();
      const requisicionesConSolicitud = new Set(
        solicitudesData.map(s => s.requisicion_id).filter(Boolean)
      );
      
      // 💰 CALCULAR estatus_pago para cada requisición basado en solicitudes_pago
      const requisicionesConEstatus = requisicionesData.map(req => {
        // Buscar todas las solicitudes de esta requisición
        const solicitudesDeReq = solicitudesData.filter(s => s.requisicion_id === req.id);
        
        // Sumar todos los montos pagados
        const totalPagado = solicitudesDeReq.reduce((sum, sol) => sum + (sol.monto_pagado || 0), 0);
        
        // Calcular estatus_pago
        let estatus_pago: 'NO PAGADO' | 'PAGADO' | 'PAGADO PARCIALMENTE' = 'NO PAGADO';
        if (totalPagado > 0) {
          if (totalPagado >= req.total) {
            estatus_pago = 'PAGADO';
          } else {
            estatus_pago = 'PAGADO PARCIALMENTE';
          }
        }
        
        return {
          ...req,
          estatus_pago
        };
      });
      
      console.log('📋 Requisiciones con estatus calculado:', requisicionesConEstatus.map(r => ({
        numero: r.numero,
        total: r.total,
        totalPagado: solicitudesData
          .filter(s => s.requisicion_id === r.id)
          .reduce((sum, sol) => sum + (sol.monto_pagado || 0), 0),
        estatus_pago: r.estatus_pago,
        factura_url: r.factura_url ? 'SÍ' : 'NO'
      })));
      
      setRequisicionesEnSolicitud(requisicionesConSolicitud);
      setRequisiciones(requisicionesConEstatus.sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      ));
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    // Validar que hay al menos un contrato con catálogo aprobado
    const contratosConCatalogoAprobado = contratos.filter(c => c.catalogo_aprobado === true);
    
    if (contratosConCatalogoAprobado.length === 0) {
      alert(
        '⚠️ No hay contratos con catálogos aprobados.\n\n' +
        'Para crear requisiciones, primero:\n' +
        '1. El contratista debe subir el catálogo de conceptos\n' +
        '2. Un administrador debe aprobar el catálogo\n\n' +
        'Una vez aprobado el catálogo, podrá crear requisiciones.'
      );
      return;
    }

    // Limpiar todos los estados antes de abrir formulario nuevo
    setEditingRequisicion(undefined);
    setViewingRequisicion(undefined);
    setShowForm(true);
  };

  const handleEdit = (requisicion: RequisicionPago, facturaOnly = false) => {
    setEditingRequisicion(requisicion);
    setViewingRequisicion(undefined);
    setFacturaOnlyMode(facturaOnly);
    setShowForm(true);
  };

  const handleView = (requisicion: RequisicionPago) => {
    setViewingRequisicion(requisicion);
    setEditingRequisicion(undefined);
    setShowForm(true);
  };

  const handleSave = async (requisicion: RequisicionPago) => {
    try {
      if (editingRequisicion) {
        await db.requisiciones_pago.put(requisicion);
      } else {
        await db.requisiciones_pago.add(requisicion);
      }
      // Empuja cambios locales inmediatamente para reflejar en Supabase
      await syncService.forcePush();
      
      // NO hacer forcePull aquí porque Supabase tarda en reflejar cambios
      // Solo recargar desde IndexedDB local que ya tiene los datos actualizados
      const requisicionesData = await db.requisiciones_pago.toArray();
      const solicitudesData = await db.solicitudes_pago.toArray();
      const requisicionesConSolicitud = new Set(
        solicitudesData.map(s => s.requisicion_id).filter(Boolean)
      );
      
      // Calcular estatus_pago
      const requisicionesConEstatus = requisicionesData.map(req => {
        const solicitudesDeReq = solicitudesData.filter(s => s.requisicion_id === req.id);
        const totalPagado = solicitudesDeReq.reduce((sum, sol) => sum + (sol.monto_pagado || 0), 0);
        let estatus_pago: 'NO PAGADO' | 'PAGADO' | 'PAGADO PARCIALMENTE' = 'NO PAGADO';
        if (totalPagado > 0) {
          if (totalPagado >= req.total) {
            estatus_pago = 'PAGADO';
          } else {
            estatus_pago = 'PAGADO PARCIALMENTE';
          }
        }
        return { ...req, estatus_pago };
      });
      
      setRequisicionesEnSolicitud(requisicionesConSolicitud);
      setRequisiciones(requisicionesConEstatus.sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      ));
      
      setShowForm(false);
      setEditingRequisicion(undefined);
      setViewingRequisicion(undefined);
      setFacturaOnlyMode(false);
    } catch (error) {
      console.error('Error guardando requisición:', error);
      alert('Error al guardar la requisición');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta requisición?')) {
      return;
    }

    try {
      await db.requisiciones_pago.delete(id);
      await loadData();
    } catch (error) {
      console.error('Error eliminando requisición:', error);
      alert('Error al eliminar la requisición');
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRequisicion(undefined);
    setViewingRequisicion(undefined);
    setFacturaOnlyMode(false);
  };

  // Filtrar requisiciones
  const requisicionesFiltradas = requisiciones.filter(req => {
    if (filtroContrato && req.contrato_id !== filtroContrato) return false;
    if (filtroEstado && req.estado !== filtroEstado) return false;
    return true;
  });

  const getEstadoBadge = (estado: RequisicionPago['estado']) => {
    const config = {
      borrador: { color: 'default' as const, icon: <ClockIcon sx={{ fontSize: 16 }} /> },
      enviada: { color: 'info' as const, icon: <SendIcon sx={{ fontSize: 16 }} /> },
      aprobada: { color: 'success' as const, icon: <CheckCircleIcon sx={{ fontSize: 16 }} /> },
      pagada: { color: 'secondary' as const, icon: <AttachMoneyIcon sx={{ fontSize: 16 }} /> },
      cancelada: { color: 'error' as const, icon: <XCircleIcon sx={{ fontSize: 16 }} /> }
    };

    const { color, icon } = config[estado];

    return (
      <Chip
        icon={icon}
        label={estado.charAt(0).toUpperCase() + estado.slice(1)}
        color={color}
        size="small"
        sx={{ fontWeight: 600 }}
      />
    );
  };

  const getContratoNombre = (contratoId: string) => {
    const contrato = contratos.find(c => c.id === contratoId);
    return contrato ? `${contrato.numero_contrato} - ${contrato.nombre}` : 'N/A';
  };

  if (showForm) {
    return (
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 2, md: 3 } }}>
        <Container maxWidth={false} sx={{ px: { xs: 2, sm: 2, md: 2, lg: 3, xl: 4 }, mx: 'auto' }}>
          <RequisicionPagoForm
            requisicion={editingRequisicion || viewingRequisicion}
            contratos={contratos.filter(c => c.catalogo_aprobado === true)}
            onSave={handleSave}
            onCancel={handleCloseForm}
            readOnly={!!viewingRequisicion || facturaOnlyMode}
          />
        </Container>
      </Box>
    );
  }

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
                <DescriptionIcon sx={{ fontSize: 32, color: 'secondary.main' }} />
                <Typography variant="h4" fontWeight="bold" color="text.primary">
                  Requisiciones de Pago
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Gestión de requisiciones de pago por concepto
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AddIcon />}
              onClick={handleCreate}
              sx={{ 
                px: 3, 
                py: 1.5,
                fontWeight: 600,
                boxShadow: 2,
                '&:hover': { boxShadow: 4 }
              }}
            >
              Nueva Requisición
            </Button>
          </Stack>

          {/* Filtros */}
          <Paper elevation={1} sx={{ p: 3 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
              <FilterIcon color="secondary" />
              <Typography variant="h6" fontWeight="semibold">
                Filtros
              </Typography>
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Contrato</InputLabel>
                <Select
                  value={filtroContrato}
                  onChange={(e) => setFiltroContrato(e.target.value)}
                  label="Contrato"
                >
                  <MenuItem value="">Todos los contratos</MenuItem>
                  {contratos.map(contrato => (
                    <MenuItem key={contrato.id} value={contrato.id}>
                      {contrato.numero_contrato} - {contrato.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Estado</InputLabel>
                <Select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  label="Estado"
                >
                  <MenuItem value="">Todos los estados</MenuItem>
                  <MenuItem value="borrador">Borrador</MenuItem>
                  <MenuItem value="enviada">Enviada</MenuItem>
                  <MenuItem value="aprobada">Aprobada</MenuItem>
                  <MenuItem value="pagada">Pagada</MenuItem>
                  <MenuItem value="cancelada">Cancelada</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Paper>

          {/* Alerta de Requisiciones Bloqueadas */}
          {requisicionesEnSolicitud.size > 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Requisiciones protegidas
              </Typography>
              <Typography variant="body2">
                {requisicionesEnSolicitud.size} requisición(es) no se pueden editar porque ya están incluidas en solicitudes de pago. 
                Esto protege la integridad de los pagos y la contabilidad del proyecto.
              </Typography>
            </Alert>
          )}
        </Box>

        {/* Resumen */}
        {!loading && requisicionesFiltradas.length > 0 && (
          <Paper sx={{ mb: 3, p: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
              <DescriptionIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Resumen General
              </Typography>
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 2 }}>
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
                  borderColor: 'secondary.light',
                  border: 1
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="body2" fontWeight={500} color="secondary.dark">
                    Total Requisiciones
                  </Typography>
                  <DescriptionIcon color="secondary" />
                </Stack>
                <Typography variant="h3" fontWeight={700} color="secondary.dark">
                  {requisicionesFiltradas.length}
                </Typography>
              </Paper>
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                  borderColor: 'success.light',
                  border: 1
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="body2" fontWeight={500} color="success.dark">
                    Monto Total
                  </Typography>
                  <AttachMoneyIcon color="success" />
                </Stack>
                <Typography variant="h4" fontWeight={700} color="success.dark">
                  ${requisicionesFiltradas.reduce((sum, r) => sum + r.total, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </Typography>
              </Paper>
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                  borderColor: 'info.light',
                  border: 1,
                  gridColumn: { sm: 'span 2', lg: 'span 1' }
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="body2" fontWeight={500} color="info.dark">
                    Requisiciones Pagadas
                  </Typography>
                  <CheckCircleIcon color="info" />
                </Stack>
                <Typography variant="h3" fontWeight={700} color="info.dark">
                  {requisicionesFiltradas.filter(r => r.estado === 'pagada').length}
                </Typography>
                <Typography variant="caption" color="info.dark" sx={{ mt: 0.5 }}>
                  {requisicionesFiltradas.length > 0 ? ((requisicionesFiltradas.filter(r => r.estado === 'pagada').length / requisicionesFiltradas.length) * 100).toFixed(0) : 0}% del total
                </Typography>
              </Paper>
            </Box>
          </Paper>
        )}

        {/* Lista de Requisiciones */}
        {loading ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Stack alignItems="center" spacing={2}>
              <CircularProgress size={40} />
              <Typography variant="body1" color="text.secondary" fontWeight={500}>
                Cargando requisiciones...
              </Typography>
            </Stack>
          </Paper>
        ) : requisicionesFiltradas.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <DescriptionIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.primary" fontWeight={600} gutterBottom>
              No hay requisiciones
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {filtroContrato || filtroEstado 
                ? 'Intenta cambiar los filtros para ver más resultados'
                : 'Crea tu primera requisición de pago para comenzar'
              }
            </Typography>
            {!filtroContrato && !filtroEstado && (
              <Button
                onClick={handleCreate}
                variant="contained"
                startIcon={<AddIcon />}
                sx={{ mt: 1 }}
              >
                Nueva Requisición
              </Button>
            )}
          </Paper>
        ) : (
          <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
            <Table>
              <TableHead sx={{ '& th': { bgcolor: '#334155', color: '#fff', fontWeight: 700, py: 1.25 } }}>
                <TableRow>
                  <TableCell>Número</TableCell>
                  <TableCell>Contrato</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Conceptos</TableCell>
                  <TableCell align="center">Solicitud</TableCell>
                  <TableCell align="right">Monto</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="center">Factura</TableCell>
                  <TableCell align="center">Visto Bueno</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requisicionesFiltradas.map((requisicion) => {
                  const contrato = contratos.find(c => c.id === requisicion.contrato_id);
                  
                  // Debug para diagnosticar el problema
                  if (!contrato) {
                    console.log('⚠️ Contrato no encontrado para requisición:', {
                      requisicionId: requisicion.id,
                      contratoIdBuscado: requisicion.contrato_id,
                      contratosDisponibles: contratos.map(c => ({ id: c.id, numero: c.numero_contrato }))
                    });
                  }
                  
                  return (
                    <TableRow 
                      key={requisicion.id}
                      sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {requisicion.numero}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {contrato ? (
                          <>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                              {contrato.clave_contrato || contrato.numero_contrato || 'Sin número'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                              {contrato.nombre || contrato.categoria || 'Sin nombre'}
                            </Typography>
                          </>
                        ) : (
                          <>
                            <Typography variant="body2" color="error">N/A</Typography>
                            <Typography variant="caption" color="error">
                              ID: {requisicion.contrato_id?.substring(0, 8)}...
                            </Typography>
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(requisicion.fecha).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          {getEstadoBadge(requisicion.estado)}
                          {requisicion.estatus_pago === 'PAGADO' && (
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
                          {requisicion.estatus_pago === 'PAGADO PARCIALMENTE' && (
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
                      <TableCell>
                        <Typography variant="body2">
                          {requisicion.conceptos.length}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {requisicionesEnSolicitud.has(requisicion.id) ? (
                          <Chip 
                            label="SOLICITADA" 
                            size="small" 
                            color="info"
                            icon={<SendIcon />}
                            sx={{ 
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              bgcolor: '#3b82f6',
                              color: '#fff'
                            }}
                          />
                        ) : (
                          <Chip 
                            label="Disponible" 
                            size="small" 
                            variant="outlined"
                            color="success"
                            sx={{ 
                              fontSize: '0.7rem',
                              borderColor: '#10b981',
                              color: '#10b981'
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          ${requisicion.monto_estimado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700} color="success.dark">
                          ${requisicion.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {(requisicion.estado === 'enviada' || requisicion.estado === 'aprobada') ? (
                          requisicion.factura_url ? (
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              startIcon={<CheckCircleIcon />}
                              onClick={() => window.open(requisicion.factura_url, '_blank')}
                            >
                              Ver Factura
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              variant="contained"
                              color="warning"
                              startIcon={<CloudUploadIcon />}
                              onClick={() => handleEdit(requisicion, true)}
                            >
                              Subir Factura
                            </Button>
                          )
                        ) : (
                          <Chip 
                            label="-" 
                            size="small" 
                            variant="outlined"
                            sx={{ color: 'text.disabled', borderColor: 'divider' }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {requisicion.visto_bueno ? (
                          <Tooltip title={`Aprobada por ${requisicion.visto_bueno_por}`}>
                            <CheckCircleIcon sx={{ color: 'success.main' }} />
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          {requisicionesEnSolicitud.has(requisicion.id) ? (
                            <Tooltip title="Ver requisición (solo lectura)">
                              <IconButton
                                onClick={() => handleView(requisicion)}
                                color="info"
                                size="small"
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Tooltip 
                              title={
                                requisicion.estado === 'pagada'
                                  ? `No se puede editar una requisición ${requisicion.estado}`
                                  : "Editar requisición"
                              }
                            >
                              <span>
                                <IconButton
                                  onClick={() => handleEdit(requisicion)}
                                  color="primary"
                                  size="small"
                                  disabled={requisicion.estado === 'pagada'}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                          <Tooltip 
                            title={
                              requisicionesEnSolicitud.has(requisicion.id)
                                ? "🔒 Bloqueada: No se puede eliminar porque ya tiene solicitud de pago asociada"
                                : requisicion.estado === 'pagada'
                                ? `No se puede eliminar una requisición ${requisicion.estado}`
                                : "Eliminar requisición"
                            }
                          >
                            <span>
                              <IconButton
                                onClick={() => handleDelete(requisicion.id)}
                                color="error"
                                size="small"
                                disabled={requisicionesEnSolicitud.has(requisicion.id) || requisicion.estado === 'pagada'}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Descargar">
                            <IconButton
                              color="secondary"
                              size="small"
                            >
                              <DownloadIcon fontSize="small" />
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
    </Box>
  );
};

export default RequisicionesPagoPage;
