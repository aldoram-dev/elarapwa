import React from 'react'
import { Box, Typography, Container, Paper, Card, CardContent, CardActionArea, Stack } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { HardHat, Users, FileText } from 'lucide-react'

export default function ObraIndexPage() {
  const navigate = useNavigate()

  const modules = [
    {
      title: 'Contratistas',
      description: 'Gestiona contratistas y proveedores',
      icon: <Users className="w-12 h-12" />,
      path: '/obra/contratistas',
      color: '#3b82f6',
    },
    {
      title: 'Contratos',
      description: 'Administra contratos y acuerdos',
      icon: <FileText className="w-12 h-12" />,
      path: '/obra/contratos',
      color: '#8b5cf6',
    },
  ]

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <HardHat className="w-16 h-16" style={{ color: '#9c27b0' }} />
        </Box>
        <Typography 
          variant="h3" 
          sx={{ 
            fontWeight: 800, 
            color: '#1e293b',
            mb: 2
          }}
        >
          Administración de Obra
        </Typography>
        <Typography variant="body1" sx={{ color: '#64748b', maxWidth: 600, mx: 'auto' }}>
          Sistema integral para gestionar contratistas, contratos y toda la operación de construcción
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
        {modules.map((module) => (
          <Card
            key={module.path}
            elevation={0}
            sx={{
              height: '100%',
              bgcolor: 'rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(20px)',
              border: '2px solid rgba(255, 255, 255, 0.6)',
              borderRadius: 4,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 40px rgba(156, 39, 176, 0.2)',
                borderColor: module.color,
              },
            }}
          >
            <CardActionArea
              onClick={() => navigate(module.path)}
              sx={{ height: '100%', p: 4 }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: 'rgba(156, 39, 176, 0.1)',
                    mb: 3,
                  }}
                >
                  {React.cloneElement(module.icon, { style: { color: module.color } })}
                </Box>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 700, 
                    color: '#1e293b',
                    mb: 2
                  }}
                >
                  {module.title}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  {module.description}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      <Box sx={{ mt: 6 }}>
        <Paper
          elevation={0}
          sx={{
            bgcolor: 'rgba(156, 39, 176, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(156, 39, 176, 0.1)',
            borderRadius: 4,
            p: 4,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>
            📋 Funcionalidades del Módulo
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                • Registro completo de contratistas con documentación
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                • Gestión de 7 documentos por contratista
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                • Categorización por partidas y subpartidas
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                • Control de contratos con montos y fechas
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                • Cálculo de retenciones y penalizaciones
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                • Seguimiento de estatus y avance de contratos
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}
