import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../core/supabaseClient'
import { useAuth } from '../../context/AuthContext'

export interface PlatformSettings {
  id?: string
  empresa_id: string | null
  nombre_publico: string | null
  logo_url: string | null
  favicon_url: string | null
  primary_color: string | null
  secondary_color: string | null
  theme: 'system' | 'light' | 'dark'
  idioma: string | null
  metadata?: Record<string, any> | null
  updated_at?: string
}

const defaults: PlatformSettings = {
  empresa_id: null,
  nombre_publico: null,
  logo_url: null,
  favicon_url: null,
  primary_color: null,
  secondary_color: null,
  theme: 'system',
  idioma: 'es',
  metadata: {}
}

export function usePlatformSettings() {
  const { perfil } = useAuth()
  const [settings, setSettings] = useState<PlatformSettings>(defaults)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    // Simplificado: siempre retorna defaults
    setSettings(defaults)
    setLoading(false)
  }, [])

  const save = useCallback(async (partial: Partial<PlatformSettings>) => {
    const payload = { ...settings, ...partial }
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      setSettings(prev => ({ ...prev, ...data }))
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Error guardando' }
    }
  }, [settings])

  useEffect(() => { load() }, [load])

  return { settings, loading, error, reload: load, save }
}