'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    TrendingDown, Package, Layers, ShieldCheck, Settings,
    ShoppingBag, Plus, Trash2, Coins, Factory, Briefcase,
    Warehouse, ThermometerSun, ArrowRight, Truck, Layout,
    Clock, ClipboardList, Printer, QrCode, Square, MapPin,
    AlertTriangle, Hash, Search, Calendar, Wrench, Building,
    Store, CheckCircle2, XCircle, Calculator, DollarSign, PieChart,
    RotateCcw, ChevronDown, ChevronUp, Eye, Users, UserCircle, HandCoins, Building2, Tag
} from 'lucide-react';
import { useGlobalContext } from './context/GlobalContext';
import AntigravitySystem from './AntigravitySystem';

// ============================================================================
// DATOS MAESTROS INDUSTRIALES
// ============================================================================
export const ROLES = { ADMIN: 'Gerencia_Total', STAFF: 'Supervisor_Planta' };

export const FAMILIAS = {
    F: { id: 'F', nombre: 'Panificados Fermentados', color: 'bg-orange-600', border: 'border-orange-600' },
    A: { id: 'A', nombre: 'Batidos (Químicos)', color: 'bg-blue-600', border: 'border-blue-600' },
    B: { id: 'B', nombre: 'Ensamblados/Almuerzo', color: 'bg-emerald-600', border: 'border-emerald-600' },
    C: { id: 'C', nombre: 'Pastelería/Decorados', color: 'bg-purple-600', border: 'border-purple-600' },
    D: { id: 'D', nombre: 'Laminados/Hojaldres', color: 'bg-amber-600', border: 'border-amber-600' },
    E: { id: 'E', nombre: 'Secos y Galletería', color: 'bg-slate-600', border: 'border-slate-600' }
};

export const ETAPAS_KANBAN = [
    { id: 'PESAJE', nombre: 'Pesada', icon: <ClipboardList size={16} /> },
    { id: 'AMASADO', nombre: 'Amasijo (WIP)', icon: <Factory size={16} /> },
    { id: 'FERMENTACION', nombre: 'Fermentación', icon: <Clock size={16} /> },
    { id: 'HORNEADO', nombre: 'Horneado', icon: <ThermometerSun size={16} /> },
    { id: 'CALIDAD', nombre: 'Control HACCP', icon: <ShieldCheck size={16} /> },
    { id: 'TERMINADO', nombre: 'Stock Planta', icon: <Warehouse size={16} /> }
];

export const CATEGORIAS_INSUMO = ['Harinas y Polvos', 'Lácteos y Derivados', 'Grasas y Aceites', 'Azúcares y Dulces', 'Fermentos', 'Aditivos y Esencias', 'Huevos', 'Empaque', 'WIP (Producción)', 'Otros'];
export const UBICACIONES_ALMACEN = ['Almacén Secos Principal', 'Harinera', 'Cámara de Frío 1 (Insumos)', 'Cámara de Frío 2 (WIP)', 'Heladera de Tránsito', 'Depósito Empaque'];

// ============================================================================
// COMPONENTES UI
// ============================================================================
export const Card = ({ children, className = "" }) => (
    <div className={`border border-slate-200 rounded-xl shadow-sm overflow-hidden ${className.includes('bg-') ? className : 'bg-white ' + className}`}>
        {children}
    </div>
);

export const Button = ({ children, onClick, variant = 'primary', className = "", disabled = false, type = "button" }) => {
    const styles = {
        primary: "bg-slate-900 text-white hover:bg-black shadow-sm",
        secondary: "bg-white text-slate-700 hover:bg-slate-50 border border-slate-300",
        success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
        accent: "bg-orange-600 text-white hover:bg-orange-700 shadow-sm",
        danger: "bg-red-50 text-red-600 hover:bg-red-100",
        ghost: "bg-transparent text-slate-500 hover:text-slate-900"
    };
    return <button disabled={disabled} type={type} onClick={onClick} className={`px-3 py-1.5 rounded-md font-bold uppercase tracking-wider text-[10px] transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-95 ${styles[variant]} ${className}`}>{children}</button>;
};

export const Input = ({ label, type = "text", value, onChange, placeholder, required = false, disabled = false, suffix = null }) => (
    <div className="flex flex-col gap-1 w-full text-left">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label} {required && "*"}</label>
        <div className="relative">
            <input type={type} value={value} required={required} disabled={disabled} onChange={(e) => onChange ? onChange(e.target.value) : null} placeholder={placeholder} className={`w-full border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 text-sm font-semibold text-slate-800 transition-all shadow-sm ${disabled ? 'opacity-60 bg-slate-100 cursor-not-allowed text-slate-500' : ''}`} />
            {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{suffix}</span>}
        </div>
    </div>
);

