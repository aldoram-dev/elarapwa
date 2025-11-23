import React, { useState } from 'react'
import { 
  TestTube, 
  Database, 
  Trash2, 
  Users, 
  Building2, 
  FolderOpen, 
  Shield, 
  Bell,
  Palette,
  Key,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { supabase } from '@/lib/core/supabaseClient'

interface TestResult {
  name: string
  status: 'success' | 'error' | 'pending'
  message: string
  duration?: number
}

export default function SandboxPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result])
  }

  const clearResults = () => setResults([])

  // Generar datos de ejemplo
  const generateSampleData = async () => {
    setLoading(true)
    clearResults()

    try {
      // Test 1: Crear empresa de prueba
      const start1 = Date.now()
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .insert({
          nombre: `Empresa Demo ${Date.now()}`,
          correo: `demo${Date.now()}@test.com`,
          telefono: '555-0100'
        })
        .select()
        .single()

      addResult({
        name: 'Crear empresa de prueba',
        status: empresaError ? 'error' : 'success',
        message: empresaError ? empresaError.message : `Empresa creada: ${empresa.nombre}`,
        duration: Date.now() - start1
      })

      if (!empresaError && empresa) {
        // Test 2: Crear proyecto de prueba
        const start2 = Date.now()
        const { data: proyecto, error: proyectoError } = await supabase
          .from('proyectos')
          .insert({
            nombre: `Proyecto Demo ${Date.now()}`,
            descripcion: 'Proyecto generado automáticamente para pruebas',
            empresa_id: empresa.id
          })
          .select()
          .single()

        addResult({
          name: 'Crear proyecto de prueba',
          status: proyectoError ? 'error' : 'success',
          message: proyectoError ? proyectoError.message : `Proyecto creado: ${proyecto?.nombre}`,
          duration: Date.now() - start2
        })
      }

    } catch (error) {
      addResult({
        name: 'Error general',
        status: 'error',
        message: error instanceof Error ? error.message : 'Error desconocido'
      })
    } finally {
      setLoading(false)
    }
  }

  // Test de permisos
  const testPermissions = async () => {
    setLoading(true)
    clearResults()

    try {
      const start = Date.now()
      const { data: permisos, error } = await supabase
        .from('permisos')
        .select('*')
        .limit(5)

      addResult({
        name: 'Verificar permisos',
        status: error ? 'error' : 'success',
        message: error ? error.message : `${permisos?.length || 0} permisos encontrados`,
        duration: Date.now() - start
      })

      if (!error && permisos) {
        const start2 = Date.now()
        const { data: roles, error: rolesError } = await supabase
          .from('roles')
          .select('*')

        addResult({
          name: 'Verificar roles',
          status: rolesError ? 'error' : 'success',
          message: rolesError ? rolesError.message : `${roles?.length || 0} roles encontrados`,
          duration: Date.now() - start2
        })
      }
    } catch (error) {
      addResult({
        name: 'Error en test de permisos',
        status: 'error',
        message: error instanceof Error ? error.message : 'Error desconocido'
      })
    } finally {
      setLoading(false)
    }
  }

  // Test de notificaciones
  const testNotifications = async () => {
    setLoading(true)
    clearResults()

    try {
      const start = Date.now()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        addResult({
          name: 'Test de notificaciones',
          status: 'error',
          message: 'Usuario no autenticado'
        })
        return
      }

      const { error } = await supabase
        .from('notifications')
        .insert({
          title: 'Notificación de prueba',
          message: 'Esta es una notificación generada automáticamente para testing',
          type: 'info',
          priority: 'normal',
          target_type: 'user',
          target_ids: [user.id]
        })

      addResult({
        name: 'Crear notificación de prueba',
        status: error ? 'error' : 'success',
        message: error ? error.message : 'Notificación creada exitosamente',
        duration: Date.now() - start
      })
    } catch (error) {
      addResult({
        name: 'Error en test de notificaciones',
        status: 'error',
        message: error instanceof Error ? error.message : 'Error desconocido'
      })
    } finally {
      setLoading(false)
    }
  }

  // Test de security events
  const testSecurityEvents = async () => {
    setLoading(true)
    clearResults()

    try {
      const start = Date.now()
      const { data: events, error } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      addResult({
        name: 'Consultar eventos de seguridad',
        status: error ? 'error' : 'success',
        message: error ? error.message : `${events?.length || 0} eventos encontrados`,
        duration: Date.now() - start
      })

      if (!error && events && events.length > 0) {
        const eventTypes = [...new Set(events.map(e => e.event_type))]
        addResult({
          name: 'Tipos de eventos registrados',
          status: 'success',
          message: eventTypes.join(', ')
        })
      }
    } catch (error) {
      addResult({
        name: 'Error en test de security events',
        status: 'error',
        message: error instanceof Error ? error.message : 'Error desconocido'
      })
    } finally {
      setLoading(false)
    }
  }

  // Test de platform settings
  const testPlatformSettings = async () => {
    setLoading(true)
    clearResults()

    try {
      const start = Date.now()
      const { data: settings, error } = await supabase
        .from('platform_settings')
        .select('*')

      addResult({
        name: 'Consultar platform settings',
        status: error ? 'error' : 'success',
        message: error ? error.message : `${settings?.length || 0} configuraciones encontradas`,
        duration: Date.now() - start
      })

      if (!error && settings && settings.length > 0) {
        const withColors = settings.filter(s => s.primary_color && s.secondary_color)
        addResult({
          name: 'Configuraciones con colores',
          status: 'success',
          message: `${withColors.length}/${settings.length} tienen colores personalizados`
        })
      }
    } catch (error) {
      addResult({
        name: 'Error en test de platform settings',
        status: 'error',
        message: error instanceof Error ? error.message : 'Error desconocido'
      })
    } finally {
      setLoading(false)
    }
  }

  // Limpiar datos de prueba
  const cleanupTestData = async () => {
    if (!confirm('¿Estás seguro de eliminar todos los datos de prueba? Esta acción no se puede deshacer.')) {
      return
    }

    setLoading(true)
    clearResults()

    try {
      // Eliminar empresas demo
      const start1 = Date.now()
      const { error: empresasError } = await supabase
        .from('empresas')
        .delete()
        .like('nombre', 'Empresa Demo%')

      addResult({
        name: 'Limpiar empresas demo',
        status: empresasError ? 'error' : 'success',
        message: empresasError ? empresasError.message : 'Empresas demo eliminadas',
        duration: Date.now() - start1
      })

      // Eliminar proyectos demo
      const start2 = Date.now()
      const { error: proyectosError } = await supabase
        .from('proyectos')
        .delete()
        .like('nombre', 'Proyecto Demo%')

      addResult({
        name: 'Limpiar proyectos demo',
        status: proyectosError ? 'error' : 'success',
        message: proyectosError ? proyectosError.message : 'Proyectos demo eliminados',
        duration: Date.now() - start2
      })

      // Limpiar eventos antiguos de seguridad
      const start3 = Date.now()
      const { data: cleanupCount, error: cleanupError } = await supabase
        .rpc('cleanup_old_security_events')

      addResult({
        name: 'Limpiar eventos antiguos',
        status: cleanupError ? 'error' : 'success',
        message: cleanupError ? cleanupError.message : `${cleanupCount || 0} eventos eliminados`,
        duration: Date.now() - start3
      })

    } catch (error) {
      addResult({
        name: 'Error en limpieza',
        status: 'error',
        message: error instanceof Error ? error.message : 'Error desconocido'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TestTube className="w-6 h-6 text-purple-600" />
            Área de Pruebas
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Prueba funcionalidades, genera datos de ejemplo y verifica el sistema
          </p>
        </div>
      </div>

      {/* Test Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <Database className="w-8 h-8 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Datos de Ejemplo</h3>
              <p className="text-sm text-gray-600 mb-3">
                Genera empresas y proyectos de prueba
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={generateSampleData}
                disabled={loading}
                icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              >
                Generar Datos
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Permisos y Roles</h3>
              <p className="text-sm text-gray-600 mb-3">
                Verifica sistema de permisos
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={testPermissions}
                disabled={loading}
                icon={<Shield className="w-4 h-4" />}
              >
                Test Permisos
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <Bell className="w-8 h-8 text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Notificaciones</h3>
              <p className="text-sm text-gray-600 mb-3">
                Crea notificación de prueba
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={testNotifications}
                disabled={loading}
                icon={<Bell className="w-4 h-4" />}
              >
                Test Notificaciones
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <Key className="w-8 h-8 text-purple-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Security Events</h3>
              <p className="text-sm text-gray-600 mb-3">
                Consulta logs de seguridad
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={testSecurityEvents}
                disabled={loading}
                icon={<Key className="w-4 h-4" />}
              >
                Ver Eventos
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <Palette className="w-8 h-8 text-pink-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Theming</h3>
              <p className="text-sm text-gray-600 mb-3">
                Verifica personalización
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={testPlatformSettings}
                disabled={loading}
                icon={<Palette className="w-4 h-4" />}
              >
                Test Theming
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-2 border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <Trash2 className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Limpiar</h3>
              <p className="text-sm text-gray-600 mb-3">
                Elimina datos de prueba
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={cleanupTestData}
                disabled={loading}
                icon={<Trash2 className="w-4 h-4" />}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Limpiar Todo
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Resultados de Pruebas</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={clearResults}
              icon={<Trash2 className="w-4 h-4" />}
            >
              Limpiar
            </Button>
          </div>
          <div className="space-y-2">
            {results.map((result, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  result.status === 'success'
                    ? 'bg-green-50 border-green-200'
                    : result.status === 'error'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                {result.status === 'success' && (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                )}
                {result.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                {result.status === 'pending' && (
                  <Loader2 className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5 animate-spin" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">{result.name}</p>
                  <p className="text-sm text-gray-600 break-words">{result.message}</p>
                  {result.duration !== undefined && (
                    <p className="text-xs text-gray-500 mt-1">
                      Duración: {result.duration}ms
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Info */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Nota sobre el área de pruebas:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Los datos generados tienen prefijo "Demo" para identificación fácil</li>
              <li>La limpieza solo afecta datos con prefijos de prueba</li>
              <li>Los eventos de seguridad se limpian automáticamente después de 90 días</li>
              <li>Esta área está protegida con permisos de administrador</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
