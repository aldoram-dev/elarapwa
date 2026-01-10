import React, { useState, useEffect } from 'react';
import { SolicitudPago } from '@/types/solicitud-pago';
import { RequisicionPago } from '@/types/requisicion-pago';
import { Contrato } from '@/types/contrato';
import { Contratista } from '@/types/contratista';
import { db } from '@/db/database';
import { supabase } from '@/lib/core/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useProyectoStore } from '@/stores/proyectoStore';
import { DesgloseSolicitudModal } from '@/components/obra/DesgloseSolicitudModal';
import { EstadoCuentaPDF } from '@/components/obra/EstadoCuentaPDF';
import { PDFDownloadLink } from '@react-pdf/renderer';
import {
  Alert,
  AlertTitle,
  Box,
  Container,
  Paper,
  Stack,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select as MuiSelect,
  Tabs,
  Tab,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Assessment as AssessmentIcon, Visibility as VisibilityIcon, PictureAsPdf as PdfIcon } from '@mui/icons-material';

interface EstadoCuentaContratista {
  contratista: Contratista;
  contratos: {
    contrato: Contrato;
    requisiciones: RequisicionPago[];
    solicitudes: SolicitudPago[];
    totalContrato: number;
    totalRequisiciones: number;
    totalPagado: number;
    pendientePago: number;
  }[];
  totalGeneral: number;
  totalPagadoGeneral: number;
  pendienteGeneral: number;
}

