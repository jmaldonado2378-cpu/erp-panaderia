const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load Env
const envFile = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8');
const lines = envFile.split('\n');
let KEY = '';
let URL = '';

lines.forEach(line => {
    if (line.trim().startsWith('NEXT_PUBLIC_SUPABASE_URL=')) URL = line.split('=')[1].trim();
    if (line.trim().startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) KEY = line.split('=')[1].trim();
});

const supabase = createClient(URL, KEY);

async function test() {
    try {
        console.log('Testing connection to:', URL);
        const tables = [
            'clientes', 'proveedores', 'ingredientes', 'recetas', 'receta_ingredientes',
            'ordenes_produccion', 'lotes_pt', 'pedidos', 'pedido_items', 'lotes_insumos',
            'deudas_proveedor', 'deudas_cliente', 'charc_recetas', 'charc_lotes_maduracion',
            'charc_maduracion_log', 'fracc_tareas', 'reventa_articulos', 'reventa_lotes'
        ];
        for (const table of tables) {
            const { error: tblError } = await supabase.from(table).select('*').limit(1);
            if (tblError) {
                console.log(`❌ Table/View '${table}' DOES NOT exist or error:`, tblError.message);
            } else {
                console.log(`✅ Table/View '${table}' EXISTS`);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error('EXCEPTION:', err);
        process.exit(1);
    }
}

test();
