import React, { useState, useEffect } from 'react'
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Tabs,
  Tab,
  Typography,
  Paper,
  CircularProgress
} from '@mui/material'
import { X, FileText, Calendar, Plus, Minus, Settings, CheckCircle, AlertCircle, Shield } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import ConceptosContratoTable from './ConceptosContratoTable'
import CambiosContratoTabs from './CambiosContratoTabs'
import { DeduccionesExtra } from './DeduccionesExtra'
import { RetencionesContrato } from './RetencionesContrato'
import type { ConceptoContrato } from '@/types/concepto-contrato'
import type { Contrato } from '@/types/contrato'
import { db } from '@/db/database'
import { v4 as uuidv4 } from 'uuid'
import { syncService } from '@/sync/syncService'
import { Button, Alert, Stack, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, DialogActions } from '@mui/material'
import { CheckCircle as CheckIcon, XCircle as XIcon, Upload as UploadIcon, Eye as EyeIcon } from 'lucide-react'
import type { CambioContrato, DetalleExtra } from '@/types/cambio-contrato'

// Componente para mostrar y gestionar cambios extraordinarios
interface CambiosExtrasTableProps {
  contratoId: string
  puedeSubir: boolean
  puedeAutorizar: boolean
  onCambiosActualizados: () => void
}

