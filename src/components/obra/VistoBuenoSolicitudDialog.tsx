import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Box,
  Divider,
  Alert,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { SolicitudPago } from '@/types/solicitud-pago';
import { db } from '@/db/database';
import { useAuth } from '@/context/AuthContext';

interface VistoBuenoSolicitudDialogProps {
  open: boolean;
  solicitud: SolicitudPago | null;
  onClose: () => void;
  onSaved: () => void;
}

export const VistoBuenoSolicitudDialog: React.FC<VistoBuenoSolicitudDialogProps> = ({
  open,
  solicitud,
  onClose,
  onSaved,
}) => {
  const { perfil } = useAuth();
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAprobar = async () => {
    if (!solicitud || !perfil) return;

    setSaving(true);
    try {
      const now = new Date().toISOString();
      
      // Actualizar la solicitud con Vo.Bo. de gerencia
      await db.solicitudes_pago.update(solicitud.id!, {
        vobo_gerencia: true,
        vobo_gerencia_por: perfil.id,
        vobo_gerencia_fecha: now,
        observaciones_gerencia: observaciones || undefined,
        estado: 'pendiente', // Pasa a pendiente (lista para pagos)
        updated_at: now,
        _dirty: true,
      });

      console.log(`✅ Visto Bueno aprobado para solicitud ${solicitud.folio}`);
      onSaved();
      handleClose();
    } catch (error) {
      console.error('Error al aprobar Vo.Bo.:', error);
      alert('Error al guardar el Visto Bueno');
    } finally {
      setSaving(false);
    }
  };

  const handleRechazar = async () => {
    if (!solicitud || !perfil) return;
    if (!observaciones.trim()) {
      alert('Debes agregar observaciones al rechazar una solicitud');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      
      // Actualizar la solicitud como rechazada
      await db.solicitudes_pago.update(solicitud.id!, {
        vobo_gerencia: false,
        vobo_gerencia_por: perfil.id,
        vobo_gerencia_fecha: now,
        observaciones_gerencia: observaciones,
        estado: 'rechazada',
        updated_at: now,
        _dirty: true,
      });

      console.log(`❌ Visto Bueno rechazado para solicitud ${solicitud.folio}`);
      onSaved();
      handleClose();
    } catch (error) {
      console.error('Error al rechazar Vo.Bo.:', error);
      alert('Error al guardar el rechazo');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setObservaciones('');
    onClose();
  };

  if (!solicitud) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" fontWeight={700}>
            Visto Bueno - {solicitud.folio}
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          <Alert severity="info">
            Al dar Visto Bueno, esta solicitud aparecerá en la sección de Pagos para su procesamiento.
          </Alert>

          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Detalles de la Solicitud
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>Folio:</strong> {solicitud.folio}
              </Typography>
              <Typography variant="body2">
                <strong>Fecha:</strong> {new Date(solicitud.fecha).toLocaleDateString('es-MX', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </Typography>
              <Typography variant="body2">
                <strong>Total:</strong> ${solicitud.total.toLocaleString('es-MX', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Typography>
              <Typography variant="body2">
                <strong>Conceptos:</strong> {solicitud.conceptos_detalle.length}
              </Typography>
            </Stack>
          </Box>

          <Divider />

          <TextField
            label="Observaciones"
            multiline
            rows={4}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Agrega observaciones sobre esta solicitud (opcional para aprobar, obligatorio para rechazar)"
            fullWidth
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleClose}
          disabled={saving}
          color="inherit"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleRechazar}
          disabled={saving}
          variant="outlined"
          color="error"
          startIcon={<CancelIcon />}
        >
          Rechazar
        </Button>
        <Button
          onClick={handleAprobar}
          disabled={saving}
          variant="contained"
          color="success"
          startIcon={<CheckCircleIcon />}
        >
          Dar Vo.Bo.
        </Button>
      </DialogActions>
    </Dialog>
  );
};
