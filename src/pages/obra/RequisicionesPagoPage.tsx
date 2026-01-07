import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RequisicionPago } from '@/types/requisicion-pago';
import { Contrato } from '@/types/contrato';
import { Contratista } from '@/types/contratista';
import { RequisicionPagoForm } from '@/components/obra/RequisicionPagoForm';
import { db } from '@/db/database';
import { useContratos } from '@/lib/hooks/useContratos';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
  Tooltip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
} from '@mui/material';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  AttachMoney as AttachMoneyIcon,
  CalendarToday as CalendarTodayIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ClockIcon,
  Cancel as XCircleIcon,
  Send as SendIcon,
  ThumbUp as ThumbUpIcon,
  EventAvailable as EventAvailableIcon,
  Visibility as VisibilityIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import { syncService } from '../../sync/syncService';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useContratistas } from '@/lib/hooks/useContratistas';

export const RequisicionesPagoPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, perfil } = useAuth();
  const { canAccessPage, isContratista, canEdit, isAdmin, canViewFinance } = usePermissions();
  const { contratistas } = useContratistas(); // 🆕 Usar hook de contratistas
  
  // Verificar si el usuario es Gerente Plataforma
  const isGerentePlataforma = () => {
    const result = perfil?.roles?.includes('Gerente Plataforma') || perfil?.roles?.includes('GERENTE_PLATAFORMA');
    console.log('🔍 isGerentePlataforma:', result, 'Roles:', perfil?.roles);
    return result;
  };
  
  // Verificar permisos de acceso
  useEffect(() => {
    if (!canAccessPage('/obra/requisiciones')) {
      alert('No tienes permisos para acceder a esta página');
      navigate('/');
    }
  }, [canAccessPage, navigate]);
  
  const [requisiciones, setRequisiciones] = useState<RequisicionPago[]>([]);
  const [solicitudes, setSolicitudes] = useState<any[]>([]); // 🆕 Guardar solicitudes en estado
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRequisicion, setEditingRequisicion] = useState<RequisicionPago | undefined>();
  const [viewingRequisicion, setViewingRequisicion] = useState<RequisicionPago | undefined>();
  const [facturaOnlyMode, setFacturaOnlyMode] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [requisicionesEnSolicitud, setRequisicionesEnSolicitud] = useState<Set<string>>(new Set());
  
  // Usar el hook useContratos que maneja la sincronización con Supabase
  const { contratos } = useContratos();
  
  // Filtros
  const [filtroContrato, setFiltroContrato] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  
  // Estados para ordenamiento
  const [orderBy, setOrderBy] = useState<string>('fecha');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  
  // Filtros de texto para todas las columnas
  const [filtroTextoNumero, setFiltroTextoNumero] = useState('');
  const [filtroTextoContratista, setFiltroTextoContratista] = useState('');
  const [filtroTextoContrato, setFiltroTextoContrato] = useState('');
  const [filtroTextoFecha, setFiltroTextoFecha] = useState('');
  const [filtroTextoEstado, setFiltroTextoEstado] = useState('');
  const [filtroTextoConceptos, setFiltroTextoConceptos] = useState('');
  const [filtroTextoSolicitud, setFiltroTextoSolicitud] = useState('');
  const [filtroTextoMonto, setFiltroTextoMonto] = useState('');
  const [filtroTextoAmortizacion, setFiltroTextoAmortizacion] = useState('');
  const [filtroTextoRetencion, setFiltroTextoRetencion] = useState('');
  const [filtroTextoMontoPagado, setFiltroTextoMontoPagado] = useState('');
  const [filtroTextoSubtotal, setFiltroTextoSubtotal] = useState('');
  const [filtroTextoIva, setFiltroTextoIva] = useState('');
  const [filtroTextoTotal, setFiltroTextoTotal] = useState('');
  const [filtroTextoFactura, setFiltroTextoFactura] = useState('');
  const [filtroTextoVoBo, setFiltroTextoVoBo] = useState('');

  useEffect(() => {
    console.log('📝 Contratos disponibles:', contratos.map(c => ({
      id: c.id,
      numero: c.numero_contrato,
      nombre: c.nombre
    })));
  }, [contratos]);

  useEffect(() => {
    loadData(false); // Cargar desde IndexedDB, solo sync si está vacío
  }, []);

  // Funciones de ordenamiento
  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const loadData = async (forceFullSync = false) => {
    setLoading(true);
    try {
      // Siempre sincronizar para traer cambios recientes
      console.log('🔄 Sincronizando datos desde Supabase...');
      await syncService.forcePull(true); // Forzar sync completo siempre
      console.log('✅ Sincronización completada');
      
      const requisicionesData = await db.requisiciones_pago.toArray();
      
      // 🔒 Filtrar requisiciones no eliminadas (borrado lógico)
      const requisicionesActivas = requisicionesData.filter(r => !r._deleted);
      
      // Cargar solicitudes para verificar qué requisiciones ya están en solicitudes
      const solicitudesData = await db.solicitudes_pago.toArray();
      setSolicitudes(solicitudesData); // 🆕 Guardar en estado
      const requisicionesConSolicitud = new Set(
        solicitudesData.map(s => s.requisicion_id).filter(Boolean)
      );
      
      console.log('🔒 Requisiciones en solicitudes:', {
        count: requisicionesConSolicitud.size,
        ids: Array.from(requisicionesConSolicitud),
        tipos: Array.from(requisicionesConSolicitud).map(id => typeof id)
      });
      
      // 💰 CALCULAR estatus_pago para cada requisición basado en solicitudes_pago
      const requisicionesConEstatus = requisicionesActivas.map(req => {
        // Buscar todas las solicitudes de esta requisición
        const solicitudesDeReq = solicitudesData.filter(s => s.requisicion_id === req.id);
        
        // Sumar todos los montos pagados
        const totalPagado = solicitudesDeReq.reduce((sum, sol) => sum + (sol.monto_pagado || 0), 0);
        
        // Calcular estatus_pago
        let estatus_pago: 'NO PAGADO' | 'PAGADO' | 'PAGADO PARCIALMENTE' = 'NO PAGADO';
        if (totalPagado > 0) {
          if (totalPagado >= req.total) {
            estatus_pago = 'PAGADO';
          } else {
            estatus_pago = 'PAGADO PARCIALMENTE';
          }
        }
        
        return {
          ...req,
          estatus_pago
        };
      });
      
      console.log('📋 Requisiciones con estatus calculado:', requisicionesConEstatus.map(r => ({
        numero: r.numero,
        total: r.total,
        totalPagado: solicitudesData
          .filter(s => s.requisicion_id === r.id)
          .reduce((sum, sol) => sum + (sol.monto_pagado || 0), 0),
        estatus_pago: r.estatus_pago,
        factura_url: r.factura_url ? 'SÍ' : 'NO'
      })));
      
      setRequisicionesEnSolicitud(requisicionesConSolicitud);
      setRequisiciones(requisicionesConEstatus.sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      ));
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    // Validar que hay al menos un contrato con catálogo aprobado
    const contratosConCatalogoAprobado = contratos.filter(c => c.catalogo_aprobado === true);
    
    if (contratosConCatalogoAprobado.length === 0) {
      alert(
        '⚠️ No hay contratos con catálogos aprobados.\n\n' +
        'Para crear requisiciones, primero:\n' +
        '1. El contratista debe subir el catálogo de conceptos\n' +
        '2. Un administrador debe aprobar el catálogo\n\n' +
        'Una vez aprobado el catálogo, podrá crear requisiciones.'
      );
      return;
    }

    // Limpiar todos los estados antes de abrir formulario nuevo
    setEditingRequisicion(undefined);
    setViewingRequisicion(undefined);
    setFormKey(prev => prev + 1); // 🔄 Forzar remount del formulario
    setShowForm(true);
  };

  const handleEdit = (requisicion: RequisicionPago, facturaOnly = false) => {
    // 🔒 Bloquear edición si la requisición ya está en una solicitud de pago
    // EXCEPCIÓN: Gerente Plataforma puede editar SIEMPRE, incluso requisiciones en solicitudes
    if (requisicionesEnSolicitud.has(requisicion.id)) {
      if (isGerentePlataforma()) {
        // Gerente Plataforma puede editar siempre, sin restricciones
        console.log('✅ Gerente Plataforma puede editar requisición aunque esté en solicitud');
      } else {
        alert('🔒 No se puede editar esta requisición porque ya está incluida en una solicitud de pago.\n\nEsto protege la integridad de los pagos y la contabilidad del proyecto.');
        return;
      }
    }
    
    // Verificar permisos: contratistas solo pueden subir factura, no editar
    if (isContratista() && !facturaOnly) {
      alert('Los contratistas solo pueden subir facturas, no editar requisiciones');
      return;
    }
    
    // Verificar permisos: solo admin, finanzas o gerente plataforma pueden editar requisiciones aprobadas/pagadas
    if (!isAdmin() && !canViewFinance() && !isGerentePlataforma() && (requisicion.estado === 'aprobada' || requisicion.estado === 'pagada')) {
      alert('No tienes permisos para editar requisiciones aprobadas o pagadas');
      return;
    }
    
    setEditingRequisicion(requisicion);
    setViewingRequisicion(undefined);
    setFacturaOnlyMode(facturaOnly);
    setShowForm(true);
  };

  const handleView = (requisicion: RequisicionPago) => {
    setViewingRequisicion(requisicion);
    setEditingRequisicion(undefined);
    setShowForm(true);
  };
