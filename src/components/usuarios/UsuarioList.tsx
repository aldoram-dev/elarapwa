import React, { useState } from 'react'
import { Usuario } from '@/types/usuario'
import { 
  Box, 
  Paper, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  CircularProgress,
  InputAdornment
} from '@mui/material'
import { 
  Search as SearchIcon,
  Edit as EditIcon, 
  Send as SendIcon, 
  Person as PersonIcon, 
  Email as EmailIcon, 
  Phone as PhoneIcon, 
  Business as BusinessIcon, 
  Shield as ShieldIcon, 
  Check as CheckIcon, 
  Close as CloseIcon 
} from '@mui/icons-material'
import { Button } from '@components/ui'
import { SignedImage } from '@components/ui/SignedImage'
import { getRoleColor } from '@/config/roles'

interface UsuarioListProps {
  usuarios: Usuario[];
  empresas?: Array<{ id: string; nombre: string; logo_url?: string }>;
  onEdit: (usuario: Usuario) => void;
  onSendPasswordReset: (usuario: Usuario) => void;
  onToggleActive: (usuario: Usuario) => void;
  loading?: boolean;
  userRolesMap?: Record<string, string[]>;
  /** Para abrir modal de notificación */
  onNotifyUser?: (usuario: Usuario) => void;
  /** Mostrar botón solo si true */
  canNotify?: boolean;
}

