/**
 * Utilidades para manejo de fechas con zona horaria de México (America/Mexico_City)
 * Evita problemas de desfase de fechas por UTC
 */

/**
 * Obtiene la fecha/hora actual en zona horaria de México como ISO string
 * @returns ISO string ajustado a Mexico City (GMT-6/GMT-7)
 */
export function getLocalMexicoISO(): string {
  const now = new Date();
  // Ajustar a zona horaria de México (GMT-6 o GMT-7 según DST)
  const mexicoDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
  return mexicoDate.toISOString();
}

/**
 * Convierte una fecha UTC a fecha en zona horaria de México
 * @param utcDate - Fecha en UTC o string ISO
 * @returns Date ajustada a Mexico City
 */
export function utcToMexico(utcDate: Date | string): Date {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return new Date(date.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
}

/**
 * Formatea una fecha para mostrar en la UI (siempre en hora de México)
 * @param dateStr - String ISO de fecha
 * @param options - Opciones de formato
 * @returns String formateado en español México
 */
export function formatDateMexico(
  dateStr: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string {
  if (!dateStr) return 'N/A';
  
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', {
    ...options,
    timeZone: 'America/Mexico_City'
  });
}

/**
 * Obtiene solo la fecha (YYYY-MM-DD) en zona horaria de México
 * Útil para inputs type="date"
 * @param date - Fecha opcional, si no se provee usa fecha actual
 * @returns String en formato YYYY-MM-DD
 */
export function getLocalDateString(date?: Date | string): string {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
  const mexicoDate = utcToMexico(d);
  
  const year = mexicoDate.getFullYear();
  const month = String(mexicoDate.getMonth() + 1).padStart(2, '0');
  const day = String(mexicoDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Convierte una fecha local (del input date) a ISO string para guardar
 * @param localDateString - String en formato YYYY-MM-DD
 * @returns ISO string para base de datos
 */
export function localDateToISO(localDateString: string): string {
  // Crear fecha en zona horaria de México a las 12:00 PM para evitar cambios de día
  const [year, month, day] = localDateString.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return date.toISOString();
}
