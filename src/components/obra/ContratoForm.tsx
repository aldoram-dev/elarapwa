import React, { useState } from 'react'
import { Contrato, TipoContrato } from '@/types/contrato'
import { useFileUpload } from '@/lib/hooks/useFileUpload'
import { getCategorias, getAllPartidas, getAllSubpartidas } from '@/config/catalogo-obra'
import { 
  Box, 
  Paper, 
  TextField, 
  Typography,
  InputAdornment,
  Button as MuiButton,
  LinearProgress,
  Stack,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material'
import { 
  Description as DescriptionIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
  AttachMoney as MoneyIcon,
  Percent as PercentIcon,
  CalendarMonth as CalendarIcon,
  CloudUpload as UploadIcon,
  CheckCircle as CheckIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material'
import { Button } from '@components/ui'

interface ContratoFormProps {
  contrato?: Contrato | null
  onSubmit: (data: Partial<Contrato>) => Promise<void>
  onCancel: () => void
  contratistas?: Array<{ id: string; nombre: string; categoria?: string; partida?: string }>
  readOnly?: boolean
}

export const ContratoForm: React.FC<ContratoFormProps> = ({ 
  contrato, 
  onSubmit, 
  onCancel,
  contratistas = [],
  readOnly = false
}) => {
  // Debug: ver cuántos contratistas hay
  React.useEffect(() => {
    console.log('ContratoForm - Contratistas disponibles:', contratistas.length, contratistas)
  }, [contratistas])

  const [formData, setFormData] = useState<Partial<Contrato>>({
    contratista_id: contrato?.contratista_id || '',
    categoria: contrato?.categoria || '',
    partida: contrato?.partida || '',
    subpartida: contrato?.subpartida || '',
    clave_contrato: contrato?.clave_contrato || '',
    tipo_contrato: contrato?.tipo_contrato || undefined,
    tratamiento: contrato?.tratamiento || '',
    descripcion: contrato?.descripcion || '',
    monto_contrato: contrato?.monto_contrato || 0,
    anticipo_monto: contrato?.anticipo_monto || 0,
    retencion_porcentaje: contrato?.retencion_porcentaje || 0,
    penalizacion_maxima_porcentaje: contrato?.penalizacion_maxima_porcentaje || 0,
    penalizacion_por_dia: contrato?.penalizacion_por_dia || 0,
    fecha_inicio: contrato?.fecha_inicio || '',
    fecha_fin: contrato?.fecha_fin || '',
    contrato_pdf_url: contrato?.contrato_pdf_url || '',
    active: contrato?.active ?? true,
  })

  const [archivoContrato, setArchivoContrato] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { uploadFile, uploading } = useFileUpload({ optimize: false })

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.contratista_id) {
      newErrors.contratista_id = 'El contratista es requerido'
    }

    if (!formData.monto_contrato || formData.monto_contrato <= 0) {
      newErrors.monto_contrato = 'El monto contratado debe ser mayor a 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleContratistaChange = (contratistaId: string) => {
    const contratista = contratistas.find(c => c.id === contratistaId)
    if (contratista) {
      setFormData(prev => ({
        ...prev,
        contratista_id: contratistaId,
        categoria: contratista.categoria || prev.categoria,
        partida: contratista.partida || prev.partida
      }))
    } else {
      setFormData(prev => ({ ...prev, contratista_id: contratistaId }))
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setArchivoContrato(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const updatedFormData = { ...formData }

      // Subir archivo PDF del contrato si existe
      if (archivoContrato) {
        setUploadProgress(true)
        const result = await uploadFile(archivoContrato)
        if (result.success && result.data) {
          updatedFormData.contrato_pdf_url = result.data.path
        }
        setUploadProgress(false)
      }

      await onSubmit(updatedFormData)
    } catch (error: any) {
      setErrors({ submit: error.message || 'Error al guardar el contrato' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Información del Contratista y Categorización */}
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
          <PersonIcon sx={{ color: '#334155' }} />
          Contratista y Categorización
        </Typography>

        <Stack spacing={2}>
          <FormControl fullWidth required error={!!errors.contratista_id}>
            <InputLabel>Contratista *</InputLabel>
            <Select
              value={formData.contratista_id}
              label="Contratista *"
              disabled={readOnly}
              onChange={(e) => {
                handleContratistaChange(e.target.value)
                if (errors.contratista_id) {
                  const { contratista_id, ...rest } = errors
                  setErrors(rest)
                }
              }}
            >
              <MenuItem value="">
                <em>Seleccione un contratista</em>
              </MenuItem>
              {contratistas.length === 0 ? (
                <MenuItem disabled>
                  <em>No hay contratistas registrados. Cree uno primero.</em>
                </MenuItem>
              ) : (
                contratistas.map((contratista) => (
                  <MenuItem key={contratista.id} value={contratista.id}>
                    {contratista.nombre}
                  </MenuItem>
                ))
              )}
            </Select>
            {errors.contratista_id && (
              <Typography variant="caption" sx={{ color: '#dc2626', mt: 0.5, ml: 1.5 }}>
                {errors.contratista_id}
              </Typography>
            )}
          </FormControl>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Categoría"
              fullWidth
              disabled={readOnly}
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              inputProps={{
                list: 'categorias-contrato-list'
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CategoryIcon sx={{ color: '#334155', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
            <datalist id="categorias-contrato-list">
              {getCategorias().map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>

            <TextField
              label="Partida"
              fullWidth
              disabled={readOnly}
              value={formData.partida}
              onChange={(e) => setFormData({ ...formData, partida: e.target.value })}
              inputProps={{
                list: 'partidas-contrato-list'
              }}
            />
            <datalist id="partidas-contrato-list">
              {getAllPartidas().map((partida) => (
                <option key={partida} value={partida} />
              ))}
            </datalist>
          </Stack>

          <TextField
            label="Subpartida"
            fullWidth
            disabled={readOnly}
            value={formData.subpartida}
            onChange={(e) => setFormData({ ...formData, subpartida: e.target.value })}
            inputProps={{
              list: 'subpartidas-contrato-list'
            }}
          />
          <datalist id="subpartidas-contrato-list">
            {getAllSubpartidas().map((subpartida) => (
              <option key={subpartida} value={subpartida} />
            ))}
          </datalist>
        </Stack>
      </Paper>

      {/* Información del Contrato */}
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
          <AssignmentIcon sx={{ color: '#334155' }} />
          Información del Contrato
        </Typography>

        <Stack spacing={2}>
          <TextField
            label="Clave de Contrato"
            fullWidth
            disabled={readOnly}
            value={formData.clave_contrato}
            onChange={(e) => setFormData({ ...formData, clave_contrato: e.target.value })}
          />

          <FormControl fullWidth>
            <InputLabel>Tipo de Contrato</InputLabel>
            <Select
              value={formData.tipo_contrato || ''}
              label="Tipo de Contrato"
              disabled={readOnly}
              onChange={(e) => setFormData({ ...formData, tipo_contrato: e.target.value as TipoContrato })}
            >
              <MenuItem value="">
                <em>Seleccione un tipo</em>
              </MenuItem>
              <MenuItem value="PRECIO_ALZADO">Precio Alzado</MenuItem>
              <MenuItem value="PRECIO_UNITARIO">Precio Unitario</MenuItem>
              <MenuItem value="ADMINISTRACION">Administración</MenuItem>
              <MenuItem value="MIXTO">Mixto</MenuItem>
              <MenuItem value="Orden de Trabajo">Orden de Trabajo</MenuItem>
              <MenuItem value="Orden de Compra">Orden de Compra</MenuItem>
              <MenuItem value="Llave en Mano">Llave en Mano</MenuItem>
              <MenuItem value="Prestacion de Servicios">Prestación de Servicios</MenuItem>
              <MenuItem value="Contrato">Contrato</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Tratamiento</InputLabel>
            <Select
              value={formData.tratamiento || ''}
              label="Tratamiento"
              disabled={readOnly}
              onChange={(e) => setFormData({ ...formData, tratamiento: e.target.value })}
            >
              <MenuItem value="">
                <em>Seleccione tratamiento</em>
              </MenuItem>
              <MenuItem value="IVA EXENTO">IVA EXENTO</MenuItem>
              <MenuItem value="MAS IVA">MAS IVA</MenuItem>
              <MenuItem value="IVA TASA 0">IVA TASA 0</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Descripción"
            fullWidth
            multiline
            rows={3}
            disabled={readOnly}
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <DescriptionIcon sx={{ color: '#334155', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </Paper>

      {/* Montos */}
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
          <MoneyIcon sx={{ color: '#334155' }} />
          Montos
        </Typography>

        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Monto Neto Contratado *"
              fullWidth
              required
              type="number"
              disabled={readOnly}
              value={formData.monto_contrato}
              onChange={(e) => {
                setFormData({ ...formData, monto_contrato: parseFloat(e.target.value) || 0 })
                if (errors.monto_contrato) {
                  const { monto_contrato, ...rest } = errors
                  setErrors(rest)
                }
              }}
              error={!!errors.monto_contrato}
              helperText={errors.monto_contrato}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MoneyIcon sx={{ color: '#334155', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Monto Neto de Anticipo"
              fullWidth
              type="number"
              disabled={readOnly}
              value={formData.anticipo_monto}
              onChange={(e) => setFormData({ ...formData, anticipo_monto: parseFloat(e.target.value) || 0 })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MoneyIcon sx={{ color: '#334155', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="% Anticipo"
              disabled
              type="text"
              value={
                formData.monto_contrato && formData.anticipo_monto
                  ? `${((formData.anticipo_monto / formData.monto_contrato) * 100).toFixed(2)}%`
                  : '0%'
              }
              sx={{ 
                maxWidth: { xs: '100%', md: 150 },
                '& .MuiInputBase-input.Mui-disabled': {
                  WebkitTextFillColor: '#334155',
                  fontWeight: 600,
                  textAlign: 'center'
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PercentIcon sx={{ color: '#334155', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </Stack>
      </Paper>

      {/* Retenciones y Penalizaciones */}
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
          <PercentIcon sx={{ color: '#334155' }} />
          Retenciones y Penalizaciones
        </Typography>

        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="% Retención"
              fullWidth
              type="number"
              disabled={readOnly}
              value={formData.retencion_porcentaje}
              onChange={(e) => setFormData({ ...formData, retencion_porcentaje: parseFloat(e.target.value) || 0 })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PercentIcon sx={{ color: '#334155', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="% Penalización Máxima"
              fullWidth
              type="number"
              disabled={readOnly}
              value={formData.penalizacion_maxima_porcentaje}
              onChange={(e) => setFormData({ ...formData, penalizacion_maxima_porcentaje: parseFloat(e.target.value) || 0 })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PercentIcon sx={{ color: '#334155', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>

          <TextField
            label="Penalización por Día"
            fullWidth
            type="number"
            disabled={readOnly}
            value={formData.penalizacion_por_dia}
            onChange={(e) => setFormData({ ...formData, penalizacion_por_dia: parseFloat(e.target.value) || 0 })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MoneyIcon sx={{ color: '#334155', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </Paper>

      {/* Fechas */}
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
          <CalendarIcon sx={{ color: '#334155' }} />
          Fechas
        </Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Fecha de Inicio"
            fullWidth
            type="date"
            disabled={readOnly}
            value={formData.fecha_inicio}
            onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CalendarIcon sx={{ color: '#334155', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="Fecha de Fin"
            fullWidth
            type="date"
            disabled={readOnly}
            value={formData.fecha_fin}
            onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CalendarIcon sx={{ color: '#334155', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </Paper>

      {/* Contrato PDF */}
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
          Documento del Contrato
        </Typography>

        <Box>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#1e293b' }}>
            Contrato (PDF)
          </Typography>
          <MuiButton
            component="label"
            variant="outlined"
            fullWidth
            disabled={readOnly}
            startIcon={archivoContrato || formData.contrato_pdf_url ? <CheckIcon /> : <UploadIcon />}
            sx={{
              height: 42,
              textTransform: 'none',
              borderColor: archivoContrato || formData.contrato_pdf_url ? '#22c55e' : '#e2e8f0',
              color: archivoContrato || formData.contrato_pdf_url ? '#22c55e' : '#64748b',
              '&:hover': {
                borderColor: '#334155',
                bgcolor: 'rgba(51, 65, 85, 0.05)'
              }
            }}
          >
            {archivoContrato?.name || (formData.contrato_pdf_url ? 'Archivo cargado' : 'Seleccionar archivo')}
            <input
              type="file"
              hidden
              accept=".pdf"
              onChange={handleFileSelect}
            />
          </MuiButton>
          {uploadProgress && (
            <LinearProgress sx={{ mt: 1, height: 2 }} />
          )}
        </Box>
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
          {readOnly ? 'Cerrar' : 'Cancelar'}
        </Button>
        {!readOnly && (
          <Button type="submit" variant="success" disabled={loading || uploading} loading={loading || uploading}>
            {loading || uploading ? 'Procesando...' : contrato ? 'Actualizar Contrato' : 'Procesar Contrato'}
          </Button>
        )}
      </Box>
    </Box>
  )
}
