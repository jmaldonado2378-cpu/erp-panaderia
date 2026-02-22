'use client';
import React, { useState, useMemo } from 'react';
import {
    TrendingDown, Package, Layers, ShieldCheck, Settings, Plus, Trash2, Coins, Factory, Briefcase,
    Warehouse, ThermometerSun, ArrowRight, Truck, Layout, Clock, ClipboardList, Printer, QrCode,
    Square, MapPin, AlertTriangle, Hash, Search, Calendar, Wrench, Building, Store, CheckCircle2,
    XCircle, Calculator, DollarSign, PieChart, RotateCcw, ChevronDown, ChevronUp, Eye, Upload,
    GitMerge, Activity, Users, AlertOctagon, UserPlus, CreditCard, Target, Zap
} from 'lucide-react';

// ============================================================================
// 1. CONSTANTES Y DATOS MAESTROS
// ============================================================================
const ROLES = { ADMIN: 'Gerencia_Total', STAFF: 'Supervisor_Planta' };

const FAMILIAS = {
    F: { id: 'F', nombre: 'Panificados', color: 'bg-orange-600', border: 'border-orange-600' },
    A: { id: 'A', nombre: 'Batidos', color: 'bg-blue-600', border: 'border-blue-600' },
    B: { id: 'B', nombre: 'Ensamblados', color: 'bg-emerald-600', border: 'border-emerald-600' },
    C: { id: 'C', nombre: 'Pastelería', color: 'bg-purple-600', border: 'border-purple-600' },
    D: { id: 'D', nombre: 'Hojaldres', color: 'bg-amber-600', border: 'border-amber-600' },
    E: { id: 'E', nombre: 'Secos', color: 'bg-slate-600', border: 'border-slate-600' }
};

const INITIAL_PROVIDERS = [
    { id: 'p1', nombre: 'Molino Cañuelas', cuit: '30-12345678-1', rubro: 'Harinas' },
    { id: 'p2', nombre: 'Lácteos La Serenísima', cuit: '30-87654321-2', rubro: 'Lácteos' }
];

const INITIAL_STAFF = [
    { id: 'e1', name: 'Carlos Díaz', dni: '32.455.667', phone: '11-4455-6677', role: 'Maestro Panadero', tasks: 'Amasado, Control de Fermentación', shift: 'Mañana', schedule: '06:00 - 14:00', paymentMethod: 'Mensual', restDay: 'Domingo' },
    { id: 'e2', name: 'María Gómez', dni: '35.122.334', phone: '11-5566-7788', role: 'Ayudante de Pastelería', tasks: 'Decoración, Rellenos', shift: 'Mañana', schedule: '07:00 - 15:00', paymentMethod: 'Quincenal', restDay: 'Lunes' }
];

const INITIAL_INGREDIENTS = [
    { id: 'i1', name: 'Harina 000', unidad: 'Bolsa 25kg', costo: 0.8 },
    { id: 'i2', name: 'Agua Filtrada', unidad: 'Litros', costo: 0.05 },
    { id: 'wip1', name: '[WIP] Masa Madre', unidad: 'Gramos', es_subensamble: true, costo: 1.5 }
];

const INITIAL_RECIPES = [
    { id: 'r1', codigo: 'FG-F-001', nombre: 'Baguette Clásica', familia: 'F', merma: 15, peso_final: 1420, hours: 1.5, details: [{ id: 'i1', g: 1000 }, { id: 'i2', g: 650 }] }
];

const INITIAL_ORDERS = [
    { id: 'OP-17084', recipeId: 'r1', targetAmount: 500, status: 'TERMINADO', realAmount: 485, realTime: 1.8, date: '2026-02-20' },
    { id: 'OP-17085', recipeId: 'r1', targetAmount: 300, status: 'PESAJE', date: '2026-02-21' }
];

const INITIAL_LOTS = [
    { id: 'L-H00-CAÑ', ingredientId: 'i1', providerId: 'p1', amount: 500000, expiry: '2026-12-01', ingreso: '2025-10-01' }
];

// ============================================================================
// 2. COMPONENTES UI BASE
// ============================================================================
const Card = ({ children, className = "" }) => <div className={`border border-slate-200 rounded-xl shadow-sm overflow-hidden bg-white ${className}`}>{children}</div>;

