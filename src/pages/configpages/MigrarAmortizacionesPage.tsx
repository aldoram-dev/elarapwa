import React, { useState } from 'react';
import { migrarAmortizaciones } from '@/scripts/migrar-amortizaciones';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

export const MigrarAmortizacionesPage: React.FC = () => {
  const [ejecutando, setEjecutando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEjecutar = async () => {
    if (!confirm('⚠️ ADVERTENCIA\n\nEsta operación recalculará y actualizará las amortizaciones de TODAS las requisiciones.\n\n¿Deseas continuar?')) {
      return;
    }

    setEjecutando(true);
    setError(null);
    setResultado(null);

    try {
      const res = await migrarAmortizaciones();
      setResultado(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setEjecutando(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          🔧 Corrección de Amortizaciones
        </Typography>
        
        <Alert severity="warning" sx={{ my: 3 }}>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            ⚠️ Esta herramienta corrige el cálculo de amortizaciones en requisiciones existentes
          </Typography>
          <Typography variant="body2">
            <strong>Problema detectado:</strong> Las amortizaciones no se calculaban correctamente aplicando el porcentaje del anticipo.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <strong>Solución:</strong> Recalcula aplicando el porcentaje correcto del anticipo sobre el monto bruto de cada requisición.
          </Typography>
        </Alert>

        <Box sx={{ my: 3 }}>
          <Typography variant="h6" gutterBottom>
            📋 Qué hace este script:
          </Typography>
          <Box component="ul" sx={{ pl: 3 }}>
            <li>Lee todos los contratos con anticipo</li>
            <li>Para cada contrato, obtiene sus requisiciones ordenadas por fecha</li>
            <li>Recalcula la amortización correcta respetando el orden cronológico</li>
            <li>Actualiza las requisiciones que tengan diferencias significativas ({'>'} 1 centavo)</li>
            <li>Recalcula el total de cada requisición afectada</li>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={ejecutando ? <CircularProgress size={20} /> : <PlayIcon />}
            onClick={handleEjecutar}
            disabled={ejecutando}
          >
            {ejecutando ? 'Ejecutando...' : 'Ejecutar Corrección'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 3 }}>
            <Typography variant="body2" fontWeight={600}>
              Error en la migración:
            </Typography>
            <Typography variant="body2">
              {error}
            </Typography>
          </Alert>
        )}

        {resultado && (
          <>
            <Alert 
              severity={resultado.success ? 'success' : 'error'} 
              icon={resultado.success ? <CheckIcon /> : <ErrorIcon />}
              sx={{ mb: 3 }}
            >
              <Typography variant="body2" fontWeight={600}>
                {resultado.success ? '✅ Migración completada exitosamente' : '❌ La migración falló'}
              </Typography>
              <Typography variant="body2">
                Requisiciones actualizadas: {resultado.actualizadas || 0}
              </Typography>
            </Alert>

            {resultado.cambios && resultado.cambios.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  📊 Detalle de cambios:
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 700 }}>Requisición</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">Monto Anterior</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">Monto Nuevo</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">Diferencia</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {resultado.cambios.map((cambio: any, idx: number) => (
                        <TableRow key={idx} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              REQ-{cambio.requisicion}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            ${cambio.montoAnterior.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell align="right">
                            ${cambio.montoNuevo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${cambio.diferencia >= 0 ? '+' : ''}$${cambio.diferencia.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                              size="small"
                              color={cambio.diferencia >= 0 ? 'success' : 'error'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {resultado.success && resultado.actualizadas === 0 && (
              <Alert severity="info" icon={<CheckIcon />} sx={{ mt: 3 }}>
                <Typography variant="body2">
                  No se encontraron requisiciones que requieran corrección. Todas las amortizaciones están correctas.
                </Typography>
              </Alert>
            )}
          </>
        )}

        <Alert severity="info" sx={{ mt: 4 }}>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            💡 Recomendaciones:
          </Typography>
          <Box component="ul" sx={{ pl: 3, my: 0 }}>
            <li>Ejecuta este script solo cuando no haya usuarios activos en el sistema</li>
            <li>Los cambios son inmediatos y afectan la base de datos de producción</li>
            <li>Después de ejecutar, verifica algunas requisiciones manualmente</li>
            <li>Este script es idempotente: puedes ejecutarlo múltiples veces de forma segura</li>
          </Box>
        </Alert>
      </Paper>
    </Container>
  );
};

export default MigrarAmortizacionesPage;
