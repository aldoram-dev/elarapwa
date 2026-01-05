// Script para corregir valores de subtotal/iva/total en IndexedDB
// Ejecutar en consola del navegador (F12)

async function corregirValoresFinancieros() {
  console.log('🔧 Iniciando corrección de valores financieros...');
  
  const { db } = await import('/src/db/database');
  
  let requisicionesCorregidas = 0;
  let solicitudesCorregidas = 0;
  
  // 1. Corregir requisiciones_pago
  console.log('📋 Corrigiendo requisiciones...');
  const requisiciones = await db.requisiciones_pago.toArray();
  
  for (const req of requisiciones) {
    const subtotal = req.subtotal || 0;
    const iva = req.iva || 0;
    const total = req.total || 0;
    const diferencia = Math.abs(total - (subtotal + iva));
    
    if (diferencia >= 0.05) {
      console.log(`  ⚠️ Requisición ${req.numero} tiene diferencia de ${diferencia.toFixed(4)}`);
      
      // Recalcular desde el principio
      const montoEstimado = req.monto_estimado || 0;
      const amortizacion = req.amortizacion || 0;
      const retencion = req.retencion || 0;
      const otrosDescuentos = req.otros_descuentos || 0;
      const llevaIva = req.lleva_iva || false;
      
      const subtotalNuevo = parseFloat((montoEstimado - amortizacion - retencion - otrosDescuentos).toFixed(2));
      const ivaNuevo = parseFloat((llevaIva ? subtotalNuevo * 0.16 : 0).toFixed(2));
      const totalNuevo = parseFloat((subtotalNuevo + ivaNuevo).toFixed(2));
      
      console.log(`    Valores anteriores: subtotal=${subtotal}, iva=${iva}, total=${total}`);
      console.log(`    Valores nuevos: subtotal=${subtotalNuevo}, iva=${ivaNuevo}, total=${totalNuevo}`);
      
      await db.requisiciones_pago.update(req.id, {
        subtotal: subtotalNuevo,
        iva: ivaNuevo,
        total: totalNuevo,
        _dirty: true
      });
      
      requisicionesCorregidas++;
    }
  }
  
  // 2. Corregir solicitudes_pago
  console.log('📋 Corrigiendo solicitudes...');
  const solicitudes = await db.solicitudes_pago.toArray();
  
  for (const sol of solicitudes) {
    const subtotal = sol.subtotal || 0;
    const iva = sol.iva || 0;
    const total = sol.total || 0;
    const diferencia = Math.abs(total - (subtotal + iva));
    
    if (diferencia >= 0.05) {
      console.log(`  ⚠️ Solicitud ${sol.folio} tiene diferencia de ${diferencia.toFixed(4)}`);
      
      const totalNuevo = parseFloat((subtotal + iva).toFixed(2));
      
      console.log(`    Valores anteriores: subtotal=${subtotal}, iva=${iva}, total=${total}`);
      console.log(`    Valor nuevo total: ${totalNuevo}`);
      
      await db.solicitudes_pago.update(sol.id, {
        total: totalNuevo,
        _dirty: true
      });
      
      solicitudesCorregidas++;
    }
  }
  
  console.log(`\n✅ Corrección completada:`);
  console.log(`   - Requisiciones corregidas: ${requisicionesCorregidas}`);
  console.log(`   - Solicitudes corregidas: ${solicitudesCorregidas}`);
  console.log(`\n💡 Ahora intenta sincronizar de nuevo`);
}

// Ejecutar
corregirValoresFinancieros();
