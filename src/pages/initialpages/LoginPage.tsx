import React, { useState } from 'react'
import { Mail, Lock, LogIn } from 'lucide-react'
import { supabase } from '../../lib/core/supabaseClient'
import { templateConfig } from '../../config/template'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { logSecurityEvent, getUserAgent } from '../../lib/services/securityEventService'

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error, data } = await (supabase.auth as any).signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      
      // Evento registrado automáticamente por AuthContext en SIGNED_IN
    } catch (error: any) {
      setError(error.message)
      
      // Registrar intento fallido de login
      logSecurityEvent('login_failed', {
        email,
        userAgent: getUserAgent() || undefined,
        metadata: { error: error.message }
      }).catch(err => console.warn('Error logging security event:', err))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')

    try {
      const { error } = await (supabase.auth as any).signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/inicio`
        }
      })
      if (error) throw error
    } catch (error: any) {
      setError(error.message)
      setLoading(false)
    }
  }

  const GoogleIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.731 31.91 29.267 35 24 35c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.156 7.961 3.039l5.657-5.657C34.869 5.05 29.702 3 24 3 12.955 3 4 11.955 4 23s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.57 16.23 18.961 13 24 13c3.059 0 5.842 1.156 7.961 3.039l5.657-5.657C34.869 5.05 29.702 3 24 3 16.511 3 9.99 7.134 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 43c5.17 0 9.86-1.977 13.409-5.197l-6.191-5.238C29.166 34.488 26.713 35 24 35c-5.242 0-9.716-3.105-11.292-7.484l-6.54 5.036C9.806 39.668 16.323 43 24 43z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.085 3.147-3.31 5.64-6.085 7.061l.001.001 6.191 5.238C38.882 37.386 44 31.5 44 23c0-1.341-.138-2.651-.389-3.917z"/>
    </svg>
  )

  return (
    <div className="login-page min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="relative flex items-center justify-center min-h-screen p-4 sm:p-6">
        <div className="w-full max-w-md">
          {/* Brand header */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Proyecto Elara
            </h1>
            <p className="text-gray-600 mt-2 text-base">Bienvenido de vuelta</p>
          </div>

          {/* Main login card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 animate-scale-in">
            <div className="flex flex-col gap-6">
              <div className="text-center mb-2">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Inicia sesión en tu cuenta
                </h2>
                <p className="text-gray-500 text-sm">Accede a tu cuenta para continuar</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg animate-fade-in text-sm mb-4">
                  {error}
                </div>
              )}

              {/* Email first, then primary CTA */}

              {/* Email/Password Form */}
              <form id="login-form" onSubmit={handleEmailLogin} className="space-y-5">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                  label="Correo electrónico"
                  icon={<Mail className="icon text-slate-400" />}
                />

                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  label="Contraseña"
                  icon={<Lock className="icon text-slate-400" />}
                />
              </form>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <Button
                  type="submit"
                  form="login-form"
                  disabled={loading}
                  loading={loading}
                  variant="primary"
                  size="lg"
                  className="w-full"
                  icon={<LogIn className="icon" />}
                  iconPosition="left"
                >
                  {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                </Button>

                <Button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  icon={<GoogleIcon />}
                  iconPosition="left"
                >
                  {loading ? 'Conectando...' : 'Continuar con Google'}
                </Button>
              </div>

              {/* Footer links */}
              <div className="text-center space-y-3 mt-4">
                <a 
                  href="/reset-request" 
                  className="block text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </a>
                
                <div className="text-xs text-gray-500 leading-relaxed pt-4 border-t border-gray-100">
                  Al continuar, aceptas nuestros{' '}
                  <a href="#" className="text-purple-600 hover:text-purple-700 underline">Términos de Servicio</a>
                  {' '}y{' '}
                  <a href="#" className="text-purple-600 hover:text-purple-700 underline">Política de Privacidad</a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom decoration */}
          <div className="text-center mt-8 animate-fade-in">
            <p className="text-sm text-gray-500">
              Powered by <span className="font-semibold text-purple-600">Elara</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
