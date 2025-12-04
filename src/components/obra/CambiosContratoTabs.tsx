import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Alert,
  Chip,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { db } from '@/db/database';
import { ConceptoContrato } from '@/types/concepto-contrato';
import { CambioContrato, DetalleAditivaDeductiva } from '@/types/cambio-contrato';
import { Contrato } from '@/types/contrato';
import { syncService } from '@/sync/syncService';

interface CambiosContratoTabsProps {
  contratoId: string;
  contrato?: Contrato | null;
  tabInicial?: number; // 0=Aditivas, 1=Deductivas
  onMontoActualizado?: (nuevoMonto: number) => void;
}

export const CambiosContratoTabs: React.FC<CambiosContratoTabsProps> = ({
  contratoId,
  contrato,
  tabInicial = 0,
  onMontoActualizado,
}) => {
  const [conceptosOriginales, setConceptosOriginales] = useState<ConceptoContrato[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Obtener monto del contrato
  const montoContratoOriginal = contrato?.monto_contrato || 0;
  
  // Estados para Aditivas
  const [conceptosAditiva, setConceptosAditiva] = useState<Set<string>>(new Set());
  const [volumenesAditiva, setVolumenesAditiva] = useState<{ [key: string]: number }>({});
  const [showAditivaDialog, setShowAditivaDialog] = useState(false);
  const [descripcionAditiva, setDescripcionAditiva] = useState('');
  
  // Estados para Deductivas
  const [conceptosDeductiva, setConceptosDeductiva] = useState<Set<string>>(new Set());
  const [volumenesDeductiva, setVolumenesDeductiva] = useState<{ [key: string]: number }>({});
  const [showDeductivaDialog, setShowDeductivaDialog] = useState(false);
  const [descripcionDeductiva, setDescripcionDeductiva] = useState('');
  
  // Estados para mostrar cambios guardados
  const [cambiosGuardados, setCambiosGuardados] = useState<CambioContrato[]>([]);
  const [detallesPorCambio, setDetallesPorCambio] = useState<{ [cambioId: string]: DetalleAditivaDeductiva[] }>({});
  const [cambiosExpandidos, setCambiosExpandidos] = useState<Set<string>>(new Set());
  
  // Estado para modal de catálogo
  const [showCatalogoModal, setShowCatalogoModal] = useState(false);
  const [cantidadesActualizadas, setCantidadesActualizadas] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadData();
  }, [contratoId, tabInicial]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log(`🔵 Cargando datos para tab ${tabInicial} (${tabInicial === 0 ? 'ADITIVA' : 'DEDUCTIVA'})`);
      
      // Cargar conceptos del catálogo ordinario
      const conceptos = await db.conceptos_contrato
        .where('contrato_id')
        .equals(contratoId)
        .and(c => c.active !== false && (!c.metadata || (c.metadata as any).tipo !== 'extraordinario'))
        .toArray();
      
      console.log(`🔵 Conceptos ordinarios cargados:`, conceptos.length);
      
      // Cargar TODOS los cambios del contrato (aditivas y deductivas) para calcular cantidades actuales
      const todosCambios = await db.cambios_contrato
        .where('contrato_id')
        .equals(contratoId)
        .and(c => c.active !== false && c.estatus === 'APLICADO')
        .toArray();
      
      // Cargar todos los detalles de cambios
      const todosDetalles = await db.detalles_aditiva_deductiva
        .where('cambio_contrato_id')
        .anyOf(todosCambios.map(c => c.id))
        .and(d => d.active !== false)
        .toArray();
      
      console.log(`🔵 Total de cambios aplicados: ${todosCambios.length}, detalles: ${todosDetalles.length}`);
      
      // Ordenar cambios por fecha para aplicarlos en orden cronológico
      todosCambios.sort((a, b) => new Date(a.fecha_cambio).getTime() - new Date(b.fecha_cambio).getTime());
      
      // Calcular cantidades actuales aplicando todos los cambios en orden
      const cantidadesActualesPorConcepto: { [conceptoId: string]: number } = {};
      conceptos.forEach(concepto => {
        cantidadesActualesPorConcepto[concepto.id] = concepto.cantidad_catalogo;
      });
      
      // Aplicar cada cambio en orden cronológico
      for (const cambio of todosCambios) {
        const detallesCambio = todosDetalles.filter(d => d.cambio_contrato_id === cambio.id);
        for (const detalle of detallesCambio) {
          // Actualizar la cantidad actual con la cantidad_nueva de este cambio
          cantidadesActualesPorConcepto[detalle.concepto_contrato_id] = detalle.cantidad_nueva;
        }
      }
      
      console.log('🔵 Cantidades actuales calculadas:', cantidadesActualesPorConcepto);
      
      // Guardar cantidades actuales en estado para usar en el modal
      const cantidadesActualizadasIniciales: { [key: string]: number } = {};
      conceptos.forEach(concepto => {
        const cantidadActual = cantidadesActualesPorConcepto[concepto.id];
        if (cantidadActual && cantidadActual !== concepto.cantidad_catalogo) {
          cantidadesActualizadasIniciales[concepto.id] = cantidadActual;
        }
      });
      setCantidadesActualizadas(cantidadesActualizadasIniciales);
      
      setConceptosOriginales(conceptos);
      console.log(`🔵 Conceptos cargados, ${Object.keys(cantidadesActualizadasIniciales).length} tienen cambios aplicados`);
      
      // Cargar cambios guardados del tipo actual (solo para mostrar)
      const tipoCambio = tabInicial === 0 ? 'ADITIVA' : 'DEDUCTIVA';
      const cambios = todosCambios.filter(c => c.tipo_cambio === tipoCambio);
      
      console.log(`🔵 Cambios ${tipoCambio} encontrados:`, cambios.length, cambios);
      setCambiosGuardados(cambios);
      
      // Cargar detalles de cada cambio
      const detallesMap: { [cambioId: string]: DetalleAditivaDeductiva[] } = {};
      for (const cambio of cambios) {
        const detalles = todosDetalles.filter(d => d.cambio_contrato_id === cambio.id);
        detallesMap[cambio.id] = detalles;
        console.log(`🔵 Detalles para ${cambio.numero_cambio}:`, detalles.length);
      }
      setDetallesPorCambio(detallesMap);
      
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarAditivaDesdeModal = async () => {
    // Filtrar solo los conceptos que tienen cantidad nueva diferente a la actualizada
    const conceptosConCambios = conceptosOriginales.filter(c => {
      const cantidadActualizada = cantidadesActualizadas[c.id] ?? c.cantidad_catalogo;
      const cantidadNueva = volumenesAditiva[c.id];
      return cantidadNueva !== undefined && cantidadNueva !== cantidadActualizada;
    });
    
    if (conceptosConCambios.length === 0) {
      alert('No hay conceptos con cambios de cantidad');
      return;
    }
    
    setConceptosAditiva(new Set(conceptosConCambios.map(c => c.id)));
    
    // Cerrar modal y abrir diálogo de confirmación
    setShowCatalogoModal(false);
    setShowAditivaDialog(true);
  };
  
  const handleGuardarDeductivaDesdeModal = async () => {
    // Filtrar solo los conceptos que tienen cantidad nueva diferente a la actualizada
    const conceptosConCambios = conceptosOriginales.filter(c => {
      const cantidadActualizada = cantidadesActualizadas[c.id] ?? c.cantidad_catalogo;
      const cantidadNueva = volumenesDeductiva[c.id];
      return cantidadNueva !== undefined && cantidadNueva !== cantidadActualizada;
    });
    
    if (conceptosConCambios.length === 0) {
      alert('No hay conceptos con cambios de cantidad');
      return;
    }
    
    setConceptosDeductiva(new Set(conceptosConCambios.map(c => c.id)));
    
    // Cerrar modal y abrir diálogo de confirmación
    setShowCatalogoModal(false);
    setShowDeductivaDialog(true);
  };

  const handleGuardarAditiva = async () => {
    if (conceptosAditiva.size === 0) {
      alert('Selecciona al menos un concepto');
      return;
    }
    
    try {
      console.log('🔵 Iniciando guardado de aditiva...');
      
      // Calcular folio
      const cambiosAditivas = await db.cambios_contrato
        .where('contrato_id')
        .equals(contratoId)
        .and(c => c.tipo_cambio === 'ADITIVA')
        .toArray();
      const numeroAditiva = `ADT-${String(cambiosAditivas.length + 1).padStart(3, '0')}`;
      console.log('🔵 Número de aditiva calculado:', numeroAditiva);
      
      // Calcular monto total del cambio
      let montoTotal = 0;
      const detalles: Omit<DetalleAditivaDeductiva, 'id' | 'created_at' | 'updated_at'>[] = [];
      
      for (const conceptoId of conceptosAditiva) {
        const concepto = conceptosOriginales.find(c => c.id === conceptoId);
        if (!concepto) continue;
        
        const cantidadActualizada = cantidadesActualizadas[conceptoId] ?? concepto.cantidad_catalogo;
        const cantidadNueva = volumenesAditiva[conceptoId] || cantidadActualizada;
        const cantidadModificacion = cantidadNueva - cantidadActualizada;
        const importeModificacion = cantidadModificacion * concepto.precio_unitario_catalogo;
        
        montoTotal += importeModificacion;
        
        detalles.push({
          cambio_contrato_id: '',
          concepto_contrato_id: conceptoId,
          concepto_clave: concepto.clave,
          concepto_descripcion: concepto.concepto,
          concepto_unidad: concepto.unidad || '',
          precio_unitario: concepto.precio_unitario_catalogo,
          cantidad_original: cantidadActualizada,
          cantidad_modificacion: cantidadModificacion,
          cantidad_nueva: cantidadNueva,
          importe_modificacion: importeModificacion,
          active: true,
        });
      }
      console.log(`🔵 Calculados ${detalles.length} detalles, monto total: $${montoTotal.toLocaleString('es-MX')}`);
      
      // Crear cambio de contrato
      const cambioId = crypto.randomUUID();
      const cambio: CambioContrato = {
        id: cambioId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        contrato_id: contratoId,
        numero_cambio: numeroAditiva,
        tipo_cambio: 'ADITIVA',
        descripcion: descripcionAditiva || `Aditiva ${numeroAditiva}`,
        monto_cambio: montoTotal,
        monto_contrato_anterior: montoContratoOriginal,
        monto_contrato_nuevo: montoContratoOriginal + montoTotal,
        fecha_cambio: new Date().toISOString(),
        estatus: 'APLICADO',
        active: true,
        _dirty: true,
      };
      console.log('🔵 Objeto cambio creado con ID:', cambioId);
      
      console.log('🔵 Guardando cambio en IndexedDB...');
      await db.cambios_contrato.add(cambio as any);
      console.log('✅ Cambio guardado en IndexedDB');
      
      // Guardar detalles
      console.log(`🔵 Guardando ${detalles.length} detalles...`);
      for (let i = 0; i < detalles.length; i++) {
        const detalle = detalles[i];
        const detalleId = crypto.randomUUID();
        await db.detalles_aditiva_deductiva.add({
          ...detalle,
          id: detalleId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          cambio_contrato_id: cambioId,
          _dirty: true,
        } as any);
        console.log(`✅ Detalle ${i + 1}/${detalles.length} guardado (ID: ${detalleId})`);
      }
      console.log('✅ Todos los detalles guardados en IndexedDB');
      
      console.log('🔵 Iniciando sincronización con Supabase...');
      await syncService.forcePush();
      console.log('✅ Sincronización completada');
      
      console.log('🔵 Recargando datos...');
      await loadData();
      console.log('✅ Datos recargados');
      
      // Limpiar estado
      setConceptosAditiva(new Set());
      setVolumenesAditiva({});
      setDescripcionAditiva('');
      setShowAditivaDialog(false);
      
      console.log('✅ Estado limpiado, proceso completo');
      alert(`✅ Aditiva ${numeroAditiva} guardada correctamente\nMonto: $${montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
      
    } catch (error) {
      console.error('❌ Error guardando aditiva:', error);
      console.error('❌ Stack trace:', (error as Error).stack);
      alert(`❌ Error al guardar la aditiva:\n${(error as Error).message}`);
    }
  };
  
  const toggleCambioExpandido = (cambioId: string) => {
    const newSet = new Set(cambiosExpandidos);
    if (newSet.has(cambioId)) {
      newSet.delete(cambioId);
    } else {
      newSet.add(cambioId);
    }
    setCambiosExpandidos(newSet);
  };

  const handleGuardarDeductiva = async () => {
    if (conceptosDeductiva.size === 0) {
      alert('Selecciona al menos un concepto');
      return;
    }
    
    try {
      console.log('🔵 Iniciando guardado de deductiva...');
      
      // Calcular folio
      const cambiosDeductivas = await db.cambios_contrato
        .where('contrato_id')
        .equals(contratoId)
        .and(c => c.tipo_cambio === 'DEDUCTIVA')
        .toArray();
      const numeroDeductiva = `DED-${String(cambiosDeductivas.length + 1).padStart(3, '0')}`;
      console.log('🔵 Número de deductiva calculado:', numeroDeductiva);
      
      // Calcular monto total del cambio (negativo)
      let montoTotal = 0;
      const detalles: Omit<DetalleAditivaDeductiva, 'id' | 'created_at' | 'updated_at'>[] = [];
      
      for (const conceptoId of conceptosDeductiva) {
        const concepto = conceptosOriginales.find(c => c.id === conceptoId);
        if (!concepto) continue;
        
        const cantidadActualizada = cantidadesActualizadas[conceptoId] ?? concepto.cantidad_catalogo;
        const cantidadNueva = volumenesDeductiva[conceptoId] || cantidadActualizada;
        const cantidadModificacion = cantidadNueva - cantidadActualizada;
        const importeModificacion = cantidadModificacion * concepto.precio_unitario_catalogo;
        
        montoTotal += importeModificacion;
        
        detalles.push({
          cambio_contrato_id: '',
          concepto_contrato_id: conceptoId,
          concepto_clave: concepto.clave,
          concepto_descripcion: concepto.concepto,
          concepto_unidad: concepto.unidad || '',
          precio_unitario: concepto.precio_unitario_catalogo,
          cantidad_original: cantidadActualizada,
          cantidad_modificacion: cantidadModificacion,
          cantidad_nueva: cantidadNueva,
          importe_modificacion: importeModificacion,
          active: true,
        });
      }
      console.log(`🔵 Calculados ${detalles.length} detalles, monto total: $${montoTotal.toLocaleString('es-MX')}`);
      
      // Crear cambio de contrato
      const cambioId = crypto.randomUUID();
      const cambio: CambioContrato = {
        id: cambioId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        contrato_id: contratoId,
        numero_cambio: numeroDeductiva,
        tipo_cambio: 'DEDUCTIVA',
        descripcion: descripcionDeductiva || `Deductiva ${numeroDeductiva}`,
        monto_cambio: montoTotal,
        monto_contrato_anterior: montoContratoOriginal,
        monto_contrato_nuevo: montoContratoOriginal + montoTotal,
        fecha_cambio: new Date().toISOString(),
        estatus: 'APLICADO',
        active: true,
        _dirty: true,
      };
      console.log('🔵 Objeto cambio creado con ID:', cambioId);
      
      console.log('🔵 Guardando cambio en IndexedDB...');
      await db.cambios_contrato.add(cambio as any);
      console.log('✅ Cambio guardado en IndexedDB');
      
      // Guardar detalles
      console.log(`🔵 Guardando ${detalles.length} detalles...`);
      for (let i = 0; i < detalles.length; i++) {
        const detalle = detalles[i];
        const detalleId = crypto.randomUUID();
        await db.detalles_aditiva_deductiva.add({
          ...detalle,
          id: detalleId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          cambio_contrato_id: cambioId,
          _dirty: true,
        } as any);
        console.log(`✅ Detalle ${i + 1}/${detalles.length} guardado (ID: ${detalleId})`);
      }
      console.log('✅ Todos los detalles guardados en IndexedDB');
      
      console.log('🔵 Iniciando sincronización con Supabase...');
      await syncService.forcePush();
      console.log('✅ Sincronización completada');
      
      console.log('🔵 Recargando datos...');
      await loadData();
      console.log('✅ Datos recargados');
      
      // Limpiar estado
      setConceptosDeductiva(new Set());
      setVolumenesDeductiva({});
      setDescripcionDeductiva('');
      setShowDeductivaDialog(false);
      
      console.log('✅ Estado limpiado, proceso completo');
      alert(`✅ Deductiva ${numeroDeductiva} guardada correctamente\nMonto: $${montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
      
    } catch (error) {
      console.error('❌ Error guardando deductiva:', error);
      console.error('❌ Stack trace:', (error as Error).stack);
      alert(`❌ Error al guardar la deductiva:\n${(error as Error).message}`);
    }
  };

  if (loading) {
    return <Box sx={{ p: 3, textAlign: 'center' }}>Cargando conceptos...</Box>;
  }

  // Renderizar Aditiva
  if (tabInicial === 0) {
    return (
      <Box>
        <Stack spacing={3}>
        {/* Mostrar aditivas guardadas */}
        {cambiosGuardados.length > 0 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Aditivas Guardadas ({cambiosGuardados.length})</Typography>
            <Stack spacing={2}>
              {cambiosGuardados.map(cambio => {
                const detalles = detallesPorCambio[cambio.id] || [];
                const isExpanded = cambiosExpandidos.has(cambio.id);
                return (
                  <Paper key={cambio.id} sx={{ p: 2, bgcolor: 'rgba(16, 185, 129, 0.05)' }}>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => toggleCambioExpandido(cambio.id)}
                            sx={{ color: 'success.main' }}
                          >
                            {isExpanded ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {cambio.numero_cambio} - {cambio.descripcion}
                          </Typography>
                        </Box>
                        <Chip 
                          label={`+$${cambio.monto_cambio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                          color="success"
                          size="small"
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Fecha: {new Date(cambio.fecha_cambio).toLocaleDateString('es-MX')} | 
                        Estatus: {cambio.estatus} | 
                        Conceptos modificados: {detalles.length}
                      </Typography>
                      <Collapse in={isExpanded}>
                        {detalles.length > 0 && (
                          <TableContainer sx={{ mt: 1 }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Clave</TableCell>
                                  <TableCell>Concepto</TableCell>
                                  <TableCell align="right">Cant. Original</TableCell>
                                  <TableCell align="right">Cant. Nueva</TableCell>
                                  <TableCell align="right">Diferencia</TableCell>
                                  <TableCell align="right">P.U.</TableCell>
                                  <TableCell align="right">Importe</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {detalles.map(detalle => (
                                  <TableRow key={detalle.id}>
                                    <TableCell>{detalle.concepto_clave}</TableCell>
                                    <TableCell sx={{ maxWidth: 300 }}>
                                      <Typography variant="body2" noWrap>{detalle.concepto_descripcion}</Typography>
                                    </TableCell>
                                    <TableCell align="right">{detalle.cantidad_original.toFixed(2)}</TableCell>
                                    <TableCell align="right">{detalle.cantidad_nueva.toFixed(2)}</TableCell>
                                    <TableCell align="right">
                                      <Typography color="success.main" fontWeight={600}>
                                        +{detalle.cantidad_modificacion.toFixed(2)}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                      ${detalle.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography fontWeight={600}>
                                        ${detalle.importe_modificacion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                      </Typography>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </Collapse>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        )}          {/* Botón para crear nueva aditiva */}
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => {
                setShowCatalogoModal(true);
              }}
              sx={{ minWidth: 200 }}
            >
              Nueva Aditiva
            </Button>
          </Box>
        </Stack>

        {/* MODAL CATÁLOGO PARA CREAR ADITIVA */}
        <Dialog 
          open={showCatalogoModal} 
          onClose={() => setShowCatalogoModal(false)} 
          maxWidth="xl" 
          fullWidth
          PaperProps={{ sx: { height: '90vh' } }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Crear Aditiva - Seleccionar Conceptos</Typography>
              <Typography variant="body2" color="text.secondary">
                Modifica las cantidades de los conceptos que deseas incluir en la aditiva
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <TableContainer sx={{ maxHeight: 'calc(90vh - 200px)' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: '#334155', color: 'white' }}>Clave</TableCell>
                    <TableCell sx={{ bgcolor: '#334155', color: 'white' }}>Descripción</TableCell>
                    <TableCell align="right" sx={{ bgcolor: '#334155', color: 'white' }}>Cant. Original</TableCell>
                    <TableCell align="right" sx={{ bgcolor: '#334155', color: 'white' }}>Cant. Actualizada</TableCell>
                    <TableCell align="right" sx={{ bgcolor: '#334155', color: 'white' }}>P.U.</TableCell>
                    <TableCell align="right" sx={{ bgcolor: '#334155', color: 'white', minWidth: 150 }}>Cant. Nueva</TableCell>
                    <TableCell align="right" sx={{ bgcolor: '#334155', color: 'white' }}>Diferencia</TableCell>
                    <TableCell align="right" sx={{ bgcolor: '#334155', color: 'white' }}>$ Diferencia</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {conceptosOriginales.map(concepto => {
                    const cantidadActualizada = cantidadesActualizadas[concepto.id] ?? concepto.cantidad_catalogo;
                    const cantidadNueva = volumenesAditiva[concepto.id] ?? cantidadActualizada;
                    const diferencia = cantidadNueva - cantidadActualizada;
                    const importeDiferencia = diferencia * concepto.precio_unitario_catalogo;
                    const tieneCambio = diferencia !== 0;
                    
                    return (
                      <TableRow 
                        key={concepto.id}
                        sx={{ 
                          bgcolor: tieneCambio ? 'rgba(16, 185, 129, 0.05)' : 'inherit'
                        }}
                      >
                        <TableCell>{concepto.clave}</TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 400 }}>
                            {concepto.concepto}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            {concepto.cantidad_catalogo.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600}>
                            {cantidadActualizada.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          ${concepto.precio_unitario_catalogo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            size="small"
                            value={cantidadNueva}
                            placeholder={cantidadActualizada.toFixed(2)}
                            onChange={(e) => {
                              let nuevaCantidad = parseFloat(e.target.value) || 0;
                              // En aditiva, no permitir menos que la cantidad actualizada
                              if (nuevaCantidad < cantidadActualizada) {
                                nuevaCantidad = cantidadActualizada;
                              }
                              setVolumenesAditiva({
                                ...volumenesAditiva,
                                [concepto.id]: nuevaCantidad
                              });
                            }}
                            sx={{ width: 130 }}
                            inputProps={{ step: 0.01, min: cantidadActualizada }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            fontWeight={600}
                            color={diferencia > 0 ? 'success.main' : diferencia < 0 ? 'error.main' : 'text.secondary'}
                          >
                            {diferencia > 0 ? '+' : ''}{diferencia.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            fontWeight={700}
                            color={importeDiferencia > 0 ? 'success.main' : importeDiferencia < 0 ? 'error.main' : 'text.secondary'}
                          >
                            {importeDiferencia > 0 ? '+' : ''}${Math.abs(importeDiferencia).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCatalogoModal(false)}>Cancelar</Button>
            <Button 
              variant="contained" 
              onClick={handleGuardarAditivaDesdeModal}
              disabled={Object.keys(volumenesAditiva).filter(id => {
                const cantidadActualizada = cantidadesActualizadas[id] ?? conceptosOriginales.find(c => c.id === id)?.cantidad_catalogo ?? 0;
                return volumenesAditiva[id] !== cantidadActualizada;
              }).length === 0}
            >
              Continuar con Aditiva
            </Button>
          </DialogActions>
        </Dialog>

        {/* DIALOG CONFIRMAR ADITIVA */}
        <Dialog open={showAditivaDialog} onClose={() => setShowAditivaDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Confirmar Aditiva</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Descripción"
                value={descripcionAditiva}
                onChange={(e) => setDescripcionAditiva(e.target.value)}
                fullWidth
                multiline
                rows={2}
              />
              <Typography variant="body2">
                Conceptos seleccionados: {conceptosAditiva.size}
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAditivaDialog(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleGuardarAditiva}>
              Guardar Aditiva
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // Renderizar Deductiva
  return (
    <Box>
      <Stack spacing={3}>
        {/* Mostrar deductivas guardadas */}
        {cambiosGuardados.length > 0 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Deductivas Guardadas ({cambiosGuardados.length})</Typography>
            <Stack spacing={2}>
              {cambiosGuardados.map(cambio => {
                const detalles = detallesPorCambio[cambio.id] || [];
                const isExpanded = cambiosExpandidos.has(cambio.id);
                return (
                  <Paper key={cambio.id} sx={{ p: 2, bgcolor: 'rgba(239, 68, 68, 0.05)' }}>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => toggleCambioExpandido(cambio.id)}
                            sx={{ color: 'error.main' }}
                          >
                            {isExpanded ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {cambio.numero_cambio} - {cambio.descripcion}
                          </Typography>
                        </Box>
                        <Chip 
                          label={`${cambio.monto_cambio < 0 ? '' : '-'}$${Math.abs(cambio.monto_cambio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                          color="error"
                          size="small"
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Fecha: {new Date(cambio.fecha_cambio).toLocaleDateString('es-MX')} | 
                        Estatus: {cambio.estatus} | 
                        Conceptos modificados: {detalles.length}
                      </Typography>
                      <Collapse in={isExpanded}>
                        {detalles.length > 0 && (
                          <TableContainer sx={{ mt: 1 }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Clave</TableCell>
                                  <TableCell>Concepto</TableCell>
                                  <TableCell align="right">Cant. Original</TableCell>
                                  <TableCell align="right">Cant. Nueva</TableCell>
                                  <TableCell align="right">Diferencia</TableCell>
                                  <TableCell align="right">P.U.</TableCell>
                                  <TableCell align="right">Importe</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {detalles.map(detalle => (
                                  <TableRow key={detalle.id}>
                                    <TableCell>{detalle.concepto_clave}</TableCell>
                                    <TableCell sx={{ maxWidth: 300 }}>
                                      <Typography variant="body2" noWrap>{detalle.concepto_descripcion}</Typography>
                                    </TableCell>
                                    <TableCell align="right">{detalle.cantidad_original.toFixed(2)}</TableCell>
                                    <TableCell align="right">{detalle.cantidad_nueva.toFixed(2)}</TableCell>
                                    <TableCell align="right">
                                      <Typography color="error.main" fontWeight={600}>
                                        {detalle.cantidad_modificacion.toFixed(2)}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                      ${detalle.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography fontWeight={600}>
                                        ${detalle.importe_modificacion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                      </Typography>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </Collapse>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* Botón para crear nueva deductiva */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="error"
            size="large"
            startIcon={<DeleteIcon />}
            onClick={() => {
              setShowCatalogoModal(true);
            }}
            sx={{ minWidth: 200 }}
          >
            Nueva Deductiva
          </Button>
        </Box>
      </Stack>

      {/* MODAL CATÁLOGO PARA CREAR DEDUCTIVA */}
      <Dialog 
        open={showCatalogoModal} 
        onClose={() => setShowCatalogoModal(false)} 
        maxWidth="xl" 
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Crear Deductiva - Seleccionar Conceptos</Typography>
            <Typography variant="body2" color="text.secondary">
              Reduce las cantidades de los conceptos que deseas incluir en la deductiva
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <TableContainer sx={{ maxHeight: 'calc(90vh - 200px)' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: '#334155', color: 'white' }}>Clave</TableCell>
                  <TableCell sx={{ bgcolor: '#334155', color: 'white' }}>Descripción</TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#334155', color: 'white' }}>Cant. Original</TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#334155', color: 'white' }}>Cant. Actualizada</TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#334155', color: 'white' }}>P.U.</TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#334155', color: 'white', minWidth: 150 }}>Cant. Nueva</TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#334155', color: 'white' }}>Diferencia</TableCell>
                  <TableCell align="right" sx={{ bgcolor: '#334155', color: 'white' }}>$ Diferencia</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {conceptosOriginales.map(concepto => {
                  const cantidadActualizada = cantidadesActualizadas[concepto.id] ?? concepto.cantidad_catalogo;
                  const cantidadNueva = volumenesDeductiva[concepto.id] ?? cantidadActualizada;
                  const diferencia = cantidadNueva - cantidadActualizada;
                  const importeDiferencia = diferencia * concepto.precio_unitario_catalogo;
                  const tieneCambio = diferencia !== 0;
                  
                  return (
                    <TableRow 
                      key={concepto.id}
                      sx={{ 
                        bgcolor: tieneCambio ? 'rgba(239, 68, 68, 0.05)' : 'inherit'
                      }}
                    >
                      <TableCell>{concepto.clave}</TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 400 }}>
                          {concepto.concepto}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {concepto.cantidad_catalogo.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>
                          {cantidadActualizada.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        ${concepto.precio_unitario_catalogo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={cantidadNueva}
                          placeholder={cantidadActualizada.toFixed(2)}
                          onChange={(e) => {
                            let nuevaCantidad = parseFloat(e.target.value) || 0;
                            // En deductiva, no permitir más que la cantidad actualizada
                            if (nuevaCantidad > cantidadActualizada) {
                              nuevaCantidad = cantidadActualizada;
                            }
                            // No permitir negativos
                            if (nuevaCantidad < 0) {
                              nuevaCantidad = 0;
                            }
                            setVolumenesDeductiva({
                              ...volumenesDeductiva,
                              [concepto.id]: nuevaCantidad
                            });
                          }}
                          sx={{ width: 130 }}
                          inputProps={{ step: 0.01, min: 0, max: cantidadActualizada }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body2" 
                          fontWeight={600}
                          color={diferencia > 0 ? 'success.main' : diferencia < 0 ? 'error.main' : 'text.secondary'}
                        >
                          {diferencia > 0 ? '+' : ''}{diferencia.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body2" 
                          fontWeight={700}
                          color={importeDiferencia > 0 ? 'success.main' : importeDiferencia < 0 ? 'error.main' : 'text.secondary'}
                        >
                          {importeDiferencia > 0 ? '+' : ''}${Math.abs(importeDiferencia).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCatalogoModal(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleGuardarDeductivaDesdeModal}
            disabled={Object.keys(volumenesDeductiva).filter(id => {
              const cantidadActualizada = cantidadesActualizadas[id] ?? conceptosOriginales.find(c => c.id === id)?.cantidad_catalogo ?? 0;
              return volumenesDeductiva[id] !== cantidadActualizada;
            }).length === 0}
          >
            Continuar con Deductiva
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG CONFIRMAR DEDUCTIVA */}
      <Dialog open={showDeductivaDialog} onClose={() => setShowDeductivaDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar Deductiva</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Descripción"
              value={descripcionDeductiva}
              onChange={(e) => setDescripcionDeductiva(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
            <Typography variant="body2">
              Conceptos seleccionados: {conceptosDeductiva.size}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeductivaDialog(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleGuardarDeductiva}>
            Guardar Deductiva
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CambiosContratoTabs;
