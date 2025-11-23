import { supabase } from '@/lib/core/supabaseClient'

export interface NotificationGroup {
  id: string
  name: string
  description?: string | null
  color?: string | null
  metadata?: Record<string, any> | null
  created_at?: string
  updated_at?: string
}

export interface GroupMember {
  id: string // membership id
  group_id: string
  user_id: string
  added_at?: string
  // joined profile fields
  perfil?: {
    id: string
    name: string | null
    email: string | null
    empresa_id: string | null
    active: boolean | null
  }
}

export const notificationGroupsService = {
  async listGroups(): Promise<NotificationGroup[]> {
    const { data, error } = await supabase
      .from('notification_groups')
      .select('*')
      .order('name')
    if (error) throw error
    return (data || []) as NotificationGroup[]
  },

  async createGroup(input: { name: string; description?: string; color?: string; metadata?: Record<string, any> }) {
    const { data, error } = await supabase
      .from('notification_groups')
      .insert({
        name: input.name,
        description: input.description || null,
        color: input.color || '#0EA5E9',
        metadata: input.metadata || {},
      })
      .select('*')
      .single()
    if (error) throw error
    return data as NotificationGroup
  },

  async updateGroup(id: string, updates: Partial<Omit<NotificationGroup, 'id'>>) {
    const { data, error } = await supabase
      .from('notification_groups')
      .update({
        name: updates.name,
        description: updates.description,
        color: updates.color,
        metadata: updates.metadata,
      })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data as NotificationGroup
  },

  /**
   * Actualiza únicamente los remitentes permitidos en metadata
   * metadata.allowed_sender_roles: string[]
   * metadata.allowed_sender_user_ids: string[]
   */
  async updateAllowedSenders(id: string, input: { roles: string[]; userIds: string[] }) {
    // Obtener metadata actual para hacer merge
    const { data: current, error: currentError } = await supabase
      .from('notification_groups')
      .select('metadata')
      .eq('id', id)
      .single()
    if (currentError) throw currentError

    const metadata = {
      ...(current?.metadata || {}),
      allowed_sender_roles: input.roles,
      allowed_sender_user_ids: input.userIds,
    }

    const { data, error } = await supabase
      .from('notification_groups')
      .update({ metadata })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data as NotificationGroup
  },

  async deleteGroup(id: string) {
    const { error } = await supabase
      .from('notification_groups')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async listMembers(groupId: string): Promise<GroupMember[]> {
    // Join perfiles basic info
    // Hay dos FKs hacia perfiles: user_id y added_by. PostgREST necesita desambiguar.
    // Usamos la FK específica 'notification_group_members_user_id_fkey' para tomar el perfil del miembro (user_id)
    const { data, error } = await supabase
      .from('notification_group_members')
      .select('id, group_id, user_id, added_at, perfil:perfiles!notification_group_members_user_id_fkey(id, name, email, empresa_id, active)')
      .eq('group_id', groupId)
      .order('added_at', { ascending: false })
    if (error) throw error
    return (data || []).map((row: any) => ({
      id: row.id,
      group_id: row.group_id,
      user_id: row.user_id,
      added_at: row.added_at,
      perfil: row.perfil ? {
        id: row.perfil.id,
        name: row.perfil.name,
        email: row.perfil.email,
        empresa_id: row.perfil.empresa_id,
        active: row.perfil.active,
      } : undefined,
    }))
  },

  async addMembers(groupId: string, userIds: string[]) {
    if (!userIds || userIds.length === 0) return
    const rows = userIds.map(uid => ({ group_id: groupId, user_id: uid }))
    const { error } = await supabase
      .from('notification_group_members')
      .insert(rows, { defaultToNull: true })
    if (error) throw error
  },

  async removeMembers(groupId: string, userIds: string[]) {
    if (!userIds || userIds.length === 0) return
    const { error } = await supabase
      .from('notification_group_members')
      .delete()
      .eq('group_id', groupId)
      .in('user_id', userIds)
    if (error) throw error
  }
}

// Helpers para interpretar metadata y validar envío
export function getAllowedSenderRoles(group: NotificationGroup): string[] {
  const val = (group.metadata as any)?.allowed_sender_roles
  return Array.isArray(val) ? val : []
}

export function getAllowedSenderUserIds(group: NotificationGroup): string[] {
  const val = (group.metadata as any)?.allowed_sender_user_ids
  return Array.isArray(val) ? val : []
}

export function canUserSendToGroup(opts: { group: NotificationGroup; userId: string; userRoles: string[] }): boolean {
  const { group, userId, userRoles } = opts
  // Bypass para roles maestros por nombre
  const isMaster = userRoles.some(r => ['sistemas', 'gerente plataforma'].includes(r?.toLowerCase?.()))
  if (isMaster) return true
  const roleSet = new Set(getAllowedSenderRoles(group).map(r => r.toLowerCase()))
  const userSet = new Set(getAllowedSenderUserIds(group))
  if (userSet.has(userId)) return true
  return userRoles.some(r => roleSet.has(r.toLowerCase()))
}

export default notificationGroupsService
