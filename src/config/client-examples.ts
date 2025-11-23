/**
 * EJEMPLO DE PERSONALIZACIÓN PARA CLIENTE
 * 
 * Copia este archivo como base para personalizar el template para un cliente específico.
 * Simplemente importa y sobrescribe las propiedades que necesites cambiar.
 */

import { templateConfig } from './template'

// Ejemplo 1: Cliente "TechCorp" con tema azul corporativo
export const techCorpConfig = {
  ...templateConfig,
  app: {
    ...templateConfig.app,
    name: 'TechCorp Admin',
    description: 'Sistema de gestión empresarial TechCorp',
  },
  branding: {
    ...templateConfig.branding,
    defaultTitle: 'TechCorp Admin',
    footerText: 'TechCorp Admin. Desarrollado por Wicho',
    welcomeTitle: 'Bienvenido al Sistema TechCorp',
    welcomeSubtitle: 'Panel de administración empresarial',
  },
  theme: {
    ...templateConfig.theme,
    primary: '29 78 216',        // blue-700
    primaryHover: '30 64 175',   // blue-800
    primaryLight: '239 246 255', // blue-50
  },
  links: {
    support: 'mailto:soporte@techcorp.com',
    documentation: 'https://docs.techcorp.com',
    privacy: 'https://techcorp.com/privacy',
  },
}

// Ejemplo 2: Cliente "GreenLife" con tema verde sustentable
export const greenLifeConfig = {
  ...templateConfig,
  app: {
    ...templateConfig.app,
    name: 'GreenLife Dashboard',
    description: 'Plataforma de sostenibilidad GreenLife',
  },
  branding: {
    ...templateConfig.branding,
    defaultTitle: 'GreenLife',
    footerText: 'GreenLife Dashboard. Construyendo un futuro sostenible',
    welcomeTitle: '🌱 Bienvenido a GreenLife',
    welcomeSubtitle: 'Tu plataforma de sostenibilidad',
  },
  theme: {
    ...templateConfig.theme,
    primary: '34 197 94',        // green-500
    primaryHover: '22 163 74',   // green-600
    primaryLight: '240 253 244', // green-50
    success: '34 197 94',        // green-500
  },
  features: {
    ...templateConfig.features,
    darkMode: true,  // Habilitar modo oscuro para este cliente
  },
}

// Ejemplo 3: Cliente "FinanceApp" con tema profesional púrpura
export const financeAppConfig = {
  ...templateConfig,
  app: {
    ...templateConfig.app,
    name: 'FinanceApp Pro',
    description: 'Gestión financiera profesional',
  },
  branding: {
    ...templateConfig.branding,
    defaultTitle: 'FinanceApp Pro',
    footerText: 'FinanceApp Pro. Soluciones financieras inteligentes',
    welcomeTitle: 'Bienvenido a FinanceApp Pro',
    welcomeSubtitle: 'Tu gestor financiero profesional',
  },
  theme: {
    ...templateConfig.theme,
    primary: '147 51 234',       // purple-600
    primaryHover: '126 34 206',  // purple-700
    primaryLight: '250 245 255', // purple-50
  },
  sampleData: {
    ...templateConfig.sampleData,
    dashboard: {
      totalProjects: 25,
      totalUsers: 150,
      totalItems: 1250,
      completionRate: 94,
    },
  },
}

/**
 * INSTRUCCIONES DE USO:
 * 
 * 1. Copia uno de los ejemplos anteriores como base
 * 2. Modifica los valores según las necesidades del cliente
 * 3. Importa la configuración en los componentes que la necesiten:
 * 
 *    import { techCorpConfig as templateConfig } from '@/config/client-example'
 * 
 * 4. O puedes sobrescribir la configuración principal:
 * 
 *    // En src/config/template.ts
 *    export { techCorpConfig as templateConfig } from './client-example'
 * 
 * 5. Para aplicar colores dinámicamente:
 * 
 *    import { applyCustomTheme } from '@/config/template'
 *    
 *    // En el componente principal o App.tsx
 *    useEffect(() => {
 *      applyCustomTheme(techCorpConfig.theme)
 *    }, [])
 */
