const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');
let KEY = '';
let URL = '';
lines.forEach(line => {
    if (line.trim().startsWith('NEXT_PUBLIC_SUPABASE_URL=')) URL = line.split('=')[1].trim();
    if (line.trim().startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) KEY = line.split('=')[1].trim();
});

// Setup mock config
const config = {
    finanzas: {
        costoHoraHombre: 4500,
        costoDiaCamara: 150
    }
};

const FAMILIAS_CHARC = {
    fermentado_seco: { id: 'fermentado_seco', nombre: 'Fermentados Secos (Madurados)', color: 'bg-red-700', text: 'text-red-700', border: 'border-red-700' },
    salazon_cruda: { id: 'salazon_cruda', nombre: 'Salazones de Pieza Entera', color: 'bg-amber-600', text: 'text-amber-600', border: 'border-amber-600' },
    emulsion_fina: { id: 'emulsion_fina', nombre: 'Emulsiones Finas Escaldadas', color: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-600' },
    salazon_inyectada: { id: 'salazon_inyectada', nombre: 'Salazones con Inyección (Cocidos)', color: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-600' },
    embutido_fresco: { id: 'embutido_fresco', nombre: 'Embutidos Frescos (Sin Cámara)', color: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-600' }
};

async function run() {
    try {
        console.log("Fetching database data...");
        const responseIng = await fetch(`${URL}/rest/v1/ingredientes?select=*`, {
            headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
        });
        const ingredients = await responseIng.json();

        const responseRec = await fetch(`${URL}/rest/v1/charc_recetas?select=*,charc_receta_ingredientes(*)`, {
            headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
        });
        const crData = await responseRec.json();
        const charcRecetas = crData.map(r => ({
            ...r,
            details: (r.charc_receta_ingredientes || []).map(d => ({
                ingredientId: d.ingrediente_id,
                gramos: d.gramos,
                porcentaje_base: d.porcentaje_base,
                categoria_tecnologica: d.categoria_tecnologica,
                secuencia_mezcla: d.secuencia_mezcla
            }))
        }));

        const responseLot = await fetch(`${URL}/rest/v1/charc_lotes_maduracion?select=*`, {
            headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
        });
        const charcLotes = await responseLot.json();

        console.log("Data loaded. Simulating processedRecetas useMemo...");
        
        // Simulating processedRecetas mapping
        const processedRecetas = charcRecetas.map(r => {
            const totalBatchCost = r.details ? r.details.reduce((acc, d) => {
                const ing = ingredients.find(i => i.id === d.ingredientId);
                const costPerGram = Number(ing?.costo_estandar || ing?.costPerGram || 0);
                return acc + (Number(d.gramos || 0) * costPerGram);
            }, 0) : 0;
            const batchWeight = Number(r.tamano_lote_kg || 10) * 1000;
            const t_prep = Number(r.tiempo_preparacion || 30);
            const d_maduracion = Number(r.dias_maduracion || 21);
            const costo_mo = (t_prep / 60) * (config?.finanzas?.costoHoraHombre || 4500);
            const costo_camara = d_maduracion * (config?.finanzas?.costoDiaCamara || 150);
            const totalCostOfBatch = totalBatchCost + costo_mo + costo_camara;
            const merma = Number(r.merma_secado_objetivo || 35);
            const finalWeightKg = (batchWeight * (1 - merma / 100)) / 1000;
            const costPerUnit = finalWeightKg > 0 ? totalCostOfBatch / finalWeightKg : 0;

            return {
                ...r,
                totalBatchCost,
                batchWeight,
                t_prep,
                d_maduracion,
                costo_mo,
                costo_camara,
                totalCostOfBatch,
                merma,
                finalWeightKg,
                costPerUnit
            };
        });

        console.log("processedRecetas succeeded! Count =", processedRecetas.length);

        console.log("Simulating Kanban stage mappings...");
        const columns = [
            { id: 'PREPARACION', title: '1. Preparación', desc: 'Pesaje y mezclas iniciales' },
            { id: 'CURADO', title: '2. Curado / Salado', desc: 'Salazón y estabilización' },
            { id: 'ESTUFADO', title: '3. Estufado', desc: 'Fermentación inicial' },
            { id: 'MADURACION', title: '4. Maduración', desc: 'Drying y merma objetivo' },
            { id: 'COCCION', title: '5. Cocción', desc: 'Tratamiento térmico final' }
        ];

        columns.forEach(col => {
            const lotesEnCol = charcLotes.filter(l => {
                const rec = charcRecetas.find(r => r.id === l.receta_id);
                const etapa = !l.estado || l.estado === 'EN_SECADO'
                    ? (rec?.familia_tecnologica === 'salazon_inyectada' ? 'COCCION' : 'MADURACION')
                    : l.estado;
                return etapa === col.id;
            });

            lotesEnCol.forEach(l => {
                const rec = charcRecetas.find(r => r.id === l.receta_id);
                const mermaReal = ((1 - l.peso_actual_g / l.peso_inicial_g) * 100);
                const targetMerma = rec?.merma_secado_objetivo || 35.00;
                const percentToGoal = targetMerma > 0 ? (mermaReal / targetMerma) * 100 : 0;
                const isCured = mermaReal >= targetMerma;
                const familyData = FAMILIAS_CHARC[rec?.familia_tecnologica || 'fermentado_seco'];

                // Render test variables
                const elapsedDays = Math.max(0, Math.floor((Date.now() - new Date(l.fecha_ingreso).getTime()) / (24 * 60 * 60 * 1000)));
                const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(l.fecha_ingreso).getTime()) / 60000));
                
                let timeStatus = "";
                let timeTargetMet = false;
                
                if (col.id === 'CURADO') {
                    const reqDays = rec?.familia_tecnologica === 'salazon_cruda' ? (rec?.tiempo_curado_salado_dias || 7) : (rec?.tiempo_curado_salmuera_dias || 3);
                    timeStatus = `${elapsedDays}d / ${reqDays}d curado`;
                    timeTargetMet = elapsedDays >= reqDays;
                } else if (col.id === 'ESTUFADO') {
                    const reqDays = rec?.tiempo_estufado_dias || 2;
                    timeStatus = `${elapsedDays}d / ${reqDays}d estufado`;
                    timeTargetMet = elapsedDays >= reqDays;
                } else if (col.id === 'MADURACION') {
                    const reqDays = rec?.dias_maduracion || 21;
                    timeStatus = `${elapsedDays}d / ${reqDays}d secado`;
                    timeTargetMet = elapsedDays >= reqDays;
                } else if (col.id === 'COCCION') {
                    const reqMins = rec?.tiempo_coccion_mins || 90;
                    timeStatus = `${elapsedMinutes}m / ${reqMins}m cocción`;
                    timeTargetMet = elapsedMinutes >= reqMins;
                }
            });
        });

        console.log("Kanban stage mappings succeeded!");

        console.log("Simulating Recipe Details expands...");
        processedRecetas.forEach(r => {
            r.details?.forEach((d, i) => {
                const ing = ingredients.find(ing => ing.id === d.ingredientId);
                const cat = { label: 'Test' }; // Mock CATEGORIAS_TECNOLOGICAS
                const costPerGram = Number(ing?.costo_estandar || ing?.costPerGram || 0);
                const grams = (Number(d.porcentaje_base || 0) / 100) * r.batchWeight;
                const componentCost = grams * costPerGram;
                const incidencePct = r.totalBatchCost > 0 ? (componentCost / r.totalBatchCost) * 100 : 0;
            });
        });
        
        console.log("Recipe Details expands succeeded!");
        console.log("ALL SIMULATION SUCCESSFUL - No crash occurred in logic!");

    } catch (err) {
        console.error("CRASH DETECTED:", err);
    }
}

run();
