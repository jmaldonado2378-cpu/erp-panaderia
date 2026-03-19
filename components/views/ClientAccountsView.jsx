import React, { useState } from 'react';
import { Card, Button, Input, Select } from '../bakery_erp';
import { DollarSign, Truck, Receipt, History } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ClientAccountsView({ clientes, ventas, setVentas, showToast }) {
    // Nota: 'ventas' aquí representa TODO el historial de la tabla deudas_cliente (ventas y cobros)
    const [selectedClient, setSelectedClient] = useState('');
    const [montoMovimiento, setMontoMovimiento] = useState('');
    const [concepto, setConcepto] = useState('');
    const [saving, setSaving] = useState(false);

    const calcularSaldo = (clientId) => {
        return ventas
            .filter(v => (v.clientId || v.cliente_id) === clientId)
            .reduce((sum, v) => sum + Number(v.montoTotal || v.monto || 0), 0);
    };

    const registrarMovimiento = async (e, tipo) => {
        e.preventDefault();
        if (!selectedClient || !montoMovimiento || Number(montoMovimiento) <= 0) return;
        
        setSaving(true);
        const montoFinal = tipo === 'COBRO' ? -Number(montoMovimiento) : Number(montoMovimiento);
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
                                                </tr>
                                            );
                                        })}
                                        {ventas.length === 0 && (
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
