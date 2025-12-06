/**
 * Sistema de Auditoría
 * Registra TODAS las acciones críticas del sistema para cumplimiento y trazabilidad
 * 
 * Acciones auditadas:
 * - Catálogo: subido, aprobado, rechazado
 * - Cambios: creados, aprobados, rechazados, aplicados
 * - Requisiciones: creadas, factura subida
 * - Solicitudes: creadas, Vo.Bo., aprobadas
 * - Pagos: realizados, comprobantes subidos
 */

import { db } from '@/db/database';
import { syncService } from '@/sync/syncService';
import { v4 as uuidv4 } from 'uuid';

export type TipoAccionAudit =
  // Catálogos
  | 'CATALOGO_SUBIDO'
  | 'CATALOGO_APROBADO'
  | 'CATALOGO_RECHAZADO'
  // Cambios
  | 'CAMBIO_CREADO'
  | 'CAMBIO_APROBADO'
  | 'CAMBIO_RECHAZADO'
  | 'CAMBIO_APLICADO'
  // Requisiciones
  | 'REQUISICION_CREADA'
  | 'REQUISICION_EDITADA'
  | 'REQUISICION_ELIMINADA'
  | 'FACTURA_SUBIDA'
  | 'FACTURA_REEMPLAZADA'
  // Solicitudes
  | 'SOLICITUD_CREADA'
  | 'SOLICITUD_EDITADA'
  | 'VOBO_DESARROLLADOR_DADO'
  | 'VOBO_DESARROLLADOR_REMOVIDO'
  | 'VOBO_FINANZAS_DADO'
  | 'VOBO_FINANZAS_REMOVIDO'
  | 'SOLICITUD_APROBADA'
  | 'SOLICITUD_RECHAZADA'
  // Pagos
  | 'PAGO_REGISTRADO'
  | 'PAGO_PARCIAL'
  | 'COMPROBANTE_SUBIDO'
  // Contratos
  | 'CONTRATO_CREADO'
  | 'CONTRATO_EDITADO'
  | 'CONTRATO_ELIMINADO'
  // Contratistas
  | 'CONTRATISTA_CREADO'
  | 'CONTRATISTA_EDITADO'
  | 'CONTRATISTA_ELIMINADO';

export interface AuditLogEntry {
  id: string;
  tipo_accion: TipoAccionAudit;
  usuario_id: string;
  usuario_email: string;
  usuario_rol: string;
  descripcion: string;
  recurso_tipo: string;
  recurso_id: string;
  recurso_nombre?: string;
  datos_anteriores?: any;
  datos_nuevos?: any;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  proyecto_id?: string;
  contrato_id?: string;
  _dirty?: boolean;
}

/**
 * Servicio principal de auditoría
 */
export class AuditService {
  
