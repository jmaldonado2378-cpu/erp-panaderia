import React, { useState } from 'react';
import { Trash2, PackagePlus, FileText, Calendar, DollarSign, Plus, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, Button, Input, Select } from '../bakery_erp';
import { supabase } from '../../lib/supabase';

// Formatea cantidad con la unidad base correcta del insumo
const fmtCantidad = (cantidad, unidad_base = 'g') => {
    if (unidad_base === 'g') {
        return cantidad >= 1000
            ? `${(cantidad / 1000).toLocaleString('es-AR', { maximumFractionDigits: 2 })} Kg`
            : `${Number(cantidad).toLocaleString('es-AR')} g`;
    }
    if (unidad_base === 'ml') {
        return cantidad >= 1000
            ? `${(cantidad / 1000).toLocaleString('es-AR', { maximumFractionDigits: 2 })} L`
            : `${Number(cantidad).toLocaleString('es-AR')} ml`;
    }
    // 'u', 'm', etc. — mostrar directo con la unidad
    return `${Number(cantidad).toLocaleString('es-AR')} ${unidad_base}`;
};

// Genera código de lote legible: LOT-YYYYMMDD-NNN
const generarCodigoLote = (idx = 0) => {
    const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `LOT-${hoy}-${String(idx + 1).padStart(3, '0')}`;
};

