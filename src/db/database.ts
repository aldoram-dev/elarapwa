import Dexie, { Table } from 'dexie'
import { Empresa } from '@/types/empresa'
import { Proyecto } from '@/types/proyecto'
import { Usuario } from '@/types/usuario'
import { Contratista } from '@/types/contratista'
import { Contrato } from '@/types/contrato'
import { ConceptoContrato } from '@/types/concepto-contrato'
import { RequisicionPago } from '@/types/requisicion-pago'
import { SolicitudPago } from '@/types/solicitud-pago'
import { PagoRealizado } from '@/types/pago-realizado'
import { CambioContrato, DetalleAditivaDeductiva, DetalleExtra, DeduccionExtra, RetencionContrato } from '@/types/cambio-contrato'

// ============================================
// TIPOS AUXILIARES PARA SINCRONIZACIÓN OFFLINE
// ============================================

// Campos adicionales que Dexie necesita para sincronización offline
export interface DexieSyncFields {
  last_sync?: string     // Última vez que se sincronizó con Supabase
  _dirty?: boolean       // Indica si necesita sincronización
  _deleted?: boolean     // Soft delete local (antes de sincronizar)
}

// Tipos extendidos con campos de sincronización
export type EmpresaDB = Empresa & DexieSyncFields
export type ProyectoDB = Proyecto & DexieSyncFields
export type UsuarioDB = Usuario & DexieSyncFields
export type ContratistaDB = Contratista & DexieSyncFields
export type ContratoDB = Contrato & DexieSyncFields
export type ConceptoContratoDB = ConceptoContrato & DexieSyncFields
export type RequisicionPagoDB = RequisicionPago & DexieSyncFields
export type SolicitudPagoDB = SolicitudPago & DexieSyncFields
export type PagoRealizadoDB = PagoRealizado & DexieSyncFields
export type CambioContratoDB = CambioContrato & DexieSyncFields
export type DetalleAditivaDeductivaDB = DetalleAditivaDeductiva & DexieSyncFields
export type DetalleExtraDB = DetalleExtra & DexieSyncFields
export type DeduccionExtraDB = DeduccionExtra & DexieSyncFields
export type RetencionContratoDB = RetencionContrato & DexieSyncFields

// ============================================
// TIPOS PARA PERMISOS Y ROLES (ACL)
// ============================================

export interface Permission {
  id: string
  name: string
  description?: string
  resource: string
  action: string
  created_at: string
  updated_at: string
  last_sync?: string
  _dirty?: boolean
  _deleted?: boolean
}

export interface UserPermission {
  id: string
  user_id: string
  permission_id: string
  granted_by?: string
  granted_at: string
  expires_at?: string
  created_at: string
  updated_at: string
  last_sync?: string
  _dirty?: boolean
  _deleted?: boolean
}

export interface Role {
  id: string
  name: string
  description?: string
  color?: string
  permissions: string[] // Array de permission IDs
  created_at: string
  updated_at: string
  last_sync?: string
  _dirty?: boolean
  _deleted?: boolean
}

export interface UserRole {
  id: string
  user_id: string
  role_id: string
  assigned_by?: string
  assigned_at: string
  expires_at?: string
  created_at: string
  updated_at: string
  last_sync?: string
  _dirty?: boolean
  _deleted?: boolean
}

// ============================================
// TIPOS PARA METADATOS Y CACHE
// ============================================

export interface SyncMetadata {
  table: string
  last_sync: string
  sync_version: number
  pending_changes: number
}

export interface CacheEntry {
  key: string
  data: any
  expires_at: string
  created_at: string
}

export interface ReglamentoConfig {
  id?: string
  reglamento_url: string
  updated_at?: string
  updated_by?: string
  last_sync?: string
  _dirty?: boolean
  _deleted?: boolean
}

