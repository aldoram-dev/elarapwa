import { useCallback, useEffect, useState } from 'react'
import notificationGroupsService, { GroupMember, NotificationGroup } from '@/lib/services/notificationGroupsService'

export function useNotificationGroups() {
  const [groups, setGroups] = useState<NotificationGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [membersByGroup, setMembersByGroup] = useState<Record<string, GroupMember[]>>({})
  const [membersLoading, setMembersLoading] = useState<Record<string, boolean>>({})

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await notificationGroupsService.listGroups()
      setGroups(data)
    } catch (e: any) {
      setError(e.message || 'Error cargando grupos')
    } finally {
      setLoading(false)
    }
  }, [])

  const createGroup = useCallback(async (input: { name: string; description?: string; color?: string; metadata?: Record<string, any> }) => {
    const group = await notificationGroupsService.createGroup(input)
    setGroups(prev => [...prev, group])
    return group
  }, [])

  const updateGroup = useCallback(async (id: string, updates: Partial<Omit<NotificationGroup, 'id'>>) => {
    const updated = await notificationGroupsService.updateGroup(id, updates)
    setGroups(prev => prev.map(g => g.id === id ? updated : g))
    return updated
  }, [])

  const deleteGroup = useCallback(async (id: string) => {
    await notificationGroupsService.deleteGroup(id)
    setGroups(prev => prev.filter(g => g.id !== id))
    setMembersByGroup(prev => { const clone = { ...prev }; delete clone[id]; return clone })
  }, [])

  const loadMembers = useCallback(async (groupId: string) => {
    setMembersLoading(prev => ({ ...prev, [groupId]: true }))
    try {
      const members = await notificationGroupsService.listMembers(groupId)
      setMembersByGroup(prev => ({ ...prev, [groupId]: members }))
    } finally {
      setMembersLoading(prev => ({ ...prev, [groupId]: false }))
    }
  }, [])

  const addMembers = useCallback(async (groupId: string, userIds: string[]) => {
    await notificationGroupsService.addMembers(groupId, userIds)
    await loadMembers(groupId)
  }, [loadMembers])

  const removeMembers = useCallback(async (groupId: string, userIds: string[]) => {
    await notificationGroupsService.removeMembers(groupId, userIds)
    await loadMembers(groupId)
  }, [loadMembers])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  return {
    groups,
    loading,
    error,
    fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    membersByGroup,
    membersLoading,
    loadMembers,
    addMembers,
    removeMembers,
  }
}

export default useNotificationGroups
