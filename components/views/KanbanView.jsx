import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, ThermometerSun, Scale } from 'lucide-react';
import { Card, Button, Input, ETAPAS_KANBAN, FAMILIAS } from '../bakery_erp';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { useGlobalContext } from '../context/GlobalContext';

export default function KanbanView({ 
    orders, recipes, setOrders, qualityLogs, setQualityLogs, 
    lotesPT, setLotesPT, refreshOrders, refreshLotesPT, showToast,
    fraccTareas = [], setFraccTareas, ingredients = []
}) {
    const { theme } = useGlobalContext();
    const [selectedSector, setSelectedSector] = useState('bakery'); // 'bakery', 'charcuteria', 'fraccionamiento'
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState({ temp: '', units: '', reason: '' });
    const [filterFamilia, setFilterFamilia] = useState('TODAS');

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

    const handleCompleteFracc = async (task) => {
        const bolsas = Math.floor(task.cantidad_granel_consumida_g / task.formato_bolsa_g);
        try {
            const { error } = await supabase
                .from('fracc_tareas')
                .update({ 
                    estado: 'COMPLETADO', 
                    cantidad_bolsas_obtenidas: bolsas 
                })
                .eq('id', task.id);
            if (error) throw error;
            showToast(`✅ Fraccionamiento completado. Se generaron ${bolsas} bolsas.`);
        } catch (err) {
            showToast(`✅ Tarea completada localmente (Offline).`);
        }

        if (setFraccTareas) {
            setFraccTareas(fraccTareas.map(t => t.id === task.id ? { ...t, estado: 'COMPLETADO', cantidad_bolsas_obtenidas: bolsas } : t));
        }
    };

    const filteredOrders = orders.filter(o => {
        if (filterFamilia === 'TODAS') return true;
        const rec = recipes.find(r => r.id === (o.recipeId || o.receta_id));
        return rec?.familia === filterFamilia;
    });

    const isMaldonado = theme === 'maldonado-contraste';

    return (
        <div className="space-y-4 h-[calc(100vh-210px)] flex flex-col print:h-auto font-sans">
            {/* FILTROS DE SECTOR KANBAN */}
            <div className={isMaldonado 
                ? "flex gap-2 items-center bg-[#1a1a1a]/30 p-3 rounded-sm border border-[#1a1a1a] shadow-sm print:hidden"
                : "flex gap-2 items-center bg-white p-3 rounded-xl border shadow-sm print:hidden"
            }>
                <span className={isMaldonado 
                    ? "text-[10px] font-medium text-[#8a8a8a] uppercase tracking-widest ml-1"
                    : "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1"
                }>Filtrar Línea:</span>
                
                <button 
                    onClick={() => setFilterFamilia('TODAS')} 
                    className={isMaldonado 
                        ? `px-3 py-1 rounded-sm text-[9px] font-medium uppercase transition-all ${
                            filterFamilia === 'TODAS' 
                                ? 'bg-[#e2c97d] text-[#0c0c0c]' 
                                : 'bg-[#1a1a1a]/50 text-[#8a8a8a] hover:text-[#f5f5f5] hover:bg-[#1a1a1a]/80 border border-[#1a1a1a]'
                          }`
                        : `px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${
                            filterFamilia === 'TODAS' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`
                    }
                >
                    Todas las Líneas
                </button>
                
                {Object.values(FAMILIAS).map(f => (
                    <button 
                        key={f.id} 
                        onClick={() => setFilterFamilia(f.id)} 
                        className={isMaldonado 
                            ? `px-3 py-1 rounded-sm text-[9px] font-medium uppercase transition-all ${
                                filterFamilia === f.id 
                                    ? 'bg-[#e2c97d] text-[#0c0c0c]' 
                                    : 'bg-[#1a1a1a]/50 text-[#8a8a8a] hover:text-[#f5f5f5] hover:bg-[#1a1a1a]/80 border border-[#1a1a1a]'
                              }`
                            : `px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${
                                filterFamilia === f.id ? 'bg-orange-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`
                        }
                    >
                        {f.nombre}
                    </button>
                ))}
            </div>

            <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
                {ETAPAS_KANBAN.map(etapa => {
                    const count = filteredOrders.filter(o => o.status === etapa.id || o.estado === etapa.id).length;
                    return (
                        <div 
                            key={etapa.id} 
                            className={isMaldonado
                                ? "w-64 flex-shrink-0 flex flex-col bg-[#1a1a1a]/20 border border-[#1a1a1a] rounded-sm shadow-inner"
                                : "fall-target w-64 flex-shrink-0 flex flex-col bg-slate-100 rounded-xl border border-slate-200 shadow-inner"
                            }
                        >
                            <div className={isMaldonado
                                ? "p-3 bg-[#1a1a1a]/40 border-b border-[#1a1a1a]/50 flex justify-between items-center rounded-t-sm"
                                : "p-3 bg-white border-b-2 border-slate-200 flex justify-between items-center rounded-t-xl"
                            }>
                                <div className={isMaldonado
                                    ? "flex items-center gap-1.5 font-bold text-[9px] uppercase text-[#f5f5f5]"
                                    : "flex items-center gap-1.5 font-black text-[9px] uppercase text-slate-800"
                                }>
                                    {etapa.icon} {etapa.nombre}
                                </div>
                                <span className={isMaldonado
                                    ? "text-[9px] font-medium text-[#e2c97d] bg-[#e2c97d]/10 border border-[#e2c97d]/20 px-1.5 py-0.5 rounded-sm"
                                    : "text-[9px] font-black text-white bg-slate-900 px-1.5 py-0.5 rounded-full"
                                }>
                                    {count}
                                </span>
                            </div>
                            <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5 custom-scrollbar">
                                {filteredOrders.filter(o => (o.status || o.estado) === etapa.id).map(o => {
                                    const rec = recipes.find(r => r.id === (o.recipeId || o.receta_id));
                                    return (
                                        <div 
                                            key={o.id} 
                                            className={isMaldonado
                                                ? "p-4 transition-all border border-[#1a1a1a] bg-[#1a1a1a]/40 hover:border-[#e2c97d]/50 group shadow-sm rounded-sm"
                                                : "p-4 hover:border-orange-500 transition-all border-2 border-transparent group shadow-sm bg-white rounded-xl"
                                            }
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                <span className={isMaldonado
                                                    ? "text-[8px] font-mono font-medium text-[#8a8a8a]"
                                                    : "text-[8px] font-mono font-bold text-slate-400"
                                                }>
                                                    {o.codigo_orden || o.id}
                                                </span>
                                            </div>
                                            <h5 className={isMaldonado
                                                ? "text-xs uppercase text-[#f5f5f5] leading-tight mb-3 truncate font-medium"
                                                : "font-black text-xs uppercase text-slate-800 leading-tight mb-3 italic truncate"
                                            } title={rec?.nombre_producto}>
                                                {rec?.nombre_producto || 'Cargando...'}
                                            </h5>
                                            <div className={isMaldonado
                                                ? "flex justify-between items-end border-t border-[#1a1a1a]/50 pt-2 mt-1"
                                                : "flex justify-between items-end border-t border-slate-100 pt-2 mt-1"
                                            }>
                                                <div>
                                                    <p className={isMaldonado
                                                        ? "text-[7px] font-medium uppercase text-[#8a8a8a]"
                                                        : "text-[7px] font-black uppercase text-slate-400"
                                                    }>Meta Lote</p>
                                                    <p className={isMaldonado
                                                        ? "text-xs font-medium text-[#e2c97d] font-mono leading-none mt-0.5"
                                                        : "text-xs font-black text-blue-700 font-mono leading-none mt-0.5"
                                                    }>{o.targetAmount || o.cantidad_objetivo}</p>
                                                </div>
                                                {etapa.id !== 'TERMINADA' && (
                                                    <button 
                                                        onClick={() => etapa.id === 'CALIDAD' ? setSelected(o) : moveOrder(o.id, ETAPAS_KANBAN[ETAPAS_KANBAN.findIndex(e => e.id === etapa.id) + 1].id)} 
                                                        className={isMaldonado
                                                            ? "opacity-0 group-hover:opacity-100 transition-opacity bg-[#1a1a1a]/80 text-[#8a8a8a] border border-[#1a1a1a] hover:text-[#0c0c0c] hover:bg-[#e2c97d] hover:border-[#e2c97d] p-1.5 rounded-sm shadow-sm"
                                                            : "opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white p-1.5 rounded-md hover:bg-orange-500 shadow-sm"
                                                        }
                                                    >
                                                        <ArrowRight size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* AUDITORÍA MODAL - BAKERY */}
            {selected && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-8 z-50 animate-in fade-in">
                    <Card className={isMaldonado
                        ? "max-w-xl w-full p-8 border border-[#1a1a1a] bg-[#0c0c0c]/95 backdrop-blur-md shadow-2xl rounded-sm text-[#f5f5f5]"
                        : "fall-target max-w-xl w-full p-8 border border-slate-200 shadow-2xl rounded-2xl bg-white"
                    }>
                        <h3 className={isMaldonado
                            ? "text-xl font-bold uppercase mb-6 border-b border-[#1a1a1a] pb-3 text-[#f5f5f5]"
                            : "text-xl font-black uppercase italic mb-6 border-b pb-3"
                        }>Auditoría HACCP y Cierre</h3>
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <Input label="Temp. Salida Horno (°C)" type="number" value={form.temp} onChange={v => setForm({ ...form, temp: v })} required />
                                <Input label="Unidades Reales" type="number" value={form.units} onChange={v => setForm({ ...form, units: v })} required />
                            </div>
                            {Number(form.temp) > 0 && Number(form.temp) < 85 && (
                                <div className={isMaldonado
                                    ? "bg-red-500/10 p-3 rounded-sm border border-red-500/30 text-red-500 flex items-center gap-3"
                                    : "bg-red-50 p-3 rounded-lg border border-red-200 text-red-700 flex items-center gap-3"
                                }>
                                    <ShieldCheck size={20} />
                                    <p className={isMaldonado 
                                        ? "text-[9px] font-medium uppercase"
                                        : "text-[9px] font-black uppercase"
                                    }>Bloqueo Sanitario Activo.</p>
                                </div>
                            )}
                            <div className={isMaldonado
                                ? "bg-[#1a1a1a]/20 p-4 rounded-sm border border-[#1a1a1a]"
                                : "bg-slate-50 p-4 rounded-lg border"
                            }>
                                <p className={isMaldonado
                                    ? "text-[9px] font-medium uppercase text-[#8a8a8a] mb-2"
                                    : "text-[9px] font-black uppercase text-slate-400 mb-2"
                                }>Clasificar Merma</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Scrap Amasado', 'Quemado', 'Falla Estética', 'Consumo'].map(r => (
                                        <button 
                                            key={r} 
                                            onClick={() => setForm({ ...form, reason: r })} 
                                            className={isMaldonado
                                                ? `p-2 text-left rounded-sm border font-medium uppercase text-[8px] transition-all ${
                                                    form.reason === r 
                                                        ? 'bg-[#e2c97d] text-[#0c0c0c] border-[#e2c97d]' 
                                                        : 'bg-[#1a1a1a]/50 text-[#8a8a8a] border-[#1a1a1a] hover:text-[#f5f5f5]'
                                                  }`
                                                : `p-2 text-left rounded-md border-2 font-black uppercase text-[8px] transition-all ${
                                                    form.reason === r ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400'
                                                  }`
                                            }
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-3">
                                {isMaldonado ? (
                                    <>
                                        <button 
                                            onClick={handleFinalize} 
                                            disabled={Number(form.temp) < 85 || !form.units || !form.reason}
                                            className="flex-1 py-3 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white rounded-sm font-medium uppercase text-[10px] transition-all disabled:opacity-40"
                                        >
                                            Finalizar Producción
                                        </button>
                                        <button 
                                            onClick={() => setSelected(null)}
                                            className="px-6 bg-[#1a1a1a]/50 text-[#8a8a8a] border border-[#1a1a1a] hover:text-[#f5f5f5] hover:bg-[#1a1a1a]/80 rounded-sm font-medium uppercase text-[10px] transition-all"
                                        >
                                            Cancelar
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Button onClick={handleFinalize} variant="success" className="flex-1 py-3" disabled={Number(form.temp) < 85 || !form.units || !form.reason}>Finalizar Producción</Button>
                                        <Button onClick={() => setSelected(null)} variant="secondary" className="px-6">Cancelar</Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}