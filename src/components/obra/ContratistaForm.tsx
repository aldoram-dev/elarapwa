import React, { useState } from 'react'
import { Contratista, ContratistaDocumentos, ContratistaInsert } from '@/types/contratista'
import { useFileUpload } from '@/lib/hooks/useFileUpload'
import { supabase } from '@/lib/core/supabaseClient'
import { 
  Box, 
  Paper, 
  TextField, 
  Typography,
  InputAdornment,
  Button as MuiButton,
  LinearProgress,
  Stack
} from '@mui/material'
import { 
  Person as PersonIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  AccountBalance as BankIcon,
  Description as DescriptionIcon,
  CloudUpload as UploadIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material'
import { Button } from '@components/ui'

interface ContratistaFormProps {
  contratista?: Contratista | null
  onSubmit: (data: ContratistaInsert | Partial<Contratista>) => Promise<void>
  onCancel: () => void
}

export const ContratistaForm: React.FC<ContratistaFormProps> = ({ 
  contratista, 
  onSubmit, 
  onCancel
}) => {
  const [formData, setFormData] = useState<Partial<Contratista>>({
    nombre: contratista?.nombre || '',
    localizacion: contratista?.localizacion || '',
    telefono: contratista?.telefono || '',
    correo_contacto: contratista?.correo_contacto || '',
    numero_cuenta_bancaria: contratista?.numero_cuenta_bancaria || '',
    banco: contratista?.banco || '',
    nombre_cuenta: contratista?.nombre_cuenta || '',
    csf_url: contratista?.csf_url || '',
    cv_url: contratista?.cv_url || '',
    acta_constitutiva_url: contratista?.acta_constitutiva_url || '',
    repse_url: contratista?.repse_url || '',
    ine_url: contratista?.ine_url || '',
    registro_patronal_url: contratista?.registro_patronal_url || '',
    comprobante_domicilio_url: contratista?.comprobante_domicilio_url || '',
    active: contratista?.active ?? true,
  })

  const [archivos, setArchivos] = useState<ContratistaDocumentos>({})
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { uploadFile, uploading } = useFileUpload({ 
    optimize: false,
    bucket: 'documents',
    folder: 'contratistas'
  })

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.nombre?.trim()) {
      newErrors.nombre = 'El nombre es requerido'
    }

    if (formData.correo_contacto && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo_contacto)) {
      newErrors.correo_contacto = 'Email inválido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Función para abrir documento con URL firmada
  const handleOpenDocument = async (path: string | undefined) => {
    if (!path) return
    
    try {
      // Si ya es una URL completa, abrirla directamente
      if (path.startsWith('http')) {
        window.open(path, '_blank')
        return
      }

      // Generar URL firmada para documentos privados
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(path, 3600) // Válida por 1 hora

      if (error) throw error
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (err) {
      console.error('Error abriendo documento:', err)
      alert('Error al abrir el documento')
    }
  }

  const handleFileSelect = (field: keyof ContratistaDocumentos) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setArchivos(prev => ({ ...prev, [field]: file }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      // Subir archivos primero
      const updatedFormData = { ...formData }

      // Mapeo de campos de archivo
      const fileFields: Array<{ field: keyof ContratistaDocumentos; urlField: keyof Contratista }> = [
        { field: 'csf', urlField: 'csf_url' },
        { field: 'cv', urlField: 'cv_url' },
        { field: 'acta_constitutiva', urlField: 'acta_constitutiva_url' },
        { field: 'repse', urlField: 'repse_url' },
        { field: 'ine', urlField: 'ine_url' },
        { field: 'registro_patronal', urlField: 'registro_patronal_url' },
        { field: 'comprobante_domicilio', urlField: 'comprobante_domicilio_url' },
      ]

      for (const { field, urlField } of fileFields) {
        const file = archivos[field]
        if (file) {
          setUploadProgress(prev => ({ ...prev, [field]: true }))
          const result = await uploadFile(file)
          if (result.success && result.data) {
            (updatedFormData as any)[urlField] = result.data.url || result.data.path
          }
          setUploadProgress(prev => ({ ...prev, [field]: false }))
        }
      }

      await onSubmit(updatedFormData)
    } catch (error: any) {
      setErrors({ submit: error.message || 'Error al guardar el contratista' })
    } finally {
      setLoading(false)
    }
  }

  const renderFileUpload = (
    label: string,
    field: keyof ContratistaDocumentos,
    currentUrl?: string
  ) => (
    <Box sx={{ width: '100%' }}>
      <Typography 
        variant="body2" 
        sx={{ 
          mb: 1, 
          fontWeight: 600, 
          color: '#1e293b',
          fontSize: '0.875rem'
        }}
      >
        {label}
      </Typography>
      {currentUrl && !archivos[field] ? (
        <Stack direction="column" spacing={1}>
          <MuiButton
            variant="contained"
            fullWidth
            startIcon={<CheckIcon />}
            onClick={() => handleOpenDocument(currentUrl)}
            sx={{
              height: 44,
              textTransform: 'none',
              bgcolor: '#10b981',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.875rem',
              boxShadow: '0 1px 3px rgba(16, 185, 129, 0.3)',
              '&:hover': {
                bgcolor: '#059669',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)'
              }
            }}
          >
            Archivo cargado - Ver
          </MuiButton>
          <MuiButton
            component="label"
            variant="outlined"
            fullWidth
            sx={{
              height: 38,
              textTransform: 'none',
              borderColor: '#cbd5e1',
              color: '#64748b',
              fontSize: '0.8125rem',
              '&:hover': {
                borderColor: '#94a3b8',
                bgcolor: 'rgba(148, 163, 184, 0.05)'
              }
            }}
          >
            Cambiar archivo
            <input
              type="file"
              hidden
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect(field)}
            />
          </MuiButton>
        </Stack>
      ) : (
        <MuiButton
          component="label"
          variant="outlined"
          fullWidth
          startIcon={archivos[field] ? <CheckIcon /> : <UploadIcon />}
          sx={{
            height: 44,
            textTransform: 'none',
            borderColor: archivos[field] ? '#10b981' : '#cbd5e1',
            color: archivos[field] ? '#10b981' : '#64748b',
            fontWeight: archivos[field] ? 600 : 500,
            fontSize: '0.875rem',
            bgcolor: archivos[field] ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
            '&:hover': {
              borderColor: archivos[field] ? '#059669' : '#94a3b8',
              bgcolor: archivos[field] ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.05)'
            }
          }}
        >
          {archivos[field]?.name || 'Seleccionar archivo'}
          <input
            type="file"
            hidden
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect(field)}
          />
        </MuiButton>
      )}
      {uploadProgress[field] && (
        <LinearProgress 
          sx={{ 
            mt: 1, 
            height: 3,
            borderRadius: 1.5,
            bgcolor: 'rgba(16, 185, 129, 0.1)',
            '& .MuiLinearProgress-bar': {
              bgcolor: '#10b981'
            }
          }} 
        />
      )}
    </Box>
  )

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Información Básica */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(20px)',
          border: '2px solid rgba(255, 255, 255, 0.6)',
          borderRadius: 4,
          p: 3
        }}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 3, 
            fontWeight: 700, 
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <BusinessIcon sx={{ color: '#334155' }} />
          Información del Contratista
        </Typography>

        <Stack spacing={2}>
          <TextField
            label="Contratista *"
            fullWidth
            required
            placeholder="Nombre o Razón Social"
            value={formData.nombre}
            onChange={(e) => {
              setFormData({ ...formData, nombre: e.target.value })
              if (errors.nombre) {
                const { nombre, ...rest } = errors
                setErrors(rest)
              }
            }}
            error={!!errors.nombre}
            helperText={errors.nombre}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon sx={{ color: '#334155', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="Localización"
            fullWidth
            placeholder="Dirección Fiscal"
            value={formData.localizacion}
            onChange={(e) => setFormData({ ...formData, localizacion: e.target.value })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LocationIcon sx={{ color: '#334155', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Teléfono"
              fullWidth
              placeholder="Teléfono del contratista o proveedor"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIcon sx={{ color: '#334155', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Correo Electrónico de Contacto"
              fullWidth
              type="email"
              placeholder="Correo"
              value={formData.correo_contacto}
              onChange={(e) => setFormData({ ...formData, correo_contacto: e.target.value })}
              error={!!errors.correo_contacto}
              helperText={errors.correo_contacto}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ color: '#334155', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </Stack>
      </Paper>

      {/* Documentos */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(20px)',
          border: '2px solid rgba(255, 255, 255, 0.6)',
          borderRadius: 4,
          p: 3
        }}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 3, 
            fontWeight: 700, 
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <DescriptionIcon sx={{ color: '#334155' }} />
          Documentos
        </Typography>

        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {renderFileUpload('Constancia de Situación Fiscal (CSF)', 'csf', formData.csf_url)}
            {renderFileUpload('CV', 'cv', formData.cv_url)}
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {renderFileUpload('Acta Constitutiva', 'acta_constitutiva', formData.acta_constitutiva_url)}
            {renderFileUpload('REPSE', 'repse', formData.repse_url)}
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {renderFileUpload('INE', 'ine', formData.ine_url)}
            {renderFileUpload('Registro Patronal', 'registro_patronal', formData.registro_patronal_url)}
          </Stack>

          <Box sx={{ maxWidth: { xs: '100%', md: '50%' } }}>
            {renderFileUpload('Comprobante de Domicilio', 'comprobante_domicilio', formData.comprobante_domicilio_url)}
          </Box>
        </Stack>
      </Paper>

      {/* Información Bancaria */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(20px)',
          border: '2px solid rgba(255, 255, 255, 0.6)',
          borderRadius: 4,
          p: 3
        }}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 3, 
            fontWeight: 700, 
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <BankIcon sx={{ color: '#334155' }} />
          Información Bancaria
        </Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="No. de Cuenta Bancaria"
            fullWidth
            placeholder="Número de cuenta bancaria"
            value={formData.numero_cuenta_bancaria}
            onChange={(e) => setFormData({ ...formData, numero_cuenta_bancaria: e.target.value })}
          />

          <TextField
            label="Banco"
            fullWidth
            placeholder="Nombre del banco"
            value={formData.banco}
            onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
          />

          <TextField
            label="Nombre al que está la cuenta"
            fullWidth
            placeholder="Nombre"
            value={formData.nombre_cuenta}
            onChange={(e) => setFormData({ ...formData, nombre_cuenta: e.target.value })}
          />
        </Stack>
      </Paper>

      {/* Error de envío */}
      {errors.submit && (
        <Box
          sx={{
            p: 2,
            bgcolor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 2
          }}
        >
          <Typography variant="body2" sx={{ color: '#dc2626' }}>
            ❌ {errors.submit}
          </Typography>
        </Box>
      )}

      {/* Botones */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 2 }}>
        <Button type="button" onClick={onCancel} variant="cancel" disabled={loading || uploading}>
          Cancelar
        </Button>
        <Button type="submit" variant="success" disabled={loading || uploading} loading={loading || uploading}>
          {loading || uploading ? 'Guardando...' : contratista ? 'Actualizar Contratista' : 'Guardar Contratista'}
        </Button>
      </Box>
    </Box>
  )
}
