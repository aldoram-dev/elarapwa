/**
 * Validador de Flujo de Negocio
 * Centraliza TODAS las validaciones del flujo de trabajo
 * 
 * Evita que se creen registros inválidos o se salten pasos del proceso
 */

import { Contrato } from '@/types/contrato';
import { RequisicionPago } from '@/types/requisicion-pago';
import { SolicitudPago } from '@/types/solicitud-pago';
import { ConceptoContrato } from '@/types/concepto-contrato';
import { CambioContrato } from '@/types/cambio-contrato';

export class FlujoValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'FlujoValidationError';
  }
}

/**
 * Clase principal de validación de flujo
 */
export class FlujoValidator {
  
  // ============================================
  // VALIDACIONES DE CONTRATOS
  // ============================================

  /**
   * Valida que se puede crear un contrato
   */
  static validarCreacionContrato(data: Partial<Contrato>): void {
    if (!data.contratista_id) {
      throw new FlujoValidationError(
        'Debe seleccionar un contratista',
        'CONTRATISTA_REQUERIDO'
      );
    }

    if (!data.clave_contrato?.trim()) {
      throw new FlujoValidationError(
        'La clave de contrato es requerida',
        'CLAVE_CONTRATO_REQUERIDA'
      );
    }

    if (!data.nombre?.trim()) {
      throw new FlujoValidationError(
        'El nombre del contrato es requerido',
        'NOMBRE_CONTRATO_REQUERIDO'
      );
    }

    if (!data.monto_contrato || data.monto_contrato <= 0) {
      throw new FlujoValidationError(
        'El monto del contrato debe ser mayor a 0',
        'MONTO_INVALIDO'
      );
    }
  }

  /**
   * Valida que se puede subir un catálogo ordinario
   */
  static validarSubidaCatalogo(contrato: Contrato, conceptos: ConceptoContrato[]): void {
    if (!contrato) {
      throw new FlujoValidationError(
        'Contrato no encontrado',
        'CONTRATO_NO_ENCONTRADO'
      );
    }

    if (conceptos.length === 0) {
      throw new FlujoValidationError(
        'Debe agregar al menos un concepto al catálogo',
        'CATALOGO_VACIO'
      );
    }

    // Validar que todos los conceptos tengan datos válidos
    const conceptosInvalidos = conceptos.filter(c => 
      !c.clave || 
      !c.concepto || 
      c.cantidad_catalogo <= 0 || 
      c.precio_unitario_catalogo <= 0
    );

    if (conceptosInvalidos.length > 0) {
      throw new FlujoValidationError(
        `Hay ${conceptosInvalidos.length} conceptos con datos incompletos o inválidos`,
        'CONCEPTOS_INVALIDOS',
        { conceptosInvalidos }
      );
    }
  }

  /**
   * Valida que se puede aprobar un catálogo
   */
  static validarAprobacionCatalogo(contrato: Contrato, conceptos: ConceptoContrato[]): void {
    if (contrato.catalogo_aprobado) {
      throw new FlujoValidationError(
        'Este catálogo ya está aprobado',
        'CATALOGO_YA_APROBADO'
      );
    }

    if (conceptos.length === 0) {
      throw new FlujoValidationError(
        'No hay conceptos para aprobar',
        'CATALOGO_VACIO'
      );
    }

    // Validar que el catálogo tenga un monto razonable
    const montoTotal = conceptos.reduce((sum, c) => sum + c.importe_catalogo, 0);
    if (montoTotal <= 0) {
      throw new FlujoValidationError(
        'El monto total del catálogo debe ser mayor a 0',
        'MONTO_CATALOGO_INVALIDO'
      );
    }
  }

  // ============================================
  // VALIDACIONES DE CAMBIOS
  // ============================================

  /**
   * Valida que se puede crear un cambio (aditiva/deductiva)
   */
  static validarCreacionCambio(
    contrato: Contrato,
    tipo: 'ADITIVA' | 'DEDUCTIVA' | 'EXTRAORDINARIA' | 'DESCUENTO_EXTRA',
    detalles: any[]
  ): void {
    if (!contrato.catalogo_aprobado) {
      throw new FlujoValidationError(
        'No se pueden agregar cambios hasta que el catálogo ordinario esté aprobado',
        'CATALOGO_NO_APROBADO'
      );
    }

    if (detalles.length === 0) {
      throw new FlujoValidationError(
        'Debe agregar al menos un concepto al cambio',
        'CAMBIO_VACIO'
      );
    }

    // Validar montos según tipo
    const montoTotal = detalles.reduce((sum, d) => sum + (d.importe || 0), 0);
    if (montoTotal <= 0) {
      throw new FlujoValidationError(
        'El monto total del cambio debe ser mayor a 0',
        'MONTO_CAMBIO_INVALIDO'
      );
    }
  }

