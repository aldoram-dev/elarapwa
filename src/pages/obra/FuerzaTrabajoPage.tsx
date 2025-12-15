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
import PeopleIcon from '@mui/icons-material/People'
import EditIcon from '@mui/icons-material/Edit'
import CancelIcon from '@mui/icons-material/Cancel'

interface FuerzaTrabajoConfig {
  id?: string
  buba_url: string
  updated_at?: string
  updated_by?: string
}

export const FuerzaTrabajoPage: React.FC = () => {
  const { perfil } = useAuth()
  const { proyectos } = useProyectoStore()
  const proyectoActual = proyectos[0]

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [bubaUrl, setBubaUrl] = useState('https://app.getbuba.com/index.html#/auth/sign-in?redirectURL=%2Fprojects')
  const [editMode, setEditMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [userRoles, setUserRoles] = useState<string[]>([])

  // Verificar si el usuario puede editar
  const canEdit = userRoles.includes('Gerente Plataforma') || userRoles.includes('Sistemas') || perfil?.nivel === 'Administrador'

  useEffect(() => {
    loadFuerzaTrabajo()
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

  const loadFuerzaTrabajo = async () => {
    try {
      setLoading(true)
      setError(null)

      // Cargar desde Supabase
      const { data: supaConfig, error: supaError } = await supabase
        .from('fuerza_trabajo_config')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (supaError && supaError.code !== 'PGRST116') {
        throw supaError
      }

      if (supaConfig) {
        setBubaUrl(supaConfig.buba_url || 'https://app.getbuba.com/index.html#/auth/sign-in?redirectURL=%2Fprojects')
        
        // Sincronizar con IndexedDB
        const localConfig = await db.table('fuerza_trabajo_config').limit(1).first()
        if (localConfig) {
          await db.table('fuerza_trabajo_config')
            .where('id')
            .equals(localConfig.id)
            .modify(supaConfig)
        } else {
          await db.table('fuerza_trabajo_config').add(supaConfig)
        }
      }
    } catch (err: any) {
      console.error('Error cargando fuerza de trabajo:', err)
      setError(err.message || 'Error al cargar la configuración')
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
      if (bubaUrl && !bubaUrl.startsWith('http')) {
        setError('La URL debe comenzar con http:// o https://')
        return
      }

      const configData: FuerzaTrabajoConfig = {
        buba_url: bubaUrl.trim(),
        updated_at: new Date().toISOString(),
        updated_by: perfil.id,
      }

      // Verificar si ya existe en la BD local
      const existing = await db.table('fuerza_trabajo_config')
        .limit(1)
        .first()

      // Guardar en Supabase primero
      if (existing?.id) {
        // Actualizar en Supabase
        const { error: supaError } = await supabase
          .from('fuerza_trabajo_config')
          .update(configData)
          .eq('id', existing.id)
        
        if (supaError) throw supaError

        // Actualizar en IndexedDB
        await db.table('fuerza_trabajo_config')
          .where('id')
          .equals(existing.id)
          .modify(configData)
      } else {
        // Insertar en Supabase
        const { data: newConfig, error: supaError } = await supabase
          .from('fuerza_trabajo_config')
          .insert(configData)
          .select()
          .single()
        
        if (supaError) throw supaError

        // Guardar en IndexedDB con el ID de Supabase
        await db.table('fuerza_trabajo_config').add({ ...configData, id: newConfig.id })
      }

      setSuccess(true)
      setEditMode(false)
      
      // Ocultar mensaje después de 3 segundos
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('Error guardando fuerza de trabajo:', err)
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditMode(false)
    setError(null)
    loadFuerzaTrabajo()
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
          <PeopleIcon sx={{ fontSize: 40, color: '#334155' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
              Fuerza de Trabajo
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gestión de equipos y trabajadores con Buba
            </Typography>
          </Box>
        </Stack>

        {canEdit && (
          <Tooltip title="Editar URL de Buba">
            <IconButton 
              onClick={() => setEditMode(!editMode)}
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
          Configuración guardada correctamente
        </Alert>
      )}

      {/* Formulario de edición (solo para administradores) */}
      {canEdit && editMode && (
        <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Configurar URL de Buba
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="URL de Buba"
                placeholder="https://app.getbuba.com/..."
                value={bubaUrl}
                onChange={(e) => setBubaUrl(e.target.value)}
                helperText="URL de la aplicación Buba para gestión de fuerza de trabajo"
                disabled={saving}
              />
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={saving || !bubaUrl.trim()}
                  sx={{
                    bgcolor: '#334155',
                    '&:hover': { bgcolor: '#475569' }
                  }}
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
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
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Visor de Buba */}
      <Paper 
        elevation={3} 
        sx={{ 
          borderRadius: 3,
          overflow: 'hidden',
          height: 'calc(100vh - 250px)',
          minHeight: 700,
        }}
      >
        <iframe
          src={bubaUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 0,
          }}
          title="Fuerza de Trabajo - Buba"
          allowFullScreen
        />
      </Paper>
    </Box>
  )
}

export default FuerzaTrabajoPage