export const Select = ({ label, value, onChange, required = false, children, disabled = false }) => (
    <div className="flex flex-col gap-1 w-full text-left">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label} {required && "*"}</label>
        <select value={value} required={required} disabled={disabled} onChange={(e) => onChange ? onChange(e.target.value) : null} className={`border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 text-sm font-semibold text-slate-800 transition-all shadow-sm cursor-pointer ${disabled ? 'opacity-60 bg-slate-100 cursor-not-allowed text-slate-500' : ''}`}>
            {children}
        </select>
    </div>
);

const Toast = ({ message, type = 'success', onClose }) => {
    if (!message) return null;
    return ( // Fixed the unterminated regex syntax issues which was here
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
// APLICACIÓN PRINCIPAL (ERP LAYOUT SHELL)
// ============================================================================
export default function ERPLayout({ children }) {
    const { config, toastMsg, showToast } = useGlobalContext();
    const pathname = usePathname();

    const menuItems = [
        { id: '/dashboard', label: 'Monitor Central', icon: <TrendingDown size={18} /> },
        { id: '/cuentas-pagar', label: 'Cuentas Proveedores', icon: <Building2 size={18} /> },
        { id: '/cuentas-cobrar', label: 'Facturación y Cobros', icon: <HandCoins size={18} /> },
        { id: '/inventario', label: 'Inventario (Lotes)', icon: <Package size={18} /> },
        { id: '/compras', label: 'Ingreso Insumos', icon: <ShoppingBag size={18} /> },
        { id: '/ordenes', label: 'Órdenes Producción', icon: <ClipboardList size={18} /> },
        { id: '/kanban', label: 'Kanban WIP (Planta)', icon: <Layout size={18} /> },
        { id: '/ingenieria', label: 'Ingeniería y Costos', icon: <Layers size={18} /> },
        { id: '/precios', label: 'Lista de Precios', icon: <Tag size={18} /> },
        { id: '/logistica', label: 'Pedidos y despachos', icon: <Truck size={18} /> },
        { id: '/maestros', label: 'Maestros Base', icon: <Briefcase size={18} /> },
        { id: '/rrhh', label: 'Recursos Humanos', icon: <Users size={18} /> },
        { id: '/configuracion', label: 'Configuración', icon: <Settings size={18} /> },
    ];

    const currentMenu = menuItems.find(m => m.id === pathname) || menuItems[0];

    return (
        <AntigravitySystem>
            <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden text-left">
                <Toast message={toastMsg?.msg} type={toastMsg?.type} onClose={() => showToast(null)} />

                <aside className="w-64 bg-slate-950 text-white flex flex-col shrink-0 shadow-2xl z-10 border-r border-slate-900 print:hidden fall-target">
                    <div className="p-6 border-b border-slate-900 flex items-center gap-3 mb-2">
                        <div className="bg-orange-600 p-2 rounded-xl text-white"><Factory size={20} /></div>
                        <div className="overflow-hidden">
                            <h1 className="text-xl font-black italic uppercase leading-none truncate max-w-[140px]">{config?.companyName || 'ERP'}</h1>
                            <p className="text-orange-500 text-[9px] font-black uppercase tracking-widest mt-1 truncate">{config?.appName || 'MES'}</p>
                        </div>
                    </div>
                    <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
                        {menuItems.map(item => (
                            <Link key={item.id} href={item.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-wider ${pathname === item.id || (pathname === '/' && item.id === '/dashboard') ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-900 hover:text-slate-200'}`}>
                                {item.icon} {item.label}
                            </Link>
                        ))}
                    </nav>
                    <div className="p-4 border-t border-slate-900 text-center opacity-40">
                        <p className="text-[8px] font-mono tracking-widest uppercase">Modo: Rutas Nativas</p>
                    </div>
                </aside>

                <main className="flex-1 overflow-y-auto p-10 relative bg-slate-50 print:p-0 print:bg-white">
                    <header className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4 print:hidden fall-target">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">{currentMenu?.label}</h2>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1.5 leading-none italic">Sistema Integral de Manufactura Panadera</p>
                        </div>
                    </header>

                    {children}
                </main>
            </div>
        </AntigravitySystem>
    );
}