  /**
   * Valida que se puede aprobar un cambio
   */
  static validarAprobacionCambio(cambio: CambioContrato): void {
    if (cambio.estatus === 'APLICADO') {
      throw new FlujoValidationError(
        'Este cambio ya está aplicado',
        'CAMBIO_YA_APLICADO'
      );
    }

    if (cambio.estatus === 'RECHAZADO') {
      throw new FlujoValidationError(
        'No se puede aprobar un cambio rechazado',
        'CAMBIO_RECHAZADO'
      );
    }
  }

  /**
   * Valida que se puede aplicar un cambio
   */
  static validarAplicacionCambio(cambio: CambioContrato): void {
    if (cambio.estatus !== 'APROBADO') {
      throw new FlujoValidationError(
        'Solo se pueden aplicar cambios aprobados',
        'CAMBIO_NO_APROBADO'
      );
    }
  }

  // ============================================
  // VALIDACIONES DE REQUISICIONES
  // ============================================

  /**
   * Valida que se puede crear una requisición
   */
  static validarCreacionRequisicion(contrato: Contrato, conceptos: any[]): void {
    if (!contrato.catalogo_aprobado) {
      throw new FlujoValidationError(
        'No se pueden crear requisiciones hasta que el catálogo ordinario esté aprobado.\n\n' +
        'Pasos requeridos:\n' +
        '1. El contratista debe subir el catálogo de conceptos\n' +
        '2. Un administrador debe aprobar el catálogo\n\n' +
        'Una vez aprobado, podrás crear requisiciones.',
        'CATALOGO_NO_APROBADO'
      );
    }

    if (conceptos.length === 0) {
      throw new FlujoValidationError(
        'Debe agregar al menos un concepto a la requisición',
        'REQUISICION_VACIA'
      );
    }

    // Validar que todos los conceptos tengan volumen > 0
    const conceptosInvalidos = conceptos.filter(c => 
      !c.cantidad_avance || c.cantidad_avance <= 0
    );

    if (conceptosInvalidos.length > 0) {
      throw new FlujoValidationError(
        `Hay ${conceptosInvalidos.length} conceptos sin cantidad de avance válida`,
        'CONCEPTOS_SIN_AVANCE',
        { conceptosInvalidos }
      );
    }

    // Validar que el total sea mayor a 0
    const total = conceptos.reduce((sum, c) => sum + (c.importe_avance || 0), 0);
    if (total <= 0) {
      throw new FlujoValidationError(
        'El total de la requisición debe ser mayor a 0',
        'TOTAL_INVALIDO'
      );
    }
  }

  /**
   * Valida que se puede subir factura a una requisición
   */
  static validarSubidaFactura(requisicion: RequisicionPago): void {
    if (!requisicion) {
      throw new FlujoValidationError(
        'Requisición no encontrada',
        'REQUISICION_NO_ENCONTRADA'
      );
    }

    if (requisicion.factura_url) {
      throw new FlujoValidationError(
        'Esta requisición ya tiene una factura asignada',
        'FACTURA_YA_EXISTE'
      );
    }
  }

  // ============================================
  // VALIDACIONES DE SOLICITUDES
  // ============================================

  /**
   * Valida que se puede crear una solicitud
   */
  static validarCreacionSolicitud(requisicion: RequisicionPago): void {
    if (!requisicion) {
      throw new FlujoValidationError(
        'Requisición no encontrada',
        'REQUISICION_NO_ENCONTRADA'
      );
    }

    if (!requisicion.factura_url) {
      throw new FlujoValidationError(
        'La requisición debe tener una factura antes de crear la solicitud de pago',
        'REQUISICION_SIN_FACTURA'
      );
    }

    if (requisicion.total <= 0) {
      throw new FlujoValidationError(
        'El monto de la requisición debe ser mayor a 0',
        'MONTO_REQUISICION_INVALIDO'
      );
    }
  }

