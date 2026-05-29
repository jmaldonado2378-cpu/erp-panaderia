'use client';
import React, { useState } from 'react';
import { 
    ThermometerSun, Plus, Scale, Calendar, User, ClipboardList, 
    Droplet, ShieldAlert, Award, FileText, CheckCircle2, QrCode, Play
} from 'lucide-react';
import { Card, Button, Input, Select } from '../bakery_erp';

export default function CharcuteriaView({ 
    charcRecetas, addCharcReceta, 
    charcLotes, addCharcLote, 
    charcLogs, addCharcLog, 
    updateCharcLoteEstado,
    ingredients, showToast 
}) {
    const [tab, setTab] = useState('lotes'); // lotes, recetas, medicion
    const [showAddReceta, setShowAddReceta] = useState(false);
    const [showAddLote, setShowAddLote] = useState(false);
    
    // Formulario de Receta
    const [recetaForm, setRecetaForm] = useState({
        codigo: '',
        nombre: '',
        lead_time_dias: 45,
        merma_secado_objetivo: 35,
        details: [{ ingredientId: '', gramos: '' }]
    });

    // Formulario de Lote
    const [loteForm, setLoteForm] = useState({
        receta_id: '',
        codigo_lote: '',
        peso_inicial_g: '',
        fecha_vencimiento: ''
    });

    // Formulario de Medición
    const [activeLoteForLog, setActiveLoteForLog] = useState(null);
    const [logForm, setLogForm] = useState({
        peso_real_g: '',
        temperatura_c: '',
        humedad_pct: '',
        operario: 'Juan Pérez',
        observaciones: ''
    });

    // Estado para mostrar etiqueta generada para imprimir
    const [printedLabel, setPrintedLabel] = useState(null);

    const handleSaveReceta = () => {
        if (!recetaForm.codigo || !recetaForm.nombre) {
            showToast("Código y nombre son requeridos", "error");
            return;
        }
        const receta = {
            codigo: recetaForm.codigo.toUpperCase(),
            nombre: recetaForm.nombre,
            lead_time_dias: Number(recetaForm.lead_time_dias),
            merma_secado_objetivo: Number(recetaForm.merma_secado_objetivo),
            version: 1
        };
        const details = recetaForm.details.filter(d => d.ingredientId && d.gramos);
        addCharcReceta(receta, details);
        setShowAddReceta(false);
        setRecetaForm({ codigo: '', nombre: '', lead_time_dias: 45, merma_secado_objetivo: 35, details: [{ ingredientId: '', gramos: '' }] });
    };

    const handleSaveLote = () => {
        if (!loteForm.receta_id || !loteForm.codigo_lote || !loteForm.peso_inicial_g) {
            showToast("Complete todos los campos del lote", "error");
            return;
        }
        const selectedRec = charcRecetas.find(r => r.id === loteForm.receta_id);
        const vencimiento = loteForm.fecha_vencimiento || new Date(Date.now() + selectedRec.lead_time_dias * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const lote = {
            receta_id: loteForm.receta_id,
            codigo_lote: loteForm.codigo_lote.toUpperCase(),
            peso_inicial_g: Number(loteForm.peso_inicial_g),
            peso_actual_g: Number(loteForm.peso_inicial_g),
            estado: 'EN_SECADO',
            fecha_ingreso: new Date().toISOString(),
            fecha_vencimiento: vencimiento
        };
        addCharcLote(lote);
        setShowAddLote(false);
        setLoteForm({ receta_id: '', codigo_lote: '', peso_inicial_g: '', fecha_vencimiento: '' });
    };

    const handleSaveLog = () => {
        if (!logForm.peso_real_g || !logForm.temperatura_c || !logForm.humedad_pct) {
            showToast("Complete los datos de la medición", "error");
            return;
        }
        const log = {
            lote_id: activeLoteForLog.id,
            peso_real_g: Number(logForm.peso_real_g),
            temperatura_c: Number(logForm.temperatura_c),
            humedad_pct: Number(logForm.humedad_pct),
            operario: logForm.operario,
            observaciones: logForm.observaciones
        };
        addCharcLog(log);
        setActiveLoteForLog(null);
        setLogForm({ peso_real_g: '', temperatura_c: '', humedad_pct: '', operario: 'Juan Pérez', observaciones: '' });
    };

    const triggerPrint = (lote, receta) => {
        setPrintedLabel({
            title: receta?.nombre || 'Producto Charcutería',
            sku: receta?.codigo || 'SKU-UNKNOWN',
            lote: lote.codigo_lote,
            peso: `${lote.peso_actual_g.toLocaleString()} g`,
            ingreso: new Date(lote.fecha_ingreso || Date.now()).toLocaleDateString('es-AR'),
            vencimiento: new Date(lote.fecha_vencimiento).toLocaleDateString('es-AR'),
            status: lote.estado
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* TABS DE SECCIÓN */}
            <div className="flex gap-3 border-b border-slate-200 pb-3 print:hidden">
                <button onClick={() => setTab('lotes')} className={`px-5 py-1.5 rounded-md font-black uppercase text-[9px] transition-all ${tab === 'lotes' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                    Cámaras de Maduración ({charcLotes.length})
                </button>
                <button onClick={() => setTab('recetas')} className={`px-5 py-1.5 rounded-md font-black uppercase text-[9px] transition-all ${tab === 'recetas' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                    Fichas Técnicas ({charcRecetas.length})
                </button>
            </div>

            {/* TAB: CÁMARAS / LOTES */}
            {tab === 'lotes' && !activeLoteForLog && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center mb-4 print:hidden">
                        <div>
                            <h4 className="text-base font-black uppercase italic text-slate-800">Monitoreo de Secado Artesanal</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Humedad Sugerida: 70-75% | Temp Sugerida: 12-15°C</p>
                        </div>
                        <Button onClick={() => setShowAddLote(!showAddLote)} variant={showAddLote ? "secondary" : "accent"}>
                            {showAddLote ? "Cancelar" : <><Plus size={14} /> Colgar Lote en Cámara</>}
                        </Button>
                    </div>

                    {showAddLote && (
                        <Card className="p-6 border border-slate-200 bg-white mb-6 animate-in slide-in-from-top-4">
                            <h4 className="text-xs font-black uppercase mb-4 italic">Ingresar Piezas a Maduración</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <Select label="Ficha Técnica (Receta)" value={loteForm.receta_id} onChange={v => setLoteForm({ ...loteForm, receta_id: v })}>
                                    <option value="" disabled>Seleccione receta...</option>
                                    {charcRecetas.map(r => <option key={r.id} value={r.id}>{r.nombre} ({r.codigo})</option>)}
                                </Select>
                                <Input label="Código del Lote (Ej. BND-2026-05)" value={loteForm.codigo_lote} onChange={v => setLoteForm({ ...loteForm, codigo_lote: v })} required />
                                <Input label="Peso Inicial Crudo (gramos)" type="number" value={loteForm.peso_inicial_g} onChange={v => setLoteForm({ ...loteForm, peso_inicial_g: v })} required />
                                <Input label="Vencimiento Estimado (Opcional)" type="date" value={loteForm.fecha_vencimiento} onChange={v => setLoteForm({ ...loteForm, fecha_vencimiento: v })} />
                            </div>
                            <div className="flex justify-end mt-4"><Button onClick={handleSaveLote} variant="success" className="py-2 px-6">Lanzar Curing</Button></div>
                        </Card>
                    )}

                    {/* LOTES ACTIVOS EN CÁMARA */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
                        {charcLotes.map(l => {
                            const rec = charcRecetas.find(r => r.id === l.receta_id);
                            const mermaReal = ((1 - l.peso_actual_g / l.peso_inicial_g) * 100);
                            const percentToGoal = rec ? (mermaReal / rec.merma_secado_objetivo) * 100 : 0;
                            const isCured = rec && mermaReal >= rec.merma_secado_objetivo;
                            const logs = charcLogs.filter(lg => lg.lote_id === l.id);
                            const lastLog = logs[0] || null;

                            return (
                                <Card key={l.id} className={`border-2 transition-all hover:shadow-lg ${isCured && l.estado === 'EN_SECADO' ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200'}`}>
                                    <div className="p-5 border-b flex justify-between items-start bg-slate-900 text-white rounded-t-xl">
                                        <div>
                                            <h5 className="font-black text-sm uppercase italic tracking-tight">{rec?.nombre || 'Charcutería'}</h5>
                                            <div className="flex gap-2 items-center mt-1">
                                                <span className="text-[9px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">{l.codigo_lote}</span>
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                                                    l.estado === 'CURADO_LISTO' ? 'bg-emerald-600 text-white' : 
                                                    l.estado === 'RECHAZADO' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                                                }`}>{l.estado}</span>
                                            </div>
                                        </div>
                                        <div className="bg-slate-800 p-2 rounded-lg"><ThermometerSun size={18} className="text-amber-500" /></div>
                                    </div>
                                    <div className="p-5 space-y-4">
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <p className="text-slate-400 font-bold uppercase text-[8px]">Masa Inicial</p>
                                                <p className="font-mono font-black text-slate-700">{l.peso_inicial_g.toLocaleString()} g</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 font-bold uppercase text-[8px]">Masa Actual</p>
                                                <p className="font-mono font-black text-slate-800">{l.peso_actual_g.toLocaleString()} g</p>
                                            </div>
                                        </div>

                                        {/* BARRA DE PROGRESO DE MERMA DE SECADO */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-end text-[9px] font-black uppercase text-slate-500">
                                                <span>Deshidratación (Merma)</span>
                                                <span className={isCured ? 'text-emerald-600 font-black' : 'text-slate-700 font-mono'}>
                                                    {mermaReal.toFixed(1)}% / {rec?.merma_secado_objetivo}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden border">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-500 ${isCured ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'}`} 
                                                    style={{ width: `${Math.min(100, percentToGoal)}%` }}
                                                />
                                            </div>
                                            {isCured && l.estado === 'EN_SECADO' && (
                                                <p className="text-[8px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-1 rounded font-bold uppercase text-center flex items-center justify-center gap-1">
                                                    <Award size={10} /> ¡Llegó al rendimiento objetivo de deshidratación!
                                                </p>
                                            )}
                                        </div>

                                        {/* CLIMA DE CÁMARA (ÚLTIMO REGISTRO MANUAL) */}
                                        <div className="bg-slate-50 p-3 rounded-lg border text-[10px] space-y-1">
                                            <p className="font-black text-slate-500 uppercase text-[8px] border-b pb-1 mb-1">Última Inspección Manual</p>
                                            {lastLog ? (
                                                <div className="grid grid-cols-3 gap-1">
                                                    <div className="flex items-center gap-1"><Scale size={10} className="text-slate-400" /> <b>{lastLog.peso_real_g.toLocaleString()}g</b></div>
                                                    <div className="flex items-center gap-1"><ThermometerSun size={10} className="text-amber-500" /> <b>{lastLog.temperatura_c}°C</b></div>
                                                    <div className="flex items-center gap-1"><Droplet size={10} className="text-blue-500" /> <b>{lastLog.humedad_pct}%</b></div>
                                                </div>
                                            ) : (
                                                <p className="text-slate-400 italic text-center">Sin mediciones aún</p>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            {l.estado === 'EN_SECADO' && (
                                                <Button onClick={() => setActiveLoteForLog(l)} className="flex-1 py-1 text-[10px]" variant="secondary">
                                                    Registrar Control
                                                </Button>
                                            )}
                                            {isCured && l.estado === 'EN_SECADO' && (
                                                <Button onClick={() => updateCharcLoteEstado(l.id, 'CURADO_LISTO')} className="flex-1 py-1 text-[10px]" variant="success">
                                                    Liberar Lote
                                                </Button>
                                            )}
                                            <Button onClick={() => triggerPrint(l, rec)} className="py-1 px-3" variant="ghost">
                                                <QrCode size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB LOG DE MEDICIONES (REGISTRO MANUAL) */}
            {activeLoteForLog && (
                <div className="max-w-xl mx-auto py-4">
                    <Card className="p-8 border border-slate-200 bg-white shadow-xl">
                        <h4 className="text-base font-black uppercase mb-1 italic text-slate-800">Planilla de Control Manual</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest border-b pb-4 mb-6">
                            Lote: {activeLoteForLog.codigo_lote} | Peso inicial: {activeLoteForLog.peso_inicial_g}g
                        </p>
                        
                        <div className="space-y-4">
                            <Input 
                                label="Peso Real Actual (gramos)" 
                                type="number" 
                                placeholder="Pese la pieza en la balanza"
                                value={logForm.peso_real_g} 
                                onChange={v => setLogForm({ ...logForm, peso_real_g: v })} 
                                required 
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input 
                                    label="Temperatura Cámara (°C)" 
                                    type="number" 
                                    step="0.1" 
                                    placeholder="Lectura termómetro"
                                    value={logForm.temperatura_c} 
                                    onChange={v => setLogForm({ ...logForm, temperatura_c: v })} 
                                    required 
                                />
                                <Input 
                                    label="Humedad Relativa (%)" 
                                    type="number" 
                                    placeholder="Lectura higrómetro"
                                    value={logForm.humedad_pct} 
                                    onChange={v => setLogForm({ ...logForm, humedad_pct: v })} 
                                    required 
                                />
                            </div>
                            <Input 
                                label="Operario Inspector" 
                                value={logForm.operario} 
                                onChange={v => setLogForm({ ...logForm, operario: v })} 
                            />
                            <div className="flex flex-col gap-1 w-full text-left">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observaciones</label>
                                <textarea 
                                    className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none text-sm font-semibold text-slate-800" 
                                    rows="2"
                                    value={logForm.observaciones}
                                    onChange={e => setLogForm({ ...logForm, observaciones: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end mt-6 pt-4 border-t">
                            <Button onClick={() => setActiveLoteForLog(null)} variant="secondary">Volver</Button>
                            <Button onClick={handleSaveLog} variant="success">Guardar Medición</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB: FICHAS TÉCNICAS (RECETAS) */}
            {tab === 'recetas' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h4 className="text-base font-black uppercase italic text-slate-800">Recetas de Curado y Embutido</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Fichas técnicas con deshidratación y tiempos programados.</p>
                        </div>
                        <Button onClick={() => setShowAddReceta(!showAddReceta)} variant={showAddReceta ? "secondary" : "accent"}>
                            {showAddReceta ? "Cancelar" : <><Plus size={14} /> Nueva Ficha Charcutería</>}
                        </Button>
                    </div>

                    {showAddReceta && (
                        <Card className="p-6 border border-slate-200 bg-white shadow-sm mb-6">
                            <h4 className="text-xs font-black uppercase mb-4 italic">Alta Ficha de Charcutería</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4">
                                <Input label="Código Ficha (Ej. CH-SLM-01)" value={recetaForm.codigo} onChange={v => setRecetaForm({ ...recetaForm, codigo: v })} required />
                                <Input label="Nombre del Chacinado" placeholder="Ej. Salame Milán" value={recetaForm.nombre} onChange={v => setRecetaForm({ ...recetaForm, nombre: v })} required />
                                <Input label="Lead Time de Maduración (Días)" type="number" value={recetaForm.lead_time_dias} onChange={v => setRecetaForm({ ...recetaForm, lead_time_dias: v })} required />
                                <Input label="Merma Secado Objetivo (%)" type="number" value={recetaForm.merma_secado_objetivo} onChange={v => setRecetaForm({ ...recetaForm, merma_secado_objetivo: v })} required />
                            </div>

                            {/* Detalle de ingredientes de la receta */}
                            <div className="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3">Ingredientes de la Mezcla</p>
                                <div className="space-y-2">
                                    {recetaForm.details.map((d, i) => (
                                        <div key={i} className="flex gap-4 items-center">
                                            <div className="flex-1">
                                                <Select value={d.ingredientId} onChange={v => {
                                                    const nd = [...recetaForm.details];
                                                    nd[i].ingredientId = v;
                                                    setRecetaForm({ ...recetaForm, details: nd });
                                                }}>
                                                    <option value="" disabled>Seleccione ingrediente...</option>
                                                    {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                                                </Select>
                                            </div>
                                            <div className="w-48">
                                                <Input label="Gramos" type="number" placeholder="ej. 8000" value={d.gramos} onChange={v => {
                                                    const nd = [...recetaForm.details];
                                                    nd[i].gramos = v;
                                                    setRecetaForm({ ...recetaForm, details: nd });
                                                }} />
                                            </div>
                                            <button 
                                                className="text-red-500 font-bold text-xs hover:bg-red-100 p-2 mt-4 rounded-lg"
                                                onClick={() => {
                                                    const nd = [...recetaForm.details];
                                                    nd.splice(i, 1);
                                                    setRecetaForm({ ...recetaForm, details: nd });
                                                }}
                                            >
                                                Borrar
                                            </button>
                                        </div>
                                    ))}
                                    <Button 
                                        onClick={() => setRecetaForm({ ...recetaForm, details: [...recetaForm.details, { ingredientId: '', gramos: '' }] })}
                                        variant="secondary"
                                        className="w-full mt-2"
                                    >
                                        + Agregar Insumo a la Mezcla
                                    </Button>
                                </div>
                            </div>

                            <div className="flex justify-end mt-4 pt-4 border-t">
                                <Button onClick={handleSaveReceta} variant="success" className="py-2 px-6">Guardar Ficha</Button>
                            </div>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {charcRecetas.map(r => (
                            <Card key={r.id} className="p-6 border bg-white shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h5 className="font-black text-sm uppercase italic text-slate-800 leading-none">{r.nombre}</h5>
                                            <span className="text-[8px] font-mono text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded inline-block mt-2">{r.codigo}</span>
                                        </div>
                                        <div className="bg-slate-100 p-2.5 rounded-xl"><FileText size={20} className="text-slate-500" /></div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                                        <div>
                                            <p className="text-[8px] text-slate-400 font-black uppercase">Lead Time Secado</p>
                                            <p className="font-mono font-black text-slate-800">{r.lead_time_dias} días</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] text-slate-400 font-black uppercase">Merma Objetivo</p>
                                            <p className="font-mono font-black text-emerald-600">{r.merma_secado_objetivo}%</p>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-[8px] text-slate-400 font-black uppercase">Detalle BOM de la Ficha:</p>
                                        <div className="divide-y divide-slate-100 text-[10px]">
                                            {r.details?.map((d, i) => {
                                                const ing = ingredients.find(ing => ing.id === d.ingredientId);
                                                return (
                                                    <div key={i} className="py-1 flex justify-between text-slate-700">
                                                        <span>{ing?.name || 'Insumo'}</span>
                                                        <span className="font-mono font-bold text-slate-900">{d.gramos} g</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* VISTA DE ETIQUETA IMPRIMIBLE (MODAL FLOTANTE) */}
            {printedLabel && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 print:p-0 print:static print:bg-white print:z-auto">
                    <div className="bg-white border-[12px] border-slate-900 rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl print:border-none print:shadow-none print:rounded-none print:p-0">
                        <div className="border-b-[6px] border-slate-900 pb-4 mb-6">
                            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">{printedLabel.title}</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">PRODUCTO CERTIFICADO ARTESANAL</p>
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
                                <span className="text-slate-400 font-bold uppercase">Elaborado:</span>
                                <span className="font-mono font-black text-slate-800">{printedLabel.ingreso}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-bold uppercase">Vencimiento:</span>
                                <span className="font-mono font-black text-red-600">{printedLabel.vencimiento}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center gap-3">
                            {/* CÓDIGO QR SIMULADO */}
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
