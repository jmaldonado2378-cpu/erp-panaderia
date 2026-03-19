import React, { useState } from 'react';
import { Trash2, PackagePlus, FileText, Calendar, DollarSign, Plus, Zap, CheckCircle2 } from 'lucide-react';
import { Card, Button, Input, Select } from '../bakery_erp';
import { supabase } from '../../lib/supabase';

export default function PurchasesView({ providers, ingredients, setIngredients, purchases, setPurchases, lots, setLots, showToast }) {
    const [form, setForm] = useState({ providerId: '', costTotal: '', remito: '' });
    const [currentItem, setCurrentItem] = useState({ ingredientId: '', amount: '', expiry: '', unitPrice: '' });
    const [cart, setCart] = useState([]);
    const [saving, setSaving] = useState(false);

    const handleIngredientChange = (id) => {
        const ing = ingredients.find(i => i.id === id);
        setCurrentItem({
            ...currentItem,
            ingredientId: id,
            unitPrice: ing ? (Math.round((ing.costo_estandar || 0) * (ing.factor_conversion || 1)) || '') : ''
        });
    };

    const addToCart = (e) => {
        e.preventDefault();
        if (!currentItem.ingredientId || !currentItem.amount || !currentItem.expiry || !currentItem.unitPrice) return;
        const ing = ingredients.find(i => i.id === currentItem.ingredientId);
        const factor = Number(ing.factor_conversion) || 1;
        setCart([...cart, { 
            ...currentItem, 
            name: ing.name, 
            unit: ing.unidad_compra,
            unidad_base: ing.unidad_base || 'g',
            factor_conversion: factor,
            subtotal: Number(currentItem.amount) * Number(currentItem.unitPrice) 
        }]);
        setCurrentItem({ ingredientId: '', amount: '', expiry: '', unitPrice: '' });
    };

    const removeFromCart = (idx) => setCart(cart.filter((_, i) => i !== idx));

    const savePurchase = async () => {
        if (!form.providerId || cart.length === 0) return;
        setSaving(true);

        try {
            const totalFactura = Number(form.costTotal);
            const provider = providers.find(p => p.id === form.providerId);
            
            // 1. Registrar Lotes de Insumos en Supabase
            const lotesToInsert = cart.map(item => {
                const totalGrams = Number(item.amount) * Number(item.factor_conversion);
                const precioPorGramo = Number(item.unitPrice) / Number(item.factor_conversion);
                return {
                    ingrediente_id: item.ingredientId,
                    proveedor_id: form.providerId,
                    cantidad_original: totalGrams,
                    cantidad_actual: totalGrams,
                    costo_unitario: precioPorGramo,
                    fecha_vencimiento: item.expiry,
                    fecha_ingreso: new Date().toISOString()
                };
            });

            const { data: insertedLots, error: errLots } = await supabase
                .from('lotes_insumos')
                .insert(lotesToInsert)
                .select();

            if (errLots) throw errLots;

            // 2. Actualizar Costos de Ingredientes en Supabase
            for (const item of cart) {
                const precioPorGramo = Number(item.unitPrice) / Number(item.factor_conversion);
                await supabase
                    .from('ingredientes')
                    .update({ costo_estandar: precioPorGramo })
                    .eq('id', item.ingredientId);
            }

            // 3. Registrar Deuda con Proveedor en Supabase
            const { error: errDeuda } = await supabase
                .from('deudas_proveedor')
                .insert([{
                    proveedor_id: form.providerId,
                    concepto: `Compra Insumos - Remito ${form.remito}`,
                    monto: totalFactura || cart.reduce((acc, c) => acc + c.subtotal, 0),
                    estado: 'PENDIENTE',
                    fecha: new Date().toISOString().split('T')[0]
                }]);

            if (errDeuda) throw errDeuda;

            // 4. Actualizar estado local (opcional/refresco)
            // Aquí podríamos llamar a una función refresh del contexto si existiera para estos ítems
            // Por ahora actualizamos localmente para feedback inmediato
            const updatedIngredients = ingredients.map(ing => {
                const cartItem = cart.find(c => c.ingredientId === ing.id);
                return cartItem ? { ...ing, costo_estandar: Number(cartItem.unitPrice) } : ing;
            });

            setIngredients(updatedIngredients);
            setLots([...(insertedLots.map(l => ({
                id: l.id,
                ingredientId: l.ingrediente_id,
                providerId: l.proveedor_id,
                amount: l.cantidad_actual,
                unitPrice: l.costo_unitario,
                expiry: l.fecha_vencimiento,
                ingreso: l.fecha_ingreso
            }))), ...lots]);

            setForm({ providerId: '', costTotal: '', remito: '' });
            setCart([]);
            showToast("✅ Compra registrada en Supabase. Almacén y Deuda actualizados.");

        } catch (error) {
            console.error('Error saving purchase:', error);
            showToast("❌ Error al guardar la compra: " + error.message, "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            <Card className="fall-target p-6 border-t-8 border-blue-600 bg-white shadow-xl">
                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                    <PackagePlus className="text-blue-600" size={28} />
                    <h4 className="text-2xl font-black uppercase italic text-slate-800 tracking-tight">Ingreso de Mercadería (Remitos)</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-slate-50 p-6 rounded-2xl border">
                    <Select label="Proveedor" value={form.providerId} onChange={e => setForm({ ...form, providerId: e })} required>
                        <option value="">Seleccionar...</option>
                        {providers.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.rubro})</option>)}
                    </Select>
                    <Input label="Costo Total Factura ($)" type="number" value={form.costTotal} onChange={v => setForm({ ...form, costTotal: v })} placeholder="Monto total a pagar..." />
                    <Input label="N° Remito / Comprobante" value={form.remito} onChange={v => setForm({ ...form, remito: v })} placeholder="Ej: 0001-0000456" />
                </div>

                <div className="bg-white p-6 rounded-2xl border shadow-sm mb-6">
                    <h5 className="font-black text-xs text-slate-400 uppercase mb-4 flex items-center gap-2">
                        <FileText size={14} /> Detalle de la Carga de Insumos
                    </h5>
                    <form onSubmit={addToCart} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-4">
                            <Select label="Insumo" value={currentItem.ingredientId} onChange={handleIngredientChange} required>
                                <option value="">Seleccionar producto...</option>
                                {ingredients.filter(i => !i.es_subensamble).map(i => <option key={i.id} value={i.id}>{i.name} ({i.unidad_compra})</option>)}
                            </Select>
                        </div>
                        <div className="md:col-span-2">
                            <Input 
                                label={currentItem.ingredientId ? `Cantidad (${ingredients.find(i=>i.id===currentItem.ingredientId)?.unidad_compra || 'presentaciones'})` : 'Cantidad'} 
                                type="number" step="0.01" 
                                value={currentItem.amount} 
                                onChange={v => setCurrentItem({ ...currentItem, amount: v })} 
                                required 
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Input 
                                label={currentItem.ingredientId ? `Precio x ${ingredients.find(i=>i.id===currentItem.ingredientId)?.unidad_compra || 'presentación'} ($)` : 'Precio Unit. ($)'} 
                                type="number" step="0.01" 
                                value={currentItem.unitPrice} 
                                onChange={v => setCurrentItem({ ...currentItem, unitPrice: v })} 
                                required 
                            />
                        </div>
                        <div className="md:col-span-3">
                            <Input label="Vencimiento" type="date" value={currentItem.expiry} onChange={v => setCurrentItem({ ...currentItem, expiry: v })} required />
                        </div>
                        <div className="md:col-span-1">
                            <Button type="submit" variant="secondary" className="w-full py-2.5 flex items-center justify-center">
                                <Plus size={18} />
                            </Button>
                        </div>
                    </form>
                </div>

                {cart.length > 0 && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4">
                        <div className="overflow-hidden border rounded-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-slate-900 text-white text-[10px] uppercase tracking-widest">
                                    <tr>
                                        <th className="px-4 py-3">Insumo</th>
                                        <th className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1"><Calendar size={12}/> Vence</div></th>
                                        <th className="px-4 py-3 text-right">Cantidad</th>
                                        <th className="px-4 py-3 text-right">Precio Unit. (Compra)</th>
                                        <th className="px-4 py-3 text-right">Costo Interno (Prod)</th>
                                        <th className="px-4 py-3 text-right">Subtotal</th>
                                        <th className="px-4 py-3 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white font-bold text-xs">
                                    {cart.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 uppercase text-slate-800">{item.name}</td>
                                            <td className="px-4 py-3 text-center font-mono text-orange-600">{new Date(item.expiry).toLocaleDateString('es-AR')}</td>
                                            <td className="px-4 py-3 text-right text-blue-600 font-mono">{item.amount} {item.unit}</td>
                                            <td className="px-4 py-3 text-right text-slate-500 font-mono">${Number(item.unitPrice).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                                            <td className="px-4 py-3 text-right font-mono text-purple-600">
                                                ${(Number(item.unitPrice) / Number(item.factor_conversion)).toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 4})}
                                                <span className="text-[10px] text-slate-400">/{item.unidad_base || 'g'}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-emerald-600 font-mono font-black border-l">${item.subtotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                                            <td className="px-4 py-3 text-center">
                                                <button onClick={() => removeFromCart(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                    <Trash2 size={16} className="mx-auto" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-slate-50 border-t-2">
                                        <td colSpan="5" className="px-4 py-3 text-right font-black uppercase text-slate-500">Total Detalle:</td>
                                        <td className="px-4 py-3 text-right font-black font-mono text-lg text-slate-900">${cart.reduce((s, c) => s + c.subtotal, 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="flex gap-4">
                            <Button variant="secondary" className="flex-1 py-4 uppercase font-black" onClick={() => { if(confirm("¿Limpiar todo el carrito?")) setCart([]) }}>Descartar</Button>
                            <Button 
                                variant="primary" 
                                className="flex-[2] py-4 uppercase font-black shadow-lg shadow-blue-200" 
                                onClick={savePurchase} 
                                disabled={!form.providerId || saving}
                            >
                                {saving ? (
                                    <span className="flex items-center gap-2 justify-center"><Zap className="animate-pulse" /> Procesando en la nube...</span>
                                ) : (
                                    <span className="flex items-center gap-2 justify-center"><CheckCircle2 /> Finalizar e Ingresar a Stock</span>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}