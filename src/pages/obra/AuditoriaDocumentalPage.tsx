

import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  Checkbox,
  TextField,
  IconButton,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  UploadFile as UploadFileIcon,
  AttachFile as AttachFileIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { db } from '../../db/database';
import { useLiveQuery } from 'dexie-react-hooks';
import { supabase } from '../../lib/core/supabaseClient';

interface DocumentoAuditoria {
  id?: string;
  especialidad: string;
  numero: number;
  descripcion: string;
  estatus: 'OK' | 'FALTA';
  no_se_requiere: boolean;
  fecha_emision?: string;
  fecha_vencimiento?: string;
  control?: string;
  archivo_url?: string;
  archivo_nombre?: string;
  _dirty?: boolean;
  _deleted?: boolean;
}

const AuditoriaDocumentalPage = () => {
  const [especialidadSeleccionada, setEspecialidadSeleccionada] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [nuevoDocumento, setNuevoDocumento] = useState({
    especialidad: '',
    numero: 1,
    descripcion: '',
    estatus: 'FALTA' as 'OK' | 'FALTA',
    archivo: null as File | null,
  });

  // Cargar documentos desde IndexedDB
  const documentos = useLiveQuery(
    async () => {
      const docs = await db.documentos_auditoria
        .filter(doc => !doc._deleted)
        .toArray();
      
      return docs;
    },
    []
  );

  // Obtener especialidades únicas desde los documentos
  const especialidades = Array.from(
    new Set(documentos?.map(doc => doc.especialidad).filter(Boolean) || [])
  ).sort();

  // Subir archivo a Supabase Storage para un documento existente
  const handleFileUploadForDoc = async (docId: string, file: File) => {
    setUploadingFile(docId);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${docId}.${fileExt}`;
      const filePath = `documentos-auditoria/${fileName}`;

      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Actualizar documento con la URL del archivo
      await actualizarDocumento(docId, {
        archivo_url: urlData.publicUrl,
        archivo_nombre: file.name,
      });

      alert('✅ Archivo subido correctamente');
    } catch (error: any) {
      console.error('Error subiendo archivo:', error);
      alert('❌ Error al subir archivo: ' + error.message);
    } finally {
      setUploadingFile(null);
    }
  };

  // Ver/descargar archivo
  const handleViewFile = (url: string) => {
    window.open(url, '_blank');
  };

  // Calcular estadísticas por especialidad
  const getEspecialidadStats = (especialidad: string) => {
    if (!documentos) return { total: 0, ok: 0, porcentaje: 0 };

    const docsEspecialidad = documentos.filter(
      d => d.especialidad === especialidad
    );
    const total = docsEspecialidad.length;
    const ok = docsEspecialidad.filter(
      d => d.estatus === 'OK' || d.no_se_requiere
    ).length;
    const porcentaje = total > 0 ? Math.round((ok / total) * 100) : 0;

    return { total, ok, porcentaje };
  };

  // Obtener color según porcentaje
  const getColorPorcentaje = (porcentaje: number) => {
    if (porcentaje < 80) return '#f44336'; // Rojo
    if (porcentaje < 95) return '#ff9800'; // Amarillo
    return '#4caf50'; // Verde
  };

  // Actualizar documento
  const actualizarDocumento = async (id: string, cambios: Partial<DocumentoAuditoria>) => {
    await db.documentos_auditoria.update(id, {
      ...cambios,
      _dirty: true,
    });
  };

  // Agregar nuevo documento
  const agregarDocumento = async () => {
    if (!nuevoDocumento.especialidad || !nuevoDocumento.descripcion) {
      alert('Por favor completa los campos obligatorios');
      return;
    }

    try {
      let archivo_url: string | undefined;
      let archivo_nombre: string | undefined;

      // Si hay archivo, subirlo primero
      if (nuevoDocumento.archivo) {
        const fileExt = nuevoDocumento.archivo.name.split('.').pop();
        const fileName = `${Date.now()}_nuevo.${fileExt}`;
        const filePath = `documentos-auditoria/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, nuevoDocumento.archivo);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        archivo_url = urlData.publicUrl;
        archivo_nombre = nuevoDocumento.archivo.name;
      }

      // Crear documento en la base de datos
      await db.documentos_auditoria.add({
        especialidad: nuevoDocumento.especialidad,
        numero: nuevoDocumento.numero,
        descripcion: nuevoDocumento.descripcion,
        estatus: nuevoDocumento.estatus,
        no_se_requiere: false,
        archivo_url,
        archivo_nombre,
        _dirty: true,
      });

      alert('✅ Documento agregado correctamente');
      setShowAddDialog(false);
      setNuevoDocumento({
        especialidad: '',
        numero: 1,
        descripcion: '',
        estatus: 'FALTA',
        archivo: null,
      });
    } catch (error: any) {
      console.error('Error agregando documento:', error);
      alert('❌ Error al agregar documento: ' + error.message);
    }
  };

  // Eliminar documento
  const eliminarDocumento = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este documento?')) {
      await db.documentos_auditoria.update(id, {
        _deleted: true,
        _dirty: true,
      });
    }
  };

  // Modal de agregar documento (compartido entre ambas vistas)
  const modalAgregarDocumento = (
    <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Subir Documento</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Autocomplete
          freeSolo
          options={especialidades}
          value={nuevoDocumento.especialidad}
          onChange={(event, newValue) => {
            setNuevoDocumento({ ...nuevoDocumento, especialidad: newValue || '' });
          }}
          onInputChange={(event, newInputValue) => {
            setNuevoDocumento({ ...nuevoDocumento, especialidad: newInputValue });
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Especialidad"
              margin="normal"
              required
              helperText="Escribe o selecciona una especialidad"
            />
          )}
        />
        <TextField
          label="No."
          type="number"
          value={nuevoDocumento.numero}
          onChange={(e) => setNuevoDocumento({ ...nuevoDocumento, numero: parseInt(e.target.value) || 1 })}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="DESCRIPCIÓN"
          value={nuevoDocumento.descripcion}
          onChange={(e) => setNuevoDocumento({ ...nuevoDocumento, descripcion: e.target.value })}
          fullWidth
          margin="normal"
          multiline
          rows={3}
          required
        />
        <Select
          value={nuevoDocumento.estatus}
          onChange={(e) => setNuevoDocumento({ ...nuevoDocumento, estatus: e.target.value as 'OK' | 'FALTA' })}
          fullWidth
          sx={{ mt: 2 }}
          required
        >
          <MenuItem value="OK">OK</MenuItem>
          <MenuItem value="FALTA">FALTA</MenuItem>
        </Select>
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            component="label"
            fullWidth
            startIcon={<AttachFileIcon />}
          >
            {nuevoDocumento.archivo ? nuevoDocumento.archivo.name : 'Seleccionar Archivo'}
            <input
              type="file"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setNuevoDocumento({ ...nuevoDocumento, archivo: file });
              }}
            />
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowAddDialog(false)}>Cancelar</Button>
        <Button onClick={agregarDocumento} variant="contained">
          Agregar
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Vista de especialidades (cards)
  if (!especialidadSeleccionada) {
    return (
      <>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              Auditoría Documental
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowAddDialog(true)}
              >
                Subir Documento
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => window.location.reload()}
              >
                Actualizar
              </Button>
            </Box>
          </Box>

        <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)',
              },
              gap: 3,
            }}
          >
            {especialidades.map(especialidad => {
              const stats = getEspecialidadStats(especialidad);
              const color = getColorPorcentaje(stats.porcentaje);

              return (
                <Card
                  key={especialidad}
                  sx={{
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                  onClick={() => setEspecialidadSeleccionada(especialidad)}
                >
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                      {especialidad}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Avance: {stats.porcentaje}% ({stats.ok}/{stats.total})
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={stats.porcentaje}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'rgba(0,0,0,0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: color,
                        },
                      }}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Box>
        {modalAgregarDocumento}
      </>
    );
  }

  // Vista de tabla de documentos
  const documentosEspecialidad = documentos?.filter(
    d => d.especialidad === especialidadSeleccionada
  ).sort((a, b) => a.numero - b.numero) || [];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => setEspecialidadSeleccionada(null)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 'bold', flex: 1 }}>
          {especialidadSeleccionada}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setNuevoDocumento({
              ...nuevoDocumento,
              especialidad: especialidadSeleccionada,
            });
            setShowAddDialog(true);
          }}
        >
          Agregar Documento
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#00bcd4' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>No.</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>DESCRIPCIÓN</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ESTATUS</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>NO SE REQUIERE</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>FECHA EMISIÓN</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>FECHA VENCIMIENTO</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>CONTROL</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ARCHIVO</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documentosEspecialidad.map(doc => (
              <TableRow key={doc.id}>
                <TableCell>{doc.numero}</TableCell>
                <TableCell>{doc.descripcion}</TableCell>
                <TableCell>
                  <Select
                    value={doc.estatus}
                    onChange={(e) => actualizarDocumento(doc.id!, { estatus: e.target.value as 'OK' | 'FALTA' })}
                    size="small"
                    disabled={doc.no_se_requiere}
                  >
                    <MenuItem value="OK">
                      <Chip label="OK" color="success" size="small" />
                    </MenuItem>
                    <MenuItem value="FALTA">
                      <Chip label="FALTA" color="error" size="small" />
                    </MenuItem>
                  </Select>
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    checked={doc.no_se_requiere}
                    onChange={(e) => actualizarDocumento(doc.id!, { no_se_requiere: e.target.checked })}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="date"
                    value={doc.fecha_emision || ''}
                    onChange={(e) => actualizarDocumento(doc.id!, { fecha_emision: e.target.value })}
                    size="small"
                    disabled={doc.no_se_requiere}
                    InputLabelProps={{ shrink: true }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="date"
                    value={doc.fecha_vencimiento || ''}
                    onChange={(e) => actualizarDocumento(doc.id!, { fecha_vencimiento: e.target.value })}
                    size="small"
                    disabled={doc.no_se_requiere}
                    InputLabelProps={{ shrink: true }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={doc.control || ''}
                    onChange={(e) => actualizarDocumento(doc.id!, { control: e.target.value })}
                    size="small"
                    placeholder="Control"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {doc.archivo_url ? (
                      <>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleViewFile(doc.archivo_url!)}
                          title={doc.archivo_nombre || 'Ver archivo'}
                        >
                          <VisibilityIcon />
                        </IconButton>
                        <Typography variant="caption" sx={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {doc.archivo_nombre}
                        </Typography>
                      </>
                    ) : (
                      <Button
                        component="label"
                        size="small"
                        startIcon={uploadingFile === doc.id ? <CircularProgress size={16} /> : <AttachFileIcon />}
                        disabled={uploadingFile === doc.id}
                      >
                        Subir
                        <input
                          type="file"
                          hidden
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && doc.id) {
                              handleFileUploadForDoc(doc.id, file);
                            }
                          }}
                        />
                      </Button>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => eliminarDocumento(doc.id!)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {modalAgregarDocumento}
    </Box>
  );
};

export default AuditoriaDocumentalPage;
