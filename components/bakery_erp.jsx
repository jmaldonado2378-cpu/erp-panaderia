'use client';
import React, { useState, useEffect } from 'react';
import {
    TrendingDown, Package, Layers, ShieldCheck, Settings,
    ShoppingBag, Plus, Trash2, Coins, Factory, Briefcase,
    Warehouse, ThermometerSun, ArrowRight, Truck, Layout,
    Clock, ClipboardList, Printer, QrCode, Square, MapPin,
    AlertTriangle, Hash, Search, Calendar, Wrench, Building,
    Store, CheckCircle2, XCircle, Calculator, DollarSign, PieChart,
    RotateCcw, ChevronDown, ChevronUp, Eye
} from 'lucide-react';
import AntigravitySystem from './AntigravitySystem';

// ============================================================================
// DATOS MAESTROS INDUSTRIALES
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

const ETAPAS_KANBAN = [
    { id: 'PESAJE', nombre: 'Pesada', icon: <ClipboardList size={16} /> },
    { id: 'AMASADO', nombre: 'Amasijo (WIP)', icon: <Factory size={16} /> },
    { id: 'FERMENTACION', nombre: 'Fermentación', icon: <Clock size={16} /> },
    { id: 'HORNEADO', nombre: 'Horneado', icon: <ThermometerSun size={16} /> },
    { id: 'CALIDAD', nombre: 'Control HACCP', icon: <ShieldCheck size={16} /> },
    { id: 'TERMINADO', nombre: 'Stock Planta', icon: <Warehouse size={16} /> }
];

const CATEGORIAS_INSUMO = ['Harinas y Polvos', 'Lácteos y Derivados', 'Grasas y Aceites', 'Azúcares y Dulces', 'Fermentos', 'Aditivos y Esencias', 'Huevos', 'Empaque', 'WIP (Producción)', 'Otros'];
const UBICACIONES_ALMACEN = ['Almacén Secos Principal', 'Harinera', 'Cámara de Frío 1 (Insumos)', 'Cámara de Frío 2 (WIP)', 'Heladera de Tránsito', 'Depósito Empaque'];

const INITIAL_PROVIDERS = [
    { id: 'p1', codigo: 'PRV-001', nombre: 'Molino Cañuelas', cuit: '30-12345678-1', rubro: 'Harinas' },
    { id: 'p2', codigo: 'PRV-002', nombre: 'Molino Campodónico', cuit: '30-22345678-1', rubro: 'Harinas' },
    { id: 'p3', codigo: 'PRV-003', nombre: 'Lácteos La Serenísima', cuit: '30-87654321-2', rubro: 'Lácteos' },
    { id: 'p4', codigo: 'PRV-004', nombre: 'Lácteos Vacalin', cuit: '30-97654321-2', rubro: 'Lácteos y DDL' },
    { id: 'p5', codigo: 'PRV-005', nombre: 'Levaduras Calsa', cuit: '30-11122233-3', rubro: 'Fermentos' },
    { id: 'p6', codigo: 'PRV-006', nombre: 'Levaduras Lesaffre', cuit: '30-21122233-3', rubro: 'Fermentos y Aditivos' },
    { id: 'p7', codigo: 'PRV-007', nombre: 'Puratos Argentina', cuit: '30-33344455-4', rubro: 'Aditivos y Mejoradores' },
    { id: 'p8', codigo: 'PRV-008', nombre: 'Margarinas Dánica', cuit: '30-55566677-5', rubro: 'Grasas y Aceites' },
    { id: 'p9', codigo: 'PRV-009', nombre: 'Huevos San Juan', cuit: '30-99988877-5', rubro: 'Huevos' }
];

const INITIAL_INGREDIENTS = [
    { id: 'i1', codigo: 'RAW-HAR-001', name: 'Harina 000 (Fuerza)', unidad_compra: 'Bolsa 25kg', familia: 'Harinas y Polvos', almacen: 'Harinera', alergeno: 'TACC', costo_estandar: 0.8 },
    { id: 'i2', codigo: 'RAW-HAR-002', name: 'Harina 0000 (Pastelera)', unidad_compra: 'Bolsa 25kg', familia: 'Harinas y Polvos', almacen: 'Harinera', alergeno: 'TACC', costo_estandar: 1.2 },
    { id: 'i3', codigo: 'RAW-OTR-001', name: 'Agua Filtrada', unidad_compra: 'Litros', familia: 'Otros', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 0.05 },
    { id: 'i4', codigo: 'RAW-HAR-003', name: 'Sal Fina', unidad_compra: 'Bolsa 5kg', familia: 'Harinas y Polvos', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 0.5 },
    { id: 'i5', codigo: 'RAW-FER-001', name: 'Levadura Fresca', unidad_compra: 'Paquete 500g', familia: 'Fermentos', almacen: 'Cámara de Frío 1 (Insumos)', alergeno: '', costo_estandar: 3.0 },
    { id: 'i6', codigo: 'RAW-GRA-001', name: 'Manteca Extrafina', unidad_compra: 'Caja 20kg', familia: 'Grasas y Aceites', almacen: 'Cámara de Frío 1 (Insumos)', alergeno: 'Lácteo', costo_estandar: 8.5 },
    { id: 'i7', codigo: 'RAW-GRA-002', name: 'Margarina Hojaldre Alta Fusión', unidad_compra: 'Caja 10kg', familia: 'Grasas y Aceites', almacen: 'Almacén Secos Principal', alergeno: 'Lácteo', costo_estandar: 6.8 },
    { id: 'i8', codigo: 'RAW-AZÚ-001', name: 'Azúcar Común', unidad_compra: 'Bolsa 50kg', familia: 'Azúcares y Dulces', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 1.0 },
    { id: 'i9', codigo: 'RAW-HUE-001', name: 'Huevo Líquido Pasteurizado', unidad_compra: 'Sachet 5L', familia: 'Huevos', almacen: 'Cámara de Frío 1 (Insumos)', alergeno: 'Huevo', costo_estandar: 4.2 },
    { id: 'i10', codigo: 'RAW-AZÚ-002', name: 'Dulce de Leche Repostero', unidad_compra: 'Tacho 10kg', familia: 'Azúcares y Dulces', almacen: 'Almacén Secos Principal', alergeno: 'Lácteo', costo_estandar: 5.5 },
    { id: 'i11', codigo: 'RAW-AZÚ-003', name: 'Chocolate Cobertura Semiamargo', unidad_compra: 'Caja 5kg', familia: 'Azúcares y Dulces', almacen: 'Heladera de Tránsito', alergeno: 'Lácteo', costo_estandar: 15.0 },
    { id: 'i12', codigo: 'RAW-ADI-001', name: 'Mejorador Pan Francés', unidad_compra: 'Bolsa 5kg', familia: 'Aditivos y Esencias', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 25.0 },
    { id: 'i13', codigo: 'RAW-ADI-002', name: 'Propionato de Calcio', unidad_compra: 'Bolsa 5kg', familia: 'Aditivos y Esencias', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 18.0 },
    { id: 'i14', codigo: 'RAW-HAR-004', name: 'Polvo de Hornear Doble Acción', unidad_compra: 'Tarro 2kg', familia: 'Harinas y Polvos', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 6.0 },
    { id: 'i15', codigo: 'RAW-ADI-003', name: 'Extracto de Malta Líquido', unidad_compra: 'Bidón 5kg', familia: 'Aditivos y Esencias', almacen: 'Almacén Secos Principal', alergeno: 'TACC', costo_estandar: 8.0 },
    { id: 'i16', codigo: 'RAW-ADI-004', name: 'Esencia de Vainilla Concentrada', unidad_compra: 'Botella 1L', familia: 'Aditivos y Esencias', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 12.0 },

    { id: 'wip_F1', codigo: 'WIP-F-001', name: '[WIP] Masa Madre Activa (Poolish)', unidad_compra: 'Gramos', familia: 'WIP (Producción)', almacen: 'Cámara de Frío 2 (WIP)', alergeno: 'TACC', costo_estandar: 1.5, es_subensamble: true },
    { id: 'wip_A1', codigo: 'WIP-A-001', name: '[WIP] Cremado Base Vainilla', unidad_compra: 'Gramos', familia: 'WIP (Producción)', almacen: 'Cámara de Frío 2 (WIP)', alergeno: 'TACC, Lácteo, Huevo', costo_estandar: 3.5, es_subensamble: true },
    { id: 'wip_B1', codigo: 'WIP-B-001', name: '[WIP] Plancha Pan de Miga Blanca', unidad_compra: 'Gramos', familia: 'WIP (Producción)', almacen: 'Almacén Secos Principal', alergeno: 'TACC', costo_estandar: 2.5, es_subensamble: true },
    { id: 'wip_D1', codigo: 'WIP-D-001', name: '[WIP] Bastón Hojaldre (Empaste)', unidad_compra: 'Gramos', familia: 'WIP (Producción)', almacen: 'Cámara de Frío 2 (WIP)', alergeno: 'TACC, Lácteo', costo_estandar: 5.5, es_subensamble: true }
];

const INITIAL_LOTS = [
    { id: 'L-H00-CAÑ', ingredientId: 'i1', providerId: 'p1', amount: 500000, expiry: '2026-12-01', ingreso: '2025-10-01' },
    { id: 'L-H04-CAÑ', ingredientId: 'i2', providerId: 'p1', amount: 300000, expiry: '2026-11-15', ingreso: '2025-09-10' },
    { id: 'L-LEV-CAL', ingredientId: 'i5', providerId: 'p5', amount: 25000, expiry: '2026-03-20', ingreso: '2026-01-05' },
    { id: 'L-DDL-VAC', ingredientId: 'i10', providerId: 'p4', amount: 80000, expiry: '2026-08-30', ingreso: '2026-01-10' },
    { id: 'L-MEJ-PUR', ingredientId: 'i12', providerId: 'p7', amount: 10000, expiry: '2027-01-01', ingreso: '2026-01-15' },
    { id: 'WIP-MM-01', ingredientId: 'wip_F1', providerId: 'interno', amount: 45000, expiry: '2026-02-28', ingreso: '2026-02-20' }
];

