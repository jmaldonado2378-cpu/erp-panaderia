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
        console.log("Fetching charc_receta_ingredientes...");
        const response = await fetch(`${URL}/rest/v1/charc_receta_ingredientes?select=*`, {
            headers: {
                'apikey': KEY,
                'Authorization': `Bearer ${KEY}`
            }
        });
        const details = await response.json();
        console.log(`Loaded ${details.length} recipe ingredients.`);

        let nullCount = 0;
        details.forEach((d, idx) => {
            if (d.categoria_tecnologica === undefined || d.categoria_tecnologica === null) {
                console.log(`Row ${idx}: id=${d.id} has NULL/UNDEFINED categoria_tecnologica!`);
                nullCount++;
            } else if (typeof d.categoria_tecnologica !== 'string') {
                console.log(`Row ${idx}: id=${d.id} has non-string categoria_tecnologica: type=${typeof d.categoria_tecnologica}`);
                nullCount++;
            }
        });

        if (nullCount === 0) {
            console.log("All rows have a valid string for categoria_tecnologica!");
        } else {
            console.log(`Found ${nullCount} invalid rows!`);
        }
    } catch (e) {
        console.error("Error checking ingredients categories:", e);
    }
}

run();
