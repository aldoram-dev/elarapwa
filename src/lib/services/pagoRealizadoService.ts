import { db } from '@/db/database'
import { PagoRealizado } from '@/types/pago-realizado'
import { v4 as uuidv4 } from 'uuid'

/**
 * Servicio para gestionar pagos realizados
 * Registra concepto por concepto los pagos efectuados con toda su información financiera
 */

/**
 * Crea un nuevo registro de pago realizado
 */
export async function createPagoRealizado(pago: Omit<PagoRealizado, 'id' | 'created_at' | 'updated_at'>): Promise<PagoRealizado> {
  const timestamp = new Date().toISOString()
  
  const nuevoPago: PagoRealizado = {
    ...pago,
    id: uuidv4(),
    created_at: timestamp,
    updated_at: timestamp,
    active: pago.active ?? true,
    _dirty: true,
  }

  await db.pagos_realizados.add(nuevoPago)
  return nuevoPago
}

/**
 * Crea múltiples pagos realizados en una transacción
 */
export async function createPagosRealizadosBatch(pagos: Omit<PagoRealizado, 'id' | 'created_at' | 'updated_at'>[]): Promise<PagoRealizado[]> {
  const timestamp = new Date().toISOString()
  
  const nuevosPagos: PagoRealizado[] = pagos.map(pago => ({
    ...pago,
    id: uuidv4(),
    created_at: timestamp,
    updated_at: timestamp,
    active: pago.active ?? true,
    _dirty: true,
  }))

  await db.transaction('rw', db.pagos_realizados, async () => {
    await db.pagos_realizados.bulkAdd(nuevosPagos)
  })

  return nuevosPagos
}

/**
 * Actualiza un pago realizado
 */
export async function updatePagoRealizado(id: string, cambios: Partial<Omit<PagoRealizado, 'id' | 'created_at'>>): Promise<void> {
  await db.pagos_realizados.update(id, {
    ...cambios,
    updated_at: new Date().toISOString(),
    _dirty: true,
  })
}

/**
 * Obtiene un pago por ID
 */
export async function getPagoRealizadoById(id: string): Promise<PagoRealizado | undefined> {
  return await db.pagos_realizados.get(id)
}

/**
 * Obtiene todos los pagos de una solicitud
 */
export async function getPagosBySolicitud(solicitudId: string): Promise<PagoRealizado[]> {
  return await db.pagos_realizados
    .where('solicitud_pago_id')
    .equals(solicitudId)
    .and(pago => pago.active !== false && pago._deleted !== true)
    .toArray()
}

/**
 * Obtiene todos los pagos de una requisición
 */
export async function getPagosByRequisicion(requisicionId: string): Promise<PagoRealizado[]> {
  return await db.pagos_realizados
    .where('requisicion_pago_id')
    .equals(requisicionId)
    .and(pago => pago.active !== false && pago._deleted !== true)
    .toArray()
}

/**
 * Obtiene todos los pagos de un contrato
 */
export async function getPagosByContrato(contratoId: string): Promise<PagoRealizado[]> {
  return await db.pagos_realizados
    .where('contrato_id')
    .equals(contratoId)
    .and(pago => pago.active !== false && pago._deleted !== true)
    .toArray()
}

/**
 * Obtiene todos los pagos de un concepto específico
 */
export async function getPagosByConcepto(conceptoId: string): Promise<PagoRealizado[]> {
  return await db.pagos_realizados
    .where('concepto_contrato_id')
    .equals(conceptoId)
    .and(pago => pago.active !== false && pago._deleted !== true)
    .toArray()
}



/**
 * Obtiene pagos realizados en un rango de fechas
 */
export async function getPagosByPeriodo(fechaInicio: string, fechaFin: string): Promise<PagoRealizado[]> {
  return await db.pagos_realizados
    .where('fecha_pago')
    .between(fechaInicio, fechaFin, true, true)
    .and(pago => pago.active !== false && pago._deleted !== true)
    .toArray()
}

/**
 * Obtiene pagos por estatus
 */
export async function getPagosByEstatus(estatus: string): Promise<PagoRealizado[]> {
  return await db.pagos_realizados
    .where('estatus')
    .equals(estatus)
    .and(pago => pago.active !== false && pago._deleted !== true)
    .toArray()
}

/**
 * Calcula el total pagado de un contrato
 */
export async function getTotalPagadoContrato(contratoId: string): Promise<number> {
  const pagos = await getPagosByContrato(contratoId)
  return pagos.reduce((total, pago) => total + pago.monto_neto_pagado, 0)
}

/**
 * Calcula el total retenido de un contrato
 */
export async function getTotalRetenidoContrato(contratoId: string): Promise<number> {
  const pagos = await getPagosByContrato(contratoId)
  return pagos.reduce((total, pago) => total + pago.retencion_monto, 0)
}

/**
 * Calcula el total amortizado de anticipo de un contrato
 */
export async function getTotalAmortizadoContrato(contratoId: string): Promise<number> {
  const pagos = await getPagosByContrato(contratoId)
  return pagos.reduce((total, pago) => total + pago.anticipo_monto, 0)
}

/**
 * Obtiene un resumen financiero de un contrato
 */
export async function getResumenFinancieroContrato(contratoId: string) {
  const pagos = await getPagosByContrato(contratoId)
  
  return {
    total_bruto: pagos.reduce((sum, p) => sum + p.monto_bruto, 0),
    total_retenciones: pagos.reduce((sum, p) => sum + p.retencion_monto, 0),
    total_amortizaciones: pagos.reduce((sum, p) => sum + p.anticipo_monto, 0),
    total_neto_pagado: pagos.reduce((sum, p) => sum + p.monto_neto_pagado, 0),
    numero_pagos: pagos.length,
    ultimo_pago: pagos.length > 0 ? pagos.sort((a, b) => 
      new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime()
    )[0] : null
  }
}

/**
 * Obtiene pagos agrupados por concepto para un contrato
 */
export async function getPagosAgrupadosPorConcepto(contratoId: string) {
  const pagos = await getPagosByContrato(contratoId)
  
  const agrupados = pagos.reduce((acc, pago) => {
    const key = pago.concepto_contrato_id
    if (!acc[key]) {
      acc[key] = {
        concepto_id: pago.concepto_contrato_id,
        clave: pago.concepto_clave,
        descripcion: pago.concepto_descripcion,
        pagos: [],
        total_bruto: 0,
        total_retenciones: 0,
        total_amortizaciones: 0,
        total_neto: 0,
      }
    }
    
    acc[key].pagos.push(pago)
    acc[key].total_bruto += pago.monto_bruto
    acc[key].total_retenciones += pago.retencion_monto
    acc[key].total_amortizaciones += pago.anticipo_monto
    acc[key].total_neto += pago.monto_neto_pagado
    
    return acc
  }, {} as Record<string, any>)
  
  return Object.values(agrupados)
}

/**
 * Soft delete de un pago (marca como eliminado)
 */
export async function deletePagoRealizado(id: string): Promise<void> {
  await db.pagos_realizados.update(id, {
    _deleted: true,
    _dirty: true,
    updated_at: new Date().toISOString(),
  })
}

/**
 * Verifica si un concepto ya tiene pagos registrados
 */
export async function conceptoTienePagos(conceptoId: string): Promise<boolean> {
  const count = await db.pagos_realizados
    .where('concepto_contrato_id')
    .equals(conceptoId)
    .and(pago => pago.active !== false && pago._deleted !== true)
    .count()
  
  return count > 0
}
