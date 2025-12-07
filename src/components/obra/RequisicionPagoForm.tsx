import React, { useState, useEffect, useMemo } from 'react';
import { RequisicionPago, RequisicionConcepto } from '@/types/requisicion-pago';
import { Contrato } from '@/types/contrato';
import { ConceptoContrato } from '@/types/concepto-contrato';
import { RequisicionConceptosSelector } from './RequisicionConceptosSelector';
import { db } from '@/db/database';
import { uploadMultipleFiles, getPublicUrl } from '@/lib/utils/storageUtils';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/context/AuthContext';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Stack,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Description as DescriptionIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as AttachMoneyIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';

interface RequisicionPagoFormProps {
  requisicion?: RequisicionPago;
  contratos: Contrato[];
  onSave: (requisicion: RequisicionPago) => void;
  onCancel: () => void;
  readOnly?: boolean;
}

export const RequisicionPagoForm: React.FC<RequisicionPagoFormProps> = ({
  requisicion,
  contratos,
  onSave,
  onCancel,
  readOnly = false
}) => {
  const { user, perfil } = useAuth();
  // Solo mostrar deducciones extra si NO es contratista (por defecto no mostrar si no sabemos)
  const esContratista = perfil?.tipo === 'CONTRATISTA' || user?.user_metadata?.tipo === 'CONTRATISTA';
  
  const [contratoId, setContratoId] = useState('');
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [conceptos, setConceptos] = useState<RequisicionConcepto[]>([]);
  const [deducciones, setDeducciones] = useState<Array<{ id: string; cantidad: number; importe: number }>>([]);
  const [amortizacion, setAmortizacion] = useState(0);
  const [retencion, setRetencion] = useState(0);
  const [otrosDescuentos, setOtrosDescuentos] = useState(0);
  const [amortizacionManual, setAmortizacionManual] = useState(false);
  const [retencionManual, setRetencionManual] = useState(false);
  const [amortizadoAnterior, setAmortizadoAnterior] = useState(0);
  const [descripcionGeneral, setDescripcionGeneral] = useState('');
  const [notas, setNotas] = useState('');
  const [estado, setEstado] = useState<RequisicionPago['estado']>('borrador');
  const [respaldoDocumental, setRespaldoDocumental] = useState<string[]>([]);
  const [facturaUrl, setFacturaUrl] = useState('');
  
  const [conceptosContrato, setConceptosContrato] = useState<ConceptoContrato[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Inicializar o resetear el formulario cuando cambie la requisición
  useEffect(() => {
    if (requisicion) {
      // Cargar datos de requisición existente
      setContratoId(requisicion.contrato_id || '');
      setNumero(requisicion.numero || '');
      setFecha(requisicion.fecha || new Date().toISOString().split('T')[0]);
      
      // Separar conceptos normales de deducciones
      const conceptosNormales = (requisicion.conceptos || []).filter(c => c.tipo !== 'DEDUCCION');
      const deduccionesGuardadas = (requisicion.conceptos || []).filter(c => c.tipo === 'DEDUCCION');
      
      setConceptos(conceptosNormales);
      
      // Restaurar deducciones en el formato correcto
      const deduccionesRestauradas = deduccionesGuardadas.map(d => ({
        id: d.concepto_contrato_id,
        cantidad: d.cantidad_esta_requisicion,
        importe: d.importe
      }));
      setDeducciones(deduccionesRestauradas);
      
      setAmortizacion(requisicion.amortizacion || 0);
      setRetencion(requisicion.retencion || 0);
      setOtrosDescuentos(requisicion.otros_descuentos || 0);
      setDescripcionGeneral(requisicion.descripcion_general || '');
      setNotas(requisicion.notas || '');
      setEstado(requisicion.estado || 'borrador');
      setRespaldoDocumental(requisicion.respaldo_documental || []);
      setFacturaUrl(requisicion.factura_url || '');
    } else {
      // Resetear a valores por defecto para nueva requisición
      setContratoId('');
      setNumero('');
      setFecha(new Date().toISOString().split('T')[0]);
      setConceptos([]);
      setDeducciones([]);
      setAmortizacion(0);
      setRetencion(0);
      setOtrosDescuentos(0);
      setAmortizacionManual(false);
      setFacturaUrl('');
      setRetencionManual(false);
      setAmortizadoAnterior(0);
      setDescripcionGeneral('');
      setNotas('');
      setEstado('borrador');
      setRespaldoDocumental([]);
      setConceptosContrato([]);
      setErrors({});
    }
  }, [requisicion]);

  // Cargar conceptos del contrato seleccionado
  useEffect(() => {
    if (contratoId) {
      loadConceptosContrato(contratoId);
    } else {
      setConceptosContrato([]);
    }
  }, [contratoId]);

  const loadConceptosContrato = async (contratoId: string) => {
    setLoading(true);
    try {
      // 1. Cargar conceptos ordinarios del catálogo
      const conceptosOrdinarios = await db.conceptos_contrato
        .where('contrato_id')
        .equals(contratoId)
        .and(c => c.active === true)
        .toArray();
      
      // 2. Cargar cambios de contrato aplicados (aditivas/deductivas)
      const cambiosAplicados = await db.cambios_contrato
        .where('contrato_id')
        .equals(contratoId)
        .and(c => c.active === true && c.estatus === 'APLICADO' && (c.tipo_cambio === 'ADITIVA' || c.tipo_cambio === 'DEDUCTIVA'))
        .sortBy('fecha_cambio');

      // 3. Calcular cantidades actualizadas por concepto (después de aditivas/deductivas)
      const cantidadesActualizadas = new Map<string, number>();
      
      // Inicializar con cantidades del catálogo
      conceptosOrdinarios.forEach(c => {
        cantidadesActualizadas.set(c.id, c.cantidad_catalogo);
      });

      // Aplicar cambios cronológicamente
      for (const cambio of cambiosAplicados) {
        const detalles = await db.detalles_aditiva_deductiva
          .where('cambio_contrato_id')
          .equals(cambio.id)
          .and(d => d.active !== false)
          .toArray();
        
        detalles.forEach(detalle => {
          const cantidadActual = cantidadesActualizadas.get(detalle.concepto_contrato_id) || 0;
          cantidadesActualizadas.set(detalle.concepto_contrato_id, detalle.cantidad_nueva);
        });
      }

      // 4. Cargar todas las requisiciones del contrato para calcular cantidades pagadas
      const todasRequisiciones = await db.requisiciones_pago
        .where('contrato_id')
        .equals(contratoId)
        .toArray();
      
      // Calcular cantidad pagada anterior por concepto
      const cantidadesPagadas = new Map<string, number>();
      todasRequisiciones.forEach(req => {
        // Excluir la requisición actual si estamos editando
        if (requisicion && req.id === requisicion.id) return;
        
        req.conceptos?.forEach(c => {
          const actual = cantidadesPagadas.get(c.concepto_contrato_id) || 0;
          cantidadesPagadas.set(c.concepto_contrato_id, actual + c.cantidad_esta_requisicion);
        });
      });
      
      // 5. Agregar info de cantidad actualizada y pagada a los conceptos
      const conceptosConInfo = conceptosOrdinarios.map(concepto => ({
        ...concepto,
        cantidad_catalogo_original: concepto.cantidad_catalogo,
        cantidad_catalogo: cantidadesActualizadas.get(concepto.id) || concepto.cantidad_catalogo,
        cantidad_pagada_anterior: cantidadesPagadas.get(concepto.id) || 0,
        tiene_cambios: cantidadesActualizadas.get(concepto.id) !== concepto.cantidad_catalogo
      }));
      
      setConceptosContrato(conceptosConInfo);
    } catch (error) {
      console.error('Error cargando conceptos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generar número automático si es nuevo
  useEffect(() => {
    if (!requisicion && contratoId && !numero) {
      generateNumeroRequisicion(contratoId);
    }
  }, [contratoId]);

  const generateNumeroRequisicion = async (contratoId: string) => {
    try {
      const requisiciones = await db.requisiciones_pago
        .where('contrato_id')
        .equals(contratoId)
        .toArray();
      
      const contrato = contratos.find(c => c.id === contratoId);
      const numeroContrato = contrato?.numero_contrato || 'CTR';
      
      // Buscar el máximo número existente para este contrato
      let maxNumero = 0;
      const regex = new RegExp(`^${numeroContrato.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-REQ-(\\d+)$`);
      
      requisiciones.forEach(req => {
        const match = req.numero.match(regex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumero) maxNumero = num;
        }
      });
      
      const siguiente = maxNumero + 1;
      setNumero(`${numeroContrato}-REQ-${String(siguiente).padStart(3, '0')}`);
    } catch (error) {
      console.error('Error generando número:', error);
      setNumero('REQ-001');
    }
  };

  // Handler para cambios en deducciones extra - actualiza automáticamente "Otros Descuentos"
  const handleDeduccionesChange = (nuevasDeducciones: Array<{ id: string; cantidad: number; importe: number }>) => {
    setDeducciones(nuevasDeducciones);
    // Calcular total de deducciones (importes ya vienen negativos, tomamos valor absoluto)
    const totalDeducciones = nuevasDeducciones.reduce((sum, d) => sum + Math.abs(d.importe), 0);
    setOtrosDescuentos(totalDeducciones);
  };

  // Calcular montos
  const montoEstimado = useMemo(() => {
    return conceptos.reduce((sum, c) => sum + c.importe, 0);
  }, [conceptos]);

  // Cargar amortización pagada en requisiciones anteriores para este contrato
  useEffect(() => {
    let active = true;
    const loadPrev = async () => {
      if (!contratoId) { setAmortizadoAnterior(0); return; }
      try {
        const prev = await db.requisiciones_pago
          .where('contrato_id')
          .equals(contratoId)
          .toArray();
        // Excluir la requisición actual si estamos editando
        const sumAmort = prev
          .filter(r => !requisicion || r.id !== requisicion.id)
          .reduce((s, r) => s + (r.amortizacion || 0), 0);
        if (active) setAmortizadoAnterior(sumAmort);
      } catch (e) {
        console.warn('No se pudo cargar amortizaciones previas:', e);
        if (active) setAmortizadoAnterior(0);
      }
    };
    loadPrev();
    return () => { active = false; };
  }, [contratoId, requisicion]);

  // Autocalcular amortización (anticipo) y retención a partir del contrato
  useEffect(() => {
    const contrato = contratos.find(c => c.id === contratoId);
    if (!contrato) return;

    // Retención por porcentaje sobre monto estimado
    if (!retencionManual) {
      const retPct = (contrato.retencion_porcentaje || 0) / 100;
      const calcRet = Math.max(0, montoEstimado * retPct);
      setRetencion(parseFloat(calcRet.toFixed(2)));
    }

    // Amortización de anticipo proporcional al avance, limitada al saldo del anticipo
    if (!amortizacionManual) {
      const anticipoMonto = contrato.anticipo_monto || 0;
      const anticipoPct = contrato.monto_contrato > 0 ? (anticipoMonto / contrato.monto_contrato) : 0;
      const saldoAnticipo = Math.max(0, anticipoMonto - amortizadoAnterior);
      const calcAmort = Math.min(saldoAnticipo, Math.max(0, montoEstimado * anticipoPct));
      setAmortizacion(parseFloat(calcAmort.toFixed(2)));
    }
  }, [contratoId, contratos, montoEstimado, amortizadoAnterior, amortizacionManual, retencionManual]);

  const total = useMemo(() => {
    return Math.max(0, montoEstimado - amortizacion - retencion - otrosDescuentos);
  }, [montoEstimado, amortizacion, retencion, otrosDescuentos]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!contratoId) {
      newErrors.contratoId = 'Debe seleccionar un contrato';
    }
    if (!numero) {
      newErrors.numero = 'El número es requerido';
    }
    if (!fecha) {
      newErrors.fecha = 'La fecha es requerida';
    }
    if (conceptos.length === 0) {
      newErrors.conceptos = 'Debe seleccionar al menos un concepto';
    }
    if (conceptos.some(c => c.cantidad_esta_requisicion <= 0)) {
      newErrors.cantidades = 'Todos los conceptos deben tener cantidad mayor a 0';
    }

    // Validar que ningún concepto exceda la cantidad disponible del catálogo
    const conceptosExcedidos = conceptos.filter(c => {
      const disponible = Math.max(0, c.cantidad_catalogo - c.cantidad_pagada_anterior);
      return c.cantidad_esta_requisicion > disponible;
    });
    if (conceptosExcedidos.length > 0) {
      const claves = conceptosExcedidos.map(c => c.clave).join(', ');
      newErrors.conceptos = `Los siguientes conceptos exceden la cantidad disponible: ${claves}`;
    }

    // Validar amortización no exceda el saldo disponible del anticipo
    const contrato = contratos.find(c => c.id === contratoId);
    if (contrato && contrato.anticipo_monto) {
      const saldoAnticipo = Math.max(0, contrato.anticipo_monto - amortizadoAnterior);
      if (amortizacion > saldoAnticipo) {
        newErrors.amortizacion = `La amortización ($${amortizacion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}) excede el saldo del anticipo ($${saldoAnticipo.toLocaleString('es-MX', { minimumFractionDigits: 2 })})`;
      }
    }

    // Validar que el total no sea negativo
    if (total < 0) {
      newErrors.total = 'El total a pagar no puede ser negativo. Revise los descuentos aplicados.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Si estamos en modo factura (readOnly con estados enviada/aprobada), solo actualizar factura
    const modoFactura = readOnly && (estado === 'enviada' || estado === 'aprobada');
    
    if (!modoFactura && !validate()) {
      return;
    }

    // Si es modo factura, usar datos existentes de la requisición
    if (modoFactura && requisicion) {
      const requisicionData: RequisicionPago = {
        ...requisicion,
        factura_url: facturaUrl || undefined,
        updated_at: new Date().toISOString(),
        _dirty: true
      };
      
      onSave(requisicionData);
      return;
    }

    const contrato = contratos.find(c => c.id === contratoId);
    if (!contrato) return;

    // Convertir deducciones a formato de concepto para guardar
    const deduccionesComoConceptos: RequisicionConcepto[] = deducciones.map(ded => ({
      concepto_contrato_id: ded.id,
      clave: ded.id,
      concepto: `Deducción Extra: ${ded.id}`,
      unidad: 'LS',
      cantidad_catalogo: 0,
      cantidad_pagada_anterior: 0,
      cantidad_esta_requisicion: ded.cantidad,
      precio_unitario: ded.importe / ded.cantidad,
      importe: ded.importe,
      tipo: 'DEDUCCION' as const
    }));

    console.log('💾 Guardando requisición:', {
      conceptosNormales: conceptos.length,
      deduccionesCount: deduccionesComoConceptos.length,
      conceptosDetalle: conceptos.map(c => ({ clave: c.clave, importe: c.importe })),
      deduccionesDetalle: deduccionesComoConceptos.map(d => ({ clave: d.clave, importe: d.importe }))
    });

    // Combinar conceptos normales con deducciones
    const todosConceptos = [...conceptos, ...deduccionesComoConceptos];

    const requisicionData: RequisicionPago = {
      id: requisicion?.id || uuidv4(),
      contrato_id: contratoId,
      proyecto_id: contrato.proyecto_id,
      numero,
      fecha,
      conceptos: todosConceptos,
      monto_estimado: montoEstimado,
      amortizacion,
      retencion,
      otros_descuentos: otrosDescuentos,
      total,
      descripcion_general: descripcionGeneral || undefined,
      notas: notas || undefined,
      respaldo_documental: respaldoDocumental.length > 0 ? respaldoDocumental : undefined,
      factura_url: facturaUrl || undefined,
      estado,
      // Preservar campos de visto bueno si existen
      visto_bueno: requisicion?.visto_bueno,
      visto_bueno_por: requisicion?.visto_bueno_por,
      visto_bueno_fecha: requisicion?.visto_bueno_fecha,
      fecha_pago_estimada: requisicion?.fecha_pago_estimada,
      estatus_pago: requisicion?.estatus_pago,
      created_at: requisicion?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _dirty: true
    };

    onSave(requisicionData);
  };

  const contratoSeleccionado = contratos.find(c => c.id === contratoId);

  // Debug: Log de contratos disponibles
  useEffect(() => {
    console.log('Contratos disponibles:', contratos);
  }, [contratos]);

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ py: 3 }}>
      {/* Header con botones */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Typography variant="h4" fontWeight="bold">
          {readOnly 
            ? (estado === 'enviada' || estado === 'aprobada') 
              ? 'Subir Factura - Requisición de Pago' 
              : 'Ver Requisición de Pago'
            : requisicion ? 'Editar Requisición de Pago' : 'Nueva Requisición de Pago'}
        </Typography>
        {/* Ocultar botones del header si estamos en modo factura (se muestran abajo) */}
        {!(readOnly && (estado === 'enviada' || estado === 'aprobada')) && (
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<CloseIcon />}
              onClick={onCancel}
            >
              {readOnly ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!readOnly && (
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
              >
                Guardar
              </Button>
            )}
          </Stack>
        )}
      </Stack>

      {/* Información básica */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
          <DescriptionIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Información General
          </Typography>
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
          {/* Contrato */}
          <FormControl fullWidth error={!!errors.contratoId}>
            <InputLabel>Contrato *</InputLabel>
            <Select
              value={contratoId}
              label="Contrato *"
              onChange={(e) => {
                setContratoId(e.target.value);
                setConceptos([]); // Reset conceptos al cambiar contrato
              }}
              disabled={readOnly || !!requisicion} // No permitir cambio si es edición o solo lectura
            >
              <MenuItem value="">Seleccione un contrato</MenuItem>
              {contratos.map(contrato => (
                <MenuItem key={contrato.id} value={contrato.id}>
                  {contrato.clave_contrato || contrato.numero_contrato} - {contrato.categoria} / {contrato.partida} / {contrato.subpartida}
                </MenuItem>
              ))}
            </Select>
            {errors.contratoId && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                {errors.contratoId}
              </Typography>
            )}
          </FormControl>

          {/* Número */}
          <TextField
            label="Número de Requisición *"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="REQ-001"
            error={!!errors.numero}
            helperText={errors.numero}
            disabled={readOnly}
            fullWidth
          />

          {/* Fecha */}
          <TextField
            label="Fecha *"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            error={!!errors.fecha}
            helperText={errors.fecha}
            disabled={readOnly}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CalendarIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          {/* Estado */}
          <TextField
            label="Estado"
            value="Requisición"
            disabled
            fullWidth
          />
        </Box>

        {/* Descripción General */}
        <TextField
          label="Descripción General de la Requisición"
          value={descripcionGeneral}
          onChange={(e) => setDescripcionGeneral(e.target.value)}
          multiline
          rows={2}
          placeholder="Descripción general de los trabajos..."
          disabled={readOnly}
          fullWidth
          sx={{ mb: 2 }}
        />

        {/* Notas */}
        <TextField
          label="Notas / Observaciones"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          multiline
          rows={3}
          placeholder="Comentarios adicionales..."
          disabled={readOnly}
          fullWidth
        />
      </Paper>

      {/* Selector de Conceptos */}
      {contratoId && conceptosContrato.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <RequisicionConceptosSelector
            conceptosContrato={conceptosContrato}
            conceptosSeleccionados={conceptos}
            onConceptosChange={setConceptos}
            onDeduccionesChange={handleDeduccionesChange}
            deduccionesIniciales={deducciones}
            contratoId={contratoId}
            esContratista={esContratista}
            readOnly={readOnly}
          />
          {errors.conceptos && (
            <Alert severity="error" sx={{ mt: 2 }}>{errors.conceptos}</Alert>
          )}
          {errors.cantidades && (
            <Alert severity="error" sx={{ mt: 2 }}>{errors.cantidades}</Alert>
          )}
        </Paper>
      )}



      {contratoId && loading && (
        <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">Cargando conceptos...</Typography>
        </Paper>
      )}

      {contratoId && !loading && conceptosContrato.length === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          El contrato seleccionado no tiene conceptos en su catálogo
        </Alert>
      )}

      {/* Montos y Descuentos */}
      {conceptos.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
            <AttachMoneyIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Cálculo de Montos
            </Typography>
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
            {/* Monto Estimado (calculado) */}
            <Paper elevation={2} sx={{ p: 3, bgcolor: 'primary.50', borderColor: 'primary.light', border: 1 }}>
              <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
                Monto Estimado (Calculado)
              </Typography>
              <Typography variant="h4" fontWeight={700} color="primary.dark">
                ${montoEstimado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </Typography>
            </Paper>

            {/* Amortización */}
            <TextField
              label="Amortización (Anticipo)"
              type="number"
              value={amortizacion}
              onChange={(e) => { setAmortizacion(parseFloat(e.target.value) || 0); setAmortizacionManual(true); }}
              error={!!errors.amortizacion}
              disabled={readOnly}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                inputProps: { min: 0, step: 0.01 }
              }}
              helperText={
                errors.amortizacion ||
                (contratoId && contratos.find(c => c.id === contratoId) ? 
                  (() => {
                    const contrato = contratos.find(c => c.id === contratoId)!;
                    const anticipoMonto = contrato.anticipo_monto || 0;
                    const anticipoPct = contrato.monto_contrato > 0 ? ((anticipoMonto / contrato.monto_contrato) * 100).toFixed(2) : '0';
                    const saldoAnticipo = Math.max(0, anticipoMonto - amortizadoAnterior);
                    return `Anticipo del contrato: $${anticipoMonto.toLocaleString('es-MX', { minimumFractionDigits: 2 })} (${anticipoPct}%) | Saldo: $${saldoAnticipo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
                  })()
                : undefined)
              }
              fullWidth
            />

            {/* Retención */}
            <TextField
              label="Retención (Fondo de Garantía)"
              type="number"
              value={retencion}
              onChange={(e) => { setRetencion(parseFloat(e.target.value) || 0); setRetencionManual(true); }}
              disabled={readOnly}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                inputProps: { min: 0, step: 0.01 }
              }}
              helperText={
                contratoId && contratos.find(c => c.id === contratoId) ?
                  (() => {
                    const contrato = contratos.find(c => c.id === contratoId)!;
                    const retPct = contrato.retencion_porcentaje || 0;
                    return `Porcentaje de retención del contrato: ${retPct}%`;
                  })()
                : undefined
              }
              fullWidth
            />

            {/* Otros Descuentos (auto-calculado desde deducciones extra) */}
            <TextField
              label="Otros Descuentos"
              type="number"
              value={otrosDescuentos}
              onChange={(e) => setOtrosDescuentos(parseFloat(e.target.value) || 0)}
              disabled={true}
              helperText="Calculado automáticamente desde deducciones extra"
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                inputProps: { min: 0, step: 0.01 }
              }}
              fullWidth
            />
          </Box>

          {/* Total a Pagar */}
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              bgcolor: errors.total ? 'error.50' : 'success.50', 
              borderColor: errors.total ? 'error.main' : 'success.main', 
              border: 2 
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight={600}>
                Total a Pagar:
              </Typography>
              <Typography 
                variant="h3" 
                fontWeight={700} 
                color={errors.total ? 'error.dark' : 'success.dark'}
              >
                ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </Typography>
            </Stack>
          </Paper>
          {errors.total && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errors.total}
            </Alert>
          )}
        </Paper>
      )}

      {/* Respaldo Documental */}
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            Respaldo Documental
          </Typography>
          {respaldoDocumental.length > 0 && !readOnly && (
            <Chip 
              label={`${respaldoDocumental.length} archivo(s)`} 
              color="primary" 
              size="small" 
            />
          )}
        </Stack>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="caption">
            Los archivos se suben inmediatamente al servidor, pero se asociarán a esta requisición al dar click en <strong>"Guardar Requisición"</strong>.
          </Typography>
        </Alert>
        <Paper
          variant="outlined"
          sx={{
            p: 4,
            textAlign: 'center',
            borderStyle: 'dashed',
            borderWidth: 2,
            borderColor: 'divider',
            bgcolor: 'background.default'
          }}
        >
          <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {uploading ? 'Subiendo archivos...' : 'Seleccionar archivos (PDF, imágenes, Office)'}
          </Typography>
          <Button
            component="label"
            variant="outlined"
            size="small"
            sx={{ mt: 1 }}
            disabled={uploading || readOnly}
          >
            {uploading ? 'Subiendo...' : 'Seleccionar Archivos'}
            <input
              type="file"
              multiple
              accept="application/pdf,image/*"
              hidden
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                if (files.length === 0) return;

                setUploading(true);
                try {
                  // Subir archivos a Supabase Storage
                  const uploadedPaths = await uploadMultipleFiles(
                    files,
                    'documents', // bucket name (ya existe)
                    'requisiciones/respaldos' // folder
                  );

                  if (uploadedPaths.length > 0) {
                    // Agregar las URLs públicas al estado
                    const newUrls = uploadedPaths.map((path: string) => 
                      getPublicUrl(path, 'documents')
                    );
                    setRespaldoDocumental([...respaldoDocumental, ...newUrls]);
                    console.log('✅ Archivos subidos a Storage:', uploadedPaths.length, 'archivo(s)');
                    console.log('⚠️ Las URLs se guardarán en la BD al dar click en "Guardar Requisición"');
                    // No mostrar alert para no interrumpir el flujo
                  } else {
                    alert('No se pudieron subir los archivos. Verifica tu conexión e intenta de nuevo.');
                  }
                } catch (error) {
                  console.error('Error subiendo archivos:', error);
                  alert('Error al subir los archivos');
                } finally {
                  setUploading(false);
                  // Limpiar el input
                  e.target.value = '';
                }
              }}
              disabled={uploading || readOnly}
            />
          </Button>
        </Paper>
        {respaldoDocumental.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
              Archivos adjuntos ({respaldoDocumental.length})
            </Typography>
            <List sx={{ bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              {respaldoDocumental.map((url, index) => {
                const fileName = url.split('/').pop() || 'archivo';
                const fileExtension = fileName.split('.').pop()?.toUpperCase() || 'FILE';
                const isPDF = fileExtension === 'PDF';
                const isImage = ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP'].includes(fileExtension);
                
                return (
                  <ListItem
                    key={index}
                    sx={{ 
                      borderBottom: index < respaldoDocumental.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <Box sx={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: 1, 
                      bgcolor: isPDF ? 'error.light' : isImage ? 'success.light' : 'primary.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2
                    }}>
                      <Typography variant="caption" fontWeight={700} color="white">
                        {fileExtension}
                      </Typography>
                    </Box>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={500}>
                          Archivo {index + 1}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary" sx={{ 
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '300px'
                        }}>
                          {fileName}
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityIcon />}
                          onClick={() => window.open(url, '_blank')}
                          sx={{ minWidth: 'auto' }}
                        >
                          Ver
                        </Button>
                        {!readOnly && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              if (confirm('¿Eliminar este archivo?')) {
                                setRespaldoDocumental(respaldoDocumental.filter((_, i) => i !== index));
                              }
                            }}
                            title="Eliminar"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        )}
      </Paper>

      {/* Factura (solo cuando está solicitada/enviada) */}
      {(estado === 'enviada' || estado === 'aprobada') && (
        <Paper sx={{ p: 3, bgcolor: 'warning.50', border: '2px solid', borderColor: 'warning.main' }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={600} color="warning.dark">
              📄 Factura
            </Typography>
            {facturaUrl && (
              <Chip 
                label="Factura cargada" 
                color="success" 
                size="small" 
              />
            )}
          </Stack>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="caption">
              Subir la factura correspondiente a esta requisición. El archivo se guardará al dar click en <strong>"Guardar Requisición"</strong>.
            </Typography>
          </Alert>
          
          {!facturaUrl ? (
            <Paper
              variant="outlined"
              sx={{
                p: 4,
                textAlign: 'center',
                borderStyle: 'dashed',
                borderWidth: 2,
                borderColor: 'warning.main',
                bgcolor: 'background.default'
              }}
            >
              <CloudUploadIcon sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {uploading ? 'Subiendo factura...' : 'Seleccionar factura (PDF)'}
              </Typography>
              <Button
                component="label"
                variant="outlined"
                color="warning"
                size="small"
                sx={{ mt: 1 }}
                disabled={uploading}
              >
                {uploading ? 'Subiendo...' : 'Seleccionar Factura'}
                <input
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;

                    setUploading(true);
                    try {
                      const uploadedPaths = await uploadMultipleFiles(
                        files,
                        'documents',
                        'requisiciones/facturas'
                      );

                      if (uploadedPaths.length > 0) {
                        const facturaPublicUrl = getPublicUrl(uploadedPaths[0], 'documents');
                        setFacturaUrl(facturaPublicUrl);
                        console.log('✅ Factura subida a Storage:', facturaPublicUrl);
                      } else {
                        alert('No se pudo subir la factura. Verifica tu conexión e intenta de nuevo.');
                      }
                    } catch (error) {
                      console.error('Error subiendo factura:', error);
                      alert('Error al subir la factura');
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
              </Button>
            </Paper>
          ) : (
            <Box sx={{ bgcolor: 'white', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'warning.main' }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{
                  bgcolor: 'error.main',
                  color: 'white',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  fontWeight: 700,
                  fontSize: '0.75rem'
                }}>
                  PDF
                </Box>
                <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>
                  Factura cargada
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    startIcon={<VisibilityIcon />}
                    onClick={() => window.open(facturaUrl, '_blank')}
                  >
                    Ver Factura
                  </Button>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      if (confirm('¿Eliminar la factura?')) {
                        setFacturaUrl('');
                      }
                    }}
                    title="Eliminar"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </Box>
          )}

          {/* Botón Guardar dentro de la sección de factura */}
          {readOnly && (estado === 'enviada' || estado === 'aprobada') && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<CloseIcon />}
                onClick={onCancel}
                size="large"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                color="warning"
                size="large"
              >
                Guardar Factura
              </Button>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};
