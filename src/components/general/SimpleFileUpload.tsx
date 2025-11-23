import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Stack,
  Paper,
  IconButton,
  LinearProgress,
  alpha,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  InsertDriveFile as FileIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useFileUpload } from '@/lib/hooks/useFileUpload';

interface SimpleFileUploadProps {
  onUploadComplete: (url: string) => void;
  accept?: string[];
  uploadType?: 'avatar' | 'document' | 'general';
  disabled?: boolean;
  helperText?: string;
  compact?: boolean;
}

export const SimpleFileUpload: React.FC<SimpleFileUploadProps> = ({
  onUploadComplete,
  accept = ['application/pdf', 'image/*'],
  uploadType = 'document',
  disabled = false,
  helperText,
  compact = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    uploading,
    progress,
    error,
    uploadFile,
    uploadAvatar,
    uploadDocument,
    formatFileSize,
  } = useFileUpload();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      console.group('📤 INICIANDO UPLOAD DE ARCHIVO');
      console.log('Archivo seleccionado:', selectedFile.name, selectedFile.type, selectedFile.size);
      console.log('Tipo de upload:', uploadType);
      
      let result;
      switch (uploadType) {
        case 'avatar':
          console.log('Uploadando como avatar...');
          result = await uploadAvatar(selectedFile, 'user-avatar');
          break;
        case 'document':
          console.log('Uploadando como documento...');
          result = await uploadDocument(selectedFile, 'comprobantes');
          break;
        default:
          console.log('Uploadando como archivo general...');
          result = await uploadFile(selectedFile);
      }

      console.log('Resultado completo del upload:', result);
      console.log('result.data:', result?.data);
      console.log('result.data?.url:', result?.data?.url);
      
      if (result?.data?.url) {
        console.log('✅ URL recibida:', result.data.url);
        setUploadSuccess(true);
        onUploadComplete(result.data.url);
        console.log('✅ onUploadComplete llamado con URL:', result.data.url);
        setTimeout(() => {
          setSelectedFile(null);
          setUploadSuccess(false);
        }, 2000);
      } else {
        console.error('❌ No se recibió URL en el resultado:', result);
        console.error('Estructura completa:', JSON.stringify(result, null, 2));
      }
      console.groupEnd();
    } catch (err) {
      console.error('❌ Error al subir archivo:', err);
      console.groupEnd();
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setUploadSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  if (compact) {
    return (
      <Box>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept.join(',')}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={disabled || uploading}
        />
        
        {!selectedFile ? (
          <Button
            variant="outlined"
            size="small"
            onClick={handleButtonClick}
            disabled={disabled || uploading}
            startIcon={<CloudUploadIcon />}
          >
            Subir
          </Button>
        ) : uploadSuccess ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
            <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
              Subido ✓
            </Typography>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" noWrap sx={{ maxWidth: 120 }}>
              {selectedFile.name}
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={handleUpload}
              disabled={uploading}
              color="success"
              sx={{ minWidth: 45 }}
            >
              {uploading ? <CircularProgress size={16} color="inherit" /> : 'OK'}
            </Button>
            <IconButton size="small" onClick={handleRemove} disabled={uploading}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        )}
        {error && (
          <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
            ❌ Error: {error}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept.join(',')}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled || uploading}
      />

      {!selectedFile ? (
        <Paper
          onClick={handleButtonClick}
          sx={{
            p: 3,
            textAlign: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            border: '2px dashed',
            borderColor: 'primary.main',
            bgcolor: alpha('#1976d2', 0.02),
            transition: 'all 0.3s ease',
            '&:hover': {
              bgcolor: disabled ? 'inherit' : alpha('#1976d2', 0.08),
              borderColor: disabled ? 'inherit' : 'primary.dark',
              transform: disabled ? 'none' : 'scale(1.02)',
            },
          }}
        >
          <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="body1" fontWeight={600} color="primary" gutterBottom>
            Subir Documentos
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Arrastra archivos aquí o haz clic para seleccionar
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            Máximo 1 archivo • {accept.includes('application/pdf') ? 'PDF' : ''}{accept.includes('image/*') ? ', Imágenes' : ''}
          </Typography>
          {helperText && (
            <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 1 }}>
              💡 Tip: {helperText}
            </Typography>
          )}
        </Paper>
      ) : (
        <Paper sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <FileIcon color="primary" sx={{ fontSize: 32 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {selectedFile.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatFileSize(selectedFile.size)}
                </Typography>
              </Box>
              {uploadSuccess ? (
                <CheckCircleIcon color="success" />
              ) : (
                <IconButton onClick={handleRemove} disabled={uploading} size="small">
                  <CloseIcon />
                </IconButton>
              )}
            </Stack>

            {uploading && (
              <Box>
                <LinearProgress variant="determinate" value={progress} />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Subiendo... {Math.round(progress)}%
                </Typography>
              </Box>
            )}

            {error && (
              <Typography variant="caption" color="error">
                Error: {error}
              </Typography>
            )}

            {!uploading && !uploadSuccess && (
              <Button
                variant="contained"
                fullWidth
                onClick={handleUpload}
                disabled={uploading}
                startIcon={<CloudUploadIcon />}
              >
                Subir Archivo
              </Button>
            )}

            {uploadSuccess && (
              <Box sx={{ textAlign: 'center', py: 1 }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
                <Typography variant="body2" color="success.main" fontWeight={600}>
                  ¡Archivo subido exitosamente!
                </Typography>
              </Box>
            )}
          </Stack>
        </Paper>
      )}
    </Box>
  );
};
