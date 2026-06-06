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
    const { data, error } = await supabase.from('ingredientes').select('id, name, codigo, tipo, familia');
    if (error) {
        console.error("Error fetching ingredients:", error);
    } else {
        console.log("Ingredients:", JSON.stringify(data, null, 2));
    }
}

inspect();
