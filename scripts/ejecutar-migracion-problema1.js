/**
 * Script para ejecutar migraciones del Problema #1: Congelar Montos
 *
 * Este script ejecuta las migraciones SQL para agregar campos congelados
 * a las tablas requisiciones_pago y solicitudes_pago.
 *
 * Ejecutar con: npm run migrate:problema1
 * o: tsx scripts/ejecutar-migracion-problema1.ts
 */
import { supabase } from '../src/lib/core/supabaseClient';
import * as fs from 'fs';
import * as path from 'path';
async function ejecutarMigracion() {
    console.log('🚀 Iniciando migración: Problema #1 - Congelar Montos\n');
    try {
        // Leer archivos de migración
        const migracion1Path = path.join(__dirname, '../supabase/migrations/20240101000000_add_frozen_fields_requisiciones.sql');
        const migracion2Path = path.join(__dirname, '../supabase/migrations/20240101000001_add_frozen_fields_solicitudes.sql');
        console.log('📄 Leyendo archivos de migración...');
        const migracion1SQL = fs.readFileSync(migracion1Path, 'utf-8');
        const migracion2SQL = fs.readFileSync(migracion2Path, 'utf-8');
        // Ejecutar migración 1: requisiciones_pago
        console.log('\n📋 Ejecutando migración 1: requisiciones_pago');
        console.log('Agregando columnas:');
        console.log('  - amortizacion_porcentaje');
        console.log('  - amortizacion_base_contrato');
        console.log('  - amortizacion_metodo');
        console.log('  - retencion_ordinaria_porcentaje');
        console.log('  - tratamiento_iva');
        console.log('  - iva_porcentaje\n');
        const { error: error1 } = await supabase.rpc('exec_sql', { sql: migracion1SQL });
        if (error1) {
            console.error('❌ Error en migración 1:', error1);
            // Si falla porque las columnas ya existen, continuar
            if (error1.message?.includes('already exists') || error1.message?.includes('duplicate column')) {
                console.log('⚠️  Las columnas ya existen, continuando...');
            }
            else {
                throw error1;
            }
        }
        else {
            console.log('✅ Migración 1 completada exitosamente\n');
        }
        // Ejecutar migración 2: solicitudes_pago
        console.log('📋 Ejecutando migración 2: solicitudes_pago');
        console.log('Agregando columnas:');
        console.log('  - subtotal_calculo');
        console.log('  - amortizacion_porcentaje');
        console.log('  - amortizacion_aplicada');
        console.log('  - retencion_porcentaje');
        console.log('  - retencion_ordinaria_aplicada');
        console.log('  - retenciones_esp_aplicadas');
        console.log('  - retenciones_esp_regresadas');
        console.log('  - tratamiento_iva');
        console.log('  - iva_porcentaje');
        console.log('  - caratura_generada');
        console.log('  - caratura_bloqueada');
        console.log('  - fecha_bloqueo_caratura\n');
        const { error: error2 } = await supabase.rpc('exec_sql', { sql: migracion2SQL });
        if (error2) {
            console.error('❌ Error en migración 2:', error2);
            if (error2.message?.includes('already exists') || error2.message?.includes('duplicate column')) {
                console.log('⚠️  Las columnas ya existen, continuando...');
            }
            else {
                throw error2;
            }
        }
        else {
            console.log('✅ Migración 2 completada exitosamente\n');
        }
        // Verificar que las columnas se crearon
        console.log('🔍 Verificando columnas creadas...\n');
        const { data: requisiciones, error: errorReq } = await supabase
            .from('requisiciones_pago')
            .select('id, amortizacion_porcentaje, tratamiento_iva')
            .limit(1);
        const { data: solicitudes, error: errorSol } = await supabase
            .from('solicitudes_pago')
            .select('id, subtotal_calculo, caratura_bloqueada')
            .limit(1);
        if (errorReq || errorSol) {
            console.error('❌ Error al verificar columnas:', errorReq || errorSol);
        }
        else {
            console.log('✅ Verificación exitosa: Las columnas están disponibles');
            console.log('   - requisiciones_pago: amortizacion_porcentaje, tratamiento_iva');
            console.log('   - solicitudes_pago: subtotal_calculo, caratura_bloqueada\n');
        }
        console.log('🎉 ¡Migraciones completadas exitosamente!\n');
        console.log('📝 Próximos pasos:');
        console.log('   1. Verificar en Supabase Dashboard que las columnas existen');
        console.log('   2. Crear una requisición de prueba y verificar que guarda valores congelados');
        console.log('   3. Crear una solicitud desde esa requisición');
        console.log('   4. Cambiar precio de un concepto del contrato');
        console.log('   5. Verificar que la requisición/solicitud NO cambian sus montos\n');
    }
    catch (error) {
        console.error('❌ Error ejecutando migraciones:', error);
        console.error('\n💡 ALTERNATIVA: Ejecutar migraciones manualmente en Supabase Dashboard');
        console.error('   1. Ir a: https://app.supabase.com/project/_/sql');
        console.error('   2. Copiar contenido de: supabase/migrations/20240101000000_add_frozen_fields_requisiciones.sql');
        console.error('   3. Ejecutar SQL');
        console.error('   4. Copiar contenido de: supabase/migrations/20240101000001_add_frozen_fields_solicitudes.sql');
        console.error('   5. Ejecutar SQL\n');
        process.exit(1);
    }
}
// Ejecutar migración
ejecutarMigracion();
