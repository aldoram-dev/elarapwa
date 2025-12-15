import { useEffect, useState } from 'react'
// @ts-ignore - Virtual module from vite-plugin-pwa
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Snackbar, Button, Box, Typography } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'

/**
 * Componente que detecta cuando hay una nueva versión de la PWA
 * y muestra un mensaje al usuario para que actualice.
 * 
 * Configuración en vite.config.ts:
 * - registerType: 'prompt' -> Permite control manual de actualización
 * 
 * Este componente resuelve el problema de que los usuarios vean
 * versiones viejas después de hacer deploy.
 */
export default function ReloadPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onRegistered(r: any) {
      // Verificar actualizaciones cada 60 segundos
      if (r) {
        setInterval(() => {
          r.update()
        }, 60000)
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onRegisterError(error: any) {
      console.error('Error al registrar Service Worker:', error)
    },
  })

  useEffect(() => {
    if (needRefresh) {
      setShowPrompt(true)
    }
  }, [needRefresh])

  const handleClose = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
    setShowPrompt(false)
  }

  const handleUpdate = () => {
    updateServiceWorker(true)
  }

  if (offlineReady) {
    return (
      <Snackbar
        open={true}
        autoHideDuration={3000}
        onClose={handleClose}
        message="App lista para funcionar offline"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    )
  }

  return (
    <Snackbar
      open={showPrompt}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{
        '& .MuiSnackbarContent-root': {
          backgroundColor: '#1976d2',
          minWidth: 300,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          backgroundColor: '#1976d2',
          borderRadius: 1,
          color: 'white',
        }}
      >
        <RefreshIcon />
        <Box sx={{ flex: 1 }}>
          <Typography variant="body1" fontWeight={600}>
            Nueva versión disponible
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Actualiza para ver los últimos cambios
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          onClick={handleUpdate}
          sx={{
            backgroundColor: 'white',
            color: '#1976d2',
            fontWeight: 600,
            '&:hover': {
              backgroundColor: '#f5f5f5',
            },
          }}
        >
          Actualizar
        </Button>
        <Button
          variant="text"
          size="small"
          onClick={handleClose}
          sx={{
            color: 'white',
            fontWeight: 600,
          }}
        >
          Más tarde
        </Button>
      </Box>
    </Snackbar>
  )
}