export interface MinutasConfig {
  id?: string
  drive_folder_url: string
  updated_at?: string
  updated_by?: string
  last_sync?: string
  _dirty?: boolean
  _deleted?: boolean
}

export interface FuerzaTrabajoConfig {
  id?: string
  buba_url: string
  updated_at?: string
  updated_by?: string
  last_sync?: string
  _dirty?: boolean
  _deleted?: boolean
}

export interface ProgramaObraConfig {
  id?: string
  programa_url: string
  updated_at?: string
  updated_by?: string
  last_sync?: string
  _dirty?: boolean
  _deleted?: boolean
}

export interface Recorrido360Config {
  id?: string
  recorrido_url: string
  updated_at?: string
  updated_by?: string
  last_sync?: string
  _dirty?: boolean
  _deleted?: boolean
}

export interface DocumentoAuditoria {
  id?: string
  especialidad: string
  numero: number
  descripcion: string
  estatus: 'OK' | 'FALTA'
  no_se_requiere: boolean
  fecha_emision?: string
  fecha_vencimiento?: string
  control?: string
  archivo_url?: string
  archivo_nombre?: string
  updated_at?: string
  updated_by?: string
  created_at?: string
  last_sync?: string
  _dirty?: boolean
  _deleted?: boolean
}

// ============================================
// CLASE PRINCIPAL DE LA BASE DE DATOS
// ============================================

export class ElaraDB extends Dexie {
  usuarios!: Table<UsuarioDB>
  permissions!: Table<Permission>
  userPermissions!: Table<UserPermission>
  roles!: Table<Role>
  userRoles!: Table<UserRole>
  empresas!: Table<EmpresaDB>
  proyectos!: Table<ProyectoDB>
  contratistas!: Table<ContratistaDB>
  contratos!: Table<ContratoDB>
  conceptos_contrato!: Table<ConceptoContratoDB>
  requisiciones_pago!: Table<RequisicionPagoDB>
  solicitudes_pago!: Table<SolicitudPagoDB>
  pagos_realizados!: Table<PagoRealizadoDB>
  cambios_contrato!: Table<CambioContratoDB>
  detalles_aditiva_deductiva!: Table<DetalleAditivaDeductivaDB>
  detalles_extra!: Table<DetalleExtraDB>
  deducciones_extra!: Table<DeduccionExtraDB>
  retenciones_contrato!: Table<RetencionContratoDB>
  reglamento_config!: Table<ReglamentoConfig>
  minutas_config!: Table<MinutasConfig>
  fuerza_trabajo_config!: Table<FuerzaTrabajoConfig>
  programa_obra_config!: Table<ProgramaObraConfig>
  recorrido360_config!: Table<Recorrido360Config>
  documentos_auditoria!: Table<DocumentoAuditoria>
  syncMetadata!: Table<SyncMetadata>
  cache!: Table<CacheEntry>

