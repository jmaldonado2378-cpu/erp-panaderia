const fs = require('fs');

const eng = fs.readFileSync('c:/Users/Usuario/Documents/Sistema Panaderias/frontend/components/views/EngineeringView.jsx', 'utf8');
const lines = eng.split('\n');
lines.forEach((line, i) => {
    if (line.includes('BulkImportModal') || line.includes('showBulkImport') || line.includes('bulk')) {
        console.log(`EngineeringView.jsx Line ${i+1}: ${line.trim()}`);
    }
});

const charc = fs.readFileSync('c:/Users/Usuario/Documents/Sistema Panaderias/frontend/components/views/CharcuteriaView.jsx', 'utf8');
const charcLines = charc.split('\n');
charcLines.forEach((line, i) => {
    if (line.includes('BulkImportModal') || line.includes('showBulkImport') || line.includes('bulk')) {
        console.log(`CharcuteriaView.jsx Line ${i+1}: ${line.trim()}`);
    }
});
