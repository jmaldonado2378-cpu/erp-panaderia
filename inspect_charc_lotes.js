const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');
let KEY = '';
let URL = '';
lines.forEach(line => {
    if (line.trim().startsWith('NEXT_PUBLIC_SUPABASE_URL=')) URL = line.split('=')[1].trim();
    if (line.trim().startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) KEY = line.split('=')[1].trim();
});

async function run() {
    try {
        const response = await fetch(`${URL}/rest/v1/charc_lotes_maduracion?select=*`, {
            headers: {
                'apikey': KEY,
                'Authorization': `Bearer ${KEY}`
            }
        });
        const lotes = await response.json();
        console.log("=== CHARC LOTES ===");
        console.log(JSON.stringify(lotes, null, 2));

        const responseRec = await fetch(`${URL}/rest/v1/charc_recetas?select=*`, {
            headers: {
                'apikey': KEY,
                'Authorization': `Bearer ${KEY}`
            }
        });
        const recetas = await responseRec.json();
        console.log("=== CHARC RECETAS ===");
        console.log(JSON.stringify(recetas, null, 2));

    } catch (e) {
        console.error("Error query:", e);
    }
}

run();
