/**
 * Hook centralizado para gestionar estados de Solicitudes de Pago
 * Centraliza TODA la lógica de estados en un solo lugar
 * 
 * Estados posibles:
 * - pendiente: Sin Vo.Bo. completo
 * - aprobada: Con ambos Vo.Bo. (Desarrollador + Finanzas)
 * - pagada: Con comprobante de pago y monto_pagado
 * - rechazada: Rechazada explícitamente
 */

import { useMemo } from 'react';
import { SolicitudPago } from '@/types/solicitud-pago';

export type EstadoSolicitud = 'pendiente' | 'aprobada' | 'pagada' | 'rechazada';

export interface SolicitudEstadoInfo {
  estado: EstadoSolicitud;
  isPendiente: boolean;
  isAprobada: boolean;
  isPagada: boolean;
  isRechazada: boolean;
  puedeAprobar: boolean;
  puedePagar: boolean;
  tieneVoBoDesarrollador: boolean;
  tieneVoBoFinanzas: boolean;
  tieneAmbosVoBos: boolean;
  estadoPago: 'NO PAGADO' | 'PAGADO PARCIALMENTE' | 'PAGADO';
  porcentajePagado: number;
  descripcion: string;
}

/**
 * Hook principal para calcular el estado de una solicitud
 */
export function useSolicitudEstado(solicitud: SolicitudPago): SolicitudEstadoInfo {
  return useMemo(() => {
    // Verificar Vo.Bo.
    const tieneVoBoDesarrollador = !!solicitud.vobo_desarrollador;
    const tieneVoBoFinanzas = !!solicitud.vobo_finanzas;
    const tieneAmbosVoBos = tieneVoBoDesarrollador && tieneVoBoFinanzas;

    // Calcular estado de pago
    const montoPagado = solicitud.monto_pagado || 0;
    const montoTotal = solicitud.total || 0;
    const porcentajePagado = montoTotal > 0 ? (montoPagado / montoTotal) * 100 : 0;

    let estadoPago: 'NO PAGADO' | 'PAGADO PARCIALMENTE' | 'PAGADO' = 'NO PAGADO';
    if (montoPagado > 0) {
      estadoPago = montoPagado >= montoTotal ? 'PAGADO' : 'PAGADO PARCIALMENTE';
    }

    // Determinar estado principal
    let estado: EstadoSolicitud = 'pendiente';
    let descripcion = 'Esperando aprobaciones';

    // Verificar si está pagada (prioridad máxima)
    if (estadoPago === 'PAGADO' || solicitud.estatus_pago === 'PAGADO') {
      estado = 'pagada';
      descripcion = 'Pago completado';
    } 
    // Verificar si está rechazada explícitamente
    else if (solicitud.estado === 'rechazada') {
      estado = 'rechazada';
      descripcion = 'Solicitud rechazada';
    }
    // Verificar si tiene ambos Vo.Bo. (aprobada)
    else if (tieneAmbosVoBos) {
      estado = 'aprobada';
      if (estadoPago === 'PAGADO PARCIALMENTE') {
        descripcion = 'Pago parcial realizado';
      } else {
        descripcion = 'Aprobada, pendiente de pago';
      }
    }
    // Verificar Vo.Bo. parciales
    else if (tieneVoBoDesarrollador && !tieneVoBoFinanzas) {
      descripcion = 'Esperando Vo.Bo. de Finanzas';
    } else if (!tieneVoBoDesarrollador && tieneVoBoFinanzas) {
      descripcion = 'Esperando Vo.Bo. de Desarrollador';
    } else {
      descripcion = 'Esperando ambos Vo.Bo.';
    }

    // Determinar permisos
    const puedeAprobar = estado === 'pendiente' && !tieneAmbosVoBos;
    const puedePagar = estado === 'aprobada' && estadoPago !== 'PAGADO';

    return {
      estado,
      isPendiente: estado === 'pendiente',
      isAprobada: estado === 'aprobada',
      isPagada: estado === 'pagada',
      isRechazada: estado === 'rechazada',
      puedeAprobar,
      puedePagar,
      tieneVoBoDesarrollador,
      tieneVoBoFinanzas,
      tieneAmbosVoBos,
      estadoPago,
      porcentajePagado,
      descripcion,
    };
  }, [
    solicitud.vobo_desarrollador,
    solicitud.vobo_finanzas,
    solicitud.monto_pagado,
    solicitud.total,
    solicitud.estatus_pago,
    solicitud.estado,
  ]);
}

/**
 * Función helper para actualizar el estado de una solicitud automáticamente
 */
export function calcularEstadoSolicitud(solicitud: SolicitudPago): EstadoSolicitud {
  const tieneAmbosVoBos = !!solicitud.vobo_desarrollador && !!solicitud.vobo_finanzas;
  const montoPagado = solicitud.monto_pagado || 0;
  const montoTotal = solicitud.total || 0;
  const estaPagada = montoPagado >= montoTotal || solicitud.estatus_pago === 'PAGADO';

  if (estaPagada) return 'pagada';
  if (solicitud.estado === 'rechazada') return 'rechazada';
  if (tieneAmbosVoBos) return 'aprobada';
  return 'pendiente';
}

/**
 * Hook para obtener el badge de estado con configuración de Material-UI
 */
export function useSolicitudBadge(solicitud: SolicitudPago) {
  const { estado } = useSolicitudEstado(solicitud);

  const badgeConfig = useMemo(() => {
    switch (estado) {
      case 'pendiente':
        return {
          color: 'warning' as const,
          label: 'Pendiente',
          icon: '⏱️',
        };
      case 'aprobada':
        return {
          color: 'success' as const,
          label: 'Aprobada',
          icon: '✅',
        };
      case 'pagada':
        return {
          color: 'secondary' as const,
          label: 'Pagada',
          icon: '💰',
        };
      case 'rechazada':
        return {
          color: 'error' as const,
          label: 'Rechazada',
          icon: '❌',
        };
    }
  }, [estado]);

  return badgeConfig;
}

/**
 * Hook para gestionar transiciones de estado válidas
 */
export function useSolicitudTransiciones(solicitud: SolicitudPago) {
  const { estado, tieneVoBoDesarrollador, tieneVoBoFinanzas } = useSolicitudEstado(solicitud);

  const transicionesValidas = useMemo(() => {
    const transiciones: EstadoSolicitud[] = [];

    switch (estado) {
      case 'pendiente':
        // Puede aprobar si tiene ambos VoBo
        if (tieneVoBoDesarrollador && tieneVoBoFinanzas) {
          transiciones.push('aprobada');
        }
        // Puede rechazar en cualquier momento
        transiciones.push('rechazada');
        break;

      case 'aprobada':
        // Puede pagar
        transiciones.push('pagada');
        // Puede volver a pendiente si se quitan VoBos
        if (!tieneVoBoDesarrollador || !tieneVoBoFinanzas) {
          transiciones.push('pendiente');
        }
        break;

      case 'pagada':
        // Una vez pagada, no puede cambiar
        break;

      case 'rechazada':
        // Puede volver a pendiente si se reactiva
        transiciones.push('pendiente');
        break;
    }

    return transiciones;
  }, [estado, tieneVoBoDesarrollador, tieneVoBoFinanzas]);

  const puedeTransicionarA = (nuevoEstado: EstadoSolicitud): boolean => {
    return transicionesValidas.includes(nuevoEstado);
  };

  return {
    transicionesValidas,
    puedeTransicionarA,
  };
}
