import React, { useState, useEffect } from 'react';
import { RequisicionPago } from '@/types/requisicion-pago';
import { SolicitudPago } from '@/types/solicitud-pago';
import { db } from '@/db/database';
import { useContratos } from '@/lib/hooks/useContratos';
import { useContratistas } from '@/lib/hooks/useContratistas';
import { useAuth } from '@/context/AuthContext';
import { SolicitudPagoForm } from '@/components/obra/SolicitudPagoForm';
import { VistoBuenoSolicitudDialog } from '@/components/obra/VistoBuenoSolicitudDialog';
import { useProyectoStore } from '@/stores/proyectoStore';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  TableSortLabel,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  TextField,
  ListItemText,
  Checkbox,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Schedule as ClockIcon,
  Cancel as XCircleIcon,
  Send as SendIcon,
  AttachMoney as AttachMoneyIcon,
  Description as DescriptionIcon,
  ThumbUp as ThumbUpIcon,
  Visibility as VisibilityIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { syncService } from '../../sync/syncService';

export const SolicitudesPagoPage: React.FC = () => {
  const { perfil } = useAuth();
  const { proyectos } = useProyectoStore();
  const proyectoActual = proyectos[0];
  const [solicitudes, setSolicitudes] = useState<SolicitudPago[]>([]);
  const [requisiciones, setRequisiciones] = useState<RequisicionPago[]>([]);
  const [loading, setLoading] = useState(true);
  const { contratos } = useContratos();
  const { contratistas } = useContratistas();
  const [mostrarFormSolicitud, setMostrarFormSolicitud] = useState(false);
  const [solicitudVoBo, setSolicitudVoBo] = useState<SolicitudPago | null>(null);
  const [solicitudVer, setSolicitudVer] = useState<SolicitudPago | null>(null);
  
  // Estados para ordenamiento
  const [orderBy, setOrderBy] = useState<string>('fecha');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  
  // Estados para filtros
  const [filtroContratista, setFiltroContratista] = useState<string[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<string[]>([]);
  const [filtroEstatusPago, setFiltroEstatusPago] = useState<string[]>([]);
  const [filtroFactura, setFiltroFactura] = useState<string[]>([]);
  const [filtroVoBo, setFiltroVoBo] = useState<string[]>([]);
  const [anchorElFiltro, setAnchorElFiltro] = useState<{ [key: string]: HTMLElement | null }>({});
  
  // Filtros de texto para todas las columnas
  const [filtroTextoFolio, setFiltroTextoFolio] = useState('');
  const [filtroTextoContratista, setFiltroTextoContratista] = useState('');
  const [filtroTextoRequisicion, setFiltroTextoRequisicion] = useState('');
  const [filtroTextoFecha, setFiltroTextoFecha] = useState('');
  const [filtroTextoFechaEsperada, setFiltroTextoFechaEsperada] = useState('');
  const [filtroTextoEstado, setFiltroTextoEstado] = useState('');
  const [filtroTextoConceptos, setFiltroTextoConceptos] = useState('');
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
    loadData();
  }, []);

  // Determinar el estado real basado en estatus_pago y Vo.Bo.
  const getEstadoReal = (solicitud: SolicitudPago): SolicitudPago['estado'] => {
    // Si está pagada según estatus_pago, el estado debe ser 'pagada'
    if (solicitud.estatus_pago === 'PAGADO') {
      return 'pagada';
    }
    
    // Si tiene ambos Vo.Bo., está aprobada
    if (solicitud.vobo_desarrollador && solicitud.vobo_finanzas) {
      return 'aprobada';
    }
    
    // Siempre mantener pendiente hasta que se apruebe
    return solicitud.estado || 'pendiente';
    
    // Si tiene fecha_pago o comprobante, está pagada
    if (solicitud.fecha_pago || solicitud.comprobante_pago_url) {
      return 'pagada';
    }
    
    // De lo contrario, mantener estado actual o pendiente
    return solicitud.estado || 'pendiente';
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const solicitudesData = await db.solicitudes_pago.toArray();
      const requisicionesData = await db.requisiciones_pago.toArray();
      
      // Corregir estados inconsistentes
      const solicitudesCorregidas = await Promise.all(
        solicitudesData.map(async (solicitud) => {
          const estadoReal = getEstadoReal(solicitud);
          
          // Si el estado no coincide con la realidad, actualizarlo
          if (solicitud.estado !== estadoReal) {
            console.log(`⚠️ Corrigiendo estado de ${solicitud.folio}: ${solicitud.estado} → ${estadoReal}`);
            const solicitudActualizada = { ...solicitud, estado: estadoReal };
            await db.solicitudes_pago.put(solicitudActualizada);
            return solicitudActualizada;
          }
          
          return solicitud;
        })
      );
      
      setSolicitudes(solicitudesCorregidas.sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      ));
      setRequisiciones(requisicionesData);
      
      // Sincronizar cambios si se corrigieron estados
      if (solicitudesCorregidas.some((s, i) => s.estado !== solicitudesData[i].estado)) {
        await syncService.forcePush();
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Funciones de ordenamiento
  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleOpenFiltro = (event: React.MouseEvent<HTMLElement>, columna: string) => {
    setAnchorElFiltro({ ...anchorElFiltro, [columna]: event.currentTarget });
  };

  const handleCloseFiltro = (columna: string) => {
    setAnchorElFiltro({ ...anchorElFiltro, [columna]: null });
  };

  const handleToggleFiltro = (filtro: string[], setFiltro: (value: string[]) => void, valor: string) => {
    const currentIndex = filtro.indexOf(valor);
    const newFiltro = [...filtro];
    if (currentIndex === -1) {
      newFiltro.push(valor);
    } else {
      newFiltro.splice(currentIndex, 1);
    }
    setFiltro(newFiltro);
  };

  const getSolicitudEstadoBadge = (estado: SolicitudPago['estado']) => {
    const config = {
      pendiente: { color: 'warning' as const, icon: <ClockIcon sx={{ fontSize: 16 }} />, label: 'Pendiente' },
      aprobada: { color: 'success' as const, icon: <CheckCircleIcon sx={{ fontSize: 16 }} />, label: 'Aprobada' },
      pagada: { color: 'secondary' as const, icon: <AttachMoneyIcon sx={{ fontSize: 16 }} />, label: 'Pagada' },
      rechazada: { color: 'error' as const, icon: <XCircleIcon sx={{ fontSize: 16 }} />, label: 'Rechazada' }
    };

    const { color, icon, label } = config[estado];

    return (
      <Chip
        icon={icon}
        label={label}
        color={color}
        size="small"
        sx={{ fontWeight: 600 }}
      />
    );
  };

  // Filtrar y ordenar solicitudes
  const solicitudesFiltradas = solicitudes.filter((solicitud) => {
    const requisicion = requisiciones.find(r => r.id?.toString() === solicitud.requisicion_id.toString());
    const contrato = contratos.find(c => c.id === requisicion?.contrato_id);
    const contratista = contrato ? contratistas.find(c => c.id === contrato.contratista_id) : null;
    
    // Filtros de texto
    if (filtroTextoFolio && !solicitud.folio.toLowerCase().includes(filtroTextoFolio.toLowerCase())) {
      return false;
    }
    
    if (filtroTextoContratista && !(contratista?.nombre || '').toLowerCase().includes(filtroTextoContratista.toLowerCase())) {
      return false;
    }
    
    if (filtroTextoRequisicion && !(requisicion?.numero || '').toLowerCase().includes(filtroTextoRequisicion.toLowerCase())) {
      return false;
    }
    
    if (filtroTextoFecha) {
      const fechaFormateada = new Date(solicitud.fecha).toLocaleDateString('es-MX');
      if (!fechaFormateada.toLowerCase().includes(filtroTextoFecha.toLowerCase())) {
        return false;
      }
    }
    
    if (filtroTextoFechaEsperada && solicitud.fecha_pago_esperada) {
      const fechaFormateada = new Date(solicitud.fecha_pago_esperada).toLocaleDateString('es-MX');
      if (!fechaFormateada.toLowerCase().includes(filtroTextoFechaEsperada.toLowerCase())) {
        return false;
      }
    }
    
    if (filtroTextoEstado && !solicitud.estado.toLowerCase().includes(filtroTextoEstado.toLowerCase())) {
      return false;
    }
    
    if (filtroTextoConceptos && !solicitud.concepto_ids.length.toString().includes(filtroTextoConceptos)) {
      return false;
    }
    
    if (filtroTextoMonto) {
      const monto = (requisicion?.monto_estimado || 0).toFixed(2);
      if (!monto.includes(filtroTextoMonto)) {
        return false;
      }
    }
    
    if (filtroTextoAmortizacion) {
      const amort = (requisicion?.amortizacion || 0).toFixed(2);
      if (!amort.includes(filtroTextoAmortizacion)) {
        return false;
      }
    }
    
    if (filtroTextoRetencion) {
      const ret = (requisicion?.retencion || 0).toFixed(2);
      if (!ret.includes(filtroTextoRetencion)) {
        return false;
      }
    }
    
    if (filtroTextoMontoPagado) {
      const montoPagado = (solicitud.monto_pagado || 0).toFixed(2);
      if (!montoPagado.includes(filtroTextoMontoPagado)) {
        return false;
      }
    }
    
    if (filtroTextoSubtotal) {
      const llevaIva = requisicion?.lleva_iva ?? (contrato?.tratamiento === 'MAS IVA');
      const subtotal = (llevaIva ? (requisicion?.total || 0) / 1.16 : (requisicion?.total || 0)).toFixed(2);
      if (!subtotal.includes(filtroTextoSubtotal)) {
        return false;
      }
    }
    
    if (filtroTextoIva) {
      const llevaIva = requisicion?.lleva_iva ?? (contrato?.tratamiento === 'MAS IVA');
      const iva = (llevaIva ? ((requisicion?.total || 0) / 1.16) * 0.16 : 0).toFixed(2);
      if (!iva.includes(filtroTextoIva)) {
        return false;
      }
    }
    
    if (filtroTextoTotal) {
      const total = (requisicion?.total || 0).toFixed(2);
      if (!total.includes(filtroTextoTotal)) {
        return false;
      }
    }
    
    // Filtro de texto para factura
    if (filtroTextoFactura) {
      const tieneFactura = requisicion?.factura_url ? 'con factura' : 'sin factura';
      if (!tieneFactura.includes(filtroTextoFactura.toLowerCase())) {
        return false;
      }
    }
    
    // Filtro de texto para Vo.Bo.
    if (filtroTextoVoBo) {
      const desarrollador = solicitud.vobo_desarrollador ? 'desarrollador' : '';
      const finanzas = solicitud.vobo_finanzas ? 'finanzas' : '';
      const textoVoBo = `${desarrollador} ${finanzas} ${solicitud.vobo_desarrollador_por || ''} ${solicitud.vobo_finanzas_por || ''}`.toLowerCase();
      if (!textoVoBo.includes(filtroTextoVoBo.toLowerCase())) {
        return false;
      }
    }
    
    // Filtro por contratista
    if (filtroContratista.length > 0 && !filtroContratista.includes(contratista?.nombre || 'Sin contratista')) {
      return false;
    }
    
    // Filtro por estado
    if (filtroEstado.length > 0 && !filtroEstado.includes(solicitud.estado)) {
      return false;
    }
    
    // Filtro por estatus de pago
    if (filtroEstatusPago.length > 0 && !filtroEstatusPago.includes(solicitud.estatus_pago || 'NO PAGADO')) {
      return false;
    }
    
    // Filtro por factura
    if (filtroFactura.length > 0) {
      const tieneFactura = requisicion?.factura_url ? 'Con Factura' : 'Sin Factura';
      if (!filtroFactura.includes(tieneFactura)) {
        return false;
      }
    }
    
    // Filtro por Vo.Bo.
    if (filtroVoBo.length > 0) {
      const estadoVoBo = 
        solicitud.vobo_desarrollador && solicitud.vobo_finanzas ? 'Ambos Vo.Bo.' :
        solicitud.vobo_desarrollador ? 'Solo Desarrollador' :
        solicitud.vobo_finanzas ? 'Solo Finanzas' :
        'Sin Vo.Bo.';
      if (!filtroVoBo.includes(estadoVoBo)) {
        return false;
      }
    }
    
    return true;
  }).sort((a, b) => {
    const requisicionA = requisiciones.find(r => r.id?.toString() === a.requisicion_id.toString());
    const requisicionB = requisiciones.find(r => r.id?.toString() === b.requisicion_id.toString());
    const contratoA = contratos.find(c => c.id === requisicionA?.contrato_id);
    const contratoB = contratos.find(c => c.id === requisicionB?.contrato_id);
    const contratistaA = contratoA ? contratistas.find(c => c.id === contratoA.contratista_id) : null;
    const contratistaB = contratoB ? contratistas.find(c => c.id === contratoB.contratista_id) : null;
    
    let compareValue = 0;
    
    switch (orderBy) {
      case 'folio':
        compareValue = a.folio.localeCompare(b.folio);
        break;
      case 'contratista':
        compareValue = (contratistaA?.nombre || '').localeCompare(contratistaB?.nombre || '');
        break;
      case 'requisicion':
        compareValue = (requisicionA?.numero || '').localeCompare(requisicionB?.numero || '');
        break;
      case 'fecha':
        compareValue = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
        break;
      case 'fecha_esperada':
        const fechaA = a.fecha_pago_esperada ? new Date(a.fecha_pago_esperada).getTime() : 0;
        const fechaB = b.fecha_pago_esperada ? new Date(b.fecha_pago_esperada).getTime() : 0;
        compareValue = fechaA - fechaB;
        break;
      case 'estado':
        compareValue = a.estado.localeCompare(b.estado);
        break;
      case 'total':
        compareValue = (requisicionA?.total || 0) - (requisicionB?.total || 0);
        break;
      case 'monto_pagado':
        compareValue = (a.monto_pagado || 0) - (b.monto_pagado || 0);
        break;
      case 'conceptos':
        compareValue = a.concepto_ids.length - b.concepto_ids.length;
        break;
      case 'amortizacion':
        const amortA = requisicionA?.amortizacion || 0;
        const amortB = requisicionB?.amortizacion || 0;
        compareValue = amortA - amortB;
        break;
      case 'retencion':
        const retA = requisicionA?.retencion || 0;
        const retB = requisicionB?.retencion || 0;
        compareValue = retA - retB;
        break;
      case 'subtotal':
        const contratoASubtotal = contratos.find(c => c.id === requisicionA?.contrato_id);
        const contratoBSubtotal = contratos.find(c => c.id === requisicionB?.contrato_id);
        const llevaIvaA = requisicionA?.lleva_iva ?? (contratoASubtotal?.tratamiento === 'MAS IVA');
        const llevaIvaB = requisicionB?.lleva_iva ?? (contratoBSubtotal?.tratamiento === 'MAS IVA');
        const subtotalA = llevaIvaA ? (requisicionA?.total || 0) / 1.16 : (requisicionA?.total || 0);
        const subtotalB = llevaIvaB ? (requisicionB?.total || 0) / 1.16 : (requisicionB?.total || 0);
        compareValue = subtotalA - subtotalB;
        break;
      case 'iva':
        const contratoAIva = contratos.find(c => c.id === requisicionA?.contrato_id);
        const contratoBIva = contratos.find(c => c.id === requisicionB?.contrato_id);
        const llevaIvaAIva = requisicionA?.lleva_iva ?? (contratoAIva?.tratamiento === 'MAS IVA');
        const llevaIvaBIva = requisicionB?.lleva_iva ?? (contratoBIva?.tratamiento === 'MAS IVA');
        const ivaA = llevaIvaAIva ? ((requisicionA?.total || 0) / 1.16) * 0.16 : 0;
        const ivaB = llevaIvaBIva ? ((requisicionB?.total || 0) / 1.16) * 0.16 : 0;
        compareValue = ivaA - ivaB;
        break;
      default:
        compareValue = 0;
    }
    
    return order === 'asc' ? compareValue : -compareValue;
  });

  // Obtener valores únicos para filtros
  const contratistasUnicos = Array.from(new Set(
    solicitudes.map(s => {
      const req = requisiciones.find(r => r.id?.toString() === s.requisicion_id.toString());
      const contrato = contratos.find(c => c.id === req?.contrato_id);
      const contratista = contrato ? contratistas.find(c => c.id === contrato.contratista_id) : null;
      return contratista?.nombre || 'Sin contratista';
    })
  )).sort();

  const estadosUnicos = Array.from(new Set(solicitudes.map(s => s.estado))).sort();
  const estatusPagoUnicos = Array.from(new Set(solicitudes.map(s => s.estatus_pago || 'NO PAGADO'))).sort();
  const facturaOpciones = ['Con Factura', 'Sin Factura'];
  const voBoOpciones = ['Ambos Vo.Bo.', 'Solo Desarrollador', 'Solo Finanzas', 'Sin Vo.Bo.'];

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
                <CheckCircleIcon sx={{ fontSize: 32, color: 'success.main' }} />
                <Typography variant="h4" fontWeight="bold" color="text.primary">
                  Solicitudes de Pago
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Gestiona tus solicitudes de pago creadas
              </Typography>
            </Box>
            {/* Botón Nueva Solicitud - Solo para roles administrativos */}
            {perfil?.roles && !perfil.roles.includes('CONTRATISTA') && !perfil.roles.includes('USUARIO') && (
              <Box>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => setMostrarFormSolicitud(true)}
                  startIcon={<SendIcon />}
                  sx={{
                    px: 4,
                    fontWeight: 600,
                    boxShadow: 3,
                    '&:hover': { boxShadow: 6 }
                  }}
                >
                  Nueva Solicitud
                </Button>
              </Box>
            )}
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
                  {solicitudesFiltradas.length} de {solicitudes.length} solicitud{solicitudesFiltradas.length !== 1 ? 'es' : ''}
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

              {/* Subtotal */}
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 2.5, 
                  minWidth: 200, 
                  bgcolor: 'secondary.lighter',
                  borderLeft: '4px solid',
                  borderColor: 'secondary.main'
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                  SUBTOTAL
                </Typography>
                <Typography variant="h5" fontWeight={700} color="secondary.dark">
                  ${solicitudesFiltradas.reduce((sum, s) => {
                    const req = requisiciones.find(r => r.id?.toString() === s.requisicion_id.toString());
                    return sum + (req?.subtotal || 0);
                  }, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Sin IVA
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
                    return sum + (req?.iva || 0);
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

        {/* Tabla de Solicitudes */}
        {loading ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Stack alignItems="center" spacing={2}>
              <CircularProgress size={40} />
              <Typography variant="body1" color="text.secondary" fontWeight={500}>
                Cargando solicitudes...
              </Typography>
            </Stack>
          </Paper>
        ) : solicitudesFiltradas.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <DescriptionIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.primary" fontWeight={600} gutterBottom>
              {solicitudes.length === 0 ? 'No hay solicitudes' : 'No hay solicitudes que coincidan con los filtros'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {solicitudes.length === 0 
                ? 'Crea tu primera solicitud de pago presionando el botón "Nueva Solicitud"'
                : 'Intenta ajustar los filtros para ver más resultados'
              }
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} elevation={2} sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 1780 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#334155' }}>
                  {/* Folio */}
                  <TableCell sx={{ color: '#fff', fontWeight: 700, py: 1, px: 1, width: 120 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'folio'}
                        direction={orderBy === 'folio' ? order : 'asc'}
                        onClick={() => handleRequestSort('folio')}
                        sx={{ 
                          color: '#fff !important',
                          '&:hover': { color: '#fff !important' },
                          '& .MuiTableSortLabel-icon': { color: '#fff !important' }
                        }}
                      >
                        Folio
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoFolio}
                        onChange={(e) => setFiltroTextoFolio(e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            fontSize: '0.75rem',
                            height: '28px',
                            bgcolor: 'rgba(255,255,255,0.1)',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                            '&.Mui-focused fieldset': { borderColor: '#fff' }
                          },
                          '& input::placeholder': { color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }
                        }}
                      />
                    </Stack>
                  </TableCell>
                  
                  {/* Contratista */}
                  <TableCell sx={{ color: '#fff', fontWeight: 700, py: 1, px: 1, width: 180 }}>
                    <Stack spacing={0.5}>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <TableSortLabel
                          active={orderBy === 'contratista'}
                          direction={orderBy === 'contratista' ? order : 'asc'}
                          onClick={() => handleRequestSort('contratista')}
                          sx={{ 
                            color: '#fff !important',
                            '&:hover': { color: '#fff !important' },
                            '& .MuiTableSortLabel-icon': { color: '#fff !important' }
                          }}
                        >
                          Contratista
                        </TableSortLabel>
                      </Stack>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoContratista}
                        onChange={(e) => setFiltroTextoContratista(e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            fontSize: '0.75rem',
                            height: '28px',
                            bgcolor: 'rgba(255,255,255,0.1)',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                            '&.Mui-focused fieldset': { borderColor: '#fff' }
                          },
                          '& input::placeholder': { color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }
                        }}
                      />
                    </Stack>
                  </TableCell>
                  
                  {/* Requisición */}
                  <TableCell sx={{ color: '#fff', fontWeight: 700, py: 1, px: 1, width: 140 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'requisicion'}
                        direction={orderBy === 'requisicion' ? order : 'asc'}
                        onClick={() => handleRequestSort('requisicion')}
                        sx={{ 
                          color: '#fff !important',
                          '&:hover': { color: '#fff !important' },
                          '& .MuiTableSortLabel-icon': { color: '#fff !important' }
                        }}
                      >
                        Requisición
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoRequisicion}
                        onChange={(e) => setFiltroTextoRequisicion(e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            fontSize: '0.75rem',
                            height: '28px',
                            bgcolor: 'rgba(255,255,255,0.1)',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                            '&.Mui-focused fieldset': { borderColor: '#fff' }
                          },
                          '& input::placeholder': { color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }
                        }}
                      />
                    </Stack>
                  </TableCell>
                  
                  {/* Fecha */}
                  <TableCell sx={{ color: '#fff', fontWeight: 700, py: 1, px: 1, width: 120 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'fecha'}
                        direction={orderBy === 'fecha' ? order : 'asc'}
                        onClick={() => handleRequestSort('fecha')}
                        sx={{ 
                          color: '#fff !important',
                          '&:hover': { color: '#fff !important' },
                          '& .MuiTableSortLabel-icon': { color: '#fff !important' }
                        }}
                      >
                        Fecha
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoFecha}
                        onChange={(e) => setFiltroTextoFecha(e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            fontSize: '0.75rem',
                            height: '28px',
                            bgcolor: 'rgba(255,255,255,0.1)',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                            '&.Mui-focused fieldset': { borderColor: '#fff' }
                          },
                          '& input::placeholder': { color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }
                        }}
                      />
                    </Stack>
                  </TableCell>
                  
                  {/* Fecha Esperada Pago */}
                  <TableCell sx={{ color: '#fff', fontWeight: 700, py: 1, px: 1, width: 150 }}>
                    <Stack spacing={0.5}>
                      <TableSortLabel
                        active={orderBy === 'fecha_esperada'}
                        direction={orderBy === 'fecha_esperada' ? order : 'asc'}
                        onClick={() => handleRequestSort('fecha_esperada')}
                        sx={{ 
                          color: '#fff !important',
                          '&:hover': { color: '#fff !important' },
                          '& .MuiTableSortLabel-icon': { color: '#fff !important' },
                          fontSize: '0.8rem'
                        }}
                      >
                        Fecha Esperada
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoFechaEsperada}
                        onChange={(e) => setFiltroTextoFechaEsperada(e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            fontSize: '0.75rem',
                            height: '28px',
                            bgcolor: 'rgba(255,255,255,0.1)',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                            '&.Mui-focused fieldset': { borderColor: '#fff' }
                          },
                          '& input::placeholder': { color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }
                        }}
                      />
                    </Stack>
                  </TableCell>
                  
                  {/* Estado */}
                  <TableCell sx={{ color: '#fff', fontWeight: 700, py: 1, px: 1, width: 220 }}>
                    <Stack spacing={0.5}>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <TableSortLabel
                          active={orderBy === 'estado'}
                          direction={orderBy === 'estado' ? order : 'asc'}
                          onClick={() => handleRequestSort('estado')}
                          sx={{ 
                            color: '#fff !important',
                            '&:hover': { color: '#fff !important' },
                            '& .MuiTableSortLabel-icon': { color: '#fff !important' }
                          }}
                        >
                          Estado
                        </TableSortLabel>
                      </Stack>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoEstado}
                        onChange={(e) => setFiltroTextoEstado(e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            fontSize: '0.75rem',
                            height: '28px',
                            bgcolor: 'rgba(255,255,255,0.1)',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                            '&.Mui-focused fieldset': { borderColor: '#fff' }
                          },
                          '& input::placeholder': { color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }
                        }}
                      />
                    </Stack>
                  </TableCell>
                  
                  {/* Conceptos */}
                  <TableCell align="right" sx={{ color: '#fff', fontWeight: 700, py: 1, px: 1, width: 100 }}>
                    <Stack spacing={0.5} alignItems="flex-end">
                      <TableSortLabel
                        active={orderBy === 'conceptos'}
                        direction={orderBy === 'conceptos' ? order : 'asc'}
                        onClick={() => handleRequestSort('conceptos')}
                        sx={{ 
                          color: '#fff !important',
                          '&:hover': { color: '#fff !important' },
                          '& .MuiTableSortLabel-icon': { color: '#fff !important' }
                        }}
                      >
                        Conceptos
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoConceptos}
                        onChange={(e) => setFiltroTextoConceptos(e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            fontSize: '0.75rem',
                            height: '28px',
                            bgcolor: 'rgba(255,255,255,0.1)',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                            '&.Mui-focused fieldset': { borderColor: '#fff' }
                          },
                          '& input::placeholder': { color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }
                        }}
                      />
                    </Stack>
                  </TableCell>
                  
                  {/* Monto */}
                  <TableCell align="right" sx={{ color: '#fff', fontWeight: 700, py: 1, px: 1, width: 120 }}>
                    <Stack spacing={0.5} alignItems="flex-end">
                      <TableSortLabel
                        active={orderBy === 'total'}
                        direction={orderBy === 'total' ? order : 'asc'}
                        onClick={() => handleRequestSort('total')}
                        sx={{ 
                          color: '#fff !important',
                          '&:hover': { color: '#fff !important' },
                          '& .MuiTableSortLabel-icon': { color: '#fff !important' }
                        }}
                      >
                        Monto
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoMonto}
                        onChange={(e) => setFiltroTextoMonto(e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            fontSize: '0.75rem',
                            height: '28px',
                            bgcolor: 'rgba(255,255,255,0.1)',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                            '&.Mui-focused fieldset': { borderColor: '#fff' }
                          },
                          '& input::placeholder': { color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }
                        }}
                      />
                    </Stack>
                  </TableCell>
                  
                  {/* Amortización */}
                  <TableCell align="right" sx={{ color: '#fff', fontWeight: 700, py: 1, px: 1, width: 120 }}>
                    <Stack spacing={0.5} alignItems="flex-end">
                      <TableSortLabel
                        active={orderBy === 'amortizacion'}
                        direction={orderBy === 'amortizacion' ? order : 'asc'}
                        onClick={() => handleRequestSort('amortizacion')}
                        sx={{ 
                          color: '#fff !important',
                          '&:hover': { color: '#fff !important' },
                          '& .MuiTableSortLabel-icon': { color: '#fff !important' },
                          fontSize: '0.85rem'
                        }}
                      >
                        Amortización
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoAmortizacion}
                        onChange={(e) => setFiltroTextoAmortizacion(e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            fontSize: '0.75rem',
                            height: '28px',
                            bgcolor: 'rgba(255,255,255,0.1)',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                            '&.Mui-focused fieldset': { borderColor: '#fff' }
                          },
                          '& input::placeholder': { color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }
                        }}
                      />
                    </Stack>
                  </TableCell>
                  
                  {/* Retención */}
                  <TableCell align="right" sx={{ color: '#fff', fontWeight: 700, py: 1, px: 1, width: 110 }}>
                    <Stack spacing={0.5} alignItems="flex-end">
                      <TableSortLabel
                        active={orderBy === 'retencion'}
                        direction={orderBy === 'retencion' ? order : 'asc'}
                        onClick={() => handleRequestSort('retencion')}
                        sx={{ 
                          color: '#fff !important',
                          '&:hover': { color: '#fff !important' },
                          '& .MuiTableSortLabel-icon': { color: '#fff !important' },
                          fontSize: '0.85rem'
                        }}
                      >
                        Retención
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoRetencion}
                        onChange={(e) => setFiltroTextoRetencion(e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            fontSize: '0.75rem',
                            height: '28px',
                            bgcolor: 'rgba(255,255,255,0.1)',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                            '&.Mui-focused fieldset': { borderColor: '#fff' }
                          },
                          '& input::placeholder': { color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }
                        }}
                      />
                    </Stack>
                  </TableCell>
                  
                  {/* Monto Pagado */}
                  <TableCell align="right" sx={{ color: '#fff', fontWeight: 700, py: 1, px: 1, width: 120 }}>
                    <Stack spacing={0.5} alignItems="flex-end">
                      <TableSortLabel
                        active={orderBy === 'monto_pagado'}
                        direction={orderBy === 'monto_pagado' ? order : 'asc'}
                        onClick={() => handleRequestSort('monto_pagado')}
                        sx={{ 
                          color: '#fff !important',
                          '&:hover': { color: '#fff !important' },
                          '& .MuiTableSortLabel-icon': { color: '#fff !important' },
                          fontSize: '0.8rem'
                        }}
                      >
                        Monto Pagado
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoMontoPagado}
                        onChange={(e) => setFiltroTextoMontoPagado(e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            fontSize: '0.75rem',
                            height: '28px',
                            bgcolor: 'rgba(255,255,255,0.1)',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                            '&.Mui-focused fieldset': { borderColor: '#fff' }
                          },
                          '& input::placeholder': { color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }
                        }}
                      />
                    </Stack>
                  </TableCell>
                  
                  {/* Subtotal */}
                  <TableCell align="right" sx={{ color: '#fff', fontWeight: 700, py: 1, px: 1, width: 120 }}>
                    <Stack spacing={0.5} alignItems="flex-end">
                      <TableSortLabel
                        active={orderBy === 'subtotal'}
                        direction={orderBy === 'subtotal' ? order : 'asc'}
                        onClick={() => handleRequestSort('subtotal')}
                        sx={{ 
                          color: '#fff !important',
                          '&:hover': { color: '#fff !important' },
                          '& .MuiTableSortLabel-icon': { color: '#fff !important' }
                        }}
                      >
                        Subtotal
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoSubtotal}
                        onChange={(e) => setFiltroTextoSubtotal(e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            fontSize: '0.75rem',
                            height: '28px',
                            bgcolor: 'rgba(255,255,255,0.1)',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                            '&.Mui-focused fieldset': { borderColor: '#fff' }
                          },
                          '& input::placeholder': { color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }
                        }}
                      />
                    </Stack>
                  </TableCell>
                  
                  {/* IVA */}
                  <TableCell align="right" sx={{ color: '#fff', fontWeight: 700, py: 1, px: 1, width: 100 }}>
                    <Stack spacing={0.5} alignItems="flex-end">
                      <TableSortLabel
                        active={orderBy === 'iva'}
                        direction={orderBy === 'iva' ? order : 'asc'}
                        onClick={() => handleRequestSort('iva')}
                        sx={{ 
                          color: '#fff !important',
                          '&:hover': { color: '#fff !important' },
                          '& .MuiTableSortLabel-icon': { color: '#fff !important' },
                          fontSize: '0.85rem'
                        }}
                      >
                        IVA (16%)
                      </TableSortLabel>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoIva}
                        onChange={(e) => setFiltroTextoIva(e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            fontSize: '0.75rem',
                            height: '28px',
                            bgcolor: 'rgba(255,255,255,0.1)',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                            '&.Mui-focused fieldset': { borderColor: '#fff' }
                          },
                          '& input::placeholder': { color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }
                        }}
                      />
                    </Stack>
                  </TableCell>
                  
                  {/* Total */}
                  <TableCell align="right" sx={{ color: '#fff', fontWeight: 700, py: 1, px: 1, width: 120 }}>
                    <Stack spacing={0.5} alignItems="flex-end">
                      <span>Total</span>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoTotal}
                        onChange={(e) => setFiltroTextoTotal(e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            fontSize: '0.75rem',
                            height: '28px',
                            bgcolor: 'rgba(255,255,255,0.1)',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                            '&.Mui-focused fieldset': { borderColor: '#fff' }
                          },
                          '& input::placeholder': { color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }
                        }}
                      />
                    </Stack>
                  </TableCell>
                  
                  {/* Factura */}
                  <TableCell align="center" sx={{ color: '#fff', fontWeight: 700, py: 1, px: 1, width: 120 }}>
                    <Stack spacing={0.5} alignItems="center">
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <span>Factura</span>
                        <IconButton
                          size="small"
                          onClick={(e) => handleOpenFiltro(e, 'factura')}
                          sx={{ color: filtroFactura.length > 0 ? '#fbbf24' : '#fff', p: 0.3 }}
                        >
                          <FilterListIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoFactura}
                        onChange={(e) => setFiltroTextoFactura(e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            fontSize: '0.75rem',
                            height: '28px',
                            bgcolor: 'rgba(255,255,255,0.1)',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                            '&.Mui-focused fieldset': { borderColor: '#fff' }
                          },
                          '& input::placeholder': { color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }
                        }}
                      />
                    </Stack>
                  </TableCell>
                  
                  {/* Vo.Bo. / Pago */}
                  <TableCell align="center" sx={{ color: '#fff', fontWeight: 700, py: 1, px: 1, width: 150 }}>
                    <Stack spacing={0.5} alignItems="center">
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <span>Vo.Bo. / Pago</span>
                        <IconButton
                          size="small"
                          onClick={(e) => handleOpenFiltro(e, 'vobo')}
                          sx={{ color: filtroVoBo.length > 0 ? '#fbbf24' : '#fff', p: 0.3 }}
                        >
                          <FilterListIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={filtroTextoVoBo}
                        onChange={(e) => setFiltroTextoVoBo(e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            fontSize: '0.75rem',
                            height: '28px',
                            bgcolor: 'rgba(255,255,255,0.1)',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                            '&.Mui-focused fieldset': { borderColor: '#fff' }
                          },
                          '& input::placeholder': { color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }
                        }}
                      />
                    </Stack>
                  </TableCell>
                  
                  {/* Acción */}
                  <TableCell align="center" sx={{ color: '#fff', fontWeight: 700, py: 1, px: 1, width: 100 }}>
                    Acción
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {solicitudesFiltradas.map((solicitud) => {
                  const requisicion = requisiciones.find(r => r.id?.toString() === solicitud.requisicion_id.toString());
                  const contrato = contratos.find(c => c.id === requisicion?.contrato_id);
                  const contratista = contrato ? contratistas.find(c => c.id === contrato.contratista_id) : null;
                  
                  // Usar los montos DIRECTAMENTE desde la requisición (fuente de verdad)
                  const importeBruto = requisicion?.monto_estimado || 0;
                  const montoRetencion = requisicion?.retencion || 0;
                  const montoAnticipo = requisicion?.amortizacion || 0;
                  const otrosDescuentos = requisicion?.otros_descuentos || 0;
                  
                  // Calcular porcentajes para mostrar
                  const porcentajeRetencion = importeBruto > 0 ? Math.round((montoRetencion / importeBruto) * 100 * 100) / 100 : 0;
                  const porcentajeAnticipo = importeBruto > 0 ? Math.round((montoAnticipo / importeBruto) * 100 * 100) / 100 : 0;
                  
                  // Usar el total directamente desde la requisición (ya incluye IVA si aplica)
                  const totalNeto = requisicion?.total || 0;
                  
                  // Calcular subtotal e IVA igual que en RequisicionesPagoPage
                  const llevaIva = requisicion?.lleva_iva ?? (contrato?.tratamiento === 'MAS IVA');
                  const subtotal = llevaIva ? totalNeto / 1.16 : totalNeto;
                  const montoIva = llevaIva ? (totalNeto / 1.16) * 0.16 : 0;
                  
                  return (
                    <TableRow key={solicitud.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} color="primary">
                          {solicitud.folio}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 180, color: 'secondary.dark' }}>
                          {contratista?.nombre || 'Sin contratista'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {requisicion?.numero || 'N/A'}
                        </Typography>
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
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          {getSolicitudEstadoBadge(solicitud.estado)}
                          {solicitud.estatus_pago === 'PAGADO' && (
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
                          {solicitud.estatus_pago === 'PAGADO PARCIALMENTE' && (
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
                      <TableCell align="right">
                        <Typography variant="body2">
                          {solicitud.concepto_ids.length}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>
                          ${importeBruto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="warning.main" fontSize="0.85rem">
                          -${montoAnticipo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                        {porcentajeAnticipo > 0 && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            ({porcentajeAnticipo}%)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="error.main" fontSize="0.85rem">
                          -${montoRetencion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                        {porcentajeRetencion > 0 && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            ({porcentajeRetencion}%)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600} color="info.dark">
                          ${solicitud.monto_pagado ? solicitud.monto_pagado.toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600} color="info.dark">
                          ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="info.main">
                          {montoIva > 0 ? `$${montoIva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700} color="success.dark">
                          ${totalNeto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                        {(() => {
                          const llevaIva = requisicion?.lleva_iva ?? (contrato?.tratamiento === 'MAS IVA');
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
                        {requisicion?.factura_url ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<DescriptionIcon />}
                            onClick={() => window.open(requisicion.factura_url, '_blank')}
                          >
                            Ver
                          </Button>
                        ) : (
                          <Tooltip title="Se requiere factura para dar Vo.Bo.">
                            <Chip 
                              label="Sin factura" 
                              size="small" 
                              color="error"
                              variant="outlined"
                              sx={{ fontWeight: 600 }}
                            />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                          {/* Vo.Bo. Desarrollador */}
                          {solicitud.vobo_desarrollador ? (
                            <Tooltip title={`Vo.Bo. Desarrollador: ${solicitud.vobo_desarrollador_por || 'Aprobado'}`}>
                              <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                            </Tooltip>
                          ) : (
                            <Tooltip title="Vo.Bo. Desarrollador pendiente">
                              <ClockIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                            </Tooltip>
                          )}
                          
                          {/* Vo.Bo. Finanzas */}
                          {solicitud.vobo_finanzas ? (
                            <Tooltip title={`Vo.Bo. Finanzas: ${solicitud.vobo_finanzas_por || 'Aprobado'}`}>
                              <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                            </Tooltip>
                          ) : (
                            <Tooltip title="Vo.Bo. Finanzas pendiente">
                              <ClockIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                            </Tooltip>
                          )}
                          
                          {/* Indicador de Pago */}
                          {solicitud.estatus_pago === 'PAGADO' && (
                            <Tooltip title={`Pagado el ${solicitud.fecha_pago ? new Date(solicitud.fecha_pago).toLocaleDateString('es-MX') : 'N/A'}`}>
                              <AttachMoneyIcon sx={{ color: 'success.dark', fontSize: 22, fontWeight: 'bold' }} />
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                          {/* Botón Vo.Bo. - Solo para SUPERVISION_ELARA y GERENTE_PLATAFORMA */}
                          {!solicitud.vobo_gerencia && 
                           solicitud.estado === 'pendiente' && 
                           perfil?.roles && 
                           (perfil.roles.includes('SUPERVISION_ELARA') || 
                            perfil.roles.includes('GERENTE_PLATAFORMA') ||
                            perfil.roles.includes('Gerente Plataforma')) && (
                            <Tooltip title={
                              !requisicion?.factura_url 
                                ? "No se puede dar Vo.Bo. sin factura" 
                                : "Dar Visto Bueno"
                            }>
                              <span>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => {
                                    if (!requisicion?.factura_url) {
                                      alert('⚠️ No se puede dar Visto Bueno sin factura.\n\nPor favor, solicita al contratista que suba la factura en la requisición antes de aprobar.');
                                      return;
                                    }
                                    setSolicitudVoBo(solicitud);
                                  }}
                                  disabled={!requisicion?.factura_url}
                                  sx={{
                                    bgcolor: requisicion?.factura_url ? 'primary.lighter' : 'action.disabledBackground',
                                    '&:hover': { bgcolor: requisicion?.factura_url ? 'primary.light' : 'action.disabledBackground' },
                                    '&.Mui-disabled': {
                                      bgcolor: 'action.disabledBackground',
                                      color: 'action.disabled'
                                    }
                                  }}
                                >
                                  <ThumbUpIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                          {solicitud.vobo_gerencia && (
                            <Chip 
                              label="Vo.Bo. Dado" 
                              size="small" 
                              color="success"
                              sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                            />
                          )}
                          
                          {/* Botón Ver */}
                          <Tooltip title="Ver solicitud">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => setSolicitudVer(solicitud)}
                              sx={{
                                bgcolor: 'info.lighter',
                                '&:hover': { bgcolor: 'info.light' }
                              }}
                            >
                              <VisibilityIcon fontSize="small" />
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

      {/* Modal Formulario de Nueva Solicitud */}
      <SolicitudPagoForm
        open={mostrarFormSolicitud}
        onClose={() => setMostrarFormSolicitud(false)}
        onSave={async () => { 
          await syncService.forcePush(); 
          await loadData();
          setMostrarFormSolicitud(false); 
        }}
      />

      {/* Modal Ver Solicitud (Solo Lectura) */}
      <Dialog
        open={!!solicitudVer}
        onClose={() => setSolicitudVer(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={600}>
              Solicitud {solicitudVer?.folio}
            </Typography>
            <IconButton onClick={() => setSolicitudVer(null)} size="small">
              <XCircleIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {solicitudVer && (
            <Stack spacing={2}>
              {/* Info General */}
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>Información General</Typography>
                <Stack spacing={1}>
                  <Typography variant="body2"><strong>Requisición:</strong> {requisiciones.find(r => r.id === solicitudVer.requisicion_id)?.numero || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Fecha:</strong> {new Date(solicitudVer.fecha).toLocaleDateString('es-MX')}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" component="span"><strong>Estado:</strong></Typography>
                    {getSolicitudEstadoBadge(solicitudVer.estado)}
                  </Box>
                  <Typography variant="body2"><strong>Total:</strong> ${solicitudVer.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                  {solicitudVer.notas && (
                    <Typography variant="body2"><strong>Notas:</strong> {solicitudVer.notas}</Typography>
                  )}
                </Stack>
              </Paper>

              {/* Documentos de la Requisición */}
              {(() => {
                const requisicion = requisiciones.find(r => r.id === solicitudVer.requisicion_id);
                if (requisicion?.respaldo_documental && requisicion.respaldo_documental.length > 0) {
                  return (
                    <Paper sx={{ p: 2, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.main' }}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ color: 'info.dark' }}>
                        📎 Documentos de la Requisición
                      </Typography>
                      <Stack spacing={1}>
                        {requisicion.respaldo_documental.map((url, idx) => {
                          const fileName = url.split('/').pop() || 'archivo';
                          const fileExtension = fileName.split('.').pop()?.toUpperCase() || 'FILE';
                          return (
                            <Box 
                              key={idx}
                              component="a"
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1,
                                p: 1,
                                bgcolor: 'white',
                                borderRadius: 1,
                                textDecoration: 'none',
                                color: 'inherit',
                                '&:hover': { bgcolor: 'action.hover', textDecoration: 'underline' }
                              }}
                            >
                              <Chip 
                                label={fileExtension} 
                                size="small" 
                                color={fileExtension === 'PDF' ? 'error' : 'success'}
                                sx={{ minWidth: 50 }}
                              />
                              <Typography variant="body2">
                                {fileName}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Stack>
                    </Paper>
                  );
                }
                return null;
              })()}

              {/* Factura de la Requisición */}
              {(() => {
                const requisicion = requisiciones.find(r => r.id === solicitudVer.requisicion_id);
                if (requisicion?.factura_url) {
                  const fileName = requisicion.factura_url.split('/').pop() || 'factura.pdf';
                  return (
                    <Paper sx={{ p: 2, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.main' }}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ color: 'warning.dark' }}>
                        🧾 Factura
                      </Typography>
                      <Box 
                        component="a"
                        href={requisicion.factura_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          p: 1,
                          bgcolor: 'white',
                          borderRadius: 1,
                          textDecoration: 'none',
                          color: 'inherit',
                          '&:hover': { bgcolor: 'action.hover', textDecoration: 'underline' }
                        }}
                      >
                        <Chip 
                          label="PDF" 
                          size="small" 
                          color="error"
                          sx={{ minWidth: 50 }}
                        />
                        <Typography variant="body2">
                          {fileName}
                        </Typography>
                      </Box>
                    </Paper>
                  );
                }
                return null;
              })()}

              {/* Conceptos */}
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>Conceptos ({solicitudVer.conceptos_detalle.length})</Typography>
                <Stack spacing={1}>
                  {solicitudVer.conceptos_detalle.map((concepto, idx) => (
                    <Box key={idx} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="body2" fontWeight={500}>{concepto.concepto_descripcion}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Clave: {concepto.concepto_clave} | Cantidad: {concepto.cantidad} | P.U.: ${concepto.precio_unitario.toLocaleString('es-MX')} | Importe: ${concepto.importe.toLocaleString('es-MX')}
                      </Typography>
                      
                      {/* Documentos de Respaldo */}
                      {concepto.respaldo_documental && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.light' }}>
                          <Typography variant="caption" fontWeight={600} sx={{ color: 'info.dark', display: 'block', mb: 0.5 }}>
                            📎 Documento
                          </Typography>
                          {(() => {
                            const urls = concepto.respaldo_documental.split(',').map(u => u.trim());
                            return urls.map((url, urlIdx) => {
                              const fileName = url.split('/').pop() || 'archivo';
                              const fileExtension = fileName.split('.').pop()?.toUpperCase() || 'FILE';
                              return (
                                <Box 
                                  key={urlIdx}
                                  component="a"
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 0.5,
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    '&:hover': { textDecoration: 'underline' }
                                  }}
                                >
                                  <Chip 
                                    label={fileExtension} 
                                    size="small" 
                                    color={fileExtension === 'PDF' ? 'error' : 'success'}
                                    sx={{ minWidth: 45, height: 20, fontSize: '0.65rem' }}
                                  />
                                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                                    {fileName}
                                  </Typography>
                                </Box>
                              );
                            });
                          })()}
                        </Box>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Paper>

              {/* Estado de Pagos */}
              {(solicitudVer.monto_pagado || solicitudVer.fecha_pago) && (
                <Paper sx={{ p: 2, bgcolor: 'success.lighter' }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>Información de Pago</Typography>
                  <Stack spacing={1}>
                    {solicitudVer.monto_pagado && (
                      <Typography variant="body2"><strong>Monto Pagado:</strong> ${solicitudVer.monto_pagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    )}
                    {solicitudVer.fecha_pago && (
                      <Typography variant="body2"><strong>Fecha de Pago:</strong> {new Date(solicitudVer.fecha_pago).toLocaleDateString('es-MX')}</Typography>
                    )}
                    {solicitudVer.referencia_pago && (
                      <Typography variant="body2"><strong>Referencia:</strong> {solicitudVer.referencia_pago}</Typography>
                    )}
                  </Stack>
                </Paper>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de Visto Bueno */}
      <VistoBuenoSolicitudDialog
        open={!!solicitudVoBo}
        solicitud={solicitudVoBo}
        onClose={() => setSolicitudVoBo(null)}
        onSaved={async () => { await syncService.forcePush(); await loadData(); }}
      />

      {/* Menús de Filtro */}
      {/* Filtro Contratista */}
      <Menu
        anchorEl={anchorElFiltro['contratista']}
        open={Boolean(anchorElFiltro['contratista'])}
        onClose={() => handleCloseFiltro('contratista')}
        PaperProps={{ sx: { maxHeight: 400 } }}
      >
        <MenuItem disabled sx={{ opacity: 1, fontWeight: 600, color: 'primary.main' }}>
          Filtrar por Contratista
        </MenuItem>
        {contratistasUnicos.map((nombre) => (
          <MenuItem
            key={nombre}
            onClick={() => handleToggleFiltro(filtroContratista, setFiltroContratista, nombre)}
            sx={{ py: 0.5 }}
          >
            <Checkbox 
              checked={filtroContratista.includes(nombre)} 
              size="small"
            />
            <ListItemText primary={nombre} />
          </MenuItem>
        ))}
        {filtroContratista.length > 0 && (
          <MenuItem 
            onClick={() => setFiltroContratista([])}
            sx={{ borderTop: 1, borderColor: 'divider', color: 'error.main', fontWeight: 600 }}
          >
            Limpiar filtro
          </MenuItem>
        )}
      </Menu>

      {/* Filtro Estado */}
      <Menu
        anchorEl={anchorElFiltro['estado']}
        open={Boolean(anchorElFiltro['estado'])}
        onClose={() => handleCloseFiltro('estado')}
      >
        <MenuItem disabled sx={{ opacity: 1, fontWeight: 600, color: 'primary.main' }}>
          Filtrar por Estado
        </MenuItem>
        {estadosUnicos.map((estado) => (
          <MenuItem
            key={estado}
            onClick={() => handleToggleFiltro(filtroEstado, setFiltroEstado, estado)}
            sx={{ py: 0.5 }}
          >
            <Checkbox 
              checked={filtroEstado.includes(estado)} 
              size="small"
            />
            <ListItemText 
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getSolicitudEstadoBadge(estado as SolicitudPago['estado'])}
                </Box>
              } 
            />
          </MenuItem>
        ))}
        {filtroEstado.length > 0 && (
          <MenuItem 
            onClick={() => setFiltroEstado([])}
            sx={{ borderTop: 1, borderColor: 'divider', color: 'error.main', fontWeight: 600 }}
          >
            Limpiar filtro
          </MenuItem>
        )}
      </Menu>

      {/* Filtro Estatus Pago */}
      <Menu
        anchorEl={anchorElFiltro['estatus_pago']}
        open={Boolean(anchorElFiltro['estatus_pago'])}
        onClose={() => handleCloseFiltro('estatus_pago')}
      >
        <MenuItem disabled sx={{ opacity: 1, fontWeight: 600, color: 'primary.main' }}>
          Filtrar por Estatus de Pago
        </MenuItem>
        {estatusPagoUnicos.map((estatus) => (
          <MenuItem
            key={estatus}
            onClick={() => handleToggleFiltro(filtroEstatusPago, setFiltroEstatusPago, estatus)}
            sx={{ py: 0.5 }}
          >
            <Checkbox 
              checked={filtroEstatusPago.includes(estatus)} 
              size="small"
            />
            <ListItemText 
              primary={
                <Chip 
                  label={estatus} 
                  size="small" 
                  color={estatus === 'PAGADO' ? 'success' : estatus === 'PAGADO PARCIALMENTE' ? 'warning' : 'default'}
                  sx={{ fontWeight: 600 }}
                />
              } 
            />
          </MenuItem>
        ))}
        {filtroEstatusPago.length > 0 && (
          <MenuItem 
            onClick={() => setFiltroEstatusPago([])}
            sx={{ borderTop: 1, borderColor: 'divider', color: 'error.main', fontWeight: 600 }}
          >
            Limpiar filtro
          </MenuItem>
        )}
      </Menu>

      {/* Filtro Factura */}
      <Menu
        anchorEl={anchorElFiltro['factura']}
        open={Boolean(anchorElFiltro['factura'])}
        onClose={() => handleCloseFiltro('factura')}
      >
        <MenuItem disabled sx={{ opacity: 1, fontWeight: 600, color: 'primary.main' }}>
          Filtrar por Factura
        </MenuItem>
        {facturaOpciones.map((opcion) => (
          <MenuItem
            key={opcion}
            onClick={() => handleToggleFiltro(filtroFactura, setFiltroFactura, opcion)}
            sx={{ py: 0.5 }}
          >
            <Checkbox 
              checked={filtroFactura.includes(opcion)} 
              size="small"
            />
            <ListItemText 
              primary={
                <Chip 
                  label={opcion} 
                  size="small" 
                  color={opcion === 'Con Factura' ? 'success' : 'error'}
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              } 
            />
          </MenuItem>
        ))}
        {filtroFactura.length > 0 && (
          <MenuItem 
            onClick={() => setFiltroFactura([])}
            sx={{ borderTop: 1, borderColor: 'divider', color: 'error.main', fontWeight: 600 }}
          >
            Limpiar filtro
          </MenuItem>
        )}
      </Menu>

      {/* Filtro Vo.Bo. */}
      <Menu
        anchorEl={anchorElFiltro['vobo']}
        open={Boolean(anchorElFiltro['vobo'])}
        onClose={() => handleCloseFiltro('vobo')}
      >
        <MenuItem disabled sx={{ opacity: 1, fontWeight: 600, color: 'primary.main' }}>
          Filtrar por Visto Bueno
        </MenuItem>
        {voBoOpciones.map((opcion) => (
          <MenuItem
            key={opcion}
            onClick={() => handleToggleFiltro(filtroVoBo, setFiltroVoBo, opcion)}
            sx={{ py: 0.5 }}
          >
            <Checkbox 
              checked={filtroVoBo.includes(opcion)} 
              size="small"
            />
            <ListItemText 
              primary={
                <Stack direction="row" spacing={0.5} alignItems="center">
                  {opcion === 'Ambos Vo.Bo.' && (
                    <>
                      <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                      <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                      <Typography variant="body2">{opcion}</Typography>
                    </>
                  )}
                  {opcion === 'Solo Desarrollador' && (
                    <>
                      <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                      <ClockIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      <Typography variant="body2">{opcion}</Typography>
                    </>
                  )}
                  {opcion === 'Solo Finanzas' && (
                    <>
                      <ClockIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                      <Typography variant="body2">{opcion}</Typography>
                    </>
                  )}
                  {opcion === 'Sin Vo.Bo.' && (
                    <>
                      <ClockIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      <ClockIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      <Typography variant="body2">{opcion}</Typography>
                    </>
                  )}
                </Stack>
              } 
            />
          </MenuItem>
        ))}
        {filtroVoBo.length > 0 && (
          <MenuItem 
            onClick={() => setFiltroVoBo([])}
            sx={{ borderTop: 1, borderColor: 'divider', color: 'error.main', fontWeight: 600 }}
          >
            Limpiar filtro
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default SolicitudesPagoPage;
