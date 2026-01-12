import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Tipos
interface DetalleContrato {
  contrato: any;
  montoContratoBase: number;
  montoExtras: number;
  montoAditivas: number;
  montoDeductivas: number;
  montoContrato: number;
  totalRetenido: number;
  totalDeduccionesExtras: number;
  anticipoMonto: number;
  totalAmortizado: number;
  saldoPorAmortizar: number;
  totalPagado: number;
  totalRequisicionesBruto: number;
  diasAtraso?: number;
  montoPenalizacion?: number;
  penalizacionAplicada?: number;
  requisiciones: any[];
  solicitudes: any[];
}

interface EstadoCuentaPDFProps {
  detalleContrato: DetalleContrato;
  nombreContratista: string;
  nombreProyecto: string;
  fechaGeneracion: string;
}

// Estilos para el PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: '#333',
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
    padding: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 5,
  },
  label: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  value: {
    fontSize: 9,
  },
  divider: {
    borderBottom: 1,
    borderBottomColor: '#ddd',
    marginVertical: 5,
  },
  strongDivider: {
    borderBottom: 2,
    borderBottomColor: '#333',
    marginVertical: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  gridColumn: {
    flex: 1,
    paddingHorizontal: 5,
  },
  alert: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#ffc107',
    padding: 8,
    marginBottom: 10,
    borderRadius: 4,
  },
  alertTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 9,
    color: '#856404',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#333',
    color: '#fff',
    padding: 5,
    fontWeight: 'bold',
    fontSize: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    borderBottomColor: '#ddd',
    padding: 5,
    fontSize: 8,
  },
  tableCell: {
    padding: 2,
  },
  colPartida: { width: '8%' },
  colClave: { width: '12%' },
  colTipo: { width: '10%' },
  colMonto: { width: '10%', textAlign: 'right' },
  colAmortizacion: { width: '10%', textAlign: 'right' },
  colRetencion: { width: '10%', textAlign: 'right' },
  colDeducciones: { width: '10%', textAlign: 'right' },
  colNeto: { width: '10%', textAlign: 'right' },
  colPagado: { width: '10%', textAlign: 'right' },
  colPorPagar: { width: '10%', textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
    borderTop: 1,
    borderTopColor: '#ddd',
    paddingTop: 5,
  },
});

