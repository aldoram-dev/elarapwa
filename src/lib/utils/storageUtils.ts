import { supabase } from '@/lib/core/supabaseClient'

// Cache en memoria para signed URLs con tiempo de expiración
interface CachedUrl {
  url: string
  expiresAt: number
}

const urlCache = new Map<string, CachedUrl>()

/**
 * Genera una URL firmada para acceder a un archivo en Supabase Storage
 * Usa cache en memoria para evitar regenerar URLs constantemente
 * @param path - Ruta relativa dentro del bucket
 * @param bucket - Nombre del bucket
 * @param expires - Tiempo de expiración en segundos (por defecto 24 horas)
 * @returns URL firmada o null si hay error
 */
export async function getSignedUrl(
  path: string,
  bucket: string,
  expires = 60 * 60 * 24 // 24 horas por defecto
): Promise<string | null> {
  const cacheKey = `${bucket}:${path}`
  
  // Verificar cache
  const cached = urlCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    console.log('🎯 Usando signed URL desde cache:', path)
    return cached.url
  }

  try {
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .createSignedUrl(path, expires)

    if (error) {
      console.error('Error generando URL firmada:', error.message)
      return null
    }

    // Guardar en cache (expirar 5 minutos antes para seguridad)
    const expiresAt = Date.now() + (expires * 1000) - (5 * 60 * 1000)
    urlCache.set(cacheKey, {
      url: data.signedUrl,
      expiresAt
    })

    console.log('✨ Signed URL generada y cacheada:', path)
    return data.signedUrl
  } catch (error) {
    console.error('Error en getSignedUrl:', error)
    return null
  }
}

/**
 * Limpia el cache de signed URLs (útil para refrescar imágenes)
 */
export function clearSignedUrlCache() {
  urlCache.clear()
  console.log('🗑️ Cache de signed URLs limpiado')
}

/**
 * Genera una URL pública para un archivo (solo si el bucket es público)
 * @param path - Ruta relativa dentro del bucket
 * @param bucket - Nombre del bucket
 * @returns URL pública
 */
export function getPublicUrl(path: string, bucket: string): string {
  const { data } = supabase
    .storage
    .from(bucket)
    .getPublicUrl(path)

  return data.publicUrl
}

/**
 * Extrae la ruta interna de una URL completa de Supabase Storage
 * @param url - URL completa de Supabase
 * @param bucket - Nombre del bucket
 * @returns Ruta relativa o string vacío si falla
 */
export function extractPathFromUrl(url: string, bucket: string): string {
  if (!url.startsWith('http')) return url // Ya es una ruta relativa

  try {
    const urlObj = new URL(url)
    const parts = urlObj.pathname.split('/')
    const bucketIdx = parts.findIndex(p => p === bucket)
    
    if (bucketIdx >= 0) {
      return parts.slice(bucketIdx + 1).join('/')
    }
  } catch (err) {
    console.warn('extractPathFromUrl: URL inválida:', url)
  }

  return ''
}

/**
 * Sube un archivo a Supabase Storage
 * @param file - Archivo a subir
 * @param bucket - Nombre del bucket
 * @param folder - Carpeta dentro del bucket (opcional)
 * @returns Ruta del archivo subido o null si hay error
 */
export async function uploadFile(
  file: File,
  bucket: string,
  folder?: string
): Promise<string | null> {
  try {
    // Usar el nombre original del archivo con timestamp para evitar colisiones
    const timestamp = Date.now()
    const originalName = file.name
    const fileName = `${timestamp}_${originalName}`
    
    // Construir la ruta completa
    const filePath = folder ? `${folder}/${fileName}` : fileName

    console.log('📤 Subiendo archivo:', filePath)

    // Determinar el contentType basado en la extensión del archivo
    let contentType = file.type
    if (file.name.toLowerCase().endsWith('.xml')) {
      contentType = 'application/xml'
    } else if (file.name.toLowerCase().endsWith('.pdf')) {
      contentType = 'application/pdf'
    }

    const { data, error } = await supabase
      .storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: contentType
      })

    if (error) {
      console.error('Error subiendo archivo:', error.message)
      return null
    }

    console.log('✅ Archivo subido exitosamente:', data.path)
    return data.path
  } catch (error) {
    console.error('Error en uploadFile:', error)
    return null
  }
}

/**
 * Sube múltiples archivos a Supabase Storage
 * @param files - Array de archivos a subir
 * @param bucket - Nombre del bucket
 * @param folder - Carpeta dentro del bucket (opcional)
 * @returns Array de rutas de archivos subidos
 */
export async function uploadMultipleFiles(
  files: File[],
  bucket: string,
  folder?: string
): Promise<string[]> {
  const uploadPromises = files.map(file => uploadFile(file, bucket, folder))
  const results = await Promise.all(uploadPromises)
  return results.filter((path): path is string => path !== null)
}

/**
 * Elimina un archivo de Supabase Storage
 * @param path - Ruta del archivo a eliminar
 * @param bucket - Nombre del bucket
 * @returns true si se eliminó correctamente, false en caso contrario
 */
export async function deleteFile(
  path: string,
  bucket: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .storage
      .from(bucket)
      .remove([path])

    if (error) {
      console.error('Error eliminando archivo:', error.message)
      return false
    }

    // Limpiar del cache
    const cacheKey = `${bucket}:${path}`
    urlCache.delete(cacheKey)

    console.log('🗑️ Archivo eliminado:', path)
    return true
  } catch (error) {
    console.error('Error en deleteFile:', error)
    return false
  }
}
