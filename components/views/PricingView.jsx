'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Tag, Package, DollarSign, CheckCircle2, Edit3, ChevronRight, Store, Truck, ShoppingCart, PlusCircle, Trash2, Zap, Info } from 'lucide-react';
import { Card, Button, Input, FAMILIAS } from '../bakery_erp';
import { supabase } from '../../lib/supabase';

/* ================================================================
   HELPER: Calcula árbol de costos de una receta
   ================================================================ */
function calcCostos(receta, ingredients, config) {
    const costo_mp = receta.details?.reduce((acc, d) => {
        const ing = ingredients.find(i => i.id === d.ingredientId);
        return acc + (Number(d.gramos || 0) * (ing?.costo_estandar || 0));
    }, 0) || 0;

    const costo_mo = (Number(receta.horas_hombre) || 0) * (config?.finanzas?.costoHoraHombre || 4500);
    const costo_cif = costo_mp * ((config?.finanzas?.costosIndirectosPct || 20) / 100);

    let unidades_rinde = 1;
    if (receta.formato_venta === 'Unidad' && receta.peso_unidad > 0) {
        unidades_rinde = Math.floor(Number(receta.peso_final) / Number(receta.peso_unidad));
    } else {
        unidades_rinde = Number(receta.peso_final) / 1000;
    }

    return { costo_mp, costo_mo, costo_cif, unidades_rinde: unidades_rinde || 1 };
}

/* ================================================================
   COMPONENTE PRINCIPAL
   ================================================================ */
export default function PricingView({ recipes, ingredients, config, showToast }) {
    const [selectedReceta, setSelectedReceta] = useState(null);
    const [listaPreciosMap, setListaPreciosMap] = useState({});   // { receta_id: lista_precios_row }
    const [savingId, setSavingId] = useState(null);
    const [filterEstado, setFilterEstado] = useState('TODOS');
    const [searchTerm, setSearchTerm] = useState('');

    // Empaques: derivados del prop `ingredients` ya cargado en el contexto
    const empaqueIngredients = useMemo(
        () => (ingredients || []).filter(i => i.tipo === 'empaque'),
        [ingredients]
    );

    // Estado local del form de precios del producto seleccionado
    const [localPricing, setLocalPricing] = useState(null);

    /* ── Cargar datos iniciales ──────────────────────────────── */
    useEffect(() => {
        const load = async () => {
            const { data: lp } = await supabase.from('lista_precios').select('*');
            const map = {};
            (lp || []).forEach(row => { map[row.receta_id] = row; });
            setListaPreciosMap(map);
        };
        load();
    }, []);

    /* ── Cuando cambia el producto seleccionado ─────────────── */
    useEffect(() => {
        if (!selectedReceta) { setLocalPricing(null); return; }
        const existing = listaPreciosMap[selectedReceta.id];
        const { costo_mp, costo_mo, costo_cif, unidades_rinde } = calcCostos(selectedReceta, ingredients, config);
        const baseForm = {
            receta_id: selectedReceta.id,
            estado: 'BORRADOR',
            margen_pct: 50,
            empaques: [],
            costo_empaque_total: 0,
            precio_mostrador: null,
            precio_distribuidor: null,
            precio_cadena: null,
            canal_principal: 'mostrador',
            notas: ''
        };
        setLocalPricing(existing ? { ...baseForm, ...existing, empaques: existing.empaques || [] } : baseForm);
    }, [selectedReceta]);

    /* ── Costos calculados del producto seleccionado ─────────── */
    const costos = useMemo(() => {
        if (!selectedReceta) return null;
        const { costo_mp, costo_mo, costo_cif, unidades_rinde } = calcCostos(selectedReceta, ingredients, config);
        const costo_empaque_total = localPricing?.empaques?.reduce((acc, e) => acc + (Number(e.cantidad || 1) * Number(e.costo_unitario || 0)), 0) || 0;
        const costo_produccion = (costo_mp + costo_mo + costo_cif) / unidades_rinde;
        const costo_unitario_total = costo_produccion + costo_empaque_total;
        return { costo_mp, costo_mo, costo_cif, costo_empaque_total, costo_produccion, costo_unitario_total, unidades_rinde };
    }, [selectedReceta, ingredients, config, localPricing?.empaques]);

    /* ── Precio sugerido por margen ─────────────────────────── */
    const precioSugerido = useMemo(() => {
        if (!costos || !localPricing) return 0;
        return costos.costo_unitario_total * (1 + (Number(localPricing.margen_pct) / 100));
    }, [costos, localPricing?.margen_pct]);

    /* ── Agregar empaque a la lista local ───────────────────── */
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
            upd[idx] = { ...upd[idx], cantidad: val };
            return { ...prev, empaques: upd };
        });
    };

    /* ── Guardar / Publicar ─────────────────────────────────── */
    const save = async (publicar = false) => {
        if (!selectedReceta || !localPricing || !costos) return;
        setSavingId(selectedReceta.id);
        const payload = {
            ...localPricing,
            estado: publicar ? 'PUBLICADO' : localPricing.estado,
            costo_empaque_total: costos.costo_empaque_total,
            precio_publicado: publicar ? (localPricing.precio_mostrador || precioSugerido) : localPricing.precio_publicado,
            updated_at: new Date().toISOString()
        };
        const { data, error } = await supabase
            .from('lista_precios')
            .upsert(payload, { onConflict: 'receta_id' })
            .select()
            .single();

        if (error) { showToast('❌ Error guardando: ' + error.message, 'error'); }
        else {
            setListaPreciosMap(prev => ({ ...prev, [selectedReceta.id]: data }));
            setLocalPricing(data);
            showToast(publicar ? '✅ Precio PUBLICADO correctamente.' : '💾 Borrador guardado.');
        }
        setSavingId(null);
    };

    /* ── Filtro de recetas ────────────────────────────────────── */
    const filteredRecipes = useMemo(() => {
        return recipes.filter(r => {
            const matchesSearch = r.nombre_producto?.toLowerCase().includes(searchTerm.toLowerCase()) || r.codigo?.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;
            if (filterEstado === 'TODOS') return true;
            const lp = listaPreciosMap[r.id];
            if (filterEstado === 'SIN_PRECIO') return !lp;
            return lp?.estado === filterEstado;
        });
    }, [recipes, searchTerm, filterEstado, listaPreciosMap]);

    const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    /* ── RENDER ────────────────────────────────────────────────── */
    return (
        <div className="space-y-4 animate-in fade-in">
            {/* HEADER */}
            <div className="fall-target bg-white p-6 rounded-2xl border shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow"><Tag className="text-white" size={20} /></div>
                    <div>
                        <h3 className="text-xl font-black uppercase italic text-slate-800">Lista de Precios</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Módulo de Costeo Completo y Publicación de Precios · {recipes.length} Fichas</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* ── PANEL IZQUIERDO: Catálogo ──────────────────── */}
                <div className="lg:col-span-4 space-y-3">
                    <Card className="p-4 border shadow-sm bg-white">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Catálogo de Fichas</h4>
                        <input
                            type="text" placeholder="Buscar producto..."
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-emerald-500 mb-2"
                        />
                        <div className="flex gap-1 mb-3 flex-wrap">
                            {['TODOS', 'PUBLICADO', 'BORRADOR', 'SIN_PRECIO'].map(f => (
                                <button key={f} onClick={() => setFilterEstado(f)}
                                    className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-colors ${filterEstado === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                    {f.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                        <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
                            {filteredRecipes.map(r => {
                                const lp = listaPreciosMap[r.id];
                                const estado = lp?.estado || 'SIN_PRECIO';
                                const estadoColor = estado === 'PUBLICADO' ? 'bg-emerald-100 text-emerald-700' : estado === 'BORRADOR' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500';
                                const isSelected = selectedReceta?.id === r.id;
                                const familia = FAMILIAS[r.familia] || FAMILIAS.F;

                                return (
                                    <button key={r.id} onClick={() => setSelectedReceta(r)}
                                        className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${isSelected ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-100 hover:border-slate-300 bg-white hover:bg-slate-50'}`}>
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={`w-5 h-5 rounded text-[8px] text-white font-black flex items-center justify-center flex-shrink-0 ${familia.color}`}>{familia.id}</span>
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-black text-slate-800 truncate">{r.nombre_producto}</p>
                                                <p className="text-[9px] font-mono text-slate-400">{r.codigo}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {lp?.precio_publicado && <span className="text-[9px] font-black text-emerald-600 font-mono">{fmt(lp.precio_publicado)}</span>}
                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${estadoColor}`}>{estado.replace('_', ' ')}</span>
                                            <ChevronRight size={12} className="text-slate-300" />
                                        </div>
                                    </button>
                                );
                            })}
                            {filteredRecipes.length === 0 && <p className="text-center text-slate-400 text-xs py-8">No hay productos.</p>}
                        </div>
                    </Card>
                </div>

                {/* ── PANEL DERECHO: Editor de Costos ───────────── */}
                <div className="lg:col-span-8 space-y-4">
                    {!selectedReceta ? (
                        <Card className="p-12 border shadow-sm bg-slate-50 flex flex-col items-center justify-center text-center">
                            <Tag size={40} className="text-slate-200 mb-4" />
                            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Seleccioná un producto del catálogo</p>
                            <p className="text-slate-300 text-xs mt-1">para ver y editar su estructura de costos</p>
                        </Card>
                    ) : localPricing && costos && (
                        <>
                            {/* ÁRBOL DE COSTOS */}
                            <Card className="p-5 border shadow-sm bg-white">
                                <div className="flex items-center gap-2 mb-4 border-b pb-3">
                                    <DollarSign size={16} className="text-emerald-600" />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Árbol de Costos — {selectedReceta.nombre_producto}</h4>
                                    <span className="ml-auto text-[9px] bg-slate-100 text-slate-500 font-black px-2 py-0.5 rounded uppercase">{costos.unidades_rinde.toFixed(0)} {selectedReceta.formato_venta === 'Unidad' ? 'Unid' : 'Kg'} x lote</span>
                                </div>

                                <div className="space-y-2 mb-4">
                                    {[
                                        { label: 'Materia Prima (total lote)', value: costos.costo_mp, unit: 'lote', highlight: false },
                                        { label: 'Mano de Obra', value: costos.costo_mo, unit: 'lote', highlight: false },
                                        { label: 'Costos Indirectos (CIF)', value: costos.costo_cif, unit: 'lote', highlight: false },
                                    ].map(row => (
                                        <div key={row.label} className="flex items-center justify-between text-xs py-1.5 border-b border-dashed border-slate-100">
                                            <span className="text-slate-500 font-bold">{row.label}</span>
                                            <span className="font-mono font-black text-slate-700">{fmt(row.value)} <span className="text-[9px] text-slate-400 font-normal">/{row.unit}</span></span>
                                        </div>
                                    ))}

                                    {/* Sección Empaques */}
                                    <div className="mt-3 pt-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1"><Package size={12} /> Empaques y Materiales</p>
                                            <span className="text-[9px] text-slate-400">por unidad de venta</span>
                                        </div>
                                        {localPricing.empaques.length === 0 && (
                                            <p className="text-xs text-slate-300 italic text-center py-2">Sin empaques asignados.</p>
                                        )}
                                        {localPricing.empaques.map((e, idx) => (
                                            <div key={idx} className="flex items-center gap-2 py-1.5 border-b border-dashed border-slate-100">
                                                <span className="text-xs font-bold text-slate-700 flex-1">{e.nombre}</span>
                                                <div className="flex items-center gap-1">
                                                    <input type="number" step="0.1" min="0.1" value={e.cantidad} onChange={ev => updateEmpaqueQty(idx, ev.target.value)}
                                                        className="w-14 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono text-center outline-none focus:border-emerald-500" />
                                                    <span className="text-[9px] text-slate-400">{e.unidad}</span>
                                                </div>
                                                <span className="font-mono font-black text-sm text-purple-600 w-20 text-right">{fmt(Number(e.cantidad) * Number(e.costo_unitario))}</span>
                                                <button onClick={() => removeEmpaque(idx)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                                            </div>
                                        ))}

                                        {/* Agregar empaque */}
                                        <div className="mt-2">
                                            <select onChange={e => { if (e.target.value) { addEmpaque(e.target.value); e.target.value = ''; } }}
                                                className="w-full border border-dashed border-emerald-300 bg-emerald-50 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-emerald-500 text-slate-600 cursor-pointer">
                                                <option value="">+ Agregar material de empaque...</option>
                                                {empaqueIngredients.filter(m => !localPricing.empaques.find(e => e.ingrediente_id === m.id)).map(m => (
                                                    <option key={m.id} value={m.id}>{m.name} — {fmt(m.costo_estandar)}/{m.unidad_compra || 'unidad'}</option>
                                                ))}
                                            </select>
                                            {empaqueIngredients.length === 0 && (
                                                <p className="text-[10px] text-amber-500 mt-1 text-center">Cargá empaques desde Maestros Base para asignarlos aquí.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* TOTALES */}
                                <div className="bg-slate-900 text-white rounded-xl p-4 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[9px] uppercase text-slate-400 font-black">Costo Producción (c/u)</p>
                                        <p className="text-lg font-black font-mono text-white">{fmt(costos.costo_produccion)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] uppercase text-slate-400 font-black">Costo Total c/Empaque (c/u)</p>
                                        <p className="text-lg font-black font-mono text-emerald-400">{fmt(costos.costo_unitario_total)}</p>
                                    </div>
                                </div>
                            </Card>

                            {/* POLÍTICA DE PRECIO */}
                            <Card className="p-5 border shadow-sm bg-white">
                                <div className="flex items-center gap-2 mb-4 border-b pb-3">
                                    <Tag size={16} className="text-blue-600" />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Política de Precio Multi-Canal</h4>
                                    <span className={`ml-auto px-2 py-0.5 rounded text-[9px] font-black uppercase ${localPricing.estado === 'PUBLICADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {localPricing.estado}
                                    </span>
                                </div>

                                {/* Margen slider */}
                                <div className="mb-4 p-3 bg-slate-50 rounded-xl border">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500">Margen Deseado</label>
                                        <span className="text-2xl font-black text-slate-900">{localPricing.margen_pct}%</span>
                                    </div>
                                    <input type="range" min="10" max="200" step="5" value={localPricing.margen_pct}
                                        onChange={e => setLocalPricing(prev => ({ ...prev, margen_pct: Number(e.target.value) }))}
                                        className="w-full accent-emerald-600" />
                                    <div className="flex justify-between text-[9px] text-slate-400 mt-1"><span>10%</span><span>200%</span></div>
                                    <div className="mt-2 p-2 bg-white rounded-lg border text-center">
                                        <p className="text-[9px] text-slate-400 uppercase font-bold">Precio Sugerido con este margen</p>
                                        <p className="text-2xl font-black font-mono text-emerald-600">{fmt(precioSugerido)}</p>
                                    </div>
                                </div>

                                {/* Precios por canal */}
                                <div className="space-y-3 mb-4">
                                    {[
                                        { key: 'precio_mostrador', label: 'Mostrador / Venta Directa', Icon: Store, color: 'blue' },
                                        { key: 'precio_distribuidor', label: 'Distribución Mayorista', Icon: Truck, color: 'orange' },
                                        { key: 'precio_cadena', label: 'Cadenas / Supermercados', Icon: ShoppingCart, color: 'purple' },
                                    ].map(({ key, label, Icon, color }) => (
                                        <div key={key} className="flex items-center gap-3 p-3 border rounded-xl hover:bg-slate-50 transition-colors">
                                            <input type="radio" name="canal_principal" value={key.replace('precio_', '')}
                                                checked={localPricing.canal_principal === key.replace('precio_', '')}
                                                onChange={() => setLocalPricing(prev => ({ ...prev, canal_principal: key.replace('precio_', '') }))}
                                                className="accent-emerald-600" />
                                            <Icon size={14} className={`text-${color}-600 flex-shrink-0`} />
                                            <span className="text-xs font-bold text-slate-700 flex-1">{label}</span>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                                                <input type="number" step="0.01" placeholder={precioSugerido.toFixed(2)}
                                                    value={localPricing[key] || ''} onChange={e => setLocalPricing(prev => ({ ...prev, [key]: e.target.value }))}
                                                    className="border border-slate-200 rounded-lg pl-6 pr-3 py-1.5 text-sm font-black font-mono w-32 outline-none focus:border-emerald-500 text-right" />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Notas */}
                                <textarea value={localPricing.notas || ''} onChange={e => setLocalPricing(prev => ({ ...prev, notas: e.target.value }))}
                                    placeholder="Notas sobre esta política de precios..."
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500 bg-slate-50 resize-none h-16 mb-4" />

                                {/* Botones */}
                                <div className="flex gap-3">
                                    <Button variant="secondary" className="flex-1 py-3 font-black uppercase" onClick={() => save(false)} disabled={!!savingId}>
                                        {savingId ? <Zap className="animate-pulse" size={16} /> : '💾 Guardar Borrador'}
                                    </Button>
                                    <Button variant="primary" className="flex-[2] py-3 font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200" onClick={() => save(true)} disabled={!!savingId}>
                                        {savingId ? <span className="flex items-center gap-2 justify-center"><Zap className="animate-pulse" size={16} /> Publicando...</span>
                                            : <span className="flex items-center gap-2 justify-center"><CheckCircle2 size={16} /> Publicar Precio</span>}
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
