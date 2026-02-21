'use client';
import React, { useState, useMemo } from 'react';
import {
    TrendingDown, Package, FileText, Layers, ShieldCheck,
    Settings, ShoppingBag, Plus, Trash2, Coins, History,
    Factory, Briefcase, Warehouse, ThermometerSun, CheckCircle2,
    ArrowRight, Truck, Layout, Clock, ClipboardList, Printer,
    QrCode, Square, MapPin, AlertTriangle
} from 'lucide-react';

const ROLES = { ADMIN: 'Gerencia_Total', STAFF: 'Supervisor_Planta' };

const FAMILIAS = {
    F: { id: 'F', nombre: 'Panificados Fermentados', color: 'bg-orange-600', border: 'border-orange-600' },
    A: { id: 'A', nombre: 'Batidos (Químicos)', color: 'bg-blue-600', border: 'border-blue-600' },
    B: { id: 'B', nombre: 'Ensamblados/Almuerzo', color: 'bg-emerald-600', border: 'border-emerald-600' },
    C: { id: 'C', nombre: 'Pastelería/Decorados', color: 'bg-purple-600', border: 'border-purple-600' },
    D: { id: 'D', nombre: 'Laminados/Hojaldres', color: 'bg-amber-600', border: 'border-amber-600' },
    E: { id: 'E', nombre: 'Secos y Galletería', color: 'bg-slate-600', border: 'border-slate-600' }
};

const ETAPAS_KANBAN = [
    { id: 'PESAJE', nombre: 'Pesada', icon: <ScaleIcon /> },
    { id: 'AMASADO', nombre: 'Amasijo (WIP)', icon: <Factory size={16} /> },
    { id: 'FERMENTACION', nombre: 'Fermentación', icon: <Clock size={16} /> },
    { id: 'HORNEADO', nombre: 'Horneado', icon: <ThermometerSun size={16} /> },
    { id: 'CALIDAD', nombre: 'Control HACCP', icon: <ShieldCheck size={16} /> },
    { id: 'TERMINADO', nombre: 'Stock Planta', icon: <Warehouse size={16} /> }
];

function ScaleIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="M7 21h10" /><path d="M12 3v18" /><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" /></svg>;
}

const INITIAL_PROVIDERS = [
    { id: 'p1', nombre: 'Molino Cañuelas', cuit: '30-12345678-1', rubro: 'Harinas' },
    { id: 'p2', nombre: 'Lácteos La Serenísima', cuit: '30-87654321-2', rubro: 'Lácteos' }
];

const INITIAL_INGREDIENTS = [
    { id: 'i1', name: 'Harina 000 (Fuerza)', unidad_compra: 'Bolsa 25kg', reqFrio: false, alergeno: 'TACC', costo_estandar: 0.8 },
    { id: 'i2', name: 'Harina 0000 (Pastelera)', unidad_compra: 'Bolsa 25kg', reqFrio: false, alergeno: 'TACC', costo_estandar: 1.2 },
    { id: 'i3', name: 'Agua Filtrada', unidad_compra: 'Litros', reqFrio: false, alergeno: '', costo_estandar: 0.05 },
    { id: 'i4', name: 'Sal Fina', unidad_compra: 'Bolsa 5kg', reqFrio: false, alergeno: '', costo_estandar: 0.5 },
    { id: 'wip1', name: '[WIP] Masa Madre Activa', unidad_compra: 'Gramos', reqFrio: true, alergeno: 'TACC', costo_estandar: 1.5, es_subensamble: true }
];

const INITIAL_LOTS = [
    { id: 'lot1', ingredientId: 'i1', amount: 500000, expiry: '2026-12-01' },
    { id: 'lot2', ingredientId: 'i2', amount: 250000, expiry: '2026-10-15' }
];

const INITIAL_RECIPES = [
    { id: 'r1', nombre_producto: 'Baguette Clásica', familia: 'F', version: 1, merma: 15, details: [{ ingredientId: 'i1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i3', porcentaje: 65, gramos: 650 }, { ingredientId: 'i4', porcentaje: 2, gramos: 20 }] },
    { id: 'r3', nombre_producto: 'Pan de Campo (Masa Madre)', familia: 'F', version: 2, merma: 12, details: [{ ingredientId: 'i1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'wip1', porcentaje: 20, gramos: 200 }, { ingredientId: 'i3', porcentaje: 70, gramos: 700 }, { ingredientId: 'i4', porcentaje: 2.2, gramos: 22 }] },
    { id: 'r4', nombre_producto: 'Budín de Vainilla', familia: 'A', version: 1, merma: 10, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }] },
    { id: 'r7', nombre_producto: 'Sándwich Miga J&Q', familia: 'B', version: 1, merma: 0, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }] }
];

