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

async function dumpCharcRecetas() {
    const { data, error } = await supabase.from('charc_recetas').select('*').order('codigo');
    if (error) {
        console.error("Error fetching charc_recetas:", error);
    } else {
        console.log("Recipes in DB count:", data.length);
        data.forEach(r => {
            console.log(`- Code: "${r.codigo}", Name: "${r.nombre}", Family: "${r.familia_tecnologica}"`);
        });
    }
}

dumpCharcRecetas();
