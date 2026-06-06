const fs = require('fs');

// Copy of normalizeHeader
const normalizeHeader = (h) => {
    if (!h) return '';
    return h.toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9_]/g, "") // remove non-alphanumeric, keep underscore
        .replace(/_/g, ""); // remove underscores
};

// Copy of parseCSVOrTSV
const parseCSVOrTSV = (text) => {
    let delimiter = ',';
    const firstLine = text.split('\n')[0] || '';
    if (firstLine.includes('\t')) {
        delimiter = '\t';
    } else if (firstLine.includes(';')) {
        delimiter = ';';
    }

    const rows = [];
    let currentRow = [];
    let insideQuotes = false;
    let currentValue = '';

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (insideQuotes) {
            if (char === '"') {
                if (nextChar === '"') {
                    currentValue += '"';
                    i++;
                } else {
                    insideQuotes = false;
                }
            } else {
                currentValue += char;
            }
        } else {
            if (char === '"') {
                insideQuotes = true;
            } else if (char === delimiter) {
                currentRow.push(currentValue.trim());
                currentValue = '';
            } else if (char === '\r' || char === '\n') {
                currentRow.push(currentValue.trim());
                if (currentRow.some(val => val !== '')) {
                    rows.push(currentRow);
                }
                currentRow = [];
                currentValue = '';
                if (char === '\r' && nextChar === '\n') {
                    i++;
                }
            } else {
                currentValue += char;
            }
        }
    }
    if (currentValue !== '' || currentRow.length > 0) {
        currentRow.push(currentValue.trim());
        if (currentRow.some(val => val !== '')) {
            rows.push(currentRow);
        }
    }
    return rows;
};

// Read fetched CSV and extract CSV part
const fileText = fs.readFileSync('C:/Users/Usuario/.gemini/antigravity/brain/77211211-3e11-44a5-94ff-968f93a4d3bd/.system_generated/steps/992/content.md', 'utf8');
const lines = fileText.split('\n');
const csvStartIndex = lines.findIndex(l => l.startsWith('Codigo,Receta_Nombre') || l.startsWith('Codigo,'));
if (csvStartIndex === -1) {
    console.error("Could not find CSV start line!");
    process.exit(1);
}

const csvText = lines.slice(csvStartIndex).join('\n');

// Parse it
const rawRows = parseCSVOrTSV(csvText);
console.log("Total raw rows parsed:", rawRows.length);
if (rawRows.length > 0) {
    console.log("Headers:", rawRows[0]);
}

const headers = rawRows[0].map(h => normalizeHeader(h));
const rows = rawRows.slice(1);

const processed = [];
rows.forEach((row, rowIndex) => {
    const rowNum = rowIndex + 2;
    const record = {};
    headers.forEach((h, colIndex) => {
        if (h) record[h] = row[colIndex] || '';
    });
    
    const receta_codigo = record.recetacodigo || record.recetasku || record.sku || record.codigo || '';
    const receta_nombre = record.recetanombre || record.producto || record.nombre || '';
    const familia_tecnologica = record.familiatecnologica || record.familia || 'fermentado_seco';
    const lead_time_dias = Number(record.leadtimedias || record.leadtime || 30);
    const merma_secado_objetivo = Number(record.mermasecadoobjetivo || record.mermasecado || record.merma || 35);
    const porcentaje_inyeccion = record.porcentajeinyeccion ? Number(record.porcentajeinyeccion) : null;
    const ingrediente_ident = record.ingredientecodigo || record.ingredientesku || record.ingrediente || record.ingredientecodigoonombre || '';
    const porcentaje_base = record.porcentaje || record.porcentajebase || record.pct || '';
    const categoria_tecnologica = record.categoriatecnologica || record.categoria || 'aditivo';
    const secuencia_mezcla = Number(record.secuenciamezcla || record.secuencia || 1);

    processed.push({
        rowNum,
        receta_codigo,
        receta_nombre,
        ingrediente_ident,
        porcentaje_base,
        categoria_tecnologica,
        porcentaje_base_parsed: porcentaje_base !== '' ? Number(porcentaje_base) : null,
    });
});

// Let's inspect Salame mezcla rows
console.log("\n--- Salame mezcla rows ---");
processed.filter(p => p.receta_nombre === 'Salame mezcla').forEach(p => {
    console.log(`Row ${p.rowNum}: Name: "${p.receta_nombre}", Ing: "${p.ingrediente_ident}", PctRaw: "${p.porcentaje_base}", PctParsed: ${p.porcentaje_base_parsed}, Cat: "${p.categoria_tecnologica}"`);
});

// Let's calculate sumMeatBase for Salame mezcla
const salameMezclaItems = processed.filter(p => p.receta_nombre === 'Salame mezcla');
const sumMeatBase = salameMezclaItems
    .filter(it => it.categoria_tecnologica.includes('magro') || it.categoria_tecnologica.includes('grasa'))
    .reduce((sum, it) => sum + (it.porcentaje_base_parsed || 0), 0);

console.log("\nSum meat base for Salame mezcla:", sumMeatBase);
