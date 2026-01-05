import React, { useMemo, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { routes } from '@lib/routing/routes'
import { templateConfig } from '@/config/template'
import { useAuth } from '@/context/AuthContext'
import { filterRoutesByRole } from '@/config/permissions-config'
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Avatar,
  IconButton,
  Collapse,
  Chip,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import CircleIcon from '@mui/icons-material/Circle'
import { InstallPWAPrompt } from '@/components/general/InstallPWAPrompt'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface SidebarItem {
  title: string
  href: string
  icon: React.ReactNode
  children?: SidebarItem[]
}

const SidebarNavItem: React.FC<{ item: SidebarItem; depth?: number; onNavigate: () => void }> = ({ item, depth = 0, onNavigate }) => {
  const location = useLocation()
  const [expanded, setExpanded] = React.useState(true) // Expandido por defecto
  const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
  const hasChildren = item.children && item.children.length > 0

  // Auto-expandir si algÃºn hijo estÃ¡ activo
  React.useEffect(() => {
    if (hasChildren && item.children?.some(child => 
      location.pathname === child.href || location.pathname.startsWith(child.href + '/')
    )) {
      setExpanded(true)
    }
  }, [location.pathname, hasChildren, item.children])

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren && depth === 0) {
      e.preventDefault()
      setExpanded(!expanded)
    }
  }

  return (
    <Box sx={{ pl: depth * 2 }}>
      <ListItem disablePadding>
        <ListItemButton
          component={hasChildren && depth === 0 ? 'div' : NavLink}
          to={hasChildren && depth === 0 ? undefined : item.href}
          onClick={(e: React.MouseEvent) => {
            if (hasChildren && depth === 0) {
              handleClick(e)
            } else {
              onNavigate()
            }
          }}
          sx={{
            borderRadius: 3,
            mb: 0.5,
            py: 1.5,
            px: 2,
            background: isActive && depth > 0
              ? '#334155'
              : 'transparent',
            color: isActive && depth > 0 ? '#ffffff' : 'text.primary',
            '&:hover': {
              background: isActive && depth > 0
                ? '#334155'
                : 'rgba(51, 65, 85, 0.08)',
            },
            boxShadow: isActive && depth > 0 ? '0 4px 12px rgba(51, 65, 85, 0.25)' : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          {item.icon && (
            <ListItemIcon 
              sx={{ 
                minWidth: 40,
                color: isActive && depth > 0 ? '#ffffff' : 'primary.main',
              }}
            >
              {item.icon}
            </ListItemIcon>
          )}
          <ListItemText 
            primary={item.title}
            primaryTypographyProps={{
              fontWeight: 600,
              fontSize: '0.95rem',
            }}
          />
          {isActive && depth > 0 && (
            <CircleIcon 
              sx={{ 
                fontSize: 8, 
                color: 'primary.main',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                },
              }} 
            />
          )}
        </ListItemButton>
      </ListItem>
      {hasChildren && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {item.children?.map((child: any) => (
              <SidebarNavItem key={child.href} item={child} depth={depth + 1} onNavigate={onNavigate} />
            ))}
          </List>
        </Collapse>
      )}
    </Box>
  )
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { perfil, user } = useAuth()
  const location = useLocation()
  const prevLocationRef = useRef(location.pathname)

  // Cerrar sidebar solo cuando la ruta cambia (no en el primer render)
  useEffect(() => {
    if (prevLocationRef.current !== location.pathname) {
      onClose()
    }
    prevLocationRef.current = location.pathname
  }, [location.pathname, onClose])

  const menuItems: SidebarItem[] = useMemo(() => {
    const userRoles = perfil?.roles || [];
    const esContratista = perfil?.tipo === 'CONTRATISTA' || user?.user_metadata?.tipo === 'CONTRATISTA';
    
    console.log('[Sidebar] User roles:', userRoles);
    console.log('[Sidebar] Perfil completo:', perfil);
    console.log('[Sidebar] Routes totales:', routes.length);
    
    if (userRoles.length === 0) {
      console.log('[Sidebar] No roles, mostrando solo Inicio');
      const inicioRoute = routes.find(r => r.path === '/inicio');
      return inicioRoute ? [{
        title: inicioRoute.label,
        href: inicioRoute.path,
        icon: inicioRoute.icon,
        children: []
      }] : [];
    }

    const filteredRoutes = filterRoutesByRole(routes, userRoles);
    console.log('[Sidebar] Filtered routes:', filteredRoutes.length);

    const items = filteredRoutes.map(route => ({
      title: route.label,
      href: route.path,
      icon: route.icon,
      children: route.children
        ?.filter((child: any) => {
          // Filtrar rutas que requieren no ser contratista
          if (child.meta?.requiresNotContratista && esContratista) {
            return false;
          }
          return true;
        })
        .map((child: any) => ({
          title: child.label || '',
          href: child.path?.startsWith('/') ? child.path : `${route.path.replace(/\/$/, '')}/${child.path}`,
          icon: null,
        }))
    }))
    
    console.log('[Sidebar] Final menu items:', items);
    return items;
  }, [perfil?.roles, perfil?.tipo, user?.user_metadata?.tipo])
  
  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 320,
          top: 96,
          right: 16,
          height: 'calc(100vh - 112px)',
          borderRadius: 4,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(51, 65, 85, 0.2)',
          border: '1px solid rgba(51, 65, 85, 0.12)',
        },
      }}
      ModalProps={{
        keepMounted: true,
        BackdropProps: {
          sx: {
            top: 96,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(4px)',
          },
        },
      }}
    >
      {/* Header */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: '#475569',
              boxShadow: '0 4px 12px rgba(51, 65, 85, 0.3)',
            }}
          >
            <Typography variant="h6" fontWeight={700}>
              {templateConfig.app.name.charAt(0)}
            </Typography>
          </Avatar>
          <Typography 
            variant="h6" 
            fontWeight={700}
            sx={{
              color: '#334155',
            }}
          >
            {templateConfig.branding.defaultTitle}
          </Typography>
        </Box>
        <IconButton 
          onClick={onClose}
          sx={{
            color: '#334155',
            '&:hover': {
              bgcolor: 'rgba(51, 65, 85, 0.08)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        <List component="nav">
          {menuItems.map((item) => (
            <SidebarNavItem key={item.href} item={item} onNavigate={onClose} />
          ))}
        </List>
      </Box>

      {/* Footer */}
      <Box 
        sx={{ 
          borderTop: '1px solid',
          borderColor: 'divider',
          pt: 2,
          background: 'linear-gradient(to top, rgba(51, 65, 85, 0.05), transparent)',
        }}
      >
        {/* Botón de instalación PWA */}
        <InstallPWAPrompt variant="sidebar" />
        
        {/* Versión */}
        {templateConfig.navigation.showVersion && (
          <Box sx={{ px: 2, pb: 2 }}>
            <Chip 
              label={templateConfig.branding.versionText}
              size="small"
              sx={{
                width: '100%',
                fontWeight: 600,
                bgcolor: 'rgba(51, 65, 85, 0.08)',
                color: '#334155',
              }}
            />
          </Box>
        )}
      </Box>
    </Drawer>
  )
}


export default Sidebar
