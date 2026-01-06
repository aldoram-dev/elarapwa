import React, { useState, useMemo, useEffect } from 'react'
import { Box, Typography, Container, Paper, Fab, CircularProgress, Alert, IconButton, Stack, Button, Tooltip, TextField, InputAdornment, Chip, Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell, TableSortLabel } from '@mui/material'
import { Plus, FileText, Edit, Trash2, Eye, Search, X, Download, Grid, List } from 'lucide-react'
import { ContratistaForm } from '@/components/obra/ContratistaForm'
import { Modal } from '@/components/ui'
import { useContratistas } from '@/lib/hooks/useContratistas'
import type { ContratistaInsert, Contratista } from '@/types/contratista'
import { supabase } from '@/lib/core/supabaseClient'

export default function ContratistasPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingContratista, setEditingContratista] = useState<Contratista | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDocComplete, setFilterDocComplete] = useState<boolean | null>(null)
  const { contratistas, loading, error, createContratista, updateContratista, deleteContratista } = useContratistas()
  
  // Tab state
  const [activeTab, setActiveTab] = useState(0)
  
  // Table filter states
  const [filtroNombre, setFiltroNombre] = useState('')
  const [filtroTelefono, setFiltroTelefono] = useState('')
  const [filtroCorreo, setFiltroCorreo] = useState('')
  const [filtroBanco, setFiltroBanco] = useState('')
  const [filtroCuenta, setFiltroCuenta] = useState('')
  const [filtroLocalizacion, setFiltroLocalizacion] = useState('')
  const [filtroContratado, setFiltroContratado] = useState('')
  const [filtroPagado, setFiltroPagado] = useState('')
  
  // Estados para contratos y pagos
  const [contratos, setContratos] = useState<any[]>([])
  const [pagos, setPagos] = useState<any[]>([])
  const [loadingFinancial, setLoadingFinancial] = useState(false)
  
  // Sorting state
  const [orderBy, setOrderBy] = useState<keyof Contratista | 'total_contratado' | 'total_pagado'>('nombre')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  
  const handleRequestSort = (property: keyof Contratista | 'total_contratado' | 'total_pagado') => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  // Cargar contratos y pagos
  useEffect(() => {
    const cargarDatosFinancieros = async () => {
      setLoadingFinancial(true)
      try {
        // Cargar contratos
        const { data: contratosData, error: contratosError } = await supabase
          .from('contratos')
          .select('id, contratista_id, monto_contrato')
          .eq('active', true)
        
        if (contratosError) throw contratosError
        setContratos(contratosData || [])
        
        // Cargar pagos realizados
        const { data: pagosData, error: pagosError } = await supabase
          .from('pagos_realizados')
          .select('id, contratista_id, monto_pagado')
          .eq('active', true)
        
        if (pagosError) throw pagosError
        setPagos(pagosData || [])
      } catch (err) {
        console.error('Error al cargar datos financieros:', err)
      } finally {
        setLoadingFinancial(false)
      }
    }
    
    cargarDatosFinancieros()
  }, [])
  
  // Calcular totales por contratista
  const totalesPorContratista = useMemo(() => {
    const totales: Record<string, { contratado: number; pagado: number }> = {}
    
    // Sumar contratos
    contratos.forEach(contrato => {
      if (!totales[contrato.contratista_id]) {
        totales[contrato.contratista_id] = { contratado: 0, pagado: 0 }
      }
      totales[contrato.contratista_id].contratado += Number(contrato.monto_contrato || 0)
    })
    
    // Sumar pagos
    pagos.forEach(pago => {
      if (!totales[pago.contratista_id]) {
        totales[pago.contratista_id] = { contratado: 0, pagado: 0 }
      }
      totales[pago.contratista_id].pagado += Number(pago.monto_pagado || 0)
    })
    
    return totales
  }, [contratos, pagos])

  // Filtrar contratistas
  const contratistasFiltrados = useMemo(() => {
    let filtered = contratistas.filter((contratista) => {
      // Filtro de búsqueda por texto (para vista de cards)
      const matchesSearch = searchTerm === '' || 
        contratista.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contratista.telefono?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contratista.correo_contacto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contratista.banco?.toLowerCase().includes(searchTerm.toLowerCase())

      // Filtro de documentación completa
      if (filterDocComplete !== null) {
        const hasAllDocs = Boolean(
          contratista.csf_url &&
          contratista.cv_url &&
          contratista.acta_constitutiva_url &&
          contratista.ine_url
        )
        if (filterDocComplete && !hasAllDocs) return false
        if (!filterDocComplete && hasAllDocs) return false
      }
      
      // Filtros de tabla
      const matchesNombre = filtroNombre === '' || contratista.nombre.toLowerCase().includes(filtroNombre.toLowerCase())
      const matchesTelefono = filtroTelefono === '' || (contratista.telefono || '').toLowerCase().includes(filtroTelefono.toLowerCase())
      const matchesCorreo = filtroCorreo === '' || (contratista.correo_contacto || '').toLowerCase().includes(filtroCorreo.toLowerCase())
      const matchesBanco = filtroBanco === '' || (contratista.banco || '').toLowerCase().includes(filtroBanco.toLowerCase())
      const matchesCuenta = filtroCuenta === '' || (contratista.numero_cuenta_bancaria || '').toLowerCase().includes(filtroCuenta.toLowerCase())
      const matchesLocalizacion = filtroLocalizacion === '' || (contratista.localizacion || '').toLowerCase().includes(filtroLocalizacion.toLowerCase())
      
      // Filtros de totales
      const totales = totalesPorContratista[contratista.id] || { contratado: 0, pagado: 0 }
      const matchesContratado = filtroContratado === '' || totales.contratado.toString().includes(filtroContratado)
      const matchesPagado = filtroPagado === '' || totales.pagado.toString().includes(filtroPagado)

      return matchesSearch && matchesNombre && matchesTelefono && matchesCorreo && 
             matchesBanco && matchesCuenta && matchesLocalizacion && matchesContratado && matchesPagado
    })
    
    // Ordenamiento
    filtered.sort((a, b) => {
      let aVal: any
      let bVal: any
      
      // Manejar ordenamiento por totales calculados
      if (orderBy === 'total_contratado') {
        aVal = totalesPorContratista[a.id]?.contratado || 0
        bVal = totalesPorContratista[b.id]?.contratado || 0
      } else if (orderBy === 'total_pagado') {
        aVal = totalesPorContratista[a.id]?.pagado || 0
        bVal = totalesPorContratista[b.id]?.pagado || 0
      } else {
        aVal = a[orderBy as keyof Contratista]
        bVal = b[orderBy as keyof Contratista]
      }
      
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return order === 'asc' ? 1 : -1
      if (bVal == null) return order === 'asc' ? -1 : 1
      
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return order === 'asc' ? comparison : -comparison
    })
    
    return filtered
  }, [contratistas, searchTerm, filterDocComplete, filtroNombre, filtroTelefono, filtroCorreo, filtroBanco, filtroCuenta, filtroLocalizacion, filtroContratado, filtroPagado, totalesPorContratista, orderBy, order])

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

  const handleDownloadCSV = () => {
    // Crear encabezados del CSV
    const headers = [
      'Nombre',
      'Teléfono',
      'Correo Electrónico',
      'Banco',
      'No. Cuenta',
      'Nombre en Cuenta',
      'Localización',
      'CSF',
      'CV',
      'Acta Constitutiva',
      'REPSE',
      'INE',
      'Registro Patronal',
      'Comprobante Domicilio'
    ]

    // Convertir datos a filas CSV
    const rows = contratistasFiltrados.map(c => [
      c.nombre || '',
      c.telefono || '',
      c.correo_contacto || '',
      c.banco || '',
      c.numero_cuenta_bancaria || '',
      c.nombre_cuenta || '',
      c.localizacion || '',
      c.csf_url ? 'Sí' : 'No',
      c.cv_url ? 'Sí' : 'No',
      c.acta_constitutiva_url ? 'Sí' : 'No',
      c.repse_url ? 'Sí' : 'No',
      c.ine_url ? 'Sí' : 'No',
      c.registro_patronal_url ? 'Sí' : 'No',
      c.comprobante_domicilio_url ? 'Sí' : 'No'
    ])

    // Crear contenido CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Crear blob y descargar
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `contratistas_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Container maxWidth={false} sx={{ py: 4, width: '90%', maxWidth: '90vw' }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
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
          
          <Button
            variant="outlined"
            startIcon={<Download size={18} />}
            onClick={handleDownloadCSV}
            disabled={contratistasFiltrados.length === 0}
            sx={{
              textTransform: 'none',
              borderColor: '#334155',
              color: '#334155',
              '&:hover': {
                borderColor: '#1e293b',
                bgcolor: 'rgba(51, 65, 85, 0.04)'
              }
            }}
          >
            Descargar CSV
          </Button>
        </Box>

        {/* Filtros */}
        <Paper
          elevation={0}
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(255, 255, 255, 0.6)',
            borderRadius: 4,
            p: 2
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            {/* Búsqueda */}
            <TextField
              size="small"
              placeholder="Buscar por nombre, teléfono, correo, banco..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flex: 1, minWidth: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} style={{ color: '#64748b' }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <X size={16} />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            {/* Filtros de documentación */}
            <Stack direction="row" spacing={1}>
              <Chip
                label="Con documentación completa"
                onClick={() => setFilterDocComplete(filterDocComplete === true ? null : true)}
                color={filterDocComplete === true ? 'primary' : 'default'}
                variant={filterDocComplete === true ? 'filled' : 'outlined'}
                size="small"
                sx={{ cursor: 'pointer' }}
              />
              <Chip
                label="Documentación incompleta"
                onClick={() => setFilterDocComplete(filterDocComplete === false ? null : false)}
                color={filterDocComplete === false ? 'warning' : 'default'}
                variant={filterDocComplete === false ? 'filled' : 'outlined'}
                size="small"
                sx={{ cursor: 'pointer' }}
              />
            </Stack>

            {/* Contador de resultados */}
            <Typography variant="body2" sx={{ color: '#64748b', whiteSpace: 'nowrap' }}>
              {contratistasFiltrados.length} de {contratistas.length}
            </Typography>
          </Stack>
        </Paper>
      </Box>

      {/* Tabs */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(20px)',
          border: '2px solid rgba(255, 255, 255, 0.6)',
          borderRadius: 4,
          mb: 3,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 600,
              minHeight: 56,
            },
          }}
        >
          <Tab
            icon={<Grid size={18} />}
            iconPosition="start"
            label="Vista Cards"
          />
          <Tab
            icon={<List size={18} />}
            iconPosition="start"
            label="Vista Tabla"
          />
        </Tabs>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Vista Cards */}
      {activeTab === 0 && (
        <>
          {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      ) : contratistasFiltrados.length === 0 && contratistas.length === 0 ? (
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
      ) : contratistasFiltrados.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(255, 255, 255, 0.6)',
            borderRadius: 4,
            p: 4,
            textAlign: 'center'
          }}
        >
          <Typography variant="h6" sx={{ color: '#64748b', mb: 2 }}>
            No se encontraron contratistas
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
            Intenta ajustar los filtros de búsqueda
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
            {contratistasFiltrados.length} Contratista{contratistasFiltrados.length !== 1 ? 's' : ''}
            {contratistasFiltrados.length !== contratistas.length && (
              <Typography component="span" variant="body2" sx={{ ml: 1, color: '#64748b' }}>
                (de {contratistas.length} total)
              </Typography>
            )}
          </Typography>
          {contratistasFiltrados.map((contratista) => (
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
                  <Typography variant="caption" color="text.secondary">
                    {contratista.telefono} • {contratista.correo_contacto}
                  </Typography>
                  {contratista.banco && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Banco: {contratista.banco}
                    </Typography>
                  )}
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
        </>
      )}

      {/* Vista Tabla */}
      {activeTab === 1 && (
        <>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: 'primary.main' }} />
            </Box>
          ) : contratistasFiltrados.length === 0 && contratistas.length === 0 ? (
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
                overflow: 'hidden'
              }}
            >
              <Box sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 1200 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'rgba(255, 255, 255, 0.6)' }}>
                      <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>
                        <Stack spacing={0.5}>
                          <TableSortLabel
                            active={orderBy === 'nombre'}
                            direction={orderBy === 'nombre' ? order : 'asc'}
                            onClick={() => handleRequestSort('nombre')}
                          >
                            Nombre
                          </TableSortLabel>
                          <TextField
                            size="small"
                            placeholder="Filtrar..."
                            value={filtroNombre}
                            onChange={(e) => setFiltroNombre(e.target.value)}
                            sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' } }}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>
                        <Stack spacing={0.5}>
                          <TableSortLabel
                            active={orderBy === 'telefono'}
                            direction={orderBy === 'telefono' ? order : 'asc'}
                            onClick={() => handleRequestSort('telefono')}
                          >
                            Teléfono
                          </TableSortLabel>
                          <TextField
                            size="small"
                            placeholder="Filtrar..."
                            value={filtroTelefono}
                            onChange={(e) => setFiltroTelefono(e.target.value)}
                            sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' } }}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 180 }}>
                        <Stack spacing={0.5}>
                          <TableSortLabel
                            active={orderBy === 'correo_contacto'}
                            direction={orderBy === 'correo_contacto' ? order : 'asc'}
                            onClick={() => handleRequestSort('correo_contacto')}
                          >
                            Correo
                          </TableSortLabel>
                          <TextField
                            size="small"
                            placeholder="Filtrar..."
                            value={filtroCorreo}
                            onChange={(e) => setFiltroCorreo(e.target.value)}
                            sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' } }}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>
                        <Stack spacing={0.5}>
                          <TableSortLabel
                            active={orderBy === 'banco'}
                            direction={orderBy === 'banco' ? order : 'asc'}
                            onClick={() => handleRequestSort('banco')}
                          >
                            Banco
                          </TableSortLabel>
                          <TextField
                            size="small"
                            placeholder="Filtrar..."
                            value={filtroBanco}
                            onChange={(e) => setFiltroBanco(e.target.value)}
                            sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' } }}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>
                        <Stack spacing={0.5}>
                          <TableSortLabel
                            active={orderBy === 'numero_cuenta_bancaria'}
                            direction={orderBy === 'numero_cuenta_bancaria' ? order : 'asc'}
                            onClick={() => handleRequestSort('numero_cuenta_bancaria')}
                          >
                            No. Cuenta
                          </TableSortLabel>
                          <TextField
                            size="small"
                            placeholder="Filtrar..."
                            value={filtroCuenta}
                            onChange={(e) => setFiltroCuenta(e.target.value)}
                            sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' } }}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>
                        <Stack spacing={0.5}>
                          <TableSortLabel
                            active={orderBy === 'localizacion'}
                            direction={orderBy === 'localizacion' ? order : 'asc'}
                            onClick={() => handleRequestSort('localizacion')}
                          >
                            Localización
                          </TableSortLabel>
                          <TextField
                            size="small"
                            placeholder="Filtrar..."
                            value={filtroLocalizacion}
                            onChange={(e) => setFiltroLocalizacion(e.target.value)}
                            sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' } }}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>
                        <Stack spacing={0.5}>
                          <TableSortLabel
                            active={orderBy === 'total_contratado'}
                            direction={orderBy === 'total_contratado' ? order : 'asc'}
                            onClick={() => handleRequestSort('total_contratado')}
                          >
                            Total Contratado
                          </TableSortLabel>
                          <TextField
                            size="small"
                            placeholder="Filtrar..."
                            value={filtroContratado}
                            onChange={(e) => setFiltroContratado(e.target.value)}
                            sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' } }}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>
                        <Stack spacing={0.5}>
                          <TableSortLabel
                            active={orderBy === 'total_pagado'}
                            direction={orderBy === 'total_pagado' ? order : 'asc'}
                            onClick={() => handleRequestSort('total_pagado')}
                          >
                            Total Pagado
                          </TableSortLabel>
                          <TextField
                            size="small"
                            placeholder="Filtrar..."
                            value={filtroPagado}
                            onChange={(e) => setFiltroPagado(e.target.value)}
                            sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' } }}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>
                        Documentación
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 120 }}>
                        Acciones
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {contratistasFiltrados.map((contratista) => {
                      const hasAllDocs = contratista.csf_url && contratista.cv_url && 
                                        contratista.acta_constitutiva_url && contratista.repse_url && 
                                        contratista.ine_url && contratista.registro_patronal_url && 
                                        contratista.comprobante_domicilio_url
                      const docsCount = [
                        contratista.csf_url,
                        contratista.cv_url,
                        contratista.acta_constitutiva_url,
                        contratista.repse_url,
                        contratista.ine_url,
                        contratista.registro_patronal_url,
                        contratista.comprobante_domicilio_url
                      ].filter(Boolean).length
                      
                      return (
                        <TableRow
                          key={contratista.id}
                          sx={{
                            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.8)' },
                            bgcolor: 'rgba(255, 255, 255, 0.4)'
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {contratista.nombre}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {contratista.telefono || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {contratista.correo_contacto || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {contratista.banco || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {contratista.numero_cuenta_bancaria || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {contratista.localizacion || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} sx={{ color: '#059669' }}>
                              ${(totalesPorContratista[contratista.id]?.contratado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} sx={{ color: '#2563eb' }}>
                              ${(totalesPorContratista[contratista.id]?.pagado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                              <Chip
                                label={`${docsCount}/7`}
                                size="small"
                                color={hasAllDocs ? 'success' : docsCount > 0 ? 'warning' : 'default'}
                                sx={{ fontSize: '0.75rem' }}
                              />
                              {contratista.csf_url && (
                                <Tooltip title="Ver CSF">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenDocument(contratista.csf_url)}
                                    sx={{ p: 0.5 }}
                                  >
                                    <Eye size={14} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              <IconButton
                                size="small"
                                onClick={() => handleEdit(contratista)}
                                sx={{ color: '#334155' }}
                              >
                                <Edit size={16} />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(contratista.id, contratista.nombre)}
                                sx={{ color: '#dc2626' }}
                              >
                                <Trash2 size={16} />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Box>
            </Paper>
          )}
        </>      )}

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
