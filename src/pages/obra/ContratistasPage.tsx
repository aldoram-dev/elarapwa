import React, { useState } from 'react'
import { Box, Typography, Container, Paper, Fab, CircularProgress, Alert, IconButton, Stack, Button, Tooltip } from '@mui/material'
import { Plus, FileText, Edit, Trash2, Eye } from 'lucide-react'
import { ContratistaForm } from '@/components/obra/ContratistaForm'
import { Modal } from '@/components/ui'
import { useContratistas } from '@/lib/hooks/useContratistas'
import type { ContratistaInsert, Contratista } from '@/types/contratista'
import { supabase } from '@/lib/core/supabaseClient'

export default function ContratistasPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingContratista, setEditingContratista] = useState<Contratista | null>(null)
  const { contratistas, loading, error, createContratista, updateContratista, deleteContratista } = useContratistas()

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

  const handleSubmit = async (data: ContratistaInsert | Partial<Contratista>) => {
    if (editingContratista) {
      // Actualizar contratista existente
      console.log('Actualizar contratista:', editingContratista.id, data)
      const { error: updateError } = await updateContratista(editingContratista.id, data)
      
      if (updateError) {
        console.error('Error al actualizar:', updateError)
        alert(`Error: ${updateError}`)
        return
      }
      
      console.log('Contratista actualizado exitosamente')
      setEditingContratista(null)
    } else {
      // Crear nuevo contratista
      console.log('Crear contratista:', data)
      const { data: newContratista, error: createError } = await createContratista(data as ContratistaInsert)
      
      if (createError) {
        console.error('Error al crear:', createError)
        alert(`Error: ${createError}`)
        return
      }
      
      console.log('Contratista creado exitosamente:', newContratista)
    }
    
    setShowForm(false)
  }

  const handleEdit = (contratista: Contratista) => {
    setEditingContratista(contratista)
    setShowForm(true)
  }

  const handleDelete = async (id: string, nombre: string) => {
    if (window.confirm(`¿Estás seguro de eliminar al contratista "${nombre}"?`)) {
      const { error: deleteError } = await deleteContratista(id)
      
      if (deleteError) {
        alert(`Error al eliminar: ${deleteError}`)
      }
    }
  }

  const handleCloseModal = () => {
    setShowForm(false)
    setEditingContratista(null)
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
            Contratistas
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 1 }}>
            Gestión de contratistas y proveedores
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      ) : contratistas.length === 0 ? (
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
            No hay contratistas registrados
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Haz clic en el botón + para agregar tu primer contratista
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
            p: 3
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            {contratistas.length} Contratista{contratistas.length !== 1 ? 's' : ''}
          </Typography>
          {contratistas.map((contratista) => (
            <Paper
              key={contratista.id}
              sx={{
                p: 2,
                mb: 2,
                bgcolor: 'rgba(255, 255, 255, 0.6)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.8)',
                },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {contratista.nombre}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {contratista.categoria} - {contratista.partida}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {contratista.telefono} • {contratista.correo_contacto}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <IconButton 
                    size="small" 
                    onClick={() => handleEdit(contratista)}
                    sx={{ color: '#334155', '&:hover': { bgcolor: 'rgba(51, 65, 85, 0.1)' } }}
                  >
                    <Edit size={18} />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => handleDelete(contratista.id, contratista.nombre)}
                    sx={{ color: '#dc2626' }}
                  >
                    <Trash2 size={18} />
                  </IconButton>
                </Stack>
              </Box>
              
              {/* Documentos adjuntos */}
              {(contratista.csf_url || contratista.cv_url || contratista.acta_constitutiva_url || 
                contratista.repse_url || contratista.ine_url || contratista.registro_patronal_url || 
                contratista.comprobante_domicilio_url) && (
                <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                  {contratista.csf_url && (
                    <Tooltip title="Ver CSF">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Eye size={14} />}
                        onClick={() => handleOpenDocument(contratista.csf_url)}
                        sx={{ fontSize: '0.7rem', py: 0.25, px: 1 }}
                      >
                        CSF
                      </Button>
                    </Tooltip>
                  )}
                  {contratista.cv_url && (
                    <Tooltip title="Ver Curriculum">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Eye size={14} />}
                        onClick={() => handleOpenDocument(contratista.cv_url)}
                        sx={{ fontSize: '0.7rem', py: 0.25, px: 1 }}
                      >
                        CV
                      </Button>
                    </Tooltip>
                  )}
                  {contratista.acta_constitutiva_url && (
                    <Tooltip title="Ver Acta Constitutiva">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Eye size={14} />}
                        onClick={() => handleOpenDocument(contratista.acta_constitutiva_url)}
                        sx={{ fontSize: '0.7rem', py: 0.25, px: 1 }}
                      >
                        Acta
                      </Button>
                    </Tooltip>
                  )}
                  {contratista.repse_url && (
                    <Tooltip title="Ver REPSE">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Eye size={14} />}
                        onClick={() => handleOpenDocument(contratista.repse_url)}
                        sx={{ fontSize: '0.7rem', py: 0.25, px: 1 }}
                      >
                        REPSE
                      </Button>
                    </Tooltip>
                  )}
                  {contratista.ine_url && (
                    <Tooltip title="Ver INE">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Eye size={14} />}
                        onClick={() => handleOpenDocument(contratista.ine_url)}
                        sx={{ fontSize: '0.7rem', py: 0.25, px: 1 }}
                      >
                        INE
                      </Button>
                    </Tooltip>
                  )}
                  {contratista.registro_patronal_url && (
                    <Tooltip title="Ver Registro Patronal">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Eye size={14} />}
                        onClick={() => handleOpenDocument(contratista.registro_patronal_url)}
                        sx={{ fontSize: '0.7rem', py: 0.25, px: 1 }}
                      >
                        Reg. Patronal
                      </Button>
                    </Tooltip>
                  )}
                  {contratista.comprobante_domicilio_url && (
                    <Tooltip title="Ver Comprobante de Domicilio">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Eye size={14} />}
                        onClick={() => handleOpenDocument(contratista.comprobante_domicilio_url)}
                        sx={{ fontSize: '0.7rem', py: 0.25, px: 1 }}
                      >
                        Comp. Dom.
                      </Button>
                    </Tooltip>
                  )}
                </Stack>
              )}
            </Paper>
          ))}
        </Paper>
      )}

      {/* FAB para agregar */}
      <Fab
        color="primary"
        aria-label="agregar contratista"
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

      {/* Modal del formulario */}
      <Modal
        isOpen={showForm}
        onClose={handleCloseModal}
        title={editingContratista ? 'Editar Contratista' : 'Nuevo Contratista'}
        size="xl"
      >
        <ContratistaForm
          contratista={editingContratista}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
        />
      </Modal>
    </Container>
  )
}