const CambiosExtrasTable: React.FC<CambiosExtrasTableProps> = ({
  contratoId,
  puedeSubir,
  puedeAutorizar,
  onCambiosActualizados
}) => {
  const [cambiosExtras, setCambiosExtras] = useState<CambioContrato[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [detalleModalOpen, setDetalleModalOpen] = useState(false)
  const [cambioSeleccionado, setCambioSeleccionado] = useState<CambioContrato | null>(null)
  const [detallesExtra, setDetallesExtra] = useState<DetalleExtra[]>([])
  const { user } = useAuth()

  const loadCambiosExtras = async () => {
    try {
      setLoading(true)
      const cambios = await db.cambios_contrato
        .where('contrato_id')
        .equals(contratoId)
        .and(c => c.tipo_cambio === 'EXTRA' && c.active === true)
        .toArray()
      
      setCambiosExtras(cambios.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ))
    } catch (error) {
      console.error('Error cargando cambios extras:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCambiosExtras()
  }, [contratoId])

  const handleAprobar = async (cambioId: string) => {
    if (!puedeAutorizar) {
      alert('No tienes permisos para aprobar cambios')
      return
    }

    const confirmar = window.confirm('¿Aprobar este cambio extraordinario?\n\nLos conceptos serán agregados al catálogo.')
    if (!confirmar) return

    try {
      await db.cambios_contrato.update(cambioId, {
        estatus: 'APROBADO',
        fecha_aprobacion: new Date().toISOString(),
        aprobado_por: user?.id,
        updated_at: new Date().toISOString(),
        _dirty: true
      })

      await loadCambiosExtras()
      onCambiosActualizados()
      alert('✅ Cambio aprobado exitosamente')
    } catch (error) {
      console.error('Error aprobando cambio:', error)
      alert('❌ Error al aprobar el cambio')
    }
  }

  const handleRechazar = async (cambioId: string) => {
    if (!puedeAutorizar) {
      alert('No tienes permisos para rechazar cambios')
      return
    }

    const motivo = window.prompt('Ingrese el motivo del rechazo:')
    if (!motivo) return

    try {
      await db.cambios_contrato.update(cambioId, {
        estatus: 'RECHAZADO',
        observaciones: motivo,
        revisado_por: user?.id,
        updated_at: new Date().toISOString(),
        _dirty: true
      })

      await loadCambiosExtras()
      onCambiosActualizados()
      alert('✅ Cambio rechazado')
    } catch (error) {
      console.error('Error rechazando cambio:', error)
      alert('❌ Error al rechazar el cambio')
    }
  }

  const handleAplicar = async (cambioId: string) => {
    if (!puedeAutorizar) {
      alert('No tienes permisos para aplicar cambios')
      return
    }

    const confirmar = window.confirm('¿Aplicar este cambio al contrato?\n\nEsta acción modificará el catálogo.')
    if (!confirmar) return

    try {
      await db.cambios_contrato.update(cambioId, {
        estatus: 'APLICADO',
        fecha_aplicacion: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _dirty: true
      })

      await loadCambiosExtras()
      onCambiosActualizados()
      alert('✅ Cambio aplicado al contrato')
    } catch (error) {
      console.error('Error aplicando cambio:', error)
      alert('❌ Error al aplicar el cambio')
    }
  }

  const handleVerDetalles = async (cambio: CambioContrato) => {
    try {
      const detalles = await db.detalles_extra
        .where('cambio_contrato_id')
        .equals(cambio.id)
        .and(d => d.active !== false)
        .toArray()
      
      setDetallesExtra(detalles)
      setCambioSeleccionado(cambio)
      setDetalleModalOpen(true)
    } catch (error) {
      console.error('Error cargando detalles:', error)
      alert('Error al cargar los detalles del cambio')
    }
  }

  const handleSubirPlantilla = async (file: File) => {
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const data = e.target?.result
        const workbook = await import('xlsx').then(XLSX => XLSX.read(data, { type: 'binary' }))
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = await import('xlsx').then(XLSX => XLSX.utils.sheet_to_json(firstSheet))

        // Crear el cambio de contrato
        const nuevoFolio = await generarFolio('EXTRA')
        const cambioId = uuidv4()
        
        let montoTotal = 0
        const detallesExtras: any[] = []

        jsonData.forEach((row: any, index: number) => {
          const cantidad = parseFloat(row.CANTIDAD || row.cantidad || 0)
          const pu = parseFloat(row.PU || row['P.U.'] || row.precio_unitario || 0)
          const importe = cantidad * pu
          montoTotal += importe

          detallesExtras.push({
            id: uuidv4(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            cambio_contrato_id: cambioId,
            concepto_clave: row.CLAVE || row.clave || `EXT-${index + 1}`,
            concepto_descripcion: row.CONCEPTO || row.concepto || row.descripcion || '',
            concepto_unidad: row.UNIDAD || row.unidad || 'PZA',
            cantidad: cantidad,
            precio_unitario: pu,
            importe: importe,
            active: true,
            _dirty: true
          })
        })

        // Obtener monto actual del contrato
        const contrato = await db.contratos.get(contratoId)
        const montoAnterior = contrato?.monto_contrato || 0

        const nuevoCambio: CambioContrato = {
          id: cambioId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          contrato_id: contratoId,
          numero_cambio: nuevoFolio,
          tipo_cambio: 'EXTRA',
          descripcion: `Conceptos extraordinarios - ${file.name}`,
          monto_cambio: montoTotal,
          monto_contrato_anterior: montoAnterior,
          monto_contrato_nuevo: montoAnterior + montoTotal,
          fecha_cambio: new Date().toISOString(),
          estatus: 'BORRADOR',
          solicitado_por: user?.id,
          active: true,
          _dirty: true
        }

        await db.cambios_contrato.add(nuevoCambio)
        await db.detalles_extra.bulkAdd(detallesExtras)

        // Sincronizar con Supabase
        await syncService.forcePush()

        await loadCambiosExtras()
        setUploadModalOpen(false)
        alert(`✅ Plantilla cargada exitosamente\n\n${detallesExtras.length} conceptos agregados\nMonto total: $${montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`)
      }
      reader.readAsBinaryString(file)
    } catch (error) {
      console.error('Error subiendo plantilla:', error)
      alert('❌ Error al procesar la plantilla')
    }
  }

  const generarFolio = async (tipo: string): Promise<string> => {
    const cambios = await db.cambios_contrato
      .where('contrato_id')
      .equals(contratoId)
      .and(c => c.tipo_cambio === tipo)
      .toArray()
    
    const numero = cambios.length + 1
    const prefijo = tipo === 'EXTRA' ? 'EXT' : tipo === 'ADITIVA' ? 'ADT' : tipo === 'DEDUCTIVA' ? 'DED' : 'DDX'
    return `${prefijo}-${numero.toString().padStart(3, '0')}`
  }

  const getEstatusChip = (estatus: string) => {
    const configs = {
      'BORRADOR': { color: 'default' as const, label: 'Borrador' },
      'EN_REVISION': { color: 'warning' as const, label: 'En Revisión' },
      'APROBADO': { color: 'success' as const, label: 'Aprobado' },
      'RECHAZADO': { color: 'error' as const, label: 'Rechazado' },
      'APLICADO': { color: 'info' as const, label: 'Aplicado' }
    }
    const config = configs[estatus as keyof typeof configs] || configs.BORRADOR
    return <Chip label={config.label} color={config.color} size="small" sx={{ fontWeight: 600 }} />
  }

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Cambios Extraordinarios</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={() => {
              const csvContent = 'CLAVE,CONCEPTO,UNIDAD,CANTIDAD,PU,PARTIDA,SUBPARTIDA,ACTIVIDAD\nEXT-001,Descripción del concepto,PZA,1.00,0.00,,,\n'
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
              const link = document.createElement('a')
              link.href = URL.createObjectURL(blob)
              link.download = 'plantilla-extraordinarios.csv'
              link.click()
            }}
            sx={{ color: '#ff9800', borderColor: '#ff9800', '&:hover': { borderColor: '#f57c00', bgcolor: 'rgba(255, 152, 0, 0.04)' } }}
          >
            📥 Descargar Plantilla
          </Button>
          {puedeSubir && (
            <Button
              variant="contained"
              startIcon={<UploadIcon className="w-4 h-4" />}
              sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' } }}
              onClick={() => setUploadModalOpen(true)}
            >
              Subir Plantilla
            </Button>
          )}
        </Stack>
      </Box>

      {cambiosExtras.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No hay cambios extraordinarios registrados. {puedeSubir && 'Sube una plantilla para agregar conceptos extras.'}
        </Alert>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#ff9800' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Folio</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Descripción</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">Monto</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Fecha</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Estatus</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cambiosExtras.map((cambio) => (
                <TableRow key={cambio.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{cambio.numero_cambio}</TableCell>
                  <TableCell>{cambio.descripcion}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: '#ff9800' }}>
                    ${cambio.monto_cambio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    {new Date(cambio.fecha_cambio).toLocaleDateString('es-MX')}
                  </TableCell>
                  <TableCell>{getEstatusChip(cambio.estatus)}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      {cambio.estatus === 'BORRADOR' && puedeAutorizar && (
                        <>
                          <Tooltip title="Aprobar">
                            <IconButton
                              size="small"
                              onClick={() => handleAprobar(cambio.id)}
                              sx={{ color: 'success.main' }}
                            >
                              <CheckIcon className="w-4 h-4" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Rechazar">
                            <IconButton
                              size="small"
                              onClick={() => handleRechazar(cambio.id)}
                              sx={{ color: 'error.main' }}
                            >
                              <XIcon className="w-4 h-4" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {cambio.estatus === 'APROBADO' && puedeAutorizar && (
                        <Tooltip title="Aplicar al Contrato">
                          <IconButton
                            size="small"
                            onClick={() => handleAplicar(cambio.id)}
                            sx={{ color: 'info.main' }}
                          >
                            <CheckIcon className="w-4 h-4" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Ver Detalles">
                        <IconButton 
                          size="small" 
                          sx={{ color: 'primary.main' }}
                          onClick={() => handleVerDetalles(cambio)}
                        >
                          <EyeIcon className="w-4 h-4" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Modal Upload Plantilla */}
      <Dialog open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#ff9800', color: 'white', fontWeight: 700 }}>
          Subir Plantilla de Conceptos Extraordinarios
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            La plantilla debe ser un archivo Excel (.xlsx) o CSV con las siguientes columnas:
            <ul>
              <li><strong>CLAVE</strong>: Código del concepto</li>
              <li><strong>CONCEPTO</strong>: Descripción del concepto</li>
              <li><strong>UNIDAD</strong>: Unidad de medida</li>
              <li><strong>CANTIDAD</strong>: Cantidad a ejecutar</li>
              <li><strong>PU</strong> o <strong>P.U.</strong>: Precio unitario</li>
              <li><strong>PARTIDA</strong>: Partida (opcional)</li>
              <li><strong>SUBPARTIDA</strong>: Subpartida (opcional)</li>
              <li><strong>ACTIVIDAD</strong>: Actividad (opcional)</li>
            </ul>
          </Alert>
          <Box sx={{ mb: 2, textAlign: 'center' }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => {
                const csvContent = 'CLAVE,CONCEPTO,UNIDAD,CANTIDAD,PU,PARTIDA,SUBPARTIDA,ACTIVIDAD\nEXT-001,Descripción del concepto,PZA,1.00,0.00,,,\n'
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                const link = document.createElement('a')
                link.href = URL.createObjectURL(blob)
                link.download = 'plantilla-extraordinarios.csv'
                link.click()
              }}
              sx={{ mb: 1 }}
            >
              📥 Descargar Plantilla Vacía (CSV)
            </Button>
            <Typography variant="caption" color="text.secondary" display="block">
              Descarga la plantilla, llénala y súbela aquí
            </Typography>
          </Box>
          <Box sx={{ border: '2px dashed #ff9800', borderRadius: 1, p: 3, textAlign: 'center' }}>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              id="upload-plantilla-input"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  handleSubirPlantilla(file)
                }
              }}
            />
            <label htmlFor="upload-plantilla-input">
              <Button
                variant="contained"
                component="span"
                startIcon={<UploadIcon />}
                sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' } }}
              >
                Seleccionar Archivo
              </Button>
            </label>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Formatos soportados: .xlsx, .xls, .csv
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadModalOpen(false)}>Cancelar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Ver Detalles */}
      <Dialog open={detalleModalOpen} onClose={() => setDetalleModalOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ bgcolor: '#ff9800', color: 'white', fontWeight: 700 }}>
          Detalles del Cambio: {cambioSeleccionado?.numero_cambio}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {cambioSeleccionado && (
            <>
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Descripción:</strong> {cambioSeleccionado.descripcion}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Monto Total:</strong> ${cambioSeleccionado.monto_cambio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Fecha:</strong> {new Date(cambioSeleccionado.fecha_cambio).toLocaleDateString('es-MX')}
                </Typography>
                <Typography variant="body1" component="div">
                  <strong>Estatus:</strong> {getEstatusChip(cambioSeleccionado.estatus)}
                </Typography>
              </Box>

              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Conceptos ({detallesExtra.length})
              </Typography>
              
              {detallesExtra.length === 0 ? (
                <Alert severity="warning">No hay conceptos registrados para este cambio.</Alert>
              ) : (
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#ff9800' }}>
                      <TableRow>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }}>Clave</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }}>Concepto</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }}>Unidad</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">Cantidad</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">P.U.</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">Importe</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detallesExtra.map((detalle) => (
                        <TableRow key={detalle.id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{detalle.concepto_clave}</TableCell>
                          <TableCell>{detalle.concepto_descripcion}</TableCell>
                          <TableCell>{detalle.concepto_unidad}</TableCell>
                          <TableCell align="right">{detalle.cantidad.toFixed(2)}</TableCell>
                          <TableCell align="right">
                            ${detalle.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, color: '#ff9800' }}>
                            ${detalle.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell colSpan={5} align="right" sx={{ fontWeight: 700 }}>
                          Total:
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#ff9800', fontSize: '1.1rem' }}>
                          ${detallesExtra.reduce((sum, d) => sum + d.importe, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetalleModalOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// Helper para crear objeto completo de ConceptoContrato
const createConceptoContrato = (partial: Partial<ConceptoContrato>, contratoId: string, tipo: string): ConceptoContrato => {
  const now = new Date().toISOString()
  return {
    id: uuidv4(),
    created_at: now,
    updated_at: now,
    contrato_id: contratoId,
    partida: partial.partida || '',
    subpartida: partial.subpartida || '',
    actividad: partial.actividad || '',
    clave: partial.clave || '',
    concepto: partial.concepto || '',
    unidad: partial.unidad || '',
    cantidad_catalogo: partial.cantidad_catalogo || 0,
    precio_unitario_catalogo: partial.precio_unitario_catalogo || 0,
    importe_catalogo: (partial.cantidad_catalogo || 0) * (partial.precio_unitario_catalogo || 0),
    cantidad_estimada: partial.cantidad_estimada || 0,
    precio_unitario_estimacion: partial.precio_unitario_estimacion || 0,
    importe_estimado: (partial.cantidad_estimada || 0) * (partial.precio_unitario_estimacion || 0),
    volumen_estimado_fecha: partial.volumen_estimado_fecha || 0,
    monto_estimado_fecha: partial.monto_estimado_fecha || 0,
    notas: partial.notas || null,
    orden: partial.orden || 0,
    active: true,
    metadata: { tipo, ...(partial.metadata || {}) },
  }
}

interface ContratoConceptosModalProps {
  isOpen: boolean
  onClose: () => void
  contratoId: string
  numeroContrato?: string
  readOnly?: boolean
}

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
      id={`conceptos-tabpanel-${index}`}
      aria-labelledby={`conceptos-tab-${index}`}
    >
      {value === index && (
        <Box sx={{ py: 1.5 }}>
          {children}
        </Box>
      )}
    </div>
  )
}

export const ContratoConceptosModal: React.FC<ContratoConceptosModalProps> = ({
  isOpen,
  onClose,
  contratoId,
  numeroContrato,
  readOnly = false
}) => {
  const [activeTab, setActiveTab] = useState(0)
  const { user, perfil } = useAuth()
  
  // Estados para cada tipo de catálogo
  const [conceptosOrdinario, setConceptosOrdinario] = useState<ConceptoContrato[]>([])
  const [conceptosExtraordinario, setConceptosExtraordinario] = useState<ConceptoContrato[]>([])
  const [conceptosAditivas, setConceptosAditivas] = useState<ConceptoContrato[]>([])
  const [loading, setLoading] = useState(true)
  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [aprobandoCatalogo, setAprobandoCatalogo] = useState(false)
  
  // Estados para resumen de cambios
  const [importeExtras, setImporteExtras] = useState(0)
  const [importeAditivas, setImporteAditivas] = useState(0)
  const [importeDeductivas, setImporteDeductivas] = useState(0)
  const [importeDeducciones, setImporteDeducciones] = useState(0)
  const [importeRetenciones, setImporteRetenciones] = useState(0)
  const [importeRetencionesDevueltas, setImporteRetencionesDevueltas] = useState(0)
  
  // Estados para contar detalles de cambios
  const [countDetallesAditivas, setCountDetallesAditivas] = useState(0)
  const [countDetallesDeductivas, setCountDetallesDeductivas] = useState(0)

  // Determinar permisos del usuario
  const esContratista = perfil?.roles?.some(r => r === 'CONTRATISTA' || r === 'USUARIO')
  const userRoles = perfil?.roles || user?.user_metadata?.roles || []

  // TODAS las pestañas son visibles para todos los usuarios (incluidos contratistas)
  const canViewAdminTabs = true

  // ✅ Aprobar CATÁLOGO ORDINARIO: Solo Gerente Plataforma y Gerencia
  const puedeAprobarCatalogo = !esContratista && userRoles.some((r: string) => 
    ['Gerente Plataforma', 'Gerencia'].includes(r)
  )

  // ✅ SUBIR aditivas, deductivas, extras y deducciones: Desarrollador, Gerencia, Gerente Plataforma
  const puedeSubirCambios = userRoles.some((r: string) => 
    ['Desarrollador', 'Gerencia', 'Gerente Plataforma'].includes(r)
  )

  // ✅ AUTORIZAR ADITIVAS: Solo Gerente Plataforma y Desarrollador
  const puedeAutorizarAditivas = userRoles.some((r: string) => 
    ['Gerente Plataforma', 'Desarrollador'].includes(r)
  )

  // ✅ AUTORIZAR EXTRAORDINARIOS: Solo Gerente Plataforma y Desarrollador
  const puedeAutorizarExtraordinarios = userRoles.some((r: string) => 
    ['Gerente Plataforma', 'Desarrollador'].includes(r)
  )

  // ✅ AUTORIZAR deductivas, extras y deducciones: Gerencia, Gerente Plataforma, Desarrollador
  const puedeAutorizarOtrosCambios = userRoles.some((r: string) => 
    ['Gerencia', 'Gerente Plataforma', 'Desarrollador'].includes(r)
  )

  // Determinar si el catálogo está bloqueado por aprobación
  const catalogoAprobado = contrato?.catalogo_aprobado || false
  const catalogoBloqueado = catalogoAprobado // Una vez aprobado, está bloqueado

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  const handleGuardarYSincronizar = async () => {
    try {
      console.log('🔄 Iniciando sincronización de conceptos...');
      
      // Verificar cuántos conceptos están marcados como _dirty
      const dirtyConceptos = await db.conceptos_contrato
        .filter(c => c._dirty === true)
        .toArray();
      
      console.log(`📦 Conceptos pendientes de sincronizar: ${dirtyConceptos.length}`, dirtyConceptos);
      
      if (dirtyConceptos.length === 0) {
        alert('No hay cambios pendientes para sincronizar');
        return;
      }
      
      // Forzar push de cambios _dirty (Dexie ya marca _dirty en hooks)
      const result = await syncService.forcePush();
      
      console.log('✅ Resultado de sincronización:', result);
      
      if (result.success) {
        alert(`✅ Cambios sincronizados exitosamente: ${result.synced} registros`);
      } else {
        console.error('❌ Errores de sync:', result.errors);
        alert(`⚠️ Sincronización con errores:\n${result.errors.join('\n')}`);
      }
    } catch (e) {
      console.error('❌ Error al sincronizar:', e);
      alert(`❌ Error: ${e instanceof Error ? e.message : 'No se pudo sincronizar cambios'}`);
    }
  }

  const handleRecargarDesdeServidor = async () => {
    try {
      const confirmar = window.confirm(
        '⚠️ Esto sobrescribirá los datos locales con los del servidor.\n\n' +
        'Se perderán cambios locales no sincronizados.\n\n' +
        '¿Continuar?'
      );
      if (!confirmar) return;

      console.log('🔄 Recargando conceptos desde Supabase...');
      
      // Limpiar conceptos locales del contrato
      await db.conceptos_contrato
        .where('contrato_id')
        .equals(contratoId)
        .delete();
      
      console.log('🗑️ Conceptos locales borrados');
      
      // Pull directo desde Supabase
      const supabaseClient = (await import('@/lib/core/supabaseClient')).supabase;
      const { data, error } = await supabaseClient
        .from('conceptos_contrato')
        .select('*')
        .eq('contrato_id', contratoId)
        .eq('active', true)
        .order('orden', { ascending: true });
      
      if (error) {
        console.error('❌ Error cargando desde Supabase:', error);
        alert('Error al cargar desde servidor');
        return;
      }
      
      if (data && data.length > 0) {
        console.log(`✅ Recuperados ${data.length} conceptos desde Supabase`);
        
        // Insertar en Dexie marcando _dirty=false
        for (const c of data) {
          const local: any = {
            id: c.id,
            contrato_id: c.contrato_id,
            partida: c.partida || '',
            subpartida: c.subpartida || '',
            actividad: c.actividad || '',
            clave: c.clave || '',
            concepto: c.concepto || '',
            unidad: c.unidad || '',
            cantidad_catalogo: Number(c.cantidad_catalogo ?? 0),
            precio_unitario_catalogo: Number(c.precio_unitario_catalogo ?? 0),
            importe_catalogo: Number(c.cantidad_catalogo ?? 0) * Number(c.precio_unitario_catalogo ?? 0),
            cantidad_estimada: Number(c.cantidad_estimada ?? 0),
            precio_unitario_estimacion: Number(c.precio_unitario_estimacion ?? 0),
            importe_estimado: Number(c.cantidad_estimada ?? 0) * Number(c.precio_unitario_estimacion ?? 0),
            volumen_estimado_fecha: Number(c.volumen_estimado_fecha ?? 0),
            monto_estimado_fecha: Number(c.monto_estimado_fecha ?? 0),
            notas: c.notas || null,
            orden: c.orden ?? 0,
            active: c.active ?? true,
            metadata: c.metadata || {},
            created_at: c.created_at,
            updated_at: c.updated_at,
            _dirty: false,
            last_sync: new Date().toISOString()
          };
          await db.conceptos_contrato.put(local);
        }
        
        alert(`✅ Recargados ${data.length} conceptos desde servidor`);
      } else {
        console.log('📭 No hay conceptos en el servidor');
        alert('No hay conceptos en el servidor para este contrato');
      }
      
      await loadConceptos();
    } catch (error) {
      console.error('❌ Error recargando desde servidor:', error);
      alert('Error al recargar desde servidor');
    }
  }

  // Cargar contrato al abrir modal
  const loadContrato = async () => {
    try {
      const supabaseClient = (await import('@/lib/core/supabaseClient')).supabase
      const { data, error } = await supabaseClient
        .from('contratos')
        .select('*')
        .eq('id', contratoId)
        .single()

      if (error) throw error
      setContrato(data)
    } catch (error) {
      console.error('Error cargando contrato:', error)
    }
  }

  // Función para aprobar catálogo
  const handleAprobarCatalogo = async () => {
    if (!puedeAprobarCatalogo) {
      alert('No tienes permisos para aprobar catálogos')
      return
    }

    // Validar que hay conceptos en el catálogo ordinario
    if (conceptosOrdinario.length === 0) {
      alert('⚠️ No se puede aprobar un catálogo vacío. El contratista debe subir conceptos primero.')
      return
    }

    const confirmar = window.confirm(
      `¿Aprobar el catálogo ordinario de este contrato?\n\n` +
      `• Contiene ${conceptosOrdinario.length} conceptos\n` +
      `• Una vez aprobado, NO se podrá modificar\n` +
      `• Cualquier cambio requerirá extraordinarios o aditivas/deductivas\n\n` +
      `¿Continuar con la aprobación?`
    )

    if (!confirmar) return

    try {
      setAprobandoCatalogo(true)
      const supabaseClient = (await import('@/lib/core/supabaseClient')).supabase
      
      const { error } = await supabaseClient
        .from('contratos')
        .update({
          catalogo_aprobado: true,
          catalogo_aprobado_por: user?.id,
          catalogo_fecha_aprobacion: new Date().toISOString(),
          catalogo_observaciones: 'Catálogo aprobado'
        })
        .eq('id', contratoId)

      if (error) throw error

      // Recargar contrato
      await loadContrato()
      alert('✅ Catálogo aprobado exitosamente. Ahora está bloqueado para edición.')
    } catch (error: any) {
      console.error('Error aprobando catálogo:', error)
      alert(`❌ Error al aprobar catálogo: ${error.message}`)
    } finally {
      setAprobandoCatalogo(false)
    }
  }

  // Cargar conceptos y contrato al abrir modal
  useEffect(() => {
    if (isOpen && contratoId) {
      loadContrato()
      loadConceptos()
    }
  }, [isOpen, contratoId])

  const loadConceptos = async () => {
    try {
      setLoading(true)
      
      // SIEMPRE intentar sincronizar desde Supabase si hay internet
      if (navigator.onLine) {
        try {
          console.log('🌐 Conectado a internet, sincronizando con Supabase...')
          const supabaseClient = (await import('@/lib/core/supabaseClient')).supabase
          const { data, error } = await supabaseClient
            .from('conceptos_contrato')
            .select('id, contrato_id, partida, subpartida, actividad, clave, concepto, unidad, cantidad_catalogo, precio_unitario_catalogo, cantidad_estimada, precio_unitario_estimacion, volumen_estimado_fecha, monto_estimado_fecha, notas, orden, active, metadata, updated_at, created_at')
            .eq('contrato_id', contratoId)
            .eq('active', true)
            .order('orden', { ascending: true })
          
          if (error) {
            console.warn('⚠️ Error cargando conceptos remotos:', error.message)
          } else {
            console.log(`✅ Recuperados ${data?.length || 0} conceptos desde Supabase`)
            
            // Obtener IDs remotos para detectar eliminaciones
            const idsRemotos = new Set(data?.map(c => c.id) || [])
            
            // Obtener conceptos locales para comparar
            const locales = await db.conceptos_contrato
              .where('contrato_id')
              .equals(contratoId)
              .toArray()
            
            // Eliminar conceptos locales que ya no existen en remoto
            const idsLocales = locales.map(c => c.id)
            const idsAEliminar = idsLocales.filter(id => !idsRemotos.has(id))
            
            if (idsAEliminar.length > 0) {
              console.log(`🗑️ Eliminando ${idsAEliminar.length} conceptos que ya no existen en servidor`)
              await db.conceptos_contrato.bulkDelete(idsAEliminar)
            }
            
            // Sincronizar conceptos desde servidor
            if (data && data.length > 0) {
              for (const c of data) {
                const local: any = {
                  id: c.id,
                  contrato_id: c.contrato_id,
                  partida: c.partida || '',
                  subpartida: c.subpartida || '',
                  actividad: c.actividad || '',
                  clave: c.clave || '',
                  concepto: c.concepto || '',
                  unidad: c.unidad || '',
                  cantidad_catalogo: Number(c.cantidad_catalogo ?? 0),
                  precio_unitario_catalogo: Number(c.precio_unitario_catalogo ?? 0),
                  importe_catalogo: Number(c.cantidad_catalogo ?? 0) * Number(c.precio_unitario_catalogo ?? 0),
                  cantidad_estimada: Number(c.cantidad_estimada ?? 0),
                  precio_unitario_estimacion: Number(c.precio_unitario_estimacion ?? 0),
                  importe_estimado: Number(c.cantidad_estimada ?? 0) * Number(c.precio_unitario_estimacion ?? 0),
                  volumen_estimado_fecha: Number(c.volumen_estimado_fecha ?? 0),
                  monto_estimado_fecha: Number(c.monto_estimado_fecha ?? 0),
                  notas: c.notas || null,
                  orden: c.orden ?? 0,
                  active: c.active ?? true,
                  metadata: c.metadata || {},
                  created_at: c.created_at,
                  updated_at: c.updated_at,
                  _dirty: false,
                  last_sync: new Date().toISOString()
                }
                await db.conceptos_contrato.put(local)
              }
            }
          }
        } catch (remoteErr) {
          console.warn('⚠️ No se pudo sincronizar con servidor, usando datos locales:', remoteErr)
        }
      } else {
        console.log('📴 Sin internet, usando datos locales')
      }
      
      // Cargar conceptos desde IndexedDB (ya actualizados si había internet)
      const allConceptos = await db.conceptos_contrato
        .where('contrato_id')
        .equals(contratoId)
        .and(c => !c._deleted && c.active)
        .sortBy('orden')
      
      // Separar por tipo usando metadata.tipo
      const ordinarios = allConceptos.filter(c => !c.metadata?.tipo || c.metadata.tipo === 'ordinario')
      const aditivas = allConceptos.filter(c => c.metadata?.tipo === 'aditivas')
      
      // Cargar extraordinarios desde detalles_extra de cambios APROBADOS
      console.log('🔍 Buscando cambios extraordinarios para contrato:', contratoId)
      
      // Primero ver todos los cambios del contrato
      const todosCambios = await db.cambios_contrato
        .where('contrato_id')
        .equals(contratoId)
        .toArray()
      console.log('📋 TODOS los cambios del contrato:', todosCambios.map(c => ({
        id: c.id,
        tipo: c.tipo_cambio,
        numero: c.numero_cambio,
        estatus: c.estatus,
        active: c.active
      })))
      
      const cambiosExtrasAprobados = await db.cambios_contrato
        .where('contrato_id')
        .equals(contratoId)
        .and(c => c.tipo_cambio === 'EXTRA' && c.estatus === 'APROBADO' && c.active === true)
        .toArray()
      
      console.log('✅ Cambios extraordinarios APROBADOS encontrados:', cambiosExtrasAprobados.length)
      
      const extraordinarios: ConceptoContrato[] = []
      for (const cambio of cambiosExtrasAprobados) {
        console.log('📦 Procesando cambio extraordinario:', cambio.numero_cambio)
        const detalles = await db.detalles_extra
          .where('cambio_contrato_id')
          .equals(cambio.id)
          .and(d => d.active !== false)
          .toArray()
        
        console.log('  💎 Detalles encontrados:', detalles.length)
        
        // Convertir detalles_extra a formato ConceptoContrato para el resumen
        detalles.forEach(detalle => {
          extraordinarios.push({
            id: detalle.id,
            created_at: detalle.created_at,
            updated_at: detalle.updated_at,
            contrato_id: contratoId,
            partida: '',
            subpartida: detalle.concepto_clave || '',
            actividad: '',
            clave: detalle.concepto_clave || '',
            concepto: detalle.concepto_descripcion || '',
            unidad: detalle.concepto_unidad || 'PZA',
            cantidad_catalogo: detalle.cantidad || 0,
            precio_unitario_catalogo: detalle.precio_unitario || 0,
            importe_catalogo: detalle.importe || 0,
            cantidad_estimada: 0,
            precio_unitario_estimacion: 0,
            importe_estimado: 0,
            volumen_estimado_fecha: 0,
            monto_estimado_fecha: 0,
            notas: null,
            orden: 9999,
            active: true,
            metadata: { tipo: 'extraordinario', cambio_id: cambio.id },
            _dirty: false,
            last_sync: new Date().toISOString()
          } as ConceptoContrato)
        })
      }
      
      console.log('🎯 Total extraordinarios cargados:', extraordinarios.length)
      
      console.log('📊 Conceptos cargados:', {
        total: allConceptos.length,
        ordinarios: ordinarios.length,
        extraordinarios: extraordinarios.length,
        aditivas: aditivas.length,
        sinTipo: allConceptos.filter(c => !c.metadata?.tipo).length
      });
      
      setConceptosOrdinario(ordinarios)
      setConceptosExtraordinario(extraordinarios)
      setConceptosAditivas(aditivas)
      
      // Cargar cambios aplicados para calcular totales
      await loadCambiosContrato()
    } catch (error) {
      console.error('Error cargando conceptos:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // Cargar cambios de contrato y calcular totales
  const loadCambiosContrato = async () => {
    try {
      console.log('🔍 Buscando cambios de contrato para:', contratoId)
      
      const cambios = await db.cambios_contrato
        .where('contrato_id')
        .equals(contratoId)
        .and(c => c.active === true && c.estatus === 'APLICADO')
        .toArray()
      
      console.log('📋 Cambios encontrados:', cambios.length, cambios)
      
      let totalExtras = 0
      let totalAditivas = 0
      let totalDeductivas = 0
      let totalDeducciones = 0
      let countAditivas = 0
      let countDeductivas = 0
      
      for (const cambio of cambios) {
        console.log('🔄 Procesando cambio:', cambio.tipo_cambio, cambio.numero_cambio)
        
        if (cambio.tipo_cambio === 'EXTRA') {
          const detalles = await db.detalles_extra
            .where('cambio_contrato_id')
            .equals(cambio.id)
            .and(d => d.active !== false)
            .toArray()
          console.log('  📦 Detalles EXTRA:', detalles.length, detalles)
          const suma = detalles.reduce((sum, d) => sum + (d.importe || 0), 0)
          console.log('  💰 Suma EXTRA:', suma)
          totalExtras += suma
        } else if (cambio.tipo_cambio === 'ADITIVA') {
          const detalles = await db.detalles_aditiva_deductiva
            .where('cambio_contrato_id')
            .equals(cambio.id)
            .and(d => d.active !== false)
            .toArray()
          console.log('  📦 Detalles ADITIVA:', detalles.length, detalles)
          const suma = detalles.reduce((sum, d) => sum + (d.importe_modificacion || 0), 0)
          console.log('  💰 Suma ADITIVA:', suma)
          totalAditivas += suma
          countAditivas += detalles.length
        } else if (cambio.tipo_cambio === 'DEDUCTIVA') {
          const detalles = await db.detalles_aditiva_deductiva
            .where('cambio_contrato_id')
            .equals(cambio.id)
            .and(d => d.active !== false)
            .toArray()
          console.log('  📦 Detalles DEDUCTIVA:', detalles.length, detalles)
          const suma = Math.abs(detalles.reduce((sum, d) => sum + (d.importe_modificacion || 0), 0))
          console.log('  💰 Suma DEDUCTIVA:', suma)
          totalDeductivas += suma
          countDeductivas += detalles.length
        } else if (cambio.tipo_cambio === 'DEDUCCION_EXTRA') {
          const deducciones = await db.deducciones_extra
            .where('cambio_contrato_id')
            .equals(cambio.id)
            .and(d => d.active !== false)
            .toArray()
          console.log('  📦 Deducciones EXTRA:', deducciones.length, deducciones)
          const suma = deducciones.reduce((sum, d) => sum + (d.monto || 0), 0)
          console.log('  💰 Suma DEDUCCIONES:', suma)
          totalDeducciones += suma
        }
      }
      
      // Calcular retenciones
      const retenciones = await db.retenciones_contrato
        .where('cambio_contrato_id')
        .anyOf(cambios.map(c => c.id))
        .and(r => r.active !== false)
        .toArray()
      
      // Retenciones totales = Monto total de todas las retenciones
      const totalRetenciones = retenciones
        .reduce((sum, r) => sum + (r.monto || 0), 0)
      
      // Retenciones devueltas = Monto total regresado
      const totalRetencionesDevueltas = retenciones
        .reduce((sum, r) => sum + (r.monto_regresado || 0), 0)
      
      setImporteExtras(totalExtras)
      setImporteAditivas(totalAditivas)
      setImporteDeductivas(totalDeductivas)
      setImporteDeducciones(totalDeducciones)
      setImporteRetenciones(totalRetenciones)
      setImporteRetencionesDevueltas(totalRetencionesDevueltas)
      setCountDetallesAditivas(countAditivas)
      setCountDetallesDeductivas(countDeductivas)
      
      console.log('💰 Resumen de cambios:', {
        extras: totalExtras,
        aditivas: totalAditivas,
        deductivas: totalDeductivas,
        deducciones: totalDeducciones,
        retenciones: totalRetenciones,
        retencionesDevueltas: totalRetencionesDevueltas,
        countAditivas,
        countDeductivas
      })
    } catch (error) {
      console.error('Error cargando cambios de contrato:', error)
    }
  }

  // Handlers para Ordinario
  const handleAddOrdinario = async (concepto: Partial<ConceptoContrato>) => {
    try {
      const nuevoConcepto = createConceptoContrato(
        { ...concepto, orden: conceptosOrdinario.length + 1 },
        contratoId,
        'ordinario'
      )
      await db.conceptos_contrato.add(nuevoConcepto)
      
      await loadConceptos()
    } catch (error) {
      console.error('Error agregando concepto:', error)
      alert('Error al agregar concepto')
    }
  }

  const handleUpdateOrdinario = async (id: string, updates: Partial<ConceptoContrato>) => {
    try {
      await db.conceptos_contrato.update(id, updates)
      await loadConceptos()
    } catch (error) {
      console.error('Error actualizando concepto:', error)
      alert('Error al actualizar concepto')
    }
  }

  const handleDeleteOrdinario = async (id: string) => {
    try {
      await db.conceptos_contrato.update(id, { _deleted: true, active: false })
      await loadConceptos()
    } catch (error) {
      console.error('Error eliminando concepto:', error)
      alert('Error al eliminar concepto')
    }
  }

  const handleReplaceCatalogoOrdinario = async (imported: Partial<ConceptoContrato>[]) => {
    try {
      let actualizados = 0
      let agregados = 0

      await db.transaction('rw', db.conceptos_contrato, async () => {
        // Cargar existentes del contrato (ordinario)
        const existentes = await db.conceptos_contrato
          .where('contrato_id')
          .equals(contratoId)
          .and(c => !c._deleted && c.active && (!c.metadata?.tipo || c.metadata.tipo === 'ordinario'))
          .toArray()

        console.log('🔍 DEBUG MERGE:')
        console.log('Existentes:', existentes.length, existentes.map(e => ({ clave: e.clave, concepto: e.concepto })))
        console.log('Importados:', imported.length, imported.map(i => ({ clave: i.clave, concepto: i.concepto })))

        // Crear mapa CLAVE -> concepto existente
        const mapExistentes = new Map<string, ConceptoContrato>()
        existentes.forEach(c => {
          if (c.clave) {
            const key = c.clave.trim().toUpperCase()
            mapExistentes.set(key, c)
            console.log(`  📌 Mapped: "${key}" -> ${c.id}`)
          }
        })

        console.log('Mapa de claves:', Array.from(mapExistentes.keys()))

        // Contador para renombrar duplicados: CLAVE -> cuántas veces procesada
        const contadorClaves = new Map<string, number>()
        
        // Inicializar contador con existentes (para que nuevos empiecen en (2))
        existentes.forEach(e => {
          if (e.clave) {
            const key = e.clave.trim().toUpperCase()
            contadorClaves.set(key, 1)
          }
        })

        // Procesar cada concepto importado
        for (const imp of imported) {
          let claveNormalizada = (imp.clave || '').trim().toUpperCase()
          console.log(`  🔎 Buscando: "${claveNormalizada}"`)
          
          if (!claveNormalizada) {
            console.log('    ⚠️ CLAVE vacía, saltando...')
            continue
          }

          const existente = mapExistentes.get(claveNormalizada)

          if (existente) {
            // ACTUALIZAR existente (prioridad al que ya estaba en BD)
            console.log(`    ✏️ ACTUALIZAR: ${existente.id}`)
            await db.conceptos_contrato.update(existente.id, {
              partida: imp.partida || existente.partida,
              subpartida: imp.subpartida || existente.subpartida,
              actividad: imp.actividad || existente.actividad,
              concepto: imp.concepto || existente.concepto,
              unidad: imp.unidad || existente.unidad,
              cantidad_catalogo: imp.cantidad_catalogo ?? existente.cantidad_catalogo,
              precio_unitario_catalogo: imp.precio_unitario_catalogo ?? existente.precio_unitario_catalogo,
              importe_catalogo: (imp.cantidad_catalogo ?? existente.cantidad_catalogo) * (imp.precio_unitario_catalogo ?? existente.precio_unitario_catalogo),
              updated_at: new Date().toISOString(),
              _dirty: true
            })
            actualizados++
            
            // Marcar como procesada
            mapExistentes.delete(claveNormalizada)
          } else {
            // Verificar si ya procesamos esta CLAVE antes (duplicado en archivo)
            const vecesUsada = contadorClaves.get(claveNormalizada) || 0
            
            if (vecesUsada > 0) {
              // Renombrar con sufijo (2), (3), etc.
              const claveOriginal = imp.clave || ''
              imp.clave = `${claveOriginal} (${vecesUsada + 1})`
              console.log(`    🔄 RENOMBRADO duplicado: "${claveOriginal}" → "${imp.clave}"`)
            }
            
            // AGREGAR nuevo
            console.log(`    ➕ AGREGAR NUEVO: ${imp.clave}`)
            const nuevo = createConceptoContrato({ ...imp, orden: existentes.length + agregados + 1 }, contratoId, 'ordinario')
            await db.conceptos_contrato.add(nuevo)
            agregados++
            
            // Incrementar contador
            contadorClaves.set(claveNormalizada, vecesUsada + 1)
          }
        }
      })

      // Pushear inmediatamente a Supabase para evitar que auto-sync los borre
      console.log('⬆️ Pusheando cambios a Supabase...')
      const syncResult = await syncService.forcePush()
      console.log('✅ Sync result:', syncResult)
      
      await loadConceptos()
      console.log(`✅ Resultado: ${actualizados} actualizados, ${agregados} agregados`)
      alert(`✅ Merge completado:\n\n• ${actualizados} conceptos actualizados\n• ${agregados} conceptos nuevos\n• 0 conceptos eliminados\n• Sincronizados con servidor`)
    } catch (error) {
      console.error('Error en merge de catálogo:', error)
      alert('❌ Error al hacer merge del catálogo')
    }
  }

  // Handlers genéricos para otros tipos
  const handleAddConcepto = async (concepto: Partial<ConceptoContrato>, tipo: string, setter: React.Dispatch<React.SetStateAction<ConceptoContrato[]>>) => {
    try {
      const nuevoConcepto = createConceptoContrato(concepto, contratoId, tipo)
      await db.conceptos_contrato.add(nuevoConcepto)
      await loadConceptos()
    } catch (error) {
      console.error('Error agregando concepto:', error)
      alert('Error al agregar concepto')
    }
  }

  const handleUpdateConcepto = async (id: string, updates: Partial<ConceptoContrato>) => {
    try {
      await db.conceptos_contrato.update(id, updates)
      await loadConceptos()
    } catch (error) {
      console.error('Error actualizando concepto:', error)
      alert('Error al actualizar concepto')
    }
  }

  const handleDeleteConcepto = async (id: string) => {
    try {
      await db.conceptos_contrato.update(id, { _deleted: true, active: false })
      await loadConceptos()
    } catch (error) {
      console.error('Error eliminando concepto:', error)
      alert('Error al eliminar concepto')
    }
  }

  const handleReplaceCatalogo = async (imported: Partial<ConceptoContrato>[], tipo: string) => {
    try {
      let actualizados = 0
      let agregados = 0

      await db.transaction('rw', db.conceptos_contrato, async () => {
        // Cargar existentes del tipo específico
        const existentes = await db.conceptos_contrato
          .where('contrato_id')
          .equals(contratoId)
          .and(c => !c._deleted && c.active && (c.metadata?.tipo || 'ordinario') === tipo)
          .toArray()

        // Crear mapa CLAVE -> concepto existente
        const mapExistentes = new Map<string, ConceptoContrato>()
        existentes.forEach(c => {
          if (c.clave) mapExistentes.set(c.clave.trim().toUpperCase(), c)
        })

        // Contador para renombrar duplicados
        const contadorClaves = new Map<string, number>()
        existentes.forEach(e => {
          if (e.clave) contadorClaves.set(e.clave.trim().toUpperCase(), 1)
        })

        // Procesar cada concepto importado
        for (const imp of imported) {
          const claveNormalizada = (imp.clave || '').trim().toUpperCase()
          if (!claveNormalizada) continue

          const existente = mapExistentes.get(claveNormalizada)

          if (existente) {
            // ACTUALIZAR existente (prioridad al que ya estaba)
            await db.conceptos_contrato.update(existente.id, {
              partida: imp.partida || existente.partida,
              subpartida: imp.subpartida || existente.subpartida,
              actividad: imp.actividad || existente.actividad,
              concepto: imp.concepto || existente.concepto,
              unidad: imp.unidad || existente.unidad,
              cantidad_catalogo: imp.cantidad_catalogo ?? existente.cantidad_catalogo,
              precio_unitario_catalogo: imp.precio_unitario_catalogo ?? existente.precio_unitario_catalogo,
              importe_catalogo: (imp.cantidad_catalogo ?? existente.cantidad_catalogo) * (imp.precio_unitario_catalogo ?? existente.precio_unitario_catalogo),
              updated_at: new Date().toISOString(),
              _dirty: true
            })
            actualizados++
            mapExistentes.delete(claveNormalizada)
          } else {
            // Verificar duplicados en archivo
            const vecesUsada = contadorClaves.get(claveNormalizada) || 0
            if (vecesUsada > 0) {
              const claveOriginal = imp.clave || ''
              imp.clave = `${claveOriginal} (${vecesUsada + 1})`
              console.log(`🔄 Renombrado: "${claveOriginal}" → "${imp.clave}"`)
            }
            contadorClaves.set(claveNormalizada, vecesUsada + 1)
            
            // AGREGAR nuevo
            const nuevo = createConceptoContrato({ ...imp, orden: existentes.length + agregados + 1 }, contratoId, tipo)
            await db.conceptos_contrato.add(nuevo)
            agregados++
          }
        }
      })

      // Pushear inmediatamente a Supabase
      console.log('⬆️ Pusheando cambios a Supabase...')
      await syncService.forcePush()
      
      await loadConceptos()
      alert(`✅ Merge ${tipo} completado:\n\n• ${actualizados} actualizados\n• ${agregados} nuevos\n• 0 eliminados\n• Sincronizados con servidor`)
    } catch (error) {
      console.error('Error en merge de catálogo:', error)
      alert('❌ Error al hacer merge del catálogo')
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          width: '80%',
          height: '80vh',
          maxWidth: '80%',
          m: 'auto'
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2px solid rgba(156, 39, 176, 0.1)',
          pb: 1.5,
          pt: 1.5,
          px: 3
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FileText className="w-5 h-5" style={{ color: '#9c27b0' }} />
          <Box>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', fontSize: '1.1rem' }}>
                Catálogos de Conceptos
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem' }}>
                {numeroContrato || `Contrato ${contratoId.slice(0, 8)}`}
              </Typography>
              {catalogoAprobado && (
                <Chip
                  icon={<CheckCircle className="w-3 h-3" />}
                  label={`Aprobado el ${new Date(contrato?.catalogo_fecha_aprobacion || '').toLocaleDateString()}`}
                  size="small"
                  sx={{ bgcolor: '#22c55e', color: 'white', fontWeight: 600, height: 24, fontSize: '0.75rem' }}
                />
              )}
            </Stack>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!catalogoAprobado && puedeAprobarCatalogo && (
            <Button
              variant="contained"
              size="small"
              startIcon={<CheckCircle className="w-4 h-4" />}
              onClick={handleAprobarCatalogo}
              disabled={aprobandoCatalogo || conceptosOrdinario.length === 0}
              sx={{
                bgcolor: '#22c55e',
                '&:hover': { bgcolor: '#16a34a' },
                fontWeight: 600,
                textTransform: 'none'
              }}
            >
              {aprobandoCatalogo ? 'Aprobando...' : 'Aprobar Catálogo'}
            </Button>
          )}
          <Paper
            elevation={0}
            component="button"
            onClick={handleGuardarYSincronizar}
            style={{ cursor: 'pointer' }}
            sx={{
              px: 2,
              py: 1,
              bgcolor: 'rgba(156, 39, 176, 0.08)',
              color: '#9c27b0',
              border: '1px solid rgba(156, 39, 176, 0.2)',
              borderRadius: 1,
              fontWeight: 600
            }}
          >
            Guardar y sincronizar
          </Paper>
          <IconButton
            onClick={onClose}
            sx={{
              color: '#64748b',
              '&:hover': { bgcolor: 'rgba(156, 39, 176, 0.1)' }
            }}
          >
            <X className="w-5 h-5" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: 'calc(80vh - 80px)', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0, bgcolor: 'white', zIndex: 1 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px: 2,
              minHeight: 48,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
                minHeight: 48,
                py: 1,
                '&.Mui-selected': {
                  color: '#9c27b0',
                  fontWeight: 600
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#9c27b0',
                height: 3,
                borderRadius: '3px 3px 0 0'
              }
            }}
          >
            {[
              <Tab
                key="resumen"
                label="Resumen"
                icon={<FileText className="w-4 h-4" />}
                iconPosition="start"
              />,
              <Tab
                key="ordinario"
                label="Ordinario"
                icon={<Calendar className="w-4 h-4" />}
                iconPosition="start"
              />,
              ...(canViewAdminTabs ? [
                <Tab
                  key="aditiva"
                  label="Aditiva"
                  icon={<Plus className="w-4 h-4" />}
                  iconPosition="start"
                />,
                <Tab
                  key="deductiva"
                  label="Deductiva"
                  icon={<Minus className="w-4 h-4" />}
                  iconPosition="start"
                />,
                <Tab
                  key="deducciones-extra"
                  label="Deducciones Extra"
                  icon={<Minus className="w-4 h-4" />}
                  iconPosition="start"
                />,
                <Tab
                  key="retenciones"
                  label="Retenciones"
                  icon={<Shield className="w-4 h-4" />}
                  iconPosition="start"
                />,
                <Tab
                  key="extraordinario"
                  label="Extraordinario"
                  icon={<Settings className="w-4 h-4" />}
                  iconPosition="start"
                />
              ] : [])
            ]}
          </Tabs>
        </Box>

        <Box 
          sx={{ 
            flexGrow: 1, 
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            '&::-webkit-scrollbar': {
              width: 8
            },
            '&::-webkit-scrollbar-track': {
              bgcolor: 'rgba(148, 163, 184, 0.1)'
            },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: 'rgba(100, 116, 139, 0.4)',
              borderRadius: 1,
              '&:hover': {
                bgcolor: 'rgba(100, 116, 139, 0.6)'
              }
            }
          }}
        >
          <Box sx={{ px: 3, pb: 2 }}>
            {/* Alert de catálogo aprobado */}
            {catalogoAprobado && (
              <Alert 
                severity="success" 
                icon={<CheckCircle className="w-4 h-4" />}
                sx={{ mb: 1.5, mt: 1.5, py: 0.5 }}
              >
                <Typography variant="body2">
                  <strong>Catálogo Aprobado</strong> - Este catálogo está bloqueado. No se pueden agregar, editar o eliminar conceptos del catálogo ordinario. Para modificaciones, use Extraordinarios o Aditivas/Deductivas.
                </Typography>
              </Alert>
            )}

            {/* Alert para contratistas cuando el catálogo no está aprobado */}
            {!catalogoAprobado && esContratista && conceptosOrdinario.length > 0 && (
              <Alert 
                severity="info" 
                icon={<AlertCircle className="w-4 h-4" />}
                sx={{ mb: 1.5, mt: 1.5, py: 0.5 }}
              >
                <Typography variant="body2">
                  Su catálogo está pendiente de aprobación por parte de la administración. Una vez aprobado, podrá crear requisiciones.
                </Typography>
              </Alert>
            )}

            {/* Pestaña 1: Resumen */}
            <TabPanel value={activeTab} index={0}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
                {/* Resumen Ordinario */}
                <Paper elevation={2} sx={{ p: 3, bgcolor: 'rgba(156, 39, 176, 0.05)', border: '1px solid rgba(156, 39, 176, 0.2)' }}>
                  <Typography variant="h6" sx={{ color: '#9c27b0', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Calendar className="w-5 h-5" />
                    Ordinario
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>Conceptos</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>{conceptosOrdinario.length}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>Importe Original</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#64748b' }}>
                        ${conceptosOrdinario.reduce((sum, c) => sum + (c.importe_catalogo || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>Importe Actualizado</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#9c27b0' }}>
                        ${(conceptosOrdinario.reduce((sum, c) => sum + (c.importe_catalogo || 0), 0) + conceptosExtraordinario.reduce((sum, c) => sum + (c.importe_catalogo || 0), 0) + importeAditivas - importeDeductivas).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>Anticipo Monto</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#ff9800' }}>
                        ${(contrato?.anticipo_monto || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>Anticipo % (Ajustado)</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#ff9800' }}>
                        {(() => {
                          const montoActualizado = conceptosOrdinario.reduce((sum, c) => sum + (c.importe_catalogo || 0), 0) + conceptosExtraordinario.reduce((sum, c) => sum + (c.importe_catalogo || 0), 0) + importeAditivas - importeDeductivas;
                          const anticipoMonto = contrato?.anticipo_monto || 0;
                          const porcentaje = montoActualizado > 0 ? (anticipoMonto / montoActualizado) * 100 : 0;
                          return `${porcentaje.toFixed(2)}%`;
                        })()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>Estimado a la Fecha</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                        $0.00
                      </Typography>
                    </Box>
                  </Box>
                </Paper>

                {/* Resumen Extraordinario */}
                {canViewAdminTabs && (
                  <Paper elevation={2} sx={{ p: 3, bgcolor: 'rgba(255, 152, 0, 0.05)', border: '1px solid rgba(255, 152, 0, 0.2)' }}>
                    <Typography variant="h6" sx={{ color: '#ff9800', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Plus className="w-5 h-5" />
                      Extraordinario
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>Conceptos Extra</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                          {conceptosExtraordinario.length}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>Importe Extras</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#ff9800' }}>
                          ${conceptosExtraordinario.reduce((sum, c) => sum + (c.importe_catalogo || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                )}

                {/* Resumen Aditivas/Deductivas */}
                {canViewAdminTabs && (
                  <Paper elevation={2} sx={{ p: 3, bgcolor: 'rgba(33, 150, 243, 0.05)', border: '1px solid rgba(33, 150, 243, 0.2)' }}>
                    <Typography variant="h6" sx={{ color: '#2196f3', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Plus className="w-5 h-5" />
                      Aditivas
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>Conceptos Aditivos</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                          {countDetallesAditivas}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>Importe Aditivas</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#2196f3' }}>
                          +${importeAditivas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>Conceptos Deductivos</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                          {countDetallesDeductivas}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>Importe Deductivas</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#f44336' }}>
                          -${importeDeductivas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                )}

                {/* Resumen Deducciones Extra */}
                {canViewAdminTabs && (
                  <Paper elevation={2} sx={{ p: 3, bgcolor: 'rgba(211, 47, 47, 0.05)', border: '1px solid rgba(211, 47, 47, 0.2)' }}>
                    <Typography variant="h6" sx={{ color: '#d32f2f', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Plus className="w-5 h-5" />
                      Deducciones Extra
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>Deducciones Extra</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#d32f2f' }}>
                          -${importeDeducciones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                )}

                {/* Resumen Retenciones */}
                {canViewAdminTabs && (
                  <Paper elevation={2} sx={{ p: 3, bgcolor: 'rgba(121, 85, 72, 0.05)', border: '1px solid rgba(121, 85, 72, 0.2)' }}>
                    <Typography variant="h6" sx={{ color: '#795548', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Plus className="w-5 h-5" />
                      Retenciones
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>Retenciones Totales</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#795548' }}>
                          ${importeRetenciones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>Retenciones Devueltas</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#4caf50' }}>
                          ${importeRetencionesDevueltas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>Retenciones Pendientes</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#ff9800' }}>
                          ${(importeRetenciones - importeRetencionesDevueltas).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                )}
              </Box>
            )}
          </TabPanel>

          {/* Pestaña 2: Ordinario */}
          <TabPanel value={activeTab} index={1}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Botón de aprobar catálogo (visible dentro de la pestaña Ordinario) */}
                {!catalogoAprobado && puedeAprobarCatalogo && conceptosOrdinario.length > 0 && (
                  <Alert 
                    severity="warning" 
                    icon={<AlertCircle className="w-5 h-5" />}
                    sx={{ mb: 2 }}
                    action={
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<CheckCircle className="w-4 h-4" />}
                        onClick={handleAprobarCatalogo}
                        disabled={aprobandoCatalogo}
                        sx={{
                          bgcolor: '#22c55e',
                          '&:hover': { bgcolor: '#16a34a' },
                          fontWeight: 600,
                          textTransform: 'none'
                        }}
                      >
                        {aprobandoCatalogo ? 'Aprobando...' : 'Aprobar Catálogo'}
                      </Button>
                    }
                  >
                    <strong>Catálogo Pendiente de Aprobación</strong> - Este catálogo tiene {conceptosOrdinario.length} conceptos y está listo para aprobar. Una vez aprobado, se bloqueará para edición.
                  </Alert>
                )}

                <ConceptosContratoTable
                  contratoId={contratoId}
                  conceptos={conceptosOrdinario}
                  onAdd={handleAddOrdinario}
                  onUpdate={handleUpdateOrdinario}
                  onDelete={handleDeleteOrdinario}
                  onReplaceCatalog={handleReplaceCatalogoOrdinario}
                  readOnly={readOnly || catalogoBloqueado}
                  catalogoBloqueado={catalogoBloqueado}
                />
              </>
            )}
          </TabPanel>

          {canViewAdminTabs && (
            <>
              {/* Pestaña 3: Aditiva */}
              <TabPanel value={activeTab} index={2}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <CambiosContratoTabs contratoId={contratoId} contrato={contrato} tabInicial={0} />
                )}
              </TabPanel>

              {/* Pestaña 4: Deductiva */}
              <TabPanel value={activeTab} index={3}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <CambiosContratoTabs contratoId={contratoId} contrato={contrato} tabInicial={1} />
                )}
              </TabPanel>

              {/* Pestaña 5: Deducciones Extra */}
              <TabPanel value={activeTab} index={4}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <DeduccionesExtra contratoId={contratoId} contrato={contrato} readOnly={esContratista} />
                )}
              </TabPanel>

              {/* Pestaña 6: Retenciones */}
              <TabPanel value={activeTab} index={5}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <RetencionesContrato contratoId={contratoId} contrato={contrato} readOnly={esContratista} />
                )}
              </TabPanel>

              {/* Pestaña 7: Extraordinario */}
              <TabPanel value={activeTab} index={6}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    {/* Tabla de Cambios Extraordinarios con Sistema de Aprobación */}
                    <CambiosExtrasTable
                      contratoId={contratoId}
                      puedeSubir={puedeSubirCambios}
                      puedeAutorizar={puedeAutorizarExtraordinarios}
                      onCambiosActualizados={loadConceptos}
                    />
                  </>
                )}
              </TabPanel>
            </>
          )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

export default ContratoConceptosModal
