import React from 'react'
import { TextField, TextFieldProps, InputAdornment, Box } from '@mui/material'
import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material'

export interface InputProps extends Omit<TextFieldProps, 'variant'> {
  variant?: 'default' | 'glass' | 'minimal'
  success?: boolean
  icon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ sx, label, error, helperText, icon, variant = 'default', success, ...props }, ref) => {
    const variantStyles = {
      default: {
        '& .MuiOutlinedInput-root': {
          height: 56,
          borderRadius: 7.5,
          bgcolor: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(60px)',
          border: '2px solid rgba(255, 255, 255, 0.5)',
          transition: 'all 0.3s ease-out',
          '& fieldset': { border: 'none' },
          '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.3)',
            border: '2px solid rgba(156, 39, 176, 0.3)',
            transform: 'scale(1.01)'
          },
          '&.Mui-focused': {
            bgcolor: 'rgba(255, 255, 255, 0.4)',
            border: '2px solid #9c27b0',
            transform: 'scale(1.02)',
            boxShadow: '0 0 0 4px rgba(156, 39, 176, 0.3)'
          },
          '&.Mui-error': {
            border: '2px solid rgba(239, 68, 68, 0.5)',
            '&.Mui-focused': {
              border: '2px solid #ef4444',
              boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.3)'
            }
          }
        },
        '& .MuiInputBase-input': {
          px: 3,
          fontSize: '1rem',
          fontWeight: 500,
          color: '#0f172a',
          '&::placeholder': { color: '#64748b', opacity: 1 }
        }
      },
      glass: {
        '& .MuiOutlinedInput-root': {
          height: 56,
          borderRadius: 7.5,
          bgcolor: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(60px)',
          border: '2px solid rgba(255, 255, 255, 0.6)',
          '& fieldset': { border: 'none' },
          '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.25)',
            border: '2px solid rgba(156, 39, 176, 0.5)',
            transform: 'scale(1.01)'
          },
          '&.Mui-focused': {
            bgcolor: 'rgba(255, 255, 255, 0.35)',
            border: '2px solid rgba(156, 39, 176, 0.8)',
            transform: 'scale(1.02)',
            boxShadow: '0 0 0 4px rgba(156, 39, 176, 0.4)'
          }
        },
        '& .MuiInputBase-input': {
          px: 3,
          fontSize: '1rem',
          fontWeight: 500,
          '&::placeholder': { color: 'rgba(100, 116, 139, 0.7)', opacity: 1 }
        }
      },
      minimal: {
        '& .MuiOutlinedInput-root': {
          height: 56,
          borderRadius: 0,
          bgcolor: 'transparent',
          backdropFilter: 'blur(10px)',
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          borderBottom: '3px solid #e9d5ff',
          '& fieldset': { border: 'none' },
          '&:hover': {
            borderBottom: '3px solid #c084fc'
          },
          '&.Mui-focused': {
            borderBottom: '3px solid #9c27b0',
            boxShadow: '0 4px 16px -4px rgba(168, 85, 247, 0.4)'
          }
        },
        '& .MuiInputBase-input': {
          px: 0,
          fontSize: '1rem',
          fontWeight: 500,
          '&::placeholder': { color: '#94a3b8', opacity: 1 }
        }
      }
    }

    const endAdornment = error ? (
      <InputAdornment position="end">
        <ErrorIcon sx={{ color: '#ef4444', fontSize: 20 }} />
      </InputAdornment>
    ) : success ? (
      <InputAdornment position="end">
        <CheckCircle sx={{ color: '#9c27b0', fontSize: 20 }} />
      </InputAdornment>
    ) : undefined

    return (
      <TextField
        ref={ref}
        label={label}
        error={!!error}
        helperText={error || helperText}
        fullWidth
        InputLabelProps={{
          sx: {
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#475569',
            '&.Mui-focused': { color: '#9c27b0' },
            '&.Mui-error': { color: '#ef4444' }
          }
        }}
        InputProps={{
          startAdornment: icon ? (
            <InputAdornment position="start">
              <Box sx={{ color: '#9c27b0', display: 'flex', alignItems: 'center' }}>
                {icon}
              </Box>
            </InputAdornment>
          ) : undefined,
          endAdornment
        }}
        FormHelperTextProps={{
          sx: {
            mx: 0,
            mt: 0.5,
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            '&.Mui-error': {
              color: '#dc2626',
              animation: 'slideUp 0.3s ease-out'
            }
          }
        }}
        sx={{
          ...variantStyles[variant],
          ...sx
        }}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

export default Input
