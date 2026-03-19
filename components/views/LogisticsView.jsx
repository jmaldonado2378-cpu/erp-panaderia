import React, { useState } from 'react';
import { Plus, CheckCircle2, Truck, PackageCheck, AlertTriangle, Coins, Square, XCircle, Warehouse } from 'lucide-react';
import { Card, Button, Input, Select } from '../bakery_erp';
import { supabase } from '../../lib/supabase';

export default function LogisticsView({ recipes, pedidos, setPedidos, lotesPT, setLotesPT, clientes, ventas, setVentas, showToast, refreshPedidos }) {
    const [view, setView] = useState('list'); // 'list', 'new', 'fulfill'
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showStockModal, setShowStockModal] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form states for New Order
    const [newClient, setNewClient] = useState('');
    const [newItem, setNewItem] = useState({ recipeId: '', amount: '' });
    const [newCart, setNewCart] = useState([]);

    // Fulfillment state mapping (item.recipeId -> array of allocations { loteId, cantidad })
    const [allocations, setAllocations] = useState({});

    // === NEW ORDER LOGIC ===
    const addToCart = () => {
        if (!newItem.recipeId || !newItem.amount) return;
        const rec = recipes.find(r => r.id === newItem.recipeId);
        setNewCart([...newCart, { recipeId: newItem.recipeId, nombre_producto: rec.nombre_producto, cantidadPedida: Number(newItem.amount) }]);
        setNewItem({ recipeId: '', amount: '' });
    };

    const saveOrder = async () => {
        if (!newClient || newCart.length === 0) return;
        setSaving(true);
        
        // 1. Crear pedido en BD
        const numOrden = `PED-${Date.now().toString(36).toUpperCase()}`;
        const { data: pedData, error: errPed } = await supabase
            .from('pedidos')
            .insert([{
                num_orden: numOrden,
                cliente_id: newClient,
                fecha_creacion: new Date().toISOString(),
                estado: 'PEDIDO',
                total: 0
            }])
            .select();
        
        if (errPed) { showToast('Error BD: ' + errPed.message, 'error'); setSaving(false); return; }
        
        const pedidoId = pedData[0].id;

        // 2. Crear items del pedido en BD
        const itemsToInsert = newCart.map(i => ({
            pedido_id: pedidoId,
            receta_id: i.recipeId,
            cantidad_solicitada: i.cantidadPedida,
            cantidad_enviada: 0,
            faltante: i.cantidadPedida
        }));
        const { error: errItems } = await supabase.from('pedido_items').insert(itemsToInsert);
        if (errItems) { showToast('Error items BD: ' + errItems.message, 'error'); setSaving(false); return; }

        // 3. Actualizar estado local
        const nuevoPedido = {
            ...pedData[0],
            clientId: pedData[0].cliente_id,
            fecha: pedData[0].fecha_creacion,
            items: newCart.map(i => ({ ...i, cantidadEnviada: 0, faltante: i.cantidadPedida, allocs: [] }))
        };
        setPedidos([nuevoPedido, ...pedidos]);
        setNewClient(''); setNewCart([]);
        setView('list');
        setSaving(false);
        showToast("✅ Pedido guardado en la nube.");
    };

    // === FULFILLMENT LOGIC (DESPACHO) ===
    const startFulfillment = (order) => {
        setSelectedOrder(order);
        const initialAllocs = {};
        order.items.forEach(i => initialAllocs[i.recipeId || i.receta_id] = []);
        setAllocations(initialAllocs);
        setView('fulfill');
    };

    const addAllocation = (recipeId, loteId, cantidad) => {
        if (!loteId || cantidad <= 0) return;
        const currAllocs = allocations[recipeId] || [];
        setAllocations({ ...allocations, [recipeId]: [...currAllocs, { loteId, cantidad }] });
    };

    const removeAllocation = (recipeId, idx) => {
        const currAllocs = [...(allocations[recipeId] || [])];
        currAllocs.splice(idx, 1);
        setAllocations({ ...allocations, [recipeId]: currAllocs });
    };

    const confirmDispatch = async () => {
        let totalUnidadesEnviadas = 0;
        let updatedLotesPT = [...lotesPT];

        const updatedItems = selectedOrder.items.map(item => {
            const rid = item.recipeId || item.receta_id;
            const currentAllocs = allocations[rid] || [];
            const totalEnviado = currentAllocs.reduce((sum, a) => sum + Number(a.cantidad), 0);
            const faltante = item.cantidadPedida - totalEnviado;
            currentAllocs.forEach(alloc => {
                const loteIndex = updatedLotesPT.findIndex(l => l.id === alloc.loteId);
                if (loteIndex !== -1) updatedLotesPT[loteIndex] = { ...updatedLotesPT[loteIndex], cantidadActual: updatedLotesPT[loteIndex].cantidadActual - alloc.cantidad };
            });
            totalUnidadesEnviadas += totalEnviado;
            return { ...item, cantidadEnviada: totalEnviado, faltante, allocs: currentAllocs };
        });

        if (totalUnidadesEnviadas === 0) {
            showToast("No se puede despachar un pedido con 0 unidades.", 'error');
            return;
        }

        setSaving(true);

        // Actualizar pedido en BD → DESPACHADO
        await supabase.from('pedidos').update({ estado: 'DESPACHADO' }).eq('id', selectedOrder.id);

        // Actualizar items en BD
        for (const item of updatedItems) {
            const rid = item.recipeId || item.receta_id;
            await supabase.from('pedido_items')
                .update({ cantidad_enviada: item.cantidadEnviada, faltante: item.faltante })
                .eq('pedido_id', selectedOrder.id)
                .eq('receta_id', rid);
        }

        // Actualizar cantidades de lotes PT en BD
        for (const alloc of Object.values(allocations).flat()) {
            const lote = lotesPT.find(l => l.id === alloc.loteId);
            if (lote) {
                const nuevaCantidad = (lote.cantidadActual || lote.cantidad_actual) - alloc.cantidad;
                await supabase.from('lotes_pt').update({ cantidad_actual: Math.max(0, nuevaCantidad) }).eq('id', alloc.loteId);
            }
        }

        setLotesPT(updatedLotesPT);
        setPedidos(pedidos.map(p => p.id === selectedOrder.id ? { ...selectedOrder, estado: 'DESPACHADO', items: updatedItems } : p));
        setSelectedOrder(null);
        setView('list');
        setSaving(false);
        showToast("✅ Pedido Despachado y Stock PT actualizado en la nube.");
    };

    // === BILLING LOGIC (ENTREGA) ===
    const markAsDelivered = async (order) => {
        let subtotal = 0;
        order.items.forEach(item => {
            const costoReal = recipes.find(r => r.id === (item.recipeId || item.receta_id))?.costo_estandar || 1500;
            subtotal += (item.cantidadEnviada || 0) * (costoReal * 1.5);
        });

        // Actualizar pedido en BD → ENTREGADO
        await supabase.from('pedidos').update({ estado: 'ENTREGADO', total: subtotal }).eq('id', order.id);

        // Generar deuda en cuenta del cliente
        const { error } = await supabase.from('deudas_cliente').insert([{
            cliente_id: order.clientId || order.cliente_id,
            pedido_id: order.id,
            concepto: `Facturación por Pedido ${order.num_orden || order.id}`,
            monto: subtotal,
            estado: 'PENDIENTE',
            fecha: new Date().toISOString().split('T')[0]
        }]);
        if (error) console.error('Error generando deuda cliente:', error.message);

        setVentas([...ventas, { id: `FAC-${Date.now()}`, clientId: order.clientId || order.cliente_id, montoTotal: subtotal, fecha: new Date().toISOString(), descripcion: `Pedido ${order.num_orden || order.id}` }]);
        setPedidos(pedidos.map(p => p.id === order.id ? { ...p, estado: 'ENTREGADO' } : p));
        showToast(`✅ Pedido Entregado. Deuda de $${subtotal.toLocaleString('es-AR')} generada en cuenta del cliente.`);
    };

    if (view === 'new') {
        return (
            <Card className="fall-target max-w-4xl mx-auto p-8 bg-white shadow-2xl animate-in zoom-in-95">
                <h4 className="text-2xl font-black uppercase italic mb-8 border-b pb-4 flex items-center gap-3 text-slate-800"><Plus className="text-blue-600" size={28} /> Generar Nuevo Pedido</h4>
                <div className="mb-8">
                    <Select label="Seleccionar Cliente" value={newClient} onChange={setNewClient}>
                        <option value="">Seleccionar...</option>
                        {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre || c.razon_social} ({c.tipo})</option>)}
                    </Select>
                </div>
                <div className="flex gap-4 items-end bg-slate-50 p-6 rounded-2xl border mb-6">
                    <div className="flex-1">
                        <Select label="Producto" value={newItem.recipeId} onChange={e => setNewItem({ ...newItem, recipeId: e })}>
                            <option value="">Seleccionar...</option>
                            {recipes.filter(r => !r.es_subensamble).map(r => <option key={r.id} value={r.id}>{r.nombre_producto}</option>)}
                        </Select>
                    </div>
                    <div className="w-32"><Input label="Cant. (U)" type="number" value={newItem.amount} onChange={v => setNewItem({ ...newItem, amount: v })} /></div>
                    <Button variant="secondary" className="py-2.5 h-[42px]" onClick={addToCart}>Agregar Línea</Button>
                </div>
                {newCart.length > 0 && (
                    <div className="mb-6">
                        <h5 className="font-bold text-slate-600 mb-2 uppercase text-xs">Detalle del Pedido</h5>
                        <table className="w-full text-left border"><thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-600"><tr><th className="p-3">Producto</th><th className="p-3 text-right">Cantidad Pedida</th></tr></thead><tbody className="divide-y">{newCart.map((c, i) => <tr key={i}><td className="p-3 uppercase">{c.nombre_producto}</td><td className="p-3 text-right font-mono font-bold">{c.cantidadPedida}</td></tr>)}</tbody></table>
                    </div>
                )}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="secondary" onClick={() => setView('list')}>Cancelar</Button>
                    <Button variant="primary" disabled={!newClient || newCart.length === 0 || saving} onClick={saveOrder}>{saving ? 'Guardando...' : 'Guardar Pedido'}</Button>
                </div>
            </Card>
        );
    }

    if (view === 'fulfill' && selectedOrder) {
        return (
            <Card className="fall-target max-w-5xl mx-auto p-8 bg-white shadow-2xl border-4 border-slate-900 animate-in zoom-in-95">
                <div className="flex justify-between items-end mb-6 border-b-2 pb-4">
                    <div>
                        <h2 className="text-2xl font-black uppercase italic text-slate-900">Armado y Preparación de Pedido (Picking)</h2>
                        <p className="text-slate-500 font-mono text-sm uppercase mt-1">ID: {selectedOrder.num_orden || selectedOrder.id} • Cliente: {clientes.find(c => c.id === (selectedOrder.clientId || selectedOrder.cliente_id))?.nombre}</p>
                    </div>
                    <div className="bg-orange-100 text-orange-800 px-4 py-1.5 rounded-full font-black text-sm uppercase flex items-center gap-2 border border-orange-200"><AlertTriangle size={16}/> Lotes Obligatorios</div>
                </div>
                <div className="space-y-6 mb-8">
                    {selectedOrder.items.map((item, idx) => {
                        const rid = item.recipeId || item.receta_id;
                        const lotesDisponibles = lotesPT.filter(l => (l.recipeId || l.receta_id) === rid && (l.cantidadActual || l.cantidad_actual) > 0);
                        const currAllocs = allocations[rid] || [];
                        const totalAsignado = currAllocs.reduce((sum, a) => sum + Number(a.cantidad), 0);
                        return (
                            <div key={idx} className={`p-5 rounded-xl border-2 ${totalAsignado > 0 ? (totalAsignado === item.cantidadPedida ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200') : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-black text-lg uppercase text-slate-800">{item.nombre_producto}</h4>
                                    <div className="flex gap-4 text-center">
                                        <div><p className="text-[10px] font-black uppercase text-slate-400">Solicitado</p><p className="font-mono font-bold text-xl">{item.cantidadPedida}</p></div>
                                        <div><p className="text-[10px] font-black uppercase text-slate-400">Declarado</p><p className={`font-mono font-bold text-xl ${totalAsignado < item.cantidadPedida ? 'text-orange-600' : 'text-green-600'}`}>{totalAsignado}</p></div>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded border">
                                    <p className="text-[10px] uppercase font-black text-slate-500 mb-3">Trazabilidad de Despacho (FEFO)</p>
                                    {currAllocs.map((alloc, i) => (
                                        <div key={i} className="flex gap-2 items-center mb-2 bg-slate-50 p-2 rounded">
                                            <Square size={14} className="text-green-500" />
                                            <span className="font-mono text-xs">{alloc.loteId}</span>
                                            <span className="font-mono text-sm ml-auto bg-slate-200 px-2 py-0.5 rounded">{alloc.cantidad} U</span>
                                            <button onClick={() => removeAllocation(rid, i)} className="text-red-500 hover:bg-red-50 p-1 rounded ml-2">Del</button>
                                        </div>
                                    ))}
                                    {totalAsignado < item.cantidadPedida && lotesDisponibles.length > 0 && (
                                        <div className="mt-3 flex gap-2 items-end">
                                            <div className="flex-1">
                                                <select id={`lote-${rid}`} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm uppercase">
                                                    <option value="">-- Elegir Lote --</option>
                                                    {lotesDisponibles.map(l => <option key={l.id} value={l.id}>{l.codigo_lote || l.id} (Disp: {l.cantidadActual || l.cantidad_actual}U) - Vence: {new Date(l.vencimiento).toLocaleDateString()}</option>)}
                                                </select>
                                            </div>
                                            <div className="w-24"><input id={`cant-${rid}`} type="number" defaultValue={item.cantidadPedida - totalAsignado} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm" /></div>
                                            <Button variant="secondary" onClick={() => { const sel = document.getElementById(`lote-${rid}`).value; const cant = Number(document.getElementById(`cant-${rid}`).value); addAllocation(rid, sel, cant); }} className="py-2">Asignar</Button>
                                        </div>
                                    )}
                                    {totalAsignado < item.cantidadPedida && lotesDisponibles.length === 0 && (
                                        <p className="text-xs font-bold text-red-500 mt-2">No hay Stock de este producto. Se enviará Faltante.</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-end gap-4 border-t pt-4">
                    <Button variant="secondary" onClick={() => setView('list')}>Volver</Button>
                    <Button variant="success" className="px-8" disabled={saving} onClick={confirmDispatch}>{saving ? 'Procesando...' : 'Confirmar Despacho Físico'}</Button>
                </div>
            </Card>
        );
    }

    // Default List View
    return (
        <div className="animate-in fade-in max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-800">Carga y Preparación de Pedidos</h2>
                    <p className="text-sm font-bold text-slate-500 uppercase mt-1">Órdenes, Despachos y Remitos Oficiales</p>
                </div>
                <div className="flex gap-4 items-center">
                    <button onClick={() => setShowStockModal(true)} className="text-right px-4 hover:bg-white p-2 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-blue-100 hover:shadow-sm group">
                        <p className="text-[10px] font-black text-slate-400 mb-1 group-hover:text-blue-500">Stock Valorizado PT</p>
                        <p className="font-mono text-xl font-black text-blue-700">{lotesPT.filter(l => (l.cantidadActual || l.cantidad_actual) > 0).length} LOTES</p>
                    </button>
                    <Button onClick={() => setView('new')} variant="primary" className="flex items-center gap-2 shadow-lg"><Plus size={18} /> Cargar Pedido</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {['PEDIDO', 'DESPACHADO', 'ENTREGADO'].map(estado => (
                    <div key={estado} className={`flex flex-col rounded-xl bg-slate-100/50 border border-slate-200 p-2 shadow-inner ${estado === 'ENTREGADO' ? 'md:col-span-2' : ''}`}>
                        <div className="p-3 mb-2 font-black uppercase text-xs flex justify-between items-center border-b border-slate-300 text-slate-600">
                            {estado}
                            <span className="bg-slate-300 text-slate-800 px-2 rounded-full py-0.5">{pedidos.filter(p => p.estado === estado).length}</span>
                        </div>
                        <div className="space-y-3 overflow-y-auto max-h-[60vh]">
                            {pedidos.filter(p => p.estado === estado).map(p => {
                                const cli = clientes.find(c => c.id === (p.clientId || p.cliente_id));
                                return (
                                    <Card key={p.id} className="p-4 bg-white hover:border-blue-500 shadow-sm transition-all group">
                                        <div className="flex justify-between mb-2"><span className="text-[9px] font-mono font-black text-slate-400">{p.num_orden || p.id}</span></div>
                                        <h4 className="font-black text-xs uppercase text-slate-800 mb-3 truncate leading-tight" title={cli?.nombre}>{cli?.nombre || cli?.razon_social}</h4>
                                        <div className="space-y-1 mb-3">
                                            {p.items?.map((item, i) => (
                                                <p key={i} className="text-[10px] font-bold text-slate-500 flex justify-between">
                                                    <span className="truncate w-3/4">{item.nombre_producto}</span>
                                                    <span className="font-mono text-blue-600">{estado === 'PEDIDO' ? item.cantidadPedida : item.cantidadEnviada}U</span>
                                                </p>
                                            ))}
                                        </div>
                                        <div className="border-t pt-3 flex justify-between">
                                            <span className="text-[9px] font-bold text-slate-400">{new Date(p.fecha || p.fecha_creacion).toLocaleDateString()}</span>
                                            {estado === 'PEDIDO' && (<button onClick={() => startFulfillment(p)} className="bg-blue-600 text-white text-[10px] font-black px-3 py-1.5 rounded uppercase flex items-center gap-1 hover:bg-blue-700"><CheckCircle2 size={12}/> Preparar</button>)}
                                            {estado === 'DESPACHADO' && (<button onClick={() => markAsDelivered(p)} className="bg-green-600 text-white text-[10px] font-black px-3 py-1.5 rounded uppercase flex items-center gap-1 hover:bg-green-700 shadow-sm"><PackageCheck size={12}/> Confirmar Entrega</button>)}
                                            {estado === 'ENTREGADO' && (<span className="text-green-500 text-[10px] font-black uppercase flex items-center gap-1"><Coins size={12}/> Facturado</span>)}
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL STOCK PT */}
            {showStockModal && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-8 z-50 animate-in fade-in">
                    <Card className="max-w-4xl w-full p-6 border-4 border-slate-900 bg-white shadow-2xl flex flex-col max-h-[85vh]">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <div>
                                <h3 className="text-xl font-black uppercase italic text-slate-800 flex items-center gap-2"><Warehouse size={20} className="text-blue-600" /> Trazabilidad de Stock PT</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Lotes de Producto Terminado Disponibles FEFO</p>
                            </div>
                            <button onClick={() => setShowStockModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><XCircle size={24} /></button>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            <table className="w-full text-left font-bold text-xs">
                                <thead className="bg-slate-100 text-[10px] uppercase text-slate-500">
                                    <tr><th className="p-3">ID / Código Lote</th><th className="p-3">Producto</th><th className="p-3 text-center">Vencimiento</th><th className="p-3 text-right">Cant. Física</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {lotesPT.filter(l => (l.cantidadActual || l.cantidad_actual) > 0).sort((a, b) => new Date(a.vencimiento) - new Date(b.vencimiento)).map(lote => {
                                        const r = recipes.find(rec => rec.id === (lote.recipeId || lote.receta_id));
                                        const exp = new Date(lote.vencimiento);
                                        const days = (exp - new Date()) / (1000 * 60 * 60 * 24);
                                        return (
                                            <tr key={lote.id} className="hover:bg-slate-50">
                                                <td className="p-3 font-mono text-blue-600"><span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{lote.codigo_lote || lote.id}</span></td>
                                                <td className="p-3 uppercase text-[11px] text-slate-800">{r?.nombre_producto || 'Desconocido'}</td>
                                                <td className="p-3 text-center"><span className={`px-2 py-0.5 inline-block rounded text-[10px] ${days < 3 ? 'bg-red-100 text-red-700' : (days < 7 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700')}`}>{exp.toLocaleDateString('es-AR')}</span></td>
                                                <td className="p-3 text-right font-mono text-slate-900 text-[11px]">{lote.cantidadActual || lote.cantidad_actual} U</td>
                                            </tr>
                                        );
                                    })}
                                    {lotesPT.filter(l => (l.cantidadActual || l.cantidad_actual) > 0).length === 0 && (
                                        <tr><td colSpan="4" className="p-8 text-center text-slate-400 italic font-normal">No hay lotes con saldo activo en la cámara de PT.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}