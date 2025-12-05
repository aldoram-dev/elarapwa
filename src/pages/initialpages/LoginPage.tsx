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
    <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.731 31.91 29.267 35 24 35c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.156 7.961 3.039l5.657-5.657C34.869 5.05 29.702 3 24 3 12.955 3 4 11.955 4 23s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.57 16.23 18.961 13 24 13c3.059 0 5.842 1.156 7.961 3.039l5.657-5.657C34.869 5.05 29.702 3 24 3 16.511 3 9.99 7.134 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 43c5.17 0 9.86-1.977 13.409-5.197l-6.191-5.238C29.166 34.488 26.713 35 24 35c-5.242 0-9.716-3.105-11.292-7.484l-6.54 5.036C9.806 39.668 16.323 43 24 43z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.085 3.147-3.31 5.64-6.085 7.061l.001.001 6.191 5.238C38.882 37.386 44 31.5 44 23c0-1.341-.138-2.651-.389-3.917z"/>
    </svg>
  )

  return (
    <div className="login-page" style={{ 
      minHeight: '100vh',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      {/* Imagen de fondo */}
      <img 
        src="/login_bg.png"
        alt="Background"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          zIndex: 0
        }}
      />
      
      {/* Overlay oscuro */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        zIndex: 1
      }} />

      {/* Card blanca centrada */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        backgroundColor: 'white',
        borderRadius: '1.5rem',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        padding: '3rem 2.5rem',
        width: '100%',
        maxWidth: '26rem',
        backdropFilter: 'blur(10px)'
      }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '0.5rem'
            }}>
              Acceso a Informe
            </h1>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              Ingresa tus credenciales
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg animate-fade-in text-sm mb-4">
              {error}
            </div>
          )}

          {/* Email/Password Form */}
          <form id="login-form" onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Usuario
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="correo@ejemplo.com"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '0.875rem',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: '0.75rem',
                  outline: 'none',
                  transition: 'all 0.2s',
                  backgroundColor: '#f9fafb'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6'
                  e.target.style.backgroundColor = 'white'
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb'
                  e.target.style.backgroundColor = '#f9fafb'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '0.875rem',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: '0.75rem',
                  outline: 'none',
                  transition: 'all 0.2s',
                  backgroundColor: '#f9fafb'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6'
                  e.target.style.backgroundColor = 'white'
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb'
                  e.target.style.backgroundColor = '#f9fafb'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>
          </form>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginTop: '1.75rem' }}>
            <button
              type="submit"
              form="login-form"
              disabled={loading}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                color: 'white',
                fontWeight: '600',
                padding: '0.875rem 1rem',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                height: '44px'
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-1px)', e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)')}
            >
              {loading ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '0.5rem 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
              <span style={{ padding: '0 1rem', fontSize: '0.75rem', color: '#9ca3af', fontWeight: '500' }}>O</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: 'white',
                color: '#374151',
                fontWeight: '600',
                padding: '0.875rem 1rem',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                border: '1.5px solid #e5e7eb',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.625rem',
                height: '44px'
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#f9fafb', e.currentTarget.style.borderColor = '#d1d5db')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white', e.currentTarget.style.borderColor = '#e5e7eb')}
            >
              <GoogleIcon />
              {loading ? 'Conectando...' : 'Continuar con Google'}
            </button>
          </div>

          {/* Footer links */}
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <a 
              href="/reset-request"
              style={{
                fontSize: '0.8125rem',
                color: '#6b7280',
                textDecoration: 'none',
                fontWeight: '500',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#1f2937'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
            >
              ¿Olvidaste tu contraseña?
            </a>
            
            <div style={{
              fontSize: '0.6875rem',
              color: '#9ca3af',
              lineHeight: '1.4',
              paddingTop: '1.25rem',
              marginTop: '1.25rem',
              borderTop: '1px solid #f3f4f6'
            }}>
              Al continuar, aceptas nuestros{' '}
              <a href="#" style={{ color: '#6b7280', textDecoration: 'underline' }}>Términos de Servicio</a>
              {' '}y{' '}
              <a href="#" style={{ color: '#6b7280', textDecoration: 'underline' }}>Política de Privacidad</a>
            </div>
          </div>

          {/* Bottom decoration */}
          <div style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid #f3f4f6'
          }}>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              Powered by <span style={{ fontWeight: '600', color: '#6b7280' }}>Elara</span>
            </p>
          </div>
      </div>
    </div>
  )
}

export default LoginPage