const INITIAL_ORDERS = [
    { id: 'OP-17084', recipeId: 'r1', targetAmount: 500, status: 'PLANIFICADA' },
    { id: 'OP-17085', recipeId: 'r3', targetAmount: 300, status: 'FERMENTACION' }
];

const INITIAL_LOGISTICS = [
    { id: 'l1', dispatchId: 'DESP-8A9X', destination: 'Local Morón Centro', timestamp: '2026-02-20T08:30:00Z', items: [{ nombre_producto: 'Baguette Clásica', amount: 200 }] }
];

const Card = ({ children, className = "" }) => <div className={`bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden ${className}`}>{children}</div>;
const Button = ({ children, onClick, variant = 'primary', className = "", disabled = false }) => {
    const styles = { primary: "bg-slate-900 text-white hover:bg-black", secondary: "bg-white text-slate-700 hover:bg-slate-50 border", success: "bg-emerald-600 text-white", accent: "bg-orange-600 text-white" };
    return <button disabled={disabled} onClick={onClick} className={`px-4 py-2 rounded-lg font-bold uppercase text-[11px] transition-all flex items-center justify-center gap-2 ${styles[variant]} ${className}`}>{children}</button>;
};
const Input = ({ label, type = "text", value, onChange, placeholder, required = false }) => (
    <div className="flex flex-col gap-1 w-full text-left">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label} {required && "*"}</label>
        <input type={type} value={value} required={required} onChange={(e) => onChange ? onChange(e.target.value) : null} placeholder={placeholder} className="border bg-slate-50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 text-sm" />
    </div>
);

export default function BakeryMES() {
    const [currentRole, setCurrentRole] = useState(ROLES.ADMIN);
    const [view, setView] = useState('orders');
    const [ingredients] = useState(INITIAL_INGREDIENTS);
    const [recipes] = useState(INITIAL_RECIPES);
    const [providers] = useState(INITIAL_PROVIDERS);
    const [lots] = useState(INITIAL_LOTS);
    const [orders, setOrders] = useState(INITIAL_ORDERS);
    const [logistics, setLogistics] = useState(INITIAL_LOGISTICS);
    const [qualityLogs, setQualityLogs] = useState([]);

    const menuItems = [
        { id: 'dashboard', label: 'Monitor Central', icon: <TrendingDown size={18} /> },
        { id: 'orders', label: 'Órdenes Producción', icon: <ClipboardList size={18} /> },
        { id: 'kanban', label: 'Kanban WIP (Planta)', icon: <Layout size={18} /> },
        { id: 'engineering', label: 'Ingeniería MultiBOM', icon: <Layers size={18} /> },
        { id: 'logistics', label: 'Despacho a Locales', icon: <Truck size={18} /> },
        { id: 'master_data', label: 'Maestros Base', icon: <Settings size={18} /> },
    ];

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden text-left">
            <aside className="w-64 bg-slate-950 text-white flex flex-col shrink-0 shadow-2xl z-10 border-r border-slate-900 print:hidden">
                <div className="p-6 border-b border-slate-900">
                    <div className="flex items-center gap-3 mb-6"><div className="bg-orange-600 p-2 rounded-xl text-white"><Factory size={20} /></div><div><h1 className="text-xl font-black italic uppercase leading-none tracking-tighter">Imperio</h1><p className="text-orange-500 text-[9px] font-black uppercase mt-1 tracking-widest leading-none">MES Pro v9.0</p></div></div>
                    <select className="w-full bg-slate-900 border-2 border-slate-800 rounded-xl p-2.5 text-[10px] font-black uppercase text-orange-400 outline-none cursor-pointer" value={currentRole} onChange={(e) => setCurrentRole(e.target.value)}>
                        <option value={ROLES.ADMIN}>GERENCIA GENERAL</option><option value={ROLES.STAFF}>SUPERVISIÓN PLANTA</option>
                    </select>
                </div>
                <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
                    {menuItems.map(item => (
                        <button key={item.id} onClick={() => setView(item.id)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-wider ${view === item.id ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-900 hover:text-slate-200'}`}>{item.icon} {item.label}</button>
                    ))}
                </nav>
            </aside>
            <main className="flex-1 overflow-y-auto p-10 relative bg-slate-50">
                <header className="flex justify-between items-center mb-8 border-b border-slate-200 pb-6 print:hidden">
                    <div><h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">{menuItems.find(m => m.id === view)?.label}</h2><p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-2 leading-none italic">Sistema Integral de Manufactura Panadera</p></div>
                </header>
                {view === 'dashboard' && <DashboardView recipes={recipes} ingredients={ingredients} lots={lots} orders={orders} logistics={logistics} quality={qualityLogs} />}
                {view === 'orders' && <ProductionOrdersView recipes={recipes} ingredients={ingredients} lots={lots} orders={orders} setOrders={setOrders} />}
                {view === 'kanban' && <KanbanView orders={orders} recipes={recipes} setOrders={setOrders} setQualityLogs={setQualityLogs} qualityLogs={qualityLogs} />}
                {view === 'logistics' && <div className="p-20 text-center font-black text-4xl uppercase opacity-20 italic">Módulo Logística Activo</div>}
                {view === 'engineering' && <div className="p-20 text-center font-black text-4xl uppercase opacity-20 italic">Módulo Ingeniería Activo</div>}
                {view === 'master_data' && <div className="p-20 text-center font-black text-4xl uppercase opacity-20 italic">Datos Maestros Activo</div>}
            </main>
        </div>
    );
}

function DashboardView({ recipes, ingredients, lots, orders, logistics, quality }) {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-slate-900 text-white p-6 relative overflow-hidden"><div className="absolute -right-2 -top-2 opacity-10"><ClipboardList size={64} /></div><p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Batchs Activos</p><h3 className="text-3xl font-black italic">{orders.filter(o => o.status !== 'TERMINADO').length}</h3></Card>
                <Card className="bg-emerald-700 text-white p-6 relative overflow-hidden"><div className="absolute -right-2 -top-2 opacity-10"><Coins size={64} /></div><p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Fichas Activas</p><h3 className="text-3xl font-black italic">{recipes.length}</h3></Card>
                <Card className="bg-blue-700 text-white p-6 relative overflow-hidden"><div className="absolute -right-2 -top-2 opacity-10"><Truck size={64} /></div><p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Envíos a Locales</p><h3 className="text-3xl font-black italic">{logistics.length}</h3></Card>
                <Card className="bg-orange-600 text-white p-6 relative overflow-hidden"><div className="absolute -right-2 -top-2 opacity-10"><Factory size={64} /></div><p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Insumos/WIP</p><h3 className="text-3xl font-black italic">{ingredients.length}</h3></Card>
            </div>
        </div>
    );
}

