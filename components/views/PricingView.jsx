'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Tag, Package, DollarSign, CheckCircle2, Edit3, ChevronRight, 
    Store, Truck, ShoppingCart, PlusCircle, Trash2, Zap, Info, 
    Percent, Settings, Scale, ArrowRight, TrendingDown, HelpCircle, 
    Layers, ShieldCheck, Warehouse, Coins
} from 'lucide-react';
import { Card, Button, Input, Select, FAMILIAS } from '../bakery_erp';
import { supabase } from '../../lib/supabase';

/* ================================================================
   HELPER: Calcula árbol de costos de una receta (Bakery)
   ================================================================ */
function getIngredientCost(ing, recipes, ingredients, config, visited = new Set()) {
    if (!ing) return 0;
    if (visited.has(ing.id)) return 0;

    if (!ing.es_subensamble && ing.tipo !== 'wip') {
        return Number(ing.costo_estandar || 0);
    }

    // Buscar receta por código o nombre
    const recipe = recipes.find(r => r.codigo === ing.codigo || r.nombre_producto === ing.name?.replace('[WIP] ', ''));
    if (!recipe) return Number(ing.costo_estandar || 0);

    const visitedNext = new Set(visited);
    visitedNext.add(ing.id);

    let kgLoteFinal;
    if (recipe.formato_venta === 'Unidad') {
        kgLoteFinal = (Number(recipe.lote_minimo || 1) * Number(recipe.peso_unidad || 0)) / 1000;
    } else {
        kgLoteFinal = Number(recipe.lote_minimo || 1);
    }
    const mermaFactor = 1 - Number(recipe.merma || 0) / 100;
    const kgLoteBruto = mermaFactor > 0 ? kgLoteFinal / mermaFactor : kgLoteFinal;

    const details = recipe.details || [];
    let gramosMap;
    if (recipe.logica_formula === 'batch') {
        gramosMap = details.map(d => Number(d.gramos || 0));
    } else {
        const sumPct = details.reduce((acc, d) => acc + Number(d.porcentaje || 0), 0);
        const masaBruta = kgLoteBruto * 1000;
        const baseHarina = sumPct > 0 ? masaBruta / (sumPct / 100) : 0;
        gramosMap = details.map(d => Number(d.porcentaje || 0) > 0
            ? Math.round((Number(d.porcentaje) / 100) * baseHarina) : 0);
    }

    const costo_mp = details.reduce((acc, d, i) => {
        const detailIng = ingredients.find(x => x.id === d.ingredientId);
        const costPerGram = getIngredientCost(detailIng, recipes, ingredients, config, visitedNext);
        return acc + (gramosMap[i] * costPerGram);
    }, 0);

    const costo_mo = (Number(recipe.horas_hombre) || 0) * (config?.finanzas?.costoHoraHombre || 4500);
    const costo_cif = costo_mp * ((config?.finanzas?.costosIndirectosPct || 20) / 100);
    const costo_total = costo_mp + costo_mo + costo_cif;

    const pesoFinalG = Number(recipe.peso_final) || 1;
    return costo_total / pesoFinalG;
}

function calcCostosBakery(receta, recipes, ingredients, config) {
    const isBatch = receta.logica_formula === 'batch';
    const merma = Number(receta.merma || 0);
    const mermaFactor = 1 - merma / 100;

    let kgLoteFinal;
    if (receta.formato_venta === 'Unidad') {
        kgLoteFinal = (Number(receta.lote_minimo || 1) * Number(receta.peso_unidad || 0)) / 1000;
    } else {
        kgLoteFinal = Number(receta.lote_minimo || 1);
    }

    const kgLoteBruto = mermaFactor > 0 ? kgLoteFinal / mermaFactor : kgLoteFinal;

    const details = receta.details || [];
    let gramosMap;
    if (isBatch) {
        gramosMap = details.map(d => Number(d.gramos || 0));
    } else {
        const sumPct = details.reduce((acc, d) => acc + Number(d.porcentaje || 0), 0);
        const masaBruta = kgLoteBruto * 1000;
        const baseHarina = sumPct > 0 ? masaBruta / (sumPct / 100) : 0;
        gramosMap = details.map(d => Number(d.porcentaje || 0) > 0
            ? Math.round((Number(d.porcentaje) / 100) * baseHarina) : 0);
    }

    const costo_mp = details.reduce((acc, d, i) => {
        const ing = ingredients.find(x => x.id === d.ingredientId);
        return acc + (gramosMap[i] * getIngredientCost(ing, recipes, ingredients, config));
    }, 0);

    const costo_mo = (Number(receta.horas_hombre) || 0) * (config?.finanzas?.costoHoraHombre || 4500);
    const costo_cif = costo_mp * ((config?.finanzas?.costosIndirectosPct || 20) / 100);

    const unidades_rinde = receta.formato_venta === 'Unidad'
        ? Number(receta.lote_minimo || 1)
        : kgLoteFinal;

    return { costo_mp, costo_mo, costo_cif, unidades_rinde: unidades_rinde || 1 };
}

/* ================================================================
   HELPER: Calcula costos de una receta de Charcutería
   ================================================================ */
function calcCostosCharcuteria(receta, recipes, ingredients, config, pesoUnidadVta = 350, formatoVta = 'unidad') {
    const details = receta.details || [];
    
    // Costo de MP (excluyendo empaque en la receta si tiene categoría empaque)
    const costo_mp = details.reduce((acc, d) => {
        if (d.categoria_tecnologica === 'empaque') return acc;
        const ing = ingredients.find(x => x.id === d.ingredientId);
        const costPerGram = getIngredientCost(ing, recipes, ingredients, config);
        return acc + (Number(d.gramos || 0) * costPerGram);
    }, 0);

    // Costo de empaques dentro de la receta (ej: tripa/malla)
    const costo_empaque_receta = details.reduce((acc, d) => {
        if (d.categoria_tecnologica !== 'empaque') return acc;
        const ing = ingredients.find(x => x.id === d.ingredientId);
        const costPerGram = getIngredientCost(ing, recipes, ingredients, config);
        return acc + (Number(d.gramos || 0) * costPerGram);
    }, 0);

    const peso_crudo_total_g = details.reduce((acc, d) => {
        if (d.categoria_tecnologica === 'empaque') return acc;
        return acc + Number(d.gramos || 0);
    }, 0);

    const merma = Number(receta.merma_secado_objetivo || 35);
    const peso_final_g = peso_crudo_total_g * (1 - merma / 100);

    // Unidades de rendimiento
    let unidades_rinde = 1;
    if (formatoVta === 'unidad') {
        unidades_rinde = pesoUnidadVta > 0 ? (peso_final_g / pesoUnidadVta) : 1;
    } else {
        // Venta por Kg
        unidades_rinde = peso_final_g / 1000;
    }

    return {
        costo_mp,
        costo_empaque_receta,
        peso_crudo_total_g,
        peso_final_g,
        unidades_rinde: unidades_rinde || 1
    };
}

/* ================================================================
   COMPONENTE PRINCIPAL
   ================================================================ */