  constructor() {
    super('ElaraDB_v2')
    
    this.version(1).stores({
      usuarios: '&id, email, nombre, telefono, empresa_id, tipo, nivel, active, _dirty, _deleted, last_sync',
      permissions: '&id, name, resource, action, _dirty, _deleted, last_sync',
      userPermissions: '&id, user_id, permission_id, _dirty, _deleted, last_sync',
      roles: '&id, name, _dirty, _deleted, last_sync',
      userRoles: '&id, user_id, role_id, _dirty, _deleted, last_sync',
      empresas: '&id, nombre, correo, _dirty, _deleted, last_sync',
      proyectos: '&id, nombre, empresa_id, active, deleted, tipo, ciudad, orden, portada_url, _dirty, _deleted, last_sync',
      contratistas: '&id, nombre, categoria, empresa_id, active, _dirty, _deleted, last_sync',
      contratos: '&id, numero_contrato, nombre, contratista_id, empresa_id, estatus, active, _dirty, _deleted, last_sync',
      conceptos_contrato: '&id, contrato_id, partida, clave, active, orden, _dirty, _deleted, last_sync',
      requisiciones_pago: '&id, contrato_id, numero, fecha, estado, _dirty, _deleted, last_sync',
      solicitudes_pago: '++id, folio, requisicion_id, fecha, estado, _dirty, _deleted, last_sync',
      pagos_realizados: '&id, solicitud_pago_id, requisicion_pago_id, contrato_id, concepto_contrato_id, fecha_pago, estatus, _dirty, _deleted, last_sync',
      cambios_contrato: '&id, contrato_id, numero_cambio, tipo_cambio, fecha_cambio, estatus, _dirty, _deleted, last_sync',
      detalles_aditiva_deductiva: '&id, cambio_contrato_id, concepto_contrato_id, _dirty, _deleted, last_sync',
      detalles_extra: '&id, cambio_contrato_id, concepto_clave, _dirty, _deleted, last_sync',
      deducciones_extra: '&id, cambio_contrato_id, _dirty, _deleted, last_sync',
      retenciones_contrato: '&id, cambio_contrato_id, _dirty, _deleted, last_sync',
      reglamento_config: '++id, _dirty, _deleted, last_sync',
      minutas_config: '++id, _dirty, _deleted, last_sync',
      fuerza_trabajo_config: '++id, _dirty, _deleted, last_sync',
      programa_obra_config: '++id, _dirty, _deleted, last_sync',
      recorrido360_config: '++id, _dirty, _deleted, last_sync',
      documentos_auditoria: '++id, especialidad, numero, estatus, _dirty, _deleted, last_sync',
      syncMetadata: '&table, last_sync',
      cache: '&key, expires_at'
    })

    // Hooks para marcar como dirty automáticamente
    this.usuarios.hook('creating', (primKey, obj, trans) => {
      obj._dirty = true
      obj.created_at = obj.created_at || new Date().toISOString()
      obj.updated_at = new Date().toISOString()
    })

    this.usuarios.hook('updating', (modifications, primKey, obj, trans) => {
      ;(modifications as any)._dirty = true
      ;(modifications as any).updated_at = new Date().toISOString()
    })

    // Aplicar los mismos hooks a todas las tablas principales
    const tables = [this.permissions, this.userPermissions, this.roles, this.userRoles, this.empresas, this.proyectos, this.contratistas, this.contratos, this.conceptos_contrato, this.requisiciones_pago, this.solicitudes_pago, this.cambios_contrato, this.detalles_aditiva_deductiva, this.detalles_extra, this.deducciones_extra, this.reglamento_config, this.minutas_config, this.fuerza_trabajo_config, this.programa_obra_config, this.recorrido360_config, this.documentos_auditoria]
    tables.forEach(table => {
      table.hook('creating', (primKey, obj, trans) => {
        ;(obj as any)._dirty = true
        ;(obj as any).created_at = (obj as any).created_at || new Date().toISOString()
        ;(obj as any).updated_at = new Date().toISOString()
      })

      table.hook('updating', (modifications, primKey, obj, trans) => {
        ;(modifications as any)._dirty = true
        ;(modifications as any).updated_at = new Date().toISOString()
      })
    })
  }

  // Método para limpiar cache expirado
  async cleanExpiredCache() {
    const now = new Date().toISOString()
    await this.cache.where('expires_at').below(now).delete()
  }

