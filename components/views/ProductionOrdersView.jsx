'use client';
import React, { useState } from 'react';
import { ClipboardList, QrCode, Square, MapPin, Printer, Layers, Sparkles, Check, CheckCircle2 } from 'lucide-react';
import { Card, Button, Input, Select } from '../bakery_erp';
import { supabase } from '../../lib/supabase';

export default function ProductionOrdersView({ 
    recipes, ingredients, lots, orders, setOrders, showToast,
    charcRecetas = [], charcLotes = [], addCharcLote,
    fraccTareas = [], addFraccTarea
}) {
    const [sector, setSector] = useState('bakery'); // 'bakery', 'charcuteria', 'fraccionamiento'
    
    // Formulario de Panificados
    const [form, setForm] = useState({ recipeId: '', amount: '' });
    
    // Formulario de Charcutería
    const [charcForm, setCharcForm] = useState({ receta_id: '', codigo_lote: '', peso_inicial_g: '', fecha_vencimiento: '' });
    
    // Formulario de Fraccionamiento
    const [fraccForm, setFraccForm] = useState({ insumo_granel_id: '', empaque_id: '', formato_bolsa_g: 100, cantidad_granel_consumida_g: '', lote_pt_generado: '' });
    
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [saving, setSaving] = useState(false);

    // Estado para controlar qué ingredientes WIP se encuentran "explotados" a materia prima
    const [explodedWips, setExplodedWips] = useState({}); // { [ingId]: boolean }

    const selectedRecipe = recipes.find(r => r.id === form.recipeId);
    const labelMeta = selectedRecipe?.formato_venta === 'Kg' ? 'Kilos (Meta)' : 'Unidades (Meta)';

    const handleInsumoChange = (ingId) => {
        const ing = ingredients.find(i => i.id === ingId);
        const code = (ing?.codigo || 'RAW').split('-').pop();
        setFraccForm(prev => ({
            ...prev,
            insumo_granel_id: ingId,
            lote_pt_generado: `L-FR-${code}-${Date.now().toString().slice(-4)}`
        }));
    };

    const toggleExplodeWip = (ingId) => {
        setExplodedWips(prev => ({ ...prev, [ingId]: !prev[ingId] }));
    };

    const createOrder = async (e) => {
        e.preventDefault();
        setSaving(true);
        const codigoOrden = `OP-${Date.now().toString(36).toUpperCase()}`;
        
        if (sector === 'bakery') {
            if (!form.recipeId || !form.amount) return;
            try {
                const { data, error } = await supabase
                    .from('ordenes_produccion')
                    .insert([{
                        codigo_orden: codigoOrden,
                        receta_id: form.recipeId,
                        cantidad_objetivo: Number(form.amount),
                        estado: 'PLANIFICADA',
                        fecha: new Date().toISOString().split('T')[0]
                    }])
                    .select();
                if (error) throw error;
                if (data) {
                    setOrders([{ ...data[0], recipeId: data[0].receta_id, targetAmount: data[0].cantidad_objetivo, status: data[0].estado }, ...orders]);
                }
                showToast("✅ Orden de Panificación creada.");
            } catch (err) {
                console.warn("Error Supabase. Guardando localmente:", err.message);
                const localOrder = {
                    id: 'o_' + Date.now(),
                    codigo_orden: codigoOrden,
                    receta_id: form.recipeId,
                    recipeId: form.recipeId,
                    cantidad_objetivo: Number(form.amount),
                    targetAmount: Number(form.amount),
                    estado: 'PLANIFICADA',
                    status: 'PLANIFICADA',
                    fecha: new Date().toISOString().split('T')[0],
                    date: new Date().toISOString().split('T')[0]
                };
                setOrders([localOrder, ...orders]);
                showToast("✅ Orden guardada localmente (Offline).");
            }
            setForm({ recipeId: '', amount: '' });
        } 
        else if (sector === 'charcuteria') {
            if (!charcForm.receta_id || !charcForm.codigo_lote || !charcForm.peso_inicial_g) {
                showToast("Complete los campos obligatorios", "error");
                setSaving(false);
                return;
            }
            const selectedRec = charcRecetas.find(r => r.id === charcForm.receta_id);
            const vencimiento = charcForm.fecha_vencimiento || new Date(Date.now() + (selectedRec?.lead_time_dias || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            const lote = {
                receta_id: charcForm.receta_id,
                codigo_lote: charcForm.codigo_lote.toUpperCase(),
                peso_inicial_g: Number(charcForm.peso_inicial_g),
                peso_actual_g: Number(charcForm.peso_inicial_g),
                estado: 'EN_SECADO',
                fecha_ingreso: new Date().toISOString(),
                fecha_vencimiento: vencimiento
            };
            if (addCharcLote) {
                await addCharcLote(lote);
            }
            setCharcForm({ receta_id: '', codigo_lote: '', peso_inicial_g: '', fecha_vencimiento: '' });
            showToast("✅ Lote de Charcutería registrado en secado.");
        }
        else if (sector === 'fraccionamiento') {
            if (!fraccForm.insumo_granel_id || !fraccForm.empaque_id || !fraccForm.cantidad_granel_consumida_g || !fraccForm.lote_pt_generado) {
                showToast("Complete todos los campos del fraccionamiento", "error");
                setSaving(false);
                return;
            }
            const task = {
                insumo_granel_id: fraccForm.insumo_granel_id,
                cantidad_granel_consumida_g: Number(fraccForm.cantidad_granel_consumida_g),
                empaque_id: fraccForm.empaque_id,
                formato_bolsa_g: Number(fraccForm.formato_bolsa_g),
                cantidad_bolsas_obtenidas: 0,
                lote_pt_generado: fraccForm.lote_pt_generado.toUpperCase(),
                estado: 'PENDIENTE',
                fecha_tarea: new Date().toISOString()
            };
            if (addFraccTarea) {
                await addFraccTarea(task);
            }
            setFraccForm({ insumo_granel_id: '', empaque_id: '', formato_bolsa_g: 100, cantidad_granel_consumida_g: '', lote_pt_generado: '' });
            showToast("✅ Tarea de Fraccionamiento planificada.");
        }
        setSaving(false);
    };

    const activateOrder = async (id) => {
        try {
            const { error } = await supabase.from('ordenes_produccion').update({ estado: 'PESAJE' }).eq('id', id);
            if (error) throw error;
            setOrders(orders.map(o => o.id === id ? { ...o, status: 'PESAJE', estado: 'PESAJE' } : o));
            setSelectedOrder(null);
            showToast("Orden activada en Kanban de Planta.");
        } catch (err) {
            setOrders(orders.map(o => o.id === id ? { ...o, status: 'PESAJE', estado: 'PESAJE' } : o));
            setSelectedOrder(null);
            showToast("Orden activada localmente (Offline).");
        }
    };

    const getLocation = (ing) => ing?.almacen || 'Almacén Secos Principal';
    const getFefoLot = (ingId) => {
        const l = lots.filter(x => (x.ingredientId || x.ingrediente_id) === ingId && (x.amount || x.cantidad_actual) > 0)
            .sort((a, b) => new Date(a.expiry || a.fecha_vencimiento) - new Date(b.expiry || b.fecha_vencimiento));
        return l.length > 0 ? (l[0].codigo_lote || l[0].id) : 'S/Stock';
    };

    const getWipStock = (ingId) => {
        const total = lots.filter(x => (x.ingredientId || x.ingrediente_id) === ingId)
            .reduce((acc, curr) => acc + (Number(curr.amount || curr.cantidad_actual) || 0), 0);
        return total;
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. SECCIÓN FORMULARIOS / PENDIENTES */}
                <div className="space-y-6 print:hidden">
                    <Card className="fall-target p-5 border border-slate-200 shadow-sm bg-white">
                        {/* Selector de Sector */}
                        <div className="grid grid-cols-3 gap-1 mb-4 bg-slate-100 p-1 rounded-lg">
                            {['bakery', 'charcuteria', 'fracc'].map(sec => {
                                const labels = { bakery: 'Panadería', charcuteria: 'Charcutería', fracc: 'Fraccionado' };
                                return (
                                    <button 
                                        key={sec} 
                                        type="button" 
                                        onClick={() => { setSector(sec === 'fracc' ? 'fraccionamiento' : sec); setSelectedOrder(null); }}
                                        className={`py-1.5 text-[9px] font-black uppercase rounded transition-all ${
                                            (sector === sec || (sec === 'fracc' && sector === 'fraccionamiento')) 
                                                ? 'bg-slate-900 text-white shadow-sm' 
                                                : 'text-slate-500 hover:text-slate-900'
                                        }`}
                                    >
                                        {labels[sec]}
                                    </button>
                                );
                            })}
                        </div>
                        
                        <h4 className="text-xs font-black uppercase mb-3 italic text-slate-800 border-b pb-2">
                            {sector === 'bakery' ? 'Crear Orden Pan' : sector === 'charcuteria' ? 'Nueva Carga en Cámara' : 'Planificar Fraccionamiento'}
                        </h4>
                        
                        <form onSubmit={createOrder} className="space-y-3">
                            {sector === 'bakery' && (
                                <>
                                    <Select label="Ficha Técnica" value={form.recipeId} onChange={e => setForm({ ...form, recipeId: e })} required>
                                        <option value="">Seleccionar Producto...</option>
                                        {recipes.map(r => <option key={r.id} value={r.id}>{r.nombre_producto}</option>)}
                                    </Select>
                                    <Input label={labelMeta} type="number" value={form.amount} onChange={v => setForm({ ...form, amount: v })} required />
                                </>
                            )}
                            
                            {sector === 'charcuteria' && (
                                <>
                                    <Select label="Ficha Técnica Charcutería" value={charcForm.receta_id} onChange={e => setCharcForm({ ...charcForm, receta_id: e })} required>
                                        <option value="">Seleccionar Receta...</option>
                                        {charcRecetas.map(r => <option key={r.id} value={r.id}>{r.nombre} ({r.codigo})</option>)}
                                    </Select>
                                    <Input label="Código del Lote" placeholder="Ej. SLM-2026-05" value={charcForm.codigo_lote} onChange={v => setCharcForm({ ...charcForm, codigo_lote: v })} required />
                                    <Input label="Peso Inicial Crudo (gramos)" type="number" placeholder="Ej. 10000" value={charcForm.peso_inicial_g} onChange={v => setCharcForm({ ...charcForm, peso_inicial_g: v })} required />
                                    <Input label="Vencimiento Estimado (Opcional)" type="date" value={charcForm.fecha_vencimiento} onChange={v => setCharcForm({ ...charcForm, fecha_vencimiento: v })} />
                                </>
                            )}
                            
                            {sector === 'fraccionamiento' && (
                                <>
                                    <Select label="Materia Prima (Granel)" value={fraccForm.insumo_granel_id} onChange={handleInsumoChange} required>
                                        <option value="">Seleccionar granel...</option>
                                        {ingredients.filter(i => i.familia === 'Especias y Semillas' || i.tipo === 'insumo').map(i => (
                                            <option key={i.id} value={i.id}>{i.name} ({i.codigo})</option>
                                        ))}
                                    </Select>
                                    <Select label="Envase / Bolsa" value={fraccForm.empaque_id} onChange={e => setFraccForm({ ...fraccForm, empaque_id: e })} required>
                                        <option value="">Seleccionar empaque...</option>
                                        {ingredients.filter(i => i.tipo === 'empaque').map(i => (
                                            <option key={i.id} value={i.id}>{i.name}</option>
                                        ))}
                                    </Select>
                                    <Input label="Formato de Bolsa (gramos)" type="number" placeholder="Ej. 100" value={fraccForm.formato_bolsa_g} onChange={v => setFraccForm({ ...fraccForm, formato_bolsa_g: v })} required />
                                    <Input label="Cantidad a Fraccionar (gramos)" type="number" placeholder="Ej. 5000" value={fraccForm.cantidad_granel_consumida_g} onChange={v => setFraccForm({ ...fraccForm, cantidad_granel_consumida_g: v })} required />
                                    <Input label="Código Lote Generado" value={fraccForm.lote_pt_generado} onChange={v => setFraccForm({ ...fraccForm, lote_pt_generado: v })} required />
                                </>
                            )}
                            
                            <Button type="submit" variant="primary" className="w-full py-2" disabled={saving}>
                                {saving ? 'Guardando...' : 'Generar Orden'}
                            </Button>
                        </form>
                    </Card>

                    {/* 2. PENDIENTES */}
                    <Card className="fall-target p-4 border border-slate-200 shadow-sm bg-white">
                        <h4 className="text-xs font-black uppercase mb-3 italic border-b pb-2 text-slate-800">
                            {sector === 'bakery' ? 'Órdenes Planeadas' : sector === 'charcuteria' ? 'Inspección de Cámaras' : 'Envasados Pendientes'}
                        </h4>
                        
                        {sector === 'bakery' && (
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                {orders.filter(o => (o.status || o.estado) === 'PLANIFICADA').map(o => {
                                    const rec = recipes.find(r => r.id === (o.recipeId || o.receta_id));
                                    const unitLabel = rec?.formato_venta === 'Kg' ? 'Kg' : 'U';
                                    return (
                                        <div key={o.id} onClick={() => setSelectedOrder(o)} className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedOrder?.id === o.id ? 'bg-orange-50 border-orange-400 shadow-sm' : 'hover:bg-slate-50 border-slate-200'}`}>
                                            <p className="text-[9px] font-mono font-bold text-slate-400">{o.codigo_orden || o.id}</p>
                                            <p className="text-[11px] font-black uppercase italic mt-0.5 text-slate-800 truncate">{rec?.nombre_producto}</p>
                                            <p className="text-[9px] font-black text-blue-600 mt-1.5 bg-blue-50 inline-block px-1.5 py-0.5 rounded">{o.targetAmount || o.cantidad_objetivo} {unitLabel}</p>
                                        </div>
                                    );
                                })}
                                {orders.filter(o => (o.status || o.estado) === 'PLANIFICADA').length === 0 && (
                                    <p className="text-xs text-slate-400 italic text-center py-4">Sin órdenes pendientes</p>
                                )}
                            </div>
                        )}

                        {sector === 'charcuteria' && (
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                {charcLotes.filter(l => l.estado === 'EN_SECADO').map(l => {
                                    const rec = charcRecetas.find(r => r.id === l.receta_id);
                                    return (
                                        <div key={l.id} className="p-3 rounded-lg border border-slate-200 bg-white">
                                            <p className="text-[9px] font-mono font-bold text-slate-400">{l.codigo_lote}</p>
                                            <p className="text-[11px] font-black uppercase italic mt-0.5 text-slate-800 truncate">{rec?.nombre}</p>
                                            <p className="text-[9px] font-black text-purple-600 mt-1.5 bg-purple-50 inline-block px-1.5 py-0.5 rounded">Peso: {l.peso_actual_g.toLocaleString()} g</p>
                                        </div>
                                    );
                                })}
                                {charcLotes.filter(l => l.estado === 'EN_SECADO').length === 0 && (
                                    <p className="text-xs text-slate-400 italic text-center py-4">Sin lotes en cámara</p>
                                )}
                            </div>
                        )}

                        {sector === 'fraccionamiento' && (
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                {fraccTareas.filter(t => t.estado === 'PENDIENTE').map(t => {
                                    const ing = ingredients.find(i => i.id === t.insumo_granel_id);
                                    return (
                                        <div key={t.id} className="p-3 rounded-lg border border-slate-200 bg-white">
                                            <p className="text-[9px] font-mono font-bold text-slate-400">{t.lote_pt_generado}</p>
                                            <p className="text-[11px] font-black uppercase italic mt-0.5 text-slate-800 truncate">{ing?.name}</p>
                                            <p className="text-[9px] font-black text-emerald-600 mt-1.5 bg-emerald-50 inline-block px-1.5 py-0.5 rounded">Granel: {t.cantidad_granel_consumida_g.toLocaleString()} g</p>
                                        </div>
                                    );
                                })}
                                {fraccTareas.filter(t => t.estado === 'PENDIENTE').length === 0 && (
                                    <p className="text-xs text-slate-400 italic text-center py-4">Sin tareas planificadas</p>
                                )}
                            </div>
                        )}
                    </Card>
                </div>

                {/* 2. HOJA DE PRODUCCIÓN PRINCIPAL */}
                <Card className="fall-target lg:col-span-2 p-10 bg-white border border-slate-200 shadow-lg print:shadow-none print:border-none min-h-[600px] flex flex-col">
                    {!selectedOrder ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 print:hidden">
                            <ClipboardList size={64} className="mb-4 opacity-50" />
                            <p className="text-lg font-black uppercase tracking-widest italic">Selecciona una orden de panificación</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col animate-in fade-in">
                            <div className="flex justify-between items-start border-b-4 border-slate-900 pb-4 mb-6">
                                <div>
                                    <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Hoja de Producción</h1>
                                    <p className="text-xs font-bold uppercase text-slate-500 mt-1.5 tracking-[0.2em]">{selectedOrder.codigo_orden || selectedOrder.id}</p>
                                    <h2 className="text-xl font-black uppercase mt-3 text-orange-600">
                                        {recipes.find(r => r.id === (selectedOrder.recipeId || selectedOrder.receta_id))?.nombre_producto}
                                    </h2>
                                    <p className="text-sm font-black font-mono mt-1">
                                        Meta: {selectedOrder.targetAmount || selectedOrder.cantidad_objetivo} {recipes.find(r => r.id === (selectedOrder.recipeId || selectedOrder.receta_id))?.formato_venta === 'Kg' ? 'Kilos' : 'Unidades'}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <div className="border-4 border-slate-900 p-2 rounded-lg"><QrCode size={64} /></div>
                                    <p className="text-[8px] font-mono font-black mt-1">QR KANBAN</p>
                                </div>
                            </div>

                            <div className="flex-1 mb-6">
                                <table className="w-full text-left border border-slate-200">
                                    <thead className="bg-slate-100 text-[9px] uppercase font-black text-slate-600">
                                        <tr>
                                            <th className="px-3 py-1.5 w-10 text-center">OK</th>
                                            <th className="px-3 py-1.5">Insumo / Sub-BOM</th>
                                            <th className="px-3 py-1.5 text-right">Cant. Físico</th>
                                            <th className="px-3 py-1.5 text-center">Ubicación</th>
                                            <th className="px-3 py-1.5 text-center">Lote Sugerido</th>
                                            <th className="px-3 py-1.5 text-center w-24">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 text-[11px] font-bold text-slate-800">
                                        {recipes.find(r => r.id === (selectedOrder.recipeId || selectedOrder.receta_id))?.details?.flatMap((d, i) => {
                                            const recipe = recipes.find(r => r.id === (selectedOrder.recipeId || selectedOrder.receta_id));
                                            const ing = ingredients.find(ing => ing.id === d.ingredientId);
                                            
                                            // Cálculo de escala del lote mínimo
                                            let baseYield = recipe.peso_final || 1;
                                            if (recipe.formato_venta === 'Unidad' || !recipe.formato_venta) { 
                                                baseYield = recipe.peso_final / (recipe.peso_unidad || 100); 
                                            } else if (recipe.formato_venta === 'Kg') { 
                                                baseYield = recipe.peso_final / 1000; 
                                            }
                                            
                                            const targetAmt = selectedOrder.targetAmount || selectedOrder.cantidad_objetivo;
                                            const factor = targetAmt / baseYield;
                                            const gramosReales = Number(d.gramos) * factor;
                                            const displayGramos = gramosReales >= 1000 ? `${(gramosReales / 1000).toFixed(2)} Kg` : `${gramosReales.toFixed(0)} g`;

                                            // Si es un WIP (subensamble) y está marcado como explotado
                                            if (ing?.es_subensamble && explodedWips[ing.id]) {
                                                const subRecipe = recipes.find(r => r.codigo === ing.codigo || r.nombre_producto === ing.name?.replace('[WIP] ', ''));
                                                
                                                if (subRecipe) {
                                                    const subFactor = gramosReales / (subRecipe.peso_final || 1);
                                                    
                                                    return [
                                                        // Cabecera WIP con indicación de que fue explotado
                                                        <tr key={`wip-hdr-${i}`} className="bg-slate-50 border-l-4 border-orange-500 opacity-60">
                                                            <td className="px-3 py-1.5 text-center"><Square size={14} className="text-slate-300 mx-auto" /></td>
                                                            <td className="px-3 py-1.5 uppercase font-black text-orange-600 flex items-center gap-1">
                                                                <Layers size={10} /> {ing?.name} (Explotado)
                                                            </td>
                                                            <td className="px-3 py-1.5 text-right font-mono">{displayGramos}</td>
                                                            <td className="px-3 py-1.5 text-center">—</td>
                                                            <td className="px-3 py-1.5 text-center text-orange-600 font-bold">EXPLOSIÓN MP</td>
                                                            <td className="px-3 py-1.5 text-center">
                                                                <button type="button" onClick={() => toggleExplodeWip(ing.id)} className="text-slate-500 hover:text-slate-900 text-[8px] bg-slate-200 px-1.5 py-0.5 rounded font-black uppercase">Consolidar</button>
                                                            </td>
                                                        </tr>,
                                                        // Filas secundarias derivadas (Explosión)
                                                        ...subRecipe.details.map((sd, sIdx) => {
                                                            const subIng = ingredients.find(x => x.id === sd.ingredientId);
                                                            const subGramos = Number(sd.gramos) * subFactor;
                                                            const subDisplayGramos = subGramos >= 1000 ? `${(subGramos / 1000).toFixed(2)} Kg` : `${subGramos.toFixed(0)} g`;
                                                            
                                                            return (
                                                                <tr key={`wip-child-${i}-${sIdx}`} className="bg-orange-50/20 border-l-4 border-orange-300 text-slate-600">
                                                                    <td className="px-3 py-1.5 text-center"><Square size={14} className="text-slate-300 mx-auto" /></td>
                                                                    <td className="px-3 py-1.5 uppercase pl-6 font-bold flex items-center gap-1">
                                                                        ↳ {subIng?.name}
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-right font-mono text-slate-700 bg-orange-50/10">{subDisplayGramos}</td>
                                                                    <td className="px-3 py-1.5 text-center"><span className="px-1.5 py-0.5 rounded text-[8px] uppercase bg-slate-50 border flex items-center justify-center gap-1"><MapPin size={8} /> {getLocation(subIng)}</span></td>
                                                                    <td className="px-3 py-1.5 text-center font-mono text-[9px] text-orange-600">{getFefoLot(subIng?.id)}</td>
                                                                    <td className="px-3 py-1.5 text-center">—</td>
                                                                </tr>
                                                            );
                                                        })
                                                    ];
                                                }
                                            }

                                            // Fila estándar (Panificado normal o WIP sin explotar)
                                            return (
                                                <tr key={i} className={ing?.es_subensamble ? "bg-orange-50/20 border-l-4 border-amber-500" : ""}>
                                                    <td className="px-3 py-1.5 text-center"><Square size={14} className="text-slate-300 mx-auto" /></td>
                                                    <td className="px-3 py-1.5 uppercase font-bold flex items-center gap-1.5">
                                                        {ing?.name} 
                                                        {ing?.es_subensamble && (
                                                            <span className="bg-amber-100 text-amber-800 text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                                <Sparkles size={8} /> WIP
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right font-mono text-blue-700 bg-blue-50/50">{displayGramos}</td>
                                                    <td className="px-3 py-1.5 text-center">
                                                        <span className="px-1.5 py-0.5 rounded text-[8px] uppercase bg-slate-50 border flex items-center justify-center gap-1">
                                                            <MapPin size={8} /> {getLocation(ing)}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-1.5 text-center font-mono text-[9px] text-orange-600">
                                                        {getFefoLot(ing?.id)}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-center">
                                                        {ing?.es_subensamble ? (
                                                            <div className="flex flex-col gap-1 items-center">
                                                                <span className="text-[7px] text-slate-400">Stock WIP: {(getWipStock(ing.id) / 1000).toFixed(1)} kg</span>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => toggleExplodeWip(ing.id)}
                                                                    className="text-orange-700 hover:text-white border border-orange-300 hover:bg-orange-500 text-[8px] bg-orange-50 px-2 py-0.5 rounded font-black uppercase transition-all flex items-center gap-0.5"
                                                                >
                                                                    <Layers size={8} /> Explotar
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="grid grid-cols-2 gap-8 border-t-2 border-dashed pt-6 mb-6 opacity-50">
                                <div className="border-b border-slate-900 pb-1 text-center"><p className="text-[9px] font-black uppercase">Firma Pañolero</p></div>
                                <div className="border-b border-slate-900 pb-1 text-center"><p className="text-[9px] font-black uppercase">Firma Supervisor</p></div>
                            </div>

                            <div className="flex justify-end gap-3 print:hidden mt-auto border-t pt-4">
                                <Button variant="secondary" onClick={() => window.print()} className="py-2"><Printer size={14} /> Imprimir Hoja</Button>
                                <Button variant="success" onClick={() => activateOrder(selectedOrder.id)} className="py-2">Activar Kanban</Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}