// =====================================================
// Helper para optimización de archivos
// =====================================================

export interface ImageOptimizationOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number // 0.1 a 1.0
  format?: 'jpeg' | 'png' | 'webp'
  maintainAspectRatio?: boolean
}

export interface FileOptimizationResult {
  optimizedFile: File
  originalSize: number
  optimizedSize: number
  compressionRatio: number
  dimensions?: {
    width: number
    height: number
  }
}

export interface ImageDimensions {
  width: number
  height: number
}

class FileOptimizerService {

  /**
   * Optimizar imagen con compresión y redimensionado
   */
  async optimizeImage(
    file: File, 
    options: ImageOptimizationOptions = {}
  ): Promise<FileOptimizationResult> {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'jpeg',
      maintainAspectRatio = true
    } = options

    return new Promise((resolve, reject) => {
      // Verificar que sea una imagen
      if (!file.type.startsWith('image/')) {
        reject(new Error('El archivo no es una imagen válida'))
        return
      }

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        try {
          // Calcular nuevas dimensiones
          const { width: newWidth, height: newHeight } = this.calculateOptimalDimensions(
            img.width, 
            img.height, 
            maxWidth, 
            maxHeight, 
            maintainAspectRatio
          )

          // Configurar canvas
          canvas.width = newWidth
          canvas.height = newHeight

          // Limpiar canvas con fondo blanco para JPEG
          if (format === 'jpeg') {
            ctx!.fillStyle = '#FFFFFF'
            ctx!.fillRect(0, 0, newWidth, newHeight)
          }

          // Dibujar imagen redimensionada
          ctx!.drawImage(img, 0, 0, newWidth, newHeight)

          // Convertir a blob con compresión
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Error al procesar la imagen'))
              return
            }

            // Crear nuevo archivo optimizado
            const optimizedFile = new File(
              [blob], 
              this.generateOptimizedFileName(file.name, format), 
              { 
                type: `image/${format}`,
                lastModified: Date.now()
              }
            )

            const compressionRatio = ((file.size - optimizedFile.size) / file.size) * 100

            resolve({
              optimizedFile,
              originalSize: file.size,
              optimizedSize: optimizedFile.size,
              compressionRatio: Math.max(0, compressionRatio),
              dimensions: {
                width: newWidth,
                height: newHeight
              }
            })
          }, `image/${format}`, quality)

        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => {
        reject(new Error('Error al cargar la imagen'))
      }

