import React from 'react'
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  IconButton, 
  Typography,
  Box,
  Slide
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import { TransitionProps } from '@mui/material/transitions'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
  showCloseButton?: boolean
  slideOver?: boolean
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="left" ref={ref} {...props} />
})

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  slideOver = true,
}) => {
  const sizeMap = {
    sm: 'sm',
    md: 'md',
    lg: 'lg',
    xl: 'xl',
    full: false
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      TransitionComponent={slideOver ? Transition : undefined}
      maxWidth={sizeMap[size] as 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false}
      fullWidth
      fullScreen={size === 'full'}
      PaperProps={{
        sx: {
          bgcolor: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(60px)',
          border: '2px solid rgba(255, 255, 255, 0.4)',
          borderRadius: size === 'full' ? 0 : 4,
          boxShadow: '0 16px 64px rgba(51, 65, 85, 0.25)',
          backgroundImage: 'none',
          ...(slideOver && {
            position: 'fixed',
            right: 16,
            top: 16,
            bottom: 16,
            m: 0,
            maxHeight: 'calc(100vh - 32px)',
            height: 'calc(100vh - 32px)',
            maxWidth: 700
          })
        }
      }}
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)'
          }
        }
      }}
    >
      {/* Header */}
      {(title || showCloseButton) && (
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 4,
            py: 3,
            borderBottom: '1px solid rgba(203, 213, 225, 0.4)',
            background: 'linear-gradient(to right, rgba(248, 250, 252, 0.6), rgba(255, 255, 255, 0.3))',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {title && (
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: '#334155',
                  letterSpacing: '-0.02em'
                }}
              >
                {title}
              </Typography>
            )}
            {description && (
              <Typography variant="body2" sx={{ mt: 0.5, color: '#475569', lineHeight: 1.5 }}>
                {description}
              </Typography>
            )}
          </Box>
          {showCloseButton && (
            <IconButton
              onClick={onClose}
              sx={{
                color: '#64748b',
                '&:hover': {
                  color: '#334155',
                  bgcolor: 'rgba(248, 250, 252, 0.6)',
                  transform: 'scale(1.05)'
                },
                '&:active': {
                  transform: 'scale(0.95)'
                },
                transition: 'all 0.2s'
              }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
      )}

      {/* Content */}
      <DialogContent
        sx={{
          px: 4,
          py: 3,
          overflowY: 'auto',
          bgcolor: 'rgba(248, 250, 252, 0.95)',
          '&::-webkit-scrollbar': {
            width: '8px'
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'rgba(226, 232, 240, 0.3)',
            borderRadius: 2
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'rgba(100, 116, 139, 0.4)',
            borderRadius: 2,
            '&:hover': {
              bgcolor: 'rgba(100, 116, 139, 0.6)'
            }
          }
        }}
      >
        {children}
      </DialogContent>

      {/* Footer */}
      {footer && (
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            borderTop: '1px solid rgba(226, 232, 240, 0.8)',
            borderBottomLeftRadius: size === 'full' ? 0 : 16,
            borderBottomRightRadius: size === 'full' ? 0 : 16
          }}
        >
          {footer}
        </DialogActions>
      )}
    </Dialog>
  )
}

export default Modal
