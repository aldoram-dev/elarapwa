import React, { useState, useEffect } from 'react'
import { Usuario } from '@/types/usuario'
import { Button } from '@components/ui'
import { useFileUpload } from '@/lib/hooks/useFileUpload'
import { SignedImage } from '@components/ui/SignedImage'
import { 
  Box, 
  TextField, 
  Avatar, 
  IconButton, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Typography,
  Chip,
  CircularProgress,
  InputAdornment,
  FormHelperText,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Divider
} from '@mui/material'
import { 
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Shield as ShieldIcon,
  Key as KeyIcon,
  Close as CloseIcon,
  Image as ImageIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material'
import { supabase } from '@/lib/core/supabaseClient'
import { DocumentW } from '@/types/files'
import { FIXED_ROLES } from '@/config/roles'

interface UsuarioFormProps {
  usuario?: Usuario | null
  onSubmit: (data: Partial<Usuario> & { password?: string }) => Promise<void>
  onCancel: () => void
  contratistas?: Array<{ id: string; nombre: string }>
}

export const UsuarioForm: React.FC<UsuarioFormProps> = ({ usuario, onSubmit, onCancel, contratistas = [] }) => {
  const [formData, setFormData] = useState<Partial<Usuario> & { password?: string }>({
    nombre: usuario?.nombre || '',
    email: usuario?.email || '',
    telefono: usuario?.telefono || '',
    contratista_id: usuario?.contratista_id || '',
    nivel: usuario?.nivel || 'Usuario',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const [existingAvatar, setExistingAvatar] = useState<DocumentW | undefined>()
  // Roles fijos del sistema
  const [selectedRoleNames, setSelectedRoleNames] = useState<Set<string>>(new Set())
  const [rolesLoading, setRolesLoading] = useState(false)
  const [roleIdMap, setRoleIdMap] = useState<Map<string, string>>(new Map())
  
  // Detectar si el usuario tiene rol "Gerente Plataforma" (protegido)
  const isGerentePlataforma = selectedRoleNames.has('Gerente Plataforma')

  const { uploading, uploadFile } = useFileUpload({ optimize: true })

  useEffect(() => {
    if (usuario?.avatar_url) {
      setExistingAvatar({
        id: `avatar-${usuario.id}`,
        nombre: `avatar-${usuario.nombre}`,
        path: usuario.avatar_url,
        url: usuario.avatar_url,
        bucket: 'documents',
        isPublic: false
      })
    }
  }, [usuario])

  // Cargar mapeo de roles (nombre -> id de BD) y roles del usuario
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setRolesLoading(true)
        
        // 1. Cargar todos los roles de la BD para obtener el mapeo nombre->id
        const { data: dbRoles, error: rolesError } = await supabase
          .from('roles')
          .select('id, name')
        if (rolesError) throw rolesError
        
        // Crear mapa: nombre del rol -> id en BD
        const map = new Map<string, string>()
        dbRoles?.forEach((r: any) => {
          map.set(r.name, r.id)
        })
        if (!cancelled) setRoleIdMap(map)

        // 2. Si es edición, cargar roles asignados al usuario
        if (usuario?.id) {
          const { data: userRoles, error: urErr } = await supabase
            .from('roles_usuario')
            .select('role_id, roles(name)')
            .eq('user_id', usuario.id)
          if (urErr) throw urErr
          
          // Crear set de nombres de roles asignados
          const names = new Set<string>()
          userRoles?.forEach((ur: any) => {
            if (ur.roles?.name) {
              names.add(ur.roles.name)
            }
          })
          if (!cancelled) setSelectedRoleNames(names)
        } else {
          if (!cancelled) setSelectedRoleNames(new Set())
        }
      } catch (e) {
        console.error('Error cargando roles:', e)
      } finally {
        if (!cancelled) setRolesLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [usuario?.id])

  const toggleRole = (roleName: string) => {
    const next = new Set(selectedRoleNames)
    if (next.has(roleName)) next.delete(roleName)
    else next.add(roleName)
    setSelectedRoleNames(next)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.nombre?.trim()) {
      newErrors.nombre = 'El nombre es requerido'
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'El email es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }

    // Solo validar password en creación
    if (!usuario && (!formData.password || formData.password.length < 6)) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres'
    }

    if (formData.telefono && !/^[\d\s\+\-\(\)]+$/.test(formData.telefono)) {
      newErrors.telefono = 'Teléfono inválido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, avatar: 'Solo se permiten imágenes' })
        return
      }

      if (file.size > 2 * 1024 * 1024) {
        setErrors({ ...errors, avatar: 'El archivo no debe superar 2MB' })
        return
      }

      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      const { avatar, ...restErrors } = errors
      setErrors(restErrors)
    }
  }

  const removeAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview('')
    setExistingAvatar(undefined)
    setFormData({ ...formData, avatar_url: undefined })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      let avatarUrl = formData.avatar_url

      // Si hay un archivo nuevo, subirlo primero
      if (avatarFile) {
        const result = await uploadFile(avatarFile)
        if (result.success && result.data) {
          avatarUrl = result.data.path
        } else {
          throw new Error(result.error || 'Error al subir el avatar')
        }
      }

      const dataToSubmit: Partial<Usuario> & { password?: string } = {
        ...formData,
        avatar_url: avatarUrl,
        roles: Array.from(selectedRoleNames), // Convertir Set a array
      }

      // Si es edición, no enviar password vacío
      if (usuario && !dataToSubmit.password) {
        delete dataToSubmit.password
      }

      await onSubmit(dataToSubmit)

      // Sincronizar roles del usuario SOLO en modo edición
      // En creación, el Edge Function ya maneja todo
      if (!usuario) {
        // Usuario nuevo: Edge Function maneja roles, no hacer nada más
        onCancel()
        setLoading(false)
        return
      }

      // Modo edición: sincronizar roles
      const userId = usuario.id

      if (userId) {
        // 2) Cargar roles actuales
        const { data: currentRows, error: curErr } = await supabase
          .from('roles_usuario')
          .select('role_id, roles(name)')
          .eq('user_id', userId)
        if (curErr) throw curErr
        
        // Set de nombres de roles actuales
        const currentRoleNames = new Set<string>()
        const currentRoleIds = new Map<string, string>() // nombre -> role_id
        currentRows?.forEach((r: any) => {
          if (r.roles?.name) {
            currentRoleNames.add(r.roles.name)
            currentRoleIds.set(r.roles.name, r.role_id)
          }
        })

        // 3) Calcular diferencias (trabajamos con nombres de roles)
        const toAddNames = [...selectedRoleNames].filter(name => !currentRoleNames.has(name))
        const toRemoveNames = [...currentRoleNames].filter(name => !selectedRoleNames.has(name))

        console.log('🔄 Sincronizando roles:', {
          selectedRoleNames: Array.from(selectedRoleNames),
          currentRoleNames: Array.from(currentRoleNames),
          toAddNames,
          toRemoveNames,
          roleIdMap: Object.fromEntries(roleIdMap)
        })

        // 4) Insertar nuevos roles
        if (toAddNames.length > 0) {
          const rows = toAddNames
            .map(name => {
              const roleId = roleIdMap.get(name)
              if (!roleId) {
                console.warn(`⚠️ No se encontró role_id para: ${name}`)
                return null
              }
              return { id: crypto.randomUUID(), user_id: userId!, role_id: roleId }
            })
            .filter(row => row !== null) as Array<{ id: string; user_id: string; role_id: string }>
          
          if (rows.length > 0) {
            console.log('📝 Insertando roles:', rows)
            const { error: insErr } = await supabase.from('roles_usuario').insert(rows)
            if (insErr) {
              console.error('❌ Error insertando roles:', insErr)
              throw insErr
            }
            console.log('✅ Roles insertados correctamente')
          }
        }

        // 5) Eliminar roles removidos
        for (const roleName of toRemoveNames) {
          const roleId = currentRoleIds.get(roleName)
          if (roleId) {
            const { error: delErr } = await supabase
              .from('roles_usuario')
              .delete()
              .eq('user_id', userId)
              .eq('role_id', roleId)
            if (delErr) throw delErr
          }
        }
      }
    } catch (error: any) {
      setErrors({ submit: error.message || 'Error al guardar el usuario' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Avatar */}
      <Box>
        <Typography 
          variant="body2" 
          sx={{ 
            mb: 2, 
            fontWeight: 700, 
            color: '#1e293b',
            bgcolor: 'rgba(248, 250, 252, 0.8)',
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <ImageIcon sx={{ fontSize: 16 }} />
          Avatar
        </Typography>

        {(avatarPreview || existingAvatar) ? (
          <Box sx={{ position: 'relative', width: 96, height: 96, mx: 'auto' }}>
            {avatarPreview ? (
              <Avatar
                src={avatarPreview}
                alt="Avatar preview"
                sx={{ width: 96, height: 96, border: '2px solid #e5e7eb' }}
              />
            ) : existingAvatar?.path ? (
              <SignedImage
                path={existingAvatar.path}
                bucket={existingAvatar.bucket || 'documents'}
                alt="Avatar actual"
                className="w-full h-full rounded-full border-2 border-gray-200"
              />
            ) : null}
            <IconButton
              onClick={removeAvatar}
              sx={{
                position: 'absolute',
                top: -8,
                right: -8,
                bgcolor: '#ef4444',
                color: 'white',
                width: 28,
                height: 28,
                '&:hover': { bgcolor: '#dc2626' }
              }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Box
              component="label"
              sx={{
                width: 96,
                height: 96,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px dashed #d1d5db',
                borderRadius: '50%',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: '#9c27b0',
                  bgcolor: 'rgba(156, 39, 176, 0.05)'
                }
              }}
            >
              <UploadIcon sx={{ fontSize: 32, color: '#9ca3af', mb: 0.5 }} />
              <Typography variant="caption" sx={{ color: '#6b7280', textAlign: 'center', px: 1 }}>
                Subir
              </Typography>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                style={{ display: 'none' }}
              />
            </Box>
          </Box>
        )}

        {errors.avatar && (
          <Typography variant="caption" color="error" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
            {errors.avatar}
          </Typography>
        )}
        {uploading && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" sx={{ color: '#9c27b0' }}>
              Subiendo avatar...
            </Typography>
          </Box>
        )}
      </Box>

      {/* Nombre */}
      <TextField
        label="Nombre Completo"
        fullWidth
        required
        value={formData.nombre}
        onChange={(e) => {
          setFormData({ ...formData, nombre: e.target.value })
          if (errors.nombre) {
            const { nombre, ...rest } = errors
            setErrors(rest)
          }
        }}
        placeholder="Juan Pérez"
        error={!!errors.nombre}
        helperText={errors.nombre}
        InputLabelProps={{
          sx: {
            color: '#475569',
            fontWeight: 600,
            bgcolor: 'white',
            px: 0.5,
            '&.Mui-focused': { color: '#9c27b0' }
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <PersonIcon sx={{ color: '#9c27b0', fontSize: 20 }} />
            </InputAdornment>
          ),
        }}
      />

      {/* Email */}
      <TextField
        label="Correo Electrónico"
        fullWidth
        required
        type="email"
        value={formData.email}
        onChange={(e) => {
          setFormData({ ...formData, email: e.target.value })
          if (errors.email) {
            const { email, ...rest } = errors
            setErrors(rest)
          }
        }}
        placeholder="usuario@empresa.com"
        error={!!errors.email}
        helperText={
          isGerentePlataforma && usuario
            ? '🔒 Usuario protegido - Email no modificable'
            : errors.email
        }
        disabled={!!usuario || isGerentePlataforma}
        InputLabelProps={{
          sx: {
            color: '#475569',
            fontWeight: 600,
            bgcolor: 'white',
            px: 0.5,
            '&.Mui-focused': { color: '#9c27b0' }
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <EmailIcon sx={{ color: isGerentePlataforma ? '#f59e0b' : '#9c27b0', fontSize: 20 }} />
            </InputAdornment>
          ),
        }}
      />

      {/* Password (solo en creación) */}
      {!usuario && (
        <TextField
          label="Contraseña"
          fullWidth
          required
          type="password"
          value={formData.password}
          onChange={(e) => {
            setFormData({ ...formData, password: e.target.value })
            if (errors.password) {
              const { password, ...rest } = errors
              setErrors(rest)
            }
          }}
          placeholder="Mínimo 6 caracteres"
          error={!!errors.password}
          helperText={errors.password || "El usuario recibirá un email para cambiar su contraseña"}
          InputLabelProps={{
            sx: {
              color: '#475569',
              fontWeight: 600,
              bgcolor: 'white',
              px: 0.5,
              '&.Mui-focused': { color: '#9c27b0' }
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <KeyIcon sx={{ color: '#9c27b0', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />
      )}

      {/* Teléfono */}
      <TextField
        label="Teléfono"
        fullWidth
        value={formData.telefono}
        onChange={(e) => {
          setFormData({ ...formData, telefono: e.target.value })
          if (errors.telefono) {
            const { telefono, ...rest } = errors
            setErrors(rest)
          }
        }}
        placeholder="+52 555 010 2030"
        error={!!errors.telefono}
        helperText={errors.telefono}
        InputLabelProps={{
          sx: {
            color: '#475569',
            fontWeight: 600,
            bgcolor: 'white',
            px: 0.5,
            '&.Mui-focused': { color: '#9c27b0' }
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <PhoneIcon sx={{ color: '#9c27b0', fontSize: 20 }} />
            </InputAdornment>
          ),
        }}
      />

      {/* Nivel (Admin/Usuario) */}
      <FormControl fullWidth>
        <InputLabel
          sx={{
            color: '#475569',
            fontWeight: 600,
            bgcolor: 'white',
            px: 0.5,
            '&.Mui-focused': { color: '#9c27b0' }
          }}
        >
          Nivel de Acceso
        </InputLabel>
        <Select
          value={formData.nivel}
          label="Nivel de Acceso"
          onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
          startAdornment={
            <InputAdornment position="start">
              <ShieldIcon sx={{ color: '#9c27b0', fontSize: 20 }} />
            </InputAdornment>
          }
        >
          <MenuItem value="Usuario">Usuario</MenuItem>
          <MenuItem value="Administrador">Administrador</MenuItem>
        </Select>
        <FormHelperText sx={{ color: '#64748b', fontWeight: 500 }}>
          Tip: El nivel es para alcance (todo vs lo suyo), los roles controlan permisos finos.
        </FormHelperText>
      </FormControl>

      <Divider sx={{ my: 1 }} />

      {/* Roles del sistema */}
      <Box>
        <Typography 
          variant="body2" 
          sx={{ 
            mb: 2, 
            fontWeight: 700, 
            color: '#1e293b',
            bgcolor: 'rgba(248, 250, 252, 0.8)',
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            display: 'inline-block'
          }}
        >
          Roles (definen qué puede ver/hacer)
        </Typography>
        <Box
          sx={{
            borderRadius: 3,
            border: '2px solid #e2e8f0',
            p: 2,
            bgcolor: 'white'
          }}
        >
          {rolesLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Cargando roles...
              </Typography>
            </Box>
          ) : (
            <FormGroup>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1 }}>
                {FIXED_ROLES.map((role) => {
                  const checked = selectedRoleNames.has(role.name)
                  // Proteger "Gerente Plataforma": si está asignado no se puede desmarcar
                  const isProtected = role.name === 'Gerente Plataforma' && checked && !!usuario
                  
                  return (
                    <FormControlLabel
                      key={role.id}
                      control={
                        <Checkbox
                          checked={checked}
                          onChange={() => toggleRole(role.name)}
                          disabled={isProtected}
                          sx={{
                            color: role.color,
                            '&.Mui-checked': { color: role.color },
                            '&.Mui-disabled': { 
                              color: `${role.color}80`,
                              '&.Mui-checked': { color: `${role.color}80` }
                            }
                          }}
                        />
                      }
                      label={
                        <Box>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: isProtected ? '#64748b' : '#1e293b', 
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}
                          >
                            {role.displayName}
                            {isProtected && (
                              <Chip 
                                label="🔒 Protegido" 
                                size="small" 
                                sx={{ 
                                  height: 18, 
                                  fontSize: '0.65rem',
                                  bgcolor: 'rgba(245, 158, 11, 0.15)',
                                  color: '#f59e0b',
                                  fontWeight: 700
                                }} 
                              />
                            )}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.25 }}>
                            {isProtected 
                              ? 'Este rol no se puede modificar para este usuario'
                              : role.description
                            }
                          </Typography>
                        </Box>
                      }
                      sx={{
                        m: 0,
                        p: 1.5,
                        borderRadius: 2,
                        border: checked ? `2px solid ${role.color}` : '1px solid #e2e8f0',
                        bgcolor: checked ? `${role.color}08` : 'transparent',
                        opacity: isProtected ? 0.7 : 1,
                        '&:hover': {
                          bgcolor: isProtected 
                            ? (checked ? `${role.color}08` : 'transparent')
                            : (checked ? `${role.color}15` : 'rgba(0, 0, 0, 0.02)'),
                          borderColor: role.color
                        },
                        transition: 'all 0.2s ease'
                      }}
                    />
                  )
                })}
              </Box>
            </FormGroup>
          )}
        </Box>
      </Box>

      {/* Contratista - mostrar siempre si hay contratistas */}
      {contratistas.length > 0 && (
        <FormControl fullWidth>
          <InputLabel
            sx={{
              color: '#475569',
              fontWeight: 600,
              bgcolor: 'white',
              px: 0.5,
              '&.Mui-focused': { color: '#9c27b0' }
            }}
          >
            Asignar Contratista (Opcional)
          </InputLabel>
          <Select
            value={formData.contratista_id || ''}
            label="Asignar Contratista (Opcional)"
            onChange={(e) => setFormData({ ...formData, contratista_id: e.target.value || undefined })}
            startAdornment={
              <InputAdornment position="start">
                <BusinessIcon sx={{ color: '#9c27b0', fontSize: 20 }} />
              </InputAdornment>
            }
          >
            <MenuItem value="">
              <em>Sin contratista asignado</em>
            </MenuItem>
            {contratistas.map((contratista) => (
              <MenuItem key={contratista.id} value={contratista.id}>
                {contratista.nombre}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText sx={{ color: '#64748b' }}>
            Asigna un contratista si este usuario pertenece a una empresa contratista
          </FormHelperText>
        </FormControl>
      )}

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
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 2, borderTop: '1px solid #e2e8f0' }}>
        <Button type="button" onClick={onCancel} variant="cancel" disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" variant="success" disabled={loading || uploading} loading={loading}>
          {loading ? 'Guardando...' : usuario ? 'Actualizar Usuario' : 'Crear Usuario'}
        </Button>
      </Box>
    </Box>
  )
}
