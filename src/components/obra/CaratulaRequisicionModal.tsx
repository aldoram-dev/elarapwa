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

  const cargarDatos = async () => {
    if (!requisicion) return;
    
    setLoading(true);
    try {
      // Cargar contrato
      const contratoData = await db.contratos.get(requisicion.contrato_id);
      setContrato(contratoData || null);

      // Cargar contratista
      if (contratoData) {
        const contratistaData = await db.contratistas.get(contratoData.contratista_id);
        setContratista(contratistaData || null);
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
    } catch (error) {
      console.error('Error cargando datos de la carátula:', error);
    } finally {
      setLoading(false);
    }
  };

  const generarHTMLCaratula = (): string => {
    if (!requisicion) return '';

    const totalImporte = pagosRealizados.reduce((sum, p) => sum + p.monto_bruto, 0);
    const totalRetenciones = pagosRealizados.reduce((sum, p) => sum + p.retencion_monto, 0);
    const totalAnticipo = pagosRealizados.reduce((sum, p) => sum + p.anticipo_monto, 0);
    const totalPagado = pagosRealizados.reduce((sum, p) => sum + p.monto_neto_pagado, 0);
    const montoPendiente = (solicitud?.total || requisicion.total) - totalPagado;
    const estatusPago = totalPagado >= (solicitud?.total || requisicion.total) ? 'PAGADO TOTAL' : totalPagado > 0 ? 'PAGADO PARCIAL' : 'PENDIENTE';

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
          <div class="info-label">Contrato</div>
          <div class="info-value">${contrato?.numero_contrato || contrato?.nombre || 'N/A'}</div>
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

    <!-- Resumen Financiero -->
    <div class="section">
      <h2 class="section-title">Resumen Financiero</h2>
      <div class="financial-summary">
        <div class="financial-card success">
          <div class="financial-label">Importe Bruto</div>
          <div class="financial-amount">$${totalImporte.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div class="financial-card error">
          <div class="financial-label">(-) Retenc.</div>
          <div class="financial-amount">$${totalRetenciones.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div class="financial-card warning">
          <div class="financial-label">(-) Anticipo</div>
          <div class="financial-amount">$${totalAnticipo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
    ${pagosRealizados.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Detalle de Pagos Realizados</h2>
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

  // Calcular resumen financiero
  const totalImporte = pagosRealizados.reduce((sum, p) => sum + p.monto_bruto, 0);
  const totalRetenciones = pagosRealizados.reduce((sum, p) => sum + p.retencion_monto, 0);
  const totalAnticipo = pagosRealizados.reduce((sum, p) => sum + p.anticipo_monto, 0);
  const totalPagado = pagosRealizados.reduce((sum, p) => sum + p.monto_neto_pagado, 0);
  const montoPendiente = (solicitud?.total || requisicion.total) - totalPagado;
  const estatusPago = totalPagado >= (solicitud?.total || requisicion.total) ? 'PAGADO TOTAL' : totalPagado > 0 ? 'PAGADO PARCIAL' : 'PENDIENTE';

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
      <DialogTitle sx={{ bgcolor: '#0891b2', color: 'white', '@media print': { bgcolor: 'white', color: 'black' } }}>
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
                  <Typography variant="body2" color="text.secondary">Contrato:</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {contrato?.numero_contrato || contrato?.nombre || 'N/A'}
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
                    ${totalImporte.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">(-) Retenciones</Typography>
                  <Typography variant="h6" fontWeight={700} color="error.main">
                    ${totalRetenciones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">(-) Anticipo</Typography>
                  <Typography variant="h6" fontWeight={700} color="warning.main">
                    ${totalAnticipo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
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
            {pagosRealizados.length > 0 && (
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

