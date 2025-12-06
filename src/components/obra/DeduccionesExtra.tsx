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
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
} from '@mui/icons-material';
import { db } from '@/db/database';
import { CambioContrato, DeduccionExtra } from '@/types/cambio-contrato';
import { Contrato } from '@/types/contrato';
import { syncService } from '@/sync/syncService';

interface DeduccionesExtraProps {
  contratoId: string;
  contrato?: Contrato | null;
  readOnly?: boolean;
}

interface DeduccionExtraForm {
  descripcion: string;
  monto: number;
}

export const DeduccionesExtra: React.FC<DeduccionesExtraProps> = ({
  contratoId,
  contrato,
  readOnly = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [cambiosGuardados, setCambiosGuardados] = useState<CambioContrato[]>([]);
  const [detallesPorCambio, setDetallesPorCambio] = useState<{ [cambioId: string]: DeduccionExtra[] }>({});
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  
  // Estado para agregar nueva deducción
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<DeduccionExtraForm>({
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
      console.log('🔵 Cargando deducciones extra...');
      
      // Cargar TODOS los cambios tipo DEDUCCION_EXTRA (para mostrar)
      const cambios = await db.cambios_contrato
        .where('contrato_id')
        .equals(contratoId)
        .and(c => c.tipo_cambio === 'DEDUCCION_EXTRA' && c.active !== false)
        .toArray();
      
      console.log(`🔵 Deducciones extra encontradas:`, cambios.length);
      setCambiosGuardados(cambios);
      
      // Cargar detalles de cada cambio
      const detallesMap: { [cambioId: string]: DeduccionExtra[] } = {};
      for (const cambio of cambios) {
        const detalles = await db.deducciones_extra
          .where('cambio_contrato_id')
          .equals(cambio.id)
          .and(d => d.active !== false)
          .toArray();
        detallesMap[cambio.id] = detalles;
        console.log(`🔵 Detalles para ${cambio.numero_cambio}:`, detalles.length);
      }
      setDetallesPorCambio(detallesMap);
      
    } catch (error) {
      console.error('Error cargando deducciones extra:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarDeduccion = async () => {
    if (!form.descripcion.trim()) {
      alert('Ingresa una descripción');
      return;
    }
    
    if (form.monto <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }
    
    try {
      console.log('🔵 Guardando deducción extra...');
      
      // Calcular folio
      const cambiosExtras = await db.cambios_contrato
        .where('contrato_id')
        .equals(contratoId)
        .and(c => c.tipo_cambio === 'DEDUCCION_EXTRA')
        .toArray();
      const numeroExtra = `EXTDED-${String(cambiosExtras.length + 1).padStart(3, '0')}`;
      console.log('🔵 Número de deducción extra:', numeroExtra);
      
      // El monto es negativo porque es una deducción
      const montoDeduccion = -Math.abs(form.monto);
      
      // Crear cambio de contrato en estado BORRADOR
      const cambioId = crypto.randomUUID();
      const cambio: CambioContrato = {
        id: cambioId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        contrato_id: contratoId,
        numero_cambio: numeroExtra,
        tipo_cambio: 'DEDUCCION_EXTRA',
        descripcion: form.descripcion,
        monto_cambio: montoDeduccion,
        monto_contrato_anterior: montoContratoOriginal,
        monto_contrato_nuevo: montoContratoOriginal + montoDeduccion,
        fecha_cambio: new Date().toISOString(),
        estatus: 'BORRADOR',
        active: true,
        _dirty: true,
      };
      
      console.log('🔵 Guardando cambio en IndexedDB...');
      await db.cambios_contrato.add(cambio as any);
      console.log('✅ Cambio guardado');
      
      // Guardar detalle en deducciones_extra usando el MISMO ID local
      // El syncService se encargará de actualizar ambos registros con el ID de Supabase
      const detalleId = crypto.randomUUID();
      const detalle: DeduccionExtra = {
        id: detalleId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cambio_contrato_id: cambioId, // Usar el ID local - se actualizará durante el sync
        descripcion: form.descripcion,
        monto: form.monto, // Guardamos el monto positivo
        active: true,
        _dirty: true,
      };
      
      await db.deducciones_extra.add(detalle as any);
      console.log('✅ Detalle guardado con cambio_contrato_id local:', cambioId);
      
      // Sincronizar TODO - el syncService actualizará los IDs automáticamente
      console.log('🔵 Sincronizando con Supabase...');
      await syncService.forcePush();
      console.log('✅ Sincronización completada');
      
      await loadData();
      
      // Limpiar y cerrar
      setForm({ descripcion: '', monto: 0 });
      setShowDialog(false);
      
      alert(`✅ Deducción ${numeroExtra} guardada\nMonto: -$${Math.abs(montoDeduccion).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
      
    } catch (error) {
      console.error('❌ Error guardando deducción:', error);
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
      
      alert(`✅ Deducción extra ${nuevoEstatus === 'APLICADO' ? 'aprobada' : 'rechazada'} correctamente`);
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
        {/* Deducciones guardadas */}
        {cambiosGuardados.length > 0 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Deducciones Extra Aplicadas ({cambiosGuardados.length})
            </Typography>
            <Stack spacing={2}>
              {cambiosGuardados.map(cambio => {
                const detalles = detallesPorCambio[cambio.id] || [];
                const isExpanded = expandidos.has(cambio.id);
                return (
                  <Paper key={cambio.id} sx={{ p: 2, bgcolor: 'rgba(239, 68, 68, 0.05)' }}>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => toggleExpandido(cambio.id)}
                            sx={{ color: 'error.main' }}
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
                          <Chip 
                            label={`-$${Math.abs(cambio.monto_cambio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                            color="error"
                            size="small"
                          />
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
                            {accionAprobacion === 'APROBAR' ? '✓ Aprobar Deducción Extra' : '✗ Rechazar Deducción Extra'}
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            <strong>{cambio.numero_cambio}</strong> - {cambio.descripcion}
                          </Typography>
                          <Typography variant="caption" display="block" gutterBottom>
                            Monto: -${Math.abs(cambio.monto_cambio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </Typography>
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
                              ⚠️ Al aprobar, esta deducción extra se aplicará al contrato.
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
                      
                      {isExpanded && detalles.length > 0 && (
                        <Box sx={{ mt: 1, pl: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            {detalles[0].descripcion}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Monto: ${detalles[0].monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* Botón para agregar - solo visible si no es readOnly */}
        {!readOnly && (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="error"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => setShowDialog(true)}
              sx={{ minWidth: 200 }}
            >
              Nueva Deducción Extra
            </Button>
          </Box>
        )}
      </Stack>

      {/* Dialog para agregar deducción */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva Deducción Extra</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Descripción / Motivo"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              fullWidth
              multiline
              rows={3}
              placeholder="Ej: Ajuste por incumplimiento, Multa, Penalización, etc."
            />
            <TextField
              label="Monto a Deducir"
              type="number"
              value={form.monto}
              onChange={(e) => setForm({ ...form, monto: parseFloat(e.target.value) || 0 })}
              fullWidth
              inputProps={{ step: 0.01, min: 0 }}
              helperText="Ingresa el monto que se descontará del contrato"
            />
            <Box sx={{ p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
              <Typography variant="body2" color="error.dark">
                Esta deducción reducirá el monto del contrato en: 
                <strong> ${form.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleGuardarDeduccion}
            disabled={!form.descripcion.trim() || form.monto <= 0}
          >
            Aplicar Deducción
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeduccionesExtra;
