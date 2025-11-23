import React, { useMemo, useState } from 'react';
import { ConceptoContrato } from '@/types/concepto-contrato';
import { RequisicionConcepto } from '@/types/requisicion-pago';
import { TextField, Tooltip, Stack, Typography } from '@mui/material';

interface RequisicionConceptosSelectorProps {
  conceptosContrato: ConceptoContrato[];
  conceptosSeleccionados: RequisicionConcepto[];
  onConceptosChange: (conceptos: RequisicionConcepto[]) => void;
  readonly?: boolean;
  readOnly?: boolean;
}

export const RequisicionConceptosSelector: React.FC<RequisicionConceptosSelectorProps> = ({
  conceptosContrato,
  conceptosSeleccionados,
  onConceptosChange,
  readonly = false,
  readOnly = false
}) => {
  const isReadOnly = readonly || readOnly;
  const [cantidadesInput, setCantidadesInput] = useState<Record<string, string>>({});

  const conceptosMap = useMemo(() => {
    const map = new Map<string, RequisicionConcepto>();
    conceptosSeleccionados.forEach(c => map.set(c.concepto_contrato_id, c));
    return map;
  }, [conceptosSeleccionados]);

  const handleToggleConcepto = (concepto: ConceptoContrato & { cantidad_pagada_anterior?: number }) => {
    if (isReadOnly) return;

    const existe = conceptosMap.has(concepto.id);
    if (existe) {
      const nuevos = conceptosSeleccionados.filter(c => c.concepto_contrato_id !== concepto.id);
      onConceptosChange(nuevos);
    } else {
      const nuevo: RequisicionConcepto = {
        concepto_contrato_id: concepto.id,
        clave: concepto.clave,
        concepto: concepto.concepto,
        unidad: concepto.unidad,
        cantidad_catalogo: concepto.cantidad_catalogo,
        cantidad_pagada_anterior: concepto.cantidad_pagada_anterior || 0,
        cantidad_esta_requisicion: 0,
        precio_unitario: concepto.precio_unitario_catalogo,
        importe: 0
      };
      onConceptosChange([...conceptosSeleccionados, nuevo]);
    }
  };
  // Calcular totales
  const totales = useMemo(() => {
    return conceptosSeleccionados.reduce((acc, c) => ({
      importe: acc.importe + c.importe
    }), { importe: 0 });
  }, [conceptosSeleccionados]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Conceptos del Catálogo
        </h3>
        <div className="text-sm text-gray-600">
          {conceptosSeleccionados.length} de {conceptosContrato.length} seleccionados
        </div>
      </div>

      {/* Tabla de conceptos */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partida</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subpartida</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actividad</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clave</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concepto</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad Catálogo</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Disponible</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unitario</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad a Pagar</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Importe</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {conceptosContrato.map((concepto: any) => {
              const conceptoReq = conceptosMap.get(concepto.id);
              const isSelected = !!conceptoReq;
              const cantidadPagar = conceptoReq?.cantidad_esta_requisicion || 0;
              const importe = conceptoReq?.importe || 0;
              const pagadaAnterior = concepto.cantidad_pagada_anterior || 0;
              const maxRemaining = Math.max(0, concepto.cantidad_catalogo - pagadaAnterior);
              const yaRequisitado = pagadaAnterior > 0;

              return (
                <tr
                  key={concepto.id}
                  className={`${isSelected ? 'bg-slate-50' : ''} ${yaRequisitado ? 'bg-yellow-50' : ''} hover:bg-gray-50 transition-colors`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500"
                      disabled={isReadOnly || maxRemaining <= 0}
                      checked={isSelected}
                      onChange={() => handleToggleConcepto(concepto)}
                    />
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700">{concepto.partida}</td>
                  <td className="px-3 py-3 text-sm text-gray-700">{concepto.subpartida}</td>
                  <td className="px-3 py-3 text-sm text-gray-700">{concepto.actividad}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 font-medium">
                    {concepto.clave}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700">
                    {concepto.concepto}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600">
                    {concepto.unidad}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-900 text-right font-mono">
                    {concepto.cantidad_catalogo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-3 text-sm text-right font-mono">
                    <Tooltip title={yaRequisitado ? `Requisitado anterior: ${pagadaAnterior.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'Sin requisiciones previas'}>
                      <span className={`${
                        maxRemaining === 0 ? 'text-red-600 font-bold' : 
                        yaRequisitado ? 'text-yellow-700 font-semibold' : 
                        'text-green-700'
                      }`}>
                        {maxRemaining.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        {maxRemaining === 0 && <span className="ml-1 text-xs">(Agotado)</span>}
                      </span>
                    </Tooltip>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-900 text-right font-mono">
                    ${concepto.precio_unitario_catalogo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {isSelected ? (
                      (() => {
                        const enteredStr =
                          cantidadesInput[concepto.id] !== undefined
                            ? cantidadesInput[concepto.id]
                            : (cantidadPagar ? String(cantidadPagar) : '');
                        const normalizedForError = enteredStr.replace(',', '.');
                        const parsedForError = normalizedForError === '' ? 0 : parseFloat(normalizedForError);
                        const exceeds = parsedForError > maxRemaining;
                        return (
                          <Tooltip
                            placement="top"
                            title={
                              <Stack spacing={0.5}>
                                <Typography variant="caption">Catálogo: {concepto.cantidad_catalogo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                                <Typography variant="caption">Pagado anterior: {pagadaAnterior.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                                <Typography variant="caption">Máximo disponible: {maxRemaining.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                              </Stack>
                            }
                          >
                            <TextField
                              size="small"
                              type="text"
                              inputMode="decimal"
                              value={enteredStr}
                              disabled={isReadOnly}
                              onChange={(e) => {
                                const entered = e.target.value;
                                if (!/^\d*(?:[\.,]\d*)?$/.test(entered)) return;
                                // Siempre reflejar lo tecleado, incluso '.' o ','.
                                setCantidadesInput(prev => ({ ...prev, [concepto.id]: entered }));

                                const normalized = entered.replace(',', '.');
                                const cantidad = normalized === '' || normalized === '.' ? NaN : parseFloat(normalized);
                                if (Number.isNaN(cantidad)) return; // esperar a que sea número válido (ej. '.5')

                                let cantidadAplicar = cantidad;
                                let displayValue = entered;
                                if (cantidad > maxRemaining) {
                                  cantidadAplicar = maxRemaining;
                                  const sep = entered.includes(',') ? ',' : '.';
                                  displayValue = String(maxRemaining).replace('.', sep);
                                  setCantidadesInput(prev => ({ ...prev, [concepto.id]: displayValue }));
                                }

                                const nuevos = conceptosSeleccionados.map(c => {
                                  if (c.concepto_contrato_id === concepto.id) {
                                    return {
                                      ...c,
                                      cantidad_esta_requisicion: cantidadAplicar,
                                      importe: cantidadAplicar * c.precio_unitario
                                    };
                                  }
                                  return c;
                                });
                                onConceptosChange(nuevos);
                              }}
                              onBlur={() => {
                                const current = cantidadesInput[concepto.id] ?? '';
                                if (current.startsWith('.') || current.startsWith(',')) {
                                  const fixed = '0' + current;
                                  setCantidadesInput(prev => ({ ...prev, [concepto.id]: fixed }));
                                }
                              }}
                              error={exceeds}
                              helperText={exceeds ? `Máximo: ${maxRemaining.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : ' '}
                              placeholder="0.00"
                              sx={{ 
                                width: 140, 
                                '& input': { 
                                  textAlign: 'right', 
                                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                                },
                                '& .Mui-disabled': {
                                  backgroundColor: '#f3f4f6',
                                  cursor: 'not-allowed'
                                }
                              }}
                            />
                          </Tooltip>
                        );
                      })()
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm text-right font-mono">
                    {isSelected ? (
                      <span className="font-semibold text-slate-700">
                        ${importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {conceptosSeleccionados.length > 0 && (
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td colSpan={11} className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
                  Total Monto Estimado:
                </td>
                <td className="px-3 py-3 text-right text-sm font-bold text-slate-700">
                  ${totales.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {conceptosContrato.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay conceptos en el catálogo del contrato
        </div>
      )}
    </div>
  );
};
