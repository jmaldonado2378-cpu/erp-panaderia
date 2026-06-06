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
    
    // Helper to parse observations
    const parseObs = (obs) => {
        try {
            return obs ? JSON.parse(obs) : {};
        } catch (e) {
            return {};
        }
    };

    const FAMILIAS_CHARC = {
        fermentado_seco: { color: 'bg-red-700' },
        salazon_cruda: { color: 'bg-amber-600' },
        emulsion_fina: { color: 'bg-blue-600' },
        salazon_inyectada: { color: 'bg-emerald-600' },
        embutido_fresco: { color: 'bg-indigo-600' }
    };
    
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

    const handleCharcRecipeChange = (recipeId) => {
        const recipe = charcRecetas.find(r => r.id === recipeId);
        if (!recipe) {
            setCharcForm(prev => ({ ...prev, receta_id: recipeId, codigo_lote: '' }));
            return;
        }
        const parts = (recipe.codigo || '').split('-');
        let codePrefix = 'CH';
        if (parts.length >= 2) {
            codePrefix = parts[1];
        } else if (recipe.codigo) {
            codePrefix = recipe.codigo;
        }
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yymm = `${yy}${mm}`;
        const rand3 = Math.floor(100 + Math.random() * 900);
        const generatedLot = `${codePrefix}-${yymm}-${rand3}`;
        setCharcForm(prev => ({
            ...prev,
            receta_id: recipeId,
            codigo_lote: generatedLot.toUpperCase()
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
            
            const metadata = {
                linea: 'charcuteria',
                charc_receta_id: charcForm.receta_id,
                codigo_lote: charcForm.codigo_lote.toUpperCase()
            };

            try {
                const { data, error } = await supabase
                    .from('ordenes_produccion')
                    .insert([{
                        codigo_orden: codigoOrden,
                        receta_id: null,
                        cantidad_objetivo: Number(charcForm.peso_inicial_g),
                        unidad: 'gramos',
                        estado: 'PLANIFICADA',
                        fecha: new Date().toISOString().split('T')[0],
                        observaciones: JSON.stringify(metadata)
                    }])
                    .select();
                if (error) throw error;
                if (data) {
                    setOrders([{ ...data[0], recipeId: null, targetAmount: data[0].cantidad_objetivo, status: data[0].estado }, ...orders]);
                }
                showToast("✅ Orden de Charcutería planificada.");
            } catch (err) {
                console.warn("Error Supabase. Guardando localmente:", err.message);
                const localOrder = {
                    id: 'o_' + Date.now(),
                    codigo_orden: codigoOrden,
                    receta_id: null,
                    cantidad_objetivo: Number(charcForm.peso_inicial_g),
                    unidad: 'gramos',
                    estado: 'PLANIFICADA',
                    status: 'PLANIFICADA',
                    fecha: new Date().toISOString().split('T')[0],
                    observaciones: JSON.stringify(metadata)
                };
                setOrders([localOrder, ...orders]);
                showToast("✅ Orden guardada localmente (Offline).");
            }
            setCharcForm({ receta_id: '', codigo_lote: '', peso_inicial_g: '', fecha_vencimiento: '' });
        }
        else if (sector === 'fraccionamiento') {
            if (!fraccForm.insumo_granel_id || !fraccForm.empaque_id || !fraccForm.cantidad_granel_consumida_g || !fraccForm.lote_pt_generado) {
                showToast("Complete todos los campos del fraccionamiento", "error");
                setSaving(false);
                return;
            }
            
            const metadata = {
                linea: 'fraccionamiento',
                insumo_granel_id: fraccForm.insumo_granel_id,
                empaque_id: fraccForm.empaque_id,
                formato_bolsa_g: Number(fraccForm.formato_bolsa_g),
                lote_pt_generado: fraccForm.lote_pt_generado.toUpperCase()
            };

            try {
                const { data, error } = await supabase
                    .from('ordenes_produccion')
                    .insert([{
                        codigo_orden: codigoOrden,
                        receta_id: null,
                        cantidad_objetivo: Number(fraccForm.cantidad_granel_consumida_g),
                        unidad: 'gramos',
                        estado: 'PLANIFICADA',
                        fecha: new Date().toISOString().split('T')[0],
                        observaciones: JSON.stringify(metadata)
                    }])
                    .select();
                if (error) throw error;
                if (data) {
                    setOrders([{ ...data[0], recipeId: null, targetAmount: data[0].cantidad_objetivo, status: data[0].estado }, ...orders]);
                }
                showToast("✅ Orden de Fraccionamiento planificada.");
            } catch (err) {
                console.warn("Error Supabase. Guardando localmente:", err.message);
                const localOrder = {
                    id: 'o_' + Date.now(),
                    codigo_orden: codigoOrden,
                    receta_id: null,
                    cantidad_objetivo: Number(fraccForm.cantidad_granel_consumida_g),
                    unidad: 'gramos',
                    estado: 'PLANIFICADA',
                    status: 'PLANIFICADA',
                    fecha: new Date().toISOString().split('T')[0],
                    observaciones: JSON.stringify(metadata)
                };
                setOrders([localOrder, ...orders]);
                showToast("✅ Orden guardada localmente (Offline).");
            }
            setFraccForm({ insumo_granel_id: '', empaque_id: '', formato_bolsa_g: 100, cantidad_granel_consumida_g: '', lote_pt_generado: '' });
        }
        setSaving(false);
    };

    const activateOrder = async (id) => {
        const orderToActivate = orders.find(o => o.id === id);
        if (!orderToActivate) return;
        const obsData = parseObs(orderToActivate.observaciones);
        const isCharc = obsData.linea === 'charcuteria';
        const isFracc = obsData.linea === 'fraccionamiento';
        
        const targetState = isCharc ? 'PREPARACION' : isFracc ? 'PENDIENTE' : 'PESAJE';
        const toastMsg = isCharc ? 'Orden derivada a Preparación en Cámaras.' : isFracc ? 'Orden derivada a Fraccionamiento.' : 'Orden activada en Kanban de Planta.';

        try {
            const { error } = await supabase.from('ordenes_produccion').update({ estado: targetState }).eq('id', id);
            if (error) throw error;
            
            if (isCharc) {
                const rec = charcRecetas.find(r => r.id === obsData.charc_receta_id);
                const vencimiento = new Date(Date.now() + (rec?.lead_time_dias || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                const lote = {
                    receta_id: obsData.charc_receta_id,
                    codigo_lote: obsData.codigo_lote,
                    peso_inicial_g: Number(orderToActivate.cantidad_objetivo || orderToActivate.targetAmount),
                    peso_actual_g: Number(orderToActivate.cantidad_objetivo || orderToActivate.targetAmount),
                    estado: 'PREPARACION',
                    fecha_ingreso: new Date().toISOString(),
                    fecha_vencimiento: vencimiento
                };
                if (addCharcLote) await addCharcLote(lote);
            } else if (isFracc) {
                const task = {
                    insumo_granel_id: obsData.insumo_granel_id,
                    cantidad_granel_consumida_g: Number(orderToActivate.cantidad_objetivo || orderToActivate.targetAmount),
                    empaque_id: obsData.empaque_id,
                    formato_bolsa_g: Number(obsData.formato_bolsa_g),
                    cantidad_bolsas_obtenidas: 0,
                    lote_pt_generado: obsData.lote_pt_generado,
                    estado: 'PENDIENTE',
                    fecha_tarea: new Date().toISOString()
                };
                if (addFraccTarea) await addFraccTarea(task);
            }

            setOrders(orders.map(o => o.id === id ? { ...o, status: targetState, estado: targetState } : o));
            setSelectedOrder(null);
            showToast(toastMsg);
        } catch (err) {
            console.error("Error activating order:", err.message);
            // Local fallback
            if (isCharc) {
                const rec = charcRecetas.find(r => r.id === obsData.charc_receta_id);
                const vencimiento = new Date(Date.now() + (rec?.lead_time_dias || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                const lote = {
                    id: 'cl_' + Date.now(),
                    receta_id: obsData.charc_receta_id,
                    codigo_lote: obsData.codigo_lote,
                    peso_inicial_g: Number(orderToActivate.cantidad_objetivo || orderToActivate.targetAmount),
                    peso_actual_g: Number(orderToActivate.cantidad_objetivo || orderToActivate.targetAmount),
                    estado: 'PREPARACION',
                    fecha_ingreso: new Date().toISOString(),
                    fecha_vencimiento: vencimiento
                };
                if (addCharcLote) addCharcLote(lote);
            } else if (isFracc) {
                const task = {
                    id: 'ft_' + Date.now(),
                    insumo_granel_id: obsData.insumo_granel_id,
                    cantidad_granel_consumida_g: Number(orderToActivate.cantidad_objetivo || orderToActivate.targetAmount),
                    empaque_id: obsData.empaque_id,
                    formato_bolsa_g: Number(obsData.formato_bolsa_g),
                    cantidad_bolsas_obtenidas: 0,
                    lote_pt_generado: obsData.lote_pt_generado,
                    estado: 'PENDIENTE',
                    fecha_tarea: new Date().toISOString()
                };
                if (addFraccTarea) addFraccTarea(task);
            }
            setOrders(orders.map(o => o.id === id ? { ...o, status: targetState, estado: targetState } : o));
            setSelectedOrder(null);
            showToast(toastMsg + " (Local/Offline)");
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
                                    <Select label="Ficha Técnica Charcutería" value={charcForm.receta_id} onChange={handleCharcRecipeChange} required>
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
                                {orders.filter(o => (o.status || o.estado) === 'PLANIFICADA' && (!o.receta_id || !parseObs(o.observaciones).linea || parseObs(o.observaciones).linea === 'bakery')).map(o => {
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
                                {orders.filter(o => (o.status || o.estado) === 'PLANIFICADA' && (!o.receta_id || !parseObs(o.observaciones).linea || parseObs(o.observaciones).linea === 'bakery')).length === 0 && (
                                    <p className="text-xs text-slate-400 italic text-center py-4">Sin órdenes pendientes</p>
                                )}
                            </div>
                        )}

                        {sector === 'charcuteria' && (
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                {orders.filter(o => (o.status || o.estado) === 'PLANIFICADA' && parseObs(o.observaciones).linea === 'charcuteria').map(o => {
                                    const obs = parseObs(o.observaciones);
                                    const rec = charcRecetas.find(r => r.id === obs.charc_receta_id);
                                    return (
                                        <div key={o.id} onClick={() => setSelectedOrder(o)} className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedOrder?.id === o.id ? 'bg-orange-50 border-orange-400 shadow-sm' : 'hover:bg-slate-50 border-slate-200'}`}>
                                            <p className="text-[9px] font-mono font-bold text-slate-400">{o.codigo_orden || o.id}</p>
                                            <p className="text-[11px] font-black uppercase italic mt-0.5 text-slate-800 truncate">{rec?.nombre || 'Charcutería'}</p>
                                            <p className="text-[9px] font-black text-purple-600 mt-1.5 bg-purple-50 inline-block px-1.5 py-0.5 rounded">Peso: {o.cantidad_objetivo.toLocaleString()} g</p>
                                        </div>
                                    );
                                })}
                                {orders.filter(o => (o.status || o.estado) === 'PLANIFICADA' && parseObs(o.observaciones).linea === 'charcuteria').length === 0 && (
                                    <p className="text-xs text-slate-400 italic text-center py-4">Sin órdenes de charcutería</p>
                                )}
                            </div>
                        )}

                        {sector === 'fraccionamiento' && (
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                {orders.filter(o => (o.status || o.estado) === 'PLANIFICADA' && parseObs(o.observaciones).linea === 'fraccionamiento').map(o => {
                                    const obs = parseObs(o.observaciones);
                                    const ing = ingredients.find(i => i.id === obs.insumo_granel_id);
                                    return (
                                        <div key={o.id} onClick={() => setSelectedOrder(o)} className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedOrder?.id === o.id ? 'bg-orange-50 border-orange-400 shadow-sm' : 'hover:bg-slate-50 border-slate-200'}`}>
                                            <p className="text-[9px] font-mono font-bold text-slate-400">{o.codigo_orden || o.id}</p>
                                            <p className="text-[11px] font-black uppercase italic mt-0.5 text-slate-800 truncate">Fracc: {ing?.name}</p>
                                            <p className="text-[9px] font-black text-emerald-600 mt-1.5 bg-emerald-50 inline-block px-1.5 py-0.5 rounded">Granel: {o.cantidad_objetivo.toLocaleString()} g</p>
                                        </div>
                                    );
                                })}
                                {orders.filter(o => (o.status || o.estado) === 'PLANIFICADA' && parseObs(o.observaciones).linea === 'fraccionamiento').length === 0 && (
                                    <p className="text-xs text-slate-400 italic text-center py-4">Sin órdenes de fraccionamiento</p>
                                )}
                            </div>
                        )}
                    </Card>
                </div>

                {/* 2. HOJA DE PRODUCCIÓN PRINCIPAL */}
                <Card id="printable-production-order" className="fall-target lg:col-span-2 p-10 bg-white border border-slate-200 shadow-lg print:shadow-none print:border-none min-h-[600px] flex flex-col">
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
                                        {(() => {
                                            const obs = parseObs(selectedOrder.observaciones);
                                            if (obs.linea === 'charcuteria') {
                                                const rec = charcRecetas.find(r => r.id === obs.charc_receta_id);
                                                return rec?.nombre || 'Producto Charcutería';
                                            }
                                            if (obs.linea === 'fraccionamiento') {
                                                const ing = ingredients.find(i => i.id === obs.insumo_granel_id);
                                                return `Fraccionado: ${ing?.name || 'Insumo'}`;
                                            }
                                            return recipes.find(r => r.id === (selectedOrder.recipeId || selectedOrder.receta_id))?.nombre_producto;
                                        })()}
                                    </h2>
                                    <p className="text-sm font-black font-mono mt-1">
                                        {(() => {
                                            const obs = parseObs(selectedOrder.observaciones);
                                            const targetAmt = selectedOrder.targetAmount || selectedOrder.cantidad_objetivo;
                                            if (obs.linea === 'charcuteria') {
                                                return `Lote Objetivo: ${(targetAmt / 1000).toFixed(1)} Kg`;
                                            }
                                            if (obs.linea === 'fraccionamiento') {
                                                const bags = Math.ceil(targetAmt / (obs.formato_bolsa_g || 100));
                                                return `Meta: ${(targetAmt / 1000).toFixed(1)} Kg (${bags} bolsas de ${obs.formato_bolsa_g}g)`;
                                            }
                                            const rec = recipes.find(r => r.id === (selectedOrder.recipeId || selectedOrder.receta_id));
                                            return `Meta: ${targetAmt} ${rec?.formato_venta === 'Kg' ? 'Kilos' : 'Unidades'}`;
                                        })()}
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
                                        {(() => {
                                            const obsData = parseObs(selectedOrder.observaciones);
                                            const isCharc = obsData.linea === 'charcuteria';
                                            const isFracc = obsData.linea === 'fraccionamiento';
                                            
                                            if (isCharc) {
                                                const rec = charcRecetas.find(r => r.id === obsData.charc_receta_id);
                                                if (!rec) return [];
                                                
                                                const targetAmt = selectedOrder.targetAmount || selectedOrder.cantidad_objetivo;
                                                let scaled = [];
                                                
                                                if (rec.familia_tecnologica === 'fermentado_seco' || rec.familia_tecnologica === 'emulsion_fina' || rec.familia_tecnologica === 'embutido_fresco') {
                                                    scaled = rec.details.map(d => ({
                                                        ...d,
                                                        gramos_calculados: Math.round((targetAmt * Number(d.porcentaje_base || 0)) / 100)
                                                    }));
                                                } else if (rec.familia_tecnologica === 'salazon_cruda') {
                                                    scaled = rec.details.map(d => ({
                                                        ...d,
                                                        gramos_calculados: d.categoria_tecnologica === 'magro' ? targetAmt : Math.round((targetAmt * Number(d.porcentaje_base)) / 100)
                                                    }));
                                                } else if (rec.familia_tecnologica === 'salazon_inyectada') {
                                                    const injPct = Number(rec.porcentaje_inyeccion || 10);
                                                    const w_salmuera = (targetAmt * injPct) / 100;
                                                    let totalAditivosG = 0;
                                                    const ingredientsScaled = rec.details
                                                        .filter(d => d.categoria_tecnologica !== 'magro' && d.categoria_tecnologica !== 'empaque')
                                                        .map(d => {
                                                            const g = Math.round((targetAmt * Number(d.porcentaje_base)) / 100);
                                                            totalAditivosG += g;
                                                            return { ...d, gramos_calculados: g };
                                                        });
                                                    const waterG = w_salmuera - totalAditivosG;
                                                    const waterDetail = {
                                                        ingredientId: 'i3',
                                                        porcentaje_base: null,
                                                        categoria_tecnologica: 'vector_liquido',
                                                        secuencia_mezcla: 1,
                                                        gramos_calculados: Math.round(waterG)
                                                    };
                                                    scaled = [
                                                        rec.details.find(d => d.categoria_tecnologica === 'magro'),
                                                        waterDetail,
                                                        ...ingredientsScaled
                                                    ].filter(Boolean);
                                                }
                                                
                                                return scaled.map((d, idx) => {
                                                    const ing = ingredients.find(x => x.id === d.ingredientId);
                                                    const displayGramos = d.gramos_calculados >= 1000 ? `${(d.gramos_calculados / 1000).toFixed(2)} Kg` : `${Math.round(d.gramos_calculados)} g`;
                                                    
                                                    return (
                                                        <tr key={`charc-${idx}`}>
                                                            <td className="px-3 py-1.5 text-center"><Square size={14} className="text-slate-300 mx-auto" /></td>
                                                            <td className="px-3 py-1.5 uppercase font-bold flex items-center gap-1.5">
                                                                {ing?.name || 'Insumo'}
                                                                <span className="text-[7px] px-1.5 py-0.5 rounded font-black bg-purple-100 text-purple-800 uppercase shrink-0">
                                                                    {d.categoria_tecnologica}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-1.5 text-right font-mono text-purple-700 bg-purple-50/50">{displayGramos}</td>
                                                            <td className="px-3 py-1.5 text-center">
                                                                <span className="px-1.5 py-0.5 rounded text-[8px] uppercase bg-slate-50 border flex items-center justify-center gap-1">
                                                                    <MapPin size={8} /> {getLocation(ing)}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-1.5 text-center font-mono text-[9px] text-orange-600">
                                                                {getFefoLot(d.ingredientId)}
                                                            </td>
                                                            <td className="px-3 py-1.5 text-center">
                                                                <span className="text-slate-300">—</span>
                                                            </td>
                                                        </tr>
                                                    );
                                                });
                                            }
                                            
                                            if (isFracc) {
                                                const ingGranel = ingredients.find(i => i.id === obsData.insumo_granel_id);
                                                const ingEmpaque = ingredients.find(i => i.id === obsData.empaque_id);
                                                const targetAmt = selectedOrder.targetAmount || selectedOrder.cantidad_objetivo;
                                                const formatBolsa = obsData.formato_bolsa_g || 100;
                                                const totalBags = Math.ceil(targetAmt / formatBolsa);
                                                
                                                const rows = [
                                                    {
                                                        name: `Materia Prima: ${ingGranel?.name || 'Granel'}`,
                                                        type: 'Granel',
                                                        qty: `${(targetAmt / 1000).toFixed(2)} Kg`,
                                                        loc: getLocation(ingGranel),
                                                        lot: getFefoLot(obsData.insumo_granel_id),
                                                        color: 'bg-amber-100 text-amber-800'
                                                    },
                                                    {
                                                        name: `Envase: ${ingEmpaque?.name || 'Bolsa'}`,
                                                        type: 'Empaque',
                                                        qty: `${totalBags} Unidades`,
                                                        loc: getLocation(ingEmpaque),
                                                        lot: getFefoLot(obsData.empaque_id),
                                                        color: 'bg-blue-100 text-blue-800'
                                                    }
                                                ];
                                                
                                                return rows.map((r, idx) => (
                                                    <tr key={`fracc-${idx}`}>
                                                        <td className="px-3 py-1.5 text-center"><Square size={14} className="text-slate-300 mx-auto" /></td>
                                                        <td className="px-3 py-1.5 uppercase font-bold flex items-center gap-1.5">
                                                            {r.name}
                                                            <span className={`text-[7px] px-1.5 py-0.5 rounded font-black uppercase shrink-0 ${r.color}`}>
                                                                {r.type}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-1.5 text-right font-mono text-emerald-700 bg-emerald-50/50">{r.qty}</td>
                                                        <td className="px-3 py-1.5 text-center">
                                                            <span className="px-1.5 py-0.5 rounded text-[8px] uppercase bg-slate-50 border flex items-center justify-center gap-1">
                                                                <MapPin size={8} /> {r.loc}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-1.5 text-center font-mono text-[9px] text-orange-600">
                                                            {r.lot}
                                                        </td>
                                                        <td className="px-3 py-1.5 text-center">
                                                            <span className="text-slate-300">—</span>
                                                        </td>
                                                    </tr>
                                                ));
                                            }

                                            // Fallback: Bakery
                                            const rec = recipes.find(r => r.id === (selectedOrder.recipeId || selectedOrder.receta_id));
                                            if (!rec) return [];
                                            
                                            const targetAmt = selectedOrder.targetAmount || selectedOrder.cantidad_objetivo;
                                            let unidades_rinde = 1;
                                            if (rec.formato_venta === 'Unidad' && Number(rec.peso_unidad) > 0) {
                                                unidades_rinde = Math.floor(Number(rec.peso_final) / Number(rec.peso_unidad)) || 1;
                                            } else {
                                                unidades_rinde = (Number(rec.peso_final) / 1000) || 1;
                                            }
                                            const scale = targetAmt / unidades_rinde;
                                            
                                            const details = rec.details || [];
                                            const rRows = [];
                                            
                                            details.forEach((d, idx) => {
                                                const ing = ingredients.find(x => x.id === d.ingredientId);
                                                const gramos = Math.round((Number(d.gramos) || 0) * scale);
                                                const displayGramos = gramos >= 1000 ? `${(gramos / 1000).toFixed(2)} Kg` : `${gramos} g`;
                                                const isWip = ing?.name?.startsWith('[WIP]') || ing?.tipo === 'wip';
                                                
                                                rRows.push(
                                                    <tr key={`bakery-parent-${idx}`}>
                                                        <td className="px-3 py-1.5 text-center"><Square size={14} className="text-slate-300 mx-auto" /></td>
                                                        <td className="px-3 py-1.5 uppercase font-bold flex items-center gap-1.5">
                                                            {ing?.name || 'Insumo'}
                                                            {isWip && (
                                                                <>
                                                                    <span className="text-[7px] px-1.5 py-0.5 rounded font-black bg-orange-100 text-orange-800 uppercase shrink-0">WIP</span>
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => toggleExplodeWip(ing.id)}
                                                                        className="text-[8px] bg-slate-200 px-1.5 py-0.5 rounded font-black uppercase text-slate-600 hover:bg-slate-300 ml-1.5 print:hidden"
                                                                    >
                                                                        {explodedWips[ing.id] ? 'Consolidar' : 'Explotar'}
                                                                    </button>
                                                                </>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-1.5 text-right font-mono text-blue-700 bg-blue-50/50">{displayGramos}</td>
                                                        <td className="px-3 py-1.5 text-center">
                                                            <span className="px-1.5 py-0.5 rounded text-[8px] uppercase bg-slate-50 border flex items-center justify-center gap-1">
                                                                <MapPin size={8} /> {getLocation(ing)}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-1.5 text-center font-mono text-[9px] text-orange-600">{getFefoLot(d.ingredientId)}</td>
                                                        <td className="px-3 py-1.5 text-center">
                                                            <span className="text-slate-300">—</span>
                                                        </td>
                                                    </tr>
                                                );
                                                
                                                if (isWip && explodedWips[ing.id]) {
                                                    const subRecipe = recipes.find(r => r.codigo === ing.codigo || r.nombre_producto === ing.name?.replace('[WIP] ', ''));
                                                    if (subRecipe && subRecipe.details) {
                                                        const subScale = gramos / (Number(subRecipe.peso_final) || 1);
                                                        subRecipe.details.forEach((sd, sIdx) => {
                                                            const subIng = ingredients.find(x => x.id === sd.ingredientId);
                                                            const subGramos = Math.round((Number(sd.gramos) || 0) * subScale);
                                                            const displaySubGramos = subGramos >= 1000 ? `${(subGramos / 1000).toFixed(2)} Kg` : `${subGramos} g`;
                                                            rRows.push(
                                                                <tr key={`bakery-child-${idx}-${sIdx}`} className="bg-orange-50/30">
                                                                    <td className="px-3 py-1.5 text-center"><Square size={14} className="text-slate-300 mx-auto" /></td>
                                                                    <td className="px-3 py-1.5 uppercase font-medium pl-6 text-slate-600 flex items-center gap-1.5">
                                                                        ↳ {subIng?.name || 'Componente'}
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-right font-mono text-orange-700">{displaySubGramos}</td>
                                                                    <td className="px-3 py-1.5 text-center">
                                                                        <span className="px-1.5 py-0.5 rounded text-[8px] uppercase bg-slate-50 border flex items-center justify-center gap-1">
                                                                            <MapPin size={8} /> {getLocation(subIng)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-center font-mono text-[9px] text-orange-600">{getFefoLot(sd.ingredientId)}</td>
                                                                    <td className="px-3 py-1.5 text-center">
                                                                        <span className="text-slate-300">—</span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        });
                                                    }
                                                }
                                            });
                                            
                                            return rRows;
                                        })()}
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

            {/* ESTILO DE IMPRESIÓN */}
            <style>{`
                @media print {
                    html, body, main, .h-screen, .overflow-hidden, div {
                        height: auto !important;
                        overflow: visible !important;
                        min-height: 0 !important;
                    }
                    .print\:hidden, aside, header, button {
                        display: none !important;
                    }
                    #printable-production-order {
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