const Button = ({ children, onClick, variant = 'primary', className = "" }) => {
    const styles = { primary: "bg-slate-900 text-white hover:bg-black", secondary: "bg-white text-slate-700 border", success: "bg-emerald-600 text-white", accent: "bg-orange-600 text-white" };
    return <button onClick={onClick} className={`px-3 py-1.5 rounded-md font-bold uppercase text-[10px] flex items-center justify-center gap-1.5 active:scale-95 transition-all ${styles[variant]} ${className}`}>{children}</button>;
};

const Input = ({ label, value, onChange, type = "text", placeholder }) => (
    <div className="flex flex-col gap-1 w-full text-left">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="border bg-slate-50 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-slate-900/5" />
    </div>
);

const Select = ({ label, value, onChange, children }) => (
    <div className="flex flex-col gap-1 w-full text-left">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <select value={value} onChange={e => onChange(e.target.value)} className="border bg-slate-50 rounded-lg px-3 py-2 text-sm font-semibold outline-none cursor-pointer">{children}</select>
    </div>
);

const Toast = ({ msg, type, onClose }) => msg && (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl bg-white border border-slate-200">
        {type === 'success' ? <CheckCircle2 className="text-emerald-500" /> : <AlertTriangle className="text-rose-500" />}
        <p className="font-bold text-sm text-slate-800">{msg}</p>
        <XCircle onClick={onClose} size={18} className="ml-4 cursor-pointer text-slate-300 hover:text-slate-600" />
    </div>
);

// ============================================================================
// 3. APLICACIÓN PRINCIPAL (ERP)
// ============================================================================
export default function App() {
    const [view, setView] = useState('dashboard');
    const [config, setConfig] = useState(INITIAL_CONFIG);
    const [staff, setStaff] = useState(INITIAL_STAFF);
    const [recipes, setRecipes] = useState(INITIAL_RECIPES);
    const [ingredients, setIngredients] = useState(INITIAL_INGREDIENTS);
    const [lots, setLots] = useState(INITIAL_LOTS);
    const [orders, setOrders] = useState(INITIAL_ORDERS);
    const [toastMsg, setToastMsg] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToastMsg({ msg, type });
        setTimeout(() => setToastMsg(null), 4000);
    };

    const menu = [
        { id: 'dashboard', label: 'Monitor Central', icon: <TrendingDown size={18} /> },
        { id: 'inventory', label: 'Inventario (Lotes)', icon: <Package size={18} /> },
        { id: 'engineering', label: 'Ingeniería BOM', icon: <Layers size={18} /> },
        { id: 'hr_oee', label: 'Personal & Eficiencia', icon: <Activity size={18} /> },
        { id: 'traceability', label: 'Trazabilidad HACCP', icon: <GitMerge size={18} /> },
        { id: 'settings', label: 'Configuración', icon: <Settings size={18} /> },
    ];

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden text-left">
            <Toast msg={toastMsg?.msg} type={toastMsg?.type} onClose={() => setToastMsg(null)} />

            <aside className="w-64 bg-slate-950 text-white flex flex-col shrink-0 shadow-2xl z-10 border-r border-slate-900 print:hidden text-left">
                <div className="p-6 border-b border-slate-900">
                    <div className="flex items-center gap-3 mb-6">
                        {config.logo ? <img src={config.logo} alt="L" className="w-10 h-10 object-contain rounded-xl bg-white p-1" /> : <div className="bg-orange-600 p-2 rounded-xl text-white"><Factory size={20} /></div>}
                        <div className="overflow-hidden">
                            <h1 className="text-xl font-black italic uppercase leading-none truncate">{config.companyName}</h1>
                            <p className="text-orange-500 text-[9px] font-black uppercase mt-1 leading-none italic">MES PRO V14</p>
                        </div>
                    </div>
                </div>
                <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto custom-scrollbar">
                    {menu.map(i => (
                        <button key={i.id} onClick={() => setView(i.id)} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all font-black text-[10px] uppercase tracking-wider ${view === i.id ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-900 hover:text-slate-200'}`}>
                            {i.icon} {i.label}
                        </button>
                    ))}
                </nav>
            </aside>

            <main className="flex-1 overflow-y-auto p-8 relative bg-slate-50 print:p-0 print:bg-white">
                <header className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4 print:hidden">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase italic leading-none tracking-tight">{menu.find(m => m.id === view)?.label}</h2>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1.5 italic">Sistema Integral de Manufactura Panadera</p>
                    </div>
                </header>

                {view === 'dashboard' && <Dashboard recipes={recipes} ingredients={ingredients} lots={lots} orders={orders} />}
                {view === 'hr_oee' && <HRView staff={staff} setStaff={setStaff} orders={orders} recipes={recipes} showToast={showToast} />}
                {view === 'engineering' && <Engineering recipes={recipes} ingredients={ingredients} config={config} />}
                {view === 'traceability' && <Traceability lots={lots} ingredients={ingredients} />}
                {view === 'inventory' && <InventoryView ingredients={ingredients} lots={lots} />}
                {view === 'settings' && <SettingsView config={config} setConfig={setConfig} showToast={showToast} />}
            </main>
        </div>
    );
}

