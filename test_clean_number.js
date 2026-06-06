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

// Robust Number Cleaner
const cleanNumber = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    let s = val.toString().trim().replace(/\s/g, '').replace(/%/g, '');
    
    if (s.includes(',') && s.includes('.')) {
        if (s.indexOf('.') < s.indexOf(',')) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else {
            s = s.replace(/,/g, '');
        }
    } else if (s.includes(',')) {
        s = s.replace(',', '.');
    }
    const num = Number(s);
    return isNaN(num) ? 0 : num;
};

// Read CSV
const fileText = fs.readFileSync('C:/Users/Usuario/.gemini/antigravity/brain/77211211-3e11-44a5-94ff-968f93a4d3bd/.system_generated/steps/992/content.md', 'utf8');
const lines = fileText.split('\n');
const csvStartIndex = lines.findIndex(l => l.startsWith('Codigo,Receta_Nombre') || l.startsWith('Codigo,'));
const csvText = lines.slice(csvStartIndex).join('\n');

const rawRows = parseCSVOrTSV(csvText);
const headers = rawRows[0].map(h => normalizeHeader(h));
const rows = rawRows.slice(1);

const processed = [];
rows.forEach((row, rowIndex) => {
    const record = {};
    headers.forEach((h, colIndex) => {
        if (h) record[h] = row[colIndex] || '';
    });
    
    const receta_codigo = record.recetacodigo || record.recetasku || record.sku || record.codigo || '';
    const receta_nombre = record.recetanombre || record.producto || record.nombre || '';
    const familia_tecnologica = record.familiatecnologica || record.familia || 'fermentado_seco';
    const lead_time_dias = cleanNumber(record.leadtimedias || record.leadtime) || 30;
    const merma_secado_objetivo = cleanNumber(record.mermasecadoobjetivo || record.mermasecado || record.merma) || 35;
    const porcentaje_inyeccion = record.porcentajeinyeccion ? cleanNumber(record.porcentajeinyeccion) : null;
    const ingrediente_ident = record.ingredientecodigo || record.ingredientesku || record.ingrediente || record.ingredientecodigoonombre || '';
    const porcentaje_base = record.porcentaje || record.porcentajebase || record.pct || '';
    const categoria_tecnologica = record.categoriatecnologica || record.categoria || 'aditivo';
    const secuencia_mezcla = cleanNumber(record.secuenciamezcla || record.secuencia) || 1;

    processed.push({
        receta_codigo,
        receta_nombre,
        familia_tecnologica: familia_tecnologica.toLowerCase(),
        lead_time_dias,
        merma_secado_objetivo,
        porcentaje_inyeccion,
        ingrediente_nombre: ingrediente_ident,
        porcentaje_base: porcentaje_base !== '' ? cleanNumber(porcentaje_base) : null,
        categoria_tecnologica: categoria_tecnologica.toLowerCase(),
        secuencia_mezcla
    });
});

// Group and validate recipes
const groups = {};
processed.forEach(p => {
    // Generate code mock since in modal we generate it dynamically
    let code = p.receta_codigo || p.receta_nombre;
    if (!groups[code]) {
        groups[code] = {
            codigo: code,
            nombre: p.receta_nombre,
            familia: p.familia_tecnologica,
            items: []
        };
    }
    groups[code].items.push(p);
});

const errors = [];
Object.values(groups).forEach(g => {
    if (g.familia === 'fermentado_seco' || g.familia === 'emulsion_fina') {
        const sumMeatBase = g.items
            .filter(it => it.categoria_tecnologica.includes('magro') || it.categoria_tecnologica.includes('grasa'))
            .reduce((sum, it) => sum + (it.porcentaje_base || 0), 0);
        
        console.log(`Recipe "${g.nombre}": Meat Base Sum = ${sumMeatBase}%`);
        if (Math.abs(sumMeatBase - 100) > 0.01) {
            errors.push(`Receta ${g.codigo} (${g.nombre}): La suma de base cárnica (Magro y Grasa) debe ser exactamente 100% (Actual: ${sumMeatBase.toFixed(1)}%).`);
        }
    }
});

console.log("\nValidation errors:", errors.length);
errors.forEach(e => console.log("- " + e));
