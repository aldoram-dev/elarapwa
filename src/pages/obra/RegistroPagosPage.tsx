import React, { useState, useEffect } from 'react';
import { SolicitudPago } from '@/types/solicitud-pago';
import { RequisicionPago } from '@/types/requisicion-pago';
import { db } from '@/db/database';
import { useContratos } from '@/lib/hooks/useContratos';
import { useContratistas } from '@/lib/hooks/useContratistas';
import { useAuth } from '@/context/AuthContext';
import { useContratistaFilters } from '@/lib/hooks/useContratistaFilters';
import { DesgloseSolicitudModal } from '@/components/obra/DesgloseSolicitudModal';
import { CaratulaRequisicionModal } from '@/components/obra/CaratulaRequisicionModal';
import { SimpleFileUpload } from '@/components/general/SimpleFileUpload';
import { useProyectoStore } from '@/stores/proyectoStore';
import { PagoRealizado } from '@/types/pago-realizado';
import { createPagosRealizadosBatch } from '@/lib/services/pagoRealizadoService';
import { getRequisicionesPago, getSolicitudesPago, getContratos, getPagosRealizados } from '@/lib/utils/dataHelpers';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select as MuiSelect,
  Stack,
  Typography,
  Checkbox,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  IconButton,
} from '@mui/material';
import {
  AttachMoney as AttachMoneyIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ClockIcon,
  Cancel as XCircleIcon,
  ThumbUp as ThumbUpIcon,
  Visibility as VisibilityIcon,
  Description as FileIcon,
  Assessment as AssessmentIcon,
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { syncService } from '../../sync/syncService';

export const RegistroPagosPage: React.FC = () => {
  const { perfil } = useAuth();
  const { proyectos } = useProyectoStore();
  const proyectoActual = proyectos[0];
  const [solicitudes, setSolicitudes] = useState<SolicitudPago[]>([]);
  const [requisiciones, setRequisiciones] = useState<RequisicionPago[]>([]);
  const [loading, setLoading] = useState(true);
  const { contratos } = useContratos();
  const { contratistas } = useContratistas();
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudPago | null>(null);
  const [mostrarDesglose, setMostrarDesglose] = useState(false);
  const [requisicionCaratula, setRequisicionCaratula] = useState<RequisicionPago | null>(null);
  const [mostrarCaratula, setMostrarCaratula] = useState(false);
  const [pagosRealizados, setPagosRealizados] = useState<PagoRealizado[]>([]);
  
  // Filtros
  const [filtroEstatus, setFiltroEstatus] = useState<string>('');
  const [filtroContrato, setFiltroContrato] = useState<string>('');
  const [filtroContratista, setFiltroContratista] = useState<string>('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState<string>('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState<string>('');
  const [filtroFolio, setFiltroFolio] = useState<string>('');
  const [filtroRequisicion, setFiltroRequisicion] = useState<string>('');
  
  // Ordenamiento
  const [orderBy, setOrderBy] = useState<string>('');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  
  // Filtros de texto para todas las columnas
  const [filtroTextoFolio, setFiltroTextoFolio] = useState('');
  const [filtroTextoRequisicion, setFiltroTextoRequisicion] = useState('');
  const [filtroTextoContrato, setFiltroTextoContrato] = useState('');
  const [filtroTextoContratista, setFiltroTextoContratista] = useState('');
  const [filtroTextoConcepto, setFiltroTextoConcepto] = useState('');
  const [filtroTextoFactura, setFiltroTextoFactura] = useState('');
  const [filtroTextoFecha, setFiltroTextoFecha] = useState('');
  const [filtroTextoFechaPago, setFiltroTextoFechaPago] = useState('');
  const [filtroTextoImporte, setFiltroTextoImporte] = useState('');
  const [filtroTextoRetencion, setFiltroTextoRetencion] = useState('');
  const [filtroTextoAnticipo, setFiltroTextoAnticipo] = useState('');
  const [filtroTextoIva, setFiltroTextoIva] = useState('');
  const [filtroTextoTotalNeto, setFiltroTextoTotalNeto] = useState('');
  const [filtroTextoPagado, setFiltroTextoPagado] = useState('');
  const [filtroTextoFaltante, setFiltroTextoFaltante] = useState('');
  const [filtroTextoComprobante, setFiltroTextoComprobante] = useState('');
  const [filtroTextoFechaPagoReal, setFiltroTextoFechaPagoReal] = useState('');
  const [filtroTextoEstatus, setFiltroTextoEstatus] = useState('');
  const [filtroTextoObservaciones, setFiltroTextoObservaciones] = useState('');

  // Hook para filtros de contratista
  const { filterSolicitudes, isContratista } = useContratistaFilters();

  // Permisos basados en ROLES
  const userRole = perfil?.roles?.[0] || perfil?.nivel || '';
  const esContratista = userRole === 'CONTRATISTA' || userRole === 'USUARIO';
  const canApproveDesa = userRole && ['DESARROLLADOR', 'Sistemas', 'SISTEMAS', 'Gerente Plataforma', 'Desarrollador'].includes(userRole);
  // Gerente Plataforma y Sistemas TAMBIÉN pueden dar Vo.Bo. de Finanzas (son todopoderosos)
  const canApproveFinanzas = userRole && ['FINANZAS', 'Gerente Plataforma', 'Sistemas', 'SISTEMAS'].includes(userRole);
  // Mostrar columna Vo.Bo. Finanzas a todos los usuarios autorizados (incluyendo FINANZAS)
  const mostrarVoBoFinanzas = canApproveFinanzas || userRole === 'Gerente Plataforma';
  // Contratistas NO pueden editar ni subir nada
  const canEditOrUpload = !esContratista;

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  useEffect(() => {
    // Solo cargar datos cuando los contratos estén disponibles
    if (contratos.length > 0 || !esContratista) {
      loadData();
    }
  }, [contratos.length, contratistas.length, esContratista]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Sincronizar automÃ¡ticamente si hay internet
      if (navigator.onLine) {
        try {
          console.log('ðŸ"„ Sincronizando solicitudes automÃ¡ticamente...');
          await syncService.syncAll();
          console.log('âœ… SincronizaciÃ³n completada');
        } catch (syncError) {
          console.warn('âš ï¸ Error en sincronizaciÃ³n automÃ¡tica:', syncError);
        }
      }
      
      // ✅ MODO ONLINE FORZADO: Consultar siempre Supabase directamente
      const solicitudesData = await getSolicitudesPago();
      const requisicionesData = await getRequisicionesPago();
      const pagosData = await getPagosRealizados();
      
      // Sincronizar contratistas desde el hook a IndexedDB
      if (contratistas.length > 0) {
        await db.contratistas.bulkPut(contratistas);
        console.log('Contratistas sincronizados a IndexedDB:', contratistas.length);
      }

      const todosLosContratistas = await db.contratistas.toArray();
      
      // � Cargar TODOS los contratos desde IndexedDB (sin filtro) para mostrar info
      const todosLosContratos = await db.contratos.toArray();
      console.log('📦 Contratos en IndexedDB para mostrar info:', todosLosContratos.length);
      console.log('📦 Contratistas en IndexedDB para mostrar info:', todosLosContratistas.length);
      
      // �🔒 Filtrar solicitudes con Vo.Bo. de gerencia O que ya están pagadas
      let solicitudesConVoBo = solicitudesData.filter(s => 
        s.vobo_gerencia === true || s.estatus_pago === 'PAGADO'
      );
      
      // 🔒 Si es contratista, filtrar solo sus solicitudes
      if (esContratista && perfil?.contratista_id) {
        console.log('🔍 FILTRO CONTRATISTA ACTIVO');
        console.log('   - Perfil contratista_id:', perfil.contratista_id);
        console.log('   - Total solicitudes antes de filtrar:', solicitudesConVoBo.length);
        
        solicitudesConVoBo = solicitudesConVoBo.filter(s => {
          const requisicion = requisicionesData.find(r => r.id?.toString() === s.requisicion_id?.toString());
          const contrato = todosLosContratos.find(c => c.id === requisicion?.contrato_id);
          
          const info = {
            solicitud_folio: s.folio,
            requisicion_id: s.requisicion_id,
            requisicion_encontrada: !!requisicion,
            requisicion_numero: requisicion?.numero,
            contrato_id: requisicion?.contrato_id,
            contrato_encontrado: !!contrato,
            contrato_numero: contrato?.numero_contrato,
            contrato_contratista_id: contrato?.contratista_id,
            perfil_contratista_id: perfil.contratista_id,
            coincide: contrato?.contratista_id === perfil.contratista_id
          };
          
          console.log(`   📋 Solicitud ${s.folio}:`, info);
          
          // Si no encuentra el contrato, mostrar todos los contratos disponibles para debug
          if (!contrato) {
            console.log('   ⚠️ Contrato no encontrado. Contratos disponibles:', todosLosContratos.map(c => ({
              id: c.id,
              numero: c.numero_contrato,
              contratista_id: c.contratista_id
            })));
            console.log('   ⚠️ Requisiciones disponibles:', requisicionesData.map(r => ({
              id: r.id,
              numero: r.numero,
              contrato_id: r.contrato_id
            })));
          }
          
          return contrato?.contratista_id === perfil.contratista_id;
        });
        
        console.log('   - Solicitudes después de filtrar:', solicitudesConVoBo.length);
      }
      
      console.log('📊 Total solicitudes en DB:', solicitudesData.length);
      console.log('📊 Solicitudes con Vo.Bo:', solicitudesData.filter(s => s.vobo_gerencia).length);
      console.log('📊 Solicitudes filtradas para usuario:', solicitudesConVoBo.length);
      
      // 🔍 Debug: Ver estado de TODAS las solicitudes
      console.log('🔍 DEBUG SOLICITUDES:');
      solicitudesData.forEach(s => {
        console.log(`  ${s.folio}: vobo_gerencia=${s.vobo_gerencia}, estado=${s.estado}, estatus_pago=${s.estatus_pago}, vobo_desa=${s.vobo_desarrollador}, vobo_fin=${s.vobo_finanzas}`);
      });
      
      setSolicitudes(solicitudesConVoBo.sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      ));
      setRequisiciones(requisicionesData);
      
      // Filtrar pagos realizados si es contratista
      let pagosFiltrados = pagosData;
      if (esContratista && perfil?.contratista_id) {
        pagosFiltrados = pagosData.filter(p => {
          const contrato = todosLosContratos.find(c => c.id === p.contrato_id);
          return contrato?.contratista_id === perfil.contratista_id;
        });
        console.log('   - Pagos realizados filtrados:', pagosFiltrados.length, 'de', pagosData.length);
      }
      
      setPagosRealizados(pagosFiltrados);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVoBoDesa = async (solicitud: SolicitudPago, checked: boolean) => {
    if (!canApproveDesa) {
      alert('No tienes permisos para dar Vo.Bo. de Desarrollador');
      return;
    }

    try {
      // Determinar si ambos Vo.Bo. estarÃ¡n activos
      const ambosVoBos = checked && solicitud.vobo_finanzas;
      
      const updated: SolicitudPago = {
        ...solicitud,
        vobo_desarrollador: checked,
        vobo_desarrollador_por: checked ? (perfil?.email || userRole || 'Usuario') : undefined,
        vobo_desarrollador_fecha: checked ? new Date().toISOString() : undefined,
        estado: ambosVoBos ? 'aprobada' : solicitud.estado, // âœ… Auto-aprobar
        _dirty: true,
      };

      await db.solicitudes_pago.put(updated);
      await syncService.forcePush();
      await loadData();
      alert(checked ? 'Vo.Bo. Desarrollador registrado' : 'Vo.Bo. Desarrollador removido');
    } catch (error) {
      console.error('Error actualizando Vo.Bo. Desa:', error);
      alert('Error al actualizar Vo.Bo.');
    }
  };

  const handleVoBoFinanzas = async (solicitud: SolicitudPago, checked: boolean) => {
    if (!canApproveFinanzas) {
      alert('No tienes permisos para dar Vo.Bo. de Finanzas');
      return;
    }

    try {
      // Determinar si ambos Vo.Bo. estarÃ¡n activos despuÃ©s de este cambio
      const ambosVoBos = checked && solicitud.vobo_desarrollador;
      
      const updated: SolicitudPago = {
        ...solicitud,
        vobo_finanzas: checked,
        vobo_finanzas_por: checked ? (perfil?.email || userRole || 'Usuario') : undefined,
        vobo_finanzas_fecha: checked ? new Date().toISOString() : undefined,
        estado: ambosVoBos ? 'aprobada' : solicitud.estado, // âœ… Actualizar estado si ambos VoBos
        _dirty: true,
      };

      await db.solicitudes_pago.put(updated);
      await syncService.forcePush();
      await loadData();
      alert(checked ? 'Vo.Bo. Finanzas registrado' : 'Vo.Bo. Finanzas removido');
    } catch (error) {
      console.error('Error actualizando Vo.Bo. Finanzas:', error);
      alert('Error al actualizar Vo.Bo.');
    }
  };



  const handleComprobanteSubido = async (solicitud: SolicitudPago, url: string) => {
    try {
      console.group('ðŸ“Ž COMPROBANTE SUBIDO - PAGO COMPLETO');
      console.log('URL recibida:', url);
      console.log('Solicitud ID:', solicitud.id);
      
      if (!url) {
        console.error('âŒ URL vacÃ­a recibida');
        console.groupEnd();
        alert('âŒ Error: No se recibiÃ³ URL vÃ¡lida del archivo');
        return;
      }

      // ðŸŽ¯ PAGO COMPLETO: Marcar toda la solicitud como PAGADA
      const fechaPago = new Date().toISOString();
      
      // El monto pagado es el total de la solicitud (ya incluye todos los descuentos)
      const requisicion = requisiciones.find(r => r.id?.toString() === solicitud.requisicion_id.toString());
      const contrato = contratos.find(c => c.id === requisicion?.contrato_id);
      const porcentajeRetencion = contrato?.retencion_porcentaje || 0;
      const porcentajeAnticipo = (contrato?.anticipo_monto && contrato?.monto_contrato)
        ? ((contrato.anticipo_monto / contrato.monto_contrato) * 100)
        : 0;
      const montoAPagar = solicitud.total; // Ya tiene retención, anticipo, y deducciones descontadas
      
      // Marcar TODOS los conceptos como pagados
      const conceptosActualizados = solicitud.conceptos_detalle.map(c => ({
        ...c,
        pagado: true,
        monto_pagado: c.importe,
        comprobante_url: url, // Mismo comprobante para todos
        fecha_pago: fechaPago,
      }));

      const updated: SolicitudPago = {
        ...solicitud,
        comprobante_pago_url: url,
        conceptos_detalle: conceptosActualizados,
        estatus_pago: 'PAGADO',
        estado: 'pagada', // ✅ Actualizar estado también
        monto_pagado: montoAPagar, // El total de la solicitud (neto real)
        fecha_pago: fechaPago,
        _dirty: true,
      };

      console.log('ðŸ’° Marcando solicitud completa como PAGADA:', {
        total: solicitud.total,
        conceptos_pagados: conceptosActualizados.length,
        fecha_pago: fechaPago,
      });

      const result = await db.solicitudes_pago.put(updated);
      console.log('âœ… Guardado en DB. ID:', result);
      
      // 💰 CREAR REGISTROS EN PAGOS_REALIZADOS
      console.log('📝 Creando registros en pagos_realizados...');
      console.log('  📋 Datos del contrato:', {
        id: contrato?.id,
        numero: contrato?.numero_contrato,
        retencion: porcentajeRetencion,
        anticipo: porcentajeAnticipo,
        contratista_id: contrato?.contratista_id
      });
      console.log('  📋 Conceptos a procesar:', conceptosActualizados.length);
      
      const pagosRealizados: Omit<PagoRealizado, 'id' | 'created_at' | 'updated_at'>[] = conceptosActualizados.map((concepto, idx) => {
        const montoBruto = concepto.importe;
        const montoRetencionConcepto = montoBruto * (porcentajeRetencion / 100);
        const montoAnticipoConcepto = montoBruto * (porcentajeAnticipo / 100);
        const montoNetoConcepto = montoBruto - montoRetencionConcepto - montoAnticipoConcepto;
        
        console.log(`    💰 Concepto ${idx + 1}/${conceptosActualizados.length}:`, {
          concepto_id: concepto.concepto_id,
          clave: concepto.concepto_clave,
          bruto: montoBruto,
          retencion: montoRetencionConcepto,
          anticipo: montoAnticipoConcepto,
          neto: montoNetoConcepto
        });
        
        return {
          solicitud_pago_id: String(solicitud.id!),
          requisicion_pago_id: solicitud.requisicion_id,
          contrato_id: contrato?.id || '',
          concepto_contrato_id: concepto.concepto_id,
          contratista_id: contrato?.contratista_id,
          
          concepto_clave: concepto.concepto_clave,
          concepto_descripcion: concepto.concepto_descripcion,
          concepto_unidad: '',
          
          cantidad: concepto.cantidad,
          precio_unitario: concepto.precio_unitario,
          importe_concepto: montoBruto,
          
          monto_bruto: montoBruto,
          retencion_porcentaje: porcentajeRetencion,
          retencion_monto: montoRetencionConcepto,
          anticipo_porcentaje: porcentajeAnticipo,
          anticipo_monto: montoAnticipoConcepto,
          monto_neto_pagado: montoNetoConcepto,
          
          fecha_pago: fechaPago,
          metodo_pago: 'TRANSFERENCIA',
          
          comprobante_pago_url: url,
          factura_url: requisicion?.factura_url,
          
          folio_solicitud: solicitud.folio,
          folio_requisicion: requisicion?.numero || '',
          numero_contrato: contrato?.numero_contrato || contrato?.clave_contrato,
          
          estatus: 'PAGADO',
          pagado_por: perfil?.id,
          
          active: true,
        };
      });
      
      console.log('  🚀 Llamando a createPagosRealizadosBatch con', pagosRealizados.length, 'registros...');
      try {
        const result2 = await createPagosRealizadosBatch(pagosRealizados);
        console.log(`  ✅ ${result2.length} registros creados en pagos_realizados`, result2);
        
        // Verificar que se guardaron
        const verificacion = await db.pagos_realizados.where('solicitud_pago_id').equals(String(solicitud.id!)).toArray();
        console.log(`  🔍 Verificación: ${verificacion.length} registros encontrados en DB para solicitud ${solicitud.id}`);
        
        // ✅ RECARGAR DATOS para actualizar el resumen financiero
        console.log('  🔄 Recargando datos para actualizar UI...');
        await loadData();
        console.log('  ✅ Datos recargados, resumen financiero actualizado');
      } catch (error) {
        console.error('  ❌ ERROR al crear pagos_realizados:', error);
        throw error;
      }
      
      // Actualizar el estado local inmediatamente
      setSolicitudes(prev => {
        const newState = prev.map(s => {
          if (s.id === solicitud.id) {
            console.log('âœ… Actualizando estado local para solicitud:', s.id);
            return updated;
          }
          return s;
        });
        console.log('Nuevas solicitudes en estado:', newState.length);
        return newState;
      });
      
      console.log('Iniciando sincronizaciÃ³n con servidor...');
      // Sincronizar con el servidor
      syncService.forcePush().then(() => {
        console.log('âœ… SincronizaciÃ³n completada');
      }).catch(err => {
        console.error('âš ï¸ Error sincronizando:', err);
      });
      
      console.groupEnd();
      
      // Confirmar al usuario
      setTimeout(() => {
        alert('âœ… Pago completo registrado!\n\n' +
              `â€¢ Total pagado: $${solicitud.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n` +
              `â€¢ ${conceptosActualizados.length} conceptos marcados como pagados\n` +
              'â€¢ Estatus: PAGADO');
      }, 800);
    } catch (error) {
      console.error('âŒ Error guardando comprobante:', error);
      console.groupEnd();
      alert('âŒ Error al guardar el comprobante: ' + (error instanceof Error ? error.message : 'Desconocido'));
    }
  };

  const handleAbrirDesglose = (solicitud: SolicitudPago) => {
    setSolicitudSeleccionada(solicitud);
    setMostrarDesglose(true);
  };

  const getEstatusPagoBadge = (estatus?: string) => {
    if (!estatus) return <Chip label="NO PAGADO" color="default" size="small" />;
    
    const config = {
      'NO PAGADO': { color: 'default' as const },
      'PAGADO': { color: 'success' as const },
      'PAGADO PARCIALMENTE': { color: 'warning' as const }
    };

    const color = config[estatus as keyof typeof config]?.color || 'default';
    return <Chip label={estatus} color={color} size="small" sx={{ fontWeight: 600 }} />;
  };

  const solicitudesFiltradas = solicitudes.filter(sol => {
    const requisicion = requisiciones.find(r => r.id?.toString() === sol.requisicion_id?.toString());
    const contrato = contratos.find(c => c.id === requisicion?.contrato_id);
    const contratista = contratistas.find(ct => ct.id === contrato?.contratista_id);
    
    // Cálculos para filtros
    const importeBruto = requisicion?.monto_estimado || 0;
    const montoRetencion = requisicion?.retencion || 0;
    const montoAnticipo = requisicion?.amortizacion || 0;
    const llevaIva = requisicion?.lleva_iva ?? (contrato?.tratamiento === 'MAS IVA');
    const montoIva = requisicion?.iva || 0;
    // ✅ El total de la requisición YA incluye todos los descuentos (retención, anticipo, deducciones) + IVA
    const totalNeto = requisicion?.total || 0;
    const montoPagado = sol.monto_pagado || 0;
    const faltante = totalNeto - montoPagado;
    
    // Filtros de texto para todas las columnas
    if (filtroTextoFolio && !sol.folio.toLowerCase().includes(filtroTextoFolio.toLowerCase())) return false;
    if (filtroTextoRequisicion && !(requisicion?.numero || '').toLowerCase().includes(filtroTextoRequisicion.toLowerCase())) return false;
    
    if (filtroTextoContrato) {
      const contratoTexto = `${contrato?.clave_contrato || ''} ${contrato?.numero_contrato || ''} ${contrato?.nombre || ''}`.toLowerCase();
      if (!contratoTexto.includes(filtroTextoContrato.toLowerCase())) return false;
    }
    
    if (filtroTextoContratista && !(contratista?.nombre || '').toLowerCase().includes(filtroTextoContratista.toLowerCase())) return false;
    
    if (filtroTextoConcepto) {
      const conceptoTexto = sol.conceptos_detalle?.map(c => c.concepto_descripcion || '').join(' ').toLowerCase() || '';
      if (!conceptoTexto.includes(filtroTextoConcepto.toLowerCase())) return false;
    }
    
    if (filtroTextoFactura) {
      const facturaTexto = requisicion?.factura_url ? 'con factura' : 'sin factura';
      if (!facturaTexto.toLowerCase().includes(filtroTextoFactura.toLowerCase())) return false;
    }
    
    if (filtroTextoFecha) {
      const fechaFormateada = new Date(sol.fecha).toLocaleDateString('es-MX');
      if (!fechaFormateada.includes(filtroTextoFecha)) return false;
    }
    
    if (filtroTextoFechaPago) {
      const fechaPagoFormateada = sol.fecha_pago_esperada ? new Date(sol.fecha_pago_esperada).toLocaleDateString('es-MX') : 'sin fecha';
      if (!fechaPagoFormateada.toLowerCase().includes(filtroTextoFechaPago.toLowerCase())) return false;
    }
    
    if (filtroTextoImporte && !importeBruto.toFixed(2).includes(filtroTextoImporte)) return false;
    if (filtroTextoRetencion && !montoRetencion.toFixed(2).includes(filtroTextoRetencion)) return false;
    if (filtroTextoAnticipo && !montoAnticipo.toFixed(2).includes(filtroTextoAnticipo)) return false;
    if (filtroTextoIva && !montoIva.toFixed(2).includes(filtroTextoIva)) return false;
    if (filtroTextoTotalNeto && !totalNeto.toFixed(2).includes(filtroTextoTotalNeto)) return false;
    if (filtroTextoPagado && !montoPagado.toFixed(2).includes(filtroTextoPagado)) return false;
    if (filtroTextoFaltante && !faltante.toFixed(2).includes(filtroTextoFaltante)) return false;
    
    if (filtroTextoComprobante) {
      const comprobanteTexto = sol.comprobante_pago_url ? 'con comprobante' : 'sin comprobante';
      if (!comprobanteTexto.includes(filtroTextoComprobante.toLowerCase())) return false;
    }
    
    if (filtroTextoFechaPagoReal) {
      const fechaPagoRealFormateada = sol.fecha_pago ? new Date(sol.fecha_pago).toLocaleDateString('es-MX') : 'sin fecha';
      if (!fechaPagoRealFormateada.toLowerCase().includes(filtroTextoFechaPagoReal.toLowerCase())) return false;
    }
    
    if (filtroTextoEstatus && !(sol.estatus_pago || '').toLowerCase().includes(filtroTextoEstatus.toLowerCase())) return false;
    if (filtroTextoObservaciones && !(sol.notas || '').toLowerCase().includes(filtroTextoObservaciones.toLowerCase())) return false;
    
    // Filtros originales de dropdowns
    if (filtroEstatus && sol.estatus_pago !== filtroEstatus) return false;
    if (filtroContrato && contrato?.id !== filtroContrato) return false;
    if (filtroContratista && contrato?.contratista_id !== filtroContratista) return false;
    if (filtroFechaDesde && new Date(sol.fecha) < new Date(filtroFechaDesde)) return false;
    if (filtroFechaHasta && new Date(sol.fecha) > new Date(filtroFechaHasta)) return false;
    if (filtroFolio && !sol.folio.toLowerCase().includes(filtroFolio.toLowerCase())) return false;
    if (filtroRequisicion && !requisicion?.numero?.toLowerCase().includes(filtroRequisicion.toLowerCase())) return false;
    
    return true;
  }).sort((a, b) => {
    const reqA = requisiciones.find(r => r.id?.toString() === a.requisicion_id?.toString());
    const reqB = requisiciones.find(r => r.id?.toString() === b.requisicion_id?.toString());
    const contratoA = contratos.find(c => c.id === reqA?.contrato_id);
    const contratoB = contratos.find(c => c.id === reqB?.contrato_id);
    const contratistaA = contratistas.find(ct => ct.id === contratoA?.contratista_id);
    const contratistaB = contratistas.find(ct => ct.id === contratoB?.contratista_id);
    
    let compareValue = 0;
    
    switch (orderBy) {
      case 'folio':
        compareValue = a.folio.localeCompare(b.folio);
        break;
      case 'requisicion':
        compareValue = (reqA?.numero || '').localeCompare(reqB?.numero || '');
        break;
      case 'contrato':
        compareValue = (contratoA?.numero_contrato || '').localeCompare(contratoB?.numero_contrato || '');
        break;
      case 'contratista':
        compareValue = (contratistaA?.nombre || '').localeCompare(contratistaB?.nombre || '');
        break;
      case 'concepto':
        const conceptoA = a.conceptos_detalle?.map(c => c.concepto_descripcion || '').join(' ') || '';
        const conceptoB = b.conceptos_detalle?.map(c => c.concepto_descripcion || '').join(' ') || '';
        compareValue = conceptoA.localeCompare(conceptoB);
        break;
      case 'factura':
        const facturaA = reqA?.factura_url || '';
        const facturaB = reqB?.factura_url || '';
        compareValue = facturaA.localeCompare(facturaB);
        break;
      case 'fecha':
        compareValue = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
        break;
      case 'fecha_pago':
        const fechaPagoA = a.fecha_pago_esperada ? new Date(a.fecha_pago_esperada).getTime() : 0;
        const fechaPagoB = b.fecha_pago_esperada ? new Date(b.fecha_pago_esperada).getTime() : 0;
        compareValue = fechaPagoA - fechaPagoB;
        break;
      case 'importe':
        compareValue = (reqA?.monto_estimado || 0) - (reqB?.monto_estimado || 0);
        break;
      case 'retencion':
        compareValue = (reqA?.retencion || 0) - (reqB?.retencion || 0);
        break;
      case 'anticipo':
        compareValue = (reqA?.amortizacion || 0) - (reqB?.amortizacion || 0);
        break;
      case 'iva':
        const ivaA = reqA?.iva || 0;
        const ivaB = reqB?.iva || 0;
        compareValue = ivaA - ivaB;
        break;
      case 'total_neto':
        // ✅ El total de la requisición YA incluye todos los descuentos + IVA
        const totalNetoA = reqA?.total || 0;
        const totalNetoB = reqB?.total || 0;
        compareValue = totalNetoA - totalNetoB;
        break;
      case 'pagado':
        compareValue = (a.monto_pagado || 0) - (b.monto_pagado || 0);
        break;
      case 'faltante':
        // ✅ Faltante = Total (ya neto) - Pagado
        const faltanteA = (reqA?.total || 0) - (a.monto_pagado || 0);
        const faltanteB = (reqB?.total || 0) - (b.monto_pagado || 0);
        compareValue = faltanteA - faltanteB;
        break;
      case 'fecha_pago_real':
        const fechaPagoRealA = a.fecha_pago ? new Date(a.fecha_pago).getTime() : 0;
        const fechaPagoRealB = b.fecha_pago ? new Date(b.fecha_pago).getTime() : 0;
        compareValue = fechaPagoRealA - fechaPagoRealB;
        break;
      case 'estatus':
        compareValue = (a.estatus_pago || '').localeCompare(b.estatus_pago || '');
        break;
      default:
        compareValue = 0;
    }
    
    return order === 'asc' ? compareValue : -compareValue;
  });

  // Calcular resumen financiero completo basado en contratos y pagos realizados
  
  // Obtener contratos únicos de las solicitudes filtradas
  const contratosEnUso = Array.from(
    new Set(
      solicitudesFiltradas.map(sol => {
        const req = requisiciones.find(r => r.id?.toString() === sol.requisicion_id?.toString());
        return req?.contrato_id;
      }).filter(Boolean)
    )
  ).map(contratoId => contratos.find(c => c.id === contratoId)).filter(Boolean);

  // Si hay filtro de contrato, usar solo ese contrato
  const contratosParaResumen = filtroContrato 
    ? contratos.filter(c => c.id === filtroContrato)
    : contratosEnUso;

  // Sumar montos de contratos
  const montoTotalContratos = contratosParaResumen.reduce((sum, c) => sum + (c?.monto_contrato || 0), 0);
  const anticipoTotalContratos = contratosParaResumen.reduce((sum, c) => sum + (c?.anticipo_monto || 0), 0);
  
  // Filtrar pagos realizados según el filtro activo
  const pagosFiltrados = filtroContrato
    ? pagosRealizados.filter(p => p.contrato_id === filtroContrato && p.estatus === 'PAGADO')
    : pagosRealizados.filter(p => 
        contratosParaResumen.some(c => c?.id === p.contrato_id) && p.estatus === 'PAGADO'
      );
  
  console.log('📊 RESUMEN REGISTRO DE PAGOS:');
  console.log('  Contratos para resumen:', contratosParaResumen.length, contratosParaResumen.map(c => ({ id: c?.id, numero: c?.numero_contrato })));
  console.log('  Total pagos_realizados:', pagosRealizados.length);
  console.log('  Ejemplo de pagos:', pagosRealizados.slice(0, 3).map(p => ({ 
    contrato_id: p.contrato_id, 
    estatus: p.estatus,
    monto_bruto: p.monto_bruto,
    monto_neto: p.monto_neto_pagado
  })));
  console.log('  Pagos filtrados:', pagosFiltrados.length);
  console.log('  Solicitudes totales:', solicitudes.length);
  console.log('  Solicitudes filtradas:', solicitudesFiltradas.length);
  
  // Calcular totales de pagos realizados
  const totalEjercidoBruto = pagosFiltrados.reduce((sum, p) => sum + p.monto_bruto, 0);
  const totalRetencionesAcumuladas = pagosFiltrados.reduce((sum, p) => sum + p.retencion_monto, 0);
  const totalAnticipoAmortizado = pagosFiltrados.reduce((sum, p) => sum + p.anticipo_monto, 0);
  const totalPagadoNeto = pagosFiltrados.reduce((sum, p) => sum + p.monto_neto_pagado, 0);
  
  console.log('  💰 Ejercido Bruto:', totalEjercidoBruto);
  console.log('  💰 Retenciones:', totalRetencionesAcumuladas);
  console.log('  💰 Anticipo Amortizado:', totalAnticipoAmortizado);
  console.log('  💰 Pagado Neto:', totalPagadoNeto);
  
  // Calcular pendientes
  const pendientePorEjercer = montoTotalContratos - totalEjercidoBruto;
  const anticipoPendienteAmortizar = anticipoTotalContratos - totalAnticipoAmortizado;

  // Función para corregir montos pagados
  const corregirMontosPagados = async () => {
    if (!confirm('Esto actualizará TODAS las solicitudes PAGADAS. ¿Continuar?')) return;
    
    try {
      // Obtener todas las solicitudes y filtrar manualmente
      // ✅ MODO ONLINE FORZADO
      const todasSolicitudes = await getSolicitudesPago();
      const todasRequisiciones = await getRequisicionesPago();
      const solicitudesPagadas = todasSolicitudes.filter(s => s.estatus_pago === 'PAGADO');
      
      console.log(`📋 Total solicitudes pagadas: ${solicitudesPagadas.length}`);
      
      let actualizadas = 0;
      
      for (const solicitud of solicitudesPagadas) {
        // Buscar la requisición correspondiente
        const requisicion = todasRequisiciones.find(r => r.id?.toString() === solicitud.requisicion_id?.toString());
        
        if (!requisicion) {
          console.warn(`⚠️ No se encontró requisición para solicitud ${solicitud.folio}`);
          continue;
        }
        
        const montoActual = solicitud.monto_pagado || 0;
        const montoCorrect = requisicion.total || 0; // El total de la requisición es el correcto
        
        console.log(`Solicitud ${solicitud.folio}: pagado=$${montoActual.toFixed(2)} vs correcto=$${montoCorrect.toFixed(2)}`);
        
        if (Math.abs(montoActual - montoCorrect) > 0.01) {
          await db.solicitudes_pago.update(solicitud.id, {
            monto_pagado: montoCorrect,
            _dirty: true
          });
          actualizadas++;
          console.log(`  ✅ Corregido: $${montoActual.toFixed(2)} → $${montoCorrect.toFixed(2)}`);
        }
      }
      
      console.log(`\n✅ ${actualizadas} solicitudes corregidas de ${solicitudesPagadas.length} revisadas`);
      alert(`✅ ${actualizadas} solicitudes corregidas de ${solicitudesPagadas.length} revisadas`);
      await loadData();
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al corregir montos');
    }
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 2, md: 3 } }}>
      <Container maxWidth={false} sx={{ px: { xs: 2, sm: 2, md: 2, lg: 3, xl: 4 }, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <AssessmentIcon sx={{ fontSize: 40, color: '#334155' }} />
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  Registro y Aprobación de Pagos
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Gestión completa de pagos por solicitud y concepto
                </Typography>
              </Box>
            </Stack>
            <Button
              variant="outlined"
              onClick={async () => {
                try {
                  await syncService.syncAll();
                  await loadData();
                  alert('âœ… SincronizaciÃ³n completada');
                } catch (error) {
                  console.error('Error sincronizando:', error);
                  alert('âŒ Error en sincronizaciÃ³n');
                }
              }}
            >
              Sincronizar
            </Button>
          </Stack>
        </Box>

        {/* Tarjetas de Resumen */}
        {!loading && solicitudesFiltradas.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 1 }}>
              {/* Importe Bruto Total */}
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 2.5, 
                  minWidth: 200, 
                  bgcolor: 'primary.50',
                  borderLeft: '4px solid',
                  borderColor: 'primary.main'
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                  IMPORTE BRUTO
                </Typography>
                <Typography variant="h5" fontWeight={700} color="primary.dark">
                  ${solicitudesFiltradas.reduce((sum, s) => {
                    const req = requisiciones.find(r => r.id?.toString() === s.requisicion_id.toString());
                    return sum + (req?.monto_estimado || 0);
                  }, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {solicitudesFiltradas.length} solicitud{solicitudesFiltradas.length !== 1 ? 'es' : ''}
                </Typography>
              </Paper>

              {/* Retenciones */}
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 2.5, 
                  minWidth: 180, 
                  bgcolor: 'error.50',
                  borderLeft: '4px solid',
                  borderColor: 'error.main'
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                  RETENCIONES
                </Typography>
                <Typography variant="h5" fontWeight={700} color="error.dark">
                  -${solicitudesFiltradas.reduce((sum, s) => {
                    const req = requisiciones.find(r => r.id?.toString() === s.requisicion_id.toString());
                    return sum + (req?.retencion || 0);
                  }, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Deducciones
                </Typography>
              </Paper>

              {/* Anticipos */}
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 2.5, 
                  minWidth: 180, 
                  bgcolor: 'warning.50',
                  borderLeft: '4px solid',
                  borderColor: 'warning.main'
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                  ANTICIPOS
                </Typography>
                <Typography variant="h5" fontWeight={700} color="warning.dark">
                  -${solicitudesFiltradas.reduce((sum, s) => {
                    const req = requisiciones.find(r => r.id?.toString() === s.requisicion_id.toString());
                    return sum + (req?.amortizacion || 0);
                  }, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Amortizaciones
                </Typography>
              </Paper>

              {/* IVA */}
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 2.5, 
                  minWidth: 180, 
                  bgcolor: 'info.50',
                  borderLeft: '4px solid',
                  borderColor: 'info.main'
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                  IVA (16%)
                </Typography>
                <Typography variant="h5" fontWeight={700} color="info.dark">
                  +${solicitudesFiltradas.reduce((sum, s) => {
                    const req = requisiciones.find(r => r.id?.toString() === s.requisicion_id.toString());
                    if (!req) return sum;
                    const contrato = contratos.find(c => c.id === req?.contrato_id);
                    const llevaIva = req?.lleva_iva ?? (contrato?.tratamiento === 'MAS IVA');
                    const montoIva = llevaIva ? ((req.total / 1.16) * 0.16) : 0;
                    return sum + montoIva;
                  }, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {solicitudesFiltradas.filter(s => {
                    const req = requisiciones.find(r => r.id?.toString() === s.requisicion_id.toString());
                    return req?.lleva_iva;
                  }).length} con IVA
                </Typography>
              </Paper>

              {/* Total Neto */}
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 2.5, 
                  minWidth: 200, 
                  bgcolor: 'success.50',
                  borderLeft: '4px solid',
                  borderColor: 'success.main'
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                  TOTAL NETO
                </Typography>
                <Typography variant="h5" fontWeight={700} color="success.dark">
                  ${solicitudesFiltradas.reduce((sum, s) => {
                    const req = requisiciones.find(r => r.id?.toString() === s.requisicion_id.toString());
                    return sum + (req?.total || 0);
                  }, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  A pagar
                </Typography>
              </Paper>
            </Stack>
          </Box>
        )}

        {/* Filtros */}
        <Paper sx={{ p: { xs: 1.5, md: 2 }, mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              Filtros de Búsqueda
            </Typography>
            {(filtroEstatus || filtroContrato || filtroContratista || filtroFechaDesde || filtroFechaHasta || filtroFolio || filtroRequisicion) && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => {
                  setFiltroEstatus('');
                  setFiltroContrato('');
                  setFiltroContratista('');
                  setFiltroFechaDesde('');
                  setFiltroFechaHasta('');
                  setFiltroFolio('');
                  setFiltroRequisicion('');
                  // Limpiar filtros de texto
                  setFiltroTextoFolio('');
                  setFiltroTextoRequisicion('');
                  setFiltroTextoContrato('');
                  setFiltroTextoContratista('');
                  setFiltroTextoConcepto('');
                  setFiltroTextoFactura('');
                  setFiltroTextoFecha('');
                  setFiltroTextoFechaPago('');
                  setFiltroTextoImporte('');
                  setFiltroTextoRetencion('');
                  setFiltroTextoAnticipo('');
                  setFiltroTextoIva('');
                  setFiltroTextoTotalNeto('');
                  setFiltroTextoPagado('');
                  setFiltroTextoFaltante('');
                  setFiltroTextoComprobante('');
                  setFiltroTextoFechaPagoReal('');
                  setFiltroTextoEstatus('');
                  setFiltroTextoObservaciones('');
                }}
              >
                Limpiar Filtros
              </Button>
            )}
          </Stack>
          
          {/* Primera fila: Búsqueda rápida */}
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Búsqueda Rápida</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(2, 1fr)' }, gap: 2, mb: 2 }}>
            <TextField
              size="small"
              label="Folio de Solicitud"
              placeholder="Buscar por folio..."
              value={filtroFolio}
              onChange={(e) => setFiltroFolio(e.target.value)}
              fullWidth
            />
            <TextField
              size="small"
              label="Número de Requisición"
              placeholder="Buscar por requisición..."
              value={filtroRequisicion}
              onChange={(e) => setFiltroRequisicion(e.target.value)}
              fullWidth
            />
          </Box>
          
          {/* Segunda fila: Filtros por categoría */}
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Filtros Avanzados</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Estatus de Pago</InputLabel>
              <MuiSelect
                value={filtroEstatus}
                onChange={(e) => setFiltroEstatus(e.target.value)}
                label="Estatus de Pago"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="NO PAGADO">NO PAGADO</MenuItem>
                <MenuItem value="PAGADO">PAGADO</MenuItem>
                <MenuItem value="PAGADO PARCIALMENTE">PAGADO PARCIALMENTE</MenuItem>
              </MuiSelect>
            </FormControl>
            
            <FormControl size="small" fullWidth>
              <InputLabel>Contrato</InputLabel>
              <MuiSelect
                value={filtroContrato}
                onChange={(e) => setFiltroContrato(e.target.value)}
                label="Contrato"
              >
                <MenuItem value="">Todos</MenuItem>
                {contratos.map(c => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.numero_contrato || c.nombre}
                  </MenuItem>
                ))}
              </MuiSelect>
            </FormControl>
            
            <FormControl size="small" fullWidth>
              <InputLabel>Contratista</InputLabel>
              <MuiSelect
                value={filtroContratista}
                onChange={(e) => setFiltroContratista(e.target.value)}
                label="Contratista"
              >
                <MenuItem value="">Todos</MenuItem>
                {contratistas.map(c => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.nombre}
                  </MenuItem>
                ))}
              </MuiSelect>
            </FormControl>
            
            <TextField
              size="small"
              label="Fecha Desde"
              type="date"
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            
            <TextField
              size="small"
              label="Fecha Hasta"
              type="date"
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
          
          {/* Resumen de filtros activos */}
          {(filtroEstatus || filtroContrato || filtroContratista || filtroFechaDesde || filtroFechaHasta || filtroFolio || filtroRequisicion) && (
            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.lighter', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Mostrando:</strong> {solicitudesFiltradas.length} de {solicitudes.length} solicitudes
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Tabla */}
        {loading ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="body1" sx={{ mt: 2 }}>Cargando...</Typography>
          </Paper>
        ) : solicitudesFiltradas.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="h6">No hay solicitudes</Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} elevation={3} sx={{ maxHeight: { xs: 'calc(100vh - 360px)', md: 'calc(100vh - 320px)' }, overflowX: 'auto' }}>
            <Table stickyHeader size="medium" sx={{ minWidth: 1800 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'folio'}
                        direction={orderBy === 'folio' ? order : 'asc'}
                        onClick={() => handleRequestSort('folio')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        Folio
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoFolio}
                        onChange={(e) => setFiltroTextoFolio(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'requisicion'}
                        direction={orderBy === 'requisicion' ? order : 'asc'}
                        onClick={() => handleRequestSort('requisicion')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        Requisición
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoRequisicion}
                        onChange={(e) => setFiltroTextoRequisicion(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'contrato'}
                        direction={orderBy === 'contrato' ? order : 'asc'}
                        onClick={() => handleRequestSort('contrato')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        Contrato
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoContrato}
                        onChange={(e) => setFiltroTextoContrato(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'contratista'}
                        direction={orderBy === 'contratista' ? order : 'asc'}
                        onClick={() => handleRequestSort('contratista')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        Contratista
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoContratista}
                        onChange={(e) => setFiltroTextoContratista(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'concepto'}
                        direction={orderBy === 'concepto' ? order : 'asc'}
                        onClick={() => handleRequestSort('concepto')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        Concepto General
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoConcepto}
                        onChange={(e) => setFiltroTextoConcepto(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'factura'}
                        direction={orderBy === 'factura' ? order : 'asc'}
                        onClick={() => handleRequestSort('factura')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        Factura
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoFactura}
                        onChange={(e) => setFiltroTextoFactura(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'fecha'}
                        direction={orderBy === 'fecha' ? order : 'asc'}
                        onClick={() => handleRequestSort('fecha')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        Fecha
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoFecha}
                        onChange={(e) => setFiltroTextoFecha(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'fecha_pago'}
                        direction={orderBy === 'fecha_pago' ? order : 'asc'}
                        onClick={() => handleRequestSort('fecha_pago')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        Fecha Pago Esperada
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoFechaPago}
                        onChange={(e) => setFiltroTextoFechaPago(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'importe'}
                        direction={orderBy === 'importe' ? order : 'asc'}
                        onClick={() => handleRequestSort('importe')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        <Tooltip title="Total de la solicitud. Puede incluir IVA (16%) según el tratamiento del contrato">
                          <span>Importe Bruto</span>
                        </Tooltip>
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoImporte}
                        onChange={(e) => setFiltroTextoImporte(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'retencion'}
                        direction={orderBy === 'retencion' ? order : 'asc'}
                        onClick={() => handleRequestSort('retencion')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        Retención
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoRetencion}
                        onChange={(e) => setFiltroTextoRetencion(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'anticipo'}
                        direction={orderBy === 'anticipo' ? order : 'asc'}
                        onClick={() => handleRequestSort('anticipo')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        Anticipo
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoAnticipo}
                        onChange={(e) => setFiltroTextoAnticipo(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'iva'}
                        direction={orderBy === 'iva' ? order : 'asc'}
                        onClick={() => handleRequestSort('iva')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        IVA (16%)
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoIva}
                        onChange={(e) => setFiltroTextoIva(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'total_neto'}
                        direction={orderBy === 'total_neto' ? order : 'asc'}
                        onClick={() => handleRequestSort('total_neto')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        Total Neto
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoTotalNeto}
                        onChange={(e) => setFiltroTextoTotalNeto(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'pagado'}
                        direction={orderBy === 'pagado' ? order : 'asc'}
                        onClick={() => handleRequestSort('pagado')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        Pagado
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoPagado}
                        onChange={(e) => setFiltroTextoPagado(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'faltante'}
                        direction={orderBy === 'faltante' ? order : 'asc'}
                        onClick={() => handleRequestSort('faltante')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        Faltante
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoFaltante}
                        onChange={(e) => setFiltroTextoFaltante(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>
                    <Stack spacing={0.5}>
                      <Box sx={{ color: '#fff', fontWeight: 700 }}>Comprobante</Box>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoComprobante}
                        onChange={(e) => setFiltroTextoComprobante(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'fecha_pago_real'}
                        direction={orderBy === 'fecha_pago_real' ? order : 'asc'}
                        onClick={() => handleRequestSort('fecha_pago_real')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        Fecha Pago
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoFechaPagoReal}
                        onChange={(e) => setFiltroTextoFechaPagoReal(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="center" sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'estatus'}
                        direction={orderBy === 'estatus' ? order : 'asc'}
                        onClick={() => handleRequestSort('estatus')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        Estatus
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoEstatus}
                        onChange={(e) => setFiltroTextoEstatus(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  {canApproveDesa && (
                    <TableCell align="center" sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>Vo.Bo. Desarr.</TableCell>
                  )}
                  {mostrarVoBoFinanzas && (
                    <TableCell align="center" sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>Vo.Bo. Finanzas</TableCell>
                  )}
                  <TableCell sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, minWidth: 200, py: 1.5 }}>
                    <Stack spacing={0.5}>
                      <Box sx={{ color: '#fff', fontWeight: 700 }}>Observaciones</Box>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoObservaciones}
                        onChange={(e) => setFiltroTextoObservaciones(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="center" sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>Detalles</TableCell>
                  <TableCell align="center" sx={{ bgcolor: '#334155', color: 'white', fontWeight: 700, py: 1.5 }}>Carátula</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {solicitudesFiltradas.map((solicitud) => {
                  const requisicion = requisiciones.find(r => r.id?.toString() === solicitud.requisicion_id.toString());
                  const contrato = contratos.find(c => c.id === requisicion?.contrato_id);
                  const contratista = contrato ? contratistas.find(ct => ct.id === contrato.contratista_id) : null;
                  

                  
                  // ✅ Usar los valores directamente de la requisición (fuente de verdad)
                  // - requisicion.total ya incluye todos los descuentos (retención, anticipo, deducciones) + IVA
                  const importeBruto = requisicion?.monto_estimado || 0;
                  const montoRetencion = requisicion?.retencion || 0;
                  const montoAnticipo = requisicion?.amortizacion || 0;
                  const montoIva = requisicion?.iva || 0;
                  const totalNeto = requisicion?.total || 0;
                  const llevaIva = requisicion?.lleva_iva ?? (contrato?.tratamiento === 'MAS IVA');
                  
                  // Calcular porcentajes para mostrar
                  const porcentajeRetencion = importeBruto > 0 ? ((montoRetencion / importeBruto) * 100).toFixed(1) : '0.0';
                  const porcentajeAnticipo = importeBruto > 0 ? ((montoAnticipo / importeBruto) * 100).toFixed(1) : '0.0';
                  
                  // Monto pagado registrado en la solicitud
                  const montoPagadoReal = solicitud.monto_pagado || 0;
                  const faltante = totalNeto - montoPagadoReal;
                  
                  return (
                    <TableRow key={solicitud.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} color="primary">
                          {solicitud.folio}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {requisicion?.numero || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {contrato?.numero_contrato || contrato?.clave_contrato || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {contratista?.nombre || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 250 }}>
                        <Typography variant="body2" noWrap title={requisicion?.descripcion_general || ''}>
                          {requisicion?.descripcion_general || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {requisicion?.factura_url ? (
                          <a href={requisicion.factura_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                            <Button size="small" startIcon={<FileIcon />} variant="outlined">
                              Ver Factura
                            </Button>
                          </a>
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(solicitud.fecha).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} color="info.main">
                          {solicitud.fecha_pago_esperada
                            ? new Date(solicitud.fecha_pago_esperada).toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })
                            : '—'
                          }
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>
                          ${importeBruto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                        {llevaIva && (
                          <Chip 
                            label="+ IVA" 
                            size="small" 
                            color="primary" 
                            sx={{ 
                              height: 16, 
                              fontSize: '0.65rem', 
                              mt: 0.5,
                              '& .MuiChip-label': { px: 0.5 }
                            }} 
                          />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="error.main" fontSize="0.9rem">
                          -${montoRetencion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                        {parseFloat(porcentajeRetencion) > 0 && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            ({porcentajeRetencion}%)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="warning.main" fontSize="0.9rem">
                          -${montoAnticipo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                        {parseFloat(porcentajeAnticipo) > 0 && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            ({porcentajeAnticipo}%)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {llevaIva ? (
                          <>
                            <Typography variant="body2" color="primary.main" fontSize="0.9rem" fontWeight={600}>
                              +${montoIva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </Typography>
                            <Chip 
                              label="IVA" 
                              size="small" 
                              color="primary" 
                              sx={{ 
                                height: 16, 
                                fontSize: '0.65rem', 
                                mt: 0.3,
                                '& .MuiChip-label': { px: 0.5 }
                              }} 
                            />
                          </>
                        ) : (
                          <Typography variant="body2" color="text.disabled" fontSize="0.9rem">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700} color="success.dark">
                          ${totalNeto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>
                          ${montoPagadoReal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color={faltante > 0 ? 'warning.main' : 'text.secondary'} fontWeight={faltante > 0 ? 600 : 400}>
                          ${faltante.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 180 }}>
                        {(() => {
                          // Validar que tenga ambos Vo.Bo. antes de subir comprobante
                          const tieneVoBoDesa = !!solicitud.vobo_desarrollador;
                          const tieneVoBoFinanzas = !!solicitud.vobo_finanzas;
                          const puedeSubirComprobante = tieneVoBoDesa && tieneVoBoFinanzas && canEditOrUpload;
                          
                          if (solicitud.comprobante_pago_url) {
                            // Ya hay comprobante - mostrar opciones de ver/cambiar
                            return (
                              <Stack direction="row" spacing={1}>
                                <a 
                                  href={solicitud.comprobante_pago_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{ textDecoration: 'none', flex: 1 }}
                                >
                                  <Button size="small" startIcon={<FileIcon />} variant="outlined" fullWidth>
                                    Ver archivo
                                  </Button>
                                </a>
                                <Tooltip title={puedeSubirComprobante ? "Cambiar comprobante" : "Requiere Vo.Bo. Desa. y Finanzas"}>
                                  <span>
                                    <IconButton
                                      size="small"
                                      disabled={!puedeSubirComprobante}
                                      onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'application/pdf,image/*';
                                        input.onchange = (e) => {
                                          const file = (e.target as HTMLInputElement).files?.[0];
                                          if (file) {
                                            // Trigger upload through SimpleFileUpload
                                            const fileEvent = new Event('change', { bubbles: true });
                                            document.getElementById(`catalogo-upload-${solicitud.id}`)?.dispatchEvent(fileEvent);
                                          }
                                        };
                                        input.click();
                                      }}
                                      sx={{ color: 'primary.main' }}
                                    >
                                      <CloudUploadIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </Stack>
                            );
                          }
                          
                          // No hay comprobante - validar antes de permitir subir
                          if (!puedeSubirComprobante) {
                            const faltantes = [];
                            if (!tieneVoBoDesa) faltantes.push('Vo.Bo. Desa.');
                            if (!tieneVoBoFinanzas) faltantes.push('Vo.Bo. Finanzas');
                            
                            return (
                              <Tooltip title={`âš ï¸ Requiere: ${faltantes.join(' y ')}`}>
                                <span>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    disabled
                                    fullWidth
                                    sx={{ color: 'text.disabled' }}
                                  >
                                    Bloqueado
                                  </Button>
                                </span>
                              </Tooltip>
                            );
                          }
                          
                          // Puede subir comprobante
                          return (
                            <SimpleFileUpload
                              accept={['application/pdf', 'image/*']}
                              onUploadComplete={(url: string) => handleComprobanteSubido(solicitud, url)}
                              uploadType="document"
                              compact
                            />
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {solicitud.fecha_pago 
                            ? new Date(solicitud.fecha_pago).toLocaleDateString('es-MX')
                            : '—'
                          }
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {getEstatusPagoBadge(solicitud.estatus_pago)}
                      </TableCell>
                      {canApproveDesa && (
                        <TableCell align="center">
                          {canApproveDesa && canEditOrUpload ? (
                            <Checkbox
                              checked={!!solicitud.vobo_desarrollador}
                              onChange={(e) => handleVoBoDesa(solicitud, e.target.checked)}
                              icon={<ThumbUpIcon />}
                              checkedIcon={<CheckCircleIcon />}
                              sx={{
                                color: 'success.main',
                                '&.Mui-checked': { color: 'success.main' },
                              }}
                            />
                          ) : solicitud.vobo_desarrollador ? (
                            <Tooltip title={`Aprobado por ${solicitud.vobo_desarrollador_por} el ${solicitud.vobo_desarrollador_fecha ? new Date(solicitud.vobo_desarrollador_fecha).toLocaleDateString('es-MX') : ''}`}>
                              <CheckCircleIcon sx={{ color: 'success.main' }} />
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.secondary">â€”</Typography>
                          )}
                        </TableCell>
                      )}
                      {mostrarVoBoFinanzas && (
                        <TableCell align="center">
                          {canApproveFinanzas && canEditOrUpload ? (
                            <Checkbox
                              checked={!!solicitud.vobo_finanzas}
                              onChange={(e) => handleVoBoFinanzas(solicitud, e.target.checked)}
                              icon={<ThumbUpIcon />}
                              checkedIcon={<CheckCircleIcon />}
                              sx={{
                                color: 'success.main',
                                '&.Mui-checked': { color: 'success.main' },
                              }}
                            />
                          ) : solicitud.vobo_finanzas ? (
                            <Tooltip title={`Aprobado por ${solicitud.vobo_finanzas_por} el ${solicitud.vobo_finanzas_fecha ? new Date(solicitud.vobo_finanzas_fecha).toLocaleDateString('es-MX') : ''}`}>
                              <CheckCircleIcon sx={{ color: 'success.main' }} />
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.secondary">â€”</Typography>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          multiline
                          maxRows={2}
                          value={solicitud.observaciones_desarrollador || ''}
                          onChange={async (e) => {
                            const updated = { ...solicitud, observaciones_desarrollador: e.target.value, _dirty: true };
                            await db.solicitudes_pago.put(updated);
                          }}
                          placeholder={canEditOrUpload ? "Agregar observación..." : "Sin observaciones"}
                          disabled={!canEditOrUpload}
                          InputProps={{
                            readOnly: !canEditOrUpload
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleAbrirDesglose(solicitud)}
                          startIcon={<VisibilityIcon />}
                        >
                          Ver
                        </Button>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="contained"
                          color="info"
                          onClick={() => {
                            const req = requisiciones.find(r => r.id?.toString() === solicitud.requisicion_id.toString());
                            if (req) {
                              setRequisicionCaratula(req);
                              setMostrarCaratula(true);
                            }
                          }}
                          startIcon={<DescriptionIcon />}
                        >
                          Carátula
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>

      {/* Modal Desglose */}
      <DesgloseSolicitudModal
        open={mostrarDesglose}
        onClose={() => {
          setMostrarDesglose(false);
          setSolicitudSeleccionada(null);
        }}
        solicitud={solicitudSeleccionada}
        onSave={loadData}
        readOnly={esContratista}
      />

      {/* Modal Carátula */}
      <CaratulaRequisicionModal
        open={mostrarCaratula}
        onClose={() => {
          setMostrarCaratula(false);
          setRequisicionCaratula(null);
        }}
        requisicion={requisicionCaratula}
      />


    </Box>
  );
};

export default RegistroPagosPage;