// ============================================================================
// 4. VISTAS DEL SISTEMA
// ============================================================================

function Dashboard({ recipes, ingredients, lots, orders }) {
    const stockValue = useMemo(() => lots.reduce((acc, l) => acc + (l.amount * 0.8), 0), [lots]);
    return (
        <div className="space-y-6 animate-in fade-in text-left">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-slate-900 text-white p-4 relative overflow-hidden flex flex-col justify-center min-h-[85px] shadow-sm">
                    <div className="absolute -right-2 -top-1 opacity-10"><ClipboardList size={54} /></div>
                    <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-0.5">Pedidos Hoy</p>
                    <h3 className="text-2xl font-black italic">{orders.length}</h3>
                </Card>
                <Card className="bg-emerald-700 text-white p-4 relative overflow-hidden flex flex-col justify-center min-h-[85px] shadow-sm">
                    <div className="absolute -right-2 -top-1 opacity-10"><Coins size={54} /></div>
                    <p className="text-[8px] font-black uppercase text-emerald-400 tracking-widest mb-0.5">Valor Stock</p>
                    <h3 className="text-2xl font-black italic">${stockValue.toLocaleString('es-AR')}</h3>
                </Card>
                <Card className="bg-rose-700 text-white p-4 relative overflow-hidden flex flex-col justify-center min-h-[85px] shadow-sm">
                    <div className="absolute -right-2 -top-1 opacity-10"><AlertTriangle size={54} /></div>
                    <p className="text-[8px] font-black uppercase text-rose-400 tracking-widest mb-0.5">Mermas</p>
                    <h3 className="text-2xl font-black italic">-$144K</h3>
                </Card>
                <Card className="bg-blue-700 text-white p-4 relative overflow-hidden flex flex-col justify-center min-h-[85px] shadow-sm">
                    <div className="absolute -right-2 -top-1 opacity-10"><Truck size={54} /></div>
                    <p className="text-[8px] font-black uppercase text-blue-400 tracking-widest mb-0.5">Entregas</p>
                    <h3 className="text-2xl font-black italic">0</h3>
                </Card>
            </div>
            <Card className="w-full border-t-4 border-orange-500 bg-white shadow-sm p-4 text-center">
                <div className="bg-slate-900 text-white p-3 rounded-xl flex justify-between items-center max-w-2xl mx-auto shadow-lg">
                    <span className="text-[9px] font-black uppercase opacity-60">Pérdida Total del Periodo Evaluado</span>
                    <span className="text-lg font-black font-mono text-rose-400">-$538.000</span>
                </div>
                <p className="text-[10px] font-black uppercase text-slate-400 italic tracking-[0.2em] mt-3">Auditoría de Insumos Críticos en Tiempo Real</p>
            </Card>
        </div>
    );
}

