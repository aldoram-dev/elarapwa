import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Users as UsersIcon } from 'lucide-react'
import { Button, Card, CardHeader, CardTitle, CardContent, Modal } from '@components/ui'
import { useUsuarios } from '@/lib/hooks/useUsuarios'
import { Usuario } from '@/types/usuario'
import { UsuarioForm } from '@/components/usuarios/UsuarioForm'
import { UsuarioList } from '@/components/usuarios/UsuarioList'
import { createUsuario, sendPasswordReset } from '@/lib/services/usuarioService'
import { useUsuarioStore } from '@/stores/usuarioStore'
import { supabase } from '@/lib/core/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { Box, Paper, Typography, Avatar, Stack, Alert } from '@mui/material'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import PeopleIcon from '@mui/icons-material/People'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import LockIcon from '@mui/icons-material/Lock'

const UsuariosConfigPage: React.FC = () => {
  const { usuarios, loading } = useUsuarios()
  const updateUsuario = useUsuarioStore(s => s.updateUsuario)
  const { perfil } = useAuth()
  const { canManageUsers, userRoles } = usePermissions()

  const [isOpen, setIsOpen] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userRolesMap, setUserRolesMap] = useState<Record<string, string[]>>({})
  const [contratistas, setContratistas] = useState<Array<{ id: string; nombre: string }>>([])
  const [rolesRefreshTrigger, setRolesRefreshTrigger] = useState(0)

  const isAdmin = perfil?.nivel === 'Administrador'

  // Verificar permisos de acceso a esta página
  if (!canManageUsers()) {
    return (
      <Box sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(239, 68, 68, 0.05)' }}>
          <LockIcon sx={{ fontSize: 64, color: '#dc2626', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: '#dc2626' }}>
            Acceso Denegado
          </Typography>
          <Typography variant="body1" sx={{ color: '#64748b', mb: 3 }}>
            No tienes permisos para acceder a la gestión de usuarios.
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
            Roles con acceso: Administrador, Gerente Plataforma, Sistemas, Desarrollador
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mt: 1 }}>
            Tus roles actuales: {userRoles.join(', ') || 'Sin roles asignados'}
          </Typography>
        </Paper>
      </Box>
    )
  }

  const openCreate = () => {
    setEditingUsuario(null)
    setIsOpen(true)
  }

  const openEdit = (usuario: Usuario) => {
    setEditingUsuario(usuario)
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
    setEditingUsuario(null)
    setError(null)
  }

  // Notificaciones deshabilitadas en la versión simplificada
  // const openNotifyModal = (usuario: Usuario) => { ... }
  
  const onSubmit = async (data: Partial<Usuario> & { password?: string }) => {
    try {
      setSaving(true)
      setError(null)
      if (editingUsuario) {
        await updateUsuario(editingUsuario.id, data)
      } else {
        if (!data.password) throw new Error('La contraseña es requerida para crear')
        await createUsuario(data as Partial<Usuario> & { password: string })
      }
      closeModal()
      // Forzar recarga de roles después de guardar
      setRolesRefreshTrigger(prev => prev + 1)
    } catch (e: any) {
      setError(e.message || 'Error guardando usuario')
    } finally {
      setSaving(false)
    }
  }

  const onSendPasswordReset = async (usuario: Usuario) => {
    try {
      setSaving(true)
      await sendPasswordReset(usuario.email)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const onToggleActive = async (usuario: Usuario) => {
    try {
      setSaving(true)
      await updateUsuario(usuario.id, { active: !usuario.active })
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const stats = useMemo(() => {
    const total = usuarios.length
    const activos = usuarios.filter(u => u.active).length
    const inactivos = usuarios.filter(u => !u.active).length
    const admins = usuarios.filter(u => u.nivel === 'Administrador').length
    const usuariosNormales = usuarios.filter(u => u.nivel === 'Usuario').length
    return { total, activos, inactivos, admins, usuariosNormales }
  }, [usuarios])

  const pieChartData = [
    { name: 'Activos', value: stats.activos, color: '#4caf50' },
    { name: 'Inactivos', value: stats.inactivos, color: '#f44336' },
  ]

  const barChartData = [
    { name: 'Administradores', cantidad: stats.admins, color: '#1cc88a' },
    { name: 'Usuarios', cantidad: stats.usuariosNormales, color: '#4e73df' },
  ]

  // Cargar contratistas disponibles
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('contratistas')
          .select('id, nombre')
          .eq('active', true)
          .order('nombre')
        
        if (error) throw error
        if (!cancelled) setContratistas(data || [])
      } catch (e) {
        console.error('Error cargando contratistas:', e)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Cargar roles de todos los usuarios listados
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (usuarios.length === 0) { setUserRolesMap({}); return }
        const ids = usuarios.map(u => u.id)
        
        // Debug: Log que estamos cargando roles
        console.log('🔍 Cargando roles para usuarios:', ids)
        
        const { data, error } = await supabase
          .from('roles_usuario')
          .select('user_id, role_id, roles(id, name)')
          .in('user_id', ids)
        
        // Debug: Log de respuesta
        console.log('📊 Respuesta de roles_usuario:', { data, error })
        
        if (error) {
          console.error('❌ Error al cargar roles:', error)
          throw error
        }
        
        const map: Record<string, string[]> = {}
        ;(data || []).forEach((row: any) => {
          const uid = row.user_id
          const name = row.roles?.name
          console.log('🔄 Procesando rol:', { uid, name, row })
          if (!uid || !name) return
          map[uid] = map[uid] ? [...map[uid], name] : [name]
        })
        
        console.log('✅ Mapa de roles construido:', map)
        if (!cancelled) setUserRolesMap(map)
      } catch (e) {
        console.warn('No se pudieron cargar roles de usuarios:', e)
      }
    })()
    return () => { cancelled = true }
  }, [usuarios, rolesRefreshTrigger])

  return (
    <Box sx={{ padding: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar 
            sx={{ 
              width: 64, 
              height: 64, 
              bgcolor: '#2196f3',
              boxShadow: '0 4px 20px rgba(33, 150, 243, 0.3)'
            }}
          >
            <PeopleIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
              Usuarios
            </Typography>
            <Typography variant="body1" sx={{ color: '#666', mt: 0.5 }}>
              Gestiona usuarios, accesos y estados
            </Typography>
          </Box>
        </Box>
        <Button onClick={openCreate} icon={<Plus />}>
          Nuevo Usuario
        </Button>
      </Box>

      {/* Stats Cards + Charts - Material UI Style */}
      <Box sx={{ mb: 4 }}>
        {/* Cards de Estadísticas */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 3,
          mb: 3
        }}>
          {/* Total Usuarios Card */}
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              borderRadius: 4,
              background: 'linear-gradient(135deg, #4e73df 0%, #224abe 100%)',
              color: 'white',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 40px rgba(78, 115, 223, 0.4)'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ opacity: 0.9, fontWeight: 600 }}>
                Total Usuarios
              </Typography>
              <PeopleIcon sx={{ fontSize: 32, opacity: 0.8 }} />
            </Box>
            <Typography variant="h2" sx={{ fontWeight: 800, letterSpacing: -1 }}>
              {stats.total}
            </Typography>
          </Paper>

          {/* Activos Card */}
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              borderRadius: 4,
              background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
              color: 'white',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 40px rgba(56, 239, 125, 0.4)'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ opacity: 0.9, fontWeight: 600 }}>
                Usuarios Activos
              </Typography>
              <CheckCircleIcon sx={{ fontSize: 32, opacity: 0.8 }} />
            </Box>
            <Typography variant="h2" sx={{ fontWeight: 800, letterSpacing: -1 }}>
              {stats.activos}
            </Typography>
          </Paper>

          {/* Administradores Card */}
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              borderRadius: 4,
              background: 'linear-gradient(135deg, #1cc88a 0%, #13855c 100%)',
              color: 'white',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 40px rgba(28, 200, 138, 0.4)'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ opacity: 0.9, fontWeight: 600 }}>
                Administradores
              </Typography>
              <AdminPanelSettingsIcon sx={{ fontSize: 32, opacity: 0.8 }} />
            </Box>
            <Typography variant="h2" sx={{ fontWeight: 800, letterSpacing: -1 }}>
              {stats.admins}
            </Typography>
          </Paper>
        </Box>

        {/* Gráficas */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 3
        }}>
          {/* Gráfica de Pie - Estado de Usuarios */}
          <Paper 
            elevation={3}
            sx={{ 
              p: 3, 
              borderRadius: 4,
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#333' }}>
              Estado de Usuarios
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>

          {/* Gráfica de Barras - Tipo de Usuario */}
          <Paper 
            elevation={3}
            sx={{ 
              p: 3, 
              borderRadius: 4,
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#333' }}>
              Distribución por Tipo
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cantidad" radius={[8, 8, 0, 0]}>
                  {barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Box>
      </Box>

      {/* List */}
      <UsuarioList
        usuarios={usuarios}
        empresas={[]}
        onEdit={openEdit}
        onSendPasswordReset={onSendPasswordReset}
        onToggleActive={onToggleActive}
        loading={loading || saving}
        userRolesMap={userRolesMap}
        onNotifyUser={undefined}
        canNotify={false}
      />

      {/* Modal form */}
      <Modal isOpen={isOpen} onClose={closeModal} title={editingUsuario ? 'Editar Usuario' : 'Crear Usuario'}>
        <div className="p-2">
          {error && (
            <div className="p-3 mb-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          <UsuarioForm
            usuario={editingUsuario}
            contratistas={contratistas}
            onSubmit={onSubmit}
            onCancel={closeModal}
          />
        </div>
      </Modal>

      {/* Modal de notificaciones deshabilitado en versión simplificada */}
    </Box>
  )
}

export default UsuariosConfigPage
