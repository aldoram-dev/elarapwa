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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando enlace...</p>
        </div>
      </div>
    );
  }

  // Si el token no es válido, mostrar error
  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
              Enlace inválido
            </h2>
            {message && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{message.text}</p>
              </div>
            )}
            <div className="mt-6">
              <Link
                to="/reset-request"
                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                Solicitar nuevo enlace
              </Link>
              <span className="mx-2 text-gray-300">|</span>
              <Link
                to="/login"
                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                Volver al login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-blue-600">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Nueva contraseña
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ingresa tu nueva contraseña
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                Nueva contraseña
              </label>
              <input
                id="new-password"
                name="new-password"
                type="password"
                autoComplete="new-password"
                required
                className="relative block w-full rounded-lg border-0 py-3 px-4 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="Ingresa tu nueva contraseña"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar contraseña
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                className="relative block w-full rounded-lg border-0 py-3 px-4 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="Confirma tu nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Requisitos de contraseña */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-800 mb-2">Requisitos de contraseña:</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className={`flex items-center ${newPassword.length >= 8 ? 'text-green-600' : ''}`}>
                <span className="mr-2">{newPassword.length >= 8 ? '✓' : '•'}</span>
                Al menos 8 caracteres
              </li>
              <li className={`flex items-center ${/[a-z]/.test(newPassword) ? 'text-green-600' : ''}`}>
                <span className="mr-2">{/[a-z]/.test(newPassword) ? '✓' : '•'}</span>
                Una letra minúscula
              </li>
              <li className={`flex items-center ${/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}`}>
                <span className="mr-2">{/[A-Z]/.test(newPassword) ? '✓' : '•'}</span>
                Una letra mayúscula
              </li>
              <li className={`flex items-center ${/[0-9]/.test(newPassword) ? 'text-green-600' : ''}`}>
                <span className="mr-2">{/[0-9]/.test(newPassword) ? '✓' : '•'}</span>
                Un número
              </li>
              <li className={`flex items-center ${/[^a-zA-Z0-9]/.test(newPassword) ? 'text-green-600' : ''}`}>
                <span className="mr-2">{/[^a-zA-Z0-9]/.test(newPassword) ? '✓' : '•'}</span>
                Un carácter especial
              </li>
            </ul>
          </div>

          {/* Mensaje de estado */}
          {message && (
            <div className={`rounded-lg p-4 ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {message.type === 'success' ? (
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    message.type === 'success' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {message.text}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg bg-indigo-600 py-3 px-4 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Actualizando...
                </div>
              ) : (
                <>
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  Actualizar contraseña
                </>
              )}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              ← Volver al login
            </Link>
          </div>
        </form>

        {/* Footer con info del template */}
        <div className="text-center text-xs text-gray-500">
          <p>{templateConfig.app.name} v{templateConfig.app.version}</p>
        </div>
      </div>
    </div>
  );
}
