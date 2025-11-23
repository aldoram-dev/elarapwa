import React, { useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  Tooltip,
  Menu,
  MenuItem,
} from '@mui/material';
import { Edit, Trash2, Save, X, Download, Upload } from 'lucide-react';
import type { ConceptoContrato } from '@/types/concepto-contrato';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface ConceptosContratoTableProps {
  contratoId: string;
  conceptos: ConceptoContrato[];
  onAdd?: (concepto: Partial<ConceptoContrato>) => void;
  onUpdate?: (id: string, concepto: Partial<ConceptoContrato>) => void;
  onDelete?: (id: string) => void;
  onReplaceCatalog?: (conceptos: Partial<ConceptoContrato>[]) => void; // Reemplaza todo el catálogo
  readOnly?: boolean;
  catalogoBloqueado?: boolean; // Indica si el catálogo está aprobado y bloqueado
}

interface EditingConcepto {
  id: string | null;
  data: Partial<ConceptoContrato>;
}

export default function ConceptosContratoTable({
  contratoId,
  conceptos,
  onAdd,
  onUpdate,
  onDelete,
  onReplaceCatalog,
  readOnly = false,
  catalogoBloqueado = false,
}: ConceptosContratoTableProps) {
  const [editing, setEditing] = useState<EditingConcepto>({ id: null, data: {} });
  const [downloadAnchorEl, setDownloadAnchorEl] = useState<null | HTMLElement>(null);

  const handleEdit = (concepto: ConceptoContrato) => {
    setEditing({ id: concepto.id, data: { ...concepto } });
  };

  const handleSave = () => {
    if (editing.id && onUpdate) {
      onUpdate(editing.id, editing.data);
      setEditing({ id: null, data: {} });
    }
  };

  const handleCancel = () => {
    setEditing({ id: null, data: {} });
  };



  const handleDelete = (id: string) => {
    if (onDelete && window.confirm('¿Eliminar este concepto?')) {
      onDelete(id);
    }
  };

  // Descargar plantilla CSV
  const handleDownloadCSV = () => {
    const headers = [
      'PARTIDA',
      'SUBPARTIDA',
      'ACTIVIDAD',
      'CLAVE',
      'CONCEPTO',
      'UNIDAD',
      'CANTIDAD',
      'PU',
      'IMPORTE',
    ];

    const rows = conceptos.map(c => {
      const cantidad = c.cantidad_catalogo || 0;
      const pu = c.precio_unitario_catalogo || 0;
      const importe = cantidad * pu;
      return [
        c.partida || '',
        c.subpartida || '',
        c.actividad || '',
        c.clave || '',
        c.concepto || '',
        c.unidad || '',
        cantidad.toString(),
        pu.toString(),
        importe.toFixed(2),
      ];
    });

    const csvContent = [headers, ...rows]
      .map(r => r
        .map(field => {
          const needsQuotes = /[",\n]/.test(field);
          let v = field.replace(/"/g, '""');
          return needsQuotes ? `"${v}"` : v;
        })
        .join(','))
      .join('\n');

    // Agregar BOM UTF-8 para Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catalogo_contrato_${contratoId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadAnchorEl(null);
  };

  // Descargar plantilla XLSX
  const handleDownloadXLSX = () => {
    const headers = [
      'PARTIDA',
      'SUBPARTIDA',
      'ACTIVIDAD',
      'CLAVE',
      'CONCEPTO',
      'UNIDAD',
      'CANTIDAD',
      'PU',
      'IMPORTE',
    ];

    const rows = conceptos.map(c => {
      const cantidad = c.cantidad_catalogo || 0;
      const pu = c.precio_unitario_catalogo || 0;
      const importe = cantidad * pu;
      return [
        c.partida || '',
        c.subpartida || '',
        c.actividad || '',
        c.clave || '',
        c.concepto || '',
        c.unidad || '',
        cantidad,
        pu,
        importe,
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
    // Aplicar estilos básicos al header
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'CCCCCC' } },
      };
    }

    // Ancho de columnas
    ws['!cols'] = [
      { wch: 12 }, // PARTIDA
      { wch: 12 }, // SUBPARTIDA
      { wch: 15 }, // ACTIVIDAD
      { wch: 10 }, // CLAVE
      { wch: 40 }, // CONCEPTO
      { wch: 10 }, // UNIDAD
      { wch: 12 }, // CANTIDAD
      { wch: 12 }, // PU
      { wch: 15 }, // IMPORTE
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catálogo');
    XLSX.writeFile(wb, `catalogo_contrato_${contratoId}.xlsx`);
    setDownloadAnchorEl(null);
  };

  // Importar catálogo desde CSV o XLSX con merge por CLAVE
  const handleImportCatalog = (file: File) => {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExt === 'csv') {
      handleImportCSV(file);
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      handleImportXLSX(file);
    } else {
      alert('Formato no soportado. Use CSV o XLSX.');
    }
  };

  const handleImportCSV = (file: File) => {
    // Leer archivo como ArrayBuffer para detectar encoding
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) return;

      // Detectar BOM y determinar encoding
      const bytes = new Uint8Array(arrayBuffer);
      let encoding = 'UTF-8';
      let startIndex = 0;

      // BOM UTF-8: EF BB BF
      if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
        encoding = 'UTF-8';
        startIndex = 3;
      }
      // BOM UTF-16 LE: FF FE
      else if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
        encoding = 'UTF-16LE';
        startIndex = 2;
      }
      // Sin BOM, intentar detectar por contenido
      else {
        // Si hay bytes > 127, probablemente Latin1/Windows-1252
        const hasHighBytes = bytes.some(b => b > 127);
        if (hasHighBytes) {
          encoding = 'windows-1252';
        }
      }

      // Decodificar con el encoding detectado
      const decoder = new TextDecoder(encoding);
      const text = decoder.decode(arrayBuffer.slice(startIndex));

      // Parsear con papaparse
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const data = results.data as any[];
          
          if (data.length === 0) {
            alert('El archivo está vacío.');
            return;
          }
          
          // Validar headers (case-insensitive)
          const firstRow = data[0];
          const headers = Object.keys(firstRow).map(h => h.trim().toUpperCase());
          const required = ['PARTIDA','SUBPARTIDA','ACTIVIDAD','CLAVE','CONCEPTO','UNIDAD','CANTIDAD','PU'];
          const hasAll = required.every(r => headers.some(h => h === r));
          
          if (!hasAll) {
            alert(`El archivo no tiene los headers requeridos.\nEncontrados: ${headers.join(', ')}\nRequeridos: ${required.join(', ')}`);
            return;
          }
          
          const imported: Partial<ConceptoContrato>[] = [];
          
          for (const row of data) {
            // Normalizar keys a uppercase
            const normalizedRow: any = {};
            Object.keys(row).forEach(key => {
              normalizedRow[key.trim().toUpperCase()] = row[key];
            });
            
            // Limpiar valores numéricos (remover $, comas, etc)
            const cleanNumber = (val: any): number => {
              if (!val) return 0;
              const str = String(val).replace(/[^0-9.-]/g, '');
              const num = parseFloat(str);
              return isNaN(num) ? 0 : num;
            };
            
            const concepto: Partial<ConceptoContrato> = {
              contrato_id: contratoId,
              partida: String(normalizedRow['PARTIDA'] || '').trim(),
              subpartida: String(normalizedRow['SUBPARTIDA'] || '').trim(),
              actividad: String(normalizedRow['ACTIVIDAD'] || '').trim(),
              clave: String(normalizedRow['CLAVE'] || '').trim(),
              concepto: String(normalizedRow['CONCEPTO'] || '').trim(),
              unidad: String(normalizedRow['UNIDAD'] || '').trim(),
              cantidad_catalogo: cleanNumber(normalizedRow['CANTIDAD']),
              precio_unitario_catalogo: cleanNumber(normalizedRow['PU']),
            };
            
            // Solo agregar si tiene al menos CLAVE y CONCEPTO
            if (concepto.clave && concepto.concepto) {
              imported.push(concepto);
            }
          }
          
          if (imported.length === 0) {
            alert('No se encontraron conceptos válidos en el archivo.');
            return;
          }
          
          // RENOMBRAR duplicados por CLAVE agregando (2), (3), etc.
          const clavesUsadas = new Map<string, number>(); // CLAVE normalizada -> contador
          
          imported.forEach(c => {
            if (c.clave) {
              const claveNorm = c.clave.trim().toUpperCase();
              const contador = clavesUsadas.get(claveNorm) || 0;
              clavesUsadas.set(claveNorm, contador + 1);
              
              // Si ya existe, agregar sufijo (2), (3), etc.
              if (contador > 0) {
                c.clave = `${c.clave} (${contador + 1})`;
                console.warn(`⚠️ CLAVE duplicada renombrada: ${claveNorm} → ${c.clave}`);
              }
            }
          });
          
          const duplicadosRenombrados = imported.length - clavesUsadas.size;
          if (duplicadosRenombrados > 0) {
            console.log(`📝 ${duplicadosRenombrados} conceptos duplicados renombrados con sufijos`);
          }
          
          mergeImportedCatalog(imported);
        } catch (error) {
          console.error('Error procesando CSV:', error);
          alert('Error al procesar el archivo CSV.');
        }
      },
      error: (error: any) => {
        console.error('Error parseando CSV:', error);
        alert('Error al leer el archivo CSV.');
      }
    });}
    reader.readAsArrayBuffer(file);
  };

  const handleImportXLSX = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (!data) return;
      
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (jsonData.length === 0) return;
      
      const headers = jsonData[0].map((h: any) => String(h).trim().toUpperCase());
      const required = ['PARTIDA','SUBPARTIDA','ACTIVIDAD','CLAVE','CONCEPTO','UNIDAD','CANTIDAD','PU'];
      const hasAll = required.every(r => headers.includes(r));
      if (!hasAll) {
        alert('El archivo no tiene los headers requeridos.');
        return;
      }
      
      const imported: Partial<ConceptoContrato>[] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;
        
        const concepto: Partial<ConceptoContrato> = {
          contrato_id: contratoId,
          partida: String(row[headers.indexOf('PARTIDA')] || '').trim(),
          subpartida: String(row[headers.indexOf('SUBPARTIDA')] || '').trim(),
          actividad: String(row[headers.indexOf('ACTIVIDAD')] || '').trim(),
          clave: String(row[headers.indexOf('CLAVE')] || '').trim(),
          concepto: String(row[headers.indexOf('CONCEPTO')] || '').trim(),
          unidad: String(row[headers.indexOf('UNIDAD')] || '').trim(),
          cantidad_catalogo: parseFloat(row[headers.indexOf('CANTIDAD')] || 0) || 0,
          precio_unitario_catalogo: parseFloat(row[headers.indexOf('PU')] || 0) || 0,
        };
        imported.push(concepto);
      }
      
      // RENOMBRAR duplicados por CLAVE agregando (2), (3), etc.
      const clavesUsadas = new Map<string, number>(); // CLAVE normalizada -> contador
      
      imported.forEach(c => {
        if (c.clave) {
          const claveNorm = c.clave.trim().toUpperCase();
          const contador = clavesUsadas.get(claveNorm) || 0;
          clavesUsadas.set(claveNorm, contador + 1);
          
          // Si ya existe, agregar sufijo (2), (3), etc.
          if (contador > 0) {
            c.clave = `${c.clave} (${contador + 1})`;
            console.warn(`⚠️ CLAVE duplicada renombrada: ${claveNorm} → ${c.clave}`);
          }
        }
      });
      
      const duplicadosRenombrados = imported.length - clavesUsadas.size;
      if (duplicadosRenombrados > 0) {
        console.log(`📝 ${duplicadosRenombrados} conceptos duplicados renombrados con sufijos`);
      }
      
      mergeImportedCatalog(imported);
    };
    reader.readAsArrayBuffer(file);
  };

  // MERGE inteligente: Actualiza existentes por CLAVE, agrega nuevos, NO elimina
  const mergeImportedCatalog = (imported: Partial<ConceptoContrato>[]) => {
    if (!onReplaceCatalog) {
      // Fallback antiguo: solo agregar
      if (onAdd) {
        imported.forEach(c => onAdd(c));
        alert(`Catálogo agregado. Conceptos añadidos: ${imported.length}`);
      }
      return;
    }

    // Confirmar MERGE (no reemplazo total)
    const existentes = conceptos.length;
    const confirmar = window.confirm(
      `MERGE de catálogo:\n\n` +
      `• Actualizará conceptos existentes (por CLAVE)\n` +
      `• Agregará ${imported.length} conceptos del archivo\n` +
      `• NO eliminará conceptos actuales (${existentes})\n\n` +
      `Esto preserva requisiciones/solicitudes/pagos. ¿Continuar?`
    );
    if (!confirmar) return;

    // Ejecutar merge
    onReplaceCatalog(imported);
    setEditing({ id: null, data: {} });
    alert(`✅ Merge exitoso. Conceptos procesados: ${imported.length}`);
  };

  const fileInputId = `catalogo-upload-${contratoId}`;

  const calcularImporteCatalogo = (cantidad: number, pu: number) => {
    return (cantidad * pu).toFixed(2);
  };

  const calcularImporteEstimado = (cantidad: number, pu: number) => {
    return (cantidad * pu).toFixed(2);
  };

  // Totales
  const totalImporteCatalogo = conceptos.reduce(
    (sum, c) => sum + (c.cantidad_catalogo * c.precio_unitario_catalogo),
    0
  );
  const totalImporteEstimado = conceptos.reduce(
    (sum, c) => sum + (c.cantidad_estimada || 0) * (c.precio_unitario_estimacion || 0),
    0
  );
  const totalMontoEstimadoFecha = conceptos.reduce(
    (sum, c) => sum + (c.monto_estimado_fecha || 0),
    0
  );

  return (
    <Box sx={{ width: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Catálogo de Conceptos</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Download size={18} />}
            onClick={(e) => setDownloadAnchorEl(e.currentTarget)}
          >
            Descargar Plantilla
          </Button>
          <Menu
            anchorEl={downloadAnchorEl}
            open={Boolean(downloadAnchorEl)}
            onClose={() => setDownloadAnchorEl(null)}
          >
            <MenuItem onClick={handleDownloadCSV}>
              <Typography variant="body2">CSV (Excel compatible)</Typography>
            </MenuItem>
            <MenuItem onClick={handleDownloadXLSX}>
              <Typography variant="body2">XLSX (Excel nativo)</Typography>
            </MenuItem>
          </Menu>
          {!catalogoBloqueado && (
            <>
              <input
                id={fileInputId}
                type="file"
                accept=".csv,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportCatalog(file);
                  e.target.value = '';
                }}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<Upload size={18} />}
                onClick={() => document.getElementById(fileInputId)?.click()}
              >
                Subir Catálogo
              </Button>
            </>
          )}
        </Stack>
      </Stack>

      <TableContainer component={Paper} sx={{ maxHeight: 600, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
        <Table stickyHeader size="small">
          <TableHead sx={{ '& th': { bgcolor: '#334155', color: '#fff', fontWeight: 700, py: 1.25 } }}>
            <TableRow>
              <TableCell sx={{ minWidth: 100 }}>Partida</TableCell>
              <TableCell sx={{ minWidth: 100 }}>Subpartida</TableCell>
              <TableCell sx={{ minWidth: 120 }}>Actividad</TableCell>
              <TableCell sx={{ minWidth: 100 }}>Clave</TableCell>
              <TableCell sx={{ minWidth: 200 }}>Concepto</TableCell>
              <TableCell sx={{ minWidth: 80 }}>Unidad</TableCell>

              {/* CATÁLOGO FIJO */}
              <TableCell align="right" sx={{ minWidth: 100 }}>
                Cantidad
              </TableCell>
              <TableCell align="right" sx={{ minWidth: 100 }}>
                P.U.
              </TableCell>
              <TableCell align="right" sx={{ minWidth: 120 }}>
                Importe
              </TableCell>

              {/* ESTIMACIONES VIVAS */}
              <TableCell align="right" sx={{ minWidth: 100 }}>
                Cant. Est.
              </TableCell>
              <TableCell align="right" sx={{ minWidth: 100 }}>
                P.U. Est.
              </TableCell>
              <TableCell align="right" sx={{ minWidth: 120 }}>
                Imp. Est.
              </TableCell>
              <TableCell align="right" sx={{ minWidth: 100 }}>
                Vol. Fecha
              </TableCell>
              <TableCell align="right" sx={{ minWidth: 120 }}>
                $$ Fecha
              </TableCell>

              {!readOnly && <TableCell sx={{ minWidth: 100 }}>Acciones</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Filas de conceptos existentes */}
            {conceptos.map((concepto) => {
              const isEditing = editing.id === concepto.id;
              const data = isEditing ? editing.data : concepto;

              return (
                <TableRow key={concepto.id} hover>
                  <TableCell>{data.partida}</TableCell>
                  <TableCell>{data.subpartida}</TableCell>
                  <TableCell>{data.actividad}</TableCell>
                  <TableCell>{data.clave}</TableCell>
                  <TableCell>{data.concepto}</TableCell>
                  <TableCell>{data.unidad}</TableCell>
                  
                  {/* CATÁLOGO */}
                  <TableCell align="right">{data.cantidad_catalogo?.toFixed(2)}</TableCell>
                  <TableCell align="right">${data.precio_unitario_catalogo?.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ bgcolor: 'rgba(51, 65, 85, 0.06)' }}>
                    <strong>${((data.cantidad_catalogo || 0) * (data.precio_unitario_catalogo || 0)).toFixed(2)}</strong>
                  </TableCell>
                  
                  {/* ESTIMACIONES */}
                  <TableCell align="right">{isEditing ? <TextField size="small" type="number" value={data.cantidad_estimada} onChange={(e) => setEditing({ ...editing, data: { ...data, cantidad_estimada: parseFloat(e.target.value) } })} /> : data.cantidad_estimada?.toFixed(2)}</TableCell>
                  <TableCell align="right">{isEditing ? <TextField size="small" type="number" value={data.precio_unitario_estimacion} onChange={(e) => setEditing({ ...editing, data: { ...data, precio_unitario_estimacion: parseFloat(e.target.value) } })} /> : `$${data.precio_unitario_estimacion?.toFixed(2)}`}</TableCell>
                  <TableCell align="right" sx={{ bgcolor: 'rgba(51, 65, 85, 0.06)' }}>
                    <strong>${((data.cantidad_estimada || 0) * (data.precio_unitario_estimacion || 0)).toFixed(2)}</strong>
                  </TableCell>
                  <TableCell align="right">{isEditing ? <TextField size="small" type="number" value={data.volumen_estimado_fecha} onChange={(e) => setEditing({ ...editing, data: { ...data, volumen_estimado_fecha: parseFloat(e.target.value) } })} /> : data.volumen_estimado_fecha?.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ bgcolor: 'rgba(51, 65, 85, 0.06)' }}>
                    <strong>${data.monto_estimado_fecha?.toFixed(2)}</strong>
                  </TableCell>
                  
                  {!readOnly && (
                    <TableCell>
                      {isEditing ? (
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" color="success" onClick={handleSave}><Save size={18} /></IconButton>
                          <IconButton size="small" color="error" onClick={handleCancel}><X size={18} /></IconButton>
                        </Stack>
                      ) : (
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Editar"><IconButton size="small" onClick={() => handleEdit(concepto)}><Edit size={18} /></IconButton></Tooltip>
                          <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => handleDelete(concepto.id)}><Trash2 size={18} /></IconButton></Tooltip>
                        </Stack>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}

            {/* Fila de totales */}
            <TableRow sx={{ bgcolor: 'rgba(51, 65, 85, 0.12)' }}>
              <TableCell colSpan={8} align="right" sx={{ fontWeight: 'bold' }}>TOTALES:</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                ${totalImporteCatalogo.toFixed(2)}
              </TableCell>
              <TableCell colSpan={2} />
              <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                ${totalImporteEstimado.toFixed(2)}
              </TableCell>
              <TableCell />
              <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                ${totalMontoEstimadoFecha.toFixed(2)}
              </TableCell>
              {!readOnly && <TableCell />}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Resumen de avance */}
      <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
        <Stack direction="row" spacing={3}>
          <Box>
            <Typography variant="caption" color="text.secondary">Total Catálogo</Typography>
            <Typography variant="h6">${totalImporteCatalogo.toFixed(2)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Total Estimado</Typography>
            <Typography variant="h6">${totalMontoEstimadoFecha.toFixed(2)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">% Avance</Typography>
            <Typography variant="h6">
              {totalImporteCatalogo > 0 ? ((totalMontoEstimadoFecha / totalImporteCatalogo) * 100).toFixed(2) : 0}%
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
