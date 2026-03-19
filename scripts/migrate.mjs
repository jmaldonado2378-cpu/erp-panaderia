import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const INITIAL_INGREDIENTS = [
    { id: 'i1', codigo: 'RAW-HAR-001', name: 'Harina 000 (Fuerza)', unidad_compra: 'Bolsa 25kg', familia: 'Harinas y Polvos', almacen: 'Harinera', alergeno: 'TACC', costo_estandar: 0.8 },
    { id: 'i2', codigo: 'RAW-HAR-002', name: 'Harina 0000 (Pastelera)', unidad_compra: 'Bolsa 25kg', familia: 'Harinas y Polvos', almacen: 'Harinera', alergeno: 'TACC', costo_estandar: 1.2 },
    { id: 'i3', codigo: 'RAW-OTR-001', name: 'Agua Filtrada', unidad_compra: 'Litros', familia: 'Otros', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 0.05 },
    { id: 'i4', codigo: 'RAW-HAR-003', name: 'Sal Fina', unidad_compra: 'Bolsa 5kg', familia: 'Harinas y Polvos', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 0.5 },
    { id: 'i5', codigo: 'RAW-FER-001', name: 'Levadura Fresca', unidad_compra: 'Paquete 500g', familia: 'Fermentos', almacen: 'Cámara de Frío 1 (Insumos)', alergeno: '', costo_estandar: 3.0 },
    { id: 'i6', codigo: 'RAW-GRA-001', name: 'Manteca Extrafina', unidad_compra: 'Caja 20kg', familia: 'Grasas y Aceites', almacen: 'Cámara de Frío 1 (Insumos)', alergeno: 'Lácteo', costo_estandar: 8.5 },
    { id: 'i7', codigo: 'RAW-GRA-002', name: 'Margarina Hojaldre Alta Fusión', unidad_compra: 'Caja 10kg', familia: 'Grasas y Aceites', almacen: 'Almacén Secos Principal', alergeno: 'Lácteo', costo_estandar: 6.8 },
    { id: 'i8', codigo: 'RAW-AZÚ-001', name: 'Azúcar Común', unidad_compra: 'Bolsa 50kg', familia: 'Azúcares y Dulces', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 1.0 },
    { id: 'i9', codigo: 'RAW-HUE-001', name: 'Huevo Líquido Pasteurizado', unidad_compra: 'Sachet 5L', familia: 'Huevos', almacen: 'Cámara de Frío 1 (Insumos)', alergeno: 'Huevo', costo_estandar: 4.2 },
    { id: 'i10', codigo: 'RAW-AZÚ-002', name: 'Dulce de Leche Repostero', unidad_compra: 'Tacho 10kg', familia: 'Azúcares y Dulces', almacen: 'Almacén Secos Principal', alergeno: 'Lácteo', costo_estandar: 5.5 },
    { id: 'i11', codigo: 'RAW-AZÚ-003', name: 'Chocolate Cobertura Semiamargo', unidad_compra: 'Caja 5kg', familia: 'Azúcares y Dulces', almacen: 'Heladera de Tránsito', alergeno: 'Lácteo', costo_estandar: 15.0 },
    { id: 'i12', codigo: 'RAW-ADI-001', name: 'Mejorador Pan Francés', unidad_compra: 'Bolsa 5kg', familia: 'Aditivos y Esencias', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 25.0 },
    { id: 'i13', codigo: 'RAW-ADI-002', name: 'Propionato de Calcio', unidad_compra: 'Bolsa 5kg', familia: 'Aditivos y Esencias', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 18.0 },
    { id: 'i14', codigo: 'RAW-HAR-004', name: 'Polvo de Hornear Doble Acción', unidad_compra: 'Tarro 2kg', familia: 'Harinas y Polvos', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 6.0 },
    { id: 'i15', codigo: 'RAW-ADI-003', name: 'Extracto de Malta Líquido', unidad_compra: 'Bidón 5kg', familia: 'Aditivos y Esencias', almacen: 'Almacén Secos Principal', alergeno: 'TACC', costo_estandar: 8.0 },
    { id: 'i16', codigo: 'RAW-ADI-004', name: 'Esencia de Vainilla Concentrada', unidad_compra: 'Botella 1L', familia: 'Aditivos y Esencias', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 12.0 },
    { id: 'wip_F1', codigo: 'WIP-F-001', name: '[WIP] Masa Madre Activa (Poolish)', unidad_compra: 'Gramos', familia: 'WIP (Producción)', almacen: 'Cámara de Frío 2 (WIP)', alergeno: 'TACC', costo_estandar: 1.5, es_subensamble: true },
    { id: 'wip_A1', codigo: 'WIP-A-001', name: '[WIP] Cremado Base Vainilla', unidad_compra: 'Gramos', familia: 'WIP (Producción)', almacen: 'Cámara de Frío 2 (WIP)', alergeno: 'TACC, Lácteo, Huevo', costo_estandar: 3.5, es_subensamble: true },
    { id: 'wip_B1', codigo: 'WIP-B-001', name: '[WIP] Plancha Pan de Miga Blanca', unidad_compra: 'Gramos', familia: 'WIP (Producción)', almacen: 'Almacén Secos Principal', alergeno: 'TACC', costo_estandar: 2.5, es_subensamble: true },
    { id: 'wip_D1', codigo: 'WIP-D-001', name: '[WIP] Bastón Hojaldre (Empaste)', unidad_compra: 'Gramos', familia: 'WIP (Producción)', almacen: 'Cámara de Frío 2 (WIP)', alergeno: 'TACC, Lácteo', costo_estandar: 5.5, es_subensamble: true }
];

