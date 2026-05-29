'use client';
import React, { useState, useMemo } from 'react';
import { 
    Scale, Plus, Package, Calendar, User, ClipboardList, 
    AlertTriangle, CheckCircle2, QrCode, ArrowRight, RefreshCw
} from 'lucide-react';
import { Card, Button, Input, Select } from '../bakery_erp';

export default function FraccionamientoView({ 
    fraccTareas, addFraccTarea,
    ingredients, lots, showToast 
}) {
    const [tab, setTab] = useState('tareas'); // tareas, nuevo
    const [printedLabel, setPrintedLabel] = useState(null);

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

    // Lotes filtrados según ingrediente de granel seleccionado
    const lotesGranelDisponibles = useMemo(() => {
        if (!form.insumo_granel_id) return [];
        return lots.filter(l => l.ingredientId === form.insumo_granel_id && l.amount > 0);
    }, [form.insumo_granel_id, lots]);

    // Lotes filtrados según empaque seleccionado
    const lotesEmpaqueDisponibles = useMemo(() => {
        if (!form.empaque_id) return [];
        return lots.filter(l => l.ingredientId === form.empaque_id && l.amount > 0);
    }, [form.empaque_id, lots]);

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
        setForm(prev => ({ 
            ...prev, 
            insumo_granel_id: ingId, 
            granel_lote_id: '',
            lote_pt_generado: `L-FR-${(ingredients.find(i => i.id === ingId)?.codigo || 'RAW').split('-').pop()}-${Date.now().toString().slice(-4)}`
        }));
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

        const tarea = {
            insumo_granel_id: form.insumo_granel_id,
            cantidad_granel_consumida_g: Number(form.cantidad_granel_consumida_g),
            empaque_id: form.empaque_id,
            formato_bolsa_g: Number(form.formato_bolsa_g),
            cantidad_bolsas_obtenidas: Number(form.cantidad_bolsas_obtenidas),
            lote_pt_generado: form.lote_pt_generado.toUpperCase(),
            estado: 'COMPLETADO',
            fecha_tarea: new Date().toISOString()
        };

        addFraccTarea(tarea);
        setTab('tareas');
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
            vencimiento: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toLocaleDateString('es-AR'),
            status: 'COMPLETADO'
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* TABS */}
            <div className="flex gap-3 border-b border-slate-200 pb-3 print:hidden">
                <button onClick={() => setTab('tareas')} className={`px-5 py-1.5 rounded-md font-black uppercase text-[9px] transition-all ${tab === 'tareas' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                    Listado de Fraccionamientos ({fraccTareas.length})
                </button>
                <button onClick={() => setTab('nuevo')} className={`px-5 py-1.5 rounded-md font-black uppercase text-[9px] transition-all ${tab === 'nuevo' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                    Nueva Tarea de Fraccionamiento
                </button>
            </div>

            {/* TAB: LISTADO DE TAREAS */}
            {tab === 'tareas' && (
                <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm print:hidden">
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
                                {fraccTareas.map(t => {
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
                                                    {new Date(t.fecha_tarea || t.created_at || Date.now()).toLocaleDateString('es-AR')}
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
                                                <Button onClick={() => triggerPrint(t)} variant="secondary" className="py-1 px-3">
                                                    <QrCode size={12} /> Etiqueta
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {fraccTareas.length === 0 && (
                                    <tr><td colSpan="6" className="p-8 text-center text-slate-400 italic">No se han registrado tareas de fraccionamiento.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* TAB: NUEVA TAREA */}
            {tab === 'nuevo' && (
                <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
                    
                    {/* COLUMNA IZQUIERDA: FORMULARIO */}
                    <div className="lg:col-span-6">
                        <Card className="p-8 border border-slate-200 bg-white shadow-xl space-y-6">
                            <h4 className="text-xs font-black uppercase italic border-b pb-3 text-slate-800">
                                Registro de Envasado y Porcionamiento
                            </h4>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest border-b pb-1">I. Insumo Bulk / Granel</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Select label="Materia Prima a Fraccionar" value={form.insumo_granel_id} onChange={handleIngredientChange}>
                                        <option value="" disabled>Seleccione materia prima...</option>
                                        {ingredients.filter(i => i.familia === 'Especias y Semillas' || i.tipo === 'insumo').map(i => (
                                            <option key={i.id} value={i.id}>{i.name} ({i.codigo})</option>
                                        ))}
                                    </Select>
                                    
                                    <Select label="Lote de Insumo (FEFO)" value={form.granel_lote_id} onChange={v => setForm({ ...form, granel_lote_id: v })}>
                                        <option value="" disabled>Seleccione lote...</option>
                                        {lotesGranelDisponibles.map(l => (
                                            <option key={l.id} value={l.id}>{l.codigo_lote} ({l.amount.toLocaleString()} g disponibles)</option>
                                        ))}
                                    </Select>
                                </div>
                                <Input 
                                    label="Cantidad Cargada de Granel (gramos)" 
                                    type="number" 
                                    placeholder="ej. 10000"
                                    value={form.cantidad_granel_consumida_g} 
                                    onChange={v => setForm({ ...form, cantidad_granel_consumida_g: v })} 
                                    required 
                                />
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest border-b pb-1">II. Envases y Packaging</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Select label="Material de Envasado (Bolsas)" value={form.empaque_id} onChange={v => setForm({ ...form, empaque_id: v, empaque_lote_id: '' })}>
                                        <option value="" disabled>Seleccione bolsa/empaque...</option>
                                        {ingredients.filter(i => i.tipo === 'empaque').map(i => (
                                            <option key={i.id} value={i.id}>{i.name}</option>
                                        ))}
                                    </Select>
                                    
                                    <Select label="Lote de Empaque" value={form.empaque_lote_id} onChange={v => setForm({ ...form, empaque_lote_id: v })}>
                                        <option value="" disabled>Seleccione lote...</option>
                                        {lotesEmpaqueDisponibles.map(l => (
                                            <option key={l.id} value={l.id}>{l.codigo_lote} ({l.amount} unidades disponibles)</option>
                                        ))}
                                    </Select>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input 
                                        label="Formato de Bolsa (gramos/bolsa)" 
                                        type="number" 
                                        placeholder="ej. 100"
                                        value={form.formato_bolsa_g} 
                                        onChange={v => setForm({ ...form, formato_bolsa_g: v })} 
                                        required 
                                    />
                                    <Input 
                                        label="Cantidad de Bolsas Llenadas" 
                                        type="number" 
                                        placeholder="ej. 98"
                                        value={form.cantidad_bolsas_obtenidas} 
                                        onChange={v => setForm({ ...form, cantidad_bolsas_obtenidas: v })} 
                                        required 
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-900 p-4 text-white rounded-xl flex justify-between items-center">
                                <div>
                                    <p className="text-[9px] uppercase opacity-50 font-black tracking-widest mb-0.5">Lote Terminado a Generar</p>
                                    <p className="text-sm font-mono font-black text-emerald-400">{form.lote_pt_generado || 'L-FR-XXXX'}</p>
                                </div>
                                <Button onClick={handleSave} variant="success" className="py-2.5 px-6">
                                    Cerrar y Descontar Stock
                                </Button>
                            </div>
                        </Card>
                    </div>

                    {/* COLUMNA DERECHA: INDICADORES Y MERMA */}
                    <div className="lg:col-span-4 space-y-4">
                        <Card className="p-6 border-2 border-slate-200 bg-white shadow-sm">
                            <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b pb-2 mb-4">
                                Auditoría de Rendimiento
                            </h4>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                                    <span className="text-slate-500 font-bold">Masa de Carga (Granel)</span>
                                    <span className="font-mono font-black text-slate-800">
                                        {Number(form.cantidad_granel_consumida_g || 0).toLocaleString()} g
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                                    <span className="text-slate-500 font-bold">Masa Obtenida (Empacada)</span>
                                    <span className="font-mono font-black text-slate-800">
                                        {calculosMerma.outputGramos.toLocaleString()} g
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                                    <span className="text-slate-500 font-bold">Pérdida en Pesaje / Merma</span>
                                    <span className={`font-mono font-black ${calculosMerma.mermaGramos > 0 ? 'text-red-500' : 'text-slate-800'}`}>
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
                                        <Select value={form.merma_razon} onChange={v => setForm({ ...form, merma_razon: v })}>
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

            {/* VISTA DE ETIQUETA IMPRIMIBLE (MODAL FLOTANTE) */}
            {printedLabel && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 print:p-0 print:static print:bg-white print:z-auto">
                    <div className="bg-white border-[12px] border-slate-900 rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl print:border-none print:shadow-none print:rounded-none print:p-0">
                        <div className="border-b-[6px] border-slate-900 pb-4 mb-6">
                            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">{printedLabel.title}</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">PRODUCTO FRACCIONADO EN ORIGEN</p>
                        </div>

                        <div className="space-y-3 text-left border-b border-dashed pb-6 mb-6">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-bold uppercase">SKU:</span>
                                <span className="font-mono font-black text-slate-800">{printedLabel.sku}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-bold uppercase">Lote:</span>
                                <span className="font-mono font-black text-blue-700">{printedLabel.lote}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-bold uppercase">Peso Neto:</span>
                                <span className="font-mono font-black text-slate-900">{printedLabel.peso}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-bold uppercase">Envasado:</span>
                                <span className="font-mono font-black text-slate-800">{printedLabel.ingreso}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-bold uppercase">Vencimiento:</span>
                                <span className="font-mono font-black text-red-600">{printedLabel.vencimiento}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center gap-3">
                            <div className="border border-slate-200 p-3 rounded-2xl bg-slate-50 flex items-center justify-center">
                                <QrCode size={120} className="text-slate-800" />
                            </div>
                            <p className="text-[8px] font-mono text-slate-400 uppercase">Escanear para trazabilidad FEFO</p>
                        </div>

                        <div className="flex gap-3 justify-end mt-8 pt-4 border-t print:hidden">
                            <Button onClick={() => window.print()} variant="success">Imprimir</Button>
                            <Button onClick={() => setPrintedLabel(null)} variant="secondary">Cerrar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
