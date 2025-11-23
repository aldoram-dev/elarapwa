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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2a2 2 0 00-2-2m0 0a2 2 0 00-2 2m2 2v6a2 2 0 01-2 2h-4a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v8a2 2 0 002 2h4a2 2 0 002-2V9a2 2 0 00-2-2" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Restablecer contraseña
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ingresa tu email y te enviaremos las instrucciones
          </p>

          {/* Indicador de estado de conexión */}
          <div className="mt-4 flex items-center justify-center">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
              isOnline 
                ? 'bg-green-100 text-green-800' 
                : 'bg-orange-100 text-orange-800'
            }`}>
              <div className={`h-2 w-2 rounded-full ${
                isOnline ? 'bg-green-500' : 'bg-orange-500'
              }`}></div>
              <span>{isOnline ? 'Conectado' : 'Sin conexión'}</span>
            </div>
          </div>

          {/* Estadísticas de solicitudes pendientes */}
          {stats.pending > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-800">
                  {stats.pending} solicitud{stats.pending > 1 ? 'es' : ''} pendiente{stats.pending > 1 ? 's' : ''} de envío
                </p>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Se enviarán automáticamente cuando se restablezca la conexión
              </p>
            </div>
          )}
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="relative block w-full rounded-lg border-0 py-3 px-4 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Mensaje de estado */}
          {message && (
            <div className={`rounded-lg p-4 ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200'
                : message.type === 'error'
                ? 'bg-red-50 border border-red-200'
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {message.type === 'success' && (
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  {message.type === 'error' && (
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                  {message.type === 'info' && (
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    message.type === 'success' 
                      ? 'text-green-800'
                      : message.type === 'error'
                      ? 'text-red-800'
                      : 'text-blue-800'
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
                  Enviando...
                </div>
              ) : (
                <>
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </span>
                  Enviar instrucciones
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

          {/* Información adicional para modo offline */}
          {!isOnline && (
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="text-sm font-medium text-gray-800 mb-2">Modo sin conexión</h3>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Las solicitudes se guardarán localmente</li>
                <li>• Se enviarán automáticamente al recuperar la conexión</li>
                <li>• Puedes cerrar la aplicación sin perder las solicitudes</li>
              </ul>
            </div>
          )}
        </form>

        {/* Footer con info del template */}
        <div className="text-center text-xs text-gray-500">
          <p>{templateConfig.app.name} v{templateConfig.app.version}</p>
        </div>
      </div>
    </div>
  );
}
