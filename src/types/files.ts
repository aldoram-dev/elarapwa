// =====================================================
// Tipos para manejo de archivos en Supabase Storage
// =====================================================

export interface DocumentW {
  id: string
  nombre: string
  path?: string
  url?: string
  file?: File
  bucket?: string
  // Metadatos adicionales
  size?: number
  type?: string
  uploadedAt?: string
  uploadedBy?: string
  isPublic?: boolean
}

export interface FileUploadOptions {
  bucket: string
  path?: string
  isPublic?: boolean
  cacheControl?: string
  upsert?: boolean
}

export interface FileUploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface FileUploadResult {
  success: boolean
  data?: {
    id: string
    path: string
    fullPath: string
    url?: string
  }
  error?: string
}

export interface SignedUrlOptions {
  expiresIn?: number // en segundos, default 3600 (1 hora)
  transform?: {
    width?: number
    height?: number
    resize?: 'cover' | 'contain' | 'fill'
    format?: 'webp' | 'png' | 'jpg'
    quality?: number
  }
}

export interface BucketConfig {
  name: string
  public: boolean
  allowedMimeTypes?: string[]
  fileSizeLimit?: number // en bytes
  pathPrefix?: string
}

// Buckets predefinidos del sistema
export const SYSTEM_BUCKETS: Record<string, BucketConfig> = {
  avatars: {
    name: 'avatars',
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    pathPrefix: 'users'
  },
  documents: {
    name: 'documents',
    public: false,
    allowedMimeTypes: ['application/pdf', 'image/*', 'text/*'],
    fileSizeLimit: 50 * 1024 * 1024, // 50MB
    pathPrefix: 'docs'
  },
  exports: {
    name: 'exports',
    public: false,
    allowedMimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
    fileSizeLimit: 100 * 1024 * 1024, // 100MB
    pathPrefix: 'exports'
  },
  temp: {
    name: 'temp',
    public: false,
    allowedMimeTypes: ['*/*'],
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    pathPrefix: 'temp'
  }
  ,branding: {
    name: 'branding',
    public: true,
    allowedMimeTypes: ['image/png','image/jpeg','image/webp','image/svg+xml','image/x-icon','image/vnd.microsoft.icon'],
    fileSizeLimit: 2 * 1024 * 1024, // 2MB
    pathPrefix: 'branding'
  }
}

// Tipos de error específicos para archivos
export type FileError = 
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'UPLOAD_FAILED'
  | 'DOWNLOAD_FAILED'
  | 'DELETE_FAILED'
  | 'BUCKET_NOT_FOUND'
  | 'SIGNED_URL_FAILED'
  | 'PERMISSION_DENIED'
  | 'FILE_NOT_FOUND'

export interface FileErrorDetails {
  code: FileError
  message: string
  details?: any
}
