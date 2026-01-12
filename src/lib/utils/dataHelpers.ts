/**
 * Helper para obtener datos con modo online forzado
 * Siempre consulta Supabase primero cuando FORCE_ONLINE_MODE = true
 */

import { supabase } from '@/lib/core/supabaseClient';
import { db } from '@/db/database';
import { FORCE_ONLINE_MODE } from '@/config/sync-config';

/**
 * Obtiene todas las requisiciones de pago
 * En modo online: consulta Supabase y actualiza cache
 * En modo offline: usa IndexedDB
 */
export async function getRequisicionesPago() {
  if (FORCE_ONLINE_MODE) {
    try {
      const { data, error } = await supabase
        .from('requisiciones_pago')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Actualizar cache en IndexedDB
      if (data) {
        await db.requisiciones_pago.clear();
        for (const req of data) {
          await db.requisiciones_pago.put({
            ...req,
            _dirty: false,
          });
        }
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Error al obtener requisiciones de Supabase, usando cache:', error);
      // Fallback a IndexedDB si falla Supabase
      return await db.requisiciones_pago.toArray();
    }
  } else {
    // Modo offline: usar IndexedDB
    return await db.requisiciones_pago.toArray();
  }
}

/**
 * Obtiene todas las solicitudes de pago
 */
export async function getSolicitudesPago() {
  if (FORCE_ONLINE_MODE) {
    try {
      const { data, error } = await supabase
        .from('solicitudes_pago')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Actualizar cache en IndexedDB
      if (data) {
        await db.solicitudes_pago.clear();
        for (const sol of data) {
          await db.solicitudes_pago.put({
            ...sol,
            _dirty: false,
          });
        }
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Error al obtener solicitudes de Supabase, usando cache:', error);
      return await db.solicitudes_pago.toArray();
    }
  } else {
    return await db.solicitudes_pago.toArray();
  }
}

/**
 * Obtiene todos los contratos
 */
export async function getContratos() {
  if (FORCE_ONLINE_MODE) {
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false});
      
      if (error) throw error;
      
      // Actualizar cache en IndexedDB
      if (data) {
        await db.contratos.clear();
        for (const contrato of data) {
          await db.contratos.put({
            ...contrato,
            _dirty: false,
          });
        }
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Error al obtener contratos de Supabase, usando cache:', error);
      return await db.contratos.toArray();
    }
  } else {
    return await db.contratos.toArray();
  }
}

/**
 * Obtiene todos los contratistas
 */
export async function getContratistas() {
  if (FORCE_ONLINE_MODE) {
    try {
      const { data, error } = await supabase
        .from('contratistas')
        .select('*')
        .eq('active', true)
        .order('nombre', { ascending: true });
      
      if (error) throw error;
      
      // Actualizar cache en IndexedDB
      if (data) {
        await db.contratistas.clear();
        for (const contratista of data) {
          await db.contratistas.put({
            ...contratista,
            _dirty: false,
          });
        }
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Error al obtener contratistas de Supabase, usando cache:', error);
      return await db.contratistas.toArray();
    }
  } else {
    return await db.contratistas.toArray();
  }
}

/**
 * Obtiene los pagos realizados
 */
export async function getPagosRealizados() {
  if (FORCE_ONLINE_MODE) {
    try {
      const { data, error } = await supabase
        .from('pagos_realizados')
        .select('*')
        .order('fecha_pago', { ascending: false });
      
      if (error) throw error;
      
      // Actualizar cache en IndexedDB
      if (data) {
        await db.pagos_realizados.clear();
        for (const pago of data) {
          await db.pagos_realizados.put({
            ...pago,
            _dirty: false,
          });
        }
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Error al obtener pagos de Supabase, usando cache:', error);
      return await db.pagos_realizados.toArray();
    }
  } else {
    return await db.pagos_realizados.toArray();
  }
}
