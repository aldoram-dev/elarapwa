import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useProyectoStore } from '@/stores/proyectoStore'
import { db, ProgramaObraConfig } from '@/db/database'
import { supabase } from '@/lib/core/supabaseClient'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import EditIcon from '@mui/icons-material/Edit'
import CancelIcon from '@mui/icons-material/Cancel'

const ProgramaObraPage: React.FC = () => {
  const { perfil } = useAuth()
  const { proyectos } = useProyectoStore()
  const proyectoActual = proyectos[0]

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [programaUrl, setProgramaUrl] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [userRoles, setUserRoles] = useState<string[]>([])

  const canEdit = userRoles.includes('Gerente Plataforma') || userRoles.includes('Sistemas') || perfil?.nivel === 'Administrador'

  useEffect(() => {
    loadProgramaObra()
  }, [proyectoActual?.id])

  useEffect(() => {
    const loadUserRoles = async () => {
      if (!perfil?.id) return
      try {
        const { data, error } = await supabase
          .from('roles_usuario')
          .select('role_id, roles(id, name)')
          .eq('user_id', perfil.id)
        if (error) throw error
        const roles = (data || []).map((row: any) => row.roles?.name).filter(Boolean)
        setUserRoles(roles)
      } catch (err) {
        console.error('Error cargando roles:', err)
      }
    }
    loadUserRoles()
  }, [perfil?.id])

  const loadProgramaObra = async () => {
    if (!proyectoActual?.id) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const config = await db.table('programa_obra_config')
        .limit(1)
        .first()
      if (config) setProgramaUrl(config.programa_url || '')
    } catch (err: any) {
      console.error('Error cargando programa de obra:', err)
      setError(err.message || 'Error al cargar el programa')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!proyectoActual?.id || !perfil?.id) return
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)
      if (programaUrl && !programaUrl.startsWith('http')) {
        setError('La URL debe comenzar con http:// o https://')
        return
      }
      const configData: ProgramaObraConfig = {
        programa_url: programaUrl.trim(),
        updated_at: new Date().toISOString(),
        updated_by: perfil.id,
      }
      const existing = await db.table('programa_obra_config')
        .limit(1)
        .first()
      if (existing) {
        await db.table('programa_obra_config')
          .where('id')
          .equals(existing.id)
          .modify(configData)
      } else {
        await db.table('programa_obra_config').add(configData)
      }
      setSuccess(true)
      setEditMode(false)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('Error guardando programa:', err)
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditMode(false)
    setError(null)
    loadProgramaObra()
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <CalendarMonthIcon sx={{ fontSize: 40, color: '#334155' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
              Programa de Obra
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Consulta el programa de construcción
            </Typography>
          </Box>
        </Stack>
        {canEdit && !editMode && programaUrl && (
          <Tooltip title="Editar enlace del programa">
            <IconButton 
              onClick={() => setEditMode(true)}
              sx={{ bgcolor: '#334155', color: 'white', '&:hover': { bgcolor: '#475569' } }}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>Programa guardado correctamente</Alert>}

      {canEdit && (editMode || !programaUrl) && (
        <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Configurar Enlace del Programa de Obra
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="URL del Programa (Google Sheets, Drive, etc.)"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={programaUrl}
                onChange={(e) => setProgramaUrl(e.target.value)}
                helperText="Ingresa la URL del documento con el programa de obra"
                disabled={saving}
              />
              <Stack direction="row" spacing={2}>
                <Button variant="contained" startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  onClick={handleSave} disabled={saving || !programaUrl.trim()}
                  sx={{ bgcolor: '#334155', '&:hover': { bgcolor: '#475569' } }}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
                {editMode && (
                  <Button variant="outlined" startIcon={<CancelIcon />} onClick={handleCancel} disabled={saving}
                    sx={{ borderColor: '#94a3b8', color: '#64748b', '&:hover': { borderColor: '#64748b', bgcolor: 'rgba(100, 116, 139, 0.04)' } }}>
                    Cancelar
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {!programaUrl ? (
        <Alert severity="warning" sx={{ borderRadius: 3 }}>
          <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
            No se encontró el enlace del Programa de Obra
          </Typography>
          <Typography variant="body2">
            {canEdit ? 'Por favor, configura el enlace del documento arriba.' : 'Contacta al administrador para configurar el programa.'}
          </Typography>
        </Alert>
      ) : (
        <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden', height: 'calc(100vh - 300px)', minHeight: 600 }}>
          <iframe src={programaUrl} style={{ width: '100%', height: '100%', border: 0 }} title="Programa de Obra" allowFullScreen />
        </Paper>
      )}
    </Box>
  )
}

export default ProgramaObraPage
