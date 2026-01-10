// Script para corregir monto_pagado de solicitudes ya pagadas
// Ejecutar desde consola del navegador en la página de Elara

(async function corregirMontosPagados() {
  console.log('🔧 Iniciando corrección de montos pagados...');
  
  // Acceder a la base de datos de Dexie
  const db = window.db;
  
  if (!db) {
    console.error('❌ No se encontró la base de datos. Asegúrate de estar en la aplicación Elara.');
    return;
  }
  
  try {
    // Obtener todas las solicitudes con estatus PAGADO
    const solicitudesPagadas = await db.solicitudes_pago
      .where('estatus_pago')
      .equals('PAGADO')
      .toArray();
    
    console.log(`📋 Encontradas ${solicitudesPagadas.length} solicitudes pagadas`);
    
    let actualizadas = 0;
    let errores = 0;
    
    for (const solicitud of solicitudesPagadas) {
      try {
        const montoActual = solicitud.monto_pagado || 0;
        const montoTotal = solicitud.total || 0;
        
        // Solo actualizar si hay diferencia
        if (Math.abs(montoActual - montoTotal) > 0.01) {
          console.log(`\n📝 Solicitud ${solicitud.folio}:`);
          console.log(`   Monto pagado actual: $${montoActual.toFixed(2)}`);
          console.log(`   Monto total (correcto): $${montoTotal.toFixed(2)}`);
          console.log(`   Diferencia: $${(montoTotal - montoActual).toFixed(2)}`);
          
          // Actualizar el monto_pagado al total de la solicitud
          await db.solicitudes_pago.update(solicitud.id, {
            monto_pagado: montoTotal,
            _dirty: true
          });
          
          actualizadas++;
          console.log(`   ✅ Corregido`);
        }
      } catch (error) {
        console.error(`❌ Error actualizando solicitud ${solicitud.folio}:`, error);
        errores++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN:');
    console.log(`   Total solicitudes revisadas: ${solicitudesPagadas.length}`);
    console.log(`   Solicitudes actualizadas: ${actualizadas}`);
    console.log(`   Errores: ${errores}`);
    console.log('='.repeat(60));
    
    if (actualizadas > 0) {
      console.log('\n✅ Corrección completada. Recarga la página para ver los cambios.');
    } else {
      console.log('\n✅ No se encontraron solicitudes que necesiten corrección.');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
})();
