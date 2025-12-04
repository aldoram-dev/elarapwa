import { useEffect, useState } from 'react'
import { Download, X, Sparkles } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [showTestMode, setShowTestMode] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Modo prueba - solo cerrar
      alert('✨ Así se vería el banner de instalación!\n\nEn producción, esto instalaría la PWA.')
      setShowTestMode(false)
      return
    }

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('✅ PWA instalada')
    } else {
      console.log('❌ Instalación cancelada')
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setShowTestMode(false)
    // Guardar en localStorage para no mostrar de nuevo por un tiempo
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  useEffect(() => {
    // No mostrar si ya fue descartado en las últimas 24 horas
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      const dayInMs = 24 * 60 * 60 * 1000
      if (Date.now() - dismissedTime < dayInMs) {
        setShowPrompt(false)
      }
    }

    // Modo de prueba: mostrar siempre si está en dev
    if (import.meta.env.DEV) {
      setShowTestMode(true)
    }
  }, [])

  // Mostrar si hay prompt real O si está en modo prueba
  if (!showPrompt && !showTestMode) return null
  if (!deferredPrompt && !showTestMode) return null

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-50">
      <div 
        className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          animation: 'slideUp 0.5s ease-out',
          boxShadow: '0 20px 60px -15px rgba(124, 58, 237, 0.5)'
        }}
      >
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors z-10 p-1 hover:bg-white/10 rounded-full"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 relative">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center ring-2 ring-white/30 relative">
              <Download className="w-7 h-7 text-white" />
              <Sparkles className="w-3 h-3 text-yellow-300 absolute -top-1 -right-1 animate-pulse" />
            </div>

            <div className="flex-1 pt-1">
              <h3 className="font-bold text-white text-lg mb-1.5 flex items-center gap-2">
                ¡Instala Elara!
                <span className="text-xs bg-yellow-400 text-purple-900 px-2 py-0.5 rounded-full font-semibold">NUEVO</span>
              </h3>
              <p className="text-purple-100 text-sm leading-relaxed">
                Accede más rápido y úsala sin conexión desde tu dispositivo
              </p>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 hover:scale-105"
            >
              Ahora no
            </button>
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-white hover:bg-purple-50 text-purple-700 font-semibold py-3 px-4 rounded-xl transition-all duration-200 hover:scale-105 shadow-lg"
            >
              Instalar
            </button>
          </div>
        </div>

        {/* Decoración */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(100px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
