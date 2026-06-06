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

async function checkIngredients() {
    const list = [
        "Carne de Vaca 1",
        "Tocino en cubos",
        "Pimienta negra molida",
        "Carne de Cerdo 1"
    ];
    
    for (const name of list) {
        const { data, error } = await supabase.from('ingredientes').select('id, name, codigo').ilike('name', name);
        if (error) {
            console.error(`Error querying ${name}:`, error);
        } else {
            console.log(`Query ${name}:`, data);
        }
    }
}

checkIngredients();
