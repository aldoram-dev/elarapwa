/**
 * Hook para sincronización con Google Sheets
 */

import { useState } from 'react';
import { supabase } from '@/lib/core/supabaseClient';
import {
  readFromGoogleSheets,
  appendToGoogleSheets,
  writeToGoogleSheets,
  mapRowToContrato,
  mapContratoToRow,
  getSheetConfig,
} from '@/lib/services/googleSheetsService';
import { Contrato } from '@/types/contrato';

interface SyncStatus {
  loading: boolean;
  progress: number;
  message: string;
  success: number;
  errors: number;
  errorDetails: string[];
}

export function useGoogleSheetSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    loading: false,
    progress: 0,
    message: '',
    success: 0,
    errors: 0,
    errorDetails: [],
  });

  /**
   * Importar contratos desde Google Sheets
   */
  const importFromSheet = async (): Promise<void> => {
    setSyncStatus({
      loading: true,
      progress: 0,
      message: 'Cargando configuración...',
      success: 0,
      errors: 0,
      errorDetails: [],
    });

    try {
      // Obtener configuración
      const config = await getSheetConfig();
      if (!config) {
        throw new Error('No hay configuración de Google Sheets. Configure la integración primero.');
      }

      setSyncStatus(prev => ({ ...prev, progress: 10, message: 'Leyendo datos de Google Sheets...' }));

      // Leer datos
      const rows = await readFromGoogleSheets(config.spreadsheet_id, config.range);
      
      if (!rows || rows.length === 0) {
        throw new Error('No se encontraron datos en la hoja');
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      setSyncStatus(prev => ({ ...prev, progress: 30, message: `Procesando ${dataRows.length} contratos...` }));

      let successCount = 0;
      let errorCount = 0;
      const errorDetails: string[] = [];

      // Procesar cada fila
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const progress = 30 + ((i / dataRows.length) * 60);

        setSyncStatus(prev => ({
          ...prev,
          progress,
          message: `Procesando contrato ${i + 1} de ${dataRows.length}...`,
        }));

        try {
          const contratoData: any = mapRowToContrato(row, headers);
          
          // Buscar o crear contratista
          let contratistaId: string | null = null;
          if (contratoData.contratista_nombre) {
            const { data: contratista, error: searchError } = await supabase
              .from('contratistas')
              .select('id')
              .ilike('nombre', contratoData.contratista_nombre)
              .maybeSingle();

            if (searchError) {
              console.warn('Error buscando contratista:', searchError);
            }

            if (contratista) {
              contratistaId = contratista.id;
            } else {
              // Crear contratista si no existe
              const { data: newContratista, error: contratistaError } = await supabase
                .from('contratistas')
                .insert({
                  nombre: contratoData.contratista_nombre,
                  active: true,
                })
                .select()
                .single();

              if (contratistaError) throw contratistaError;
              if (newContratista) {
                contratistaId = newContratista.id;
              }
            }
          }

          // Verificar si el contrato ya existe
          const { data: existing, error: existingError } = await supabase
            .from('contratos')
            .select('id')
            .eq('clave_contrato', contratoData.clave_contrato)
            .maybeSingle();

          if (existingError) {
            console.warn('Error buscando contrato existente:', existingError);
          }

          const contratoPayload: any = {
            ...contratoData,
            contratista_id: contratistaId || null,
            active: true,
          };

          delete contratoPayload.contratista_nombre;

          if (existing) {
            // Actualizar
            const { error } = await supabase
              .from('contratos')
              .update(contratoPayload)
              .eq('id', existing.id);

            if (error) throw error;
          } else {
            // Insertar
            const { error } = await supabase
              .from('contratos')
              .insert(contratoPayload);

            if (error) throw error;
          }

          successCount++;
        } catch (error: any) {
          errorCount++;
          errorDetails.push(`Fila ${i + 2}: ${error.message}`);
          console.error(`Error en fila ${i + 2}:`, error);
        }
      }

      setSyncStatus({
        loading: false,
        progress: 100,
        message: 'Importación completada',
        success: successCount,
        errors: errorCount,
        errorDetails,
      });
    } catch (error: any) {
      setSyncStatus({
        loading: false,
        progress: 0,
        message: `Error: ${error.message}`,
        success: 0,
        errors: 1,
        errorDetails: [error.message],
      });
      throw error;
    }
  };

  /**
   * Exportar contratos a Google Sheets
   */
  const exportToSheet = async (contratos: Contrato[]): Promise<void> => {
    setSyncStatus({
      loading: true,
      progress: 0,
      message: 'Preparando exportación...',
      success: 0,
      errors: 0,
      errorDetails: [],
    });

    try {
      const config = await getSheetConfig();
      if (!config) {
        throw new Error('No hay configuración de Google Sheets');
      }

      setSyncStatus(prev => ({ ...prev, progress: 20, message: 'Cargando nombres de contratistas...' }));

      // Cargar nombres de contratistas
      const contratistasIds = [...new Set(contratos.map(c => c.contratista_id).filter((id): id is string => Boolean(id)))];
      const { data: contratistas } = await supabase
        .from('contratistas')
        .select('id, nombre')
        .in('id', contratistasIds);

      const contratistasMap = new Map<string, string>(contratistas?.map(c => [c.id, c.nombre]) || []);

      setSyncStatus(prev => ({ ...prev, progress: 40, message: 'Formateando datos...' }));

      // Leer headers actuales
      const existingData = await readFromGoogleSheets(config.spreadsheet_id, config.range);
      const headers = existingData[0] || [];

      // Mapear contratos a filas
      const rows = contratos.map(contrato => {
        const contratoConNombre: any = {
          ...contrato,
          contratista_nombre: contrato.contratista_id ? contratistasMap.get(contrato.contratista_id) || '' : '',
        };
        return mapContratoToRow(contratoConNombre, headers);
      });

      setSyncStatus(prev => ({ ...prev, progress: 70, message: 'Escribiendo en Google Sheets...' }));

      // Escribir todo (sobrescribir)
      await writeToGoogleSheets(config.spreadsheet_id, config.range, [headers, ...rows]);

      setSyncStatus({
        loading: false,
        progress: 100,
        message: 'Exportación completada',
        success: rows.length,
        errors: 0,
        errorDetails: [],
      });
    } catch (error: any) {
      setSyncStatus({
        loading: false,
        progress: 0,
        message: `Error: ${error.message}`,
        success: 0,
        errors: 1,
        errorDetails: [error.message],
      });
      throw error;
    }
  };

  /**
   * Agregar un contrato nuevo a Google Sheets
   */
  const appendContratoToSheet = async (contrato: Contrato): Promise<void> => {
    try {
      const config = await getSheetConfig();
      if (!config) return; // Sin configuración, no sincronizar

      // Obtener nombre del contratista
      const { data: contratista } = await supabase
        .from('contratistas')
        .select('nombre')
        .eq('id', contrato.contratista_id)
        .single();

      // Leer headers
      const existingData = await readFromGoogleSheets(config.spreadsheet_id, config.range);
      const headers = existingData[0] || [];

      const contratoConNombre: any = {
        ...contrato,
        contratista_nombre: contratista?.nombre || '',
      };

      const row = mapContratoToRow(contratoConNombre, headers);
      
      await appendToGoogleSheets(config.spreadsheet_id, config.range, [row]);
    } catch (error) {
      console.error('Error al agregar contrato a Google Sheets:', error);
      // No lanzar error para no bloquear la operación principal
    }
  };

  return {
    syncStatus,
    importFromSheet,
    exportToSheet,
    appendContratoToSheet,
  };
}
