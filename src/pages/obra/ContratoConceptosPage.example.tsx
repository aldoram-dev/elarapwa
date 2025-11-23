/**
 * EJEMPLO DE PÁGINA PADRE
 * Muestra cómo integrar ConceptosContratoTable con persistencia a backend/estado
 */

import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Paper, CircularProgress } from '@mui/material';
import ConceptosContratoTable from '@/components/obra/ConceptosContratoTable';
import { ConceptoContrato } from '@/types/concepto-contrato';
// import { database } from '@/db/database'; // Tu instancia Dexie
// import { supabase } from '@/lib/core/supabase'; // O tu backend

interface ContratoConceptosPageProps {
  contratoId: string;
}

export default function ContratoConceptosPage({ contratoId }: ContratoConceptosPageProps) {
  const [conceptos, setConceptos] = useState<ConceptoContrato[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar conceptos al montar
  useEffect(() => {
    loadConceptos();
  }, [contratoId]);

  const loadConceptos = async () => {
    try {
      setLoading(true);
      
      // OPCIÓN A: Desde IndexedDB local (Dexie)
      // const data = await database.conceptos_contrato
      //   .where('contrato_id')
      //   .equals(contratoId)
      //   .toArray();
      
      // OPCIÓN B: Desde Supabase
      // const { data, error } = await supabase
      //   .from('conceptos_contrato')
      //   .select('*')
      //   .eq('contrato_id', contratoId)
      //   .order('partida', { ascending: true });
      // if (error) throw error;
      
      // Simulación de datos (reemplazar con código real)
      const data: ConceptoContrato[] = [
        {
          id: '1',
          contrato_id: contratoId,
          partida: '01',
          subpartida: '01',
          actividad: '001',
          clave: '01-01-001',
          concepto: 'Excavación',
          unidad: 'm³',
          cantidad_catalogo: 100,
          precio_unitario_catalogo: 250.00,
          importe_catalogo: 25000.00,
          cantidad_estimada: 80,
          precio_unitario_estimacion: 250.00,
          importe_estimado: 20000.00,
          volumen_estimado_fecha: 50,
          monto_estimado_fecha: 12500.00,
          notas: null,
          orden: 1,
          active: true,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      
      setConceptos(data);
    } catch (error) {
      console.error('Error cargando conceptos:', error);
      alert('Error al cargar catálogo de conceptos');
    } finally {
      setLoading(false);
    }
  };

  // Agregar concepto individual
  const handleAddConcepto = async (concepto: Partial<ConceptoContrato>) => {
    try {
      // OPCIÓN A: Guardar en IndexedDB
      // const id = await database.conceptos_contrato.add({
      //   ...concepto,
      //   created_at: new Date().toISOString(),
      // } as ConceptoContrato);
      
      // OPCIÓN B: Guardar en Supabase
      // const { data, error } = await supabase
      //   .from('conceptos_contrato')
      //   .insert([concepto])
      //   .select()
      //   .single();
      // if (error) throw error;
      
      // Simulación
      const newConcepto: ConceptoContrato = {
        id: Date.now().toString(),
        ...concepto,
        created_at: new Date().toISOString(),
      } as ConceptoContrato;
      
      setConceptos(prev => [...prev, newConcepto]);
      console.log('Concepto agregado:', newConcepto);
    } catch (error) {
      console.error('Error agregando concepto:', error);
      alert('Error al agregar concepto');
    }
  };

  // Actualizar concepto
  const handleUpdateConcepto = async (id: string, updates: Partial<ConceptoContrato>) => {
    try {
      // OPCIÓN A: Actualizar en IndexedDB
      // await database.conceptos_contrato.update(id, updates);
      
      // OPCIÓN B: Actualizar en Supabase
      // const { error } = await supabase
      //   .from('conceptos_contrato')
      //   .update(updates)
      //   .eq('id', id);
      // if (error) throw error;
      
      // Simulación
      setConceptos(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      console.log('Concepto actualizado:', id, updates);
    } catch (error) {
      console.error('Error actualizando concepto:', error);
      alert('Error al actualizar concepto');
    }
  };

  // Eliminar concepto
  const handleDeleteConcepto = async (id: string) => {
    try {
      // OPCIÓN A: Eliminar de IndexedDB
      // await database.conceptos_contrato.delete(id);
      
      // OPCIÓN B: Eliminar de Supabase
      // const { error } = await supabase
      //   .from('conceptos_contrato')
      //   .delete()
      //   .eq('id', id);
      // if (error) throw error;
      
      // Simulación
      setConceptos(prev => prev.filter(c => c.id !== id));
      console.log('Concepto eliminado:', id);
    } catch (error) {
      console.error('Error eliminando concepto:', error);
      alert('Error al eliminar concepto');
    }
  };

  // REEMPLAZAR CATÁLOGO COMPLETO (import bulk)
  const handleReplaceCatalog = async (importedConceptos: Partial<ConceptoContrato>[]) => {
    try {
      // ESTRATEGIA: Realizar merge transaccional
      // 1. Identificar existentes por CLAVE
      // 2. Actualizar existentes con nuevos datos
      // 3. Insertar nuevos
      // 4. Opcionalmente eliminar los que no están en el import
      
      const existingMap = new Map<string, ConceptoContrato>();
      conceptos.forEach(c => {
        if (c.clave) existingMap.set(c.clave, c);
      });
      
      const toUpdate: ConceptoContrato[] = [];
      const toInsert: Partial<ConceptoContrato>[] = [];
      
      importedConceptos.forEach(imp => {
        const clave = imp.clave || '';
        if (existingMap.has(clave)) {
          // Actualizar existente
          const existing = existingMap.get(clave)!;
          toUpdate.push({
            ...existing,
            ...imp,
            id: existing.id,
          });
          existingMap.delete(clave);
        } else {
          // Nuevo
          toInsert.push(imp);
        }
      });
      
      // Mantener los que no estaban en el import (opcional: si quieres eliminarlos, omite esto)
      const toKeep = Array.from(existingMap.values());
      
      // OPCIÓN A: Persistir en IndexedDB
      // await database.transaction('rw', database.conceptos_contrato, async () => {
      //   // Actualizar
      //   for (const c of toUpdate) {
      //     await database.conceptos_contrato.put(c);
      //   }
      //   // Insertar nuevos
      //   for (const c of toInsert) {
      //     await database.conceptos_contrato.add({
      //       ...c,
      //       id: undefined,
      //       created_at: new Date().toISOString(),
      //     } as ConceptoContrato);
      //   }
      // });
      
      // OPCIÓN B: Persistir en Supabase (bulk upsert)
      // const allRecords = [...toUpdate, ...toInsert.map(c => ({
      //   ...c,
      //   created_at: new Date().toISOString(),
      // }))];
      // const { error } = await supabase
      //   .from('conceptos_contrato')
      //   .upsert(allRecords, { onConflict: 'clave' });
      // if (error) throw error;
      
      // Simulación: actualizar estado local
      const newInserts = toInsert.map((c, idx) => ({
        id: `new-${Date.now()}-${idx}`,
        ...c,
        created_at: new Date().toISOString(),
      } as ConceptoContrato));
      
      setConceptos([...toUpdate, ...newInserts, ...toKeep]);
      console.log(`Catálogo reemplazado: ${toUpdate.length} actualizados, ${newInserts.length} nuevos, ${toKeep.length} conservados`);
    } catch (error) {
      console.error('Error reemplazando catálogo:', error);
      alert('Error al importar catálogo');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Catálogo de Conceptos - Contrato {contratoId}
        </Typography>
        
        <Box sx={{ mt: 3 }}>
          <ConceptosContratoTable
            contratoId={contratoId}
            conceptos={conceptos}
            onAdd={handleAddConcepto}
            onUpdate={handleUpdateConcepto}
            onDelete={handleDeleteConcepto}
            onReplaceCatalog={handleReplaceCatalog}
            readOnly={false}
          />
        </Box>
      </Paper>
    </Container>
  );
}