      // Cargar imagen
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Obtener dimensiones de una imagen sin cargarla completamente
   */
  async getImageDimensions(file: File): Promise<ImageDimensions> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('El archivo no es una imagen'))
        return
      }

      const img = new Image()
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        })
        URL.revokeObjectURL(img.src)
      }

      img.onerror = () => {
        reject(new Error('Error al cargar la imagen'))
        URL.revokeObjectURL(img.src)
      }

      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Crear thumbnail de una imagen
   */
  async createThumbnail(
    file: File, 
    size: number = 150
  ): Promise<File> {
    const result = await this.optimizeImage(file, {
      maxWidth: size,
      maxHeight: size,
      quality: 0.7,
      format: 'jpeg',
      maintainAspectRatio: true
    })

    return result.optimizedFile
  }

  /**
   * Optimizar avatar específicamente
   */
  async optimizeAvatar(file: File): Promise<FileOptimizationResult> {
    return this.optimizeImage(file, {
      maxWidth: 400,
      maxHeight: 400,
      quality: 0.85,
      format: 'webp',
      maintainAspectRatio: true
    })
  }

  /**
   * Convertir imagen a WebP (formato más eficiente)
   */
  async convertToWebP(file: File, quality: number = 0.8): Promise<File> {
    const result = await this.optimizeImage(file, {
      quality,
      format: 'webp'
    })
    return result.optimizedFile
  }

  /**
   * Validar y optimizar antes de subir
   */
  async prepareForUpload(
    file: File, 
    targetType: 'avatar' | 'document' | 'thumbnail' | 'general' = 'general'
  ): Promise<FileOptimizationResult> {
    // Si no es imagen, retornar tal como está
    if (!file.type.startsWith('image/')) {
      return {
        optimizedFile: file,
        originalSize: file.size,
        optimizedSize: file.size,
        compressionRatio: 0
      }
    }

    // Configuraciones por tipo
    const configs = {
      avatar: {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.85,
        format: 'webp' as const
      },
      thumbnail: {
        maxWidth: 200,
        maxHeight: 200,
        quality: 0.7,
        format: 'jpeg' as const
      },
      document: {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8,
        format: 'jpeg' as const
      },
      general: {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8,
        format: 'webp' as const
      }
    }

    return this.optimizeImage(file, configs[targetType])
  }

  /**
   * Comprimir archivo PDF (básico)
   */
  async compressPDF(file: File): Promise<File> {
    // Para PDFs, por ahora solo retornamos el archivo original
    // En el futuro se puede integrar una librería como PDF-lib
    console.warn('Compresión de PDF no implementada aún')
    return file
  }

  /**
   * Validar si un archivo necesita optimización
   */
  shouldOptimize(file: File, maxSize: number = 2 * 1024 * 1024): Promise<boolean> {
    return Promise.resolve(
      file.type.startsWith('image/') && file.size > maxSize
    )
  }

  // =====================================================
  // Métodos utilitarios privados
  // =====================================================

  private calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
    maintainAspectRatio: boolean
  ): { width: number; height: number } {
    if (!maintainAspectRatio) {
      return { width: maxWidth, height: maxHeight }
    }

    // Si la imagen es más pequeña que los límites, mantener tamaño original
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight }
    }

    // Calcular ratio de aspecto
    const aspectRatio = originalWidth / originalHeight

    let newWidth = maxWidth
    let newHeight = maxWidth / aspectRatio

    // Si la altura calculada excede el máximo, ajustar por altura
    if (newHeight > maxHeight) {
      newHeight = maxHeight
      newWidth = maxHeight * aspectRatio
    }

    return {
      width: Math.round(newWidth),
      height: Math.round(newHeight)
    }
  }

  private generateOptimizedFileName(originalName: string, format: string): string {
    const nameWithoutExtension = originalName.split('.').slice(0, -1).join('.')
    const timestamp = Date.now()
    return `${nameWithoutExtension}_optimized_${timestamp}.${format}`
  }

  /**
   * Formatear tamaño de archivo legible
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Generar preview URL temporal para mostrar imagen antes de subir
   */
  generatePreviewUrl(file: File): string {
    return URL.createObjectURL(file)
  }

  /**
   * Limpiar preview URL para evitar memory leaks
   */
  revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url)
  }
}

// =====================================================
// Hook React para usar el optimizador
// =====================================================

export function useFileOptimizer() {
  const optimizer = new FileOptimizerService()

  const optimizeFile = async (
    file: File, 
    type: 'avatar' | 'document' | 'thumbnail' | 'general' = 'general'
  ) => {
    try {
      const result = await optimizer.prepareForUpload(file, type)
      return {
        success: true,
        data: result
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error optimizando archivo'
      }
    }
  }

  const getImageInfo = async (file: File) => {
    try {
      const dimensions = await optimizer.getImageDimensions(file)
      return {
        success: true,
        data: {
          dimensions,
          size: file.size,
          type: file.type,
          name: file.name
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error obteniendo información'
      }
    }
  }

  return {
    optimizeFile,
    getImageInfo,
    createThumbnail: optimizer.createThumbnail.bind(optimizer),
    formatFileSize: optimizer.formatFileSize.bind(optimizer),
    generatePreviewUrl: optimizer.generatePreviewUrl.bind(optimizer),
    revokePreviewUrl: optimizer.revokePreviewUrl.bind(optimizer),
    shouldOptimize: optimizer.shouldOptimize.bind(optimizer)
  }
}

// Instancia singleton
export const fileOptimizer = new FileOptimizerService()
export default fileOptimizer
