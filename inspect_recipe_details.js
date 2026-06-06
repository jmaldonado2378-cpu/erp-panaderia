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
    const { data: recipes, error: err } = await supabase.from('charc_recetas').select('*').limit(1);
    if (err || !recipes || recipes.length === 0) {
        console.error("Error/no recipes:", err);
        return;
    }
    const recipe = recipes[0];
    console.log("Recipe:", recipe);

    const { data: details, error: errDet } = await supabase
        .from('charc_receta_ingredientes')
        .select('*, ingredientes(*)')
        .eq('receta_id', recipe.id);
    console.log("Details for recipe:", recipe.nombre);
    console.log(JSON.stringify(details, null, 2));
}

run();
