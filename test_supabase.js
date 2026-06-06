const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load Env
const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');
let KEY = '';
let URL = '';
lines.forEach(line => {
    if (line.trim().startsWith('NEXT_PUBLIC_SUPABASE_URL=')) URL = line.split('=')[1].trim();
    if (line.trim().startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) KEY = line.split('=')[1].trim();
});

const supabase = createClient(URL, KEY);

async function test() {
    console.log("Checking tables...");
    const { data: ingredients, error: err1 } = await supabase.from('ingredientes').select('id, name, codigo').limit(5);
    if (err1) {
        console.error("Error fetching 'ingredientes':", err1);
    } else {
        console.log("Found ingredients:", ingredients.length, ingredients);
    }

    const { data: dim_ingredientes, error: err2 } = await supabase.from('dim_ingredientes').select('id_ingrediente, nombre').limit(5);
    if (err2) {
        console.error("Error fetching 'dim_ingredientes':", err2);
    } else {
        console.log("Found dim_ingredientes:", dim_ingredientes.length, dim_ingredientes);
    }

    const { data: charc_recetas, error: err3 } = await supabase.from('charc_recetas').select('id, codigo, nombre').limit(5);
    if (err3) {
        console.error("Error fetching 'charc_recetas':", err3);
    } else {
        console.log("Found charc_recetas:", charc_recetas.length, charc_recetas);
    }
}

test();
