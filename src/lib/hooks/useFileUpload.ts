import { useState, useCallback } from 'react'
import { fileStorageService, avatarService, documentService } from '../storage/fileStorageService'
import { useFileOptimizer } from '../storage/fileOptimizer'
import { FileUploadResult } from '../../types/files'

// =====================================================
// Hook para manejo completo de archivos
// =====================================================

export interface UseFileUploadOptions {
  bucket?: string
  folder?: string
  optimize?: boolean
  onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
  onOptimizationComplete?: (result: { originalSize: number; optimizedSize: number; compressionRatio: number }) => void
}

export interface FileUploadState {
  uploading: boolean
  optimizing: boolean
  progress: number
  error: string | null
  result: FileUploadResult | null
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [state, setState] = useState<FileUploadState>({
    uploading: false,
    optimizing: false,
    progress: 0,
    error: null,
    result: null
  })

  const { optimizeFile, formatFileSize } = useFileOptimizer()

  const uploadFile = useCallback(async (file: File) => {
    try {
      setState(prev => ({ 
        ...prev, 
        uploading: true, 
        optimizing: true, 
        error: null, 
        progress: 0 
      }))

      // Optimizar archivo si está habilitado
      let fileToUpload = file
      if (options.optimize !== false && file.type.startsWith('image/')) {
        const optimizationResult = await optimizeFile(file, 'general')
        
        if (optimizationResult.success && optimizationResult.data) {
          fileToUpload = optimizationResult.data.optimizedFile
          options.onOptimizationComplete?.({
            originalSize: optimizationResult.data.originalSize,
            optimizedSize: optimizationResult.data.optimizedSize,
            compressionRatio: optimizationResult.data.compressionRatio
          })
        }
      }

      setState(prev => ({ ...prev, optimizing: false, progress: 10 }))

      // Subir archivo
      const uploadOptions = {
        bucket: options.bucket || 'documents',
        path: options.folder ? `${options.folder}/${Date.now()}-${fileToUpload.name}` : undefined,
        isPublic: options.bucket === 'avatars',
        optimize: false // Ya lo optimizamos arriba
      }

      const result = await fileStorageService.uploadFile(
        fileToUpload, 
        uploadOptions,
        (progress) => {
          setState(prev => ({ ...prev, progress: 10 + (progress.percentage * 0.9) }))
          options.onProgress?.(progress)
        }
      )

      setState(prev => ({ 
        ...prev, 
        uploading: false, 
        progress: 100, 
        result 
      }))

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error subiendo archivo'
      setState(prev => ({ 
        ...prev, 
        uploading: false, 
        optimizing: false, 
        error: errorMessage 
      }))
      return { success: false, error: errorMessage }
    }
  }, [options, optimizeFile])

  const uploadAvatar = useCallback(async (file: File, userId: string) => {
    try {
      setState(prev => ({ 
        ...prev, 
        uploading: true, 
        optimizing: true, 
        error: null, 
        progress: 0 
      }))

      const result = await avatarService.uploadAvatar(file, userId)

      setState(prev => ({ 
        ...prev, 
        uploading: false, 
        optimizing: false, 
        progress: 100, 
        result 
      }))

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error subiendo avatar'
      setState(prev => ({ 
        ...prev, 
        uploading: false, 
        optimizing: false, 
        error: errorMessage 
      }))
      return { success: false, error: errorMessage }
    }
  }, [])

  const uploadDocument = useCallback(async (file: File, folder?: string) => {
    try {
      setState(prev => ({ 
        ...prev, 
        uploading: true, 
        error: null, 
        progress: 0 
      }))

      const result = await documentService.uploadDocument(file, folder)

      setState(prev => ({ 
        ...prev, 
        uploading: false, 
        progress: 100, 
        result 
      }))

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error subiendo documento'
      setState(prev => ({ 
        ...prev, 
        uploading: false, 
        error: errorMessage 
      }))
      return { success: false, error: errorMessage }
    }
  }, [])

  const reset = useCallback(() => {
    setState({
      uploading: false,
      optimizing: false,
      progress: 0,
      error: null,
      result: null
    })
  }, [])

  return {
    ...state,
    uploadFile,
    uploadAvatar,
    uploadDocument,
    reset,
    formatFileSize
  }
}

// =====================================================
// Hook para preview de archivos
// =====================================================

export function useFilePreview() {
  const [previewUrls, setPreviewUrls] = useState<Map<string, string>>(new Map())
  const { generatePreviewUrl, revokePreviewUrl } = useFileOptimizer()

  const createPreview = useCallback((file: File, id: string) => {
    // Revocar URL anterior si existe
    const existingUrl = previewUrls.get(id)
    if (existingUrl) {
      revokePreviewUrl(existingUrl)
    }

    // Crear nueva URL
    const url = generatePreviewUrl(file)
    setPreviewUrls(prev => new Map(prev.set(id, url)))
    
    return url
  }, [previewUrls, generatePreviewUrl, revokePreviewUrl])

  const removePreview = useCallback((id: string) => {
    const url = previewUrls.get(id)
    if (url) {
      revokePreviewUrl(url)
      setPreviewUrls(prev => {
        const newMap = new Map(prev)
        newMap.delete(id)
        return newMap
      })
    }
  }, [previewUrls, revokePreviewUrl])

  const clearAllPreviews = useCallback(() => {
    previewUrls.forEach(url => revokePreviewUrl(url))
    setPreviewUrls(new Map())
  }, [previewUrls, revokePreviewUrl])

  return {
    previewUrls,
    createPreview,
    removePreview,
    clearAllPreviews
  }
}

// =====================================================
// Hook para drag & drop de archivos
// =====================================================

export function useFileDrop(
  onFiles: (files: File[]) => void,
  accept?: string[],
  maxFiles?: number
) {
  const [isDragActive, setIsDragActive] = useState(false)
  const [isDragReject, setIsDragReject] = useState(false)

  const validateFiles = useCallback((files: File[]) => {
    if (maxFiles && files.length > maxFiles) {
      return { valid: false, error: `Máximo ${maxFiles} archivos permitidos` }
    }

    if (accept && accept.length > 0) {
      const invalidFiles = files.filter(file => 
        !accept.some(acceptedType => {
          if (acceptedType === '*/*') return true
          if (acceptedType.endsWith('/*')) {
            return file.type.startsWith(acceptedType.replace('/*', ''))
          }
          return file.type === acceptedType
        })
      )

      if (invalidFiles.length > 0) {
        return { 
          valid: false, 
          error: `Tipos de archivo no permitidos: ${invalidFiles.map(f => f.name).join(', ')}` 
        }
      }
    }

    return { valid: true }
  }, [accept, maxFiles])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    setIsDragReject(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Verificar si los archivos son válidos
    if (e.dataTransfer?.items) {
      const files = Array.from(e.dataTransfer.items)
        .filter(item => item.kind === 'file')
        .map(item => item.getAsFile())
        .filter((file): file is File => file !== null)
      
      const validation = validateFiles(files)
      setIsDragReject(!validation.valid)
    }
  }, [validateFiles])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    setIsDragReject(false)

    if (e.dataTransfer?.files) {
      const files = Array.from(e.dataTransfer.files)
      const validation = validateFiles(files)
      
      if (validation.valid) {
        onFiles(files)
      } else {
        console.error('Archivos inválidos:', validation.error)
        // Aquí podrías mostrar un toast o notificación
      }
    }
  }, [onFiles, validateFiles])

  return {
    isDragActive,
    isDragReject,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop
    }
  }
}
