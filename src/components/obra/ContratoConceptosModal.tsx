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
import { X, FileText, Calendar, Plus, Minus, Settings, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import ConceptosContratoTable from './ConceptosContratoTable'
import type { ConceptoContrato } from '@/types/concepto-contrato'
import type { Contrato } from '@/types/contrato'
import { db } from '@/db/database'
import { v4 as uuidv4 } from 'uuid'
import { syncService } from '@/sync/syncService'
import { Button, Alert, Stack, Chip } from '@mui/material'

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
        <Box sx={{ py: 3 }}>
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

  // Determinar permisos del usuario
  // Preferir datos del perfil (tabla perfiles). Fallback a user_metadata si no hay perfil cargado
  const userNivel = (perfil?.nivel as any) || (user?.user_metadata?.nivel as any) || ''
  const userTipo = (perfil?.roles?.[0] as any) || (user?.user_metadata?.roles?.[0] as any) || ''

  // Solo Administrador, Gerente Plataformas y Sistemas pueden ver pestañas 3, 4, 5 (índices 2, 3, 4)
  const canViewAdminTabs = 
    userNivel === 'Administrador' || 
    userTipo === 'Gerencia' || 
    userTipo === 'Plataforma'

  // Determinar si el usuario puede aprobar catálogos (NO contratistas)
  const esContratista = perfil?.roles?.some(r => r === 'CONTRATISTA' || r === 'USUARIO')
  const rolesAprobadores = [
    'Gerente Plataforma',
    'Gerencia',
    'Administracion',
    'Administración',
    'Supervisor Elara',
    'Finanzas',
    'Desarrollador'
  ]
  const puedeAprobarCatalogo = !esContratista && (
    perfil?.roles?.some(r => rolesAprobadores.includes(r)) || 
    user?.user_metadata?.roles?.some((r: string) => rolesAprobadores.includes(r))
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
      const extraordinarios = allConceptos.filter(c => c.metadata?.tipo === 'extraordinario')
      const aditivas = allConceptos.filter(c => c.metadata?.tipo === 'aditivas')
      
      setConceptosOrdinario(ordinarios)
      setConceptosExtraordinario(extraordinarios)
      setConceptosAditivas(aditivas)
    } catch (error) {
      console.error('Error cargando conceptos:', error)
    } finally {
      setLoading(false)
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
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          minHeight: '80vh'
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2px solid rgba(156, 39, 176, 0.1)',
          pb: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FileText className="w-6 h-6" style={{ color: '#9c27b0' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              Catálogos de Conceptos
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              {numeroContrato || `Contrato ${contratoId.slice(0, 8)}`}
            </Typography>
            {catalogoAprobado && (
              <Chip
                icon={<CheckCircle className="w-4 h-4" />}
                label={`Aprobado el ${new Date(contrato?.catalogo_fecha_aprobacion || '').toLocaleDateString()}`}
                size="small"
                sx={{ mt: 0.5, bgcolor: '#22c55e', color: 'white', fontWeight: 600 }}
              />
            )}
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

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px: 2,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.95rem',
                minHeight: 64,
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
                  key="extraordinario"
                  label="Extraordinario"
                  icon={<Plus className="w-4 h-4" />}
                  iconPosition="start"
                />,
                <Tab
                  key="aditivas"
                  label="Aditivas y Deductivas"
                  icon={<Minus className="w-4 h-4" />}
                  iconPosition="start"
                />,
                <Tab
                  key="administrador"
                  label="Administrador"
                  icon={<Settings className="w-4 h-4" />}
                  iconPosition="start"
                />
              ] : [])
            ]}
          </Tabs>
        </Box>

        <Box sx={{ px: 3, pb: 3 }}>
          {/* Alert de catálogo aprobado */}
          {catalogoAprobado && (
            <Alert 
              severity="success" 
              icon={<CheckCircle className="w-5 h-5" />}
              sx={{ mb: 2, mt: 2 }}
            >
              <strong>Catálogo Aprobado</strong> - Este catálogo está bloqueado. No se pueden agregar, editar o eliminar conceptos del catálogo ordinario. Para modificaciones, use Extraordinarios o Aditivas/Deductivas.
            </Alert>
          )}

          {/* Alert para contratistas cuando el catálogo no está aprobado */}
          {!catalogoAprobado && esContratista && conceptosOrdinario.length > 0 && (
            <Alert 
              severity="info" 
              icon={<AlertCircle className="w-5 h-5" />}
              sx={{ mb: 2, mt: 2 }}
            >
              Su catálogo está pendiente de aprobación por parte de la administración. Una vez aprobado, podrá crear requisiciones.
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
                      <Typography variant="caption" sx={{ color: '#64748b' }}>Importe Catálogo</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#9c27b0' }}>
                        ${conceptosOrdinario.reduce((sum, c) => sum + (c.importe_catalogo || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>Estimado a la Fecha</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                        ${conceptosOrdinario.reduce((sum, c) => sum + (c.monto_estimado_fecha || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
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
                        <Typography variant="caption" sx={{ color: '#64748b' }}>Conceptos</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>{conceptosExtraordinario.length}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>Importe Total</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#ff9800' }}>
                          ${conceptosExtraordinario.reduce((sum, c) => sum + (c.importe_catalogo || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                )}

                {/* Resumen Aditivas */}
                {canViewAdminTabs && (
                  <Paper elevation={2} sx={{ p: 3, bgcolor: 'rgba(33, 150, 243, 0.05)', border: '1px solid rgba(33, 150, 243, 0.2)' }}>
                    <Typography variant="h6" sx={{ color: '#2196f3', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Minus className="w-5 h-5" />
                      Aditivas/Deductivas
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>Conceptos</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>{conceptosAditivas.length}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>Importe Total</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#2196f3' }}>
                          ${conceptosAditivas.reduce((sum, c) => sum + (c.importe_catalogo || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
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
              {/* Pestaña 3: Extraordinario */}
              <TabPanel value={activeTab} index={2}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <ConceptosContratoTable
                    contratoId={contratoId}
                    conceptos={conceptosExtraordinario}
                    onAdd={(c) => handleAddConcepto(c, 'extraordinario', setConceptosExtraordinario)}
                    onUpdate={(id, u) => handleUpdateConcepto(id, u)}
                    onDelete={(id) => handleDeleteConcepto(id)}
                    onReplaceCatalog={(imp) => handleReplaceCatalogo(imp, 'extraordinario')}
                    readOnly={readOnly}
                    catalogoBloqueado={false}
                  />
                )}
              </TabPanel>

              {/* Pestaña 4: Aditivas y Deductivas */}
              <TabPanel value={activeTab} index={3}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <ConceptosContratoTable
                    contratoId={contratoId}
                    conceptos={conceptosAditivas}
                    onAdd={(c) => handleAddConcepto(c, 'aditivas', setConceptosAditivas)}
                    onUpdate={(id, u) => handleUpdateConcepto(id, u)}
                    onDelete={(id) => handleDeleteConcepto(id)}
                    onReplaceCatalog={(imp) => handleReplaceCatalogo(imp, 'aditivas')}
                    readOnly={readOnly}
                    catalogoBloqueado={false}
                  />
                )}
              </TabPanel>

              {/* Pestaña 5: Administrador */}
              <TabPanel value={activeTab} index={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    bgcolor: 'rgba(156, 39, 176, 0.05)',
                    border: '1px solid rgba(156, 39, 176, 0.2)',
                    borderRadius: 2,
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="h6" sx={{ color: '#64748b', mb: 1 }}>
                    Panel de Administrador
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    Configuración avanzada y controles
                  </Typography>
                </Paper>
              </TabPanel>
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  )
}

export default ContratoConceptosModal
