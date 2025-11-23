import React, { useState } from 'react'
import { Box } from '@mui/material'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import Footer from './Footer'

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f8fafc',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Navbar fixed */}
      <Navbar onToggleSidebar={toggleSidebar} isSidebarOpen={sidebarOpen} />

      {/* Contenido principal - Con padding extra por navbar floating */}
      <Box
        component="main"
        sx={{
          flex: 1,
          pt: '7rem', // Espacio para el navbar que está en top: 16px + altura
          pb: 4,
          transition: 'all 0.3s ease-out'
        }}
      >
        {/* Contenedor con más padding (spacious) */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            height: '100%'
          }}
        >
          <Box
            sx={{
              width: '100%',
              px: { xs: 2, sm: 3, md: 4, lg: 5, xl: 6 },
              py: 3
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Footer />
    </Box>
  )
}

export default Layout
