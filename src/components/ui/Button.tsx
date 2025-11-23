import React from 'react'
import { Button as MuiButton, ButtonProps as MuiButtonProps, CircularProgress, SxProps, Theme } from '@mui/material'

export interface ButtonProps extends Omit<MuiButtonProps, 'size' | 'variant'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glass' | 'gradient' | 'cancel' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  children: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    sx,
    variant = 'primary', 
    size = 'md', 
    loading, 
    disabled, 
    icon, 
    iconPosition = 'left',
    children, 
    ...props 
  }, ref) => {
    const variantStyles: Record<string, SxProps<Theme>> = {
      primary: {
        bgcolor: 'rgba(255, 255, 255, 0.3)',
        backdropFilter: 'blur(40px)',
        color: 'primary.main',
        fontWeight: 700,
        border: '1px solid rgba(255, 255, 255, 0.5)',
        '&:hover': {
          bgcolor: 'rgba(255, 255, 255, 0.4)',
          transform: 'scale(1.02)',
          boxShadow: '0 20px 25px -5px rgba(20, 184, 166, 0.25)'
        },
        '&:active': {
          transform: 'scale(0.96)'
        },
        '&:disabled': {
          opacity: 0.6
        }
      },
      success: {
        bgcolor: 'primary.main',
        color: 'white',
        boxShadow: '0 10px 15px -3px rgba(20, 184, 166, 0.3)',
        '&:hover': {
          bgcolor: 'primary.dark',
          boxShadow: '0 20px 25px -5px rgba(20, 184, 166, 0.4)',
          transform: 'scale(1.02)'
        }
      },
      gradient: {
        background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.8) 0%, rgba(245, 158, 11, 0.8) 100%)',
        backdropFilter: 'blur(20px)',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        '&:hover': {
          background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.9) 0%, rgba(245, 158, 11, 0.9) 100%)',
          transform: 'scale(1.02)'
        }
      },
      secondary: {
        bgcolor: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(40px)',
        color: '#475569',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        '&:hover': {
          bgcolor: 'rgba(255, 255, 255, 0.3)',
          transform: 'scale(1.02)'
        }
      },
      outline: {
        border: '2px solid rgba(51, 65, 85, 0.4)',
        bgcolor: 'transparent',
        backdropFilter: 'blur(20px)',
        color: '#334155',
        '&:hover': {
          bgcolor: 'rgba(51, 65, 85, 0.05)',
          borderColor: '#334155',
          transform: 'scale(1.02)'
        }
      },
      cancel: {
        bgcolor: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(40px)',
        color: '#64748b',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        '&:hover': {
          bgcolor: 'rgba(255, 255, 255, 0.3)',
          color: '#1e293b'
        }
      },
      ghost: {
        bgcolor: 'transparent',
        backdropFilter: 'blur(10px)',
        color: '#475569',
        '&:hover': {
          bgcolor: 'rgba(255, 255, 255, 0.2)'
        }
      },
      danger: {
        bgcolor: 'rgba(239, 68, 68, 0.8)',
        backdropFilter: 'blur(20px)',
        color: 'white',
        border: '1px solid rgba(248, 113, 113, 0.5)',
        '&:hover': {
          bgcolor: 'rgba(220, 38, 38, 0.9)',
          transform: 'scale(1.02)'
        }
      },
      glass: {
        bgcolor: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(60px)',
        color: '#475569',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        '&:hover': {
          bgcolor: 'rgba(255, 255, 255, 0.25)',
          transform: 'scale(1.02)'
        }
      }
    }

    const sizeStyles: Record<string, SxProps<Theme>> = {
      sm: { height: 40, px: 2.5, fontSize: '0.875rem', gap: 1 },
      md: { height: 48, px: 3.5, fontSize: '1rem', gap: 1.5 },
      lg: { height: 56, px: 4, fontSize: '1.125rem', gap: 1.5 },
      xl: { height: 64, px: 5, fontSize: '1.25rem', gap: 2 }
    }

    const iconSize = size === 'sm' ? 16 : size === 'md' ? 20 : size === 'lg' ? 24 : 28

    const combinedSx: SxProps<Theme> = [
      {
        borderRadius: 4,
        fontWeight: 600,
        textTransform: 'none',
        transition: 'all 0.25s ease-out',
        overflow: 'hidden',
        position: 'relative',
        '&:disabled': {
          opacity: 0.6,
          pointerEvents: 'none'
        }
      },
      variantStyles[variant],
      sizeStyles[size],
      ...(Array.isArray(sx) ? sx : [sx])
    ]

    return (
      <MuiButton
        ref={ref}
        disabled={disabled || loading}
        sx={combinedSx}
        {...props}
      >
        {loading ? (
          <>
            <CircularProgress size={iconSize} sx={{ color: 'inherit', mr: 1 }} />
            <span style={{ opacity: 0.7 }}>Cargando...</span>
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <span style={{ display: 'flex', alignItems: 'center', width: iconSize, height: iconSize, transition: 'transform 0.2s' }}>
                {icon}
              </span>
            )}
            <span>{children}</span>
            {icon && iconPosition === 'right' && (
              <span style={{ display: 'flex', alignItems: 'center', width: iconSize, height: iconSize, transition: 'transform 0.2s' }}>
                {icon}
              </span>
            )}
          </>
        )}
      </MuiButton>
    )
  }
)

Button.displayName = 'Button'

export default Button
