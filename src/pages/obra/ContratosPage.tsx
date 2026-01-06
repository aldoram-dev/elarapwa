import React, { useState } from 'react'
import { Box, Typography, Container, Paper, Fab, CircularProgress, Alert, IconButton, Stack, Chip, Button, Tooltip, FormControl, InputLabel, Select, MenuItem, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, TextField } from '@mui/material'
import { Plus, FileText, Edit, Trash2, BookOpen, Eye, CheckCircle, AlertCircle, Filter as FilterIcon, Grid, List } from 'lucide-react'
import { ContratoForm } from '@/components/obra/ContratoForm'
import { ContratoConceptosModal } from '@/components/obra/ContratoConceptosModal'
import { Modal } from '@/components/ui'
import { useContratistas } from '@/lib/hooks/useContratistas'
import { useContratos } from '@/lib/hooks/useContratos'
import { useAuth } from '@/context/AuthContext'
import { useAuthz } from '@/lib/hooks/useAuthz'
import { FlujoValidator } from '@/lib/validators/flujoValidator'
import { AuditService } from '@/lib/audit/auditLog'
import type { Contrato } from '@/types/contrato'

export default function ContratosPage() {
  const { perfil, user } = useAuth()
  const { canAccessModule, canApproveContract, isContratista } = useAuthz()
  
  // Debug: verificar valor de isContratista
  React.useEffect(() => {
    console.log('🔍 [ContratosPage] isContratista():', isContratista())
    console.log('🔍 [ContratosPage] Roles:', perfil?.roles)
  }, [perfil])
  
  const [showForm, setShowForm] = useState(false)
  const [editingContrato, setEditingContrato] = useState<Contrato | null>(null)
  const [selectedContratoForCatalogos, setSelectedContratoForCatalogos] = useState<Contrato | null>(null)
  const { contratistas, loading: loadingContratistas } = useContratistas()
  const { contratos, loading, error, createContrato, updateContrato, deleteContrato } = useContratos()
  
  // Tab activo
  const [activeTab, setActiveTab] = useState(0)
  
  // Filtros de cards
  const [filtroContratista, setFiltroContratista] = useState<string>('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('')
  const [filtroCatalogo, setFiltroCatalogo] = useState<string>('')
  
  // Filtros de tabla
  const [filtroNumero, setFiltroNumero] = useState('')
  const [filtroClave, setFiltroClave] = useState('')
  const [filtroContratistaTabla, setFiltroContratistaTabla] = useState('')
  const [filtroCategoriaTabla, setFiltroCategoriaTabla] = useState('')
  const [filtroPartida, setFiltroPartida] = useState('')
  const [filtroSubpartida, setFiltroSubpartida] = useState('')
  const [filtroMonto, setFiltroMonto] = useState('')
  const [filtroAnticipo, setFiltroAnticipo] = useState('')
  const [filtroRetencion, setFiltroRetencion] = useState('')
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('')
  const [filtroFechaFin, setFiltroFechaFin] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('')
  const [filtroEstadoCatalogo, setFiltroEstadoCatalogo] = useState('')
  
  // Trackear qué contratos tienen conceptos
  const [contratosConConceptos, setContratosConConceptos] = useState<Set<string>>(new Set())
  
  // Ordenamiento de tabla
  const [orderBy, setOrderBy] = useState<string>('')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  
  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  // Usar sistema unificado de permisos
  const puedeEditar = canAccessModule('contratos', 'edit')
  const puedeAprobarCatalogo = canApproveContract()
  
  // Cargar información de conceptos para cada contrato
  React.useEffect(() => {
    const checkConceptos = async () => {
      if (contratos.length === 0) return
      
      try {
        const { db } = await import('@/db/database')
        const contratosConDatos = new Set<string>()
        
        for (const contrato of contratos) {
          const conceptos = await db.conceptos_contrato
            .where('contrato_id')
            .equals(contrato.id)
            .and(c => c.active === true && (!c.metadata?.tipo || c.metadata.tipo === 'ordinario'))
            .count()
          
          if (conceptos > 0) {
            contratosConDatos.add(contrato.id)
          }
        }
        
        setContratosConConceptos(contratosConDatos)
      } catch (error) {
        console.error('Error verificando conceptos:', error)
      }
    }
    
    checkConceptos()
  }, [contratos])
  
  // Filtrar y ordenar contratos para tabla
  const contratosFiltrados = React.useMemo(() => {
    let filtered = contratos.filter(contrato => {
      if (filtroNumero && !contrato.numero_contrato?.toLowerCase().includes(filtroNumero.toLowerCase())) return false
      if (filtroClave && !contrato.clave_contrato?.toLowerCase().includes(filtroClave.toLowerCase())) return false
      if (filtroContratistaTabla) {
        const contratistaInfo = contratistas.find(c => c.id === contrato.contratista_id)
        if (!contratistaInfo?.nombre.toLowerCase().includes(filtroContratistaTabla.toLowerCase())) return false
      }
      if (filtroCategoriaTabla && !contrato.categoria?.toLowerCase().includes(filtroCategoriaTabla.toLowerCase())) return false
      if (filtroPartida && !contrato.partida?.toLowerCase().includes(filtroPartida.toLowerCase())) return false
      if (filtroSubpartida && !contrato.subpartida?.toLowerCase().includes(filtroSubpartida.toLowerCase())) return false
      if (filtroMonto && !contrato.monto_contrato?.toFixed(2).includes(filtroMonto)) return false
      if (filtroAnticipo && !contrato.anticipo_monto?.toFixed(2).includes(filtroAnticipo)) return false
      if (filtroRetencion && !contrato.retencion_porcentaje?.toFixed(2).includes(filtroRetencion)) return false
      if (filtroFechaInicio && contrato.fecha_inicio) {
        const fecha = new Date(contrato.fecha_inicio).toLocaleDateString('es-MX')
        if (!fecha.includes(filtroFechaInicio)) return false
      }
      if (filtroFechaFin && contrato.fecha_fin) {
        const fecha = new Date(contrato.fecha_fin).toLocaleDateString('es-MX')
        if (!fecha.includes(filtroFechaFin)) return false
      }
      if (filtroEstatus && !contrato.estatus?.toLowerCase().includes(filtroEstatus.toLowerCase())) return false
      if (filtroEstadoCatalogo) {
        const estado = contrato.catalogo_aprobado ? 'aprobado' : 'pendiente'
        if (!estado.includes(filtroEstadoCatalogo.toLowerCase())) return false
      }
      return true
    })
    
    if (orderBy) {
      filtered = filtered.sort((a, b) => {
        let compareValue = 0
        switch (orderBy) {
          case 'numero':
            compareValue = (a.numero_contrato || '').localeCompare(b.numero_contrato || '')
            break
          case 'clave':
            compareValue = (a.clave_contrato || '').localeCompare(b.clave_contrato || '')
            break
          case 'contratista':
            const contratistaA = contratistas.find(c => c.id === a.contratista_id)?.nombre || ''
            const contratistaB = contratistas.find(c => c.id === b.contratista_id)?.nombre || ''
            compareValue = contratistaA.localeCompare(contratistaB)
            break
          case 'categoria':
            compareValue = (a.categoria || '').localeCompare(b.categoria || '')
            break
          case 'partida':
            compareValue = (a.partida || '').localeCompare(b.partida || '')
            break
          case 'subpartida':
            compareValue = (a.subpartida || '').localeCompare(b.subpartida || '')
            break
          case 'monto':
            compareValue = (a.monto_contrato || 0) - (b.monto_contrato || 0)
            break
          case 'anticipo':
            compareValue = (a.anticipo_monto || 0) - (b.anticipo_monto || 0)
            break
          case 'retencion':
            compareValue = (a.retencion_porcentaje || 0) - (b.retencion_porcentaje || 0)
            break
          case 'fechaInicio':
            compareValue = new Date(a.fecha_inicio || 0).getTime() - new Date(b.fecha_inicio || 0).getTime()
            break
          case 'fechaFin':
            compareValue = new Date(a.fecha_fin || 0).getTime() - new Date(b.fecha_fin || 0).getTime()
            break
          case 'estatus':
            compareValue = (a.estatus || '').localeCompare(b.estatus || '')
            break
          case 'catalogo':
            compareValue = (a.catalogo_aprobado ? 1 : 0) - (b.catalogo_aprobado ? 1 : 0)
            break
        }
        return order === 'asc' ? compareValue : -compareValue
      })
    }
    
    return filtered
  }, [contratos, contratistas, filtroNumero, filtroClave, filtroContratistaTabla, filtroCategoriaTabla, filtroPartida, filtroSubpartida, filtroMonto, filtroAnticipo, filtroRetencion, filtroFechaInicio, filtroFechaFin, filtroEstatus, filtroEstadoCatalogo, orderBy, order])

  const handleSubmit = async (data: Partial<Contrato>) => {
    try {
      if (editingContrato) {
        // Actualizar contrato existente
        console.log('Actualizar contrato:', editingContrato.id, data)
        const { error: updateError } = await updateContrato(editingContrato.id, data)
        
        if (updateError) {
          console.error('Error al actualizar:', updateError)
          alert(`Error: ${updateError}`)
          return
        }
        
        // Auditoría
        await AuditService.log({
          tipo: 'CONTRATO_EDITADO',
          descripcion: `Contrato ${data.numero_contrato || editingContrato.numero_contrato} actualizado`,
          usuario: {
            id: user?.id || '',
            email: user?.email || '',
            rol: perfil?.roles?.[0] || 'unknown',
          },
          recurso: {
            tipo: 'contrato',
            id: editingContrato.id,
            nombre: data.numero_contrato || editingContrato.numero_contrato,
          },
          datosAnteriores: editingContrato,
          datosNuevos: data,
          contratoId: editingContrato.id,
        })
        
        console.log('Contrato actualizado exitosamente')
        setEditingContrato(null)
      } else {
        // Generar numero_contrato automáticamente
        const nextNumber = contratos.length + 1
        const numero_contrato = `CTR-${String(nextNumber).padStart(3, '0')}`
        
        // Agregar numero_contrato al data
        const dataConNumero = {
          ...data,
          numero_contrato
        }
        
        // Validar antes de crear
        FlujoValidator.validarCreacionContrato(dataConNumero)
        
        console.log('Crear contrato:', dataConNumero)
        const { data: newContrato, error: createError } = await createContrato(dataConNumero)
        
        if (createError) {
          console.error('Error al crear:', createError)
          alert(`Error: ${createError}`)
          return
        }
        
        // Auditoría
        if (newContrato) {
          await AuditService.log({
            tipo: 'CONTRATO_CREADO',
            descripcion: `Contrato ${newContrato.numero_contrato} creado`,
            usuario: {
              id: user?.id || '',
              email: user?.email || '',
              rol: perfil?.roles?.[0] || 'unknown',
            },
            recurso: {
              tipo: 'contrato',
              id: newContrato.id,
              nombre: newContrato.numero_contrato,
            },
            datosNuevos: newContrato,
            contratoId: newContrato.id,
          })
        }
        
        console.log('Contrato creado exitosamente:', newContrato)
      }
      
      setShowForm(false)
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const handleEdit = (contrato: Contrato) => {
    setEditingContrato(contrato)
    setShowForm(true)
  }

  const handleDelete = async (id: string, numero: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el contrato "${numero}"?`)) {
      const { error: deleteError } = await deleteContrato(id)
      
      if (deleteError) {
        alert(`Error al eliminar: ${deleteError}`)
      }
    }
  }

  const handleCloseModal = () => {
    setShowForm(false)
    setEditingContrato(null)
  }

  const handleAprobarCatalogo = async (contrato: Contrato) => {
    if (!puedeAprobarCatalogo) {
      alert('No tienes permisos para aprobar catálogos')
      return
    }

    try {
      // Cargar conceptos PRIMERO para validación
      const { db } = await import('@/db/database')
      const conceptos = await db.conceptos_contrato
        .where('contrato_id')
        .equals(contrato.id)
        .and(c => c.active === true && (!c.metadata?.tipo || c.metadata.tipo === 'ordinario'))
        .toArray()
      
      // Verificar que hay conceptos ANTES de mostrar confirmación
      if (conceptos.length === 0) {
        alert('⚠️ No se puede aprobar un catálogo vacío.\n\nEl contratista debe subir conceptos ordinarios primero.')
        return
      }

      // Validar monto total
      const montoTotal = conceptos.reduce((sum, c) => sum + (c.importe_catalogo || 0), 0)
      if (montoTotal <= 0) {
        alert('⚠️ No se puede aprobar un catálogo sin monto.\n\nEl catálogo debe tener conceptos con valores válidos.')
        return
      }

      const confirmar = window.confirm(
        `¿Aprobar el catálogo del contrato ${contrato.numero_contrato || contrato.clave_contrato}?\n\n` +
        `• Conceptos en catálogo: ${conceptos.length}\n` +
        `• Monto total: $${montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n\n` +
        `Una vez aprobado, NO se podrá modificar.\n` +
        `Cualquier cambio requerirá extraordinarios o aditivas/deductivas.\n\n` +
        `¿Continuar con la aprobación?`
      )

      if (!confirmar) return
      
      // Validar que hay conceptos y son válidos
      FlujoValidator.validarAprobacionCatalogo(contrato, conceptos)
      
      const supabaseClient = (await import('@/lib/core/supabaseClient')).supabase
      
      const { error } = await supabaseClient
        .from('contratos')
        .update({
          catalogo_aprobado: true,
          catalogo_aprobado_por: user?.id,
          catalogo_fecha_aprobacion: new Date().toISOString(),
          catalogo_observaciones: 'Catálogo aprobado'
        })
        .eq('id', contrato.id)

      if (error) throw error

      // Registrar en auditoría
      await AuditService.logCatalogoAprobado(
        contrato.id,
        contrato.numero_contrato || contrato.clave_contrato || '',
        {
          id: user?.id || '',
          email: user?.email || '',
          rol: perfil?.roles?.[0] || 'unknown',
        }
      )

      alert('✅ Catálogo aprobado exitosamente')
      window.location.reload()
    } catch (error: any) {
      console.error('Error aprobando catálogo:', error)
      alert(`❌ Error al aprobar catálogo: ${error.message}`)
    }
  }

  return (
    <Container maxWidth={false} sx={{ width: '90%', maxWidth: '90vw', py: 4, mx: 'auto' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 800, 
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            <FileText className="w-8 h-8" style={{ color: '#334155' }} />
            Contratos
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 1 }}>
            Gestión de contratos y acuerdos
          </Typography>
        </Box>
      </Box>

      {/* Filtros */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
          <FilterIcon className="w-5 h-5" style={{ color: '#f43f5e' }} />
          <Typography variant="h6" fontWeight="semibold">
            Filtros
          </Typography>
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Contratista</InputLabel>
            <Select
              value={filtroContratista}
              onChange={(e) => setFiltroContratista(e.target.value)}
              label="Contratista"
            >
              <MenuItem value="">Todos los contratistas</MenuItem>
              {contratistas.map(contratista => (
                <MenuItem key={contratista.id} value={contratista.id}>
                  {contratista.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Categoría</InputLabel>
            <Select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              label="Categoría"
            >
              <MenuItem value="">Todas las categorías</MenuItem>
              {Array.from(new Set(contratos.map(c => c.categoria))).sort().map(categoria => (
                <MenuItem key={categoria} value={categoria}>
                  {categoria}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Estado Catálogo</InputLabel>
            <Select
              value={filtroCatalogo}
              onChange={(e) => setFiltroCatalogo(e.target.value)}
              label="Estado Catálogo"
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="aprobado">Catálogo Aprobado</MenuItem>
              <MenuItem value="pendiente">Catálogo Pendiente</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : contratos.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(255, 255, 255, 0.6)',
            borderRadius: 4,
            p: 4,
            textAlign: 'center',
            minHeight: 400
          }}
        >
          <Typography variant="h6" sx={{ color: '#64748b', mb: 2 }}>
            No hay contratos registrados
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Haz clic en el botón + para agregar tu primer contrato
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Resumen con Cards - Visible en ambas vistas */}
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 1 }}>
              {/* Total Contratos */}
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 2.5, 
                  minWidth: 200, 
                  bgcolor: 'secondary.50',
                  borderLeft: '4px solid',
                  borderColor: 'secondary.main'
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                  TOTAL CONTRATOS
                </Typography>
                <Typography variant="h5" fontWeight={700} color="secondary.dark">
                  {contratos.filter(c => {
                    if (filtroContratista && c.contratista_id !== filtroContratista) return false;
                    if (filtroCategoria && c.categoria !== filtroCategoria) return false;
                    if (filtroCatalogo === 'aprobado' && !c.catalogo_aprobado) return false;
                    if (filtroCatalogo === 'pendiente' && c.catalogo_aprobado) return false;
                    return true;
                  }).length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Registrados
                </Typography>
              </Paper>

              {/* Monto Total */}
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 2.5, 
                  minWidth: 200, 
                  bgcolor: 'success.50',
                  borderLeft: '4px solid',
                  borderColor: 'success.main'
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                  MONTO TOTAL
                </Typography>
                <Typography variant="h5" fontWeight={700} color="success.dark">
                  ${contratos.filter(c => {
                    if (filtroContratista && c.contratista_id !== filtroContratista) return false;
                    if (filtroCategoria && c.categoria !== filtroCategoria) return false;
                    if (filtroCatalogo === 'aprobado' && !c.catalogo_aprobado) return false;
                    if (filtroCatalogo === 'pendiente' && c.catalogo_aprobado) return false;
                    return true;
                  }).reduce((sum, c) => sum + (c.monto_contrato || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Contratado
                </Typography>
              </Paper>

              {/* Catálogos Aprobados */}
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 2.5, 
                  minWidth: 200, 
                  bgcolor: 'info.50',
                  borderLeft: '4px solid',
                  borderColor: 'info.main'
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                  CATÁLOGOS APROBADOS
                </Typography>
                <Typography variant="h5" fontWeight={700} color="info.dark">
                  {contratos.filter(c => {
                    if (filtroContratista && c.contratista_id !== filtroContratista) return false;
                    if (filtroCategoria && c.categoria !== filtroCategoria) return false;
                    if (filtroCatalogo === 'pendiente' && c.catalogo_aprobado) return false;
                    return c.catalogo_aprobado;
                  }).length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Con catálogo
                </Typography>
              </Paper>

              {/* Catálogos Pendientes */}
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 2.5, 
                  minWidth: 200, 
                  bgcolor: 'warning.50',
                  borderLeft: '4px solid',
                  borderColor: 'warning.main'
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                  CATÁLOGOS PENDIENTES
                </Typography>
                <Typography variant="h5" fontWeight={700} color="warning.dark">
                  {contratos.filter(c => {
                    if (filtroContratista && c.contratista_id !== filtroContratista) return false;
                    if (filtroCategoria && c.categoria !== filtroCategoria) return false;
                    if (filtroCatalogo === 'aprobado' && c.catalogo_aprobado) return false;
                    return !c.catalogo_aprobado;
                  }).length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Sin aprobar
                </Typography>
              </Paper>
            </Stack>
          </Box>

          {/* Tabs para vista Cards y Tabla */}
          <Paper elevation={1} sx={{ mb: 2 }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  minHeight: 48,
                  py: 1,
                  '&.Mui-selected': {
                    color: '#334155',
                    fontWeight: 600
                  }
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#334155',
                  height: 3,
                  borderRadius: '3px 3px 0 0'
                }
              }}
            >
              <Tab icon={<Grid className="w-4 h-4" />} iconPosition="start" label="Vista Cards" />
              <Tab icon={<List className="w-4 h-4" />} iconPosition="start" label="Vista Tabla" />
            </Tabs>
          </Paper>

          {/* Tab 0: Vista Cards */}
          {activeTab === 0 && (
          <Paper
            elevation={0}
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(20px)',
              border: '2px solid rgba(255, 255, 255, 0.6)',
              borderRadius: 4,
              p: 3,
            }}
          >
            <Typography variant="h6" sx={{ color: '#64748b', mb: 3 }}>
              Contratos Registrados ({contratos.filter(c => {
                if (filtroContratista && c.contratista_id !== filtroContratista) return false;
                if (filtroCategoria && c.categoria !== filtroCategoria) return false;
                if (filtroCatalogo === 'aprobado' && !c.catalogo_aprobado) return false;
                if (filtroCatalogo === 'pendiente' && c.catalogo_aprobado) return false;
                return true;
              }).length})
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {contratos.filter(c => {
                if (filtroContratista && c.contratista_id !== filtroContratista) return false;
                if (filtroCategoria && c.categoria !== filtroCategoria) return false;
                if (filtroCatalogo === 'aprobado' && !c.catalogo_aprobado) return false;
                if (filtroCatalogo === 'pendiente' && c.catalogo_aprobado) return false;
                return true;
              }).map((contrato) => (
              <Paper
                key={contrato.id}
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: 'rgba(255, 255, 255, 0.6)',
                  border: '1px solid rgba(51, 65, 85, 0.15)',
                  borderRadius: 2,
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    borderColor: '#334155',
                  },
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        {contrato.clave_contrato}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 500, color: '#64748b' }}>
                        ({contrato.numero_contrato})
                      </Typography>
                      {contrato.catalogo_aprobado ? (
                        <Chip
                          icon={<CheckCircle className="w-3 h-3" />}
                          label="Catálogo Aprobado"
                          size="small"
                          sx={{ bgcolor: '#22c55e', color: 'white', fontWeight: 600, height: 20, '& .MuiChip-label': { px: 1, fontSize: '0.7rem' } }}
                        />
                      ) : (
                        <Chip
                          icon={<AlertCircle className="w-3 h-3" />}
                          label="Catálogo Pendiente"
                          size="small"
                          sx={{ bgcolor: '#f59e0b', color: 'white', fontWeight: 600, height: 20, '& .MuiChip-label': { px: 1, fontSize: '0.7rem' } }}
                        />
                      )}
                    </Stack>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      Contratista: {contratistas.find(c => c.id === contrato.contratista_id)?.nombre || 'N/A'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      Categoría: {contrato.categoria} | Partida: {contrato.partida}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      Monto: ${contrato.monto_contrato?.toLocaleString('es-MX')}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    {/* Botón de Aprobar Catálogo - Solo admin si no está aprobado */}
                    {!contrato.catalogo_aprobado && puedeAprobarCatalogo && (
                      <Tooltip title={contratosConConceptos.has(contrato.id) ? "Aprobar Catálogo" : "No hay conceptos para aprobar"}>
                        <span>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<CheckCircle className="w-4 h-4" />}
                            onClick={() => handleAprobarCatalogo(contrato)}
                            disabled={!contratosConConceptos.has(contrato.id)}
                            sx={{
                              bgcolor: '#22c55e',
                              '&:hover': { bgcolor: '#16a34a' },
                              '&:disabled': { bgcolor: '#94a3b8', color: 'white', opacity: 0.6 },
                              textTransform: 'none',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              px: 1.5,
                              py: 0.5
                            }}
                          >
                            Aprobar
                          </Button>
                        </span>
                      </Tooltip>
                    )}
                    
                    {/* Botón de Catálogos - Para todos */}
                    <IconButton
                      size="small"
                      onClick={() => setSelectedContratoForCatalogos(contrato)}
                      sx={{
                        color: '#2563eb',
                        '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.1)' }
                      }}
                      title="Ver Catálogos"
                    >
                      <BookOpen className="w-5 h-5" />
                    </IconButton>
                    
                    {/* Botón de Ver/Editar */}
                    {isContratista() ? (
                      // Contratista: Ver (solo lectura)
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(contrato)}
                        sx={{
                          color: '#334155',
                          '&:hover': { bgcolor: 'rgba(51, 65, 85, 0.1)' }
                        }}
                        title="Ver Detalles"
                      >
                        <Eye className="w-5 h-5" />
                      </IconButton>
                    ) : (
                      // Otros: Editar
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(contrato)}
                        sx={{
                          color: '#334155',
                          '&:hover': { bgcolor: 'rgba(51, 65, 85, 0.1)' }
                        }}
                        title="Editar"
                      >
                        <Edit className="w-5 h-5" />
                      </IconButton>
                    )}
                    
                    {/* Botón de Eliminar - Solo para "otros" */}
                    {puedeEditar && (
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(contrato.id, contrato.numero_contrato || 'Contrato')}
                        sx={{
                          color: '#dc2626',
                          '&:hover': { bgcolor: 'rgba(220, 38, 38, 0.1)' }
                        }}
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </IconButton>
                    )}
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Box>
        </Paper>
          )}
          
          {/* Tab 1: Vista Tabla */}
          {activeTab === 1 && (
            <TableContainer component={Paper} elevation={0} sx={{ bgcolor: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(20px)', border: '2px solid rgba(255, 255, 255, 0.6)', borderRadius: 4 }}>
              <Table>
                <TableHead sx={{ bgcolor: '#334155' }}>
                  <TableRow>
                    <TableCell sx={{ color: 'white', fontWeight: 700, minWidth: 150 }}>
                      <Stack spacing={0.5}>
                        <TableSortLabel
                          active={orderBy === 'numero'}
                          direction={orderBy === 'numero' ? order : 'asc'}
                          onClick={() => handleRequestSort('numero')}
                          sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                        >
                          Número
                        </TableSortLabel>
                        <TextField
                          size="small"
                          placeholder="Filtrar..."
                          value={filtroNumero}
                          onChange={(e) => setFiltroNumero(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ bgcolor: 'white', borderRadius: 1, '& .MuiInputBase-input': { py: 0.5, fontSize: '0.75rem' } }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 700, minWidth: 150 }}>
                      <Stack spacing={0.5}>
                        <TableSortLabel
                          active={orderBy === 'clave'}
                          direction={orderBy === 'clave' ? order : 'asc'}
                          onClick={() => handleRequestSort('clave')}
                          sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                        >
                          Clave
                        </TableSortLabel>
                        <TextField
                          size="small"
                          placeholder="Filtrar..."
                          value={filtroClave}
                          onChange={(e) => setFiltroClave(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ bgcolor: 'white', borderRadius: 1, '& .MuiInputBase-input': { py: 0.5, fontSize: '0.75rem' } }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 700, minWidth: 200 }}>
                      <Stack spacing={0.5}>
                        <TableSortLabel
                          active={orderBy === 'contratista'}
                          direction={orderBy === 'contratista' ? order : 'asc'}
                          onClick={() => handleRequestSort('contratista')}
                          sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                        >
                          Contratista
                        </TableSortLabel>
                        <TextField
                          size="small"
                          placeholder="Filtrar..."
                          value={filtroContratistaTabla}
                          onChange={(e) => setFiltroContratistaTabla(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ bgcolor: 'white', borderRadius: 1, '& .MuiInputBase-input': { py: 0.5, fontSize: '0.75rem' } }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 700, minWidth: 150 }}>
                      <Stack spacing={0.5}>
                        <TableSortLabel
                          active={orderBy === 'categoria'}
                          direction={orderBy === 'categoria' ? order : 'asc'}
                          onClick={() => handleRequestSort('categoria')}
                          sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                        >
                          Categoría
                        </TableSortLabel>
                        <TextField
                          size="small"
                          placeholder="Filtrar..."
                          value={filtroCategoriaTabla}
                          onChange={(e) => setFiltroCategoriaTabla(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ bgcolor: 'white', borderRadius: 1, '& .MuiInputBase-input': { py: 0.5, fontSize: '0.75rem' } }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 700, minWidth: 120 }}>
                      <Stack spacing={0.5}>
                        <TableSortLabel
                          active={orderBy === 'partida'}
                          direction={orderBy === 'partida' ? order : 'asc'}
                          onClick={() => handleRequestSort('partida')}
                          sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                        >
                          Partida
                        </TableSortLabel>
                        <TextField
                          size="small"
                          placeholder="Filtrar..."
                          value={filtroPartida}
                          onChange={(e) => setFiltroPartida(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ bgcolor: 'white', borderRadius: 1, '& .MuiInputBase-input': { py: 0.5, fontSize: '0.75rem' } }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 700, minWidth: 120 }}>
                      <Stack spacing={0.5}>
                        <TableSortLabel
                          active={orderBy === 'subpartida'}
                          direction={orderBy === 'subpartida' ? order : 'asc'}
                          onClick={() => handleRequestSort('subpartida')}
                          sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                        >
                          Subpartida
                        </TableSortLabel>
                        <TextField
                          size="small"
                          placeholder="Filtrar..."
                          value={filtroSubpartida}
                          onChange={(e) => setFiltroSubpartida(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ bgcolor: 'white', borderRadius: 1, '& .MuiInputBase-input': { py: 0.5, fontSize: '0.75rem' } }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 700, minWidth: 130 }} align="right">
                      <Stack spacing={0.5}>
                        <TableSortLabel
                          active={orderBy === 'monto'}
                          direction={orderBy === 'monto' ? order : 'asc'}
                          onClick={() => handleRequestSort('monto')}
                          sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                        >
                          Monto
                        </TableSortLabel>
                        <TextField
                          size="small"
                          placeholder="Filtrar..."
                          value={filtroMonto}
                          onChange={(e) => setFiltroMonto(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ bgcolor: 'white', borderRadius: 1, '& .MuiInputBase-input': { py: 0.5, fontSize: '0.75rem' } }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 700, minWidth: 130 }} align="right">
                      <Stack spacing={0.5}>
                        <TableSortLabel
                          active={orderBy === 'anticipo'}
                          direction={orderBy === 'anticipo' ? order : 'asc'}
                          onClick={() => handleRequestSort('anticipo')}
                          sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                        >
                          Anticipo
                        </TableSortLabel>
                        <TextField
                          size="small"
                          placeholder="Filtrar..."
                          value={filtroAnticipo}
                          onChange={(e) => setFiltroAnticipo(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ bgcolor: 'white', borderRadius: 1, '& .MuiInputBase-input': { py: 0.5, fontSize: '0.75rem' } }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 700, minWidth: 100 }} align="right">
                      <Stack spacing={0.5}>
                        <TableSortLabel
                          active={orderBy === 'retencion'}
                          direction={orderBy === 'retencion' ? order : 'asc'}
                          onClick={() => handleRequestSort('retencion')}
                          sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                        >
                          Retención %
                        </TableSortLabel>
                        <TextField
                          size="small"
                          placeholder="Filtrar..."
                          value={filtroRetencion}
                          onChange={(e) => setFiltroRetencion(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ bgcolor: 'white', borderRadius: 1, '& .MuiInputBase-input': { py: 0.5, fontSize: '0.75rem' } }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 700, minWidth: 120 }}>
                      <Stack spacing={0.5}>
                        <TableSortLabel
                          active={orderBy === 'fechaInicio'}
                          direction={orderBy === 'fechaInicio' ? order : 'asc'}
                          onClick={() => handleRequestSort('fechaInicio')}
                          sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                        >
                          Fecha Inicio
                        </TableSortLabel>
                        <TextField
                          size="small"
                          placeholder="Filtrar..."
                          value={filtroFechaInicio}
                          onChange={(e) => setFiltroFechaInicio(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ bgcolor: 'white', borderRadius: 1, '& .MuiInputBase-input': { py: 0.5, fontSize: '0.75rem' } }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 700, minWidth: 120 }}>
                      <Stack spacing={0.5}>
                        <TableSortLabel
                          active={orderBy === 'fechaFin'}
                          direction={orderBy === 'fechaFin' ? order : 'asc'}
                          onClick={() => handleRequestSort('fechaFin')}
                          sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                        >
                          Fecha Fin
                        </TableSortLabel>
                        <TextField
                          size="small"
                          placeholder="Filtrar..."
                          value={filtroFechaFin}
                          onChange={(e) => setFiltroFechaFin(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ bgcolor: 'white', borderRadius: 1, '& .MuiInputBase-input': { py: 0.5, fontSize: '0.75rem' } }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 700, minWidth: 120 }}>
                      <Stack spacing={0.5}>
                        <TableSortLabel
                          active={orderBy === 'estatus'}
                          direction={orderBy === 'estatus' ? order : 'asc'}
                          onClick={() => handleRequestSort('estatus')}
                          sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                        >
                          Estatus
                        </TableSortLabel>
                        <TextField
                          size="small"
                          placeholder="Filtrar..."
                          value={filtroEstatus}
                          onChange={(e) => setFiltroEstatus(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ bgcolor: 'white', borderRadius: 1, '& .MuiInputBase-input': { py: 0.5, fontSize: '0.75rem' } }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 700, minWidth: 150 }} align="center">
                      <Stack spacing={0.5}>
                        <TableSortLabel
                          active={orderBy === 'catalogo'}
                          direction={orderBy === 'catalogo' ? order : 'asc'}
                          onClick={() => handleRequestSort('catalogo')}
                          sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                        >
                          Estado Catálogo
                        </TableSortLabel>
                        <TextField
                          size="small"
                          placeholder="Filtrar..."
                          value={filtroEstadoCatalogo}
                          onChange={(e) => setFiltroEstadoCatalogo(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ bgcolor: 'white', borderRadius: 1, '& .MuiInputBase-input': { py: 0.5, fontSize: '0.75rem' } }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contratosFiltrados.map((contrato) => (
                    <TableRow key={contrato.id} hover>
                      <TableCell>{contrato.numero_contrato}</TableCell>
                      <TableCell>{contrato.clave_contrato}</TableCell>
                      <TableCell>{contratistas.find(c => c.id === contrato.contratista_id)?.nombre || 'N/A'}</TableCell>
                      <TableCell>{contrato.categoria}</TableCell>
                      <TableCell>{contrato.partida}</TableCell>
                      <TableCell>{contrato.subpartida}</TableCell>
                      <TableCell align="right">${contrato.monto_contrato?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell align="right">${contrato.anticipo_monto?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}</TableCell>
                      <TableCell align="right">{contrato.retencion_porcentaje?.toFixed(2) || '0.00'}%</TableCell>
                      <TableCell>{contrato.fecha_inicio ? new Date(contrato.fecha_inicio).toLocaleDateString('es-MX') : 'N/A'}</TableCell>
                      <TableCell>{contrato.fecha_fin ? new Date(contrato.fecha_fin).toLocaleDateString('es-MX') : 'N/A'}</TableCell>
                      <TableCell>
                        {contrato.estatus ? (
                          <Chip
                            label={contrato.estatus.replace(/_/g, ' ')}
                            size="small"
                            sx={{
                              bgcolor: contrato.estatus === 'ACTIVO' ? '#22c55e' : contrato.estatus === 'FINALIZADO' ? '#3b82f6' : '#94a3b8',
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.7rem'
                            }}
                          />
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell align="center">
                        {contrato.catalogo_aprobado ? (
                          <Chip
                            icon={<CheckCircle className="w-3 h-3" />}
                            label="Aprobado"
                            size="small"
                            sx={{ bgcolor: '#22c55e', color: 'white', fontWeight: 600 }}
                          />
                        ) : (
                          <Chip
                            icon={<AlertCircle className="w-3 h-3" />}
                            label="Pendiente"
                            size="small"
                            sx={{ bgcolor: '#f59e0b', color: 'white', fontWeight: 600 }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          {!contrato.catalogo_aprobado && puedeAprobarCatalogo && (
                            <Tooltip title={contratosConConceptos.has(contrato.id) ? "Aprobar Catálogo" : "No hay conceptos para aprobar"}>
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleAprobarCatalogo(contrato)}
                                  disabled={!contratosConConceptos.has(contrato.id)}
                                  sx={{ 
                                    color: '#22c55e', 
                                    '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.1)' },
                                    '&:disabled': { color: '#94a3b8', opacity: 0.5 }
                                  }}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                          <Tooltip title="Ver Catálogos">
                            <IconButton
                              size="small"
                              onClick={() => setSelectedContratoForCatalogos(contrato)}
                              sx={{ color: '#2563eb', '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.1)' } }}
                            >
                              <BookOpen className="w-4 h-4" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={isContratista() ? "Ver Detalles" : "Editar"}>
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(contrato)}
                              sx={{ color: '#334155', '&:hover': { bgcolor: 'rgba(51, 65, 85, 0.1)' } }}
                            >
                              {isContratista() ? <Eye className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                            </IconButton>
                          </Tooltip>
                          {puedeEditar && (
                            <Tooltip title="Eliminar">
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(contrato.id, contrato.numero_contrato || 'Contrato')}
                                sx={{ color: '#dc2626', '&:hover': { bgcolor: 'rgba(220, 38, 38, 0.1)' } }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* FAB para agregar - Solo para "otros" */}
      {puedeEditar && (
        <Fab
          color="primary"
          aria-label="agregar contrato"
          onClick={() => setShowForm(true)}
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            bgcolor: 'primary.main',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
        }}
      >
        <Plus className="w-6 h-6" />
      </Fab>
      )}

      {/* Modal del formulario */}
      <Modal
        isOpen={showForm}
        onClose={handleCloseModal}
        title={editingContrato ? 'Editar Contrato' : 'Nuevo Contrato'}
        size="xl"
      >
        {loadingContratistas ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: 'primary.main' }} />
          </Box>
        ) : (
          <ContratoForm
            contrato={editingContrato}
            onSubmit={handleSubmit}
            onCancel={handleCloseModal}
            readOnly={isContratista()}
            contratistas={contratistas.map(c => ({
              id: c.id,
              nombre: c.nombre
            }))}
          />
        )}
      </Modal>

      {/* Modal de Catálogos de Conceptos */}
      {selectedContratoForCatalogos && (
        <ContratoConceptosModal
          isOpen={!!selectedContratoForCatalogos}
          onClose={() => setSelectedContratoForCatalogos(null)}
          contratoId={selectedContratoForCatalogos.id}
          numeroContrato={selectedContratoForCatalogos.numero_contrato}
          readOnly={isContratista()}
        />
      )}
    </Container>
  )
}