export default function PricingView({ 
    recipes, 
    ingredients, 
    config, 
    showToast,
    charcRecetas,
    reventaArticulos,
    fraccTareas
}) {
    const [tabTipo, setTabTipo] = useState('elaborados'); // elaborados, fraccionados, reventa
    const [selectedProduct, setSelectedProduct] = useState(null); // Producto mapeado seleccionado
    const [listaPreciosMap, setListaPreciosMap] = useState({});   // { receta_id: lista_precios_row }
    const [savingId, setSavingId] = useState(null);
    const [filterEstado, setFilterEstado] = useState('TODOS');
    const [searchTerm, setSearchTerm] = useState('');
    const [showConfigCIF, setShowConfigCIF] = useState(false);

    // Empaques: insumos con tipo === 'empaque'
    const empaqueIngredients = useMemo(
        () => (ingredients || []).filter(i => i.tipo === 'empaque'),
        [ingredients]
    );

    /* ── Cargar variables de Costos Fijos (CIF) y Regimen desde localStorage ── */
    const [fixedCosts, setFixedCosts] = useState({
        servicios: 125000, // luz, gas, agua
        alquiler_logistica: 380000, // alquiler + seguro + combustible
        mano_obra: 1300000, // sueldos fijos de planta
        monotributo: 35000, // cuota monotributo fija
        volumen_mensual: 12000, // volumen producción estimado
        usar_cif_fijo: true, // false = usar el % MP estándar
        costosIndirectosPct: 20
    });

    const [taxSettings, setTaxSettings] = useState({
        regimen: 'Monotributo', // Monotributo vs Responsable Inscripto
        iibb_pct: 3.5, // Ingresos Brutos
        comision_canal: 5.0, // MercadoPago/Tiendanube promedio
        costo_envio: 0 // Envío bonificado unitario
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedCosts = localStorage.getItem('pricing_fixed_costs');
            if (savedCosts) {
                const parsed = JSON.parse(savedCosts);
                if (parsed.costosIndirectosPct === undefined) {
                    parsed.costosIndirectosPct = config?.finanzas?.costosIndirectosPct ?? 20;
                }
                setFixedCosts(parsed);
            } else {
                setFixedCosts(prev => ({ ...prev, costosIndirectosPct: config?.finanzas?.costosIndirectosPct ?? 20 }));
            }
            const savedTaxes = localStorage.getItem('pricing_tax_settings');
            if (savedTaxes) setTaxSettings(JSON.parse(savedTaxes));
        }
    }, [config]);

    const saveFixedCosts = (newCosts) => {
        setFixedCosts(newCosts);
        localStorage.setItem('pricing_fixed_costs', JSON.stringify(newCosts));
    };

    const saveTaxSettings = (newTaxes) => {
        setTaxSettings(newTaxes);
        localStorage.setItem('pricing_tax_settings', JSON.stringify(newTaxes));
    };

    // Estado local para edición de empaques, canal y notas del producto seleccionado
    const [localPricing, setLocalPricing] = useState(null);

    /* ── Cargar datos desde Supabase con caché local ── */
    const loadPrecios = async () => {
        let lpData = [];
        try {
            const { data: lp, error } = await supabase.from('lista_precios').select('*');
            if (error) throw error;
            lpData = lp || [];
            localStorage.setItem('cache_lista_precios', JSON.stringify(lpData));
        } catch (err) {
            console.warn("Fallo lectura Supabase, usando cache local:", err);
            const saved = localStorage.getItem('cache_lista_precios');
            if (saved) lpData = JSON.parse(saved);
        }
        const map = {};
        lpData.forEach(row => { map[row.receta_id] = row; });
        setListaPreciosMap(map);
    };

    useEffect(() => {
        loadPrecios();
    }, []);

    /* ── Mapeo del Catálogo Unificado según la pestaña activa ── */
    const catalogProducts = useMemo(() => {
        if (tabTipo === 'elaborados') {
            const bakery = recipes.map(r => ({
                id: r.id,
                codigo: r.codigo,
                nombre: r.nombre_producto,
                subtipo: 'panaderia',
                familia: r.familia,
                original: r
            }));
            const charc = charcRecetas.map(cr => ({
                id: cr.id,
                codigo: cr.codigo,
                nombre: cr.nombre,
                subtipo: 'charcuteria',
                familia: 'C', // Usar C de charcuteria
                original: cr
            }));
            return [...bakery, ...charc];
        } else if (tabTipo === 'fraccionados') {
            // Fraccionables: Ingredientes tipo 'insumo' que se venden al por menor
            const fracc = (ingredients || [])
                .filter(i => i.tipo === 'insumo' && i.familia === 'Especias y Semillas')
                .map(i => ({
                    id: `fracc_${i.id}`,
                    codigo: i.codigo,
                    nombre: `Fracc: ${i.name}`,
                    subtipo: 'fraccionado',
                    familia: 'E',
                    original: i
                }));
            return fracc;
        } else {
            // Reventa
            return reventaArticulos.map(ra => ({
                id: ra.id,
                codigo: ra.codigo,
                nombre: ra.nombre,
                subtipo: 'reventa',
                familia: 'B',
                original: ra
            }));
        }
    }, [tabTipo, recipes, charcRecetas, ingredients, reventaArticulos]);

    /* ── Filtrar Catálogo ── */
    const filteredProducts = useMemo(() => {
        return catalogProducts.filter(p => {
            const matchesSearch = p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || p.codigo?.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;
            if (filterEstado === 'TODOS') return true;
            const lp = listaPreciosMap[p.id];
            if (filterEstado === 'SIN_PRECIO') return !lp;
            return lp?.estado === filterEstado;
        });
    }, [catalogProducts, searchTerm, filterEstado, listaPreciosMap]);

    /* ── Cuando cambia el producto seleccionado ── */
    useEffect(() => {
        if (!selectedProduct) { setLocalPricing(null); return; }
        const existing = listaPreciosMap[selectedProduct.id];

        // Configuración inicial de notas/configuraciones locales
        let initialNotes = '';
        let initialIvaVenta = 21;
        let initialFraccConfig = { insumo_granel_id: selectedProduct.subtipo === 'fraccionado' ? selectedProduct.original.id : '', peso_porcion_g: 250, merma_fracc: 2.0 };
        let initialCharcConfig = { peso_unidad_vta: 350, formato_vta: 'unidad' };

        if (existing?.notas) {
            try {
                const parsed = JSON.parse(existing.notas);
                if (parsed && typeof parsed === 'object' && 'user_notes' in parsed) {
                    initialNotes = parsed.user_notes || '';
                    initialIvaVenta = parsed.iva_venta ?? 21;
                    if (parsed.fracc_config) initialFraccConfig = parsed.fracc_config;
                    if (parsed.charc_config) initialCharcConfig = parsed.charc_config;
                } else {
                    initialNotes = existing.notas || '';
                }
            } catch {
                initialNotes = existing.notas || '';
            }
        }

        const baseForm = {
            receta_id: selectedProduct.id,
            estado: 'BORRADOR',
            margen_pct: selectedProduct.subtipo === 'reventa' ? 40 : 60,
            empaques: [],
            costo_empaque_total: 0,
            precio_mostrador: null,
            precio_distribuidor: null,
            precio_cadena: null,
            canal_principal: 'mostrador',
            iva_venta: initialIvaVenta,
            user_notes: initialNotes,
            fracc_config: initialFraccConfig,
            charc_config: initialCharcConfig
        };

        setLocalPricing(existing ? { 
            ...baseForm, 
            ...existing, 
            empaques: existing.empaques || [],
            iva_venta: initialIvaVenta,
            user_notes: initialNotes,
            fracc_config: initialFraccConfig,
            charc_config: initialCharcConfig
        } : baseForm);
    }, [selectedProduct, listaPreciosMap]);

    /* ── Cálculo del CIF Unitario de Absorción ── */
    const cifUnitarioPool = useMemo(() => {
        const totalGastos = Number(fixedCosts.servicios || 0) + 
                            Number(fixedCosts.alquiler_logistica || 0) + 
                            Number(fixedCosts.mano_obra || 0) + 
                            (taxSettings.regimen === 'Monotributo' ? Number(fixedCosts.monotributo || 0) : 0);
        const volumen = Number(fixedCosts.volumen_mensual || 1);
        return volumen > 0 ? (totalGastos / volumen) : 0;
    }, [fixedCosts, taxSettings.regimen]);

    /* ── CÁLCULO DE COSTOS DETALLADOS DEL PRODUCTO SELECCIONADO ── */
    const costos = useMemo(() => {
        if (!selectedProduct || !localPricing) return null;

        let costo_mp = 0;
        let costo_mo = 0;
        let costo_cif = 0;
        let unidades_rinde = 1;
        let costo_empaque_receta = 0;

        // I. Cálculo según tipo de producto
        if (selectedProduct.subtipo === 'panaderia') {
            const res = calcCostosBakery(selectedProduct.original, recipes, ingredients, config);
            costo_mp = res.costo_mp;
            costo_mo = res.costo_mo;
            costo_cif = res.costo_cif;
            unidades_rinde = res.unidades_rinde;
        } 
        else if (selectedProduct.subtipo === 'charcuteria') {
            const charcConfig = localPricing.charc_config || { peso_unidad_vta: 350, formato_vta: 'unidad' };
            const res = calcCostosCharcuteria(
                selectedProduct.original, 
                recipes, 
                ingredients, 
                config,
                Number(charcConfig.peso_unidad_vta || 350),
                charcConfig.formato_vta
            );
            costo_mp = res.costo_mp;
            costo_empaque_receta = res.costo_empaque_receta;
            unidades_rinde = res.unidades_rinde;
            // Charcutería MO fija se puede absorber vía CIF
            costo_mo = 0;
            costo_cif = 0;
        } 
        else if (selectedProduct.subtipo === 'fraccionado') {
            const fraccConfig = localPricing.fracc_config || { insumo_granel_id: selectedProduct.original.id, peso_porcion_g: 250, merma_fracc: 2.0 };
            const ingGranel = ingredients.find(i => i.id === fraccConfig.insumo_granel_id) || selectedProduct.original;
            const costPerGram = Number(ingGranel.costo_estandar || 0);
            
            const gramosConsumidos = Number(fraccConfig.peso_porcion_g || 250) / (1 - Number(fraccConfig.merma_fracc || 2) / 100);
            costo_mp = gramosConsumidos * costPerGram;
            unidades_rinde = 1; // Ya es unitario
        } 
        else if (selectedProduct.subtipo === 'reventa') {
            costo_mp = Number(selectedProduct.original.costo_compra || 0);
            unidades_rinde = 1; // Ya es unitario
        }

        // II. Costo de packaging unitario asignado dinámicamente
        const costo_empaque_adicional = localPricing.empaques?.reduce((acc, e) => {
            return acc + (Number(e.cantidad || 1) * Number(e.costo_unitario || 0));
        }, 0) || 0;

        const costo_empaque_total = costo_empaque_adicional + (costo_empaque_receta / unidades_rinde);

        // III. Costo de producción (materia prima + MO de la receta)
        const costo_produccion_directo = (costo_mp + costo_mo) / unidades_rinde;

        // IV. Asignación de CIF (Fijo o Porcentual)
        let cif_unitario = 0;
        if (fixedCosts.usar_cif_fijo) {
            cif_unitario = cifUnitarioPool;
        } else {
            // CIF como % de Materia Prima
            cif_unitario = (costo_mp / unidades_rinde) * ((fixedCosts.costosIndirectosPct ?? config?.finanzas?.costosIndirectosPct ?? 20) / 100);
        }

        const costo_produccion_total = costo_produccion_directo + cif_unitario;
        const costo_unitario_total = costo_produccion_total + costo_empaque_total;

        return {
            costo_mp: costo_mp / unidades_rinde,
            costo_mo: costo_mo / unidades_rinde,
            costo_empaque_total,
            cif_unitario,
            costo_produccion_total,
            costo_unitario_total,
            unidades_rinde
        };
    }, [selectedProduct, ingredients, config, localPricing?.empaques, localPricing?.fracc_config, localPricing?.charc_config, fixedCosts.usar_cif_fijo, cifUnitarioPool]);

    /* ── FORMULACIÓN DE PRECIO CRÍTICO (Margen sobre Precio) ── */
    const simulacionPrecio = useMemo(() => {
        if (!costos || !localPricing) return null;

        const costo = costos.costo_unitario_total;
        const marginPct = Number(localPricing.margen_pct || 50);
        const comisionesPct = Number(taxSettings.comision_canal || 0);
        const iibbPct = Number(taxSettings.iibb_pct || 0);
        const costoEnvio = Number(taxSettings.costo_envio || 0);

        // Denominador de la fórmula de división
        const sumDenominador = (marginPct + comisionesPct + iibbPct) / 100;
        const divisor = Math.max(0.05, 1 - sumDenominador); // Seguridad de tasa > 0
        
        // Precio Neto Sugerido
        const precioNetoSugerido = (costo + costoEnvio) / divisor;

        // Precios fijados por canal (o sugerido si está vacío)
        const activeCanalKey = `precio_${localPricing.canal_principal}`;
        const precioCanalFijado = Number(localPricing[activeCanalKey]) || precioNetoSugerido;

        // Distribución del precio fijado en pesos
        const comisionesP = precioCanalFijado * (comisionesPct / 100);
        const iibbP = precioCanalFijado * (iibbPct / 100);
        const margenP = precioCanalFijado * (marginPct / 100);
        
        // Margen Real Obtenido (lo que sobra después de costos, comisiones, envío e impuestos directos)
        const margenRealP = precioCanalFijado - costo - comisionesP - iibbP - costoEnvio;
        const margenRealPct = precioCanalFijado > 0 ? (margenRealP / precioCanalFijado) * 100 : 0;

        // Markup equivalente sobre el costo para este precio de venta
        const markupEquivalentePct = costo > 0 ? ((precioCanalFijado - costo) / costo) * 100 : 0;

        // IVA según régimen
        const esRI = taxSettings.regimen === 'Responsable Inscripto';
        const ivaTasa = Number(localPricing.iva_venta || 21);
        const ivaPesos = esRI ? precioCanalFijado * (ivaTasa / 100) : 0;
        const pvpFinal = precioCanalFijado + ivaPesos;

        return {
            precioNetoSugerido,
            precioCanalFijado,
            comisionesP,
            iibbP,
            margenRealP,
            margenRealPct,
            markupEquivalentePct,
            ivaPesos,
            pvpFinal
        };
    }, [costos, localPricing, taxSettings]);

    // Comprobación de precio desactualizado
    const checkIsDesactualizado = (p, lp) => {
        if (!lp || !lp.precio_publicado) return false;
        
        // Calcular costo rápido
        let costoUnit = 0;
        if (p.subtipo === 'panaderia') {
            const r = calcCostosBakery(p.original, recipes, ingredients, config);
            costoUnit = (r.costo_mp + r.costo_mo + (fixedCosts.usar_cif_fijo ? cifUnitarioPool * r.unidades_rinde : r.costo_cif)) / r.unidades_rinde + Number(lp.costo_empaque_total || 0);
        } else if (p.subtipo === 'charcuteria') {
            let configCharc = { peso_unidad_vta: 350, formato_vta: 'unidad' };
            if (lp.notas) {
                try {
                    const parsed = JSON.parse(lp.notas);
                    if (parsed.charc_config) configCharc = parsed.charc_config;
                } catch {}
            }
            const cr = calcCostosCharcuteria(p.original, recipes, ingredients, config, configCharc.peso_unidad_vta, configCharc.formato_vta);
            costoUnit = cr.costo_mp / cr.unidades_rinde + Number(lp.costo_empaque_total || 0);
        } else if (p.subtipo === 'fraccionado') {
            let configFracc = { peso_porcion_g: 250, merma_fracc: 2.0 };
            if (lp.notas) {
                try {
                    const parsed = JSON.parse(lp.notas);
                    if (parsed.fracc_config) configFracc = parsed.fracc_config;
                } catch {}
            }
            const gramos = Number(configFracc.peso_porcion_g) / (1 - Number(configFracc.merma_fracc) / 100);
            costoUnit = gramos * Number(p.original.costo_estandar || 0) + Number(lp.costo_empaque_total || 0);
        } else {
            costoUnit = Number(p.original.costo_compra || 0) + Number(lp.costo_empaque_total || 0);
        }

        // Si el precio publicado es menor que el costo o margen comprometido
        const marginActual = lp.precio_publicado > 0 ? ((lp.precio_publicado - costoUnit) / lp.precio_publicado) * 100 : 0;
        return lp.precio_publicado < costoUnit || marginActual < Number(lp.margen_pct || 50) - 3;
    };

    /* ── Agregar empaque a la lista local ── */
    const addEmpaque = (ingredienteId) => {
        const ing = empaqueIngredients.find(m => m.id === ingredienteId);
        if (!ing) return;
        const already = localPricing.empaques.find(e => e.ingrediente_id === ingredienteId);
        if (already) return;
        setLocalPricing(prev => ({
            ...prev,
            empaques: [...prev.empaques, {
                ingrediente_id: ingredienteId,
                nombre: ing.name,
                unidad: ing.unidad_compra || 'unidad',
                cantidad: 1,
                costo_unitario: Number(ing.costo_estandar)
            }]
        }));
    };

    const removeEmpaque = (idx) => {
        setLocalPricing(prev => ({ ...prev, empaques: prev.empaques.filter((_, i) => i !== idx) }));
    };

    const updateEmpaqueQty = (idx, val) => {
        setLocalPricing(prev => {
            const upd = [...prev.empaques];
            upd[idx] = { ...upd[idx], cantidad: Number(val) };
            return { ...prev, empaques: upd };
        });
    };

    /* ── Guardar / Publicar Precio ── */
    const save = async (publicar = false) => {
        if (!selectedProduct || !localPricing || !costos || !simulacionPrecio) return;
        setSavingId(selectedProduct.id);

        const activeCanalKey = `precio_${localPricing.canal_principal}`;
        const precioDelCanal = Number(localPricing[activeCanalKey]) || simulacionPrecio.precioNetoSugerido;

        // Payload serializando el estado local en la columna `notas`
        const payload = {
            receta_id: selectedProduct.id,
            estado: publicar ? 'PUBLICADO' : localPricing.estado,
            margen_pct: Number(localPricing.margen_pct),
            costo_empaque_total: costos.costo_empaque_total,
            precio_mostrador: localPricing.precio_mostrador ? Number(localPricing.precio_mostrador) : null,
            precio_distribuidor: localPricing.precio_distribuidor ? Number(localPricing.precio_distribuidor) : null,
            precio_cadena: localPricing.precio_cadena ? Number(localPricing.precio_cadena) : null,
            canal_principal: localPricing.canal_principal,
            precio_publicado: publicar ? precioDelCanal : localPricing.precio_publicado,
            empaques: localPricing.empaques,
            notas: JSON.stringify({
                user_notes: localPricing.user_notes || '',
                regimen: taxSettings.regimen,
                iibb_pct: taxSettings.iibb_pct,
                comision_canal: taxSettings.comision_canal,
                costo_envio: taxSettings.costo_envio,
                iva_venta: localPricing.iva_venta || 21,
                fracc_config: localPricing.fracc_config || null,
                charc_config: localPricing.charc_config || null
            }),
            updated_at: new Date().toISOString()
        };

        let savedRow = null;
        try {
            const { data, error } = await supabase
                .from('lista_precios')
                .upsert(payload, { onConflict: 'receta_id' })
                .select()
                .single();
            if (error) throw error;
            savedRow = data;
        } catch (err) {
            console.warn("Fallo persistencia Supabase, guardando en cache local (Offline):", err.message);
            savedRow = {
                ...payload,
                id: payload.id || 'lp_' + Date.now(),
                updated_at: new Date().toISOString()
            };
        }

        if (savedRow) {
            setListaPreciosMap(prev => {
                const newMap = { ...prev, [selectedProduct.id]: savedRow };
                localStorage.setItem('cache_lista_precios', JSON.stringify(Object.values(newMap)));
                return newMap;
            });
            setLocalPricing(prev => ({ ...prev, estado: savedRow.estado, precio_publicado: savedRow.precio_publicado }));
            showToast(publicar ? '✅ Precio PUBLICADO correctamente.' : '💾 Borrador guardado.');
        }
        setSavingId(null);
    };

    const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="space-y-4 animate-in fade-in pb-10">
            {/* HEADER */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl border shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-950">
                        <Coins className="text-slate-900" size={24} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black uppercase italic tracking-tight">Estructura Comercial y Margen</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matriz de Precios Científica con absorción CIF e Impuestos · Argentina</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => saveTaxSettings({ ...taxSettings, regimen: taxSettings.regimen === 'Monotributo' ? 'Responsable Inscripto' : 'Monotributo' })}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                            taxSettings.regimen === 'Monotributo' ? 'bg-orange-500 text-white shadow' : 'bg-blue-600 text-white shadow'
                        }`}
                    >
                        Régimen: {taxSettings.regimen}
                    </button>
                    <button 
                        onClick={() => setShowConfigCIF(!showConfigCIF)}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all"
                    >
                        <Settings size={14} /> CIF: {fmt(cifUnitarioPool)}/u
                    </button>
                </div>
            </div>

            {/* EXPANDIBLE: CONFIGURADOR DE COSTOS FIJOS / CIF */}
            {showConfigCIF && (
                <Card className="p-6 border-2 border-emerald-500 bg-emerald-50/20 shadow-xl rounded-2xl animate-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center mb-4 border-b border-emerald-100 pb-2">
                        <h4 className="text-xs font-black uppercase italic text-emerald-800 flex items-center gap-1.5">
                            <Settings size={16} /> Configuración de Estructura de Gastos Fijos (CIF Mensual)
                        </h4>
                        <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">Costos en Planta</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                        <Input 
                            label="Luz, Gas y Agua ($/Mes)" type="number" value={fixedCosts.servicios} 
                            onChange={v => saveFixedCosts({ ...fixedCosts, servicios: Number(v) })} 
                        />
                        <Input 
                            label="Alquiler y Combustible ($/Mes)" type="number" value={fixedCosts.alquiler_logistica} 
                            onChange={v => saveFixedCosts({ ...fixedCosts, alquiler_logistica: Number(v) })} 
                        />
                        <Input 
                            label="Mano de Obra ($/Mes)" type="number" value={fixedCosts.mano_obra} 
                            onChange={v => saveFixedCosts({ ...fixedCosts, mano_obra: Number(v) })} 
                        />
                        {taxSettings.regimen === 'Monotributo' && (
                            <Input 
                                label="Monotributo ($/Mes)" type="number" value={fixedCosts.monotributo} 
                                onChange={v => saveFixedCosts({ ...fixedCosts, monotributo: Number(v) })} 
                            />
                        )}
                        <Input 
                            label="Volumen (Unid/Mes)" type="number" value={fixedCosts.volumen_mensual} 
                            onChange={v => saveFixedCosts({ ...fixedCosts, volumen_mensual: Number(v) })} 
                        />
                        <Input 
                            label="CIF (% sobre MP)" type="number" suffix="%" value={fixedCosts.costosIndirectosPct ?? 20} 
                            onChange={v => saveFixedCosts({ ...fixedCosts, costosIndirectosPct: Number(v) })} 
                        />
                    </div>

                    <div className="mt-4 pt-4 border-t border-emerald-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div className="text-xs font-bold text-slate-600">
                            Fórmula de Absorción: <span className="font-mono text-emerald-700 bg-white border px-1.5 py-0.5 rounded">Gastos Mensuales / Volumen Mensual = CIF Unitario</span>
                        </div>
                        <div className="flex gap-4 items-center">
                            <label className="flex items-center gap-2 text-xs font-black uppercase text-slate-700 cursor-pointer">
                                <input 
                                    type="checkbox" checked={fixedCosts.usar_cif_fijo} 
                                    onChange={e => saveFixedCosts({ ...fixedCosts, usar_cif_fijo: e.target.checked })}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                />
                                Usar Absorción de CIF Fijo en lugar de % de MP
                            </label>
                            <div className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-right">
                                <p className="text-[9px] uppercase font-black opacity-75">CIF Unitario Resultante</p>
                                <p className="text-lg font-black font-mono">{fmt(cifUnitarioPool)}</p>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* CONFIGURACIÓN IMPOSITIVA Y COMERCIAL COMÚN */}
            <Card className="p-5 border shadow-sm bg-white rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="col-span-1 md:col-span-4 border-b pb-2 flex justify-between items-center">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Variables Comerciales e Impositivas Generales</h4>
                    <span className="text-[9px] text-slate-400 font-mono">Los costos de ingredientes ya están netos de IVA</span>
                </div>
                <Input 
                    label="Ingresos Brutos (IIBB %)" type="number" suffix="%" value={taxSettings.iibb_pct}
                    onChange={v => saveTaxSettings({ ...taxSettings, iibb_pct: Number(v) })}
                />
                <Input 
                    label="Comisión Canal/Pasarela (%)" type="number" suffix="%" value={taxSettings.comision_canal}
                    onChange={v => saveTaxSettings({ ...taxSettings, comision_canal: Number(v) })}
                />
                <Input 
                    label="Costo de Envío Incluido ($)" type="number" value={taxSettings.costo_envio}
                    onChange={v => saveTaxSettings({ ...taxSettings, costo_envio: Number(v) })}
                />
                <div className="text-xs bg-slate-50 border p-3 rounded-xl flex items-center gap-2">
                    <Info className="text-blue-500 flex-shrink-0" size={16} />
                    <div className="leading-tight">
                        <p className="font-black text-slate-700 uppercase text-[9px] tracking-wide">Régimen Activo</p>
                        <p className="text-[11px] font-bold text-slate-500">
                            {taxSettings.regimen === 'Monotributo' 
                                ? 'Monotributo: Sin IVA en ventas. Cuota fija en CIF.' 
                                : 'Responsable Inscripto: Aplica IVA sobre Neto de Venta.'
                            }
                        </p>
                    </div>
                </div>
            </Card>

            {/* SECCIÓN PRINCIPAL: CATÁLOGO Y CALCULADORA */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                
                {/* PANEL IZQUIERDO: Catálogo */}
                <div className="lg:col-span-4 space-y-3">
                    <Card className="p-4 border shadow-sm bg-white rounded-2xl">
                        {/* Selector de Typology */}
                        <div className="grid grid-cols-3 gap-1 mb-3 bg-slate-100 p-1 rounded-xl">
                            {[
                                { id: 'elaborados', label: 'Elaborados', Icon: Layers },
                                { id: 'fraccionados', label: 'Fracc', Icon: Scale },
                                { id: 'reventa', label: 'Reventa', Icon: Store }
                            ].map(t => (
                                <button 
                                    key={t.id} onClick={() => { setTabTipo(t.id); setSelectedProduct(null); }}
                                    className={`flex items-center justify-center gap-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${
                                        tabTipo === t.id ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:bg-white/40'
                                    }`}
                                >
                                    <t.Icon size={12} />
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        <input
                            type="text" placeholder="Buscar por nombre o código..."
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-slate-400 mb-3 transition-colors"
                        />

                        {/* Filtros de estado */}
                        <div className="flex gap-1 mb-3 flex-wrap border-b pb-2">
                            {['TODOS', 'PUBLICADO', 'BORRADOR', 'SIN_PRECIO'].map(f => (
                                <button key={f} onClick={() => setFilterEstado(f)}
                                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-colors ${filterEstado === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                    {f.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                        {/* LISTADO DE ITEMS */}
                        <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
                            {filteredProducts.map(p => {
                                const lp = listaPreciosMap[p.id];
                                const isDesactualizado = checkIsDesactualizado(p, lp);
                                const estado = lp?.estado || 'SIN_PRECIO';
                                const isSelected = selectedProduct?.id === p.id;
                                const familia = FAMILIAS[p.familia] || FAMILIAS.F;

                                return (
                                    <button 
                                        key={p.id} onClick={() => setSelectedProduct(p)}
                                        className={`w-full text-left px-3 py-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                                            isSelected ? 'border-slate-800 bg-slate-50 shadow-sm' : 'border-slate-100 hover:border-slate-200 bg-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={`w-5 h-5 rounded text-[8px] text-white font-black flex items-center justify-center flex-shrink-0 ${
                                                p.subtipo === 'charcuteria' ? 'bg-red-600' : p.subtipo === 'fraccionado' ? 'bg-purple-600' : p.subtipo === 'reventa' ? 'bg-indigo-600' : familia.color
                                            }`}>{p.subtipo === 'charcuteria' ? 'CH' : p.subtipo === 'fraccionado' ? 'FR' : p.subtipo === 'reventa' ? 'RV' : familia.id}</span>
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-black text-slate-800 truncate">{p.nombre}</p>
                                                <p className="text-[9px] font-mono text-slate-400">{p.codigo}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {isDesactualizado && (
                                                <span className="animate-pulse bg-amber-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                                                    DESACT
                                                </span>
                                            )}
                                            {lp?.precio_publicado && <span className="text-[9px] font-black text-emerald-600 font-mono">{fmt(lp.precio_publicado)}</span>}
                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                                estado === 'PUBLICADO' ? 'bg-emerald-100 text-emerald-700' : estado === 'BORRADOR' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
                                            }`}>{estado.replace('_', ' ')}</span>
                                            <ChevronRight size={12} className="text-slate-300" />
                                        </div>
                                    </button>
                                );
                            })}
                            {filteredProducts.length === 0 && <p className="text-center text-slate-400 text-xs py-8 italic">No hay productos en esta línea.</p>}
                        </div>
                    </Card>
                </div>

                {/* PANEL DERECHO: Editor de Costos y Precios */}
                <div className="lg:col-span-8 space-y-4">
                    {!selectedProduct ? (
                        <Card className="p-12 border shadow-sm bg-slate-50 flex flex-col items-center justify-center text-center rounded-2xl">
                            <Tag size={44} className="text-slate-300 mb-4" />
                            <p className="text-slate-500 font-black uppercase text-xs tracking-widest">Seleccioná un producto del catálogo</p>
                            <p className="text-slate-400 text-xs mt-1">para cargar y evaluar su matriz de costos y precios</p>
                        </Card>
                    ) : localPricing && costos && simulacionPrecio && (
                        <>
                            {/* BLOQUE 1: COSTOS DIRECTOS (COGS) */}
                            <Card className="p-5 border shadow-sm bg-white rounded-2xl">
                                <div className="flex items-center gap-2 mb-4 border-b pb-3 justify-between">
                                    <div className="flex items-center gap-2">
                                        <Layers size={16} className="text-slate-800" />
                                        <h4 className="text-xs font-black uppercase tracking-tight text-slate-800">
                                            Costos Directos (COGS) — {selectedProduct.nombre}
                                        </h4>
                                    </div>
                                    <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded uppercase">
                                        {selectedProduct.subtipo.toUpperCase()}
                                    </span>
                                </div>

                                {/* I. Materia Prima / Receta Estandar */}
                                <div className="space-y-3">
                                    {selectedProduct.subtipo === 'panaderia' && (
                                        <div className="bg-slate-50 p-4 rounded-xl border space-y-2">
                                            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex justify-between">
                                                <span>Ficha Técnica (Lote: {Number(selectedProduct.original.lote_minimo || 1)} {selectedProduct.original.formato_venta === 'Unidad' ? 'Unid' : 'Kg'})</span>
                                                <span className="font-mono text-slate-500">Merma Cocción: {selectedProduct.original.merma}%</span>
                                            </p>
                                            <div className="max-h-[150px] overflow-y-auto space-y-1">
                                                {selectedProduct.original.details?.map(d => {
                                                    const ing = ingredients.find(i => i.id === d.ingredientId);
                                                    return (
                                                        <div key={d.ingredientId} className="flex justify-between text-xs py-0.5 border-b border-slate-100">
                                                            <span className="text-slate-600">{ing?.name || 'Insumo'}</span>
                                                            <span className="font-mono text-slate-500">
                                                                {d.gramos ? `${d.gramos} g` : `${d.porcentaje}%`} @ {fmt(ing?.costo_estandar)}/g
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t font-black text-xs text-slate-800">
                                                <span>Total Materia Prima Lote</span>
                                                <span className="font-mono">{fmt(costos.costo_mp * costos.unidades_rinde)}</span>
                                            </div>
                                        </div>
                                    )}

                                    {selectedProduct.subtipo === 'charcuteria' && (
                                        <div className="bg-slate-50 p-4 rounded-xl border space-y-2">
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-slate-400">
                                                <span>BOM Base Cárnica (Merma Secado: {selectedProduct.original.merma_secado_objetivo}%)</span>
                                                <div className="flex items-center gap-2">
                                                    <span>Formato:</span>
                                                    <select 
                                                        value={localPricing.charc_config?.formato_vta || 'unidad'} 
                                                        onChange={e => setLocalPricing({
                                                            ...localPricing, 
                                                            charc_config: { ...localPricing.charc_config, formato_vta: e.target.value }
                                                        })}
                                                        className="bg-white border rounded px-1.5 py-0.5 text-[8px] font-bold outline-none"
                                                    >
                                                        <option value="unidad">Por Unidad</option>
                                                        <option value="kg">Por Kilogramo</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {localPricing.charc_config?.formato_vta === 'unidad' && (
                                                <div className="flex items-center gap-3 p-2 bg-white rounded-lg border w-full">
                                                    <span className="text-[10px] font-bold text-slate-600">Peso Pieza Venta (Gramos)</span>
                                                    <input 
                                                        type="number" value={localPricing.charc_config?.peso_unidad_vta || 350}
                                                        onChange={val => setLocalPricing({
                                                            ...localPricing,
                                                            charc_config: { ...localPricing.charc_config, peso_unidad_vta: Number(val.target.value) }
                                                        })}
                                                        className="w-20 border rounded px-1.5 py-0.5 font-mono text-xs text-center ml-auto"
                                                    />
                                                </div>
                                            )}

                                            <div className="max-h-[150px] overflow-y-auto space-y-1">
                                                {selectedProduct.original.details?.map(d => {
                                                    const ing = ingredients.find(i => i.id === d.ingredientId);
                                                    return (
                                                        <div key={d.ingredientId} className="flex justify-between text-xs py-0.5 border-b border-slate-100">
                                                            <span className="text-slate-600">
                                                                {ing?.name || 'Insumo'} 
                                                                <span className="text-[8px] bg-slate-200 text-slate-600 px-1 rounded ml-1 uppercase">{d.categoria_tecnologica}</span>
                                                            </span>
                                                            <span className="font-mono text-slate-500">
                                                                {d.gramos} g @ {fmt(ing?.costo_estandar)}/g
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t font-black text-xs text-slate-800">
                                                <span>Total Lote Terminado ({localPricing.charc_config?.formato_vta === 'unidad' ? 'Pieza' : 'Kg'})</span>
                                                <span className="font-mono text-emerald-600">
                                                    MP: {fmt(costos.costo_mp)} {costos.costo_mo > 0 && `+ MO: ${fmt(costos.costo_mo)}`}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {selectedProduct.subtipo === 'fraccionado' && (
                                        <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
                                            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Configuración de Fraccionamiento Unitario</p>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <Select 
                                                    label="Insumo a Granel" value={localPricing.fracc_config?.insumo_granel_id} 
                                                    onChange={v => setLocalPricing({
                                                        ...localPricing, 
                                                        fracc_config: { ...localPricing.fracc_config, insumo_granel_id: v }
                                                    })}
                                                >
                                                    {ingredients.filter(i => i.tipo === 'insumo').map(i => (
                                                        <option key={i.id} value={i.id}>{i.name} ({fmt(i.costo_estandar)}/g)</option>
                                                    ))}
                                                </Select>
                                                <Input 
                                                    label="Peso del Paquete (g)" type="number" value={localPricing.fracc_config?.peso_porcion_g} 
                                                    onChange={v => setLocalPricing({
                                                        ...localPricing, 
                                                        fracc_config: { ...localPricing.fracc_config, peso_porcion_g: Number(v) }
                                                    })}
                                                />
                                                <Input 
                                                    label="Merma Envasado (%)" type="number" suffix="%" value={localPricing.fracc_config?.merma_fracc} 
                                                    onChange={v => setLocalPricing({
                                                        ...localPricing, 
                                                        fracc_config: { ...localPricing.fracc_config, merma_fracc: Number(v) }
                                                    })}
                                                />
                                            </div>
                                            <div className="flex justify-between items-center text-xs font-bold pt-2 border-t text-slate-700">
                                                <span>Costo de Producto Granel por Unidad (con merma)</span>
                                                <span className="font-mono text-slate-900">{fmt(costos.costo_mp)}</span>
                                            </div>
                                        </div>
                                    )}

                                    {selectedProduct.subtipo === 'reventa' && (
                                        <div className="bg-slate-50 p-4 rounded-xl border flex justify-between items-center">
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Adquisición directa</p>
                                                <p className="text-xs font-bold text-slate-700 mt-1">Costo de compra al proveedor</p>
                                            </div>
                                            <p className="text-xl font-mono font-black text-slate-800">{fmt(costos.costo_mp)}</p>
                                        </div>
                                    )}

                                    {/* II. Envases y Packaging */}
                                    <div className="pt-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1"><Package size={12} /> Packaging y Empaque</p>
                                            <span className="text-[9px] text-slate-400">Asignados a la unidad de venta</span>
                                        </div>
                                        {localPricing.empaques.length === 0 && (
                                            <p className="text-xs text-slate-400 italic text-center py-2 bg-slate-50 rounded-xl border border-dashed">Sin empaques asignados.</p>
                                        )}
                                        {localPricing.empaques.map((e, idx) => (
                                            <div key={idx} className="flex items-center gap-2 py-1.5 border-b border-dashed border-slate-100">
                                                <span className="text-xs font-bold text-slate-700 flex-1">{e.nombre}</span>
                                                <div className="flex items-center gap-1">
                                                    <input type="number" step="0.1" min="0.1" value={e.cantidad} onChange={ev => updateEmpaqueQty(idx, ev.target.value)}
                                                        className="w-14 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono text-center outline-none focus:border-slate-500" />
                                                    <span className="text-[9px] text-slate-400">{e.unidad}</span>
                                                </div>
                                                <span className="font-mono font-black text-xs text-purple-600 w-24 text-right">{fmt(Number(e.cantidad) * Number(e.costo_unitario))}</span>
                                                <button onClick={() => removeEmpaque(idx)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                                            </div>
                                        ))}

                                        {/* Selector para agregar empaque */}
                                        <div className="mt-2">
                                            <select 
                                                onChange={e => { if (e.target.value) { addEmpaque(e.target.value); e.target.value = ''; } }}
                                                className="w-full border border-dashed border-emerald-300 bg-emerald-50 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-emerald-500 text-slate-600 cursor-pointer"
                                            >
                                                <option value="">+ Vincular empaque/etiqueta/caja...</option>
                                                {empaqueIngredients.filter(m => !localPricing.empaques.find(e => e.ingrediente_id === m.id)).map(m => (
                                                    <option key={m.id} value={m.id}>{m.name} — {fmt(m.costo_estandar)}/{m.unidad_compra || 'unidad'}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* TOTAL DIRECTO */}
                                <div className="mt-4 bg-slate-900 text-white rounded-xl p-4 flex justify-between items-center">
                                    <div>
                                        <p className="text-[9px] uppercase text-slate-400 font-black">Costo Directo Total (Materia Prima + Empaque)</p>
                                        <p className="text-xs text-slate-400">neto de IVA</p>
                                    </div>
                                    <p className="text-xl font-black font-mono text-emerald-400">
                                        {fmt(costos.costo_mp + costos.costo_mo + costos.costo_empaque_total)}
                                    </p>
                                </div>
                            </Card>

                            {/* BLOQUE 2: ABSORCIÓN DE COSTOS INDIRECTOS (CIF) */}
                            <Card className="p-5 border shadow-sm bg-white rounded-2xl">
                                <div className="flex items-center gap-2 mb-3 border-b pb-3">
                                    <Settings size={16} className="text-blue-600" />
                                    <h4 className="text-xs font-black uppercase tracking-tight text-slate-800">Costos Indirectos (CIF) Asignados</h4>
                                </div>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 p-3 bg-slate-50 border rounded-xl">
                                    <div>
                                        <p className="text-xs font-black text-slate-800">
                                            {fixedCosts.usar_cif_fijo ? 'Cuota de Absorción Fija por Unidad' : 'Absorción por Porcentaje de Materia Prima'}
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            {fixedCosts.usar_cif_fijo 
                                                ? `Gastos Fijos consolidados divididos el volumen estimado (${fixedCosts.volumen_mensual} u/mes).`
                                                : `Aplica un ${config?.finanzas?.costosIndirectosPct || 20}% sobre el costo directo de materia prima.`
                                            }
                                        </p>
                                    </div>
                                    <div className="bg-white border-2 border-dashed border-blue-300 px-4 py-2 rounded-xl text-right ml-auto">
                                        <p className="text-[8px] uppercase font-black text-slate-400">CIF Unitario</p>
                                        <p className="text-sm font-black font-mono text-blue-700">{fmt(costos.cif_unitario)}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-4 pt-2">
                                    <div className="bg-slate-100 p-3 rounded-xl">
                                        <p className="text-[8px] uppercase text-slate-500 font-bold">Costo Directo Unitario</p>
                                        <p className="text-base font-black font-mono text-slate-700">{fmt(costos.costo_mp + costos.costo_mo + costos.costo_empaque_total)}</p>
                                    </div>
                                    <div className="bg-emerald-500 text-white p-3 rounded-xl shadow-lg shadow-emerald-100">
                                        <p className="text-[8px] uppercase text-emerald-100 font-bold">Costo de Producción Total</p>
                                        <p className="text-base font-black font-mono text-white">{fmt(costos.costo_produccion_total)}</p>
                                    </div>
                                </div>
                            </Card>

                            {/* BLOQUE 3: SIMULADOR DE MARGEN Y PRECIO (FORMULA DE DIVISION) */}
                            <Card className="p-5 border shadow-sm bg-white rounded-2xl space-y-4">
                                <div className="flex items-center gap-2 mb-1 border-b pb-3 justify-between">
                                    <div className="flex items-center gap-2">
                                        <Percent size={16} className="text-emerald-600" />
                                        <h4 className="text-xs font-black uppercase tracking-tight text-slate-800">
                                            Estrategia de Precio y Simulación Impositiva
                                        </h4>
                                    </div>
                                    <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 font-bold px-2 py-0.5 rounded">
                                        Fórmula de Margen sobre Precio
                                    </span>
                                </div>

                                {/* Slider de Margen Target */}
                                <div className="p-4 bg-slate-50 border rounded-xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-slate-500">Margen de Ganancia Target (sobre Precio)</p>
                                            <p className="text-[9px] text-slate-400">Representa qué % del precio final es utilidad neta</p>
                                        </div>
                                        <span className="text-2xl font-black text-slate-900">{localPricing.margen_pct}%</span>
                                    </div>
                                    <input type="range" min="5" max="90" step="5" value={localPricing.margen_pct}
                                        onChange={e => setLocalPricing(prev => ({ ...prev, margen_pct: Number(e.target.value) }))}
                                        className="w-full accent-slate-800" />
                                    <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                                        <span>5% (Volumen)</span>
                                        <span>90% (Artesanal Exclusivo)</span>
                                    </div>
                                    
                                    <div className="mt-2 text-[10px] font-semibold text-slate-500 text-center border-t pt-1.5">
                                        Markup sobre Costo Equivalente: <strong className="font-mono text-slate-700">+{simulacionPrecio.markupEquivalentePct.toFixed(1)}%</strong>
                                    </div>
                                </div>

                                {/* Visualización de la Fórmula */}
                                <div className="bg-slate-900 text-slate-300 p-4 rounded-xl font-mono text-[10px] space-y-1">
                                    <p className="text-slate-500 font-bold border-b border-slate-800 pb-1 flex items-center justify-between">
                                        <span>CÁLCULO FINANCIERO (PRECIO NETO)</span>
                                        <span className="text-emerald-500">Fórmula de División</span>
                                    </p>
                                    <p className="text-center py-2 text-xs text-white">
                                        Precio = Costo ({costos.costo_unitario_total.toFixed(2)}) / [ 1 - ( Margen ({localPricing.margen_pct}%) + Comis ({taxSettings.comision_canal}%) + IIBB ({taxSettings.iibb_pct}%) ) ]
                                    </p>
                                    <div className="flex justify-between pt-1 border-t border-slate-800 font-black text-[11px]">
                                        <span className="text-slate-400">PRECIO NETO SUGERIDO (SIN IVA):</span>
                                        <span className="text-emerald-400 text-sm">{fmt(simulacionPrecio.precioNetoSugerido)}</span>
                                    </div>
                                </div>

                                {/* Desglose del Precio Final de Venta */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                                    <div className="border p-2.5 rounded-xl bg-slate-50">
                                        <p className="text-[8px] uppercase text-slate-400 font-black">Costo Total</p>
                                        <p className="text-sm font-black font-mono text-slate-700 mt-0.5">{fmt(costos.costo_unitario_total)}</p>
                                        <span className="text-[8px] text-slate-400">({((costos.costo_unitario_total / simulacionPrecio.precioCanalFijado) * 100).toFixed(0)}% del precio)</span>
                                    </div>
                                    <div className="border p-2.5 rounded-xl bg-slate-50">
                                        <p className="text-[8px] uppercase text-slate-400 font-black">Comisión Canal</p>
                                        <p className="text-sm font-black font-mono text-orange-600 mt-0.5">{fmt(simulacionPrecio.comisionesP)}</p>
                                        <span className="text-[8px] text-slate-400">({taxSettings.comision_canal}%)</span>
                                    </div>
                                    <div className="border p-2.5 rounded-xl bg-slate-50">
                                        <p className="text-[8px] uppercase text-slate-400 font-black">Ingresos Brutos</p>
                                        <p className="text-sm font-black font-mono text-red-600 mt-0.5">{fmt(simulacionPrecio.iibbP)}</p>
                                        <span className="text-[8px] text-slate-400">({taxSettings.iibb_pct}%)</span>
                                    </div>
                                    <div className="border p-2.5 rounded-xl bg-emerald-50 border-emerald-200">
                                        <p className="text-[8px] uppercase text-emerald-700 font-black">Margen Neto Real</p>
                                        <p className="text-sm font-black font-mono text-emerald-700 mt-0.5">{fmt(simulacionPrecio.margenRealP)}</p>
                                        <span className="text-[8px] text-emerald-600">({simulacionPrecio.margenRealPct.toFixed(1)}% Real)</span>
                                    </div>
                                </div>

                                {/* Stacked Progress Bar representativo del precio final */}
                                <div className="space-y-1.5 pt-2">
                                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Contribución de Ingresos (Composición del Precio)</p>
                                    <div className="w-full h-4 rounded-full overflow-hidden flex border">
                                        {/* Cost */}
                                        <div 
                                            style={{ width: `${(costos.costo_unitario_total / simulacionPrecio.precioCanalFijado) * 100}%` }}
                                            className="bg-slate-500 h-full flex items-center justify-center text-[7px] text-white font-bold"
                                            title={`Costo: ${fmt(costos.costo_unitario_total)}`}
                                        >
                                            Costo
                                        </div>
                                        {/* Comisión */}
                                        {taxSettings.comision_canal > 0 && (
                                            <div 
                                                style={{ width: `${taxSettings.comision_canal}%` }}
                                                className="bg-orange-500 h-full flex items-center justify-center text-[7px] text-white font-bold"
                                                title={`Comisión: ${fmt(simulacionPrecio.comisionesP)}`}
                                            >
                                                Com
                                            </div>
                                        )}
                                        {/* IIBB */}
                                        {taxSettings.iibb_pct > 0 && (
                                            <div 
                                                style={{ width: `${taxSettings.iibb_pct}%` }}
                                                className="bg-red-500 h-full flex items-center justify-center text-[7px] text-white font-bold"
                                                title={`IIBB: ${fmt(simulacionPrecio.iibbP)}`}
                                            >
                                                IIBB
                                            </div>
                                        )}
                                        {/* Margen */}
                                        <div 
                                            style={{ width: `${simulacionPrecio.margenRealPct}%` }}
                                            className="bg-emerald-500 h-full flex items-center justify-center text-[7px] text-white font-bold"
                                            title={`Margen Real: ${fmt(simulacionPrecio.margenRealP)}`}
                                        >
                                            Margen
                                        </div>
                                    </div>
                                </div>

                                {/* Selección impositiva (RI) */}
                                {taxSettings.regimen === 'Responsable Inscripto' && (
                                    <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                        <div>
                                            <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded uppercase font-black">Neto de IVA + IVA</span>
                                            <p className="text-xs font-bold text-slate-700 mt-1">Cálculo de IVA sobre Precio de Venta Neto</p>
                                        </div>
                                        <div className="flex gap-4 items-center ml-auto">
                                            <Select 
                                                value={localPricing.iva_venta || 21} 
                                                onChange={v => setLocalPricing({ ...localPricing, iva_venta: Number(v) })}
                                            >
                                                <option value="21">IVA 21.0% (Tasa general)</option>
                                                <option value="10.5">IVA 10.5% (Panificados reducidos)</option>
                                                <option value="0">Exento (0%)</option>
                                            </Select>
                                            <div className="text-right">
                                                <p className="text-[8px] uppercase text-slate-400 font-bold">IVA: {fmt(simulacionPrecio.ivaPesos)}</p>
                                                <p className="text-base font-black font-mono text-blue-700">PVP: {fmt(simulacionPrecio.pvpFinal)}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </Card>

                            {/* BLOQUE 4: PUBLICACIÓN Y CANALES */}
                            <Card className="p-5 border shadow-sm bg-white rounded-2xl">
                                <div className="flex items-center gap-2 mb-4 border-b pb-3 justify-between">
                                    <div className="flex items-center gap-2">
                                        <Store size={16} className="text-slate-800" />
                                        <h4 className="text-xs font-black uppercase tracking-tight text-slate-800">Publicación Multi-Canal</h4>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                        localPricing.estado === 'PUBLICADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                        {localPricing.estado}
                                    </span>
                                </div>

                                <div className="space-y-3 mb-4">
                                    {[
                                        { key: 'precio_mostrador', label: 'Mostrador / Venta Directa', Icon: Store, color: 'blue' },
                                        { key: 'precio_distribuidor', label: 'Distribuidor / Mayorista', Icon: Truck, color: 'orange' },
                                        { key: 'precio_cadena', label: 'Cadenas / Supermercados', Icon: ShoppingCart, color: 'purple' },
                                    ].map(({ key, label, Icon, color }) => {
                                        const isPrincipal = localPricing.canal_principal === key.replace('precio_', '');
                                        return (
                                            <div key={key} className={`flex items-center gap-3 p-3 border rounded-xl hover:bg-slate-50 transition-colors ${
                                                isPrincipal ? 'border-slate-800 bg-slate-50/50' : 'border-slate-200 bg-white'
                                            }`}>
                                                <input type="radio" name="canal_principal" value={key.replace('precio_', '')}
                                                    checked={isPrincipal}
                                                    onChange={() => setLocalPricing(prev => ({ ...prev, canal_principal: key.replace('precio_', '') }))}
                                                    className="accent-slate-900 w-4 h-4 cursor-pointer" />
                                                <Icon size={16} className={`text-${color}-600 flex-shrink-0`} />
                                                <span className="text-xs font-bold text-slate-700 flex-1">{label}</span>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                                                    <input type="number" step="0.01" placeholder={simulacionPrecio.precioNetoSugerido.toFixed(2)}
                                                        value={localPricing[key] || ''} onChange={e => setLocalPricing(prev => ({ ...prev, [key]: e.target.value }))}
                                                        className="border border-slate-200 rounded-lg pl-6 pr-3 py-2 text-sm font-black font-mono w-36 outline-none focus:border-slate-500 text-right" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <textarea 
                                    value={localPricing.user_notes || ''} 
                                    onChange={e => setLocalPricing({ ...localPricing, user_notes: e.target.value })}
                                    placeholder="Notas de costeo o justificación de precios (ej. precio acordado con mayorista)..."
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-slate-400 bg-slate-50 resize-none h-20 mb-4 transition-colors" 
                                />

                                <div className="flex gap-3">
                                    <Button variant="secondary" className="flex-1 py-3 font-black uppercase text-xs" onClick={() => save(false)} disabled={!!savingId}>
                                        💾 Guardar Borrador
                                    </Button>
                                    <Button variant="primary" className="flex-[2] py-3 font-black uppercase text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-100 flex items-center justify-center gap-1.5" onClick={() => save(true)} disabled={!!savingId}>
                                        {savingId ? <span className="animate-pulse flex items-center gap-1.5"><Zap size={14} /> Publicando...</span>
                                            : <><CheckCircle2 size={14} /> Publicar Precio Activo</>}
                                    </Button>
                                </div>
                            </Card>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}