const BASE_RECIPES = [
    { nombre_producto: 'Baguette Francesa', familia: 'F', merma: 18, horas_hombre: 1.5, costo_empaque: 0, details: [{ ingredientId: 'i1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i3', porcentaje: 65, gramos: 650 }, { ingredientId: 'i4', porcentaje: 2, gramos: 20 }, { ingredientId: 'i5', porcentaje: 1.5, gramos: 15 }, { ingredientId: 'i12', porcentaje: 1, gramos: 10 }] },
    { nombre_producto: 'Pan de Molde Larga Vida', familia: 'F', merma: 10, horas_hombre: 2.0, costo_empaque: 120, details: [{ ingredientId: 'i1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i3', porcentaje: 55, gramos: 550 }, { ingredientId: 'i6', porcentaje: 8, gramos: 80 }, { ingredientId: 'i5', porcentaje: 3, gramos: 30 }, { ingredientId: 'i13', porcentaje: 0.5, gramos: 5 }] },
    { nombre_producto: 'Ciabatta Rústica', familia: 'F', merma: 15, horas_hombre: 2.5, costo_empaque: 0, details: [{ ingredientId: 'i1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'wip_F1', porcentaje: 30, gramos: 300 }, { ingredientId: 'i3', porcentaje: 80, gramos: 800 }, { ingredientId: 'i4', porcentaje: 2.2, gramos: 22 }] },
    { nombre_producto: 'Budín Húmedo de Vainilla', familia: 'A', merma: 8, horas_hombre: 1.2, costo_empaque: 85, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i8', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i9', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i7', porcentaje: 80, gramos: 800 }, { ingredientId: 'i14', porcentaje: 4, gramos: 40 }, { ingredientId: 'i16', porcentaje: 2, gramos: 20 }] },
    { nombre_producto: 'Sándwich Miga Triple J&Q', familia: 'B', merma: 0, horas_hombre: 0.8, costo_empaque: 250, details: [{ ingredientId: 'wip_B1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i6', porcentaje: 15, gramos: 150 }] },
    { nombre_producto: 'Medialuna de Manteca', familia: 'D', merma: 20, horas_hombre: 3.5, costo_empaque: 0, details: [{ ingredientId: 'wip_D1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i8', porcentaje: 15, gramos: 150 }, { ingredientId: 'i3', porcentaje: 45, gramos: 450 }, { ingredientId: 'i5', porcentaje: 4, gramos: 40 }] },
    { nombre_producto: 'Alfajor de Maicena', familia: 'E', merma: 6, horas_hombre: 1.8, costo_empaque: 45, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i10', porcentaje: 150, gramos: 1500 }, { ingredientId: 'i14', porcentaje: 3, gramos: 30 }] }
];

const GENERATE_RECIPES = () => {
    const extended = [];
    let rId = 1;
    const FORMATOS = [
        { f: 'Unidad', p: 80, s: 'Mini' },
        { f: 'Unidad', p: 250, s: 'Estándar' },
        { f: 'Unidad', p: 500, s: 'Familiar' }
    ];

    Object.keys(FAMILIAS).forEach(famKey => {
        const bases = BASE_RECIPES.filter(r => r.familia === famKey);
        bases.forEach(base => {
            FORMATOS.forEach((fmt, idx) => {
                const pesoCrudo = base.details.reduce((a, b) => a + Number(b.gramos || 0), 0);
                extended.push({
                    ...base,
                    id: `R-${famKey}-${String(rId).padStart(3, '0')}`,
                    codigo: `FG-${famKey}${idx + 1}-${String(rId).padStart(3, '0')}`,
                    nombre_producto: `${base.nombre_producto} ${fmt.s}`,
                    version: 1,
                    es_subensamble: false,
                    formato_venta: fmt.f,
                    peso_unidad: fmt.p,
                    peso_crudo: pesoCrudo,
                    peso_final: pesoCrudo * (1 - (base.merma / 100))
                });
                rId++;
            });
        });
    });
    return extended;
};

const INITIAL_RECIPES = GENERATE_RECIPES();

const INITIAL_ORDERS = [
    { id: 'o1708450001', recipeId: 'R-F-002', targetAmount: 500, status: 'PLANIFICADA', date: '2026-02-20' },
    { id: 'o1708450002', recipeId: 'R-D-017', targetAmount: 1200, status: 'AMASADO', date: '2026-02-20' },
    { id: 'o1708450003', recipeId: 'R-F-003', targetAmount: 300, status: 'FERMENTACION', date: '2026-02-20' },
    { id: 'o1708450004', recipeId: 'R-F-004', targetAmount: 150, status: 'HORNEADO', date: '2026-02-20' }
];

const INITIAL_LOGISTICS = [
    { id: 'l1', dispatchId: 'DESP-8A9X', destination: 'Local Morón Centro', timestamp: '2026-02-20T08:30:00Z', items: [{ nombre_producto: 'Baguette Francesa Estándar', amount: 200 }, { nombre_producto: 'Medialuna de Manteca Estándar', amount: 500 }] },
    { id: 'l2', dispatchId: 'DESP-2B4Y', destination: 'Sucursal Castelar', timestamp: '2026-02-20T09:15:00Z', items: [{ nombre_producto: 'Pan de Molde Larga Vida Familiar', amount: 50 }, { nombre_producto: 'Alfajor de Maicena Mini', amount: 120 }] }
];

const INITIAL_CONFIG = {
    companyName: 'IMPERIO',
    appName: 'MES PRO V12 (FINANZAS)',
    branches: ['Morón Centro', 'Castelar'],
    finanzas: {
        costoHoraHombre: 4500,
        margenGanancia: 120,
        costosIndirectosPct: 20
    }
};

// ============================================================================
// COMPONENTES UI
// ============================================================================
const Card = ({ children, className = "" }) => (
    <div className={`border border-slate-200 rounded-xl shadow-sm overflow-hidden ${className.includes('bg-') ? className : 'bg-white ' + className}`}>
        {children}
    </div>
);

const Button = ({ children, onClick, variant = 'primary', className = "", disabled = false, type = "button" }) => {
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
        <select value={value} required={required} disabled={disabled} onChange={(e) => onChange ? onChange(e.target.value) : null} className={`border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 text-sm font-semibold text-slate-800 transition-all shadow-sm cursor-pointer ${disabled ? 'opacity-60 bg-slate-100 cursor-not-allowed text-slate-500' : ''}`}>
            {children}
        </select>
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
// APLICACIÓN PRINCIPAL (ERP)
// ============================================================================
export default function App() {
    const [currentRole, setCurrentRole] = useState(ROLES.ADMIN);
    const [view, setView] = useState('dashboard');

    const [ingredients, setIngredients] = useState(INITIAL_INGREDIENTS);
    const [recipes, setRecipes] = useState(INITIAL_RECIPES);
    const [providers, setProviders] = useState(INITIAL_PROVIDERS);
    const [lots, setLots] = useState(INITIAL_LOTS);
    const [orders, setOrders] = useState(INITIAL_ORDERS);
    const [logistics, setLogistics] = useState(INITIAL_LOGISTICS);
    const [purchases, setPurchases] = useState([]);
    const [qualityLogs, setQualityLogs] = useState([]);
    const [config, setConfig] = useState(INITIAL_CONFIG);
    const [toastMsg, setToastMsg] = useState(null);
    const [inventoryLogs, setInventoryLogs] = useState([]); // Estado para el Historial de Ajustes

    const showToast = (msg, type = 'success') => {
        setToastMsg({ msg, type });
        setTimeout(() => setToastMsg(null), 4000);
    };

    const menuItems = [
        { id: 'dashboard', label: 'Monitor Central', icon: <TrendingDown size={18} /> },
        { id: 'inventory', label: 'Inventario (Lotes)', icon: <Package size={18} /> },
        { id: 'purchases', label: 'Ingreso Insumos', icon: <ShoppingBag size={18} /> },
        { id: 'orders', label: 'Órdenes Producción', icon: <ClipboardList size={18} /> },
        { id: 'kanban', label: 'Kanban WIP (Planta)', icon: <Layout size={18} /> },
        { id: 'engineering', label: 'Ingeniería y Costos', icon: <Layers size={18} /> },
        { id: 'logistics', label: 'Despacho Locales', icon: <Truck size={18} /> },
        { id: 'master_data', label: 'Maestros Base', icon: <Briefcase size={18} /> },
        { id: 'settings', label: 'Configuración', icon: <Settings size={18} /> },
    ];

    return (
        <AntigravitySystem>
            <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden text-left">
                <Toast message={toastMsg?.msg} type={toastMsg?.type} onClose={() => setToastMsg(null)} />

                <aside className="w-64 bg-slate-950 text-white flex flex-col shrink-0 shadow-2xl z-10 border-r border-slate-900 print:hidden fall-target">
                    <div className="p-6 border-b border-slate-900 flex items-center gap-3 mb-2">
                        <div className="bg-orange-600 p-2 rounded-xl text-white"><Factory size={20} /></div>
                        <div className="overflow-hidden">
                            <h1 className="text-xl font-black italic uppercase leading-none truncate max-w-[140px]">{config.companyName}</h1>
                            <p className="text-orange-500 text-[9px] font-black uppercase tracking-widest mt-1 truncate">{config.appName}</p>
                        </div>
                    </div>
                    <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
                        {menuItems.map(item => (
                            <button key={item.id} onClick={() => setView(item.id)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-wider ${view === item.id ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-900 hover:text-slate-200'}`}>
                                {item.icon} {item.label}
                            </button>
                        ))}
                    </nav>
                    <div className="p-4 border-t border-slate-900 text-center opacity-40">
                        <p className="text-[8px] font-mono tracking-widest uppercase">Modo: Local Memory</p>
                    </div>
                </aside>

                <main className="flex-1 overflow-y-auto p-10 relative bg-slate-50 print:p-0 print:bg-white">
                    <header className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4 print:hidden fall-target">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">{menuItems.find(m => m.id === view)?.label}</h2>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1.5 leading-none italic">Sistema Integral de Manufactura Panadera</p>
                        </div>
                    </header>

                    {view === 'dashboard' && <DashboardView recipes={recipes} ingredients={ingredients} lots={lots} orders={orders} logistics={logistics} quality={qualityLogs} config={config} purchases={purchases} />}
                    {view === 'inventory' && <InventoryView ingredients={ingredients} lots={lots} providers={providers} setLots={setLots} showToast={showToast} inventoryLogs={inventoryLogs} setInventoryLogs={setInventoryLogs} />}
                    {view === 'purchases' && <PurchasesView providers={providers} ingredients={ingredients} purchases={purchases} setPurchases={setPurchases} lots={lots} setLots={setLots} showToast={showToast} />}
                    {view === 'orders' && <ProductionOrdersView recipes={recipes} ingredients={ingredients} lots={lots} orders={orders} setOrders={setOrders} showToast={showToast} />}
                    {view === 'kanban' && <KanbanView orders={orders} recipes={recipes} setOrders={setOrders} qualityLogs={qualityLogs} setQualityLogs={setQualityLogs} showToast={showToast} />}
                    {view === 'engineering' && <EngineeringView recipes={recipes} ingredients={ingredients} setRecipes={setRecipes} setIngredients={setIngredients} showToast={showToast} config={config} />}
                    {view === 'logistics' && <LogisticsView recipes={recipes} logistics={logistics} setLogistics={setLogistics} branches={config.branches} showToast={showToast} />}
                    {view === 'master_data' && <MasterDataView ingredients={ingredients} setIngredients={setIngredients} providers={providers} setProviders={setProviders} showToast={showToast} />}
                    {view === 'settings' && <SettingsView config={config} setConfig={setConfig} showToast={showToast} />}
                </main>
            </div>
        </AntigravitySystem>
    );
}

// ============================================================================
// VISTAS 
// ============================================================================

function DashboardView({ recipes, ingredients, lots, orders, logistics, quality, config, purchases }) {
    const stockMetrics = ingredients.map(ing => {
        const totalGrams = lots.filter(l => l.ingredientId === ing.id).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
        return { ...ing, stock: totalGrams };
    });

    const totalValue = stockMetrics.reduce((acc, curr) => acc + (curr.stock * (curr.costo_estandar || 0)), 0);

    const totalPurchases = purchases && purchases.length > 0 ? purchases.reduce((acc, p) => acc + Number(p.costTotal || 0), 0) : 1580000;
    const pendientePago = totalPurchases * 0.45;
    const pendientes = orders.filter(o => o.status !== 'TERMINADO').length;
    const despachados = logistics.reduce((acc, l) => acc + (l.items?.length || 0), 0) || 0;

    const mockAuditData = [
        { name: 'Harina 000 (Fuerza)', theoretical: 4500, real: 4680, unit: 'Kg', costPerUnit: 800 },
        { name: 'Manteca Extrafina', theoretical: 320, real: 345, unit: 'Kg', costPerUnit: 8500 },
        { name: 'Chocolate Cobertura', theoretical: 150, real: 162, unit: 'Kg', costPerUnit: 15000 },
        { name: 'Levadura Fresca', theoretical: 45, real: 45.5, unit: 'Kg', costPerUnit: 3000 }
    ];

    const totalPérdida = mockAuditData.reduce((acc, item) => acc + ((item.real - item.theoretical) * item.costPerUnit), 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="fall-target bg-slate-900 text-white p-3.5 relative overflow-hidden flex flex-col justify-center shadow-sm min-h-[64px]">
                    <div className="absolute -right-2 -top-1 opacity-10"><ClipboardList size={48} /></div>
                    <p className="text-[8px] font-black uppercase opacity-60 tracking-widest mb-0.5">Pedidos Recibidos</p>
                    <h3 className="text-2xl font-black italic leading-none">{orders.length}</h3>
                </Card>
                <Card className="fall-target bg-emerald-700 text-white p-3.5 relative overflow-hidden flex flex-col justify-center shadow-sm min-h-[64px]">
                    <div className="absolute -right-2 -top-1 opacity-10"><Coins size={48} /></div>
                    <p className="text-[8px] font-black uppercase opacity-60 tracking-widest mb-0.5">Valorización Stock</p>
                    <h3 className="text-2xl font-black italic leading-none">${totalValue.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</h3>
                </Card>
                <Card className="fall-target bg-rose-700 text-white p-3.5 relative overflow-hidden flex flex-col justify-center shadow-sm min-h-[64px]">
                    <div className="absolute -right-2 -top-1 opacity-10"><AlertTriangle size={48} /></div>
                    <p className="text-[8px] font-black uppercase opacity-60 tracking-widest mb-0.5">Pendiente Pago MP</p>
                    <h3 className="text-2xl font-black italic leading-none">${pendientePago.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</h3>
                </Card>
                <Card className="fall-target bg-blue-700 text-white p-3.5 relative overflow-hidden flex flex-col justify-center shadow-sm min-h-[64px]">
                    <div className="absolute -right-2 -top-1 opacity-10"><Truck size={48} /></div>
                    <p className="text-[8px] font-black uppercase opacity-60 tracking-widest mb-0.5">Pendientes / Despachados</p>
                    <h3 className="text-2xl font-black italic leading-none">{pendientes} <span className="text-sm opacity-70">/ {despachados}</span></h3>
                </Card>
            </div>

            <Card className="fall-target w-full border-t-4 border-orange-500 flex flex-col overflow-hidden bg-white shadow-sm">
                <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div>
                        <h4 className="text-base font-black uppercase italic text-slate-800 leading-none">Auditoría de Mermas</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 leading-none">Consumo MP Teórico vs. Consumo MP Real</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                            <p className="text-[8px] font-black uppercase tracking-widest text-red-500 mb-0.5 leading-none">Pérdida Total</p>
                            <p className="text-sm font-black font-mono text-red-600 leading-none">-${totalPérdida.toLocaleString('es-AR')}</p>
                        </div>
                        <select className="border border-slate-200 rounded-md p-1.5 text-[10px] font-bold text-slate-600 outline-none focus:border-orange-500 cursor-pointer bg-slate-50 h-[34px]">
                            <option value="mes">Este Mes</option>
                            <option value="semana">Esta Semana</option>
                            <option value="hoy">Hoy</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-[9px] uppercase tracking-widest border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-2 font-black">Insumo Auditado</th>
                                <th className="px-4 py-2 text-center font-black border-l border-slate-200">Meta Teórica</th>
                                <th className="px-4 py-2 text-center font-black">Consumo Real</th>
                                <th className="px-4 py-2 text-center font-black">Desvío Detectado</th>
                                <th className="px-4 py-2 text-right font-black border-l border-slate-200">Impacto ($)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs bg-white">
                            {mockAuditData.map((item, idx) => {
                                const diff = item.real - item.theoretical;
                                const pct = (diff / item.theoretical) * 100;
                                const impact = diff * item.costPerUnit;
                                const isDanger = pct > 5;

                                return (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-1.5 font-black text-slate-800 uppercase">{item.name}</td>
                                        <td className="px-4 py-1.5 text-center font-mono font-bold text-slate-400 border-l border-slate-100">{item.theoretical} {item.unit}</td>
                                        <td className="px-4 py-1.5 text-center font-mono font-black text-slate-800">{item.real} {item.unit}</td>
                                        <td className="px-4 py-1.5 text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-black ${isDanger ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                                +{pct.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-1.5 text-right font-mono font-black text-red-600 border-l border-slate-100">
                                            -${impact.toLocaleString('es-AR')}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

function EngineeringView({ recipes, ingredients, setRecipes, setIngredients, showToast, config }) {
    const [showAdd, setShowAdd] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRows, setExpandedRows] = useState({}); // Controla filas desplegadas

    const toggleRow = (id) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const [form, setForm] = useState({
        id: null, codigo: '', nombre: '', familia: 'F', ver: 1, wip: false, merma: 15, formato_venta: 'Unidad', peso_unidad: 100,
        horas_hombre: 1, costo_empaque: 0, details: []
    });

    useEffect(() => {
        if (!form.id && showAdd) {
            const prefix = form.wip ? `WIP-${form.familia}` : `FG-${form.familia}`;
            let max = 0;
            recipes.forEach(r => {
                if (r.codigo && r.codigo.startsWith(prefix)) {
                    const num = parseInt(r.codigo.split('-').pop());
                    if (!isNaN(num) && num > max) max = num;
                }
            });
            setForm(prev => ({ ...prev, codigo: `${prefix}-${String(max + 1).padStart(3, '0')}` }));
        }
    }, [form.familia, form.wip, showAdd, recipes]);

    const filteredRecipes = recipes.filter(r =>
        r.nombre_producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const pesoCrudo = form.details.reduce((a, b) => a + Number(b.gramos || 0), 0);
    const pesoFinal = pesoCrudo * (1 - (form.merma / 100));
    const hasFlourBase = form.details.some(d => Number(d.porcentaje) === 100);

    const save = () => {
        if (!form.nombre || !form.codigo || !hasFlourBase) return;

        const recipeData = {
            codigo: form.codigo.toUpperCase(), nombre_producto: form.nombre, familia: form.familia, version: form.ver, es_subensamble: form.wip, merma: form.merma,
            formato_venta: form.formato_venta, peso_unidad: form.formato_venta === 'Unidad' ? Number(form.peso_unidad) : null, peso_crudo: pesoCrudo, peso_final: pesoFinal,
            horas_hombre: Number(form.horas_hombre), costo_empaque: Number(form.costo_empaque), details: form.details
        };

        if (form.id) {
            setRecipes(recipes.map(r => r.id === form.id ? { ...r, ...recipeData, id: r.id } : r));
            showToast("Ficha técnica y financiera actualizada.");
        } else {
            const newId = `R-NVO-${Date.now()}`;
            setRecipes([{ id: newId, ...recipeData }, ...recipes]);
            if (form.wip) {
                setIngredients([...ingredients, { id: `wip${Date.now()}`, codigo: form.codigo.toUpperCase(), name: `[WIP] ${form.nombre}`, unidad_compra: 'Gramos', factor_conversion: 1, es_subensamble: true, familia: 'WIP (Producción)', almacen: 'Cámara de Frío 2 (WIP)', costo_estandar: 0 }]);
            }
            showToast(`Ficha ${form.codigo} creada con análisis de costos.`);
        }

        setShowAdd(false);
        setForm({ id: null, codigo: '', nombre: '', familia: 'F', ver: 1, wip: false, merma: 15, formato_venta: 'Unidad', peso_unidad: 100, horas_hombre: 1, costo_empaque: 0, details: [] });
    };

    const handleEdit = (rec) => {
        setForm({
            id: rec.id, codigo: rec.codigo || '', nombre: rec.nombre_producto, familia: rec.familia, ver: (rec.version || 1) + 1, wip: !!rec.es_subensamble, merma: rec.merma || 15,
            formato_venta: rec.formato_venta || 'Unidad', peso_unidad: rec.peso_unidad || 100, horas_hombre: rec.horas_hombre || 1, costo_empaque: rec.costo_empaque || 0, details: rec.details ? [...rec.details] : []
        });
        setShowAdd(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = (id) => {
        if (confirm("¿Eliminar Ficha?")) {
            setRecipes(recipes.filter(r => r.id !== id));
            showToast("Ficha eliminada", "error");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="fall-target bg-white p-6 rounded-2xl border shadow-sm flex justify-between items-center gap-6">
                <div>
                    <h3 className="text-xl font-black uppercase italic text-slate-800">Catálogo MultiBOM y Costos</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Fichas Activas: {recipes.length}</p>
                </div>
                <div className="flex-1 max-w-md relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Buscar por código o nombre..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-orange-500 bg-slate-50 focus:bg-white transition-all" />
                </div>
                <Button onClick={() => { setShowAdd(!showAdd); if (!showAdd) setForm({ id: null, codigo: '', nombre: '', familia: 'F', ver: 1, wip: false, merma: 15, formato_venta: 'Unidad', peso_unidad: 100, horas_hombre: 1, costo_empaque: 0, details: [] }); }} variant={showAdd ? "secondary" : "accent"}>
                    {showAdd ? "Cancelar Edición" : <><Plus size={16} /> Nueva Ficha</>}
                </Button>
            </div>

            {showAdd && (
                <Card className="fall-target p-8 border-[4px] border-slate-900 bg-white shadow-2xl animate-in slide-in-from-top-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-2">
                            <Hash size={16} className="text-slate-400" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Datos de Identificación</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-4 lg:col-span-3">
                                <Input label="Código SKU" value={form.codigo} disabled required />
                            </div>
                            <div className="md:col-span-8 lg:col-span-9">
                                <Input label="Nombre del Producto" value={form.nombre} onChange={v => setForm({ ...form, nombre: v })} placeholder="Ej. Baguette Clásica" required />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-5 lg:col-span-4"><Select label="Familia" value={form.familia} onChange={e => setForm({ ...form, familia: e })}>{Object.values(FAMILIAS).map(f => <option key={f.id} value={f.id}>{f.id} - {f.nombre}</option>)}</Select></div>
                            <div className="md:col-span-3 lg:col-span-3"><Select label="Formato Venta" value={form.formato_venta} onChange={e => setForm({ ...form, formato_venta: e })}><option value="Unidad">Por Unidad (U)</option><option value="Kg">Por Kilo (Kg)</option></Select></div>
                            <div className="md:col-span-2 lg:col-span-2">
                                {form.formato_venta === 'Unidad' ? (<Input label="Peso (g)" type="number" value={form.peso_unidad} onChange={v => setForm({ ...form, peso_unidad: v })} required />) : (<div className="text-[10px] font-bold text-slate-400 uppercase h-[38px] flex items-center justify-center border border-dashed border-slate-200 rounded-lg bg-slate-100/50">Granel</div>)}
                            </div>
                            <div className="md:col-span-2 lg:col-span-3">
                                <label className="flex items-center justify-center gap-2 p-2 bg-white rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:border-orange-400 transition-colors h-[38px]"><input type="checkbox" checked={form.wip} onChange={e => setForm({ ...form, wip: e.target.checked })} className="w-4 h-4 accent-orange-600" /><span className="text-[9px] font-black uppercase text-slate-700 leading-tight">WIP?</span></label>
                            </div>
                        </div>
                    </div>

                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 mb-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-emerald-200 pb-2 mb-2">
                            <div className="flex items-center gap-2"><Calculator size={16} className="text-emerald-500" /><h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Costos Operativos</h4></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Mano de Obra" type="number" placeholder="Ej. 1.5" value={form.horas_hombre} onChange={v => setForm({ ...form, horas_hombre: v })} suffix="Horas/Lote" required />
                            <Input label="Empaque" type="number" placeholder="Ej. 150" value={form.costo_empaque} onChange={v => setForm({ ...form, costo_empaque: v })} suffix="$/Lote" />
                        </div>
                    </div>

                    <div className="mb-6">
                        <div className="flex justify-between items-end mb-3">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest bg-slate-100 px-3 py-1 rounded-lg">Escandallo</p>
                            <div className="flex items-center gap-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">% Merma Horno</label><input type="number" value={form.merma} onChange={e => setForm({ ...form, merma: e.target.value })} className="border border-slate-300 rounded-md px-2 py-1 text-xs font-bold w-16 outline-none text-center focus:border-orange-500" /></div>
                        </div>

                        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-900 text-white text-[9px] uppercase tracking-widest">
                                    <tr><th className="px-3 py-1.5">Componente</th><th className="px-3 py-1.5 w-24 text-center">% Panadero</th><th className="px-3 py-1.5 w-24 text-center">Gramos</th><th className="px-3 py-1.5 w-10 text-center"></th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {form.details.map((l, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-2 py-1 border-r border-slate-100">
                                                <select className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer py-1" value={l.ingredientId} onChange={e => { const nd = [...form.details]; nd[i].ingredientId = e.target.value; setForm({ ...form, details: nd }) }}>
                                                    <option value="" disabled>Seleccionar Componente...</option>{ingredients.map(ing => (<option key={ing.id} value={ing.id}>[{ing.codigo}] {ing.name}</option>))}
                                                </select>
                                            </td>
                                            <td className="px-2 py-1 border-r border-slate-100"><div className="flex items-center justify-center bg-slate-100 rounded border border-slate-200 px-1 py-0.5"><input type="number" className="w-full bg-transparent text-xs font-black text-center outline-none text-slate-800" value={l.porcentaje} onChange={e => { const v = e.target.value; const nd = [...form.details]; nd[i].porcentaje = v; nd[i].gramos = Number(v) * 10; setForm({ ...form, details: nd }) }} placeholder="0" /><span className="text-[9px] text-slate-400 font-bold ml-1">%</span></div></td>
                                            <td className="px-2 py-1 border-r border-slate-100"><div className="flex items-center justify-center bg-slate-100 rounded border border-slate-200 px-1 py-0.5"><input type="number" className="w-full bg-transparent text-xs font-black text-center outline-none text-slate-800" value={l.gramos} onChange={e => { const v = e.target.value; const nd = [...form.details]; nd[i].gramos = v; setForm({ ...form, details: nd }) }} placeholder="0" /><span className="text-[9px] text-slate-400 font-bold ml-1">g</span></div></td>
                                            <td className="px-2 py-1 text-center"><button type="button" onClick={() => { const nd = [...form.details]; nd.splice(i, 1); setForm({ ...form, details: nd }) }} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-all opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button></td>
                                        </tr>
                                    ))}
                                    {form.details.length === 0 && (<tr><td colSpan="4" className="p-8 text-center text-slate-400 text-xs italic bg-slate-50/50">No hay ingredientes en esta receta. Haz clic en "Agregar Componente" para empezar.</td></tr>)}
                                </tbody>
                            </table>
                            <div className="p-1 bg-slate-50 border-t border-slate-200"><button type="button" onClick={() => setForm({ ...form, details: [...form.details, { ingredientId: '', porcentaje: '', gramos: '' }] })} className="w-full py-1.5 border border-dashed border-slate-300 rounded-md text-[9px] font-black uppercase text-slate-500 hover:bg-slate-200 hover:text-slate-800 hover:border-slate-400 transition-all flex items-center justify-center gap-1"><Plus size={12} /> Añadir Insumo</button></div>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-900 text-white rounded-xl flex justify-between items-center shadow-inner">
                        <div><p className="text-[9px] uppercase opacity-50 font-black tracking-widest mb-0.5">Rendimiento Estimado ({form.formato_venta})</p><div className="flex items-end gap-2"><p className="text-2xl font-black font-mono text-emerald-400">{pesoFinal.toFixed(0)} <span className="text-sm text-emerald-600">g</span></p>{form.formato_venta === 'Unidad' && form.peso_unidad > 0 && (<p className="text-xs font-black text-slate-300 italic mb-0.5">≈ {Math.floor(pesoFinal / form.peso_unidad)} Unid.</p>)}</div></div>
                        <div className="flex gap-3"><Button onClick={save} variant="success" className="py-2.5 px-6 shadow-lg shadow-emerald-900/50" disabled={!hasFlourBase || !form.nombre || !form.codigo}>{form.id ? "Actualizar Ficha" : "Guardar Ficha"}</Button></div>
                    </div>
                </Card>
            )}

            <Card className="fall-target overflow-hidden border-2 border-slate-200 shadow-sm mt-2 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left font-bold text-xs uppercase text-slate-700">
                        <thead className="bg-slate-900 text-white text-[9px] tracking-widest">
                            <tr>
                                <th className="px-4 py-3">SKU / Producto</th>
                                <th className="px-4 py-3 text-center">Familia</th>
                                <th className="px-4 py-3 text-center">Rinde Final</th>
                                <th className="px-4 py-3 text-right">Costo Unid.</th>
                                <th className="px-4 py-3 text-right border-r border-slate-700">P. Sugerido</th>
                                <th className="px-4 py-3 text-center w-28">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredRecipes.map(r => {
                                const familiaData = FAMILIAS[r.familia] || FAMILIAS.F;
                                const isExpanded = !!expandedRows[r.id];

                                // CÁLCULOS FINANCIEROS DEL ERP
                                const costo_mp = r.details?.reduce((acc, d) => acc + (Number(d.gramos) * (ingredients.find(i => i.id === d.ingredientId)?.costo_estandar || 0)), 0) || 0;
                                const costo_mo = (Number(r.horas_hombre) || 0) * config.finanzas.costoHoraHombre;
                                const costo_cif = costo_mp * (config.finanzas.costosIndirectosPct / 100);
                                const costo_empaque = Number(r.costo_empaque) || 0;
                                const costo_total_batch = costo_mp + costo_mo + costo_cif + costo_empaque;

                                let unidades_rinde = 1;
                                let label_unidad = 'Kg';
                                if (r.formato_venta === 'Unidad' && r.peso_unidad > 0) {
                                    unidades_rinde = Math.floor(Number(r.peso_final) / Number(r.peso_unidad));
                                    label_unidad = 'Unid.';
                                } else {
                                    unidades_rinde = Number(r.peso_final) / 1000;
                                }

                                const costo_unitario = unidades_rinde > 0 ? (costo_total_batch / unidades_rinde) : 0;
                                const precio_sugerido = costo_unitario * (1 + (config.finanzas.margenGanancia / 100));

                                return (
                                    <React.Fragment key={r.id}>
                                        <tr className={`hover:bg-slate-50 transition-colors group ${isExpanded ? 'bg-slate-50' : ''}`}>
                                            <td className="px-4 py-2">
                                                <p className="text-[11px] font-black text-slate-800">{r.nombre_producto}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[8px] font-mono text-slate-400">{r.codigo}</span>
                                                    {r.es_subensamble && <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[7px] font-black uppercase">WIP</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[8px] text-white ${familiaData.color}`}>{familiaData.id}</span>
                                            </td>
                                            <td className="px-4 py-2 text-center font-mono text-slate-800">
                                                {Number(r.peso_final || 0).toFixed(0)}g
                                                <span className="block text-[8px] text-slate-400 font-sans uppercase mt-0.5">{r.formato_venta === 'Unidad' ? `${r.peso_unidad}g c/u` : 'Granel'}</span>
                                            </td>
                                            <td className="px-4 py-2 text-right font-mono font-bold text-slate-700">
                                                ${costo_unitario.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-2 text-right font-mono font-black text-emerald-600 border-r border-slate-100">
                                                ${precio_sugerido.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <div className="flex justify-center gap-1">
                                                    <button onClick={() => toggleRow(r.id)} className={`p-1.5 rounded-md transition-colors ${isExpanded ? 'bg-slate-200 text-slate-800 shadow-inner' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'}`} title={isExpanded ? "Cerrar Ficha" : "Ver Ficha Completa"}>
                                                        {isExpanded ? <ChevronUp size={14} /> : <Eye size={14} />}
                                                    </button>
                                                    <button onClick={() => handleEdit(r)} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors opacity-0 group-hover:opacity-100" title="Editar Ficha"><Wrench size={14} /></button>
                                                    <button onClick={() => handleDelete(r.id)} className="p-1.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100" title="Eliminar"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* PANEL DESPLEGABLE: FICHA TÉCNICA DETALLADA */}
                                        {isExpanded && (
                                            <tr className="bg-slate-50 border-b-2 border-slate-200 shadow-inner">
                                                <td colSpan="6" className="px-6 py-5">
                                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                                        <div className="lg:col-span-2">
                                                            <h5 className="font-black text-[10px] uppercase text-slate-500 mb-2 flex items-center gap-2"><Layers size={12} /> Escandallo (Ingredientes)</h5>
                                                            <table className="w-full text-left text-[10px] border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                                                                <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                                                                    <tr>
                                                                        <th className="px-3 py-2 font-black">Insumo</th>
                                                                        <th className="px-3 py-2 text-center font-black">% Panadero</th>
                                                                        <th className="px-3 py-2 text-right font-black">Cant. (Gramos)</th>
                                                                        <th className="px-3 py-2 text-right font-black">Costo MP</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {r.details.map((d, i) => {
                                                                        const ing = ingredients.find(ing => ing.id === d.ingredientId);
                                                                        const cost = Number(d.gramos) * (ing?.costo_estandar || 0);
                                                                        return (
                                                                            <tr key={i} className="hover:bg-slate-50">
                                                                                <td className="px-3 py-2 uppercase font-bold text-slate-700">{ing?.name}</td>
                                                                                <td className="px-3 py-2 text-center font-mono">{d.porcentaje}%</td>
                                                                                <td className="px-3 py-2 text-right font-mono text-slate-500">{d.gramos} g</td>
                                                                                <td className="px-3 py-2 text-right font-mono font-black text-slate-700">${cost.toFixed(2)}</td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        <div>
                                                            <h5 className="font-black text-[10px] uppercase text-slate-500 mb-2 flex items-center gap-2"><PieChart size={12} /> Análisis Financiero (Lote)</h5>
                                                            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5 text-[10px] shadow-sm">
                                                                <div className="flex justify-between"><span className="text-slate-500 font-bold">Materia Prima (MP)</span><span className="font-mono text-slate-800">${costo_mp.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                                                <div className="flex justify-between"><span className="text-slate-500 font-bold">Mano de Obra (MO)</span><span className="font-mono text-slate-800">${costo_mo.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                                                <div className="flex justify-between"><span className="text-slate-500 font-bold">Costos Indir. (CIF)</span><span className="font-mono text-slate-800">${costo_cif.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                                                <div className="flex justify-between"><span className="text-slate-500 font-bold">Costo Empaque</span><span className="font-mono text-slate-800">${costo_empaque.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                                                <div className="flex justify-between font-black border-t border-slate-200 pt-2.5 mt-1"><span className="text-slate-800">Costo Total Batch</span><span className="font-mono text-red-600 text-xs">${costo_total_batch.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            {filteredRecipes.length === 0 && (
                                <tr><td colSpan="6" className="p-10 text-center text-slate-400 italic text-[10px]">No hay fichas que coincidan con la búsqueda.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

function InventoryView({ ingredients, lots, providers, setLots, showToast, inventoryLogs, setInventoryLogs }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [providerFilter, setProviderFilter] = useState('');
    const [adjustModal, setAdjustModal] = useState(null);
    const [newStock, setNewStock] = useState('');
    const [showLogs, setShowLogs] = useState(false);

    const detailedLots = lots.filter(l => l.amount > 0).map(lot => {
        const ing = ingredients.find(i => i.id === lot.ingredientId);
        const prov = providers.find(p => p.id === lot.providerId);
        return { ...lot, ingredientName: ing?.name || 'Desconocido', es_subensamble: ing?.es_subensamble || false, providerName: lot.providerId === 'interno' ? 'Producción Interna' : (prov?.nombre || 'S/D') };
    }).sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

    const filteredLots = detailedLots.filter(l => {
        const matchSearch = l.ingredientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.providerName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchProvider = providerFilter === '' || l.providerId === providerFilter;
        return matchSearch && matchProvider;
    });

    const handleAdjustStock = () => {
        if (!adjustModal || newStock === '') return;

        const oldAmount = adjustModal.amount;
        const newAmount = Number(newStock);
        const diff = newAmount - oldAmount;

        const logEntry = {
            id: `adj-${Date.now()}`,
            date: new Date().toISOString(),
            lotId: adjustModal.id,
            ingredientName: adjustModal.ingredientName,
            oldAmount,
            newAmount,
            diff
        };

        if (setInventoryLogs) {
            setInventoryLogs([logEntry, ...(inventoryLogs || [])]);
        }

        setLots(lots.map(l => l.id === adjustModal.id ? { ...l, amount: newAmount } : l));
        setAdjustModal(null); setNewStock('');
        showToast(`Stock del lote ${adjustModal.id} actualizado a ${newAmount}g`);
    };

    const getStatusColor = (expiryDate) => {
        const days = (new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
        if (days < 0) return 'bg-rose-100 text-rose-700 border-rose-200';
        if (days < 30) return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end bg-white p-4 rounded-xl border shadow-sm print:hidden gap-4">
                <div>
                    <h3 className="text-xl font-black uppercase italic text-slate-800">Libro Mayor de Lotes</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Trazabilidad FEFO por Insumo y Proveedor</p>
                </div>
                <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap">
                    <select
                        className="border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-600 outline-none focus:border-blue-500 bg-slate-50 cursor-pointer"
                        value={providerFilter}
                        onChange={e => setProviderFilter(e.target.value)}
                    >
                        <option value="">Filtrar: Todos los Proveedores</option>
                        <option value="interno">Producción Interna (WIP)</option>
                        {providers.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input type="text" placeholder="Buscar lote, insumo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs font-bold w-48 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all" />
                    </div>

                    <Button variant="secondary" onClick={() => setShowLogs(true)}><RotateCcw size={14} /> Historial</Button>
                    <Button variant="primary" onClick={() => window.print()}><Printer size={14} /> Planilla Control</Button>
                </div>
            </div>

            <Card className="overflow-hidden border-2 print:border-none print:shadow-none bg-white">
                <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-2">
                    <h2 className="text-2xl font-black uppercase italic text-slate-900 leading-none">Planilla de Control Físico de Inventario</h2>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-2">Fecha: {new Date().toLocaleDateString('es-AR')} | Turno: _______ | Firma Auditor: ______________</p>
                </div>
                <table className="w-full text-left print:mt-4">
                    <thead className="bg-slate-900 text-white text-[9px] uppercase tracking-widest print:bg-transparent print:text-slate-800 print:border-b-2 print:border-slate-800">
                        <tr>
                            <th className="px-4 py-2 print:py-3">ID Lote</th>
                            <th className="px-4 py-2 print:py-3">SKU / Componente</th>
                            <th className="px-4 py-2 print:py-3">Proveedor Origen</th>
                            <th className="px-4 py-2 text-center print:hidden">Vencimiento</th>
                            <th className="px-4 py-2 text-right print:py-3">Existencia Sistema</th>
                            <th className="px-4 py-2 text-center print:hidden">Acciones</th>
                            <th className="px-4 py-2 text-right hidden print:table-cell w-32 italic">Conteo Real</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700 bg-white">
                        {filteredLots.map(lot => (
                            <tr key={lot.id} className="hover:bg-slate-50 transition-colors group print:border-b print:border-slate-300">
                                <td className="px-4 py-1.5 print:py-3"><span className="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 text-[10px] print:border-none print:bg-transparent print:px-0 print:text-slate-800">{lot.id}</span></td>
                                <td className="px-4 py-1.5 print:py-3 flex items-center gap-2 uppercase text-[11px]">{lot.es_subensamble && <Layers size={12} className="text-orange-500 print:hidden" />}{lot.ingredientName}</td>
                                <td className="px-4 py-1.5 print:py-3 text-[9px] text-slate-500 uppercase">{lot.providerName}</td>
                                <td className="px-4 py-1.5 text-center print:hidden"><span className={`px-2 py-0.5 rounded border text-[9px] flex items-center justify-center gap-1 w-max mx-auto ${getStatusColor(lot.expiry)}`}><Calendar size={10} /> {new Date(lot.expiry).toLocaleDateString('es-AR')}</span></td>
                                <td className="px-4 py-1.5 print:py-3 text-right font-mono text-slate-900 text-[11px]">{lot.amount >= 1000 ? `${(lot.amount / 1000).toLocaleString('es-AR')} Kg` : `${lot.amount.toLocaleString('es-AR')} g`}</td>
                                <td className="px-4 py-1.5 text-center print:hidden"><button onClick={() => setAdjustModal(lot)} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[8px] uppercase tracking-widest transition-colors opacity-0 group-hover:opacity-100">Ajustar</button></td>
                                <td className="px-4 py-1.5 text-right hidden print:table-cell text-slate-300 font-mono">................ Kg</td>
                            </tr>
                        ))}
                        {filteredLots.length === 0 && (
                            <tr><td colSpan="7" className="p-8 text-center text-slate-400 italic bg-slate-50">No hay lotes que coincidan con la búsqueda.</td></tr>
                        )}
                    </tbody>
                </table>
            </Card>

            {showLogs && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-8 z-50 animate-in fade-in">
                    <Card className="max-w-3xl w-full p-6 border-4 border-slate-900 max-h-[85vh] flex flex-col bg-white">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-xl font-black uppercase italic text-slate-800 flex items-center gap-2"><RotateCcw size={20} /> Registro Auditoría (Ajustes Físicos)</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Histórico inmutable de modificaciones de inventario</p>
                            </div>
                            <button onClick={() => setShowLogs(false)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors"><XCircle size={24} /></button>
                        </div>

                        <div className="overflow-y-auto flex-1 border border-slate-200 rounded-xl">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-500 text-[9px] uppercase tracking-widest sticky top-0 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3">Fecha y Hora</th>
                                        <th className="px-4 py-3">Insumo y Lote Afectado</th>
                                        <th className="px-4 py-3 text-right">Cant. Anterior</th>
                                        <th className="px-4 py-3 text-right">Cant. Nueva</th>
                                        <th className="px-4 py-3 text-right border-l border-slate-200">Diferencia (Desvío)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-bold bg-white text-slate-700">
                                    {(!inventoryLogs || inventoryLogs.length === 0) ? (
                                        <tr><td colSpan="5" className="p-8 text-center text-slate-400 italic">El inventario no presenta ajustes manuales en esta sesión.</td></tr>
                                    ) : (
                                        inventoryLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2.5 text-[10px] text-slate-400 font-mono">{new Date(log.date).toLocaleString('es-AR')}</td>
                                                <td className="px-4 py-2.5">
                                                    <p className="uppercase text-[11px] text-slate-800">{log.ingredientName}</p>
                                                    <span className="text-[9px] text-blue-500 bg-blue-50 px-1 rounded font-mono border border-blue-100">{log.lotId}</span>
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-mono text-slate-400">{log.oldAmount >= 1000 ? `${(log.oldAmount / 1000).toLocaleString('es-AR')} Kg` : `${log.oldAmount.toLocaleString('es-AR')} g`}</td>
                                                <td className="px-4 py-2.5 text-right font-mono text-slate-900">{log.newAmount >= 1000 ? `${(log.newAmount / 1000).toLocaleString('es-AR')} Kg` : `${log.newAmount.toLocaleString('es-AR')} g`}</td>
                                                <td className="px-4 py-2.5 text-right font-mono font-black border-l border-slate-50">
                                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${log.diff > 0 ? 'bg-emerald-50 text-emerald-600' : (log.diff < 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500')}`}>
                                                        {log.diff > 0 ? '+' : ''}{log.diff >= 1000 || log.diff <= -1000 ? `${(log.diff / 1000).toLocaleString('es-AR')} Kg` : `${log.diff.toLocaleString('es-AR')} g`}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {adjustModal && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-8 z-50 animate-in fade-in">
                    <Card className="max-w-md w-full p-8 border-4 border-slate-900">
                        <h3 className="text-lg font-black uppercase italic mb-4">Ajuste de Lote Específico</h3>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-2 text-xs">
                            <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase">Lote:</span> <span className="font-mono font-black">{adjustModal.id}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase">Insumo:</span> <span className="font-black uppercase">{adjustModal.ingredientName}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase">Stock Actual:</span> <span className="font-mono font-black text-blue-600">{adjustModal.amount >= 1000 ? `${adjustModal.amount / 1000} Kg` : `${adjustModal.amount} g`}</span></div>
                        </div>
                        <Input label="Nuevo Conteo Físico Real (Gramos)" type="number" value={newStock} onChange={setNewStock} placeholder="Ej. 25000" required />
                        <div className="flex gap-4 pt-6"><Button onClick={handleAdjustStock} variant="success" className="flex-1 py-3 h-[38px]">Actualizar Lote</Button><Button onClick={() => setAdjustModal(null)} variant="secondary" className="px-6 h-[38px]">Cancelar</Button></div>
                    </Card>
                </div>
            )}
        </div>
    );
}

function PurchasesView({ providers, ingredients, purchases, setPurchases, lots, setLots, showToast }) {
    const [form, setForm] = useState({ providerId: '', costTotal: '', remito: '' });
    const [currentItem, setCurrentItem] = useState({ ingredientId: '', amount: '', expiry: '' });
    const [cart, setCart] = useState([]);

    const addToCart = (e) => {
        e.preventDefault();
        if (!currentItem.ingredientId || !currentItem.amount || !currentItem.expiry) return;
        const ing = ingredients.find(i => i.id === currentItem.ingredientId);
        setCart([...cart, { ...currentItem, name: ing.name, unit: ing.unidad_compra }]);
        setCurrentItem({ ingredientId: '', amount: '', expiry: '' });
    };

    const removeFromCart = (idx) => setCart(cart.filter((_, i) => i !== idx));

    const savePurchase = () => {
        if (!form.providerId || cart.length === 0) return;
        const newLots = cart.map((item) => {
            const ing = ingredients.find(i => i.id === item.ingredientId);
            const grams = Number(item.amount) * Number(ing?.factor_conversion || 1000);
            const baseLoteId = `L-${form.providerId.replace('p', '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
            return { id: baseLoteId, ingredientId: item.ingredientId, providerId: form.providerId, amount: grams, expiry: item.expiry, ingreso: new Date().toISOString() };
        });
        setPurchases([{ id: `pur-${Date.now()}`, ...form, items: cart, timestamp: new Date().toISOString() }, ...purchases]);
        setLots([...newLots, ...lots]);
        setForm({ providerId: '', costTotal: '', remito: '' }); setCart([]);
        showToast("Remito procesado y lotes asignados correctamente al inventario.");
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            <Card className="fall-target p-6 border-t-8 border-blue-600">
                <h4 className="text-xl font-black uppercase italic mb-4 border-b pb-3 text-slate-800">Entrada de Insumos (Remitos)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border">
                    <Select label="Proveedor Principal" value={form.providerId} onChange={e => setForm({ ...form, providerId: e })} required><option value="">Seleccionar...</option>{providers.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</Select>
                    <Input label="Costo Total Factura ($)" type="number" value={form.costTotal} onChange={v => setForm({ ...form, costTotal: v })} />
                    <Input label="N° Remito" value={form.remito} onChange={v => setForm({ ...form, remito: v })} />
                </div>
                <h5 className="font-black text-xs text-slate-500 uppercase mb-2 ml-1">Agregar Insumos al Lote</h5>
                <form onSubmit={addToCart} className="flex gap-3 items-end bg-white p-4 rounded-xl border mb-6 shadow-sm">
                    <div className="flex-1"><Select label="Insumo" value={currentItem.ingredientId} onChange={e => setCurrentItem({ ...currentItem, ingredientId: e })} required><option value="">Seleccionar...</option>{ingredients.filter(i => !i.es_subensamble).map(i => <option key={i.id} value={i.id}>{i.name} ({i.unidad_compra})</option>)}</Select></div>
                    <div className="w-32"><Input label="Cant. Unidades" type="number" value={currentItem.amount} onChange={v => setCurrentItem({ ...currentItem, amount: v })} required /></div>
                    <div className="w-36"><Input label="Vencimiento" type="date" value={currentItem.expiry} onChange={v => setCurrentItem({ ...currentItem, expiry: v })} required /></div>
                    <Button type="submit" variant="primary" className="py-2 h-[38px]">Agregar</Button>
                </form>
                {cart.length > 0 && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-4">
                        <table className="w-full text-left border rounded-xl overflow-hidden"><thead className="bg-slate-900 text-white text-[9px] uppercase tracking-widest"><tr><th className="px-3 py-1.5">Insumo</th><th className="px-3 py-1.5 text-center">Vencimiento</th><th className="px-3 py-1.5 text-right">Cantidad</th><th className="px-3 py-1.5 text-center">Acción</th></tr></thead><tbody className="divide-y divide-slate-100 bg-white font-bold text-xs">{cart.map((item, idx) => (<tr key={idx}><td className="px-3 py-1.5 uppercase text-slate-800">{item.name}</td><td className="px-3 py-1.5 text-center font-mono text-orange-600">{new Date(item.expiry).toLocaleDateString('es-AR')}</td><td className="px-3 py-1.5 text-right text-blue-600 font-mono">{item.amount} {item.unit}</td><td className="px-3 py-1.5 text-center"><button onClick={() => removeFromCart(idx)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={12} className="mx-auto" /></button></td></tr>))}</tbody></table>
                        <Button variant="success" className="w-full py-3" onClick={savePurchase} disabled={!form.providerId}>{form.providerId ? "Confirmar Ingreso a Almacén" : "Falta seleccionar Proveedor arriba"}</Button>
                    </div>
                )}
            </Card>
        </div>
    );
}

function ProductionOrdersView({ recipes, ingredients, lots, orders, setOrders, showToast }) {
    const [form, setForm] = useState({ recipeId: '', amount: '' });
    const [selectedOrder, setSelectedOrder] = useState(null);

    const selectedRecipe = recipes.find(r => r.id === form.recipeId);
    const labelMeta = selectedRecipe?.formato_venta === 'Kg' ? 'Kilos (Meta)' : 'Unidades (Meta)';

    const createOrder = (e) => {
        e.preventDefault();
        if (!form.recipeId || !form.amount) return;
        setOrders([{ id: `OP-${Math.floor(Math.random() * 10000)}`, recipeId: form.recipeId, targetAmount: Number(form.amount), status: 'PLANIFICADA' }, ...orders]);
        setForm({ recipeId: '', amount: '' });
        showToast("Orden de Producción enviada a Cola.");
    };

    const activateOrder = (id) => {
        setOrders(orders.map(o => o.id === id ? { ...o, status: 'PESAJE' } : o));
        setSelectedOrder(null);
        showToast("Orden activada en Kanban de Planta.");
    };

    const getLocation = (ing) => ing?.almacen || 'Almacén Secos Principal';
    const getFefoLot = (ingId) => { const l = lots.filter(x => x.ingredientId === ingId && x.amount > 0).sort((a, b) => new Date(a.expiry) - new Date(b.expiry)); return l.length > 0 ? l[0].id : 'S/Stock'; };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-6 print:hidden">
                    <Card className="fall-target p-5">
                        <h4 className="text-sm font-black uppercase mb-3 italic text-slate-800">1. Crear Orden</h4>
                        <form onSubmit={createOrder} className="space-y-3">
                            <Select label="Ficha Técnica" value={form.recipeId} onChange={e => setForm({ ...form, recipeId: e })} required>
                                <option value="">Seleccionar Producto...</option>
                                {recipes.map(r => <option key={r.id} value={r.id}>{r.nombre_producto}</option>)}
                            </Select>
                            <Input label={labelMeta} type="number" value={form.amount} onChange={v => setForm({ ...form, amount: v })} required />
                            <Button type="submit" variant="primary" className="w-full py-2">Generar Orden</Button>
                        </form>
                    </Card>
                    <Card className="fall-target p-4">
                        <h4 className="text-xs font-black uppercase mb-3 italic border-b pb-2 text-slate-800">2. Pendientes</h4>
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                            {orders.filter(o => o.status === 'PLANIFICADA').map(o => {
                                const rec = recipes.find(r => r.id === o.recipeId);
                                const unitLabel = rec?.formato_venta === 'Kg' ? 'Kg' : 'U';
                                return (
                                    <div key={o.id} onClick={() => setSelectedOrder(o)} className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedOrder?.id === o.id ? 'bg-orange-50 border-orange-400 shadow-sm' : 'hover:bg-slate-50 border-slate-200'}`}>
                                        <p className="text-[9px] font-mono font-bold text-slate-400">{o.id}</p>
                                        <p className="text-[11px] font-black uppercase italic mt-0.5 text-slate-800 truncate">{rec?.nombre_producto}</p>
                                        <p className="text-[9px] font-black text-blue-600 mt-1.5 bg-blue-50 inline-block px-1.5 py-0.5 rounded">{o.targetAmount} {unitLabel}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>

                <Card className="fall-target lg:col-span-2 p-10 bg-white border-2 border-slate-200 shadow-xl print:shadow-none print:border-none min-h-[600px] flex flex-col">
                    {!selectedOrder ? (<div className="flex-1 flex flex-col items-center justify-center text-slate-300 print:hidden"><ClipboardList size={64} className="mb-4 opacity-50" /><p className="text-lg font-black uppercase tracking-widest italic">Seleccioná una orden</p></div>) : (
                        <div className="flex-1 flex flex-col animate-in fade-in">
                            <div className="flex justify-between items-start border-b-4 border-slate-900 pb-4 mb-6">
                                <div>
                                    <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Hoja de Producción</h1>
                                    <p className="text-xs font-bold uppercase text-slate-500 mt-1.5 tracking-[0.2em]">{selectedOrder.id}</p>
                                    <h2 className="text-xl font-black uppercase mt-3 text-orange-600">{recipes.find(r => r.id === selectedOrder.recipeId)?.nombre_producto}</h2>
                                    <p className="text-sm font-black font-mono mt-1">Meta: {selectedOrder.targetAmount} {recipes.find(r => r.id === selectedOrder.recipeId)?.formato_venta === 'Kg' ? 'Kilos' : 'Unidades'}</p>
                                </div>
                                <div className="text-center">
                                    <div className="border-4 border-slate-900 p-2 rounded-lg"><QrCode size={64} /></div>
                                    <p className="text-[8px] font-mono font-black mt-1">QR KANBAN</p>
                                </div>
                            </div>

                            <div className="flex-1 mb-6">
                                <table className="w-full text-left border-2 border-slate-200">
                                    <thead className="bg-slate-100 text-[9px] uppercase font-black text-slate-600">
                                        <tr><th className="px-3 py-1.5 w-10 text-center">OK</th><th className="px-3 py-1.5">Insumo / WIP</th><th className="px-3 py-1.5 text-right">Cant. Físico</th><th className="px-3 py-1.5 text-center">Ubicación</th><th className="px-3 py-1.5 text-center">Lote Sugerido</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 border-t-2 border-slate-200 text-[11px] font-bold text-slate-800">
                                        {recipes.find(r => r.id === selectedOrder.recipeId)?.details?.map((d, i) => {
                                            const recipe = recipes.find(r => r.id === selectedOrder.recipeId);
                                            const ing = ingredients.find(ing => ing.id === d.ingredientId);
                                            let baseYield = recipe.peso_final || 1;
                                            if (recipe.formato_venta === 'Unidad' || !recipe.formato_venta) { baseYield = recipe.peso_final / (recipe.peso_unidad || 100); }
                                            else if (recipe.formato_venta === 'Kg') { baseYield = recipe.peso_final / 1000; }
                                            const factor = selectedOrder.targetAmount / baseYield;
                                            const gramosReales = Number(d.gramos) * factor;
                                            const displayGramos = gramosReales >= 1000 ? `${(gramosReales / 1000).toFixed(2)} Kg` : `${gramosReales.toFixed(0)} g`;
                                            return (
                                                <tr key={i}>
                                                    <td className="px-3 py-1.5 text-center"><Square size={14} className="text-slate-300 mx-auto" /></td>
                                                    <td className="px-3 py-1.5 uppercase">{ing?.name}</td>
                                                    <td className="px-3 py-1.5 text-right font-mono text-blue-700 bg-blue-50/50">{displayGramos}</td>
                                                    <td className="px-3 py-1.5 text-center"><span className="px-1.5 py-0.5 rounded text-[8px] uppercase bg-slate-50 border flex items-center justify-center gap-1"><MapPin size={8} /> {getLocation(ing)}</span></td>
                                                    <td className="px-3 py-1.5 text-center font-mono text-[9px] text-orange-600">{getFefoLot(ing?.id)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="grid grid-cols-2 gap-8 border-t-2 border-dashed pt-6 mb-6 opacity-50">
                                <div className="border-b border-slate-900 pb-1 text-center"><p className="text-[9px] font-black uppercase">Firma Pañolero</p></div>
                                <div className="border-b border-slate-900 pb-1 text-center"><p className="text-[9px] font-black uppercase">Firma Supervisor</p></div>
                            </div>

                            <div className="flex justify-end gap-3 print:hidden mt-auto border-t pt-4">
                                <Button variant="secondary" onClick={() => window.print()} className="py-2"><Printer size={14} /> Imprimir Hoja</Button>
                                <Button variant="success" onClick={() => activateOrder(selectedOrder.id)} className="py-2">Activar Kanban</Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

function KanbanView({ orders, recipes, setOrders, qualityLogs, setQualityLogs, showToast }) {
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState({ temp: '', units: '', reason: '' });

    const moveOrder = (id, newStatus) => { setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o)); };

    const handleFinalize = () => {
        if (!form.temp || !form.units) return;
        setQualityLogs([...qualityLogs, { id: `q${Date.now()}`, orderId: selected.id, temperature: Number(form.temp), status: Number(form.temp) >= 85 ? 'APROBADO' : 'RECHAZADO', timestamp: new Date().toISOString() }]);
        setOrders(orders.map(o => o.id === selected.id ? { ...o, status: 'TERMINADO', realAmount: form.units } : o));
        setSelected(null); setForm({ temp: '', units: '', reason: '' });
        showToast("Lote finalizado e ingresado a Stock Producto Terminado.");
    };

    return (
        <div className="flex gap-4 h-[calc(100vh-220px)] overflow-x-auto pb-4">
            {ETAPAS_KANBAN.map(etapa => (
                <div key={etapa.id} className="fall-target w-64 flex-shrink-0 flex flex-col bg-slate-100 rounded-xl border border-slate-200 shadow-inner">
                    <div className="p-3 bg-white border-b-2 border-slate-200 flex justify-between items-center rounded-t-xl">
                        <div className="flex items-center gap-1.5 font-black text-[9px] uppercase text-slate-800">{etapa.icon} {etapa.nombre}</div>
                        <span className="text-[9px] font-black text-white bg-slate-900 px-1.5 py-0.5 rounded-full">{orders.filter(o => o.status === etapa.id).length}</span>
                    </div>
                    <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5">
                        {orders.filter(o => o.status === etapa.id).map(o => {
                            const rec = recipes.find(r => r.id === o.recipeId);
                            return (
                                <Card key={o.id} className="p-4 hover:border-orange-500 transition-all border-2 border-transparent group shadow-sm bg-white">
                                    <div className="flex justify-between items-center mb-2"><span className="text-[8px] font-mono font-bold text-slate-400">{o.id}</span></div>
                                    <h5 className="font-black text-xs uppercase text-slate-800 leading-tight mb-3 italic truncate" title={rec?.nombre_producto}>{rec?.nombre_producto || 'Cargando...'}</h5>
                                    <div className="flex justify-between items-end border-t border-slate-100 pt-2 mt-1">
                                        <div><p className="text-[7px] font-black uppercase text-slate-400">Meta Lote</p><p className="text-xs font-black text-blue-700 font-mono leading-none mt-0.5">{o.targetAmount}</p></div>
                                        {etapa.id !== 'TERMINADO' && (<button onClick={() => etapa.id === 'CALIDAD' ? setSelected(o) : moveOrder(o.id, ETAPAS_KANBAN[ETAPAS_KANBAN.findIndex(e => e.id === etapa.id) + 1].id)} className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white p-1.5 rounded-md hover:bg-orange-500 shadow-sm"><ArrowRight size={12} /></button>)}
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            ))}
            {selected && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-8 z-50 animate-in fade-in">
                    <Card className="fall-target max-w-xl w-full p-8 border-[6px] border-slate-900 shadow-2xl">
                        <h3 className="text-xl font-black uppercase italic mb-6 border-b pb-3">Auditoría HACCP y Cierre</h3>
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <Input label="Temp. Salida Horno (°C)" type="number" value={form.temp} onChange={v => setForm({ ...form, temp: v })} required />
                                <Input label="Unidades Reales" type="number" value={form.units} onChange={v => setForm({ ...form, units: v })} required />
                            </div>
                            {Number(form.temp) > 0 && Number(form.temp) < 85 && (
                                <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-red-700 flex items-center gap-3"><ShieldCheck size={20} /><p className="text-[9px] font-black uppercase">Bloqueo Sanitario Activo.</p></div>
                            )}
                            <div className="bg-slate-50 p-4 rounded-lg border">
                                <p className="text-[9px] font-black uppercase text-slate-400 mb-2">Clasificar Merma</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Scrap Amasado', 'Quemado', 'Falla Estética', 'Consumo'].map(r => (<button key={r} onClick={() => setForm({ ...form, reason: r })} className={`p-2 text-left rounded-md border-2 font-black uppercase text-[8px] transition-all ${form.reason === r ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400'}`}>{r}</button>))}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-3"><Button onClick={handleFinalize} variant="success" className="flex-1 py-3" disabled={Number(form.temp) < 85 || !form.units || !form.reason}>Finalizar Producción</Button><Button onClick={() => setSelected(null)} variant="secondary" className="px-6">Cancelar</Button></div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

function LogisticsView({ recipes, logistics, setLogistics, branches, showToast }) {
    const [destination, setDestination] = useState('');
    const [currentItem, setCurrentItem] = useState({ recipeId: '', amount: '' });
    const [cart, setCart] = useState([]);
    const [selectedDispatch, setSelectedDispatch] = useState(null);

    const addToCart = (e) => {
        e.preventDefault();
        if (!currentItem.recipeId || !currentItem.amount) return;
        const rec = recipes.find(r => r.id === currentItem.recipeId);
        setCart([...cart, { recipeId: currentItem.recipeId, nombre_producto: rec.nombre_producto, amount: Number(currentItem.amount) }]);
        setCurrentItem({ recipeId: '', amount: '' });
    };

    const saveDispatch = () => {
        if (!destination || cart.length === 0) return;
        const dispatchId = `DESP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        setLogistics([{ id: dispatchId, dispatchId, destination, items: cart, timestamp: new Date().toISOString() }, ...logistics]);
        setDestination(''); setCart([]);
        showToast("Remito emitido y listo para impresión.");
    };

    if (selectedDispatch) {
        return (
            <Card className="fall-target max-w-3xl mx-auto p-10 bg-white border-2 shadow-2xl flex flex-col animate-in zoom-in-95">
                <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-6">
                    <div><h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none text-slate-900">Remito Traslado</h1><p className="text-sm font-bold uppercase text-slate-500 mt-2 tracking-[0.2em]">ID: {selectedDispatch.dispatchId}</p><h2 className="text-xl font-black uppercase mt-4 text-blue-600">Destino: {selectedDispatch.destination}</h2></div>
                    <div className="text-center"><div className="border-4 border-slate-900 p-2 rounded-xl bg-white"><QrCode size={80} /></div><p className="text-[8px] font-mono font-black mt-2">QR RECEPCIÓN</p></div>
                </div>
                <div className="flex-1 mb-8">
                    <table className="w-full text-left border-2 border-slate-200"><thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-600"><tr><th className="p-3 w-12">Ctrl</th><th className="p-3">Producto</th><th className="p-3 text-right">Cantidad</th></tr></thead><tbody className="divide-y border-t-2 border-slate-200 text-sm font-bold text-slate-800">{selectedDispatch.items?.map((item, i) => (<tr key={i}><td className="p-4"><Square size={16} className="text-slate-300" /></td><td className="p-4 uppercase italic">{item.nombre_producto}</td><td className="p-4 text-right font-mono text-blue-700">{item.amount} U</td></tr>))}</tbody></table>
                </div>
                <div className="flex justify-end gap-4 print:hidden"><Button variant="secondary" onClick={() => window.print()} className="py-2"><Printer size={16} /> Imprimir</Button><Button variant="primary" onClick={() => setSelectedDispatch(null)} className="py-2">Cerrar</Button></div>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left animate-in fade-in">
            <div className="lg:col-span-2 space-y-6">
                <Card className="fall-target p-8 border-t-8 border-blue-600 bg-white shadow-xl">
                    <h4 className="text-2xl font-black uppercase italic mb-8 border-b pb-4 flex items-center gap-3 text-slate-800"><Truck className="text-blue-600" size={28} /> Armar Remito</h4>
                    <div className="mb-8"><Select label="Elegir Sucursal Destino" value={destination} onChange={e => setDestination(e)}><option value="">Seleccionar...</option>{branches?.map(b => <option key={b} value={b}>{b}</option>)}</Select></div>
                    <div className="flex gap-4 items-end bg-slate-50 p-6 rounded-2xl border mb-8"><div className="flex-1"><Select label="Producto Terminado" value={currentItem.recipeId} onChange={e => setCurrentItem({ ...currentItem, recipeId: e })}><option value="">Seleccionar...</option>{recipes.filter(r => !r.es_subensamble).map(r => <option key={r.id} value={r.id}>{r.nombre_producto}</option>)}</Select></div><div className="w-32"><Input label="Cantidad" type="number" value={currentItem.amount} onChange={v => setCurrentItem({ ...currentItem, amount: v })} /></div><Button variant="primary" className="py-2.5 h-[42px]" onClick={addToCart}>Agregar</Button></div>
                    {cart.length > 0 && (<div className="space-y-6"><Button variant="success" className="w-full py-4" onClick={saveDispatch}>Emitir Remito Oficial</Button></div>)}
                </Card>
            </div>
            <div className="space-y-6">
                <Card className="fall-target p-6 bg-slate-900 text-white shadow-2xl">
                    <h4 className="font-black uppercase italic mb-6 border-b border-slate-800 pb-3 text-orange-500">Historial</h4>
                    <div className="space-y-3">
                        {logistics.slice(0, 8).map(l => (
                            <div className="p-3 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer hover:border-blue-500" key={l.id} onClick={() => setSelectedDispatch(l)}>
                                <div className="flex justify-between items-center mb-1"><span className="text-[9px] font-mono text-blue-400">{l.dispatchId}</span><span className="text-[8px] text-slate-400 uppercase">{new Date(l.timestamp).toLocaleDateString('es-AR')}</span></div>
                                <p className="text-xs font-black uppercase text-white truncate">{l.destination}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}

function MasterDataView({ ingredients, setIngredients, providers, setProviders, showToast }) {
    const [tab, setTab] = useState('prov');
    const [form, setForm] = useState({ id: null, codigo: '', nombre: '', cuit: '', rubro: '' });
    const [showAdd, setShowAdd] = useState(false);

    const [ingForm, setIngForm] = useState({ id: null, codigo: '', name: '', unidad_compra: 'Bolsa 25kg', familia: 'Harinas y Polvos', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: '' });
    const [showAddIng, setShowAddIng] = useState(false);

    useEffect(() => {
        if (!form.id && showAdd) {
            const prefix = `PRV`;
            let max = 0;
            providers.forEach(p => {
                if (p.codigo && p.codigo.startsWith(prefix)) {
                    const num = parseInt(p.codigo.split('-').pop());
                    if (!isNaN(num) && num > max) max = num;
                }
            });
            setForm(prev => ({ ...prev, codigo: `${prefix}-${String(max + 1).padStart(3, '0')}` }));
        }
    }, [showAdd, providers]);

    useEffect(() => {
        if (!ingForm.id && showAddIng) {
            const catPrefix = ingForm.familia ? ingForm.familia.substring(0, 3).toUpperCase() : 'OTR';
            const prefix = `RAW-${catPrefix}`;
            let max = 0;
            ingredients.forEach(i => {
                if (i.codigo && i.codigo.startsWith(prefix)) {
                    const num = parseInt(i.codigo.split('-').pop());
                    if (!isNaN(num) && num > max) max = num;
                }
            });
            setIngForm(prev => ({ ...prev, codigo: `${prefix}-${String(max + 1).padStart(3, '0')}` }));
        }
    }, [ingForm.familia, showAddIng, ingredients]);

    const saveProvider = () => {
        if (!form.nombre || !form.cuit) return;
        if (form.id) {
            setProviders(providers.map(p => p.id === form.id ? form : p));
            showToast("Proveedor actualizado.");
        } else {
            setProviders([{ ...form, id: `p${Date.now()}` }, ...providers]);
            showToast("Nuevo proveedor registrado.");
        }
        setForm({ id: null, codigo: '', nombre: '', cuit: '', rubro: '' }); setShowAdd(false);
    };

    const saveIngredient = () => {
        if (!ingForm.name || !ingForm.unidad_compra) return;
        if (ingForm.id) {
            setIngredients(ingredients.map(i => i.id === ingForm.id ? { ...i, ...ingForm, costo_estandar: Number(ingForm.costo_estandar) } : i));
            showToast("Insumo actualizado.");
        } else {
            setIngredients([{ ...ingForm, id: `i${Date.now()}`, costo_estandar: Number(ingForm.costo_estandar), es_subensamble: false }, ...ingredients]);
            showToast("Nuevo insumo registrado exitosamente.");
        }
        setIngForm({ id: null, codigo: '', name: '', unidad_compra: 'Bolsa 25kg', familia: 'Harinas y Polvos', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: '' });
        setShowAddIng(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex gap-3 border-b border-slate-200 pb-3">
                {[
                    { id: 'prov', l: 'Catálogo Proveedores' },
                    { id: 'ing', l: 'Insumos y WIP' },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} className={`px-5 py-1.5 rounded-md font-black uppercase text-[9px] transition-all ${tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                        {t.l}
                    </button>
                ))}
            </div>

            {tab === 'prov' && (
                <Card className="fall-target p-6 bg-slate-50">
                    <div className="flex justify-between items-center mb-5">
                        <h4 className="text-base font-black uppercase italic text-slate-800">Directorio de Proveedores</h4>
                        <Button onClick={() => { setShowAdd(!showAdd); setForm({ id: null, codigo: '', nombre: '', cuit: '', rubro: '' }); }} variant={showAdd ? "secondary" : "accent"}>{showAdd ? "Cancelar" : <><Plus size={14} /> Nuevo Proveedor</>}</Button>
                    </div>

                    {showAdd && (
                        <Card className="fall-target p-6 border-4 border-slate-900 bg-white mb-6">
                            <h4 className="text-xs font-black uppercase mb-4 italic">{form.id ? 'Editar Proveedor' : 'Alta Proveedor'}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                                <div className="md:col-span-1"><Input label="Cod. Prov. (Auto)" value={form.codigo} disabled required /></div>
                                <div className="md:col-span-2"><Input label="Razón Social" value={form.nombre} onChange={v => setForm({ ...form, nombre: v })} required /></div>
                                <Input label="CUIT" value={form.cuit} onChange={v => setForm({ ...form, cuit: v })} required />
                                <Input label="Rubro" value={form.rubro} onChange={v => setForm({ ...form, rubro: v })} />
                            </div>
                            <div className="flex justify-end mt-4"><Button onClick={saveProvider} variant="success" className="py-2 px-6">Guardar</Button></div>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {providers.map(p => (
                            <Card key={p.id} className="p-4 bg-white shadow-sm flex items-center justify-between border group">
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-100 p-2 rounded-md text-slate-500"><Briefcase size={18} /></div>
                                    <div>
                                        <h5 className="font-black uppercase italic text-slate-800 text-xs">{p.nombre}</h5>
                                        <div className="flex gap-2 items-center mt-0.5">
                                            <span className="text-[8px] font-mono text-blue-500 bg-blue-50 px-1 rounded">{p.codigo}</span>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">CUIT: {p.cuit}</p>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => { setForm(p); setShowAdd(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors opacity-0 group-hover:opacity-100"><Wrench size={14} /></button>
                            </Card>
                        ))}
                    </div>
                </Card>
            )}

            {tab === 'ing' && (
                <Card className="p-6 bg-slate-50">
                    <div className="flex justify-between items-center mb-5">
                        <h4 className="text-base font-black uppercase italic text-slate-800">Catálogo de Insumos</h4>
                        <Button onClick={() => { setShowAddIng(!showAddIng); setIngForm({ id: null, codigo: '', name: '', unidad_compra: 'Bolsa 25kg', familia: 'Harinas y Polvos', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: '' }); }} variant={showAddIng ? "secondary" : "accent"}>{showAddIng ? "Cancelar" : <><Plus size={14} /> Nuevo Insumo</>}</Button>
                    </div>

                    {showAddIng && (
                        <Card className="p-6 border-4 border-slate-900 bg-white mb-6">
                            <h4 className="text-xs font-black uppercase mb-4 italic">{ingForm.id ? 'Editar Insumo' : 'Alta de Insumo (RAW)'}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                                <div className="md:col-span-1"><Input label="SKU (Auto)" value={ingForm.codigo} disabled required /></div>
                                <div className="md:col-span-2"><Input label="Nombre del Insumo" value={ingForm.name} onChange={v => setIngForm({ ...ingForm, name: v })} required /></div>
                                <Select label="Familia" value={ingForm.familia} onChange={e => setIngForm({ ...ingForm, familia: e })}>
                                    {CATEGORIAS_INSUMO.map(c => <option key={c} value={c}>{c}</option>)}
                                </Select>
                                <Input label="Unidad Compra" placeholder="Ej. Bolsa 25kg..." value={ingForm.unidad_compra} onChange={v => setIngForm({ ...ingForm, unidad_compra: v })} required />

                                <div className="md:col-span-2"><Select label="Ubicación (Almacén)" value={ingForm.almacen} onChange={e => setIngForm({ ...ingForm, almacen: e })}>
                                    {UBICACIONES_ALMACEN.map(u => <option key={u} value={u}>{u}</option>)}
                                </Select></div>
                                <div className="md:col-span-2"><Input label="Alérgenos" placeholder="Ej. TACC, Lácteo" value={ingForm.alergeno} onChange={v => setIngForm({ ...ingForm, alergeno: v })} /></div>
                                <Input label="Costo Est. ($)" type="number" value={ingForm.costo_estandar} onChange={v => setIngForm({ ...ingForm, costo_estandar: v })} required />
                            </div>
                            <div className="flex justify-end mt-4 pt-4 border-t border-slate-100">
                                <Button onClick={saveIngredient} variant="success" className="py-2 px-6">Guardar Insumo</Button>
                            </div>
                        </Card>
                    )}

                    <div className="overflow-hidden border-2 rounded-xl">
                        <table className="w-full text-left font-bold text-xs uppercase text-slate-700">
                            <thead className="bg-slate-900 text-white text-[9px] tracking-widest">
                                <tr>
                                    <th className="px-4 py-2">SKU / Nombre</th>
                                    <th className="px-4 py-2 text-center">Familia</th>
                                    <th className="px-4 py-2 text-center">Ubicación</th>
                                    <th className="px-4 py-2 text-center">Alérgeno</th>
                                    <th className="px-4 py-2 text-right">Costo Est.</th>
                                    <th className="px-4 py-2 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {ingredients.map(i => (
                                    <tr key={i.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-4 py-1.5">
                                            <div className="font-black flex items-center gap-1.5 text-slate-800">
                                                {i.es_subensamble && <Layers size={12} className="text-orange-500" />}
                                                {i.name}
                                            </div>
                                            <div className="flex gap-2 items-center mt-0.5">
                                                <span className="text-[8px] font-mono text-blue-500 bg-blue-50 px-1 rounded">{i.codigo}</span>
                                                <span className="text-[8px] text-slate-400 font-normal lowercase block">({i.unidad_compra})</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-1.5 text-center text-[9px] text-slate-500">{i.familia || 'Otros'}</td>
                                        <td className="px-4 py-1.5 text-center">
                                            <span className="bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded text-[8px]">{i.almacen || 'Sin Asignar'}</span>
                                        </td>
                                        <td className="px-4 py-1.5 text-center">
                                            {i.alergeno ? <span className="bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded text-[8px]">{i.alergeno}</span> : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="px-4 py-1.5 text-right font-mono text-emerald-600">${i.costo_estandar || 0}</td>
                                        <td className="px-4 py-1.5 text-center">
                                            {!i.es_subensamble && (
                                                <button onClick={() => { setIngForm({ id: i.id, codigo: i.codigo, name: i.name, unidad_compra: i.unidad_compra, familia: i.familia || 'Harinas y Polvos', almacen: i.almacen || 'Almacén Secos Principal', alergeno: i.alergeno, costo_estandar: i.costo_estandar }); setShowAddIng(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors opacity-0 group-hover:opacity-100"><Wrench size={12} /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
}

function SettingsView({ config, setConfig, showToast }) {
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

    return (
        <div className="space-y-6 animate-in fade-in max-w-4xl">
            <Card className="fall-target p-6 border-t-8 border-slate-900 bg-white shadow-md">
                <div className="flex items-center gap-3 mb-5 border-b pb-3"><Building className="text-slate-800" size={24} /><h4 className="text-xl font-black uppercase italic text-slate-800">Datos de la Empresa</h4></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <Input label="Nombre de la Empresa / Marca" value={form.companyName} onChange={v => setForm({ ...form, companyName: v })} />
                    <Input label="Subtítulo / Versión del Sistema" value={form.appName} onChange={v => setForm({ ...form, appName: v })} />
                </div>
            </Card>

            <Card className="fall-target p-6 border-t-8 border-emerald-500 bg-emerald-50/30 shadow-md">
                <div className="flex items-center gap-3 mb-5 border-b border-emerald-200 pb-3"><Calculator className="text-emerald-600" size={24} /><h4 className="text-xl font-black uppercase italic text-emerald-900">Variables Financieras Globales</h4></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <Input label="Costo Mano Obra ($ / Hora)" type="number" value={form.finanzas.costoHoraHombre} onChange={v => setForm({ ...form, finanzas: { ...form.finanzas, costoHoraHombre: Number(v) } })} />
                    <Input label="Gastos Indirectos" type="number" value={form.finanzas.costosIndirectosPct} suffix="% de MP" onChange={v => setForm({ ...form, finanzas: { ...form.finanzas, costosIndirectosPct: Number(v) } })} />
                    <Input label="Markup (Margen)" type="number" value={form.finanzas.margenGanancia} suffix="%" onChange={v => setForm({ ...form, finanzas: { ...form.finanzas, margenGanancia: Number(v) } })} />
                </div>
            </Card>

            <div className="flex justify-end">
                <Button variant="success" onClick={saveCompanyData} className="px-10 py-3 shadow-md">Guardar Configuración</Button>
            </div>

            <Card className="fall-target p-6 border-t-8 border-orange-500 bg-white shadow-md">
                <div className="flex items-center gap-3 mb-5 border-b pb-3"><Store className="text-orange-500" size={24} /><h4 className="text-xl font-black uppercase italic text-slate-800">Locales y Sucursales</h4></div>
                <form onSubmit={addBranch} className="flex gap-4 items-end bg-slate-50 p-5 rounded-xl border mb-6"><div className="flex-1"><Input label="Nombre de la Nueva Sucursal" placeholder="Ej. Local Norte..." value={newBranch} onChange={setNewBranch} /></div><Button variant="primary" type="submit" className="py-2 px-5 h-[38px]"><Plus size={14} /> Agregar</Button></form>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {form.branches.map(branch => (
                        <div key={branch} className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-lg shadow-sm hover:border-orange-300 transition-colors group"><span className="font-bold text-xs text-slate-700 uppercase tracking-wide truncate pr-2">{branch}</span><button onClick={() => removeBranch(branch)} className="text-slate-300 hover:text-red-500 p-1.5 rounded-md group-hover:bg-red-50"><Trash2 size={14} /></button></div>
                    ))}
                </div>
            </Card>
        </div>
    );
}