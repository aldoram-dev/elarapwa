/**
 * Script de migración para corregir amortizaciones de requisiciones
 * 
 * Problema: Las amortizaciones no se calculaban correctamente.
 * 
 * Solución: Recalcular todas las amortizaciones aplicando simplemente:
 * Amortización = Monto Estimado × (% Anticipo del Contrato)
 * 
 * NO se topa al saldo disponible del anticipo.
 */

import { supabase } from '@/lib/core/supabaseClient';

interface RequisicionParaMigrar {
  id: string;
  numero: string;
  contrato_id: string;
  fecha: string;
  monto_estimado: number;
  amortizacion: number; // Valor actual (posiblemente incorrecto)
  amortizacion_nueva?: number; // Valor recalculado
}

interface ContratoInfo {
  id: string;
  monto_contrato: number;
  anticipo_monto: number;
}

export async function migrarAmortizaciones() {
  console.log('🔄 Iniciando migración de amortizaciones...\n');

  try {
    // 1. Obtener todos los contratos con anticipo
    const { data: contratos, error: errorContratos } = await supabase
      .from('contratos')
      .select('id, monto_contrato, anticipo_monto')
      .not('anticipo_monto', 'is', null)
      .gt('anticipo_monto', 0);

    if (errorContratos) throw errorContratos;
    if (!contratos || contratos.length === 0) {
      console.log('✅ No hay contratos con anticipo');
      return { success: true, actualizadas: 0 };
    }

    console.log(`📋 Contratos con anticipo: ${contratos.length}\n`);

    let totalActualizadas = 0;
    const cambios: Array<{
      requisicion: string;
      contrato: string;
      montoAnterior: number;
      montoNuevo: number;
      diferencia: number;
    }> = [];

    // 2. Procesar cada contrato
    for (const contrato of contratos) {
      console.log(`\n📄 Procesando contrato ID: ${contrato.id}`);
      console.log(`   Anticipo: $${contrato.anticipo_monto.toLocaleString('es-MX')}`);
      console.log(`   Monto total: $${contrato.monto_contrato.toLocaleString('es-MX')}`);

      // Calcular porcentaje de anticipo
      const porcentajeAnticipo = (contrato.anticipo_monto / contrato.monto_contrato) * 100;
      console.log(`   Porcentaje: ${porcentajeAnticipo.toFixed(2)}%`);

      // 3. Obtener requisiciones del contrato ordenadas por fecha
      const { data: requisiciones, error: errorReqs } = await supabase
        .from('requisiciones_pago')
        .select('*')
        .eq('contrato_id', contrato.id)
        .order('fecha', { ascending: true });

      if (errorReqs) throw errorReqs;
      if (!requisiciones || requisiciones.length === 0) {
        console.log('   ℹ️  No hay requisiciones para este contrato');
        continue;
      }

      console.log(`   📝 Requisiciones: ${requisiciones.length}`);

      // 4. Recalcular amortizaciones - SOLO aplicar porcentaje, SIN topar
      for (const req of requisiciones) {
        const montoAnterior = req.amortizacion || 0;
        
        // Calcular amortización: simplemente el porcentaje sobre monto estimado
        const montoNuevo = req.monto_estimado * (porcentajeAnticipo / 100);
        
        // Calcular diferencia
        const diferencia = Math.abs(montoNuevo - montoAnterior);
        
        console.log(`   📝 REQ-${req.numero}:`);
        console.log(`      Monto estimado: $${req.monto_estimado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
        console.log(`      Porcentaje anticipo: ${porcentajeAnticipo.toFixed(2)}%`);
        console.log(`      Amortización anterior: $${montoAnterior.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
        console.log(`      Amortización nueva: $${montoNuevo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
        
        if (diferencia > 0.01) { // Tolerancia de 1 centavo
          console.log(`      🔧 REQUIERE ACTUALIZACIÓN - Diferencia: $${(montoNuevo - montoAnterior).toLocaleString('es-MX', { minimumFractionDigits: 2, signDisplay: 'always' })}`);

          // Actualizar en Supabase
          const nuevoTotal = req.monto_estimado - montoNuevo - (req.retencion || 0) - (req.otros_descuentos || 0);
          
          const { error: errorUpdate } = await supabase
            .from('requisiciones_pago')
            .update({ 
              amortizacion: Math.round(montoNuevo * 100) / 100, // Redondear a 2 decimales
              total: Math.round(nuevoTotal * 100) / 100
            })
            .eq('id', req.id);

          if (errorUpdate) {
            console.error(`      ❌ Error actualizando: ${errorUpdate.message}`);
          } else {
            console.log(`      ✅ Actualizada exitosamente`);
            totalActualizadas++;
            cambios.push({
              requisicion: req.numero,
              contrato: contrato.id,
              montoAnterior,
              montoNuevo,
              diferencia: montoNuevo - montoAnterior
            });
          }
        } else {
          console.log(`      ✓ Ya está correcta`);
        }
        console.log('');
      }
    }

    // 5. Reporte final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`Requisiciones actualizadas: ${totalActualizadas}`);
    
    if (cambios.length > 0) {
      console.log('\n📋 Detalle de cambios:');
      cambios.forEach(c => {
        console.log(`  • REQ-${c.requisicion}: ${c.diferencia >= 0 ? '+' : ''}$${c.diferencia.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
      });
    }

    console.log('\n✅ Migración completada exitosamente');
    
    return { 
      success: true, 
      actualizadas: totalActualizadas,
      cambios 
    };

  } catch (error) {
    console.error('❌ Error en migración:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

// Función auxiliar para ejecutar desde consola del navegador
export async function corregirAmortizaciones() {
  console.log('⚠️  IMPORTANTE: Esta operación modificará datos en la base de datos.');
  console.log('⚠️  Asegúrate de tener un respaldo antes de continuar.\n');
  
  const resultado = await migrarAmortizaciones();
  
  if (resultado.success) {
    console.log('\n✅ Proceso completado.');
    console.log(`   ${resultado.actualizadas} requisiciones fueron actualizadas.`);
  } else {
    console.log('\n❌ Proceso falló:', resultado.error);
  }
  
  return resultado;
}

// Para uso en modo desarrollo
if (import.meta.env.DEV) {
  (window as any).corregirAmortizaciones = corregirAmortizaciones;
  console.log('💡 Tip: Puedes ejecutar corregirAmortizaciones() en la consola del navegador');
}
