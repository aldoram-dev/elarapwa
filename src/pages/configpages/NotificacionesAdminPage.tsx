import React, { useEffect, useState } from 'react'
import { useNotificationContext } from '@/context/NotificationContext'
import { useProject } from '@/context/ProjectContext'
import { useAuthRole } from '@/context/AuthContext'
import { RequireRole } from '@/components/auth/RequireRole'
import type { CreateNotificationInput, NotificationTargetType } from '@/types/notification'
import { useEmpresas } from '@/lib/hooks/useEmpresas'
import { supabase } from '@/lib/core/supabaseClient'

const initialForm: CreateNotificationInput = {
  title: '',
  message: '',
  type: 'info',
  priority: 'normal',
  target_type: 'all',
}

export default function NotificacionesAdminPage() {
  const ctx = useNotificationContext()
  const { empresas } = useEmpresas()
  // Roles fijos para este sistema
  const roles = ['Administrador', 'Usuario']
  const [form, setForm] = useState<CreateNotificationInput>(initialForm)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    // Cargar grupos de destinatarios para selección
    (async () => {
      const { data } = await supabase
        .from('notification_groups')
        .select('id, name')
        .order('name', { ascending: true })
      setGroups(data || [])
    })()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const handleTargetType = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as NotificationTargetType
    setForm(f => ({ ...f, target_type: value, target_empresa_id: undefined, target_user_ids: undefined, target_roles: undefined, target_group_ids: undefined }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    // Crear notificación usando el servicio
    const newNotification: any = {
      ...form,
      id: crypto.randomUUID(),
      user_id: 'admin',
      created_at: new Date().toISOString(),
      read: false
    };
    ctx.addNotification(newNotification);
    const res = { success: true, data: newNotification };
    setLoading(false)
    if (res.success) {
      setResult('Notificación enviada correctamente')
      setForm(initialForm)
    } else {
      setResult('Error al enviar notificación')
    }
  }

  return (
    <RequireRole allowedNiveles={['Administrador']}>
      <div className="max-w-xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Enviar notificación</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Título</label>
            <input name="title" value={form.title} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block font-medium mb-1">Mensaje</label>
            <textarea name="message" value={form.message} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block font-medium mb-1">Tipo</label>
              <select name="type" value={form.type} onChange={handleChange} className="w-full border rounded px-3 py-2">
                <option value="info">Información</option>
                <option value="success">Éxito</option>
                <option value="warning">Advertencia</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block font-medium mb-1">Prioridad</label>
              <select name="priority" value={form.priority} onChange={handleChange} className="w-full border rounded px-3 py-2">
                <option value="low">Baja</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-medium mb-1">Destinatarios</label>
            <select name="target_type" value={form.target_type} onChange={handleTargetType} className="w-full border rounded px-3 py-2">
              <option value="all">Todos</option>
              <option value="empresa">Por empresa</option>
              <option value="role">Por rol</option>
              <option value="group">Por grupo</option>
            </select>
          </div>
          {form.target_type === 'empresa' && (
            <div>
              <label className="block font-medium mb-1">Empresa</label>
              <select name="target_empresa_id" value={form.target_empresa_id || ''} onChange={handleChange} className="w-full border rounded px-3 py-2">
                <option value="">Selecciona una empresa</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
          )}
          {form.target_type === 'role' && (
            <div>
              <label className="block font-medium mb-1">Roles (puedes elegir varios)</label>
              <select multiple name="target_roles" value={form.target_roles || []} onChange={e => {
                const selected = Array.from(e.target.selectedOptions).map(o => o.value)
                setForm(f => ({ ...f, target_roles: selected }))
              }} className="w-full border rounded px-3 py-2 min-h-[120px]">
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}
          {form.target_type === 'group' && (
            <div>
              <label className="block font-medium mb-1">Grupo(s) de destinatarios</label>
              <select multiple name="target_group_ids" value={form.target_group_ids || []} onChange={e => {
                const selected = Array.from(e.target.selectedOptions).map(o => o.value)
                setForm(f => ({ ...f, target_group_ids: selected }))
              }} className="w-full border rounded px-3 py-2 min-h-[120px]">
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <p className="text-xs text-slate-500 mt-1">Gestiona los grupos en Configuración → Roles y Permisos.</p>
            </div>
          )}
          <div>
            <button type="submit" className="bg-violet-600 text-white px-6 py-2 rounded font-semibold" disabled={loading}>
              {loading ? 'Enviando…' : 'Enviar notificación'}
            </button>
          </div>
          {result && <div className="mt-2 text-sm text-center text-emerald-700">{result}</div>}
        </form>
      </div>
    </RequireRole>
  )
}
