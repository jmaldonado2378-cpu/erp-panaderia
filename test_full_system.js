
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load Env
const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');
let KEY = '';
let URL = '';
lines.forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) URL = line.split('=')[1].trim();
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) KEY = line.split('=')[1].trim();
});

const supabase = createClient(URL, KEY);

async function runSystemTest() {
    console.log('🚀 INICIANDO TEST DE SISTEMA COMPLETO (Listos para Despegue)...');
    console.log('-------------------------------------------------------------');

    // 1. DATA MASTER CHECK
    console.log('1. [DATA] Verificando Insumos y Recetas...');
    const { data: levadura } = await supabase.from('dim_ingredientes').select('*').eq('nombre', 'Levadura Fresca').single();
    if (!levadura) throw new Error('❌ Levadura Fresca no encontrada. Ejecuta los seeders.');
    console.log(`   ✅ Insumo OK: ${levadura.nombre} (ID: ${levadura.id_ingrediente})`);

    const { data: receta } = await supabase.from('fact_bom_header').select('*').eq('nombre_producto', 'Baguette Clásica 500g').single();
    if (!receta) throw new Error('❌ Receta Baguette no encontrada.');
    console.log(`   ✅ Receta OK: ${receta.nombre_producto} (ID: ${receta.id_receta})`);


    // 2. INVENTORY SNAPSHOT (BEFORE)
    console.log('\n2. [STOCK] Tomando foto del stock inicial...');
    const { data: stockBefore } = await supabase.from('fact_inventory_lots')
        .select('*')
        .eq('id_ingrediente', levadura.id_ingrediente)
        .order('fecha_vencimiento', { ascending: true });

    const totalLevaduraBefore = stockBefore.reduce((sum, item) => sum + item.cantidad_actual, 0);
    console.log(`   📊 Stock Levadura Total: ${totalLevaduraBefore.toFixed(2)}g`);
    console.log(`   📅 Lote Prioritario (Vence ${stockBefore[0].fecha_vencimiento}): ${stockBefore[0].cantidad_actual.toFixed(2)}g`);


    // 3. CREATE ORDER
    console.log('\n3. [ORDEN] Creando Orden de Producción...');
    const CANTIDAD_ORDEN = 10;
    const { data: order, error: orderError } = await supabase.from('fact_production_orders')
        .insert({
            id_receta: receta.id_receta,
            cantidad_programada: CANTIDAD_ORDEN,
            estado: 'PLANEADA'
        })
        .select()
        .single();

    if (orderError) throw orderError;
    console.log(`   ✅ Orden Creada: #${order.nro_orden} (UUID: ${order.id_orden})`);


    // 4. EXECUTE FEFO (The Core Logic)
    console.log('\n4. [FEFO] Ejecutando Motor de Asignación...');
    // Recipe says 1.5% of flour. Flour is 1000g. So Levadura is 15g per unit.
    // 10 units = 150g needed.
    const NEEDED_AMOUNT = 150;
    console.log(`   🎯 Necesidad Calculada: ${NEEDED_AMOUNT}g de Levadura`);

    const { data: fefoResult, error: fefoError } = await supabase.rpc('allocate_stock_fefo', {
        p_id_orden: order.id_orden,
        p_id_ingrediente: levadura.id_ingrediente,
        p_cantidad_necesaria: NEEDED_AMOUNT
    });

    if (fefoError) throw fefoError;

    if (fefoResult.status === 'SUCCESS') {
        console.log(`   ✅ Resultado FEFO: ÉXITO`);
        console.log(`   📦 Lotes Asignados:`, JSON.stringify(fefoResult.allocations, null, 2));
    } else {
        console.error(`   ❌ Fallo FEFO:`, fefoResult);
        throw new Error('FEFO Logic Failed');
    }


    // 5. INVENTORY VERIFICATION (AFTER)
    console.log('\n5. [VERIFICACIÓN] confirmando descuento de stock real...');
    const { data: stockAfter } = await supabase.from('fact_inventory_lots')
        .select('*')
        .eq('id_ingrediente', levadura.id_ingrediente)
        .order('fecha_vencimiento', { ascending: true });

    const totalLevaduraAfter = stockAfter.reduce((sum, item) => sum + item.cantidad_actual, 0);
    console.log(`   📊 Stock Levadura Nuevo: ${totalLevaduraAfter.toFixed(2)}g`);

    const diff = totalLevaduraBefore - totalLevaduraAfter;
    if (Math.abs(diff - NEEDED_AMOUNT) < 0.01) {
        console.log(`   ✅ PRUEBA SUPERADA: Se descontaron exactamente ${diff.toFixed(2)}g`);
    } else {
        console.error(`   ❌ PRUEBA FALLIDA: Se descontaron ${diff.toFixed(2)}g, se esperaban ${NEEDED_AMOUNT}g`);
        throw new Error('Stock deduction mismatch');
    }

    console.log('\n-------------------------------------------------------------');
    console.log('🏆 TEST DE SISTEMA: PASSED');
    console.log('-------------------------------------------------------------');
}

runSystemTest().catch(err => {
    console.error('\n💥 CRITICAL TEST FAILURE:', err.message);
    process.exit(1);
});
