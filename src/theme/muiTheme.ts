import { createTheme } from '@mui/material/styles'

// Tema sobrio: primario teal y acentos cálidos; fondos gris neutro
export const muiTheme = createTheme({
  palette: {
    primary: {
      main: '#0ea5a8', // Teal 500
      light: '#2dd4bf',
      dark: '#0f766e',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f59e0b', // Amber
      light: '#fbbf24',
      dark: '#d97706',
      contrastText: '#ffffff',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    info: {
      main: '#0ea5a8',
      light: '#2dd4bf',
      dark: '#0f766e',
    },
    background: {
      default: '#f3f4f6', // gray-100
      paper: '#ffffff',
    },
    text: {
      primary: '#111827', // gray-900
      secondary: '#6b7280', // gray-500
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 700,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 16, // Más redondeado
  },
  shadows: [
    'none',
    '0 2px 4px rgba(14, 165, 168, 0.08)',
    '0 4px 8px rgba(14, 165, 168, 0.12)',
    '0 8px 16px rgba(14, 165, 168, 0.16)',
    '0 12px 24px rgba(14, 165, 168, 0.20)',
    '0 16px 32px rgba(14, 165, 168, 0.24)',
    '0 20px 40px rgba(14, 165, 168, 0.28)',
    '0 24px 48px rgba(14, 165, 168, 0.32)',
    '0 2px 4px rgba(0,0,0,0.05)',
    '0 4px 8px rgba(0,0,0,0.08)',
    '0 8px 16px rgba(0,0,0,0.10)',
    '0 12px 24px rgba(0,0,0,0.12)',
    '0 16px 32px rgba(0,0,0,0.14)',
    '0 20px 40px rgba(0,0,0,0.16)',
    '0 24px 48px rgba(0,0,0,0.18)',
    '0 32px 64px rgba(0,0,0,0.20)',
    '0 40px 80px rgba(0,0,0,0.22)',
    '0 48px 96px rgba(0,0,0,0.24)',
    '0 56px 112px rgba(0,0,0,0.26)',
    '0 64px 128px rgba(0,0,0,0.28)',
    '0 72px 144px rgba(0,0,0,0.30)',
    '0 80px 160px rgba(0,0,0,0.32)',
    '0 88px 176px rgba(0,0,0,0.34)',
    '0 96px 192px rgba(0,0,0,0.36)',
    '0 104px 208px rgba(0,0,0,0.38)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          fontSize: '0.95rem',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(14, 165, 168, 0.2)',
          },
        },
        contained: {
          '&:hover': {
            transform: 'translateY(-2px)',
            transition: 'transform 0.2s ease',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
        elevation1: {
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        },
        elevation2: {
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        },
        elevation3: {
          boxShadow: '0 12px 28px rgba(0,0,0,0.16)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '&:hover fieldset': {
              borderColor: '#14b8a6',
            },
            '&.Mui-focused fieldset': {
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          fontWeight: 500,
        },
      },
    },
  },
})
