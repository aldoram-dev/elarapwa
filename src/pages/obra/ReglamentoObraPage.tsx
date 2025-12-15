import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useProyectoStore } from '@/stores/proyectoStore'
import { db } from '@/db/database'
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
import DescriptionIcon from '@mui/icons-material/Description'
import EditIcon from '@mui/icons-material/Edit'
import CancelIcon from '@mui/icons-material/Cancel'

interface ReglamentoConfig {
  id?: string
  reglamento_url: string
  updated_at?: string
  updated_by?: string
}

export const ReglamentoObraPage: React.FC = () => {
  const { perfil } = useAuth()
  const { proyectos } = useProyectoStore()
  const proyectoActual = proyectos[0]

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reglamentoUrl, setReglamentoUrl] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [userRoles, setUserRoles] = useState<string[]>([])

  // Verificar si el usuario puede editar (Gerente Plataforma o Sistemas)
  const canEdit = userRoles.includes('Gerente Plataforma') || userRoles.includes('Sistemas') || perfil?.nivel === 'Administrador'

  useEffect(() => {
    loadReglamento()
  }, [proyectoActual?.id])

  // Cargar roles del usuario actual
  useEffect(() => {
    const loadUserRoles = async () => {
      if (!perfil?.id) return
      
      try {
        const { data, error } = await supabase
          .from('roles_usuario')
          .select('role_id, roles(id, name)')
          .eq('user_id', perfil.id)
        
        if (error) throw error
        
        const roles = (data || [])
          .map((row: any) => row.roles?.name)
          .filter(Boolean)
        
        setUserRoles(roles)
      } catch (err) {
        console.error('Error cargando roles:', err)
      }
    }
    
    loadUserRoles()
  }, [perfil?.id])

  const loadReglamento = async () => {
    try {
      setLoading(true)
      setError(null)

      // Cargar desde Supabase
      const { data: supaConfig, error: supaError } = await supabase
        .from('reglamento_config')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (supaError && supaError.code !== 'PGRST116') {
        throw supaError
      }

      if (supaConfig) {
        setReglamentoUrl(supaConfig.reglamento_url || '')
        
        // Sincronizar con IndexedDB
        const localConfig = await db.table('reglamento_config').limit(1).first()
        if (localConfig) {
          await db.table('reglamento_config')
            .where('id')
            .equals(localConfig.id)
            .modify(supaConfig)
        } else {
          await db.table('reglamento_config').add(supaConfig)
        }
      }
    } catch (err: any) {
      console.error('Error cargando reglamento:', err)
      setError(err.message || 'Error al cargar el reglamento')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!perfil?.id) return

    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      // Validar URL
      if (reglamentoUrl && !reglamentoUrl.startsWith('http')) {
        setError('La URL debe comenzar con http:// o https://')
        return
      }

      const configData: ReglamentoConfig = {
        reglamento_url: reglamentoUrl.trim(),
        updated_at: new Date().toISOString(),
        updated_by: perfil.id,
      }

      // Verificar si ya existe en la BD local
      const existing = await db.table('reglamento_config')
        .limit(1)
        .first()

      // Guardar en Supabase primero
      if (existing?.id) {
        // Actualizar en Supabase
        const { error: supaError } = await supabase
          .from('reglamento_config')
          .update(configData)
          .eq('id', existing.id)
        
        if (supaError) throw supaError

        // Actualizar en IndexedDB
        await db.table('reglamento_config')
          .where('id')
          .equals(existing.id)
          .modify(configData)
      } else {
        // Insertar en Supabase
        const { data: newConfig, error: supaError } = await supabase
          .from('reglamento_config')
          .insert(configData)
          .select()
          .single()
        
        if (supaError) throw supaError

        // Guardar en IndexedDB con el ID de Supabase
        await db.table('reglamento_config').add({ ...configData, id: newConfig.id })
      }

      setSuccess(true)
      setEditMode(false)
      
      // Ocultar mensaje después de 3 segundos
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('Error guardando reglamento:', err)
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditMode(false)
    setError(null)
    loadReglamento()
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
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <DescriptionIcon sx={{ fontSize: 40, color: '#334155' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
              Reglamento Interno
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Consulta el reglamento interno de la obra
            </Typography>
          </Box>
        </Stack>

        {canEdit && !editMode && reglamentoUrl && (
          <Tooltip title="Editar enlace del reglamento">
            <IconButton 
              onClick={() => setEditMode(true)}
              sx={{ 
                bgcolor: '#334155',
                color: 'white',
                '&:hover': { bgcolor: '#475569' }
              }}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Mensajes */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Reglamento guardado correctamente
        </Alert>
      )}

      {/* Formulario de edición (solo para Gerente Plataforma y Sistemas) */}
      {canEdit && (editMode || !reglamentoUrl) && (
        <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Configurar Enlace del Reglamento
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="URL del Reglamento (Google Docs, Drive, etc.)"
                placeholder="https://docs.google.com/document/d/..."
                value={reglamentoUrl}
                onChange={(e) => setReglamentoUrl(e.target.value)}
                helperText="Ingresa la URL del documento de Google Docs o Drive con el reglamento interno"
                disabled={saving}
              />
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={saving || !reglamentoUrl.trim()}
                  sx={{
                    bgcolor: '#334155',
                    '&:hover': { bgcolor: '#475569' }
                  }}
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
                {editMode && (
                  <Button
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={handleCancel}
                    disabled={saving}
                    sx={{
                      borderColor: '#94a3b8',
                      color: '#64748b',
                      '&:hover': { 
                        borderColor: '#64748b',
                        bgcolor: 'rgba(100, 116, 139, 0.04)'
                      }
                    }}
                  >
                    Cancelar
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Visor del Reglamento */}
      {!reglamentoUrl ? (
        <Alert severity="warning" sx={{ borderRadius: 3 }}>
          <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
            No se encontró el enlace del Reglamento Interno
          </Typography>
          <Typography variant="body2">
            {canEdit 
              ? 'Por favor, configura el enlace del documento arriba.'
              : 'Contacta al administrador para configurar el reglamento.'}
          </Typography>
        </Alert>
      ) : (
        <Paper 
          elevation={3} 
          sx={{ 
            borderRadius: 3,
            overflow: 'hidden',
            height: 'calc(100vh - 300px)',
            minHeight: 600,
          }}
        >
          <iframe
            src={reglamentoUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 0,
            }}
            title="Reglamento Interno de Obra"
            allowFullScreen
          />
        </Paper>
      )}
    </Box>
  )
}

export default ReglamentoObraPage
