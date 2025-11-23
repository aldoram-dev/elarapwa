import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App'
import { AppProviders } from './context/AppProviders'
import { muiTheme } from './theme/muiTheme'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <AppProviders>
        <App />
      </AppProviders>
    </ThemeProvider>
  </StrictMode>
)
