'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { 
    Scale, Plus, Package, Calendar, User, ClipboardList, 
    AlertTriangle, CheckCircle2, QrCode, ArrowRight, RefreshCw
} from 'lucide-react';
import { Card, Button, Input, Select } from '../bakery_erp';
import PrintPreviewModal from '../PrintPreviewModal';
import { useGlobalContext } from '../context/GlobalContext';

export default function FraccionamientoView({ 
    fraccTareas, addFraccTarea,
    ingredients, lots, showToast 
}) {
    const { theme } = useGlobalContext();
    const [tab, setTab] = useState('tareas'); // 'tareas', 'nuevo'
    const [printedLabel, setPrintedLabel] = useState(null);
    const [processingTask, setProcessingTask] = useState(null);
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Formulario de Fraccionamiento
    const [form, setForm] = useState({
        insumo_granel_id: '',
        granel_lote_id: '',
        empaque_id: '',
        empaque_lote_id: '',
        cantidad_granel_consumida_g: '',
        formato_bolsa_g: 100,
        cantidad_bolsas_obtenidas: '',
        lote_pt_generado: '',
        merma_razon: 'Derrame de Carga'
    });

    // Separar tareas pendientes de completadas
    const pendingTasks = useMemo(() => {
        return fraccTareas.filter(t => t.estado === 'PENDIENTE' || t.status === 'PENDIENTE');
    }, [fraccTareas]);

    const completedTasks = useMemo(() => {
        return fraccTareas.filter(t => t.estado === 'COMPLETADO' || t.status === 'COMPLETADO' || !t.estado);
    }, [fraccTareas]);

    // Lotes filtrados según ingrediente de granel seleccionado
    const lotesGranelDisponibles = useMemo(() => {
        if (!form.insumo_granel_id) return [];
        return lots.filter(l => ((l.ingredientId || l.ingrediente_id) === form.insumo_granel_id) && (Number(l.amount || l.cantidad_actual) > 0))
            .sort((a, b) => new Date(a.expiry || a.fecha_vencimiento || 0) - new Date(b.expiry || b.fecha_vencimiento || 0));
    }, [form.insumo_granel_id, lots]);

    // Lotes filtrados según empaque seleccionado
    const lotesEmpaqueDisponibles = useMemo(() => {
        if (!form.empaque_id) return [];
        return lots.filter(l => ((l.ingredientId || l.ingrediente_id) === form.empaque_id) && (Number(l.amount || l.cantidad_actual) > 0))
            .sort((a, b) => new Date(a.expiry || a.fecha_vencimiento || 0) - new Date(b.expiry || b.fecha_vencimiento || 0));
    }, [form.empaque_id, lots]);

    // Auto-selección FEFO al cambiar ingredientes
    useEffect(() => {
        if (lotesGranelDisponibles.length > 0 && !form.granel_lote_id) {
            setForm(prev => ({ ...prev, granel_lote_id: lotesGranelDisponibles[0].id }));
        }
    }, [lotesGranelDisponibles, form.granel_lote_id]);

    useEffect(() => {
        if (lotesEmpaqueDisponibles.length > 0 && !form.empaque_lote_id) {
            setForm(prev => ({ ...prev, empaque_lote_id: lotesEmpaqueDisponibles[0].id }));
        }
    }, [lotesEmpaqueDisponibles, form.empaque_lote_id]);

    // Cálculo de merma en tiempo real
    const calculosMerma = useMemo(() => {
        const inputGramos = Number(form.cantidad_granel_consumida_g) || 0;
        const bolsaGramos = Number(form.formato_bolsa_g) || 0;
        const cantidadBolsas = Number(form.cantidad_bolsas_obtenidas) || 0;

        const outputGramos = bolsaGramos * cantidadBolsas;
        const mermaGramos = inputGramos - outputGramos;
        const mermaPct = inputGramos > 0 ? (mermaGramos / inputGramos) * 100 : 0;

        return { outputGramos, mermaGramos, mermaPct };
    }, [form.cantidad_granel_consumida_g, form.formato_bolsa_g, form.cantidad_bolsas_obtenidas]);

    const handleIngredientChange = (ingId) => {
        const ing = ingredients.find(i => i.id === ingId);
        const code = (ing?.codigo || 'RAW').split('-').pop();
        setForm(prev => ({ 
            ...prev, 
            insumo_granel_id: ingId, 
            granel_lote_id: '',
            lote_pt_generado: `L-FR-${code}-${Date.now().toString().slice(-4)}`
        }));
    };

    const handleStartProcessing = (task) => {
        setProcessingTask(task);
        setTab('nuevo');
        
        const matchingGranelL = lots.filter(l => ((l.ingredientId || l.ingrediente_id) === task.insumo_granel_id) && (Number(l.amount || l.cantidad_actual) > 0))
            .sort((a, b) => new Date(a.expiry || a.fecha_vencimiento || 0) - new Date(b.expiry || b.fecha_vencimiento || 0));
        const matchingEmpaqueL = lots.filter(l => ((l.ingredientId || l.empaque_id) === task.empaque_id) && (Number(l.amount || l.cantidad_actual) > 0))
            .sort((a, b) => new Date(a.expiry || a.fecha_vencimiento || 0) - new Date(b.expiry || b.fecha_vencimiento || 0));

        setForm({
            insumo_granel_id: task.insumo_granel_id,
            granel_lote_id: matchingGranelL.length > 0 ? matchingGranelL[0].id : '',
            empaque_id: task.empaque_id,
            empaque_lote_id: matchingEmpaqueL.length > 0 ? matchingEmpaqueL[0].id : '',
            cantidad_granel_consumida_g: task.cantidad_granel_consumida_g,
            formato_bolsa_g: task.formato_bolsa_g || 100,
            cantidad_bolsas_obtenidas: '',
            lote_pt_generado: task.lote_pt_generado || `L-FR-${(ingredients.find(i => i.id === task.insumo_granel_id)?.codigo || 'RAW').split('-').pop()}-${Date.now().toString().slice(-4)}`,
            merma_razon: 'Derrame de Carga'
        });
    };

    const handleSave = () => {
        if (!form.insumo_granel_id || !form.granel_lote_id || !form.empaque_id || !form.empaque_lote_id || !form.cantidad_granel_consumida_g || !form.cantidad_bolsas_obtenidas) {
            showToast("Complete todos los campos del fraccionamiento", "error");
            return;
        }

        if (calculosMerma.mermaGramos < 0) {
            showToast("La cantidad obtenida supera físicamente la carga de granel consumida", "error");
            return;
        }

        const granelLote = lots.find(l => l.id === form.granel_lote_id);
        const empaqueLote = lots.find(l => l.id === form.empaque_lote_id);
        
        if (!granelLote || !empaqueLote) {
            showToast("Los lotes seleccionados no son válidos.", "error");
            return;
        }

        const totalBags = Number(form.cantidad_bolsas_obtenidas);
        const formatBolsa = Number(form.formato_bolsa_g);
        const totalQtyG = totalBags * formatBolsa;

        // Costo del lote nuevo (granel + packaging)
        const rawCost = Number(form.cantidad_granel_consumida_g) * Number(granelLote.unitPrice || granelLote.costo_unitario || 0);
        const pkgCost = totalBags * Number(empaqueLote.unitPrice || empaqueLote.costo_unitario || 0);
        const totalCost = rawCost + pkgCost;
        const updatedUnitPrice = totalQtyG > 0 ? (totalCost / totalQtyG) : 0;

        const granelIng = ingredients.find(i => i.id === form.insumo_granel_id);

        const newLotInsumo = {
            ingrediente_id: form.insumo_granel_id,
            codigo_lote: form.lote_pt_generado.toUpperCase(),
            cantidad_original: totalQtyG,
            cantidad_actual: totalQtyG,
            costo_unitario: updatedUnitPrice,
            unidad: granelIng?.unidad_base || 'g',
            fecha_vencimiento: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            fecha_ingreso: new Date().toISOString()
        };

        const tarea = {
            id: processingTask ? processingTask.id : undefined,
            insumo_granel_id: form.insumo_granel_id,
            cantidad_granel_consumida_g: Number(form.cantidad_granel_consumida_g),
            empaque_id: form.empaque_id,
            formato_bolsa_g: formatBolsa,
            cantidad_bolsas_obtenidas: totalBags,
            lote_pt_generado: form.lote_pt_generado.toUpperCase(),
            estado: 'COMPLETADO',
            fecha_tarea: new Date().toISOString()
        };

        addFraccTarea(tarea, form.granel_lote_id, form.empaque_lote_id, newLotInsumo);
        setTab('tareas');
        
        // Auto-show label printing modal
        setPrintedLabel({
            title: `Fraccionado: ${granelIng?.name || 'Insumo'}`,
            sku: granelIng?.codigo || 'SKU-UNKNOWN',
            lote: form.lote_pt_generado.toUpperCase(),
            peso: `${formatBolsa} g`,
            ingreso: new Date().toLocaleDateString('es-AR'),
            vencimiento: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toLocaleDateString('es-AR'),
            status: 'COMPLETADO'
        });

        setProcessingTask(null);
        setForm({
            insumo_granel_id: '',
            granel_lote_id: '',
            empaque_id: '',
            empaque_lote_id: '',
            cantidad_granel_consumida_g: '',
            formato_bolsa_g: 100,
            cantidad_bolsas_obtenidas: '',
            lote_pt_generado: '',
            merma_razon: 'Derrame de Carga'
        });
    };

    const triggerPrint = (tarea) => {
        const granelIng = ingredients.find(i => i.id === tarea.insumo_granel_id);
        setPrintedLabel({
            title: `Fraccionado: ${granelIng?.name || 'Insumo'}`,
            sku: granelIng?.codigo || 'SKU-UNKNOWN',
            lote: tarea.lote_pt_generado,
            peso: `${tarea.formato_bolsa_g} g`,
            ingreso: new Date(tarea.fecha_tarea || Date.now()).toLocaleDateString('es-AR'),
            vencimiento: new Date(new Date(tarea.fecha_tarea || Date.now()).getTime() + 180 * 24 * 60 * 60 * 1000).toLocaleDateString('es-AR'),
            status: 'COMPLETADO'
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* TABS */}
            <div className="flex gap-3 border-b border-slate-200 pb-3 print:hidden">
                <button 
                    onClick={() => { setTab('tareas'); setProcessingTask(null); }} 
                    className={`px-5 py-1.5 rounded-md font-black uppercase text-[9px] transition-all ${tab === 'tareas' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    Tareas y Envasados ({pendingTasks.length} P / {completedTasks.length} C)
                </button>
                {!processingTask ? (
                    <button 
                        onClick={() => setTab('nuevo')} 
                        className={`px-5 py-1.5 rounded-md font-black uppercase text-[9px] transition-all ${tab === 'nuevo' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        Nueva Tarea Manual
                    </button>
                ) : (
                    <button className="px-5 py-1.5 rounded-md font-black uppercase text-[9px] bg-amber-500 text-white shadow-sm flex items-center gap-1.5">
                        <Scale size={12} /> Procesando Orden: {processingTask.lote_pt_generado}
                    </button>
                )}
            </div>

            {/* TAB: LISTADO DE TAREAS */}
            {tab === 'tareas' && (
                <div className="space-y-8 print:hidden">
                    {/* TAREAS PENDIENTES */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-800">
                            <ClipboardList size={18} className="text-slate-950" />
                            <h3 className="text-sm font-black uppercase tracking-wider italic">Órdenes Pendientes de Envasado ({pendingTasks.length})</h3>
                        </div>
                        {pendingTasks.length === 0 ? (
                            <Card className="p-8 text-center text-slate-400 italic text-xs bg-white border border-slate-200 shadow-sm rounded-2xl">
                                No hay órdenes de fraccionamiento pendientes en este momento.
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {pendingTasks.map(t => {
                                    const granelIng = ingredients.find(i => i.id === t.insumo_granel_id);
                                    const empaqueIng = ingredients.find(i => i.id === t.empaque_id);
                                    return (
                                        <Card key={t.id} className="p-5 border border-slate-200 border-l-4 border-l-amber-500 bg-white hover:shadow-md transition-all flex flex-col justify-between rounded-xl">
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-mono text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase">Pendiente</span>
                                                    <span className="text-[9px] text-slate-400 font-bold">{isMounted ? new Date(t.fecha_tarea || t.created_at || Date.now()).toLocaleDateString('es-AR') : '--'}</span>
                                                </div>
                                                <h4 className="text-sm font-black uppercase text-slate-800 truncate">{granelIng?.name || 'Insumo'}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Bolsa: {empaqueIng?.name || 'Bolsa'} ({t.formato_bolsa_g}g)</p>
                                                
                                                <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border text-[10px]">
                                                    <div>
                                                        <span className="text-slate-400 font-bold uppercase block">Cant. Objetivo</span>
                                                        <span className="font-mono font-black text-slate-800">{(t.cantidad_granel_consumida_g / 1000).toFixed(1)} Kg</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 font-bold uppercase block">Lote Generado</span>
                                                        <span className="font-mono font-black text-slate-800">{t.lote_pt_generado}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-4 pt-3 border-t flex justify-end">
                                                <Button onClick={() => handleStartProcessing(t)} variant="primary" className="py-1.5 px-4 text-[10px] font-black uppercase tracking-wider italic flex items-center gap-1.5 rounded-xl">
                                                    Procesar Envasado <ArrowRight size={10} />
                                                </Button>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* HISTORIAL DE COMPLETADOS */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-800">
                            <Package size={18} className="text-slate-950" />
                            <h3 className="text-sm font-black uppercase tracking-wider italic">Historial de Envasados ({completedTasks.length})</h3>
                        </div>
                        <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm rounded-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left font-bold text-xs uppercase text-slate-700">
                                    <thead className="bg-slate-900 text-white text-[9px] tracking-widest">
                                        <tr>
                                            <th className="px-4 py-3">Fecha / Lote Generado</th>
                                            <th className="px-4 py-3">Insumo Granel</th>
                                            <th className="px-4 py-3 text-center">Packaging</th>
                                            <th className="px-4 py-3 text-center">Unidades Envasadas</th>
                                            <th className="px-4 py-3 text-center">Rendimiento (Merma)</th>
                                            <th className="px-4 py-3 text-center w-24">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {completedTasks.map(t => {
                                            const granelIng = ingredients.find(i => i.id === t.insumo_granel_id);
                                            const empaqueIng = ingredients.find(i => i.id === t.empaque_id);
                                            
                                            const totalEsperado = t.cantidad_granel_consumida_g;
                                            const totalObtenido = t.formato_bolsa_g * t.cantidad_bolsas_obtenidas;
                                            const loss = totalEsperado - totalObtenido;
                                            const lossPct = totalEsperado > 0 ? (loss / totalEsperado) * 100 : 0;

                                            return (
                                                <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="px-4 py-3">
                                                        <span className="font-mono font-black text-blue-700">{t.lote_pt_generado}</span>
                                                        <p className="text-[8px] text-slate-400 font-bold mt-0.5">
                                                            {isMounted ? new Date(t.fecha_tarea || t.created_at || Date.now()).toLocaleDateString('es-AR') : '--'}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-slate-800 font-black">{granelIng?.name || 'Bulk'}</span>
                                                        <p className="text-[8px] text-slate-400 font-bold mt-0.5">Consumo: {(t.cantidad_granel_consumida_g / 1000).toFixed(2)} kg</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="text-slate-600">{empaqueIng?.name || 'Bolsa'}</span>
                                                        <p className="text-[8px] text-slate-400 mt-0.5">Format: {t.formato_bolsa_g} g</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-sm font-mono font-black text-slate-900">
                                                        {t.cantidad_bolsas_obtenidas} u
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-mono">
                                                        <span className={lossPct > 3 ? 'text-red-600 animate-pulse font-black' : 'text-emerald-600 font-bold'}>
                                                            {lossPct.toFixed(1)}%
                                                        </span>
                                                        <p className="text-[8px] text-slate-400 mt-0.5">({loss.toFixed(0)} g de merma)</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <Button onClick={() => triggerPrint(t)} variant="secondary" className="py-1 px-3 rounded-lg flex items-center gap-1 mx-auto text-[10px]">
                                                            <QrCode size={12} /> Etiqueta
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {completedTasks.length === 0 && (
                                            <tr><td colSpan="6" className="p-8 text-center text-slate-400 italic">No se han registrado tareas de fraccionamiento completadas.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* TAB: NUEVA TAREA / PROCESAR TAREA */}
            {tab === 'nuevo' && (
                <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
                    
                    {/* COLUMNA IZQUIERDA: FORMULARIO */}
                    <div className="lg:col-span-6">
                        <Card className="p-8 border border-slate-200 bg-white shadow-xl space-y-6 rounded-2xl">
                            <h4 className="text-xs font-black uppercase italic border-b pb-3 text-slate-800 flex items-center justify-between">
                                <span>{processingTask ? 'Completar Envasado Guiado' : 'Registro de Envasado Manual'}</span>
                                {processingTask && <span className="font-mono text-[9px] text-slate-400 font-bold">Ref: {processingTask.lote_pt_generado}</span>}
                            </h4>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest border-b pb-1">I. Insumo Bulk / Granel</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Select 
                                        label="Materia Prima a Fraccionar" 
                                        value={form.insumo_granel_id} 
                                        onChange={handleIngredientChange}
                                        disabled={!!processingTask}
                                    >
                                        <option value="" disabled>Seleccione materia prima...</option>
                                        {ingredients.filter(i => i.familia === 'Especias y Semillas' || i.tipo === 'insumo').map(i => (
                                            <option key={i.id} value={i.id}>{i.name} ({i.codigo})</option>
                                        ))}
                                    </Select>
                                    
                                    <Select 
                                        label="Lote de Insumo (FEFO Sugerido)" 
                                        value={form.granel_lote_id} 
                                        onChange={e => setForm({ ...form, granel_lote_id: e })}
                                    >
                                        <option value="" disabled>Seleccione lote...</option>
                                        {lotesGranelDisponibles.map((l, idx) => (
                                            <option key={l.id} value={l.id}>
                                                {l.codigo_lote} ({l.amount.toLocaleString()} g disp) {idx === 0 ? '★ FEFO' : ''}
                                            </option>
                                        ))}
                                        {lotesGranelDisponibles.length === 0 && <option value="" disabled>Sin stock disponible</option>}
                                    </Select>
                                </div>
                                <Input 
                                    label="Cantidad Cargada de Granel (gramos)" 
                                    type="number" 
                                    placeholder="ej. 10000"
                                    value={form.cantidad_granel_consumida_g} 
                                    onChange={v => setForm({ ...form, cantidad_granel_consumida_g: Number(v) })} 
                                    required 
                                    disabled={!!processingTask}
                                />
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest border-b pb-1">II. Envases y Packaging</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Select 
                                        label="Material de Envasado (Bolsas)" 
                                        value={form.empaque_id} 
                                        onChange={e => setForm({ ...form, empaque_id: e, empaque_lote_id: '' })}
                                        disabled={!!processingTask}
                                    >
                                        <option value="" disabled>Seleccione bolsa/empaque...</option>
                                        {ingredients.filter(i => i.tipo === 'empaque').map(i => (
                                            <option key={i.id} value={i.id}>{i.name}</option>
                                        ))}
                                    </Select>
                                    
                                    <Select 
                                        label="Lote de Empaque (FEFO Sugerido)" 
                                        value={form.empaque_lote_id} 
                                        onChange={e => setForm({ ...form, empaque_lote_id: e })}
                                    >
                                        <option value="" disabled>Seleccione lote...</option>
                                        {lotesEmpaqueDisponibles.map((l, idx) => (
                                            <option key={l.id} value={l.id}>
                                                {l.codigo_lote} ({l.amount} u disp) {idx === 0 ? '★ FEFO' : ''}
                                            </option>
                                        ))}
                                        {lotesEmpaqueDisponibles.length === 0 && <option value="" disabled>Sin stock disponible</option>}
                                    </Select>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input 
                                        label="Formato de Bolsa (gramos/bolsa)" 
                                        type="number" 
                                        placeholder="ej. 100"
                                        value={form.formato_bolsa_g} 
                                        onChange={v => setForm({ ...form, formato_bolsa_g: Number(v) })} 
                                        required 
                                        disabled={!!processingTask}
                                    />
                                    <Input 
                                        label="Cantidad de Bolsas Obtenidas" 
                                        type="number" 
                                        placeholder="ej. 98"
                                        value={form.cantidad_bolsas_obtenidas} 
                                        onChange={v => setForm({ ...form, cantidad_bolsas_obtenidas: Number(v) })} 
                                        required 
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-900 p-5 text-white rounded-xl flex justify-between items-center">
                                <div>
                                    <p className="text-[9px] uppercase opacity-50 font-black tracking-widest mb-0.5">Lote Terminado a Generar</p>
                                    <p className="text-sm font-mono font-black text-emerald-400">{form.lote_pt_generado || 'L-FR-XXXX'}</p>
                                </div>
                                <div className="flex gap-2">
                                    {processingTask && (
                                        <Button 
                                            onClick={() => { setTab('tareas'); setProcessingTask(null); }} 
                                            variant="secondary" 
                                            className="py-2.5 px-4 text-xs font-black uppercase text-slate-300 border-slate-700 hover:bg-slate-800"
                                        >
                                            Cancelar
                                        </Button>
                                    )}
                                    <Button onClick={handleSave} variant="success" className="py-2.5 px-6 text-xs font-black uppercase rounded-xl">
                                        Cerrar y Descontar Stock
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* COLUMNA DERECHA: INDICADORES Y MERMA */}
                    <div className="lg:col-span-4 space-y-4">
                        <Card className="p-6 border border-slate-200 bg-white shadow-sm rounded-2xl">
                            <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b pb-2 mb-4">
                                Auditoría de Rendimiento
                            </h4>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs font-bold">
                                    <span className="text-slate-500">Masa de Carga (Granel)</span>
                                    <span className="font-mono text-slate-850">
                                        {Number(form.cantidad_granel_consumida_g || 0).toLocaleString()} g
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs font-bold">
                                    <span className="text-slate-500">Masa Obtenida (Empacada)</span>
                                    <span className="font-mono text-slate-850">
                                        {calculosMerma.outputGramos.toLocaleString()} g
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs font-bold">
                                    <span className="text-slate-500">Pérdida en Pesaje / Merma</span>
                                    <span className={`font-mono ${calculosMerma.mermaGramos > 0 ? 'text-red-500' : 'text-slate-800'}`}>
                                        {calculosMerma.mermaGramos.toLocaleString()} g
                                    </span>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-xl border flex items-center justify-between">
                                    <div>
                                        <p className="text-[8px] text-slate-400 font-black uppercase">Porcentaje de Merma</p>
                                        <p className={`text-3xl font-black font-mono mt-1 ${calculosMerma.mermaPct > 3.0 ? 'text-red-600 animate-pulse' : 'text-emerald-600'}`}>
                                            {calculosMerma.mermaPct.toFixed(1)}%
                                        </p>
                                    </div>
                                    <Scale size={32} className="text-slate-300" />
                                </div>

                                {calculosMerma.mermaPct > 0.01 && (
                                    <div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-3">
                                        <div className="flex items-center gap-2 text-red-800 font-black text-[10px] uppercase">
                                            <AlertTriangle size={14} className="text-red-600" />
                                            <span>Razón de Merma Obligatoria</span>
                                        </div>
                                        <Select value={form.merma_razon} onChange={e => setForm({ ...form, merma_razon: e })}>
                                            <option value="Derrame de Carga">Derrame de Carga</option>
                                            <option value="Packaging Defectuoso">Bolsa / Sello Defectuoso</option>
                                            <option value="Descarte por Calidad">Insumo Contaminado / Descarte</option>
                                            <option value="Ajuste de Balanza">Desviación de Balanza</option>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>

                </div>
            )}

            <PrintPreviewModal
                isOpen={!!printedLabel}
                onClose={() => setPrintedLabel(null)}
                type="label"
                data={printedLabel}
                theme={theme}
            />
        </div>
    );
}
