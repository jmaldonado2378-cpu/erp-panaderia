'use client';
import React, { useState, useMemo, useEffect } from 'react';
import {
    TrendingDown, Package, Layers, ShieldCheck, Settings,
    Plus, Trash2, Coins, Factory, Briefcase,
    Warehouse, ThermometerSun, ArrowRight, Truck, Layout,
    Clock, ClipboardList, Printer, QrCode, Square, MapPin,
    AlertTriangle, Hash, Search, Calendar, Wrench, Building,
    Store, CheckCircle2, XCircle, Calculator, DollarSign, PieChart,
    RotateCcw, ChevronDown, ChevronUp, Eye, Upload,
    GitMerge, Activity, Users, AlertOctagon, UserPlus, CreditCard,
    Target, Zap, Timer
} from 'lucide-react';

// ============================================================================
// 1. DATOS MAESTROS INDUSTRIALES (FUENTES DE VERDAD)
// ============================================================================
const ROLES = { ADMIN: 'Gerencia_Total', STAFF: 'Supervisor_Planta' };

const FAMILIAS = {
    F: { id: 'F', nombre: 'Panificados Fermentados', color: 'bg-orange-600', border: 'border-orange-600' },
    A: { id: 'A', nombre: 'Batidos (Químicos)', color: 'bg-blue-600', border: 'border-blue-600' },
    B: { id: 'B', nombre: 'Ensamblados/Almuerzo', color: 'bg-emerald-600', border: 'border-emerald-600' },
    C: { id: 'C', nombre: 'Pastelería/Decorados', color: 'bg-purple-600', border: 'border-purple-600' },
    D: { id: 'D', nombre: 'Laminados/Hojaldres', color: 'bg-amber-600', border: 'border-amber-600' },
    E: { id: 'E', nombre: 'Secos y Galletería', color: 'bg-slate-600', border: 'border-slate-600' }
};

const INITIAL_PROVIDERS = [
    { id: 'p1', codigo: 'PRV-001', nombre: 'Molino Cañuelas', cuit: '30-12345678-1', rubro: 'Harinas' },
    { id: 'p2', codigo: 'PRV-002', nombre: 'Lácteos La Serenísima', cuit: '30-87654321-2', rubro: 'Lácteos' }
];

const INITIAL_STAFF = [
    { id: 'e1', name: 'Carlos Díaz', dni: '32.455.667', phone: '11-4455-6677', role: 'Maestro Panadero', tasks: 'Amasado, Control de Fermentación', shift: 'Mañana', schedule: '06:00 - 14:00', paymentMethod: 'Mensual', restDay: 'Domingo' },
    { id: 'e2', name: 'María Gómez', dni: '35.122.334', phone: '11-5566-7788', role: 'Ayudante de Pastelería', tasks: 'Decoración, Rellenos', shift: 'Mañana', schedule: '07:00 - 15:00', paymentMethod: 'Quincenal', restDay: 'Lunes' }
];

const INITIAL_INGREDIENTS = [
    { id: 'i1', codigo: 'RAW-HAR-001', name: 'Harina 000 (Fuerza)', unidad_compra: 'Bolsa 25kg', factor_conversion: 25000, costo_estandar: 0.8 },
    { id: 'i3', codigo: 'RAW-OTR-001', name: 'Agua Filtrada', unidad_compra: 'Litros', factor_conversion: 1000, costo_estandar: 0.05 },
    { id: 'wip_F1', codigo: 'WIP-F-001', name: '[WIP] Masa Madre Activa', unidad_compra: 'Gramos', factor_conversion: 1, es_subensamble: true, costo_estandar: 1.5 }
];

const INITIAL_RECIPES = [
    { id: 'r1', codigo: 'FG-F-001', nombre_producto: 'Baguette Francesa Estándar', familia: 'F', version: 1, merma: 18, horas_hombre: 1.5, costo_empaque: 0, formato_venta: 'Unidad', peso_unidad: 250, peso_final: 1420, details: [{ ingredientId: 'i1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i3', porcentaje: 65, gramos: 650 }] }
];

const INITIAL_ORDERS = [
    { id: 'OP-17084', recipeId: 'r1', targetAmount: 500, status: 'TERMINADO', realAmount: 485, realTime: 1.8, date: '2026-02-20' },
    { id: 'OP-17085', recipeId: 'r1', targetAmount: 300, status: 'PESAJE', realAmount: 0, realTime: 0, date: '2026-02-21' }
];

const INITIAL_LOTS = [
    { id: 'L-H00-CAÑ', ingredientId: 'i1', providerId: 'p1', amount: 500000, expiry: '2026-12-01', ingreso: '2025-10-01' }
];

