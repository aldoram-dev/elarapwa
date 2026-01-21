import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Box,
  Paper,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  Code as XmlIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { uploadMultipleFiles, getPublicUrl } from '@/lib/utils/storageUtils';

interface SubirFacturaModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (facturaUrl: string, xmlUrl?: string) => Promise<void>;
  title?: string;
}

export const SubirFacturaModal: React.FC<SubirFacturaModalProps> = ({
  open,
  onClose,
  onSave,
  title = 'Subir Factura'
}) => {
  const [archivoPdf, setArchivoPdf] = useState<File | null>(null);
  const [archivoXml, setArchivoXml] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('⚠️ Solo se permiten archivos PDF');
        return;
      }
      setArchivoPdf(file);
    }
  };

  const handleXmlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xml') && file.type !== 'text/xml' && file.type !== 'application/xml') {
        alert('⚠️ Solo se permiten archivos XML');
        return;
      }
      setArchivoXml(file);
    }
  };

  const handleSubmit = async () => {
    if (!archivoPdf) {
      alert('⚠️ Debes seleccionar al menos el archivo PDF');
      return;
    }

    setUploading(true);
    try {
      // Subir archivos
      const archivos = [archivoPdf];
      if (archivoXml) {
        archivos.push(archivoXml);
      }

      const uploadedPaths = await uploadMultipleFiles(
        archivos,
        'documents',
        'facturas'
      );

      if (uploadedPaths.length === 0) {
        alert('❌ No se pudieron subir los archivos. Intenta de nuevo.');
        return;
      }

      const pdfUrl = getPublicUrl(uploadedPaths[0], 'documents');
      const xmlUrl = uploadedPaths[1] ? getPublicUrl(uploadedPaths[1], 'documents') : undefined;

      await onSave(pdfUrl, xmlUrl);
      
      // Limpiar estado
      setArchivoPdf(null);
      setArchivoXml(null);
      onClose();
    } catch (error) {
      console.error('Error subiendo factura:', error);
      alert('❌ Error al subir la factura. Intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setArchivoPdf(null);
      setArchivoXml(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight={600}>
            📄 {title}
          </Typography>
          <IconButton onClick={handleClose} size="small" disabled={uploading}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          <Alert severity="info" icon={<FileIcon />}>
            Sube el archivo PDF de la factura (obligatorio) y opcionalmente el archivo XML.
          </Alert>

          {/* PDF */}
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mb: 1 }}>
              PDF de la Factura *
            </Typography>
            
            {!archivoPdf ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  textAlign: 'center',
                  borderStyle: 'dashed',
                  borderWidth: 2,
                  borderColor: 'error.main',
                  bgcolor: 'background.default',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'error.50',
                    borderColor: 'error.dark',
                  }
                }}
              >
                <Button
                  component="label"
                  variant="text"
                  color="error"
                  startIcon={<PdfIcon />}
                  disabled={uploading}
                  sx={{ textTransform: 'none' }}
                >
                  Seleccionar PDF
                  <input
                    type="file"
                    accept="application/pdf"
                    hidden
                    onChange={handlePdfChange}
                  />
                </Button>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Archivo PDF de la factura
                </Typography>
              </Paper>
            ) : (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: 'error.50',
                  border: '2px solid',
                  borderColor: 'error.main'
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <PdfIcon sx={{ color: 'error.main', fontSize: 32 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {archivoPdf.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(archivoPdf.size / 1024).toFixed(2)} KB
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => setArchivoPdf(null)}
                    disabled={uploading}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Paper>
            )}
          </Box>

          {/* XML */}
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mb: 1 }}>
              XML de la Factura (opcional)
            </Typography>
            
            {!archivoXml ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  textAlign: 'center',
                  borderStyle: 'dashed',
                  borderWidth: 2,
                  borderColor: 'success.main',
                  bgcolor: 'background.default',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'success.50',
                    borderColor: 'success.dark',
                  }
                }}
              >
                <Button
                  component="label"
                  variant="text"
                  color="success"
                  startIcon={<XmlIcon />}
                  disabled={uploading}
                  sx={{ textTransform: 'none' }}
                >
                  Seleccionar XML
                  <input
                    type="file"
                    accept=".xml,text/xml,application/xml"
                    hidden
                    onChange={handleXmlChange}
                  />
                </Button>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Archivo XML de la factura (opcional)
                </Typography>
              </Paper>
            ) : (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: 'success.50',
                  border: '2px solid',
                  borderColor: 'success.main'
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <XmlIcon sx={{ color: 'success.main', fontSize: 32 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {archivoXml.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(archivoXml.size / 1024).toFixed(2)} KB
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => setArchivoXml(null)}
                    disabled={uploading}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Paper>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={handleClose}
          disabled={uploading}
          variant="outlined"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!archivoPdf || uploading}
          variant="contained"
          startIcon={uploading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
        >
          {uploading ? 'Subiendo...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