  // Método para obtener elementos que necesitan sincronización
  async getDirtyRecords() {
    return {
      usuarios: await this.usuarios.filter(u => u._dirty === true).toArray(),
      permissions: await this.permissions.filter(p => p._dirty === true).toArray(),
      userPermissions: await this.userPermissions.filter(up => up._dirty === true).toArray(),
      roles: await this.roles.filter(r => r._dirty === true).toArray(),
      userRoles: await this.userRoles.filter(ur => ur._dirty === true).toArray(),
      empresas: await this.empresas.filter(e => e._dirty === true).toArray(),
      proyectos: await this.proyectos.filter(p => p._dirty === true).toArray(),
      contratistas: await this.contratistas.filter(c => c._dirty === true).toArray(),
      contratos: await this.contratos.filter(c => c._dirty === true).toArray(),
      conceptos_contrato: await this.conceptos_contrato.filter(c => c._dirty === true).toArray(),
      requisiciones_pago: await this.requisiciones_pago.filter(r => r._dirty === true).toArray(),
      solicitudes_pago: await this.solicitudes_pago.filter(s => s._dirty === true).toArray(),
      pagos_realizados: await this.pagos_realizados.filter(p => p._dirty === true).toArray(),
      cambios_contrato: await this.cambios_contrato.filter(c => c._dirty === true).toArray(),
      detalles_aditiva_deductiva: await this.detalles_aditiva_deductiva.filter(d => d._dirty === true).toArray(),
      detalles_extra: await this.detalles_extra.filter(d => d._dirty === true).toArray(),
      deducciones_extra: await this.deducciones_extra.filter(d => d._dirty === true).toArray(),
      retenciones_contrato: await this.retenciones_contrato.filter(r => r._dirty === true).toArray(),
      reglamento_config: await this.reglamento_config.filter(r => r._dirty === true).toArray(),
      minutas_config: await this.minutas_config.filter(m => m._dirty === true).toArray(),
      fuerza_trabajo_config: await this.fuerza_trabajo_config.filter(f => f._dirty === true).toArray(),
      programa_obra_config: await this.programa_obra_config.filter(p => p._dirty === true).toArray(),
      recorrido360_config: await this.recorrido360_config.filter(r => r._dirty === true).toArray(),
      documentos_auditoria: await this.documentos_auditoria.filter(d => d._dirty === true).toArray(),
    }
  }

  // Método para marcar como sincronizado
  async markAsSynced(table: string, ids: (string | number)[]) {
    const tableObj = (this as any)[table]
    if (tableObj) {
      await tableObj.where('id').anyOf(ids).modify({
        _dirty: false,
        last_sync: new Date().toISOString()
      })
    }
  }

  // Método para soft delete
  async softDelete(table: string, id: string) {
    const tableObj = (this as any)[table]
    if (tableObj) {
      await tableObj.update(id, {
        _deleted: true,
        _dirty: true,
        updated_at: new Date().toISOString()
      })
    }
  }

  // Obtener todos los usuarios (no eliminados, pero incluye activos e inactivos)
  async getActiveUsuarios() {
    return this.usuarios.filter(usuario => 
      !usuario._deleted
    ).toArray()
  }

  // Obtener permisos de un usuario
  async getUserPermissions(userId: string) {
    const userPermissions = await this.userPermissions
      .where('user_id').equals(userId)
      .and(up => !up._deleted)
      .toArray()

    const userRoles = await this.userRoles
      .where('user_id').equals(userId)
      .and(ur => !ur._deleted)
      .toArray()

    // Obtener permisos directos
    const directPermissions = await this.permissions
      .where('id').anyOf(userPermissions.map(up => up.permission_id))
      .and(p => !p._deleted)
      .toArray()

    // Obtener permisos de roles
    const roles = await this.roles
      .where('id').anyOf(userRoles.map(ur => ur.role_id))
      .and(r => !r._deleted)
      .toArray()

    const rolePermissionIds = roles.flatMap(role => role.permissions)
    const rolePermissions = await this.permissions
      .where('id').anyOf(rolePermissionIds)
      .and(p => !p._deleted)
      .toArray()

    // Combinar y deduplicar permisos
    const allPermissions = [...directPermissions, ...rolePermissions]
    const uniquePermissions = allPermissions.filter((permission, index, self) =>
      index === self.findIndex(p => p.id === permission.id)
    )

    return uniquePermissions
  }
}

// Instancia única de la base de datos
export const db = new ElaraDB()