export const EstadoCuentaPage: React.FC = () => {
  const { perfil } = useAuth();
  const { proyectos } = useProyectoStore();
  const proyectoActual = proyectos[0];

  const [loading, setLoading] = useState(true);
  const [estadosCuenta, setEstadosCuenta] = useState<EstadoCuentaContratista[]>([]);
  const [contratistas, setContratistas] = useState<Contratista[]>([]);
  const [contratistaSeleccionado, setContratistaSeleccionado] = useState<string>('todos');
  const [tabActual, setTabActual] = useState(0);
  
  // Estados para pestaña de Estado de Cuenta Contrato
  const [contratistaContrato, setContratistaContrato] = useState<string>('');
  const [contratoSeleccionado, setContratoSeleccionado] = useState<string>('');
  const [contratosDisponibles, setContratosDisponibles] = useState<Contrato[]>([]);
  const [detalleContrato, setDetalleContrato] = useState<any>(null);
  
  // Estado para modal de desglose
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudPago | null>(null);
  const [mostrarDesglose, setMostrarDesglose] = useState(false);

  useEffect(() => {
    loadContratistas();
  }, []);

  // Inicializar contratista para tab 2 si es CONTRATISTA o USUARIO
  useEffect(() => {
    const esContratistaOUsuario = perfil?.roles?.some(r => r === 'CONTRATISTA' || r === 'USUARIO');
    if (esContratistaOUsuario && perfil?.contratista_id && contratistas.length > 0 && !contratistaContrato) {
      setContratistaContrato(perfil.contratista_id);
    }
  }, [perfil, contratistas, contratistaContrato]);

  useEffect(() => {
    if (contratistas.length > 0) {
      loadEstadosCuenta();
    }
  }, [contratistaSeleccionado, contratistas.length]);

  // Cargar contratos cuando cambie el contratista seleccionado en tab 2
  useEffect(() => {
    if (contratistaContrato) {
      loadContratosPorContratista(contratistaContrato);
    }
  }, [contratistaContrato]);

  // Cargar detalle cuando cambie el contrato seleccionado
  useEffect(() => {
    if (contratoSeleccionado) {
      loadDetalleContrato(contratoSeleccionado);
    }
  }, [contratoSeleccionado]);

  const loadContratistas = async () => {
    try {
      // Cargar contratistas desde Supabase
      const { data: todosContratistas, error } = await supabase
        .from('contratistas')
        .select('*')
        .eq('active', true)
        .order('nombre', { ascending: true });

      if (error) throw error;

      console.log(`👥 Contratistas cargados: ${todosContratistas?.length || 0}`);
      setContratistas(todosContratistas || []);

      // Si es CONTRATISTA o USUARIO, establecer su contratista automáticamente
      const esContratistaOUsuario = perfil?.roles?.some(r => r === 'CONTRATISTA' || r === 'USUARIO');
      if (esContratistaOUsuario && perfil?.contratista_id && todosContratistas && todosContratistas.length > 0) {
        console.log(`🔒 Usuario contratista, fijando a: ${perfil.contratista_id}`);
        setContratistaSeleccionado(perfil.contratista_id);
      }
    } catch (error) {
      console.error('❌ Error cargando contratistas:', error);
    }
  };

  const loadEstadosCuenta = async () => {
    try {
      setLoading(true);
      console.log('📊 Cargando estado de cuenta...');

      // Cargar datos desde Supabase
      const { data: contratos } = await supabase
        .from('contratos')
        .select('*')
        .eq('active', true);
        
      const { data: requisiciones } = await supabase
        .from('requisiciones_pago')
        .select('*');
        
      const { data: solicitudes } = await supabase
        .from('solicitudes_pago')
        .select('*');

      console.log(`📦 Datos: ${contratistas.length} contratistas, ${contratos?.length || 0} contratos, ${requisiciones?.length || 0} requisiciones, ${solicitudes?.length || 0} solicitudes`);

      // Filtrar contratistas según selección
      const contratistasFiltrados = contratistaSeleccionado === 'todos' 
        ? contratistas 
        : contratistas.filter(c => c.id === contratistaSeleccionado);

      console.log(`🎯 Contratistas filtrados: ${contratistasFiltrados.length} (selección: ${contratistaSeleccionado})`);

      // Agrupar por contratista
      const estadosPorContratista: EstadoCuentaContratista[] = [];

      for (const contratista of contratistasFiltrados) {
        const contratosContratista = (contratos || []).filter(c => c.contratista_id === contratista.id);
        
        if (contratosContratista.length === 0) continue;

        const contratosSummary = contratosContratista.map(contrato => {
          const requisicionesContrato = (requisiciones || []).filter(r => r.contrato_id === contrato.id);
          const solicitudesContrato = (solicitudes || []).filter(s => 
            requisicionesContrato.some(r => r.id?.toString() === s.requisicion_id.toString())
          );

          const totalContrato = contrato.monto_contrato || 0;
          
          // Total de requisiciones: usar directamente el total de cada requisición
          // (ya incluye todos los descuentos: retenciones, amortizaciones, IVA, etc.)
          const totalRequisiciones = requisicionesContrato.reduce((sum, r) => sum + (r.total || 0), 0);
          
          // Total pagado desde solicitudes_pago (monto_pagado)
          const totalPagado = solicitudesContrato.reduce((sum, s) => sum + (s.monto_pagado || 0), 0);
          const pendientePago = totalRequisiciones - totalPagado;

          return {
            contrato,
            requisiciones: requisicionesContrato,
            solicitudes: solicitudesContrato,
            totalContrato,
            totalRequisiciones,
            totalPagado,
            pendientePago,
          };
        });

        const totalGeneral = contratosSummary.reduce((sum, c) => sum + c.totalContrato, 0);
        const totalPagadoGeneral = contratosSummary.reduce((sum, c) => sum + c.totalPagado, 0);
        const pendienteGeneral = contratosSummary.reduce((sum, c) => sum + c.pendientePago, 0);

        estadosPorContratista.push({
          contratista,
          contratos: contratosSummary,
          totalGeneral,
          totalPagadoGeneral,
          pendienteGeneral,
        });
      }

      console.log(`✅ Estado de cuenta generado para ${estadosPorContratista.length} contratistas`);
      setEstadosCuenta(estadosPorContratista);
    } catch (error) {
      console.error('❌ Error cargando estados de cuenta:', error);
      setEstadosCuenta([]);
    } finally {
      setLoading(false);
    }
  };

  const loadContratosPorContratista = async (contratistaId: string) => {
    try {
      console.log('🔍 Cargando contratos del contratista:', contratistaId);
      
      const { data: contratos } = await supabase
        .from('contratos')
        .select('*')
        .eq('contratista_id', contratistaId)
        .eq('active', true)
        .order('nombre', { ascending: true });

      console.log('📋 Contratos encontrados:', contratos?.length || 0);
      setContratosDisponibles(contratos || []);
      
      // Auto-seleccionar el primer contrato si existe
      if (contratos && contratos.length > 0 && !contratoSeleccionado) {
        console.log('✅ Auto-seleccionando primer contrato:', contratos[0].id);
        setContratoSeleccionado(contratos[0].id);
      }
    } catch (error) {
      console.error('Error cargando contratos:', error);
      setContratosDisponibles([]);
    }
  };

  const calcularPenalizacion = (contrato: Contrato): { diasAtraso: number; montoPenalizacion: number; penalizacionAplicada: number } => {
    if (!contrato.fecha_fin) {
      return { diasAtraso: 0, montoPenalizacion: 0, penalizacionAplicada: 0 };
    }

    const fechaFin = new Date(contrato.fecha_fin);
    const hoy = new Date();
    
    // Si no ha pasado la fecha de fin, no hay atraso
    if (hoy <= fechaFin) {
      return { diasAtraso: 0, montoPenalizacion: 0, penalizacionAplicada: 0 };
    }

    // Calcular días de atraso
    const diasAtraso = Math.floor((hoy.getTime() - fechaFin.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calcular penalización
    const penalizacionPorDia = contrato.penalizacion_por_dia || 0;
    const montoPenalizacion = diasAtraso * penalizacionPorDia;
    
    // Aplicar límite de penalización máxima (% del monto del contrato)
    const penalizacionMaximaPorcentaje = contrato.penalizacion_maxima_porcentaje || 0;
    const penalizacionMaxima = (contrato.monto_contrato * penalizacionMaximaPorcentaje) / 100;
    
    const penalizacionAplicada = Math.min(montoPenalizacion, penalizacionMaxima);

    return { diasAtraso, montoPenalizacion, penalizacionAplicada };
  };

  const loadDetalleContrato = async (contratoId: string) => {
    try {
      setLoading(true);
      console.log('🔄 loadDetalleContrato - Cargando contrato ID:', contratoId);

      // Cargar contrato con detalles
      const { data: contrato } = await supabase
        .from('contratos')
        .select('*')
        .eq('id', contratoId)
        .single();

      console.log('📋 Contrato cargado:', contrato);

      const { data: requisiciones } = await supabase
        .from('requisiciones_pago')
        .select('*')
        .eq('contrato_id', contratoId)
        .order('numero', { ascending: true });

      console.log('📋 Requisiciones cargadas:', requisiciones?.length || 0);

      const requisicionIds = (requisiciones || []).map(r => r.id).filter(id => id);
      const { data: solicitudes } = requisicionIds.length > 0
        ? await supabase
            .from('solicitudes_pago')
            .select('*')
            .in('requisicion_id', requisicionIds)
        : { data: [] };
      
      console.log('📋 Solicitudes cargadas:', solicitudes?.length || 0);
      
      // Cargar cambios de contrato (ADITIVAS, DEDUCTIVAS, EXTRAS)
      const { data: cambiosContrato } = await supabase
        .from('cambios_contrato')
        .select('*')
        .eq('contrato_id', contratoId)
        .eq('active', true);
      
      console.log('📋 Cambios de contrato cargados:', cambiosContrato?.length || 0);
      
      // Cargar pagos realizados del contrato
      const { data: pagosRealizados } = await supabase
        .from('pagos_realizados')
        .select('*')
        .eq('contrato_id', contratoId)
        .eq('estatus', 'PAGADO');

      // Calcular totales de cambios de contrato
      const montoExtras = (cambiosContrato || []).filter(c => c.tipo_cambio === 'EXTRA' && c.estatus === 'APLICADO').reduce((sum, c) => sum + (c.monto_cambio || 0), 0);
      const montoAditivas = (cambiosContrato || []).filter(c => c.tipo_cambio === 'ADITIVA' && c.estatus === 'APLICADO').reduce((sum, c) => sum + (c.monto_cambio || 0), 0);
      const montoDeductivas = (cambiosContrato || []).filter(c => c.tipo_cambio === 'DEDUCTIVA' && c.estatus === 'APLICADO').reduce((sum, c) => sum + Math.abs(c.monto_cambio || 0), 0);
      
      console.log('📊 Cambios de contrato:', {
        extras: montoExtras,
        aditivas: montoAditivas,
        deductivas: montoDeductivas,
        total: cambiosContrato?.length || 0
      });
      
      // Calcular totales
      const montoContratoBase = contrato?.monto_contrato || 0;
      const montoContrato = montoContratoBase + montoExtras + montoAditivas - montoDeductivas;
      const anticipoMonto = contrato?.anticipo_monto || 0;
      
      // Total de requisiciones: usar directamente el total de cada requisición
      // (ya incluye todos los descuentos: retenciones, amortizaciones, IVA, etc.)
      const totalRequisiciones = (requisiciones || []).reduce((sum, r) => sum + (r.total || 0), 0);
      
      // Calcular total bruto de requisiciones (antes de descuentos)
      const totalRequisicionesBruto = (requisiciones || []).reduce((sum, r) => sum + (r.subtotal || 0), 0);
      
      // Calcular totales desde las solicitudes de pago
      let totalPagado = 0;
      let totalAmortizado = 0;
      let totalRetenido = 0;
      let totalDeduccionesExtras = 0;
      
      console.log('📊 Calculando totales del contrato:', contratoId);
      console.log('📋 Solicitudes encontradas:', solicitudes?.length || 0);
      console.log('📋 Requisiciones encontradas:', requisiciones?.length || 0);
      
      // Calcular totales de TODAS las requisiciones (no solo las pagadas)
      (requisiciones || []).forEach((req: any, idx: number) => {
        console.log(`\n🔍 Requisición ${idx + 1}:`, {
          numero: req.numero,
          subtotal: req.subtotal,
          retencion: req.retencion,
          amortizacion: req.amortizacion,
          total: req.total
        });
        
        // Sumar retenciones y amortizaciones de TODAS las requisiciones
        totalAmortizado += req.amortizacion || 0;
        totalRetenido += req.retencion || 0;
      });
      
      // Calcular total pagado y deducciones extras desde solicitudes PAGADAS
      (solicitudes || []).forEach((sol: any, idx: number) => {
        console.log(`\n🔍 Solicitud ${idx + 1}:`, {
          folio: sol.folio,
          requisicion_id: sol.requisicion_id,
          monto_pagado: sol.monto_pagado,
          estatus_pago: sol.estatus_pago,
          deducciones_extra: sol.deducciones_extra?.length || 0
        });
        
        // Total pagado (solo de solicitudes PAGADAS)
        if (sol.estatus_pago === 'PAGADO') {
          console.log(`  ✅ Solicitud PAGADA - sumando monto pagado`);
          totalPagado += sol.monto_pagado || 0;
        } else {
          console.log(`  ⏳ Solicitud NO PAGADA (${sol.estatus_pago})`);
        }
        
        // Deducciones extras
        const deduccionesSol = sol.deducciones_extra || [];
        const montoDeduccionesSol = deduccionesSol.reduce((dedSum: number, ded: any) => dedSum + (ded.monto || 0), 0);
        if (montoDeduccionesSol > 0) {
          console.log(`  💰 Deducciones extras: $${montoDeduccionesSol.toFixed(2)}`);
        }
        totalDeduccionesExtras += montoDeduccionesSol;
      });
      
      console.log('\n📊 TOTALES CALCULADOS:');
      console.log(`  Total Requisiciones: $${totalRequisiciones.toFixed(2)}`);
      console.log(`  Total Pagado: $${totalPagado.toFixed(2)}`);
      console.log(`  Total Amortizado: $${totalAmortizado.toFixed(2)}`);
      console.log(`  Total Retenido: $${totalRetenido.toFixed(2)}`);
      console.log(`  Total Deducciones: $${totalDeduccionesExtras.toFixed(2)}`);
      
      const saldoPorAmortizar = anticipoMonto - totalAmortizado;
      
      // Calcular saldo por ejercer
      const saldoPorEjercer = montoContrato - totalRequisicionesBruto;
      
      // Calcular saldo por pagar = Saldo por Ejercer - Saldo por Amortizar
      const saldoPorPagar = saldoPorEjercer - saldoPorAmortizar;

      // Calcular penalización por atraso
      const { diasAtraso, montoPenalizacion, penalizacionAplicada } = contrato ? calcularPenalizacion(contrato) : { diasAtraso: 0, montoPenalizacion: 0, penalizacionAplicada: 0 };

      console.log('✅ Datos completos cargados, estableciendo detalleContrato');
      
      setDetalleContrato({
        contrato,
        requisiciones: requisiciones || [],
        solicitudes: solicitudes || [],
        montoContratoBase,
        montoExtras,
        montoAditivas,
        montoDeductivas,
        montoContrato,
        anticipoMonto,
        totalRequisiciones,
        totalRequisicionesBruto, // Para calcular saldo por ejercer
        totalAmortizado,
        totalPagado,
        totalRetenido,
        totalDeduccionesExtras,
        saldoPorAmortizar,
        saldoPorEjercer,
        saldoPorPagar,
        diasAtraso,
        montoPenalizacion,
        penalizacionAplicada,
      });
      
      console.log('✅ Estado detalleContrato actualizado exitosamente');
    } catch (error) {
      console.error('Error cargando detalle de contrato:', error);
      setDetalleContrato(null);
    } finally {
      setLoading(false);
    }
  };

  const esContratistaOUsuario = perfil?.roles?.some(r => r === 'CONTRATISTA' || r === 'USUARIO');

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Cargando estado de cuenta...
          </Typography>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <AssessmentIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Estado de Cuenta
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Resumen financiero de contratos y pagos
            </Typography>
          </Box>
        </Stack>

        {/* Tabs */}
        <Tabs value={tabActual} onChange={(_, newValue) => setTabActual(newValue)}>
          <Tab label="Resumen por Contratista" />
          <Tab label="Estado de Cuenta Contrato" />
        </Tabs>
      </Paper>

      {/* Tab 0: Resumen por Contratista */}
      {tabActual === 0 && (
        <>
          {/* Selector de Contratista */}
          {contratistas.length > 0 && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Contratista</InputLabel>
                <MuiSelect
                  value={contratistaSeleccionado}
                  onChange={(e) => setContratistaSeleccionado(e.target.value)}
                  label="Contratista"
                  disabled={esContratistaOUsuario}
                >
                  {!esContratistaOUsuario && <MenuItem value="todos">Todos los Contratistas</MenuItem>}
                  {contratistas.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.nombre}
                    </MenuItem>
                  ))}
                </MuiSelect>
              </FormControl>
            </Paper>
          )}

          {estadosCuenta.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <AssessmentIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.primary" fontWeight={600} gutterBottom>
                No hay datos disponibles
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No se encontraron contratistas con contratos activos
              </Typography>
            </Paper>
          ) : (
        <Stack spacing={3}>
          {estadosCuenta.map((estado, idx) => (
            <Paper key={idx} elevation={2} sx={{ overflow: 'hidden' }}>
              {/* Header del Contratista */}
              <Box sx={{ p: 3, bgcolor: 'primary.main', color: 'white' }}>
                <Typography variant="h6" fontWeight={700}>
                  {estado.contratista.nombre}
                </Typography>
                <Typography variant="body2">
                  {estado.contratista.correo_contacto || estado.contratista.telefono || ''}
                </Typography>
              </Box>

              {/* Resumen General */}
              <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Stack direction="row" spacing={4} justifyContent="space-around">
                  <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary">
                      Total Contratos
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="primary.main">
                      ${estado.totalGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary">
                      Total Pagado
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="success.main">
                      ${estado.totalPagadoGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary">
                      Pendiente de Pago
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="warning.main">
                      ${estado.pendienteGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary">
                      % Pagado
                    </Typography>
                    <Typography variant="h6" fontWeight={700}>
                      {estado.totalGeneral > 0 
                        ? ((estado.totalPagadoGeneral / estado.totalGeneral) * 100).toFixed(1)
                        : '0.0'}%
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <Divider />

              {/* Tabla de Contratos */}
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Contrato</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Monto Contrato</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Requisiciones</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Pagado</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Pendiente</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>% Avance</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {estado.contratos.map((contrato, cIdx) => {
                      const porcentajeAvance = contrato.totalContrato > 0
                        ? (contrato.totalRequisiciones / contrato.totalContrato) * 100
                        : 0;

                      return (
                        <TableRow key={cIdx} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {contrato.contrato.clave_contrato || contrato.contrato.numero_contrato || contrato.contrato.nombre || 'Sin número'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {contrato.requisiciones.length} requisiciones
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              ${contrato.totalContrato.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              ${contrato.totalRequisiciones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="success.dark" fontWeight={600}>
                              ${contrato.totalPagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="warning.dark">
                              ${contrato.pendientePago.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={`${porcentajeAvance.toFixed(1)}%`}
                              size="small"
                              color={porcentajeAvance >= 75 ? 'success' : porcentajeAvance >= 50 ? 'warning' : 'default'}
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            {contrato.solicitudes.length > 0 && (
                              <Tooltip title="Ver detalles de pagos">
                                <IconButton 
                                  size="small" 
                                  onClick={() => {
                                    setSolicitudSeleccionada(contrato.solicitudes[0]);
                                    setMostrarDesglose(true);
                                  }}
                                  color="primary"
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ))}
        </Stack>
          )}
        </>
      )}

      {/* Tab 1: Estado de Cuenta Contrato */}
      {tabActual === 1 && (
        <>
          {/* Selectores */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Contratista</InputLabel>
                  <MuiSelect
                    value={contratistaContrato}
                    onChange={(e) => {
                      setContratistaContrato(e.target.value);
                      setContratoSeleccionado('');
                      setDetalleContrato(null);
                    }}
                    label="Contratista"
                    disabled={esContratistaOUsuario}
                  >
                    {contratistas.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.nombre}
                      </MenuItem>
                    ))}
                  </MuiSelect>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth disabled={!contratistaContrato}>
                  <InputLabel>Contrato</InputLabel>
                  <MuiSelect
                    value={contratoSeleccionado}
                    onChange={(e) => setContratoSeleccionado(e.target.value)}
                    label="Contrato"
                  >
                    {contratosDisponibles.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.clave_contrato || c.numero_contrato || c.nombre || 'Sin número'}
                      </MenuItem>
                    ))}
                  </MuiSelect>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {/* Detalle del Contrato */}
          {detalleContrato ? (
            <>
              {/* Botón de exportar PDF */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <PDFDownloadLink
                  document={
                    <EstadoCuentaPDF
                      detalleContrato={detalleContrato}
                      nombreContratista={contratistas.find(c => c.id === contratistaContrato)?.nombre || ''}
                      nombreProyecto={proyectoActual?.nombre || 'Proyecto'}
                      fechaGeneracion={new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                    />
                  }
                  fileName={`estado-cuenta-${detalleContrato.contrato.clave_contrato || detalleContrato.contrato.numero_contrato}-${new Date().toISOString().split('T')[0]}.pdf`}
                  style={{ textDecoration: 'none' }}
                >
                  {({ blob, url, loading, error }) => (
                    <Tooltip title={loading ? 'Generando PDF...' : 'Descargar PDF'}>
                      <span>
                        <IconButton
                          color="primary"
                          disabled={loading}
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            '&:hover': {
                              bgcolor: 'primary.dark',
                            },
                            '&:disabled': {
                              bgcolor: 'grey.300',
                            },
                          }}
                        >
                          <PdfIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </PDFDownloadLink>
              </Box>
            <Paper sx={{ p: 3 }}>
              {/* Header */}
              <Box sx={{ mb: 3, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  ESTADO DE CUENTA
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {contratistas.find(c => c.id === contratistaContrato)?.nombre}
                </Typography>
              </Box>

              {/* Alerta de atrasos */}
              {detalleContrato.diasAtraso > 0 && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  <AlertTitle>Contrato con Atraso</AlertTitle>
                  Este contrato tiene <strong>{detalleContrato.diasAtraso} días de atraso</strong> con una penalización aplicada de{' '}
                  <strong>${(detalleContrato.penalizacionAplicada || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                </Alert>
              )}

              {/* Información del Contrato */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={600}>CONTRATADO:</Typography>
                      <Typography variant="body2">${(detalleContrato.montoContratoBase || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={600} color="primary.main">EXTRAORDINARIOS:</Typography>
                      <Typography variant="body2" color="primary.main">${(detalleContrato.montoExtras || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={600} color="success.main">ADITIVAS:</Typography>
                      <Typography variant="body2" color="success.main">${(detalleContrato.montoAditivas || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={600} color="error.main">DEDUCTIVAS:</Typography>
                      <Typography variant="body2" color="error.main">${(detalleContrato.montoDeductivas || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={700}>IMPORTE TOTAL:</Typography>
                      <Typography variant="body2" fontWeight={700}>${(detalleContrato.montoContrato || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={600}>RETENCIÓN (Fondo de Garantía):</Typography>
                      <Typography variant="body2">${(detalleContrato.totalRetenido || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={600}>% RETENCIÓN:</Typography>
                      <Typography variant="body2">{detalleContrato.contrato?.retencion_porcentaje || 0}%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={600} color="error.main">DEDUCCIONES EXTRA:</Typography>
                      <Typography variant="body2" color="error.main">${(detalleContrato.totalDeduccionesExtras || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={700} color="error.dark">TOTAL DESCUENTOS:</Typography>
                      <Typography variant="body2" fontWeight={700} color="error.dark">${((detalleContrato.totalRetenido || 0) + (detalleContrato.totalDeduccionesExtras || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>

              {/* Resumen de Pagos */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={600}>ANTICIPO:</Typography>
                      <Typography variant="body2">${detalleContrato.anticipoMonto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={600}>AMORTIZACIÓN:</Typography>
                      <Typography variant="body2">${detalleContrato.totalAmortizado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={600}>TOTAL AMORTIZADO:</Typography>
                      <Typography variant="body2">${detalleContrato.totalAmortizado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={600}>SALDO POR AMORTIZAR:</Typography>
                      <Typography variant="body2">${detalleContrato.saldoPorAmortizar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={700} color="warning.main">SALDO POR EJERCER:</Typography>
                      <Typography variant="body2" fontWeight={700} color="warning.main">${(detalleContrato.saldoPorEjercer || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={700} color="primary.main">SALDO POR PAGAR:</Typography>
                      <Typography variant="body2" fontWeight={700} color="primary.main">${(detalleContrato.saldoPorPagar || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={600}>RETENCIÓN (Fondo de Garantía):</Typography>
                      <Typography variant="body2">${(detalleContrato.totalRetenido || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={600}>% RETENCIÓN:</Typography>
                      <Typography variant="body2">{detalleContrato.contrato?.retencion_porcentaje || 0}%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={600} color="error.main">DEDUCCIONES EXTRA:</Typography>
                      <Typography variant="body2" color="error.main">${(detalleContrato.totalDeduccionesExtras || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={700}>TOTAL RETENIDO:</Typography>
                      <Typography variant="body2" fontWeight={700}>${(detalleContrato.totalRetenido || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={700} color="error.dark">TOTAL DESCUENTOS:</Typography>
                      <Typography variant="body2" fontWeight={700} color="error.dark">${((detalleContrato.totalRetenido || 0) + (detalleContrato.totalDeduccionesExtras || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                  </Stack>
                </Grid>

                {/* Sección de Penalizaciones por Atraso */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Stack spacing={1}>
                    {detalleContrato.diasAtraso && detalleContrato.diasAtraso > 0 ? (
                      <>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" fontWeight={600} color="error.main">DÍAS DE ATRASO:</Typography>
                          <Typography variant="body2" fontWeight={600} color="error.main">{detalleContrato.diasAtraso} días</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" fontWeight={600}>PENALIZACIÓN POR DÍA:</Typography>
                          <Typography variant="body2">${(detalleContrato.contrato?.penalizacion_por_dia || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" fontWeight={600}>PENALIZACIÓN CALCULADA:</Typography>
                          <Typography variant="body2">${(detalleContrato.montoPenalizacion || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" fontWeight={600}>LÍMITE MÁXIMO ({detalleContrato.contrato?.penalizacion_maxima_porcentaje || 0}%):</Typography>
                          <Typography variant="body2">${((detalleContrato.montoContrato * (detalleContrato.contrato?.penalizacion_maxima_porcentaje || 0)) / 100).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                        </Box>
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" fontWeight={700} color="error.dark">PENALIZACIÓN APLICADA:</Typography>
                          <Typography variant="body2" fontWeight={700} color="error.dark">${(detalleContrato.penalizacionAplicada || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                        </Box>
                      </>
                    ) : (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" fontWeight={600} color="success.main">PENALIZACIÓN:</Typography>
                        <Typography variant="body2" color="success.main">Sin atrasos</Typography>
                      </Box>
                    )}
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={700} color="success.dark">TOTAL PAGADO (Neto):</Typography>
                      <Typography variant="body2" fontWeight={700} color="success.dark">${detalleContrato.totalPagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={600}>MONTO BRUTO PAGADO:</Typography>
                      <Typography variant="body2">${(detalleContrato.totalPagado + (detalleContrato.totalRetenido || 0) + (detalleContrato.totalAmortizado || 0) + (detalleContrato.totalDeduccionesExtras || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={700} color="warning.dark">SALDO POR EJERCER:</Typography>
                      <Typography variant="body2" fontWeight={700} color="warning.dark">${(detalleContrato.montoContrato - (detalleContrato.totalRequisicionesBruto || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={700} color="primary.main">SALDO POR PAGAR:</Typography>
                      <Typography variant="body2" fontWeight={700} color="primary.main">${(detalleContrato.saldoPorPagar || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* Tabla de Desglose por Contrato */}
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                DESGLOSE POR CONTRATO
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.800' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>PARTIDA</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>CLAVE DE CONTRATO</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>TIPO DE CONTRATO</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">MONTO BRUTO</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">AMORTIZACIÓN</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">RETENCIÓN</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">DEDUCCIONES</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">SUBTOTAL</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">IVA (16%)</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">MONTO NETO</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">PAGADO</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">POR PAGAR</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }} align="center">DETALLES</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detalleContrato.requisiciones.map((req: RequisicionPago, idx: number) => {
                      const solicitud = detalleContrato.solicitudes.find((s: SolicitudPago) => s.requisicion_id.toString() === req.id?.toString());
                      
                      // Valores directos de la requisición
                      const montoBruto = req.monto_estimado || 0; // Monto antes de descuentos (amortización y retención)
                      const montoAmortizacion = req.amortizacion || 0;
                      const montoRetencion = req.retencion || 0;
                      
                      // Deducciones extras de la solicitud
                      const deduccionesExtras = (solicitud?.deducciones_extra || []).reduce((sum: number, ded: any) => sum + (ded.monto || 0), 0);
                      
                      // Usar subtotal e IVA guardados en la base de datos
                      const subtotalSinIVA = req.subtotal || 0;
                      const montoIVA = req.iva || 0;
                      
                      // Monto neto = total de la requisición (subtotal + IVA)
                      const montoNeto = req.total || 0;
                      
                      // Monto pagado de esta requisición
                      const montoPagado = solicitud?.monto_pagado || 0;
                      const montoPorPagar = montoNeto - montoPagado;
                      
                      // Log de verificación
                      console.log(`📊 Req ${req.numero}:`, {
                        montoBruto,
                        montoRetencion,
                        montoAmortizacion,
                        deduccionesExtras,
                        montoNeto,
                        montoPagado,
                        montoPorPagar,
                        solicitud_folio: solicitud?.folio,
                        solicitud_estatus: solicitud?.estatus_pago
                      });
                      
                      return (
                        <TableRow key={idx} hover>
                          <TableCell>{req.numero}</TableCell>
                          <TableCell>{detalleContrato.contrato.clave_contrato || detalleContrato.contrato.numero_contrato}</TableCell>
                          <TableCell>Contrato Base</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>${montoBruto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell align="right" sx={{ color: 'info.main' }}>${montoAmortizacion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell align="right" sx={{ color: 'warning.main' }}>${montoRetencion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell align="right" sx={{ color: 'error.main' }}>${deduccionesExtras.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell align="right">${subtotalSinIVA.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell align="right" sx={{ color: 'grey.600' }}>${montoIVA.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>${montoNeto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell align="right" sx={{ color: 'success.dark', fontWeight: 600 }}>${montoPagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell align="right" sx={{ color: 'warning.dark', fontWeight: 600 }}>${montoPorPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell align="center">
                            {solicitud && (
                              <Tooltip title="Ver detalles de la solicitud">
                                <IconButton 
                                  size="small" 
                                  onClick={() => {
                                    setSolicitudSeleccionada(solicitud);
                                    setMostrarDesglose(true);
                                  }}
                                  color="primary"
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
            </>
          ) : (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Selecciona un contratista y un contrato para ver los detalles
              </Typography>
            </Paper>
          )}
        </>
      )}

      {/* Modal de desglose de solicitud */}
      {solicitudSeleccionada && (
        <DesgloseSolicitudModal
          open={mostrarDesglose}
          onClose={() => {
            setMostrarDesglose(false);
            setSolicitudSeleccionada(null);
          }}
          solicitud={solicitudSeleccionada}
          readOnly={true}
        />
      )}
    </Container>
  );
};

export default EstadoCuentaPage;