function ProductionOrdersView({ recipes, ingredients, lots, orders, setOrders }) {
    const [form, setForm] = useState({ recipeId: '', amount: '' });
    const [selectedOrder, setSelectedOrder] = useState(null);

    const createOrder = (e) => {
        e.preventDefault();
        if (!form.recipeId || !form.amount) return;
        const newOrder = { id: `OP-${Math.floor(Math.random() * 10000)}`, recipeId: form.recipeId, targetAmount: Number(form.amount), status: 'PLANIFICADA' };
        setOrders([...orders, newOrder]);
        setForm({ recipeId: '', amount: '' });
    };

    const activateOrder = (id) => {
        setOrders(orders.map(o => o.id === id ? { ...o, status: 'PESAJE' } : o));
        setSelectedOrder(null);
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-6">
                    <Card className="p-6">
                        <h4 className="text-sm font-black uppercase mb-4 italic text-slate-800">1. Crear Orden</h4>
                        <form onSubmit={createOrder} className="space-y-4">
                            <div className="flex flex-col gap-1"><label className="text-[10px] font-black text-slate-400 uppercase">Ficha Técnica</label><select className="border border-slate-200 rounded-lg p-2 text-xs font-bold bg-slate-50 outline-none" value={form.recipeId} onChange={e => setForm({ ...form, recipeId: e.target.value })} required><option value="">Seleccionar Producto...</option>{recipes.map(r => <option key={r.id} value={r.id}>{r.nombre_producto}</option>)}</select></div>
                            <Input label="Unidades Meta" type="number" value={form.amount} onChange={v => setForm({ ...form, amount: v })} required />
                            <Button type="submit" variant="primary" className="w-full">Generar Orden</Button>
                        </form>
                    </Card>
                    <Card className="p-4">
                        <h4 className="text-xs font-black uppercase mb-4 italic border-b pb-2 text-slate-800">2. Órdenes Pendientes</h4>
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                            {orders.filter(o => o.status === 'PLANIFICADA').map(o => (
                                <div key={o.id} onClick={() => setSelectedOrder(o)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedOrder?.id === o.id ? 'bg-orange-50 border-orange-400 shadow-md' : 'hover:bg-slate-50 border-slate-100'}`}>
                                    <p className="text-[10px] font-mono font-bold text-slate-400">{o.id}</p>
                                    <p className="text-xs font-black uppercase italic leading-tight mt-1 text-slate-800">{recipes.find(r => r.id === o.recipeId)?.nombre_producto}</p>
                                    <p className="text-[10px] font-black text-blue-600 mt-2 bg-blue-50 inline-block px-2 py-1 rounded">{o.targetAmount} Unidades</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
                <Card className="lg:col-span-2 p-10 bg-white border-2 border-slate-200 shadow-xl print:shadow-none print:border-none min-h-[600px] flex flex-col">
                    {!selectedOrder ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 print:hidden">
                            <ClipboardList size={64} className="mb-4 opacity-50" />
                            <p className="text-xl font-black uppercase tracking-widest italic">Seleccioná una orden para ver la Hoja de Ruta</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col animate-in fade-in">
                            <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-8">
                                <div>
                                    <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none text-slate-900">Hoja de Producción</h1>
                                    <p className="text-sm font-bold uppercase text-slate-500 mt-2 tracking-[0.2em]">{selectedOrder.id}</p>
                                    <h2 className="text-2xl font-black uppercase mt-4 text-orange-600">{recipes.find(r => r.id === selectedOrder.recipeId)?.nombre_producto}</h2>
                                    <p className="text-lg font-black text-slate-800 font-mono mt-1">Meta: {selectedOrder.targetAmount} Unidades</p>
                                </div>
                                <div className="text-center">
                                    <div className="border-4 border-slate-900 p-2 rounded-xl"><QrCode size={80} /></div>
                                    <p className="text-[8px] font-mono font-black mt-2">QR KANBAN</p>
                                </div>
                            </div>
                            <div className="flex-1 mb-8">
                                <h4 className="text-sm font-black uppercase bg-slate-900 text-white inline-block px-4 py-1.5 rounded-lg mb-4">I. Lista de Picking y Pesaje</h4>
                                <table className="w-full text-left border-2 border-slate-200">
                                    <thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-600">
                                        <tr><th className="p-3 w-10 text-center">OK</th><th className="p-3">Insumo / WIP</th><th className="p-3 text-right">Cant. Teórica</th></tr>
                                    </thead>
                                    <tbody className="divide-y border-t-2 border-slate-200 text-xs font-bold text-slate-800">
                                        {recipes.find(r => r.id === selectedOrder.recipeId)?.details?.map((d, i) => {
                                            const ing = ingredients.find(ing => ing.id === d.ingredientId);
                                            const factor = selectedOrder.targetAmount / 100;
                                            return (
                                                <tr key={i}><td className="p-3 text-center"><Square size={16} className="text-slate-300 mx-auto" /></td><td className="p-3 uppercase">{ing?.name}</td><td className="p-3 text-right font-mono text-blue-700 text-sm">{(Number(d.gramos) * factor).toLocaleString()}g</td></tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-end gap-4 print:hidden mt-auto border-t pt-6">
                                <Button variant="secondary" onClick={() => window.print()}><Printer size={16} /> Imprimir Hoja</Button>
                                <Button variant="success" onClick={() => activateOrder(selectedOrder.id)}>Activar Kanban (Planta)</Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

function KanbanView({ orders, recipes, setOrders }) {
    const moveOrder = (id, newStatus) => {
        setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
    };

    return (
        <div className="flex gap-4 h-[calc(100vh-220px)] overflow-x-auto pb-4">
            {ETAPAS_KANBAN.map(etapa => (
                <div key={etapa.id} className="w-72 flex-shrink-0 flex flex-col bg-slate-100 rounded-2xl border border-slate-200">
                    <div className="p-4 bg-white border-b flex justify-between items-center rounded-t-2xl">
                        <div className="flex items-center gap-2 font-black text-[10px] uppercase text-slate-800">{etapa.icon} {etapa.nombre}</div>
                        <span className="text-[10px] font-black text-white bg-slate-900 px-2 py-0.5 rounded-full">{orders.filter(o => o.status === etapa.id).length}</span>
                    </div>
                    <div className="flex-1 p-3 overflow-y-auto space-y-3">
                        {orders.filter(o => o.status === etapa.id).map(o => {
                            const rec = recipes.find(r => r.id === o.recipeId);
                            return (
                                <Card key={o.id} className="p-5 hover:border-orange-500 transition-all border-2 border-transparent group shadow-md bg-white">
                                    <div className="flex justify-between items-center mb-3"><span className="text-[9px] font-mono font-bold text-slate-400">{o.id}</span></div>
                                    <h5 className="font-black text-sm uppercase text-slate-800 leading-tight mb-4 italic">{rec?.nombre_producto || 'Cargando...'}</h5>
                                    <div className="flex justify-between items-end border-t pt-3 mt-2">
                                        <div><p className="text-[8px] font-black uppercase text-slate-400">Meta Lote</p><p className="text-sm font-black text-blue-700 font-mono leading-none mt-1">{o.targetAmount} U</p></div>
                                        {etapa.id !== 'TERMINADO' && (
                                            <button onClick={() => moveOrder(o.id, ETAPAS_KANBAN[ETAPAS_KANBAN.findIndex(e => e.id === etapa.id) + 1].id)} className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white p-2 rounded-lg hover:bg-orange-500 shadow-md"><ArrowRight size={14} /></button>
                                        )}
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
