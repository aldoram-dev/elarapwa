import { UsuarioDB, Permission, Role, UserPermission, UserRole, SyncMetadata, RequisicionPagoDB, SolicitudPagoDB } from '../db/database';
import type { ConceptoContratoDB } from '@/types/concepto-contrato'
import { supabase } from '../lib/core/supabaseClient';
import { db } from '../db/database';

export interface SyncConfig {
  autoSync: boolean;
  syncInterval: number; // en milisegundos
  maxRetries: number;
  batchSize: number;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  errors: string[];
  lastSync: Date;
}

class SyncService {
  private config: SyncConfig = {
    autoSync: false,
    syncInterval: 30000, // 30 segundos
    maxRetries: 3,
    batchSize: 50
  };

  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;

  constructor() {
    console.log('🔵 SyncService v2.1 inicializado con soporte para cambios_contrato');
    // Permitir habilitar por env var para evitar 404 cuando las tablas no existen
    const enable = (import.meta as any).env?.VITE_ENABLE_SYNC_SERVICE === 'true'
    if (enable) {
      this.config.autoSync = true
      this.startAutoSync()
    }
  }

  // ===================================
  // CONFIGURACIÃ“N DE SINCRONIZACIÃ“N
  // ===================================

  updateConfig(newConfig: Partial<SyncConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (this.config.autoSync) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  private startAutoSync() {
    this.stopAutoSync();
    if (this.config.autoSync) {
      this.syncTimer = setInterval(() => {
        this.syncAll();
      }, this.config.syncInterval);
    }
  }

  private stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // ===================================
  // SINCRONIZACIÃ“N PRINCIPAL
  // ===================================

  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        synced: 0,
        errors: ['SincronizaciÃ³n ya en progreso'],
        lastSync: new Date()
      };
    }

    this.isSyncing = true;
    const errors: string[] = [];
    let totalSynced = 0;

    try {
      // 1. Verificar conexiÃ³n a Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // 2. Sincronizar datos locales â†’ Supabase (push)
      const pushResult = await this.pushLocalChanges();
      totalSynced += pushResult.synced;
      errors.push(...pushResult.errors);

      // 3. Sincronizar datos Supabase â†’ Local (pull)
      const pullResult = await this.pullRemoteChanges();
      totalSynced += pullResult.synced;
      errors.push(...pullResult.errors);

      // 4. Limpiar registros de sync antiguos
      await this.cleanupOldSyncRecords();

      return {
        success: errors.length === 0,
        synced: totalSynced,
        errors,
        lastSync: new Date()
      };
    } catch (error) {
      errors.push(`Error de sincronizaciÃ³n: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return {
        success: false,
        synced: totalSynced,
        errors,
        lastSync: new Date()
      };
    } finally {
      this.isSyncing = false;
    }
  }

  // ===================================
  // PUSH: LOCAL â†’ SUPABASE
  // ===================================

  private async pushLocalChanges(): Promise<SyncResult> {
    const errors: string[] = [];
    let synced = 0;

    try {
      // Obtener registros pendientes de sincronizaciÃ³n usando el mÃ©todo de la DB
      const dirtyRecords = await db.getDirtyRecords();

      // Sincronizar usuarios (DESHABILITADO TEMPORALMENTE para evitar errores 409)
      // for (const user of dirtyRecords.usuarios) {
      //   try {
      //     await this.pushUsuario(user);
      //     await db.markAsSynced('usuarios', [user.id]);
      //     synced++;
      //   } catch (error) {
      //     errors.push(`Error sincronizando usuario ${user.email}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      //   }
      // }

      // Sincronizar requisiciones de pago
      for (const req of dirtyRecords.requisiciones_pago || []) {
        try {
          // 🔍 Validar y corregir constraint antes de enviar
          const subtotal = (req as any).subtotal || 0;
          const iva = (req as any).iva || 0;
          const total = (req as any).total || 0;
          const diferencia = Math.abs(total - (subtotal + iva));
          const llevaIva = (req as any).lleva_iva || false;
          
          console.log('🔍 Validación requisición antes de push:', {
            numero: (req as any).numero,
            subtotal,
            iva,
            total,
            suma_calculada: subtotal + iva,
            diferencia,
            lleva_iva: llevaIva
          });
          
          // Corregir el total si no cumple constraint
          if (diferencia >= 0.05) {
            console.error('⚠️ Corrigiendo total de requisición antes de enviar...', {
              numero: (req as any).numero,
              diferencia,
              valores_originales: { subtotal, iva, total }
            });
            
            // Recalcular desde el principio
            const montoEstimado = (req as any).monto_estimado || 0;
            const amortizacion = (req as any).amortizacion || 0;
            const retencion = (req as any).retencion || 0;
            const otrosDescuentos = (req as any).otros_descuentos || 0;
            
            const subtotalNuevo = parseFloat((montoEstimado - amortizacion - retencion - otrosDescuentos).toFixed(2));
            const ivaNuevo = parseFloat((llevaIva ? subtotalNuevo * 0.16 : 0).toFixed(2));
            const totalNuevo = parseFloat((subtotalNuevo + ivaNuevo).toFixed(2));
            
            console.log('✅ Valores corregidos:', { subtotalNuevo, ivaNuevo, totalNuevo });
            
            // Actualizar en el objeto y en IndexedDB
            (req as any).subtotal = subtotalNuevo;
            (req as any).iva = ivaNuevo;
            (req as any).total = totalNuevo;
            
            await db.requisiciones_pago.update(req.id as string, {
              subtotal: subtotalNuevo,
              iva: ivaNuevo,
              total: totalNuevo
            });
          }
          
          await this.pushRequisicionPago(req as RequisicionPagoDB);
          await db.markAsSynced('requisiciones_pago', [req.id as string]);
          synced++;
        } catch (error) {
          errors.push(`Error sincronizando requisiciÃ³n ${req.numero}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      // Sincronizar conceptos de contrato
      for (const concepto of dirtyRecords.conceptos_contrato || []) {
        try {
          await this.pushConceptoContrato(concepto as unknown as ConceptoContratoDB)
          await db.markAsSynced('conceptos_contrato', [ (concepto as any).id ])
          synced++
        } catch (error) {
          errors.push(`Error sincronizando concepto ${ (concepto as any).clave || (concepto as any).id }: ${error instanceof Error ? error.message : 'Error desconocido'}`)
        }
      }

      // Sincronizar permisos (deshabilitado - tablas no existen)
      // for (const permission of dirtyRecords.permissions) {
      //   try {
      //     await this.pushPermission(permission);
      //     await db.markAsSynced('permissions', [permission.id]);
      //     synced++;
      //   } catch (error) {
      //     errors.push(`Error sincronizando permiso ${permission.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      //   }
      // }

      // Sincronizar roles (deshabilitado - tablas no existen) (deshabilitado - tablas no existen)
      // for (const role of dirtyRecords.roles) {
      //   try {
      //     await this.pushRole(role);
      //     await db.markAsSynced('roles', [role.id]);
      //     synced++;
      //   } catch (error) {
      //     errors.push(`Error sincronizando rol ${role.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      //   }
      // }

      // Sincronizar relaciones usuario-permiso (deshabilitado - tablas no existen) (deshabilitado - tablas no existen)
      // for (const userPermission of dirtyRecords.userPermissions) {
      //   try {
      //     await this.pushUserPermission(userPermission);
      //     await db.markAsSynced('userPermissions', [userPermission.id]);
      //     synced++;
      //   } catch (error) {
      //     errors.push(`Error sincronizando permiso de usuario: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      //   }
      // }

      // Sincronizar relaciones usuario-rol (deshabilitado - tablas no existen) (deshabilitado - tablas no existen)
      // for (const userRole of dirtyRecords.userRoles) {
      //   try {
      //     await this.pushUserRole(userRole);
      //     await db.markAsSynced('userRoles', [userRole.id]);
      //     synced++;
      //   } catch (error) {
      //     errors.push(`Error sincronizando rol de usuario: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      //   }
      // }

      // Sincronizar solicitudes de pago
      for (const sol of dirtyRecords.solicitudes_pago || []) {
        try {
          console.log('â¬†ï¸ Pusheando solicitud:', (sol as any).folio, {
            proyecto_id: (sol as any).proyecto_id,
            requisicion_id: (sol as any).requisicion_id,
            concepto_ids: (sol as any).concepto_ids
          });
          
          // 🔍 Validar y corregir constraint antes de enviar
          const subtotal = (sol as any).subtotal || 0;
          const iva = (sol as any).iva || 0;
          const total = (sol as any).total || 0;
          const diferencia = Math.abs(total - (subtotal + iva));
          const llevaIva = (sol as any).lleva_iva || false;
          
          console.log('🔍 Validación solicitud antes de push:', {
            folio: (sol as any).folio,
            subtotal,
            iva,
            total,
            suma_calculada: subtotal + iva,
            diferencia,
            lleva_iva: llevaIva
          });
          
          // Corregir el total si no cumple constraint
          if (diferencia >= 0.05) {
            console.error('⚠️ Corrigiendo total de solicitud antes de enviar...', {
              folio: (sol as any).folio,
              diferencia
            });
            (sol as any).total = parseFloat((subtotal + iva).toFixed(2));
          }
          
          const savedId = await this.pushSolicitudPago(sol as SolicitudPagoDB);
          const localId = (sol as SolicitudPagoDB).id as number;
          
          // Actualizar el ID local si Supabase devolvió uno diferente
          if (savedId && savedId !== localId) {
            console.log(`🔄 Actualizando ID local de solicitud ${localId} → ${savedId}`);
            
            // Actualizar pagos_realizados que referencian este ID local
            const pagosRelacionados = await db.pagos_realizados
              .where('solicitud_pago_id')
              .equals(localId.toString())
              .toArray();
            
            for (const pago of pagosRelacionados) {
              await db.pagos_realizados.update(pago.id, {
                solicitud_pago_id: savedId.toString()
              });
            }
          }
          
          // marcar como sincronizado usando update directo porque pk puede ser numérico autoincremental
          await db.solicitudes_pago.update(localId, {
            _dirty: false,
            last_sync: new Date().toISOString()
          });
          console.log('✅ Solicitud sincronizada:', (sol as any).folio);
          synced++;
        } catch (error) {
          console.error('âŒ Error pusheando solicitud:', (sol as any).folio, error);
          errors.push(`Error sincronizando solicitud ${ (sol as any).folio }: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      // Sincronizar pagos realizados
      for (const pago of dirtyRecords.pagos_realizados || []) {
        try {
          console.log('⬆️ Pusheando pago realizado:', pago.id, {
            folio_solicitud: pago.folio_solicitud,
            concepto_clave: pago.concepto_clave,
            monto_neto_pagado: pago.monto_neto_pagado
          });
          await this.pushPagoRealizado(pago);
          await db.pagos_realizados.update(pago.id, {
            _dirty: false,
            last_sync: new Date().toISOString()
          });
          console.log('✅ Pago realizado sincronizado:', pago.id);
          synced++;
        } catch (error) {
          console.error('❌ Error pusheando pago realizado:', pago.id, error);
          errors.push(`Error sincronizando pago ${pago.id}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      // Sincronizar cambios de contrato (aditivas/deductivas/extras)
      const cambioIdMap = new Map<string, string>(); // local ID -> Supabase ID
      
      for (const cambio of dirtyRecords.cambios_contrato || []) {
        try {
          console.log('⬆️ Pusheando cambio contrato:', cambio.numero_cambio, cambio.tipo_cambio);
          const supabaseId = await this.pushCambioContrato(cambio as any);
          
          // Guardar mapeo de IDs
          cambioIdMap.set(cambio.id, supabaseId);
          console.log(`🔄 ID local ${cambio.id} -> ID Supabase ${supabaseId}`);
          
          // Actualizar detalles en IndexedDB con el nuevo ID ANTES de sincronizarlos
          // IMPORTANTE: Mantener _dirty=true para que se sincronicen
          const detalles = await db.detalles_aditiva_deductiva
            .where('cambio_contrato_id')
            .equals(cambio.id)
            .toArray();
          
          for (const det of detalles) {
            await db.detalles_aditiva_deductiva.update(det.id, {
              cambio_contrato_id: supabaseId,
              _dirty: true // Mantener dirty para sincronizar con el ID correcto
            });
          }
          console.log(`🔄 Actualizados ${detalles.length} detalles con nuevo cambio_contrato_id (mantienen _dirty=true)`);
          
          // También actualizar deducciones_extra si es tipo DEDUCCION_EXTRA
          if (cambio.tipo_cambio === 'DEDUCCION_EXTRA') {
            const deducciones = await db.deducciones_extra
              .where('cambio_contrato_id')
              .equals(cambio.id)
              .toArray();
            
            for (const ded of deducciones) {
              await db.deducciones_extra.update(ded.id, {
                cambio_contrato_id: supabaseId,
                _dirty: true // Mantener dirty para sincronizar con el ID correcto
              });
            }
            console.log(`🔄 Actualizadas ${deducciones.length} deducciones_extra con nuevo cambio_contrato_id (mantienen _dirty=true)`);
          }
          
          // Si el ID de Supabase es diferente al local, necesitamos reemplazar el registro
          if (supabaseId !== cambio.id) {
            console.log(`🔄 Reemplazando registro local ${cambio.id} con ID Supabase ${supabaseId}`);
            
            // Obtener el registro completo
            const cambioCompleto = await db.cambios_contrato.get(cambio.id);
            if (cambioCompleto) {
              // Eliminar el registro viejo
              await db.cambios_contrato.delete(cambio.id);
              
              // Insertar con el nuevo ID
              await db.cambios_contrato.add({
                ...cambioCompleto,
                id: supabaseId,
                _dirty: false,
                last_sync: new Date().toISOString()
              });
            }
          } else {
            // El ID no cambió, solo actualizar flags
            await db.cambios_contrato.update(cambio.id, {
              _dirty: false,
              last_sync: new Date().toISOString()
            });
          }
          
          console.log('✅ Cambio contrato sincronizado:', cambio.numero_cambio);
          synced++;
        } catch (error) {
          console.error('❌ Error pusheando cambio contrato:', cambio.numero_cambio, error);
          errors.push(`Error sincronizando cambio ${cambio.numero_cambio}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      // Sincronizar detalles aditivas/deductivas (ahora con IDs correctos)
      // Refrescar detalles dirty después de actualizar cambios_contrato
      const detallesDirty = await db.detalles_aditiva_deductiva.filter(d => d._dirty === true).toArray();
      console.log(`📋 Detalles dirty a sincronizar: ${detallesDirty.length}`);
      
      for (const detalle of detallesDirty) {
        try {
          // El cambio_contrato_id ya debe estar actualizado al ID de Supabase
          console.log(`⬆️ Pusheando detalle con cambio_contrato_id: ${detalle.cambio_contrato_id}`);
          
          await this.pushDetalleAditivaDeductiva(detalle as any);
          await db.detalles_aditiva_deductiva.update(detalle.id, {
            _dirty: false,
            last_sync: new Date().toISOString()
          });
          synced++;
        } catch (error) {
          console.error('❌ Error pusheando detalle aditiva/deductiva:', detalle.id, error);
          errors.push(`Error sincronizando detalle aditiva/deductiva ${detalle.id}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      // Sincronizar detalles extras
      console.log(`📋 Detalles EXTRA dirty a sincronizar: ${(dirtyRecords.detalles_extra || []).length}`, dirtyRecords.detalles_extra?.map(d => ({
        id: d.id,
        cambio_id: d.cambio_contrato_id,
        clave: d.concepto_clave,
        cantidad: d.cantidad,
        _dirty: d._dirty
      })));
      
      for (const detalle of dirtyRecords.detalles_extra || []) {
        try {
          console.log(`⬆️ Pusheando detalle extra ${detalle.concepto_clave} (${detalle.id})`);
          await this.pushDetalleExtra(detalle as any);
          await db.detalles_extra.update(detalle.id, {
            _dirty: false,
            last_sync: new Date().toISOString()
          });
          synced++;
          console.log(`✅ Detalle extra sincronizado: ${detalle.concepto_clave}`);
        } catch (error) {
          console.error(`❌ Error sincronizando detalle extra ${detalle.id}:`, error);
          errors.push(`Error sincronizando detalle extra ${detalle.id}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      // Sincronizar deducciones extras (con IDs correctos)
      // Refrescar deducciones dirty después de actualizar cambios_contrato
      const deduccionesDirty = await db.deducciones_extra.filter(d => d._dirty === true).toArray();
      console.log(`📋 Deducciones extra dirty a sincronizar: ${deduccionesDirty.length}`);
      
      for (const deduccion of deduccionesDirty) {
        try {
          // El cambio_contrato_id ya debe estar actualizado al ID de Supabase
          console.log(`⬆️ Pusheando deducción extra ${deduccion.id} con cambio_contrato_id: ${deduccion.cambio_contrato_id}`);
          
          // Verificar que el cambio_contrato existe en Supabase
          const { data: cambioExiste, error: checkError } = await supabase
            .from('cambios_contrato')
            .select('id')
            .eq('id', deduccion.cambio_contrato_id)
            .maybeSingle();
          
          if (checkError) {
            console.error('❌ Error verificando cambio_contrato:', checkError);
            throw checkError;
          }
          
          if (!cambioExiste) {
            console.error('❌ cambio_contrato NO EXISTE en Supabase:', deduccion.cambio_contrato_id);
            throw new Error(`cambio_contrato ${deduccion.cambio_contrato_id} no existe en Supabase`);
          }
          
          console.log('✅ cambio_contrato existe en Supabase, procediendo con INSERT...');
          
          await this.pushDeduccionExtra(deduccion as any);
          await db.deducciones_extra.update(deduccion.id, {
            _dirty: false,
            last_sync: new Date().toISOString()
          });
          synced++;
        } catch (error) {
          console.error('❌ Error pusheando deducción extra:', deduccion.id, error);
          errors.push(`Error sincronizando deducción extra ${deduccion.id}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      // Sincronizar configuraciÃ³n de reglamento
      for (const config of dirtyRecords.reglamento_config || []) {
        try {
          await this.pushReglamentoConfig(config);
          await db.reglamento_config.update(config.id as string, {
            _dirty: false,
            last_sync: new Date().toISOString()
          });
          synced++;
        } catch (error) {
          errors.push(`Error sincronizando reglamento: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      // Sincronizar configuraciÃ³n de minutas
      for (const config of dirtyRecords.minutas_config || []) {
        try {
          await this.pushMinutasConfig(config);
          await db.minutas_config.update(config.id as string, {
            _dirty: false,
            last_sync: new Date().toISOString()
          });
          synced++;
        } catch (error) {
          errors.push(`Error sincronizando minutas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      // Sincronizar configuraciÃ³n de fuerza de trabajo
      for (const config of dirtyRecords.fuerza_trabajo_config || []) {
        try {
          await this.pushFuerzaTrabajoConfig(config);
          await db.fuerza_trabajo_config.update(config.id as string, {
            _dirty: false,
            last_sync: new Date().toISOString()
          });
          synced++;
        } catch (error) {
          errors.push(`Error sincronizando fuerza de trabajo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      // Sincronizar documentos de auditorÃ­a
      for (const doc of dirtyRecords.documentos_auditoria || []) {
        try {
          await this.pushDocumentoAuditoria(doc);
          await db.documentos_auditoria.update(doc.id as string, {
            _dirty: false,
            last_sync: new Date().toISOString()
          });
          synced++;
        } catch (error) {
          // Si es error 400, marcar como sincronizado para evitar loop infinito
          if (error instanceof Error && error.message.includes('400')) {
            console.warn(`⚠️ Tabla documentos_auditoria no existe o tiene error de schema, marcando como sincronizado para evitar loop`);
            await db.documentos_auditoria.update(doc.id as string, {
              _dirty: false,
              last_sync: new Date().toISOString()
            });
          }
          errors.push(`Error sincronizando documento auditorÃ­a: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

    } catch (error) {
      errors.push(`Error en push de cambios locales: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    return {
      success: errors.length === 0,
      synced,
      errors,
      lastSync: new Date()
    };
  }

  private async pushConceptoContrato(concepto: ConceptoContratoDB): Promise<void> {
    // Borrado lÃ³gico â†’ borrar remoto
    if ((concepto as any)._deleted) {
      const { error } = await supabase
        .from('conceptos_contrato')
        .delete()
        .eq('id', concepto.id)
      if (error) throw error
      return
    }

    // Preparar payload permitido por la tabla
    // NOTA: No incluir importe_catalogo ni importe_estimado porque son campos GENERATED ALWAYS en Postgres
    const payload = {
      id: concepto.id,
      contrato_id: concepto.contrato_id,
      partida: concepto.partida,
      subpartida: concepto.subpartida ?? null,
      actividad: concepto.actividad ?? null,
      clave: concepto.clave,
      concepto: concepto.concepto,
      unidad: concepto.unidad,
      cantidad_catalogo: concepto.cantidad_catalogo,
      precio_unitario_catalogo: concepto.precio_unitario_catalogo,
      cantidad_estimada: concepto.cantidad_estimada ?? 0,
      precio_unitario_estimacion: concepto.precio_unitario_estimacion ?? 0,
      volumen_estimado_fecha: concepto.volumen_estimado_fecha ?? 0,
      monto_estimado_fecha: concepto.monto_estimado_fecha ?? 0,
      notas: concepto.notas ?? null,
      orden: concepto.orden ?? 0,
      active: concepto.active ?? true,
      metadata: concepto.metadata || {}
    }

    const { error } = await supabase
      .from('conceptos_contrato')
      .upsert(payload, { onConflict: 'id' })
    
    if (error) {
      console.error('Error al sincronizar concepto:', error);
      throw error;
    }
  }

  private async pushUsuario(usuario: UsuarioDB) {
    // Mapea a tabla real 'perfiles'
    const { error } = await supabase
      .from('usuarios')
      .upsert({
        id: usuario.id,
        email: usuario.email,
        name: usuario.nombre,
        telefono: usuario.telefono,
        avatar_url: usuario.avatar_url,
        nivel: usuario.nivel,
        active: usuario.active,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) throw error;
  }

  private async pushPermission(permission: Permission) {
    const { error } = await supabase
      .from('permisos')
      .upsert({
        id: permission.id,
        name: permission.name,
        description: permission.description,
        resource: permission.resource,
        action: permission.action,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  private async pushRole(role: Role) {
    const { error } = await supabase
      .from('roles')
      .upsert({
        id: role.id,
        name: role.name,
        description: role.description,
        color: role.color,
        permissions: role.permissions,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  private async pushUserPermission(userPermission: UserPermission) {
    const { error } = await supabase
      .from('permisos_usuario')
      .upsert({
        id: userPermission.id,
        user_id: userPermission.user_id,
        permission_id: userPermission.permission_id,
        granted_by: userPermission.granted_by,
        granted_at: userPermission.granted_at,
        expires_at: userPermission.expires_at,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  private async pushUserRole(userRole: UserRole) {
    const { error } = await supabase
      .from('roles_usuario')
      .upsert({
        id: userRole.id,
        user_id: userRole.user_id,
        role_id: userRole.role_id,
        assigned_by: userRole.assigned_by,
        assigned_at: userRole.assigned_at,
        expires_at: userRole.expires_at,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  private async pushRequisicionPago(requisicion: RequisicionPagoDB) {
    const payload = {
      id: requisicion.id,
      created_at: requisicion.created_at,
      updated_at: requisicion.updated_at ?? new Date().toISOString(),
      contrato_id: requisicion.contrato_id,
      numero: requisicion.numero,
      fecha: requisicion.fecha,
      conceptos: requisicion.conceptos ?? [],
      monto_estimado: requisicion.monto_estimado ?? 0,
      amortizacion: requisicion.amortizacion ?? 0,
      retencion: requisicion.retencion ?? 0,
      otros_descuentos: requisicion.otros_descuentos ?? 0,
      retenciones_aplicadas: requisicion.retenciones_aplicadas ?? 0,
      retenciones_regresadas: requisicion.retenciones_regresadas ?? 0,
      lleva_iva: requisicion.lleva_iva ?? false,
      subtotal: parseFloat((requisicion.subtotal ?? 0).toFixed(2)), // 🆕 Agregar subtotal con redondeo
      iva: parseFloat((requisicion.iva ?? 0).toFixed(2)), // 🆕 Agregar IVA con redondeo
      total: parseFloat((requisicion.total ?? 0).toFixed(2)), // 🔵 Asegurar redondeo del total
      descripcion_general: requisicion.descripcion_general ?? null,
      notas: requisicion.notas ?? null,
      respaldo_documental: requisicion.respaldo_documental ?? [],
      factura_url: requisicion.factura_url ?? null,
      estado: requisicion.estado,
      visto_bueno: requisicion.visto_bueno ?? false,
      visto_bueno_por: requisicion.visto_bueno_por ?? null,
      visto_bueno_fecha: requisicion.visto_bueno_fecha ?? null,
      fecha_pago_estimada: requisicion.fecha_pago_estimada ?? null,
      created_by: requisicion.created_by ?? null,
      updated_by: requisicion.updated_by ?? null,
      _deleted: requisicion._deleted ?? false,
    };
    
    console.log('📤 Pushing requisicion to Supabase:', payload);
    
    const { error } = await supabase
      .from('requisiciones_pago')
      .upsert(payload);

    if (error) {
      console.error('❌ Error pushing requisicion:', error);
      throw error;
    }
    
    console.log('✅ Requisicion pushed successfully');
  }

  private async pushSolicitudPago(solicitud: SolicitudPagoDB): Promise<number | undefined> {
    // Validar UUIDs y sanitizar payload antes de enviar
    const isUUID = (v?: string) => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

    if (!isUUID(solicitud.requisicion_id as any)) {
      throw new Error(`requisicion_id invÃ¡lido para solicitud ${solicitud.folio}`);
    }

    const conceptoIds = Array.isArray(solicitud.concepto_ids)
      ? (solicitud.concepto_ids as any[]).map(String).filter(isUUID)
      : [];

    // Upsert por folio para evitar duplicados, devolviendo fila guardada
    const payload: any = {
      folio: solicitud.folio,
      requisicion_id: solicitud.requisicion_id,
      concepto_ids: conceptoIds,
      conceptos_detalle: solicitud.conceptos_detalle || [],
      lleva_iva: solicitud.lleva_iva ?? false, // 🆕 Agregar campo lleva_iva
      subtotal: parseFloat((solicitud.subtotal ?? 0).toFixed(2)), // 🔵 Asegurar redondeo
      iva: parseFloat((solicitud.iva ?? 0).toFixed(2)), // 🆕 Agregar IVA con redondeo
      total: parseFloat((solicitud.total ?? 0).toFixed(2)), // 🔵 Asegurar redondeo
      amortizacion_aplicada: parseFloat((solicitud.amortizacion_aplicada ?? 0).toFixed(2)), // 🆕 Agregar descuentos proporcionales
      retencion_aplicada: parseFloat((solicitud.retencion_aplicada ?? 0).toFixed(2)),
      otros_descuentos_aplicados: parseFloat((solicitud.otros_descuentos_aplicados ?? 0).toFixed(2)),
      deducciones_extras_total: parseFloat((solicitud.deducciones_extras_total ?? 0).toFixed(2)),
      fecha: solicitud.fecha,
      estado: solicitud.estado,
      notas: solicitud.notas ?? null,
      aprobada: solicitud.aprobada ?? false,
      aprobada_por: solicitud.aprobada_por ?? null,
      aprobada_fecha: solicitud.aprobada_fecha ?? null,
      fecha_pago: solicitud.fecha_pago ?? null,
      referencia_pago: solicitud.referencia_pago ?? null,
      // Campos extendidos de gestiÃ³n de pagos (si existen en la BD)
      monto_pagado: Number(solicitud.monto_pagado ?? 0),
      comprobante_pago_url: solicitud.comprobante_pago_url ?? null,
      estatus_pago: solicitud.estatus_pago ?? 'NO PAGADO',
      vobo_desarrollador: solicitud.vobo_desarrollador ?? false,
      vobo_desarrollador_por: solicitud.vobo_desarrollador_por ?? null,
      vobo_desarrollador_fecha: solicitud.vobo_desarrollador_fecha ?? null,
      vobo_finanzas: solicitud.vobo_finanzas ?? false,
      vobo_finanzas_por: solicitud.vobo_finanzas_por ?? null,
      vobo_finanzas_fecha: solicitud.vobo_finanzas_fecha ?? null,
      observaciones_desarrollador: solicitud.observaciones_desarrollador ?? null,
      updated_at: new Date().toISOString(),
      created_at: solicitud.created_at ?? new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('solicitudes_pago')
      .upsert(payload, { onConflict: 'folio' })
      .select()
      .single();

    if (error) throw error;
    return data?.id as number | undefined;
  }

  private async pushPagoRealizado(pago: any): Promise<void> {
    // Resolver solicitud_pago_id desde Supabase usando folio_solicitud
    let solicitudPagoId = null;
    if (pago.folio_solicitud) {
      const { data: solicitudData } = await supabase
        .from('solicitudes_pago')
        .select('id')
        .eq('folio', pago.folio_solicitud)
        .single();
      
      solicitudPagoId = solicitudData?.id || null;
      
      if (!solicitudPagoId) {
        console.warn(`⚠️ No se encontró solicitud con folio ${pago.folio_solicitud} en Supabase. El pago se guardará sin solicitud_pago_id.`);
      }
    }

    const payload: any = {
      id: pago.id,
      solicitud_pago_id: solicitudPagoId,
      requisicion_pago_id: pago.requisicion_pago_id || null,
      contrato_id: pago.contrato_id || null,
      concepto_contrato_id: pago.concepto_contrato_id || null,
      contratista_id: pago.contratista_id || null,
      concepto_clave: pago.concepto_clave,
      concepto_descripcion: pago.concepto_descripcion,
      concepto_unidad: pago.concepto_unidad || null,
      cantidad: Number(pago.cantidad ?? 0),
      precio_unitario: Number(pago.precio_unitario ?? 0),
      importe_concepto: Number(pago.importe_concepto ?? 0),
      monto_bruto: Number(pago.monto_bruto ?? 0),
      retencion_porcentaje: Number(pago.retencion_porcentaje ?? 0),
      retencion_monto: Number(pago.retencion_monto ?? 0),
      anticipo_porcentaje: Number(pago.anticipo_porcentaje ?? 0),
      anticipo_monto: Number(pago.anticipo_monto ?? 0),
      monto_neto_pagado: Number(pago.monto_neto_pagado ?? 0),
      fecha_pago: pago.fecha_pago,
      numero_pago: pago.numero_pago || null,
      metodo_pago: pago.metodo_pago || null,
      referencia_pago: pago.referencia_pago || null,
      comprobante_pago_url: pago.comprobante_pago_url || null,
      factura_url: pago.factura_url || null,
      xml_url: pago.xml_url || null,
      respaldo_documental: pago.respaldo_documental || null,
      folio_solicitud: pago.folio_solicitud,
      folio_requisicion: pago.folio_requisicion,
      numero_contrato: pago.numero_contrato || null,
      estatus: pago.estatus || 'PAGADO',
      pagado_por: pago.pagado_por || null,
      aprobado_por: pago.aprobado_por || null,
      notas: pago.notas || null,
      metadata: pago.metadata || {},
      active: pago.active ?? true,
      updated_at: new Date().toISOString(),
      created_at: pago.created_at || new Date().toISOString(),
    };

    const { error } = await supabase
      .from('pagos_realizados')
      .upsert(payload, { onConflict: 'id' });

    if (error) throw error;
  }

  private async pushCambioContrato(cambio: any): Promise<string> {
    console.log('📤 pushCambioContrato - Datos recibidos:', cambio);
    
    const payload: any = {
      id: cambio.id,
      contrato_id: cambio.contrato_id,
      numero_cambio: cambio.numero_cambio,
      tipo_cambio: cambio.tipo_cambio,
      descripcion: cambio.descripcion || null,
      monto_cambio: Number(cambio.monto_cambio ?? 0),
      monto_contrato_anterior: Number(cambio.monto_contrato_anterior ?? 0),
      monto_contrato_nuevo: Number(cambio.monto_contrato_nuevo ?? 0),
      fecha_cambio: cambio.fecha_cambio,
      estatus: cambio.estatus || 'BORRADOR',
      solicitado_por: cambio.solicitado_por || null,
      aprobado_por: cambio.aprobado_por || null,
      fecha_aprobacion: cambio.fecha_aprobacion || null,
      notas_aprobacion: cambio.notas_aprobacion || null,
      documentos_soporte: cambio.documentos_soporte || null,
      archivo_plantilla_url: cambio.archivo_plantilla_url || null,
      archivo_aprobacion_url: cambio.archivo_aprobacion_url || null,
      active: cambio.active ?? true,
      created_at: cambio.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('📤 pushCambioContrato - Payload a enviar:', payload);

    // Verificar si existe por la constraint única (contrato_id, numero_cambio)
    const { data: existente } = await supabase
      .from('cambios_contrato')
      .select('id')
      .eq('contrato_id', cambio.contrato_id)
      .eq('numero_cambio', cambio.numero_cambio)
      .maybeSingle();

    let supabaseId: string;
    
    if (existente) {
      // Ya existe, hacer UPDATE usando el id encontrado
      console.log('📤 Registro existe con ID:', existente.id, '- haciendo UPDATE');
      supabaseId = existente.id;
      
      // Excluir 'id' del payload para UPDATE (no se puede cambiar la PK)
      const { id, ...updatePayload } = payload;
      
      const { error } = await supabase
        .from('cambios_contrato')
        .update(updatePayload)
        .eq('id', existente.id);
      
      if (error) {
        console.error('❌ pushCambioContrato - Error en UPDATE:', error);
        throw error;
      }
    } else {
      // No existe, hacer INSERT
      console.log('📤 Registro nuevo, haciendo INSERT con ID:', payload.id);
      console.log('📤 Payload completo:', JSON.stringify(payload, null, 2));
      
      const { data, error } = await supabase
        .from('cambios_contrato')
        .insert(payload)
        .select('*')
        .single();
      
      if (error) {
        console.error('❌ pushCambioContrato - Error en INSERT:', error);
        console.error('❌ Payload que causó error:', payload);
        throw error;
      }
      
      if (!data) {
        console.error('❌ INSERT no devolvió datos!');
        throw new Error('INSERT no devolvió datos');
      }
      
      supabaseId = data.id;
      console.log('✅ INSERT exitoso!');
      console.log('   - ID local:', payload.id);
      console.log('   - ID Supabase:', supabaseId);
      console.log('   - Son iguales:', payload.id === supabaseId);
      console.log('   - Registro completo:', data);
    }
    
    console.log('✅ pushCambioContrato - Guardado exitoso, ID Supabase:', supabaseId);
    return supabaseId;
  }

  private async pushDetalleAditivaDeductiva(detalle: any): Promise<void> {
    console.log('📤 pushDetalleAditivaDeductiva - cambio_contrato_id:', detalle.cambio_contrato_id, 'concepto:', detalle.concepto_clave);
    
    const payload: any = {
      id: detalle.id,
      cambio_contrato_id: detalle.cambio_contrato_id,
      concepto_contrato_id: detalle.concepto_contrato_id,
      concepto_clave: detalle.concepto_clave,
      concepto_descripcion: detalle.concepto_descripcion,
      concepto_unidad: detalle.concepto_unidad || null,
      precio_unitario: Number(detalle.precio_unitario ?? 0),
      cantidad_original: Number(detalle.cantidad_original ?? 0),
      cantidad_modificacion: Number(detalle.cantidad_modificacion ?? 0),
      cantidad_nueva: Number(detalle.cantidad_nueva ?? 0),
      importe_modificacion: Number(detalle.importe_modificacion ?? 0),
      active: detalle.active ?? true,
      created_at: detalle.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Verificar si existe por cambio_contrato_id y concepto_contrato_id
    const { data: existente } = await supabase
      .from('detalles_aditiva_deductiva')
      .select('id')
      .eq('cambio_contrato_id', detalle.cambio_contrato_id)
      .eq('concepto_contrato_id', detalle.concepto_contrato_id)
      .maybeSingle();

    if (existente) {
      // Ya existe, hacer UPDATE excluyendo 'id'
      console.log('📤 Detalle existe con ID:', existente.id, '- haciendo UPDATE');
      const { id, ...updatePayload } = payload;
      const { error } = await supabase
        .from('detalles_aditiva_deductiva')
        .update(updatePayload)
        .eq('id', existente.id);
      
      if (error) {
        console.error('❌ Error en UPDATE detalle:', error);
        throw error;
      }
    } else {
      // No existe, hacer INSERT
      console.log('📤 Detalle nuevo, haciendo INSERT con ID:', payload.id);
      const { error } = await supabase
        .from('detalles_aditiva_deductiva')
        .insert(payload);
      
      if (error) {
        console.error('❌ Error en INSERT detalle:', error);
        throw error;
      }
    }
    
    console.log('✅ pushDetalleAditivaDeductiva - Guardado exitoso');
  }

  private async pushDetalleExtra(detalle: any): Promise<void> {
    const payload: any = {
      id: detalle.id,
      cambio_contrato_id: detalle.cambio_contrato_id,
      concepto_clave: detalle.concepto_clave,
      concepto_descripcion: detalle.concepto_descripcion,
      concepto_unidad: detalle.concepto_unidad || null,
      cantidad: Number(detalle.cantidad ?? 0),
      precio_unitario: Number(detalle.precio_unitario ?? 0),
      importe: Number(detalle.importe ?? 0),
      observaciones: detalle.observaciones || null,
      active: detalle.active ?? true,
      created_at: detalle.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Verificar si existe por cambio_contrato_id y concepto_clave
    const { data: existente } = await supabase
      .from('detalles_extra')
      .select('id')
      .eq('cambio_contrato_id', detalle.cambio_contrato_id)
      .eq('concepto_clave', detalle.concepto_clave)
      .maybeSingle();

    if (existente) {
      // Ya existe, hacer UPDATE excluyendo 'id'
      const { id, ...updatePayload } = payload;
      const { error } = await supabase
        .from('detalles_extra')
        .update(updatePayload)
        .eq('id', existente.id);
      
      if (error) throw error;
    } else {
      // No existe, hacer INSERT
      const { error } = await supabase
        .from('detalles_extra')
        .insert(payload);
      
      if (error) throw error;
    }
  }

  private async pushDeduccionExtra(deduccion: any): Promise<void> {
    const payload: any = {
      id: deduccion.id,
      cambio_contrato_id: deduccion.cambio_contrato_id,
      descripcion: deduccion.descripcion,
      monto: Number(deduccion.monto ?? 0),
      active: deduccion.active ?? true,
      created_at: deduccion.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Verificar si existe por cambio_contrato_id y descripcion
    const { data: existente } = await supabase
      .from('deducciones_extra')
      .select('id')
      .eq('cambio_contrato_id', deduccion.cambio_contrato_id)
      .eq('descripcion', deduccion.descripcion)
      .maybeSingle();

    if (existente) {
      // Ya existe, hacer UPDATE excluyendo 'id'
      const { id, ...updatePayload } = payload;
      const { error } = await supabase
        .from('deducciones_extra')
        .update(updatePayload)
        .eq('id', existente.id);
      
      if (error) throw error;
    } else {
      // No existe, hacer INSERT
      const { error } = await supabase
        .from('deducciones_extra')
        .insert(payload);
      
      if (error) throw error;
    }
  }

  private async pushReglamentoConfig(config: any): Promise<void> {
    const payload: any = {
      reglamento_url: config.reglamento_url,
      updated_at: new Date().toISOString(),
      updated_by: config.updated_by ?? null,
    };

    console.log('📤 Pusheando reglamento_config:', { id: config.id, payload });

    if (config.id) {
      // Update
      const { error } = await supabase
        .from('reglamento_config')
        .update(payload)
        .eq('id', config.id);
      if (error) {
        console.error('❌ Error en PATCH reglamento_config:', error);
        throw error;
      }
    } else {
      // Insert
      const { error } = await supabase
        .from('reglamento_config')
        .upsert(payload);
      if (error) throw error;
    }
  }

  private async pushMinutasConfig(config: any): Promise<void> {
    const payload: any = {
      drive_folder_url: config.drive_folder_url,
      updated_at: new Date().toISOString(),
      updated_by: config.updated_by ?? null,
    };

    console.log('📤 Pusheando minutas_config:', { id: config.id, payload });

    if (config.id) {
      // Update
      const { error } = await supabase
        .from('minutas_config')
        .update(payload)
        .eq('id', config.id);
      if (error) {
        console.error('❌ Error en PATCH minutas_config:', error);
        throw error;
      }
    } else {
      // Insert
      const { error } = await supabase
        .from('minutas_config')
        .upsert(payload);
      if (error) throw error;
    }
  }

  private async pushFuerzaTrabajoConfig(config: any): Promise<void> {
    const payload: any = {
      buba_url: config.buba_url,
      updated_at: new Date().toISOString(),
      updated_by: config.updated_by ?? null,
    };

    console.log('📤 Pusheando fuerza_trabajo_config:', { id: config.id, payload });

    if (config.id) {
      // Update
      const { error } = await supabase
        .from('fuerza_trabajo_config')
        .update(payload)
        .eq('id', config.id);
      if (error) {
        console.error('❌ Error en PATCH fuerza_trabajo_config:', error);
        throw error;
      }
    } else {
      // Insert
      const { error } = await supabase
        .from('fuerza_trabajo_config')
        .upsert(payload);
      if (error) throw error;
    }
  }

  private async pushDocumentoAuditoria(doc: any): Promise<void> {
    // Validar que el ID sea UUID válido si existe
    const isValidUUID = (id: any): boolean => {
      if (!id) return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return typeof id === 'string' && uuidRegex.test(id);
    };

    // Si el ID no es válido, rechazar la operación
    if (doc.id && !isValidUUID(doc.id)) {
      console.warn(`⚠️ Documento auditoría con ID inválido (${doc.id}), omitiendo sync`);
      throw new Error('400 Bad Request: ID no válido para documentos_auditoria');
    }

    if (doc._deleted) {
      // Eliminar en Supabase
      const { error } = await supabase
        .from('documentos_auditoria')
        .delete()
        .eq('id', doc.id);
      if (error) throw error;
      
      // Eliminar permanentemente de IndexedDB
      await db.documentos_auditoria.delete(doc.id);
      return;
    }

    const payload: any = {
      especialidad: doc.especialidad,
      numero: doc.numero,
      descripcion: doc.descripcion,
      estatus: doc.estatus,
      no_se_requiere: doc.no_se_requiere,
      fecha_emision: doc.fecha_emision ?? null,
      fecha_vencimiento: doc.fecha_vencimiento ?? null,
      control: doc.control ?? null,
      updated_at: new Date().toISOString(),
      updated_by: doc.updated_by ?? null,
    };

    if (doc.id) {
      // Update
      const { error } = await supabase
        .from('documentos_auditoria')
        .update(payload)
        .eq('id', doc.id);
      if (error) throw error;
    } else {
      // Insert
      const { data, error } = await supabase
        .from('documentos_auditoria')
        .insert(payload)
        .select()
        .single();
      
      if (error) throw error;
      
      // Actualizar ID local con el ID generado por Supabase
      if (data && doc.id) {
        await db.documentos_auditoria.update(doc.id, { id: data.id });
      }
    }
  }

  // ===================================
  // PULL: SUPABASE â†’ LOCAL
  // ===================================

  private async pullRemoteChanges(): Promise<SyncResult> {
    const errors: string[] = [];
    let synced = 0;

    try {
      // Obtener Ãºltima sincronizaciÃ³n
      let lastSync = await this.getLastSyncTimestamp();
      
      // ðŸ” DETECTAR SI IndexedDB estÃ¡ vacÃ­o (borrado) pero lastSync sigue siendo reciente
      // Si hay timestamp reciente PERO tablas crÃ­ticas vacÃ­as â†’ forzar sync completo
      const [reqCount, solCount, conceptosCount] = await Promise.all([
        db.requisiciones_pago.count(),
        db.solicitudes_pago.count(),
        db.conceptos_contrato.count()
      ]);
      
      const isDBEmpty = reqCount === 0 && solCount === 0 && conceptosCount === 0;
      const hasRecentSync = lastSync.getTime() > new Date('2020-01-01').getTime();
      
      if (isDBEmpty && hasRecentSync) {
        console.warn('âš ï¸ IndexedDB vacÃ­o pero lastSync reciente detectado - forzando sync completo desde el origen');
        lastSync = new Date(0); // Epoch = traer TODO desde el inicio
      }
      
      // Obtener cambios desde Supabase
      const usersResult = await this.pullUsers(lastSync);
      // Sistema de permisos deshabilitado temporalmente (tablas no existen)
      // const permissionsResult = await this.pullPermissions(lastSync);
      // const rolesResult = await this.pullRoles(lastSync);
      // const userPermissionsResult = await this.pullUserPermissions(lastSync);
      // const userRolesResult = await this.pullUserRoles(lastSync);
      const requisicionesResult = await this.pullRequisicionesPago(lastSync);
      const solicitudesResult = await this.pullSolicitudesPago(lastSync);
      const conceptosContratoResult = await this.pullConceptosContrato(lastSync);
      const cambiosContratoResult = await this.pullCambiosContrato(lastSync);
      const detallesAditivaDeductivaResult = await this.pullDetallesAditivaDeductiva(lastSync);
      const deduccionesExtraResult = await this.pullDeduccionesExtra(lastSync);
      const pagosRealizadosResult = await this.pullPagosRealizados(lastSync);
      const reglamentoResult = await this.pullReglamentoConfig(lastSync);
      const minutasResult = await this.pullMinutasConfig(lastSync);
      const fuerzaTrabajoResult = await this.pullFuerzaTrabajoConfig(lastSync);
      const documentosAuditoriaResult = await this.pullDocumentosAuditoria(lastSync);

      synced += usersResult.synced;
      // synced += permissionsResult.synced;
      // synced += rolesResult.synced;
      // synced += userPermissionsResult.synced;
      // synced += userRolesResult.synced;
      synced += requisicionesResult.synced;
      synced += solicitudesResult.synced;
      synced += conceptosContratoResult.synced;
      synced += cambiosContratoResult.synced;
      synced += detallesAditivaDeductivaResult.synced;
      synced += deduccionesExtraResult.synced;
      synced += pagosRealizadosResult.synced;
      synced += reglamentoResult.synced;
      synced += minutasResult.synced;
      synced += fuerzaTrabajoResult.synced;
      synced += documentosAuditoriaResult.synced;

      errors.push(...usersResult.errors);
      // errors.push(...permissionsResult.errors);
      // errors.push(...rolesResult.errors);
      // errors.push(...userPermissionsResult.errors);
      // errors.push(...userRolesResult.errors);
      errors.push(...requisicionesResult.errors);
      errors.push(...solicitudesResult.errors);
      errors.push(...conceptosContratoResult.errors);
      errors.push(...cambiosContratoResult.errors);
      errors.push(...detallesAditivaDeductivaResult.errors);
      errors.push(...deduccionesExtraResult.errors);
      errors.push(...pagosRealizadosResult.errors);
      errors.push(...reglamentoResult.errors);
      errors.push(...minutasResult.errors);
      errors.push(...fuerzaTrabajoResult.errors);

      // Actualizar timestamp de Ãºltima sincronizaciÃ³n
      await this.updateLastSyncTimestamp();

    } catch (error) {
      errors.push(`Error en pull de cambios remotos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    return {
      success: errors.length === 0,
      synced,
      errors,
      lastSync: new Date()
    };
  }

  // ===================================
  // PULL: CONCEPTOS CONTRATO (CATÃLOGO)
  // ===================================
  private async pullConceptosContrato(since: Date): Promise<SyncResult> {
    const errors: string[] = [];
    let synced = 0;
    try {
      const { data, error } = await supabase
        .from('conceptos_contrato')
        .select('id, created_at, updated_at, contrato_id, partida, subpartida, actividad, clave, concepto, unidad, cantidad_catalogo, precio_unitario_catalogo, cantidad_estimada, precio_unitario_estimacion, volumen_estimado_fecha, monto_estimado_fecha, notas, orden, active, metadata')
        .gte('updated_at', since.toISOString())
        .order('updated_at', { ascending: true })
        .limit(this.config.batchSize);

      if (error) throw error;

      for (const c of data || []) {
        try {
          // Buscar existente para decidir si preservamos algunos campos locales
          const existing = await db.conceptos_contrato.get(c.id);
          const local: any = {
            id: c.id,
            created_at: c.created_at,
            updated_at: c.updated_at,
            contrato_id: c.contrato_id,
            partida: c.partida,
            subpartida: c.subpartida ?? '',
            actividad: c.actividad ?? '',
            clave: c.clave,
            concepto: c.concepto,
            unidad: c.unidad,
            cantidad_catalogo: Number(c.cantidad_catalogo ?? 0),
            precio_unitario_catalogo: Number(c.precio_unitario_catalogo ?? 0),
            // Campos generados en servidor: recalculamos por consistencia local
            importe_catalogo: Number(c.cantidad_catalogo ?? 0) * Number(c.precio_unitario_catalogo ?? 0),
            cantidad_estimada: Number(c.cantidad_estimada ?? 0),
            precio_unitario_estimacion: Number(c.precio_unitario_estimacion ?? 0),
            importe_estimado: Number(c.cantidad_estimada ?? 0) * Number(c.precio_unitario_estimacion ?? 0),
            volumen_estimado_fecha: Number(c.volumen_estimado_fecha ?? 0),
            monto_estimado_fecha: Number(c.monto_estimado_fecha ?? 0),
            notas: c.notas ?? null,
            orden: c.orden ?? 0,
            active: c.active ?? true,
            metadata: c.metadata || {},
            _dirty: false,
            last_sync: new Date().toISOString()
          };

            // Usamos put (upsert). Luego corregimos flags porque hooks los modifican
          await db.conceptos_contrato.put(local);
          // Restaurar _dirty y updated_at si el hook los alterÃ³
          await db.conceptos_contrato.update(c.id, { _dirty: false, updated_at: c.updated_at });
          synced++;
        } catch (e) {
          errors.push(`Error importando concepto ${c.clave}: ${e instanceof Error ? e.message : 'Error desconocido'}`);
        }
      }
    } catch (e) {
      errors.push(`Error obteniendo conceptos_contrato: ${e instanceof Error ? e.message : 'Error desconocido'}`);
    }

    return { success: errors.length === 0, synced, errors, lastSync: new Date() };
  }

  // ===================================
  // PULL: CAMBIOS CONTRATO
  // ===================================
  private async pullCambiosContrato(since: Date): Promise<SyncResult> {
    const errors: string[] = [];
    let synced = 0;
    try {
      const { data, error } = await supabase
        .from('cambios_contrato')
        .select('*')
        .gte('updated_at', since.toISOString())
        .order('updated_at', { ascending: true })
        .limit(this.config.batchSize);

      if (error) throw error;

      for (const cambio of data || []) {
        try {
          const local: any = {
            ...cambio,
            _dirty: false,
            last_sync: new Date().toISOString()
          };

          await db.cambios_contrato.put(local);
          await db.cambios_contrato.update(cambio.id, { _dirty: false, updated_at: cambio.updated_at });
          synced++;
        } catch (e) {
          errors.push(`Error importando cambio ${cambio.numero_cambio}: ${e instanceof Error ? e.message : 'Error desconocido'}`);
        }
      }
    } catch (e) {
      errors.push(`Error obteniendo cambios_contrato: ${e instanceof Error ? e.message : 'Error desconocido'}`);
    }

    return { success: errors.length === 0, synced, errors, lastSync: new Date() };
  }

  // ===================================
  // PULL: DETALLES ADITIVA/DEDUCTIVA
  // ===================================
  private async pullDetallesAditivaDeductiva(since: Date): Promise<SyncResult> {
    const errors: string[] = [];
    let synced = 0;
    try {
      const { data, error } = await supabase
        .from('detalles_aditiva_deductiva')
        .select('*')
        .gte('updated_at', since.toISOString())
        .order('updated_at', { ascending: true })
        .limit(this.config.batchSize);

      if (error) throw error;

      for (const detalle of data || []) {
        try {
          const local: any = {
            ...detalle,
            _dirty: false,
            last_sync: new Date().toISOString()
          };

          await db.detalles_aditiva_deductiva.put(local);
          await db.detalles_aditiva_deductiva.update(detalle.id, { _dirty: false, updated_at: detalle.updated_at });
          synced++;
        } catch (e) {
          errors.push(`Error importando detalle ${detalle.id}: ${e instanceof Error ? e.message : 'Error desconocido'}`);
        }
      }
    } catch (e) {
      errors.push(`Error obteniendo detalles_aditiva_deductiva: ${e instanceof Error ? e.message : 'Error desconocido'}`);
    }

    return { success: errors.length === 0, synced, errors, lastSync: new Date() };
  }

  // ===================================
  // PULL: DEDUCCIONES EXTRA
  // ===================================
  private async pullDeduccionesExtra(since: Date): Promise<SyncResult> {
    const errors: string[] = [];
    let synced = 0;
    try {
      const { data, error } = await supabase
        .from('deducciones_extra')
        .select('*')
        .gte('updated_at', since.toISOString())
        .order('updated_at', { ascending: true })
        .limit(this.config.batchSize);

      if (error) throw error;

      for (const deduccion of data || []) {
        try {
          const local: any = {
            ...deduccion,
            _dirty: false,
            last_sync: new Date().toISOString()
          };

          await db.deducciones_extra.put(local);
          await db.deducciones_extra.update(deduccion.id, { _dirty: false, updated_at: deduccion.updated_at });
          synced++;
        } catch (e) {
          errors.push(`Error importando deducción ${deduccion.id}: ${e instanceof Error ? e.message : 'Error desconocido'}`);
        }
      }
    } catch (e) {
      errors.push(`Error obteniendo deducciones_extra: ${e instanceof Error ? e.message : 'Error desconocido'}`);
    }

    return { success: errors.length === 0, synced, errors, lastSync: new Date() };
  }

  // ===================================
  // PULL: PAGOS REALIZADOS
  // ===================================
  private async pullPagosRealizados(since: Date): Promise<SyncResult> {
    const errors: string[] = [];
    let synced = 0;
    try {
      // Verificar si IndexedDB está vacío (primera sincronización)
      const localCount = await db.pagos_realizados.count();
      const isInitialSync = localCount === 0;
      
      console.log(`💰 Sincronizando pagos_realizados ${isInitialSync ? '(INICIAL - SIN FILTRO)' : 'desde: ' + since.toISOString()}`);
      
      // Primero verificar cuántos pagos hay en total en Supabase
      const { count: totalCount } = await supabase
        .from('pagos_realizados')
        .select('*', { count: 'exact', head: true });
      console.log(`💰 Total de pagos en Supabase: ${totalCount || 0}`);
      console.log(`💰 Pagos en IndexedDB local: ${localCount}`);
      
      // Si es sincronización inicial, traer TODOS los pagos sin filtro de fecha
      let query = supabase
        .from('pagos_realizados')
        .select('*');
      
      // Solo aplicar filtro de fecha si NO es sincronización inicial
      if (!isInitialSync) {
        query = query.gte('updated_at', since.toISOString());
      }
      
      const { data, error } = await query
        .order('updated_at', { ascending: true })
        .limit(isInitialSync ? 1000 : this.config.batchSize); // Más registros en sync inicial

      if (error) {
        console.error('❌ Error obteniendo pagos_realizados:', error);
        throw error;
      }

      console.log(`💰 Pagos obtenidos de Supabase: ${data?.length || 0}`);

      for (const pago of data || []) {
        try {
          const local: any = {
            ...pago,
            _dirty: false,
            last_sync: new Date().toISOString()
          };

          await db.pagos_realizados.put(local);
          await db.pagos_realizados.update(pago.id, { _dirty: false, updated_at: pago.updated_at });
          synced++;
        } catch (e) {
          console.error(`❌ Error importando pago ${pago.id}:`, e);
          errors.push(`Error importando pago ${pago.id}: ${e instanceof Error ? e.message : 'Error desconocido'}`);
        }
      }
      
      console.log(`✅ Sincronizados ${synced} pagos_realizados a IndexedDB`);
    } catch (e) {
      console.error('❌ Error en pullPagosRealizados:', e);
      errors.push(`Error obteniendo pagos_realizados: ${e instanceof Error ? e.message : 'Error desconocido'}`);
    }

    return { success: errors.length === 0, synced, errors, lastSync: new Date() };
  }

  private async pullUsers(since: Date): Promise<SyncResult> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, email, name, telefono, avatar_url, nivel, active, created_at, updated_at')
        .gte('updated_at', since.toISOString())
        .order('updated_at', { ascending: true })
        .limit(this.config.batchSize);

      if (error) throw error;

      for (const profile of data || []) {
        try {
          const usuario: UsuarioDB = {
            id: profile.id,
            email: profile.email,
            nombre: profile.name,
            telefono: profile.telefono,
            avatar_url: profile.avatar_url,
            contratista_id: (profile as any).contratista_id,
            roles: (profile as any).roles,
            nivel: profile.nivel,
            active: profile.active,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
            _dirty: false,
            last_sync: new Date().toISOString()
          };

          await db.usuarios.put(usuario);
          synced++;
        } catch (error) {
          errors.push(`Error importando usuario ${profile.email}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }
    } catch (error) {
      errors.push(`Error obteniendo usuarios: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    return { success: errors.length === 0, synced, errors, lastSync: new Date() };
  }

  private async pullPermissions(since: Date): Promise<SyncResult> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const { data, error } = await supabase
        .from('permisos')
        .select('*')
        .gte('updated_at', since.toISOString())
        .order('updated_at', { ascending: true })
        .limit(this.config.batchSize);

      if (error) throw error;

      for (const permission of data || []) {
        try {
          const localPermission: Permission = {
            id: permission.id,
            name: permission.name,
            description: permission.description,
            resource: permission.resource,
            action: permission.action,
            created_at: permission.created_at,
            updated_at: permission.updated_at,
            _dirty: false,
            last_sync: new Date().toISOString()
          };

          await db.permissions.put(localPermission);
          synced++;
        } catch (error) {
          errors.push(`Error importando permiso ${permission.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }
    } catch (error) {
      errors.push(`Error obteniendo permisos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    return { success: errors.length === 0, synced, errors, lastSync: new Date() };
  }

  private async pullRoles(since: Date): Promise<SyncResult> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .gte('updated_at', since.toISOString())
        .order('updated_at', { ascending: true })
        .limit(this.config.batchSize);

      if (error) throw error;

      for (const role of data || []) {
        try {
          const localRole: Role = {
            id: role.id,
            name: role.name,
            description: role.description,
            color: role.color,
            permissions: role.permissions || [],
            created_at: role.created_at,
            updated_at: role.updated_at,
            _dirty: false,
            last_sync: new Date().toISOString()
          };

          await db.roles.put(localRole);
          synced++;
        } catch (error) {
          errors.push(`Error importando rol ${role.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }
    } catch (error) {
      errors.push(`Error obteniendo roles: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    return { success: errors.length === 0, synced, errors, lastSync: new Date() };
  }

  private async pullUserPermissions(since: Date): Promise<SyncResult> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const { data, error } = await supabase
        .from('permisos_usuario')
        .select('*')
        .gte('updated_at', since.toISOString())
        .order('updated_at', { ascending: true })
        .limit(this.config.batchSize);

      if (error) throw error;

      for (const userPermission of data || []) {
        try {
          const localUserPermission: UserPermission = {
            id: userPermission.id,
            user_id: userPermission.user_id,
            permission_id: userPermission.permission_id,
            granted_by: userPermission.granted_by,
            granted_at: userPermission.granted_at,
            expires_at: userPermission.expires_at,
            created_at: userPermission.created_at,
            updated_at: userPermission.updated_at,
            _dirty: false,
            last_sync: new Date().toISOString()
          };

          await db.userPermissions.put(localUserPermission);
          synced++;
        } catch (error) {
          errors.push(`Error importando permiso de usuario: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }
    } catch (error) {
      errors.push(`Error obteniendo permisos de usuario: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    return { success: errors.length === 0, synced, errors, lastSync: new Date() };
  }

  private async pullUserRoles(since: Date): Promise<SyncResult> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const { data, error } = await supabase
        .from('roles_usuario')
        .select('*')
        .gte('updated_at', since.toISOString())
        .order('updated_at', { ascending: true })
        .limit(this.config.batchSize);

      if (error) throw error;

      for (const userRole of data || []) {
        try {
          const localUserRole: UserRole = {
            id: userRole.id,
            user_id: userRole.user_id,
            role_id: userRole.role_id,
            assigned_by: userRole.assigned_by,
            assigned_at: userRole.assigned_at,
            expires_at: userRole.expires_at,
            created_at: userRole.created_at,
            updated_at: userRole.updated_at,
            _dirty: false,
            last_sync: new Date().toISOString()
          };

          await db.userRoles.put(localUserRole);
          synced++;
        } catch (error) {
          errors.push(`Error importando rol de usuario: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }
    } catch (error) {
      errors.push(`Error obteniendo roles de usuario: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    return { success: errors.length === 0, synced, errors, lastSync: new Date() };
  }

  private async pullRequisicionesPago(since: Date): Promise<SyncResult> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const { data, error } = await supabase
        .from('requisiciones_pago')
        .select('*')
        .gte('updated_at', since.toISOString())
        .order('updated_at', { ascending: true })
        .limit(this.config.batchSize);

      if (error) throw error;

      for (const r of data || []) {
        try {
          console.log(`📥 Pulling requisicion ${r.numero}:`, {
            id: r.id,
            factura_url: r.factura_url,
            estado: r.estado
          });
          
          const local: RequisicionPagoDB = {
            id: r.id,
            contrato_id: r.contrato_id,
            numero: r.numero,
            fecha: r.fecha,
            conceptos: r.conceptos || [],
            monto_estimado: Number(r.monto_estimado ?? 0),
            amortizacion: Number(r.amortizacion ?? 0),
            retencion: Number(r.retencion ?? 0),
            otros_descuentos: Number(r.otros_descuentos ?? 0),
            total: Number(r.total ?? 0),
            descripcion_general: r.descripcion_general ?? undefined,
            notas: r.notas ?? undefined,
            respaldo_documental: r.respaldo_documental || [],
            factura_url: r.factura_url ?? undefined,
            estado: r.estado,
            visto_bueno: r.visto_bueno ?? undefined,
            visto_bueno_por: r.visto_bueno_por ?? undefined,
            visto_bueno_fecha: r.visto_bueno_fecha ?? undefined,
            fecha_pago_estimada: r.fecha_pago_estimada ?? undefined,
            created_at: r.created_at,
            updated_at: r.updated_at,
            created_by: r.created_by ?? undefined,
            _dirty: false,
            last_sync: new Date().toISOString(),
          };

          console.log(`💾 Guardando en IndexedDB:`, {
            numero: local.numero,
            factura_url: local.factura_url
          });

          await db.requisiciones_pago.put(local);
          synced++;
        } catch (err) {
          errors.push(`Error importando requisiciÃ³n ${r.numero}: ${err instanceof Error ? err.message : 'Error desconocido'}`);
        }
      }

      // ReconciliaciÃ³n: eliminar locales que ya no existen en el servidor (y no estÃ©n _dirty)
      // SOLO si hay al menos 1 en el servidor (para evitar borrar todo si el servidor estÃ¡ vacÃ­o por error de push)
      try {
        const { data: allRemote, error: idsErr } = await supabase
          .from('requisiciones_pago')
          .select('id');
        if (idsErr) throw idsErr;
        
        // SEGURIDAD: Solo reconciliar si hay requisiciones en el servidor O si no hay locales pendientes de sync
        const hasDirtyLocals = await db.requisiciones_pago.filter(r => r._dirty === true).count();
        
        if ((allRemote && allRemote.length > 0) || hasDirtyLocals === 0) {
          const remoteIds = new Set((allRemote || []).map((x: any) => x.id));
          const locals = await db.requisiciones_pago.toArray();
          const toDelete = locals
            .filter(l => !l._dirty && !remoteIds.has(l.id))
            .map(l => l.id);
          if (toDelete.length) {
            console.log(`ðŸ—‘ï¸ Reconciliando: eliminando ${toDelete.length} requisiciones que no existen en servidor`);
            await db.requisiciones_pago.bulkDelete(toDelete as string[]);
          }
        } else {
          console.log('âš ï¸ ReconciliaciÃ³n saltada: servidor vacÃ­o pero hay requisiciones locales _dirty pendientes de push');
        }
      } catch (reconErr) {
        errors.push(`ReconciliaciÃ³n requisiciones fallÃ³: ${reconErr instanceof Error ? reconErr.message : 'Error desconocido'}`);
      }
    } catch (error) {
      errors.push(`Error obteniendo requisiciones de pago: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    return { success: errors.length === 0, synced, errors, lastSync: new Date() };
  }

  private async pullSolicitudesPago(since: Date): Promise<SyncResult> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const { data, error } = await supabase
        .from('solicitudes_pago')
        .select('*')
        .gte('updated_at', since.toISOString())
        .order('updated_at', { ascending: true })
        .limit(this.config.batchSize);

      if (error) throw error;

      for (const s of data || []) {
        try {
          const existing = await db.solicitudes_pago.where('folio').equals(s.folio).first();
          const local: SolicitudPagoDB = {
            // Nota: mantenemos el id local si existe para no romper PK autoincremental
            id: existing?.id,
            folio: s.folio,
            requisicion_id: s.requisicion_id,
            concepto_ids: s.concepto_ids || [],
            conceptos_detalle: s.conceptos_detalle || [],
            subtotal: Number(s.subtotal ?? 0),
            total: Number(s.total ?? 0),
            fecha: s.fecha,
            estado: s.estado,
            notas: s.notas ?? undefined,
            aprobada: s.aprobada ?? undefined,
            aprobada_por: s.aprobada_por ?? undefined,
            aprobada_fecha: s.aprobada_fecha ?? undefined,
            fecha_pago: s.fecha_pago ?? undefined,
            referencia_pago: s.referencia_pago ?? undefined,
            monto_pagado: Number(s.monto_pagado ?? 0),
            comprobante_pago_url: s.comprobante_pago_url ?? undefined,
            estatus_pago: s.estatus_pago ?? undefined,
            vobo_desarrollador: s.vobo_desarrollador ?? undefined,
            vobo_desarrollador_por: s.vobo_desarrollador_por ?? undefined,
            vobo_desarrollador_fecha: s.vobo_desarrollador_fecha ?? undefined,
            vobo_finanzas: s.vobo_finanzas ?? undefined,
            vobo_finanzas_por: s.vobo_finanzas_por ?? undefined,
            vobo_finanzas_fecha: s.vobo_finanzas_fecha ?? undefined,
            observaciones_desarrollador: s.observaciones_desarrollador ?? undefined,
            created_at: s.created_at,
            updated_at: s.updated_at,
            _dirty: false,
            last_sync: new Date().toISOString(),
          } as SolicitudPagoDB;

          if (existing) {
            const { id, ...updateData } = local;
            await db.solicitudes_pago.update(existing.id as number, updateData);
          } else {
            await db.solicitudes_pago.add(local);
          }
          synced++;
        } catch (err) {
          errors.push(`Error importando solicitud ${s.folio}: ${err instanceof Error ? err.message : 'Error desconocido'}`);
        }
      }

      // ReconciliaciÃ³n: eliminar locales que ya no existen en el servidor (y no estÃ©n _dirty)
      // SOLO si hay al menos 1 solicitud en el servidor (para evitar borrar todo si el servidor estÃ¡ vacÃ­o por error de push)
      try {
        const { data: allRemote, error: idsErr } = await supabase
          .from('solicitudes_pago')
          .select('folio');
        if (idsErr) throw idsErr;
        
        // SEGURIDAD: Solo reconciliar si hay solicitudes en el servidor O si no hay locales pendientes de sync
        const hasDirtyLocals = await db.solicitudes_pago.filter(s => s._dirty === true).count();
        
        if ((allRemote && allRemote.length > 0) || hasDirtyLocals === 0) {
          const remoteFolios = new Set((allRemote || []).map((x: any) => x.folio));
          const locals = await db.solicitudes_pago.toArray();
          const toDeleteIds: number[] = [];
          for (const l of locals) {
            if (!l._dirty && l.folio && !remoteFolios.has(l.folio)) {
              if (typeof l.id === 'number') toDeleteIds.push(l.id);
            }
          }
          if (toDeleteIds.length) {
            console.log(`ðŸ—‘ï¸ Reconciliando: eliminando ${toDeleteIds.length} solicitudes que no existen en servidor`);
            await db.solicitudes_pago.bulkDelete(toDeleteIds);
          }
        } else {
          console.log('âš ï¸ ReconciliaciÃ³n saltada: servidor vacÃ­o pero hay solicitudes locales _dirty pendientes de push');
        }
      } catch (reconErr) {
        errors.push(`ReconciliaciÃ³n solicitudes fallÃ³: ${reconErr instanceof Error ? reconErr.message : 'Error desconocido'}`);
      }
    } catch (error) {
      errors.push(`Error obteniendo solicitudes de pago: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    return { success: errors.length === 0, synced, errors, lastSync: new Date() };
  }

  private async pullReglamentoConfig(since: Date): Promise<SyncResult> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const { data, error } = await supabase
        .from('reglamento_config')
        .select('*')
        .gte('updated_at', since.toISOString());

      if (error) throw error;

      for (const config of data || []) {
        try {
          const existing = await db.reglamento_config
            .limit(1)
            .first();

          const local = {
            ...config,
            _dirty: false,
            _deleted: false,
            last_sync: new Date().toISOString(),
          };

          if (existing) {
            await db.reglamento_config.update(existing.id as string, local);
          } else {
            await db.reglamento_config.add(local);
          }
          synced++;
        } catch (err) {
          errors.push(`Error sincronizando reglamento: ${err instanceof Error ? err.message : 'Error desconocido'}`);
        }
      }
    } catch (error) {
      errors.push(`Error obteniendo reglamento: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    return { success: errors.length === 0, synced, errors, lastSync: new Date() };
  }

  private async pullMinutasConfig(since: Date): Promise<SyncResult> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const { data, error } = await supabase
        .from('minutas_config')
        .select('*')
        .gte('updated_at', since.toISOString());

      if (error) throw error;

      for (const config of data || []) {
        try {
          const existing = await db.minutas_config
            .limit(1)
            .first();

          const local = {
            ...config,
            _dirty: false,
            _deleted: false,
            last_sync: new Date().toISOString(),
          };

          if (existing) {
            await db.minutas_config.update(existing.id as string, local);
          } else {
            await db.minutas_config.add(local);
          }
          synced++;
        } catch (err) {
          errors.push(`Error sincronizando minutas: ${err instanceof Error ? err.message : 'Error desconocido'}`);
        }
      }
    } catch (error) {
      errors.push(`Error obteniendo minutas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    return { success: errors.length === 0, synced, errors, lastSync: new Date() };
  }

  private async pullFuerzaTrabajoConfig(since: Date): Promise<SyncResult> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const { data, error } = await supabase
        .from('fuerza_trabajo_config')
        .select('*')
        .gte('updated_at', since.toISOString());

      if (error) throw error;

      for (const config of data || []) {
        try {
          const existing = await db.fuerza_trabajo_config
            .limit(1)
            .first();

          const local = {
            ...config,
            _dirty: false,
            _deleted: false,
            last_sync: new Date().toISOString(),
          };

          if (existing) {
            await db.fuerza_trabajo_config.update(existing.id as string, local);
          } else {
            await db.fuerza_trabajo_config.add(local);
          }
          synced++;
        } catch (err) {
          errors.push(`Error sincronizando fuerza de trabajo: ${err instanceof Error ? err.message : 'Error desconocido'}`);
        }
      }
    } catch (error) {
      errors.push(`Error obteniendo fuerza de trabajo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    return { success: errors.length === 0, synced, errors, lastSync: new Date() };
  }

  private async pullDocumentosAuditoria(since: Date): Promise<SyncResult> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const { data, error } = await supabase
        .from('documentos_auditoria')
        .select('*')
        .gte('updated_at', since.toISOString());

      if (error) throw error;

      for (const doc of data || []) {
        try {
          const existing = await db.documentos_auditoria
            .where('id')
            .equals(doc.id)
            .first();

          const local = {
            ...doc,
            _dirty: false,
            _deleted: false,
            last_sync: new Date().toISOString(),
          };

          if (existing) {
            await db.documentos_auditoria.update(doc.id, local);
          } else {
            await db.documentos_auditoria.add(local);
          }
          synced++;
        } catch (err) {
          errors.push(`Error sincronizando documento auditorÃ­a: ${err instanceof Error ? err.message : 'Error desconocido'}`);
        }
      }
    } catch (error) {
      errors.push(`Error obteniendo documentos auditorÃ­a: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    return { success: errors.length === 0, synced, errors, lastSync: new Date() };
  }

  // ===================================
  // UTILIDADES DE SINCRONIZACIÃ“N
  // ===================================

  private async getLastSyncTimestamp(): Promise<Date> {
    const syncRecord = await db.syncMetadata.get('users'); // Usar 'users' como tabla principal
    return syncRecord?.last_sync ? new Date(syncRecord.last_sync) : new Date(0);
  }

  private async updateLastSyncTimestamp(): Promise<void> {
    const now = new Date().toISOString();
    const syncRecord: SyncMetadata = {
      table: 'users',
      last_sync: now,
      sync_version: 1,
      pending_changes: 0
    };
    await db.syncMetadata.put(syncRecord);
  }

  private async cleanupOldSyncRecords(): Promise<void> {
    // Limpiar registros de sync mÃ¡s antiguos que 30 dÃ­as
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();

    await db.syncMetadata
      .where('last_sync')
      .below(cutoffDate)
      .delete();
  }

  // ===================================
  // MÃ‰TODOS PÃšBLICOS
  // ===================================

  async forcePull(fullSync = false): Promise<SyncResult> {
    if (fullSync) {
      // Limpiar timestamp para forzar sync completo
      await db.syncMetadata.clear();
    }
    return await this.pullRemoteChanges();
  }

  async forcePush(): Promise<SyncResult> {
    return await this.pushLocalChanges();
  }

  getSyncStatus() {
    return {
      isAutoSyncEnabled: this.config.autoSync,
      isSyncing: this.isSyncing,
      syncInterval: this.config.syncInterval
    };
  }

  async clearLocalData(): Promise<void> {
    await db.transaction('rw', [db.usuarios, db.permissions, db.roles, db.userPermissions, db.userRoles, db.syncMetadata], async () => {
      await db.usuarios.clear();
      await db.permissions.clear();
      await db.roles.clear();
      await db.userPermissions.clear();
      await db.userRoles.clear();
      await db.syncMetadata.clear();
    });
  }

  destroy() {
    this.stopAutoSync();
  }
}

// Instancia singleton del servicio de sincronizaciÃ³n
export const syncService = new SyncService();
