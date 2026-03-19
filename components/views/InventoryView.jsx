import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, Printer, Layers, Calendar, XCircle } from 'lucide-react';
import { Card, Button, Input } from '../bakery_erp';

export default function InventoryView({ ingredients, lots, providers, setLots, showToast, inventoryLogs, setInventoryLogs }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [providerFilter, setProviderFilter] = useState('');
    const [adjustModal, setAdjustModal] = useState(null);
    const [newStock, setNewStock] = useState('');
    const [showLogs, setShowLogs] = useState(false);

    const detailedLots = lots.filter(l => l.amount > 0).map(lot => {
        const ing = ingredients.find(i => i.id === lot.ingredientId);
        const prov = providers.find(p => p.id === lot.providerId);
        return { ...lot, ingredientName: ing?.name || 'Desconocido', es_subensamble: ing?.es_subensamble || false, providerName: lot.providerId === 'interno' ? 'Producción Interna' : (prov?.nombre || 'S/D') };
    }).sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

    const filteredLots = detailedLots.filter(l => {
        const matchSearch = l.ingredientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.providerName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchProvider = providerFilter === '' || l.providerId === providerFilter;
        return matchSearch && matchProvider;
    });

    const handleAdjustStock = () => {
        if (!adjustModal || newStock === '') return;

        const oldAmount = adjustModal.amount;
        const newAmount = Number(newStock);
        const diff = newAmount - oldAmount;

        const logEntry = {
            id: `adj-${Date.now()}`,
            date: new Date().toISOString(),
            lotId: adjustModal.id,
            ingredientName: adjustModal.ingredientName,
            oldAmount,
            newAmount,
            diff
        };

        if (setInventoryLogs) {
            setInventoryLogs([logEntry, ...(inventoryLogs || [])]);
        }

        setLots(lots.map(l => l.id === adjustModal.id ? { ...l, amount: newAmount } : l));
        setAdjustModal(null); setNewStock('');
        showToast(`Stock del lote ${adjustModal.id} actualizado a ${newAmount}g`);
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
                <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap">
                    <select
                        className="border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-600 outline-none focus:border-blue-500 bg-slate-50 cursor-pointer"
                        value={providerFilter}
                        onChange={e => setProviderFilter(e.target.value)}
                    >
                        <option value="">Filtrar: Todos los Proveedores</option>
                        <option value="interno">Producción Interna (WIP)</option>
                        {providers.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input type="text" placeholder="Buscar lote, insumo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs font-bold w-48 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all" />
                    </div>

                    <Button variant="secondary" onClick={() => setShowLogs(true)}><RotateCcw size={14} /> Historial</Button>
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
                            <th className="px-4 py-2 print:py-3">ID Lote</th>
                            <th className="px-4 py-2 print:py-3">SKU / Componente</th>
                            <th className="px-4 py-2 print:py-3">Proveedor Origen</th>
                            <th className="px-4 py-2 text-center print:hidden">Vencimiento</th>
                            <th className="px-4 py-2 text-right print:py-3">Existencia Sistema</th>
                            <th className="px-4 py-2 text-center print:hidden">Acciones</th>
                            <th className="px-4 py-2 text-right hidden print:table-cell w-32 italic">Conteo Real</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700 bg-white">
                        {filteredLots.map(lot => (
                            <tr key={lot.id} className="hover:bg-slate-50 transition-colors group print:border-b print:border-slate-300">
                                <td className="px-4 py-1.5 print:py-3"><span className="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 text-[10px] print:border-none print:bg-transparent print:px-0 print:text-slate-800">{lot.id}</span></td>
                                <td className="px-4 py-1.5 print:py-3 flex items-center gap-2 uppercase text-[11px]">{lot.es_subensamble && <Layers size={12} className="text-orange-500 print:hidden" />}{lot.ingredientName}</td>
                                <td className="px-4 py-1.5 print:py-3 text-[9px] text-slate-500 uppercase">{lot.providerName}</td>
                                <td className="px-4 py-1.5 text-center print:hidden"><span className={`px-2 py-0.5 rounded border text-[9px] flex items-center justify-center gap-1 w-max mx-auto ${getStatusColor(lot.expiry)}`}><Calendar size={10} /> {new Date(lot.expiry).toLocaleDateString('es-AR')}</span></td>
                                <td className="px-4 py-1.5 print:py-3 text-right font-mono text-slate-900 text-[11px]">{lot.amount >= 1000 ? `${(lot.amount / 1000).toLocaleString('es-AR')} Kg` : `${lot.amount.toLocaleString('es-AR')} g`}</td>
                                <td className="px-4 py-1.5 text-center print:hidden"><button onClick={() => setAdjustModal(lot)} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[8px] uppercase tracking-widest transition-colors opacity-0 group-hover:opacity-100">Ajustar</button></td>
                                <td className="px-4 py-1.5 text-right hidden print:table-cell text-slate-300 font-mono">................ Kg</td>
                            </tr>
                        ))}
                        {filteredLots.length === 0 && (
                            <tr><td colSpan="7" className="p-8 text-center text-slate-400 italic bg-slate-50">No hay lotes que coincidan con la búsqueda.</td></tr>
                        )}
                    </tbody>
                </table>
            </Card>

            {showLogs && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-8 z-50 animate-in fade-in">
                    <Card className="max-w-3xl w-full p-6 border-4 border-slate-900 max-h-[85vh] flex flex-col bg-white">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-xl font-black uppercase italic text-slate-800 flex items-center gap-2"><RotateCcw size={20} /> Registro Auditoría (Ajustes Físicos)</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Histórico inmutable de modificaciones de inventario</p>
                            </div>
                            <button onClick={() => setShowLogs(false)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors"><XCircle size={24} /></button>
                        </div>

                        <div className="overflow-y-auto flex-1 border border-slate-200 rounded-xl">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-500 text-[9px] uppercase tracking-widest sticky top-0 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3">Fecha y Hora</th>
                                        <th className="px-4 py-3">Insumo y Lote Afectado</th>
                                        <th className="px-4 py-3 text-right">Cant. Anterior</th>
                                        <th className="px-4 py-3 text-right">Cant. Nueva</th>
                                        <th className="px-4 py-3 text-right border-l border-slate-200">Diferencia (Desvío)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-bold bg-white text-slate-700">
                                    {(!inventoryLogs || inventoryLogs.length === 0) ? (
                                        <tr><td colSpan="5" className="p-8 text-center text-slate-400 italic">El inventario no presenta ajustes manuales en esta sesión.</td></tr>
                                    ) : (
                                        inventoryLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2.5 text-[10px] text-slate-400 font-mono">{new Date(log.date).toLocaleString('es-AR')}</td>
                                                <td className="px-4 py-2.5">
                                                    <p className="uppercase text-[11px] text-slate-800">{log.ingredientName}</p>
                                                    <span className="text-[9px] text-blue-500 bg-blue-50 px-1 rounded font-mono border border-blue-100">{log.lotId}</span>
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-mono text-slate-400">{log.oldAmount >= 1000 ? `${(log.oldAmount / 1000).toLocaleString('es-AR')} Kg` : `${log.oldAmount.toLocaleString('es-AR')} g`}</td>
                                                <td className="px-4 py-2.5 text-right font-mono text-slate-900">{log.newAmount >= 1000 ? `${(log.newAmount / 1000).toLocaleString('es-AR')} Kg` : `${log.newAmount.toLocaleString('es-AR')} g`}</td>
                                                <td className="px-4 py-2.5 text-right font-mono font-black border-l border-slate-50">
                                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${log.diff > 0 ? 'bg-emerald-50 text-emerald-600' : (log.diff < 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500')}`}>
                                                        {log.diff > 0 ? '+' : ''}{log.diff >= 1000 || log.diff <= -1000 ? `${(log.diff / 1000).toLocaleString('es-AR')} Kg` : `${log.diff.toLocaleString('es-AR')} g`}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {adjustModal && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-8 z-50 animate-in fade-in">
                    <Card className="max-w-md w-full p-8 border-4 border-slate-900">
                        <h3 className="text-lg font-black uppercase italic mb-4">Ajuste de Lote Específico</h3>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-2 text-xs">
                            <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase">Lote:</span> <span className="font-mono font-black">{adjustModal.id}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase">Insumo:</span> <span className="font-black uppercase">{adjustModal.ingredientName}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase">Stock Actual:</span> <span className="font-mono font-black text-blue-600">{adjustModal.amount >= 1000 ? `${adjustModal.amount / 1000} Kg` : `${adjustModal.amount} g`}</span></div>
                        </div>
                        <Input label="Nuevo Conteo Físico Real (Gramos)" type="number" value={newStock} onChange={setNewStock} placeholder="Ej. 25000" required />
                        <div className="flex gap-4 pt-6"><Button onClick={handleAdjustStock} variant="success" className="flex-1 py-3 h-[38px]">Actualizar Lote</Button><Button onClick={() => setAdjustModal(null)} variant="secondary" className="px-6 h-[38px]">Cancelar</Button></div>
                    </Card>
                </div>
            )}
        </div>
    );
}