export default function PurchasesView({ providers, ingredients, setIngredients, purchases, setPurchases, lots, setLots, showToast }) {
    const [form, setForm] = useState({ providerId: '', costTotal: '', remito: '' });
    const [currentItem, setCurrentItem] = useState({ ingredientId: '', amount: '', expiry: '', unitPrice: '' });
    const [cart, setCart] = useState([]);
    const [saving, setSaving] = useState(false);

    const selectedIng = ingredients.find(i => i.id === currentItem.ingredientId);

    const handleIngredientChange = (id) => {
        const ing = ingredients.find(i => i.id === id);
        const precioSugerido = ing ? Number(((ing.costo_estandar || 0) * (ing.factor_conversion || 1)).toFixed(2)) : '';
        setCurrentItem({ ...currentItem, ingredientId: id, unitPrice: precioSugerido || '' });
    };

    // [WARN-2] Recalcula costo_interno al cambiar unitPrice DESPUÉS de agregar al carrito (en el campo)
    const handleUnitPriceChange = (v) => {
        setCurrentItem(prev => ({ ...prev, unitPrice: v }));
    };

    const addToCart = (e) => {
        e.preventDefault();
        if (!currentItem.ingredientId || !currentItem.amount || !currentItem.expiry || !currentItem.unitPrice) return;

        // [MED-4] Validar que la fecha de vencimiento no sea pasada
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const venc = new Date(currentItem.expiry + 'T00:00:00');
        if (venc < hoy) {
            showToast('⚠ La fecha de vencimiento ya pasó. Verificá el lote.', 'error');
            return;
        }

        const ing = ingredients.find(i => i.id === currentItem.ingredientId);
        const factor = Number(ing.factor_conversion) || 1;
        const unitPrice = Number(currentItem.unitPrice);
        const costo_interno = unitPrice / factor;

        setCart([...cart, {
            ...currentItem,
            name: ing.name,
            unit: ing.unidad_compra,
            unidad_base: ing.unidad_base || 'g',
            factor_conversion: factor,
            subtotal: Number(currentItem.amount) * unitPrice,
            costo_interno
        }]);
        setCurrentItem({ ingredientId: '', amount: '', expiry: '', unitPrice: '' });
    };

    const removeFromCart = (idx) => setCart(cart.filter((_, i) => i !== idx));

    const totalDetalle = cart.reduce((s, c) => s + c.subtotal, 0);
    const totalFactura = Number(form.costTotal);
    // [WARN-1] Diferencia entre factura declarada y suma del detalle
    const difFactura = form.costTotal ? Math.abs(totalFactura - totalDetalle) : 0;
    const hayDiferencia = difFactura > 1;

    const savePurchase = async () => {
        if (!form.providerId || cart.length === 0) return;
        setSaving(true);

        try {
            // [WARN-5] Generar codigo_lote legible para cada ítem
            const lotesToInsert = cart.map((item, idx) => {
                const totalUnidadBase = Number(item.amount) * Number(item.factor_conversion);
                const costoPorUnidadBase = Number(item.unitPrice) / Number(item.factor_conversion);
                return {
                    ingrediente_id: item.ingredientId,
                    proveedor_id: form.providerId,
                    codigo_lote: generarCodigoLote(idx),
                    cantidad_original: totalUnidadBase,
                    cantidad_actual: totalUnidadBase,
                    costo_unitario: costoPorUnidadBase,
                    unidad: item.unidad_base || 'g',
                    fecha_vencimiento: item.expiry,
                    fecha_ingreso: new Date().toISOString()
                };
            });

            const { data: insertedLots, error: errLots } = await supabase
                .from('lotes_insumos')
                .insert(lotesToInsert)
                .select();
            if (errLots) throw errLots;

            // [CRIT-3] Si el mismo insumo aparece varias veces → usar el ÚLTIMO precio (consolidar)
            const costesPorIngrediente = {};
            for (const item of cart) {
                const costoPorUnidadBase = Number(item.unitPrice) / Number(item.factor_conversion);
                costesPorIngrediente[item.ingredientId] = costoPorUnidadBase;
            }
            for (const [id, costo] of Object.entries(costesPorIngrediente)) {
                await supabase.from('ingredientes').update({ costo_estandar: costo }).eq('id', id);
            }

            // Registrar deuda con proveedor
            const montoDeuda = (form.costTotal && !isNaN(totalFactura)) ? totalFactura : totalDetalle;
            const { error: errDeuda } = await supabase.from('deudas_proveedor').insert([{
                proveedor_id: form.providerId,
                concepto: `Compra Insumos - Remito ${form.remito || 'S/N'}`,
                monto: montoDeuda,
                estado: 'PENDIENTE',
                fecha: new Date().toISOString().split('T')[0]
            }]);
            if (errDeuda) throw errDeuda;

            // Actualizar estado local
            const updatedIngredients = ingredients.map(ing => {
                const newCosto = costesPorIngrediente[ing.id];
                return newCosto !== undefined ? { ...ing, costo_estandar: newCosto } : ing;
            });
            setIngredients(updatedIngredients);

            setLots([...(insertedLots.map(l => ({
                id: l.id,
                codigo_lote: l.codigo_lote,
                ingredientId: l.ingrediente_id,
                providerId: l.proveedor_id,
                amount: l.cantidad_actual,
                unitPrice: l.costo_unitario,
                expiry: l.fecha_vencimiento,
                ingreso: l.fecha_ingreso,
                unidad: l.unidad
            }))), ...lots]);

            setForm({ providerId: '', costTotal: '', remito: '' });
            setCart([]);
            showToast(`✅ Compra registrada. ${insertedLots.length} lote(s) ingresado(s) al almacén.`);

        } catch (error) {
            console.error('Error saving purchase:', error);
            showToast('❌ Error al guardar: ' + error.message, 'error');
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
                    <div>
                        <Input label="Costo Total Factura ($)" type="number" value={form.costTotal} onChange={v => setForm({ ...form, costTotal: v })} placeholder="Monto total a pagar..." />
                        {/* [WARN-1] Aviso si la factura no coincide con el detalle */}
                        {hayDiferencia && (
                            <p className="text-[10px] text-amber-600 font-black mt-1 flex items-center gap-1">
                                <AlertTriangle size={10} /> Diferencia de ${difFactura.toLocaleString('es-AR', { minimumFractionDigits: 2 })} con el total del detalle
                            </p>
                        )}
                    </div>
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
                                {ingredients.filter(i => !i.es_subensamble).map(i => (
                                    <option key={i.id} value={i.id}>{i.name} ({i.unidad_compra})</option>
                                ))}
                            </Select>
                        </div>
                        <div className="md:col-span-2">
                            <Input
                                label={selectedIng ? `Cantidad (${selectedIng.unidad_compra || 'presentaciones'})` : 'Cantidad'}
                                type="number" step="0.01"
                                value={currentItem.amount}
                                onChange={v => setCurrentItem({ ...currentItem, amount: v })}
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            {/* [CRIT-2] Mostrar precio sugerido = 0 con aviso */}
                            <Input
                                label={selectedIng ? `Precio x ${selectedIng.unidad_compra || 'presentación'} ($)` : 'Precio Unit. ($)'}
                                type="number" step="0.01"
                                value={currentItem.unitPrice}
                                onChange={handleUnitPriceChange}
                                required
                            />
                            {selectedIng && selectedIng.costo_estandar === 0 && (
                                <p className="text-[9px] text-amber-500 font-black mt-0.5 flex items-center gap-1">
                                    <AlertTriangle size={9} /> Sin precio previo — ingresalo manualmente
                                </p>
                            )}
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
                    {selectedIng && currentItem.unitPrice && (
                        <div className="mt-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            Costo Interno ≈ <span className="text-purple-600">
                                ${(Number(currentItem.unitPrice) / (selectedIng.factor_conversion || 1)).toLocaleString('es-AR', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}
                            </span> por {selectedIng.unidad_base || 'g'}
                            · Factor: {Number(selectedIng.factor_conversion || 1).toLocaleString('es-AR')}
                        </div>
                    )}
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
                                            <td className="px-4 py-3 text-center font-mono text-orange-600">{new Date(item.expiry + 'T00:00:00').toLocaleDateString('es-AR')}</td>
                                            <td className="px-4 py-3 text-right text-blue-600 font-mono">{item.amount} {item.unit}</td>
                                            <td className="px-4 py-3 text-right text-slate-500 font-mono">${Number(item.unitPrice).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-3 text-right font-mono text-purple-600">
                                                <span className="block">${item.costo_interno.toLocaleString('es-AR', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}</span>
                                                <span className="text-[10px] text-slate-400 font-bold">por {item.unidad_base} · factor {Number(item.factor_conversion).toLocaleString('es-AR')}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-emerald-600 font-mono font-black border-l">${item.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-3 text-center">
                                                <button onClick={() => removeFromCart(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                    <Trash2 size={16} className="mx-auto" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-slate-50 border-t-2">
                                        <td colSpan="5" className="px-4 py-3 text-right font-black uppercase text-slate-500">Total Detalle:</td>
                                        <td className="px-4 py-3 text-right font-black font-mono text-lg text-slate-900">
                                            ${totalDetalle.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="flex gap-4">
                            <Button variant="secondary" className="flex-1 py-4 uppercase font-black" onClick={() => { if (confirm('¿Limpiar todo el carrito?')) setCart([]) }}>Descartar</Button>
                            <Button
                                variant="primary"
                                className="flex-2 py-4 uppercase font-black shadow-lg shadow-blue-200"
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