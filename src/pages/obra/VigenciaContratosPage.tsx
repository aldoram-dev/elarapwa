import React, { useState, useEffect } from 'react'
import { useContratos } from '@/lib/hooks/useContratos'
import { useProyectoStore } from '@/stores/proyectoStore'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/core/supabaseClient'
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Stack,
  Chip,
} from '@mui/material'
import DescriptionIcon from '@mui/icons-material/Description'
import AccessTimeIcon from '@mui/icons-material/AccessTime'

interface ContratoVigencia {
  id: string
  clave_contrato: string
  descripcion: string
  contratista_nombre?: string
  fecha_inicio: string
  fecha_fin: string
  daysLeft: number
  countdown: string
}

export const VigenciaContratosPage: React.FC = () => {
  const { proyectos } = useProyectoStore()
  const proyectoActual = proyectos[0]
  const { contratos, loading } = useContratos()
  const { perfil } = useAuth()
  const [contratosVigencia, setContratosVigencia] = useState<ContratoVigencia[]>([])

  // Determinar si es contratista
  const esContratista = perfil?.roles?.some(r => r === 'CONTRATISTA' || r === 'USUARIO')
  const contratistaId = perfil?.contratista_id

  useEffect(() => {
    if (!contratos.length) return

    const loadContratosConContratistas = async () => {
      // Cargar contratos directamente con join de contratistas
      const now = new Date()
      
      let query = supabase
        .from('contratos')
        .select(`
          *,
          contratista:contratistas!contratista_id(nombre)
        `)
        .eq('active', true)
        .not('fecha_inicio', 'is', null)
        .not('fecha_fin', 'is', null)

      // Filtrar por contratista si es contratista
      if (esContratista && contratistaId) {
        query = query.eq('contratista_id', contratistaId)
      }
      
      const { data: contratosData, error } = await query
      
      if (error) {
        console.error('Error cargando contratos con contratistas:', error)
        return
      }
      
      if (!contratosData) return
      
      const contratosConVigencia = contratosData.map((c: any) => {
        const fechaFin = new Date(c.fecha_fin)
        const daysLeft = Math.floor((fechaFin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        return {
          id: c.id,
          clave_contrato: c.clave_contrato || c.numero_contrato || 'N/A',
          descripcion: c.descripcion || c.nombre || 'Sin descripción',
          contratista_nombre: c.contratista?.nombre || 'Sin asignar',
          fecha_inicio: c.fecha_inicio,
          fecha_fin: c.fecha_fin,
          daysLeft,
          countdown: ''
        }
      })
      
      const ordenados = contratosConVigencia.sort((a, b) => a.daysLeft - b.daysLeft)
      setContratosVigencia(ordenados)
    }

    loadContratosConContratistas()

    // Actualizar countdown cada segundo
    const interval = setInterval(() => {
      setContratosVigencia(prev => prev.map(c => ({
        ...c,
        countdown: calcularCountdown(c.fecha_fin)
      })))
    }, 1000)

    return () => clearInterval(interval)
  }, [contratos, proyectoActual?.id, esContratista, contratistaId])

  const calcularCountdown = (fechaFinStr: string): string => {
    const fechaFin = new Date(fechaFinStr)
    const now = new Date()
    const diff = fechaFin.getTime() - now.getTime()

    if (diff <= 0) return '¡Vencido!'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24).toString().padStart(2, '0')
    const minutes = Math.floor((diff / (1000 * 60)) % 60).toString().padStart(2, '0')
    const seconds = Math.floor((diff / 1000) % 60).toString().padStart(2, '0')

    return `${days} días ${hours}:${minutes}:${seconds}`
  }

  const getCardColor = (daysLeft: number) => {
    if (daysLeft <= 30) return '#ffcccc' // Rojo claro
    if (daysLeft <= 45) return '#f6f4ba' // Amarillo claro
    return '#8fbc8f' // Verde claro
  }

  const getChipColor = (daysLeft: number): 'error' | 'warning' | 'success' => {
    if (daysLeft <= 30) return 'error'
    if (daysLeft <= 45) return 'warning'
    return 'success'
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-MX', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
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
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <AccessTimeIcon sx={{ fontSize: 40, color: '#334155' }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
            Vigencia de Contratos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitoreo de fechas de vencimiento de contratos
          </Typography>
        </Box>
      </Box>

      {/* Leyenda */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Chip 
          label="≤ 30 días - Crítico" 
          sx={{ bgcolor: '#ffcccc', fontWeight: 600 }} 
        />
        <Chip 
          label="≤ 45 días - Advertencia" 
          sx={{ bgcolor: '#f6f4ba', fontWeight: 600 }} 
        />
        <Chip 
          label="> 45 días - Normal" 
          sx={{ bgcolor: '#8fbc8f', color: 'white', fontWeight: 600 }} 
        />
      </Box>

      {/* Grid de contratos */}
      {contratosVigencia.length === 0 ? (
        <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              No hay contratos con fechas de vigencia configuradas
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)'
            },
            gap: 3
          }}
        >
          {contratosVigencia.map((contrato) => (
            <Card
              key={contrato.id} 
                sx={{ 
                  borderRadius: 3,
                  boxShadow: 3,
                  bgcolor: getCardColor(contrato.daysLeft),
                  height: '100%',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6
                  }
                }}
              >
                <CardContent>
                  <Stack spacing={2}>
                    {/* Header con ícono y folio */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <DescriptionIcon sx={{ color: '#334155', mt: 0.5 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 700, 
                            color: '#1a1a1a',
                            lineHeight: 1.3,
                            mb: 0.5
                          }}
                        >
                          {contrato.clave_contrato}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: '#64748b',
                            fontWeight: 600,
                            mb: 0.5
                          }}
                        >
                          {contrato.contratista_nombre}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: '#475569',
                            fontSize: '0.875rem'
                          }}
                        >
                          {contrato.descripcion}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Fechas */}
                    <Box>
                      <Typography variant="body2" sx={{ color: '#475569', mb: 0.5 }}>
                        <strong>Inicio:</strong> {formatDate(contrato.fecha_inicio)}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#475569' }}>
                        <strong>Fin:</strong> {formatDate(contrato.fecha_fin)}
                      </Typography>
                    </Box>

                    {/* Countdown */}
                    <Box 
                      sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.7)',
                        borderRadius: 2,
                        p: 2,
                        textAlign: 'center'
                      }}
                    >
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          color: contrato.daysLeft <= 0 ? '#dc2626' : '#1a1a1a'
                        }}
                      >
                        {contrato.countdown || calcularCountdown(contrato.fecha_fin)}
                      </Typography>
                    </Box>

                    {/* Badge de estado */}
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Chip 
                        label={
                          contrato.daysLeft <= 0 
                            ? 'VENCIDO' 
                            : `${Math.abs(contrato.daysLeft)} día${Math.abs(contrato.daysLeft) !== 1 ? 's' : ''} restante${Math.abs(contrato.daysLeft) !== 1 ? 's' : ''}`
                        }
                        color={contrato.daysLeft <= 0 ? 'error' : getChipColor(contrato.daysLeft)}
                        sx={{ fontWeight: 700 }}
                      />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
          ))}
        </Box>
      )}
    </Box>
  )
}

export default VigenciaContratosPage
