/**
 * Sistema de Caché con TTL (Time To Live)
 * Optimiza la carga de datos reduciendo llamadas innecesarias a la BD
 * 
 * Características:
 * - TTL configurable por tipo de dato
 * - Invalidación automática
 * - Limpieza de caché expirado
 * - Soporte para IndexedDB y Supabase
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
  key: string;
}

type CacheTTL = {
  contratos: number;
  contratistas: number;
  requisiciones: number;
  solicitudes: number;
  conceptos: number;
  cambios: number;
  pagos: number;
  default: number;
};

/**
 * Configuración de TTL por tipo de recurso (en milisegundos)
 */
const DEFAULT_TTL: CacheTTL = {
  contratos: 60000,      // 1 minuto
  contratistas: 300000,  // 5 minutos
  requisiciones: 30000,  // 30 segundos
  solicitudes: 30000,    // 30 segundos
  conceptos: 60000,      // 1 minuto
  cambios: 60000,        // 1 minuto
  pagos: 30000,          // 30 segundos
  default: 60000,        // 1 minuto por defecto
};

/**
 * Clase principal de caché de datos
 */
export class DataCache {
  private static cache = new Map<string, CacheEntry<any>>();
  private static cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Inicializa el sistema de caché
   */
  static init(): void {
    // Limpiar caché expirado cada minuto
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.cleanupExpired();
      }, 60000);
    }
  }

  /**
   * Obtiene un dato del caché o lo carga usando el fetcher
   */
  static async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttl?: number;
      forceRefresh?: boolean;
      onCacheMiss?: () => void;
    } = {}
  ): Promise<T> {
    const now = Date.now();
    const ttl = options.ttl || DEFAULT_TTL.default;

    // Si se fuerza refresh, invalidar caché
    if (options.forceRefresh) {
      this.invalidate(key);
    }

    // Verificar si existe en caché y no ha expirado
    const cached = this.cache.get(key);
    if (cached && now < cached.expiry) {
      console.log(`📦 Cache HIT: ${key}`);
      return cached.data;
    }

    // Cache MISS - cargar datos
    console.log(`🔄 Cache MISS: ${key}`);
    if (options.onCacheMiss) {
      options.onCacheMiss();
    }

    try {
      const data = await fetcher();
      
      // Guardar en caché
      this.set(key, data, ttl);
      
      return data;
    } catch (error) {
      console.error(`❌ Error cargando datos para ${key}:`, error);
      
      // Si hay datos en caché (aunque expirados), devolverlos como fallback
      if (cached) {
        console.warn(`⚠️ Devolviendo datos expirados como fallback para ${key}`);
        return cached.data;
      }
      
      throw error;
    }
  }

  /**
   * Guarda un dato en caché
   */
  static set<T>(key: string, data: T, ttl: number = DEFAULT_TTL.default): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiry: now + ttl,
      key,
    });
    console.log(`💾 Guardado en caché: ${key} (expira en ${ttl}ms)`);
  }

  /**
   * Invalida (elimina) una entrada del caché
   */
  static invalidate(key: string): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      console.log(`🗑️ Caché invalidado: ${key}`);
    }
  }

  /**
   * Invalida múltiples entradas que coinciden con un patrón
   */
  static invalidatePattern(pattern: RegExp): void {
    let count = 0;
    for (const [key] of this.cache) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      console.log(`🗑️ ${count} entradas de caché invalidadas (patrón: ${pattern})`);
    }
  }

  /**
   * Invalida todas las entradas relacionadas con un contrato
   */
  static invalidateContrato(contratoId: string): void {
    this.invalidatePattern(new RegExp(`contrato:${contratoId}`));
    this.invalidatePattern(/^conceptos:/);
    this.invalidatePattern(/^cambios:/);
    this.invalidatePattern(/^requisiciones:/);
  }

  /**
   * Invalida todas las entradas relacionadas con requisiciones
   */
  static invalidateRequisiciones(): void {
    this.invalidatePattern(/^requisiciones:/);
    this.invalidatePattern(/^solicitudes:/);
  }

  /**
   * Invalida todas las entradas relacionadas con solicitudes
   */
  static invalidateSolicitudes(): void {
    this.invalidatePattern(/^solicitudes:/);
    this.invalidatePattern(/^pagos:/);
  }

  /**
   * Limpia entradas expiradas del caché
   */
  static cleanupExpired(): void {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.cache) {
      if (now >= entry.expiry) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      console.log(`🧹 Limpieza de caché: ${count} entradas expiradas eliminadas`);
    }
  }

  /**
   * Limpia todo el caché
   */
  static clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ Caché completamente limpiado (${size} entradas)`);
  }

  /**
   * Obtiene estadísticas del caché
   */
  static getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    return {
      total: entries.length,
      expired: entries.filter(([_, e]) => now >= e.expiry).length,
      active: entries.filter(([_, e]) => now < e.expiry).length,
      sizeBytes: JSON.stringify(Array.from(this.cache.values())).length,
      entries: entries.map(([key, entry]) => ({
        key,
        age: now - entry.timestamp,
        ttl: entry.expiry - now,
        expired: now >= entry.expiry,
      })),
    };
  }

  /**
   * Destructor - limpia el intervalo de limpieza
   */
  static destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// ============================================
// FUNCIONES HELPER ESPECÍFICAS
// ============================================

/**
 * Genera una clave de caché para contratos
 */
export function cacheKeyContratos(proyectoId?: string): string {
  return proyectoId ? `contratos:proyecto:${proyectoId}` : 'contratos:all';
}

/**
 * Genera una clave de caché para un contrato específico
 */
export function cacheKeyContrato(contratoId: string): string {
  return `contrato:${contratoId}`;
}

/**
 * Genera una clave de caché para conceptos de un contrato
 */
export function cacheKeyConceptos(contratoId: string, tipo?: string): string {
  return tipo 
    ? `conceptos:contrato:${contratoId}:${tipo}`
    : `conceptos:contrato:${contratoId}`;
}

/**
 * Genera una clave de caché para cambios de un contrato
 */
export function cacheKeyCambios(contratoId: string, tipo?: string): string {
  return tipo
    ? `cambios:contrato:${contratoId}:${tipo}`
    : `cambios:contrato:${contratoId}`;
}

/**
 * Genera una clave de caché para requisiciones
 */
export function cacheKeyRequisiciones(contratoId?: string): string {
  return contratoId ? `requisiciones:contrato:${contratoId}` : 'requisiciones:all';
}

/**
 * Genera una clave de caché para solicitudes
 */
export function cacheKeySolicitudes(estado?: string): string {
  return estado ? `solicitudes:estado:${estado}` : 'solicitudes:all';
}

/**
 * Genera una clave de caché para contratistas
 */
export function cacheKeyContratistas(): string {
  return 'contratistas:all';
}

/**
 * Genera una clave de caché para un contratista específico
 */
export function cacheKeyContratista(contratistaId: string): string {
  return `contratista:${contratistaId}`;
}

// Inicializar caché al importar
DataCache.init();

// Cleanup al cerrar/recargar página
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    DataCache.destroy();
  });
}
