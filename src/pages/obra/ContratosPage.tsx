import React, { useState } from 'react'
import { Box, Typography, Container, Paper, Fab, CircularProgress, Alert, IconButton, Stack, Chip, Button, Tooltip } from '@mui/material'
import { Plus, FileText, Edit, Trash2, BookOpen, Eye, CheckCircle, AlertCircle } from 'lucide-react'
import { ContratoForm } from '@/components/obra/ContratoForm'
import { ContratoConceptosModal } from '@/components/obra/ContratoConceptosModal'
import { Modal } from '@/components/ui'
import { useContratistas } from '@/lib/hooks/useContratistas'
import { useContratos } from '@/lib/hooks/useContratos'
import { useAuth } from '@/context/AuthContext'
import type { Contrato } from '@/types/contrato'

export default function ContratosPage() {
  const { perfil, user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [editingContrato, setEditingContrato] = useState<Contrato | null>(null)
  const [selectedContratoForCatalogos, setSelectedContratoForCatalogos] = useState<Contrato | null>(null)
  const { contratistas, loading: loadingContratistas } = useContratistas()
  const { contratos, loading, error, createContrato, updateContrato, deleteContrato } = useContratos()

  // Determinar si es contratista (CONTRATISTA o USUARIO) u "otros" (perfiles administrativos)
  const esContratista = perfil?.roles?.some(r => r === 'CONTRATISTA' || r === 'USUARIO')
  const puedeEditar = !esContratista // Solo "otros" pueden editar/eliminar
  
  const rolesAprobadores = [
    'Gerente Plataforma',
    'Gerencia',
    'Administracion',
    'Administración',
    'Supervisor Louva',
    'Finanzas',
    'Desarrollador'
  ]
  const puedeAprobarCatalogo = !esContratista && (
    perfil?.roles?.some(r => rolesAprobadores.includes(r)) || 
    user?.user_metadata?.roles?.some((r: string) => rolesAprobadores.includes(r))
  )

  // Debug: Ver qué roles tiene el usuario
  console.log('👤 Roles del usuario:', {
    perfilRoles: perfil?.roles,
    userMetadataRoles: user?.user_metadata?.roles,
    esContratista,
    puedeAprobarCatalogo
  })

  const handleSubmit = async (data: Partial<Contrato>) => {
    if (editingContrato) {
      // Actualizar contrato existente
      console.log('Actualizar contrato:', editingContrato.id, data)
      const { error: updateError } = await updateContrato(editingContrato.id, data)
      
      if (updateError) {
        console.error('Error al actualizar:', updateError)
        alert(`Error: ${updateError}`)
        return
      }
      
      console.log('Contrato actualizado exitosamente')
      setEditingContrato(null)
    } else {
      // Crear nuevo contrato
      console.log('Crear contrato:', data)
      const { data: newContrato, error: createError } = await createContrato(data)
      
      if (createError) {
        console.error('Error al crear:', createError)
        alert(`Error: ${createError}`)
        return
      }
      
      console.log('Contrato creado exitosamente:', newContrato)
    }
    
    setShowForm(false)
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

    const confirmar = window.confirm(
      `¿Aprobar el catálogo del contrato ${contrato.numero_contrato || contrato.clave_contrato}?\n\n` +
      `Una vez aprobado, NO se podrá modificar.\n` +
      `Cualquier cambio requerirá extraordinarios o aditivas/deductivas.\n\n` +
      `¿Continuar con la aprobación?`
    )

    if (!confirmar) return

    try {
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

      alert('✅ Catálogo aprobado exitosamente')
      window.location.reload()
    } catch (error: any) {
      console.error('Error aprobando catálogo:', error)
      alert(`❌ Error al aprobar catálogo: ${error.message}`)
    }
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
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
            Contratos Registrados ({contratos.length})
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {contratos.map((contrato) => (
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
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {contrato.numero_contrato}
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
                      <Tooltip title="Aprobar Catálogo">
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<CheckCircle className="w-4 h-4" />}
                          onClick={() => handleAprobarCatalogo(contrato)}
                          sx={{
                            bgcolor: '#22c55e',
                            '&:hover': { bgcolor: '#16a34a' },
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            px: 1.5,
                            py: 0.5
                          }}
                        >
                          Aprobar
                        </Button>
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
                    {esContratista ? (
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
            readOnly={esContratista}
            contratistas={contratistas.map(c => ({
              id: c.id,
              nombre: c.nombre,
              categoria: c.categoria,
              partida: c.partida
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
          readOnly={esContratista}
        />
      )}
    </Container>
  )
}
