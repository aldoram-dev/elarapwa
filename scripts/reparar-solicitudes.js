/**
 * HERRAMIENTA DE REPARACIÓN - Solicitudes con proyecto_id vacío
 * 
 * Ejecuta esto en la consola del navegador para:
 * 1. Encontrar solicitudes con proyecto_id vacío
 * 2. Intentar repararlas desde sus requisiciones
 * 3. Eliminar las que no se puedan reparar
 * 
 * USO:
 * 1. Abre DevTools (F12)
 * 2. Copia y pega este código completo
 * 3. Presiona Enter
 */

(async function repararSolicitudesCorruptas() {
  console.log('🔧 Iniciando reparación de solicitudes...');
  
  // Importar Dexie
  const { db } = await import('./src/db/database');
  
  // Buscar solicitudes con proyecto_id vacío o inválido
  const todasSolicitudes = await db.solicitudes_pago.toArray();
  const isUUID = (v) => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
  
  const solicitudesCorruptas = todasSolicitudes.filter(s => !isUUID(s.proyecto_id));
  
  console.log(`📊 Encontradas ${solicitudesCorruptas.length} solicitudes con proyecto_id inválido`);
  
  if (solicitudesCorruptas.length === 0) {
    console.log('✅ No hay solicitudes corruptas');
    return;
  }
  
  let reparadas = 0;
  let eliminadas = 0;
  
  for (const solicitud of solicitudesCorruptas) {
    console.log(`\n🔍 Procesando ${solicitud.folio}...`);
    
    // Buscar requisición asociada
    const requisicion = await db.requisiciones_pago.get(solicitud.requisicion_id);
    
    if (requisicion?.proyecto_id && isUUID(requisicion.proyecto_id)) {
      // REPARAR: copiar proyecto_id de la requisición
      console.log(`  ✅ Reparando con proyecto_id: ${requisicion.proyecto_id}`);
      await db.solicitudes_pago.update(solicitud.id, {
        proyecto_id: requisicion.proyecto_id,
        _dirty: true,
        updated_at: new Date().toISOString()
      });
      reparadas++;
    } else {
      // ELIMINAR: no se puede reparar
      console.log(`  ❌ No se puede reparar, eliminando...`);
      await db.solicitudes_pago.delete(solicitud.id);
      eliminadas++;
    }
  }
  
  console.log('\n🎉 Reparación completada:');
  console.log(`  ✅ Reparadas: ${reparadas}`);
  console.log(`  ❌ Eliminadas: ${eliminadas}`);
  console.log('\n🔄 Recarga la página para ver los cambios');
})();
