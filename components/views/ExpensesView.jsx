'use client';
import React, { useState, useMemo } from 'react';
import { 
    DollarSign, ArrowUpRight, ArrowDownRight, ClipboardList, 
    Plus, History, TrendingUp, Calendar, Tag, ShieldAlert,
    CheckCircle2, CreditCard, Landmark, ReceiptText 
} from 'lucide-react';
import { Card, Button, Input, Select } from '../bakery_erp';
import { supabase } from '../../lib/supabase';

export default function ExpensesView({ 
    expenses = [], addExpense, 
    providers = [], pagosProveedores = [], setPagosProveedores,
    ventas = [], showToast 
}) {
    const [tab, setTab] = useState('general'); // 'general', 'proveedores', 'caja'
    const [saving, setSaving] = useState(false);

    // Formulario de Egreso General
    const [expenseForm, setExpenseForm] = useState({
        categoria: 'Salarios',
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        descripcion: ''
    });

    const categorias = ['Salarios', 'Alquiler', 'Servicios', 'Impuestos', 'Mantenimiento', 'Varios'];

    // Formulario de Pago a Factura de Proveedor
    const [payingInvoice, setPayingInvoice] = useState(null);
    const [paymentConcept, setPaymentConcept] = useState('');

    const handleSaveExpense = async (e) => {
        e.preventDefault();
        if (!expenseForm.monto || Number(expenseForm.monto) <= 0) {
            showToast("Monto inválido", "error");
            return;
        }
        setSaving(true);
        const newExp = {
            categoria: expenseForm.categoria,
            monto: Number(expenseForm.monto),
            fecha: expenseForm.fecha,
            descripcion: expenseForm.descripcion
        };
        if (addExpense) {
            await addExpense(newExp);
        }
        setExpenseForm({
            categoria: 'Salarios',
            monto: '',
            fecha: new Date().toISOString().split('T')[0],
            descripcion: ''
        });
        setSaving(false);
    };

    // Pagar una factura de proveedor directamente (Cierra la deuda e inserta un pago)
    const handlePaySupplierInvoice = async (invoice) => {
        setSaving(true);
        const montoPago = Number(invoice.monto);
        const prov = providers.find(p => p.id === invoice.proveedor_id);
        const conceptoFinal = paymentConcept || `Pago Factura/Remito - ${invoice.concepto}`;

        try {
            // 1. Marcar la factura original como PAGADA
            const { error: errUpdate } = await supabase
                .from('deudas_proveedor')
                .update({ estado: 'PAGADO' })
                .eq('id', invoice.id);
            if (errUpdate) throw errUpdate;

            // 2. Insertar el pago (monto negativo) para restar del saldo
            const { data: payData, error: errInsert } = await supabase
                .from('deudas_proveedor')
                .insert([{
                    proveedor_id: invoice.proveedor_id,
                    concepto: conceptoFinal,
                    monto: -montoPago,
                    estado: 'PROCESADO',
                    fecha: new Date().toISOString().split('T')[0]
                }])
                .select();
            if (errInsert) throw errInsert;

            // Actualizar localmente pagosProveedores
            let updatedList = pagosProveedores.map(p => p.id === invoice.id ? { ...p, estado: 'PAGADO' } : p);
            if (payData && payData.length > 0) {
                updatedList = [payData[0], ...updatedList];
            }
            setPagosProveedores(updatedList);
            setPayingInvoice(null);
            setPaymentConcept('');
            showToast(`✅ Factura de ${prov?.nombre || 'Proveedor'} por $${montoPago.toLocaleString()} saldada y registrada.`);
        } catch (error) {
            console.warn("Fallo en red. Aplicando de forma local:", error.message);
            // Fallback Offline
            const paymentId = 'pay_' + Date.now();
            const localPayment = {
                id: paymentId,
                proveedor_id: invoice.proveedor_id,
                concepto: conceptoFinal,
                monto: -montoPago,
                estado: 'PROCESADO',
                fecha: new Date().toISOString().split('T')[0]
            };
            const updatedList = pagosProveedores.map(p => p.id === invoice.id ? { ...p, estado: 'PAGADO' } : p);
            setPagosProveedores([localPayment, ...updatedList]);
            setPayingInvoice(null);
            setPaymentConcept('');
            showToast("✅ Factura saldada localmente (Offline).");
        } finally {
            setSaving(false);
        }
    };

    // ── DERIVADOS DEL CASH FLOW ──
    const dashboardMetrics = useMemo(() => {
        // Ingresos: Cobranzas reales (registros en ventas/deudas_cliente con monto negativo)
        const cobranzasReales = ventas
            .filter(v => Number(v.montoTotal || v.monto || 0) < 0)
            .reduce((acc, v) => acc + Math.abs(Number(v.montoTotal || v.monto || 0)), 0);

        // Ingresos: Ventas Facturadas (registros en ventas/deudas_cliente con monto positivo)
        const ventasFacturadas = ventas
            .filter(v => Number(v.montoTotal || v.monto || 0) > 0)
            .reduce((acc, v) => acc + Number(v.montoTotal || v.monto || 0), 0);

        // Egresos Insumos: Pagos realizados a proveedores (registros con monto negativo en pagosProveedores)
        const pagosAProveedores = pagosProveedores
            .filter(p => Number(p.monto || 0) < 0)
            .reduce((acc, p) => acc + Math.abs(Number(p.monto || 0)), 0);

        // Egresos Insumos: Compras Facturadas (registros con monto positivo en pagosProveedores)
        const facturasDeProveedores = pagosProveedores
            .filter(p => Number(p.monto || 0) > 0)
            .reduce((acc, p) => acc + Number(p.monto || 0), 0);

        // Egresos Varios: Sueldos, Alquileres, etc.
        const egresosGenerales = expenses.reduce((acc, e) => acc + Number(e.monto || 0), 0);

        // Caja Real (Cash Inflows vs Outflows)
        const cajaReal = cobranzasReales - (pagosAProveedores + egresosGenerales);

        // Resultado Económico (Devengado: Facturado vs Incurrido)
        const resultadoEconomico = ventasFacturadas - (facturasDeProveedores + egresosGenerales);

        return {
            cobranzasReales,
            ventasFacturadas,
            pagosAProveedores,
            facturasDeProveedores,
            egresosGenerales,
            cajaReal,
            resultadoEconomico
        };
    }, [expenses, pagosProveedores, ventas]);

    // Filtrar facturas de proveedores (monto > 0 representan deudas a pagar)
    const facturasProveedores = useMemo(() => {
        return pagosProveedores.filter(p => Number(p.monto || 0) > 0);
    }, [pagosProveedores]);

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* TABS SELECTOR */}
            <div className="flex gap-3 border-b border-slate-200 pb-3 print:hidden">
                <button 
                    onClick={() => setTab('general')} 
                    className={`px-5 py-1.5 rounded-md font-black uppercase text-[9px] transition-all flex items-center gap-1.5 ${tab === 'general' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <ClipboardList size={12} /> Egresos Generales ({expenses.length})
                </button>
                <button 
                    onClick={() => setTab('proveedores')} 
                    className={`px-5 py-1.5 rounded-md font-black uppercase text-[9px] transition-all flex items-center gap-1.5 ${tab === 'proveedores' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <Landmark size={12} /> Facturas de Proveedores ({facturasProveedores.length})
                </button>
                <button 
                    onClick={() => setTab('caja')} 
                    className={`px-5 py-1.5 rounded-md font-black uppercase text-[9px] transition-all flex items-center gap-1.5 ${tab === 'caja' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <TrendingUp size={12} /> Monitor Flujo de Caja
                </button>
            </div>

            {/* TAB: EGRESOS GENERALES */}
            {tab === 'general' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Cargar egreso */}
                    <Card className="p-6 border border-slate-200 bg-white h-max">
                        <h4 className="text-sm font-black uppercase mb-4 italic text-slate-800 border-b pb-2 flex items-center gap-1.5">
                            <Plus size={16} className="text-orange-600" /> Registrar Gasto Operativo
                        </h4>
                        <form onSubmit={handleSaveExpense} className="space-y-4">
                            <Select 
                                label="Categoría" 
                                value={expenseForm.categoria} 
                                onChange={v => setExpenseForm({ ...expenseForm, categoria: v })}
                            >
                                {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </Select>
                            <Input 
                                label="Monto ($)" 
                                type="number" 
                                placeholder="Ej. 150000" 
                                value={expenseForm.monto} 
                                onChange={v => setExpenseForm({ ...expenseForm, monto: v })} 
                                required 
                            />
                            <Input 
                                label="Fecha de Pago" 
                                type="date" 
                                value={expenseForm.fecha} 
                                onChange={v => setExpenseForm({ ...expenseForm, fecha: v })} 
                                required 
                            />
                            <div className="flex flex-col gap-1 w-full text-left">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción / Observación</label>
                                <textarea 
                                    className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none text-sm font-semibold text-slate-800 focus:border-slate-900" 
                                    rows="3"
                                    placeholder="Detalle del egreso..."
                                    value={expenseForm.descripcion}
                                    onChange={e => setExpenseForm({ ...expenseForm, descripcion: e.target.value })}
                                />
                            </div>
                            <Button type="submit" variant="primary" className="w-full py-2.5" disabled={saving}>
                                {saving ? 'Registrando...' : 'Registrar Egreso'}
                            </Button>
                        </form>
                    </Card>

                    {/* Histórico egresos */}
                    <Card className="lg:col-span-2 p-6 border border-slate-200 bg-white">
                        <h4 className="text-sm font-black uppercase mb-4 italic text-slate-800 border-b pb-2 flex items-center gap-1.5">
                            <History size={16} className="text-slate-400" /> Historial de Egresos Varios
                        </h4>
                        <div className="overflow-x-auto max-h-[450px]">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-[9px] uppercase tracking-widest text-slate-500 sticky top-0 border-b">
                                    <tr>
                                        <th className="px-4 py-3">Fecha</th>
                                        <th className="px-4 py-3">Categoría</th>
                                        <th className="px-4 py-3">Detalle</th>
                                        <th className="px-4 py-3 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-bold text-xs bg-white text-slate-700">
                                    {expenses.map(e => (
                                        <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 text-[10px] text-slate-400 font-mono">{new Date(e.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</td>
                                            <td className="px-4 py-3">
                                                <span className="bg-slate-100 text-slate-800 border border-slate-200 rounded px-2 py-0.5 text-[10px] uppercase font-black">
                                                    {e.categoria}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 font-semibold max-w-[250px] truncate" title={e.descripcion}>
                                                {e.descripcion || 'Sin descripción'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-rose-600 text-sm">
                                                ${Number(e.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                    {expenses.length === 0 && (
                                        <tr><td colSpan="4" className="text-center py-8 text-slate-400 italic">No hay egresos generales registrados.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB: FACTURAS DE PROVEEDORES */}
            {tab === 'proveedores' && (
                <Card className="p-6 border border-slate-200 bg-white">
                    <div className="flex justify-between items-center mb-6 border-b pb-3">
                        <div>
                            <h4 className="text-base font-black uppercase italic text-slate-800">Cuentas por Pagar e Insumos</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Egresos vinculados directamente a Remitos y Órdenes de Compra</p>
                        </div>
                        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2 text-right">
                            <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Facturas Pendientes Proveedores</p>
                            <p className="text-lg font-black text-rose-700 font-mono">
                                ${facturasProveedores.filter(f => f.estado === 'PENDIENTE').reduce((sum, f) => sum + Number(f.monto), 0).toLocaleString('es-AR')}
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900 text-white text-[9px] uppercase tracking-widest">
                                <tr>
                                    <th className="px-4 py-3">Fecha</th>
                                    <th className="px-4 py-3">Proveedor</th>
                                    <th className="px-4 py-3">Concepto / Comprobante</th>
                                    <th className="px-4 py-3 text-center">Estado</th>
                                    <th className="px-4 py-3 text-right">Monto</th>
                                    <th className="px-4 py-3 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-bold text-xs bg-white text-slate-700">
                                {facturasProveedores.map(f => {
                                    const prov = providers.find(p => p.id === f.proveedor_id);
                                    return (
                                        <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 text-[10px] text-slate-400 font-mono">
                                                {new Date(f.fecha || f.created_at).toLocaleDateString('es-AR')}
                                            </td>
                                            <td className="px-4 py-3 font-black text-slate-800 uppercase">
                                                {prov?.nombre || 'Proveedor Desconocido'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 font-semibold">
                                                {f.concepto}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                                    f.estado === 'PAGADO' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-rose-100 text-rose-700 border border-rose-200'
                                                }`}>
                                                    {f.estado}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-slate-950 text-sm">
                                                ${Number(f.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3 text-center flex items-center justify-center">
                                                {f.estado === 'PENDIENTE' ? (
                                                    <button 
                                                        onClick={() => setPayingInvoice(f)}
                                                        className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white font-black uppercase text-[8px] tracking-wider rounded shadow-sm active:scale-95 transition-all"
                                                    >
                                                        Registrar Pago
                                                    </button>
                                                ) : (
                                                    <span className="text-green-600 text-[10px] font-black uppercase flex items-center gap-0.5 justify-center"><CheckCircle2 size={12}/> Saldado</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {facturasProveedores.length === 0 && (
                                    <tr><td colSpan="6" className="text-center py-8 text-slate-400 italic">No hay facturas registradas.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* TAB: MONITOR FLUJO DE CAJA */}
            {tab === 'caja' && (
                <div className="space-y-6">
                    {/* METRICAS PRINCIPALES */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Caja Real (Financiero) */}
                        <Card className="p-6 border-l-8 border-emerald-500 bg-white shadow-sm flex flex-col justify-between min-h-[140px]">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Caja Real (Cash Flow Real)</p>
                                <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Cobros Recibidos vs Pagos Realizados (Proveedores + General)</p>
                            </div>
                            <div className="mt-4 flex justify-between items-baseline">
                                <p className={`text-2xl font-black font-mono ${dashboardMetrics.cajaReal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    ${dashboardMetrics.cajaReal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </p>
                                {dashboardMetrics.cajaReal >= 0 ? (
                                    <span className="text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded text-[8px] font-black flex items-center gap-0.5 uppercase"><ArrowUpRight size={10} /> Superávit</span>
                                ) : (
                                    <span className="text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded text-[8px] font-black flex items-center gap-0.5 uppercase"><ArrowDownRight size={10} /> Déficit</span>
                                )}
                            </div>
                        </Card>

                        {/* Margen Económico (Accrual / Devengado) */}
                        <Card className="p-6 border-l-8 border-blue-500 bg-white shadow-sm flex flex-col justify-between min-h-[140px]">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resultado Económico (Devengado)</p>
                                <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Ventas Facturadas vs Gastos Incurridos (Facturas Proveedor + General)</p>
                            </div>
                            <div className="mt-4 flex justify-between items-baseline">
                                <p className={`text-2xl font-black font-mono ${dashboardMetrics.resultadoEconomico >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                                    ${dashboardMetrics.resultadoEconomico.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </p>
                                {dashboardMetrics.resultadoEconomico >= 0 ? (
                                    <span className="text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded text-[8px] font-black flex items-center gap-0.5 uppercase"><ArrowUpRight size={10} /> Rentable</span>
                                ) : (
                                    <span className="text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded text-[8px] font-black flex items-center gap-0.5 uppercase"><ArrowDownRight size={10} /> Pérdida</span>
                                )}
                            </div>
                        </Card>

                        {/* Gastos de Estructura Fija */}
                        <Card className="p-6 border-l-8 border-orange-500 bg-white shadow-sm flex flex-col justify-between min-h-[140px]">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gastos Fijos Operativos</p>
                                <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Sueldos, alquileres y servicios generales sin insumos</p>
                            </div>
                            <div className="mt-4 flex justify-between items-baseline">
                                <p className="text-2xl font-black font-mono text-slate-800">
                                    ${dashboardMetrics.egresosGenerales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </p>
                                <span className="text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">Estructura</span>
                            </div>
                        </Card>

                    </div>

                    {/* DESGLOSE DE INGRESOS Y EGRESOS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Tabla Origen de Fondos (Ingresos) */}
                        <Card className="p-6 border border-slate-200 bg-white">
                            <h5 className="font-black text-xs text-slate-600 uppercase mb-4 border-b pb-2">Desglose de Ingresos</h5>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-500 uppercase">A) Ventas Totales Facturadas</span>
                                    <span className="font-mono font-black text-slate-700">${dashboardMetrics.ventasFacturadas.toLocaleString('es-AR')}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-500 uppercase">B) Cobranzas Efectivas (Caja)</span>
                                    <span className="font-mono font-black text-emerald-600">${dashboardMetrics.cobranzasReales.toLocaleString('es-AR')}</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border text-[10px] text-slate-500 font-bold uppercase flex justify-between">
                                    <span>Pendiente de Cobro (Cuentas Corrientes Clientes):</span>
                                    <span className="font-mono font-black text-rose-600">
                                        ${Math.max(0, dashboardMetrics.ventasFacturadas - dashboardMetrics.cobranzasReales).toLocaleString('es-AR')}
                                    </span>
                                </div>
                            </div>
                        </Card>

                        {/* Tabla Destino de Fondos (Egresos) */}
                        <Card className="p-6 border border-slate-200 bg-white">
                            <h5 className="font-black text-xs text-slate-600 uppercase mb-4 border-b pb-2">Desglose de Egresos</h5>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-500 uppercase">A) Gastos Operativos Fijos</span>
                                    <span className="font-mono font-black text-slate-700">${dashboardMetrics.egresosGenerales.toLocaleString('es-AR')}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-500 uppercase">B) Compras de Insumos (Facturado Proveedores)</span>
                                    <span className="font-mono font-black text-slate-700">${dashboardMetrics.facturasDeProveedores.toLocaleString('es-AR')}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-500 uppercase">C) Pagos Efectivos a Proveedores (Caja)</span>
                                    <span className="font-mono font-black text-rose-600">${dashboardMetrics.pagosAProveedores.toLocaleString('es-AR')}</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border text-[10px] text-slate-500 font-bold uppercase flex justify-between">
                                    <span>Pendiente de Pago (Cuentas Corrientes Proveedores):</span>
                                    <span className="font-mono font-black text-rose-600">
                                        ${Math.max(0, dashboardMetrics.facturasDeProveedores - dashboardMetrics.pagosAProveedores).toLocaleString('es-AR')}
                                    </span>
                                </div>
                            </div>
                        </Card>

                    </div>
                </div>
            )}

            {/* MODAL PARA CONFIRMAR PAGO DE FACTURA DE PROVEEDOR */}
            {payingInvoice && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-8 z-50 animate-in fade-in">
                    <Card className="max-w-md w-full p-8 border border-slate-200 shadow-2xl rounded-2xl bg-white">
                        <h3 className="text-lg font-black uppercase italic mb-4 flex items-center gap-1.5 text-slate-800">
                            <CreditCard className="text-violet-600" /> Cancelar Factura de Proveedor
                        </h3>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-bold uppercase">Proveedor:</span> 
                                <span className="font-black uppercase">{providers.find(p => p.id === payingInvoice.proveedor_id)?.nombre || 'Proveedor'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-bold uppercase">Concepto:</span> 
                                <span className="font-bold text-slate-600">{payingInvoice.concepto}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-bold uppercase">Monto de la Deuda:</span> 
                                <span className="font-mono font-black text-rose-600">${Number(payingInvoice.monto).toLocaleString('es-AR')}</span>
                            </div>
                        </div>

                        <Input 
                            label="Concepto de Pago (Opcional)" 
                            placeholder="Ej. Transferencia Banco Galicia..." 
                            value={paymentConcept} 
                            onChange={setPaymentConcept} 
                        />

                        <div className="flex gap-4 pt-6">
                            <Button 
                                onClick={() => handlePaySupplierInvoice(payingInvoice)} 
                                variant="success" 
                                className="flex-1 py-3 h-[38px] bg-violet-600 hover:bg-violet-700 shadow-md shadow-violet-100"
                                disabled={saving}
                            >
                                {saving ? 'Procesando...' : 'Confirmar e Imputar Pago'}
                            </Button>
                            <Button 
                                onClick={() => { setPayingInvoice(null); setPaymentConcept(''); }} 
                                variant="secondary" 
                                className="px-6 h-[38px]"
                            >
                                Cancelar
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

        </div>
    );
}
