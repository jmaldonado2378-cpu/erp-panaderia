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

async function inspect() {
    console.log("Checking table 'ingredientes':");
    const { data: dataIng, error: errorIng } = await supabase.from('ingredientes').select('*').limit(1);
    console.log("Error ingredientes:", errorIng);
    console.log("Data ingredientes sample:", dataIng);

    console.log("\nChecking table 'dim_ingredientes':");
    const { data: dataDim, error: errorDim } = await supabase.from('dim_ingredientes').select('*').limit(1);
    console.log("Error dim_ingredientes:", errorDim);
    console.log("Data dim_ingredientes sample:", dataDim);
}

inspect();