const INITIAL_CONFIG = {
    companyName: 'IMPERIO', appName: 'MES PRO V14', logo: '', address: 'Morón, Buenos Aires', phone: '11-4455-6677', taxId: '30-12345678-9',
    finanzas: { costoHoraHombre: 4500, margenGanancia: 120, costosIndirectosPct: 20 }
};

// ============================================================================
// 2. COMPONENTES ATÓMICOS DE UI
// ============================================================================
const Card = ({ children, className = "" }) => <div className={`border border-slate-200 rounded-xl shadow-sm overflow-hidden bg-white ${className}`}>{children}</div>;

const Button = ({ children, onClick, variant = 'primary', className = "", disabled = false, type = "button" }) => {
    const styles = {
        primary: "bg-slate-900 text-white hover:bg-black shadow-md",
        secondary: "bg-white text-slate-700 hover:bg-slate-50 border border-slate-300",
        success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
        accent: "bg-orange-600 text-white hover:bg-orange-700 shadow-sm",
        danger: "bg-red-50 text-red-600 hover:bg-red-100",
        ghost: "bg-transparent text-slate-500 hover:text-slate-900"
    };
    return <button disabled={disabled} type={type} onClick={onClick} className={`px-3 py-1.5 rounded-md font-bold uppercase tracking-wider text-[10px] transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-95 ${styles[variant]} ${className}`}>{children}</button>;
};

const Input = ({ label, type = "text", value, onChange, placeholder, required = false, disabled = false, suffix = null }) => (
    <div className="flex flex-col gap-1 w-full text-left">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label} {required && "*"}</label>
        <div className="relative">
            <input type={type} value={value} required={required} disabled={disabled} onChange={(e) => onChange ? onChange(e.target.value) : null} placeholder={placeholder} className={`w-full border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 text-sm font-semibold text-slate-800 transition-all shadow-sm ${disabled ? 'opacity-60 bg-slate-100 cursor-not-allowed text-slate-500' : ''}`} />
            {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{suffix}</span>}
        </div>
    </div>
);

const Select = ({ label, value, onChange, required = false, children, disabled = false }) => (
    <div className="flex flex-col gap-1 w-full text-left">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label} {required && "*"}</label>
        <select value={value} required={required} disabled={disabled} onChange={(e) => onChange ? onChange(e.target.value) : null} className={`border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 text-sm font-semibold text-slate-800 transition-all shadow-sm cursor-pointer ${disabled ? 'opacity-60 bg-slate-100 cursor-not-allowed text-slate-500' : ''}`}>{children}</select>
    </div>
);

const Toast = ({ message, type = 'success', onClose }) => {
    if (!message) return null;
    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border ${type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                {type === 'success' ? <CheckCircle2 className="text-emerald-500" /> : <AlertTriangle className="text-red-500" />}
                <p className="font-bold text-sm">{message}</p>
                <button onClick={onClose} className="ml-4 text-slate-400 hover:text-slate-700"><XCircle size={18} /></button>
            </div>
        </div>
    );
};

