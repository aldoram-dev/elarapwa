import { useEffect, useState } from 'react'
import { fetchForos } from '@/lib/services/forumService'
import type { Forum } from '@/types/forum'

export function useForos() {
  const [foros, setForos] = useState<Forum[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchForos()
      .then(setForos)
      .catch(e => setError(e.message || 'Error cargando foros'))
      .finally(() => setLoading(false))
  }, [])

  return { foros, loading, error }
}
