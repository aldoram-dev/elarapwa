import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  OpenInNew as OpenInNewIcon,
  BarChart as BarChartIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { supabase } from '@/lib/core/supabaseClient';
import { useAuth } from '@/context/AuthContext';

interface ReporteDireccionConfig {
  id?: string;
  looker_studio_url: string;
  actualizado_por?: string;
  actualizado_en?: string;
}

export default function ReporteDireccionPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [url, setUrl] = useState('');
  const [configId, setConfigId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error' | 'info'; texto: string } | null>(null);
  const [urlValida, setUrlValida] = useState(true);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      
      // Verificar si la tabla existe, si no, crearla
      const { data, error } = await supabase
        .from('reporte_direccion_config')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        if (error.code === '42P01') {
          // Tabla no existe
          setMensaje({
            tipo: 'info',
            texto: 'Configuración no encontrada. Ingresa el link de Looker Studio para comenzar.'
          });
        } else if (error.code === 'PGRST116') {
          // No hay registros
          setMensaje({
            tipo: 'info',
            texto: 'No hay configuración guardada. Ingresa el link de Looker Studio.'
          });
        } else {
          throw error;
        }
      } else if (data) {
        setUrl(data.looker_studio_url || '');
        setConfigId(data.id);
      }
    } catch (error: any) {
      console.error('Error cargando configuración:', error);
      setMensaje({
        tipo: 'error',
        texto: `Error al cargar la configuración: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const validarUrl = (urlTexto: string): boolean => {
    if (!urlTexto) return true; // Permitir vacío
    
    try {
      const urlObj = new URL(urlTexto);
      // Validar que sea una URL de Looker Studio
      return urlObj.hostname.includes('lookerstudio.google.com') || 
             urlObj.hostname.includes('datastudio.google.com');
    } catch {
      return false;
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevoUrl = e.target.value;
    setUrl(nuevoUrl);
    setUrlValida(validarUrl(nuevoUrl));
  };

  const handleGuardar = async () => {
    if (!url.trim()) {
      setMensaje({
        tipo: 'error',
        texto: 'Por favor ingresa una URL válida'
      });
      return;
    }

    if (!urlValida) {
      setMensaje({
        tipo: 'error',
        texto: 'La URL debe ser de Looker Studio (lookerstudio.google.com o datastudio.google.com)'
      });
      return;
    }

    try {
      setSaving(true);
      setMensaje(null);

      const dataToSave = {
        looker_studio_url: url.trim(),
        actualizado_por: user?.id,
        actualizado_en: new Date().toISOString()
      };

      if (configId) {
        // Actualizar registro existente
        const { error } = await supabase
          .from('reporte_direccion_config')
          .update(dataToSave)
          .eq('id', configId);

        if (error) throw error;
      } else {
        // Crear nuevo registro
        const { data, error } = await supabase
          .from('reporte_direccion_config')
          .insert([dataToSave])
          .select()
          .single();

        if (error) throw error;
        if (data) setConfigId(data.id);
      }

      setMensaje({
        tipo: 'success',
        texto: 'Configuración guardada exitosamente'
      });

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMensaje(null), 3000);
    } catch (error: any) {
      console.error('Error guardando configuración:', error);
      setMensaje({
        tipo: 'error',
        texto: `Error al guardar: ${error.message}`
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAbrirReporte = () => {
    if (url && urlValida) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box display="flex" alignItems="center" gap={2}>
          <BarChartIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold">
              Reporte Dirección
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configura el enlace al dashboard de Looker Studio
            </Typography>
          </Box>
        </Box>

        {/* Mensaje */}
        {mensaje && (
          <Alert 
            severity={mensaje.tipo}
            onClose={() => setMensaje(null)}
          >
            {mensaje.texto}
          </Alert>
        )}

        {/* Formulario de configuración */}
        <Paper sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Typography variant="h6" fontWeight="600">
              Configuración del Reporte
            </Typography>

            <TextField
              fullWidth
              label="URL de Looker Studio"
              placeholder="https://lookerstudio.google.com/reporting/..."
              value={url}
              onChange={handleUrlChange}
              error={!urlValida}
              helperText={
                !urlValida 
                  ? 'Debe ser una URL válida de Looker Studio' 
                  : 'Ingresa la URL completa del reporte de Looker Studio'
              }
              InputProps={{
                endAdornment: url && urlValida && (
                  <Tooltip title="Abrir reporte">
                    <IconButton onClick={handleAbrirReporte} edge="end">
                      <OpenInNewIcon />
                    </IconButton>
                  </Tooltip>
                ),
              }}
            />

            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={handleGuardar}
                disabled={saving || !url.trim() || !urlValida}
              >
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </Button>

              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={cargarConfiguracion}
                disabled={loading}
              >
                Recargar
              </Button>
            </Box>
          </Stack>
        </Paper>

        {/* Vista previa del reporte */}
        {url && urlValida && (
          <Paper sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" fontWeight="600">
                  Vista Previa del Reporte
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<OpenInNewIcon />}
                  onClick={handleAbrirReporte}
                  size="small"
                >
                  Abrir en pestaña nueva
                </Button>
              </Box>

              <Box
                sx={{
                  width: '100%',
                  height: '800px',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  overflow: 'hidden',
                }}
              >
                <iframe
                  src={url}
                  width="100%"
                  height="100%"
                  style={{ border: 'none' }}
                  title="Reporte Dirección - Looker Studio"
                  allowFullScreen
                />
              </Box>
            </Stack>
          </Paper>
        )}

        {/* Instrucciones */}
        <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" fontWeight="600" gutterBottom>
            📋 Instrucciones:
          </Typography>
          <Typography variant="body2" component="div" color="text.secondary">
            <ol style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
              <li>Abre tu reporte en Looker Studio</li>
              <li>Haz clic en "Compartir" y configura los permisos necesarios</li>
              <li>Copia la URL del reporte</li>
              <li>Pégala en el campo de arriba y guarda</li>
              <li>El reporte se mostrará en esta página para todos los usuarios autorizados</li>
            </ol>
          </Typography>
        </Paper>
      </Stack>
    </Container>
  );
}
