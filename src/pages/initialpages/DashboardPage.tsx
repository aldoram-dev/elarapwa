import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@components/ui'
import { useAuth } from '@/context/AuthContext'
import { Sparkles, Users, Activity, Settings } from 'lucide-react'
import { templateConfig } from '@/config/template'

const DashboardPage: React.FC = () => {
  const { perfil, user } = useAuth()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Bienvenido, {perfil?.name || 'Usuario'}
            </h1>
            <p className="text-slate-600 mt-1">
              {templateConfig.app.name} - Panel de Control
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Nivel de Acceso</CardTitle>
              <div className="p-2 rounded-lg bg-violet-100">
                <Settings className="w-5 h-5 text-violet-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-600">
              {perfil?.nivel || 'Usuario'}
            </div>
            <CardDescription className="mt-2">
              {perfil?.nivel === 'Administrador' 
                ? 'Acceso completo al sistema' 
                : 'Acceso básico'}
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Estado</CardTitle>
              <div className="p-2 rounded-lg bg-green-100">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Activo
            </div>
            <CardDescription className="mt-2">
              Sesión iniciada correctamente
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Cuenta</CardTitle>
              <div className="p-2 rounded-lg bg-blue-100">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {user?.email?.split('@')[0] || 'Usuario'}
            </div>
            <CardDescription className="mt-2 truncate">
              {user?.email || 'Sin email'}
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Welcome Message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-600" />
            Información del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">
                ¡Bienvenido a {templateConfig.app.name}!
              </h3>
              <p className="text-slate-600">
                Esta es una versión simplificada de la plataforma. Tienes acceso a las siguientes secciones:
              </p>
            </div>
            
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-slate-700">
                <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                <span><strong>Inicio:</strong> Panel de control principal</span>
              </li>
              {perfil?.nivel === 'Administrador' && (
                <li className="flex items-center gap-2 text-slate-700">
                  <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                  <span><strong>Configuración:</strong> Gestión de usuarios del sistema</span>
                </li>
              )}
            </ul>

            {perfil?.nivel === 'Usuario' && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Nota:</strong> Tienes acceso de Usuario. Para solicitar permisos adicionales, contacta al administrador.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardPage
