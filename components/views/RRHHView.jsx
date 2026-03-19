import React, { useState, useEffect } from 'react';
import { UserCircle, Calendar, Users, Plus, Wrench, Clock } from 'lucide-react';
import { Card, Button, Input, Select } from '../bakery_erp';

export default function RRHHView({ operatives, setOperatives, config, showToast }) {
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ id: null, nombre: '', puesto: '', descanso: 'Domingo', inicio: '08:00', fin: '17:00' });

    const saveOperative = () => {
        if (!form.nombre || !form.puesto || !form.inicio || !form.fin) return;
        if (form.id) {
            setOperatives(operatives.map(o => o.id === form.id ? form : o));
            showToast("Ficha de operario actualizada.");
        } else {
            setOperatives([{ ...form, id: `op${Date.now()}` }, ...operatives]);
            showToast("Nuevo operario registrado.");
        }
        setForm({ id: null, nombre: '', puesto: '', descanso: 'Domingo', inicio: '08:00', fin: '17:00' });
        setShowAdd(false);
    };

    const deleteOperative = (id) => {
        if (confirm("¿Eliminar este operario permanentemente?")) {
            setOperatives(operatives.filter(o => o.id !== id));
            showToast("Operario eliminado del sistema.", "error");
        }
    };

    // Gantt Logic Helpers
    const parseTime = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h + (m / 60);
    };

    const formatTime = (hoursFloat) => {
        const h = Math.floor(hoursFloat);
        const m = Math.round((hoursFloat - h) * 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const pStart = parseTime(config.rrhh.horaInicioPlanta);
    const pEnd = parseTime(config.rrhh.horaFinPlanta);
    const totalPlantHours = pEnd > pStart ? pEnd - pStart : (24 - pStart) + pEnd;

    const calculateGanttStyle = (opStartStr, opEndStr) => {
        const opStart = parseTime(opStartStr);
        let opEnd = parseTime(opEndStr);
        if (opEnd < opStart) opEnd += 24; // Cross-midnight shift

        let offsetHours = opStart - pStart;
        if (offsetHours < 0) offsetHours += 24;

        const durationHours = opEnd - opStart;

        const leftPct = (offsetHours / totalPlantHours) * 100;
        const widthPct = (durationHours / totalPlantHours) * 100;

        return {
            left: `${Math.max(0, Math.min(leftPct, 100))}%`,
            width: `${Math.min(widthPct, 100 - leftPct)}%` // Cap width so it doesn't overflow
        };
    };

    const timelineMarkers = [];
    for (let i = 0; i <= Math.ceil(totalPlantHours); i += 2) {
        let h = pStart + i;
        if (h >= 24) h -= 24;
        timelineMarkers.push({ label: formatTime(h), pct: (i / totalPlantHours) * 100 });
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* GANTT CHART SECTION */}
            <Card className="fall-target p-6 bg-slate-900 border-4 border-slate-800 text-white shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><UserCircle size={120} /></div>
                <div className="flex justify-between items-center mb-6 relative z-10">
                    <div>
                        <h4 className="text-xl font-black uppercase italic text-white flex items-center gap-3"><Calendar className="text-indigo-400" size={24} /> Gantt de Cobertura (Turnos)</h4>
                        <p className="text-xs text-slate-400 font-bold mt-1">Horario de Planta Activa: {config.rrhh.horaInicioPlanta} a {config.rrhh.horaFinPlanta} ({totalPlantHours}hs)</p>
                    </div>
                </div>

                <div className="relative mt-8 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    {/* Timeline Headers */}
                    <div className="relative h-6 mb-4 border-b border-slate-700">
                        {timelineMarkers.map((marker, idx) => (
                            <div key={idx} className="absolute top-0 -translate-x-1/2 flex flex-col items-center" style={{ left: `${marker.pct}%` }}>
                                <span className="text-[10px] font-mono text-slate-400 font-bold">{marker.label}</span>
                                <div className="h-2 w-px bg-slate-600 mt-1"></div>
                            </div>
                        ))}
                    </div>

                    {/* Gantt Bars */}
                    <div className="space-y-3 relative">
                        {/* Background Grid Lines */}
                        {timelineMarkers.map((marker, idx) => (
                            <div key={`grid-${idx}`} className="absolute top-0 bottom-0 w-px bg-slate-700/30" style={{ left: `${marker.pct}%` }}></div>
                        ))}

                        {operatives.map(op => {
                            const style = calculateGanttStyle(op.inicio, op.fin);
                            return (
                                <div key={op.id} className="relative h-10 bg-slate-900/50 rounded-lg flex items-center group overflow-hidden border border-slate-800">
                                    {/* The colored bar */}
                                    <div
                                        className="absolute top-1 bottom-1 rounded-md bg-gradient-to-r from-indigo-600 to-indigo-400 shadow-md transition-all group-hover:from-indigo-500 group-hover:to-indigo-300 flex items-center px-3"
                                        style={style}
                                    >
                                        <span className="text-[10px] font-black truncate text-white drop-shadow-md z-10">{op.nombre}</span>
                                    </div>
                                    <div className="absolute left-2 text-[10px] text-slate-500 font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none bg-slate-900/80 px-2 rounded">
                                        {op.inicio} - {op.fin}
                                    </div>
                                </div>
                            );
                        })}
                        {operatives.length === 0 && <div className="text-center p-4 text-xs font-bold text-slate-500">No hay operarios registrados.</div>}
                    </div>
                </div>
            </Card>

            {/* OPERATOR DATA GRID */}
            <Card className="fall-target p-6 bg-slate-50 border-t-8 border-indigo-500">
                <div className="flex justify-between items-center mb-5">
                    <h4 className="text-xl font-black uppercase italic text-slate-800 flex items-center gap-2"><Users size={24} className="text-indigo-600" /> Fichas de Personal ({operatives.length})</h4>
                    <Button onClick={() => { setShowAdd(!showAdd); setForm({ id: null, nombre: '', puesto: '', descanso: 'Domingo', inicio: '08:00', fin: '17:00' }); }} variant={showAdd ? "secondary" : "primary"} className="bg-indigo-600 hover:bg-indigo-700 text-white">{showAdd ? "Cancelar" : <><Plus size={14} /> Nueva Ficha</>}</Button>
                </div>

                {showAdd && (
                    <Card className="p-6 border-2 border-indigo-500 bg-white mb-6 shadow-md relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
                        <h4 className="text-xs font-black uppercase mb-4 italic text-indigo-900 ml-4">{form.id ? 'Modificar Ficha Operario' : 'Alta de Nuevo Operario'}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end ml-4">
                            <div className="md:col-span-2"><Input label="Nombre y Apellido" value={form.nombre} onChange={v => setForm({ ...form, nombre: v })} required /></div>
                            <div className="md:col-span-1"><Input label="Puesto / Rol" placeholder="Ej. Pastelero..." value={form.puesto} onChange={v => setForm({ ...form, puesto: v })} required /></div>
                            <div className="md:col-span-1"><Select label="Día de Descanso" value={form.descanso} onChange={v => setForm({ ...form, descanso: v })} required>
                                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => <option key={d} value={d}>{d}</option>)}
                            </Select></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end ml-4 mt-4">
                            <Input label="Hora Entrada" type="time" value={form.inicio} onChange={v => setForm({ ...form, inicio: v })} required />
                            <Input label="Hora Salida" type="time" value={form.fin} onChange={v => setForm({ ...form, fin: v })} required />
                        </div>
                        <div className="flex justify-end mt-5 pt-4 border-t border-slate-100">
                            <Button onClick={saveOperative} variant="success" className="py-2 px-8 shadow-md">Guardar Datos</Button>
                        </div>
                    </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {operatives.map(op => (
                        <Card key={op.id} className="bg-white shadow-sm hover:shadow-md transition-shadow border border-slate-200 group relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-300 group-hover:bg-indigo-500 transition-colors"></div>
                            <div className="p-4 pl-5">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h5 className="font-black text-slate-800 text-sm uppercase">{op.nombre}</h5>
                                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">{op.puesto}</span>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setForm(op); setShowAdd(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded"><Wrench size={14} /></button>
                                        <button onClick={() => deleteOperative(op.id)} className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded border border-slate-100 mb-2">
                                    <div><p className="text-[8px] font-black uppercase text-slate-400">Entrada</p><p className="font-mono text-xs font-bold text-slate-700">{op.inicio} hs</p></div>
                                    <div><p className="text-[8px] font-black uppercase text-slate-400">Salida</p><p className="font-mono text-xs font-bold text-slate-700">{op.fin} hs</p></div>
                                </div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                    <Clock size={12} className="text-slate-400" /> Franco: <span className="text-slate-700">{op.descanso}</span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </Card>
        </div>
    );
}