// ============================================================================
// 3. APLICACIÓN PRINCIPAL (APP)
// ============================================================================
export default function App() {
    const [currentRole, setCurrentRole] = useState(ROLES.ADMIN);
    const [activeView, setActiveView] = useState('dashboard');

    const [ingredients, setIngredients] = useState(INITIAL_INGREDIENTS);
    const [recipes, setRecipes] = useState(INITIAL_RECIPES);
    const [providers, setProviders] = useState(INITIAL_PROVIDERS);
    const [lots, setLots] = useState(INITIAL_LOTS);
    const [orders, setOrders] = useState(INITIAL_ORDERS);
    const [staff, setStaff] = useState(INITIAL_STAFF);
    const [config, setConfig] = useState(INITIAL_CONFIG);
    const [toastMsg, setToastMsg] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToastMsg({ msg, type });
        setTimeout(() => setToastMsg(null), 4000);
    };

    const menuItems = [
        { id: 'dashboard', label: 'Monitor Central', icon: <TrendingDown size={18} /> },
        { id: 'inventory', label: 'Inventario (Lotes)', icon: <Package size={18} /> },
        { id: 'orders', label: 'Producción Activa', icon: <ClipboardList size={18} /> },
        { id: 'engineering', label: 'Ingeniería BOM', icon: <Layers size={18} /> },
        { id: 'hr_oee', label: 'Personal & Eficiencia', icon: <Activity size={18} /> },
        { id: 'traceability', label: 'Trazabilidad HACCP', icon: <GitMerge size={18} /> },
        { id: 'settings', label: 'Configuración', icon: <Settings size={18} /> },
    ];

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden text-left">
            <Toast message={toastMsg?.msg} type={toastMsg?.type} onClose={() => setToastMsg(null)} />

            <aside className="w-64 bg-slate-950 text-white flex flex-col shrink-0 shadow-2xl z-10 border-r border-slate-900 print:hidden">
                <div className="p-6 border-b border-slate-900">
                    <div className="flex items-center gap-3 mb-6">
                        {config.logo ? <img src={config.logo} alt="Logo" className="w-10 h-10 object-contain rounded-xl bg-white p-1" /> : <div className="bg-orange-600 p-2 rounded-xl text-white"><Factory size={20} /></div>}
                        <div className="overflow-hidden">
                            <h1 className="text-xl font-black italic uppercase leading-none tracking-tighter truncate">{config.companyName}</h1>
                            <p className="text-orange-500 text-[9px] font-black uppercase mt-1 leading-none tracking-widest italic truncate">MES PRO V14</p>
                        </div>
                    </div>
                    <select className="w-full bg-slate-900 border-2 border-slate-800 rounded-xl p-2.5 text-[10px] font-black uppercase text-orange-400 outline-none cursor-pointer" value={currentRole} onChange={(e) => setCurrentRole(e.target.value)}>
                        <option value={ROLES.ADMIN}>GERENCIA GENERAL</option><option value={ROLES.STAFF}>SUPERVISIÓN PLANTA</option>
                    </select>
                </div>
                <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto custom-scrollbar">
                    {menuItems.map(item => (
                        <button key={item.id} onClick={() => setActiveView(item.id)} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all font-black text-[10px] uppercase tracking-wider ${activeView === item.id ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-900 hover:text-slate-200'}`}>
                            {item.icon} {item.label}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-slate-900 text-center opacity-40">
                    <p className="text-[8px] font-mono tracking-widest uppercase">Modo: Local Memory</p>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto p-8 relative bg-slate-50 print:p-0 print:bg-white">
                <header className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4 print:hidden">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase italic leading-none tracking-tight">{menuItems.find(m => m.id === activeView)?.label}</h2>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1.5 leading-none italic">Sistema Integral de Manufactura Panadera</p>
                    </div>
                </header>

                {activeView === 'dashboard' && <DashboardView recipes={recipes} ingredients={ingredients} lots={lots} orders={orders} />}
                {activeView === 'hr_oee' && <HROeeView staff={staff} setStaff={setStaff} orders={orders} recipes={recipes} showToast={showToast} />}
                {activeView === 'inventory' && <InventoryView ingredients={ingredients} lots={lots} providers={providers} />}
                {activeView === 'engineering' && <EngineeringView recipes={recipes} ingredients={ingredients} config={config} />}
                {activeView === 'traceability' && <TraceabilityView lots={lots} ingredients={ingredients} providers={providers} orders={orders} recipes={recipes} />}
                {activeView === 'settings' && <SettingsView config={config} setConfig={setConfig} showToast={showToast} />}
                {activeView === 'orders' && <ProductionOrdersView recipes={recipes} ingredients={ingredients} lots={lots} orders={orders} setOrders={setOrders} showToast={showToast} />}
            </main>
        </div>
    );
}

// ============================================================================
// 4. VISTA: MONITOR CENTRAL
// ============================================================================
function DashboardView({ recipes, ingredients, lots, orders }) {
    const stockValue = useMemo(() => lots.reduce((acc, l) => acc + (l.amount * 0.8), 0), [lots]);
    return (
        <div className="space-y-6 animate-in fade-in duration-500 text-left">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-slate-900 text-white p-4 relative overflow-hidden flex flex-col justify-center min-h-[85px] shadow-sm">
                    <div className="absolute -right-2 -top-1 opacity-10"><ClipboardList size={54} /></div>
                    <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-0.5">Pedidos Hoy</p>
                    <h3 className="text-2xl font-black italic leading-none">{orders.length}</h3>
                </Card>
                <Card className="bg-emerald-700 text-white p-4 relative overflow-hidden flex flex-col justify-center min-h-[85px] shadow-sm">
                    <div className="absolute -right-2 -top-1 opacity-10"><Coins size={54} /></div>
                    <p className="text-[8px] font-black uppercase text-emerald-400 tracking-widest mb-0.5">Valor Stock</p>
                    <h3 className="text-2xl font-black italic leading-none">${stockValue.toLocaleString('es-AR')}</h3>
                </Card>
                <Card className="bg-rose-700 text-white p-4 relative overflow-hidden flex flex-col justify-center min-h-[85px] shadow-sm">
                    <div className="absolute -right-2 -top-1 opacity-10"><AlertTriangle size={54} /></div>
                    <p className="text-[8px] font-black uppercase text-rose-400 tracking-widest mb-0.5">Pérdida Mermas</p>
                    <h3 className="text-2xl font-black italic leading-none">-$144K</h3>
                </Card>
                <Card className="bg-blue-700 text-white p-4 relative overflow-hidden flex flex-col justify-center min-h-[85px] shadow-sm">
                    <div className="absolute -right-2 -top-1 opacity-10"><Truck size={54} /></div>
                    <p className="text-[8px] font-black uppercase text-blue-400 tracking-widest mb-0.5">Despachos</p>
                    <h3 className="text-2xl font-black italic leading-none">0</h3>
                </Card>
            </div>
            <Card className="w-full border-t-4 border-orange-500 bg-white shadow-sm p-4 text-center">
                <p className="text-[10px] font-black uppercase text-slate-400 italic tracking-[0.2em]">Auditoría de Insumos Críticos en Tiempo Real</p>
                <div className="bg-slate-900 text-white p-3 rounded-xl mt-4 flex justify-between items-center max-w-2xl mx-auto shadow-lg">
                    <span className="text-[9px] font-black uppercase opacity-60">Pérdida Total del Periodo Evaluado</span>
                    <span className="text-lg font-black font-mono text-rose-400">-$538.000</span>
                </div>
            </Card>
        </div>
    );
}

// ============================================================================
// 5. VISTA: RRHH & EFICIENCIA (MAESTRO DE PERSONAL)
// ============================================================================
function HROeeView({ staff, setStaff, orders, recipes, showToast }) {
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // KPIs DINÁMICOS GERENCIALES
    const terminadas = orders.filter(o => o.status === 'TERMINADO');
    const totalTargetKg = terminadas.reduce((acc, o) => acc + (o.targetAmount * (recipes.find(r => r.id === o.recipeId)?.peso_unidad || 1000) / 1000), 0);
    const totalRealKg = terminadas.reduce((acc, o) => acc + (Number(o.realAmount || 0) * (recipes.find(r => r.id === o.recipeId)?.peso_unidad || 1000) / 1000), 0);
    const totalHours = terminadas.reduce((acc, o) => acc + Number(o.realTime || 0), 0);

    const eficacia = totalTargetKg > 0 ? (totalRealKg / totalTargetKg) * 100 : 100;
    const eficiencia = totalHours > 0 ? (totalRealKg / totalHours) : 0;

    const handleSaveStaff = (e) => {
        e.preventDefault();
        if (selectedStaff.id) {
            setStaff(staff.map(s => s.id === selectedStaff.id ? selectedStaff : s));
            showToast("Ficha técnica actualizada");
        } else {
            setStaff([...staff, { ...selectedStaff, id: `e${Date.now()}` }]);
            showToast("Nuevo colaborador registrado");
        }
        setIsEditing(false); setSelectedStaff(null);
    };

    const filteredStaff = staff.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.role.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-6 animate-in fade-in text-left">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-900 text-white p-4 relative border-t-4 border-orange-500 min-h-[90px] flex flex-col justify-center">
                    <div className="absolute -right-2 -top-1 opacity-10"><Target size={60} /></div>
                    <p className="text-[9px] font-black uppercase text-orange-500 tracking-widest mb-0.5 leading-none">Eficacia Operativa</p>
                    <h3 className="text-3xl font-black italic leading-none">{eficacia.toFixed(1)}%</h3>
                    <p className="text-[7px] text-slate-400 uppercase mt-2 font-bold tracking-wider">Kg Real vs Meta Pedido</p>
                </Card>
                <Card className="bg-slate-900 text-white p-4 relative border-t-4 border-blue-500 min-h-[90px] flex flex-col justify-center">
                    <div className="absolute -right-2 -top-1 opacity-10"><Zap size={60} /></div>
                    <p className="text-[9px] font-black uppercase text-blue-500 tracking-widest mb-0.5 leading-none">Eficiencia Planta</p>
                    <h3 className="text-3xl font-black italic leading-none">{eficiencia.toFixed(2)} <span className="text-xs font-sans">Kg/H</span></h3>
                    <p className="text-[7px] text-slate-400 uppercase mt-2 font-bold tracking-wider">Kg por Hora Hombre</p>
                </Card>
                <Card className="bg-white p-4 border-t-4 border-slate-900 min-h-[90px] flex flex-col justify-center shadow-sm">
                    <div className="absolute -right-2 -top-1 opacity-5"><Users size={60} /></div>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-0.5 leading-none">Personal Activo</p>
                    <h3 className="text-3xl font-black italic text-slate-800 leading-none">{staff.length}</h3>
                    <p className="text-[7px] text-slate-500 uppercase mt-2 font-bold tracking-wider">Cuerpo Técnico en Turno</p>
                </Card>
            </div>

            <Card className="shadow-lg border-none bg-white">
                <div className="p-3 border-b bg-slate-50/50 flex justify-between items-center">
                    <h4 className="text-sm font-black uppercase italic text-slate-800 flex items-center gap-2"><Users size={18} /> Maestro de Personal</h4>
                    <div className="flex gap-2">
                        <input type="text" placeholder="Filtrar por nombre..." className="pl-3 pr-4 py-1.5 border rounded-lg text-[10px] font-bold outline-none w-56 focus:border-orange-500 shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        <Button variant="accent" onClick={() => { setSelectedStaff({ name: '', dni: '', phone: '', role: '', tasks: '', shift: 'Mañana', schedule: '', paymentMethod: 'Mensual', restDay: 'Domingo' }); setIsEditing(true); }}><UserPlus size={14} /> Alta Personal</Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900 text-white text-[8px] uppercase tracking-widest font-black italic">
                            <tr><th className="px-4 py-2 font-black">Empleado</th><th className="px-4 py-2 font-black">Puesto</th><th className="px-4 py-2 text-center font-black">Horario</th><th className="px-4 py-2 text-center font-black">Cobro</th><th className="px-4 py-2 text-center font-black">Descanso</th><th className="px-4 py-2 text-center font-black w-20">Ficha</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700 bg-white">
                            {filteredStaff.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-4 py-1.5"><p className="uppercase text-slate-900 leading-tight">{s.name}</p><p className="text-[8px] font-mono text-slate-400">DNI: {s.dni}</p></td>
                                    <td className="px-4 py-1.5 uppercase text-blue-600 text-[10px] leading-tight">{s.role}</td>
                                    <td className="px-4 py-1.5 text-center leading-tight"><div>{s.shift}</div><div className="text-[9px] text-slate-400 font-mono italic mt-1">{s.schedule}</div></td>
                                    <td className="px-4 py-1.5 text-center"><span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded text-[9px] uppercase font-black">{s.paymentMethod}</span></td>
                                    <td className="px-4 py-1.5 text-center uppercase text-orange-600 font-black text-[9px]">{s.restDay}</td>
                                    <td className="px-4 py-1.5 text-center">
                                        <button onClick={() => { setSelectedStaff(s); setIsEditing(true); }} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-md transition-all"><Eye size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isEditing && selectedStaff && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-8 z-50 animate-in fade-in">
                    <Card className="max-w-4xl w-full p-8 border-[6px] border-slate-900 relative bg-white shadow-2xl overflow-y-auto max-h-[90vh]">
                        <button onClick={() => setIsEditing(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-800 transition-colors"><XCircle size={24} /></button>
                        <h3 className="text-2xl font-black uppercase italic mb-8 border-b pb-4 flex items-center gap-3"><UserPlus size={28} className="text-orange-500" /> Ficha Técnica del Colaborador</h3>
                        <form onSubmit={handleSaveStaff} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Input label="Nombre y Apellido" value={selectedStaff.name} onChange={v => setSelectedStaff({ ...selectedStaff, name: v })} required />
                                <Input label="Documento (DNI)" value={selectedStaff.dni} onChange={v => setSelectedStaff({ ...selectedStaff, dni: v })} required />
                                <Input label="WhatsApp / Teléfono" value={selectedStaff.phone} onChange={v => setSelectedStaff({ ...selectedStaff, phone: v })} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input label="Cargo / Puesto de Planta" value={selectedStaff.role} onChange={v => setSelectedStaff({ ...selectedStaff, role: v })} required />
                                <Input label="Tareas y Responsabilidades" value={selectedStaff.tasks} onChange={v => setSelectedStaff({ ...selectedStaff, tasks: v })} placeholder="Ej: Amasado, Pesado, Horneado..." />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 bg-slate-50 p-6 rounded-2xl border">
                                <Select label="Turno Asignado" value={selectedStaff.shift} onChange={v => setSelectedStaff({ ...selectedStaff, shift: v })}>
                                    <option value="Mañana">Turno Mañana</option><option value="Tarde">Turno Tarde</option><option value="Noche">Turno Noche</option><option value="Rotativo">Turno Rotativo</option>
                                </Select>
                                <Input label="Horario de Turno" value={selectedStaff.schedule} onChange={v => setSelectedStaff({ ...selectedStaff, schedule: v })} placeholder="Ej: 06:00 a 14:00" />
                                <Select label="Día de Descanso" value={selectedStaff.restDay} onChange={v => setSelectedStaff({ ...selectedStaff, restDay: v })}>
                                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => <option key={d} value={d}>{d}</option>)}
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-6 items-end">
                                <Select label="Frecuencia de Cobro" value={selectedStaff.paymentMethod} onChange={v => setSelectedStaff({ ...selectedStaff, paymentMethod: v })}>
                                    <option value="Diario">Pago Diario</option><option value="Semanal">Pago Semanal</option><option value="Quincenal">Pago Quincenal</option><option value="Mensual">Pago Mensual</option>
                                </Select>
                                <div className="flex items-center gap-3 p-4 bg-emerald-50 border-2 border-dashed border-emerald-200 rounded-xl">
                                    <CreditCard className="text-emerald-500" size={24} />
                                    <p className="text-[9px] font-black uppercase text-emerald-800 italic">Reportes de nómina sincronizados con frecuencia administrativa</p>
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4 border-t border-slate-100">
                                <Button type="submit" variant="success" className="flex-1 py-4 text-sm font-black uppercase shadow-lg">Actualizar Legajo Digital</Button>
                                <Button variant="secondary" onClick={() => setIsEditing(false)} className="px-10 font-black uppercase">Cancelar</Button>
                                {selectedStaff.id && <Button variant="danger" onClick={() => { if (confirm("¿Eliminar empleado?")) { setStaff(staff.filter(s => s.id !== selectedStaff.id)); setIsEditing(false); } }}><Trash2 size={16} /></Button>}
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// 6. VISTA: INGENIERÍA (TABLA EXPANDIBLE)
// ============================================================================
function EngineeringView({ recipes, ingredients, config }) {
    const [expanded, setExpanded] = useState({});
    const toggleRow = (id) => { setExpanded(prev => ({ ...prev, [id]: !prev[id] })); };

    return (
        <div className="space-y-4 animate-in fade-in text-left">
            <Card className="overflow-hidden border-2 bg-white shadow-sm">
                <table className="w-full text-left font-bold text-xs uppercase text-slate-700">
                    <thead className="bg-slate-900 text-white text-[8px] tracking-widest font-black italic">
                        <tr><th className="px-4 py-3">SKU / Producto / WIP</th><th className="px-4 py-3 text-center">Familia</th><th className="px-4 py-3 text-center">Rinde Final</th><th className="px-4 py-3 text-right">Costo Unid.</th><th className="px-4 py-3 text-center w-28">Auditoría</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-[11px]">
                        {recipes.map(r => {
                            const isExp = !!expanded[r.id];
                            const costo_mp = r.details?.reduce((acc, d) => acc + (Number(d.gramos) * (ingredients.find(i => i.id === d.ingredientId)?.costo_estandar || 0)), 0) || 0;
                            const totalBatch = costo_mp + (r.horas_hombre * config.finanzas.costoHoraHombre);
                            const costUnid = totalBatch / (r.peso_final / (r.peso_unidad || 1000));
                            return (
                                <React.Fragment key={r.id}>
                                    <tr className={`hover:bg-slate-50 transition-colors group ${isExp ? 'bg-slate-50' : ''}`}>
                                        <td className="px-4 py-2 font-black text-slate-900 uppercase">{r.nombre_producto}<span className="text-[8px] font-mono text-slate-400 block lowercase italic mt-1">{r.codigo}</span></td>
                                        <td className="px-4 py-2 text-center"><span className={`px-2 py-0.5 rounded text-[8px] text-white ${FAMILIAS[r.familia]?.color}`}>{FAMILIAS[r.familia]?.id}</span></td>
                                        <td className="px-4 py-2 text-center font-mono text-slate-800">{r.peso_final}g</td>
                                        <td className="px-4 py-2 text-right font-mono font-black text-slate-900">${costUnid.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-center"><button onClick={() => toggleRow(r.id)} className="p-1.5 text-slate-400 hover:text-slate-900 transition-all">{isExp ? <ChevronUp size={18} /> : <Eye size={18} />}</button></td>
                                    </tr>
                                    {isExp && (
                                        <tr className="bg-slate-50/50 shadow-inner">
                                            <td colSpan="5" className="p-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                                                    <div className="bg-white border-2 p-4 rounded-xl shadow-md"><h5 className="font-black text-[9px] uppercase text-slate-400 mb-3 border-b pb-1 italic">Routing BOM (Componentes)</h5>{r.details.map((d, idx) => (<div key={idx} className="flex justify-between py-2 text-[10px] border-b border-slate-50 last:border-0 uppercase font-black"><span>{ingredients.find(i => i.id === d.ingredientId)?.name}</span><span className="font-mono text-blue-600">{d.gramos}g</span></div>))}</div>
                                                    <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md"><h5 className="font-black text-[9px] uppercase text-orange-500 mb-3 border-b border-slate-800 pb-1 italic text-left">Análisis Operativo</h5><div className="space-y-3 text-[10px] uppercase font-bold"><div className="flex justify-between text-slate-400"><span>Hs Hombre</span><span>{r.horas_hombre} h</span></div><div className="flex justify-between text-slate-400"><span>Factor Merma Planta</span><span>{r.merma}%</span></div><div className="flex justify-between pt-3 mt-3 border-t border-slate-800 font-black text-emerald-400 text-sm italic uppercase"><span>Markup Sugerido</span><span>{config.finanzas.margenGanancia}%</span></div></div></div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </Card>
        </div>
    );
}

// ============================================================================
// 7. VISTAS: INVENTARIO, TRAZABILIDAD Y CONFIG (RESTURADAS)
// ============================================================================
function InventoryView({ ingredients, lots, providers }) {
    const [searchTerm, setSearchTerm] = useState('');
    return (
        <div className="space-y-4 animate-in fade-in text-left">
            <div className="flex justify-between items-end bg-white p-4 rounded-xl border shadow-sm font-black italic"><h3 className="text-xl uppercase text-slate-800 leading-tight">Libro Mayor de Lotes</h3><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input type="text" placeholder="ID Lote o SKU..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs font-bold w-64 outline-none focus:border-blue-500 bg-slate-50 transition-all shadow-sm" /></div></div>
            <Card className="overflow-hidden border-2 bg-white shadow-md">
                <table className="w-full text-left text-[11px] font-bold text-slate-700"><thead className="bg-slate-900 text-white text-[8px] uppercase tracking-widest font-black italic"><tr><th className="px-4 py-3">Código Lote</th><th className="px-4 py-3">Insumo</th><th className="px-4 py-3">Vencimiento</th><th className="px-4 py-3 text-right">Existencia Fís.</th></tr></thead>
                    <tbody className="divide-y divide-slate-100 bg-white">{lots.filter(l => l.id.toLowerCase().includes(searchTerm.toLowerCase()) || ingredients.find(i => i.id === l.ingredientId)?.name.toLowerCase().includes(searchTerm.toLowerCase())).map(l => (<tr key={l.id} className="hover:bg-slate-50 transition-colors"><td className="px-4 py-2 font-mono text-blue-600 uppercase italic">[{l.id}]</td><td className="px-4 py-2 uppercase leading-none">{ingredients.find(i => i.id === l.ingredientId)?.name}</td><td className="px-4 py-2 text-orange-600 font-mono italic">{l.expiry}</td><td className="px-4 py-2 text-right font-mono text-slate-900 font-black italic">{l.amount / 1000} Kg</td></tr>))}</tbody>
                </table>
            </Card>
        </div>
    );
}

function TraceabilityView({ lots, ingredients, providers }) {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState(null);
    const trace = (e) => {
        e.preventDefault();
        const lot = lots.find(l => l.id.toLowerCase() === query.toLowerCase());
        setResult(lot ? { lot, ing: ingredients.find(i => i.id === lot.ingredientId), prov: providers.find(p => p.id === lot.providerId) } : 'NOT_FOUND');
    };
    return (
        <div className="space-y-6 animate-in fade-in text-left max-w-4xl mx-auto">
            <Card className="p-6 border-t-8 border-slate-900 bg-white shadow-xl"><h4 className="text-xl font-black uppercase italic mb-6 border-b pb-4 flex items-center gap-3 text-slate-800"><GitMerge className="text-slate-400" size={24} /> Forward / Backward Traceability</h4><form onSubmit={trace} className="flex gap-4 items-end bg-slate-50 p-6 rounded-2xl border border-slate-200"><div className="flex-1"><Input label="Ingresar Lote Exacto (Auditoría HACCP)" placeholder="Ej: L-H00-CAÑ" value={query} onChange={setQuery} required /></div><Button onClick={trace} type="submit" variant="primary" className="h-[38px] px-8 shadow-md uppercase font-black italic">Rastrear</Button></form></Card>
            {result === 'NOT_FOUND' && <div className="p-10 bg-red-50 text-red-600 rounded-2xl border-2 border-dashed border-red-200 text-center font-black uppercase italic animate-pulse tracking-widest">Lote No Registrado</div>}
            {result && result !== 'NOT_FOUND' && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4 relative">
                    <div className="absolute left-6 top-6 bottom-6 w-1 bg-slate-200 z-0"></div>
                    <div className="flex items-start gap-4 relative z-10"><div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center border-4 border-white shadow-lg shrink-0"><Briefcase size={24} /></div><Card className="flex-1 p-5 border-l-4 border-l-slate-900 shadow-md"><div><p className="text-[9px] font-black uppercase text-slate-400 mb-1 leading-none tracking-widest font-black italic">Procedencia (Ingreso)</p><h5 className="text-base font-black uppercase italic text-slate-800 leading-none">{result.prov?.nombre || 'Producción Interna / WIP'}</h5><p className="text-[10px] font-bold text-slate-400 mt-2 uppercase font-mono">FECHA INGRESO: {result.lot.ingreso}</p></div></Card></div>
                    <div className="flex items-start gap-4 relative z-10"><div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center border-4 border-white shadow-lg shrink-0"><Package size={24} /></div><Card className="flex-1 p-5 border-l-4 border-l-emerald-500 shadow-md text-left"><p className="text-[9px] font-black uppercase text-emerald-600 mb-1 leading-none font-black tracking-widest italic">Componente Detectado</p><h5 className="text-base font-black uppercase italic text-slate-800 leading-none">{result.ing?.name}</h5><p className="text-[10px] font-mono text-orange-600 font-bold mt-2 uppercase">Existencia Real: {result.lot.amount / 1000} Kg</p></Card></div>
                </div>
            )}
        </div>
    );
}

function SettingsView({ config, setConfig, showToast }) {
    const [form, setForm] = useState(config);
    const handleLogo = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setForm({ ...form, logo: reader.result }); reader.readAsDataURL(file); } };
    return (
        <div className="space-y-6 animate-in fade-in max-w-4xl text-left mx-auto">
            <Card className="p-6 border-t-8 border-slate-900 bg-white shadow-xl">
                <h4 className="text-xl font-black uppercase italic mb-8 border-b pb-4 flex items-center gap-3 text-slate-800"><Building className="text-slate-300" size={24} /> Identidad de Empresa</h4>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                    <div className="md:col-span-3 flex flex-col items-center gap-3">
                        <div className="w-32 h-32 rounded-3xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden relative group transition-all shadow-inner">
                            {form.logo ? <img src={form.logo} alt="Logo" className="w-full h-full object-contain" /> : <Building className="text-slate-200" size={48} />}
                            <label className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"><Upload size={24} /><span className="text-[8px] font-black uppercase mt-1">Cargar Logo</span><input type="file" className="hidden" accept="image/*" onChange={handleLogo} /></label>
                        </div>
                        {form.logo && <button onClick={() => setForm({ ...form, logo: '' })} className="text-[8px] font-black text-red-500 uppercase hover:underline italic">Remover Imagen</button>}
                    </div>
                    <div className="md:col-span-9 grid grid-cols-2 gap-4">
                        <Input label="Marca Comercial" value={form.companyName} onChange={v => setForm({ ...form, companyName: v })} />
                        <Input label="DNI / CUIT / Razón Social" value={form.taxId} onChange={v => setForm({ ...form, taxId: v })} />
                        <Input label="Domicilio Fiscal" value={form.address} onChange={v => setForm({ ...form, address: v })} />
                        <Input label="Teléfono Central" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
                    </div>
                </div>
                <div className="mt-8 border-t pt-4 flex justify-end"><Button onClick={() => { setConfig(form); showToast("Perfil Sincronizado"); }} variant="success" className="px-16 py-4 shadow-xl font-black uppercase italic tracking-widest text-sm">Guardar Configuración General</Button></div>
            </Card>
        </div>
    );
}

function ProductionOrdersView({ recipes, ingredients, lots, orders, setOrders, showToast }) {
    const [form, setForm] = useState({ recipeId: '', amount: '' });
    const [selectedOrder, setSelectedOrder] = useState(null);

    const createOrder = (e) => {
        e.preventDefault();
        if (!form.recipeId || !form.amount) return;
        const newOrder = { id: `OP-${Math.floor(Math.random() * 10000)}`, recipeId: form.recipeId, targetAmount: Number(form.amount), status: 'PLANIFICADA' };
        setOrders([...orders, newOrder]);
        setForm({ recipeId: '', amount: '' });
        showToast("Orden Generada");
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
                <div className="space-y-6">
                    <Card className="p-6">
                        <h4 className="text-sm font-black uppercase mb-4 italic text-slate-800">Crear Nueva Orden</h4>
                        <form onSubmit={createOrder} className="space-y-4">
                            <div className="flex flex-col gap-1 text-left"><label className="text-[10px] font-black text-slate-400 uppercase">Ficha Técnica</label><select className="border border-slate-200 rounded-lg p-2 text-xs font-bold bg-slate-50 outline-none" value={form.recipeId} onChange={e => setForm({ ...form, recipeId: e.target.value })} required><option value="">Seleccionar...</option>{recipes.map(r => <option key={r.id} value={r.id}>{r.nombre_producto}</option>)}</select></div>
                            <Input label="Unidades Meta" type="number" value={form.amount} onChange={v => setForm({ ...form, amount: v })} required /><Button type="submit" variant="primary" className="w-full">Generar Orden</Button>
                        </form>
                    </Card>
                </div>
                <Card className="lg:col-span-2 p-10 flex flex-col items-center justify-center text-slate-300 italic border-4 border-dashed rounded-3xl"><p className="text-xl font-black uppercase tracking-widest">Módulo de Producción Activo</p></Card>
            </div>
        </div>
    );
}