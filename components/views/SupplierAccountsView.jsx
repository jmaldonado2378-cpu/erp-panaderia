import React, { useState } from 'react';
import { Card, Button, Input, Select } from '../bakery_erp';
import { DollarSign, History, Landmark, ReceiptText, Edit2, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const parseDecimal = (val) => {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return val;
    const clean = val.toString().replace(/,/g, '.').trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? null : parsed;
};

const parseDecimalOrZero = (val) => {
    const res = parseDecimal(val);
    return res === null ? 0 : res;
};

export default function SupplierAccountsView({ providers, pagosProveedores, setPagosProveedores, updatePagoProveedor, deletePagoProveedor, showToast }) {
    // Nota: 'pagosProveedores' representa el ledger completo de deudas_proveedor
    const [selectedProvider, setSelectedProvider] = useState('');
    const [montoPago, setMontoPago] = useState('');
    const [concepto, setConcepto] = useState('');
    const [saving, setSaving] = useState(false);
    const [editingPago, setEditingPago] = useState(null);
    const [editForm, setEditForm] = useState({ concepto: '', monto: '', fecha: '' });

    const handleDeletePago = async (p) => {
        if (window.confirm("¿Está seguro de eliminar este movimiento? Esta acción recalculará los saldos y se registrará en el historial de auditoría.")) {
            if (deletePagoProveedor) {
                await deletePagoProveedor(p.id, p);
            }
        }
    };

    const calcularSaldo = (providerId) => {
        return pagosProveedores
            .filter(pg => (pg.providerId || pg.proveedor_id) === providerId)
            .reduce((sum, pg) => sum + Number(pg.monto || 0), 0);
    };

    const registrarPago = async (e) => {
        e.preventDefault();
        const parsedMonto = parseDecimalOrZero(montoPago);
        if (!selectedProvider || !montoPago || parsedMonto <= 0) return;
        
        setSaving(true);
        const conceptoFinal = concepto || 'Pago a Proveedor';

        try {
            const { data, error } = await supabase
                .from('deudas_proveedor')
                .insert([{
                    proveedor_id: selectedProvider,
                    concepto: conceptoFinal,
                    monto: -parsedMonto, // Pago resta deuda
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
                                            <th className="px-3 py-2 text-center">Acciones</th>
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
                                                    <td className="px-3 py-2 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button 
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingPago(p);
                                                                    setEditForm({
                                                                        concepto: p.concepto || '',
                                                                        monto: Math.abs(monto).toString(),
                                                                        fecha: (p.fecha || p.created_at || new Date().toISOString()).split('T')[0]
                                                                    });
                                                                }}
                                                                className="p-1 hover:bg-slate-100 rounded text-amber-500 transition-colors"
                                                                title="Editar"
                                                            >
                                                                <Edit2 size={12} />
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleDeletePago(p)}
                                                                className="p-1 hover:bg-rose-50 rounded text-rose-600 transition-colors"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {pagosProveedores.length === 0 && (
                                            <tr><td colSpan="5" className="text-center py-8 text-slate-300 italic">No hay registros cargados.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </div>
            </Card>

            {/* MODAL EDICION MOVIMIENTO PROVEEDOR */}
            {editingPago && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-8 z-50 animate-in fade-in">
                    <Card className="max-w-md w-full p-8 border border-slate-200 shadow-2xl rounded-2xl bg-white text-slate-700">
                        <h3 className="text-lg font-black uppercase italic mb-4 flex items-center gap-1.5 text-slate-800">
                            <Edit2 className="text-amber-500" /> Editar Movimiento de Proveedor
                        </h3>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-bold uppercase">Proveedor:</span> 
                                <span className="font-black uppercase">
                                    {providers.find(pr => pr.id === (editingPago.providerId || editingPago.proveedor_id))?.nombre || 'Proveedor'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-bold uppercase">Tipo Original:</span> 
                                <span className={`font-black uppercase ${Number(editingPago.monto || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {Number(editingPago.monto || 0) > 0 ? 'Deuda / Factura' : 'Pago Efectuado'}
                                </span>
                            </div>
                        </div>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const parsedMonto = parseDecimalOrZero(editForm.monto);
                            if (!editForm.monto || parsedMonto <= 0) {
                                showToast("Monto inválido", "error");
                                return;
                            }
                            setSaving(true);
                            const oldMonto = Number(editingPago.monto || 0);
                            const isPago = oldMonto < 0;
                            const newMonto = isPago ? -parsedMonto : parsedMonto;
                            
                            const updatedPago = {
                                concepto: editForm.concepto,
                                monto: newMonto,
                                fecha: editForm.fecha
                            };
                            
                            try {
                                if (updatePagoProveedor) {
                                    await updatePagoProveedor(editingPago.id, updatedPago, editingPago);
                                }
                                setEditingPago(null);
                            } catch (err) {
                                showToast("Error al actualizar: " + err.message, "error");
                            } finally {
                                setSaving(false);
                            }
                        }} className="space-y-4">
                            <Input 
                                label="Concepto / Comprobante" 
                                placeholder="Concepto..." 
                                value={editForm.concepto} 
                                onChange={v => setEditForm({ ...editForm, concepto: v })} 
                                required
                            />
                            <Input 
                                label="Monto ($)" 
                                type="number" 
                                step="0.01" 
                                placeholder="Ej: 1500" 
                                value={editForm.monto} 
                                onChange={v => setEditForm({ ...editForm, monto: v })} 
                                required
                            />
                            <Input 
                                label="Fecha" 
                                type="date" 
                                value={editForm.fecha} 
                                onChange={v => setEditForm({ ...editForm, fecha: v })} 
                                required
                            />

                            <div className="flex gap-4 pt-6">
                                <Button 
                                    type="submit"
                                    variant="warning" 
                                    className="flex-1 py-3 h-[38px] shadow-md shadow-amber-100"
                                    disabled={saving}
                                >
                                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                                </Button>
                                <Button 
                                    type="button"
                                    onClick={() => { setEditingPago(null); }} 
                                    variant="secondary" 
                                    className="px-6 h-[38px]"
                                    disabled={saving}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
