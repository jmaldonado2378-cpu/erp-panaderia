import React, { useState } from 'react';
import { Building, Calculator, Users, Store, Plus, LayoutDashboard, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Card, Button, Input, Select } from '../bakery_erp';
import { WIDGET_CATALOG, PRESETS } from '../dashboard_config';

export default function SettingsView({ config, setConfig, showToast, dashboardConfig, setDashboardConfig }) {
    const [form, setForm] = useState(config);
    const [newBranch, setNewBranch] = useState('');

    const saveCompanyData = () => {
        setConfig(form);
        showToast("Configuración general actualizada correctamente.");
    };

    const addBranch = (e) => {
        e.preventDefault();
        if (!newBranch.trim() || form.branches.includes(newBranch.trim())) return;
        setForm({ ...form, branches: [...form.branches, newBranch.trim()] });
        setNewBranch('');
    };

    const removeBranch = (branchToRemove) => {
        if (confirm(`¿Eliminar la sucursal ${branchToRemove}?`)) {
            setForm({ ...form, branches: form.branches.filter(b => b !== branchToRemove) });
        }
    };

    const toggleWidget = (widgetId) => {
        setDashboardConfig(prev => ({
            ...prev,
            widgets: prev.widgets.map(w =>
                w.id === widgetId ? { ...w, visible: !w.visible } : w
            )
        }));
    };

    const applyPreset = (presetKey) => {
        setDashboardConfig(prev => ({
            ...prev,
            activePreset: presetKey,
            widgets: prev.widgets.map(w => ({
                ...w,
                visible: WIDGET_CATALOG.find(wc => wc.id === w.id)?.presets.includes(presetKey) ?? false
            }))
        }));
    };

    return (
        <div className="space-y-6 animate-in fade-in max-w-4xl pb-10">
            {/* Datos de la Empresa */}
            <Card className="fall-target p-6 border-t-8 border-slate-900 bg-white shadow-md">
                <div className="flex items-center gap-3 mb-5 border-b pb-3">
                    <Building className="text-slate-800" size={24} />
                    <h4 className="text-xl font-black uppercase italic text-slate-800">Datos de la Empresa</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <Input label="Nombre de la Empresa / Marca" value={form.companyName} onChange={v => setForm({ ...form, companyName: v })} />
                    <Input label="Subtítulo / Versión del Sistema" value={form.appName} onChange={v => setForm({ ...form, appName: v })} />
                </div>
            </Card>

            {/* Variables Financieras */}
            <Card className="fall-target p-6 border-t-8 border-emerald-500 bg-emerald-50/30 shadow-md">
                <div className="flex items-center gap-3 mb-5 border-b border-emerald-200 pb-3">
                    <Calculator className="text-emerald-600" size={24} />
                    <h4 className="text-xl font-black uppercase italic text-emerald-900">Variables Financieras Globales</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <Input label="Costo Mano Obra ($ / Hora)" type="number" value={form.finanzas.costoHoraHombre} onChange={v => setForm({ ...form, finanzas: { ...form.finanzas, costoHoraHombre: Number(v) } })} />
                    <Input label="Gastos Indirectos" type="number" value={form.finanzas.costosIndirectosPct} suffix="% de MP" onChange={v => setForm({ ...form, finanzas: { ...form.finanzas, costosIndirectosPct: Number(v) } })} />
                    <Input label="Markup (Margen)" type="number" value={form.finanzas.margenGanancia} suffix="%" onChange={v => setForm({ ...form, finanzas: { ...form.finanzas, margenGanancia: Number(v) } })} />
                </div>
            </Card>

            {/* RRHH */}
            <Card className="fall-target p-6 border-t-8 border-indigo-500 bg-indigo-50/30 shadow-md">
                <div className="flex items-center gap-3 mb-5 border-b border-indigo-200 pb-3">
                    <Users className="text-indigo-600" size={24} />
                    <h4 className="text-xl font-black uppercase italic text-indigo-900">Parámetros de Planta (RRHH)</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <Input label="Hora Apertura Planta" type="time" value={form.rrhh.horaInicioPlanta} onChange={v => setForm({ ...form, rrhh: { ...form.rrhh, horaInicioPlanta: v } })} />
                    <Input label="Hora Cierre Planta" type="time" value={form.rrhh.horaFinPlanta} onChange={v => setForm({ ...form, rrhh: { ...form.rrhh, horaFinPlanta: v } })} />
                </div>
            </Card>

            <div className="flex justify-end">
                <Button variant="success" onClick={saveCompanyData} className="px-10 py-3 shadow-md">Guardar Configuración General</Button>
            </div>

            {/* MONITOR CENTRAL CONFIG */}
            <Card className="fall-target p-6 border-t-8 border-orange-500 bg-white shadow-md">
                <div className="flex items-center gap-3 mb-5 border-b pb-3">
                    <LayoutDashboard className="text-orange-500" size={24} />
                    <h4 className="text-xl font-black uppercase italic text-slate-800">Monitor Central (Dashboard)</h4>
                </div>
                
                <p className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Modos de Visualización Predeterminados</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
                    {Object.entries(PRESETS).map(([key, preset]) => (
                        <button
                            key={key}
                            onClick={() => applyPreset(key)}
                            className={`p-4 rounded-xl text-left border-2 transition-all ${dashboardConfig.activePreset === key 
                                ? 'border-orange-500 bg-orange-50 shadow-sm ring-2 ring-orange-500/20' 
                                : 'border-slate-100 bg-white hover:border-slate-300'}`}
                        >
                            <p className="text-xs font-black text-slate-900 mb-1">{preset.label}</p>
                            <p className="text-[10px] text-slate-500 leading-tight">{preset.description}</p>
                        </button>
                    ))}
                </div>

                <p className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Configuración Manual de Widgets</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {WIDGET_CATALOG.map(widget => {
                        const wConfig = dashboardConfig.widgets.find(w => w.id === widget.id);
                        const isVisible = wConfig?.visible ?? false;
                        return (
                            <div 
                                key={widget.id} 
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isVisible 
                                    ? 'bg-slate-900 border-slate-900 shadow-sm' 
                                    : 'bg-slate-50 border-slate-200'}`}
                            >
                                <div className={`p-2 rounded-lg ${isVisible ? 'bg-slate-800' : 'bg-white border'}`}>
                                    <widget.icon size={16} className={isVisible ? 'text-white' : 'text-slate-400'} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[11px] font-black uppercase truncate ${isVisible ? 'text-white' : 'text-slate-700'}`}>{widget.label}</p>
                                    <p className={`text-[9px] truncate ${isVisible ? 'text-slate-400' : 'text-slate-400'}`}>{widget.description}</p>
                                </div>
                                <button 
                                    onClick={() => toggleWidget(widget.id)}
                                    className={`p-1.5 rounded-lg transition-colors ${isVisible ? 'text-orange-400 hover:bg-slate-800' : 'text-slate-300 hover:bg-white hover:text-slate-600'}`}
                                >
                                    {isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-6 flex justify-center bg-orange-50 border border-orange-100 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-orange-700 uppercase flex items-center gap-2">
                        <Plus size={12} /> Los cambios se guardan automáticamente en tu navegador
                    </p>
                </div>
            </Card>

            {/* Sucursales */}
            <Card className="fall-target p-6 border-t-8 border-orange-500 bg-white shadow-md">
                <div className="flex items-center gap-3 mb-5 border-b pb-3">
                    <Store className="text-orange-500" size={24} />
                    <h4 className="text-xl font-black uppercase italic text-slate-800">Locales y Sucursales</h4>
                </div>
                <form onSubmit={addBranch} className="flex gap-4 items-end bg-slate-50 p-5 rounded-xl border mb-6">
                    <div className="flex-1">
                        <Input label="Nombre de la Nueva Sucursal" placeholder="Ej. Local Norte..." value={newBranch} onChange={setNewBranch} />
                    </div>
                    <Button variant="primary" type="submit" className="py-2 px-5 h-[38px]"><Plus size={14} /> Agregar</Button>
                </form>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {form.branches.map(branch => (
                        <div key={branch} className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-lg shadow-sm hover:border-orange-300 transition-colors group">
                            <span className="font-bold text-xs text-slate-700 uppercase tracking-wide truncate pr-2">{branch}</span>
                            <button onClick={() => removeBranch(branch)} className="text-slate-300 hover:text-red-500 p-1.5 rounded-md group-hover:bg-red-50">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
} 