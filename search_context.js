const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/context/GlobalContext.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const patterns = ['charc_recetas', 'fracc_tareas', 'addCharcReceta', 'updateCharcReceta', 'ordenes_produccion'];
patterns.forEach(pat => {
    console.log(`=== Matches for "${pat}" ===`);
    lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(pat.toLowerCase())) {
            if (line.length < 120) {
                console.log(`${idx + 1}: ${line.trim()}`);
            } else {
                console.log(`${idx + 1}: ${line.trim().substring(0, 120)}...`);
            }
        }
    });
});
