import React, { useState, useRef, useEffect } from 'react'
import { 
  Box, 
  Typography, 
  Container, 
  Paper, 
  Button, 
  Tabs, 
  Tab,
  Stack,
  Alert,
  CircularProgress
} from '@mui/material'
import { Calculator, Download, Upload, FileSpreadsheet } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/core/supabaseClient'
import * as XLSX from 'xlsx'
import { catalogoObra, getCategorias, getPartidasByCategoria, getSubpartidasByPartida } from '@/config/catalogo-obra'
import { useNavigate } from 'react-router-dom'

interface TabPanelProps {
  children?: React.ReactNode
  value: number
  index: number
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`presupuesto-tabpanel-${index}`}
      aria-labelledby={`presupuesto-tab-${index}`}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

export default function PresupuestoPage() {
  const { perfil, user } = useAuth()
  const navigate = useNavigate()
  const [tabValue, setTabValue] = useState(0)
  const [loading, setLoading] = useState(false)
  const [presupuestoData, setPresupuestoData] = useState<any[]>([])
  const [contratos, setContratos] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Redirigir contratistas a inicio
  useEffect(() => {
    const esContratista = perfil?.tipo === 'CONTRATISTA' || user?.user_metadata?.tipo === 'CONTRATISTA'
    if (esContratista) {
      navigate('/inicio', { replace: true })
    }
  }, [perfil, user, navigate])

  // Permisos
  const puedeEditar = perfil?.roles?.some(r => 
    r === 'Gerencia' || r === 'Gerente Plataforma'
  )

  // Cargar presupuesto y contratos al montar el componente
  useEffect(() => {
    cargarPresupuesto()
    cargarContratos()
  }, [])
  
  const cargarContratos = async () => {
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('*')
        .eq('active', true)
      
      if (error) throw error
      
      if (data) {
        setContratos(data)
        console.log('✅ Contratos cargados:', data.length)
      }
    } catch (error) {
      console.error('Error al cargar contratos:', error)
    }
  }

  const cargarPresupuesto = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('presupuestos')
        .select('*')
        .eq('active', true)
        .order('categoria', { ascending: true })
      
      if (error) throw error
      
      if (data && data.length > 0) {
        setPresupuestoData(data)
        console.log('✅ Presupuesto cargado desde BD:', data.length, 'conceptos')
      }
    } catch (error) {
      console.error('Error al cargar presupuesto:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // Calcular montos contratados por cuenta
  useEffect(() => {
    if (presupuestoData.length > 0 && contratos.length > 0) {
      calcularMontosContratados()
    }
  }, [presupuestoData.length, contratos.length])
  
  const calcularMontosContratados = () => {
    // Agrupar contratos por cuenta (categoria-partida-subpartida)
    const montosPorCuenta = new Map<string, number>()
    
    contratos.forEach(contrato => {
      const key = `${contrato.categoria}-${contrato.partida}-${contrato.subpartida}`.toLowerCase()
      const montoActual = montosPorCuenta.get(key) || 0
      montosPorCuenta.set(key, montoActual + (contrato.monto_contrato || 0))
    })
    
    // Actualizar presupuestoData con montos contratados
    setPresupuestoData(prevData => 
      prevData.map(concepto => {
        const key = `${concepto.categoria}-${concepto.partida}-${concepto.subpartida}`.toLowerCase()
        const montoContratado = montosPorCuenta.get(key) || 0
        
        return {
          ...concepto,
          presupuesto_contratado: montoContratado
        }
      })
    )
    
    console.log('✅ Montos contratados calculados:', montosPorCuenta.size, 'cuentas')
  }

  const guardarPresupuesto = async () => {
    if (!perfil?.id) {
      alert('⚠️ Usuario no autenticado')
      return
    }

    if (presupuestoData.length === 0) {
      alert('⚠️ No hay datos para guardar')
      return
    }

    try {
      setLoading(true)
      
      // Eliminar presupuestos existentes (soft delete)
      await supabase
        .from('presupuestos')
        .update({ active: false })
        .eq('active', true)
      
      // Insertar nuevos registros
      const registros = presupuestoData.map(concepto => ({
        categoria: concepto.categoria,
        partida: concepto.partida,
        subpartida: concepto.subpartida,
        ubicacion: concepto.ubicacion || '',
        concepto_id: concepto.concepto_id || concepto.id || '',
        unidad: concepto.unidad || '',
        volumetria_arranque: concepto.volumetria_arranque || 0,
        pu_parametrico: concepto.pu_parametrico || 0,
        presupuesto_base: concepto.presupuesto_base || 0,
        presupuesto_concursado: concepto.presupuesto_concursado || 0,
        presupuesto_contratado: concepto.presupuesto_contratado || 0,
        presupuesto_ejercido: concepto.presupuesto_ejercido || 0,
        proyecto_id: null, // No se usa proyecto
        created_by: perfil.id,
        updated_by: perfil.id,
        active: true
      }))
      
      const { error } = await supabase
        .from('presupuestos')
        .insert(registros)
      
      if (error) throw error
      
      alert(`✅ Presupuesto guardado correctamente\n\n${registros.length} conceptos guardados`)
      console.log('✅ Presupuesto guardado en BD:', registros.length, 'conceptos')
      
      // Recargar para obtener IDs generados
      await cargarPresupuesto()
    } catch (error: any) {
      console.error('Error al guardar presupuesto:', error)
      alert(`❌ Error al guardar: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDescargarPlantilla = () => {
    // Obtener listas únicas del catálogo
    const categorias = getCategorias()
    const todasLasPartidas = Array.from(new Set(catalogoObra.map(item => item.partida)))
    const todasLasSubpartidas = Array.from(new Set(catalogoObra.map(item => item.subpartida)))
    
    // Si hay presupuesto cargado, usar esos datos; si no, crear plantilla vacía
    let plantilla
    if (presupuestoData.length > 0) {
      // Usar datos existentes
      plantilla = presupuestoData.map(concepto => ({
        'CATEGORIA': concepto.categoria,
        'PARTIDA': concepto.partida,
        'SUBPARTIDA': concepto.subpartida,
        'UBICACION': concepto.ubicacion,
        'ID': concepto.concepto_id,
        'UNIDAD': concepto.unidad,
        'VOLUMETRIA ARRANQUE': concepto.volumetria_arranque,
        'P.U PARAMÉTRICO': concepto.pu_parametrico,
        'PRESUPUESTO BASE': concepto.presupuesto_base
      }))
    } else {
      // Crear plantilla con ejemplo
      const ejemploCatalogo = catalogoObra[0]
      plantilla = [
        {
          'CATEGORIA': ejemploCatalogo.categoria,
          'PARTIDA': ejemploCatalogo.partida,
          'SUBPARTIDA': ejemploCatalogo.subpartida,
          'UBICACION': 'PLANTA BAJA',
          'ID': 'PRES-001',
          'UNIDAD': 'M2',
          'VOLUMETRIA ARRANQUE': 150.5,
          'P.U PARAMÉTRICO': 85.50,
          'PRESUPUESTO BASE': 12867.75
        },
        // Filas vacías para llenar
        ...Array(20).fill(null).map(() => ({
          'CATEGORIA': '',
          'PARTIDA': '',
          'SUBPARTIDA': '',
          'UBICACION': '',
          'ID': '',
          'UNIDAD': '',
          'VOLUMETRIA ARRANQUE': 0,
          'P.U PARAMÉTRICO': 0,
          'PRESUPUESTO BASE': 0
        }))
      ]
    }

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(plantilla)
    
    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 25 }, // CATEGORIA
      { wch: 30 }, // PARTIDA
      { wch: 30 }, // SUBPARTIDA
      { wch: 15 }, // UBICACION
      { wch: 12 }, // ID
      { wch: 10 }, // UNIDAD
      { wch: 18 }, // VOLUMETRIA ARRANQUE
      { wch: 18 }, // P.U PARAMÉTRICO
      { wch: 18 }, // PRESUPUESTO BASE
    ]
    
    // Crear hoja de instrucciones
    const instrucciones = [
      { 'INSTRUCCIONES': '⚠️ IMPORTANTE: Solo se aceptan categorías y partidas del catálogo de obra' },
      { 'INSTRUCCIONES': '' },
      { 'INSTRUCCIONES': '📋 Revisa las hojas CATEGORIAS y PARTIDAS para ver los valores permitidos' },
      { 'INSTRUCCIONES': '' },
      { 'INSTRUCCIONES': '✅ Debes usar combinaciones válidas de Categoría-Partida' },
      { 'INSTRUCCIONES': '✅ La Subpartida es libre, puedes escribir cualquier valor' },
      { 'INSTRUCCIONES': '' },
      { 'INSTRUCCIONES': '🔢 VOLUMETRIA ARRANQUE: Cantidad o volumen del concepto' },
      { 'INSTRUCCIONES': '💵 P.U PARAMÉTRICO: Precio unitario paramétrico' },
      { 'INSTRUCCIONES': '💰 PRESUPUESTO BASE: Volumetría x P.U. Paramétrico' },
    ]
    
    const wsInstrucciones = XLSX.utils.json_to_sheet(instrucciones)
    wsInstrucciones['!cols'] = [{ wch: 80 }]
    
    // Crear hoja con catálogo completo
    const catalogoCompleto = catalogoObra.map(item => ({
      'CATEGORIA': item.categoria,
      'PARTIDA': item.partida,
      'SUBPARTIDA': item.subpartida
    }))
    const wsCatalogoCompleto = XLSX.utils.json_to_sheet(catalogoCompleto)
    wsCatalogoCompleto['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 30 }]
    
    // Crear hoja de datos para validación (listas desplegables)
    const validacionData = {
      'CATEGORIAS': categorias.map(c => ({ CATEGORIA: c })),
      'PARTIDAS': todasLasPartidas.map(p => ({ PARTIDA: p })),
      'SUBPARTIDAS': todasLasSubpartidas.map(s => ({ SUBPARTIDA: s }))
    }
    
    // Agregar hojas de validación
    const wsCategoria = XLSX.utils.json_to_sheet(validacionData.CATEGORIAS)
    const wsPartida = XLSX.utils.json_to_sheet(validacionData.PARTIDAS)
    const wsSubpartida = XLSX.utils.json_to_sheet(validacionData.SUBPARTIDAS)
    
    wsCategoria['!cols'] = [{ wch: 25 }]
    wsPartida['!cols'] = [{ wch: 30 }]
    wsSubpartida['!cols'] = [{ wch: 30 }]
    
    // Agregar hojas al libro
    XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'INSTRUCCIONES')
    XLSX.utils.book_append_sheet(wb, ws, 'Presupuesto Base')
    XLSX.utils.book_append_sheet(wb, wsCatalogoCompleto, 'CATALOGO-COMPLETO')
    XLSX.utils.book_append_sheet(wb, wsCategoria, 'CATEGORIAS')
    XLSX.utils.book_append_sheet(wb, wsPartida, 'PARTIDAS')
    XLSX.utils.book_append_sheet(wb, wsSubpartida, 'SUBPARTIDAS')
    
    XLSX.writeFile(wb, `Plantilla_Presupuesto_Base_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleSubirPresupuesto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // Buscar la hoja "Presupuesto Base" o usar la primera que tenga datos
        let sheetName = workbook.SheetNames.find(name => name.includes('Presupuesto'))
        if (!sheetName) {
          sheetName = workbook.SheetNames[0]
        }
        
        console.log('📄 Hojas disponibles:', workbook.SheetNames)
        console.log('📄 Usando hoja:', sheetName)
        
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        
        // Debug: ver qué columnas tiene el archivo
        console.log('📊 Primera fila del Excel:', jsonData[0])
        console.log('📊 Columnas detectadas:', Object.keys(jsonData[0] || {}))
        
        // Transformar datos sin validaciones del catálogo
        const presupuestoImportado = jsonData.map((row: any, index) => {
          const categoria = (row['CATEGORIA'] || '').toString().trim()
          const partida = (row['PARTIDA'] || '').toString().trim()
          const subpartida = (row['SUBPARTIDA'] || '').toString().trim()
          
          // Debug para la primera fila
          if (index === 0) {
            console.log('🔍 Fila 1 - CATEGORIA:', `"${categoria}"`, 'vacío?', !categoria)
            console.log('🔍 Fila 1 - PARTIDA:', `"${partida}"`, 'vacío?', !partida)
          }
          
          // Validar que no esté vacío
          if (!categoria || !partida) {
            return null // Ignorar filas vacías
          }
          
          return {
            categoria,
            partida,
            subpartida,
            ubicacion: row['UBICACION'] || '',
            concepto_id: row['ID'] || '',
            unidad: row['UNIDAD'] || '',
            volumetria_arranque: parseFloat(row['VOLUMETRIA ARRANQUE']) || 0,
            pu_parametrico: parseFloat(row['P.U PARAMÉTRICO']) || 0,
            presupuesto_base: parseFloat(row['PRESUPUESTO BASE']) || 0,
            presupuesto_concursado: 0,
            presupuesto_contratado: 0,
            presupuesto_ejercido: 0
          }
        }).filter(p => p !== null) // Filtrar filas vacías
        
        if (presupuestoImportado.length === 0) {
          alert('⚠️ No se encontraron datos válidos en el archivo')
          setLoading(false)
          return
        }
        
        setPresupuestoData(presupuestoImportado)
        alert(`✅ Presupuesto cargado correctamente\n\n${presupuestoImportado.length} conceptos importados\n\n💾 Haz clic en "Guardar en BD" para guardar en la base de datos`)
        console.log('✅ Presupuesto cargado:', presupuestoImportado.length, 'conceptos')
      } catch (error) {
        console.error('Error al procesar archivo:', error)
        alert('Error al procesar el archivo. Verifica que sea un Excel válido.')
      } finally {
        setLoading(false)
        // Limpiar el input para permitir recargar el mismo archivo
        if (event.target) {
          event.target.value = ''
        }
      }
    }
    
    reader.readAsArrayBuffer(file)
  }

  const calcularResumen = () => {
    const resumenMap = new Map<string, any>()
    
    presupuestoData.forEach(concepto => {
      const key = `${concepto.categoria}-${concepto.partida}-${concepto.subpartida}`
      
      if (!resumenMap.has(key)) {
        resumenMap.set(key, {
          categoria: concepto.categoria,
          partida: concepto.partida,
          subpartida: concepto.subpartida,
          presupuesto_base: 0,
          presupuesto_concursado: 0,
          presupuesto_contratado: 0,
          presupuesto_ejercido: 0
        })
      }
      
      const item = resumenMap.get(key)
      item.presupuesto_base += concepto.presupuesto_base
      item.presupuesto_concursado += concepto.presupuesto_concursado || 0
      item.presupuesto_contratado += concepto.presupuesto_contratado || 0
      item.presupuesto_ejercido += concepto.presupuesto_ejercido || 0
    })
    
    return Array.from(resumenMap.values()).map(item => ({
      ...item,
      presupuesto_real: item.presupuesto_contratado > 0 ? item.presupuesto_contratado : item.presupuesto_base,
      faltante_por_pagar: (item.presupuesto_contratado > 0 ? item.presupuesto_contratado : item.presupuesto_base) - item.presupuesto_ejercido
    }))
  }

  const resumen = calcularResumen()

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
            <Calculator className="w-8 h-8" style={{ color: '#334155' }} />
            Presupuesto de Obra
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 1 }}>
            Gestión y control del presupuesto base y concursado
          </Typography>
        </Box>

        {/* Botones de acción */}
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Download className="w-4 h-4" />}
            onClick={handleDescargarPlantilla}
            sx={{ 
              textTransform: 'none',
              borderColor: '#334155',
              color: '#334155',
              '&:hover': { borderColor: '#1e293b', bgcolor: 'rgba(51, 65, 85, 0.05)' }
            }}
          >
            Descargar Plantilla
          </Button>
          
          {puedeEditar && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleSubirPresupuesto}
              />
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Upload className="w-4 h-4" />}
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                sx={{ 
                  textTransform: 'none',
                  bgcolor: '#334155',
                  '&:hover': { bgcolor: '#1e293b' }
                }}
              >
                {loading ? 'Subiendo...' : 'Subir Presupuesto'}
              </Button>
              
              {presupuestoData.length > 0 && (
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <FileSpreadsheet className="w-4 h-4" />}
                  onClick={guardarPresupuesto}
                  disabled={loading}
                  sx={{ 
                    textTransform: 'none',
                    bgcolor: '#16a34a',
                    '&:hover': { bgcolor: '#15803d' }
                  }}
                >
                  {loading ? 'Guardando...' : 'Guardar en BD'}
                </Button>
              )}
            </>
          )}
        </Stack>
      </Box>

      {!puedeEditar && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Solo usuarios con rol de Gerencia o Gerente Plataforma pueden editar presupuestos
        </Alert>
      )}

      <Alert severity="info" icon={<FileSpreadsheet className="w-5 h-5" />} sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          📋 Formato del Presupuesto
        </Typography>
        <Typography variant="body2">
          Puedes usar <strong>cualquier valor</strong> para categorías, partidas y subpartidas. 
          Solo asegúrate de llenar las columnas obligatorias: CATEGORIA, PARTIDA y los valores numéricos.
        </Typography>
      </Alert>

      {/* Tabs */}
      <Paper 
        elevation={0} 
        sx={{ 
          bgcolor: 'rgba(255, 255, 255, 0.6)',
          border: '1px solid rgba(51, 65, 85, 0.15)',
          borderRadius: 2
        }}
      >
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{
            borderBottom: '1px solid rgba(51, 65, 85, 0.15)',
            px: 2,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.95rem'
            }
          }}
        >
          <Tab label="Resumen" />
          <Tab label="Resumen por Cuenta" />
          <Tab label="Presupuesto Base" />
        </Tabs>

        {/* Resumen */}
        <TabPanel value={tabValue} index={0}>
          {presupuestoData.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <FileSpreadsheet className="w-16 h-16 mx-auto mb-4" style={{ color: '#94a3b8' }} />
              <Typography variant="h6" sx={{ color: '#64748b', mb: 2 }}>
                No hay presupuesto cargado
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Descarga la plantilla, llénala y súbela para comenzar
              </Typography>
            </Box>
          ) : (
            <Box sx={{ p: 3 }}>
              {/* Cards de resumen */}
              <Stack direction="row" spacing={3} sx={{ mb: 4, flexWrap: 'wrap' }}>
                <Paper elevation={2} sx={{ p: 3, flex: 1, minWidth: 200, borderLeft: '4px solid #3b82f6' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
                    PRESUPUESTO BASE
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="#3b82f6">
                    ${resumen.reduce((sum, item) => sum + item.presupuesto_base, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </Typography>
                </Paper>
                
                <Paper elevation={2} sx={{ p: 3, flex: 1, minWidth: 200, borderLeft: '4px solid #8b5cf6' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
                    PRESUPUESTO CONCURSADO
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="#8b5cf6">
                    ${resumen.reduce((sum, item) => sum + item.presupuesto_concursado, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </Typography>
                </Paper>
                
                <Paper elevation={2} sx={{ p: 3, flex: 1, minWidth: 200, borderLeft: '4px solid #22c55e' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
                    PRESUPUESTO CONTRATADO
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="#22c55e">
                    ${resumen.reduce((sum, item) => sum + item.presupuesto_contratado, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {contratos.length} contratos activos
                  </Typography>
                </Paper>
                
                <Paper elevation={2} sx={{ p: 3, flex: 1, minWidth: 200, borderLeft: '4px solid #0ea5e9' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
                    PRESUPUESTO REAL
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="#0ea5e9">
                    ${resumen.reduce((sum, item) => sum + item.presupuesto_real, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </Typography>
                </Paper>
              </Stack>
              
              <Stack direction="row" spacing={3} sx={{ mb: 4, flexWrap: 'wrap' }}>
                <Paper elevation={2} sx={{ p: 3, flex: 1, minWidth: 200, borderLeft: '4px solid #f59e0b' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
                    PRESUPUESTO EJERCIDO
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="#f59e0b">
                    ${resumen.reduce((sum, item) => sum + item.presupuesto_ejercido, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </Typography>
                </Paper>
                
                <Paper elevation={2} sx={{ p: 3, flex: 1, minWidth: 200, borderLeft: '4px solid #dc2626' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
                    FALTANTE POR PAGAR
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="#dc2626">
                    ${resumen.reduce((sum, item) => sum + item.faltante_por_pagar, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </Typography>
                </Paper>
                
                <Paper elevation={2} sx={{ p: 3, flex: 1, minWidth: 200, borderLeft: '4px solid #64748b' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
                    CUENTAS PRESUPUESTALES
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="#64748b">
                    {resumen.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {presupuestoData.length} conceptos
                  </Typography>
                </Paper>
              </Stack>
              
              {/* Gráfica simple de barras */}
              <Paper elevation={1} sx={{ p: 3, bgcolor: '#f8fafc' }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  Comparativo de Presupuestos
                </Typography>
                <Stack spacing={2}>
                  {[
                    { label: 'Base', value: resumen.reduce((sum, item) => sum + item.presupuesto_base, 0), color: '#3b82f6' },
                    { label: 'Concursado', value: resumen.reduce((sum, item) => sum + item.presupuesto_concursado, 0), color: '#8b5cf6' },
                    { label: 'Contratado', value: resumen.reduce((sum, item) => sum + item.presupuesto_contratado, 0), color: '#22c55e' },
                    { label: 'Real', value: resumen.reduce((sum, item) => sum + item.presupuesto_real, 0), color: '#0ea5e9' },
                    { label: 'Ejercido', value: resumen.reduce((sum, item) => sum + item.presupuesto_ejercido, 0), color: '#f59e0b' },
                  ].map(item => {
                    const maxValue = Math.max(
                      resumen.reduce((sum, i) => sum + i.presupuesto_base, 0),
                      resumen.reduce((sum, i) => sum + i.presupuesto_real, 0)
                    )
                    const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0
                    
                    return (
                      <Box key={item.label}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={600}>{item.label}</Typography>
                          <Typography variant="body2" fontWeight={600} color={item.color}>
                            ${item.value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </Typography>
                        </Stack>
                        <Box sx={{ width: '100%', height: 24, bgcolor: 'white', borderRadius: 1, overflow: 'hidden' }}>
                          <Box sx={{ width: `${percentage}%`, height: '100%', bgcolor: item.color, transition: 'width 0.3s' }} />
                        </Box>
                      </Box>
                    )
                  })}
                </Stack>
              </Paper>
            </Box>
          )}
        </TabPanel>
        
        {/* Resumen por Cuenta */}
        <TabPanel value={tabValue} index={1}>
          {presupuestoData.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <FileSpreadsheet className="w-16 h-16 mx-auto mb-4" style={{ color: '#94a3b8' }} />
              <Typography variant="h6" sx={{ color: '#64748b', mb: 2 }}>
                No hay presupuesto cargado
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Descarga la plantilla, llénala y súbela para comenzar
              </Typography>
            </Box>
          ) : (
            <Box sx={{ p: 3 }}>
              {/* Totales superiores */}
              <Stack direction="row" spacing={2} sx={{ mb: 4, flexWrap: 'wrap' }}>
                <Paper elevation={1} sx={{ p: 2, flex: 1, minWidth: 150, bgcolor: '#eff6ff', borderLeft: '3px solid #3b82f6' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                    BASE
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="#3b82f6">
                    ${resumen.reduce((sum, item) => sum + item.presupuesto_base, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </Typography>
                </Paper>
                
                <Paper elevation={1} sx={{ p: 2, flex: 1, minWidth: 150, bgcolor: '#f5f3ff', borderLeft: '3px solid #8b5cf6' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                    CONCURSADO
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="#8b5cf6">
                    ${resumen.reduce((sum, item) => sum + item.presupuesto_concursado, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </Typography>
                </Paper>
                
                <Paper elevation={1} sx={{ p: 2, flex: 1, minWidth: 150, bgcolor: '#f0fdf4', borderLeft: '3px solid #22c55e' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                    CONTRATADO
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="#22c55e">
                    ${resumen.reduce((sum, item) => sum + item.presupuesto_contratado, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </Typography>
                </Paper>
                
                <Paper elevation={1} sx={{ p: 2, flex: 1, minWidth: 150, bgcolor: '#ecfeff', borderLeft: '3px solid #0ea5e9' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                    REAL
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="#0ea5e9">
                    ${resumen.reduce((sum, item) => sum + item.presupuesto_real, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </Typography>
                </Paper>
                
                <Paper elevation={1} sx={{ p: 2, flex: 1, minWidth: 150, bgcolor: '#fffbeb', borderLeft: '3px solid #f59e0b' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                    EJERCIDO
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="#f59e0b">
                    ${resumen.reduce((sum, item) => sum + item.presupuesto_ejercido, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </Typography>
                </Paper>
                
                <Paper elevation={1} sx={{ p: 2, flex: 1, minWidth: 150, bgcolor: '#fef2f2', borderLeft: '3px solid #dc2626' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                    FALTANTE
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="#dc2626">
                    ${resumen.reduce((sum, item) => sum + item.faltante_por_pagar, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </Typography>
                </Paper>
              </Stack>
              
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Resumen por Cuenta
              </Typography>
              
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Categoría</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Partida</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Subpartida</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Base</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Concursado</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Contratado</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Real</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Ejercido</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Faltante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px', color: '#334155' }}>{item.categoria}</td>
                        <td style={{ padding: '12px', color: '#334155' }}>{item.partida}</td>
                        <td style={{ padding: '12px', color: '#334155' }}>{item.subpartida}</td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#334155' }}>
                          ${item.presupuesto_base.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#334155' }}>
                          ${item.presupuesto_concursado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#334155' }}>
                          ${item.presupuesto_contratado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#0ea5e9' }}>
                          ${item.presupuesto_real.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#334155' }}>
                          ${item.presupuesto_ejercido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ 
                          padding: '12px', 
                          textAlign: 'right', 
                          fontWeight: 600,
                          color: item.faltante_por_pagar > 0 ? '#dc2626' : '#16a34a'
                        }}>
                          ${item.faltante_por_pagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #e2e8f0', fontWeight: 600 }}>
                      <td colSpan={3} style={{ padding: '12px', color: '#1e293b' }}>TOTAL</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#1e293b' }}>
                        ${resumen.reduce((sum, item) => sum + item.presupuesto_base, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#1e293b' }}>
                        ${resumen.reduce((sum, item) => sum + item.presupuesto_concursado, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#1e293b' }}>
                        ${resumen.reduce((sum, item) => sum + item.presupuesto_contratado, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#0ea5e9' }}>
                        ${resumen.reduce((sum, item) => sum + item.presupuesto_real, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#1e293b' }}>
                        ${resumen.reduce((sum, item) => sum + item.presupuesto_ejercido, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#dc2626' }}>
                        ${resumen.reduce((sum, item) => sum + item.faltante_por_pagar, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </Box>
            </Box>
          )}
        </TabPanel>

        {/* Presupuesto Base */}
        <TabPanel value={tabValue} index={2}>
          {presupuestoData.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <FileSpreadsheet className="w-16 h-16 mx-auto mb-4" style={{ color: '#94a3b8' }} />
              <Typography variant="h6" sx={{ color: '#64748b', mb: 2 }}>
                No hay presupuesto base cargado
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Sube el presupuesto base con la volumetría de arranque
              </Typography>
            </Box>
          ) : (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Presupuesto Base - Volumetría de Arranque
              </Typography>
              
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Categoría</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Partida</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Subpartida</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Ubicación</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>ID</th>
                      <th style={{ padding: '10px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Unidad</th>
                      <th style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Vol. Arranque</th>
                      <th style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>P.U. Paramétrico</th>
                      <th style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Presupuesto Base</th>
                      {puedeEditar && (
                        <th style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Concursado</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {presupuestoData.map((concepto, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px', color: '#334155' }}>{concepto.categoria}</td>
                        <td style={{ padding: '10px', color: '#334155' }}>{concepto.partida}</td>
                        <td style={{ padding: '10px', color: '#334155' }}>{concepto.subpartida}</td>
                        <td style={{ padding: '10px', color: '#334155' }}>{concepto.ubicacion}</td>
                        <td style={{ padding: '10px', color: '#334155', fontFamily: 'monospace' }}>{concepto.concepto_id}</td>
                        <td style={{ padding: '10px', textAlign: 'center', color: '#334155' }}>{concepto.unidad}</td>
                        <td style={{ padding: '10px', textAlign: 'right', color: '#334155' }}>
                          {concepto.volumetria_arranque.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', color: '#334155' }}>
                          ${concepto.pu_parametrico.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: '#0ea5e9' }}>
                          ${concepto.presupuesto_base.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        {puedeEditar && (
                          <td style={{ padding: '10px' }}>
                            <input
                              type="number"
                              value={concepto.presupuesto_concursado || 0}
                              onChange={(e) => {
                                const newData = [...presupuestoData]
                                newData[idx].presupuesto_concursado = parseFloat(e.target.value) || 0
                                setPresupuestoData(newData)
                              }}
                              style={{
                                width: '120px',
                                padding: '6px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                textAlign: 'right',
                                fontFamily: 'inherit',
                                fontSize: '0.875rem'
                              }}
                            />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #e2e8f0', fontWeight: 600 }}>
                      <td colSpan={8} style={{ padding: '10px', color: '#1e293b' }}>TOTAL</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#0ea5e9' }}>
                        ${presupuestoData.reduce((sum, item) => sum + item.presupuesto_base, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      {puedeEditar && (
                        <td style={{ padding: '10px', textAlign: 'right', color: '#1e293b' }}>
                          ${presupuestoData.reduce((sum, item) => sum + (item.presupuesto_concursado || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </Box>
            </Box>
          )}
        </TabPanel>
      </Paper>
    </Container>
  )
}