  /**
   * Registra una acción en el log de auditoría
   */
  static async log(data: {
    tipo: TipoAccionAudit;
    descripcion: string;
    usuario: {
      id: string;
      email: string;
      rol: string;
    };
    recurso: {
      tipo: string;
      id: string;
      nombre?: string;
    };
    datosAnteriores?: any;
    datosNuevos?: any;
    metadata?: Record<string, any>;
    contratoId?: string;
    proyectoId?: string;
  }): Promise<void> {
    try {
      const entry: AuditLogEntry = {
        id: uuidv4(),
        tipo_accion: data.tipo,
        usuario_id: data.usuario.id,
        usuario_email: data.usuario.email,
        usuario_rol: data.usuario.rol,
        descripcion: data.descripcion,
        recurso_tipo: data.recurso.tipo,
        recurso_id: data.recurso.id,
        recurso_nombre: data.recurso.nombre,
        datos_anteriores: data.datosAnteriores,
        datos_nuevos: data.datosNuevos,
        metadata: data.metadata || {},
        timestamp: new Date().toISOString(),
        contrato_id: data.contratoId,
        proyecto_id: data.proyectoId,
        _dirty: true,
      };

      // TODO: Guardar en IndexedDB cuando se cree la tabla audit_log
      // Por ahora, solo registrar en consola
      console.log('📝 Audit log:', {
        tipo: data.tipo,
        descripcion: data.descripcion,
        usuario: data.usuario.email,
        recurso: `${data.recurso.tipo}:${data.recurso.id}`,
        timestamp: entry.timestamp,
      });

      // Opcional: Guardar en localStorage como backup temporal
      try {
        const auditLogs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
        auditLogs.push(entry);
        // Mantener solo últimos 100 logs
        if (auditLogs.length > 100) {
          auditLogs.shift();
        }
        localStorage.setItem('audit_logs', JSON.stringify(auditLogs));
      } catch (e) {
        // Ignorar errores de localStorage
      }
    } catch (error) {
      console.error('❌ Error registrando audit log:', error);
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  /**
   * Obtiene el usuario actual del contexto
   */
  private static async getCurrentUser(): Promise<{ id: string; email: string; rol: string } | null> {
    try {
      // Intentar obtener de localStorage (sesión activa)
      const authUser = localStorage.getItem('supabase.auth.token');
      if (authUser) {
        const parsed = JSON.parse(authUser);
        const user = parsed.currentSession?.user;
        
        if (user) {
          return {
            id: user.id,
            email: user.email || 'unknown',
            rol: user.user_metadata?.roles?.[0] || 'unknown',
          };
        }
      }
    } catch (error) {
      console.error('Error obteniendo usuario actual:', error);
    }
    
    return null;
  }

  // ============================================
  // MÉTODOS ESPECÍFICOS POR MÓDULO
  // ============================================

  /**
   * Registra subida de catálogo
   */
  static async logCatalogoSubido(
    contratoId: string,
    numeroContrato: string,
    usuario: { id: string; email: string; rol: string },
    conceptosCount: number
  ): Promise<void> {
    await this.log({
      tipo: 'CATALOGO_SUBIDO',
      descripcion: `Catálogo ordinario subido con ${conceptosCount} conceptos`,
      usuario,
      recurso: {
        tipo: 'contrato',
        id: contratoId,
        nombre: numeroContrato,
      },
      metadata: {
        conceptosCount,
      },
      contratoId,
    });
  }

  /**
   * Registra aprobación de catálogo
   */
  static async logCatalogoAprobado(
    contratoId: string,
    numeroContrato: string,
    usuario: { id: string; email: string; rol: string }
  ): Promise<void> {
    await this.log({
      tipo: 'CATALOGO_APROBADO',
      descripcion: `Catálogo ordinario aprobado por ${usuario.rol}`,
      usuario,
      recurso: {
        tipo: 'contrato',
        id: contratoId,
        nombre: numeroContrato,
      },
      contratoId,
    });
  }

  /**
   * Registra creación de cambio
   */
  static async logCambioCreado(
    cambioId: string,
    tipoCambio: string,
    folio: string,
    contratoId: string,
    usuario: { id: string; email: string; rol: string },
    monto: number
  ): Promise<void> {
    await this.log({
      tipo: 'CAMBIO_CREADO',
      descripcion: `${tipoCambio} ${folio} creada por $${monto.toLocaleString()}`,
      usuario,
      recurso: {
        tipo: 'cambio_contrato',
        id: cambioId,
        nombre: folio,
      },
      metadata: {
        tipoCambio,
        monto,
      },
      contratoId,
    });
  }

  /**
   * Registra aprobación de cambio
   */
  static async logCambioAprobado(
    cambioId: string,
    folio: string,
    contratoId: string,
    usuario: { id: string; email: string; rol: string }
  ): Promise<void> {
    await this.log({
      tipo: 'CAMBIO_APROBADO',
      descripcion: `Cambio ${folio} aprobado por ${usuario.rol}`,
      usuario,
      recurso: {
        tipo: 'cambio_contrato',
        id: cambioId,
        nombre: folio,
      },
      contratoId,
    });
  }

  /**
   * Registra aplicación de cambio
   */
  static async logCambioAplicado(
    cambioId: string,
    folio: string,
    contratoId: string,
    usuario: { id: string; email: string; rol: string }
  ): Promise<void> {
    await this.log({
      tipo: 'CAMBIO_APLICADO',
      descripcion: `Cambio ${folio} aplicado al catálogo`,
      usuario,
      recurso: {
        tipo: 'cambio_contrato',
        id: cambioId,
        nombre: folio,
      },
      contratoId,
    });
  }

  /**
   * Registra creación de requisición
   */
  static async logRequisicionCreada(
    requisicionId: string,
    numero: string,
    contratoId: string,
    usuario: { id: string; email: string; rol: string },
    monto: number
  ): Promise<void> {
    await this.log({
      tipo: 'REQUISICION_CREADA',
      descripcion: `Requisición ${numero} creada por $${monto.toLocaleString()}`,
      usuario,
      recurso: {
        tipo: 'requisicion_pago',
        id: requisicionId,
        nombre: numero,
      },
      metadata: {
        monto,
      },
      contratoId,
    });
  }

  /**
   * Registra subida de factura
   */
  static async logFacturaSubida(
    requisicionId: string,
    numero: string,
    contratoId: string,
    usuario: { id: string; email: string; rol: string },
    facturaUrl: string
  ): Promise<void> {
    await this.log({
      tipo: 'FACTURA_SUBIDA',
      descripcion: `Factura subida para requisición ${numero}`,
      usuario,
      recurso: {
        tipo: 'requisicion_pago',
        id: requisicionId,
        nombre: numero,
      },
      metadata: {
        facturaUrl,
      },
      contratoId,
    });
  }

  /**
   * Registra creación de solicitud
   */
  static async logSolicitudCreada(
    solicitudId: string,
    folio: string,
    usuario: { id: string; email: string; rol: string },
    monto: number
  ): Promise<void> {
    await this.log({
      tipo: 'SOLICITUD_CREADA',
      descripcion: `Solicitud ${folio} creada por $${monto.toLocaleString()}`,
      usuario,
      recurso: {
        tipo: 'solicitud_pago',
        id: solicitudId,
        nombre: folio,
      },
      metadata: {
        monto,
      },
    });
  }

  /**
   * Registra Vo.Bo. de Desarrollador
   */
  static async logVoBoDesarrollador(
    solicitudId: string,
    folio: string,
    usuario: { id: string; email: string; rol: string },
    dado: boolean
  ): Promise<void> {
    await this.log({
      tipo: dado ? 'VOBO_DESARROLLADOR_DADO' : 'VOBO_DESARROLLADOR_REMOVIDO',
      descripcion: `Vo.Bo. Desarrollador ${dado ? 'dado' : 'removido'} por ${usuario.email}`,
      usuario,
      recurso: {
        tipo: 'solicitud_pago',
        id: solicitudId,
        nombre: folio,
      },
    });
  }

  /**
   * Registra Vo.Bo. de Finanzas
   */
  static async logVoBoFinanzas(
    solicitudId: string,
    folio: string,
    usuario: { id: string; email: string; rol: string },
    dado: boolean
  ): Promise<void> {
    await this.log({
      tipo: dado ? 'VOBO_FINANZAS_DADO' : 'VOBO_FINANZAS_REMOVIDO',
      descripcion: `Vo.Bo. Finanzas ${dado ? 'dado' : 'removido'} por ${usuario.email}`,
      usuario,
      recurso: {
        tipo: 'solicitud_pago',
        id: solicitudId,
        nombre: folio,
      },
    });
  }

  /**
   * Registra pago realizado
   */
  static async logPagoRealizado(
    solicitudId: string,
    folio: string,
    usuario: { id: string; email: string; rol: string },
    monto: number,
    esTotal: boolean
  ): Promise<void> {
    await this.log({
      tipo: esTotal ? 'PAGO_REGISTRADO' : 'PAGO_PARCIAL',
      descripcion: `Pago ${esTotal ? 'total' : 'parcial'} de $${monto.toLocaleString()} registrado`,
      usuario,
      recurso: {
        tipo: 'solicitud_pago',
        id: solicitudId,
        nombre: folio,
      },
      metadata: {
        monto,
        esTotal,
      },
    });
  }

  /**
   * Registra subida de comprobante de pago
   */
  static async logComprobanteSubido(
    solicitudId: string,
    folio: string,
    usuario: { id: string; email: string; rol: string },
    comprobanteUrl: string
  ): Promise<void> {
    await this.log({
      tipo: 'COMPROBANTE_SUBIDO',
      descripcion: `Comprobante de pago subido para solicitud ${folio}`,
      usuario,
      recurso: {
        tipo: 'solicitud_pago',
        id: solicitudId,
        nombre: folio,
      },
      metadata: {
        comprobanteUrl,
      },
    });
  }

  // ============================================
  // CONSULTAS
  // ============================================

  /**
   * Obtiene el historial de auditoría de un recurso
   */
  static async getHistorial(
    recursoId: string,
    recursoTipo?: string
  ): Promise<AuditLogEntry[]> {
    try {
      // Leer de localStorage temporalmente
      const auditLogs: AuditLogEntry[] = JSON.parse(localStorage.getItem('audit_logs') || '[]');
      
      // Filtrar por recurso
      let logs = auditLogs.filter((l: AuditLogEntry) => l.recurso_id === recursoId);
      
      // Filtrar por tipo si se especifica
      if (recursoTipo) {
        logs = logs.filter((l: AuditLogEntry) => l.recurso_tipo === recursoTipo);
      }
      
      return logs;
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      return [];
    }
  }

  /**
   * Obtiene logs por usuario
   */
  static async getLogsByUsuario(
    usuarioId: string,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    try {
      const auditLogs: AuditLogEntry[] = JSON.parse(localStorage.getItem('audit_logs') || '[]');
      
      let logs = auditLogs.filter((l: AuditLogEntry) => l.usuario_id === usuarioId);
      
      // Ordenar por timestamp descendente
      logs = logs.sort((a: AuditLogEntry, b: AuditLogEntry) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // Aplicar límite
      return logs.slice(0, limit);
    } catch (error) {
      console.error('Error obteniendo logs por usuario:', error);
      return [];
    }
  }

  /**
   * Obtiene logs por tipo de acción
   */
  static async getLogsByTipo(
    tipo: TipoAccionAudit,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    try {
      const auditLogs: AuditLogEntry[] = JSON.parse(localStorage.getItem('audit_logs') || '[]');
      
      let logs = auditLogs.filter((l: AuditLogEntry) => l.tipo_accion === tipo);
      
      // Ordenar por timestamp descendente
      logs = logs.sort((a: AuditLogEntry, b: AuditLogEntry) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // Aplicar límite
      return logs.slice(0, limit);
    } catch (error) {
      console.error('Error obteniendo logs por tipo:', error);
      return [];
    }
  }

  /**
   * Obtiene estadísticas de auditoría
   */
  static async getStats(): Promise<{
    total: number;
    porTipo: Record<string, number>;
    porUsuario: Record<string, number>;
    ultimos7Dias: number;
  }> {
    try {
      const auditLogs: AuditLogEntry[] = JSON.parse(localStorage.getItem('audit_logs') || '[]');
      const hace7Dias = new Date();
      hace7Dias.setDate(hace7Dias.getDate() - 7);

      const stats = {
        total: auditLogs.length,
        porTipo: {} as Record<string, number>,
        porUsuario: {} as Record<string, number>,
        ultimos7Dias: auditLogs.filter((l: AuditLogEntry) => 
          new Date(l.timestamp) >= hace7Dias
        ).length,
      };

      auditLogs.forEach((log: AuditLogEntry) => {
        stats.porTipo[log.tipo_accion] = (stats.porTipo[log.tipo_accion] || 0) + 1;
        stats.porUsuario[log.usuario_email] = (stats.porUsuario[log.usuario_email] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error obteniendo stats:', error);
      return { total: 0, porTipo: {}, porUsuario: {}, ultimos7Dias: 0 };
    }
  }
}
