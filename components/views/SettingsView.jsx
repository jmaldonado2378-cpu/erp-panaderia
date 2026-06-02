import React, { useState } from 'react';
import { useGlobalContext } from '../context/GlobalContext';
import { Building, Calculator, Users, Store, Plus, LayoutDashboard, Eye, EyeOff, Trash2, Sparkles, RefreshCw, Lock } from 'lucide-react';
import { Card, Button, Input, Select } from '../bakery_erp';
import { WIDGET_CATALOG, PRESETS } from '../dashboard_config';

export default function SettingsView({ config, setConfig, showToast, dashboardConfig, setDashboardConfig }) {
    const { 
        theme, changeTheme,
        stitchProjectId, setStitchProjectId,
        stitchApiKey, setStitchApiKey,
        stitchDesignSystems, setStitchDesignSystems,
        stitchThemeConfig, setStitchThemeConfig
    } = useGlobalContext();
    const [form, setForm] = useState(config);
    const [newBranch, setNewBranch] = useState('');
    const [loadingStitch, setLoadingStitch] = useState(false);
    const [stitchError, setStitchError] = useState(null);

    const loadStitchDesignSystems = async () => {
        if (!stitchProjectId || !stitchApiKey) {
            setStitchError("Por favor introduce el ID del proyecto y la API Key de Stitch.");
            return;
        }
        setLoadingStitch(true);
        setStitchError(null);
        try {
            const res = await fetch('/api/stitch-sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'list-design-systems',
                    projectId: stitchProjectId,
                    apiKey: stitchApiKey
                })
            });
            const data = await res.json();
            if (data.error) {
                throw new Error(data.error);
            }
            if (data.designSystems) {
                setStitchDesignSystems(data.designSystems);
                localStorage.setItem('stitchDesignSystems', JSON.stringify(data.designSystems));
                localStorage.setItem('stitchProjectId', stitchProjectId);
                localStorage.setItem('stitchApiKey', stitchApiKey);
                showToast("Sistemas de diseño cargados de Stitch correctamente.");
            } else {
                throw new Error("No se encontraron sistemas de diseño en este proyecto.");
            }
        } catch (err) {
            console.error(err);
            setStitchError(err.message || "Error al conectar con Stitch.");
            showToast(err.message || "Error al conectar con Stitch.", "error");
        } finally {
            setLoadingStitch(false);
        }
    };

    const applyStitchSystem = (system) => {
        if (!system || !system.designSystem) return;
        const themeConfig = system.designSystem;
        localStorage.setItem('stitchThemeConfig', JSON.stringify(themeConfig));
        setStitchThemeConfig(themeConfig);
        changeTheme('stitch-custom');
        showToast(`Tema de Stitch '${themeConfig.displayName}' aplicado.`);
    };

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

            {/* Temas Visuales (Rediseño Estético) */}
            <Card className="p-6 border-t-8 border-orange-600 bg-white shadow-md">
                <div className="flex items-center gap-3 mb-5 border-b pb-3">
                    <LayoutDashboard className="text-orange-600" size={24} />
                    <h4 className="text-xl font-black uppercase italic text-slate-800">Tema Visual (Rediseño Estético)</h4>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">
                    Selecciona una dirección de rediseño para cambiar la estética completa de la aplicación en tiempo real
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                    {[
                        { id: 'classic', label: 'Classic Light', desc: 'Tema claro estándar', color: 'border-slate-200 bg-slate-50 text-slate-900' },
                        { id: 'artisan', label: 'Artisan Industrial', desc: 'Vidrio Oscuro & Naranja', color: 'border-orange-500 bg-slate-900 text-white' },
                        { id: 'terminal', label: 'Bakery OS Terminal', desc: 'Negro & Verde Ácido', color: 'border-lime-400 bg-black text-lime-400 font-mono' },
                        { id: 'executive', label: 'Executive Neo-Dark', desc: 'Navy & Púrpura', color: 'border-purple-500 bg-slate-950 text-indigo-200' },
                        { id: 'artisanflow', label: 'ArtisanFlow Light', desc: 'Vidrio Suave & Esmeralda', color: 'border-emerald-500 bg-slate-50/50 text-emerald-900' },
                        ...(stitchThemeConfig ? [{
                            id: 'stitch-custom',
                            label: `Stitch: ${stitchThemeConfig.displayName || 'Custom'}`,
                            desc: 'Tema sincronizado de tu canvas',
                            isStitch: true,
                            customColor: stitchThemeConfig.customColor || stitchThemeConfig.theme?.customColor || '#e9590c',
                            bgColor: (stitchThemeConfig.namedColors || stitchThemeConfig.theme?.namedColors || {}).background || '#131313',
                            textColor: (stitchThemeConfig.namedColors || stitchThemeConfig.theme?.namedColors || {}).on_surface || '#e5e2e1',
                            fontFamily: stitchThemeConfig.font || stitchThemeConfig.theme?.font || 'HANKEN_GROTESK'
                        }] : [])
                    ].map(t => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => changeTheme(t.id)}
                            style={t.isStitch ? {
                                borderColor: t.customColor,
                                backgroundColor: t.bgColor,
                                color: t.textColor,
                                fontFamily: t.fontFamily === 'SPACE_MONO' ? 'Space Mono, monospace' : t.fontFamily === 'HANKEN_GROTESK' ? 'Hanken Grotesk, sans-serif' : t.fontFamily === 'OUTFIT' ? 'Outfit, sans-serif' : t.fontFamily === 'MANROPE' ? 'Manrope, sans-serif' : 'inherit'
                            } : {}}
                            className={`p-4 rounded-xl text-left border-2 transition-all flex flex-col justify-between h-28 ${t.isStitch ? '' : t.color} ${theme === t.id ? 'ring-4 ring-orange-500/30 scale-[1.02] shadow-md border-orange-500' : 'opacity-70 hover:opacity-100 hover:scale-[1.01]'}`}
                        >
                            <span className="text-xs font-black uppercase tracking-wider">{t.label}</span>
                            <span className="text-[9px] font-bold leading-tight opacity-75 mt-2">{t.desc}</span>
                        </button>
                    ))}
                </div>
            </Card>

            {/* Personalización e Integración con Stitch */}
            <Card className="p-6 border-t-8 border-indigo-600 bg-white shadow-md">
                <div className="flex items-center justify-between mb-5 border-b pb-3">
                    <div className="flex items-center gap-3">
                        <Sparkles className="text-indigo-600 animate-pulse" size={24} />
                        <h4 className="text-xl font-black uppercase italic text-slate-800">Conexión con Stitch Workspace</h4>
                    </div>
                    <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[8px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider">
                        Google Labs AI Design
                    </span>
                </div>
                
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">
                    Sincroniza y aplica sistemas de diseño en tiempo real creados en tu canvas de Stitch
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6">
                    <Input 
                        label="ID de Proyecto en Stitch" 
                        value={stitchProjectId} 
                        onChange={setStitchProjectId} 
                        placeholder="Ej: 15115760904171156066"
                    />
                    <div className="flex flex-col gap-1 w-full text-left">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                            <Lock size={10} /> API Key de Stitch
                        </label>
                        <input 
                            type="password" 
                            value={stitchApiKey} 
                            onChange={(e) => setStitchApiKey(e.target.value)} 
                            placeholder="Introduce tu STITCH_API_KEY..."
                            className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 text-sm font-semibold text-slate-800 transition-all shadow-sm"
                        />
                    </div>
                    <Button 
                        variant="primary" 
                        onClick={loadStitchDesignSystems}
                        disabled={loadingStitch}
                        className="py-2.5 px-5 h-[38px]"
                    >
                        {loadingStitch ? (
                            <>
                                <RefreshCw className="animate-spin" size={14} /> Conectando...
                            </>
                        ) : (
                            <>
                                <RefreshCw size={14} /> Cargar Sistemas
                            </>
                        )}
                    </Button>
                </div>

                {stitchError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-lg mb-6 uppercase tracking-wider">
                        ⚠️ Error: {stitchError}
                    </div>
                )}

                {stitchDesignSystems && stitchDesignSystems.length > 0 ? (
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">
                            Sistemas de diseño detectados en el proyecto ({stitchDesignSystems.length})
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stitchDesignSystems.map(system => {
                                const ds = system.designSystem;
                                if (!ds) return null;
                                const colors = ds.namedColors || ds.theme?.namedColors || {};
                                const primaryColor = ds.customColor || ds.theme?.customColor || '#e9590c';
                                const activeName = stitchThemeConfig?.displayName;
                                const isCurrent = activeName === ds.displayName && theme === 'stitch-custom';
                                
                                return (
                                    <div 
                                        key={system.name} 
                                        className={`border-2 rounded-xl p-4 flex flex-col justify-between transition-all bg-white ${isCurrent ? 'border-indigo-600 shadow-md ring-4 ring-indigo-500/10' : 'border-slate-100 hover:border-slate-300'}`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wide truncate max-w-[150px]">
                                                    {ds.displayName || 'Sin Nombre'}
                                                </h5>
                                                {isCurrent && (
                                                    <span className="bg-indigo-600 text-white text-[7px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider animate-pulse">
                                                        Activo
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[9px] text-slate-400 leading-tight mb-4">
                                                Tipografía: <span className="font-bold text-slate-700">{ds.font || ds.theme?.font || 'Inter'}</span>
                                            </p>
                                            
                                            {/* Paleta visual */}
                                            <div className="flex gap-2 mb-4 items-center">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-1">Paleta:</span>
                                                <div 
                                                    className="w-5 h-5 rounded-full border border-slate-200 shadow-inner" 
                                                    style={{ backgroundColor: colors.background || '#131313' }}
                                                    title={`Background: ${colors.background}`}
                                                />
                                                <div 
                                                    className="w-5 h-5 rounded-full border border-slate-200 shadow-inner" 
                                                    style={{ backgroundColor: colors.surface_container || '#201f1f' }}
                                                    title={`Surface Container: ${colors.surface_container}`}
                                                />
                                                <div 
                                                    className="w-5 h-5 rounded-full border border-slate-200 shadow-inner" 
                                                    style={{ backgroundColor: primaryColor }}
                                                    title={`Primary: ${primaryColor}`}
                                                />
                                                <div 
                                                    className="w-5 h-5 rounded-full border border-slate-200 shadow-inner" 
                                                    style={{ backgroundColor: colors.on_surface || '#ffffff' }}
                                                    title={`Text: ${colors.on_surface}`}
                                                />
                                            </div>
                                        </div>
                                        
                                        <Button 
                                            variant={isCurrent ? 'success' : 'secondary'}
                                            onClick={() => applyStitchSystem(system)}
                                            className="w-full text-center"
                                        >
                                            {isCurrent ? "Aplicado" : "Aplicar Sistema"}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-6 bg-slate-50 border rounded-xl border-dashed">
                        <Sparkles className="mx-auto text-slate-300 mb-2" size={32} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            No se han cargado sistemas de diseño de Stitch aún
                        </p>
                        <p className="text-[9px] text-slate-400 mt-1 max-w-xs mx-auto">
                            Ingresa tus credenciales y haz clic en "Cargar Sistemas" para conectarte
                        </p>
                    </div>
                )}
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