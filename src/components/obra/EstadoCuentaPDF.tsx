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
  totalPagadoNeto: number;  // 🆕 Total pagado SIN IVA
  totalIvaPagado: number;   // 🆕 IVA pagado
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
    padding: 20,
    fontSize: 8,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 6,
    borderBottom: 1,
    borderBottomColor: '#333',
    paddingBottom: 4,
  },
  title: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 7,
    color: '#666',
    marginBottom: 0.5,
  },
  section: {
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 7.5,
    fontWeight: 'bold',
    marginBottom: 2,
    backgroundColor: '#f0f0f0',
    padding: 2.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1.5,
    paddingHorizontal: 2.5,
  },
  label: {
    fontSize: 7,
    fontWeight: 'bold',
  },
  value: {
    fontSize: 7,
  },
  divider: {
    borderBottom: 1,
    borderBottomColor: '#ddd',
    marginVertical: 1.5,
  },
  strongDivider: {
    borderBottom: 2,
    borderBottomColor: '#333',
    marginVertical: 2.5,
  },
  gridContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  gridColumn: {
    flex: 1,
    paddingHorizontal: 2.5,
  },
  alert: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#ffc107',
    padding: 5,
    marginBottom: 6,
    borderRadius: 3,
  },
  alertTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 2,
  },
  alertText: {
    fontSize: 7,
    color: '#856404',
  },
  table: {
    marginTop: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#333',
    color: '#fff',
    padding: 3,
    fontWeight: 'bold',
    fontSize: 7,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    borderBottomColor: '#ddd',
    padding: 3,
    fontSize: 7,
  },
  tableCell: {
    padding: 1,
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
    bottom: 15,
    left: 20,
    right: 20,
    textAlign: 'center',
    fontSize: 7,
    color: '#666',
    borderTop: 1,
    borderTopColor: '#ddd',
    paddingTop: 3,
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>ESTADO DE CUENTA - {detalleContrato.contrato.clave_contrato || detalleContrato.contrato.numero_contrato || 'Sin clave'}</Text>
              <Text style={styles.subtitle}>{nombreProyecto} • {nombreContratista}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#D4D4D4', letterSpacing: 2 }}>ELARA</Text>
              <Text style={[styles.subtitle, { textAlign: 'right' }]}>{fechaGeneracion}</Text>
            </View>
          </View>
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

        {/* Información del Contrato - Organizada en 3 columnas */}
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
            <Text style={styles.sectionTitle}>ANTICIPO Y AMORTIZACIÓN</Text>
            <View style={styles.row}>
              <Text style={styles.label}>ANTICIPO:</Text>
              <Text style={styles.value}>{formatCurrency(detalleContrato.anticipoMonto || 0)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>AMORTIZADO:</Text>
              <Text style={styles.value}>{formatCurrency(detalleContrato.totalAmortizado || 0)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>SALDO POR AMORTIZAR:</Text>
              <Text style={styles.value}>{formatCurrency(detalleContrato.saldoPorAmortizar || 0)}</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>RETENCIONES</Text>
            <View style={styles.row}>
              <Text style={styles.label}>RETENCIÓN ({detalleContrato.contrato?.retencion_porcentaje || 0}%):</Text>
              <Text style={styles.value}>{formatCurrency(detalleContrato.totalRetenido || 0)}</Text>
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

          <View style={styles.gridColumn}>
            <Text style={styles.sectionTitle}>RESUMEN DE PAGOS</Text>
            <View style={styles.row}>
              <Text style={[styles.label, { fontWeight: 'bold' }]}>TOTAL PAGADO (Neto):</Text>
              <Text style={[styles.value, { fontWeight: 'bold', color: '#2e7d32' }]}>{formatCurrency(detalleContrato.totalPagadoNeto || 0)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>IVA PAGADO:</Text>
              <Text style={styles.value}>{formatCurrency(detalleContrato.totalIvaPagado || 0)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>MONTO BRUTO PAGADO:</Text>
              <Text style={styles.value}>{formatCurrency(detalleContrato.totalPagado || 0)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={[styles.label, { fontWeight: 'bold', color: '#f57c00' }]}>SALDO POR EJERCER:</Text>
              <Text style={[styles.value, { fontWeight: 'bold', color: '#f57c00' }]}>{formatCurrency((detalleContrato.montoContrato || 0) - (detalleContrato.totalRequisicionesBruto || 0))}</Text>
            </View>
            <View style={styles.divider} />
            {detalleContrato.diasAtraso && detalleContrato.diasAtraso > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { backgroundColor: '#fff3cd', color: '#856404' }]}>⚠ PENALIZACIONES</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>DÍAS ATRASO:</Text>
                  <Text style={styles.value}>{detalleContrato.diasAtraso} días</Text>
                </View>
                <View style={styles.row}>
                  <Text style={[styles.label, { fontWeight: 'bold', color: '#d32f2f' }]}>PENALIZACIÓN:</Text>
                  <Text style={[styles.value, { fontWeight: 'bold', color: '#d32f2f' }]}>{formatCurrency(detalleContrato.penalizacionAplicada || 0)}</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>PENALIZACIONES</Text>
                <View style={styles.row}>
                  <Text style={[styles.label, { color: '#2e7d32' }]}>ESTADO:</Text>
                  <Text style={[styles.value, { color: '#2e7d32' }]}>Sin atrasos</Text>
                </View>
              </>
            )}
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
