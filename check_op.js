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
    console.log("Checking table 'ordenes_produccion'...");
    const { data, error } = await supabase.from('ordenes_produccion').select('*').limit(1);
    if (error) {
        console.error("Error fetching ordenes_produccion:", error);
    } else {
        console.log("ordenes_produccion columns:", data.length > 0 ? Object.keys(data[0]) : "No data in table");
    }
}

run();
