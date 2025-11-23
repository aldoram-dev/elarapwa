// TEST MANUAL: Filtrar contratos por contratista_id
// Copia este código en la consola del navegador cuando estés en la aplicación

const contratistaIdDelUsuario = 'd77b0cca-a764-4f7a-87e7-3f20039dfc6a';

console.log('🔍 Probando filtro de contratos para contratista:', contratistaIdDelUsuario);

// Obtener el cliente de Supabase desde el contexto global
const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
const supabaseUrl = 'https://pxynrbsrgphgvrmfomzz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4eW5yYnNyZ3BoZ3ZybWZvbXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3MDMxMjYsImV4cCI6MjA0NzI3OTEyNn0.xBqE9vHBcVxPz5xrKLZjK6Z0pW6wZ1Yv4z8K7Q9Z0Zc';

const supabase = createClient(supabaseUrl, supabaseKey);

// 1. Ver TODOS los contratos activos (sin filtro)
console.log('\n📋 PASO 1: Obtener TODOS los contratos activos');
const { data: todosContratos, error: error1 } = await supabase
  .from('contratos')
  .select('id, numero_contrato, descripcion, contratista_id, active')
  .eq('active', true)
  .order('created_at', { ascending: false });

console.log('Total de contratos activos:', todosContratos?.length);
console.table(todosContratos);

// 2. Ver contratos filtrados por contratista_id
console.log('\n🎯 PASO 2: Filtrar solo los del contratista:', contratistaIdDelUsuario);
const { data: contratosFiltrados, error: error2 } = await supabase
  .from('contratos')
  .select('id, numero_contrato, descripcion, contratista_id, active')
  .eq('active', true)
  .eq('contratista_id', contratistaIdDelUsuario)
  .order('created_at', { ascending: false });

console.log('Contratos del contratista:', contratosFiltrados?.length);
console.table(contratosFiltrados);

// 3. Verificar el usuario
console.log('\n👤 PASO 3: Verificar usuario luis torres');
const { data: usuario, error: error3 } = await supabase
  .from('usuarios')
  .select('id, nombre, email, contratista_id')
  .eq('email', 'lasingulargdl@gmail.com')
  .single();

console.log('Usuario:', usuario);
console.log('¿Coincide el contratista_id?', usuario?.contratista_id === contratistaIdDelUsuario);

// 4. Ver los contratistas
console.log('\n🏢 PASO 4: Ver contratistas disponibles');
const { data: contratistas, error: error4 } = await supabase
  .from('contratistas')
  .select('id, nombre, active')
  .eq('active', true);

console.table(contratistas);

console.log('\n✅ Prueba completada');
console.log('Si contratosFiltrados.length < todosContratos.length, el filtro funciona correctamente');
