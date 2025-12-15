import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Paper,
  Typography,
  Stack,
  Box,
  IconButton,
  Tooltip,
  TextField,
} from '@mui/material';
import {
  Close as CloseIcon,
  UploadFile as UploadFileIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { SolicitudPago, ConceptoSolicitud } from '@/types/solicitud-pago';
import { SimpleFileUpload } from '@/components/general/SimpleFileUpload';
import { db } from '@/db/database';
import { syncService } from '@/sync/syncService';
import { createPagosRealizadosBatch } from '@/lib/services/pagoRealizadoService';
import { PagoRealizado } from '@/types/pago-realizado';

interface DesgloseSolicitudModalProps {
  open: boolean;
  onClose: () => void;
  solicitud: SolicitudPago | null;
  onSave?: () => void;
  readOnly?: boolean;
}

export const DesgloseSolicitudModal: React.FC<DesgloseSolicitudModalProps> = ({
  open,
  onClose,
  solicitud,
  onSave,
  readOnly = false,
}) => {
  const [conceptosSeleccionados, setConceptosSeleccionados] = useState<Set<string>>(new Set());
  const [conceptosActualizados, setConceptosActualizados] = useState<ConceptoSolicitud[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [retencionPorcentaje, setRetencionPorcentaje] = useState<{ [key: string]: number }>({});
  const [amortizacionPorcentaje, setAmortizacionPorcentaje] = useState<{ [key: string]: number }>({});
  const [retencionContrato, setRetencionContrato] = useState<number>(0);
  const [amortizacionContrato, setAmortizacionContrato] = useState<number>(0);

  // Obtener porcentajes del contrato y sincronizar conceptos cuando cambia la solicitud
  useEffect(() => {
    const cargarDatosContrato = async () => {
      if (!solicitud) return;

      setConceptosActualizados([...solicitud.conceptos_detalle]);
      
      // Obtener la requisición para conseguir el contrato_id
      try {
        const requisicion = await db.requisiciones_pago.get(solicitud.requisicion_id);
        
        if (requisicion?.contrato_id) {
          const contrato = await db.contratos.get(requisicion.contrato_id);
          
          if (contrato) {
            const retencionContratoValor = contrato.retencion_porcentaje || 0;
            
            // La amortización es el porcentaje de anticipo
            // Calcular el % de anticipo desde el monto
            let amortizacionContratoValor = 0;
            if (contrato.anticipo_monto && contrato.monto_contrato > 0) {
              amortizacionContratoValor = (contrato.anticipo_monto / contrato.monto_contrato) * 100;
            }
            
            setRetencionContrato(retencionContratoValor);
            setAmortizacionContrato(amortizacionContratoValor);
            
            console.log('📋 Porcentajes del contrato:', {
              retencion: retencionContratoValor,
              anticipo_amortizacion: amortizacionContratoValor.toFixed(2),
              anticipo_monto: contrato.anticipo_monto,
              monto_contrato: contrato.monto_contrato,
              contrato_id: contrato.id
            });
            
            // Inicializar porcentajes SOLO para conceptos normales
            // (deducciones, retenciones y extras NO amortizan ni retienen)
            const retenciones: { [key: string]: number } = {};
            const amortizaciones: { [key: string]: number } = {};
            
            solicitud.conceptos_detalle.forEach(c => {
              // Identificar tipo de concepto (buscar en conceptos de requisición)
              const esEspecial = c.concepto_clave?.startsWith('EXTDED-') || 
                                c.concepto_clave?.startsWith('RET-') ||
                                c.concepto_descripcion?.includes('Deducción Extra') ||
                                c.concepto_descripcion?.includes('Retención');
              
              retenciones[c.concepto_id] = esEspecial ? 0 : retencionContratoValor;
              amortizaciones[c.concepto_id] = esEspecial ? 0 : amortizacionContratoValor;
            });
            
            setRetencionPorcentaje(retenciones);
            setAmortizacionPorcentaje(amortizaciones);
          }
        }
      } catch (error) {
        console.error('Error cargando datos del contrato:', error);
        
        // Fallback: inicializar en 0 (ya están en 0, pero por consistencia)
        const retenciones: { [key: string]: number } = {};
        const amortizaciones: { [key: string]: number } = {};
        
        solicitud.conceptos_detalle.forEach(c => {
          retenciones[c.concepto_id] = 0;
          amortizaciones[c.concepto_id] = 0;
        });
        
        setRetencionPorcentaje(retenciones);
        setAmortizacionPorcentaje(amortizaciones);
      }
    };

    cargarDatosContrato();
  }, [solicitud]);

  if (!solicitud) return null;

  const handleToggleConcepto = (conceptoId: string) => {
    const newSet = new Set(conceptosSeleccionados);
    if (newSet.has(conceptoId)) {
      newSet.delete(conceptoId);
    } else {
      newSet.add(conceptoId);
      
      // Identificar si es concepto especial (deducción, retención o extra)
      const concepto = conceptosActualizados.find(c => c.concepto_id === conceptoId);
      const esEspecial = concepto && (
        concepto.concepto_clave?.startsWith('EXTDED-') || 
        concepto.concepto_clave?.startsWith('RET-') ||
        concepto.concepto_descripcion?.includes('Deducción Extra') ||
        concepto.concepto_descripcion?.includes('Retención')
      );
      
      // Al seleccionar un concepto, aplicar porcentajes SOLO si NO es especial
      setRetencionPorcentaje(prev => ({
        ...prev,
        [conceptoId]: esEspecial ? 0 : retencionContrato
      }));
      setAmortizacionPorcentaje(prev => ({
        ...prev,
        [conceptoId]: esEspecial ? 0 : amortizacionContrato
      }));
    }
    setConceptosSeleccionados(newSet);
  };

  const handleToggleAll = () => {
    // Solo seleccionar conceptos que no estén pagados
    const conceptosSeleccionables = conceptosActualizados.filter(c => !c.pagado);
    
    if (conceptosSeleccionados.size === conceptosSeleccionables.length) {
      setConceptosSeleccionados(new Set());
    } else {
      const newSet = new Set(conceptosSeleccionables.map(c => c.concepto_id));
      setConceptosSeleccionados(newSet);
      
      // Al seleccionar todos, aplicar porcentajes SOLO a conceptos normales
      // (deducciones, retenciones y extras NO amortizan ni retienen)
      const retenciones: { [key: string]: number } = { ...retencionPorcentaje };
      const amortizaciones: { [key: string]: number } = { ...amortizacionPorcentaje };
      
      conceptosSeleccionables.forEach(c => {
        const esEspecial = c.concepto_clave?.startsWith('EXTDED-') || 
                          c.concepto_clave?.startsWith('RET-') ||
                          c.concepto_descripcion?.includes('Deducción Extra') ||
                          c.concepto_descripcion?.includes('Retención');
        
        retenciones[c.concepto_id] = esEspecial ? 0 : retencionContrato;
        amortizaciones[c.concepto_id] = esEspecial ? 0 : amortizacionContrato;
      });
      
      setRetencionPorcentaje(retenciones);
      setAmortizacionPorcentaje(amortizaciones);
    }
  };

  // Calcular resumen de conceptos seleccionados
  const calcularResumen = () => {
    let totalImporte = 0;
    let totalRetenciones = 0;
    let totalAmortizaciones = 0;
    
    conceptosActualizados.forEach(concepto => {
      if (conceptosSeleccionados.has(concepto.concepto_id)) {
        const importe = concepto.importe;
        const retencion = (importe * (retencionPorcentaje[concepto.concepto_id] || 0)) / 100;
        const amortizacion = (importe * (amortizacionPorcentaje[concepto.concepto_id] || 0)) / 100;
        
        totalImporte += importe;
        totalRetenciones += retencion;
        totalAmortizaciones += amortizacion;
      }
    });
    
    const totalAPagar = totalImporte - totalRetenciones - totalAmortizaciones;
    
    return {
      totalImporte,
      totalRetenciones,
      totalAmortizaciones,
      totalAPagar,
      cantidadConceptos: conceptosSeleccionados.size
    };
  };

  const handleFileUpload = async (conceptoId: string, url: string) => {
    console.log('📎 Comprobante cargado para concepto:', conceptoId, url);
    
    // Actualizar el concepto en el estado local
    setConceptosActualizados(prev => 
      prev.map(c => c.concepto_id === conceptoId 
        ? { ...c, comprobante_url: url }
        : c
      )
    );
  };

  const handleGuardarPagos = async () => {
    if (conceptosSeleccionados.size === 0) {
      alert('⚠️ Selecciona al menos un concepto para pagar');
      return;
    }

    // Validar que todos los conceptos seleccionados tengan comprobante
    const conceptosSinComprobante = conceptosActualizados.filter(
      c => conceptosSeleccionados.has(c.concepto_id) && !c.comprobante_url
    );

    if (conceptosSinComprobante.length > 0) {
      alert(`⚠️ NO PUEDES GUARDAR SIN COMPROBANTES\n\nLos siguientes conceptos NO tienen comprobante:\n\n${conceptosSinComprobante.map(c => `• ${c.concepto_clave}: ${c.concepto_descripcion}`).join('\n')}\n\n🚫 Sube el comprobante primero para cada concepto seleccionado.`);
      return;
    }

    setGuardando(true);
    
    try {
      // Obtener datos relacionales necesarios
      const requisicion = await db.requisiciones_pago.get(solicitud!.requisicion_id);
      if (!requisicion) throw new Error('Requisición no encontrada');
      
      const contrato = await db.contratos.get(requisicion.contrato_id);
      if (!contrato) throw new Error('Contrato no encontrado');
      
      const fechaPago = new Date().toISOString();
      
      // Crear registros detallados de pagos realizados
      const pagosRealizados: Omit<PagoRealizado, 'id' | 'created_at' | 'updated_at'>[] = [];
      
      // Cargar conceptos del contrato para obtener unidad
      const conceptosContrato = await db.conceptos_contrato
        .where('contrato_id')
        .equals(contrato.id)
        .toArray();
      
      const conceptosContratoMap = new Map(conceptosContrato.map(c => [c.id, c]));
      
      conceptosActualizados.forEach(concepto => {
        if (conceptosSeleccionados.has(concepto.concepto_id)) {
          const retencionPct = retencionPorcentaje[concepto.concepto_id] || 0;
          const amortizacionPct = amortizacionPorcentaje[concepto.concepto_id] || 0;
          
          const montoBruto = concepto.importe;
          const retencionMonto = montoBruto * (retencionPct / 100);
          const amortizacionMonto = montoBruto * (amortizacionPct / 100);
          const montoNeto = montoBruto - retencionMonto - amortizacionMonto;
          
          // Obtener unidad del concepto del contrato
          const conceptoContrato = conceptosContratoMap.get(concepto.concepto_id);
          const unidad = conceptoContrato?.unidad || 'PZA';
          
          pagosRealizados.push({
            solicitud_pago_id: solicitud!.id?.toString() || '',
            requisicion_pago_id: requisicion.id,
            contrato_id: contrato.id,
            concepto_contrato_id: concepto.concepto_id,
            contratista_id: contrato.contratista_id,
            
            // Datos del concepto
            concepto_clave: concepto.concepto_clave,
            concepto_descripcion: concepto.concepto_descripcion,
            concepto_unidad: unidad,
            cantidad: concepto.cantidad,
            precio_unitario: concepto.precio_unitario,
            importe_concepto: concepto.importe,
            
            // Desglose del pago
            monto_bruto: montoBruto,
            retencion_porcentaje: retencionPct,
            retencion_monto: retencionMonto,
            anticipo_porcentaje: amortizacionPct,
            anticipo_monto: amortizacionMonto,
            monto_neto_pagado: montoNeto,
            
            // Información del pago
            fecha_pago: fechaPago,
            numero_pago: solicitud!.folio || `SIN-FOLIO-${Date.now()}`,
            metodo_pago: 'TRANSFERENCIA', // Valor por defecto
            referencia_pago: '',
            
            // Documentos
            comprobante_pago_url: concepto.comprobante_url || '',
            factura_url: '', // ConceptoSolicitud no tiene este campo aún
            xml_url: '', // ConceptoSolicitud no tiene este campo aún
            respaldo_documental: concepto.respaldo_documental || '',
            
            // Folios relacionados
            folio_solicitud: solicitud!.folio || '',
            folio_requisicion: requisicion.numero?.toString() || '',
            numero_contrato: contrato.numero_contrato,
            
            // Estado
            estatus: 'PAGADO',
            pagado_por: '',  // Se puede obtener del usuario actual
            aprobado_por: solicitud!.aprobada_por || '',
            notas: `Pago registrado desde solicitud ${solicitud!.folio}`,
            metadata: {},
            active: true,
          });
        }
      });
      
      // Guardar pagos realizados en batch
      console.log('💾 Creando registros de pagos realizados:', pagosRealizados);
      await createPagosRealizadosBatch(pagosRealizados);
      
      // Actualizar conceptos seleccionados como pagados
      const conceptosConPagos = conceptosActualizados.map(concepto => {
        if (conceptosSeleccionados.has(concepto.concepto_id)) {
          return {
            ...concepto,
            pagado: true,
            monto_pagado: concepto.importe,
            fecha_pago: fechaPago,
          };
        }
        return concepto;
      });

      const todosPagados = conceptosConPagos.every(c => c.pagado);
      
      // Calcular el monto pagado basado en el total de la solicitud (que ya tiene descuentos aplicados)
      // Si todos los conceptos están pagados, usar el total de la solicitud exactamente
      // Si solo algunos están pagados, calcular proporcionalmente
      let totalPagado: number;
      if (todosPagados) {
        // Si pagamos todos los conceptos, usar el total exacto de la solicitud
        totalPagado = solicitud!.total;
      } else {
        // Si solo pagamos algunos conceptos, calcular proporción
        const totalConceptos = solicitud!.conceptos_detalle?.reduce((sum, c) => sum + c.importe, 0) || 0;
        const conceptosPagados = conceptosConPagos.filter(c => c.pagado).reduce((sum, c) => sum + c.importe, 0);
        const proporcion = totalConceptos > 0 ? conceptosPagados / totalConceptos : 0;
        totalPagado = solicitud!.total * proporcion;
      }

      // Actualizar solicitud
      const solicitudActualizada: SolicitudPago = {
        ...solicitud,
        conceptos_detalle: conceptosConPagos,
        monto_pagado: totalPagado,
        estatus_pago: todosPagados ? 'PAGADO' : 'PAGADO PARCIALMENTE',
        fecha_pago: todosPagados ? fechaPago : solicitud!.fecha_pago,
        _dirty: true,
      };

      console.log('💾 Guardando solicitud actualizada:', solicitudActualizada);

      await db.solicitudes_pago.put(solicitudActualizada);
      await syncService.forcePush();

      alert(`✅ Pago guardado exitosamente\n\n• Conceptos pagados: ${conceptosSeleccionados.size}\n• Monto: $${totalPagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n• Estatus: ${solicitudActualizada.estatus_pago}`);
      
      if (onSave) onSave();
      setConceptosSeleccionados(new Set());
      onClose();
    } catch (error) {
      console.error('❌ Error guardando pagos:', error);
      alert('❌ Error al guardar los pagos. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const handleGenerarCaratula = async () => {
    if (conceptosSeleccionados.size === 0) {
      alert('⚠️ Selecciona al menos un concepto para generar la carátula');
      return;
    }

    try {
      // Obtener datos relacionales
      const requisicion = await db.requisiciones_pago.get(solicitud!.requisicion_id);
      if (!requisicion) throw new Error('Requisición no encontrada');
      
      const contrato = await db.contratos.get(requisicion.contrato_id);
      const contratista = contrato?.contratista_id ? await db.contratistas.get(contrato.contratista_id) : null;

      // Filtrar solo conceptos seleccionados
      const conceptosSeleccionadosArray = conceptosActualizados.filter(c => 
        conceptosSeleccionados.has(c.concepto_id)
      );

      // Calcular totales
      const resumen = calcularResumen();
      
      // Generar HTML
      const htmlContent = generarHTMLCaratula(
        requisicion,
        contrato,
        contratista,
        solicitud!,
        conceptosSeleccionadosArray,
        resumen
      );

      // Abrir en nueva ventana e imprimir
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    } catch (error) {
      console.error('❌ Error generando carátula:', error);
      alert('❌ Error al generar la carátula. Intenta de nuevo.');
    }
  };

  const generarHTMLCaratula = (
    requisicion: any,
    contrato: any,
    contratista: any,
    solicitud: SolicitudPago,
    conceptos: ConceptoSolicitud[],
    resumen: ReturnType<typeof calcularResumen>
  ): string => {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Carátula de Conceptos Seleccionados - ${solicitud.folio}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: letter; margin: 0.5cm; }
    body { font-family: Arial, sans-serif; font-size: 9px; line-height: 1.3; color: #000; }
    .header { background: #0891b2; color: white; padding: 8px 15px; margin-bottom: 10px; }
    .header h1 { font-size: 16px; font-weight: 700; margin-bottom: 2px; }
    .header .subtitle { font-size: 8px; }
    .section { margin-bottom: 12px; page-break-inside: avoid; }
    .section-title { font-size: 11px; font-weight: 700; color: #0891b2; text-transform: uppercase; margin-bottom: 6px; padding-bottom: 3px; border-bottom: 1.5px solid #0891b2; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px; }
    .info-item { padding: 4px 0; }
    .info-label { font-size: 7px; color: #666; text-transform: uppercase; font-weight: 600; margin-bottom: 2px; }
    .info-value { font-size: 9px; font-weight: 600; color: #000; }
    .financial-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 8px; }
    .financial-card { background: #f8fafc; padding: 6px 8px; border-radius: 4px; text-align: center; border: 1px solid #e2e8f0; }
    .financial-card.highlight { background: #0891b2; color: white; border-color: #0891b2; }
    .financial-label { font-size: 7px; text-transform: uppercase; margin-bottom: 3px; font-weight: 600; }
    .financial-amount { font-size: 11px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 7.5px; }
    thead { background: #f1f5f9; }
    th { padding: 4px 3px; text-align: left; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 7px; border-bottom: 1px solid #cbd5e1; }
    td { padding: 3px 3px; border-bottom: 1px solid #e2e8f0; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .total-row { background: #f8fafc; font-weight: 700; font-size: 8px; }
    .total-row td { padding: 4px 3px; border-top: 1.5px solid #cbd5e1; border-bottom: 1.5px solid #cbd5e1; }
    .footer { margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 6.5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CARÁTULA DE CONCEPTOS - ${solicitud.folio}</h1>
      <div class="subtitle">Generado: ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
    </div>

    <div class="section">
      <h2 class="section-title">Información General</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Contrato</div>
          <div class="info-value">${contrato?.numero_contrato || contrato?.nombre || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Contratista</div>
          <div class="info-value">${contratista?.nombre || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Requisición</div>
          <div class="info-value">${requisicion?.numero || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Conceptos Selec.</div>
          <div class="info-value">${conceptos.length}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Resumen Financiero</h2>
      <div class="financial-summary">
        <div class="financial-card">
          <div class="financial-label">Importe Bruto</div>
          <div class="financial-amount">$${resumen.totalImporte.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="financial-card">
          <div class="financial-label">(-) Retenciones</div>
          <div class="financial-amount" style="color: #ef4444;">$${resumen.totalRetenciones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="financial-card">
          <div class="financial-label">(-) Anticipo</div>
          <div class="financial-amount" style="color: #f59e0b;">$${resumen.totalAmortizaciones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="financial-card highlight">
          <div class="financial-label">Total a Pagar</div>
          <div class="financial-amount">$${resumen.totalAPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Detalle de Conceptos</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 10%;">Clave</th>
            <th style="width: 35%;">Descripción</th>
            <th class="text-center" style="width: 8%;">Cant.</th>
            <th class="text-right" style="width: 12%;">P.U.</th>
            <th class="text-right" style="width: 12%;">Importe</th>
            <th class="text-right" style="width: 10%;">Retención</th>
            <th class="text-right" style="width: 10%;">Anticipo</th>
            <th class="text-right" style="width: 13%;">Neto</th>
          </tr>
        </thead>
        <tbody>
          ${conceptos.map(c => {
            const retencion = (retencionPorcentaje[c.concepto_id] || 0) / 100 * c.importe;
            const amortizacion = (amortizacionPorcentaje[c.concepto_id] || 0) / 100 * c.importe;
            const neto = c.importe - retencion - amortizacion;
            
            return `
            <tr>
              <td style="font-weight: 700;">${c.concepto_clave}</td>
              <td style="font-size: 7px;">${c.concepto_descripcion.length > 80 ? c.concepto_descripcion.substring(0, 80) + '...' : c.concepto_descripcion}</td>
              <td class="text-center">${c.cantidad}</td>
              <td class="text-right">$${c.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              <td class="text-right">$${c.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              <td class="text-right">$${retencion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              <td class="text-right">$${amortizacion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              <td class="text-right" style="font-weight: 700;">$${neto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
            </tr>
            `;
          }).join('')}
          <tr class="total-row">
            <td colspan="4" class="text-right">TOTALES:</td>
            <td class="text-right">$${resumen.totalImporte.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
            <td class="text-right">$${resumen.totalRetenciones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
            <td class="text-right">$${resumen.totalAmortizaciones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
            <td class="text-right">$${resumen.totalAPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>Documento generado automáticamente por Sistema de Administración de Obra</p>
      <p>Este documento es válido sin firma electrónica</p>
    </div>
  </div>
</body>
</html>`;
  };

  const conceptosSeleccionables = conceptosActualizados.filter(c => !c.pagado);
  const allSelected = conceptosSeleccionados.size === conceptosSeleccionables.length && conceptosSeleccionables.length > 0;
  const someSelected = conceptosSeleccionados.size > 0 && !allSelected;
  
  const resumen = calcularResumen();

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xl" 
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '80vh',
          maxHeight: '90vh',
        }
      }}
    >
      <DialogTitle
        sx={{ bgcolor: '#334155', color: 'white' }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Desglose de la Solicitud {solicitud.folio}
            </Typography>
            {(retencionContrato > 0 || amortizacionContrato > 0) && (
              <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mt: 0.5 }}>
                📋 Contrato: Retención {retencionContrato.toFixed(2)}% | Anticipo {amortizacionContrato.toFixed(2)}%
              </Typography>
            )}
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(80vh - 200px)' }}>
          <Table stickyHeader size="small">
            <TableHead sx={{ '& th': { bgcolor: '#334155', color: '#fff', fontWeight: 600, py: 0.5, px: 1, fontSize: '0.75rem' } }}>
              <TableRow>
                {!readOnly && (
                  <TableCell padding="checkbox" sx={{ width: 40 }}>
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={handleToggleAll}
                      size="small"
                    />
                  </TableCell>
                )}
                <TableCell sx={{ width: 80 }}>Clave</TableCell>
                <TableCell sx={{ minWidth: 200, maxWidth: 300 }}>Descripción</TableCell>
                <TableCell align="right" sx={{ width: 60 }}>Cant.</TableCell>
                <TableCell align="right" sx={{ width: 80 }}>P.U.</TableCell>
                <TableCell align="right" sx={{ width: 100 }}>Importe</TableCell>
                {!readOnly && (
                  <>
                    <TableCell align="center" sx={{ width: 70 }}>Ret %</TableCell>
                    <TableCell align="right" sx={{ width: 90 }}>$ Ret</TableCell>
                    <TableCell align="center" sx={{ width: 70 }}>Ant %</TableCell>
                    <TableCell align="right" sx={{ width: 90 }}>$ Ant</TableCell>
                    <TableCell align="right" sx={{ bgcolor: '#334155', width: 100 }}>Total</TableCell>
                  </>
                )}
                <TableCell align="center" sx={{ width: 50 }}>Pag</TableCell>
                <TableCell align="right" sx={{ width: 100 }}>Monto</TableCell>
                <TableCell sx={{ width: 85 }}>Fecha</TableCell>
                <TableCell sx={{ width: 110 }}>Comprob.</TableCell>
                <TableCell sx={{ width: 80 }}>Resp.</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {conceptosActualizados.map((concepto) => {
                const tieneComprobante = !!concepto.comprobante_url;
                const yaPagado = !!concepto.pagado;
                const estaSeleccionado = conceptosSeleccionados.has(concepto.concepto_id);
                const retencion = (concepto.importe * (retencionPorcentaje[concepto.concepto_id] || 0)) / 100;
                const amortizacion = (concepto.importe * (amortizacionPorcentaje[concepto.concepto_id] || 0)) / 100;
                const totalAPagarConcepto = concepto.importe - retencion - amortizacion;
                
                return (
                <TableRow 
                  key={concepto.concepto_id} 
                  hover 
                  sx={{ 
                    bgcolor: yaPagado ? 'rgba(76, 175, 80, 0.05)' : estaSeleccionado ? 'rgba(59, 130, 246, 0.05)' : 'inherit',
                    borderLeft: estaSeleccionado ? '3px solid #3b82f6' : 'none'
                  }}
                >
                  {!readOnly && (
                    <TableCell padding="checkbox" sx={{ py: 0.5, px: 1 }}>
                      <Tooltip title={yaPagado ? 'Ya está pagado' : 'Seleccionar para pagar'}>
                        <span>
                          <Checkbox
                            checked={estaSeleccionado}
                            onChange={() => handleToggleConcepto(concepto.concepto_id)}
                            disabled={yaPagado}
                            size="small"
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
                  )}
                  <TableCell sx={{ py: 0.5, px: 1 }}>
                    <Typography variant="body2" fontWeight={600} fontSize="0.8rem">
                      {concepto.concepto_clave}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 0.5, px: 1 }}>
                    <Tooltip title={concepto.concepto_descripcion} arrow>
                      <Typography variant="body2" fontSize="0.8rem" sx={{ 
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.3,
                        cursor: 'help'
                      }}>
                        {concepto.concepto_descripcion}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5, px: 1 }}>
                    <Typography variant="body2" fontSize="0.8rem">
                      {concepto.cantidad}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5, px: 1 }}>
                    <Typography variant="body2" fontSize="0.8rem">
                      ${concepto.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5, px: 1 }}>
                    <Typography variant="body2" fontWeight={700} color="success.dark" fontSize="0.85rem">
                      ${concepto.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </Typography>
                  </TableCell>
                  {!readOnly && (
                    <>
                      <TableCell align="center" sx={{ py: 0.5, px: 0.5 }}>
                        <Typography variant="body2" fontSize="0.8rem" fontWeight={600}>
                          {(retencionPorcentaje[concepto.concepto_id] || 0).toFixed(2)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.5, px: 1 }}>
                        <Typography variant="body2" color="error.main" fontWeight={600} fontSize="0.8rem">
                          ${retencion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5, px: 0.5 }}>
                        <Typography variant="body2" fontSize="0.8rem" fontWeight={600}>
                          {(amortizacionPorcentaje[concepto.concepto_id] || 0).toFixed(2)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.5, px: 1 }}>
                        <Typography variant="body2" color="warning.main" fontWeight={600} fontSize="0.8rem">
                          ${amortizacion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ bgcolor: 'rgba(30, 64, 175, 0.08)', py: 0.5, px: 1 }}>
                        <Typography variant="body2" fontWeight={700} color="primary.main" fontSize="0.85rem">
                          ${totalAPagarConcepto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                    </>
                  )}
                  <TableCell align="center" sx={{ py: 0.5, px: 0.5 }}>
                    {concepto.pagado ? (
                      <Typography variant="caption" color="success.main" fontWeight={600} fontSize="0.7rem">✓</Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary" fontSize="0.7rem">—</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5, px: 1 }}>
                    <Typography variant="body2" fontSize="0.8rem">
                      {concepto.monto_pagado 
                        ? `$${concepto.monto_pagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                        : '—'
                      }
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 0.5, px: 1 }}>
                    <Typography variant="body2" fontSize="0.75rem">
                      {concepto.fecha_pago 
                        ? new Date(concepto.fecha_pago).toLocaleDateString('es-MX', { year: '2-digit', month: '2-digit', day: '2-digit' })
                        : '—'
                      }
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 0.5, px: 1 }}>
                    {(() => {
                      // Si ya hay comprobante, mostrar link para ver
                      if (concepto.comprobante_url) {
                        return (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <a 
                              href={concepto.comprobante_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ textDecoration: 'none' }}
                            >
                              <Button size="small" startIcon={<FileIcon />} variant="outlined" sx={{ fontSize: '0.7rem', py: 0.25, px: 0.75 }}>
                                Ver
                              </Button>
                            </a>
                          </Stack>
                        );
                      }
                      
                      // Si es readOnly, no mostrar nada
                      if (readOnly) {
                        return <Typography variant="body2" color="text.secondary">—</Typography>;
                      }
                      
                      // Si ya está pagado, no permitir subir
                      if (yaPagado) {
                        return <Typography variant="body2" color="text.secondary">—</Typography>;
                      }
                      
                      // Solo permitir subir si el concepto está seleccionado (checked)
                      if (!estaSeleccionado) {
                        return (
                          <Tooltip title="✓ Selecciona primero el concepto">
                            <span>
                              <Button
                                size="small"
                                variant="outlined"
                                disabled
                                sx={{ color: 'text.disabled', fontSize: '0.7rem', py: 0.25, px: 0.75 }}
                              >
                                Subir
                              </Button>
                            </span>
                          </Tooltip>
                        );
                      }
                      
                      // Concepto seleccionado - puede subir archivo
                      return (
                        <SimpleFileUpload
                          onUploadComplete={(url) => handleFileUpload(concepto.concepto_id, url)}
                          accept={['application/pdf', 'image/*']}
                          uploadType="document"
                          compact
                        />
                      );
                    })()}
                  </TableCell>
                  <TableCell sx={{ py: 0.5, px: 1 }}>
                    {concepto.respaldo_documental ? (
                      <a 
                        href={concepto.respaldo_documental} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none' }}
                      >
                        <Button size="small" startIcon={<FileIcon />} variant="text" sx={{ fontSize: '0.7rem', py: 0.25, px: 0.5 }}>
                          Ver
                        </Button>
                      </a>
                    ) : (
                      <Typography variant="caption" color="text.secondary" fontSize="0.7rem">—</Typography>
                    )}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Sección de Deducciones Extra */}
        {solicitud && solicitud.deducciones_extra && solicitud.deducciones_extra.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, color: '#dc2626' }}>
              ⚠️ Deducciones Extra
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ '& th': { bgcolor: '#dc2626', color: '#fff', fontWeight: 600, py: 0.5, px: 1 } }}>
                  <TableRow>
                    <TableCell>Descripción</TableCell>
                    <TableCell align="right" sx={{ width: 120 }}>Monto</TableCell>
                    <TableCell sx={{ width: 150 }}>Observaciones</TableCell>
                    <TableCell align="center" sx={{ width: 60 }}>Pagado</TableCell>
                    <TableCell sx={{ width: 90 }}>Fecha</TableCell>
                    <TableCell sx={{ width: 110 }}>Comprobante</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {solicitud.deducciones_extra.map((deduccion) => (
                    <TableRow key={deduccion.deduccion_id} sx={{ bgcolor: 'rgba(220, 38, 38, 0.05)' }}>
                      <TableCell sx={{ py: 0.5, px: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {deduccion.descripcion}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.5, px: 1 }}>
                        <Typography variant="body2" fontWeight={700} color="error.main">
                          -${deduccion.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.5, px: 1 }}>
                        <Typography variant="body2" fontSize="0.75rem" color="text.secondary">
                          {deduccion.observaciones || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.5, px: 0.5 }}>
                        {deduccion.pagado ? (
                          <Typography variant="caption" color="success.main" fontWeight={600}>✓</Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 0.5, px: 1 }}>
                        <Typography variant="body2" fontSize="0.75rem">
                          {deduccion.fecha_pago 
                            ? new Date(deduccion.fecha_pago).toLocaleDateString('es-MX', { year: '2-digit', month: '2-digit', day: '2-digit' })
                            : '—'
                          }
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.5, px: 1 }}>
                        {deduccion.comprobante_url ? (
                          <a 
                            href={deduccion.comprobante_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none' }}
                          >
                            <Button size="small" startIcon={<FileIcon />} variant="outlined" sx={{ fontSize: '0.7rem', py: 0.25, px: 0.75 }}>
                              Ver
                            </Button>
                          </a>
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: 'rgba(220, 38, 38, 0.1)' }}>
                    <TableCell sx={{ fontWeight: 700, py: 0.8 }}>
                      TOTAL DEDUCCIONES EXTRA:
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.8 }}>
                      <Typography variant="body1" fontWeight={800} color="error.main">
                        -${solicitud.deducciones_extra.reduce((sum, d) => sum + d.monto, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                    <TableCell colSpan={4}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>

      {/* Panel de Resumen */}
      {!readOnly && conceptosSeleccionados.size > 0 && (
        <Box sx={{ 
          p: 3, 
          bgcolor: 'rgba(59, 130, 246, 0.05)', 
          borderTop: '2px solid #3b82f6',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <Typography variant="h6" fontWeight={700} color="primary" gutterBottom>
            📋 Resumen de Pago
          </Typography>
          
          <Stack direction="row" spacing={4} flexWrap="wrap">
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Conceptos Seleccionados
              </Typography>
              <Typography variant="h5" fontWeight={700} color="primary.main">
                {resumen.cantidadConceptos}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Importe Total
              </Typography>
              <Typography variant="h5" fontWeight={700} color="success.dark">
                ${resumen.totalImporte.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                (-) Retenciones
              </Typography>
              <Typography variant="h5" fontWeight={700} color="error.main">
                ${resumen.totalRetenciones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                (-) Anticipo
              </Typography>
              <Typography variant="h5" fontWeight={700} color="warning.main">
                ${resumen.totalAmortizaciones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
            
            <Box sx={{ 
              bgcolor: 'white', 
              p: 2, 
              borderRadius: 2, 
              border: '2px solid #3b82f6',
              minWidth: 200
            }}>
              <Typography variant="caption" color="text.secondary" display="block">
                💰 TOTAL A PAGAR
              </Typography>
              <Typography variant="h4" fontWeight={800} color="primary.main">
                ${resumen.totalAPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Stack>
        </Box>
      )}

      <DialogActions sx={{ p: 2, gap: 1 }}>
        {!readOnly && (
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1, ml: 1 }}>
            {conceptosSeleccionados.size} concepto(s) seleccionado(s)
          </Typography>
        )}
        {conceptosSeleccionados.size > 0 && (
          <Button 
            onClick={handleGenerarCaratula} 
            variant="outlined" 
            startIcon={<PdfIcon />}
            color="primary"
          >
            Carátula PDF
          </Button>
        )}
        <Button onClick={onClose} color="inherit">
          {readOnly ? 'Cerrar' : 'Cancelar'}
        </Button>
        {!readOnly && (() => {
          // Validar que todos los seleccionados tengan comprobante
          const conceptosSinComprobante = conceptosActualizados.filter(
            c => conceptosSeleccionados.has(c.concepto_id) && !c.comprobante_url
          );
          const tieneSeleccionados = conceptosSeleccionados.size > 0;
          const todosTienenComprobante = conceptosSinComprobante.length === 0;
          const puedeGuardar = tieneSeleccionados && todosTienenComprobante && !guardando;
          
          return (
            <Button 
              onClick={handleGuardarPagos} 
              variant="contained" 
              color="success"
              disabled={!puedeGuardar}
            >
              {guardando ? 'Guardando...' : !tieneSeleccionados ? 'Guardar pagos seleccionados' : !todosTienenComprobante ? `⚠️ ${conceptosSinComprobante.length} sin comprobante` : 'Guardar pagos seleccionados'}
            </Button>
          );
        })()}
      </DialogActions>
    </Dialog>
  );
};
