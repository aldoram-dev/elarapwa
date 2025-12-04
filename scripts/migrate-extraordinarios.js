// Script de migración temporal para marcar conceptos extraordinarios
// Ejecutar en la consola del navegador cuando estés en la app

(async function migrateExtraordinarios() {
  try {
    // Importar db
    const { db } = await import('/src/db/database');
    
    console.log('🔧 Iniciando migración de conceptos extraordinarios...');
    
    // Obtener TODOS los conceptos
    const allConceptos = await db.conceptos_contrato.toArray();
    
    console.log(`📦 Total conceptos encontrados: ${allConceptos.length}`);
    
    // Agrupar por contrato
    const porContrato = new Map();
    allConceptos.forEach(c => {
      if (!porContrato.has(c.contrato_id)) {
        porContrato.set(c.contrato_id, []);
      }
      porContrato.get(c.contrato_id).push(c);
    });
    
    console.log(`📋 Contratos encontrados: ${porContrato.size}`);
    
    let actualizados = 0;
    
    // Por cada contrato, identificar extraordinarios
    for (const [contratoId, conceptos] of porContrato) {
      console.log(`\n🔍 Procesando contrato: ${contratoId}`);
      console.log(`   Conceptos: ${conceptos.length}`);
      
      // Conceptos sin metadata o con metadata.tipo undefined son candidatos
      const sinTipo = conceptos.filter(c => !c.metadata || !c.metadata.tipo);
      
      if (sinTipo.length > 0) {
        console.log(`   ⚠️ Conceptos sin tipo: ${sinTipo.length}`);
        
        // Preguntar qué hacer
        const respuesta = prompt(
          `Contrato ${contratoId.slice(0, 8)}...\n\n` +
          `Encontrados ${sinTipo.length} conceptos sin tipo.\n\n` +
          `Opciones:\n` +
          `1 = Marcar TODOS como ordinario\n` +
          `2 = Marcar TODOS como extraordinario\n` +
          `3 = Saltar este contrato\n\n` +
          `Ingresa tu opción (1, 2 o 3):`
        );
        
        if (respuesta === '1') {
          // Marcar como ordinario
          for (const c of sinTipo) {
            await db.conceptos_contrato.update(c.id, {
              metadata: { ...c.metadata, tipo: 'ordinario' },
              _dirty: true
            });
            actualizados++;
          }
          console.log(`   ✅ ${sinTipo.length} conceptos marcados como ordinario`);
        } else if (respuesta === '2') {
          // Marcar como extraordinario
          for (const c of sinTipo) {
            await db.conceptos_contrato.update(c.id, {
              metadata: { ...c.metadata, tipo: 'extraordinario' },
              _dirty: true
            });
            actualizados++;
          }
          console.log(`   ✅ ${sinTipo.length} conceptos marcados como extraordinario`);
        } else {
          console.log(`   ⏭️ Contrato saltado`);
        }
      }
    }
    
    console.log(`\n✅ Migración completada: ${actualizados} conceptos actualizados`);
    
    if (actualizados > 0) {
      alert(`✅ Migración completada\n\n${actualizados} conceptos actualizados.\n\nRecarga la página para ver los cambios.`);
    } else {
      alert('✅ Migración completada\n\nNo se encontraron conceptos sin tipo.');
    }
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
    alert(`❌ Error: ${error.message}`);
  }
})();
