import React from 'react'
import { Box, Link, Typography } from '@mui/material'
import { templateConfig } from '@/config/template'

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      className="app-footer"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        zIndex: 40,
        height: 56,
        bgcolor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(226, 232, 240, 0.6)',
        px: 3
      }}
    >
      <Box
        sx={{
          height: '100%',
          maxWidth: 1400,
          mx: 'auto',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1.5
        }}
      >
        {/* Copyright */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.875rem', color: '#64748b' }}>
          <span>©</span>
          <span>{new Date().getFullYear()}</span>
          <Typography component="span" sx={{ fontWeight: 500, color: '#0f172a', fontSize: '0.875rem' }}>
            {templateConfig.branding.footerText}
          </Typography>
        </Box>

        {/* Links */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Link
            href={templateConfig.links.support}
            sx={{
              fontSize: '0.875rem',
              color: '#64748b',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'color 0.2s',
              '&:hover': { color: '#9c27b0' }
            }}
          >
            Soporte
          </Link>
          <Link
            href={templateConfig.links.documentation}
            sx={{
              fontSize: '0.875rem',
              color: '#64748b',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'color 0.2s',
              '&:hover': { color: '#9c27b0' }
            }}
          >
            Documentación
          </Link>
          <Link
            href={templateConfig.links.privacy}
            sx={{
              fontSize: '0.875rem',
              color: '#64748b',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'color 0.2s',
              '&:hover': { color: '#9c27b0' }
            }}
          >
            Privacidad
          </Link>
        </Box>
      </Box>
    </Box>
  )
}

export default Footer
