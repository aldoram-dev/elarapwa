/**
 * Configuración de sincronización y modo de operación de la aplicación
 * 
 * FORCE_ONLINE_MODE = true:
 * - Todas las consultas van directamente a Supabase
 * - IndexedDB solo se usa como cache secundario
 * - Garantiza que todos los usuarios vean la misma información en tiempo real
 * - Requiere conexión a internet permanente
 * 
 * FORCE_ONLINE_MODE = false:
 * - Usa IndexedDB como fuente principal
 * - Sincronización periódica con Supabase
 * - Puede haber desincronización temporal entre usuarios
 */

export const FORCE_ONLINE_MODE = true;

export const SYNC_CONFIG = {
  /**
   * Indica si se debe forzar el modo online (consultar siempre Supabase)
   */
  forceOnline: FORCE_ONLINE_MODE,
  
  /**
   * Intervalo de sincronización automática en ms (solo si forceOnline = false)
   */
  autoSyncInterval: 30000, // 30 segundos
  
  /**
   * Habilitar cache en IndexedDB (solo para fallback si falla Supabase)
   */
  enableCache: true,
  
  /**
   * Tiempo de vida del cache en ms
   */
  cacheMaxAge: 60000, // 1 minuto
};
