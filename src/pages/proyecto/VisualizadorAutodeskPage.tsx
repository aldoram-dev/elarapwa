import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Grid,
  Stack,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Box as BoxIcon,
  Plus,
  ExternalLink,
  Edit2,
  Trash2,
  Link as LinkIcon,
  Settings,
} from 'lucide-react';
import { supabase } from '@/lib/core/supabaseClient';
import { VisualizadorLink, VisualizadorArea } from '@/types/visualizador-link';
import { useAuth } from '@/context/AuthContext';

const VisualizadorAutodeskPage: React.FC = () => {
  const { user } = useAuth();
  const [areas, setAreas] = useState<VisualizadorArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [links, setLinks] = useState<VisualizadorLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openAreaDialog, setOpenAreaDialog] = useState(false);
  const [editingLink, setEditingLink] = useState<VisualizadorLink | null>(null);
  const [editingArea, setEditingArea] = useState<VisualizadorArea | null>(null);
  const [formData, setFormData] = useState({
    area_id: '',
    titulo: '',
    descripcion: '',
    url: '',
    tipo_archivo: '',
  });
  const [areaFormData, setAreaFormData] = useState({
    nombre: '',
    color: '#0891b2',
  });

  useEffect(() => {
    loadAreas();
    loadLinks();
  }, []);

  useEffect(() => {
    if (areas.length > 0 && !selectedArea) {
      setSelectedArea(areas[0].id!);
    }
  }, [areas]);

  const loadAreas = async () => {
    try {
      const { data, error } = await supabase
        .from('visualizador_areas')
        .select('*')
        .eq('activo', true)
        .order('orden', { ascending: true });

      if (error) throw error;
      setAreas(data || []);
    } catch (error) {
      console.error('Error cargando áreas:', error);
    }
  };

  const loadLinks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('visualizador_links')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Error cargando links:', error);
      alert('Error al cargar los links del visualizador');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (link?: VisualizadorLink) => {
    if (link) {
      setEditingLink(link);
      setFormData({
        area_id: link.area_id,
        titulo: link.titulo,
        descripcion: link.descripcion || '',
        url: link.url,
        tipo_archivo: link.tipo_archivo || '',
      });
    } else {
      setEditingLink(null);
      setFormData({
        area_id: selectedArea || '',
        titulo: '',
        descripcion: '',
        url: '',
        tipo_archivo: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingLink(null);
    setFormData({
      area_id: '',
      titulo: '',
      descripcion: '',
      url: '',
      tipo_archivo: '',
    });
  };

  const handleSave = async () => {
    if (!formData.titulo || !formData.url || !formData.area_id) {
      alert('El título, URL y área son obligatorios');
      return;
    }

    try {
      if (editingLink) {
        // Actualizar
        const { error } = await supabase
          .from('visualizador_links')
          .update({
            area_id: formData.area_id,
            titulo: formData.titulo,
            descripcion: formData.descripcion,
            url: formData.url,
            tipo_archivo: formData.tipo_archivo,
            updated_by: user?.id,
          })
          .eq('id', editingLink.id);

        if (error) throw error;
        alert('Link actualizado correctamente');
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from('visualizador_links')
          .insert({
            area_id: formData.area_id,
            titulo: formData.titulo,
            descripcion: formData.descripcion,
            url: formData.url,
            tipo_archivo: formData.tipo_archivo,
            created_by: user?.id,
          });

        if (error) throw error;
        alert('Link agregado correctamente');
      }

      handleCloseDialog();
      loadLinks();
    } catch (error) {
      console.error('Error guardando link:', error);
      alert('Error al guardar el link');
    }
  };

  const handleDelete = async (linkId: string) => {
    if (!confirm('¿Estás seguro de eliminar este link?')) return;

    try {
      const { error } = await supabase
        .from('visualizador_links')
        .update({ activo: false, updated_by: user?.id })
        .eq('id', linkId);

      if (error) throw error;
      alert('Link eliminado correctamente');
      loadLinks();
    } catch (error) {
      console.error('Error eliminando link:', error);
      alert('Error al eliminar el link');
    }
  };

  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Funciones para gestionar áreas
  const handleOpenAreaDialog = (area?: VisualizadorArea) => {
    if (area) {
      setEditingArea(area);
      setAreaFormData({
        nombre: area.nombre,
        color: area.color || '#0891b2',
      });
    } else {
      setEditingArea(null);
      setAreaFormData({
        nombre: '',
        color: '#0891b2',
      });
    }
    setOpenAreaDialog(true);
  };

  const handleCloseAreaDialog = () => {
    setOpenAreaDialog(false);
    setEditingArea(null);
    setAreaFormData({
      nombre: '',
      color: '#0891b2',
    });
  };

  const handleSaveArea = async () => {
    if (!areaFormData.nombre) {
      alert('El nombre del área es obligatorio');
      return;
    }

    try {
      if (editingArea) {
        // Actualizar
        const { error } = await supabase
          .from('visualizador_areas')
          .update({
            nombre: areaFormData.nombre,
            color: areaFormData.color,
            updated_by: user?.id,
          })
          .eq('id', editingArea.id);

        if (error) throw error;
        alert('Área actualizada correctamente');
      } else {
        // Crear nueva
        const maxOrden = Math.max(...areas.map(a => a.orden || 0), 0);
        const { error } = await supabase
          .from('visualizador_areas')
          .insert({
            nombre: areaFormData.nombre,
            color: areaFormData.color,
            orden: maxOrden + 1,
            created_by: user?.id,
          });

        if (error) throw error;
        alert('Área agregada correctamente');
      }

      handleCloseAreaDialog();
      loadAreas();
    } catch (error) {
      console.error('Error guardando área:', error);
      alert('Error al guardar el área');
    }
  };

  const handleDeleteArea = async (areaId: string) => {
    const linksEnArea = links.filter(l => l.area_id === areaId && l.activo);
    if (linksEnArea.length > 0) {
      alert(`No puedes eliminar esta área porque tiene ${linksEnArea.length} link(s) asociado(s). Elimina primero los links.`);
      return;
    }

    if (!confirm('¿Estás seguro de eliminar esta área?')) return;

    try {
      const { error } = await supabase
        .from('visualizador_areas')
        .update({ activo: false, updated_by: user?.id })
        .eq('id', areaId);

      if (error) throw error;
      alert('Área eliminada correctamente');
      
      // Si el área eliminada era la seleccionada, seleccionar la primera disponible
      if (selectedArea === areaId) {
        const remainingAreas = areas.filter(a => a.id !== areaId);
        setSelectedArea(remainingAreas[0]?.id || null);
      }
      
      loadAreas();
    } catch (error) {
      console.error('Error eliminando área:', error);
      alert('Error al eliminar el área');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <BoxIcon size={32} color="#0891b2" />
            <Typography variant="h4" fontWeight={700} color="primary">
              Visualizador Autodesk
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<Settings size={20} />}
              onClick={() => handleOpenAreaDialog()}
              sx={{
                borderColor: '#0891b2',
                color: '#0891b2',
                '&:hover': { 
                  borderColor: '#0e7490',
                  bgcolor: 'rgba(8, 145, 178, 0.04)',
                },
              }}
            >
              Gestionar Áreas
            </Button>
            <Button
              variant="contained"
              startIcon={<Plus size={20} />}
              onClick={() => handleOpenDialog()}
              sx={{
                bgcolor: '#0891b2',
                '&:hover': { bgcolor: '#0e7490' },
              }}
            >
              Agregar Link
            </Button>
          </Stack>
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Selecciona el modelo que deseas visualizar:
        </Typography>

        {/* Botones de Áreas */}
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            {areas.map((area) => (
              <Box key={area.id} sx={{ position: 'relative', display: 'inline-block' }}>
                <Button
                  variant={selectedArea === area.id ? 'contained' : 'outlined'}
                  onClick={() => setSelectedArea(area.id!)}
                  sx={{
                    bgcolor: selectedArea === area.id ? area.color : 'transparent',
                    borderColor: area.color,
                    color: selectedArea === area.id ? 'white' : area.color,
                    '&:hover': {
                      bgcolor: area.color,
                      color: 'white',
                    },
                    fontWeight: 600,
                    px: 3,
                    py: 1,
                    pr: 7,
                  }}
                >
                  {area.nombre}
                </Button>
                <Stack 
                  direction="row" 
                  spacing={0.5}
                  sx={{ 
                    position: 'absolute', 
                    right: 4, 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                  }}
                >
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenAreaDialog(area);
                    }}
                    sx={{ 
                      p: 0.5,
                      color: selectedArea === area.id ? 'white' : area.color,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                    }}
                  >
                    <Edit2 size={14} />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteArea(area.id!);
                    }}
                    sx={{ 
                      p: 0.5,
                      color: selectedArea === area.id ? 'white' : area.color,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                    }}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Grid de Links */}
        {loading ? (
          <Typography>Cargando...</Typography>
        ) : links.filter(l => l.area_id === selectedArea).length === 0 ? (
          <Box sx={{ bgcolor: '#f0f9ff', p: 4, borderRadius: 2, border: '1px solid #0891b2', textAlign: 'center' }}>
            <LinkIcon size={48} color="#0891b2" style={{ marginBottom: 16 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No hay links registrados
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Agrega tu primer link del visualizador Autodesk para comenzar
            </Typography>
            <Button
              variant="contained"
              startIcon={<Plus size={20} />}
              onClick={() => handleOpenDialog()}
            >
              Agregar Primer Link
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {links.filter(l => l.area_id === selectedArea).map((link) => (
              <Grid key={link.id} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card
                  elevation={2}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'translateY(-4px)',
                      transition: 'all 0.3s ease',
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <Typography variant="h6" fontWeight={700} color="primary">
                          {link.titulo}
                        </Typography>
                        {link.tipo_archivo && (
                          <Chip
                            label={link.tipo_archivo.toUpperCase()}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      
                      {link.descripcion && (
                        <Typography variant="body2" color="text.secondary">
                          {link.descripcion}
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <LinkIcon size={16} color="#64748b" />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {link.url}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<ExternalLink size={16} />}
                      onClick={() => openInNewTab(link.url)}
                      sx={{
                        bgcolor: '#10b981',
                        '&:hover': { bgcolor: '#059669' },
                      }}
                    >
                      Abrir Visualizador
                    </Button>
                    <Box>
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(link)}
                          sx={{ color: '#0891b2' }}
                        >
                          <Edit2 size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(link.id!)}
                          sx={{ color: '#ef4444' }}
                        >
                          <Trash2 size={18} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Dialog para Agregar/Editar Link */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingLink ? 'Editar Link' : 'Agregar Nuevo Link'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Área *</InputLabel>
              <Select
                value={formData.area_id}
                label="Área *"
                onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
              >
                {areas.map((area) => (
                  <MenuItem key={area.id} value={area.id}>
                    {area.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Título *"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ej: Modelo BIM - Planta Baja"
            />
            
            <TextField
              fullWidth
              label="Descripción"
              multiline
              rows={3}
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Descripción del modelo o archivo..."
            />

            <TextField
              fullWidth
              label="URL del Visualizador *"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://..."
              helperText="URL completa del visualizador de Autodesk"
            />

            <TextField
              fullWidth
              label="Tipo de Archivo"
              value={formData.tipo_archivo}
              onChange={(e) => setFormData({ ...formData, tipo_archivo: e.target.value })}
              placeholder="Ej: RVT, IFC, DWG, NWD"
              helperText="Opcional: extensión del archivo"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{
              bgcolor: '#0891b2',
              '&:hover': { bgcolor: '#0e7490' },
            }}
          >
            {editingLink ? 'Actualizar' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para Agregar/Editar Área */}
      <Dialog open={openAreaDialog} onClose={handleCloseAreaDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingArea ? 'Editar Área' : 'Agregar Nueva Área'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Nombre del Área *"
              value={areaFormData.nombre}
              onChange={(e) => setAreaFormData({ ...areaFormData, nombre: e.target.value })}
              placeholder="Ej: Instalaciones Especiales"
            />
            
            <Box>
              <Typography variant="body2" gutterBottom>
                Color del Área
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <input
                  type="color"
                  value={areaFormData.color}
                  onChange={(e) => setAreaFormData({ ...areaFormData, color: e.target.value })}
                  style={{
                    width: 60,
                    height: 40,
                    border: '1px solid #cbd5e1',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                />
                <TextField
                  size="small"
                  value={areaFormData.color}
                  onChange={(e) => setAreaFormData({ ...areaFormData, color: e.target.value })}
                  placeholder="#0891b2"
                  sx={{ width: 120 }}
                />
                <Chip
                  label="Vista previa"
                  sx={{
                    bgcolor: areaFormData.color,
                    color: 'white',
                    fontWeight: 600,
                  }}
                />
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseAreaDialog} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleSaveArea}
            variant="contained"
            sx={{
              bgcolor: '#0891b2',
              '&:hover': { bgcolor: '#0e7490' },
            }}
          >
            {editingArea ? 'Actualizar' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default VisualizadorAutodeskPage;
