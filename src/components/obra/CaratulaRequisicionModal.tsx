import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Print as PrintIcon,
  PictureAsPdf as PdfIcon,
  AttachFile as FileIcon,
} from '@mui/icons-material';
import { RequisicionPago } from '@/types/requisicion-pago';
import { SolicitudPago } from '@/types/solicitud-pago';
import { Contrato } from '@/types/contrato';
import { Contratista } from '@/types/contratista';
import { PagoRealizado } from '@/types/pago-realizado';
import { db } from '@/db/database';
import { getPagosByRequisicion } from '@/lib/services/pagoRealizadoService';

interface CaratulaRequisicionModalProps {
  open: boolean;
  onClose: () => void;
  requisicion: RequisicionPago | null;
}

export const CaratulaRequisicionModal: React.FC<CaratulaRequisicionModalProps> = ({
  open,
  onClose,
  requisicion,
}) => {
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [contratista, setContratista] = useState<Contratista | null>(null);
  const [solicitud, setSolicitud] = useState<SolicitudPago | null>(null);
  const [pagosRealizados, setPagosRealizados] = useState<PagoRealizado[]>([]);
  const [loading, setLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (requisicion && open) {
      cargarDatos();
    }
  }, [requisicion, open]);

  // 🆕 Estados para información del estado de cuenta del contrato
  const [estadoCuentaContrato, setEstadoCuentaContrato] = useState<{
    montoContratoBase: number;
    montoExtras: number;
    montoAditivas: number;
    montoDeductivas: number;
    montoContratoTotal: number;
    anticipoMonto: number;
    totalAmortizado: number;
    saldoPorAmortizar: number;
    totalRetenido: number;
    totalDeduccionesExtra: number;
    totalPagadoNeto: number;
    montoBrutoPagado: number;
    saldoPorEjercer: number;
    saldoPorPagar: number;
    porcentajeAnticipo: number;
    porcentajeRetencion: number;
  } | null>(null);

  const cargarDatos = async () => {
    if (!requisicion) return;
    
    setLoading(true);
    try {
      // Cargar contrato
      const contratoData = await db.contratos.get(requisicion.contrato_id);
      console.log('📋 Contrato cargado:', contratoData);
      setContrato(contratoData || null);

      // Cargar contratista
      if (contratoData?.contratista_id) {
        console.log('🔍 Buscando contratista con ID:', contratoData.contratista_id);
        
        // Primero intentar desde IndexedDB
        let contratistaData = await db.contratistas.get(contratoData.contratista_id);
        
        // Si no está en IndexedDB, cargar desde Supabase
        if (!contratistaData) {
          console.log('⚠️ Contratista no encontrado en IndexedDB, cargando desde Supabase...');
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY
          );
          
          const { data, error } = await supabase
            .from('contratistas')
            .select('*')
            .eq('id', contratoData.contratista_id)
            .single();
          
          if (data && !error) {
            contratistaData = data;
            // Guardar en IndexedDB para futuras consultas
            await db.contratistas.put(data);
            console.log('✅ Contratista cargado desde Supabase y guardado en IndexedDB');
          }
        }
        
        console.log('👤 Contratista encontrado:', contratistaData);
        setContratista(contratistaData || null);
      } else {
        console.log('❌ No se encontró el contrato o no tiene contratista_id');
      }

      // Cargar solicitud relacionada
      const solicitudes = await db.solicitudes_pago.toArray();
      const solicitudRelacionada = solicitudes.find(
        s => s.requisicion_id.toString() === requisicion.id?.toString()
      );
      setSolicitud(solicitudRelacionada || null);

      // Cargar pagos realizados
      if (requisicion.id) {
        const pagos = await getPagosByRequisicion(requisicion.id);
        setPagosRealizados(pagos);
      }

      // 🆕 Calcular estado de cuenta del contrato
      if (contratoData) {
        await calcularEstadoCuentaContrato(contratoData);
      }
    } catch (error) {
      console.error('Error cargando datos de la carátula:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🆕 Función para calcular el estado de cuenta del contrato
  const calcularEstadoCuentaContrato = async (contratoData: Contrato) => {
    try {
      // 1. ✅ USAR MONTO CONTRATO ORIGINAL (igual que Estado de Cuenta)
      const montoContratoBase = contratoData.monto_contrato || 0;

      // 2. Obtener cambios de contrato aplicados
      const cambiosContrato = await db.cambios_contrato
        .where('contrato_id')
        .equals(contratoData.id)
        .and(c => c.active === true && c.estatus === 'APLICADO')
        .toArray();

      // 3. Calcular totales de cambios por tipo
      const montoExtras = cambiosContrato
        .filter(c => c.tipo_cambio === 'EXTRA')
        .reduce((sum, c) => sum + (c.monto_cambio || 0), 0);
      
      const montoAditivas = cambiosContrato
        .filter(c => c.tipo_cambio === 'ADITIVA')
        .reduce((sum, c) => sum + (c.monto_cambio || 0), 0);
      
      const montoDeductivas = cambiosContrato
        .filter(c => c.tipo_cambio === 'DEDUCTIVA')
        .reduce((sum, c) => sum + Math.abs(c.monto_cambio || 0), 0);

      // 4. ✅ Calcular monto total del contrato (igual que Estado de Cuenta)
      const montoContratoTotal = montoContratoBase + montoExtras + montoAditivas - montoDeductivas;

      // 5. Obtener todas las requisiciones del contrato
      const requisiciones = await db.requisiciones_pago
        .where('contrato_id')
        .equals(contratoData.id)
        .toArray();

      const solicitudesDelContrato = await db.solicitudes_pago.toArray().then(sols => 
        sols.filter(s => requisiciones.some(r => r.id === s.requisicion_id))
      );

      // 6. ✅ Calcular totales de TODAS las requisiciones (igual que Estado de Cuenta)
      const totalAmortizado = requisiciones.reduce((sum, r) => sum + (r.amortizacion || 0), 0);
      const totalRetenido = requisiciones.reduce((sum, r) => sum + (r.retencion || 0), 0);
      
      // 7. Deducciones extra desde solicitudes
      const totalDeduccionesExtra = solicitudesDelContrato.reduce((sum, sol) => {
        const deducciones = (sol.deducciones_extra || []).reduce((s: number, d: any) => s + (d.monto || 0), 0);
        return sum + deducciones;
      }, 0);

      // 8. Total pagado (neto) - solo solicitudes PAGADAS
      const totalPagadoNeto = solicitudesDelContrato
        .filter(s => s.estatus_pago === 'PAGADO' || (s.monto_pagado && s.monto_pagado > 0))
        .reduce((sum, s) => sum + (s.monto_pagado || 0), 0);

      // 9. Monto bruto pagado (TODAS LAS REQUISICIONES - igual que Estado de Cuenta)
      const montoBrutoPagado = requisiciones.reduce((sum, r) => sum + (r.subtotal || 0), 0);

      // 10. Calcular saldos y porcentajes
      const anticipoMonto = contratoData.anticipo_monto || 0;
      const saldoPorAmortizar = Math.max(0, anticipoMonto - totalAmortizado);
      const saldoPorEjercer = montoContratoTotal - montoBrutoPagado;
      
      // 11. Saldo por Pagar = Saldo por Ejercer - Saldo por Amortizar
      const saldoPorPagar = saldoPorEjercer - saldoPorAmortizar;
      
      const porcentajeAnticipo = montoContratoTotal > 0 ? (anticipoMonto / montoContratoTotal) * 100 : 0;
      const porcentajeRetencion = contratoData.retencion_porcentaje || 0;

      setEstadoCuentaContrato({
        montoContratoBase,
        montoExtras,
        montoAditivas,
        montoDeductivas,
        montoContratoTotal,
        anticipoMonto,
        totalAmortizado,
        saldoPorAmortizar,
        totalRetenido,
        totalDeduccionesExtra,
        totalPagadoNeto,
        montoBrutoPagado,
        saldoPorEjercer,
        saldoPorPagar,
        porcentajeAnticipo,
        porcentajeRetencion,
      });

      console.log('📊 Estado de cuenta del contrato calculado:', {
        montoContratoBase,
        montoExtras,
        montoContratoTotal,
        anticipoMonto,
        totalAmortizado,
        saldoPorAmortizar,
        totalPagadoNeto,
        saldoPorEjercer,
      });
    } catch (error) {
      console.error('Error calculando estado de cuenta del contrato:', error);
      setEstadoCuentaContrato(null);
    }
  };

  const generarHTMLCaratula = (): string => {
    if (!requisicion) return '';

    // Calcular totales desde la requisición (lo que se solicita pagar)
    const importeBrutoRequisicion = requisicion.conceptos.reduce((sum, c) => sum + c.importe, 0);
    const retencionesRequisicion = requisicion.retencion || 0;
    const anticipoRequisicion = requisicion.amortizacion || 0;
    const totalRequisicion = requisicion.total;
    
    // Calcular lo que realmente se ha pagado (desde solicitud.monto_pagado)
    const totalPagado = solicitud?.monto_pagado || 0;
    const montoPendiente = totalRequisicion - totalPagado;
    const estatusPago = totalPagado >= totalRequisicion ? 'PAGADO TOTAL' : totalPagado > 0 ? 'PAGADO PARCIAL' : 'PENDIENTE';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Carátula de Pago - Requisición ${requisicion.numero}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: letter;
      margin: 0.5cm;
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 9px;
      line-height: 1.3;
      color: #000;
      background: white;
    }
    
    .container {
      width: 100%;
      max-width: 100%;
    }
    
    .header {
      background: #0891b2;
      color: white;
      padding: 8px 15px;
      margin-bottom: 10px;
    }
    
    .header h1 {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 2px;
    }
    
    .header .subtitle {
      font-size: 8px;
    }
    
    .section {
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 11px;
      font-weight: 700;
      color: #0891b2;
      text-transform: uppercase;
      margin-bottom: 6px;
      padding-bottom: 3px;
      border-bottom: 1.5px solid #0891b2;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 8px;
      margin-bottom: 8px;
    }
    
    .info-item {
      padding: 4px 0;
    }
    
    .info-label {
      font-size: 7px;
      color: #666;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 2px;
    }
    
    .info-value {
      font-size: 9px;
      font-weight: 600;
      color: #000;
    }
    
    .financial-summary {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 6px;
      margin-bottom: 8px;
    }
    
    .financial-card {
      background: #f8fafc;
      padding: 6px 8px;
      border-radius: 4px;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    
    .financial-card.highlight {
      background: #0891b2;
      color: white;
      border-color: #0891b2;
    }
    
    .financial-label {
      font-size: 7px;
      text-transform: uppercase;
      margin-bottom: 3px;
      font-weight: 600;
      line-height: 1.2;
    }
    
    .financial-card.highlight .financial-label {
      color: white;
    }
    
    .financial-amount {
      font-size: 11px;
      font-weight: 700;
      line-height: 1.2;
    }
    
    .financial-card.success .financial-amount {
      color: #10b981;
    }
    
    .financial-card.error .financial-amount {
      color: #ef4444;
    }
    
    .financial-card.warning .financial-amount {
      color: #f59e0b;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 7.5px;
    }
    
    thead {
      background: #f1f5f9;
    }
    
    th {
      padding: 4px 3px;
      text-align: left;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      font-size: 7px;
      border-bottom: 1px solid #cbd5e1;
      line-height: 1.2;
    }
    
    td {
      padding: 3px 3px;
      border-bottom: 1px solid #e2e8f0;
      line-height: 1.3;
    }
    
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
    }
    
    .font-bold {
      font-weight: 700;
    }
    
    .total-row {
      background: #f8fafc;
      font-weight: 700;
      font-size: 8px;
    }
    
    .total-row td {
      padding: 4px 3px;
      border-top: 1.5px solid #cbd5e1;
      border-bottom: 1.5px solid #cbd5e1;
    }
    
    .document-list {
      list-style: none;
      padding: 0;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    
    .document-item {
      display: flex;
      align-items: center;
      padding: 4px 6px;
      background: #f8fafc;
      border-radius: 3px;
      border: 1px solid #e2e8f0;
      font-size: 7px;
    }
    
    .document-icon {
      width: 20px;
      height: 20px;
      background: #0891b2;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      margin-right: 6px;
      font-size: 10px;
      flex-shrink: 0;
    }
    
    .document-info {
      flex: 1;
      min-width: 0;
    }
    
    .document-name {
      font-weight: 600;
      font-size: 7.5px;
      margin-bottom: 1px;
    }
    
    .document-link {
      font-size: 6.5px;
      color: #0891b2;
      text-decoration: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
    }
    
    .footer {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 6.5px;
    }
    
    @media print {
      @page {
        size: letter;
        margin: 0.5cm;
      }
      
      body {
        background: white;
        padding: 0;
      }
      
      .section {
        page-break-inside: avoid;
      }
      
      table {
        page-break-inside: auto;
      }
      
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>CARÁTULA DE PAGO - REQUISICIÓN ${requisicion.numero}</h1>
      <div class="subtitle">
        Generado: ${new Date().toLocaleDateString('es-MX', { 
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
    </div>

    <!-- Información General -->
    <div class="section">
      <h2 class="section-title">Información General</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Clave Contrato</div>
          <div class="info-value">${contrato?.clave_contrato || contrato?.numero_contrato || contrato?.nombre || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Contratista</div>
          <div class="info-value">${contratista?.nombre || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Fecha Requisición</div>
          <div class="info-value">${new Date(requisicion.fecha).toLocaleDateString('es-MX')}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Folio Solicitud</div>
          <div class="info-value">${solicitud?.folio || 'Sin solicitud'}</div>
        </div>
      </div>
    </div>

    <!-- Resumen Financiero de la Requisición -->
    <div class="section">
      <h2 class="section-title">Resumen Financiero de la Requisición</h2>
      <div class="financial-summary">
        <div class="financial-card success">
          <div class="financial-label">Importe Bruto</div>
          <div class="financial-amount">$${importeBrutoRequisicion.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div class="financial-card error">
          <div class="financial-label">(-) Retenc.</div>
          <div class="financial-amount">$${retencionesRequisicion.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div class="financial-card warning">
          <div class="financial-label">(-) Anticipo</div>
          <div class="financial-amount">$${anticipoRequisicion.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div class="financial-card highlight">
          <div class="financial-label">Total Pagado</div>
          <div class="financial-amount">$${totalPagado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div class="financial-card">
          <div class="financial-label">M. Pendiente</div>
          <div class="financial-amount">$${montoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div class="financial-card">
          <div class="financial-label">Estatus</div>
          <div class="financial-amount" style="color: ${
            estatusPago === 'PAGADO TOTAL' ? '#10b981' : 
            estatusPago === 'PAGADO PARCIAL' ? '#f59e0b' : 
            '#ef4444'
          }">${estatusPago}</div>
        </div>
      </div>
    </div>

    ${estadoCuentaContrato ? `
    <!-- Estado de Cuenta del Contrato -->
    <div class="section" style="background: #f8fafc; padding: 10px; border-radius: 4px; border: 1px solid #cbd5e1;">
      <h2 class="section-title" style="background: #1e293b; color: white; padding: 6px 8px; border-radius: 3px; margin-bottom: 10px;">
        📊 Estado de Cuenta del Contrato
      </h2>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px;">
        <!-- Columna 1: Montos del Contrato -->
        <div>
          <div style="font-size: 8px; font-weight: 700; color: #334155; margin-bottom: 6px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; padding-bottom: 3px;">
            Monto del Contrato
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 7px; padding: 3px 0;">
            <span style="font-weight: 600;">CONTRATADO:</span>
            <span style="font-weight: 700; color: #0891b2;">$${estadoCuentaContrato.montoContratoBase.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 7px; padding: 3px 0;">
            <span style="font-weight: 600;">EXTRAORDINARIOS:</span>
            <span style="font-weight: 700; color: #0891b2;">$${estadoCuentaContrato.montoExtras.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 7px; padding: 3px 0;">
            <span style="font-weight: 600;">ADITIVAS:</span>
            <span style="font-weight: 700; color: #10b981;">$${estadoCuentaContrato.montoAditivas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 7px; padding: 3px 0;">
            <span style="font-weight: 600;">DEDUCTIVAS:</span>
            <span style="font-weight: 700; color: #ef4444;">$${estadoCuentaContrato.montoDeductivas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 8px; padding: 4px 0; border-top: 2px solid #64748b; margin-top: 3px;">
            <span style="font-weight: 700;">IMPORTE TOTAL:</span>
            <span style="font-weight: 700; color: #1e293b;">$${estadoCuentaContrato.montoContratoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <!-- Columna 2: Retenciones y Deducciones -->
        <div>
          <div style="font-size: 8px; font-weight: 700; color: #334155; margin-bottom: 6px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; padding-bottom: 3px;">
            Retenciones y Deducciones
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 7px; padding: 3px 0;">
            <span style="font-weight: 600;">RETENCIÓN (Fondo):</span>
            <span style="font-weight: 700; color: #ef4444;">$${estadoCuentaContrato.totalRetenido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 7px; padding: 3px 0;">
            <span style="font-weight: 600;">% RETENCIÓN:</span>
            <span style="font-weight: 700;">${estadoCuentaContrato.porcentajeRetencion.toFixed(1)}%</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 7px; padding: 3px 0;">
            <span style="font-weight: 600;">DEDUCCIONES EXTRA:</span>
            <span style="font-weight: 700; color: #ef4444;">$${estadoCuentaContrato.totalDeduccionesExtra.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 8px; padding: 4px 0; border-top: 2px solid #64748b; margin-top: 3px;">
            <span style="font-weight: 700;">TOTAL DESCUENTOS:</span>
            <span style="font-weight: 700; color: #ef4444;">$${(estadoCuentaContrato.totalRetenido + estadoCuentaContrato.totalDeduccionesExtra).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <!-- Columna 3: Anticipo y Amortización -->
        <div>
          <div style="font-size: 8px; font-weight: 700; color: #334155; margin-bottom: 6px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; padding-bottom: 3px;">
            Anticipo y Amortización
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 7px; padding: 3px 0;">
            <span style="font-weight: 600;">ANTICIPO:</span>
            <span style="font-weight: 700; color: #0891b2;">$${estadoCuentaContrato.anticipoMonto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 7px; padding: 3px 0;">
            <span style="font-weight: 600;">% ANTICIPO:</span>
            <span style="font-weight: 700;">${estadoCuentaContrato.porcentajeAnticipo.toFixed(2)}%</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 7px; padding: 3px 0;">
            <span style="font-weight: 600;">AMORTIZACIÓN:</span>
            <span style="font-weight: 700; color: #f59e0b;">$${estadoCuentaContrato.totalAmortizado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 7px; padding: 3px 0;">
            <span style="font-weight: 600;">SALDO POR AMORTIZAR:</span>
            <span style="font-weight: 700; color: #f59e0b;">$${estadoCuentaContrato.saldoPorAmortizar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <!-- Columna 4: Totales de Pago -->
        <div>
          <div style="font-size: 8px; font-weight: 700; color: #334155; margin-bottom: 6px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; padding-bottom: 3px;">
            Totales de Pago
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 7px; padding: 3px 0;">
            <span style="font-weight: 600;">TOTAL PAGADO:</span>
            <span style="font-weight: 700; color: #10b981;">$${estadoCuentaContrato.totalPagadoNeto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 7px; padding: 3px 0;">
            <span style="font-weight: 600;">TOTAL AMORTIZADO:</span>
            <span style="font-weight: 700; color: #f59e0b;">$${estadoCuentaContrato.totalAmortizado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 7px; padding: 3px 0;">
            <span style="font-weight: 600;">TOTAL RETENIDO:</span>
            <span style="font-weight: 700; color: #ef4444;">$${estadoCuentaContrato.totalRetenido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 8px; padding: 4px 0; border-top: 2px solid #64748b; margin-top: 3px;">
            <span style="font-weight: 700;">SALDO POR EJERCER:</span>
            <span style="font-weight: 700; color: #f59e0b;">$${estadoCuentaContrato.saldoPorEjercer.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 8px; padding: 4px 0; background: #dbeafe; padding: 4px 6px; border-radius: 3px; margin-top: 3px;">
            <span style="font-weight: 700;">SALDO POR PAGAR:</span>
            <span style="font-weight: 700; color: #1e40af;">$${estadoCuentaContrato.saldoPorPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>
    ` : ''}



    <!-- Conceptos Requisitados -->
    ${requisicion.conceptos && requisicion.conceptos.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Conceptos Requisitados</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 10%;">Clave</th>
            <th style="width: 50%;">Descripción</th>
            <th class="text-center" style="width: 8%;">Cant.</th>
            <th class="text-right" style="width: 14%;">P.U.</th>
            <th class="text-right" style="width: 18%;">Importe</th>
          </tr>
        </thead>
        <tbody>
          ${requisicion.conceptos.map(concepto => `
          <tr>
            <td class="font-bold">${concepto.clave}</td>
            <td style="font-size: 7px;">${concepto.concepto.length > 120 ? concepto.concepto.substring(0, 120) + '...' : concepto.concepto}</td>
            <td class="text-center">${concepto.cantidad_esta_requisicion}</td>
            <td class="text-right">$${concepto.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right font-bold">$${concepto.importe.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="4" class="text-right">TOTAL:</td>
            <td class="text-right">$${requisicion.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- Detalle de Pagos Realizados -->
    ${pagosRealizados.length > 0 || (solicitud && solicitud.estatus_pago === 'PAGADO') ? `
    <div class="section">
      <h2 class="section-title">Detalle de Pagos Realizados</h2>
      
      ${pagosRealizados.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th style="width: 10%;">Fecha</th>
            <th style="width: 38%;">Concepto</th>
            <th class="text-right" style="width: 13%;">Importe</th>
            <th class="text-right" style="width: 13%;">Retención</th>
            <th class="text-right" style="width: 13%;">Anticipo</th>
            <th class="text-right" style="width: 13%;">Neto</th>
          </tr>
        </thead>
        <tbody>
          ${pagosRealizados.map(pago => `
          <tr>
            <td>${new Date(pago.fecha_pago).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
            <td style="font-size: 7px;">${pago.concepto_clave} - ${pago.concepto_descripcion.length > 60 ? pago.concepto_descripcion.substring(0, 60) + '...' : pago.concepto_descripcion}</td>
            <td class="text-right">$${pago.monto_bruto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right" style="color: #ef4444;">$${pago.retencion_monto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right" style="color: #f59e0b;">$${pago.anticipo_monto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right font-bold">$${pago.monto_neto_pagado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
      ` : solicitud && solicitud.estatus_pago === 'PAGADO' ? `
      <div style="background: #f0fdf4; padding: 12px; border-radius: 4px; border: 1px solid #86efac; margin-bottom: 8px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
          <div>
            <div style="font-size: 7px; color: #666; text-transform: uppercase; margin-bottom: 3px;">Fecha de Pago</div>
            <div style="font-size: 10px; font-weight: 700; color: #047857;">
              ${solicitud.fecha_pago ? new Date(solicitud.fecha_pago).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
            </div>
          </div>
          <div>
            <div style="font-size: 7px; color: #666; text-transform: uppercase; margin-bottom: 3px;">Monto Pagado</div>
            <div style="font-size: 10px; font-weight: 700; color: #047857;">
              $${(solicitud.monto_pagado || solicitud.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div style="font-size: 7px; color: #666; text-transform: uppercase; margin-bottom: 3px;">Comprobante</div>
            <div style="font-size: 8px; font-weight: 600; color: #047857;">
              ${solicitud.comprobante_pago_url ? '✓ Archivo disponible' : 'Sin comprobante'}
            </div>
          </div>
        </div>
        ${solicitud.conceptos_detalle && solicitud.conceptos_detalle.length > 0 ? `
        <div style="margin-top: 12px;">
          <div style="font-size: 8px; font-weight: 700; color: #047857; margin-bottom: 6px;">Conceptos Pagados:</div>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${solicitud.conceptos_detalle.filter(c => c.pagado).map(c => `
            <li style="font-size: 7px; padding: 3px 0; border-bottom: 1px solid #d1fae5;">
              <strong>${c.concepto_clave}:</strong> ${c.concepto_descripcion.substring(0, 80)}${c.concepto_descripcion.length > 80 ? '...' : ''} - 
              <span style="color: #047857; font-weight: 700;">$${c.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </li>
            `).join('')}
          </ul>
        </div>
        ` : ''}
      </div>
      ` : ''}
    </div>
    ` : ''}

    <!-- Documentos Anexos -->
    ${(solicitud?.comprobante_pago_url || requisicion.factura_url) ? `
    <div class="section">
      <h2 class="section-title">Documentos Anexos</h2>
      <ul class="document-list">
        ${solicitud?.comprobante_pago_url ? `
        <li class="document-item">
          <div class="document-icon">📄</div>
          <div class="document-info">
            <div class="document-name">Comprobante de Pago</div>
            <a href="${solicitud.comprobante_pago_url}" class="document-link" target="_blank">Ver documento</a>
          </div>
        </li>
        ` : ''}
        ${requisicion.factura_url ? `
        <li class="document-item">
          <div class="document-icon">🧾</div>
          <div class="document-info">
            <div class="document-name">Factura</div>
            <a href="${requisicion.factura_url}" class="document-link" target="_blank">Ver documento</a>
          </div>
        </li>
        ` : ''}
      </ul>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <p>Documento generado automáticamente por Sistema de Administración de Obra</p>
      <p>Este documento es válido sin firma electrónica</p>
    </div>
  </div>
</body>
</html>`;
  };

  const handlePrint = () => {
    const htmlContent = generarHTMLCaratula();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handleExportPDF = () => {
    const htmlContent = generarHTMLCaratula();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  if (!requisicion) return null;

  // Calcular resumen financiero desde la requisición (lo que se solicita pagar)
  const importeBrutoRequisicion = requisicion.conceptos.reduce((sum, c) => sum + c.importe, 0);
  const retencionesRequisicion = requisicion.retencion || 0;
  const anticipoRequisicion = requisicion.amortizacion || 0;
  const totalRequisicion = requisicion.total;
  
  // Calcular lo que realmente se ha pagado (desde solicitud.monto_pagado)
  const totalPagado = solicitud?.monto_pagado || 0;
  const montoPendiente = totalRequisicion - totalPagado;
  const estatusPago = totalPagado >= totalRequisicion ? 'PAGADO TOTAL' : totalPagado > 0 ? 'PAGADO PARCIAL' : 'PENDIENTE';

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: {
          '@media print': {
            maxWidth: '100%',
            margin: 0,
            boxShadow: 'none',
          }
        }
      }}
    >
      <DialogTitle sx={{ bgcolor: '#334155', color: 'white', '@media print': { bgcolor: 'white', color: 'black' } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" fontWeight={700}>
              CARÁTULA DE PAGO - REQUISICIÓN {requisicion.numero}
            </Typography>
            <Typography variant="caption">
              Generado: {new Date().toLocaleDateString('es-MX', { 
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: 'white', '@media print': { display: 'none' } }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent ref={contentRef} sx={{ p: 4, '@media print': { p: 2 } }}>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography>Cargando datos...</Typography>
          </Box>
        ) : (
          <Stack spacing={3}>
            {/* Información General */}
            <Paper elevation={2} sx={{ p: 3, '@media print': { boxShadow: 'none', border: '1px solid #ddd' } }}>
              <Typography variant="h6" fontWeight={700} gutterBottom color="primary">
                INFORMACIÓN GENERAL
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Clave Contrato:</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {contrato?.clave_contrato || contrato?.numero_contrato || contrato?.nombre || 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Contratista:</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {contratista?.nombre || 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Fecha Requisición:</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {new Date(requisicion.fecha).toLocaleDateString('es-MX')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Folio Solicitud:</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {solicitud?.folio || 'Sin solicitud'}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Resumen Financiero */}
            <Paper elevation={2} sx={{ p: 3, bgcolor: '#f0f9ff', '@media print': { boxShadow: 'none', border: '1px solid #ddd' } }}>
              <Typography variant="h6" fontWeight={700} gutterBottom color="primary">
                RESUMEN FINANCIERO
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Importe Bruto</Typography>
                  <Typography variant="h6" fontWeight={700} color="success.main">
                    ${importeBrutoRequisicion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">(-) Retenciones</Typography>
                  <Typography variant="h6" fontWeight={700} color="error.main">
                    ${retencionesRequisicion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">(-) Anticipo</Typography>
                  <Typography variant="h6" fontWeight={700} color="warning.main">
                    ${anticipoRequisicion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#0891b2', borderRadius: 2, flex: 1 }}>
                  <Typography variant="caption" sx={{ color: 'white' }}>Total Pagado</Typography>
                  <Typography variant="h6" fontWeight={700} sx={{ color: 'white' }}>
                    ${totalPagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={2}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Monto Pendiente</Typography>
                  <Typography variant="h6" fontWeight={700}>
                    ${montoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">Estatus</Typography>
                  <Typography 
                    variant="h6" 
                    fontWeight={700} 
                    color={
                      estatusPago === 'PAGADO TOTAL' ? 'success.main' : 
                      estatusPago === 'PAGADO PARCIAL' ? 'warning.main' : 
                      'error.main'
                    }
                  >
                    {estatusPago}
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            {/* Estado de Cuenta del Contrato */}
            {estadoCuentaContrato && (
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 3, 
                  bgcolor: '#f8fafc', 
                  border: '2px solid #cbd5e1',
                  '@media print': { boxShadow: 'none', pageBreakInside: 'avoid' } 
                }}
              >
                <Box sx={{ bgcolor: '#1e293b', color: 'white', p: 1.5, borderRadius: 1, mb: 2 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    📊 ESTADO DE CUENTA DEL CONTRATO
                  </Typography>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                  {/* Columna 1: Monto del Contrato */}
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#334155', mb: 1, pb: 0.5, borderBottom: '2px solid #cbd5e1' }}>
                      MONTO DEL CONTRATO
                    </Typography>
                    <Stack spacing={0.5}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <Typography variant="body2" fontWeight={600}>CONTRATADO:</Typography>
                        <Typography variant="body2" fontWeight={700} color="#0891b2">
                          ${estadoCuentaContrato.montoContratoBase.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <Typography variant="body2" fontWeight={600}>EXTRAORDINARIOS:</Typography>
                        <Typography variant="body2" fontWeight={700} color="#0891b2">
                          ${estadoCuentaContrato.montoExtras.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <Typography variant="body2" fontWeight={600}>ADITIVAS:</Typography>
                        <Typography variant="body2" fontWeight={700} color="#10b981">
                          ${estadoCuentaContrato.montoAditivas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <Typography variant="body2" fontWeight={600}>DEDUCTIVAS:</Typography>
                        <Typography variant="body2" fontWeight={700} color="#ef4444">
                          ${estadoCuentaContrato.montoDeductivas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                      <Divider sx={{ my: 0.5 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: '#e2e8f0', p: 0.5, borderRadius: 0.5 }}>
                        <Typography variant="body2" fontWeight={700}>IMPORTE TOTAL:</Typography>
                        <Typography variant="body2" fontWeight={700} color="#1e293b">
                          ${estadoCuentaContrato.montoContratoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

                  {/* Columna 2: Retenciones y Deducciones */}
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#334155', mb: 1, pb: 0.5, borderBottom: '2px solid #cbd5e1' }}>
                      RETENCIONES Y DEDUCCIONES
                    </Typography>
                    <Stack spacing={0.5}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <Typography variant="body2" fontWeight={600}>RETENCIÓN (Fondo):</Typography>
                        <Typography variant="body2" fontWeight={700} color="#ef4444">
                          ${estadoCuentaContrato.totalRetenido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <Typography variant="body2" fontWeight={600}>% RETENCIÓN:</Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {estadoCuentaContrato.porcentajeRetencion.toFixed(1)}%
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <Typography variant="body2" fontWeight={600}>DEDUCCIONES EXTRA:</Typography>
                        <Typography variant="body2" fontWeight={700} color="#ef4444">
                          ${estadoCuentaContrato.totalDeduccionesExtra.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                      <Divider sx={{ my: 0.5 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: '#fee2e2', p: 0.5, borderRadius: 0.5 }}>
                        <Typography variant="body2" fontWeight={700}>TOTAL DESCUENTOS:</Typography>
                        <Typography variant="body2" fontWeight={700} color="#ef4444">
                          ${(estadoCuentaContrato.totalRetenido + estadoCuentaContrato.totalDeduccionesExtra).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  {/* Columna 3: Anticipo y Amortización */}
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#334155', mb: 1, pb: 0.5, borderBottom: '2px solid #cbd5e1' }}>
                      ANTICIPO Y AMORTIZACIÓN
                    </Typography>
                    <Stack spacing={0.5}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <Typography variant="body2" fontWeight={600}>ANTICIPO:</Typography>
                        <Typography variant="body2" fontWeight={700} color="#0891b2">
                          ${estadoCuentaContrato.anticipoMonto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <Typography variant="body2" fontWeight={600}>% ANTICIPO:</Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {estadoCuentaContrato.porcentajeAnticipo.toFixed(2)}%
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <Typography variant="body2" fontWeight={600}>AMORTIZACIÓN:</Typography>
                        <Typography variant="body2" fontWeight={700} color="#f59e0b">
                          ${estadoCuentaContrato.totalAmortizado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <Typography variant="body2" fontWeight={600}>SALDO POR AMORTIZAR:</Typography>
                        <Typography variant="body2" fontWeight={700} color="#f59e0b">
                          ${estadoCuentaContrato.saldoPorAmortizar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

                  {/* Columna 4: Totales de Pago */}
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#334155', mb: 1, pb: 0.5, borderBottom: '2px solid #cbd5e1' }}>
                      TOTALES DE PAGO
                    </Typography>
                    <Stack spacing={0.5}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <Typography variant="body2" fontWeight={600}>TOTAL PAGADO:</Typography>
                        <Typography variant="body2" fontWeight={700} color="#10b981">
                          ${estadoCuentaContrato.totalPagadoNeto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <Typography variant="body2" fontWeight={600}>TOTAL AMORTIZADO:</Typography>
                        <Typography variant="body2" fontWeight={700} color="#f59e0b">
                          ${estadoCuentaContrato.totalAmortizado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <Typography variant="body2" fontWeight={600}>TOTAL RETENIDO:</Typography>
                        <Typography variant="body2" fontWeight={700} color="#ef4444">
                          ${estadoCuentaContrato.totalRetenido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                      <Divider sx={{ my: 0.5 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: '#fef3c7', p: 0.5, borderRadius: 0.5 }}>
                        <Typography variant="body2" fontWeight={700}>SALDO POR EJERCER:</Typography>
                        <Typography variant="body2" fontWeight={700} color="#f59e0b">
                          ${estadoCuentaContrato.saldoPorEjercer.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: '#dbeafe', p: 0.5, borderRadius: 0.5, mt: 0.5 }}>
                        <Typography variant="body2" fontWeight={700}>SALDO POR PAGAR:</Typography>
                        <Typography variant="body2" fontWeight={700} color="#1e40af">
                          ${estadoCuentaContrato.saldoPorPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Box>
              </Paper>
            )}

            {/* Conceptos Requisitados */}
            {requisicion.conceptos && requisicion.conceptos.length > 0 && (
              <Paper elevation={2} sx={{ '@media print': { boxShadow: 'none', border: '1px solid #ddd', pageBreakInside: 'avoid' } }}>
                <Box sx={{ p: 2, bgcolor: '#f3f4f6' }}>
                  <Typography variant="h6" fontWeight={700}>
                    CONCEPTOS REQUISITADOS
                  </Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#e5e7eb' }}>
                      <TableRow>
                        <TableCell><strong>Clave</strong></TableCell>
                        <TableCell><strong>Descripción</strong></TableCell>
                        <TableCell align="right"><strong>Cantidad</strong></TableCell>
                        <TableCell align="right"><strong>P.U.</strong></TableCell>
                        <TableCell align="right"><strong>Importe</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {requisicion.conceptos.map((concepto, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>{concepto.clave}</TableCell>
                          <TableCell sx={{ fontSize: '0.85rem' }}>{concepto.concepto}</TableCell>
                          <TableCell align="right">{concepto.cantidad_esta_requisicion}</TableCell>
                          <TableCell align="right">
                            ${concepto.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            ${concepto.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: '#f9fafb' }}>
                        <TableCell colSpan={4} align="right"><strong>TOTAL:</strong></TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                          ${requisicion.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

            {/* Detalle de Pagos Realizados */}
            {(pagosRealizados.length > 0 || (solicitud && solicitud.estatus_pago === 'PAGADO')) && (
              <Paper elevation={2} sx={{ '@media print': { boxShadow: 'none', border: '1px solid #ddd', pageBreakInside: 'avoid' } }}>
                <Box sx={{ p: 2, bgcolor: '#dcfce7' }}>
                  <Typography variant="h6" fontWeight={700}>
                    DETALLE DE PAGOS REALIZADOS
                  </Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#e5e7eb' }}>
                      <TableRow>
                        <TableCell><strong>Fecha</strong></TableCell>
                        <TableCell><strong>Concepto</strong></TableCell>
                        <TableCell align="right"><strong>Importe</strong></TableCell>
                        <TableCell align="right"><strong>Retención</strong></TableCell>
                        <TableCell align="right"><strong>Anticipo</strong></TableCell>
                        <TableCell align="right"><strong>Neto Pagado</strong></TableCell>
                        <TableCell align="center"><strong>Comprobante</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pagosRealizados.map((pago, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ fontSize: '0.85rem' }}>
                            {new Date(pago.fecha_pago).toLocaleDateString('es-MX')}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.85rem' }}>
                            {pago.concepto_clave} - {pago.concepto_descripcion.substring(0, 40)}...
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.85rem' }}>
                            ${pago.monto_bruto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'error.main', fontSize: '0.85rem' }}>
                            ${pago.retencion_monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'warning.main', fontSize: '0.85rem' }}>
                            ${pago.anticipo_monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            ${pago.monto_neto_pagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell align="center">
                            {pago.comprobante_pago_url ? (
                              <a href={pago.comprobante_pago_url} target="_blank" rel="noopener noreferrer" className="no-print">
                                <Button size="small" startIcon={<FileIcon />} sx={{ fontSize: '0.75rem' }}>
                                  Ver
                                </Button>
                              </a>
                            ) : (
                              <Typography variant="caption" color="text.secondary">—</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {/* Si no hay pagos_realizados pero la solicitud está pagada, mostrar info de la solicitud */}
                {pagosRealizados.length === 0 && solicitud && solicitud.estatus_pago === 'PAGADO' && (
                  <Box sx={{ p: 3, bgcolor: '#f0fdf4', borderTop: '2px solid #86efac' }}>
                    <Stack direction="row" spacing={3} alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">Fecha de Pago</Typography>
                        <Typography variant="h6" fontWeight={700} color="success.main">
                          {solicitud.fecha_pago ? new Date(solicitud.fecha_pago).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">Monto Pagado</Typography>
                        <Typography variant="h6" fontWeight={700} color="success.main">
                          ${(solicitud.monto_pagado || solicitud.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">Comprobante</Typography>
                        {solicitud.comprobante_pago_url ? (
                          <a href={solicitud.comprobante_pago_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                            <Button size="small" variant="contained" color="success" startIcon={<FileIcon />}>
                              Ver Archivo
                            </Button>
                          </a>
                        ) : (
                          <Typography variant="body2" color="text.secondary">Sin comprobante</Typography>
                        )}
                      </Box>
                    </Stack>
                    
                    {solicitud.conceptos_detalle && solicitud.conceptos_detalle.filter(c => c.pagado).length > 0 && (
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle2" fontWeight={700} color="success.main" gutterBottom>
                          Conceptos Pagados ({solicitud.conceptos_detalle.filter(c => c.pagado).length})
                        </Typography>
                        <Stack spacing={1}>
                          {solicitud.conceptos_detalle.filter(c => c.pagado).map((concepto, idx) => (
                            <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'white', borderRadius: 1 }}>
                              <Typography variant="body2" sx={{ flex: 1 }}>
                                <strong>{concepto.concepto_clave}:</strong> {concepto.concepto_descripcion.substring(0, 60)}{concepto.concepto_descripcion.length > 60 ? '...' : ''}
                              </Typography>
                              <Typography variant="body2" fontWeight={700} color="success.main">
                                ${concepto.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Box>
                )}
              </Paper>
            )}

            {/* Documentos Anexos */}
            {(solicitud?.comprobante_pago_url || requisicion.factura_url) && (
              <Paper elevation={2} sx={{ p: 3, '@media print': { boxShadow: 'none', border: '1px solid #ddd' } }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  DOCUMENTOS ANEXOS
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={1}>
                  {solicitud?.comprobante_pago_url && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FileIcon color="primary" />
                      <Typography variant="body2">Comprobante de Pago</Typography>
                      <a href={solicitud.comprobante_pago_url} target="_blank" rel="noopener noreferrer" className="no-print">
                        <Button size="small" variant="outlined">Ver</Button>
                      </a>
                    </Box>
                  )}
                  {requisicion.factura_url && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FileIcon color="error" />
                      <Typography variant="body2">Factura (PDF)</Typography>
                      <a href={requisicion.factura_url} target="_blank" rel="noopener noreferrer" className="no-print">
                        <Button size="small" variant="outlined">Ver</Button>
                      </a>
                    </Box>
                  )}
                </Stack>
              </Paper>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1, '@media print': { display: 'none' } }}>
        <Button onClick={onClose} color="inherit">
          Cerrar
        </Button>
        <Button 
          onClick={handlePrint} 
          variant="outlined" 
          startIcon={<PrintIcon />}
        >
          Imprimir
        </Button>
        <Button 
          onClick={handleExportPDF} 
          variant="contained" 
          startIcon={<PdfIcon />}
          color="error"
        >
          Descargar PDF
        </Button>
      </DialogActions>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          @page {
            size: letter;
            margin: 1cm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </Dialog>
  );
};

