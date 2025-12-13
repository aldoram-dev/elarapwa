/**
 * Configuración de la aplicación ELARA
 */

export const appConfig = {
  app: {
    name: 'ELARA',
    version: '1.0.0',
  },
  branding: {
    defaultTitle: 'ELARA - Sistema de Gestión',
    footerText: '© 2025 ELARA. Todos los derechos reservados.',
    versionText: 'v1.0.0',
  },
  links: {
    support: '#',
    documentation: '#',
    privacy: '#',
  },
  navigation: {
    showVersion: true,
  },
  theme: {
    primaryColor: '#1976d2',
    mode: 'light' as 'light' | 'dark',
  },
  features: {
    enableNotifications: true,
    enableOfflineMode: true,
  },
  sampleData: {},
}