const BASE_RECIPES = [
    { codigo: 'FG-F-001', nombre_producto: 'Baguette Francesa', familia: 'F', formato_venta: 'Unidad', peso_unidad: 250, merma: 18, horas_hombre: 1.5, costo_empaque: 0, details: [{ ingredientId: 'i1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i3', porcentaje: 65, gramos: 650 }, { ingredientId: 'i4', porcentaje: 2, gramos: 20 }, { ingredientId: 'i5', porcentaje: 1.5, gramos: 15 }, { ingredientId: 'i12', porcentaje: 1, gramos: 10 }] },
    { codigo: 'FG-F-002', nombre_producto: 'Pan de Molde Larga Vida', familia: 'F', formato_venta: 'Unidad', peso_unidad: 500, merma: 10, horas_hombre: 2.0, costo_empaque: 120, details: [{ ingredientId: 'i1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i3', porcentaje: 55, gramos: 550 }, { ingredientId: 'i6', porcentaje: 8, gramos: 80 }, { ingredientId: 'i5', porcentaje: 3, gramos: 30 }, { ingredientId: 'i13', porcentaje: 0.5, gramos: 5 }] },
    { codigo: 'FG-F-003', nombre_producto: 'Ciabatta Rústica', familia: 'F', formato_venta: 'Kg', peso_unidad: 0, merma: 15, horas_hombre: 2.5, costo_empaque: 0, details: [{ ingredientId: 'i1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'wip_F1', porcentaje: 30, gramos: 300 }, { ingredientId: 'i3', porcentaje: 80, gramos: 800 }, { ingredientId: 'i4', porcentaje: 2.2, gramos: 22 }] },
];

async function run() {
    console.log("Iniciando migración con archivo .env.local leido correctamente...");
    
    // 1. Insert Insumos
    const mappedIngredients = {}; // old_id -> new_uuid
    for (const ing of INITIAL_INGREDIENTS) {
        const { data, error } = await supabase.from('ingredientes').insert([{
            codigo: ing.codigo,
            name: ing.name,
            unidad_compra: ing.unidad_compra,
            familia: ing.familia,
            almacen: ing.almacen,
            costo_estandar: ing.costo_estandar,
            es_subensamble: ing.es_subensamble || false
        }]).select();
        
        if (error) {
            console.error("Error intertando ingrediente:", ing.codigo, error.message);
        } else {
            console.log(`Ingrediente migrado: ${ing.codigo}`);
            mappedIngredients[ing.id] = data[0].id; // Ej. { 'i1': '1b3c...' }
        }
    }

    // 2. Insert Recetas
    for (const rec of BASE_RECIPES) {
        
        let peso_crudo = 0;
        rec.details.forEach(d => peso_crudo += d.gramos);
        const peso_final = peso_crudo * (1 - (rec.merma / 100));

        const { data, error } = await supabase.from('recetas').insert([{
            codigo: rec.codigo,
            nombre_producto: rec.nombre_producto,
            familia: rec.familia,
            formato_venta: rec.formato_venta,
            peso_unidad: rec.peso_unidad,
            peso_crudo: peso_crudo,
            peso_final: peso_final,
            merma: rec.merma,
            horas_hombre: rec.horas_hombre,
            costo_empaque: rec.costo_empaque
        }]).select();

        if (error) {
            console.error("Error intertando receta:", rec.codigo, error.message);
            continue;
        }
        
        const newRecetaId = data[0].id;
        console.log(`Receta migrada: ${rec.codigo}`);

        // 3. Insert Detalles de la Receta
        const detailsToInsert = rec.details.map(d => ({
            receta_id: newRecetaId,
            ingrediente_id: mappedIngredients[d.ingredientId],
            porcentaje: d.porcentaje,
            gramos: d.gramos
        }));

        const { error: errorDet } = await supabase.from('receta_ingredientes').insert(detailsToInsert);
        if (errorDet) {
            console.error("Error insertando el escandallo de la receta", rec.codigo, ":", errorDet.message);
        } else {
            console.log(`-- Escandallo de ${rec.codigo} migrado OK.`);
        }
    }

    console.log("Migración completada exitosamente.");
}

run();
