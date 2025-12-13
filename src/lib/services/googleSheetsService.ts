/**
 * Google Sheets Service
 * Sincronización bidireccional entre la app y Google Sheets
 */

import { supabase } from '@/lib/core/supabaseClient';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

interface SheetConfig {
  spreadsheet_id: string;
  sheet_name: string;
  range: string;
  column_mapping: Record<string, string>;
}

/**
 * Obtener token de acceso de Google desde Supabase
 */
async function getGoogleAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.provider_token) {
    throw new Error('No hay sesión activa con Google. Por favor inicia sesión nuevamente.');
  }
  
  return session.provider_token;
}

/**
 * Leer datos desde Google Sheets
 */
export async function readFromGoogleSheets(
  spreadsheetId: string,
  range: string
): Promise<any[][]> {
  try {
    const token = await getGoogleAccessToken();
    
    const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error al leer Google Sheets: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error('Error en readFromGoogleSheets:', error);
    throw error;
  }
}

/**
 * Escribir datos a Google Sheets
 */
export async function writeToGoogleSheets(
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<void> {
  try {
    const token = await getGoogleAccessToken();
    
    const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error al escribir en Google Sheets: ${error.error?.message || response.statusText}`);
    }
  } catch (error) {
    console.error('Error en writeToGoogleSheets:', error);
    throw error;
  }
}

/**
 * Agregar filas nuevas a Google Sheets
 */
export async function appendToGoogleSheets(
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<void> {
  try {
    const token = await getGoogleAccessToken();
    
    const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error al agregar filas a Google Sheets: ${error.error?.message || response.statusText}`);
    }
  } catch (error) {
    console.error('Error en appendToGoogleSheets:', error);
    throw error;
  }
}

/**
 * Listar hojas de cálculo disponibles del usuario
 */
export async function listUserSpreadsheets(): Promise<any[]> {
  try {
    const token = await getGoogleAccessToken();
    
    const url = 'https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.spreadsheet%27&fields=files(id%2Cname%2CmodifiedTime)&orderBy=modifiedTime%20desc';
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Error al listar hojas de cálculo');
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Error en listUserSpreadsheets:', error);
    throw error;
  }
}

/**
 * Obtener información de pestañas (sheets) de una hoja de cálculo
 */
export async function getSpreadsheetInfo(spreadsheetId: string): Promise<any> {
  try {
    const token = await getGoogleAccessToken();
    
    const url = `${SHEETS_API_BASE}/${spreadsheetId}?fields=sheets.properties`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener información de la hoja');
    }

    return await response.json();
  } catch (error) {
    console.error('Error en getSpreadsheetInfo:', error);
    throw error;
  }
}

/**
 * Mapear fila de Google Sheets a objeto Contrato
 */
export function mapRowToContrato(row: any[], headers: string[]): Partial<any> {
  const mapping: Record<string, string> = {
    'CONTRATISTA:': 'contratista_nombre',
    'CATEGORIA:': 'categoria',
    'PARTIDA:': 'partida',
    'SUBPARTIDA:': 'subpartida',
    'CLAVE DE CONTRATO:': 'clave_contrato',
    'TIPO DE CONTRATO:': 'tipo_contrato',
    'TRATAMIENTO:': 'tratamiento',
    'DESCRIPCION:': 'descripcion',
    'MONTO NETO DE CONTRATO:': 'monto_contrato',
    'MONTO NETO DE ANTICIPO:': 'anticipo_monto',
    '% DE RETENCIÓN:': 'retencion_porcentaje',
    'MONTO RETENIDO A LA FECHA:': 'monto_retenido',
    '% PENALIZACIÓN MÁXIMA:': 'penalizacion_maxima_porcentaje',
    'MONTO NETO PENALIZACIÓN POR DÍA:': 'penalizacion_dia',
    'FECHA DE INICIO': 'fecha_inicio',
    'FECHA FIN': 'fecha_fin',
    'MONTO AMORTIZADO': 'monto_amortizado',
    'POR AMORTIZAR': 'por_amortizar',
  };

  const obj: any = {};

  headers.forEach((header, index) => {
    const fieldName = mapping[header];
    if (fieldName && row[index]) {
      let value = row[index];

      // Limpiar valores monetarios
      if (typeof value === 'string' && value.includes('$')) {
        value = value.replace(/[$,]/g, '').trim();
      }

      // Limpiar porcentajes
      if (typeof value === 'string' && value.includes('%')) {
        value = value.replace('%', '').trim();
      }

      // Convertir a número si es necesario
      if (fieldName.includes('monto') || fieldName.includes('porcentaje') || fieldName.includes('penalizacion') || fieldName.includes('amortiz')) {
        value = parseFloat(value) || 0;
      }

      // Convertir fechas
      if (fieldName.includes('fecha') && value) {
        try {
          // Intentar parsear fecha en formato DD/MM/YYYY o similar
          const parts = value.split('/');
          if (parts.length === 3) {
            const [day, month, year] = parts;
            value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        } catch (e) {
          console.warn(`Error parseando fecha: ${value}`);
        }
      }

      obj[fieldName] = value;
    }
  });

  return obj;
}

/**
 * Mapear objeto Contrato a fila de Google Sheets
 */
export function mapContratoToRow(contrato: any, headers: string[]): any[] {
  const reverseMapping: Record<string, string> = {
    'contratista_nombre': 'CONTRATISTA:',
    'categoria': 'CATEGORIA:',
    'partida': 'PARTIDA:',
    'subpartida': 'SUBPARTIDA:',
    'clave_contrato': 'CLAVE DE CONTRATO:',
    'tipo_contrato': 'TIPO DE CONTRATO:',
    'tratamiento': 'TRATAMIENTO:',
    'descripcion': 'DESCRIPCION:',
    'monto_contrato': 'MONTO NETO DE CONTRATO:',
    'anticipo_monto': 'MONTO NETO DE ANTICIPO:',
    'retencion_porcentaje': '% DE RETENCIÓN:',
    'fecha_inicio': 'FECHA DE INICIO',
    'fecha_fin': 'FECHA FIN',
  };

  return headers.map(header => {
    const fieldName = Object.keys(reverseMapping).find(key => reverseMapping[key] === header);
    if (!fieldName) return '';

    let value = contrato[fieldName];

    // Formatear valores
    if (fieldName.includes('monto') && typeof value === 'number') {
      return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    }

    if (fieldName.includes('porcentaje') && typeof value === 'number') {
      return `${value}%`;
    }

    if (fieldName.includes('fecha') && value) {
      try {
        const date = new Date(value);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      } catch (e) {
        return value;
      }
    }

    return value || '';
  });
}

/**
 * Guardar configuración de sincronización en Supabase
 */
export async function saveSheetConfig(config: SheetConfig): Promise<void> {
  const { error } = await supabase
    .from('proyecto_google_sheets_config')
    .upsert({
      spreadsheet_id: config.spreadsheet_id,
      sheet_name: config.sheet_name,
      range: config.range,
      column_mapping: config.column_mapping,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

/**
 * Obtener configuración de sincronización desde Supabase
 */
export async function getSheetConfig(): Promise<SheetConfig | null> {
  const { data, error } = await supabase
    .from('proyecto_google_sheets_config')
    .select('*')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No encontrado
    throw error;
  }

  return data;
}
