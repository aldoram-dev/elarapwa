import React, { useState } from 'react'
import { useAuth } from '@context/AuthContext'
import { SignedImage } from '@components/ui/SignedImage'
import { templateConfig } from '@/config/template'
import { useNavigate } from 'react-router-dom'
import {
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import LogoutIcon from '@mui/icons-material/Logout'
import PersonIcon from '@mui/icons-material/Person'

interface NavbarProps {
  onToggleSidebar: () => void
  isSidebarOpen: boolean
}

const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { perfil, signOut } = useAuth()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleUserMenuClose = () => {
    setAnchorEl(null)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      handleUserMenuClose()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Generar initiales del nombre o email del usuario
  const getInitials = (text?: string) => {
    if (!text) return 'U'
    return text.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
  }

  // Obtener display name del usuario y avatar
  const displayName = perfil?.name || (perfil?.email ?? 'Usuario')
  const userInitials = getInitials(displayName)
  const avatarPath = perfil?.avatar_url || null

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        top: 16,
        left: 16,
        right: 16,
        width: 'auto',
        maxWidth: 1400,
        mx: 'auto',
        bgcolor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: 4,
        border: '1px solid',
        borderColor: 'rgba(51, 65, 85, 0.12)',
        boxShadow: '0 4px 20px rgba(2, 6, 23, 0.08)',
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 70, md: 80 }, px: { xs: 2, md: 4 } }}>
        {/* Left - User Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            onClick={handleUserMenuClick}
            sx={{
              p: 0.5,
              '&:hover': {
                bgcolor: 'rgba(51, 65, 85, 0.08)',
              },
            }}
          >
            {avatarPath ? (
              <Avatar
                src={avatarPath}
                alt={displayName}
                sx={{
                  width: 44,
                  height: 44,
                  border: '2px solid #fff',
                }}
              />
            ) : (
              <Avatar
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: '#475569',
                  border: '2px solid white',
                  fontWeight: 700,
                }}
              >
                {userInitials}
              </Avatar>
            )}
          </IconButton>
          <Box sx={{ display: { xs: 'none', sm: 'block' }, ml: 1 }}>
            <Typography variant="body2" fontWeight={600} color="text.primary">
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {perfil?.roles?.[0] || perfil?.nivel || 'Usuario'}
            </Typography>
          </Box>
        </Box>

        {/* Center - Logo */}
        <Box
          sx={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Box
            component="img"
            src="/branding/applogo.svg"
            alt="Elara"
            sx={{
              height: 40,
              width: 'auto',
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))',
            }}
          />
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{
              display: { xs: 'none', md: 'block' },
              color: 'text.primary',
            }}
          >
            {templateConfig.app.name}
          </Typography>
        </Box>

        {/* Right - Menu Toggle */}
        <Box sx={{ ml: 'auto' }}>
          <IconButton
            onClick={onToggleSidebar}
            color="primary"
            sx={{
              '&:hover': {
                bgcolor: 'rgba(51, 65, 85, 0.08)',
                transform: 'scale(1.05)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            {isSidebarOpen ? <CloseIcon /> : <MenuIcon />}
          </IconButton>
        </Box>

        {/* User Menu Dropdown */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleUserMenuClose}
          PaperProps={{
            elevation: 3,
            sx: {
              mt: 1.5,
              minWidth: 250,
              borderRadius: 2,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            },
          }}
          transformOrigin={{ horizontal: 'left', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        >
          {/* User Info in Menu */}
          <Box sx={{ px: 2, py: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              {avatarPath ? (
                <Avatar src={avatarPath} alt={displayName} sx={{ width: 48, height: 48 }} />
              ) : (
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: '#475569',
                  }}
                >
                  {userInitials}
                </Avatar>
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {displayName}
                </Typography>
                <Chip
                  label={perfil?.nivel || 'Usuario'}
                  size="small"
                  color="primary"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              </Box>
            </Box>
            {perfil?.email && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {perfil.email}
              </Typography>
            )}
          </Box>

          <Divider />

          <MenuItem onClick={handleSignOut} sx={{ py: 1.5, color: 'error.main' }}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Cerrar sesión</ListItemText>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}

export default Navbar