  /**
   * Valida que se puede dar Vo.Bo. a una solicitud
   */
  static validarVoBo(solicitud: SolicitudPago, tipo: 'DESARROLLADOR' | 'FINANZAS'): void {
    if (!solicitud) {
      throw new FlujoValidationError(
        'Solicitud no encontrada',
        'SOLICITUD_NO_ENCONTRADA'
      );
    }

    if (solicitud.estado === 'pagada') {
      throw new FlujoValidationError(
        'No se puede modificar Vo.Bo. de una solicitud ya pagada',
        'SOLICITUD_YA_PAGADA'
      );
    }

    if (solicitud.estado === 'rechazada') {
      throw new FlujoValidationError(
        'No se puede dar Vo.Bo. a una solicitud rechazada',
        'SOLICITUD_RECHAZADA'
      );
    }
  }

  // ============================================
  // VALIDACIONES DE PAGOS
  // ============================================

  /**
   * Valida que se puede realizar un pago
   */
  static validarRealizacionPago(solicitud: SolicitudPago, montoPago: number): void {
    if (!solicitud) {
      throw new FlujoValidationError(
        'Solicitud no encontrada',
        'SOLICITUD_NO_ENCONTRADA'
      );
    }

    // Verificar que tenga ambos Vo.Bo.
    if (!solicitud.vobo_desarrollador || !solicitud.vobo_finanzas) {
      throw new FlujoValidationError(
        'La solicitud debe tener ambos Vo.Bo. (Desarrollador y Finanzas) antes de pagar',
        'VOBOS_INCOMPLETOS'
      );
    }

    if (solicitud.estado !== 'aprobada' && solicitud.estado !== 'pendiente') {
      throw new FlujoValidationError(
        'Solo se pueden pagar solicitudes aprobadas',
        'SOLICITUD_NO_APROBADA'
      );
    }

    if (montoPago <= 0) {
      throw new FlujoValidationError(
        'El monto a pagar debe ser mayor a 0',
        'MONTO_PAGO_INVALIDO'
      );
    }

    const montoTotal = solicitud.total || 0;
    const montoPagadoActual = solicitud.monto_pagado || 0;
    
    if (montoPago > (montoTotal - montoPagadoActual)) {
      throw new FlujoValidationError(
        'El monto a pagar excede el saldo pendiente de la solicitud',
        'MONTO_EXCEDE_PENDIENTE',
        { 
          montoTotal, 
          montoPagado: montoPagadoActual,
          montoPendiente: montoTotal - montoPagadoActual 
        }
      );
    }
  }

  /**
   * Valida que se puede subir comprobante de pago
   */
  static validarSubidaComprobante(solicitud: SolicitudPago): void {
    if (!solicitud) {
      throw new FlujoValidationError(
        'Solicitud no encontrada',
        'SOLICITUD_NO_ENCONTRADA'
      );
    }

    if (!solicitud.vobo_desarrollador || !solicitud.vobo_finanzas) {
      throw new FlujoValidationError(
        'La solicitud debe tener ambos Vo.Bo. antes de subir comprobante',
        'VOBOS_INCOMPLETOS'
      );
    }
  }

  // ============================================
  // VALIDACIONES GENERALES
  // ============================================

  /**
   * Valida que un archivo es válido
   */
  static validarArchivo(file: File, tiposPermitidos: string[], tamañoMaxMB: number = 10): void {
    if (!file) {
      throw new FlujoValidationError(
        'Debe seleccionar un archivo',
        'ARCHIVO_NO_SELECCIONADO'
      );
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !tiposPermitidos.includes(extension)) {
      throw new FlujoValidationError(
        `Tipo de archivo no permitido. Permitidos: ${tiposPermitidos.join(', ')}`,
        'TIPO_ARCHIVO_INVALIDO',
        { tiposPermitidos, extension }
      );
    }

    const tamañoMB = file.size / (1024 * 1024);
    if (tamañoMB > tamañoMaxMB) {
      throw new FlujoValidationError(
        `El archivo excede el tamaño máximo de ${tamañoMaxMB}MB`,
        'ARCHIVO_MUY_GRANDE',
        { tamañoActual: tamañoMB.toFixed(2), tamañoMax: tamañoMaxMB }
      );
    }
  }

  /**
   * Valida fechas
   */
  static validarFecha(fecha: string | Date, mensaje: string = 'Fecha inválida'): void {
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    
    if (isNaN(fechaObj.getTime())) {
      throw new FlujoValidationError(mensaje, 'FECHA_INVALIDA');
    }
  }

  /**
   * Valida montos
   */
  static validarMonto(monto: number, mensaje: string = 'Monto inválido'): void {
    if (isNaN(monto) || monto < 0) {
      throw new FlujoValidationError(mensaje, 'MONTO_INVALIDO');
    }
  }
}
