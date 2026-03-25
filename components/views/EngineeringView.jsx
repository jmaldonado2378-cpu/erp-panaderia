import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Hash, Calculator, ChevronUp, Eye, Wrench, Layers, PieChart, Trash2, Tag, ArrowRight, DollarSign } from 'lucide-react';
import { Card, Button, Input, Select, FAMILIAS } from '../bakery_erp';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EMPTY_FORM = {
    id: null, codigo: '', nombre: '', familia: 'F', ver: 1, wip: false, merma: 15,
    formato_venta: 'Unidad', peso_unidad: 100, horas_hombre: 1,
    loteMinimo: 1, logica_formula: 'panadero', details: []
};

export default function EngineeringView({ recipes, ingredients, setRecipes, setIngredients, showToast, config }) {
    const [showAdd, setShowAdd] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRows, setExpandedRows] = useState({});
    const [publishedPrice, setPublishedPrice] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);

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

    const filteredRecipes = recipes.filter(r =>
        r.nombre_producto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Derivados
    const pesoCrudo = form.details.reduce((a, b) => a + Number(b.gramos || 0), 0);
    const pesoFinal = pesoCrudo * (1 - (form.merma / 100));
    const hasFlourBase = form.details.some(d => Number(d.porcentaje) === 100);
    const isBatchFormula = form.logica_formula === 'batch';

    // Kg del lote (calculado, reemplaza dropdown)
    const kgLote = useMemo(() => {
        if (form.formato_venta === 'Unidad') return (Number(form.loteMinimo) * Number(form.peso_unidad)) / 1000;
        return Number(form.loteMinimo);
    }, [form.formato_venta, form.loteMinimo, form.peso_unidad]);

    // Panel de costos en tiempo real (Opción A)
    const panelCostos = useMemo(() => {
        const costo_mp = form.details.reduce((acc, d) => {
            const ing = ingredients.find(i => i.id === d.ingredientId);
            return acc + (Number(d.gramos || 0) * (ing?.costo_estandar || 0));
        }, 0);
        const costo_mo = (Number(form.horas_hombre) || 0) * (config?.finanzas?.costoHoraHombre || 4500);
        const costo_cif = costo_mp * ((config?.finanzas?.costosIndirectosPct || 20) / 100);
        const costo_total = costo_mp + costo_mo + costo_cif;
        let unidades = form.formato_venta === 'Unidad' && Number(form.peso_unidad) > 0
            ? Math.floor(pesoFinal / Number(form.peso_unidad))
            : pesoFinal / 1000;
        unidades = unidades || 1;
        return { costo_mp, costo_mo, costo_cif, costo_total, costo_unitario: costo_total / unidades, unidades };
    }, [form.details, form.horas_hombre, form.formato_venta, form.peso_unidad, pesoFinal, ingredients, config]);

    const save = async () => {
        if (!form.nombre || !form.codigo || !hasFlourBase) return;
        const recipeData = {
            codigo: form.codigo.toUpperCase(), nombre_producto: form.nombre, familia: form.familia,
            version: form.ver, es_subensamble: form.wip, merma: form.merma,
            formato_venta: form.formato_venta,
            peso_unidad: form.formato_venta === 'Unidad' ? Number(form.peso_unidad) : null,
            peso_crudo: pesoCrudo, peso_final: pesoFinal,
            horas_hombre: Number(form.horas_hombre), costo_empaque: 0,
            lote_minimo: Number(form.loteMinimo), unidad_lote: 'kg',
            logica_formula: form.logica_formula,
        };
        if (form.id && typeof form.id === 'string' && (form.id.includes('-') || form.id.length > 20)) {
            const { error: errRec } = await supabase.from('recetas').update(recipeData).eq('id', form.id);
            if (errRec) { showToast("Error BD: " + errRec.message, "error"); return; }
            await supabase.from('receta_ingredientes').delete().eq('receta_id', form.id);
            const { error: errDet } = await supabase.from('receta_ingredientes').insert(
                form.details.map(d => ({ receta_id: form.id, ingrediente_id: d.ingredientId, porcentaje: d.porcentaje, gramos: d.gramos }))
            );
            if (errDet) { showToast("Error BD Escandallo: " + errDet.message, "error"); return; }
            setRecipes(recipes.map(r => r.id === form.id ? { ...r, ...recipeData, details: form.details, loteMinimo: recipeData.lote_minimo, unidadLote: 'kg' } : r));
            showToast("Ficha técnica actualizada en BD.");
        } else {
            const { data, error: errRec } = await supabase.from('recetas').insert([recipeData]).select();
            if (errRec) { showToast("Error BD: " + errRec.message, "error"); return; }
            const newId = data[0].id;
            const { error: errDet } = await supabase.from('receta_ingredientes').insert(
                form.details.map(d => ({ receta_id: newId, ingrediente_id: d.ingredientId, porcentaje: d.porcentaje, gramos: d.gramos }))
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
            details: rec.details ? [...rec.details] : []
        });
        setShowAdd(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
            {/* HEADER */}
            <div className="fall-target bg-white p-6 rounded-2xl border shadow-sm flex justify-between items-center gap-6">
                <div>
                    <h3 className="text-xl font-black uppercase italic text-slate-800">Catálogo MultiBOM y Costos</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Fichas Activas: {recipes.length}</p>
                </div>
                <div className="flex-1 max-w-md relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Buscar por código o nombre..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-orange-500 bg-slate-50 focus:bg-white transition-all" />
                </div>
                <Button onClick={() => { setShowAdd(!showAdd); if (!showAdd) setForm(EMPTY_FORM); }} variant={showAdd ? "secondary" : "accent"}>
                    {showAdd ? "Cancelar Edición" : <><Plus size={16} /> Nueva Ficha</>}
                </Button>
            </div>

            {/* FORMULARIO + PANEL OPCIÓN A */}
            {showAdd && (
                <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start animate-in slide-in-from-top-4">

                    {/* COLUMNA IZQUIERDA: FORMULARIO */}
                    <div className="lg:col-span-7">
                        <Card className="fall-target p-8 border-[4px] border-slate-900 bg-white shadow-2xl">

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
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Kg del Lote</label>
                                        <div className="flex items-center gap-3 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 h-[42px]">
                                            <span className="text-sm font-black text-slate-800 font-mono">
                                                {kgLote >= 1 ? `${kgLote.toFixed(2)} kg` : `${(kgLote * 1000).toFixed(0)} g`}
                                            </span>
                                            {form.formato_venta === 'Unidad' && (
                                                <span className="text-[10px] text-slate-400 font-bold">{form.loteMinimo} u × {form.peso_unidad} g</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* COSTOS OPERATIVOS (sin campo Empaque) */}
                            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 mb-6">
                                <div className="flex items-center gap-2 border-b border-emerald-200 pb-2 mb-4">
                                    <Calculator size={16} className="text-emerald-500" />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Costos Operativos</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input label="Mano de Obra" type="number" placeholder="Ej. 1.5" value={form.horas_hombre} onChange={v => setForm({ ...form, horas_hombre: v })} suffix="Horas/Lote" required />
                                    <Input label="% Merma Horno" type="number" value={form.merma} onChange={v => setForm({ ...form, merma: v })} suffix="%" />
                                </div>
                            </div>

                            {/* ESCANDALLO */}
                            <div className="mb-6">
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest bg-slate-100 px-3 py-1 rounded-lg inline-block mb-3">Escandallo</p>
                                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-900 text-white text-[9px] uppercase tracking-widest">
                                            <tr>
                                                <th className="px-3 py-1.5">Componente</th>
                                                <th className={`px-3 py-1.5 w-28 text-center ${!isBatchFormula ? 'bg-orange-700' : 'opacity-40'}`}>% Panadero</th>
                                                <th className={`px-3 py-1.5 w-28 text-center ${isBatchFormula ? 'bg-emerald-700' : 'opacity-40'}`}>% T. Batch</th>
                                                <th className="px-3 py-1.5 w-24 text-center">Gramos</th>
                                                <th className="px-3 py-1.5 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {form.details.map((l, i) => {
                                                const pctBatch = pesoCrudo > 0 ? ((Number(l.gramos || 0) / pesoCrudo) * 100).toFixed(1) : '0.0';
                                                const ing = ingredients.find(x => x.id === l.ingredientId);
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
                                                                        onChange={e => { const v = e.target.value; const nd = [...form.details]; nd[i].porcentaje = v; nd[i].pctBatchInput = ''; nd[i].gramos = Number(v) * 10; setForm({ ...form, details: nd }); }} />
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
                                                                        onChange={e => { const v = e.target.value; const nd = [...form.details]; nd[i].pctBatchInput = v; nd[i].gramos = v ? (Number(v) / 100) * kgLote * 1000 : 0; nd[i].porcentaje = ''; setForm({ ...form, details: nd }); }} />
                                                                    <span className="text-[9px] text-emerald-600 font-bold ml-1">%</span>
                                                                </div>
                                                            ) : (
                                                                <div className="text-center text-xs font-black text-slate-300">{pctBatch}%</div>
                                                            )}
                                                        </td>
                                                        <td className="px-2 py-1 border-r border-slate-100">
                                                            <div className="flex items-center justify-center bg-slate-100 rounded border border-slate-200 px-1 py-0.5">
                                                                <input type="number" className="w-full bg-transparent text-xs font-black text-center outline-none text-slate-800" placeholder="0"
                                                                    value={l.gramos}
                                                                    onChange={e => { const v = e.target.value; const nd = [...form.details]; nd[i].gramos = v; if (isBatchFormula) nd[i].pctBatchInput = ''; setForm({ ...form, details: nd }); }} />
                                                                <span className="text-[9px] text-slate-400 font-bold ml-1">g</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-1 text-center">
                                                            <button type="button" onClick={() => { const nd = [...form.details]; nd.splice(i, 1); setForm({ ...form, details: nd }); }} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-all opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {form.details.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-400 text-xs italic">Hacé clic en "Añadir Insumo" para empezar.</td></tr>}
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
                                <Button onClick={save} variant="success" className="py-2.5 px-6" disabled={!hasFlourBase || !form.nombre || !form.codigo}>
                                    {form.id ? "Actualizar Ficha" : "Guardar Ficha"}
                                </Button>
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
            )}

            {/* TABLA DE RECETAS */}
            <Card className="fall-target overflow-hidden border-2 border-slate-200 shadow-sm bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left font-bold text-xs uppercase text-slate-700">
                        <thead className="bg-slate-900 text-white text-[9px] tracking-widest">
                            <tr>
                                <th className="px-4 py-3">SKU / Producto</th>
                                <th className="px-4 py-3 text-center">Familia</th>
                                <th className="px-4 py-3 text-center">Rinde Final</th>
                                <th className="px-4 py-3 text-right">Costo Unid.</th>
                                <th className="px-4 py-3 text-right border-r border-slate-700">P. Sugerido</th>
                                <th className="px-4 py-3 text-center w-28">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredRecipes.map(r => {
                                const familiaData = FAMILIAS[r.familia] || FAMILIAS.F;
                                const isExpanded = !!expandedRows[r.id];
                                const costo_mp = r.details?.reduce((acc, d) => acc + (Number(d.gramos) * (ingredients.find(i => i.id === d.ingredientId)?.costo_estandar || 0)), 0) || 0;
                                const costo_mo = (Number(r.horas_hombre) || 0) * config.finanzas.costoHoraHombre;
                                const costo_cif = costo_mp * (config.finanzas.costosIndirectosPct / 100);
                                const costo_total_batch = costo_mp + costo_mo + costo_cif;
                                let unidades_rinde = r.formato_venta === 'Unidad' && r.peso_unidad > 0
                                    ? Math.floor(Number(r.peso_final) / Number(r.peso_unidad))
                                    : Number(r.peso_final) / 1000;
                                const label_unidad = r.formato_venta === 'Unidad' ? 'Unid.' : 'Kg';
                                const costo_unitario = unidades_rinde > 0 ? costo_total_batch / unidades_rinde : 0;
                                const precio_sugerido = costo_unitario * (1 + (config.finanzas.margenGanancia / 100));
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
                                            <td className="px-4 py-2 text-center">
                                                <div className="flex justify-center gap-1">
                                                    <button onClick={() => toggleRow(r.id)} className={`p-1.5 rounded-md transition-colors ${isExpanded ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'}`}>
                                                        {isExpanded ? <ChevronUp size={14} /> : <Eye size={14} />}
                                                    </button>
                                                    <button onClick={() => handleEdit(r)} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors opacity-0 group-hover:opacity-100"><Wrench size={14} /></button>
                                                    <button onClick={() => handleDelete(r.id)} className="p-1.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
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
                            {filteredRecipes.length === 0 && <tr><td colSpan="6" className="p-10 text-center text-slate-400 italic text-[10px]">No hay fichas.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}