import React, { useState } from 'react'
import { Contrato, TipoContrato } from '@/types/contrato'
import { useFileUpload } from '@/lib/hooks/useFileUpload'
import { usePresupuestoCombos } from '@/lib/hooks/usePresupuestoCombos'
import { supabase } from '@/lib/core/supabaseClient'
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
  InputLabel,
  Autocomplete
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
  readOnly
}) => {
  // Asegurar que readOnly es siempre booleano
  const isReadOnly = Boolean(readOnly);
  
  const [formData, setFormData] = useState<Partial<Contrato>>({
    contratista_id: contrato?.contratista_id || '',
    clave_contrato: contrato?.clave_contrato || '',
    nombre: contrato?.nombre || '',
    categoria: contrato?.categoria || '',
    partida: contrato?.partida || '',
    subpartida: contrato?.subpartida || '',
    tipo_contrato: contrato?.tipo_contrato || undefined,
    tratamiento: contrato?.tratamiento || undefined,
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
  const [selectedComboId, setSelectedComboId] = useState<string>('')
  
  // Estados para valores de entrada sin formato
  const [montoInput, setMontoInput] = useState<string>('')
  const [anticipoInput, setAnticipoInput] = useState<string>('')
  const [penalizacionInput, setPenalizacionInput] = useState<string>('')
  const [isEditingMonto, setIsEditingMonto] = useState(false)
  const [isEditingAnticipo, setIsEditingAnticipo] = useState(false)
  const [isEditingPenalizacion, setIsEditingPenalizacion] = useState(false)

  const { uploadFile, uploading } = useFileUpload({ optimize: false })
  const { combos, loading: loadingCombos } = usePresupuestoCombos()
  
  // Inicializar valores de input cuando cambia el contrato
  React.useEffect(() => {
    if (contrato) {
      setMontoInput(contrato.monto_contrato?.toString() || '')
      setAnticipoInput(contrato.anticipo_monto?.toString() || '')
      setPenalizacionInput(contrato.penalizacion_por_dia?.toString() || '')
    }
  }, [contrato])
  
  // Función para formatear montos con separadores de miles
  const formatCurrency = (value: number): string => {
    if (!value && value !== 0) return ''
    return value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Función para parsear string de moneda a número
  const parseCurrency = (value: string): number => {
    const cleaned = value.replace(/[^0-9.]/g, '')
    return parseFloat(cleaned) || 0
  }
  
  // Debug
  React.useEffect(() => {
    console.log('ContratoForm - Contratistas disponibles:', contratistas.length, contratistas)
    console.log('ContratoForm - readOnly recibido:', readOnly, '| isReadOnly:', isReadOnly)
    console.log('ContratoForm - Combos de presupuesto disponibles:', combos.length)
  }, [contratistas, readOnly, combos])

  // Inicializar combo seleccionado si existe contrato
  React.useEffect(() => {
    if (contrato && combos.length > 0) {
      const comboId = `${contrato.categoria}|${contrato.partida}|${contrato.subpartida}`.toLowerCase()
      const existeCombo = combos.find(c => c.id === comboId)
      if (existeCombo) {
        setSelectedComboId(comboId)
      }
    }
  }, [contrato, combos])

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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.contratista_id) {
      newErrors.contratista_id = 'El contratista es requerido'
    }

    if (!formData.clave_contrato?.trim()) {
      newErrors.clave_contrato = 'La clave de contrato es requerida'
    }

    if (!formData.nombre?.trim()) {
      newErrors.nombre = 'El nombre del contrato es requerido'
    }

    if (!formData.monto_contrato || formData.monto_contrato <= 0) {
      newErrors.monto_contrato = 'El monto contratado debe ser mayor a 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleContratistaChange = (contratistaId: string) => {
    setFormData(prev => ({
      ...prev,
      contratista_id: contratistaId
    }))
  }

  const handleComboChange = (comboId: string) => {
    setSelectedComboId(comboId)
    const combo = combos.find(c => c.id === comboId)
    if (combo) {
      setFormData(prev => ({
        ...prev,
        categoria: combo.categoria,
        partida: combo.partida,
        subpartida: combo.subpartida
      }))
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
          <Autocomplete
            fullWidth
            value={contratistas.find(c => c.id === formData.contratista_id) || null}
            options={contratistas}
            getOptionLabel={(option) => option.nombre}
            disabled={isReadOnly}
            onChange={(_, newValue) => {
              handleContratistaChange(newValue?.id || '')
              if (errors.contratista_id) {
                const { contratista_id, ...rest } = errors
                setErrors(rest)
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Contratista *"
                required
                error={!!errors.contratista_id}
                helperText={errors.contratista_id || (contratistas.length === 0 ? 'No hay contratistas registrados. Cree uno primero.' : '')}
                placeholder="Escriba para buscar..."
              />
            )}
            noOptionsText="No se encontraron contratistas"
            isOptionEqualToValue={(option, value) => option.id === value.id}
          />

          <Autocomplete
            fullWidth
            value={combos.find(c => c.id === selectedComboId) || null}
            options={combos}
            getOptionLabel={(option) => option.label}
            disabled={isReadOnly || loadingCombos}
            onChange={(_, newValue) => {
              handleComboChange(newValue?.id || '')
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Categoría - Partida - Subpartida *"
                required
                placeholder="Escriba para buscar..."
                helperText={!selectedComboId ? 'Las combinaciones provienen del presupuesto validado' : ''}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <InputAdornment position="start">
                        <CategoryIcon sx={{ color: '#334155', fontSize: 20 }} />
                      </InputAdornment>
                      {params.InputProps.startAdornment}
                    </>
                  )
                }}
              />
            )}
            noOptionsText={loadingCombos ? "Cargando combinaciones..." : (combos.length === 0 ? "No hay presupuesto cargado. Suba el presupuesto primero." : "No se encontraron coincidencias")}
            loading={loadingCombos}
            isOptionEqualToValue={(option, value) => option.id === value.id}
          />

          {/* Campos ocultos que muestran los valores seleccionados */}
          {selectedComboId && (
            <Stack 
              direction="row" 
              spacing={1} 
              sx={{ 
                bgcolor: '#f1f5f9', 
                p: 1.5, 
                borderRadius: 2,
                border: '1px solid #cbd5e1'
              }}
            >
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500 }}>
                📂 {formData.categoria}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>•</Typography>
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500 }}>
                📋 {formData.partida}
              </Typography>
              {formData.subpartida && (
                <>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>•</Typography>
                  <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500 }}>
                    📄 {formData.subpartida}
                  </Typography>
                </>
              )}
            </Stack>
          )}
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
            label="Clave de Contrato *"
            fullWidth
            required
            disabled={isReadOnly}
            value={formData.clave_contrato}
            onChange={(e) => setFormData({ ...formData, clave_contrato: e.target.value })}
            placeholder="Ej: CTR-2025-001"
            helperText="Clave única del contrato"
            error={!!errors.clave_contrato}
          />

          <TextField
            label="Nombre del Contrato *"
            fullWidth
            required
            disabled={isReadOnly}
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            placeholder="Ej: Construcción de edificio principal"
            helperText="Nombre descriptivo del contrato"
            error={!!errors.nombre}
          />

          <FormControl fullWidth>
            <InputLabel>Tipo de Contrato</InputLabel>
            <Select
              value={formData.tipo_contrato || ''}
              label="Tipo de Contrato"
              disabled={isReadOnly}
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
              disabled={isReadOnly}
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
            disabled={isReadOnly}
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
              type="text"
              disabled={isReadOnly}
              value={isEditingMonto ? montoInput : (formData.monto_contrato ? formatCurrency(formData.monto_contrato) : '')}
              onFocus={() => {
                setIsEditingMonto(true)
                setMontoInput(formData.monto_contrato?.toString() || '')
              }}
              onChange={(e) => {
                setMontoInput(e.target.value)
                if (errors.monto_contrato) {
                  const { monto_contrato, ...rest } = errors
                  setErrors(rest)
                }
              }}
              onBlur={() => {
                setIsEditingMonto(false)
                const numericValue = parseCurrency(montoInput)
                setFormData({ ...formData, monto_contrato: numericValue })
              }}
              error={!!errors.monto_contrato}
              helperText={errors.monto_contrato}
              placeholder="0.00"
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
              type="text"
              disabled={isReadOnly}
              value={isEditingAnticipo ? anticipoInput : (formData.anticipo_monto ? formatCurrency(formData.anticipo_monto) : '')}
              onFocus={() => {
                setIsEditingAnticipo(true)
                setAnticipoInput(formData.anticipo_monto?.toString() || '')
              }}
              onChange={(e) => setAnticipoInput(e.target.value)}
              onBlur={() => {
                setIsEditingAnticipo(false)
                const numericValue = parseCurrency(anticipoInput)
                setFormData({ ...formData, anticipo_monto: numericValue })
              }}
              placeholder="0.00"
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
              disabled={isReadOnly}
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
              disabled={isReadOnly}
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
            type="text"
            disabled={isReadOnly}
            value={isEditingPenalizacion ? penalizacionInput : (formData.penalizacion_por_dia ? formatCurrency(formData.penalizacion_por_dia) : '')}
            onFocus={() => {
              setIsEditingPenalizacion(true)
              setPenalizacionInput(formData.penalizacion_por_dia?.toString() || '')
            }}
            onChange={(e) => setPenalizacionInput(e.target.value)}
            onBlur={() => {
              setIsEditingPenalizacion(false)
              const numericValue = parseCurrency(penalizacionInput)
              setFormData({ ...formData, penalizacion_por_dia: numericValue })
            }}
            placeholder="0.00"
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
            disabled={isReadOnly}
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
            disabled={isReadOnly}
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
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>
            Contrato (PDF)
          </Typography>
          {formData.contrato_pdf_url && !archivoContrato ? (
            <Stack direction="column" spacing={1}>
              <MuiButton
                variant="contained"
                fullWidth
                startIcon={<CheckIcon />}
                onClick={() => handleOpenDocument(formData.contrato_pdf_url)}
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
              {!readOnly && (
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
                    accept=".pdf"
                    onChange={handleFileSelect}
                  />
                </MuiButton>
              )}
            </Stack>
          ) : (
            <MuiButton
              component="label"
              variant="outlined"
              fullWidth
              disabled={isReadOnly}
              startIcon={archivoContrato ? <CheckIcon /> : <UploadIcon />}
              sx={{
                height: 44,
                textTransform: 'none',
                borderColor: archivoContrato ? '#10b981' : '#cbd5e1',
                color: archivoContrato ? '#10b981' : '#64748b',
                fontWeight: archivoContrato ? 600 : 500,
                fontSize: '0.875rem',
                bgcolor: archivoContrato ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                '&:hover': {
                  borderColor: archivoContrato ? '#059669' : '#94a3b8',
                  bgcolor: archivoContrato ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.05)'
                }
              }}
            >
              {archivoContrato?.name || 'Seleccionar archivo'}
              <input
                type="file"
                hidden
                accept=".pdf"
                onChange={handleFileSelect}
              />
            </MuiButton>
          )}
          {uploadProgress && (
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
