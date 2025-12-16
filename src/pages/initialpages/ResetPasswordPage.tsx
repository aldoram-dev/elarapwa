import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useResetPassword } from '../../lib/hooks/useResetPassword';
import { templateConfig } from '../../config/template';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const navigate = useNavigate();
  
  const {
    loading,
    isOnline,
    requestPasswordReset,
    getRequestStats,
    loadSavedRequests
  } = useResetPassword();

  const stats = getRequestStats();

  // Cargar solicitudes guardadas al montar
  useEffect(() => {
    loadSavedRequests();
  }, [loadSavedRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!email.trim()) {
      setMessage({
        type: 'error',
        text: 'Por favor ingresa tu email'
      });
      return;
    }

    const result = await requestPasswordReset(email);
    
    setMessage({
      type: result.success ? (result.isPending ? 'info' : 'success') : 'error',
      text: result.message
    });

    if (result.success && !result.isPending) {
      // Redirigir después de 3 segundos si se envió exitosamente
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    }
  };

  return (
    <div style={{ 
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
        {/* Logo ELARA */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <img 
            src="/branding/applogo.svg" 
            alt="ELARA" 
            style={{ height: '2.5rem', width: 'auto' }}
          />
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '0.5rem'
          }}>
            Restablecer contraseña
          </h1>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            Ingresa tu correo y te enviaremos un enlace de recuperación
          </p>
        </div>

        {/* Indicador de estado de conexión */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '500',
            backgroundColor: isOnline ? '#f0fdf4' : '#fff7ed',
            color: isOnline ? '#15803d' : '#c2410c',
            border: `1px solid ${isOnline ? '#bbf7d0' : '#fed7aa'}`
          }}>
            <div style={{
              width: '0.5rem',
              height: '0.5rem',
              borderRadius: '9999px',
              backgroundColor: isOnline ? '#22c55e' : '#f97316',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}></div>
            <span>{isOnline ? 'En línea' : 'Sin conexión'}</span>
          </div>
        </div>

        {/* Estadísticas de solicitudes pendientes */}
        {stats.pending > 0 && (
          <div style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '0.75rem',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e3a8a', marginBottom: '0.25rem' }}>
              {stats.pending} solicitud{stats.pending > 1 ? 'es' : ''} pendiente{stats.pending > 1 ? 's' : ''}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#1e40af' }}>
              Se enviarán automáticamente al restablecer conexión
            </p>
          </div>
        )}

        <form id="reset-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label htmlFor="email" style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                border: '1.5px solid #e5e7eb',
                borderRadius: '0.75rem',
                outline: 'none',
                transition: 'all 0.2s',
                backgroundColor: loading ? '#f9fafb' : '#f9fafb',
                color: loading ? '#9ca3af' : '#111827'
              }}
              onFocus={(e) => {
                if (!loading) {
                  e.target.style.borderColor = '#3b82f6'
                  e.target.style.backgroundColor = 'white'
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
                }
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb'
                e.target.style.backgroundColor = '#f9fafb'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* Mensaje de estado */}
          {message && (
            <div style={{
              padding: '1rem',
              borderRadius: '0.75rem',
              borderLeft: '4px solid',
              borderLeftColor: message.type === 'success' ? '#22c55e' : message.type === 'error' ? '#ef4444' : '#3b82f6',
              backgroundColor: message.type === 'success' ? '#f0fdf4' : message.type === 'error' ? '#fef2f2' : '#eff6ff',
              textAlign: 'center'
            }}>
              <p style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: message.type === 'success' ? '#14532d' : message.type === 'error' ? '#7f1d1d' : '#1e3a8a'
              }}>
                {message.text}
              </p>
            </div>
          )}

        </form>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.75rem' }}>
          <button
            type="submit"
            form="reset-form"
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
            {loading ? 'Enviando instrucciones...' : 'Enviar enlace de recuperación'}
          </button>

          <div style={{ textAlign: 'center', paddingTop: '0.5rem' }}>
            <Link
              to="/login"
              style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#6366f1',
                textDecoration: 'none',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#4f46e5'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#6366f1'}
            >
              ← Volver al inicio de sesión
            </Link>
          </div>

          {/* Información adicional para modo offline */}
          {!isOnline && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '0.75rem'
            }}>
              <h3 style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '0.75rem',
                textAlign: 'center'
              }}>
                Modo sin conexión
              </h3>
              <ul style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.375rem'
              }}>
                <li>• Las solicitudes se guardarán de forma segura</li>
                <li>• Se procesarán al recuperar la conexión</li>
                <li>• No perderás tu progreso si cierras la app</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '2rem',
          fontSize: '0.75rem',
          color: '#9ca3af'
        }}>
          <p style={{ fontWeight: '500' }}>
            {templateConfig.app.name} <span style={{ color: '#d1d5db' }}>v{templateConfig.app.version}</span>
          </p>
          <p style={{ marginTop: '0.25rem' }}>
            Sistema de gestión de proyectos de construcción
          </p>
        </div>
      </div>
    </div>
  );
}
