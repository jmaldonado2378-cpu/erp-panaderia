import React, { useState } from 'react';
import { Card, Button, Input, Select } from '../bakery_erp';
import { DollarSign, History, Landmark, ReceiptText } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function SupplierAccountsView({ providers, pagosProveedores, setPagosProveedores, showToast }) {
    // Nota: 'pagosProveedores' representa el ledger completo de deudas_proveedor
    const [selectedProvider, setSelectedProvider] = useState('');
    const [montoPago, setMontoPago] = useState('');
    const [concepto, setConcepto] = useState('');
    const [saving, setSaving] = useState(false);

    const calcularSaldo = (providerId) => {
        return pagosProveedores
            .filter(pg => (pg.providerId || pg.proveedor_id) === providerId)
            .reduce((sum, pg) => sum + Number(pg.monto || 0), 0);
    };

    const registrarPago = async (e) => {
        e.preventDefault();
        if (!selectedProvider || !montoPago || Number(montoPago) <= 0) return;
        
        setSaving(true);
        const conceptoFinal = concepto || 'Pago a Proveedor';

        try {
            const { data, error } = await supabase
                .from('deudas_proveedor')
                .insert([{
                    proveedor_id: selectedProvider,
                    concepto: conceptoFinal,
                    monto: -Number(montoPago), // Pago resta deuda
                    estado: 'PAGADO',
                    fecha: new Date().toISOString().split('T')[0]
                }])
                .select();

            if (error) throw error;

            // Actualizar estado local
            setPagosProveedores([data[0], ...pagosProveedores]);
            setMontoPago('');
            setConcepto('');
            showToast(`✅ Pago de $${montoPago} registrado exitosamente en Supabase.`);
        } catch (error) {
            showToast("❌ Error al registrar pago: " + error.message, "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <Card className="p-6 border-t-8 border-violet-600 bg-white shadow-xl">
                <div className="flex justify-between items-center mb-6 border-b pb-3">
                    <h4 className="text-xl font-black uppercase italic text-slate-800">Cuentas Corrientes - Proveedores</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Lista de Saldos */}
                    <div className="md:col-span-1">
                        <h5 className="font-black text-xs text-slate-500 uppercase mb-4 ml-1 flex items-center gap-2">
                            <Landmark size={14} /> Resumen de Saldos
                        </h5>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                            {providers.map(prov => {
                                const saldo = calcularSaldo(prov.id);
                                if (saldo === 0) return null;
                                
                                return (
                                    <div 
                                        key={prov.id} 
                                        className={`flex justify-between items-center bg-white border p-4 rounded-xl shadow-sm hover:border-violet-300 transition-colors cursor-pointer ${selectedProvider === prov.id ? 'ring-2 ring-violet-500 border-violet-500' : ''}`}
                                        onClick={() => setSelectedProvider(prov.id)}
                                    >
                                        <div>
                                            <p className="font-bold text-sm text-slate-800">{prov.nombre || prov.razon_social}</p>
                                            <p className="text-[10px] uppercase font-bold text-slate-400">{prov.rubro}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-black font-mono text-lg ${saldo > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                ${Math.abs(saldo).toLocaleString('es-AR')}
                                            </p>
                                            <p className="text-[10px] uppercase font-bold text-slate-400">{saldo > 0 ? 'Deuda' : 'Saldo a Favor'}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Nuevo Pago */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="bg-slate-50 border p-6 rounded-2xl shadow-inner">
                            <h5 className="font-black text-xs text-slate-500 uppercase mb-4 flex items-center gap-2">
                                <ReceiptText size={14} /> Registrar Entrega de Dinero
                            </h5>
                            <form onSubmit={registrarPago} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Select label="Proveedor" value={selectedProvider} onChange={setSelectedProvider} required>
                                        <option value="">Seleccionar proveedor...</option>
                                        {providers.map(p => <option key={p.id} value={p.id}>{p.nombre || p.razon_social}</option>)}
                                    </Select>
                                    <Input label="Concepto (Opcional)" value={concepto} onChange={setConcepto} placeholder="Ej: Pago quincena, adelanto..." />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                                    <Input label="Monto a Pagar ($)" type="number" step="0.01" value={montoPago} onChange={setMontoPago} required />
                                    <Button type="submit" variant="primary" disabled={saving || !selectedProvider} className="w-full py-3 h-[42px] bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-100">
                                        < DollarSign size={16} className="mr-1"/> {saving ? 'Procesando...' : 'Asentar Pago'}
                                    </Button>
                                </div>
                                
                                {selectedProvider && (
                                    <div className="bg-white border p-3 rounded-xl flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500 uppercase">Saldo Actual Pendiente:</span>
                                        <span className={`font-mono text-lg font-black ${calcularSaldo(selectedProvider) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            ${calcularSaldo(selectedProvider).toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* Historial de Pagos */}
                        <Card className="p-4 border shadow-sm">
                            <h5 className="font-black text-xs text-slate-400 uppercase mb-4 flex items-center gap-2">
                                <History size={14} /> Historial de Movimientos (Salidas/Compras)
                            </h5>
                            <div className="overflow-x-auto max-h-[300px]">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-100 text-[9px] uppercase tracking-widest text-slate-500 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2">Fecha</th>
                                            <th className="px-3 py-2">Proveedor</th>
                                            <th className="px-3 py-2">Concepto</th>
                                            <th className="px-3 py-2 text-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-bold text-xs">
                                        {pagosProveedores.map(p => {
                                            const prov = providers.find(pr => (pr.id === (p.providerId || p.proveedor_id)));
                                            const monto = Number(p.monto || 0);
                                            return (
                                                <tr key={p.id} className="hover:bg-slate-50">
                                                    <td className="px-3 py-2 text-[10px] text-slate-400">{new Date(p.fecha || p.created_at).toLocaleDateString('es-AR')}</td>
                                                    <td className="px-3 py-2 text-slate-800 truncate max-w-[150px]">{prov?.nombre || 'Desconocido'}</td>
                                                    <td className="px-3 py-2 text-slate-500 font-medium truncate max-w-[200px]">{p.concepto}</td>
                                                    <td className={`px-3 py-2 text-right font-mono ${monto > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                        ${monto.toLocaleString('es-AR')}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {pagosProveedores.length === 0 && (
                                            <tr><td colSpan="4" className="text-center py-8 text-slate-300 italic">No hay registros cargados.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </div>
            </Card>
        </div>
    );
}
