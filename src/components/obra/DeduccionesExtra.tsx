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
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { db } from '@/db/database';
import { CambioContrato, DeduccionExtra } from '@/types/cambio-contrato';
import { Contrato } from '@/types/contrato';
import { syncService } from '@/sync/syncService';

interface DeduccionesExtraProps {
  contratoId: string;
  contrato?: Contrato | null;
}

interface DeduccionExtraForm {
  descripcion: string;
  monto: number;
}

export const DeduccionesExtra: React.FC<DeduccionesExtraProps> = ({
  contratoId,
  contrato,
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
      
      // Guardar detalle en deducciones_extra
      const detalleId = crypto.randomUUID();
      const detalle: DeduccionExtra = {
        id: detalleId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cambio_contrato_id: cambioId,
        descripcion: form.descripcion,
        monto: form.monto, // Guardamos el monto positivo
        active: true,
        _dirty: true,
      };
      
      await db.deducciones_extra.add(detalle as any);
      console.log('✅ Detalle guardado');
      
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
                        </Box>
                        <Chip 
                          label={`-$${Math.abs(cambio.monto_cambio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                          color="error"
                          size="small"
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Fecha: {new Date(cambio.fecha_cambio).toLocaleDateString('es-MX')} | 
                        Estatus: {cambio.estatus}
                      </Typography>
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

        {/* Botón para agregar */}
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
