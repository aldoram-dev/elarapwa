/**
 * Proyecto Elara - Configuración del template
 * 
 * Este archivo permite personalizar fácilmente el template para diferentes clientes
 * sin necesidad de modificar múltiples archivos en el código base.
 */

export const templateConfig = {
  // Información básica de la aplicación
  app: {
    name: 'Proyecto Elara',
    description: 'Sistema de gestión empresarial Elara',
    version: '1.0.0',
    author: 'Elara',
    url: 'https://elara.com',
  },

  // Branding y textos
  branding: {
    // Nombre que aparece en el header cuando no hay proyecto seleccionado
    defaultTitle: 'Proyecto Elara',
    
    // Texto del footer
    footerText: '',
    
    // Texto de la versión en el sidebar
    versionText: 'Proyecto Elara v1.0',
    
    // Mensaje de bienvenida
    welcomeTitle: 'Bienvenido a Proyecto Elara',
    welcomeSubtitle: 'Panel principal del proyecto',
  },

  // Configuración de autenticación
  auth: {
    loginTitle: 'Inicia sesión en tu cuenta',
    resetPasswordTitle: 'Restablecer contraseña',
    resetPasswordSubtitle: 'Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.',
  },

  // Configuración de colores del tema
  theme: {
    // Colores primarios (en formato RGB sin rgb())
    primary: '59 130 246',        // blue-500
    primaryHover: '37 99 235',    // blue-600
    primaryLight: '239 246 255',  // blue-50
    
    // Estados
    success: '34 197 94',         // green-500
    warning: '245 158 11',        // amber-500
    error: '239 68 68',           // red-500
    info: '59 130 246',           // blue-500
  },

  // Configuración de navegación
  navigation: {
    // Mostrar versión en el sidebar
    showVersion: true,
    
    // Permitir selector de proyecto en el navbar
    showProjectSelector: true,
    
    // Colapsar sidebar por defecto en móvil
    collapseSidebarMobile: true,
  },

  // Configuración de datos de ejemplo
  sampleData: {
    // Usar datos de ejemplo en el dashboard
    useSampleData: true,
    
    // Nombres de proyectos de ejemplo
    projectNames: ['Proyecto Alpha', 'Proyecto Beta', 'Proyecto Gamma'],
    
    // Datos del dashboard
    dashboard: {
      totalProjects: 12,
      totalUsers: 48,
      totalItems: 234,
      completionRate: 89,
    },
  },

  // Configuración de características
  features: {
    // Habilitar PWA
    pwa: true,
    
    // Habilitar notificaciones
    notifications: true,
    
    // Habilitar modo oscuro
    darkMode: false,
    
    // Habilitar multiidioma
    i18n: false,
  },

  // URLs y enlaces
  links: {
    support: '#',
    documentation: '#',
    privacy: '#',
  },
}

/**
 * Función para obtener colores CSS personalizados
 */
export const getThemeColors = () => {
  return {
    '--color-primary': templateConfig.theme.primary,
    '--color-primary-hover': templateConfig.theme.primaryHover,
    '--color-primary-light': templateConfig.theme.primaryLight,
    '--color-success': templateConfig.theme.success,
    '--color-warning': templateConfig.theme.warning,
    '--color-error': templateConfig.theme.error,
    '--color-info': templateConfig.theme.info,
  }
}

/**
 * Función para aplicar el tema personalizado
 */
export const applyCustomTheme = (colors?: Partial<typeof templateConfig.theme>) => {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const themeColors = { ...templateConfig.theme, ...colors }

  // Helper: parse "R G B" string
  const parseRgb = (rgb: string) => {
    const [r, g, b] = rgb.split(/\s+/).map(Number)
    return { r, g, b }
  }

  // RGB -> HSL
  const rgbToHsl = ({ r, g, b }: { r: number; g: number; b: number }) => {
    r /= 255; g /= 255; b /= 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h = 0, s = 0
    const l = (max + min) / 2
    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break
        case g: h = (b - r) / d + 2; break
        case b: h = (r - g) / d + 4; break
      }
      h /= 6
    }
    return { h, s, l }
  }

  // HSL -> RGB string "R G B"
  const hslToRgbStr = ({ h, s, l }: { h: number; s: number; l: number }) => {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    let r: number, g: number, b: number
    if (s === 0) {
      r = g = b = l
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1/3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1/3)
    }
    return `${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)}`
  }

  // Generate scale around base lightness
  const generateScale = (rgb: string) => {
    try {
      const base = rgbToHsl(parseRgb(rgb))
      // Desired relative deltas for Tailwind-like 50..900
      const deltas: Record<string, number> = {
        '50': 0.50,
        '100': 0.42,
        '200': 0.32,
        '300': 0.22,
        '400': 0.12,
        '500': 0,
        '600': -0.08,
        '700': -0.16,
        '800': -0.23,
        '900': -0.30,
      }
      const scale: Record<string, string> = {}
      Object.entries(deltas).forEach(([key, delta]) => {
        const l = Math.min(0.96, Math.max(0.04, base.l + delta))
        scale[key] = hslToRgbStr({ h: base.h, s: base.s, l })
      })
      return scale
    } catch (e) {
      return null
    }
  }

  const primaryScale = generateScale(themeColors.primary)
  if (primaryScale) {
    Object.entries(primaryScale).forEach(([step, value]) => {
      root.style.setProperty(`--color-primary-${step}`, value)
    })
    // Convenience central tokens
    root.style.setProperty('--color-primary', themeColors.primary)
    root.style.setProperty('--color-primary-hover', primaryScale['600'])
    root.style.setProperty('--color-primary-light', primaryScale['50'])
  } else {
    root.style.setProperty('--color-primary', themeColors.primary)
    root.style.setProperty('--color-primary-hover', themeColors.primaryHover)
    root.style.setProperty('--color-primary-light', themeColors.primaryLight)
  }

  // Secondary / info acts as accent/info token mapping
  if (themeColors.info) {
    root.style.setProperty('--color-info', themeColors.info)
    root.style.setProperty('--color-accent', themeColors.info)
  }

  root.style.setProperty('--color-success', themeColors.success)
  root.style.setProperty('--color-warning', themeColors.warning)
  root.style.setProperty('--color-error', themeColors.error)
}

/**
 * Aplica el modo de tema (light/dark/system).
 * - system: usa matchMedia para detectar prefers-color-scheme
 * - light: borra la clase 'dark'
 * - dark: agrega la clase 'dark'
 */
export const applyThemeMode = (mode: 'system' | 'light' | 'dark') => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  let effective: 'light' | 'dark'
  if (mode === 'system') {
    effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } else {
    effective = mode
  }
  if (effective === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  root.setAttribute('data-theme', effective)
}

export default templateConfig
