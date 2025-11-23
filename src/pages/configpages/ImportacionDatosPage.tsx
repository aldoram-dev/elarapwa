/**
 * Página de Importación de Datos
 * Permite importar contratistas y contratos desde CSV o Google Sheets
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Stack,
  Tabs,
  Tab,
  Alert,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Google as GoogleIcon,
  FileDownload as DownloadIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';
import { useProyectoStore } from '@/stores/proyectoStore';
import { supabase } from '@/lib/core/supabaseClient';
import { useGoogleSheetSync } from '@/lib/hooks/useGoogleSheetSync';
import {
  listUserSpreadsheets,
  getSpreadsheetInfo,
  saveSheetConfig,
  getSheetConfig,
} from '@/lib/services/googleSheetsService';

interface CSVPreviewData {
  headers: string[];
  rows: any[][];
  fileName: string;
}

export const ImportacionDatosPage: React.FC = () => {
  const { proyectos } = useProyectoStore();
  const proyectoActual = proyectos[0];
  const { syncStatus, importFromSheet } = useGoogleSheetSync();

  const [tabActual, setTabActual] = useState(0);
  
  // Estados para CSV
  const [csvContratistas, setCSVContratistas] = useState<CSVPreviewData | null>(null);
  const [csvContratos, setCSVContratos] = useState<CSVPreviewData | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<{ success: number; errors: number; messages: string[] } | null>(null);

  // Estados para Google Sheets
  const [spreadsheets, setSpreadsheets] = useState<any[]>([]);
  const [spreadsheetSeleccionado, setSpreadsheetSeleccionado] = useState<string>('');
  const [sheets, setSheets] = useState<any[]>([]);
  const [sheetSeleccionado, setSheetSeleccionado] = useState<string>('');
  const [rangoSheet, setRangoSheet] = useState<string>('A1:Z1000');
  const [configuracionActual, setConfiguracionActual] = useState<any>(null);
  const [dialogSheets, setDialogSheets] = useState(false);

  // Cargar configuración actual al montar
  React.useEffect(() => {
    if (proyectoActual?.id) {
      cargarConfiguracion();
    }
  }, [proyectoActual?.id]);

  const cargarConfiguracion = async () => {
    try {
      const config = await getSheetConfig(proyectoActual.id);
      setConfiguracionActual(config);
      if (config) {
        setSpreadsheetSeleccionado(config.spreadsheet_id);
        setSheetSeleccionado(config.sheet_name);
        setRangoSheet(config.range);
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  };

  /**
   * Parsear CSV
   */
  const parseCSV = (text: string): { headers: string[]; rows: any[][] } => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      return values;
    });
    return { headers, rows };
  };

  /**
   * Manejar carga de archivo CSV
   */
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, tipo: 'contratistas' | 'contratos') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCSV(text);
      
      const previewData: CSVPreviewData = {
        headers,
        rows: rows.slice(0, 10), // Solo primeras 10 filas para preview
        fileName: file.name,
      };

      if (tipo === 'contratistas') {
        setCSVContratistas(previewData);
      } else {
        setCSVContratos(previewData);
      }
    };
    reader.readAsText(file);
  };

  /**
   * Importar contratistas desde CSV
   */
  const importarContratistas = async () => {
    if (!csvContratistas) return;

    setImportando(true);
    setResultado(null);

    try {
      const file = (document.getElementById('file-contratistas') as HTMLInputElement)?.files?.[0];
      if (!file) return;

      const text = await file.text();
      const { headers, rows } = parseCSV(text);

      let successCount = 0;
      let errorCount = 0;
      const messages: string[] = [];

      // Mapeo de columnas (ajustar según tu CSV)
      const nombreIndex = headers.findIndex(h => h.toLowerCase().includes('contratista') || h.toLowerCase().includes('nombre'));
      const categoriaIndex = headers.findIndex(h => h.toLowerCase().includes('categoria'));
      const partidaIndex = headers.findIndex(h => h.toLowerCase().includes('partida'));

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        try {
          const nombre = row[nombreIndex]?.trim();
          if (!nombre) {
            messages.push(`Fila ${i + 2}: Sin nombre de contratista`);
            errorCount++;
            continue;
          }

          // Verificar si existe
          const { data: existing } = await supabase
            .from('contratistas')
            .select('id')
            .ilike('nombre', nombre)
            .maybeSingle();

          if (existing) {
            messages.push(`Fila ${i + 2}: "${nombre}" ya existe`);
            continue;
          }

          // Insertar
          const { error } = await supabase
            .from('contratistas')
            .insert({
              nombre,
              categoria: row[categoriaIndex]?.trim() || null,
              partida: row[partidaIndex]?.trim() || null,
              active: true,
            });

          if (error) throw error;
          successCount++;
        } catch (error: any) {
          errorCount++;
          messages.push(`Fila ${i + 2}: ${error.message}`);
        }
      }

      setResultado({ success: successCount, errors: errorCount, messages });
    } catch (error: any) {
      setResultado({ success: 0, errors: 1, messages: [error.message] });
    } finally {
      setImportando(false);
    }
  };

  /**
   * Importar contratos desde CSV
   */
  const importarContratos = async () => {
    if (!csvContratos || !proyectoActual) return;

    setImportando(true);
    setResultado(null);

    try {
      const file = (document.getElementById('file-contratos') as HTMLInputElement)?.files?.[0];
      if (!file) return;

      const text = await file.text();
      const { headers, rows } = parseCSV(text);

      let successCount = 0;
      let errorCount = 0;
      const messages: string[] = [];

      // Mapeo de columnas
      const mapping: Record<string, number> = {};
      headers.forEach((h, i) => {
        const lower = h.toLowerCase();
        if (lower.includes('contratista')) mapping.contratista = i;
        if (lower.includes('clave')) mapping.clave = i;
        if (lower.includes('tipo')) mapping.tipo = i;
        if (lower.includes('tratamiento')) mapping.tratamiento = i;
        if (lower.includes('descripcion')) mapping.descripcion = i;
        if (lower.includes('monto neto de contrato') || lower.includes('monto contratado')) mapping.monto = i;
        if (lower.includes('anticipo')) mapping.anticipo = i;
        if (lower.includes('retencion') || lower.includes('retención')) mapping.retencion = i;
        if (lower.includes('fecha de inicio') || lower.includes('inicio')) mapping.fechaInicio = i;
        if (lower.includes('fecha fin') || lower.includes('fin')) mapping.fechaFin = i;
        if (lower.includes('categoria')) mapping.categoria = i;
        if (lower.includes('partida') && !lower.includes('sub')) mapping.partida = i;
        if (lower.includes('subpartida')) mapping.subpartida = i;
      });

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        try {
          // Buscar contratista
          const nombreContratista = row[mapping.contratista]?.trim();
          if (!nombreContratista) {
            messages.push(`Fila ${i + 2}: Sin contratista`);
            errorCount++;
            continue;
          }

          const { data: contratista } = await supabase
            .from('contratistas')
            .select('id')
            .ilike('nombre', nombreContratista)
            .maybeSingle();

          if (!contratista) {
            messages.push(`Fila ${i + 2}: Contratista "${nombreContratista}" no encontrado`);
            errorCount++;
            continue;
          }

          // Limpiar valores monetarios y porcentajes
          const limpiarMonto = (val: string) => {
            if (!val) return 0;
            return parseFloat(val.replace(/[$,%]/g, '').replace(/,/g, '').trim()) || 0;
          };

          // Parsear fecha
          const parsearFecha = (val: string) => {
            if (!val) return null;
            try {
              const parts = val.split('/');
              if (parts.length === 3) {
                const [day, month, year] = parts;
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
              return val;
            } catch {
              return null;
            }
          };

          const contratoData = {
            contratista_id: contratista.id,
            proyecto_id: proyectoActual.id,
            clave_contrato: row[mapping.clave]?.trim() || null,
            tipo_contrato: row[mapping.tipo]?.trim() || null,
            tratamiento: row[mapping.tratamiento]?.trim() || null,
            descripcion: row[mapping.descripcion]?.trim() || null,
            monto_contrato: limpiarMonto(row[mapping.monto]),
            anticipo_monto: limpiarMonto(row[mapping.anticipo]),
            retencion_porcentaje: limpiarMonto(row[mapping.retencion]),
            fecha_inicio: parsearFecha(row[mapping.fechaInicio]),
            fecha_fin: parsearFecha(row[mapping.fechaFin]),
            categoria: row[mapping.categoria]?.trim() || null,
            partida: row[mapping.partida]?.trim() || null,
            subpartida: row[mapping.subpartida]?.trim() || null,
            active: true,
          };

          // Verificar si existe
          const { data: existing } = await supabase
            .from('contratos')
            .select('id')
            .eq('clave_contrato', contratoData.clave_contrato)
            .eq('proyecto_id', proyectoActual.id)
            .maybeSingle();

          if (existing) {
            // Actualizar
            const { error } = await supabase
              .from('contratos')
              .update(contratoData)
              .eq('id', existing.id);

            if (error) throw error;
            messages.push(`Fila ${i + 2}: "${contratoData.clave_contrato}" actualizado`);
          } else {
            // Insertar
            const { error } = await supabase
              .from('contratos')
              .insert(contratoData);

            if (error) throw error;
          }

          successCount++;
        } catch (error: any) {
          errorCount++;
          messages.push(`Fila ${i + 2}: ${error.message}`);
        }
      }

      setResultado({ success: successCount, errors: errorCount, messages });
    } catch (error: any) {
      setResultado({ success: 0, errors: 1, messages: [error.message] });
    } finally {
      setImportando(false);
    }
  };

  /**
   * Listar hojas de Google
   */
  const listarSpreadsheetsGoogle = async () => {
    try {
      setDialogSheets(true);
      const sheets = await listUserSpreadsheets();
      setSpreadsheets(sheets);
    } catch (error: any) {
      alert(`Error al listar hojas: ${error.message}\n\nAsegúrate de haber iniciado sesión con Google.`);
    }
  };

  /**
   * Seleccionar spreadsheet y cargar pestañas
   */
  const seleccionarSpreadsheet = async (spreadsheetId: string) => {
    try {
      setSpreadsheetSeleccionado(spreadsheetId);
      const info = await getSpreadsheetInfo(spreadsheetId);
      setSheets(info.sheets || []);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  /**
   * Guardar configuración de Google Sheets
   */
  const guardarConfiguracionSheets = async () => {
    if (!proyectoActual || !spreadsheetSeleccionado || !sheetSeleccionado) {
      alert('Completa todos los campos');
      return;
    }

    try {
      await saveSheetConfig(proyectoActual.id, {
        spreadsheet_id: spreadsheetSeleccionado,
        sheet_name: sheetSeleccionado,
        range: rangoSheet,
        column_mapping: {},
      });

      alert('Configuración guardada exitosamente');
      setDialogSheets(false);
      await cargarConfiguracion();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  /**
   * Importar desde Google Sheets
   */
  const importarDesdeGoogleSheets = async () => {
    if (!proyectoActual) return;

    try {
      await importFromSheet(proyectoActual.id);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Importación de Datos
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Importa contratistas y contratos desde archivos CSV o Google Sheets
        </Typography>

        <Tabs value={tabActual} onChange={(_, v) => setTabActual(v)} sx={{ mb: 3 }}>
          <Tab label="Importar CSV" />
          <Tab label="Google Sheets" />
        </Tabs>

        {/* TAB 0: IMPORTAR CSV */}
        {tabActual === 0 && (
          <Stack spacing={4}>
            {/* Contratistas */}
            <Box>
              <Typography variant="h6" fontWeight={600} mb={2}>
                📋 Importar Contratistas
              </Typography>
              
              <input
                accept=".csv"
                style={{ display: 'none' }}
                id="file-contratistas"
                type="file"
                onChange={(e) => handleFileUpload(e, 'contratistas')}
              />
              <label htmlFor="file-contratistas">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<UploadIcon />}
                  sx={{ mr: 2 }}
                >
                  Seleccionar CSV
                </Button>
              </label>

              {csvContratistas && (
                <Button
                  variant="contained"
                  startIcon={<CheckIcon />}
                  onClick={importarContratistas}
                  disabled={importando}
                >
                  Importar {csvContratistas.fileName}
                </Button>
              )}

              {csvContratistas && (
                <TableContainer sx={{ mt: 2, maxHeight: 300 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {csvContratistas.headers.map((h, i) => (
                          <TableCell key={i}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {csvContratistas.rows.map((row, i) => (
                        <TableRow key={i}>
                          {row.map((cell, j) => (
                            <TableCell key={j}>{cell}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>

            {/* Contratos */}
            <Box>
              <Typography variant="h6" fontWeight={600} mb={2}>
                📄 Importar Contratos
              </Typography>
              
              <input
                accept=".csv"
                style={{ display: 'none' }}
                id="file-contratos"
                type="file"
                onChange={(e) => handleFileUpload(e, 'contratos')}
              />
              <label htmlFor="file-contratos">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<UploadIcon />}
                  sx={{ mr: 2 }}
                >
                  Seleccionar CSV
                </Button>
              </label>

              {csvContratos && (
                <Button
                  variant="contained"
                  startIcon={<CheckIcon />}
                  onClick={importarContratos}
                  disabled={importando}
                >
                  Importar {csvContratos.fileName}
                </Button>
              )}

              {csvContratos && (
                <TableContainer sx={{ mt: 2, maxHeight: 300 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {csvContratos.headers.slice(0, 8).map((h, i) => (
                          <TableCell key={i}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {csvContratos.rows.map((row, i) => (
                        <TableRow key={i}>
                          {row.slice(0, 8).map((cell, j) => (
                            <TableCell key={j}>{cell}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>

            {/* Resultado */}
            {importando && <LinearProgress />}
            
            {resultado && (
              <Alert severity={resultado.errors > 0 ? 'warning' : 'success'}>
                <Typography variant="body2" fontWeight={600}>
                  ✅ Importados: {resultado.success} | ❌ Errores: {resultado.errors}
                </Typography>
                {resultado.messages.slice(0, 5).map((msg, i) => (
                  <Typography key={i} variant="caption" display="block">
                    {msg}
                  </Typography>
                ))}
              </Alert>
            )}
          </Stack>
        )}

        {/* TAB 1: GOOGLE SHEETS */}
        {tabActual === 1 && (
          <Stack spacing={3}>
            <Alert severity="info">
              Conecta tu hoja de Google Sheets para sincronización bidireccional automática
            </Alert>

            {configuracionActual ? (
              <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  ✓ Configuración activa
                </Typography>
                <Typography variant="body2">
                  <strong>Hoja:</strong> {configuracionActual.sheet_name}
                </Typography>
                <Typography variant="body2">
                  <strong>Rango:</strong> {configuracionActual.range}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setDialogSheets(true)}
                  sx={{ mt: 1, mr: 1 }}
                >
                  Cambiar configuración
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SyncIcon />}
                  onClick={importarDesdeGoogleSheets}
                  disabled={syncStatus.loading}
                  sx={{ mt: 1 }}
                >
                  Importar ahora
                </Button>
              </Paper>
            ) : (
              <Button
                variant="contained"
                startIcon={<GoogleIcon />}
                onClick={listarSpreadsheetsGoogle}
                size="large"
              >
                Configurar Google Sheets
              </Button>
            )}

            {syncStatus.loading && (
              <Box>
                <LinearProgress variant="determinate" value={syncStatus.progress} />
                <Typography variant="body2" color="text.secondary" mt={1}>
                  {syncStatus.message}
                </Typography>
              </Box>
            )}

            {syncStatus.progress === 100 && (
              <Alert severity={syncStatus.errors > 0 ? 'warning' : 'success'}>
                <Typography variant="body2" fontWeight={600}>
                  ✅ Importados: {syncStatus.success} | ❌ Errores: {syncStatus.errors}
                </Typography>
                {syncStatus.errorDetails.slice(0, 5).map((msg, i) => (
                  <Typography key={i} variant="caption" display="block">
                    {msg}
                  </Typography>
                ))}
              </Alert>
            )}
          </Stack>
        )}
      </Paper>

      {/* Dialog para seleccionar Google Sheet */}
      <Dialog open={dialogSheets} onClose={() => setDialogSheets(false)} maxWidth="md" fullWidth>
        <DialogTitle>Configurar Google Sheets</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {spreadsheets.length === 0 ? (
              <Typography>Cargando hojas de cálculo...</Typography>
            ) : (
              <>
                <TextField
                  select
                  label="Selecciona una hoja de cálculo"
                  value={spreadsheetSeleccionado}
                  onChange={(e) => seleccionarSpreadsheet(e.target.value)}
                  SelectProps={{ native: true }}
                  fullWidth
                >
                  <option value="">-- Selecciona --</option>
                  {spreadsheets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </TextField>

                {sheets.length > 0 && (
                  <TextField
                    select
                    label="Selecciona una pestaña"
                    value={sheetSeleccionado}
                    onChange={(e) => setSheetSeleccionado(e.target.value)}
                    SelectProps={{ native: true }}
                    fullWidth
                  >
                    <option value="">-- Selecciona --</option>
                    {sheets.map((s: any) => (
                      <option key={s.properties.sheetId} value={s.properties.title}>
                        {s.properties.title}
                      </option>
                    ))}
                  </TextField>
                )}

                <TextField
                  label="Rango de celdas"
                  value={rangoSheet}
                  onChange={(e) => setRangoSheet(e.target.value)}
                  placeholder="A1:Z1000"
                  fullWidth
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogSheets(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={guardarConfiguracionSheets}
            disabled={!spreadsheetSeleccionado || !sheetSeleccionado}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ImportacionDatosPage;
