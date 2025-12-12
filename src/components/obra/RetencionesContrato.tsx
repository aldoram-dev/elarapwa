import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  IconButton,
  Chip,
  Alert,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { db } from '@/db/database';
import { CambioContrato, RetencionContrato } from '@/types/cambio-contrato';
import { Contrato } from '@/types/contrato';
import { syncService } from '@/sync/syncService';
import { v4 as uuidv4 } from 'uuid';

interface RetencionesContratoProps {
  contratoId: string;
  contrato?: Contrato | null;
  readOnly?: boolean;
}

interface RetencionContratoForm {
  descripcion: string;
  monto: number;
}

export const RetencionesContrato: React.FC<RetencionesContratoProps> = ({
  contratoId,
  contrato,
  readOnly = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [cambiosGuardados, setCambiosGuardados] = useState<CambioContrato[]>([]);
  const [detallesPorCambio, setDetallesPorCambio] = useState<{ [cambioId: string]: RetencionContrato[] }>({});
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  
  // Estado para agregar nueva retención
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<RetencionContratoForm>({
    descripcion: '',
    monto: 0,
  });

  // Estados para aprobación
  const [showAprobacionDialog, setShowAprobacionDialog] = useState(false);
  const [cambioAprobar, setCambioAprobar] = useState<CambioContrato | null>(null);
  const [accionAprobacion, setAccionAprobacion] = useState<'APROBAR' | 'RECHAZAR'>('APROBAR');
  const [notasAprobacion, setNotasAprobacion] = useState('');

  const montoContratoOriginal = contrato?.monto_contrato || 0;

  useEffect(() => {
    loadData();
  }, [contratoId]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔵 Cargando retenciones de contrato...');
      
      // Cargar TODOS los cambios tipo RETENCION
      const cambios = await db.cambios_contrato
        .where('contrato_id')
        .equals(contratoId)
        .and(c => c.tipo_cambio === 'RETENCION' && c.active !== false)
        .toArray();
      
      console.log(`🔵 Retenciones encontradas:`, cambios.length);
      setCambiosGuardados(cambios);
      
      // Cargar detalles de cada cambio
      const detallesMap: { [cambioId: string]: RetencionContrato[] } = {};
      for (const cambio of cambios) {
        const detalles = await db.retenciones_contrato
          .where('cambio_contrato_id')
          .equals(cambio.id)
          .and(d => d.active !== false)
          .toArray();
        
        console.log(`  Detalles para ${cambio.numero_cambio}:`, detalles.length);
        detallesMap[cambio.id] = detalles;
      }
      
      setDetallesPorCambio(detallesMap);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error cargando retenciones:', error);
      setLoading(false);
    }
  };

  const handleGuardarRetencion = async () => {
    if (!form.descripcion.trim() || form.monto <= 0) {
      alert('Por favor completa todos los campos');
      return;
    }

    try {
      console.log('💾 Guardando nueva retención...');
      
      // Generar folio único
      const cambiosExistentes = await db.cambios_contrato
        .where('contrato_id')
        .equals(contratoId)
        .and(c => c.tipo_cambio === 'RETENCION')
        .toArray();
      const numeroFolio = `RET-${String(cambiosExistentes.length + 1).padStart(3, '0')}`;

      const cambioId = uuidv4();
      const retencionId = uuidv4();

      // Crear cambio de contrato (header)
      const cambio: CambioContrato = {
        id: cambioId,
        contrato_id: contratoId,
        numero_cambio: numeroFolio,
        tipo_cambio: 'RETENCION',
        descripcion: form.descripcion,
        monto_cambio: 0, // Las retenciones no modifican el monto del contrato directamente
        monto_contrato_anterior: montoContratoOriginal,
        monto_contrato_nuevo: montoContratoOriginal,
        fecha_cambio: new Date().toISOString(),
        estatus: 'BORRADOR',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        active: true,
        _dirty: true,
      };

      // Crear detalle de retención
      const retencion: RetencionContrato = {
        id: retencionId,
        cambio_contrato_id: cambioId,
        descripcion: form.descripcion,
        monto: form.monto,
        monto_aplicado: 0,
        monto_regresado: 0,
        monto_disponible: form.monto,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        active: true,
        _dirty: true,
      };

      await db.cambios_contrato.add(cambio);
      await db.retenciones_contrato.add(retencion);
      
      await syncService.forcePush();
      await loadData();
      
      setShowDialog(false);
      setForm({ descripcion: '', monto: 0 });
      
      alert('✅ Retención creada exitosamente');
    } catch (error) {
      console.error('❌ Error guardando retención:', error);
      alert(`❌ Error: ${(error as Error).message}`);
    }
  };

  const toggleExpandido = (cambioId: string) => {
    const newSet = new Set(expandidos);
    if (newSet.has(cambioId)) {
      newSet.delete(cambioId);
    } else {
      newSet.add(cambioId);
    }
    setExpandidos(newSet);
  };

  const handleAbrirAprobacion = (cambio: CambioContrato, accion: 'APROBAR' | 'RECHAZAR') => {
    setCambioAprobar(cambio);
    setAccionAprobacion(accion);
    setNotasAprobacion('');
    setShowAprobacionDialog(true);
  };

  const handleConfirmarAprobacion = async () => {
    if (!cambioAprobar) return;
    
    try {
      const nuevoEstatus = accionAprobacion === 'APROBAR' ? 'APLICADO' : 'RECHAZADO';
      
      await db.cambios_contrato.update(cambioAprobar.id, {
        estatus: nuevoEstatus,
        aprobado_por: 'Usuario', // TODO: obtener de contexto de auth
        notas_aprobacion: notasAprobacion || undefined,
        fecha_aprobacion: new Date().toISOString(),
        _dirty: true,
      });
      
      await syncService.forcePush();
      await loadData();
      
      setShowAprobacionDialog(false);
      setCambioAprobar(null);
      setNotasAprobacion('');
      
      alert(`✅ Retención ${nuevoEstatus === 'APLICADO' ? 'aprobada' : 'rechazada'} correctamente`);
    } catch (error) {
      console.error('❌ Error al procesar aprobación:', error);
      alert(`❌ Error: ${(error as Error).message}`);
    }
  };

  if (loading) {
    return <Box sx={{ p: 3, textAlign: 'center' }}>Cargando...</Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        {/* Información sobre retenciones */}
        <Alert severity="info" icon={<TrendingDownIcon />}>
          <Typography variant="body2">
            <strong>Retenciones de Contrato:</strong> Estas retenciones pueden ser aplicadas (restando) 
            en requisiciones y posteriormente regresadas (sumando) según lo determine el gerente.
          </Typography>
        </Alert>

        {/* Retenciones guardadas */}
        {cambiosGuardados.length > 0 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Retenciones Registradas ({cambiosGuardados.length})
            </Typography>
            <Stack spacing={2}>
              {cambiosGuardados.map(cambio => {
                const detalles = detallesPorCambio[cambio.id] || [];
                const retencion = detalles[0]; // Una retención por cambio
                const isExpanded = expandidos.has(cambio.id);
                const porcentajeAplicado = retencion ? (retencion.monto_aplicado / retencion.monto) * 100 : 0;
                const porcentajeRegresado = retencion ? (retencion.monto_regresado / retencion.monto) * 100 : 0;
                
                return (
                  <Paper key={cambio.id} sx={{ p: 2, bgcolor: 'rgba(59, 130, 246, 0.05)' }}>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => toggleExpandido(cambio.id)}
                            sx={{ color: 'primary.main' }}
                          >
                            {isExpanded ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {cambio.numero_cambio} - {cambio.descripcion}
                          </Typography>
                          <Chip 
                            label={cambio.estatus}
                            color={cambio.estatus === 'APLICADO' ? 'success' : cambio.estatus === 'RECHAZADO' ? 'error' : 'warning'}
                            size="small"
                          />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          {!readOnly && cambio.estatus === 'BORRADOR' && (
                            <>
                              <Button
                                size="small" 
                                variant="contained"
                                color="success"
                                startIcon={<ApproveIcon />}
                                onClick={() => handleAbrirAprobacion(cambio, 'APROBAR')}
                              >
                                Aprobar
                              </Button>
                              <Button
                                size="small" 
                                variant="outlined"
                                color="error"
                                startIcon={<RejectIcon />}
                                onClick={() => handleAbrirAprobacion(cambio, 'RECHAZAR')}
                              >
                                Rechazar
                              </Button>
                            </>
                          )}
                          {retencion && (
                            <Chip 
                              label={`$${retencion.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                              color="primary"
                              size="small"
                            />
                          )}
                        </Box>
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary">
                        Fecha: {new Date(cambio.fecha_cambio).toLocaleDateString('es-MX')} | 
                        Estatus: {cambio.estatus}
                        {cambio.aprobado_por && ` | Aprobado por: ${cambio.aprobado_por}`}
                      </Typography>
                      
                      {cambio.notas_aprobacion && (
                        <Alert severity="info" sx={{ mt: 1 }}>
                          <Typography variant="caption">
                            <strong>Notas:</strong> {cambio.notas_aprobacion}
                          </Typography>
                        </Alert>
                      )}
                      
                      {/* Panel de Aprobación/Rechazo */}
                      {showAprobacionDialog && cambioAprobar?.id === cambio.id && (
                        <Alert 
                          severity={accionAprobacion === 'APROBAR' ? 'success' : 'error'}
                          sx={{ mt: 2, mb: 2 }}
                        >
                          <Typography variant="body2" fontWeight={600} gutterBottom>
                            {accionAprobacion === 'APROBAR' ? '✓ Aprobar Retención' : '✗ Rechazar Retención'}
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            <strong>{cambio.numero_cambio}</strong> - {cambio.descripcion}
                          </Typography>
                          {retencion && (
                            <Typography variant="caption" display="block" gutterBottom>
                              Monto: ${retencion.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </Typography>
                          )}
                          <TextField
                            label="Notas de aprobación (opcional)"
                            value={notasAprobacion}
                            onChange={(e) => setNotasAprobacion(e.target.value)}
                            fullWidth
                            multiline
                            rows={2}
                            size="small"
                            placeholder="Observaciones, comentarios o justificación"
                            sx={{ mt: 1, mb: 1, backgroundColor: 'white' }}
                          />
                          {accionAprobacion === 'APROBAR' && (
                            <Typography variant="caption" display="block" sx={{ mb: 1 }} color="warning.main">
                              ⚠️ Al aprobar, esta retención estará disponible para aplicar en requisiciones.
                            </Typography>
                          )}
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Button
                              size="small"
                              variant="contained"
                              color={accionAprobacion === 'APROBAR' ? 'success' : 'error'}
                              onClick={handleConfirmarAprobacion}
                            >
                              {accionAprobacion === 'APROBAR' ? 'Aprobar' : 'Rechazar'}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setShowAprobacionDialog(false)}
                            >
                              Cancelar
                            </Button>
                          </Box>
                        </Alert>
                      )}
                      
                      {/* Detalle expandido */}
                      {isExpanded && retencion && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255, 255, 255, 0.8)', borderRadius: 1 }}>
                          <Typography variant="body2" fontWeight={600} gutterBottom>
                            Estado de la Retención
                          </Typography>
                          
                          <Stack spacing={2}>
                            {/* Monto Total */}
                            <Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Monto Total:
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                  ${retencion.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </Typography>
                              </Box>
                            </Box>
                            
                            {/* Monto Aplicado */}
                            <Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  <TrendingDownIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5, color: 'error.main' }} />
                                  Aplicado en Requisiciones:
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color="error.main">
                                  ${retencion.monto_aplicado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={porcentajeAplicado} 
                                color="error"
                                sx={{ height: 6, borderRadius: 1 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {porcentajeAplicado.toFixed(1)}% aplicado
                              </Typography>
                            </Box>
                            
                            {/* Monto Regresado */}
                            <Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  <TrendingUpIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5, color: 'success.main' }} />
                                  Regresado en Requisiciones:
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color="success.main">
                                  ${retencion.monto_regresado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={porcentajeRegresado} 
                                color="success"
                                sx={{ height: 6, borderRadius: 1 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {porcentajeRegresado.toFixed(1)}% regresado
                              </Typography>
                            </Box>
                            
                            {/* Disponible */}
                            <Box sx={{ p: 1.5, bgcolor: 'primary.light', borderRadius: 1 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" fontWeight={600} color="primary.dark">
                                  Disponible para Aplicar:
                                </Typography>
                                <Typography variant="body2" fontWeight={700} color="primary.dark">
                                  ${retencion.monto_disponible.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </Typography>
                              </Box>
                            </Box>
                          </Stack>
                        </Box>
                      )}
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        )}

        {cambiosGuardados.length === 0 && (
          <Alert severity="info">
            No hay retenciones registradas. {!readOnly && 'Crea una nueva retención para comenzar.'}
          </Alert>
        )}

        {/* Botón para agregar - solo visible si no es readOnly */}
        {!readOnly && (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => setShowDialog(true)}
              sx={{ minWidth: 200 }}
            >
              Nueva Retención
            </Button>
          </Box>
        )}
      </Stack>

      {/* Dialog para agregar retención */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva Retención de Contrato</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info" icon={<TrendingDownIcon />}>
              <Typography variant="caption">
                Las retenciones se aplican (restan) en requisiciones y luego pueden ser regresadas (suman) 
                cuando el gerente lo determine.
              </Typography>
            </Alert>
            <TextField
              label="Descripción / Concepto"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              fullWidth
              multiline
              rows={3}
              placeholder="Ej: Retención de calidad, Fondo de garantía adicional, etc."
            />
            <TextField
              label="Monto de la Retención"
              type="number"
              value={form.monto}
              onChange={(e) => setForm({ ...form, monto: parseFloat(e.target.value) || 0 })}
              fullWidth
              inputProps={{ step: 0.01, min: 0 }}
              helperText="Monto total disponible para aplicar en requisiciones"
            />
            <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
              <Typography variant="body2" color="primary.dark">
                Esta retención estará disponible para:
              </Typography>
              <Typography variant="body2" color="primary.dark">
                • <strong>Aplicar</strong> (restar) en requisiciones
              </Typography>
              <Typography variant="body2" color="primary.dark">
                • <strong>Regresar</strong> (sumar) en requisiciones posteriores
              </Typography>
              <Typography variant="body2" color="primary.dark" sx={{ mt: 1 }}>
                Monto: <strong>${form.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleGuardarRetencion}
            disabled={!form.descripcion.trim() || form.monto <= 0}
          >
            Crear Retención
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RetencionesContrato;
