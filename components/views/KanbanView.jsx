import React, { useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Card, Button, Input, ETAPAS_KANBAN } from '../bakery_erp';
import { supabase } from '../../lib/supabase';

export default function KanbanView({ orders, recipes, setOrders, qualityLogs, setQualityLogs, lotesPT, setLotesPT, refreshOrders, refreshLotesPT, showToast }) {
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState({ temp: '', units: '', reason: '' });

    const moveOrder = async (id, newStatus) => {
        const { error } = await supabase
            .from('ordenes_produccion')
            .update({ estado: newStatus })
            .eq('id', id);
        if (error) { showToast('Error al mover orden: ' + error.message, 'error'); return; }
        setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus, estado: newStatus } : o));
    };

    const handleFinalize = async () => {
        if (!form.temp || !form.units) return;

        // 1. Actualizar orden en BD → TERMINADA
        const { error: errOrder } = await supabase
            .from('ordenes_produccion')
            .update({ estado: 'TERMINADA' })
            .eq('id', selected.id);
        if (errOrder) { showToast('Error BD: ' + errOrder.message, 'error'); return; }

        // 2. Crear Lote de Producto Terminado (PT) en BD
        const vencimiento = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
        const codigoLote = `LPT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const { data: loteData, error: errLote } = await supabase
            .from('lotes_pt')
            .insert([{
                codigo_lote: codigoLote,
                receta_id: selected.recipeId || selected.receta_id,
                cantidad_original: Number(form.units),
                cantidad_actual: Number(form.units),
                estado: 'DISPONIBLE',
                fecha_produccion: new Date().toISOString(),
                vencimiento
            }])
            .select();
        if (errLote) { showToast('Error creando Lote PT: ' + errLote.message, 'error'); return; }

        // 3. Registrar log de calidad (local por ahora)
        setQualityLogs([...qualityLogs, {
            id: `q${Date.now()}`,
            orderId: selected.id,
            temperature: Number(form.temp),
            status: Number(form.temp) >= 85 ? 'APROBADO' : 'RECHAZADO',
            timestamp: new Date().toISOString()
        }]);

        // 4. Actualizar estado local
        setOrders(orders.map(o => o.id === selected.id ? { ...o, status: 'TERMINADA', estado: 'TERMINADA', realAmount: form.units } : o));
        if (loteData) {
            const nuevoLote = loteData[0];
            setLotesPT([{
                ...nuevoLote,
                recipeId: nuevoLote.receta_id,
                cantidadInicial: nuevoLote.cantidad_original,
                cantidadActual: nuevoLote.cantidad_actual,
                fechaTerminado: nuevoLote.fecha_produccion,
                vencimiento: nuevoLote.vencimiento
            }, ...lotesPT]);
        }

        setSelected(null);
        setForm({ temp: '', units: '', reason: '' });
        showToast("✅ Lote finalizado y Stock PT actualizado en la nube.");
    };

    return (
        <div className="flex gap-4 h-[calc(100vh-220px)] overflow-x-auto pb-4">
            {ETAPAS_KANBAN.map(etapa => (
                <div key={etapa.id} className="fall-target w-64 flex-shrink-0 flex flex-col bg-slate-100 rounded-xl border border-slate-200 shadow-inner">
                    <div className="p-3 bg-white border-b-2 border-slate-200 flex justify-between items-center rounded-t-xl">
                        <div className="flex items-center gap-1.5 font-black text-[9px] uppercase text-slate-800">{etapa.icon} {etapa.nombre}</div>
                        <span className="text-[9px] font-black text-white bg-slate-900 px-1.5 py-0.5 rounded-full">{orders.filter(o => o.status === etapa.id || o.estado === etapa.id).length}</span>
                    </div>
                    <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5">
                        {orders.filter(o => (o.status || o.estado) === etapa.id).map(o => {
                            const rec = recipes.find(r => r.id === (o.recipeId || o.receta_id));
                            return (
                                <Card key={o.id} className="p-4 hover:border-orange-500 transition-all border-2 border-transparent group shadow-sm bg-white">
                                    <div className="flex justify-between items-center mb-2"><span className="text-[8px] font-mono font-bold text-slate-400">{o.codigo_orden || o.id}</span></div>
                                    <h5 className="font-black text-xs uppercase text-slate-800 leading-tight mb-3 italic truncate" title={rec?.nombre_producto}>{rec?.nombre_producto || 'Cargando...'}</h5>
                                    <div className="flex justify-between items-end border-t border-slate-100 pt-2 mt-1">
                                        <div><p className="text-[7px] font-black uppercase text-slate-400">Meta Lote</p><p className="text-xs font-black text-blue-700 font-mono leading-none mt-0.5">{o.targetAmount || o.cantidad_objetivo}</p></div>
                                        {etapa.id !== 'TERMINADA' && (<button onClick={() => etapa.id === 'CALIDAD' ? setSelected(o) : moveOrder(o.id, ETAPAS_KANBAN[ETAPAS_KANBAN.findIndex(e => e.id === etapa.id) + 1].id)} className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white p-1.5 rounded-md hover:bg-orange-500 shadow-sm"><ArrowRight size={12} /></button>)}
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            ))}
            {selected && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-8 z-50 animate-in fade-in">
                    <Card className="fall-target max-w-xl w-full p-8 border-[6px] border-slate-900 shadow-2xl">
                        <h3 className="text-xl font-black uppercase italic mb-6 border-b pb-3">Auditoría HACCP y Cierre</h3>
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <Input label="Temp. Salida Horno (°C)" type="number" value={form.temp} onChange={v => setForm({ ...form, temp: v })} required />
                                <Input label="Unidades Reales" type="number" value={form.units} onChange={v => setForm({ ...form, units: v })} required />
                            </div>
                            {Number(form.temp) > 0 && Number(form.temp) < 85 && (
                                <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-red-700 flex items-center gap-3"><ShieldCheck size={20} /><p className="text-[9px] font-black uppercase">Bloqueo Sanitario Activo.</p></div>
                            )}
                            <div className="bg-slate-50 p-4 rounded-lg border">
                                <p className="text-[9px] font-black uppercase text-slate-400 mb-2">Clasificar Merma</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Scrap Amasado', 'Quemado', 'Falla Estética', 'Consumo'].map(r => (<button key={r} onClick={() => setForm({ ...form, reason: r })} className={`p-2 text-left rounded-md border-2 font-black uppercase text-[8px] transition-all ${form.reason === r ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400'}`}>{r}</button>))}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-3"><Button onClick={handleFinalize} variant="success" className="flex-1 py-3" disabled={Number(form.temp) < 85 || !form.units || !form.reason}>Finalizar Producción</Button><Button onClick={() => setSelected(null)} variant="secondary" className="px-6">Cancelar</Button></div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}