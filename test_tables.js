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

async function listTables() {
    // We can run a select on a table that is known to exist or use supabase client to inspect
    // Since we don't have SQL execution access via client easily, we can query postgres tables using a rpc or similar if available, 
    // or try querying common tables.
    // Let's try querying standard tables to see if they fail or succeed.
    const tables = ['ingredientes', 'recetas', 'receta_ingredientes', 'proveedores', 'clientes', 'charc_recetas', 'charc_receta_ingredientes'];
    for (const t of tables) {
        const { error } = await supabase.from(t).select('count', { count: 'exact', head: true });
        if (error) {
            console.log(`❌ Table '${t}' error:`, error.message);
        } else {
            console.log(`✅ Table '${t}' exists!`);
        }
    }
}

listTables();
