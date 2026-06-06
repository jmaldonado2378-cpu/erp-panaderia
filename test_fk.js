const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');
let KEY = '';
let URL = '';
lines.forEach(line => {
    if (line.trim().startsWith('NEXT_PUBLIC_SUPABASE_URL=')) URL = line.split('=')[1].trim();
    if (line.trim().startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) KEY = line.split('=')[1].trim();
});

const supabase = createClient(URL, KEY);

async function run() {
    console.log("Testing insert with NULL receta_id in 'ordenes_produccion'...");
    const { data, error } = await supabase
        .from('ordenes_produccion')
        .insert([{
            codigo_orden: 'OP-TEST-NULL',
            receta_id: null,
            cantidad_objetivo: 1,
            estado: 'PLANIFICADA',
            fecha: new Date().toISOString().split('T')[0],
            observaciones: 'TEST_NULL_RECETA'
        }])
        .select();
    if (error) {
        console.error("Insert failed:", error.message, error.code);
    } else {
        console.log("Insert succeeded!", data);
        // Clean up
        await supabase.from('ordenes_produccion').delete().eq('id', data[0].id);
    }
}

run();
