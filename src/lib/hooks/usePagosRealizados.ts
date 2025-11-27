import { useState, useEffect } from 'react'
import { 
  getPagosBySolicitud,
  getPagosByRequisicion,
  getPagosByContrato,
  getPagosByPeriodo,
  getResumenFinancieroContrato,
  getPagosAgrupadosPorConcepto,
  getTotalPagadoContrato,
  getTotalRetenidoContrato,
  getTotalAmortizadoContrato,
} from '@/lib/services/pagoRealizadoService'
import { PagoRealizado } from '@/types/pago-realizado'

/**
 * Hook para obtener pagos de una solicitud
 */
export function usePagosSolicitud(solicitudId: string | undefined) {
  const [pagos, setPagos] = useState<PagoRealizado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!solicitudId) {
      setPagos([])
      setLoading(false)
      return
    }

    setLoading(true)
    getPagosBySolicitud(solicitudId)
      .then(setPagos)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [solicitudId])

  return { pagos, loading, error }
}

/**
 * Hook para obtener pagos de una requisición
 */
export function usePagosRequisicion(requisicionId: string | undefined) {
  const [pagos, setPagos] = useState<PagoRealizado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!requisicionId) {
      setPagos([])
      setLoading(false)
      return
    }

    setLoading(true)
    getPagosByRequisicion(requisicionId)
      .then(setPagos)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [requisicionId])

  return { pagos, loading, error }
}

/**
 * Hook para obtener pagos de un contrato con resumen financiero
 */
export function usePagosContrato(contratoId: string | undefined) {
  const [pagos, setPagos] = useState<PagoRealizado[]>([])
  const [resumen, setResumen] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!contratoId) {
      setPagos([])
      setResumen(null)
      setLoading(false)
      return
    }

    setLoading(true)
    Promise.all([
      getPagosByContrato(contratoId),
      getResumenFinancieroContrato(contratoId)
    ])
      .then(([pagosData, resumenData]) => {
        setPagos(pagosData)
        setResumen(resumenData)
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [contratoId])

  return { pagos, resumen, loading, error }
}

/**
 * Hook para obtener pagos agrupados por concepto
 */
export function usePagosAgrupadosPorConcepto(contratoId: string | undefined) {
  const [pagosAgrupados, setPagosAgrupados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!contratoId) {
      setPagosAgrupados([])
      setLoading(false)
      return
    }

    setLoading(true)
    getPagosAgrupadosPorConcepto(contratoId)
      .then(setPagosAgrupados)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [contratoId])

  return { pagosAgrupados, loading, error }
}

/**
 * Hook para obtener totales de un contrato
 */
export function useTotalesContrato(contratoId: string | undefined) {
  const [totales, setTotales] = useState({
    totalPagado: 0,
    totalRetenido: 0,
    totalAmortizado: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!contratoId) {
      setTotales({ totalPagado: 0, totalRetenido: 0, totalAmortizado: 0 })
      setLoading(false)
      return
    }

    setLoading(true)
    Promise.all([
      getTotalPagadoContrato(contratoId),
      getTotalRetenidoContrato(contratoId),
      getTotalAmortizadoContrato(contratoId),
    ])
      .then(([pagado, retenido, amortizado]) => {
        setTotales({
          totalPagado: pagado,
          totalRetenido: retenido,
          totalAmortizado: amortizado,
        })
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [contratoId])

  return { totales, loading, error }
}



/**
 * Hook para obtener pagos en un periodo
 */
export function usePagosPorPeriodo(fechaInicio: string | undefined, fechaFin: string | undefined) {
  const [pagos, setPagos] = useState<PagoRealizado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!fechaInicio || !fechaFin) {
      setPagos([])
      setLoading(false)
      return
    }

    setLoading(true)
    getPagosByPeriodo(fechaInicio, fechaFin)
      .then(setPagos)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [fechaInicio, fechaFin])

  return { pagos, loading, error }
}
