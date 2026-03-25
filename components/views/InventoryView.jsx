import React, { useState } from 'react';
import { Search, RotateCcw, Printer, Layers, Calendar, XCircle, DollarSign, AlertTriangle } from 'lucide-react';
import { Card, Button, Input } from '../bakery_erp';
import { supabase } from '../../lib/supabase';

// Unifica la misma función de formato que PurchasesView
const fmtCantidad = (cantidad, unidad_base = 'g') => {
    const n = Number(cantidad);
    if (unidad_base === 'g') return n >= 1000 ? `${(n / 1000).toLocaleString('es-AR', { maximumFractionDigits: 2 })} Kg` : `${n.toLocaleString('es-AR')} g`;
    if (unidad_base === 'ml') return n >= 1000 ? `${(n / 1000).toLocaleString('es-AR', { maximumFractionDigits: 2 })} L` : `${n.toLocaleString('es-AR')} ml`;
    return `${n.toLocaleString('es-AR')} ${unidad_base}`;
};

export default function InventoryView({ ingredients, lots, providers, setLots, showToast, inventoryLogs, setInventoryLogs }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [providerFilter, setProviderFilter] = useState('');
    const [adjustModal, setAdjustModal] = useState(null);
    const [newStock, setNewStock] = useState('');
    const [showLogs, setShowLogs] = useState(false);

    const detailedLots = lots.filter(l => l.amount > 0).map(lot => {
        const ing = ingredients.find(i => i.id === lot.ingredientId);
        const prov = providers.find(p => p.id === lot.providerId);
        return {
            ...lot,
            ingredientName: ing?.name || 'Desconocido',
            unidad_base: ing?.unidad_base || lot.unidad || 'g',
            es_subensamble: ing?.es_subensamble || false,
            providerName: lot.providerId === 'interno' ? 'Producción Interna' : (prov?.nombre || 'S/D'),
            // Valorización: cantidad × costo unitario
            valorLote: Number(lot.amount) * Number(lot.unitPrice || 0)
        };
    }).sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

    const filteredLots = detailedLots.filter(l => {
        // [MED-3] Buscar por codigo_lote, nombre de insumo y proveedor (NO por UUID)
        const matchSearch = l.ingredientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (l.codigo_lote || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.providerName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchProvider = providerFilter === '' || l.providerId === providerFilter;
        return matchSearch && matchProvider;
    });

    // Valorización total del stock visible
    const valorTotalStock = filteredLots.reduce((acc, l) => acc + l.valorLote, 0);

    // [CRIT-1 + WARN-4] Ajuste persistente: actualiza BD y guarda log en ajustes_inventario
    const handleAdjustStock = async () => {
        if (!adjustModal || newStock === '') return;

        const oldAmount = adjustModal.amount;
        const newAmount = Number(newStock);

        try {
            // CRIT-1: persistir en lotes_insumos
            const { error } = await supabase
                .from('lotes_insumos')
                .update({ cantidad_actual: newAmount })
                .eq('id', adjustModal.id);
            if (error) throw error;

            // WARN-4: persistir log en ajustes_inventario
            await supabase.from('ajustes_inventario').insert([{
                lote_id: adjustModal.id,
                ingrediente_id: adjustModal.ingredientId,
                ingrediente_nombre: adjustModal.ingredientName,
                cantidad_anterior: oldAmount,
                cantidad_nueva: newAmount,
                motivo: 'Ajuste manual de inventario físico',
                usuario: 'operador'
            }]);

            // Actualizar log local también (para la sesión actual)
            const logEntry = {
                id: `adj-${Date.now()}`,
                date: new Date().toISOString(),
                lotId: adjustModal.codigo_lote || adjustModal.id,
                ingredientName: adjustModal.ingredientName,
                oldAmount, newAmount, diff: newAmount - oldAmount
            };
            if (setInventoryLogs) setInventoryLogs([logEntry, ...(inventoryLogs || [])]);

            setLots(lots.map(l => l.id === adjustModal.id ? { ...l, amount: newAmount } : l));
            setAdjustModal(null); setNewStock('');
            showToast(`✅ Lote ${adjustModal.codigo_lote || adjustModal.id} actualizado a ${fmtCantidad(newAmount, adjustModal.unidad_base)} y guardado en BD.`);
        } catch (err) {
            showToast('❌ Error al ajustar: ' + err.message, 'error');
        }
    };

    // Cargar historial persistente desde BD al abrir el modal
    const cargarHistorial = async () => {
        setShowLogs(true);
        const { data } = await supabase
            .from('ajustes_inventario')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        if (data && setInventoryLogs) setInventoryLogs(data.map(d => ({
            id: d.id,
            date: d.created_at,
            lotId: d.lote_id,
            ingredientName: d.ingrediente_nombre,
            oldAmount: d.cantidad_anterior,
            newAmount: d.cantidad_nueva,
            diff: d.diferencia
        })));
    };

    const getStatusColor = (expiryDate) => {
        const days = (new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
        if (days < 0) return 'bg-rose-100 text-rose-700 border-rose-200';
        if (days < 30) return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end bg-white p-4 rounded-xl border shadow-sm print:hidden gap-4">
                <div>
                    <h3 className="text-xl font-black uppercase italic text-slate-800">Libro Mayor de Lotes</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Trazabilidad FEFO por Insumo y Proveedor</p>
                </div>
                {/* [MED-2] Valorización total visible */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 flex items-center gap-2">
                    <DollarSign size={16} className="text-emerald-600" />
                    <div>
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Valor Stock Visible</p>
                        <p className="text-lg font-black text-emerald-800 font-mono">${valorTotalStock.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap">
                    <select
                        className="border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-600 outline-none focus:border-blue-500 bg-slate-50 cursor-pointer"
                        value={providerFilter} onChange={e => setProviderFilter(e.target.value)}
                    >
                        <option value="">Filtrar: Todos los Proveedores</option>
                        <option value="interno">Producción Interna (WIP)</option>
                        {providers.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input type="text" placeholder="Buscar lote, insumo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs font-bold w-48 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all" />
                    </div>
                    <Button variant="secondary" onClick={cargarHistorial}><RotateCcw size={14} /> Historial</Button>
                    <Button variant="primary" onClick={() => window.print()}><Printer size={14} /> Planilla Control</Button>
                </div>
            </div>

            <Card className="overflow-hidden border-2 print:border-none print:shadow-none bg-white">
                <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-2">
                    <h2 className="text-2xl font-black uppercase italic text-slate-900 leading-none">Planilla de Control Físico de Inventario</h2>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-2">Fecha: {new Date().toLocaleDateString('es-AR')} | Turno: _______ | Firma Auditor: ______________</p>
                </div>
                <table className="w-full text-left print:mt-4">
                    <thead className="bg-slate-900 text-white text-[9px] uppercase tracking-widest print:bg-transparent print:text-slate-800 print:border-b-2 print:border-slate-800">
                        <tr>
                            <th className="px-4 py-2">Código Lote</th>
                            <th className="px-4 py-2">SKU / Componente</th>
                            <th className="px-4 py-2">Proveedor Origen</th>
                            <th className="px-4 py-2 text-center print:hidden">Vencimiento</th>
                            {/* [MED-2] Columna costo unitario */}
                            <th className="px-4 py-2 text-right print:hidden">Costo / Und. Base</th>
                            <th className="px-4 py-2 text-right">Existencia Sistema</th>
                            {/* [MED-2] Valor del lote */}
                            <th className="px-4 py-2 text-right print:hidden">Valor Lote</th>
                            <th className="px-4 py-2 text-center print:hidden">Acciones</th>
                            <th className="px-4 py-2 text-right hidden print:table-cell w-32 italic">Conteo Real</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700 bg-white">
                        {filteredLots.map(lot => (
                            <tr key={lot.id} className="hover:bg-slate-50 transition-colors group print:border-b print:border-slate-300">
                                {/* [WARN-5] Mostrar codigo_lote legible en lugar del UUID */}
                                <td className="px-4 py-1.5">
                                    <span className="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 text-[10px]">
                                        {lot.codigo_lote || lot.id.slice(0, 8).toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-4 py-1.5 flex items-center gap-2 uppercase text-[11px]">
                                    {lot.es_subensamble && <Layers size={12} className="text-orange-500 print:hidden" />}
                                    {lot.ingredientName}
                                </td>
                                <td className="px-4 py-1.5 text-[9px] text-slate-500 uppercase">{lot.providerName}</td>
                                <td className="px-4 py-1.5 text-center print:hidden">
                                    <span className={`px-2 py-0.5 rounded border text-[9px] flex items-center justify-center gap-1 w-max mx-auto ${getStatusColor(lot.expiry)}`}>
                                        <Calendar size={10} /> {new Date(lot.expiry).toLocaleDateString('es-AR')}
                                    </span>
                                </td>
                                {/* [CRIT-4] Costo Estándar (Macro Kg/L) para legibilidad humana */}
                                <td className="px-4 py-1.5 text-right font-mono text-slate-600 font-bold text-[11px] print:hidden">
                                    {lot.unitPrice ? (
                                        (lot.unidad_base === 'g' || lot.unidad_base === 'ml')
                                            ? `$${(Number(lot.unitPrice) * 1000).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${lot.unidad_base === 'g' ? 'Kg' : 'L'}`
                                            : `$${Number(lot.unitPrice).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} / ${lot.unidad_base}`
                                    ) : '—'}
                                </td>
                                {/* [CRIT-4] Unidad correcta según unidad_base del ingrediente */}
                                <td className="px-4 py-1.5 text-right font-mono text-slate-900 text-[11px]">
                                    {fmtCantidad(lot.amount, lot.unidad_base)}
                                </td>
                                {/* [MED-2] Valor del lote */}
                                <td className="px-4 py-1.5 text-right font-mono text-emerald-700 text-[11px] print:hidden">
                                    {lot.valorLote > 0 ? `$${lot.valorLote.toLocaleString('es-AR', { minimumFractionDigits: 0 })}` : <span className="text-slate-300">—</span>}
                                </td>
                                <td className="px-4 py-1.5 text-center print:hidden">
                                    <button onClick={() => setAdjustModal(lot)} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[8px] uppercase tracking-widest transition-colors opacity-0 group-hover:opacity-100">Ajustar</button>
                                </td>
                                <td className="px-4 py-1.5 text-right hidden print:table-cell text-slate-300 font-mono">................ {lot.unidad_base || 'Kg'}</td>
                            </tr>
                        ))}
                        {filteredLots.length === 0 && (
                            <tr><td colSpan="9" className="p-8 text-center text-slate-400 italic bg-slate-50">No hay lotes que coincidan con la búsqueda.</td></tr>
                        )}
                    </tbody>
                </table>
            </Card>

            {/* Modal Historial */}
            {showLogs && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-8 z-50 animate-in fade-in">
                    <Card className="max-w-3xl w-full p-6 border-4 border-slate-900 max-h-[85vh] flex flex-col bg-white">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-xl font-black uppercase italic text-slate-800 flex items-center gap-2"><RotateCcw size={20} /> Registro Auditoría (Ajustes Físicos)</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Histórico persistente — guardado en BD</p>
                            </div>
                            <button onClick={() => setShowLogs(false)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 rounded-lg"><XCircle size={24} /></button>
                        </div>
                        <div className="overflow-y-auto flex-1 border border-slate-200 rounded-xl">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-500 text-[9px] uppercase tracking-widest sticky top-0 border-b">
                                    <tr>
                                        <th className="px-4 py-3">Fecha y Hora</th>
                                        <th className="px-4 py-3">Insumo</th>
                                        <th className="px-4 py-3 text-right">Anterior</th>
                                        <th className="px-4 py-3 text-right">Nueva</th>
                                        <th className="px-4 py-3 text-right border-l">Desvío</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-bold bg-white text-slate-700">
                                    {(!inventoryLogs || inventoryLogs.length === 0) ? (
                                        <tr><td colSpan="5" className="p-8 text-center text-slate-400 italic">Sin ajustes registrados aún.</td></tr>
                                    ) : inventoryLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-2.5 text-[10px] text-slate-400 font-mono">{new Date(log.date).toLocaleString('es-AR')}</td>
                                            <td className="px-4 py-2.5">
                                                <p className="uppercase text-[11px] text-slate-800">{log.ingredientName}</p>
                                                <span className="text-[9px] text-blue-500 bg-blue-50 px-1 rounded font-mono border border-blue-100">{log.lotId}</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono text-slate-400">{Number(log.oldAmount).toLocaleString('es-AR')}</td>
                                            <td className="px-4 py-2.5 text-right font-mono text-slate-900">{Number(log.newAmount).toLocaleString('es-AR')}</td>
                                            <td className="px-4 py-2.5 text-right font-mono font-black border-l">
                                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${log.diff > 0 ? 'bg-emerald-50 text-emerald-600' : (log.diff < 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500')}`}>
                                                    {log.diff > 0 ? '+' : ''}{Number(log.diff).toLocaleString('es-AR')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* Modal Ajuste de Lote */}
            {adjustModal && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-8 z-50 animate-in fade-in">
                    <Card className="max-w-md w-full p-8 border-4 border-slate-900">
                        <h3 className="text-lg font-black uppercase italic mb-4">Ajuste de Lote Específico</h3>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-2 text-xs">
                            <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase">Código Lote:</span> <span className="font-mono font-black">{adjustModal.codigo_lote || '—'}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase">Insumo:</span> <span className="font-black uppercase">{adjustModal.ingredientName}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase">Stock Actual:</span> <span className="font-mono font-black text-blue-600">{fmtCantidad(adjustModal.amount, adjustModal.unidad_base)}</span></div>
                        </div>
                        <Input label={`Nuevo Conteo Físico Real (${adjustModal.unidad_base || 'g'})`} type="number" value={newStock} onChange={setNewStock} placeholder="Ej. 25000" required />
                        <div className="flex gap-4 pt-6">
                            <Button onClick={handleAdjustStock} variant="success" className="flex-1 py-3 h-[38px]">Actualizar Lote</Button>
                            <Button onClick={() => setAdjustModal(null)} variant="secondary" className="px-6 h-[38px]">Cancelar</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}