import { supabase } from '../core/supabaseClient'
import { fileOptimizer } from './fileOptimizer'
import { 
  DocumentW, 
  FileUploadOptions, 
  FileUploadResult, 
  SignedUrlOptions, 
  BucketConfig, 
  SYSTEM_BUCKETS,
  FileError,
  FileErrorDetails
} from '../../types/files'

// =====================================================
// Helpers para manejo de archivos en Supabase Storage
// =====================================================

class FileStorageService {
  
  /**
   * Subir un archivo a Supabase Storage con optimización automática
   */
  async uploadFile(
    file: File, 
    options: FileUploadOptions & { 
      optimize?: boolean 
      optimizationType?: 'avatar' | 'document' | 'thumbnail' | 'general'
    },
    onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
  ): Promise<FileUploadResult> {
    try {
      let fileToUpload = file

      // Optimizar archivo si está habilitado
      if (options.optimize !== false && file.type.startsWith('image/')) {
        try {
          const optimizationType = options.optimizationType || 'general'
          const optimizationResult = await fileOptimizer.prepareForUpload(file, optimizationType)
          fileToUpload = optimizationResult.optimizedFile
          
          console.log(`📸 Archivo optimizado: ${fileOptimizer.formatFileSize(file.size)} → ${fileOptimizer.formatFileSize(fileToUpload.size)} (${optimizationResult.compressionRatio.toFixed(1)}% compresión)`)
        } catch (optimizationError) {
          console.warn('⚠️ Error al optimizar archivo, subiendo original:', optimizationError)
          fileToUpload = file
        }
      }

      // Validar configuración del bucket
      const bucketConfig = SYSTEM_BUCKETS[options.bucket]
      if (bucketConfig) {
        const validation = this.validateFile(fileToUpload, bucketConfig)
        if (!validation.isValid) {
          return {
            success: false,
            error: validation.error
          }
        }
      }

      // Generar path único
      const path = this.generateFilePath(fileToUpload, options)
      
      // Subir archivo
      const { data, error } = await supabase.storage
        .from(options.bucket)
        .upload(path, fileToUpload, {
          cacheControl: options.cacheControl || '3600',
          upsert: options.upsert || false
        })

      if (error) throw error

      // Generar URL si es bucket público
      let url: string | undefined
      if (bucketConfig?.public || options.isPublic) {
        const { data: urlData } = supabase.storage
          .from(options.bucket)
          .getPublicUrl(data.path)
        url = urlData.publicUrl
      }

      return {
        success: true,
        data: {
          id: data.id || crypto.randomUUID(),
          path: data.path,
          fullPath: data.fullPath,
          url
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error subiendo archivo'
      }
    }
  }

  /**
   * Obtener URL firmada para archivo privado
   */
  async getSignedUrl(
    bucket: string, 
    path: string, 
    options: SignedUrlOptions = {}
  ): Promise<{ url?: string; error?: string }> {
    try {
      const signedUrlOptions: any = {
        expiresIn: options.expiresIn || 3600
      }

      // Solo agregar transform si está definido y es compatible
      if (options.transform) {
        const { width, height, resize, quality } = options.transform
        if (width || height || resize || quality) {
          signedUrlOptions.transform = {
            width,
            height,
            resize,
            quality
          }
        }
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, signedUrlOptions.expiresIn, signedUrlOptions.transform ? { transform: signedUrlOptions.transform } : {})

      if (error) throw error

      return { url: data.signedUrl }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Error generando URL firmada'
      }
    }
  }

