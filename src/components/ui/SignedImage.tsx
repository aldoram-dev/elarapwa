import React, { useEffect, useState } from 'react'
import { getSignedUrl, extractPathFromUrl } from '@/lib/utils/storageUtils'
import { cn } from '@/lib/utils'

interface SignedImageProps {
  path: string            // Ruta relativa dentro del bucket, o URL completa
  bucket: string          // Nombre del bucket (ej: 'avatars', 'documents')
  alt: string
  className?: string
  width?: number | string
  height?: number | string
  onClick?: () => void
  fallback?: React.ReactNode  // Componente o imagen a mostrar si falla
}

/**
 * Componente que muestra imágenes desde Supabase Storage generando URLs firmadas automáticamente
 * 
 * @example
 * <SignedImage 
 *   path="logos/empresa-123.png" 
 *   bucket="documents" 
 *   alt="Logo empresa"
 *   className="w-20 h-20 rounded-full"
 * />
 */
export const SignedImage: React.FC<SignedImageProps> = ({ 
  path, 
  bucket, 
  alt, 
  className,
  width,
  height,
  onClick,
  fallback 
}) => {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let mounted = true

    if (!path) {
      setUrl(null)
      setError(true)
      return
    }

    // Extraer ruta interna si viene una URL completa
    const internalPath = extractPathFromUrl(path, bucket)
    
    if (!internalPath) {
      setError(true)
      return
    }

    setLoading(true)
    setError(false)

    getSignedUrl(internalPath, bucket)
      .then(signedUrl => {
        if (mounted) {
          if (signedUrl) {
            setUrl(signedUrl)
          } else {
            setError(true)
          }
        }
      })
      .catch(err => {
        console.error('SignedImage error:', err)
        if (mounted) {
          setError(true)
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [path, bucket])

  // Loading state
  if (loading) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-gray-100 animate-pulse',
          className
        )}
        style={{ width, height }}
      >
        <svg 
          className="w-6 h-6 text-gray-400 animate-spin" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    )
  }

  // Error state
  if (error || !url) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-gray-100 text-gray-400',
          className
        )}
        style={{ width, height }}
      >
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
      </div>
    )
  }

  // Success state
  return (
    <img
      src={url}
      alt={alt}
      className={cn('object-cover', className)}
      style={{ width, height }}
      onClick={onClick}
      onError={() => setError(true)}
    />
  )
}

export default SignedImage
