'use client';
import React, { useState, useEffect } from 'react';
import {
    ClipboardList, Coins, AlertTriangle, Truck, Settings2, X,
    Package, DollarSign, Users, Factory, BarChart3, ShoppingCart,
    TrendingUp, Eye, EyeOff, Zap, LayoutDashboard, CheckCircle2
} from 'lucide-react';
import { Card } from '../bakery_erp';
import { WIDGET_CATALOG, PRESETS } from '../dashboard_config';

/* ============================================================
   RENDER DE WIDGETS INDIVIDUALES
   ============================================================ */
function KpiCard({ icon: Icon, label, value, sub, color }) {
    return (
        <Card className={`fall-target ${color} text-white p-4 relative overflow-hidden flex flex-col justify-between shadow-md min-h-[80px] animate-in fade-in`}>
            <div className="absolute -right-2 -top-1 opacity-10"><Icon size={52} /></div>
            <p className="text-[8px] font-black uppercase opacity-60 tracking-widest leading-none">{label}</p>
            <div className="mt-1">
                <h3 className="text-2xl font-black italic leading-none">{value}</h3>
                {sub && <p className="text-[10px] opacity-60 font-bold mt-1">{sub}</p>}
            </div>
        </Card>
    );
}

function TablaWidget({ title, subtitle, accentColor, children, empty }) {
    return (
        <Card className={`fall-target w-full border-t-4 ${accentColor} flex flex-col overflow-hidden bg-white shadow-sm animate-in fade-in`}>
            <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                    <h4 className="text-sm font-black uppercase italic text-slate-800 leading-none">{title}</h4>
                    {subtitle && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 leading-none">{subtitle}</p>}
                </div>
            </div>
            <div className="overflow-x-auto">
                {empty ? (
                    <div className="p-8 text-center text-slate-300 italic text-xs">{empty}</div>
                ) : children}
            </div>
        </Card>
    );
}

/* ============================================================
   PANEL DE EDICIÓN RÁPIDA (Slide-over desde la derecha)
   ============================================================ */
function QuickEditPanel({ dashboardConfig, setDashboardConfig, onClose }) {
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

    const categories = [
        { id: 'produccion', label: '🏭 Producción' },
        { id: 'stock', label: '📦 Stock' },
        { id: 'logistica', label: '🚚 Logística' },
        { id: 'finanzas', label: '💰 Finanzas' },
        { id: 'calidad', label: '✅ Calidad' },
        { id: 'clientes', label: '👥 Clientes' }
    ];

    const visibleCount = dashboardConfig.widgets.filter(w => w.visible).length;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Overlay */}
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
            
            {/* Panel */}
            <div className="relative z-10 w-96 h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right">
                {/* Header */}
                <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <LayoutDashboard size={18} className="text-orange-400" />
                            <h3 className="font-black uppercase italic tracking-tight">Configurar Monitor</h3>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">{visibleCount} widgets activos</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors"><X size={20} /></button>
                </div>

                {/* Presets */}
                <div className="p-4 border-b bg-slate-50">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Modos Rápidos</p>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(PRESETS).map(([key, preset]) => (
                            <button
                                key={key}
                                onClick={() => applyPreset(key)}
                                className={`p-2.5 rounded-xl text-left transition-all border-2 ${dashboardConfig.activePreset === key
                                    ? 'border-orange-500 bg-orange-50 shadow-sm'
                                    : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <p className="text-[11px] font-black text-slate-800 leading-tight">{preset.label}</p>
                                <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{preset.description}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Widget list - scrollable */}
                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                    {categories.map(cat => {
                        const catWidgets = WIDGET_CATALOG.filter(w => w.category === cat.id);
                        if (catWidgets.length === 0) return null;
                        return (
                            <div key={cat.id}>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{cat.label}</p>
                                <div className="space-y-1.5">
                                    {catWidgets.map(widget => {
                                        const wConfig = dashboardConfig.widgets.find(w => w.id === widget.id);
                                        const isVisible = wConfig?.visible ?? false;
                                        return (
                                            <button
                                                key={widget.id}
                                                onClick={() => toggleWidget(widget.id)}
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${isVisible
                                                    ? 'bg-slate-900 text-white border-slate-900'
                                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className={`p-1.5 rounded-lg ${isVisible ? 'bg-white/20' : 'bg-slate-100'}`}>
                                                    <widget.icon size={14} className={isVisible ? 'text-white' : 'text-slate-400'} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-black uppercase leading-tight truncate">{widget.label}</p>
                                                    <p className={`text-[9px] mt-0.5 leading-tight ${isVisible ? 'text-white/60' : 'text-slate-400'}`}>{widget.description}</p>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    {isVisible
                                                        ? <Eye size={14} className="text-orange-400" />
                                                        : <EyeOff size={14} className="text-slate-300" />
                                                    }
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-slate-50">
                    <p className="text-[9px] text-slate-400 text-center">Los cambios se aplican al instante.<br />Guardá la configuración en <strong>Configuración → Monitor Central</strong>.</p>
                </div>
            </div>
        </div>
    );
}

/* ============================================================
   DASHBOARD VIEW PRINCIPAL
   ============================================================ */
export default function DashboardView({
    recipes = [], ingredients = [], lots = [], orders = [], logistics = [], qualityLogs = [],
    config, lotesPT = [], pedidos = [], clientes = [], ventas = [], providers = [],
    pagosProveedores = [], dashboardConfig, setDashboardConfig
}) {
    const [showEditor, setShowEditor] = useState(false);

    // Helpers
    const isVisible = (id) => dashboardConfig?.widgets?.find(w => w.id === id)?.visible ?? false;

    // ── CÁLCULOS DE KPIs ──────────────────────────────────────────
    const stockMetrics = ingredients.map(ing => {
        const totalGrams = lots.filter(l => (l.ingredientId || l.ingrediente_id) === ing.id)
            .reduce((acc, curr) => acc + Number(curr.amount || curr.cantidad_actual || 0), 0);
        return { ...ing, stock: totalGrams };
    });
    const totalStockValue = stockMetrics.reduce((acc, curr) => acc + (curr.stock * (curr.costo_estandar || 0)), 0);

    // Calcular deuda neta con proveedores desde el ledger real (deudas_proveedor)
    const totalDeudaProveedores = pagosProveedores.reduce((acc, p) => acc + Number(p.monto || 0), 0);

    const ordenesActivas = orders.filter(o => (o.status || o.estado) !== 'TERMINADA');
    const pedidosPendientes = pedidos.filter(p => p.estado === 'PEDIDO');
    const pedidosDespachados = pedidos.filter(p => p.estado === 'DESPACHADO');
    const lotesDisponibles = lotesPT.filter(l => (l.cantidadActual || l.cantidad_actual || 0) > 0);
    const ventasHoy = ventas.filter(v => {
        const d = new Date(v.fecha || v.created_at);
        const today = new Date();
        return d.toDateString() === today.toDateString();
    }).reduce((acc, v) => acc + Number(v.montoTotal || v.monto || 0), 0);

    // Stock crítico: lotes de insumos con menos de 10kg o vencen en < 7 días
    const stockCritico = stockMetrics.filter(ing => ing.stock < 10000).slice(0, 8);

    // Auditoría de mermas (usando órdenes terminadas como referencia)
    const ordenesTerminadas = orders.filter(o => (o.status || o.estado) === 'TERMINADA').slice(0, 5);

    // Separar KPIs visibles para el grid
    const kpiWidgets = [
        { id: 'kpi_ordenes', label: 'Órdenes Activas', value: ordenesActivas.length, sub: `${orders.length} total registradas`, icon: ClipboardList, color: 'bg-slate-900' },
        { id: 'kpi_stock_valor', label: 'Valorización Stock MP', value: `$${totalStockValue.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`, sub: `${ingredients.length} insumos en catálogo`, icon: Coins, color: 'bg-emerald-700' },
        { id: 'kpi_deuda_mp', label: 'Deuda Proveedores', value: `$${totalDeudaProveedores.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`, sub: `${providers?.length || 0} proveedores`, icon: AlertTriangle, color: 'bg-rose-700' },
        { id: 'kpi_pedidos', label: 'Pedidos Pendientes', value: `${pedidosPendientes.length}`, sub: `${pedidosDespachados.length} despachados`, icon: Truck, color: 'bg-blue-700' },
        { id: 'kpi_lotes_pt', label: 'Lotes PT Disponibles', value: lotesDisponibles.length, sub: `${lotesPT.length} lotes en total`, icon: Package, color: 'bg-violet-700' },
        { id: 'kpi_ventas_hoy', label: 'Ventas del Día', value: `$${ventasHoy.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`, sub: `${ventas.filter(v => { const d = new Date(v.fecha || v.created_at); const t = new Date(); return d.toDateString() === t.toDateString(); }).length} facturas hoy`, icon: DollarSign, color: 'bg-orange-600' },
        { id: 'kpi_recetas', label: 'Fichas Técnicas', value: recipes.filter(r => !r.es_subensamble).length, sub: `${recipes.filter(r => r.es_subensamble).length} WIPs registrados`, icon: Factory, color: 'bg-teal-700' },
        { id: 'kpi_clientes', label: 'Clientes Activos', value: clientes.length, sub: `en el maestro`, icon: Users, color: 'bg-indigo-700' },
    ];

    const visibleKpis = kpiWidgets.filter(kpi => isVisible(kpi.id));
    const visibleTablas = {
        mermas: isVisible('tabla_mermas'),
        ordenesActivas: isVisible('tabla_ordenes_activas'),
        pedidosPendientes: isVisible('tabla_pedidos_pendientes'),
        stockCritico: isVisible('tabla_stock_critico')
    };
    const anyTabla = Object.values(visibleTablas).some(Boolean);

    const activePresetData = PRESETS[dashboardConfig?.activePreset];

    return (
        <div className="space-y-5 animate-in fade-in duration-500">

            {/* ── Barra superior del Dashboard ── */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div>
                        <h2 className="text-xl font-black uppercase italic text-slate-800 leading-none">Monitor Central</h2>
                        <div className="flex items-center gap-2 mt-1">
                            {activePresetData && (
                                <span className="text-[9px] font-black uppercase bg-slate-900 text-white px-2 py-0.5 rounded-full">
                                    {activePresetData.label}
                                </span>
                            )}
                            <span className="text-[9px] text-slate-400 font-bold">
                                {visibleKpis.length} KPIs · {Object.values(visibleTablas).filter(Boolean).length} tablas activas
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setShowEditor(true)}
                    className="flex items-center gap-2 bg-white border border-slate-200 hover:border-orange-400 hover:bg-orange-50 text-slate-600 hover:text-orange-600 px-4 py-2 rounded-xl transition-all shadow-sm font-black text-xs uppercase group"
                >
                    <Settings2 size={15} className="group-hover:rotate-45 transition-transform duration-300" />
                    Personalizar
                </button>
            </div>

            {/* ── Grid de KPIs ── */}
            {visibleKpis.length > 0 && (
                <div className={`grid gap-4 ${visibleKpis.length <= 2 ? 'grid-cols-2' : visibleKpis.length <= 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-4'}`}>
                    {visibleKpis.map(kpi => (
                        <KpiCard
                            key={kpi.id}
                            icon={kpi.icon}
                            label={kpi.label}
                            value={kpi.value}
                            sub={kpi.sub}
                            color={kpi.color}
                        />
                    ))}
                </div>
            )}

            {/* ── Estado vacío ── */}
            {visibleKpis.length === 0 && !anyTabla && (
                <Card className="p-12 text-center bg-white border-2 border-dashed border-slate-200">
                    <LayoutDashboard size={48} className="mx-auto text-slate-200 mb-4" />
                    <h3 className="font-black uppercase text-slate-400 text-lg italic">Monitor vacío</h3>
                    <p className="text-slate-400 text-sm mt-2">Hacé clic en <strong>Personalizar</strong> para activar los indicadores que querés ver.</p>
                    <button onClick={() => setShowEditor(true)} className="mt-6 bg-slate-900 text-white font-black uppercase text-xs px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors">
                        <Settings2 size={14} className="inline mr-2" /> Configurar Monitor
                    </button>
                </Card>
            )}

            {/* ── Tabla: Auditoría de Mermas ── */}
            {visibleTablas.mermas && (
                <TablaWidget
                    title="Auditoría de Mermas"
                    subtitle="Consumo MP Teórico vs. Consumo MP Real"
                    accentColor="border-orange-500"
                >
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-[9px] uppercase tracking-widest border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-2 font-black">Insumo</th>
                                <th className="px-4 py-2 text-center font-black border-l border-slate-200">Stock Actual</th>
                                <th className="px-4 py-2 text-center font-black">Estado</th>
                                <th className="px-4 py-2 text-right font-black border-l border-slate-200">Valor ($)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs bg-white">
                            {stockMetrics.filter(s => s.stock > 0).slice(0, 6).map((item, idx) => {
                                const kgStock = (item.stock / 1000).toFixed(1);
                                const valor = item.stock * (item.costo_estandar || 0);
                                const isLow = item.stock < 10000;
                                return (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-2 font-black text-slate-800 uppercase">{item.name}</td>
                                        <td className="px-4 py-2 text-center font-mono font-bold border-l border-slate-100">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black ${isLow ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                {kgStock} kg
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black ${isLow ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                                {isLow ? '⚠ CRÍTICO' : '✓ OK'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-right font-mono font-black text-slate-700 border-l border-slate-100">
                                            ${valor.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </TablaWidget>
            )}

            {/* ── Tabla: Órdenes Activas ── */}
            {visibleTablas.ordenesActivas && (
                <TablaWidget
                    title="Órdenes Activas en Planta"
                    subtitle="Estado actual del Kanban de Producción"
                    accentColor="border-slate-800"
                    empty={ordenesActivas.length === 0 ? 'No hay órdenes activas en este momento.' : null}
                >
                    {ordenesActivas.length > 0 && (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-[9px] uppercase tracking-widest border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-2 font-black">Orden</th>
                                    <th className="px-4 py-2 font-black">Producto</th>
                                    <th className="px-4 py-2 text-center font-black">Estado</th>
                                    <th className="px-4 py-2 text-right font-black">Meta</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs bg-white">
                                {ordenesActivas.slice(0, 8).map((o, i) => {
                                    const rec = recipes.find(r => r.id === (o.recipeId || o.receta_id));
                                    const estado = o.status || o.estado;
                                    const colorMap = {
                                        PLANIFICADA: 'bg-slate-100 text-slate-600',
                                        AMASADO: 'bg-blue-50 text-blue-700',
                                        FERMENTACION: 'bg-amber-50 text-amber-700',
                                        HORNEADO: 'bg-orange-50 text-orange-700',
                                        CALIDAD: 'bg-violet-50 text-violet-700'
                                    };
                                    return (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="px-4 py-2 font-mono text-[10px] text-slate-400">{o.codigo_orden || o.id}</td>
                                            <td className="px-4 py-2 font-black text-slate-800 uppercase text-[11px]">{rec?.nombre_producto || '—'}</td>
                                            <td className="px-4 py-2 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black ${colorMap[estado] || 'bg-slate-100 text-slate-600'}`}>{estado}</span>
                                            </td>
                                            <td className="px-4 py-2 text-right font-mono font-bold text-blue-700">{o.targetAmount || o.cantidad_objetivo}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </TablaWidget>
            )}

            {/* ── Tabla: Pedidos Pendientes ── */}
            {visibleTablas.pedidosPendientes && (
                <TablaWidget
                    title="Pedidos Pendientes del Día"
                    subtitle="Órdenes de clientes sin despachar"
                    accentColor="border-blue-600"
                    empty={pedidosPendientes.length === 0 ? 'No hay pedidos pendientes.' : null}
                >
                    {pedidosPendientes.length > 0 && (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-[9px] uppercase tracking-widest border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-2 font-black">Nro. Pedido</th>
                                    <th className="px-4 py-2 font-black">Cliente</th>
                                    <th className="px-4 py-2 text-center font-black">Ítems</th>
                                    <th className="px-4 py-2 text-center font-black">Fecha</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs bg-white">
                                {pedidosPendientes.slice(0, 6).map((p, i) => {
                                    const cli = clientes.find(c => c.id === (p.clientId || p.cliente_id));
                                    return (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="px-4 py-2 font-mono text-[10px] text-blue-600">{p.num_orden || p.id}</td>
                                            <td className="px-4 py-2 font-black text-slate-800 uppercase text-[11px]">{cli?.nombre || cli?.razon_social || '—'}</td>
                                            <td className="px-4 py-2 text-center font-mono text-slate-600">{p.items?.length || 0}</td>
                                            <td className="px-4 py-2 text-center text-slate-500">{new Date(p.fecha || p.fecha_creacion).toLocaleDateString('es-AR')}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </TablaWidget>
            )}

            {/* ── Tabla: Stock Crítico ── */}
            {visibleTablas.stockCritico && (
                <TablaWidget
                    title="Alertas de Stock Crítico"
                    subtitle="Insumos con existencias bajas"
                    accentColor="border-red-500"
                    empty={stockCritico.length === 0 ? 'Todos los insumos tienen stock normal.' : null}
                >
                    {stockCritico.length > 0 && (
                        <table className="w-full text-left">
                            <thead className="bg-red-50 text-slate-500 text-[9px] uppercase tracking-widest border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-2 font-black">Insumo</th>
                                    <th className="px-4 py-2 font-black">Familia</th>
                                    <th className="px-4 py-2 text-right font-black">Stock Actual</th>
                                    <th className="px-4 py-2 text-center font-black">Alerta</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs bg-white">
                                {stockCritico.map((item, i) => (
                                    <tr key={i} className="hover:bg-red-50/30">
                                        <td className="px-4 py-2 font-black text-slate-800 uppercase">{item.name}</td>
                                        <td className="px-4 py-2 text-slate-500 text-[10px]">{item.familia}</td>
                                        <td className="px-4 py-2 text-right font-mono font-bold text-red-600">{(item.stock / 1000).toFixed(1)} kg</td>
                                        <td className="px-4 py-2 text-center"><span className="bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded text-[8px] font-black">⚠ REABASTECER</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </TablaWidget>
            )}

            {/* ── Quick Edit Panel ── */}
            {showEditor && (
                <QuickEditPanel
                    dashboardConfig={dashboardConfig}
                    setDashboardConfig={setDashboardConfig}
                    onClose={() => setShowEditor(false)}
                />
            )}
        </div>
    );
}