  /**
   * Descargar archivo como blob
   */
  async downloadFile(bucket: string, path: string): Promise<{ data?: Blob; error?: string }> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path)

      if (error) throw error

      return { data }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Error descargando archivo'
      }
    }
  }

  /**
   * Eliminar archivo
   */
  async deleteFile(bucket: string, path: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path])

      if (error) throw error

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error eliminando archivo'
      }
    }
  }

  /**
   * Listar archivos en un bucket/path
   */
  async listFiles(
    bucket: string, 
    path?: string, 
    options?: { limit?: number; offset?: number }
  ) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(path, {
          limit: options?.limit || 100,
          offset: options?.offset || 0
        })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Error listando archivos'
      }
    }
  }

  /**
   * Mover archivo a otra ubicación
   */
  async moveFile(
    bucket: string, 
    fromPath: string, 
    toPath: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .move(fromPath, toPath)

      if (error) throw error

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error moviendo archivo'
      }
    }
  }

  /**
   * Obtener información de un archivo
   */
  async getFileInfo(bucket: string, path: string) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(path.split('/').slice(0, -1).join('/'), {
          search: path.split('/').pop()
        })

      if (error) throw error

      const fileInfo = data.find(item => item.name === path.split('/').pop())
      return { data: fileInfo, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Error obteniendo información del archivo'
      }
    }
  }

  // =====================================================
  // Métodos utilitarios privados
  // =====================================================

  private validateFile(file: File, config: BucketConfig): { isValid: boolean; error?: string } {
    // Validar tamaño
    if (config.fileSizeLimit && file.size > config.fileSizeLimit) {
      return {
        isValid: false,
        error: `El archivo es demasiado grande. Máximo permitido: ${this.formatFileSize(config.fileSizeLimit)}`
      }
    }

    // Validar tipo MIME
    if (config.allowedMimeTypes && config.allowedMimeTypes.length > 0) {
      const isValidType = config.allowedMimeTypes.some(allowedType => {
        if (allowedType === '*/*') return true
        if (allowedType.endsWith('/*')) {
          return file.type.startsWith(allowedType.replace('/*', ''))
        }
        return file.type === allowedType
      })

      if (!isValidType) {
        return {
          isValid: false,
          error: `Tipo de archivo no permitido. Tipos permitidos: ${config.allowedMimeTypes.join(', ')}`
        }
      }
    }

    return { isValid: true }
  }

  private generateFilePath(file: File, options: FileUploadOptions): string {
    const bucketConfig = SYSTEM_BUCKETS[options.bucket]
    const timestamp = Date.now()
    const randomId = crypto.randomUUID().slice(0, 8)
    const extension = file.name.split('.').pop() || ''
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')

    // Base path
    let path = ''
    
    if (options.path) {
      path = options.path
    } else if (bucketConfig?.pathPrefix) {
      path = `${bucketConfig.pathPrefix}/${timestamp}-${randomId}-${sanitizedName}`
    } else {
      path = `${timestamp}-${randomId}-${sanitizedName}`
    }

    return path
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// =====================================================
// Helpers específicos para diferentes tipos de archivos
// =====================================================

export class AvatarService extends FileStorageService {
  async uploadAvatar(file: File, userId: string): Promise<FileUploadResult> {
    return this.uploadFile(file, {
      bucket: 'avatars',
      path: `users/${userId}/avatar-${Date.now()}.${file.name.split('.').pop()}`,
      isPublic: true,
      optimize: true,
      optimizationType: 'avatar'
    })
  }

  async getAvatarUrl(userId: string, avatarPath: string): Promise<string | null> {
    if (!avatarPath) return null
    
    // Si es público, usar URL pública
    const { data } = supabase.storage.from('avatars').getPublicUrl(avatarPath)
    return data.publicUrl
  }

  async deleteOldAvatar(userId: string, oldPath: string): Promise<void> {
    if (oldPath) {
      await this.deleteFile('avatars', oldPath)
    }
  }
}

export class DocumentService extends FileStorageService {
  async uploadDocument(file: File, folder: string = 'general'): Promise<FileUploadResult> {
    // Primero subir el archivo
    const uploadResult = await this.uploadFile(file, {
      bucket: 'documents',
      path: `docs/${folder}/${Date.now()}-${file.name}`,
      isPublic: false,
      optimize: true,
      optimizationType: 'document'
    })

    // Si la carga fue exitosa pero no tiene URL (privado), generar URL firmada
    if (uploadResult.success && uploadResult.data && !uploadResult.data.url) {
      try {
        const signedUrl = await this.getSignedUrl('documents', uploadResult.data.path, { 
          expiresIn: 24 * 60 * 60 // 24 horas
        })
        
        if (signedUrl.url) {
          uploadResult.data.url = signedUrl.url
        }
      } catch (error) {
        console.warn('⚠️ No se pudo generar URL firmada:', error)
        // Retornar el path en su lugar para que se use como referencia
        uploadResult.data.url = uploadResult.data.path
      }
    }

    return uploadResult
  }

  async getDocumentSignedUrl(path: string, expiresIn: number = 3600): Promise<string | null> {
    const result = await this.getSignedUrl('documents', path, { expiresIn })
    return result.url || null
  }
}

export class ExportService extends FileStorageService {
  async uploadExport(file: File, type: string = 'general'): Promise<FileUploadResult> {
    return this.uploadFile(file, {
      bucket: 'exports',
      path: `exports/${type}/${Date.now()}-${file.name}`,
      isPublic: false
    })
  }

  async getExportSignedUrl(path: string): Promise<string | null> {
    const result = await this.getSignedUrl('exports', path, { expiresIn: 7200 }) // 2 horas
    return result.url || null
  }
}

// =====================================================
// Instancias singleton para usar en la app
// =====================================================

export const fileStorageService = new FileStorageService()
export const avatarService = new AvatarService()
export const documentService = new DocumentService()
export const exportService = new ExportService()

// Export por defecto del servicio principal
export default fileStorageService
