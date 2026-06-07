import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Hash, Calculator, ChevronUp, Eye, Wrench, Layers, PieChart, Trash2, Tag, ArrowRight, DollarSign, Printer } from 'lucide-react';
import { Card, Button, Input, Select, FAMILIAS } from '../bakery_erp';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import CharcuteriaView from './CharcuteriaView';
import BulkImportModal from '../BulkImportModal';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EMPTY_FORM = {
    id: null, codigo: '', nombre: '', familia: 'F', ver: 1, wip: false, merma: 15,
    formato_venta: 'Unidad', peso_unidad: 100, horas_hombre: 1,
    loteMinimo: 1, logica_formula: 'panadero', details: [],
    tiempo_pesaje: 5, tiempo_amasado: 15, tiempo_armado: 20, tiempo_fermentacion: 60, tiempo_horneado: 25, capacidad_horno: 100
};

export default function EngineeringView({ 
    recipes = [], ingredients = [], setRecipes, setIngredients, showToast, config,
    charcRecetas = [], addCharcReceta, updateCharcReceta, deleteCharcReceta, setCharcRecetas
}) {
    const [subTab, setSubTab] = useState('panaderia'); // 'panaderia' | 'charcuteria'
    const [showAdd, setShowAdd] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRows, setExpandedRows] = useState({});
    const [publishedPrice, setPublishedPrice] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [showBulkImport, setShowBulkImport] = useState(false);

    // Sorting states
    const [sortKey, setSortKey] = useState('nombre_producto');
    const [sortDesc, setSortDesc] = useState(false);

    const handleSort = (key) => {
        if (sortKey === key) {
            setSortDesc(!sortDesc);
        } else {
            setSortKey(key);
            setSortDesc(false);
        }
    };

    const renderSortIndicator = (targetKey) => {
        if (sortKey !== targetKey) return null;
        return sortDesc ? ' ↓' : ' ↑';
    };

    const toggleRow = (id) => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

    // Auto-SKU
    useEffect(() => {
        if (!form.id && showAdd) {
            const prefix = form.wip ? `WIP-${form.familia}` : `FG-${form.familia}`;
            let max = 0;
            recipes.forEach(r => {
                if (r.codigo?.startsWith(prefix)) {
                    const n = parseInt(r.codigo.split('-').pop());
                    if (!isNaN(n) && n > max) max = n;
                }
            });
            setForm(prev => ({ ...prev, codigo: `${prefix}-${String(max + 1).padStart(3, '0')}` }));
        }
    }, [form.familia, form.wip, showAdd, recipes]);

    // Fetch published price for right panel (Opción A)
    useEffect(() => {
        if (!form.id) { setPublishedPrice(null); return; }
        supabase.from('lista_precios').select('precio_publicado, estado, margen_pct')
            .eq('receta_id', form.id).maybeSingle()
            .then(({ data }) => setPublishedPrice(data || null));
    }, [form.id]);

    // Recursive cost calculator helper
    const getIngredientCost = React.useCallback((ing, visited = new Set()) => {
        if (!ing) return 0;
        if (visited.has(ing.id)) return 0; // Avoid circular refs

        if (!ing.es_subensamble) {
            return Number(ing.costo_estandar || 0);
        }

        // Find recipe for WIP by code or name
        const recipe = recipes.find(r => r.codigo === ing.codigo || r.nombre_producto === ing.name?.replace('[WIP] ', ''));
        if (!recipe) return Number(ing.costo_estandar || 0);

        const visitedNext = new Set(visited);
        visitedNext.add(ing.id);

        const costo_mp = recipe.details?.reduce((acc, d) => {
            const detailIng = ingredients.find(i => i.id === d.ingredientId);
            const costPerGram = getIngredientCost(detailIng, visitedNext);
            return acc + (Number(d.gramos || 0) * costPerGram);
        }, 0) || 0;

        const t_pesaje = Number(recipe.tiempo_pesaje || 5);
        const t_amasado = Number(recipe.tiempo_amasado || 15);
        const t_armado = Number(recipe.tiempo_armado || 20);
        const t_horneado = Number(recipe.tiempo_horneado || 25);
        const cap_horno = Number(recipe.capacidad_horno || 100);

        const costo_mo = ((t_pesaje + t_amasado + t_armado + t_horneado) / 60) * (config?.finanzas?.costoHoraHombre || 4500);
        const recipeLoteUnidades = recipe.formato_venta === 'Unidad' && Number(recipe.peso_unidad) > 0
            ? Number(recipe.lote_minimo || 1)
            : (Number(recipe.lote_minimo || 1) * 1000) / (Number(recipe.peso_unidad) || 1);
        const recipeCiclosHorno = cap_horno > 0 ? (recipeLoteUnidades / cap_horno) : 1;
        const costo_horno = (t_horneado / 60) * (config?.finanzas?.costoHoraHorno || 2500) * recipeCiclosHorno;

        const costo_cif = costo_mp * ((config?.finanzas?.costosIndirectosPct || 20) / 100);
        const costo_total = costo_mp + costo_mo + costo_horno + costo_cif;

        const pesoFinalG = Number(recipe.peso_final) || 1;
        return costo_total / pesoFinalG;
    }, [recipes, ingredients, config]);

    // Processed recipes with computed costs for filtering & sorting
    const processedRecipes = useMemo(() => {
        const list = recipes.map(r => {
            const costo_mp = r.details?.reduce((acc, d) => {
                const ing = ingredients.find(i => i.id === d.ingredientId);
                return acc + (Number(d.gramos || 0) * getIngredientCost(ing));
            }, 0) || 0;
            const costo_mo = (Number(r.horas_hombre) || 0) * (config?.finanzas?.costoHoraHombre || 4500);
            const costo_cif = costo_mp * ((config?.finanzas?.costosIndirectosPct || 20) / 100);
            const costo_total_batch = costo_mp + costo_mo + costo_cif;
            let unidades_rinde = r.formato_venta === 'Unidad' && Number(r.peso_unidad) > 0
                ? Math.floor(Number(r.peso_final) / Number(r.peso_unidad))
                : Number(r.peso_final) / 1000;
            unidades_rinde = unidades_rinde || 1;
            const costo_unitario = costo_total_batch / unidades_rinde;
            const precio_sugerido = costo_unitario * (1 + ((config?.finanzas?.margenGanancia || 150) / 100));

            return {
                ...r,
                costo_mp,
                costo_mo,
                costo_cif,
                costo_total_batch,
                unidades_rinde,
                costo_unitario,
                precio_sugerido
            };
        });

        // Filter
        let result = list;
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            result = result.filter(r => 
                r.nombre_producto?.toLowerCase().includes(q) ||
                r.codigo?.toLowerCase().includes(q)
            );
        }

        // Sort
        if (sortKey) {
            result.sort((a, b) => {
                let valA = a[sortKey];
                let valB = b[sortKey];

                if (sortKey === 'costo_unitario' || sortKey === 'precio_sugerido' || sortKey === 'peso_final') {
                    valA = Number(valA || 0);
                    valB = Number(valB || 0);
                    return sortDesc ? valB - valA : valA - valB;
                }

                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();
                return sortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
            });
        }

        return result;
    }, [recipes, searchTerm, sortKey, sortDesc, ingredients, config, getIngredientCost]);

    // Derivados
    const isBatchFormula = form.logica_formula === 'batch';

    // Peso FINAL del lote (producto terminado, para mostrar al usuario)
    const kgLoteFinal = useMemo(() => {
        if (form.formato_venta === 'Unidad') return (Number(form.loteMinimo) * Number(form.peso_unidad)) / 1000;
        return Number(form.loteMinimo);
    }, [form.formato_venta, form.loteMinimo, form.peso_unidad]);

    // Peso BRUTO del lote (masa cruda antes de merma) — base real para ingredientes
    const kgLoteBruto = useMemo(() => {
        const mermaFactor = 1 - (Number(form.merma || 0) / 100);
        return mermaFactor > 0 ? kgLoteFinal / mermaFactor : kgLoteFinal;
    }, [kgLoteFinal, form.merma]);

    // Gramos por ingrediente según lógica activa
    //   % Panadero → auto-escala desde kgLoteBruto (Opción 1)
    //   % Batch    → usa los gramos ingresados por el usuario
    const detailsConGramos = useMemo(() => {
        if (isBatchFormula) {
            return form.details.map(d => ({ ...d, gramos: Number(d.gramos || 0) }));
        }
        // % Panadero: la base no es fija (1kg) — escala para cumplir el lote mínimo
        const sumPct = form.details.reduce((acc, d) => acc + Number(d.porcentaje || 0), 0);
        if (sumPct === 0) return form.details.map(d => ({ ...d, gramos: 0 }));
        const masaBruta = kgLoteBruto * 1000; // en gramos
        const baseHarina = masaBruta / (sumPct / 100); // harina base escalada
        return form.details.map(d => ({
            ...d,
            gramos: Number(d.porcentaje || 0) > 0 ? Math.round((Number(d.porcentaje) / 100) * baseHarina) : 0
        }));
    }, [form.details, isBatchFormula, kgLoteBruto]);

    // pesoCrudo y pesoFinal derivados de los gramos calculados (no hardcodeados)
    const pesoCrudo = detailsConGramos.reduce((a, b) => a + Number(b.gramos || 0), 0);
    const pesoFinal = pesoCrudo * (1 - (Number(form.merma || 0) / 100));

    const hasFlourBase = form.details.some(d => Number(d.porcentaje) === 100);
    const validDetails = detailsConGramos.filter(d => d.ingredientId && d.gramos > 0);
    const canSave = form.nombre && form.codigo && (isBatchFormula ? validDetails.length > 0 : hasFlourBase);

    // Suma de % Batch — debe ser exactamente 100%
    const pctBatchSum = isBatchFormula
        ? form.details.reduce((a, d) => a + Number(d.pctBatchInput || 0), 0)
        : 0;



    // Panel de costos en tiempo real (Opción A) — usa detailsConGramos
    const panelCostos = useMemo(() => {
        const costo_mp = detailsConGramos.reduce((acc, d) => {
            const ing = ingredients.find(i => i.id === d.ingredientId);
            return acc + (d.gramos * getIngredientCost(ing));
        }, 0);
        
        const tiempo_pesaje = Number(form.tiempo_pesaje || 5);
        const tiempo_amasado = Number(form.tiempo_amasado || 15);
        const tiempo_armado = Number(form.tiempo_armado || 20);
        const tiempo_horneado = Number(form.tiempo_horneado || 25);
        const capacidad_horno = Number(form.capacidad_horno || 100);

        const costo_mo = ((tiempo_pesaje + tiempo_amasado + tiempo_armado + tiempo_horneado) / 60) * (config?.finanzas?.costoHoraHombre || 4500);
        
        const loteUnidades = form.formato_venta === 'Unidad' && Number(form.peso_unidad) > 0
            ? Number(form.loteMinimo)
            : (Number(form.loteMinimo) * 1000) / (Number(form.peso_unidad) || 1);
        const ciclosHorno = capacidad_horno > 0 ? (loteUnidades / capacidad_horno) : 1;
        const costo_horno = (tiempo_horneado / 60) * (config?.finanzas?.costoHoraHorno || 2500) * ciclosHorno;

        const costo_cif = costo_mp * ((config?.finanzas?.costosIndirectosPct || 20) / 100);
        const costo_total = costo_mp + costo_mo + costo_horno + costo_cif;
        let unidades = form.formato_venta === 'Unidad' && Number(form.peso_unidad) > 0
            ? Math.floor(pesoFinal / Number(form.peso_unidad))
            : pesoFinal / 1000;
        unidades = unidades || 1;
        return { costo_mp, costo_mo, costo_horno, costo_cif, costo_total, costo_unitario: costo_total / unidades, unidades };
    }, [detailsConGramos, form.tiempo_pesaje, form.tiempo_amasado, form.tiempo_armado, form.tiempo_horneado, form.capacidad_horno, form.formato_venta, form.peso_unidad, form.loteMinimo, pesoFinal, ingredients, config, getIngredientCost]);

    const save = async () => {
        if (!canSave) return;
        // CRIT-1: nunca insertar filas con ingrediente vacío
        // Usar detailsConGramos: para Panadero tienen gramos calculados, para Batch los ingresados
        const safeDetails = detailsConGramos.filter(d => d.ingredientId && d.gramos > 0);
        const recipeData = {
            codigo: form.codigo.toUpperCase(), nombre_producto: form.nombre, familia: form.familia,
            version: form.ver, es_subensamble: form.wip, merma: form.merma,
            formato_venta: form.formato_venta,
            peso_unidad: form.formato_venta === 'Unidad' ? Number(form.peso_unidad) : null,
            peso_crudo: pesoCrudo, peso_final: pesoFinal,
            horas_hombre: (Number(form.tiempo_pesaje || 5) + Number(form.tiempo_amasado || 15) + Number(form.tiempo_armado || 20) + Number(form.tiempo_horneado || 25)) / 60, 
            costo_empaque: 0,
            lote_minimo: Number(form.loteMinimo), unidad_lote: 'kg',
            logica_formula: form.logica_formula,
            tiempo_pesaje: Number(form.tiempo_pesaje || 5),
            tiempo_amasado: Number(form.tiempo_amasado || 15),
            tiempo_armado: Number(form.tiempo_armado || 20),
            tiempo_fermentacion: Number(form.tiempo_fermentacion || 60),
            tiempo_horneado: Number(form.tiempo_horneado || 25),
            capacidad_horno: Number(form.capacidad_horno || 100),
        };
        if (form.id && typeof form.id === 'string' && (form.id.includes('-') || form.id.length > 20)) {
            const { error: errRec } = await supabase.from('recetas').update(recipeData).eq('id', form.id);
            if (errRec) { showToast("Error BD: " + errRec.message, "error"); return; }
            await supabase.from('receta_ingredientes').delete().eq('receta_id', form.id);
            const { error: errDet } = await supabase.from('receta_ingredientes').insert(
                safeDetails.map(d => ({ receta_id: form.id, ingrediente_id: d.ingredientId, porcentaje: d.porcentaje !== '' && d.porcentaje != null ? Number(d.porcentaje) : null, gramos: d.gramos }))
            );
            if (errDet) { showToast("Error BD Escandallo: " + errDet.message, "error"); return; }
            setRecipes(recipes.map(r => r.id === form.id ? { ...r, ...recipeData, details: form.details, loteMinimo: recipeData.lote_minimo, unidadLote: 'kg' } : r));
            showToast("Ficha técnica actualizada en BD.");
        } else {
            const { data, error: errRec } = await supabase.from('recetas').insert([recipeData]).select();
            if (errRec) { showToast("Error BD: " + errRec.message, "error"); return; }
            const newId = data[0].id;
            const { error: errDet } = await supabase.from('receta_ingredientes').insert(
                safeDetails.map(d => ({ receta_id: newId, ingrediente_id: d.ingredientId, porcentaje: d.porcentaje !== '' && d.porcentaje != null ? Number(d.porcentaje) : null, gramos: d.gramos }))
            );
            if (errDet) { showToast("Error BD Escandallo: " + errDet.message, "error"); return; }
            setRecipes([{ ...data[0], details: form.details, loteMinimo: recipeData.lote_minimo, unidadLote: 'kg' }, ...recipes]);
            if (form.wip) {
                const { data: wipData } = await supabase.from('ingredientes').insert([{
                    codigo: form.codigo.toUpperCase(), name: `[WIP] ${form.nombre}`,
                    unidad_compra: 'Gramos', es_subensamble: true,
                    familia: 'WIP (Producción)', almacen: 'Cámara de Frío 2 (WIP)', costo_estandar: 0
                }]).select();
                if (wipData) setIngredients([...ingredients, wipData[0]]);
            }
            showToast(`Ficha ${form.codigo} sincronizada permanentemente.`);
        }
        setShowAdd(false);
        setForm(EMPTY_FORM);
    };

    const handleEdit = (rec) => {
        setForm({
            id: rec.id, codigo: rec.codigo || '', nombre: rec.nombre_producto, familia: rec.familia,
            ver: (rec.version || 1) + 1, wip: !!rec.es_subensamble, merma: rec.merma || 15,
            formato_venta: rec.formato_venta || 'Unidad', peso_unidad: rec.peso_unidad || 100,
            horas_hombre: rec.horas_hombre || 1,
            loteMinimo: rec.loteMinimo || rec.lote_minimo || 1,
            logica_formula: rec.logica_formula || (['A', 'B', 'C'].includes(rec.familia) ? 'batch' : 'panadero'),
            details: rec.details ? [...rec.details] : [],
            tiempo_pesaje: rec.tiempo_pesaje || 5,
            tiempo_amasado: rec.tiempo_amasado || 15,
            tiempo_armado: rec.tiempo_armado || 20,
            tiempo_fermentacion: rec.tiempo_fermentacion || 60,
            tiempo_horneado: rec.tiempo_horneado || 25,
            capacidad_horno: rec.capacidad_horno || 100
        });
        setShowAdd(true);
    };

    const handleDelete = async (id) => {
        if (confirm("¿Eliminar Ficha permanentemente de la Nube?")) {
            const { error } = await supabase.from('recetas').delete().eq('id', id);
            if (error) { showToast("Error BD: " + error.message, "error"); return; }
            setRecipes(recipes.filter(r => r.id !== id));
            showToast("Ficha eliminada", "error");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            {/* SUB-TABS: PANADERÍA Y CHARCUTERÍA */}
            <div className="flex gap-2 border-b border-slate-200 pb-2 print:hidden">
                <button 
                    onClick={() => { setSubTab('panaderia'); setShowAdd(false); }} 
                    className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-4 transition-all ${subTab === 'panaderia' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    Fichas Panadería
                </button>
                <button 
                    onClick={() => { setSubTab('charcuteria'); setShowAdd(false); }} 
                    className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-4 transition-all ${subTab === 'charcuteria' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                    Fichas Charcutería
                </button>
            </div>

            {subTab === 'charcuteria' ? (
                <CharcuteriaView 
                    charcRecetas={charcRecetas} 
                    addCharcReceta={addCharcReceta} 
                    updateCharcReceta={updateCharcReceta}
                    deleteCharcReceta={deleteCharcReceta}
                    setCharcRecetas={setCharcRecetas}
                    ingredients={ingredients} 
                    showToast={showToast} 
                    initialTab="recetas"
                    hideMaduracionTab={true}
                />
            ) : (
                <>
                    {/* HEADER */}
                    <div className="fall-target bg-white p-6 rounded-2xl border shadow-sm flex justify-between items-center gap-6 print:hidden">
                <div>
                    <h3 className="text-xl font-black uppercase italic text-slate-800">Catálogo MultiBOM y Costos</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Fichas Activas: {recipes.length}</p>
                </div>
                <div className="flex-1 max-w-md relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Buscar por código o nombre..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-orange-500 bg-slate-50 focus:bg-white transition-all" />
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => window.print()} variant="secondary" className="flex items-center gap-1.5"><Printer size={16} /> Imprimir Listado</Button>
                    <Button onClick={() => setShowBulkImport(true)} variant="secondary"><Plus size={16} /> Carga Masiva</Button>
                    <Button onClick={() => { setShowAdd(!showAdd); if (!showAdd) setForm(EMPTY_FORM); }} variant={showAdd ? "secondary" : "accent"}>
                        {showAdd ? "Cancelar Edición" : <><Plus size={16} /> Nueva Ficha</>}
                    </Button>
                </div>
            </div>

            {/* FORMULARIO + PANEL OPCIÓN A */}
            {showAdd && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 overflow-y-auto">
                    <div className="bg-white border-[8px] border-slate-900 rounded-[2.5rem] p-8 max-w-7xl w-full shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-lg font-black uppercase italic text-slate-800">
                                {form.id ? "Editar Ficha Técnica" : "Alta de Ficha Técnica"}
                            </h4>
                            <button 
                                onClick={() => setShowAdd(false)}
                                className="text-slate-400 hover:text-slate-600 font-bold text-xs uppercase bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
                            {/* COLUMNA IZQUIERDA: FORMULARIO */}
                            <div className="lg:col-span-7">
                                <Card className="fall-target p-8 border border-slate-200 bg-white shadow-2xl rounded-2xl">

                            {/* DATOS DE IDENTIFICACIÓN */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-4">
                                <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-2">
                                    <Hash size={16} className="text-slate-400" />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Datos de Identificación</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    <div className="md:col-span-3"><Input label="Código SKU" value={form.codigo} disabled required /></div>
                                    <div className="md:col-span-9"><Input label="Nombre del Producto" value={form.nombre} onChange={v => setForm({ ...form, nombre: v })} placeholder="Ej. Baguette Clásica" required /></div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-12 gap-4 items-end">
                                    <div className="col-span-2 md:col-span-4">
                                        <Select label="Familia" value={form.familia} onChange={e => setForm({ ...form, familia: e })}>
                                            {Object.values(FAMILIAS).map(f => <option key={f.id} value={f.id}>{f.id} - {f.nombre}</option>)}
                                        </Select>
                                    </div>
                                    <div className="md:col-span-3">
                                        <Select label="Lógica de Fórmula" value={form.logica_formula} onChange={e => setForm({ ...form, logica_formula: e })}>
                                            <option value="panadero">% Panadero</option>
                                            <option value="batch">% Batch</option>
                                        </Select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <Select label="Formato Venta" value={form.formato_venta} onChange={e => setForm({ ...form, formato_venta: e })}>
                                            <option value="Unidad">Envasados</option>
                                            <option value="Kg">Granel</option>
                                        </Select>
                                    </div>
                                    <div className="md:col-span-2">
                                        {form.formato_venta === 'Unidad'
                                            ? <Input label="Peso (g)" type="number" value={form.peso_unidad} onChange={v => setForm({ ...form, peso_unidad: v })} required />
                                            : <div className="text-[10px] font-bold text-slate-400 uppercase h-[38px] flex items-center justify-center border border-dashed border-slate-200 rounded-lg bg-slate-100/50">Granel</div>
                                        }
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="flex items-center justify-center gap-1.5 p-2 bg-white rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:border-orange-400 transition-colors h-[38px]">
                                            <input type="checkbox" checked={form.wip} onChange={e => setForm({ ...form, wip: e.target.checked })} className="w-4 h-4 accent-orange-600" />
                                            <span className="text-[9px] font-black uppercase text-slate-700">WIP?</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Lote mínimo + Kg del Lote calculado */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-3 rounded-lg border border-slate-200">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                            Lote Mínimo a Producir <span className="text-slate-300">({form.formato_venta === 'Unidad' ? 'unidades' : 'kg'})</span>
                                        </label>
                                        <input type="number" min="0.1" step="0.1" value={form.loteMinimo}
                                            onChange={e => setForm({ ...form, loteMinimo: e.target.value })}
                                            className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/5 text-sm font-semibold text-slate-800 shadow-sm" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                            Kg del Lote <span className="text-slate-300 font-normal normal-case">(masa cruda)</span>
                                        </label>
                                        <div className="flex items-center gap-3 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 h-[42px]">
                                            <span className="text-sm font-black text-slate-800 font-mono">
                                                {kgLoteBruto >= 1 ? `${kgLoteBruto.toFixed(2)} kg` : `${(kgLoteBruto * 1000).toFixed(0)} g`}
                                            </span>
                                            {form.formato_venta === 'Unidad' && (
                                                <span className="text-[10px] text-slate-400 font-bold">
                                                    rinde {form.loteMinimo} u × {form.peso_unidad}g
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* COSTOS OPERATIVOS (sin campo Empaque) */}
                            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 mb-6">
                                <div className="flex items-center gap-2 border-b border-emerald-200 pb-2 mb-4">
                                    <Calculator size={16} className="text-emerald-500" />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Cronometría y Eficiencia de Elaboración</h4>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                    <Input label="Pesado y Prep. (min)" type="number" value={form.tiempo_pesaje} onChange={v => setForm({ ...form, tiempo_pesaje: Number(v) })} suffix="min" required />
                                    <Input label="Amasado y Batido (min)" type="number" value={form.tiempo_amasado} onChange={v => setForm({ ...form, tiempo_amasado: Number(v) })} suffix="min" required />
                                    <Input label="División y Armado (min)" type="number" value={form.tiempo_armado} onChange={v => setForm({ ...form, tiempo_armado: Number(v) })} suffix="min" required />
                                    <Input label="Fermentación (min)" type="number" value={form.tiempo_fermentacion} onChange={v => setForm({ ...form, tiempo_fermentacion: Number(v) })} suffix="min" required />
                                    <Input label="Cocción/Horneado (min)" type="number" value={form.tiempo_horneado} onChange={v => setForm({ ...form, tiempo_horneado: Number(v) })} suffix="min" required />
                                    <Input label="Capacidad Horno (u/lote)" type="number" value={form.capacidad_horno} onChange={v => setForm({ ...form, capacidad_horno: Number(v) })} suffix="u" required />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input label="% Merma Horno" type="number" value={form.merma} onChange={v => setForm({ ...form, merma: v })} suffix="%" />
                                </div>
                            </div>

                            {/* ESCANDALLO */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest bg-slate-100 px-3 py-1 rounded-lg inline-block">Escandallo</p>
                                    {isBatchFormula && (
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${
                                            Math.abs(pctBatchSum - 100) <= 1
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : 'bg-red-50 text-red-600 border-red-200'
                                        }`}>
                                            {Math.abs(pctBatchSum - 100) <= 1 ? '✓' : '⚠'} Suma: {pctBatchSum.toFixed(1)}% {Math.abs(pctBatchSum - 100) <= 1 ? '' : '≠ 100%'}
                                        </span>
                                    )}
                                    {!isBatchFormula && (
                                        <span className="text-[10px] text-slate-400 font-bold italic">Gramos calculados automáticamente desde lote mínimo</span>
                                    )}
                                </div>
                                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-900 text-white text-[9px] uppercase tracking-widest">
                                            <tr>
                                                <th className="px-3 py-1.5">Componente</th>
                                                <th className={`px-3 py-1.5 w-24 text-center ${!isBatchFormula ? 'bg-orange-700' : 'opacity-40'}`}>% Panadero</th>
                                                <th className={`px-3 py-1.5 w-24 text-center ${isBatchFormula ? 'bg-emerald-700' : 'opacity-40'}`}>% T. Batch</th>
                                                <th className={`px-3 py-1.5 w-24 text-center ${!isBatchFormula ? 'bg-orange-900/40' : ''}`}>Gramos {!isBatchFormula && <span className="opacity-60">(calc)</span>}</th>
                                                <th className="px-3 py-1.5 w-24 text-right">Costo Insumo</th>
                                                <th className="px-3 py-1.5 w-24 text-center">Incidencia %</th>
                                                <th className="px-3 py-1.5 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {form.details.map((l, i) => {
                                                const computedGramos = detailsConGramos[i]?.gramos || 0;
                                                const pctBatch = pesoCrudo > 0 ? ((computedGramos / pesoCrudo) * 100).toFixed(1) : '0.0';
                                                const ing = ingredients.find(x => x.id === l.ingredientId);
                                                const costPerGram = getIngredientCost(ing);
                                                const componentCost = computedGramos * costPerGram;
                                                const incidencePct = panelCostos.costo_mp > 0 ? (componentCost / panelCostos.costo_mp) * 100 : 0;
                                                return (
                                                    <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                                        <td className="px-2 py-1 border-r border-slate-100">
                                                            <select className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer py-1"
                                                                value={l.ingredientId}
                                                                onChange={e => { const nd = [...form.details]; nd[i].ingredientId = e.target.value; setForm({ ...form, details: nd }); }}>
                                                                <option value="" disabled>Seleccionar componente...</option>
                                                                {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                                                            </select>
                                                        </td>
                                                        <td className="px-2 py-1 border-r border-slate-100">
                                                            {!isBatchFormula ? (
                                                                <div className="flex items-center justify-center bg-orange-50 rounded border border-orange-200 px-1 py-0.5">
                                                                    <input type="number" className="w-full bg-transparent text-xs font-black text-center outline-none text-orange-800"
                                                                        value={l.porcentaje} placeholder="0"
                                                                        onChange={e => { const v = e.target.value; const nd = [...form.details]; nd[i].porcentaje = v; nd[i].pctBatchInput = ''; setForm({ ...form, details: nd }); }} />
                                                                    <span className="text-[9px] text-orange-400 font-bold ml-1">%</span>
                                                                </div>
                                                            ) : (
                                                                <div className="text-center text-xs font-black text-slate-300">{l.porcentaje || '—'}%</div>
                                                            )}
                                                        </td>
                                                        <td className="px-2 py-1 border-r border-slate-100">
                                                            {isBatchFormula ? (
                                                                <div className="flex items-center justify-center bg-emerald-50 rounded border border-emerald-200 px-1 py-0.5">
                                                                    <input type="number" className="w-full bg-transparent text-xs font-black text-center outline-none text-emerald-800" placeholder="0"
                                                                        value={l.pctBatchInput !== undefined ? l.pctBatchInput : (pctBatch !== '0.0' ? pctBatch : '')}
                                                                        onChange={e => { const v = e.target.value; const nd = [...form.details]; nd[i].pctBatchInput = v; nd[i].gramos = v ? Math.round((Number(v) / 100) * kgLoteBruto * 1000) : 0; nd[i].porcentaje = ''; setForm({ ...form, details: nd }); }} />
                                                                    <span className="text-[9px] text-emerald-600 font-bold ml-1">%</span>
                                                                </div>
                                                            ) : (
                                                                <div className="text-center text-xs font-black text-slate-300">{pctBatch}%</div>
                                                            )}
                                                        </td>
                                                        <td className="px-2 py-1 border-r border-slate-100">
                                                            {isBatchFormula ? (
                                                                // % Batch: editable por el usuario
                                                                <div className="flex items-center justify-center bg-slate-100 rounded border border-slate-200 px-1 py-0.5">
                                                                    <input type="number" className="w-full bg-transparent text-xs font-black text-center outline-none text-slate-800" placeholder="0"
                                                                        value={l.gramos}
                                                                        onChange={e => { const v = e.target.value; const nd = [...form.details]; nd[i].gramos = v; nd[i].pctBatchInput = ''; setForm({ ...form, details: nd }); }} />
                                                                    <span className="text-[9px] text-slate-400 font-bold ml-1">g</span>
                                                                </div>
                                                            ) : (
                                                                // % Panadero: READONLY — calculado automáticamente desde lote mínimo
                                                                <div className="flex items-center justify-center bg-orange-50 rounded border border-orange-200 px-1 py-0.5">
                                                                    <span className="text-xs font-black text-orange-800 text-center w-full">{computedGramos.toLocaleString('es-AR')}</span>
                                                                    <span className="text-[9px] text-orange-400 font-bold ml-1">g</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-2 py-1 border-r border-slate-100 text-right font-mono font-black text-slate-700 text-xs">
                                                            {fmt(componentCost)}
                                                        </td>
                                                        <td className="px-2 py-1 border-r border-slate-100 text-center font-mono font-black text-slate-600 text-xs">
                                                            {incidencePct.toFixed(1)}%
                                                        </td>
                                                        <td className="px-2 py-1 text-center">
                                                            <button type="button" onClick={() => { const nd = [...form.details]; nd.splice(i, 1); setForm({ ...form, details: nd }); }} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-all opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {form.details.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-slate-400 text-xs italic">Hacé clic en "Añadir Insumo" para empezar.</td></tr>}
                                        </tbody>
                                    </table>
                                    <div className="p-1 bg-slate-50 border-t border-slate-200">
                                        <button type="button" onClick={() => setForm({ ...form, details: [...form.details, { ingredientId: '', porcentaje: '', gramos: '' }] })}
                                            className="w-full py-1.5 border border-dashed border-slate-300 rounded-md text-[9px] font-black uppercase text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-all flex items-center justify-center gap-1">
                                            <Plus size={12} /> Añadir Insumo
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* BARRA INFERIOR */}
                            <div className="p-4 bg-slate-900 text-white rounded-xl flex justify-between items-center">
                                <div>
                                    <p className="text-[9px] uppercase opacity-50 font-black tracking-widest mb-0.5">Rendimiento ({form.formato_venta === 'Unidad' ? 'Envasados' : 'Granel'})</p>
                                    <div className="flex items-end gap-2">
                                        <p className="text-2xl font-black font-mono text-emerald-400">{pesoFinal.toFixed(0)} <span className="text-sm text-emerald-600">g</span></p>
                                        {form.formato_venta === 'Unidad' && form.peso_unidad > 0 && <p className="text-xs font-black text-slate-300 italic mb-0.5">≈ {Math.floor(pesoFinal / form.peso_unidad)} Unid.</p>}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={() => setShowAdd(false)} variant="secondary" className="py-2.5 px-4 text-xs font-black uppercase text-slate-700 bg-white hover:bg-slate-100">
                                        Cancelar
                                    </Button>
                                    <Button onClick={save} variant="success" className="py-2.5 px-6" disabled={!canSave}>
                                        {form.id ? "Actualizar Ficha" : "Guardar Ficha"}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* COLUMNA DERECHA: PANEL OPCIÓN A */}
                    <div className="lg:col-span-3">
                        <div className="sticky top-6 space-y-4">
                            {/* Costos en tiempo real */}
                            <Card className="p-5 border-2 border-slate-200 bg-white shadow-sm">
                                <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                                    <DollarSign size={14} className="text-slate-500" />
                                    <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500">Costos en Tiempo Real</h4>
                                </div>
                                <div className="space-y-2">
                                    {[
                                        { label: 'Materia Prima', val: panelCostos.costo_mp },
                                        { label: 'Mano de Obra', val: panelCostos.costo_mo },
                                        { label: 'Costo Horno', val: panelCostos.costo_horno },
                                        { label: 'CIF', val: panelCostos.costo_cif },
                                    ].map(r => (
                                        <div key={r.label} className="flex justify-between items-center py-1 border-b border-dashed border-slate-100 text-xs">
                                            <span className="text-slate-400 font-bold">{r.label}</span>
                                            <span className="font-mono font-black text-slate-700">{fmt(r.val)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center pt-2 text-xs font-black">
                                        <span className="text-slate-700">Total Batch</span>
                                        <span className="font-mono text-red-500">{fmt(panelCostos.costo_total)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400 font-bold">Costo / {form.formato_venta === 'Unidad' ? 'unid' : 'kg'}</span>
                                        <span className="font-mono font-black text-slate-800">{fmt(panelCostos.costo_unitario)}</span>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-slate-100">
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">Unidades del lote</p>
                                        <p className="text-lg font-black font-mono text-slate-700">{panelCostos.unidades.toFixed(form.formato_venta === 'Unidad' ? 0 : 2)} <span className="text-xs text-slate-400">{form.formato_venta === 'Unidad' ? 'u' : 'kg'}</span></p>
                                    </div>
                                </div>
                            </Card>

                            {/* Precio publicado */}
                            {form.id ? (
                                <Card className={`p-5 border-2 shadow-sm ${publishedPrice?.estado === 'PUBLICADO' ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-slate-50'}`}>
                                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
                                        <Tag size={14} className="text-emerald-600" />
                                        <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500">Precio Publicado</h4>
                                        <span className={`ml-auto text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${publishedPrice?.estado === 'PUBLICADO' ? 'bg-emerald-100 text-emerald-700' : publishedPrice?.estado === 'BORRADOR' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                                            {publishedPrice?.estado || 'Sin precio'}
                                        </span>
                                    </div>
                                    {publishedPrice?.precio_publicado ? (
                                        <div className="mb-3">
                                            <p className="text-2xl font-black font-mono text-emerald-600">{fmt(publishedPrice.precio_publicado)}</p>
                                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Margen: {publishedPrice.margen_pct}%</p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic text-center py-2 mb-3">Sin precio configurado aún</p>
                                    )}
                                    <Link href="/precios" className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase transition-colors">
                                        <ArrowRight size={12} /> Abrir en Lista de Precios
                                    </Link>
                                </Card>
                            ) : (
                                <Card className="p-5 border-2 border-dashed border-slate-200 bg-slate-50/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Tag size={14} className="text-slate-300" />
                                        <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Lista de Precios</h4>
                                    </div>
                                    <p className="text-[10px] text-slate-400 italic text-center py-2">Guardá la ficha primero para configurar el precio en Lista de Precios.</p>
                                </Card>
                            )}
                        </div>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* TABLA DE RECETAS */}
            <Card id="printable-list-container" className="fall-target overflow-hidden border-2 border-slate-200 shadow-sm bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left font-bold text-xs uppercase text-slate-700">
                        <thead className="bg-slate-900 text-white text-[9px] tracking-widest">
                            <tr>
                                <th className="px-4 py-3 cursor-pointer select-none hover:bg-slate-800 transition-colors" onClick={() => handleSort('nombre_producto')}>
                                    SKU / Producto {renderSortIndicator('nombre_producto')}
                                </th>
                                <th className="px-4 py-3 cursor-pointer select-none hover:bg-slate-800 transition-colors text-center" onClick={() => handleSort('familia')}>
                                    Familia {renderSortIndicator('familia')}
                                </th>
                                <th className="px-4 py-3 cursor-pointer select-none hover:bg-slate-800 transition-colors text-center" onClick={() => handleSort('peso_final')}>
                                    Rinde Final {renderSortIndicator('peso_final')}
                                </th>
                                <th className="px-4 py-3 cursor-pointer select-none hover:bg-slate-800 transition-colors text-right" onClick={() => handleSort('costo_unitario')}>
                                    Costo Unid. {renderSortIndicator('costo_unitario')}
                                </th>
                                <th className="px-4 py-3 cursor-pointer select-none hover:bg-slate-800 transition-colors text-right border-r border-slate-700" onClick={() => handleSort('precio_sugerido')}>
                                    P. Sugerido {renderSortIndicator('precio_sugerido')}
                                </th>
                                <th className="px-4 py-3 text-center w-28 print:hidden">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {processedRecipes.map(r => {
                                const familiaData = FAMILIAS[r.familia] || FAMILIAS.F;
                                const isExpanded = !!expandedRows[r.id];
                                const costo_mp = r.costo_mp;
                                const costo_mo = r.costo_mo;
                                const costo_cif = r.costo_cif;
                                const costo_total_batch = r.costo_total_batch;
                                const label_unidad = r.formato_venta === 'Unidad' ? 'Unid.' : 'Kg';
                                const costo_unitario = r.costo_unitario;
                                const precio_sugerido = r.precio_sugerido;
                                return (
                                    <React.Fragment key={r.id}>
                                        <tr className={`hover:bg-slate-50 transition-colors group ${isExpanded ? 'bg-slate-50' : ''}`}>
                                            <td className="px-4 py-2">
                                                <p className="text-[11px] font-black text-slate-800">{r.nombre_producto}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[8px] font-mono text-slate-400">{r.codigo}</span>
                                                    {r.es_subensamble && <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[7px] font-black uppercase">WIP</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[8px] text-white ${familiaData.color}`}>{familiaData.id}</span>
                                            </td>
                                            <td className="px-4 py-2 text-center font-mono text-slate-800">
                                                {Number(r.peso_final || 0).toFixed(0)}g
                                                <span className="block text-[8px] text-slate-400 font-sans uppercase mt-0.5">{r.formato_venta === 'Unidad' ? `${r.peso_unidad}g c/u` : 'Granel'}</span>
                                            </td>
                                            <td className="px-4 py-2 text-right font-mono font-bold text-slate-700">{fmt(costo_unitario)}</td>
                                            <td className="px-4 py-2 text-right font-mono font-black text-emerald-600 border-r border-slate-100">{fmt(precio_sugerido)}</td>
                                            <td className="px-4 py-2 text-center print:hidden">
                                                <div className="flex justify-center gap-1">
                                                    <button onClick={() => toggleRow(r.id)} className={`p-1.5 rounded-md transition-colors ${isExpanded ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'}`}>
                                                        {isExpanded ? <ChevronUp size={14} /> : <Eye size={14} />}
                                                    </button>
                                                    <button onClick={() => handleEdit(r)} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors" title="Editar"><Wrench size={14} /></button>
                                                    <button onClick={() => handleDelete(r.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Eliminar"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="bg-slate-50 border-b-2 border-slate-200">
                                                <td colSpan="6" className="px-6 py-5">
                                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                                        <div className="lg:col-span-2">
                                                            <h5 className="font-black text-[10px] uppercase text-slate-500 mb-2 flex items-center gap-2"><Layers size={12} /> Escandallo</h5>
                                                            <table className="w-full text-left text-[10px] border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                                                                <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                                                                    <tr>
                                                                        <th className="px-3 py-2 font-black">Componente</th>
                                                                        <th className="px-3 py-2 text-center font-black">% Panadero</th>
                                                                        <th className="px-3 py-2 text-right font-black">Gramos</th>
                                                                        <th className="px-3 py-2 text-right font-black">Costo MP</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {r.details?.map((d, i) => {
                                                                        const ing = ingredients.find(x => x.id === d.ingredientId);
                                                                        const cost = Number(d.gramos) * (ing?.costo_estandar || 0);
                                                                        return (
                                                                            <tr key={i} className="hover:bg-slate-50">
                                                                                <td className="px-3 py-2 font-bold text-slate-700">{ing?.name || '—'}</td>
                                                                                <td className="px-3 py-2 text-center font-mono">{d.porcentaje}%</td>
                                                                                <td className="px-3 py-2 text-right font-mono text-slate-500">{d.gramos} g</td>
                                                                                <td className="px-3 py-2 text-right font-mono font-black text-slate-700">{fmt(cost)}</td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        <div>
                                                            <h5 className="font-black text-[10px] uppercase text-slate-500 mb-2 flex items-center gap-2"><PieChart size={12} /> Análisis Financiero</h5>
                                                            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5 text-[10px] shadow-sm">
                                                                <div className="flex justify-between"><span className="text-slate-500 font-bold">Materia Prima</span><span className="font-mono text-slate-800">{fmt(costo_mp)}</span></div>
                                                                <div className="flex justify-between"><span className="text-slate-500 font-bold">Mano de Obra</span><span className="font-mono text-slate-800">{fmt(costo_mo)}</span></div>
                                                                <div className="flex justify-between"><span className="text-slate-500 font-bold">CIF</span><span className="font-mono text-slate-800">{fmt(costo_cif)}</span></div>
                                                                <div className="flex justify-between font-black border-t border-slate-200 pt-2"><span className="text-slate-800">Total Batch</span><span className="font-mono text-red-600 text-xs">{fmt(costo_total_batch)}</span></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            {processedRecipes.length === 0 && <tr><td colSpan="6" className="p-10 text-center text-slate-400 italic text-[10px]">No hay fichas.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Card>
                </>
            )}

            <BulkImportModal
                isOpen={showBulkImport}
                onClose={() => setShowBulkImport(false)}
                type="recetas"
                ingredients={ingredients}
                recipes={recipes}
                showToast={showToast}
                onSuccess={{ setRecipes, setIngredients }}
            />

            {/* ESTILO DE IMPRESIÓN */}
            <style>{`
                @media print {
                    html, body, main, .h-screen, .overflow-hidden, div {
                        height: auto !important;
                        overflow: visible !important;
                        min-height: 0 !important;
                    }
                    .print\:hidden, aside, header, button, .flex-1.max-w-md {
                        display: none !important;
                    }
                    #printable-list-container {
                        border: none !important;
                        box-shadow: none !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                }
            `}</style>
        </div>
    );
}