// Componente del documento PDF
export const EstadoCuentaPDF: React.FC<EstadoCuentaPDFProps> = ({
  detalleContrato,
  nombreContratista,
  nombreProyecto,
  fechaGeneracion,
}) => {
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const calcularDetallesRequisicion = (req: any) => {
    const porcentajeRetencion = detalleContrato.contrato.retencion_porcentaje || 0;
    const porcentajeAnticipo = (detalleContrato.contrato.anticipo_monto && detalleContrato.contrato.monto_contrato)
      ? Math.round(((detalleContrato.contrato.anticipo_monto / detalleContrato.contrato.monto_contrato) * 100) * 100) / 100
      : 0;
    
    const montoBruto = req.monto_estimado || req.total;
    const montoRetencion = req.retencion || (montoBruto * (porcentajeRetencion / 100));
    const montoAmortizacion = req.amortizacion || (montoBruto * (porcentajeAnticipo / 100));
    
    const solicitud = detalleContrato.solicitudes.find((s: any) => s.requisicion_id?.toString() === req.id?.toString());
    const deduccionesExtras = (solicitud?.deducciones_extra || []).reduce((sum: number, ded: any) => sum + (ded.monto || 0), 0);
    
    const montoNeto = montoBruto - montoRetencion - montoAmortizacion - deduccionesExtras;
    const montoPagado = solicitud?.monto_pagado || 0;
    const montoPorPagar = montoNeto - montoPagado;

    return {
      montoBruto,
      montoRetencion,
      montoAmortizacion,
      deduccionesExtras,
      montoNeto,
      montoPagado,
      montoPorPagar,
    };
  };

  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        {/* Header con Logo */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>ESTADO DE CUENTA POR CONTRATO</Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#D4D4D4', letterSpacing: 2 }}>ELARA</Text>
          </View>
          <Text style={styles.subtitle}>{nombreProyecto}</Text>
          <Text style={styles.subtitle}>Contratista: {nombreContratista}</Text>
          <Text style={styles.subtitle}>Contrato: {detalleContrato.contrato.clave_contrato || detalleContrato.contrato.numero_contrato || 'Sin clave'}</Text>
          <Text style={styles.subtitle}>Fecha de generación: {fechaGeneracion}</Text>
        </View>

        {/* Alerta de atrasos */}
        {detalleContrato.diasAtraso && detalleContrato.diasAtraso > 0 && (
          <View style={styles.alert}>
            <Text style={styles.alertTitle}>⚠ CONTRATO CON ATRASO</Text>
            <Text style={styles.alertText}>
              Este contrato tiene {detalleContrato.diasAtraso} días de atraso con una penalización aplicada de {formatCurrency(detalleContrato.penalizacionAplicada || 0)}
            </Text>
          </View>
        )}

        {/* Información del Contrato */}
        <View style={styles.gridContainer}>
          <View style={styles.gridColumn}>
            <Text style={styles.sectionTitle}>MONTO DEL CONTRATO</Text>
            <View style={styles.row}>
              <Text style={styles.label}>CONTRATADO:</Text>
              <Text style={styles.value}>{formatCurrency(detalleContrato.montoContratoBase || 0)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>EXTRAORDINARIOS:</Text>
              <Text style={styles.value}>{formatCurrency(detalleContrato.montoExtras || 0)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>ADITIVAS:</Text>
              <Text style={styles.value}>{formatCurrency(detalleContrato.montoAditivas || 0)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>DEDUCTIVAS:</Text>
              <Text style={styles.value}>{formatCurrency(detalleContrato.montoDeductivas || 0)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={[styles.label, { fontWeight: 'bold' }]}>IMPORTE TOTAL:</Text>
              <Text style={[styles.value, { fontWeight: 'bold' }]}>{formatCurrency(detalleContrato.montoContrato || 0)}</Text>
            </View>
          </View>

          <View style={styles.gridColumn}>
            <Text style={styles.sectionTitle}>RETENCIONES Y DEDUCCIONES</Text>
            <View style={styles.row}>
              <Text style={styles.label}>RETENCIÓN (Fondo de Garantía):</Text>
              <Text style={styles.value}>{formatCurrency(detalleContrato.totalRetenido || 0)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>% RETENCIÓN:</Text>
              <Text style={styles.value}>{detalleContrato.contrato?.retencion_porcentaje || 0}%</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>DEDUCCIONES EXTRA:</Text>
              <Text style={styles.value}>{formatCurrency(detalleContrato.totalDeduccionesExtras || 0)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={[styles.label, { fontWeight: 'bold' }]}>TOTAL DESCUENTOS:</Text>
              <Text style={[styles.value, { fontWeight: 'bold' }]}>{formatCurrency((detalleContrato.totalRetenido || 0) + (detalleContrato.totalDeduccionesExtras || 0))}</Text>
            </View>
          </View>
        </View>

        {/* Amortizaciones y Penalizaciones */}
        <View style={styles.gridContainer}>
          <View style={styles.gridColumn}>
            <Text style={styles.sectionTitle}>ANTICIPO Y AMORTIZACIÓN</Text>
            <View style={styles.row}>
              <Text style={styles.label}>ANTICIPO:</Text>
              <Text style={styles.value}>{formatCurrency(detalleContrato.anticipoMonto || 0)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>TOTAL AMORTIZADO:</Text>
              <Text style={styles.value}>{formatCurrency(detalleContrato.totalAmortizado || 0)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>SALDO POR AMORTIZAR:</Text>
              <Text style={styles.value}>{formatCurrency(detalleContrato.saldoPorAmortizar || 0)}</Text>
            </View>
          </View>

          {detalleContrato.diasAtraso && detalleContrato.diasAtraso > 0 ? (
            <View style={styles.gridColumn}>
              <Text style={styles.sectionTitle}>PENALIZACIONES POR ATRASO</Text>
              <View style={styles.row}>
                <Text style={styles.label}>DÍAS DE ATRASO:</Text>
                <Text style={styles.value}>{detalleContrato.diasAtraso} días</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>PENALIZACIÓN POR DÍA:</Text>
                <Text style={styles.value}>{formatCurrency(detalleContrato.contrato?.penalizacion_por_dia || 0)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>PENALIZACIÓN CALCULADA:</Text>
                <Text style={styles.value}>{formatCurrency(detalleContrato.montoPenalizacion || 0)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={[styles.label, { fontWeight: 'bold' }]}>PENALIZACIÓN APLICADA:</Text>
                <Text style={[styles.value, { fontWeight: 'bold' }]}>{formatCurrency(detalleContrato.penalizacionAplicada || 0)}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.gridColumn}>
              <Text style={styles.sectionTitle}>PENALIZACIONES</Text>
              <View style={styles.row}>
                <Text style={styles.label}>ESTADO:</Text>
                <Text style={styles.value}>Sin atrasos</Text>
              </View>
            </View>
          )}
        </View>

        {/* Resumen de Pagos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RESUMEN DE PAGOS</Text>
          <View style={styles.gridContainer}>
            <View style={styles.gridColumn}>
              <View style={styles.row}>
                <Text style={[styles.label, { fontWeight: 'bold' }]}>TOTAL PAGADO (Neto):</Text>
                <Text style={[styles.value, { fontWeight: 'bold' }]}>{formatCurrency(detalleContrato.totalPagado || 0)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>MONTO BRUTO PAGADO:</Text>
                <Text style={styles.value}>{formatCurrency((detalleContrato.totalPagado || 0) + (detalleContrato.totalRetenido || 0) + (detalleContrato.totalAmortizado || 0) + (detalleContrato.totalDeduccionesExtras || 0))}</Text>
              </View>
            </View>
            <View style={styles.gridColumn}>
              <View style={styles.row}>
                <Text style={[styles.label, { fontWeight: 'bold' }]}>SALDO POR EJERCER:</Text>
                <Text style={[styles.value, { fontWeight: 'bold' }]}>{formatCurrency((detalleContrato.montoContrato || 0) - (detalleContrato.totalRequisicionesBruto || 0))}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.strongDivider} />

        {/* Tabla de Requisiciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DESGLOSE POR REQUISICIÓN</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.colPartida]}>PARTIDA</Text>
              <Text style={[styles.tableCell, styles.colClave]}>CLAVE</Text>
              <Text style={[styles.tableCell, styles.colTipo]}>TIPO</Text>
              <Text style={[styles.tableCell, styles.colMonto]}>BRUTO</Text>
              <Text style={[styles.tableCell, styles.colAmortizacion]}>AMORT.</Text>
              <Text style={[styles.tableCell, styles.colRetencion]}>RETENCIÓN</Text>
              <Text style={[styles.tableCell, styles.colDeducciones]}>DEDUCC.</Text>
              <Text style={[styles.tableCell, styles.colNeto]}>NETO</Text>
              <Text style={[styles.tableCell, styles.colPagado]}>PAGADO</Text>
              <Text style={[styles.tableCell, styles.colPorPagar]}>POR PAGAR</Text>
            </View>
            {detalleContrato.requisiciones.map((req: any, idx: number) => {
              const detalles = calcularDetallesRequisicion(req);
              return (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.colPartida]}>{req.numero}</Text>
                  <Text style={[styles.tableCell, styles.colClave]}>{detalleContrato.contrato.clave_contrato || detalleContrato.contrato.numero_contrato}</Text>
                  <Text style={[styles.tableCell, styles.colTipo]}>Base</Text>
                  <Text style={[styles.tableCell, styles.colMonto]}>{formatCurrency(detalles.montoBruto)}</Text>
                  <Text style={[styles.tableCell, styles.colAmortizacion]}>{formatCurrency(detalles.montoAmortizacion)}</Text>
                  <Text style={[styles.tableCell, styles.colRetencion]}>{formatCurrency(detalles.montoRetencion)}</Text>
                  <Text style={[styles.tableCell, styles.colDeducciones]}>{formatCurrency(detalles.deduccionesExtras)}</Text>
                  <Text style={[styles.tableCell, styles.colNeto]}>{formatCurrency(detalles.montoNeto)}</Text>
                  <Text style={[styles.tableCell, styles.colPagado]}>{formatCurrency(detalles.montoPagado)}</Text>
                  <Text style={[styles.tableCell, styles.colPorPagar]}>{formatCurrency(detalles.montoPorPagar)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer} fixed>
          Documento generado el {fechaGeneracion} • Página {' '}
        </Text>
      </Page>
    </Document>
  );
};
