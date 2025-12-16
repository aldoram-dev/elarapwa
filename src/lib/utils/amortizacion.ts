/**
 * Utilidad para calcular amortización de anticipo de manera consistente
 * en todo el sistema (Requisiciones, Solicitudes, Pagos, Estado de Cuenta)
 */

export interface CalculoAmortizacionParams {
  montoBruto: number; // Monto sobre el cual calcular (puede ser monto_estimado, total, etc.)
  anticipoMontoContrato: number; // Monto total del anticipo del contrato
  montoTotalContrato: number; // Monto total del contrato
  saldoDisponibleAnticipo?: number; // Saldo disponible del anticipo (opcional, se calcula si no se provee)
  amortizadoAnterior?: number; // Monto ya amortizado en requisiciones anteriores (opcional)
}

export interface ResultadoCalculoAmortizacion {
  porcentajeAnticipo: number; // % del anticipo sobre el contrato
  montoCalculado: number; // Monto calculado sin topar
  montoFinal: number; // Monto final topado al saldo disponible
  saldoDisponible: number; // Saldo disponible del anticipo
  topado: boolean; // Si el monto fue topado
}

/**
 * Calcula la amortización de anticipo de manera consistente
 * 
 * LÓGICA:
 * 1. Calcular el porcentaje del anticipo: (Anticipo / Monto Contrato) * 100
 * 2. Aplicar ese porcentaje al monto bruto de la requisición/solicitud
 * 3. Topar el resultado al saldo disponible del anticipo
 * 
 * Esto asegura que:
 * - Siempre se calcula proporcionalmente al monto
 * - Nunca se excede el saldo disponible del anticipo
 * - Es consistente en todo el sistema
 */
export function calcularAmortizacion(params: CalculoAmortizacionParams): ResultadoCalculoAmortizacion {
  const {
    montoBruto,
    anticipoMontoContrato,
    montoTotalContrato,
    amortizadoAnterior = 0,
  } = params;

  // 1. Calcular porcentaje del anticipo
  const porcentajeAnticipo = montoTotalContrato > 0
    ? (anticipoMontoContrato / montoTotalContrato) * 100
    : 0;

  // 2. Calcular monto proporcional al porcentaje
  const montoCalculado = montoBruto * (porcentajeAnticipo / 100);

  // 3. Calcular saldo disponible del anticipo
  const saldoDisponible = Math.max(0, anticipoMontoContrato - amortizadoAnterior);

  // 4. Topar al saldo disponible
  const montoFinal = Math.min(saldoDisponible, Math.max(0, montoCalculado));

  // 5. Verificar si fue topado
  const topado = montoCalculado > saldoDisponible && saldoDisponible > 0;

  return {
    porcentajeAnticipo: Math.round(porcentajeAnticipo * 100) / 100, // Redondear a 2 decimales
    montoCalculado: Math.round(montoCalculado * 100) / 100,
    montoFinal: Math.round(montoFinal * 100) / 100,
    saldoDisponible: Math.round(saldoDisponible * 100) / 100,
    topado,
  };
}

/**
 * Helper para obtener el porcentaje de anticipo de un contrato
 */
export function obtenerPorcentajeAnticipo(anticipoMonto: number, montoContrato: number): number {
  if (montoContrato <= 0) return 0;
  return Math.round(((anticipoMonto / montoContrato) * 100) * 100) / 100;
}

/**
 * Helper para formatear mensaje de tope de anticipo
 */
export function mensajeTopeAnticipo(resultado: ResultadoCalculoAmortizacion): string | null {
  if (!resultado.topado) return null;
  
  return `⚠️ La amortización calculada ($${resultado.montoCalculado.toLocaleString('es-MX', {
    minimumFractionDigits: 2
  })}) excede el saldo disponible del anticipo. Se ha ajustado a $${resultado.montoFinal.toLocaleString('es-MX', {
    minimumFractionDigits: 2
  })}.`;
}
