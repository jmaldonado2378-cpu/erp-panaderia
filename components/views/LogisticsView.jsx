'use client';
import React, { useState, useMemo } from 'react';
import { 
    Plus, CheckCircle2, Truck, PackageCheck, AlertTriangle, 
    Coins, Square, XCircle, Warehouse, QrCode, ClipboardList 
} from 'lucide-react';
import { Card, Button, Input, Select } from '../bakery_erp';
import { supabase } from '../../lib/supabase';
import { useGlobalContext } from '../context/GlobalContext';

export default function LogisticsView({ 
    recipes, charcRecetas, reventaArticulos,
    pedidos, setPedidos, 
    lotesPT, setLotesPT, 
    charcLotes, setCharcLotes,
    reventaLotes, setReventaLotes,
    clientes, ventas, setVentas, showToast, addPedidoConsolidado,
    updatePedidoConsolidado, deletePedidoConsolidado
}) {
    const { theme } = useGlobalContext();
    const isMaldonado = theme === 'maldonado-contraste';
    const [view, setView] = useState('list'); // 'list', 'new', 'fulfill'
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showStockModal, setShowStockModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editOrderId, setEditOrderId] = useState(null);

    // Form states for New Order
    const [newClient, setNewClient] = useState('');
    const [newItem, setNewItem] = useState({ catalogId: '', amount: '' });
    const [newCart, setNewCart] = useState([]);

    // Fulfillment state mapping (item.catalogId -> array of allocations { loteId, cantidad })
    const [allocations, setAllocations] = useState({});

    // Catálogo consolidado de venta de todas las líneas
    const catalog = useMemo(() => {
        const list = [];
        recipes?.filter(r => !r.es_subensamble).forEach(r => {
            list.push({ id: r.id, name: r.nombre_producto, codigo: r.codigo, type: 'bakery', price: r.peso_final ? 400 : 250 });
        });
        charcRecetas?.forEach(r => {
            list.push({ id: r.id, name: r.nombre, codigo: r.codigo, type: 'charcuteria', price: 1800 });
        });
        reventaArticulos?.forEach(r => {
            list.push({ id: r.id, name: r.nombre, codigo: r.codigo, type: 'reventa', price: Number(r.precio_venta) });
        });
        return list;
    }, [recipes, charcRecetas, reventaArticulos]);

    // === NEW/EDIT ORDER LOGIC ===
    const addToCart = () => {
        if (!newItem.catalogId || !newItem.amount) return;
        const prod = catalog.find(p => p.id === newItem.catalogId);
        if (!prod) return;

        setNewCart([...newCart, { 
            catalogId: prod.id, 
            nombre_producto: prod.name, 
            codigo: prod.codigo, 
            type: prod.type,
            precio: prod.price,
            cantidadPedida: Number(newItem.amount) 
        }]);
        setNewItem({ catalogId: '', amount: '' });
    };

    const startEditOrder = (order) => {
        setEditOrderId(order.id);
        setNewClient(order.cliente_id || order.clientId || '');
        setNewCart(order.items.map(it => {
            const catalogId = it.receta_id || it.charc_receta_id || it.reventa_articulo_id;
            return {
                catalogId,
                nombre_producto: it.nombre_producto,
                codigo: it.codigo,
                type: it.product_type || it.type,
                precio: it.precio_unitario || it.precio,
                cantidadPedida: it.cantidad_solicitada || it.cantidadPedida
            };
        }));
        setView('new');
    };

    const handleDeleteOrder = async (order) => {
        if (window.confirm(`¿Está seguro de que desea eliminar el pedido ${order.num_orden || order.id}?`)) {
            if (deletePedidoConsolidado) {
                await deletePedidoConsolidado(order.id);
            } else {
                setPedidos(pedidos.filter(x => x.id !== order.id));
                showToast("Pedido eliminado localmente", "error");
            }
        }
    };

    const saveOrder = async () => {
        if (!newClient || newCart.length === 0) return;
        setSaving(true);
        
        const existingOrder = editOrderId ? pedidos.find(p => p.id === editOrderId) : null;
        const numOrden = existingOrder ? existingOrder.num_orden : `PED-${Date.now().toString(36).toUpperCase()}`;
        const totalPedido = newCart.reduce((sum, item) => sum + (item.cantidadPedida * item.precio), 0);

        const pedido = {
            num_orden: numOrden,
            cliente_id: newClient,
            fecha_creacion: existingOrder ? (existingOrder.fecha_creacion || existingOrder.fecha) : new Date().toISOString(),
            estado: existingOrder ? existingOrder.estado : 'PEDIDO',
            total: totalPedido
        };

        const items = newCart.map(i => ({
            receta_id: i.type === 'bakery' ? i.catalogId : null,
            charc_receta_id: i.type === 'charcuteria' ? i.catalogId : null,
            reventa_articulo_id: i.type === 'reventa' ? i.catalogId : null,
            cantidad_solicitada: i.cantidadPedida,
            cantidad_enviada: 0,
            faltante: i.cantidadPedida,
            precio_unitario: i.precio,
            nombre_producto: i.nombre_producto,
            product_type: i.type
        }));

        if (editOrderId) {
            if (updatePedidoConsolidado) {
                await updatePedidoConsolidado(editOrderId, pedido, items);
            } else {
                setPedidos(pedidos.map(p => p.id === editOrderId ? { ...p, ...pedido, items } : p));
                showToast("Pedido actualizado localmente");
            }
            setEditOrderId(null);
        } else {
            if (addPedidoConsolidado) {
                await addPedidoConsolidado(pedido, items);
            } else {
                // local state only fallback
                const localPed = { id: 'ped_' + Date.now(), ...pedido, items };
                setPedidos(prev => [localPed, ...prev]);
                showToast("Pedido guardado en memoria (Local)");
            }
        }

        setNewClient(''); 
        setNewCart([]);
        setView('list');
        setSaving(false);
    };

    // === FULFILLMENT LOGIC (DESPACHO) ===
    const startFulfillment = (order) => {
        setSelectedOrder(order);
        const initialAllocs = {};
        order.items.forEach(i => {
            const key = i.receta_id || i.charc_receta_id || i.reventa_articulo_id || i.id;
            initialAllocs[key] = [];
        });
        setAllocations(initialAllocs);
        setView('fulfill');
    };

    const addAllocation = (itemId, loteId, cantidad) => {
        if (!loteId || cantidad <= 0) return;
        const currAllocs = allocations[itemId] || [];
        setAllocations({ ...allocations, [itemId]: [...currAllocs, { loteId, cantidad }] });
    };

    const removeAllocation = (itemId, idx) => {
        const currAllocs = [...(allocations[itemId] || [])];
        currAllocs.splice(idx, 1);
        setAllocations({ ...allocations, [itemId]: currAllocs });
    };

    const confirmDispatch = async () => {
        let totalUnidadesEnviadas = 0;
        let updatedLotesPT = [...lotesPT];
        let updatedCharcLotes = [...charcLotes];
        let updatedReventaLotes = [...reventaLotes];

        const updatedItems = selectedOrder.items.map(item => {
            const itemId = item.receta_id || item.charc_receta_id || item.reventa_articulo_id || item.id;
            const currentAllocs = allocations[itemId] || [];
            const totalEnviado = currentAllocs.reduce((sum, a) => sum + Number(a.cantidad), 0);
            const faltante = item.cantidad_solicitada - totalEnviado;

            // Descontar inventario según tipo de producto
            currentAllocs.forEach(alloc => {
                if (item.product_type === 'bakery') {
                    const idx = updatedLotesPT.findIndex(l => l.id === alloc.loteId);
                    if (idx !== -1) {
                        updatedLotesPT[idx] = { ...updatedLotesPT[idx], cantidadActual: Math.max(0, updatedLotesPT[idx].cantidadActual - alloc.cantidad) };
                    }
                } else if (item.product_type === 'charcuteria') {
                    // Chacinados se despachan por unidades o lotes curados enteros
                    const idx = updatedCharcLotes.findIndex(l => l.id === alloc.loteId);
                    if (idx !== -1) {
                        // Pasamos su estado a 'DESPACHADO' o restamos peso
                        updatedCharcLotes[idx] = { ...updatedCharcLotes[idx], estado: 'DESPACHADO' };
                    }
                } else if (item.product_type === 'reventa') {
                    const idx = updatedReventaLotes.findIndex(l => l.id === alloc.loteId);
                    if (idx !== -1) {
                        updatedReventaLotes[idx] = { ...updatedReventaLotes[idx], cantidad_actual: Math.max(0, updatedReventaLotes[idx].cantidad_actual - alloc.cantidad) };
                    }
                }
            });

            totalUnidadesEnviadas += totalEnviado;
            return { ...item, cantidadEnviada: totalEnviado, faltante, allocs: currentAllocs };
        });

        if (totalUnidadesEnviadas === 0) {
            showToast("No se puede despachar un pedido con 0 unidades.", 'error');
            return;
        }

        setSaving(true);

        // Separar el faltante (Backorder)
        const backorderItems = updatedItems
            .filter(item => item.faltante > 0)
            .map(item => ({
                receta_id: item.receta_id,
                charc_receta_id: item.charc_receta_id,
                reventa_articulo_id: item.reventa_articulo_id,
                cantidad_solicitada: item.faltante,
                cantidad_enviada: 0,
                faltante: item.faltante,
                precio_unitario: item.precio_unitario || item.precio || 350,
                nombre_producto: item.nombre_producto,
                product_type: item.product_type
            }));

        const originalItemsForDispatch = updatedItems
            .map(item => ({
                ...item,
                cantidad_solicitada: item.cantidadEnviada, // Ajustamos la solicitud original a lo que realmente se envía
                faltante: 0
            }))
            .filter(item => item.cantidad_solicitada > 0);

        const newOriginalTotal = originalItemsForDispatch.reduce((sum, item) => sum + (item.cantidad_solicitada * item.precio_unitario), 0);

        // Guardar el backorder en Supabase/local si corresponde
        let savedBackorder = null;
        if (backorderItems.length > 0) {
            const boNumOrden = selectedOrder.num_orden.includes('-PEND') 
                ? `${selectedOrder.num_orden.split('-PEND')[0]}-PEND${Date.now().toString(36).slice(-3).toUpperCase()}` 
                : `${selectedOrder.num_orden}-PEND`;
            const boTotal = backorderItems.reduce((sum, item) => sum + (item.cantidad_solicitada * item.precio_unitario), 0);
            
            const backorder = {
                num_orden: boNumOrden,
                cliente_id: selectedOrder.cliente_id || selectedOrder.clientId,
                fecha_creacion: new Date().toISOString(),
                estado: 'PEDIDO',
                total: boTotal
            };

            try {
                const { data: boData, error: boErr } = await supabase.from('pedidos').insert([backorder]).select();
                if (boErr) throw boErr;
                const newBoId = boData && boData[0] ? boData[0].id : ('p_bo_' + Date.now());
                const boItemInserts = backorderItems.map(it => ({ ...it, pedido_id: newBoId }));
                const { error: boItemsErr } = await supabase.from('pedido_items').insert(boItemInserts);
                if (boItemsErr) throw boItemsErr;
                savedBackorder = boData && boData[0] ? { ...boData[0], items: backorderItems } : { id: newBoId, ...backorder, items: backorderItems };
            } catch (err) {
                console.warn("Fallo crear backorder en Supabase, creando localmente:", err.message);
                savedBackorder = { id: 'p_bo_' + Date.now(), ...backorder, items: backorderItems };
            }
        }

        // Actualizar estados locales de forma reactiva e instantánea
        setLotesPT(updatedLotesPT);
        setCharcLotes(updatedCharcLotes);
        setReventaLotes(updatedReventaLotes);

        const finalDispatchedOrder = { 
            ...selectedOrder, 
            estado: 'DESPACHADO', 
            total: newOriginalTotal,
            items: originalItemsForDispatch 
        };

        setPedidos(prev => {
            let newPeds = prev.map(p => p.id === selectedOrder.id ? finalDispatchedOrder : p);
            if (savedBackorder) {
                newPeds = [savedBackorder, ...newPeds];
            }
            return newPeds;
        });

        // Intentar actualizar Supabase en segundo plano
        try {
            await supabase.from('pedidos').update({ estado: 'DESPACHADO', total: newOriginalTotal }).eq('id', selectedOrder.id);
            
            // Eliminar de pedido_items los que quedaron en 0 cantidades (se movieron completamente al backorder)
            const itemsToDelete = updatedItems.filter(item => item.cantidadEnviada === 0);
            for (const item of itemsToDelete) {
                const queryCol = item.product_type === 'bakery' ? 'receta_id' : 
                                 item.product_type === 'charcuteria' ? 'charc_receta_id' : 'reventa_articulo_id';
                const fKey = item.receta_id || item.charc_receta_id || item.reventa_articulo_id;
                await supabase.from('pedido_items').delete().eq('pedido_id', selectedOrder.id).eq(queryCol, fKey);
            }

            // Actualizar los ítems que sí se enviaron
            for (const item of originalItemsForDispatch) {
                const queryCol = item.product_type === 'bakery' ? 'receta_id' : 
                                 item.product_type === 'charcuteria' ? 'charc_receta_id' : 'reventa_articulo_id';
                const fKey = item.receta_id || item.charc_receta_id || item.reventa_articulo_id;
                
                await supabase.from('pedido_items')
                    .update({ 
                        cantidad_solicitada: item.cantidad_solicitada,
                        cantidad_enviada: item.cantidadEnviada, 
                        faltante: 0 
                    })
                    .eq('pedido_id', selectedOrder.id)
                    .eq(queryCol, fKey);
            }
            
            // Actualizar stock remoto
            for (const alloc of Object.values(allocations).flat()) {
                const bLote = lotesPT.find(l => l.id === alloc.loteId);
                if (bLote) {
                    await supabase.from('lotes_pt').update({ cantidad_actual: Math.max(0, bLote.cantidadActual - alloc.cantidad) }).eq('id', alloc.loteId);
                }
                const cLote = charcLotes.find(l => l.id === alloc.loteId);
                if (cLote) {
                    await supabase.from('charc_lotes_maduracion').update({ estado: 'DESPACHADO' }).eq('id', alloc.loteId);
                }
                const rLote = reventaLotes.find(l => l.id === alloc.loteId);
                if (rLote) {
                    await supabase.from('reventa_lotes').update({ cantidad_actual: Math.max(0, rLote.cantidad_actual - alloc.cantidad) }).eq('id', alloc.loteId);
                }
            }
            showToast(savedBackorder ? "✅ Despachado parcial. Restante re-encolado como pedido pendiente." : "✅ Despacho confirmado y sincronizado con Supabase.");
        } catch (err) {
            console.warn("Fallo persistencia despacho en nube, guardado localmente:", err.message);
            showToast("✅ Despachado localmente (Offline)", "success");
        }

        setSelectedOrder(null);
        setView('list');
        setSaving(false);
    };

    // === BILLING LOGIC (ENTREGA) ===
    const markAsDelivered = async (order) => {
        let subtotal = Number(order.total) || 0;
        if (subtotal === 0) {
            order.items.forEach(item => {
                subtotal += (item.cantidadEnviada || 0) * (item.precio_unitario || item.precio || 350);
            });
        }

        setPedidos(pedidos.map(p => p.id === order.id ? { ...p, estado: 'ENTREGADO', total: subtotal } : p));
        setVentas([...ventas, { 
            id: `FAC-${Date.now()}`, 
            clientId: order.clientId || order.cliente_id, 
            monto: subtotal, 
            montoTotal: subtotal, 
            fecha: new Date().toISOString(), 
            concepto: `Factura Reparto DSD ${order.num_orden || order.id}`,
            descripcion: `Pedidos DSD ${order.num_orden || order.id}` 
        }]);

        try {
            await supabase.from('pedidos').update({ estado: 'ENTREGADO', total: subtotal }).eq('id', order.id);
            await supabase.from('deudas_cliente').insert([{
                cliente_id: order.clientId || order.cliente_id,
                pedido_id: order.id,
                concepto: `Factura Reparto DSD ${order.num_orden || order.id}`,
                monto: subtotal,
                estado: 'PENDIENTE',
                fecha: new Date().toISOString().split('T')[0]
            }]);
            showToast(`✅ Pedido Entregado y Facturado.`);
        } catch (err) {
            showToast(`✅ Pedido Facturado localmente (Offline).`);
        }
    };

    if (view === 'new') {
        const isEdit = !!editOrderId;
        const currentOrder = isEdit ? pedidos.find(p => p.id === editOrderId) : null;
        
        return (
            <Card className="max-w-4xl mx-auto p-8 bg-white shadow-2xl animate-in zoom-in-95">
                <h4 className="text-2xl font-black uppercase italic mb-8 border-b pb-4 flex items-center gap-3 text-slate-800">
                    <Plus className="text-blue-600" size={28} /> {isEdit ? `Editar Pedido ${currentOrder?.num_orden || ''}` : 'Generar Nuevo Pedido DSD'}
                </h4>
                <div className="mb-8">
                    <Select label="Seleccionar Cliente" value={newClient} onChange={setNewClient}>
                        <option value="">Seleccionar...</option>
                        {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre || c.razon_social} ({c.tipo})</option>)}
                    </Select>
                </div>
                <div className="flex gap-4 items-end bg-slate-50 p-6 rounded-2xl border mb-6">
                    <div className="flex-1">
                        <Select label="Producto / Artículo (Multilínea)" value={newItem.catalogId} onChange={e => setNewItem({ ...newItem, catalogId: e })}>
                            <option value="">Seleccionar de Catálogo...</option>
                            {catalog.map(prod => (
                                <option key={prod.id} value={prod.id}>[{prod.type.toUpperCase()}] {prod.name} - ({prod.codigo})</option>
                            ))}
                        </Select>
                    </div>
                    <div className="w-32"><Input label="Cant. Pedida (U)" type="number" value={newItem.amount} onChange={v => setNewItem({ ...newItem, amount: v })} /></div>
                    <Button variant="secondary" className="py-2.5 h-[42px]" onClick={addToCart}>Agregar</Button>
                </div>
                {newCart.length > 0 && (
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <h5 className="font-bold text-slate-600 uppercase text-xs">Detalle del Pedido</h5>
                            <button 
                                type="button" 
                                onClick={() => setNewCart([])}
                                className="text-[10px] text-red-500 font-bold uppercase hover:underline"
                            >
                                Limpiar Detalle
                            </button>
                        </div>
                        <table className="w-full text-left border">
                            <thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-600">
                                <tr>
                                    <th className="p-3">Producto</th>
                                    <th className="p-3 text-center">Línea</th>
                                    <th className="p-3 text-right">Precio unitario</th>
                                    <th className="p-3 text-right">Cantidad</th>
                                    <th className="p-3 text-right">Subtotal</th>
                                    <th className="p-3 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-xs">
                                {newCart.map((c, i) => (
                                    <tr key={i}>
                                        <td className="p-3 uppercase font-black">{c.nombre_producto}</td>
                                        <td className="p-3 text-center text-slate-500 font-bold uppercase">{c.type}</td>
                                        <td className="p-3 text-right font-mono">${Number(c.precio).toLocaleString('es-AR')}</td>
                                        <td className="p-3 text-right font-mono font-bold">{c.cantidadPedida} u</td>
                                        <td className="p-3 text-right font-mono font-bold text-slate-900">${(c.cantidadPedida * c.precio).toLocaleString('es-AR')}</td>
                                        <td className="p-3 text-center">
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    const updated = [...newCart];
                                                    updated.splice(i, 1);
                                                    setNewCart(updated);
                                                }}
                                                className="text-red-500 hover:text-red-700 font-bold uppercase text-[10px]"
                                            >
                                                Quitar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-50 font-black">
                                    <td colSpan="4" className="p-3 text-right uppercase text-slate-600 text-[10px]">Total Pedido:</td>
                                    <td className="p-3 text-right font-mono text-emerald-600 text-sm">
                                        ${newCart.reduce((sum, item) => sum + (item.cantidadPedida * item.precio), 0).toLocaleString('es-AR')}
                                    </td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="secondary" onClick={() => { setView('list'); setEditOrderId(null); setNewClient(''); setNewCart([]); }}>Cancelar</Button>
                    <Button variant="primary" disabled={!newClient || newCart.length === 0 || saving} onClick={saveOrder}>
                        {isEdit ? 'Guardar Cambios' : 'Confirmar Pedido DSD'}
                    </Button>
                </div>
            </Card>
        );
    }

    if (view === 'fulfill' && selectedOrder) {
        return (
            <Card className="max-w-5xl mx-auto p-8 bg-white shadow-2xl border border-slate-200 animate-in zoom-in-95">
                <div className="flex justify-between items-end mb-6 border-b-2 pb-4">
                    <div>
                        <h2 className="text-2xl font-black uppercase italic text-slate-900">Armado y Picking Consolidado DSD</h2>
                        <p className="text-slate-500 font-mono text-sm uppercase mt-1">ID: {selectedOrder.num_orden || selectedOrder.id} • Cliente: {clientes.find(c => c.id === (selectedOrder.clientId || selectedOrder.cliente_id))?.nombre}</p>
                    </div>
                    <div className="bg-slate-900 text-white px-4 py-1.5 rounded-full font-black text-[10px] uppercase flex items-center gap-2">LOGÍSTICA INTEGRAL</div>
                </div>
                <div className="space-y-6 mb-8">
                    {selectedOrder.items.map((item, idx) => {
                        const itemId = item.receta_id || item.charc_receta_id || item.reventa_articulo_id || item.id;
                        
                        // Cargar lotes disponibles según tipo de producto
                        let lotesDisponibles = [];
                        if (item.product_type === 'bakery') {
                            lotesDisponibles = lotesPT.filter(l => (l.recipeId || l.receta_id) === item.receta_id && (l.cantidadActual || l.cantidad_actual) > 0)
                                .sort((a, b) => new Date(a.vencimiento || a.fecha_vencimiento) - new Date(b.vencimiento || b.fecha_vencimiento));
                        } else if (item.product_type === 'charcuteria') {
                            lotesDisponibles = charcLotes.filter(l => l.receta_id === item.charc_receta_id && l.estado === 'CURADO_LISTO' && Number(l.peso_actual_g || 0) > 0)
                                .sort((a, b) => new Date(a.fecha_vencimiento || a.vencimiento) - new Date(b.fecha_vencimiento || b.vencimiento));
                        } else if (item.product_type === 'reventa') {
                            lotesDisponibles = reventaLotes.filter(l => l.articulo_id === item.reventa_articulo_id && Number(l.cantidad_actual) > 0)
                                .sort((a, b) => new Date(a.fecha_vencimiento || a.vencimiento) - new Date(b.fecha_vencimiento || b.vencimiento));
                        }

                        const currAllocs = allocations[itemId] || [];
                        const totalAsignado = currAllocs.reduce((sum, a) => sum + Number(a.cantidad), 0);
                        const cantSolicitada = item.cantidad_solicitada || item.cantidadPedida || 0;

                        return (
                            <div key={idx} className={`p-5 rounded-xl border-2 ${totalAsignado > 0 ? (totalAsignado === cantSolicitada ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200') : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h4 className="font-black text-sm uppercase text-slate-800">{item.nombre_producto}</h4>
                                        <span className="text-[8px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-black uppercase inline-block mt-1">{item.product_type}</span>
                                    </div>
                                    <div className="flex gap-4 text-center">
                                        <div><p className="text-[10px] font-black uppercase text-slate-400">Pedido</p><p className="font-mono font-bold text-base">{cantSolicitada} u</p></div>
                                        <div><p className="text-[10px] font-black uppercase text-slate-400">Picking</p><p className={`font-mono font-bold text-base ${totalAsignado < cantSolicitada ? 'text-orange-600' : 'text-green-600'}`}>{totalAsignado} u</p></div>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded border">
                                    <p className="text-[10px] uppercase font-black text-slate-500 mb-3">Trazabilidad FEFO de Despacho</p>
                                    {currAllocs.map((alloc, i) => (
                                        <div key={i} className="flex gap-2 items-center mb-2 bg-slate-50 p-2 rounded">
                                            <Square size={14} className="text-green-500 animate-pulse" />
                                            <span className="font-mono text-xs">{alloc.loteId}</span>
                                            <span className="font-mono text-xs ml-auto bg-slate-200 px-2 py-0.5 rounded font-bold">{alloc.cantidad} u</span>
                                            <button onClick={() => removeAllocation(itemId, i)} className="text-red-500 hover:bg-red-100 p-1 rounded ml-2 font-black text-[9px] uppercase">Eliminar</button>
                                        </div>
                                    ))}
                                    {totalAsignado < cantSolicitada && lotesDisponibles.length > 0 && (
                                        <div className="mt-3 flex gap-2 items-end">
                                            <div className="flex-1">
                                                <select id={`lote-${itemId}`} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs uppercase font-bold text-slate-700 cursor-pointer">
                                                    <option value="">-- Seleccionar Lote Disponible --</option>
                                                    {lotesDisponibles.map((l, lIdx) => {
                                                        const disp = l.cantidadActual || l.cantidad_actual || (l.peso_actual_g ? (l.peso_actual_g / 1000) : 0);
                                                        const prefix = lIdx === 0 ? "★ [FEFO] " : "";
                                                        return (
                                                             <option key={l.id} value={l.id}>
                                                                 {prefix}{l.codigo_lote || l.id} (Disp: {disp} {l.peso_actual_g ? 'Kg' : 'u'}) - Vence: {new Date(l.fecha_vencimiento || l.vencimiento).toLocaleDateString()}
                                                             </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>
                                            <div className="w-24">
                                                <input 
                                                    id={`cant-${itemId}`} 
                                                    type="number" 
                                                    defaultValue={cantSolicitada - totalAsignado} 
                                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold" 
                                                />
                                            </div>
                                            <Button variant="secondary" onClick={() => { 
                                                const sel = document.getElementById(`lote-${itemId}`).value; 
                                                const cant = Number(document.getElementById(`cant-${itemId}`).value); 
                                                addAllocation(itemId, sel, cant); 
                                            }} className="py-2.5">
                                                Asignar
                                            </Button>
                                        </div>
                                    )}
                                    {totalAsignado < cantSolicitada && lotesDisponibles.length === 0 && (
                                        <p className="text-xs font-bold text-red-500 mt-2">FALTANTE: No hay stock curado/disponible de este artículo.</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-end gap-4 border-t pt-4">
                    <Button variant="secondary" onClick={() => setView('list')}>Volver</Button>
                    <Button variant="success" className="px-8" disabled={saving} onClick={confirmDispatch}>{saving ? 'Procesando...' : 'Confirmar Carga de Reparto'}</Button>
                </div>
            </Card>
        );
    }

    return (
        <div className="animate-in fade-in max-w-6xl mx-auto space-y-6">
            
            {/* CABECERA */}
            <div className="flex justify-between items-center print:hidden">
                <div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-800 flex items-center gap-2"><Truck className="text-orange-600"/> Despacho de Reparto Consolidado (DSD)</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase mt-1">Hoja de ruta unificada: Panificados, Fiambres, Secos y Conservas</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowStockModal(true)} 
                        className={`px-4 border p-2 rounded-xl transition-all cursor-pointer text-xs font-black flex items-center gap-1 ${
                            isMaldonado 
                                ? 'bg-[#1a1a1a]/40 border-[#1a1a1a] text-[#8a8a8a] hover:text-[#f5f5f5] hover:bg-[#1a1a1a]/85' 
                                : 'bg-white hover:bg-slate-100'
                        }`}
                    >
                        <Warehouse size={16} className={isMaldonado ? 'text-[#e2c97d]' : 'text-blue-600'}/> Ver Stock PT
                    </button>
                    <Button onClick={() => setView('new')} variant="primary" className="shadow-lg"><Plus size={16} /> Cargar Pedido DSD</Button>
                </div>
            </div>

            {/* TABLERO DE PEDIDOS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
                {['PEDIDO', 'DESPACHADO', 'ENTREGADO'].map(estado => (
                    <div key={estado} className={`flex flex-col rounded-xl p-3 shadow-inner ${
                        isMaldonado 
                            ? 'bg-[#1a1a1a]/20 border border-[#1a1a1a]' 
                            : 'bg-slate-100/50 border border-slate-200'
                    }`}>
                        <div className={`p-3 mb-2 font-black uppercase text-[10px] tracking-wider flex justify-between items-center border-b ${
                            isMaldonado 
                                ? 'border-[#1a1a1a] text-[#f5f5f5]' 
                                : 'border-slate-300 text-slate-600'
                        }`}>
                            {estado === 'PEDIDO' ? '🛒 Nuevos Pedidos' : estado === 'DESPACHADO' ? '🚚 En Reparto' : '💰 Entregados'}
                            <span className={
                                isMaldonado 
                                    ? 'text-[#e2c97d] bg-[#e2c97d]/10 border border-[#e2c97d]/20 px-2.5 rounded-full py-0.5 text-[9px] font-mono' 
                                    : 'bg-slate-900 text-white px-2.5 rounded-full py-0.5 text-[9px] font-mono'
                            }>{pedidos.filter(p => p.estado === estado).length}</span>
                        </div>
                        <div className="space-y-3 overflow-y-auto max-h-[65vh]">
                            {pedidos.filter(p => p.estado === estado).map(p => {
                                const cli = clientes.find(c => c.id === (p.clientId || p.cliente_id));
                                return (
                                    <Card key={p.id} className={`p-4 shadow-sm transition-all group ${
                                        isMaldonado 
                                            ? 'bg-[#1a1a1a]/40 border-[#1a1a1a] hover:border-[#e2c97d]/50' 
                                            : 'bg-white hover:border-slate-400'
                                    }`}>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[8px] font-mono font-black text-slate-400">{p.num_orden || p.id}</span>
                                            {estado === 'PEDIDO' && (
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => startEditOrder(p)} 
                                                        className="text-[8px] text-slate-400 hover:text-blue-500 font-black uppercase transition-colors"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteOrder(p)} 
                                                        className="text-[8px] text-slate-400 hover:text-red-500 font-black uppercase transition-colors"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            )}
                                            {estado !== 'PEDIDO' && (
                                                <button 
                                                    onClick={() => handleDeleteOrder(p)} 
                                                    className="text-[8px] text-slate-400 hover:text-red-500 font-black uppercase transition-colors"
                                                >
                                                    Eliminar
                                                </button>
                                            )}
                                            <span className="text-[8px] font-black text-slate-400">Total: ${Number(p.total).toLocaleString('es-AR')}</span>
                                        </div>
                                        <h4 className="font-black text-xs uppercase text-slate-800 mb-3 truncate leading-tight">{cli?.nombre || cli?.razon_social}</h4>
                                        <div className={`space-y-1 mb-3 border-t pt-2 ${isMaldonado ? 'border-[#1a1a1a]' : ''}`}>
                                            {p.items?.map((item, i) => {
                                                const cant = estado === 'PEDIDO' ? (item.cantidad_solicitada || item.cantidadPedida) : item.cantidadEnviada;
                                                return (
                                                    <p key={i} className="text-[9px] font-bold text-slate-500 flex justify-between">
                                                        <span className="truncate w-3/4">[{item.product_type?.toUpperCase()}] {item.nombre_producto}</span>
                                                        <span className={`font-mono font-bold ${isMaldonado ? 'text-[#e2c97d]' : 'text-blue-600'}`}>{cant}u</span>
                                                    </p>
                                                );
                                            })}
                                        </div>
                                        <div className={`border-t pt-3 flex justify-between items-center ${isMaldonado ? 'border-[#1a1a1a]' : ''}`}>
                                            <span className="text-[8px] font-bold text-slate-400">{new Date(p.fecha || p.fecha_creacion).toLocaleDateString()}</span>
                                            {estado === 'PEDIDO' && (
                                                <button 
                                                    onClick={() => startFulfillment(p)} 
                                                    className={`text-[9px] px-3 py-1.5 rounded uppercase flex items-center gap-1 active:scale-95 transition-all shadow-sm ${
                                                        isMaldonado 
                                                            ? 'bg-[#e2c97d] text-[#0c0c0c] hover:bg-[#d4ba6c] font-medium border border-[#e2c97d]' 
                                                            : 'bg-blue-600 hover:bg-blue-700 text-white font-black'
                                                    }`}
                                                >
                                                    Preparar
                                                </button>
                                            )}
                                            {estado === 'DESPACHADO' && (
                                                <button 
                                                    onClick={() => markAsDelivered(p)} 
                                                    className={`text-[9px] px-3 py-1.5 rounded uppercase flex items-center gap-1 active:scale-95 transition-all shadow-sm ${
                                                        isMaldonado 
                                                            ? 'bg-[#065f46] text-[#a7f3d0] hover:bg-[#047857] font-medium border border-[#065f46]' 
                                                            : 'bg-emerald-600 hover:bg-emerald-700 text-white font-black'
                                                    }`}
                                                >
                                                    Entregado
                                                </button>
                                            )}
                                            {estado === 'ENTREGADO' && (
                                                <span className="text-emerald-600 text-[8px] font-black uppercase flex items-center gap-1">✓ Facturado</span>
                                            )}
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* STOCK PT MODAL */}
            {showStockModal && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-8 z-50 animate-in fade-in">
                    <Card className="max-w-4xl w-full p-6 border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[85vh]">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <div>
                                <h3 className="text-xl font-black uppercase italic text-slate-800">Inventario PT Consolidado (FEFO)</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Stock disponible para venta en todas las líneas de negocio</p>
                            </div>
                            <button onClick={() => setShowStockModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><XCircle size={24} /></button>
                        </div>
                        <div className="overflow-y-auto flex-1 space-y-6">
                            
                            {/* Panadería Stock */}
                            <div>
                                <p className="text-[9px] font-black uppercase text-orange-600 tracking-wider mb-2 border-b pb-1">🍞 Panificados (Stock Planta)</p>
                                <table className="w-full text-left font-bold text-xs">
                                    <thead className="bg-slate-50 text-slate-500 text-[9px] uppercase">
                                        <tr><th className="p-2">Lote</th><th className="p-2">Producto</th><th className="p-2 text-center">Vencimiento</th><th className="p-2 text-right">Cantidad</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {lotesPT.filter(l => l.cantidadActual > 0).map(l => (
                                            <tr key={l.id} className="hover:bg-slate-50">
                                                <td className="p-2 font-mono text-blue-700">{l.codigo_lote || l.id}</td>
                                                <td className="p-2 uppercase text-[10px]">{recipes.find(r=>r.id===l.recipeId)?.nombre_producto || 'Bakery'}</td>
                                                <td className="p-2 text-center font-mono">{new Date(l.vencimiento).toLocaleDateString()}</td>
                                                <td className="p-2 text-right font-mono text-slate-900">{l.cantidadActual} u</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Charcutería Stock */}
                            <div>
                                <p className="text-[9px] font-black uppercase text-purple-600 tracking-wider mb-2 border-b pb-1">🍖 Charcutería Curados (Listo para despacho)</p>
                                <table className="w-full text-left font-bold text-xs">
                                    <thead className="bg-slate-50 text-slate-500 text-[9px] uppercase">
                                        <tr><th className="p-2">Lote</th><th className="p-2">Chacinado</th><th className="p-2 text-center">Vencimiento</th><th className="p-2 text-right">Peso Físico</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {charcLotes.filter(l => l.estado === 'CURADO_LISTO').map(l => (
                                            <tr key={l.id} className="hover:bg-slate-50">
                                                <td className="p-2 font-mono text-blue-700">{l.codigo_lote}</td>
                                                <td className="p-2 uppercase text-[10px]">{charcRecetas.find(r=>r.id===l.receta_id)?.nombre || 'Chacinado'}</td>
                                                <td className="p-2 text-center font-mono">{new Date(l.fecha_vencimiento).toLocaleDateString()}</td>
                                                <td className="p-2 text-right font-mono text-slate-900">{(l.peso_actual_g || 0).toLocaleString()} g</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Reventa Stock */}
                            <div>
                                <p className="text-[9px] font-black uppercase text-emerald-600 tracking-wider mb-2 border-b pb-1">🥫 Artículos de Reventa (Almacén Central)</p>
                                <table className="w-full text-left font-bold text-xs">
                                    <thead className="bg-slate-50 text-slate-500 text-[9px] uppercase">
                                        <tr><th className="p-2">Lote</th><th className="p-2">Artículo</th><th className="p-2 text-center">Vencimiento</th><th className="p-2 text-right">Unidades</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {reventaLotes.filter(l => l.cantidad_actual > 0).map(l => (
                                            <tr key={l.id} className="hover:bg-slate-50">
                                                <td className="p-2 font-mono text-blue-700">{l.codigo_lote}</td>
                                                <td className="p-2 uppercase text-[10px]">{reventaArticulos.find(a=>a.id===l.articulo_id)?.nombre || 'Artículo'}</td>
                                                <td className="p-2 text-center font-mono">{new Date(l.fecha_vencimiento).toLocaleDateString()}</td>
                                                <td className="p-2 text-right font-mono text-slate-900">{l.cantidad_actual} u</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                        </div>
                    </Card>
                </div>
            )}

        </div>
    );
}