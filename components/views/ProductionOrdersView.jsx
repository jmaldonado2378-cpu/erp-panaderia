import React, { useState } from 'react';
import { ClipboardList, QrCode, Square, MapPin, Printer } from 'lucide-react';
import { Card, Button, Input, Select } from '../bakery_erp';
import { supabase } from '../../lib/supabase';

export default function ProductionOrdersView({ recipes, ingredients, lots, orders, setOrders, showToast }) {
    const [form, setForm] = useState({ recipeId: '', amount: '' });
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [saving, setSaving] = useState(false);

    const selectedRecipe = recipes.find(r => r.id === form.recipeId);
    const labelMeta = selectedRecipe?.formato_venta === 'Kg' ? 'Kilos (Meta)' : 'Unidades (Meta)';

    const createOrder = async (e) => {
        e.preventDefault();
        if (!form.recipeId || !form.amount) return;
        setSaving(true);
        const codigoOrden = `OP-${Date.now().toString(36).toUpperCase()}`;
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
        if (error) { showToast('Error BD: ' + error.message, 'error'); setSaving(false); return; }
        if (data) {
            setOrders([{ ...data[0], recipeId: data[0].receta_id, targetAmount: data[0].cantidad_objetivo, status: data[0].estado }, ...orders]);
        }
        setForm({ recipeId: '', amount: '' });
        setSaving(false);
        showToast("✅ Orden de Producción guardada en la nube.");
    };

    const activateOrder = async (id) => {
        const { error } = await supabase.from('ordenes_produccion').update({ estado: 'PLANIFICADA' }).eq('id', id);
        if (error) { showToast('Error BD: ' + error.message, 'error'); return; }
        setOrders(orders.map(o => o.id === id ? { ...o, status: 'PLANIFICADA', estado: 'PLANIFICADA' } : o));
        setSelectedOrder(null);
        showToast("Orden activada en Kanban de Planta.");
    };

    const getLocation = (ing) => ing?.almacen || 'Almacén Secos Principal';
    const getFefoLot = (ingId) => {
        const l = lots.filter(x => (x.ingredientId || x.ingrediente_id) === ingId && (x.amount || x.cantidad_actual) > 0)
            .sort((a, b) => new Date(a.expiry || a.fecha_vencimiento) - new Date(b.expiry || b.fecha_vencimiento));
        return l.length > 0 ? (l[0].codigo_lote || l[0].id) : 'S/Stock';
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-6 print:hidden">
                    <Card className="fall-target p-5">
                        <h4 className="text-sm font-black uppercase mb-3 italic text-slate-800">1. Crear Orden</h4>
                        <form onSubmit={createOrder} className="space-y-3">
                            <Select label="Ficha Técnica" value={form.recipeId} onChange={e => setForm({ ...form, recipeId: e })} required>
                                <option value="">Seleccionar Producto...</option>
                                {recipes.map(r => <option key={r.id} value={r.id}>{r.nombre_producto}</option>)}
                            </Select>
                            <Input label={labelMeta} type="number" value={form.amount} onChange={v => setForm({ ...form, amount: v })} required />
                            <Button type="submit" variant="primary" className="w-full py-2" disabled={saving}>
                                {saving ? 'Guardando...' : 'Generar Orden'}
                            </Button>
                        </form>
                    </Card>
                    <Card className="fall-target p-4">
                        <h4 className="text-xs font-black uppercase mb-3 italic border-b pb-2 text-slate-800">2. Pendientes</h4>
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
                    </Card>
                </div>

                <Card className="fall-target lg:col-span-2 p-10 bg-white border-2 border-slate-200 shadow-xl print:shadow-none print:border-none min-h-[600px] flex flex-col">
                    {!selectedOrder ? (<div className="flex-1 flex flex-col items-center justify-center text-slate-300 print:hidden"><ClipboardList size={64} className="mb-4 opacity-50" /><p className="text-lg font-black uppercase tracking-widest italic">Seleccioná una orden</p></div>) : (
                        <div className="flex-1 flex flex-col animate-in fade-in">
                            <div className="flex justify-between items-start border-b-4 border-slate-900 pb-4 mb-6">
                                <div>
                                    <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Hoja de Producción</h1>
                                    <p className="text-xs font-bold uppercase text-slate-500 mt-1.5 tracking-[0.2em]">{selectedOrder.codigo_orden || selectedOrder.id}</p>
                                    <h2 className="text-xl font-black uppercase mt-3 text-orange-600">{recipes.find(r => r.id === (selectedOrder.recipeId || selectedOrder.receta_id))?.nombre_producto}</h2>
                                    <p className="text-sm font-black font-mono mt-1">Meta: {selectedOrder.targetAmount || selectedOrder.cantidad_objetivo} {recipes.find(r => r.id === (selectedOrder.recipeId || selectedOrder.receta_id))?.formato_venta === 'Kg' ? 'Kilos' : 'Unidades'}</p>
                                </div>
                                <div className="text-center">
                                    <div className="border-4 border-slate-900 p-2 rounded-lg"><QrCode size={64} /></div>
                                    <p className="text-[8px] font-mono font-black mt-1">QR KANBAN</p>
                                </div>
                            </div>

                            <div className="flex-1 mb-6">
                                <table className="w-full text-left border-2 border-slate-200">
                                    <thead className="bg-slate-100 text-[9px] uppercase font-black text-slate-600">
                                        <tr><th className="px-3 py-1.5 w-10 text-center">OK</th><th className="px-3 py-1.5">Insumo / WIP</th><th className="px-3 py-1.5 text-right">Cant. Físico</th><th className="px-3 py-1.5 text-center">Ubicación</th><th className="px-3 py-1.5 text-center">Lote Sugerido</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 border-t-2 border-slate-200 text-[11px] font-bold text-slate-800">
                                        {recipes.find(r => r.id === (selectedOrder.recipeId || selectedOrder.receta_id))?.details?.map((d, i) => {
                                            const recipe = recipes.find(r => r.id === (selectedOrder.recipeId || selectedOrder.receta_id));
                                            const ing = ingredients.find(ing => ing.id === d.ingredientId);
                                            let baseYield = recipe.peso_final || 1;
                                            if (recipe.formato_venta === 'Unidad' || !recipe.formato_venta) { baseYield = recipe.peso_final / (recipe.peso_unidad || 100); }
                                            else if (recipe.formato_venta === 'Kg') { baseYield = recipe.peso_final / 1000; }
                                            const targetAmt = selectedOrder.targetAmount || selectedOrder.cantidad_objetivo;
                                            const factor = targetAmt / baseYield;
                                            const gramosReales = Number(d.gramos) * factor;
                                            const displayGramos = gramosReales >= 1000 ? `${(gramosReales / 1000).toFixed(2)} Kg` : `${gramosReales.toFixed(0)} g`;
                                            return (
                                                <tr key={i}>
                                                    <td className="px-3 py-1.5 text-center"><Square size={14} className="text-slate-300 mx-auto" /></td>
                                                    <td className="px-3 py-1.5 uppercase">{ing?.name}</td>
                                                    <td className="px-3 py-1.5 text-right font-mono text-blue-700 bg-blue-50/50">{displayGramos}</td>
                                                    <td className="px-3 py-1.5 text-center"><span className="px-1.5 py-0.5 rounded text-[8px] uppercase bg-slate-50 border flex items-center justify-center gap-1"><MapPin size={8} /> {getLocation(ing)}</span></td>
                                                    <td className="px-3 py-1.5 text-center font-mono text-[9px] text-orange-600">{getFefoLot(ing?.id)}</td>
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