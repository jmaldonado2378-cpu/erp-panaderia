import React, { useState } from 'react';
import { Card, Button, Input, Select } from '../bakery_erp';
import { DollarSign, Truck, Receipt, History, Edit2, Trash2, X } from 'lucide-react';
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

export default function ClientAccountsView({ clientes, ventas, setVentas, updateVenta, deleteVenta, showToast }) {
    // Nota: 'ventas' aquí representa TODO el historial de la tabla deudas_cliente (ventas y cobros)
    const [selectedClient, setSelectedClient] = useState('');
    const [montoMovimiento, setMontoMovimiento] = useState('');
    const [concepto, setConcepto] = useState('');
    const [saving, setSaving] = useState(false);
    const [editingVenta, setEditingVenta] = useState(null);
    const [editForm, setEditForm] = useState({ concepto: '', monto: '', fecha: '' });

    const handleDeleteVenta = async (v) => {
        if (window.confirm("¿Está seguro de eliminar este movimiento? Esta acción recalculará los saldos y se registrará en el historial de auditoría.")) {
            if (deleteVenta) {
                await deleteVenta(v.id, v);
            }
        }
    };

    const calcularSaldo = (clientId) => {
        return ventas
            .filter(v => (v.clientId || v.cliente_id) === clientId)
            .reduce((sum, v) => sum + Number(v.montoTotal || v.monto || 0), 0);
    };

    const registrarMovimiento = async (e, tipo) => {
        e.preventDefault();
        const parsedMonto = parseDecimalOrZero(montoMovimiento);
        if (!selectedClient || !montoMovimiento || parsedMonto <= 0) return;
        
        setSaving(true);
        const montoFinal = tipo === 'COBRO' ? -parsedMonto : parsedMonto;
        const conceptoFinal = concepto || (tipo === 'COBRO' ? 'Cobranza Recibida' : 'Venta Manual / Remito');

        try {
            const { data, error } = await supabase
                .from('deudas_cliente')
                .insert([{
                    cliente_id: selectedClient,
                    concepto: conceptoFinal,
                    monto: montoFinal,
                    estado: 'PROCESADO',
                    fecha: new Date().toISOString().split('T')[0]
                }])
                .select();

            if (error) throw error;

            // Actualizar estado local
            setVentas([data[0], ...ventas]);
            setMontoMovimiento('');
            setConcepto('');
            showToast(`✅ ${tipo === 'COBRO' ? 'Cobro' : 'Venta'} de $${montoMovimiento} registrado correctamente.`);
        } catch (error) {
            showToast("❌ Error: " + error.message, "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <Card className="p-6 border-t-8 border-emerald-600 bg-white shadow-xl">
                <div className="flex justify-between items-center mb-6 border-b pb-3">
                    <h4 className="text-xl font-black uppercase italic text-slate-800">Cuentas Corrientes - Clientes / Sucursales</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Lista de Saldos */}
                    <div className="md:col-span-1">
                        <h5 className="font-black text-xs text-slate-500 uppercase mb-4 ml-1 flex items-center gap-2">
                             Estado de Deuda
                        </h5>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                            {clientes.map(cli => {
                                const saldo = calcularSaldo(cli.id);
                                if (saldo === 0) return null;
                                
                                return (
                                    <div key={cli.id} className={`flex justify-between items-center bg-white border p-4 rounded-xl shadow-sm hover:border-emerald-300 transition-colors cursor-pointer ${selectedClient === cli.id ? 'ring-2 ring-emerald-500 border-emerald-500' : ''}`} onClick={() => setSelectedClient(cli.id)}>
                                        <div>
                                            <p className="font-bold text-sm text-slate-800">{cli.nombre || cli.razon_social}</p>
                                            <p className="text-[10px] uppercase font-bold text-slate-400">{cli.tipo}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-black font-mono text-lg ${saldo > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                ${Math.abs(saldo).toLocaleString('es-AR')}
                                            </p>
                                            <p className="text-[10px] uppercase font-bold text-slate-400">{saldo > 0 ? 'Debe' : 'A Favor'}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Acciones */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="bg-slate-50 border p-6 rounded-2xl shadow-inner">
                            <h5 className="font-black text-xs text-slate-500 uppercase mb-4">Registrar Movimiento Manual</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <Select label="Cliente / Sucursal" value={selectedClient} onChange={setSelectedClient} required>
                                    <option value="">Seleccionar...</option>
                                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre || c.razon_social}</option>)}
                                </Select>
                                <Input label="Concepto (Opcional)" value={concepto} onChange={setConcepto} placeholder="Ej: Pago adelantado, Ajuste..." />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input label="Monto ($)" type="number" step="0.01" value={montoMovimiento} onChange={setMontoMovimiento} required />
                                <div className="flex gap-2">
                                    <Button 
                                        onClick={(e) => registrarMovimiento(e, 'VENTA')} 
                                        disabled={saving || !selectedClient} 
                                        className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-black uppercase text-[10px]"
                                    >
                                        <Truck size={14} className="mr-1"/> Cargar Deuda
                                    </Button>
                                    <Button 
                                        onClick={(e) => registrarMovimiento(e, 'COBRO')} 
                                        disabled={saving || !selectedClient} 
                                        variant="success" 
                                        className="flex-1 font-black uppercase text-[10px]"
                                    >
                                        <DollarSign size={14} className="mr-1"/> Cargar Cobro
                                    </Button>
                                </div>
                            </div>
                            {selectedClient && (
                                <div className="mt-4 p-3 bg-white rounded-xl border flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Saldo Actual del Cliente:</span>
                                    <span className={`font-mono text-lg font-black ${calcularSaldo(selectedClient) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        ${calcularSaldo(selectedClient).toLocaleString('es-AR')}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Historial */}
                        <Card className="p-4 border shadow-sm">
                            <h5 className="font-black text-xs text-slate-400 uppercase mb-3 flex items-center gap-2">
                                <History size={14} /> Historial de Movimientos
                            </h5>
                            <div className="overflow-x-auto max-h-[300px]">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-100 text-[9px] uppercase tracking-widest text-slate-500 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2">Fecha</th>
                                            <th className="px-3 py-2">Cliente</th>
                                            <th className="px-3 py-2">Concepto</th>
                                            <th className="px-3 py-2 text-right">Monto</th>
                                            <th className="px-3 py-2 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-bold text-xs">
                                        {ventas.map(v => {
                                            const cli = clientes.find(c => (c.id === (v.clientId || v.cliente_id)));
                                            const monto = Number(v.montoTotal || v.monto || 0);
                                            return (
                                                <tr key={v.id} className="hover:bg-slate-50">
                                                    <td className="px-3 py-2 text-[10px] text-slate-400">{new Date(v.fecha || v.created_at).toLocaleDateString('es-AR')}</td>
                                                    <td className="px-3 py-2 text-slate-800 truncate max-w-[150px]">{cli?.nombre || cli?.razon_social || 'Desconocido'}</td>
                                                    <td className="px-3 py-2 text-slate-500 font-medium truncate max-w-[200px]">{v.concepto || (monto > 0 ? 'Venta' : 'Cobranza')}</td>
                                                    <td className={`px-3 py-2 text-right font-mono ${monto > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                        {monto > 0 ? '+' : ''}${monto.toLocaleString('es-AR')}
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button 
                                                                type="button"
                                                                onClick={() => {
                                                                    const isCobro = monto < 0;
                                                                    setEditingVenta(v);
                                                                    setEditForm({
                                                                        concepto: v.concepto || '',
                                                                        monto: Math.abs(monto).toString(),
                                                                        fecha: (v.fecha || v.created_at || new Date().toISOString()).split('T')[0]
                                                                    });
                                                                }}
                                                                className="p-1 hover:bg-slate-100 rounded text-amber-500 transition-colors"
                                                                title="Editar"
                                                            >
                                                                <Edit2 size={12} />
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleDeleteVenta(v)}
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
                                        {ventas.length === 0 && (
                                            <tr><td colSpan="5" className="text-center py-8 text-slate-300 italic">No hay registros cargados.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </div>
            </Card>

            {/* MODAL EDICION MOVIMIENTO CLIENTE */}
            {editingVenta && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-8 z-50 animate-in fade-in">
                    <Card className="max-w-md w-full p-8 border border-slate-200 shadow-2xl rounded-2xl bg-white text-slate-700">
                        <h3 className="text-lg font-black uppercase italic mb-4 flex items-center gap-1.5 text-slate-800">
                            <Edit2 className="text-amber-500" /> Editar Movimiento de Cliente
                        </h3>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-bold uppercase">Cliente:</span> 
                                <span className="font-black uppercase">
                                    {clientes.find(c => c.id === (editingVenta.clientId || editingVenta.cliente_id))?.nombre || 'Cliente'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-bold uppercase">Tipo Original:</span> 
                                <span className={`font-black uppercase ${Number(editingVenta.montoTotal || editingVenta.monto || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {Number(editingVenta.montoTotal || editingVenta.monto || 0) > 0 ? 'Deuda / Venta' : 'Cobro / Pago'}
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
                            const oldMonto = Number(editingVenta.montoTotal || editingVenta.monto || 0);
                            const isCobro = oldMonto < 0;
                            const newMonto = isCobro ? -parsedMonto : parsedMonto;
                            
                            const updatedVenta = {
                                concepto: editForm.concepto,
                                monto: newMonto,
                                fecha: editForm.fecha
                            };
                            
                            try {
                                if (updateVenta) {
                                    await updateVenta(editingVenta.id, updatedVenta, editingVenta);
                                }
                                setEditingVenta(null);
                            } catch (err) {
                                showToast("Error al actualizar: " + err.message, "error");
                            } finally {
                                setSaving(false);
                            }
                        }} className="space-y-4">
                            <Input 
                                label="Concepto / Detalle" 
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
                                    onClick={() => { setEditingVenta(null); }} 
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
