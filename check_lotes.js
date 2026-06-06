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

        const responseRec = await fetch(`${URL}/rest/v1/charc_recetas?select=*`, {
            headers: {
                'apikey': KEY,
                'Authorization': `Bearer ${KEY}`
            }
        });
        const recetas = await responseRec.json();

        console.log(`Loaded ${lotes.length} lotes and ${recetas.length} recetas.`);

        lotes.forEach((l, idx) => {
            const rec = recetas.find(r => r.id === l.receta_id);
            if (!rec) {
                console.log(`LOTE ${idx}: code=${l.codigo_lote} has NO recipe (receta_id=${l.receta_id})`);
            }
            if (l.peso_inicial_g == null || l.peso_inicial_g === 0) {
                console.log(`LOTE ${idx}: code=${l.codigo_lote} has invalid peso_inicial_g=${l.peso_inicial_g}`);
            }
            if (l.peso_actual_g == null) {
                console.log(`LOTE ${idx}: code=${l.codigo_lote} has null peso_actual_g`);
            }
            if (!l.fecha_ingreso) {
                console.log(`LOTE ${idx}: code=${l.codigo_lote} has null/empty fecha_ingreso`);
            }
            if (!l.estado) {
                console.log(`LOTE ${idx}: code=${l.codigo_lote} has null/empty estado`);
            }
        });

    } catch (e) {
        console.error("Error diagnostics:", e);
    }
}

run();