function HRView({ staff, setStaff, orders, recipes, showToast }) {
    const [edit, setEdit] = useState(null);
    const terminadas = orders.filter(o => o.status === 'TERMINADO');
    const realKg = terminadas.reduce((acc, o) => acc + (Number(o.realAmount || 0) * 0.25), 0);
    const totalHours = terminadas.reduce((acc, o) => acc + (o.realTime || 0), 0) || 1;
    const eficiencia = realKg / totalHours;

    return (
        <div className="space-y-6 animate-in fade-in text-left">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-900 text-white p-4 border-t-4 border-orange-500 min-h-[90px] flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute -right-2 -top-1 opacity-10"><Target size={60} /></div>
                    <p className="text-[9px] font-black uppercase text-orange-500">Eficacia Operativa</p>
                    <h3 className="text-3xl font-black italic">97.0%</h3>
                </Card>
                <Card className="bg-slate-900 text-white p-4 border-t-4 border-blue-500 min-h-[90px] flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute -right-2 -top-1 opacity-10"><Zap size={60} /></div>
                    <p className="text-[9px] font-black uppercase text-blue-500">Eficiencia Planta</p>
                    <h3 className="text-3xl font-black italic">{eficiencia.toFixed(2)} <span className="text-xs">Kg/H</span></h3>
                </Card>
                <Card className="bg-white p-4 border-t-4 border-slate-900 min-h-[90px] flex flex-col justify-center shadow-sm">
                    <p className="text-[9px] font-black uppercase text-slate-400">Fuerza Laboral</p>
                    <h3 className="text-3xl font-black italic text-slate-800">{staff.length}</h3>
                </Card>
            </div>

            <Card className="shadow-lg border-none bg-white">
                <div className="p-3 border-b bg-slate-50/50 flex justify-between items-center">
                    <h4 className="text-sm font-black uppercase italic text-slate-800 flex items-center gap-2"><Users size={18} /> Maestro de Personal</h4>
                    <Button variant="accent" onClick={() => setEdit({ name: '', dni: '', phone: '', role: '', tasks: '', shift: 'Mañana', schedule: '', paymentMethod: 'Mensual', restDay: 'Domingo' })}><UserPlus size={14} /> Alta</Button>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-slate-900 text-white text-[8px] uppercase tracking-widest font-black italic">
                        <tr><th className="p-4">Empleado</th><th className="p-4">Puesto</th><th className="p-4 text-center">Horario</th><th className="p-4 text-center">Cobro</th><th className="p-4 text-center">Ficha</th></tr>
                    </thead>
                    <tbody className="divide-y text-[11px] font-bold text-slate-700 bg-white">
                        {staff.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50 transition-all">
                                <td className="p-4"><p className="uppercase text-slate-900">{s.name}</p><p className="text-[8px] font-mono text-slate-400">DNI: {s.dni}</p></td>
                                <td className="p-4 uppercase text-blue-600 text-[10px] leading-tight">{s.role}</td>
                                <td className="p-4 text-center leading-none"><div>{s.shift}</div><div className="text-[9px] text-slate-400 font-mono italic mt-1">{s.schedule}</div></td>
                                <td className="p-4 text-center"><span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[9px] uppercase border font-black">{s.paymentMethod}</span></td>
                                <td className="p-4 text-center"><button onClick={() => setEdit(s)} className="p-1.5 text-slate-400 hover:text-slate-800 transition-colors"><Eye size={18} /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            {edit && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-8 z-50 animate-in fade-in">
                    <Card className="max-w-4xl w-full p-8 border-[6px] border-slate-900 relative bg-white shadow-2xl overflow-y-auto max-h-[90vh]">
                        <button onClick={() => setEdit(null)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-800"><XCircle size={24} /></button>
                        <h3 className="text-xl font-black uppercase italic mb-8 border-b pb-4 flex items-center gap-3"><UserPlus size={24} className="text-orange-500" /> Ficha Técnica del Colaborador</h3>
                        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); setStaff(edit.id ? staff.map(x => x.id === edit.id ? edit : x) : [...staff, { ...edit, id: Date.now() }]); setEdit(null); showToast("Legajo Sincronizado"); }}>
                            <div className="grid grid-cols-3 gap-6">
                                <Input label="Nombre y Apellido" value={edit.name} onChange={v => setEdit({ ...edit, name: v })} required />
                                <Input label="DNI" value={edit.dni} onChange={v => setEdit({ ...edit, dni: v })} required />
                                <Input label="WhatsApp" value={edit.phone} onChange={v => setEdit({ ...edit, phone: v })} />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <Input label="Cargo / Puesto" value={edit.role} onChange={v => setEdit({ ...edit, role: v })} required />
                                <Input label="Tareas Asignadas" value={edit.tasks} onChange={v => setEdit({ ...edit, tasks: v })} placeholder="Ej: Amasado, Pesado..." />
                            </div>
                            <div className="grid grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border">
                                <Select label="Turno" value={edit.shift} onChange={v => setEdit({ ...edit, shift: v })}><option value="Mañana">Mañana</option><option value="Tarde">Tarde</option><option value="Noche">Noche</option></Select>
                                <Input label="Horario" value={edit.schedule || ''} onChange={v => setEdit({ ...edit, schedule: v })} placeholder="06:00 - 14:00" />
                                <Select label="Día Descanso" value={edit.restDay} onChange={v => setEdit({ ...edit, restDay: v })}>{['Sábado', 'Domingo', 'Lunes'].map(d => <option key={d} value={d}>{d}</option>)}</Select>
                            </div>
                            <div className="grid grid-cols-2 gap-6 items-end">
                                <Select label="Frecuencia Cobro" value={edit.paymentMethod} onChange={v => setEdit({ ...edit, paymentMethod: v })}><option value="Mensual">Mensual</option><option value="Quincenal">Quincenal</option><option value="Semanal">Semanal</option><option value="Diario">Diario</option></Select>
                                <div className="flex items-center gap-3 p-4 bg-white border border-dashed rounded-xl border-slate-300"><CreditCard size={20} className="text-slate-300" /><p className="text-[9px] font-black uppercase text-slate-400 italic">Reporte de nómina automático</p></div>
                            </div>
                            <div className="flex gap-4 pt-4 border-t">
                                <Button type="submit" variant="success" className="flex-1 py-4 font-black text-sm uppercase">Actualizar Base de Datos</Button>
                                <Button variant="secondary" onClick={() => setEdit(null)} className="px-10 font-black uppercase">Cancelar</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}

function Engineering({ recipes, ingredients, config }) {
    const [expanded, setExpanded] = useState({});
    const toggleRow = (id) => { setExpanded(prev => ({ ...prev, [id]: !prev[id] })); };
    return (
        <Card className="overflow-hidden border-2 bg-white shadow-sm text-left">
            <table className="w-full text-left font-bold text-xs uppercase text-slate-700">
                <thead className="bg-slate-900 text-white text-[8px] tracking-widest font-black italic">
                    <tr><th className="p-4">SKU / Producto</th><th className="p-4 text-center">Familia</th><th className="p-4 text-center">Rinde</th><th className="p-4 text-right">Costo Est.</th><th className="p-4 text-center w-28">Auditoría</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-[11px]">
                    {recipes.map(r => {
                        const isExp = !!expanded[r.id];
                        return (
                            <React.Fragment key={r.id}>
                                <tr className={`hover:bg-slate-50 transition-colors ${isExp ? 'bg-slate-50' : ''}`}>
                                    <td className="p-4 font-black text-slate-900">{r.nombre_producto}<span className="text-[8px] font-mono text-slate-400 block lowercase italic mt-1">{r.codigo}</span></td>
                                    <td className="p-4 text-center"><span className={`px-2 py-0.5 rounded text-[8px] text-white ${FAMILIAS[r.familia]?.color}`}>{r.familia}</span></td>
                                    <td className="p-4 text-center font-mono">{r.peso_final}g</td>
                                    <td className="p-4 text-right font-mono font-black text-slate-800">$1.240</td>
                                    <td className="p-4 text-center"><button onClick={() => toggleRow(r.id)} className="p-1.5 text-slate-400 hover:text-slate-900">{isExp ? <ChevronUp size={16} /> : <Eye size={16} />}</button></td>
                                </tr>
                                {isExp && (
                                    <tr className="bg-slate-50/50 shadow-inner">
                                        <td colSpan="5" className="p-6">
                                            <div className="grid grid-cols-2 gap-8">
                                                <div className="bg-white border-2 p-4 rounded-xl shadow-md"><h5 className="font-black text-[9px] uppercase text-slate-400 mb-3 border-b pb-1 italic">Routing BOM</h5>{r.details.map((d, idx) => (<div key={idx} className="flex justify-between py-1 text-[10px] border-b border-slate-50 last:border-0 uppercase font-black text-slate-600"><span>{ingredients.find(i => i.id === d.id || i.id === d.ingredientId)?.name}</span><span className="font-mono text-blue-600">{d.g || d.gramos}g</span></div>))}</div>
                                                <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md"><h5 className="font-black text-[9px] uppercase text-orange-500 mb-3 border-b border-slate-800 pb-1 italic">Costeo Operativo</h5><div className="space-y-3 text-[10px] uppercase font-bold"><div className="flex justify-between text-slate-400"><span>Hs Hombre</span><span>{r.hours || r.horas_hombre} h</span></div><div className="flex justify-between text-emerald-400 text-sm font-black border-t border-slate-800 pt-3"><span>Markup Sugerido</span><span>{config.finanzas.margenGanancia}%</span></div></div></div>
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
    );
}

function InventoryView({ ingredients, lots }) {
    const [searchTerm, setSearchTerm] = useState('');
    return (
        <div className="space-y-4 animate-in fade-in text-left">
            <div className="flex justify-between items-end bg-white p-4 rounded-xl border shadow-sm italic"><h3 className="text-xl font-black uppercase text-slate-800 leading-tight">Libro Mayor de Lotes</h3><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input type="text" placeholder="Buscar lote..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs font-bold w-64 outline-none focus:border-blue-500 shadow-sm bg-slate-50 transition-all" /></div></div>
            <Card className="overflow-hidden border-2 bg-white shadow-md">
                <table className="w-full text-left text-[11px] font-bold text-slate-700"><thead className="bg-slate-900 text-white text-[8px] uppercase tracking-widest font-black italic"><tr><th className="px-4 py-3">Código Lote</th><th className="px-4 py-3">Insumo</th><th className="px-4 py-3 text-right">Existencia Fís.</th></tr></thead>
                    <tbody className="divide-y divide-slate-100 bg-white">{lots.filter(l => l.id.toLowerCase().includes(searchTerm.toLowerCase())).map(l => (<tr key={l.id} className="hover:bg-slate-50 transition-colors"><td className="px-4 py-2 font-mono text-blue-600 uppercase italic">[{l.id}]</td><td className="px-4 py-2 uppercase leading-none">{ingredients.find(i => i.id === l.ingredientId)?.name}</td><td className="px-4 py-2 text-right font-mono text-slate-900 font-black italic">{l.amount / 1000} Kg</td></tr>))}</tbody>
                </table>
            </Card>
        </div>
    );
}

function Traceability({ lots, ingredients }) {
    const [q, setQ] = useState('');
    const [res, setRes] = useState(null);
    const trace = (e) => {
        e.preventDefault();
        const lot = lots.find(l => l.id.toLowerCase() === q.toLowerCase());
        setResult(lot ? { lot, ing: ingredients.find(i => i.id === lot.ingredientId) } : 'NOT_FOUND');
    };
    return (
        <div className="space-y-6 animate-in fade-in text-left max-w-4xl mx-auto">
            <Card className="p-6 border-t-8 border-slate-900 bg-white shadow-xl"><h4 className="text-xl font-black uppercase italic mb-6 border-b pb-4 flex items-center gap-3 text-slate-800"><GitMerge className="text-slate-400" size={24} /> Forward / Backward Traceability</h4><form onSubmit={trace} className="flex gap-4 items-end bg-slate-50 p-6 rounded-2xl border border-slate-200"><div className="flex-1"><Input label="Código Lote (HACCP)" placeholder="Ej: L-H00-CAÑ" value={q} onChange={setQ} required /></div><Button onClick={trace} type="submit" variant="primary" className="h-[38px] px-8 shadow-md font-black">Rastrear</Button></form></Card>
            {res === 'NOT_FOUND' && <div className="p-10 bg-red-50 text-red-600 rounded-2xl border-2 border-dashed border-red-200 text-center font-black uppercase italic animate-pulse">Lote No Registrado</div>}
            {res && res !== 'NOT_FOUND' && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4 relative">
                    <div className="absolute left-6 top-6 bottom-6 w-1 bg-slate-200 z-0"></div>
                    <div className="flex items-start gap-4 relative z-10"><div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center border-4 border-white shadow-lg shrink-0"><Briefcase size={24} /></div><Card className="flex-1 p-5 border-l-4 border-l-slate-900 shadow-md"><div><p className="text-[9px] font-black uppercase text-slate-400 mb-1 leading-none tracking-widest font-black italic">Procedencia (Ingreso)</p><h5 className="text-base font-black uppercase italic text-slate-800 leading-none">Molino Cañuelas / WIP Interno</h5><p className="text-[10px] font-bold text-slate-400 mt-2 uppercase font-mono tracking-tighter">FECHA INGRESO: {res.lot.ingreso}</p></div></Card></div>
                    <div className="flex items-start gap-4 relative z-10"><div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center border-4 border-white shadow-lg shrink-0"><Package size={24} /></div><Card className="flex-1 p-5 border-l-4 border-l-emerald-500 shadow-md text-left"><p className="text-[9px] font-black uppercase text-emerald-600 mb-1 leading-none font-black tracking-widest italic">Componente Detectado</p><h5 className="text-base font-black uppercase italic text-slate-800 leading-none">{res.ing?.name}</h5><p className="text-[10px] font-mono text-orange-600 font-bold mt-2 uppercase">Existencia Real: {res.lot.amount / 1000} Kg</p></Card></div>
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
                            {form.logo ? <img src={form.logo} alt="L" className="w-full h-full object-contain" /> : <Building className="text-slate-200" size={48} />}
                            <label className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"><Upload size={24} /><span className="text-[8px] font-black uppercase mt-1">Cargar Logo</span><input type="file" className="hidden" accept="image/*" onChange={handleLogo} /></label>
                        </div>
                        {form.logo && <button onClick={() => setForm({ ...form, logo: '' })} className="text-[8px] font-black text-red-500 uppercase hover:underline italic">Remover Imagen</button>}
                    </div>
                    <div className="md:col-span-9 grid grid-cols-2 gap-6">
                        <Input label="Marca Comercial" value={form.companyName} onChange={v => setForm({ ...form, companyName: v })} />
                        <Input label="CUIT / Razón Social" value={form.taxId} onChange={v => setForm({ ...form, taxId: v })} />
                        <Input label="Domicilio Fiscal" value={form.address} onChange={v => setForm({ ...form, address: v })} />
                        <Input label="Teléfono Central" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
                    </div>
                </div>
                <div className="mt-8 border-t pt-4 flex justify-end"><Button onClick={() => { setConfig(form); showToast("Perfil Sincronizado"); }} variant="success" className="px-16 py-4 shadow-xl font-black uppercase italic tracking-widest text-sm">Guardar Configuración General</Button></div>
            </Card>
        </div>
    );
}

// --------------------------------------------------------------------------------
// ASSETS DINÁMICOS
// --------------------------------------------------------------------------------
const INITIAL_CONFIG = {
    companyName: 'IMPERIO', appName: 'MES PRO V14', logo: '', address: 'Morón, Buenos Aires', phone: '11-4455-6677', taxId: '30-12345678-9',
    finanzas: { costoHoraHombre: 4500, margenGanancia: 120, costosIndirectosPct: 20 }
};

const ETAPAS_KANBAN = [
    { id: 'PESAJE', nombre: 'Pesada', icon: <ClipboardList size={16} /> },
    { id: 'AMASADO', nombre: 'Amasijo (WIP)', icon: <Factory size={16} /> },
    { id: 'FERMENTACION', nombre: 'Fermentación', icon: <Clock size={16} /> },
    { id: 'HORNEADO', nombre: 'Horneado', icon: <ThermometerSun size={16} /> },
    { id: 'CALIDAD', nombre: 'Control HACCP', icon: <ShieldCheck size={16} /> },
    { id: 'TERMINADO', nombre: 'Stock Planta', icon: <Warehouse size={16} /> }
];