console.log("asdasdasdasdasd",contratistas)
  const handleSave = async (requisicion: RequisicionPago) => {
    try {
      if (editingRequisicion) {
        await db.requisiciones_pago.put(requisicion);
      } else {
        await db.requisiciones_pago.add(requisicion);
      }
      // Empuja cambios locales inmediatamente para reflejar en Supabase
      await syncService.forcePush();
      
      // NO hacer forcePull aquí porque Supabase tarda en reflejar cambios
      // Solo recargar desde IndexedDB local que ya tiene los datos actualizados
      const requisicionesData = await db.requisiciones_pago.toArray();
      const solicitudesData = await db.solicitudes_pago.toArray();
      const requisicionesConSolicitud = new Set(
        solicitudesData.map(s => s.requisicion_id).filter(Boolean)
      );
      
      // Calcular estatus_pago
      const requisicionesConEstatus = requisicionesData.map(req => {
        const solicitudesDeReq = solicitudesData.filter(s => s.requisicion_id === req.id);
        const totalPagado = solicitudesDeReq.reduce((sum, sol) => sum + (sol.monto_pagado || 0), 0);
        let estatus_pago: 'NO PAGADO' | 'PAGADO' | 'PAGADO PARCIALMENTE' = 'NO PAGADO';
        if (totalPagado > 0) {
          if (totalPagado >= req.total) {
            estatus_pago = 'PAGADO';
          } else {
            estatus_pago = 'PAGADO PARCIALMENTE';
          }
        }
        return { ...req, estatus_pago };
      });
      
      setRequisicionesEnSolicitud(requisicionesConSolicitud);
      setRequisiciones(requisicionesConEstatus.sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      ));
      
      setShowForm(false);
      setEditingRequisicion(undefined);
      setViewingRequisicion(undefined);
      setFacturaOnlyMode(false);
    } catch (error) {
      console.error('Error guardando requisición:', error);
      alert('Error al guardar la requisición');
    }
  };

  const handleDelete = async (id: string) => {
    // Verificar permisos: solo admin o finanzas pueden eliminar
    if (!isAdmin() && !canViewFinance()) {
      alert('No tienes permisos para eliminar requisiciones');
      return;
    }
    
    if (!confirm('¿Está seguro de eliminar esta requisición?')) {
      return;
    }

    try {
      console.log('🗑️ Iniciando borrado lógico de requisición:', id);
      
      // Obtener requisición completa
      const reqExistente = await db.requisiciones_pago.get(id);
      if (!reqExistente) {
        console.error('❌ Requisición no encontrada en IndexedDB:', id);
        alert('Error: Requisición no encontrada');
        return;
      }
      
      console.log('📋 Requisición antes de marcar como eliminada:', {
        id: reqExistente.id,
        numero: reqExistente.numero,
        _deleted: reqExistente._deleted
      });
      
      // Borrado lógico: usar put para reemplazar el objeto completo
      const requisicionEliminada = {
        ...reqExistente,
        _deleted: true,
        _dirty: true,
        updated_at: new Date().toISOString(),
        updated_by: user?.id
      };
      
      await db.requisiciones_pago.put(requisicionEliminada);
      console.log('✏️ Put ejecutado');
      
      // Verificar que se actualizó correctamente
      const reqActualizada = await db.requisiciones_pago.get(id);
      console.log('📋 Requisición después de marcar como eliminada:', {
        id: reqActualizada?.id,
        numero: reqActualizada?.numero,
        _deleted: reqActualizada?._deleted,
        _dirty: reqActualizada?._dirty
      });
      
      if (!reqActualizada?._deleted) {
        console.error('❌ ERROR: La requisición NO se marcó como eliminada correctamente');
        alert('Error: No se pudo marcar la requisición como eliminada');
        return;
      }
      
      console.log('✅ Requisición marcada como eliminada en IndexedDB');
      
      // Sincronizar el borrado con Supabase inmediatamente
      console.log('🔄 Sincronizando con Supabase...');
      await syncService.forcePush();
      console.log('✅ Sincronización completada');
      
      // Recargar datos sin forzar pull (ya que acabamos de hacer push)
      const requisicionesData = await db.requisiciones_pago.toArray();
      console.log('📊 Total requisiciones en IndexedDB:', requisicionesData.length);
      console.log('📊 Requisiciones eliminadas:', requisicionesData.filter(r => r._deleted).length);
      
      const requisicionesActivas = requisicionesData.filter(r => !r._deleted);
      console.log('📊 Requisiciones activas (no eliminadas):', requisicionesActivas.length);
      
      const solicitudesData = await db.solicitudes_pago.toArray();
      setSolicitudes(solicitudesData);
      
      const requisicionesConSolicitud = new Set(
        solicitudesData.map(s => s.requisicion_id).filter(Boolean)
      );
      
      const requisicionesConEstatus = requisicionesActivas.map(req => {
        const solicitudesDeReq = solicitudesData.filter(s => s.requisicion_id === req.id);
        const totalPagado = solicitudesDeReq.reduce((sum, sol) => sum + (sol.monto_pagado || 0), 0);
        let estatus_pago: 'NO PAGADO' | 'PAGADO' | 'PAGADO PARCIALMENTE' = 'NO PAGADO';
        if (totalPagado > 0) {
          if (totalPagado >= req.total) {
            estatus_pago = 'PAGADO';
          } else {
            estatus_pago = 'PAGADO PARCIALMENTE';
          }
        }
        return { ...req, estatus_pago };
      });
      
      setRequisicionesEnSolicitud(requisicionesConSolicitud);
      setRequisiciones(requisicionesConEstatus.sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      ));
      
      console.log('✅ Requisición eliminada exitosamente');
      alert('Requisición eliminada correctamente');
    } catch (error) {
      console.error('❌ Error eliminando requisición:', error);
      alert('Error al eliminar la requisición: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRequisicion(undefined);
    setViewingRequisicion(undefined);
    setFacturaOnlyMode(false);
  };

  // Filtrar y ordenar requisiciones
  const requisicionesFiltradas = requisiciones.filter(req => {
    const contrato = contratos.find(c => c.id === req.contrato_id);
    const contratista = contrato ? contratistas.find(c => c.id === contrato.contratista_id) : null;
    
    // Filtros de texto
    if (filtroTextoNumero && !req.numero.toLowerCase().includes(filtroTextoNumero.toLowerCase())) {
      return false;
    }
    
    if (filtroTextoContratista && !(contratista?.nombre || '').toLowerCase().includes(filtroTextoContratista.toLowerCase())) {
      return false;
    }
    
    if (filtroTextoContrato) {
      const contratoTexto = `${contrato?.clave_contrato || ''} ${contrato?.numero_contrato || ''} ${contrato?.nombre || ''}`.toLowerCase();
      if (!contratoTexto.includes(filtroTextoContrato.toLowerCase())) {
        return false;
      }
    }
    
    if (filtroTextoFecha) {
      const fechaFormateada = new Date(req.fecha).toLocaleDateString('es-MX');
      if (!fechaFormateada.toLowerCase().includes(filtroTextoFecha.toLowerCase())) {
        return false;
      }
    }
    
    if (filtroTextoEstado && !req.estado.toLowerCase().includes(filtroTextoEstado.toLowerCase())) {
      return false;
    }
    
    if (filtroTextoConceptos && !req.conceptos.length.toString().includes(filtroTextoConceptos)) {
      return false;
    }
    
    if (filtroTextoSolicitud) {
      const tieneSolicitud = requisicionesEnSolicitud.has(req.id!) ? 'solicitada' : 'disponible';
      if (!tieneSolicitud.includes(filtroTextoSolicitud.toLowerCase())) {
        return false;
      }
    }
    
    if (filtroTextoMonto && !req.monto_estimado.toFixed(2).includes(filtroTextoMonto)) {
      return false;
    }
    
    if (filtroTextoAmortizacion && !req.amortizacion.toFixed(2).includes(filtroTextoAmortizacion)) {
      return false;
    }
    
    if (filtroTextoRetencion && !req.retencion.toFixed(2).includes(filtroTextoRetencion)) {
      return false;
    }
    
    if (filtroTextoMontoPagado) {
      const totalPagado = solicitudes
        .filter(s => s.requisicion_id === req.id)
        .reduce((sum, sol) => sum + (sol.monto_pagado || 0), 0);
      if (!totalPagado.toFixed(2).includes(filtroTextoMontoPagado)) {
        return false;
      }
    }
    
    if (filtroTextoSubtotal) {
      const llevaIva = req.lleva_iva ?? (contrato?.tratamiento === 'MAS IVA');
      const subtotal = llevaIva ? req.total / 1.16 : req.total;
      if (!subtotal.toFixed(2).includes(filtroTextoSubtotal)) {
        return false;
      }
    }
    
    if (filtroTextoIva) {
      const llevaIva = req.lleva_iva ?? (contrato?.tratamiento === 'MAS IVA');
      const iva = llevaIva ? (req.total / 1.16) * 0.16 : 0;
      if (!iva.toFixed(2).includes(filtroTextoIva)) {
        return false;
      }
    }
    
    if (filtroTextoTotal && !req.total.toFixed(2).includes(filtroTextoTotal)) {
      return false;
    }
    
    if (filtroTextoFactura) {
      const tieneFactura = req.factura_url ? 'con factura' : 'sin factura';
      if (!tieneFactura.includes(filtroTextoFactura.toLowerCase())) {
        return false;
      }
    }
    
    if (filtroTextoVoBo) {
      const voBo = req.visto_bueno ? `aprobada ${req.visto_bueno_por || ''}` : 'pendiente';
      if (!voBo.toLowerCase().includes(filtroTextoVoBo.toLowerCase())) {
        return false;
      }
    }
    
    // Filtros por select
    if (filtroContrato && req.contrato_id !== filtroContrato) return false;
    if (filtroEstado && req.estado !== filtroEstado) return false;
    return true;
  }).sort((a, b) => {
    const contratoA = contratos.find(c => c.id === a.contrato_id);
    const contratoB = contratos.find(c => c.id === b.contrato_id);
    const contratistaA = contratoA ? contratistas.find(c => c.id === contratoA.contratista_id) : null;
    const contratistaB = contratoB ? contratistas.find(c => c.id === contratoB.contratista_id) : null;
    
    let compareValue = 0;
    
    switch (orderBy) {
      case 'numero':
        compareValue = a.numero.localeCompare(b.numero);
        break;
      case 'contratista':
        compareValue = (contratistaA?.nombre || '').localeCompare(contratistaB?.nombre || '');
        break;
      case 'contrato':
        compareValue = (contratoA?.numero_contrato || '').localeCompare(contratoB?.numero_contrato || '');
        break;
      case 'fecha':
        compareValue = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
        break;
      case 'estado':
        compareValue = a.estado.localeCompare(b.estado);
        break;
      case 'conceptos':
        compareValue = a.conceptos.length - b.conceptos.length;
        break;
      case 'monto':
        compareValue = a.monto_estimado - b.monto_estimado;
        break;
      case 'amortizacion':
        compareValue = a.amortizacion - b.amortizacion;
        break;
      case 'retencion':
        compareValue = a.retencion - b.retencion;
        break;
      case 'monto_pagado':
        const pagadoA = solicitudes.filter(s => s.requisicion_id === a.id).reduce((sum, sol) => sum + (sol.monto_pagado || 0), 0);
        const pagadoB = solicitudes.filter(s => s.requisicion_id === b.id).reduce((sum, sol) => sum + (sol.monto_pagado || 0), 0);
        compareValue = pagadoA - pagadoB;
        break;
      case 'subtotal':
        const llevaIvaA = a.lleva_iva ?? (contratoA?.tratamiento === 'MAS IVA');
        const llevaIvaB = b.lleva_iva ?? (contratoB?.tratamiento === 'MAS IVA');
        const subtotalA = llevaIvaA ? a.total / 1.16 : a.total;
        const subtotalB = llevaIvaB ? b.total / 1.16 : b.total;
        compareValue = subtotalA - subtotalB;
        break;
      case 'iva':
        const ivaLlevaA = a.lleva_iva ?? (contratoA?.tratamiento === 'MAS IVA');
        const ivaLlevaB = b.lleva_iva ?? (contratoB?.tratamiento === 'MAS IVA');
        const ivaA = ivaLlevaA ? (a.total / 1.16) * 0.16 : 0;
        const ivaB = ivaLlevaB ? (b.total / 1.16) * 0.16 : 0;
        compareValue = ivaA - ivaB;
        break;
      case 'total':
        compareValue = a.total - b.total;
        break;
      default:
        compareValue = 0;
    }
    
    return order === 'asc' ? compareValue : -compareValue;
  });

  const getEstadoBadge = (estado: RequisicionPago['estado']) => {
    const config = {
      borrador: { color: 'default' as const, icon: <ClockIcon sx={{ fontSize: 16 }} /> },
      enviada: { color: 'info' as const, icon: <SendIcon sx={{ fontSize: 16 }} /> },
      aprobada: { color: 'success' as const, icon: <CheckCircleIcon sx={{ fontSize: 16 }} /> },
      pagada: { color: 'secondary' as const, icon: <AttachMoneyIcon sx={{ fontSize: 16 }} /> },
      cancelada: { color: 'error' as const, icon: <XCircleIcon sx={{ fontSize: 16 }} /> }
    };

    const { color, icon } = config[estado];

    return (
      <Chip
        icon={icon}
        label={estado.charAt(0).toUpperCase() + estado.slice(1)}
        color={color}
        size="small"
        sx={{ fontWeight: 600 }}
      />
    );
  };

  const getContratoNombre = (contratoId: string) => {
    const contrato = contratos.find(c => c.id === contratoId);
    return contrato ? `${contrato.numero_contrato} - ${contrato.nombre}` : 'N/A';
  };

  const handleDownloadCSV = async (requisicion: RequisicionPago) => {
    try {
      const contrato = contratos.find(c => c.id === requisicion.contrato_id);
      const conceptos = requisicion.conceptos || [];
      
      // Crear CSV con BOM para UTF-8
      const BOM = '\ufeff';
      const headers = [
        'Requisición',
        'Contrato',
        'Fecha',
        'Clave',
        'Concepto',
        'Unidad',
        'Cantidad Catálogo',
        'Cantidad Estimada',
        'Precio Unitario',
        'Importe',
        'Tipo'
      ].join(',');
      
      const rows = conceptos.map((concepto: any) => {
        const tipo = concepto.tipo === 'DEDUCCION' ? 'Deducción' : 
                     concepto.tipo === 'RETENCION' ? 'Retención' :
                     concepto.tipo === 'EXTRA' ? 'Extraordinario' : 'Concepto';
        const contratista = contratistas.filter(contratista => contratista.id == contrato?.contratista_id)
        return [
          requisicion.numero,
          contratista,
          contrato?.numero_contrato || 'N/A',
          new Date(requisicion.fecha).toLocaleDateString('es-MX'),
          `"${concepto.clave || ''}"`,
          `"${concepto.concepto || ''}"`,
          concepto.unidad || '',
          concepto.cantidad_catalogo || 0,
          concepto.cantidad_estimada || 0,
          concepto.precio_unitario || 0,
          concepto.importe || 0,
          tipo
        ].join(',');
      });
      
      const csv = BOM + headers + '\n' + rows.join('\n');
      
      // Descargar archivo
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `requisicion_${requisicion.numero}_conceptos.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error descargando CSV:', error);
      alert('Error al descargar el archivo');
    }
  };

  if (showForm) {
    const requisicionActual = editingRequisicion || viewingRequisicion;
    const estaEnSolicitud = requisicionActual?.id ? requisicionesEnSolicitud.has(requisicionActual.id) : false;
    
    // Gerente Plataforma nunca tiene restricciones, puede editar siempre
    const esGerentePlataforma = isGerentePlataforma();
    const soloVista = !!viewingRequisicion;
    const readOnlyMode = soloVista && !esGerentePlataforma; // Gerente puede editar incluso en modo vista
    
    console.log('📝 Abriendo formulario:', {
      requisicionId: requisicionActual?.id,
      estaEnSolicitud,
      esGerentePlataforma,
      editingRequisicion: !!editingRequisicion,
      viewingRequisicion: !!viewingRequisicion,
      readOnlyMode,
      requisicionesEnSolicitud: Array.from(requisicionesEnSolicitud)
    });
    
    return (
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 2, md: 3 } }}>
        <Container maxWidth={false} sx={{ px: { xs: 2, sm: 2, md: 2, lg: 3, xl: 4 }, mx: 'auto' }}>
          <RequisicionPagoForm
            key={`form-${formKey}`}
            requisicion={requisicionActual}
            contratos={contratos.filter(c => c.catalogo_aprobado === true)}
            onSave={handleSave}
            onCancel={handleCloseForm}
            readOnly={readOnlyMode}
            allowRespaldoEdit={false}
          />
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 2, md: 3 } }}>
      <Container maxWidth={false} sx={{ px: { xs: 2, sm: 2, md: 2, lg: 3, xl: 4 }, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{ mb: 3 }}
          >
            <Box>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
                <DescriptionIcon sx={{ fontSize: 32, color: 'secondary.main' }} />
                <Typography variant="h4" fontWeight="bold" color="text.primary">
                  Requisiciones de Pago
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Gestión de requisiciones de pago por concepto
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AddIcon />}
              onClick={handleCreate}
              sx={{ 
                px: 3, 
                py: 1.5,
                fontWeight: 600,
                boxShadow: 2,
                '&:hover': { boxShadow: 4 }
              }}
            >
              Nueva Requisición
            </Button>
          </Stack>

          {/* Filtros */}
          <Paper elevation={1} sx={{ p: 3 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
              <FilterIcon color="secondary" />
              <Typography variant="h6" fontWeight="semibold">
                Filtros
              </Typography>
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Contrato</InputLabel>
                <Select
                  value={filtroContrato}
                  onChange={(e) => setFiltroContrato(e.target.value)}
                  label="Contrato"
                >
                  <MenuItem value="">Todos los contratos</MenuItem>
                  {contratos.map(contrato => (
                    <MenuItem key={contrato.id} value={contrato.id}>
                      {contrato.numero_contrato} - {contrato.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Estado</InputLabel>
                <Select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  label="Estado"
                >
                  <MenuItem value="">Todos los estados</MenuItem>
                  <MenuItem value="borrador">Borrador</MenuItem>
                  <MenuItem value="enviada">Enviada</MenuItem>
                  <MenuItem value="aprobada">Aprobada</MenuItem>
                  <MenuItem value="pagada">Pagada</MenuItem>
                  <MenuItem value="cancelada">Cancelada</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Paper>

          {/* Alerta de Requisiciones Bloqueadas */}
          {requisicionesEnSolicitud.size > 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Requisiciones protegidas
              </Typography>
              <Typography variant="body2">
                {requisicionesEnSolicitud.size} requisición(es) no se pueden editar porque ya están incluidas en solicitudes de pago. 
                Esto protege la integridad de los pagos y la contabilidad del proyecto.
              </Typography>
            </Alert>
          )}
        </Box>

        {/* Resumen */}
        {!loading && requisicionesFiltradas.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 1 }}>
              {/* Total Requisiciones */}
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
                  TOTAL REQUISICIONES
                </Typography>
                <Typography variant="h5" fontWeight={700} color="secondary.dark">
                  {requisicionesFiltradas.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Creadas
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
                  ${requisicionesFiltradas.reduce((sum, r) => sum + r.total, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Solicitado
                </Typography>
              </Paper>

              {/* Requisiciones Pagadas */}
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
                  REQUISICIONES PAGADAS
                </Typography>
                <Typography variant="h5" fontWeight={700} color="info.dark">
                  {requisicionesFiltradas.filter(r => r.estatus_pago === 'PAGADO' || r.estatus_pago === 'PAGADO PARCIALMENTE').length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {requisicionesFiltradas.length > 0 ? ((requisicionesFiltradas.filter(r => r.estatus_pago === 'PAGADO' || r.estatus_pago === 'PAGADO PARCIALMENTE').length / requisicionesFiltradas.length) * 100).toFixed(0) : 0}% del total
                </Typography>
              </Paper>

              {/* Monto Pagado */}
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 2.5, 
                  minWidth: 200, 
                  bgcolor: 'primary.50',
                  borderLeft: '4px solid',
                  borderColor: 'primary.main'
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                  MONTO PAGADO
                </Typography>
                <Typography variant="h5" fontWeight={700} color="primary.dark">
                  ${(() => {
                    // Calcular el total pagado de todas las requisiciones pagadas
                    return requisicionesFiltradas
                      .filter(r => r.estatus_pago === 'PAGADO' || r.estatus_pago === 'PAGADO PARCIALMENTE')
                      .map(req => {
                        // Sumar lo pagado de esta requisición desde las solicitudes
                        const solicitudesDeReq = solicitudes.filter(s => s.requisicion_id === req.id);
                        return solicitudesDeReq.reduce((sum, sol) => sum + (sol.monto_pagado || 0), 0);
                      })
                      .reduce((sum, monto) => sum + monto, 0)
                      .toLocaleString('es-MX', { minimumFractionDigits: 2 });
                  })()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Real transferido
                </Typography>
              </Paper>
            </Stack>
          </Box>
        )}

        {/* Lista de Requisiciones */}
        {loading ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Stack alignItems="center" spacing={2}>
              <CircularProgress size={40} />
              <Typography variant="body1" color="text.secondary" fontWeight={500}>
                Cargando requisiciones...
              </Typography>
            </Stack>
          </Paper>
        ) : requisicionesFiltradas.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <DescriptionIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.primary" fontWeight={600} gutterBottom>
              No hay requisiciones
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {filtroContrato || filtroEstado 
                ? 'Intenta cambiar los filtros para ver más resultados'
                : 'Crea tu primera requisición de pago para comenzar'
              }
            </Typography>
            {!filtroContrato && !filtroEstado && (
              <Button
                onClick={handleCreate}
                variant="contained"
                startIcon={<AddIcon />}
                sx={{ mt: 1 }}
              >
                Nueva Requisición
              </Button>
            )}
          </Paper>
        ) : (
          <TableContainer component={Paper} sx={{ boxShadow: 2, overflowX: 'auto' }}>
            <Table sx={{ minWidth: 2380 }}>
              <TableHead sx={{ '& th': { bgcolor: '#334155', color: '#fff', fontWeight: 700, py: 1.25, whiteSpace: 'nowrap' } }}>
                <TableRow>
                  <TableCell sx={{ minWidth: 100 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'numero'}
                        direction={orderBy === 'numero' ? order : 'asc'}
                        onClick={() => handleRequestSort('numero')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        Número
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoNumero}
                        onChange={(e) => setFiltroTextoNumero(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ minWidth: 180 }}>
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
                  <TableCell sx={{ minWidth: 200 }}>
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
                  <TableCell sx={{ minWidth: 90 }}>
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
                  <TableCell sx={{ minWidth: 100 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'estado'}
                        direction={orderBy === 'estado' ? order : 'asc'}
                        onClick={() => handleRequestSort('estado')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        Estado
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoEstado}
                        onChange={(e) => setFiltroTextoEstado(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ minWidth: 80 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'conceptos'}
                        direction={orderBy === 'conceptos' ? order : 'asc'}
                        onClick={() => handleRequestSort('conceptos')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        Conceptos
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoConceptos}
                        onChange={(e) => setFiltroTextoConceptos(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="center" sx={{ minWidth: 100 }}>
                    <Stack spacing={0.5}>
                      <Box sx={{ color: '#fff', fontWeight: 700 }}>Solicitud</Box>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoSolicitud}
                        onChange={(e) => setFiltroTextoSolicitud(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="right" sx={{ minWidth: 110 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'monto'}
                        direction={orderBy === 'monto' ? order : 'asc'}
                        onClick={() => handleRequestSort('monto')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        Monto
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoMonto}
                        onChange={(e) => setFiltroTextoMonto(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="right" sx={{ minWidth: 110, bgcolor: '#fee2e2' }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'amortizacion'}
                        direction={orderBy === 'amortizacion' ? order : 'asc'}
                        onClick={() => handleRequestSort('amortizacion')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        Amortización
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoAmortizacion}
                        onChange={(e) => setFiltroTextoAmortizacion(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="right" sx={{ minWidth: 110, bgcolor: '#fef3c7' }}>
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
                  <TableCell align="right" sx={{ minWidth: 120, bgcolor: '#dbeafe' }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'monto_pagado'}
                        direction={orderBy === 'monto_pagado' ? order : 'asc'}
                        onClick={() => handleRequestSort('monto_pagado')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        Monto Pagado
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoMontoPagado}
                        onChange={(e) => setFiltroTextoMontoPagado(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="right" sx={{ minWidth: 110 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'subtotal'}
                        direction={orderBy === 'subtotal' ? order : 'asc'}
                        onClick={() => handleRequestSort('subtotal')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        Subtotal
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoSubtotal}
                        onChange={(e) => setFiltroTextoSubtotal(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="right" sx={{ minWidth: 90 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'iva'}
                        direction={orderBy === 'iva' ? order : 'asc'}
                        onClick={() => handleRequestSort('iva')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        IVA
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
                  <TableCell align="right" sx={{ minWidth: 120, bgcolor: '#e0e7ff' }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'total'}
                        direction={orderBy === 'total' ? order : 'asc'}
                        onClick={() => handleRequestSort('total')}
                        sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                      >
                        Total
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoTotal}
                        onChange={(e) => setFiltroTextoTotal(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="center" sx={{ minWidth: 100 }}>
                    <Stack spacing={0.5}>
                      <Box sx={{ color: '#fff', fontWeight: 700 }}>Factura</Box>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoFactura}
                        onChange={(e) => setFiltroTextoFactura(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="center" sx={{ minWidth: 100 }}>
                    <Stack spacing={0.5}>
                      <Box sx={{ color: '#fff', fontWeight: 700 }}>Visto Bueno</Box>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoVoBo}
                        onChange={(e) => setFiltroTextoVoBo(e.target.value)}
                        sx={{ '& input': { color: '#fff', fontSize: '0.75rem' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="center" sx={{ minWidth: 90 }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requisicionesFiltradas.map((requisicion) => {
                  const contrato = contratos.find(c => c.id === requisicion.contrato_id);
                  const contratista = contrato ? contratistas.find(c => c.id === contrato.contratista_id) : null;
                  
                  // Debug para diagnosticar el problema
                  if (!contrato) {
                    console.log('⚠️ Contrato no encontrado para requisición:', {
                      requisicionId: requisicion.id,
                      contratoIdBuscado: requisicion.contrato_id,
                      contratosDisponibles: contratos.map(c => ({ id: c.id, numero: c.numero_contrato }))
                    });
                  }
                  
                  // Debug para contratista
                  if (contrato && !contratista) {
                    console.log('⚠️ Contratista no encontrado:', {
                      requisicionNumero: requisicion.numero,
                      contratoNumero: contrato.numero_contrato,
                      contratistaIdBuscado: contrato.contratista_id,
                      contratistasDisponibles: contratistas.map(c => ({ id: c.id, nombre: c.nombre }))
                    });
                  }
                  
                  return (
                    <TableRow 
                      key={requisicion.id}
                      sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {requisicion.numero}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 180, color: 'secondary.dark' }}>
                          {contratista?.nombre || 'Sin contratista'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {contrato ? (
                          <>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                              {contrato.clave_contrato || contrato.numero_contrato || 'Sin número'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                              {contrato.nombre || contrato.categoria || 'Sin nombre'}
                            </Typography>
                          </>
                        ) : (
                          <>
                            <Typography variant="body2" color="error">N/A</Typography>
                            <Typography variant="caption" color="error">
                              ID: {requisicion.contrato_id?.substring(0, 8)}...
                            </Typography>
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(requisicion.fecha).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          {getEstadoBadge(requisicion.estado)}
                          {requisicion.estatus_pago === 'PAGADO' && (
                            <Chip 
                              label="PAGADO" 
                              size="small" 
                              sx={{ 
                                bgcolor: 'success.main', 
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '0.7rem'
                              }} 
                            />
                          )}
                          {requisicion.estatus_pago === 'PAGADO PARCIALMENTE' && (
                            <Chip 
                              label="PARCIAL" 
                              size="small" 
                              sx={{ 
                                bgcolor: 'warning.main', 
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '0.7rem'
                              }} 
                            />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          // Buscar solicitud(es) de esta requisición
                          const solicitudesDeReq = solicitudes.filter(s => s.requisicion_id === requisicion.id);
                          const totalSolicitados = solicitudesDeReq.reduce((sum, sol) => sum + (sol.concepto_ids?.length || 0), 0);
                          const totalRequisitados = requisicion.conceptos.length;
                          
                          // Si hay solicitudes y difieren del total
                          if (solicitudesDeReq.length > 0 && totalSolicitados !== totalRequisitados) {
                            return (
                              <Tooltip title={`${totalRequisitados} conceptos en requisición, ${totalSolicitados} solicitados`} arrow>
                                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <span style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: '0.85em' }}>
                                    {totalRequisitados}
                                  </span>
                                  <span style={{ color: '#2563eb', fontWeight: 600 }}>
                                    → {totalSolicitados}
                                  </span>
                                </Typography>
                              </Tooltip>
                            );
                          }
                          
                          // Si no hay diferencia, mostrar normal
                          return (
                            <Typography variant="body2">
                              {totalRequisitados}
                            </Typography>
                          );
                        })()}
                      </TableCell>
                      <TableCell align="center">
                        {requisicionesEnSolicitud.has(requisicion.id) ? (
                          <Chip 
                            label="SOLICITADA" 
                            size="small" 
                            color="info"
                            icon={<SendIcon />}
                            sx={{ 
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              bgcolor: '#3b82f6',
                              color: '#fff'
                            }}
                          />
                        ) : (
                          <Chip 
                            label="Disponible" 
                            size="small" 
                            variant="outlined"
                            color="success"
                            sx={{ 
                              fontSize: '0.7rem',
                              borderColor: '#10b981',
                              color: '#10b981'
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          ${requisicion.monto_estimado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ bgcolor: '#fee2e220' }}>
                        <Tooltip title="Amortización de anticipo" arrow>
                          <Typography variant="body2" fontWeight={600} color={requisicion.amortizacion > 0 ? '#dc2626' : 'text.secondary'}>
                            {requisicion.amortizacion > 0 ? `-$${requisicion.amortizacion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '-'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right" sx={{ bgcolor: '#fef3c720' }}>
                        <Tooltip title="Retención del fondo de garantía" arrow>
                          <Typography variant="body2" fontWeight={600} color={requisicion.retencion > 0 ? '#b45309' : 'text.secondary'}>
                            {requisicion.retencion > 0 ? `-$${requisicion.retencion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '-'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600} color="info.dark">
                          ${(() => {
                            const solicitudesDeReq = solicitudes.filter(s => s.requisicion_id === requisicion.id);
                            return solicitudesDeReq.reduce((sum, sol) => sum + (sol.monto_pagado || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });
                          })()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700} color="primary.dark">
                          {(() => {
                            // Detectar si lleva IVA: usar campo lleva_iva o inferir del contrato
                            const llevaIva = requisicion.lleva_iva ?? (contrato?.tratamiento === 'MAS IVA');
                            const subtotal = llevaIva ? requisicion.total / 1.16 : requisicion.total;
                            return `$${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
                          })()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="info.main">
                          {(() => {
                            const llevaIva = requisicion.lleva_iva ?? (contrato?.tratamiento === 'MAS IVA');
                            if (llevaIva) {
                              const iva = (requisicion.total / 1.16) * 0.16;
                              return `$${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
                            }
                            return '-';
                          })()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#059669', fontSize: '0.95rem' }}>
                          ${requisicion.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                        {(() => {
                          const llevaIva = requisicion.lleva_iva ?? (contrato?.tratamiento === 'MAS IVA');
                          return llevaIva && (
                            <Chip 
                              label="Con IVA" 
                              size="small" 
                              color="success" 
                              sx={{ 
                                height: 16, 
                                fontSize: '0.65rem', 
                                mt: 0.5,
                                '& .MuiChip-label': { px: 0.5 }
                              }} 
                            />
                          );
                        })()}
                      </TableCell>
                      <TableCell align="center">
                        {(() => {
                          // Permitir subir factura si:
                          // 1. Estado es enviada/aprobada, O
                          // 2. La requisición ya tiene una solicitud asociada
                          const tieneSolicitud = requisicionesEnSolicitud.has(requisicion.id!);
                          const puedeSubirFactura = (requisicion.estado === 'enviada' || requisicion.estado === 'aprobada') || tieneSolicitud;
                          
                          if (puedeSubirFactura) {
                            return requisicion.factura_url ? (
                              <Button
                                size="small"
                                variant="outlined"
                                color="success"
                                startIcon={<CheckCircleIcon />}
                                onClick={() => window.open(requisicion.factura_url, '_blank')}
                              >
                                Ver Factura
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                variant="contained"
                                color="warning"
                                startIcon={<CloudUploadIcon />}
                                onClick={() => handleEdit(requisicion, true)}
                              >
                                Subir Factura
                              </Button>
                            );
                          }
                          
                          return (
                            <Chip 
                              label="-" 
                              size="small" 
                              variant="outlined"
                              sx={{ color: 'text.disabled', borderColor: 'divider' }}
                            />
                          );
                        })()}
                      </TableCell>
                      <TableCell align="center">
                        {requisicion.visto_bueno ? (
                          <Tooltip title={`Aprobada por ${requisicion.visto_bueno_por}`}>
                            <CheckCircleIcon sx={{ color: 'success.main' }} />
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          {requisicionesEnSolicitud.has(requisicion.id) ? (
                            <Tooltip title="Ver requisición (solo lectura)">
                              <IconButton
                                onClick={() => handleView(requisicion)}
                                color="info"
                                size="small"
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Tooltip 
                              title={
                                requisicionesEnSolicitud.has(requisicion.id)
                                  ? (isGerentePlataforma() 
                                      ? "✏️ Gerente: Puede editar respaldo documental" 
                                      : "🔒 Bloqueada: No se puede editar porque ya tiene solicitud de pago asociada")
                                  : requisicion.estado === 'pagada'
                                  ? `No se puede editar una requisición ${requisicion.estado}`
                                  : "Editar requisición"
                              }
                            >
                              <span>
                                <IconButton
                                  onClick={() => handleEdit(requisicion)}
                                  color="primary"
                                  size="small"
                                  disabled={(!isGerentePlataforma() && requisicionesEnSolicitud.has(requisicion.id)) || requisicion.estado === 'pagada'}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                          <Tooltip 
                            title={
                              requisicionesEnSolicitud.has(requisicion.id)
                                ? "🔒 Bloqueada: No se puede eliminar porque ya tiene solicitud de pago asociada"
                                : requisicion.estado === 'pagada'
                                ? `No se puede eliminar una requisición ${requisicion.estado}`
                                : "Eliminar requisición"
                            }
                          >
                            <span>
                              <IconButton
                                onClick={() => handleDelete(requisicion.id)}
                                color="error"
                                size="small"
                                disabled={requisicionesEnSolicitud.has(requisicion.id) || requisicion.estado === 'pagada'}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Descargar Conceptos CSV">
                            <IconButton
                              color="secondary"
                              size="small"
                              onClick={() => handleDownloadCSV(requisicion)}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>
    </Box>
  );
};

export default RequisicionesPagoPage;