export const UsuarioList: React.FC<UsuarioListProps> = ({
  usuarios,
  empresas = [],
  onEdit,
  onSendPasswordReset,
  onToggleActive,
  loading = false,
  userRolesMap = {},
  onNotifyUser,
  canNotify,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterNivel, setFilterNivel] = useState<string>('all')
  const [filterEmpresa, setFilterEmpresa] = useState<string>('all')
  const [filterActive, setFilterActive] = useState<string>('all')

  const getEmpresaNombre = (empresaId?: string) => {
    if (!empresaId) return 'Sin empresa'
    return empresas.find((e) => (e as { id: string }).id === empresaId)?.nombre || 'Desconocida'
  }

  const getEmpresaLogo = (empresaId?: string) => {
    if (!empresaId) return null
    return empresas.find((e) => (e as { id: string; logo_url?: string }).id === empresaId)?.logo_url || null
  }

  const filteredUsuarios = usuarios.filter((usuario) => {
    // 🔒 OCULTAR usuarios con rol "Sistemas" para protegerlos de edición accidental
    const userRoles = userRolesMap[usuario.id] || []
    const hasSistemasRole = userRoles.includes('Sistemas')
    
    // Si tiene rol Sistemas, no mostrar en la lista (protección)
    if (hasSistemasRole) {
      return false
    }

    const matchesSearch =
      (usuario.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (usuario.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (usuario.telefono || '').includes(searchTerm)

    const matchesNivel = filterNivel === 'all' || usuario.nivel === filterNivel
    const matchesEmpresa =
      filterEmpresa === 'all' ||
      (filterEmpresa === 'none' && !usuario.contratista_id) ||
      usuario.contratista_id === filterEmpresa

    const matchesActive =
      filterActive === 'all' ||
      (filterActive === 'active' && usuario.active) ||
      (filterActive === 'inactive' && !usuario.active)

    return matchesSearch && matchesNivel && matchesEmpresa && matchesActive
  })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Barra de búsqueda y filtros */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(60px)',
          border: '2px solid rgba(255, 255, 255, 0.4)',
          borderRadius: 4,
          p: 3,
          boxShadow: '0 8px 32px rgba(156, 39, 176, 0.15)'
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            placeholder="Buscar por nombre, email o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#9c27b0' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                height: 56,
                bgcolor: 'rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(20px)',
                borderRadius: 3.5,
                '& fieldset': { 
                  border: '2px solid rgba(255, 255, 255, 0.4)',
                },
                '&:hover fieldset': {
                  border: '2px solid rgba(156, 39, 176, 0.3)',
                },
                '&.Mui-focused fieldset': {
                  border: '2px solid #9c27b0',
                },
              }
            }}
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
            {/* Filtro Nivel */}
            <FormControl fullWidth>
              <InputLabel>Nivel</InputLabel>
              <Select
                value={filterNivel}
                label="Nivel"
                onChange={(e) => setFilterNivel(e.target.value)}
                sx={{
                  height: 48,
                  bgcolor: 'rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: 3,
                  '& fieldset': { 
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                  },
                  '&:hover fieldset': {
                    border: '2px solid rgba(156, 39, 176, 0.3)',
                  },
                  '&.Mui-focused fieldset': {
                    border: '2px solid #9c27b0',
                  }
                }}
              >
                <MenuItem value="all">Todos los niveles</MenuItem>
                <MenuItem value="Administrador">Administradores</MenuItem>
                <MenuItem value="Usuario">Usuarios</MenuItem>
              </Select>
            </FormControl>

            {/* Filtro Empresa */}
            <FormControl fullWidth>
              <InputLabel>Empresa</InputLabel>
              <Select
                value={filterEmpresa}
                label="Empresa"
                onChange={(e) => setFilterEmpresa(e.target.value)}
                sx={{
                  height: 48,
                  bgcolor: 'rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: 3,
                  '& fieldset': { 
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                  },
                  '&:hover fieldset': {
                    border: '2px solid rgba(156, 39, 176, 0.3)',
                  },
                  '&.Mui-focused fieldset': {
                    border: '2px solid #9c27b0',
                  }
                }}
              >
                <MenuItem value="all">Todas las empresas</MenuItem>
                <MenuItem value="none">Sin empresa</MenuItem>
                {empresas.map((empresa) => (
                  <MenuItem key={empresa.id} value={empresa.id}>
                    {empresa.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Filtro Estado */}
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={filterActive}
                label="Estado"
                onChange={(e) => setFilterActive(e.target.value)}
                sx={{
                  height: 48,
                  bgcolor: 'rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: 3,
                  '& fieldset': { 
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                  },
                  '&:hover fieldset': {
                    border: '2px solid rgba(156, 39, 176, 0.3)',
                  },
                  '&.Mui-focused fieldset': {
                    border: '2px solid #9c27b0',
                  }
                }}
              >
                <MenuItem value="all">Todos los estados</MenuItem>
                <MenuItem value="active">Solo activos</MenuItem>
                <MenuItem value="inactive">Solo inactivos</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>
            Mostrando {filteredUsuarios.length} de {usuarios.length} usuarios
          </Typography>
        </Box>
      </Paper>

      {/* Tabla */}
      {loading ? (
        <Paper
          elevation={0}
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(60px)',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            borderRadius: 4,
            p: 6,
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(156, 39, 176, 0.2)'
          }}
        >
          <CircularProgress size={64} sx={{ color: '#9c27b0', mb: 2.5 }} />
          <Typography variant="h6" sx={{ color: '#0f172a', fontWeight: 600 }}>
            Cargando usuarios...
          </Typography>
        </Paper>
      ) : filteredUsuarios.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(60px)',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            borderRadius: 4,
            p: 8,
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(156, 39, 176, 0.2)'
          }}
        >
          <PersonIcon sx={{ fontSize: 96, color: '#c084fc', mb: 3 }} />
          <Typography variant="h5" sx={{ color: '#0f172a', fontWeight: 700, mb: 1.5 }}>
            No hay usuarios
          </Typography>
          <Typography variant="body1" sx={{ color: '#475569' }}>
            {searchTerm || filterNivel !== 'all' || filterEmpresa !== 'all' || filterActive !== 'all'
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Comienza agregando un nuevo usuario'}
          </Typography>
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(60px)',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            borderRadius: 4,
            boxShadow: '0 8px 32px rgba(51, 65, 85, 0.15)',
            overflow: 'hidden'
          }}
        >
          <Table>
            <TableHead sx={{ '& th': { bgcolor: '#334155', color: '#fff', fontWeight: 700, fontSize: '0.875rem', py: 1.25 } }}>
              <TableRow>
                <TableCell>Avatar</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell>Empresa</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
            {filteredUsuarios.map((usuario) => (
              <TableRow 
                key={usuario.id}
                sx={{ 
                  '&:hover': { bgcolor: 'action.hover' },
                  transition: 'background-color 0.2s'
                }}
              >
                {/* Avatar */}
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {usuario.avatar_url ? (
                      <SignedImage
                        path={usuario.avatar_url}
                        bucket="documents"
                        alt={usuario.nombre || 'Avatar'}
                        className="w-12 h-12 rounded-full object-cover border-2 border-slate-200"
                        fallback={
                          <Avatar sx={{ width: 48, height: 48, bgcolor: '#e2e8f0' }}>
                            <PersonIcon sx={{ color: '#334155' }} />
                          </Avatar>
                        }
                      />
                    ) : (
                      <Avatar sx={{ width: 48, height: 48, bgcolor: '#e2e8f0' }}>
                        <PersonIcon sx={{ color: '#334155' }} />
                      </Avatar>
                    )}
                  </Box>
                </TableCell>

                {/* Info (nombre + email + teléfono) */}
                <TableCell>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                      {usuario.nombre || 'Sin nombre'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                      <EmailIcon sx={{ fontSize: 14, color: '#334155' }} />
                      <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#475569' }}>
                        {usuario.email}
                      </Typography>
                    </Box>
                    {usuario.telefono && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                        <PhoneIcon sx={{ fontSize: 12, color: '#64748b' }} />
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          {usuario.telefono}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </TableCell>

                {/* Empresa */}
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getEmpresaLogo(usuario.contratista_id) ? (
                      <SignedImage
                        path={getEmpresaLogo(usuario.contratista_id)!}
                        bucket="documents"
                        alt={getEmpresaNombre(usuario.contratista_id)}
                        className="w-8 h-8 rounded-full object-cover border-2 border-slate-200"
                        fallback={
                          <Avatar sx={{ width: 32, height: 32, bgcolor: '#e2e8f0' }}>
                            <BusinessIcon sx={{ fontSize: 16, color: '#334155' }} />
                          </Avatar>
                        }
                      />
                    ) : (
                      <Avatar sx={{ width: 32, height: 32, bgcolor: '#e2e8f0' }}>
                        <BusinessIcon sx={{ fontSize: 16, color: '#334155' }} />
                      </Avatar>
                    )}
                    <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>
                      {getEmpresaNombre(usuario.contratista_id)}
                    </Typography>
                  </Box>
                </TableCell>

                {/* Roles (chips) */}
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, maxWidth: 300 }}>
                    {(userRolesMap[usuario.id] || [])
                      .filter((roleName) => roleName !== 'Sistemas') // Ocultar rol Sistemas
                      .map((roleName) => {
                        const roleColor = getRoleColor(roleName)
                        return (
                          <Chip
                            key={roleName}
                            label={roleName}
                            size="small"
                            sx={{
                              bgcolor: roleColor,
                              color: 'white',
                              border: `1px solid ${roleColor}`,
                              backdropFilter: 'blur(20px)',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              boxShadow: `0 2px 8px ${roleColor}40`
                            }}
                          />
                        )
                      })}
                    {(userRolesMap[usuario.id] || []).filter((r) => r !== 'Sistemas').length === 0 && (
                      <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic' }}>
                        Sin roles
                      </Typography>
                    )}
                  </Box>
                </TableCell>

                {/* Tipo (Sistemas, Gerencia, Plataforma, etc.) */}
                <TableCell>
                  <Chip
                    icon={<ShieldIcon sx={{ fontSize: 14, color: 'inherit' }} />}
                    label={usuario.roles?.[0] || usuario.nivel || 'N/A'}
                    size="small"
                    sx={{
                      bgcolor: usuario.roles?.[0] === 'Sistemas' || usuario.nivel === 'Administrador'
                        ? 'rgba(156, 39, 176, 0.8)' 
                        : usuario.roles?.[0] === 'Gerencia' || usuario.roles?.[0] === 'Plataforma'
                        ? 'rgba(16, 163, 127, 0.8)'
                        : 'rgba(59, 130, 246, 0.8)',
                      color: 'white',
                      border: usuario.roles?.[0] === 'Sistemas' || usuario.nivel === 'Administrador'
                        ? '1px solid rgba(156, 39, 176, 0.3)'
                        : usuario.roles?.[0] === 'Gerencia' || usuario.roles?.[0] === 'Plataforma'
                        ? '1px solid rgba(16, 163, 127, 0.3)'
                        : '1px solid rgba(59, 130, 246, 0.3)',
                      backdropFilter: 'blur(20px)',
                      fontWeight: 600,
                      px: 2,
                      '& .MuiChip-icon': { color: 'white' }
                    }}
                  />
                </TableCell>

                {/* Estado activo/inactivo */}
                <TableCell>
                  {usuario.active ? (
                    <Chip
                      icon={<CheckIcon sx={{ fontSize: 14, color: 'white !important' }} />}
                      label="Activo"
                      size="small"
                      sx={{
                        bgcolor: 'rgba(34, 197, 94, 0.8)',
                        color: 'white',
                        border: '1px solid rgba(74, 222, 128, 0.3)',
                        backdropFilter: 'blur(20px)',
                        fontWeight: 600,
                        px: 2,
                        '& .MuiChip-icon': { color: 'white' }
                      }}
                    />
                  ) : (
                    <Chip
                      icon={<CloseIcon sx={{ fontSize: 14, color: 'white !important' }} />}
                      label="Inactivo"
                      size="small"
                      sx={{
                        bgcolor: 'rgba(107, 114, 128, 0.8)',
                        color: 'white',
                        border: '1px solid rgba(156, 163, 175, 0.3)',
                        backdropFilter: 'blur(20px)',
                        fontWeight: 600,
                        px: 2,
                        '& .MuiChip-icon': { color: 'white' }
                      }}
                    />
                  )}
                </TableCell>

                {/* Acciones */}
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {/* Verificar si tiene rol "Gerente Plataforma" para limitar acciones */}
                    {(() => {
                      const hasGerentePlataforma = (userRolesMap[usuario.id] || []).includes('Gerente Plataforma')
                      const isProtected = hasGerentePlataforma

                      return (
                        <>
                          <Button
                            onClick={() => onEdit(usuario)}
                            variant="outline"
                            size="sm"
                            icon={<EditIcon style={{ fontSize: 16 }} />}
                            iconPosition="left"
                            disabled={isProtected}
                            title={isProtected ? 'Usuario protegido - No editable' : 'Editar usuario'}
                          >
                            Editar
                          </Button>
                          <Button
                            onClick={() => onSendPasswordReset(usuario)}
                            variant="outline"
                            size="sm"
                            title="Enviar email para restablecer contraseña"
                          >
                            Reset
                          </Button>
                          <Button
                            onClick={() => onToggleActive(usuario)}
                            variant={usuario.active ? "outline" : "primary"}
                            size="sm"
                            disabled={isProtected}
                            title={
                              isProtected 
                                ? 'Usuario protegido - No se puede desactivar' 
                                : (usuario.active ? 'Desactivar usuario' : 'Activar usuario')
                            }
                          >
                            {usuario.active ? 'Desactivar' : 'Activar'}
                          </Button>
                          {canNotify && onNotifyUser && (
                            <Button
                              onClick={() => onNotifyUser(usuario)}
                              variant="outline"
                              size="sm"
                              title="Notificar usuario"
                              icon={<SendIcon style={{ fontSize: 16 }} />}
                              iconPosition="left"
                            >
                              Notificar
                            </Button>
                          )}
                        </>
                      )
                    })()}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
