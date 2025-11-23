import { supabase } from '@/lib/core/supabaseClient'
import { Forum } from '@/types/forum'

/**
 * Asigna usuarios a un foro por rol, grupo o lista de IDs
 * @param foroId ID del foro
 * @param options { roleNames?: string[], groupNames?: string[], userIds?: string[] }
 */
export async function bulkAssignToForo(foroId: string, options: {
  roleNames?: string[],
  groupNames?: string[],
  userIds?: string[],
}) {
  // Buscar usuarios por roles
  let ids: string[] = []
  if (options.roleNames?.length) {
    const { data, error } = await supabase
      .from('roles_usuario')
      .select('user_id, roles(name)')
      .in('roles.name', options.roleNames)
    if (data) ids.push(...data.map((r: any) => r.user_id))
  }
  // Buscar usuarios por grupos (notificaciones)
  if (options.groupNames?.length) {
    // Primero obtener los IDs de los grupos por nombre
    const { data: groupsData, error: groupsError } = await supabase
      .from('notification_groups')
      .select('id')
      .in('name', options.groupNames)
    
    if (groupsData && groupsData.length > 0) {
      const groupIds = groupsData.map(g => g.id)
      // Luego obtener los miembros de esos grupos
      const { data: membersData, error: membersError } = await supabase
        .from('notification_group_members')
        .select('user_id')
        .in('group_id', groupIds)
      
      if (membersData) ids.push(...membersData.map((m: any) => m.user_id))
    }
  }
  // Agregar IDs directos
  if (options.userIds?.length) ids.push(...options.userIds)
  // Quitar duplicados
  ids = Array.from(new Set(ids))
  // Actualizar foro
  const { data: foro, error } = await supabase
    .from('foros')
    .update({ usuarios_asignados: ids })
    .eq('id', foroId)
    .select()
    .single()
  if (error) throw error
  return foro as Forum
}
