import React, { useState } from 'react';
import * as XLSX from 'xlsx';
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
  TableSortLabel,
} from '@mui/material';
import { Edit, Trash2, Save, X, Download, Upload } from 'lucide-react';
import type { ConceptoContrato } from '@/types/concepto-contrato';
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
  
  // Estados para filtros y ordenamiento
  const [orderBy, setOrderBy] = useState<string>('')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [filtroPartida, setFiltroPartida] = useState('')
  const [filtroSubpartida, setFiltroSubpartida] = useState('')
  const [filtroActividad, setFiltroActividad] = useState('')
  const [filtroClave, setFiltroClave] = useState('')
  const [filtroConcepto, setFiltroConcepto] = useState('')
  const [filtroUnidad, setFiltroUnidad] = useState('')
  const [filtroCantidadCat, setFiltroCantidadCat] = useState('')
  const [filtroPUCat, setFiltroPUCat] = useState('')
  const [filtroImporteCat, setFiltroImporteCat] = useState('')
  const [filtroCantidadEst, setFiltroCantidadEst] = useState('')
  const [filtroPUEst, setFiltroPUEst] = useState('')
  const [filtroImporteEst, setFiltroImporteEst] = useState('')
  const [filtroVolFecha, setFiltroVolFecha] = useState('')
  const [filtroMontoFecha, setFiltroMontoFecha] = useState('')
  
  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

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
  
  // Filtrar y ordenar conceptos
  const conceptosFiltrados = React.useMemo(() => {
    let filtered = [...conceptos]
    
    // Aplicar filtros
    if (filtroPartida) filtered = filtered.filter(c => (c.partida || '').toLowerCase().includes(filtroPartida.toLowerCase()))
    if (filtroSubpartida) filtered = filtered.filter(c => (c.subpartida || '').toLowerCase().includes(filtroSubpartida.toLowerCase()))
    if (filtroActividad) filtered = filtered.filter(c => (c.actividad || '').toLowerCase().includes(filtroActividad.toLowerCase()))
    if (filtroClave) filtered = filtered.filter(c => (c.clave || '').toLowerCase().includes(filtroClave.toLowerCase()))
    if (filtroConcepto) filtered = filtered.filter(c => (c.concepto || '').toLowerCase().includes(filtroConcepto.toLowerCase()))
    if (filtroUnidad) filtered = filtered.filter(c => (c.unidad || '').toLowerCase().includes(filtroUnidad.toLowerCase()))
    if (filtroCantidadCat) filtered = filtered.filter(c => c.cantidad_catalogo.toString().includes(filtroCantidadCat))
    if (filtroPUCat) filtered = filtered.filter(c => c.precio_unitario_catalogo.toString().includes(filtroPUCat))
    if (filtroImporteCat) filtered = filtered.filter(c => (c.cantidad_catalogo * c.precio_unitario_catalogo).toString().includes(filtroImporteCat))
    if (filtroCantidadEst) filtered = filtered.filter(c => (c.cantidad_estimada || 0).toString().includes(filtroCantidadEst))
    if (filtroPUEst) filtered = filtered.filter(c => (c.precio_unitario_estimacion || 0).toString().includes(filtroPUEst))
    if (filtroImporteEst) filtered = filtered.filter(c => ((c.cantidad_estimada || 0) * (c.precio_unitario_estimacion || 0)).toString().includes(filtroImporteEst))
    if (filtroVolFecha) filtered = filtered.filter(c => (c.volumen_estimado_fecha || 0).toString().includes(filtroVolFecha))
    if (filtroMontoFecha) filtered = filtered.filter(c => (c.monto_estimado_fecha || 0).toString().includes(filtroMontoFecha))
    
    // Aplicar ordenamiento
    if (orderBy) {
      filtered.sort((a, b) => {
        let aValue: any
        let bValue: any
        
        switch (orderBy) {
          case 'partida':
            aValue = a.partida || ''
            bValue = b.partida || ''
            break
          case 'subpartida':
            aValue = a.subpartida || ''
            bValue = b.subpartida || ''
            break
          case 'actividad':
            aValue = a.actividad || ''
            bValue = b.actividad || ''
            break
          case 'clave':
            aValue = a.clave || ''
            bValue = b.clave || ''
            break
          case 'concepto':
            aValue = a.concepto || ''
            bValue = b.concepto || ''
            break
          case 'unidad':
            aValue = a.unidad || ''
            bValue = b.unidad || ''
            break
          case 'cantidadCat':
            aValue = a.cantidad_catalogo
            bValue = b.cantidad_catalogo
            break
          case 'puCat':
            aValue = a.precio_unitario_catalogo
            bValue = b.precio_unitario_catalogo
            break
          case 'importeCat':
            aValue = a.cantidad_catalogo * a.precio_unitario_catalogo
            bValue = b.cantidad_catalogo * b.precio_unitario_catalogo
            break
          case 'cantidadEst':
            aValue = a.cantidad_estimada || 0
            bValue = b.cantidad_estimada || 0
            break
          case 'puEst':
            aValue = a.precio_unitario_estimacion || 0
            bValue = b.precio_unitario_estimacion || 0
            break
          case 'importeEst':
            aValue = (a.cantidad_estimada || 0) * (a.precio_unitario_estimacion || 0)
            bValue = (b.cantidad_estimada || 0) * (b.precio_unitario_estimacion || 0)
            break
          case 'volFecha':
            aValue = a.volumen_estimado_fecha || 0
            bValue = b.volumen_estimado_fecha || 0
            break
          case 'montoFecha':
            aValue = a.monto_estimado_fecha || 0
            bValue = b.monto_estimado_fecha || 0
            break
          default:
            return 0
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return order === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue)
        }
        
        return order === 'asc' ? aValue - bValue : bValue - aValue
      })
    }
    
    return filtered
  }, [conceptos, filtroPartida, filtroSubpartida, filtroActividad, filtroClave, filtroConcepto, filtroUnidad, 
      filtroCantidadCat, filtroPUCat, filtroImporteCat, filtroCantidadEst, filtroPUEst, filtroImporteEst,
      filtroVolFecha, filtroMontoFecha, orderBy, order])

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

  // Importar catálogo desde CSV con merge por CLAVE
  const handleImportCatalog = (file: File) => {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExt === 'csv') {
      handleImportCSV(file);
    } else {
      alert('Formato no soportado. Use solo archivos CSV.');
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

  // Totales usando conceptos filtrados
  const totalImporteCatalogo = conceptosFiltrados.reduce(
    (sum, c) => sum + (c.cantidad_catalogo * c.precio_unitario_catalogo),
    0
  );
  const totalImporteEstimado = conceptosFiltrados.reduce(
    (sum, c) => sum + (c.cantidad_estimada || 0) * (c.precio_unitario_estimacion || 0),
    0
  );
  const totalMontoEstimadoFecha = conceptosFiltrados.reduce(
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
              <Typography variant="body2">CSV (Compatible con Excel)</Typography>
            </MenuItem>
          </Menu>
          {!catalogoBloqueado && !readOnly && (
            <>
              <input
                id={fileInputId}
                type="file"
                accept=".csv"
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

      {/* Resumen de totales */}
      <Paper 
        elevation={0}
        sx={{ 
          mb: 2, 
          p: 2, 
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(203, 213, 225, 0.5)',
          borderRadius: 2
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent="space-around">
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.7rem' }}>
              Total Catálogo
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#3b82f6', fontFamily: 'monospace', mt: 0.25, fontSize: '1.1rem' }}>
              ${totalImporteCatalogo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.7rem' }}>
              Total Estimado
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#10b981', fontFamily: 'monospace', mt: 0.25, fontSize: '1.1rem' }}>
              ${totalMontoEstimadoFecha.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.7rem' }}>
              % Avance
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#f59e0b', mt: 0.25, fontSize: '1.1rem' }}>
              {totalImporteCatalogo > 0 ? ((totalMontoEstimadoFecha / totalImporteCatalogo) * 100).toFixed(2) : '0.00'}%
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <TableContainer 
        component={Paper} 
        sx={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(203, 213, 225, 0.5)',
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          overflowX: 'auto',
          overflowY: 'visible',
          '&::-webkit-scrollbar': {
            width: 8,
            height: 8
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'rgba(148, 163, 184, 0.1)'
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'rgba(100, 116, 139, 0.4)',
            borderRadius: 1,
            '&:hover': {
              bgcolor: 'rgba(100, 116, 139, 0.6)'
            }
          }
        }}
      >
        <Table size="small">
          <TableHead sx={{ '& th': { bgcolor: '#334155', color: '#fff', fontWeight: 700, py: 0.5, fontSize: '0.75rem', position: 'sticky', top: 0, zIndex: 10 } }}>
            <TableRow>
              <TableCell sx={{ minWidth: 90, maxWidth: 90 }}>
                <Stack spacing={0.5}>
                  <TableSortLabel
                    active={orderBy === 'partida'}
                    direction={orderBy === 'partida' ? order : 'asc'}
                    onClick={() => handleRequestSort('partida')}
                    sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                  >
                    Partida
                  </TableSortLabel>
                  <TextField
                    size="small"
                    value={filtroPartida}
                    onChange={(e) => setFiltroPartida(e.target.value)}
                    placeholder="Filtrar..."
                    sx={{ '& .MuiInputBase-root': { height: 28, fontSize: '0.75rem', bgcolor: 'rgba(255,255,255,0.9)' } }}
                  />
                </Stack>
              </TableCell>
              <TableCell sx={{ minWidth: 90, maxWidth: 90 }}>
                <Stack spacing={0.5}>
                  <TableSortLabel
                    active={orderBy === 'subpartida'}
                    direction={orderBy === 'subpartida' ? order : 'asc'}
                    onClick={() => handleRequestSort('subpartida')}
                    sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                  >
                    Subpartida
                  </TableSortLabel>
                  <TextField
                    size="small"
                    value={filtroSubpartida}
                    onChange={(e) => setFiltroSubpartida(e.target.value)}
                    placeholder="Filtrar..."
                    sx={{ '& .MuiInputBase-root': { height: 28, fontSize: '0.75rem', bgcolor: 'rgba(255,255,255,0.9)' } }}
                  />
                </Stack>
              </TableCell>
              <TableCell sx={{ minWidth: 100, maxWidth: 100 }}>
                <Stack spacing={0.5}>
                  <TableSortLabel
                    active={orderBy === 'actividad'}
                    direction={orderBy === 'actividad' ? order : 'asc'}
                    onClick={() => handleRequestSort('actividad')}
                    sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                  >
                    Actividad
                  </TableSortLabel>
                  <TextField
                    size="small"
                    value={filtroActividad}
                    onChange={(e) => setFiltroActividad(e.target.value)}
                    placeholder="Filtrar..."
                    sx={{ '& .MuiInputBase-root': { height: 28, fontSize: '0.75rem', bgcolor: 'rgba(255,255,255,0.9)' } }}
                  />
                </Stack>
              </TableCell>
              <TableCell sx={{ minWidth: 90, maxWidth: 90 }}>
                <Stack spacing={0.5}>
                  <TableSortLabel
                    active={orderBy === 'clave'}
                    direction={orderBy === 'clave' ? order : 'asc'}
                    onClick={() => handleRequestSort('clave')}
                    sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                  >
                    Clave
                  </TableSortLabel>
                  <TextField
                    size="small"
                    value={filtroClave}
                    onChange={(e) => setFiltroClave(e.target.value)}
                    placeholder="Filtrar..."
                    sx={{ '& .MuiInputBase-root': { height: 28, fontSize: '0.75rem', bgcolor: 'rgba(255,255,255,0.9)' } }}
                  />
                </Stack>
              </TableCell>
              <TableCell sx={{ minWidth: 250, maxWidth: 350 }}>
                <Stack spacing={0.5}>
                  <TableSortLabel
                    active={orderBy === 'concepto'}
                    direction={orderBy === 'concepto' ? order : 'asc'}
                    onClick={() => handleRequestSort('concepto')}
                    sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                  >
                    Concepto
                  </TableSortLabel>
                  <TextField
                    size="small"
                    value={filtroConcepto}
                    onChange={(e) => setFiltroConcepto(e.target.value)}
                    placeholder="Filtrar..."
                    sx={{ '& .MuiInputBase-root': { height: 28, fontSize: '0.75rem', bgcolor: 'rgba(255,255,255,0.9)' } }}
                  />
                </Stack>
              </TableCell>
              <TableCell sx={{ minWidth: 70, maxWidth: 70 }}>
                <Stack spacing={0.5}>
                  <TableSortLabel
                    active={orderBy === 'unidad'}
                    direction={orderBy === 'unidad' ? order : 'asc'}
                    onClick={() => handleRequestSort('unidad')}
                    sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                  >
                    Unidad
                  </TableSortLabel>
                  <TextField
                    size="small"
                    value={filtroUnidad}
                    onChange={(e) => setFiltroUnidad(e.target.value)}
                    placeholder="Filtrar..."
                    sx={{ '& .MuiInputBase-root': { height: 28, fontSize: '0.75rem', bgcolor: 'rgba(255,255,255,0.9)' } }}
                  />
                </Stack>
              </TableCell>

              {/* CATÁLOGO FIJO */}
              <TableCell align="right" sx={{ minWidth: 90, maxWidth: 90, bgcolor: 'rgba(59, 130, 246, 0.1)' }}>
                <Stack spacing={0.5}>
                  <TableSortLabel
                    active={orderBy === 'cantidadCat'}
                    direction={orderBy === 'cantidadCat' ? order : 'asc'}
                    onClick={() => handleRequestSort('cantidadCat')}
                    sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                  >
                    Cantidad
                  </TableSortLabel>
                  <TextField
                    size="small"
                    value={filtroCantidadCat}
                    onChange={(e) => setFiltroCantidadCat(e.target.value)}
                    placeholder="Filtrar..."
                    sx={{ '& .MuiInputBase-root': { height: 28, fontSize: '0.75rem', bgcolor: 'rgba(255,255,255,0.9)' } }}
                  />
                </Stack>
              </TableCell>
              <TableCell align="right" sx={{ minWidth: 100, maxWidth: 100, bgcolor: 'rgba(59, 130, 246, 0.1)' }}>
                <Stack spacing={0.5}>
                  <TableSortLabel
                    active={orderBy === 'puCat'}
                    direction={orderBy === 'puCat' ? order : 'asc'}
                    onClick={() => handleRequestSort('puCat')}
                    sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                  >
                    P.U.
                  </TableSortLabel>
                  <TextField
                    size="small"
                    value={filtroPUCat}
                    onChange={(e) => setFiltroPUCat(e.target.value)}
                    placeholder="Filtrar..."
                    sx={{ '& .MuiInputBase-root': { height: 28, fontSize: '0.75rem', bgcolor: 'rgba(255,255,255,0.9)' } }}
                  />
                </Stack>
              </TableCell>
              <TableCell align="right" sx={{ minWidth: 110, maxWidth: 110, bgcolor: 'rgba(59, 130, 246, 0.15)' }}>
                <Stack spacing={0.5}>
                  <TableSortLabel
                    active={orderBy === 'importeCat'}
                    direction={orderBy === 'importeCat' ? order : 'asc'}
                    onClick={() => handleRequestSort('importeCat')}
                    sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                  >
                    Importe
                  </TableSortLabel>
                  <TextField
                    size="small"
                    value={filtroImporteCat}
                    onChange={(e) => setFiltroImporteCat(e.target.value)}
                    placeholder="Filtrar..."
                    sx={{ '& .MuiInputBase-root': { height: 28, fontSize: '0.75rem', bgcolor: 'rgba(255,255,255,0.9)' } }}
                  />
                </Stack>
              </TableCell>

              {/* ESTIMACIONES VIVAS */}
              <TableCell align="right" sx={{ minWidth: 90, maxWidth: 90, bgcolor: 'rgba(16, 185, 129, 0.1)' }}>
                <Stack spacing={0.5}>
                  <TableSortLabel
                    active={orderBy === 'cantidadEst'}
                    direction={orderBy === 'cantidadEst' ? order : 'asc'}
                    onClick={() => handleRequestSort('cantidadEst')}
                    sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                  >
                    Cant. Est.
                  </TableSortLabel>
                  <TextField
                    size="small"
                    value={filtroCantidadEst}
                    onChange={(e) => setFiltroCantidadEst(e.target.value)}
                    placeholder="Filtrar..."
                    sx={{ '& .MuiInputBase-root': { height: 28, fontSize: '0.75rem', bgcolor: 'rgba(255,255,255,0.9)' } }}
                  />
                </Stack>
              </TableCell>
              <TableCell align="right" sx={{ minWidth: 100, maxWidth: 100, bgcolor: 'rgba(16, 185, 129, 0.1)' }}>
                <Stack spacing={0.5}>
                  <TableSortLabel
                    active={orderBy === 'puEst'}
                    direction={orderBy === 'puEst' ? order : 'asc'}
                    onClick={() => handleRequestSort('puEst')}
                    sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                  >
                    P.U. Est.
                  </TableSortLabel>
                  <TextField
                    size="small"
                    value={filtroPUEst}
                    onChange={(e) => setFiltroPUEst(e.target.value)}
                    placeholder="Filtrar..."
                    sx={{ '& .MuiInputBase-root': { height: 28, fontSize: '0.75rem', bgcolor: 'rgba(255,255,255,0.9)' } }}
                  />
                </Stack>
              </TableCell>
              <TableCell align="right" sx={{ minWidth: 110, maxWidth: 110, bgcolor: 'rgba(16, 185, 129, 0.15)' }}>
                <Stack spacing={0.5}>
                  <TableSortLabel
                    active={orderBy === 'importeEst'}
                    direction={orderBy === 'importeEst' ? order : 'asc'}
                    onClick={() => handleRequestSort('importeEst')}
                    sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                  >
                    Imp. Est.
                  </TableSortLabel>
                  <TextField
                    size="small"
                    value={filtroImporteEst}
                    onChange={(e) => setFiltroImporteEst(e.target.value)}
                    placeholder="Filtrar..."
                    sx={{ '& .MuiInputBase-root': { height: 28, fontSize: '0.75rem', bgcolor: 'rgba(255,255,255,0.9)' } }}
                  />
                </Stack>
              </TableCell>
              <TableCell align="right" sx={{ minWidth: 90, maxWidth: 90, bgcolor: 'rgba(245, 158, 11, 0.1)' }}>
                <Stack spacing={0.5}>
                  <TableSortLabel
                    active={orderBy === 'volFecha'}
                    direction={orderBy === 'volFecha' ? order : 'asc'}
                    onClick={() => handleRequestSort('volFecha')}
                    sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                  >
                    Vol. Fecha
                  </TableSortLabel>
                  <TextField
                    size="small"
                    value={filtroVolFecha}
                    onChange={(e) => setFiltroVolFecha(e.target.value)}
                    placeholder="Filtrar..."
                    sx={{ '& .MuiInputBase-root': { height: 28, fontSize: '0.75rem', bgcolor: 'rgba(255,255,255,0.9)' } }}
                  />
                </Stack>
              </TableCell>
              <TableCell align="right" sx={{ minWidth: 110, maxWidth: 110, bgcolor: 'rgba(245, 158, 11, 0.15)' }}>
                <Stack spacing={0.5}>
                  <TableSortLabel
                    active={orderBy === 'montoFecha'}
                    direction={orderBy === 'montoFecha' ? order : 'asc'}
                    onClick={() => handleRequestSort('montoFecha')}
                    sx={{ color: '#fff !important', '& .MuiTableSortLabel-icon': { color: '#fff !important' } }}
                  >
                    $$ Fecha
                  </TableSortLabel>
                  <TextField
                    size="small"
                    value={filtroMontoFecha}
                    onChange={(e) => setFiltroMontoFecha(e.target.value)}
                    placeholder="Filtrar..."
                    sx={{ '& .MuiInputBase-root': { height: 28, fontSize: '0.75rem', bgcolor: 'rgba(255,255,255,0.9)' } }}
                  />
                </Stack>
              </TableCell>

              {!readOnly && <TableCell sx={{ minWidth: 100 }}>Acciones</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Filas de conceptos existentes */}
            {conceptosFiltrados.map((concepto) => {
              const isEditing = editing.id === concepto.id;
              const data = isEditing ? editing.data : concepto;
              
              // Función para truncar texto
              const truncateText = (text: string | undefined, maxLength: number) => {
                if (!text) return '';
                if (text.length <= maxLength) return text;
                return text.substring(0, maxLength) + '...';
              };

              return (
                <TableRow key={concepto.id} hover sx={{ '& td': { fontSize: '0.8125rem' } }}>
                  <Tooltip title={data.partida || ''} placement="top">
                    <TableCell sx={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {data.partida}
                    </TableCell>
                  </Tooltip>
                  <Tooltip title={data.subpartida || ''} placement="top">
                    <TableCell sx={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {data.subpartida}
                    </TableCell>
                  </Tooltip>
                  <Tooltip title={data.actividad || ''} placement="top">
                    <TableCell sx={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {data.actividad}
                    </TableCell>
                  </Tooltip>
                  <Tooltip title={data.clave || ''} placement="top">
                    <TableCell sx={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {data.clave}
                    </TableCell>
                  </Tooltip>
                  <Tooltip 
                    title={
                      <Box sx={{ maxWidth: 400 }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {data.concepto}
                        </Typography>
                      </Box>
                    } 
                    placement="top"
                  >
                    <TableCell 
                      sx={{ 
                        maxWidth: 350, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        cursor: 'help',
                        '&:hover': {
                          bgcolor: 'rgba(51, 65, 85, 0.05)'
                        }
                      }}
                    >
                      {data.concepto}
                    </TableCell>
                  </Tooltip>
                  <TableCell sx={{ maxWidth: 70, textAlign: 'center' }}>{data.unidad}</TableCell>
                  
                  {/* CATÁLOGO */}
                  <TableCell align="right" sx={{ bgcolor: 'rgba(59, 130, 246, 0.05)', fontFamily: 'monospace' }}>
                    {data.cantidad_catalogo?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell align="right" sx={{ bgcolor: 'rgba(59, 130, 246, 0.05)', fontFamily: 'monospace' }}>
                    ${data.precio_unitario_catalogo?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell align="right" sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', fontWeight: 600, fontFamily: 'monospace' }}>
                    ${((data.cantidad_catalogo || 0) * (data.precio_unitario_catalogo || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  
                  {/* ESTIMACIONES */}
                  <TableCell align="right" sx={{ bgcolor: 'rgba(16, 185, 129, 0.05)', fontFamily: 'monospace' }}>
                    {isEditing ? <TextField size="small" type="number" value={data.cantidad_estimada} onChange={(e) => setEditing({ ...editing, data: { ...data, cantidad_estimada: parseFloat(e.target.value) } })} /> : data.cantidad_estimada?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell align="right" sx={{ bgcolor: 'rgba(16, 185, 129, 0.05)', fontFamily: 'monospace' }}>
                    {isEditing ? <TextField size="small" type="number" value={data.precio_unitario_estimacion} onChange={(e) => setEditing({ ...editing, data: { ...data, precio_unitario_estimacion: parseFloat(e.target.value) } })} /> : `$${data.precio_unitario_estimacion?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </TableCell>
                  <TableCell align="right" sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', fontWeight: 600, fontFamily: 'monospace' }}>
                    ${((data.cantidad_estimada || 0) * (data.precio_unitario_estimacion || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell align="right" sx={{ bgcolor: 'rgba(245, 158, 11, 0.05)', fontFamily: 'monospace' }}>
                    {isEditing ? <TextField size="small" type="number" value={data.volumen_estimado_fecha} onChange={(e) => setEditing({ ...editing, data: { ...data, volumen_estimado_fecha: parseFloat(e.target.value) } })} /> : data.volumen_estimado_fecha?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell align="right" sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)', fontWeight: 600, fontFamily: 'monospace' }}>
                    ${data.monto_estimado_fecha?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            <TableRow sx={{ bgcolor: '#334155', '& td': { color: '#fff', fontWeight: 700, fontSize: '0.9375rem', py: 1.5 } }}>
              <TableCell colSpan={8} align="right">TOTALES:</TableCell>
              <TableCell align="right" sx={{ bgcolor: 'rgba(59, 130, 246, 0.2)', fontFamily: 'monospace', fontSize: '1rem' }}>
                ${totalImporteCatalogo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell colSpan={2} sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)' }} />
              <TableCell align="right" sx={{ bgcolor: 'rgba(16, 185, 129, 0.2)', fontFamily: 'monospace', fontSize: '1rem' }}>
                ${totalImporteEstimado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)' }} />
              <TableCell align="right" sx={{ bgcolor: 'rgba(245, 158, 11, 0.2)', fontFamily: 'monospace', fontSize: '1rem' }}>
                ${totalMontoEstimadoFecha.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
              {!readOnly && <TableCell />}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
