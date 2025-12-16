import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/core/supabaseClient';
import { templateConfig } from '../../config/template';
import { logSecurityEvent, getUserAgent } from '../../lib/services/securityEventService';

export default function ResetPasswordConfirmPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  // Verificar sesión existente (Supabase ya autenticó al usuario con el link de recuperación)
  useEffect(() => {
    const verifySession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setIsValidToken(false);
        setMessage({
          type: 'error',
          text: 'Tu enlace ha expirado o es inválido. Solicita uno nuevo.'
        });
      } else {
        setIsValidToken(true);
      }
    };
    verifySession();
  }, []);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Debe tener al menos 8 caracteres');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Debe contener al menos una letra minúscula');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Debe contener al menos una letra mayúscula');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Debe contener al menos un número');
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      errors.push('Debe contener al menos un carácter especial');
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validaciones
    if (!newPassword || !confirmPassword) {
      setMessage({
        type: 'error',
        text: 'Por favor completa todos los campos'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({
        type: 'error',
        text: 'Las contraseñas no coinciden'
      });
      return;
    }

    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      setMessage({
        type: 'error',
        text: `La contraseña no cumple los requisitos: ${passwordErrors.join(', ')}`
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setMessage({
          type: 'error',
          text: `Error al actualizar la contraseña: ${error.message}`
        });
        return;
      }

      setMessage({
        type: 'success',
        text: 'Contraseña actualizada exitosamente. Redirigiendo al login...'
      });

      // Registrar evento de seguridad
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        logSecurityEvent('password_reset_success', {
          userId: user.id,
          email: user.email,
          userAgent: getUserAgent() || undefined
        }).catch(err => console.warn('Error logging security event:', err));
      }

      // Cerrar sesión y redirigir al login después de 2 segundos
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/login');
      }, 2000);

    } catch (error) {
      setMessage({
        type: 'error',
        text: `Error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`
      });
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading mientras se verifica el token
  if (isValidToken === null) {
    return (
      <div style={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            border: '3px solid #e5e7eb',
            borderTopColor: '#3b82f6',
            borderRadius: '9999px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
            Verificando enlace...
          </p>
        </div>
      </div>
    );
  }

  // Si el token no es válido, mostrar error
  if (!isValidToken) {
    return (
      <div style={{ 
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
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
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 1
        }} />

        <div style={{
          position: 'relative',
          zIndex: 10,
          backgroundColor: 'white',
          borderRadius: '1.5rem',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          padding: '3rem 2.5rem',
          width: '100%',
          maxWidth: '26rem',
          textAlign: 'center'
        }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '9999px',
            backgroundColor: '#fee2e2',
            margin: '0 auto 1.5rem'
          }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          </div>

          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '1rem'
          }}>
            Enlace inválido o expirado
          </h2>

          {message && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{ fontSize: '0.875rem', color: '#7f1d1d' }}>
                {message.text}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2rem' }}>
            <Link
              to="/reset-request"
              style={{
                display: 'block',
                padding: '0.75rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '0.75rem',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.875rem',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
            >
              Solicitar nuevo enlace
            </Link>
            <Link
              to="/login"
              style={{
                display: 'block',
                padding: '0.75rem',
                color: '#6366f1',
                textDecoration: 'none',
                fontWeight: '500',
                fontSize: '0.875rem'
              }}
            >
              ← Volver al login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
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
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        zIndex: 1
      }} />

      <div style={{
        position: 'relative',
        zIndex: 10,
        backgroundColor: 'white',
        borderRadius: '1.5rem',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        padding: '3rem 2.5rem',
        width: '100%',
        maxWidth: '26rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <img 
            src="/branding/applogo.svg" 
            alt="ELARA" 
            style={{ height: '2.5rem', width: 'auto' }}
          />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '0.5rem'
          }}>
            Nueva contraseña
          </h1>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            Ingresa tu nueva contraseña segura
          </p>
        </div>

        <form id="confirm-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label htmlFor="new-password" style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Nueva contraseña
            </label>
            <input
              id="new-password"
              name="new-password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Ingresa tu nueva contraseña"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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

          <div>
            <label htmlFor="confirm-password" style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Confirmar contraseña
            </label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Confirma tu nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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

          {/* Requisitos de contraseña */}
          <div style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            padding: '1rem'
          }}>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '0.75rem'
            }}>
              Requisitos de contraseña:
            </h3>
            <ul style={{
              fontSize: '0.75rem',
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <li style={{
                display: 'flex',
                alignItems: 'center',
                color: newPassword.length >= 8 ? '#16a34a' : '#6b7280'
              }}>
                <span style={{ marginRight: '0.5rem', fontWeight: '600' }}>
                  {newPassword.length >= 8 ? '✓' : '•'}
                </span>
                Al menos 8 caracteres
              </li>
              <li style={{
                display: 'flex',
                alignItems: 'center',
                color: /[a-z]/.test(newPassword) ? '#16a34a' : '#6b7280'
              }}>
                <span style={{ marginRight: '0.5rem', fontWeight: '600' }}>
                  {/[a-z]/.test(newPassword) ? '✓' : '•'}
                </span>
                Una letra minúscula
              </li>
              <li style={{
                display: 'flex',
                alignItems: 'center',
                color: /[A-Z]/.test(newPassword) ? '#16a34a' : '#6b7280'
              }}>
                <span style={{ marginRight: '0.5rem', fontWeight: '600' }}>
                  {/[A-Z]/.test(newPassword) ? '✓' : '•'}
                </span>
                Una letra mayúscula
              </li>
              <li style={{
                display: 'flex',
                alignItems: 'center',
                color: /[0-9]/.test(newPassword) ? '#16a34a' : '#6b7280'
              }}>
                <span style={{ marginRight: '0.5rem', fontWeight: '600' }}>
                  {/[0-9]/.test(newPassword) ? '✓' : '•'}
                </span>
                Un número
              </li>
              <li style={{
                display: 'flex',
                alignItems: 'center',
                color: /[^a-zA-Z0-9]/.test(newPassword) ? '#16a34a' : '#6b7280'
              }}>
                <span style={{ marginRight: '0.5rem', fontWeight: '600' }}>
                  {/[^a-zA-Z0-9]/.test(newPassword) ? '✓' : '•'}
                </span>
                Un carácter especial
              </li>
            </ul>
          </div>

          {/* Mensaje de estado */}
          {message && (
            <div style={{
              padding: '1rem',
              borderRadius: '0.75rem',
              borderLeft: '4px solid',
              borderLeftColor: message.type === 'success' ? '#22c55e' : '#ef4444',
              backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
              textAlign: 'center'
            }}>
              <p style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: message.type === 'success' ? '#14532d' : '#7f1d1d'
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
            form="confirm-form"
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
            {loading ? 'Actualizando contraseña...' : 'Actualizar contraseña'}
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
              ← Volver al login
            </Link>
          </div>
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
