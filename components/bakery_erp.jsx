'use client';
import React, { useState } from 'react';
import {
    TrendingDown, Layers, ShieldCheck, Settings, ShoppingBag, Plus, Trash2, Coins,
    Factory, Briefcase, Warehouse, ThermometerSun, ArrowRight, Truck, Layout, Clock,
    ClipboardList, Printer, QrCode, Square, MapPin, AlertTriangle, Wrench, Building, Store,
    Hash
} from 'lucide-react';

// ============================================================================
// DATOS MAESTROS PRE-CARGADOS
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

function ScaleIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="M7 21h10" /><path d="M12 3v18" /><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" /></svg>;
}

const ETAPAS_KANBAN = [
    { id: 'PESAJE', nombre: 'Pesada', icon: <ScaleIcon /> },
    { id: 'AMASADO', nombre: 'Amasijo (WIP)', icon: <Factory size={16} /> },
    { id: 'FERMENTACION', nombre: 'Fermentación', icon: <Clock size={16} /> },
    { id: 'HORNEADO', nombre: 'Horneado', icon: <ThermometerSun size={16} /> },
    { id: 'CALIDAD', nombre: 'Control HACCP', icon: <ShieldCheck size={16} /> },
    { id: 'TERMINADO', nombre: 'Stock Planta', icon: <Warehouse size={16} /> }
];

const INITIAL_PROVIDERS = [
    { id: 'p1', nombre: 'Molino Cañuelas', cuit: '30-12345678-1', rubro: 'Harinas' },
    { id: 'p2', nombre: 'Lácteos La Serenísima', cuit: '30-87654321-2', rubro: 'Lácteos' },
    { id: 'p3', nombre: 'Levaduras Calsa', cuit: '30-11122233-3', rubro: 'Fermentos' },
    { id: 'p4', nombre: 'Distribuidora Oeste', cuit: '30-44455566-4', rubro: 'Generales' },
    { id: 'p5', nombre: 'Huevos San Juan', cuit: '30-99988877-5', rubro: 'Huevos' }
];

const INITIAL_INGREDIENTS = [
    { id: 'i1', name: 'Harina 000 (Fuerza)', unidad_compra: 'Bolsa 25kg', reqFrio: false, alergeno: 'TACC', costo_estandar: 0.8 },
    { id: 'i2', name: 'Harina 0000 (Pastelera)', unidad_compra: 'Bolsa 25kg', reqFrio: false, alergeno: 'TACC', costo_estandar: 1.2 },
    { id: 'i3', name: 'Agua Filtrada', unidad_compra: 'Litros', reqFrio: false, alergeno: '', costo_estandar: 0.05 },
    { id: 'i4', name: 'Sal Fina', unidad_compra: 'Bolsa 5kg', reqFrio: false, alergeno: '', costo_estandar: 0.5 },
    { id: 'i5', name: 'Levadura Fresca', unidad_compra: 'Paquete 500g', reqFrio: true, alergeno: '', costo_estandar: 3.0 },
    { id: 'i6', name: 'Manteca Extrafina', unidad_compra: 'Caja 20kg', reqFrio: true, alergeno: 'Lácteo', costo_estandar: 8.5 },
    { id: 'i7', name: 'Azúcar Común', unidad_compra: 'Bolsa 50kg', reqFrio: false, alergeno: '', costo_estandar: 1.0 },
    { id: 'i8', name: 'Huevo Líquido', unidad_compra: 'Sachet 5L', reqFrio: true, alergeno: 'Huevo', costo_estandar: 4.2 },
    { id: 'i9', name: 'Chocolate Cobertura', unidad_compra: 'Caja 5kg', reqFrio: false, alergeno: 'Lácteo', costo_estandar: 12.0 },
    { id: 'i10', name: 'Dulce de Leche Repostero', unidad_compra: 'Tacho 10kg', reqFrio: false, alergeno: 'Lácteo', costo_estandar: 5.5 },
    { id: 'i11', name: 'Polvo de Hornear', unidad_compra: 'Tarro 2kg', reqFrio: false, alergeno: '', costo_estandar: 6.0 },
    { id: 'i12', name: 'Esencia de Vainilla', unidad_compra: 'Botella 1L', reqFrio: false, alergeno: '', costo_estandar: 4.0 },
    { id: 'i13', name: 'Margarina para Hojaldre', unidad_compra: 'Caja 10kg', reqFrio: false, alergeno: 'Lácteo', costo_estandar: 6.8 },
    { id: 'i14', name: 'Crema de Leche 36%', unidad_compra: 'Bidón 5L', reqFrio: true, alergeno: 'Lácteo', costo_estandar: 7.5 },
    { id: 'i15', name: 'Queso Crema', unidad_compra: 'Balde 5kg', reqFrio: true, alergeno: 'Lácteo', costo_estandar: 9.0 },
    { id: 'i16', name: 'Mermelada de Membrillo', unidad_compra: 'Lata 5kg', reqFrio: false, alergeno: '', costo_estandar: 3.5 },
    { id: 'wip1', name: '[WIP] Masa Madre Activa', unidad_compra: 'Gramos', reqFrio: true, alergeno: 'TACC', costo_estandar: 1.5, es_subensamble: true },
    { id: 'wip2', name: '[WIP] Crema Pastelera', unidad_compra: 'Gramos', reqFrio: true, alergeno: 'Lácteo, Huevo', costo_estandar: 3.2, es_subensamble: true }
];

const INITIAL_LOTS = [
    { id: 'lot1', ingredientId: 'i1', amount: 500000, expiry: '2026-12-01' },
    { id: 'lot2', ingredientId: 'i2', amount: 250000, expiry: '2026-10-15' },
    { id: 'lot3', ingredientId: 'i6', amount: 40000, expiry: '2026-06-20' },
    { id: 'lot4', ingredientId: 'i10', amount: 30000, expiry: '2026-08-30' },
    { id: 'lot5', ingredientId: 'wip1', amount: 15000, expiry: '2026-02-28' }
];

// Sembrado Masivo de Fichas (4 por familia)
const INITIAL_RECIPES = [
    // Familia F: Panificados
    { id: 'r1', codigo: 'PAN-001', nombre_producto: 'Baguette Clásica', familia: 'F', version: 1, merma: 15, formato_venta: 'Unidad', peso_unidad: 250, details: [{ ingredientId: 'i1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i3', porcentaje: 65, gramos: 650 }, { ingredientId: 'i4', porcentaje: 2, gramos: 20 }, { ingredientId: 'i5', porcentaje: 1.5, gramos: 15 }] },
    { id: 'r2', codigo: 'PAN-002', nombre_producto: 'Pan de Campo', familia: 'F', version: 2, merma: 12, formato_venta: 'Unidad', peso_unidad: 500, details: [{ ingredientId: 'i1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'wip1', porcentaje: 20, gramos: 200 }, { ingredientId: 'i3', porcentaje: 70, gramos: 700 }, { ingredientId: 'i4', porcentaje: 2.2, gramos: 22 }] },
    { id: 'r3', codigo: 'PAN-003', nombre_producto: 'Pan de Miga Especial', familia: 'F', version: 1, merma: 8, formato_venta: 'Kg', peso_unidad: null, details: [{ ingredientId: 'i1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i3', porcentaje: 55, gramos: 550 }, { ingredientId: 'i4', porcentaje: 2, gramos: 20 }, { ingredientId: 'i5', porcentaje: 3, gramos: 30 }, { ingredientId: 'i6', porcentaje: 5, gramos: 50 }] },
    { id: 'r4', codigo: 'PAN-004', nombre_producto: 'Figaza de Manteca', familia: 'F', version: 1, merma: 10, formato_venta: 'Kg', peso_unidad: null, details: [{ ingredientId: 'i1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i3', porcentaje: 50, gramos: 500 }, { ingredientId: 'i6', porcentaje: 15, gramos: 150 }, { ingredientId: 'i4', porcentaje: 2, gramos: 20 }, { ingredientId: 'i5', porcentaje: 4, gramos: 40 }] },

    // Familia A: Batidos
    { id: 'r5', codigo: 'BAT-001', nombre_producto: 'Budín de Vainilla', familia: 'A', version: 1, merma: 10, formato_venta: 'Unidad', peso_unidad: 350, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i7', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i8', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i6', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i11', porcentaje: 3, gramos: 30 }, { ingredientId: 'i12', porcentaje: 2, gramos: 20 }] },
    { id: 'r6', codigo: 'BAT-002', nombre_producto: 'Bizcochuelo Clásico', familia: 'A', version: 1, merma: 12, formato_venta: 'Unidad', peso_unidad: 800, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i7', parse: 100, gramos: 1000 }, { ingredientId: 'i8', porcentaje: 120, gramos: 1200 }, { ingredientId: 'i12', porcentaje: 1, gramos: 10 }] },
    { id: 'r7', codigo: 'BAT-003', nombre_producto: 'Muffins de Chocolate', familia: 'A', version: 1, merma: 8, formato_venta: 'Unidad', peso_unidad: 120, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i7', porcentaje: 80, gramos: 800 }, { ingredientId: 'i8', porcentaje: 80, gramos: 800 }, { ingredientId: 'i9', porcentaje: 20, gramos: 200 }, { ingredientId: 'i6', porcentaje: 50, gramos: 500 }, { ingredientId: 'i11', porcentaje: 4, gramos: 40 }] },
    { id: 'r8', codigo: 'BAT-004', nombre_producto: 'Pionono', familia: 'A', version: 1, merma: 5, formato_venta: 'Unidad', peso_unidad: 200, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i7', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i8', porcentaje: 150, gramos: 1500 }] },

    // Familia B: Ensamblados
    { id: 'r9', codigo: 'ENS-001', nombre_producto: 'Sándwich Miga J&Q', familia: 'B', version: 1, merma: 0, formato_venta: 'Unidad', peso_unidad: 100, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i6', porcentaje: 10, gramos: 100 }] },
    { id: 'r10', codigo: 'ENS-002', nombre_producto: 'Pebete Relleno', familia: 'B', version: 1, merma: 0, formato_venta: 'Unidad', peso_unidad: 150, details: [{ ingredientId: 'i1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i6', porcentaje: 15, gramos: 150 }] },
    { id: 'r11', codigo: 'ENS-003', nombre_producto: 'Fosforito J&Q', familia: 'B', version: 1, merma: 0, formato_venta: 'Unidad', peso_unidad: 60, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i6', porcentaje: 20, gramos: 200 }] },
    { id: 'r12', codigo: 'ENS-004', nombre_producto: 'Chips Caseros', familia: 'B', version: 1, merma: 5, formato_venta: 'Kg', peso_unidad: null, details: [{ ingredientId: 'i1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i3', porcentaje: 50, gramos: 500 }, { ingredientId: 'i6', porcentaje: 10, gramos: 100 }, { ingredientId: 'i7', porcentaje: 5, gramos: 50 }, { ingredientId: 'i5', porcentaje: 4, gramos: 40 }] },

    // Familia C: Pastelería
    { id: 'r13', codigo: 'PAS-001', nombre_producto: 'Torta Selva Negra', familia: 'C', version: 2, merma: 5, formato_venta: 'Unidad', peso_unidad: 1500, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i7', porcentaje: 120, gramos: 1200 }, { ingredientId: 'i9', porcentaje: 40, gramos: 400 }, { ingredientId: 'i14', porcentaje: 150, gramos: 1500 }, { ingredientId: 'i8', porcentaje: 120, gramos: 1200 }] },
    { id: 'r14', codigo: 'PAS-002', nombre_producto: 'Lemon Pie', familia: 'C', version: 1, merma: 5, formato_venta: 'Unidad', peso_unidad: 1200, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i6', porcentaje: 50, gramos: 500 }, { ingredientId: 'i7', porcentaje: 80, gramos: 800 }, { ingredientId: 'i8', porcentaje: 60, gramos: 600 }] },
    { id: 'r15', codigo: 'PAS-003', nombre_producto: 'Cheesecake', familia: 'C', version: 2, merma: 8, formato_venta: 'Unidad', peso_unidad: 1800, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i15', porcentaje: 200, gramos: 2000 }, { ingredientId: 'i14', porcentaje: 50, gramos: 500 }, { ingredientId: 'i7', porcentaje: 80, gramos: 800 }, { ingredientId: 'i8', porcentaje: 40, gramos: 400 }] },
    { id: 'r16', codigo: 'PAS-004', nombre_producto: 'Tarta Frutal', familia: 'C', version: 1, merma: 5, formato_venta: 'Unidad', peso_unidad: 1300, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i6', porcentaje: 50, gramos: 500 }, { ingredientId: 'i7', porcentaje: 40, gramos: 400 }, { ingredientId: 'wip2', porcentaje: 150, gramos: 1500 }] },

    // Familia D: Hojaldres
    { id: 'r17', codigo: 'HOJ-001', nombre_producto: 'Medialuna de Manteca', familia: 'D', version: 1, merma: 18, formato_venta: 'Unidad', peso_unidad: 45, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i3', porcentaje: 45, gramos: 450 }, { ingredientId: 'i7', porcentaje: 15, gramos: 150 }, { ingredientId: 'i6', porcentaje: 40, gramos: 400 }, { ingredientId: 'i5', porcentaje: 4, gramos: 40 }, { ingredientId: 'i4', porcentaje: 1.5, gramos: 15 }] },
    { id: 'r18', codigo: 'HOJ-002', nombre_producto: 'Vigilante', familia: 'D', version: 1, merma: 15, formato_venta: 'Unidad', peso_unidad: 55, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i3', porcentaje: 45, gramos: 450 }, { ingredientId: 'i7', porcentaje: 15, gramos: 150 }, { ingredientId: 'i13', porcentaje: 35, gramos: 350 }, { ingredientId: 'i5', porcentaje: 3.5, gramos: 35 }] },
    { id: 'r19', codigo: 'HOJ-003', nombre_producto: 'Cañoncito DDL', familia: 'D', version: 1, merma: 12, formato_venta: 'Unidad', peso_unidad: 65, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i3', porcentaje: 45, gramos: 450 }, { ingredientId: 'i13', porcentaje: 50, gramos: 500 }, { ingredientId: 'i4', porcentaje: 2, gramos: 20 }, { ingredientId: 'i10', porcentaje: 60, gramos: 600 }] },
    { id: 'r20', codigo: 'HOJ-004', nombre_producto: 'Palmera Grande', familia: 'D', version: 1, merma: 10, formato_venta: 'Unidad', peso_unidad: 120, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i3', porcentaje: 50, gramos: 500 }, { ingredientId: 'i13', porcentaje: 60, gramos: 600 }, { ingredientId: 'i7', porcentaje: 40, gramos: 400 }] },

    // Familia E: Secos
    { id: 'r21', codigo: 'SEC-001', nombre_producto: 'Galletas Pepas', familia: 'E', version: 1, merma: 8, formato_venta: 'Kg', peso_unidad: null, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i6', porcentaje: 50, gramos: 500 }, { ingredientId: 'i7', porcentaje: 50, gramos: 500 }, { ingredientId: 'i8', porcentaje: 20, gramos: 200 }, { ingredientId: 'i11', porcentaje: 2, gramos: 20 }, { ingredientId: 'i16', porcentaje: 40, gramos: 400 }] },
    { id: 'r22', codigo: 'SEC-002', nombre_producto: 'Alfajor de Maicena', familia: 'E', version: 1, merma: 5, formato_venta: 'Unidad', peso_unidad: 80, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i6', porcentaje: 60, gramos: 600 }, { ingredientId: 'i7', porcentaje: 40, gramos: 400 }, { ingredientId: 'i8', porcentaje: 25, gramos: 250 }, { ingredientId: 'i10', porcentaje: 80, gramos: 800 }] },
    { id: 'r23', codigo: 'SEC-003', nombre_producto: 'Palmeritas', familia: 'E', version: 1, merma: 10, formato_venta: 'Kg', peso_unidad: null, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i13', porcentaje: 70, gramos: 700 }, { ingredientId: 'i7', porcentaje: 30, gramos: 300 }, { ingredientId: 'i3', porcentaje: 45, gramos: 450 }] },
    { id: 'r24', codigo: 'SEC-004', nombre_producto: 'Polvorones', familia: 'E', version: 1, merma: 6, formato_venta: 'Kg', peso_unidad: null, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i6', porcentaje: 40, gramos: 400 }, { ingredientId: 'i7', porcentaje: 40, gramos: 400 }, { ingredientId: 'i8', porcentaje: 10, gramos: 100 }, { ingredientId: 'i11', porcentaje: 3, gramos: 30 }] }
];

// Mapeo inicial de pesos para el catálogo
INITIAL_RECIPES.forEach(r => {
    const pesoCrudo = r.details.reduce((a, b) => a + Number(b.gramos || 0), 0);
    r.peso_final = pesoCrudo * (1 - (r.merma / 100));
});

const INITIAL_ORDERS = [
    { id: 'OP-17084', recipeId: 'r1', targetAmount: 500, status: 'PLANIFICADA' },
    { id: 'OP-17085', recipeId: 'r17', targetAmount: 300, status: 'FERMENTACION' }
];

const INITIAL_LOGISTICS = [
    { id: 'l1', dispatchId: 'DESP-8A9X', destination: 'Local Morón Centro', timestamp: '2026-02-20T08:30:00Z', items: [{ nombre_producto: 'Baguette Clásica', amount: 200 }] }
];

const INITIAL_CONFIG = {
    companyName: 'IMPERIO',
    appName: 'MES PRO V11',
    branches: ['Morón Centro', 'Castelar']
};

// ============================================================================
// COMPONENTES UI (Widgets Reutilizables)
// ============================================================================

const Card = ({ children, className = "" }) => (
    <div className={`border border-slate-200 rounded-xl shadow-sm overflow-hidden ${className.includes('bg-') ? className : 'bg-white ' + className}`}>
        {children}
    </div>
);

const Button = ({ children, onClick, variant = 'primary', className = "", disabled = false, type = "button" }) => {
    const styles = {
        primary: "bg-slate-900 text-white hover:bg-black",
        secondary: "bg-white text-slate-700 hover:bg-slate-50 border border-slate-300",
        success: "bg-emerald-600 text-white hover:bg-emerald-700",
        accent: "bg-orange-600 text-white hover:bg-orange-700",
        danger: "bg-red-50 text-red-600 hover:bg-red-100",
        ghost: "bg-transparent text-slate-500 hover:text-slate-900"
    };
    return <button disabled={disabled} type={type} onClick={onClick} className={`px-4 py-2 rounded-lg font-bold uppercase text-[11px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${styles[variant]} ${className}`}>{children}</button>;
};

const Input = ({ label, type = "text", value, onChange, placeholder, required = false }) => (
    <div className="flex flex-col gap-1 w-full text-left">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label} {required && "*"}</label>
        <input type={type} value={value} required={required} onChange={(e) => onChange ? onChange(e.target.value) : null} placeholder={placeholder} className="border border-slate-200 bg-white rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 text-sm font-semibold text-slate-800 transition-all shadow-sm" />
    </div>
);

const Select = ({ label, value, onChange, required = false, children }) => (
    <div className="flex flex-col gap-1 w-full text-left">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label} {required && "*"}</label>
        <select value={value} required={required} onChange={(e) => onChange ? onChange(e.target.value) : null} className="border border-slate-200 bg-white rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 text-sm font-semibold text-slate-800 transition-all shadow-sm cursor-pointer">
            {children}
        </select>
    </div>
);

// ============================================================================
// APLICACIÓN PRINCIPAL (ERP)
// ============================================================================

export default function BakeryMES() {
    const [currentRole, setCurrentRole] = useState(ROLES.ADMIN);
    const [view, setView] = useState('engineering'); // Iniciamos en engineering para que veas el diseño

    const [ingredients, setIngredients] = useState(INITIAL_INGREDIENTS);
    const [recipes, setRecipes] = useState(INITIAL_RECIPES);
    const [providers, setProviders] = useState(INITIAL_PROVIDERS);
    const [lots, setLots] = useState(INITIAL_LOTS);
    const [orders, setOrders] = useState(INITIAL_ORDERS);
    const [logistics, setLogistics] = useState(INITIAL_LOGISTICS);
    const [purchases, setPurchases] = useState([]);
    const [qualityLogs, setQualityLogs] = useState([]);
    const [config, setConfig] = useState(INITIAL_CONFIG);

    const menuItems = [
        { id: 'dashboard', label: 'Monitor Central', icon: <TrendingDown size={18} /> },
        { id: 'purchases', label: 'Ingreso Insumos', icon: <ShoppingBag size={18} /> },
        { id: 'orders', label: 'Órdenes Producción', icon: <ClipboardList size={18} /> },
        { id: 'kanban', label: 'Kanban WIP (Planta)', icon: <Layout size={18} /> },
        { id: 'engineering', label: 'Ingeniería MultiBOM', icon: <Layers size={18} /> },
        { id: 'logistics', label: 'Despacho Locales', icon: <Truck size={18} /> },
        { id: 'master_data', label: 'Maestros Base', icon: <Briefcase size={18} /> },
        { id: 'settings', label: 'Configuración', icon: <Settings size={18} /> },
    ];

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden text-left">
            <aside className="w-64 bg-slate-950 text-white flex flex-col shrink-0 shadow-2xl z-10 border-r border-slate-900 print:hidden">
                <div className="p-6 border-b border-slate-900 flex items-center gap-3 mb-2">
                    <div className="bg-orange-600 p-2 rounded-xl text-white"><Factory size={20} /></div>
                    <div className="overflow-hidden">
                        <h1 className="text-xl font-black italic uppercase leading-none truncate max-w-[140px]">{config.companyName}</h1>
                        <p className="text-orange-500 text-[9px] font-black uppercase tracking-widest mt-1 truncate">{config.appName}</p>
                    </div>
                </div>
                <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
                    {menuItems.map(item => (
                        <button key={item.id} onClick={() => setView(item.id)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-wider ${view === item.id ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-900 hover:text-white'}`}>
                            {item.icon} {item.label}
                        </button>
                    ))}
                </nav>
            </aside>

            <main className="flex-1 overflow-y-auto p-10 relative bg-slate-50 print:p-0 print:bg-white">
                <header className="flex justify-between items-center mb-8 border-b border-slate-200 pb-6 print:hidden">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">{menuItems.find(m => m.id === view)?.label}</h2>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-2 leading-none italic">Sistema Integral de Manufactura Panadera</p>
                    </div>
                </header>

                {view === 'dashboard' && <DashboardView recipes={recipes} ingredients={ingredients} lots={lots} orders={orders} logistics={logistics} quality={qualityLogs} setLots={setLots} providers={providers} />}
                {view === 'purchases' && <PurchasesView providers={providers} ingredients={ingredients} purchases={purchases} setPurchases={setPurchases} lots={lots} setLots={setLots} />}
                {view === 'orders' && <ProductionOrdersView recipes={recipes} ingredients={ingredients} lots={lots} orders={orders} setOrders={setOrders} />}
                {view === 'kanban' && <KanbanView orders={orders} recipes={recipes} setOrders={setOrders} qualityLogs={qualityLogs} setQualityLogs={setQualityLogs} />}
                {view === 'engineering' && <EngineeringView recipes={recipes} ingredients={ingredients} setRecipes={setRecipes} setIngredients={setIngredients} />}
                {view === 'logistics' && <LogisticsView recipes={recipes} logistics={logistics} setLogistics={setLogistics} branches={config.branches} />}
                {view === 'master_data' && <MasterDataView providers={providers} setProviders={setProviders} />}
                {view === 'settings' && <SettingsView config={config} setConfig={setConfig} />}
            </main>
        </div>
    );
}

// ============================================================================
// VISTAS 
// ============================================================================

function EngineeringView({ recipes, ingredients, setRecipes, setIngredients }) {
    const [showAdd, setShowAdd] = useState(false);

    // Estado del Formulario con el nuevo campo "codigo"
    const [form, setForm] = useState({
        id: null,
        codigo: '',
        nombre: '',
        familia: 'F',
        ver: 1,
        wip: false,
        merma: 15,
        formato_venta: 'Unidad',
        peso_unidad: 100,
        details: []
    });

    const pesoCrudo = form.details.reduce((a, b) => a + Number(b.gramos || 0), 0);
    const pesoFinal = pesoCrudo * (1 - (form.merma / 100));
    const hasFlourBase = form.details.some(d => Number(d.porcentaje) === 100);

    const save = () => {
        if (!form.nombre || !form.codigo || !hasFlourBase) return;

        const recipeData = {
            codigo: form.codigo.toUpperCase(),
            nombre_producto: form.nombre,
            familia: form.familia,
            version: form.ver,
            es_subensamble: form.wip,
            merma: form.merma,
            formato_venta: form.formato_venta,
            peso_unidad: form.formato_venta === 'Unidad' ? Number(form.peso_unidad) : null,
            peso_crudo: pesoCrudo,
            peso_final: pesoFinal,
            details: form.details
        };

        if (form.id) {
            setRecipes(recipes.map(r => r.id === form.id ? { ...r, ...recipeData, id: r.id } : r));
        } else {
            const newId = `r${Date.now()}`;
            setRecipes([{ id: newId, ...recipeData }, ...recipes]);
            if (form.wip) {
                setIngredients([...ingredients, { id: `wip${Date.now()}`, name: `[WIP] ${form.nombre}`, factor_conversion: 1, es_subensamble: true, requiere_frio: true, costo_estandar: 0 }]);
            }
        }

        setShowAdd(false);
        setForm({ id: null, codigo: '', nombre: '', familia: 'F', ver: 1, wip: false, merma: 15, formato_venta: 'Unidad', peso_unidad: 100, details: [] });
    };

    const handleEdit = (rec) => {
        setForm({
            id: rec.id,
            codigo: rec.codigo || '',
            nombre: rec.nombre_producto,
            familia: rec.familia,
            ver: (rec.version || 1) + 1,
            wip: !!rec.es_subensamble,
            merma: rec.merma || 15,
            formato_venta: rec.formato_venta || 'Unidad',
            peso_unidad: rec.peso_unidad || 100,
            details: rec.details ? [...rec.details] : []
        });
        setShowAdd(true);
    };

    const handleDelete = (id) => { if (confirm("¿Eliminar Ficha?")) setRecipes(recipes.filter(r => r.id !== id)); };

    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="bg-white p-6 rounded-2xl border shadow-sm flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-black uppercase italic text-slate-800">Maestro MultiBOM</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Catálogo de Fichas Técnicas de Planta</p>
                </div>
                <Button onClick={() => { setShowAdd(!showAdd); if (!showAdd) setForm({ id: null, codigo: '', nombre: '', familia: 'F', ver: 1, wip: false, merma: 15, formato_venta: 'Unidad', peso_unidad: 100, details: [] }); }} variant={showAdd ? "secondary" : "accent"}>
                    {showAdd ? "Cancelar" : <><Plus size={16} /> Nueva Ficha</>}
                </Button>
            </div>

            {showAdd && (
                <Card className="p-10 border-[6px] border-slate-900 bg-white shadow-2xl animate-in slide-in-from-top-4">

                    {/* NUEVO DISEÑO DE CABECERA: Fondo diferenciado y organizado */}
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 space-y-6">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-2">
                            <Hash size={18} className="text-slate-400" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-600">Datos de Identificación</h4>
                        </div>

                        {/* Fila 1: Nombres y Códigos */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            <div className="md:col-span-4 lg:col-span-3">
                                <Input label="Código SKU" value={form.codigo} onChange={v => setForm({ ...form, codigo: v })} placeholder="Ej. PAN-001" required />
                            </div>
                            <div className="md:col-span-8 lg:col-span-9">
                                <Input label="Nombre del Producto o WIP" value={form.nombre} onChange={v => setForm({ ...form, nombre: v })} placeholder="Ej. Baguette Clásica" required />
                            </div>
                        </div>

                        {/* Fila 2: Clasificación y Formatos */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                            <div className="md:col-span-5 lg:col-span-4">
                                <Select label="Familia" value={form.familia} onChange={e => setForm({ ...form, familia: e })}>
                                    {Object.values(FAMILIAS).map(f => <option key={f.id} value={f.id}>{f.id} - {f.nombre}</option>)}
                                </Select>
                            </div>

                            <div className="md:col-span-3 lg:col-span-3">
                                <Select label="Formato Venta" value={form.formato_venta} onChange={e => setForm({ ...form, formato_venta: e })}>
                                    <option value="Unidad">Por Unidad (U)</option>
                                    <option value="Kg">Por Kilo (Kg)</option>
                                </Select>
                            </div>

                            <div className="md:col-span-2 lg:col-span-2">
                                {form.formato_venta === 'Unidad' ? (
                                    <Input label="Peso Unidad (g)" type="number" value={form.peso_unidad} onChange={v => setForm({ ...form, peso_unidad: v })} required />
                                ) : (
                                    <div className="text-[10px] font-bold text-slate-400 uppercase h-[42px] flex items-center justify-center border border-dashed border-slate-200 rounded-lg bg-slate-100/50">
                                        Granel
                                    </div>
                                )}
                            </div>

                            <div className="md:col-span-2 lg:col-span-3">
                                <label className="flex items-center justify-center gap-3 p-2 bg-white rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:border-orange-400 transition-colors h-[42px]">
                                    <input type="checkbox" checked={form.wip} onChange={e => setForm({ ...form, wip: e.target.checked })} className="w-5 h-5 accent-orange-600" />
                                    <span className="text-[10px] font-black uppercase text-slate-700 leading-tight">Es Sub-ensamble?<br /><span className="text-[8px] text-slate-400 tracking-widest">(Genera WIP)</span></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="mb-8">
                        <div className="flex justify-between items-end mb-4">
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest bg-slate-100 px-3 py-1 rounded-lg">Ingredientes del Amasijo (Escandallo)</p>
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">% Merma Horno</label>
                                <input type="number" value={form.merma} onChange={e => setForm({ ...form, merma: e.target.value })} className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold w-20 outline-none text-center focus:border-orange-500" />
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-900 text-white text-[9px] uppercase tracking-widest">
                                    <tr>
                                        <th className="p-3">Componente</th>
                                        <th className="p-3 w-32 text-center">% Panadero</th>
                                        <th className="p-3 w-32 text-center">Gramos Teór.</th>
                                        <th className="p-3 w-12 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {form.details.map((l, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-2 border-r border-slate-100">
                                                <select className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer p-2" value={l.ingredientId} onChange={e => { const nd = [...form.details]; nd[i].ingredientId = e.target.value; setForm({ ...form, details: nd }) }}>
                                                    <option value="" disabled>Seleccionar Componente...</option>
                                                    {ingredients.map(ing => (<option key={ing.id} value={ing.id}>{ing.name}</option>))}
                                                </select>
                                            </td>
                                            <td className="p-2 border-r border-slate-100">
                                                <div className="flex items-center justify-center bg-slate-100 rounded-md border border-slate-200 px-2 py-1 focus-within:border-orange-500 focus-within:bg-white transition-all">
                                                    <input type="number" className="w-full bg-transparent text-xs font-black text-center outline-none text-slate-800" value={l.porcentaje} onChange={e => { const v = e.target.value; const nd = [...form.details]; nd[i].porcentaje = v; nd[i].gramos = Number(v) * 10; setForm({ ...form, details: nd }) }} placeholder="0" />
                                                    <span className="text-[10px] text-slate-400 font-bold ml-1">%</span>
                                                </div>
                                            </td>
                                            <td className="p-2 border-r border-slate-100">
                                                <div className="flex items-center justify-center bg-slate-100 rounded-md border border-slate-200 px-2 py-1 focus-within:border-orange-500 focus-within:bg-white transition-all">
                                                    <input type="number" className="w-full bg-transparent text-xs font-black text-center outline-none text-slate-800" value={l.gramos} onChange={e => { const v = e.target.value; const nd = [...form.details]; nd[i].gramos = v; setForm({ ...form, details: nd }) }} placeholder="0" />
                                                    <span className="text-[10px] text-slate-400 font-bold ml-1">g</span>
                                                </div>
                                            </td>
                                            <td className="p-2 text-center">
                                                <button type="button" onClick={() => { const nd = [...form.details]; nd.splice(i, 1); setForm({ ...form, details: nd }) }} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {form.details.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="p-8 text-center text-slate-400 text-xs italic bg-slate-50/50">
                                                No hay ingredientes en esta receta. Haz clic en "Agregar Componente" para empezar.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            <div className="p-2 bg-slate-50 border-t border-slate-200">
                                <button type="button" onClick={() => setForm({ ...form, details: [...form.details, { ingredientId: '', porcentaje: '', gramos: '' }] })} className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:bg-slate-200 hover:text-slate-800 hover:border-slate-400 transition-all flex items-center justify-center gap-2">
                                    <Plus size={14} /> Agregar Componente
                                </button>
                            </div>
                        </div>
                    </div>

                    {!hasFlourBase && form.details.length > 0 && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-xs font-black uppercase flex items-center gap-2 border border-red-200"><AlertTriangle size={16} /> Falla BOM: Se requiere un ingrediente base al 100%</div>}

                    <div className="p-6 bg-slate-900 text-white rounded-2xl flex justify-between items-center shadow-inner">
                        <div>
                            <p className="text-[10px] uppercase opacity-50 font-black tracking-widest mb-1">Rendimiento Estimado ({form.formato_venta})</p>
                            <div className="flex items-end gap-3">
                                <p className="text-3xl font-black font-mono text-emerald-400">{pesoFinal.toFixed(0)} <span className="text-lg text-emerald-600">g</span></p>
                                {form.formato_venta === 'Unidad' && form.peso_unidad > 0 && (
                                    <p className="text-lg font-black text-slate-300 italic mb-1">≈ {Math.floor(pesoFinal / form.peso_unidad)} Unid.</p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <Button onClick={save} variant="success" className="py-4 px-8 shadow-lg shadow-emerald-900/50" disabled={!hasFlourBase || !form.nombre || !form.codigo}>
                                {form.id ? "Actualizar Ficha" : "Guardar Ficha"}
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            <Card className="overflow-hidden border-2">
                <table className="w-full text-left font-bold text-xs uppercase text-slate-700">
                    <thead className="bg-slate-900 text-white text-[9px] tracking-widest">
                        <tr>
                            <th className="p-4">Código / ID</th>
                            <th className="p-4">Producto</th>
                            <th className="p-4 text-center">Familia</th>
                            <th className="p-4 text-center">Formato</th>
                            <th className="p-4 text-center">Peso Unid.</th>
                            <th className="p-4 text-right">Rinde Final</th>
                            <th className="p-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y bg-white">
                        {recipes.map(r => {
                            const familiaData = FAMILIAS[r.familia] || FAMILIAS.F;
                            return (
                                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <p className="text-xs font-black text-slate-800">{r.codigo || 'S/C'}</p>
                                        <p className="text-[9px] font-mono text-slate-400 mt-0.5">{r.id}</p>
                                    </td>
                                    <td className="p-4">
                                        <span className="font-black italic text-sm text-slate-800 block">{r.nombre_producto}</span>
                                        {r.details?.length > 0 && <span className="text-[9px] text-slate-400 lowercase italic">{r.details.length} componentes</span>}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded text-[9px] text-white ${familiaData.color}`}>{familiaData.id}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded text-[9px]">{r.formato_venta || 'Unidad'}</span>
                                    </td>
                                    <td className="p-4 text-center font-mono text-orange-600">
                                        {r.formato_venta === 'Unidad' ? `${r.peso_unidad || 100}g` : '-'}
                                    </td>
                                    <td className="p-4 text-right font-mono text-slate-800">
                                        {Number(r.peso_final || 0).toFixed(0)} g
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleEdit(r)} className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors" title="Editar Ficha"><Wrench size={14} /></button>
                                            <button onClick={() => handleDelete(r.id)} className="p-1.5 bg-red-50 text-red-500 rounded hover:bg-red-100 transition-colors" title="Eliminar"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </Card>
        </div>
    );
}

// ... EL RESTO DE LAS VISTAS (Dashboard, Kanban, etc.) SE MANTIENEN IGUAL QUE ANTES

function DashboardView({ recipes, ingredients, lots, orders, logistics, quality, setLots, providers }) {
    const [adjustModal, setAdjustModal] = useState(null);
    const [newStock, setNewStock] = useState('');
    const [providerFilter, setProviderFilter] = useState('');

    const filteredLots = providerFilter ? lots.filter(l => l.providerId === providerFilter) : lots;

    const stockMetrics = ingredients.map(ing => {
        const totalGrams = filteredLots.filter(l => l.ingredientId === ing.id).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
        return { ...ing, stock: totalGrams };
    }).filter(ing => providerFilter ? ing.stock > 0 : true);

    const globalStockMetrics = ingredients.map(ing => {
        const totalGrams = lots.filter(l => l.ingredientId === ing.id).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
        return { ...ing, stock: totalGrams };
    });
    const totalValue = globalStockMetrics.reduce((acc, curr) => acc + (curr.stock * (curr.costo_estandar || 0)), 0);

    const handleAdjustStock = () => {
        if (!adjustModal || newStock === '') return;
        const filteredOutOld = lots.filter(l => l.ingredientId !== adjustModal.id);
        setLots([...filteredOutOld, { id: `adj-${Date.now()}`, ingredientId: adjustModal.id, amount: Number(newStock), expiry: '2099-12-31' }]);
        setAdjustModal(null); setNewStock('');
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:hidden">
                <Card className="bg-slate-900 text-white p-6 relative"><div className="absolute -right-2 -top-2 opacity-10"><ClipboardList size={64} /></div><p className="text-[10px] font-black uppercase opacity-60">Batchs Activos</p><h3 className="text-3xl font-black italic">{orders.filter(o => o.status !== 'TERMINADO').length}</h3></Card>
                <Card className="bg-emerald-700 text-white p-6 relative"><div className="absolute -right-2 -top-2 opacity-10"><Coins size={64} /></div><p className="text-[10px] font-black uppercase opacity-60">Valorización Stock</p><h3 className="text-2xl font-black italic mt-1">${totalValue.toLocaleString('es-AR')}</h3></Card>
                <Card className="bg-blue-700 text-white p-6 relative"><div className="absolute -right-2 -top-2 opacity-10"><Truck size={64} /></div><p className="text-[10px] font-black uppercase opacity-60">Envíos a Locales</p><h3 className="text-3xl font-black italic">{logistics.length}</h3></Card>
                <Card className="bg-red-600 text-white p-6 relative"><div className="absolute -right-2 -top-2 opacity-10"><AlertTriangle size={64} /></div><p className="text-[10px] font-black uppercase opacity-60">Fallas Calidad</p><h3 className="text-3xl font-black italic">{quality.filter(q => q.status === 'RECHAZADO').length}</h3></Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:block print:w-full">
                <Card className="p-8 print:border-none print:shadow-none print:p-0">
                    <div className="flex justify-between items-end border-b-2 pb-2 mb-6">
                        <h4 className="text-lg font-black uppercase italic text-slate-800">Stock Físico y WIP (FEFO)</h4>
                        <div className="flex gap-4 items-center">
                            <select className="border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-600 outline-none print:hidden bg-white" value={providerFilter} onChange={e => setProviderFilter(e.target.value)}>
                                <option value="">TODOS LOS PROVEEDORES</option>
                                {providers.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                            <Button variant="secondary" onClick={() => window.print()} className="print:hidden"><Printer size={14} /> Imprimir Control</Button>
                        </div>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                            <tr><th className="p-4">SKU / Componente</th><th className="p-4 text-center">Tipo</th><th className="p-4 text-right">Existencia</th><th className="p-4 text-center print:hidden">Ajuste</th><th className="p-4 text-center hidden print:table-cell border-b">Conteo Real</th></tr>
                        </thead>
                        <tbody className="divide-y text-xs font-bold">
                            {stockMetrics.sort((a, b) => b.stock - a.stock).slice(0, 10).map(s => (
                                <tr key={s.id} className="hover:bg-slate-50">
                                    <td className="p-4 flex items-center gap-2">{s.es_subensamble && <Layers size={14} className="text-orange-500 print:hidden" />} {s.name}</td>
                                    <td className="p-4 text-center opacity-40 text-[10px] uppercase">{s.es_subensamble ? 'WIP' : 'RAW'}</td>
                                    <td className="p-4 text-right font-mono text-blue-700">{s.stock >= 1000 ? `${(s.stock / 1000).toLocaleString('es-AR')} Kg` : `${s.stock.toLocaleString('es-AR')} g`}</td>
                                    <td className="p-4 text-center print:hidden"><button onClick={() => setAdjustModal(s)} className="text-[9px] bg-slate-100 px-2 py-1 rounded hover:bg-slate-200 uppercase">Ajustar</button></td>
                                    <td className="p-4 hidden print:table-cell border-b border-slate-300 w-32"></td>
                                </tr>
                            ))}
                            {stockMetrics.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-slate-400 italic">No hay stock para este filtro.</td></tr>}
                        </tbody>
                    </table>
                </Card>

                <Card className="p-8 bg-slate-900 text-white print:hidden">
                    <h4 className="text-xs font-black uppercase text-orange-500 mb-6 tracking-widest border-b border-slate-800 pb-2">Catálogo de Fichas (Recetas Top)</h4>
                    <table className="w-full text-left mt-4">
                        <thead className="text-[9px] uppercase tracking-widest text-slate-500 border-b border-slate-700">
                            <tr><th className="pb-3">Producto</th><th className="pb-3 text-center">Familia</th><th className="pb-3 text-right">Rinde Final</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-xs font-bold">
                            {recipes.slice(0, 8).map(r => (
                                <tr key={r.id} className="hover:bg-slate-800"><td className="py-3 uppercase italic text-slate-200">{r.nombre_producto}</td><td className="py-3 text-center"><span className={`px-2 py-0.5 rounded text-[8px] text-white ${FAMILIAS[r.familia]?.color}`}>{FAMILIAS[r.familia]?.id}</span></td><td className="py-3 text-right text-emerald-400 font-mono">{r.peso_final.toFixed(0)}g</td></tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            </div>

            {adjustModal && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-8 z-50 print:hidden">
                    <Card className="max-w-md w-full p-8 border-4 border-slate-900">
                        <h3 className="text-lg font-black uppercase italic mb-4">Ajuste de Stock</h3>
                        <p className="text-xs font-bold text-slate-500 mb-6 uppercase">{adjustModal.name}</p>
                        <Input label="Nuevo Stock Real (Gramos)" type="number" value={newStock} onChange={setNewStock} required />
                        <div className="flex gap-4 pt-6"><Button onClick={handleAdjustStock} variant="success" className="flex-1">Guardar</Button><Button onClick={() => setAdjustModal(null)} variant="secondary">Cancelar</Button></div>
                    </Card>
                </div>
            )}
        </div>
    );
}

function PurchasesView({ providers, ingredients, purchases, setPurchases, lots, setLots }) {
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
        const newLots = cart.map((item, idx) => {
            const ing = ingredients.find(i => i.id === item.ingredientId);
            const grams = Number(item.amount) * Number(ing?.factor_conversion || 1);
            return { id: `lot-${Date.now()}-${idx}`, ingredientId: item.ingredientId, providerId: form.providerId, amount: grams, expiry: item.expiry, remito: form.remito };
        });
        setPurchases([{ id: `pur-${Date.now()}`, ...form, items: cart, timestamp: new Date().toISOString() }, ...purchases]);
        setLots([...newLots, ...lots]);
        setForm({ providerId: '', costTotal: '', remito: '' }); setCart([]);
        alert("Remito Multi-insumo Ingresado y Stock Actualizado.");
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            <Card className="p-8 border-t-8 border-blue-600">
                <h4 className="text-xl font-black uppercase italic mb-6 border-b pb-4 text-slate-800">Entrada de Insumos (Remitos)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 bg-slate-50 p-6 rounded-xl border">
                    <div className="flex flex-col gap-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Proveedor Principal</label><select className="border border-slate-200 rounded-lg p-2 text-sm font-bold bg-white outline-none" value={form.providerId} onChange={e => setForm({ ...form, providerId: e.target.value })} required><option value="">Seleccionar...</option>{providers.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
                    <Input label="Costo Total Factura ($)" type="number" value={form.costTotal} onChange={v => setForm({ ...form, costTotal: v })} />
                    <Input label="N° Remito" value={form.remito} onChange={v => setForm({ ...form, remito: v })} />
                </div>
                <h5 className="font-black text-xs text-slate-500 uppercase mb-3 ml-1">Agregar Insumos al Lote</h5>
                <form onSubmit={addToCart} className="flex gap-4 items-end bg-white p-5 rounded-xl border mb-6 shadow-sm">
                    <div className="flex-1 flex flex-col gap-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Insumo</label><select className="border border-slate-200 rounded-lg p-2 text-sm font-bold bg-slate-50 outline-none" value={currentItem.ingredientId} onChange={e => setCurrentItem({ ...currentItem, ingredientId: e.target.value })} required><option value="">Seleccionar...</option>{ingredients.filter(i => !i.es_subensamble).map(i => <option key={i.id} value={i.id}>{i.name} ({i.unidad_compra})</option>)}</select></div>
                    <div className="w-32"><Input label="Cant. (U)" type="number" value={currentItem.amount} onChange={v => setCurrentItem({ ...currentItem, amount: v })} required /></div>
                    <div className="w-40"><Input label="Vencimiento" type="date" value={currentItem.expiry} onChange={v => setCurrentItem({ ...currentItem, expiry: v })} required /></div>
                    <Button type="submit" variant="primary" className="py-2.5">Agregar</Button>
                </form>
                {cart.length > 0 && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-4">
                        <table className="w-full text-left border rounded-xl overflow-hidden"><thead className="bg-slate-900 text-white text-[9px] uppercase tracking-widest"><tr><th className="p-3">Insumo</th><th className="p-3 text-center">Vencimiento</th><th className="p-3 text-right">Cantidad</th><th className="p-3 text-center">Acción</th></tr></thead><tbody className="divide-y bg-white font-bold text-xs">{cart.map((item, idx) => (<tr key={idx}><td className="p-3 uppercase text-slate-800">{item.name}</td><td className="p-3 text-center font-mono text-orange-600">{new Date(item.expiry).toLocaleDateString('es-AR')}</td><td className="p-3 text-right text-blue-600 font-mono">{item.amount} {item.unit}</td><td className="p-3 text-center"><button onClick={() => removeFromCart(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={14} className="mx-auto" /></button></td></tr>))}</tbody></table>
                        <Button variant="success" className="w-full py-4" onClick={savePurchase} disabled={!form.providerId}>{form.providerId ? "Confirmar Ingreso a Almacén" : "Falta seleccionar Proveedor arriba"}</Button>
                    </div>
                )}
            </Card>
            <Card className="overflow-x-auto border-2">
                <table className="w-full text-left font-bold text-xs uppercase text-slate-700">
                    <thead className="bg-slate-900 text-white text-[9px] tracking-widest"><tr><th className="p-4">Fecha</th><th className="p-4">Proveedor</th><th className="p-4">Detalle Insumos</th><th className="p-4 text-center">Costo Total</th><th className="p-4 text-center">Remito</th></tr></thead>
                    <tbody className="divide-y bg-white">
                        {purchases.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50">
                                <td className="p-4 text-slate-400 font-mono text-[10px]">{new Date(p.timestamp).toLocaleDateString('es-AR')}</td>
                                <td className="p-4">{providers.find(pr => pr.id === p.providerId)?.nombre}</td>
                                <td className="p-4 font-black italic text-[10px] max-w-[200px] truncate" title={p.items.map(i => `${i.amount}x ${i.name}`).join(', ')}>{p.items.map(i => `${i.amount}x ${i.name}`).join(', ')}</td>
                                <td className="p-4 text-center text-emerald-600">${p.costTotal || '0'}</td>
                                <td className="p-4 text-center font-mono text-orange-600">{p.remito || 'S/R'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
}

function ProductionOrdersView({ recipes, ingredients, lots, orders, setOrders }) {
    const [form, setForm] = useState({ recipeId: '', amount: '' });
    const [selectedOrder, setSelectedOrder] = useState(null);
    const selectedRecipe = recipes.find(r => r.id === form.recipeId);
    const labelMeta = selectedRecipe?.formato_venta === 'Kg' ? 'Kilos (Meta)' : 'Unidades (Meta)';

    const createOrder = (e) => {
        e.preventDefault();
        if (!form.recipeId || !form.amount) return;
        setOrders([{ id: `OP-${Math.floor(Math.random() * 10000)}`, recipeId: form.recipeId, targetAmount: Number(form.amount), status: 'PLANIFICADA' }, ...orders]);
        setForm({ recipeId: '', amount: '' });
    };

    const activateOrder = (id) => { setOrders(orders.map(o => o.id === id ? { ...o, status: 'PESAJE' } : o)); setSelectedOrder(null); };
    const getLocation = (ing) => ing?.es_subensamble ? 'Cámara Frío (WIP)' : (ing?.reqFrio ? 'Cámara Frío' : 'Almacén Secos');
    const getFefoLot = (ingId) => { const l = lots.filter(x => x.ingredientId === ingId && x.amount > 0).sort((a, b) => new Date(a.expiry) - new Date(b.expiry)); return l.length > 0 ? l[0].id.substring(0, 6).toUpperCase() : 'N/A'; };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-6 print:hidden">
                    <Card className="p-6"><h4 className="text-sm font-black uppercase mb-4 italic text-slate-800">1. Crear Orden</h4><form onSubmit={createOrder} className="space-y-4"><div className="flex flex-col gap-1"><label className="text-[10px] font-black text-slate-400 uppercase">Ficha Técnica</label><select className="border border-slate-200 rounded-lg p-2 text-xs font-bold focus:border-blue-500 outline-none" value={form.recipeId} onChange={e => setForm({ ...form, recipeId: e.target.value })} required><option value="">Seleccionar Producto...</option>{recipes.map(r => <option key={r.id} value={r.id}>{r.nombre_producto}</option>)}</select></div><Input label={labelMeta} type="number" value={form.amount} onChange={v => setForm({ ...form, amount: v })} required /><Button type="submit" variant="primary" className="w-full">Generar Orden</Button></form></Card>
                    <Card className="p-4"><h4 className="text-xs font-black uppercase mb-4 italic border-b pb-2 text-slate-800">2. Pendientes</h4><div className="space-y-2 max-h-96 overflow-y-auto pr-2">{orders.filter(o => o.status === 'PLANIFICADA').map(o => { const rec = recipes.find(r => r.id === o.recipeId); const unitLabel = rec?.formato_venta === 'Kg' ? 'Kg' : 'U'; return (<div key={o.id} onClick={() => setSelectedOrder(o)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedOrder?.id === o.id ? 'bg-orange-50 border-orange-400 shadow-md' : 'hover:bg-slate-50 border-slate-100'}`}><p className="text-[10px] font-mono font-bold text-slate-400">{o.id}</p><p className="text-xs font-black uppercase italic mt-1 text-slate-800">{rec?.nombre_producto}</p><p className="text-[10px] font-black text-blue-600 mt-2 bg-blue-50 inline-block px-2 py-1 rounded">{o.targetAmount} {unitLabel}</p></div>); })}</div></Card>
                </div>
                <Card className="lg:col-span-2 p-10 bg-white border-2 border-slate-200 shadow-xl print:shadow-none print:border-none min-h-[600px] flex flex-col">
                    {!selectedOrder ? (<div className="flex-1 flex flex-col items-center justify-center text-slate-300 print:hidden"><ClipboardList size={64} className="mb-4 opacity-50" /><p className="text-xl font-black uppercase tracking-widest italic">Seleccioná una orden</p></div>) : (
                        <div className="flex-1 flex flex-col animate-in fade-in">
                            <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-8"><div><h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">Hoja de Producción</h1><p className="text-sm font-bold uppercase text-slate-500 mt-2 tracking-[0.2em]">{selectedOrder.id}</p><h2 className="text-2xl font-black uppercase mt-4 text-orange-600">{recipes.find(r => r.id === selectedOrder.recipeId)?.nombre_producto}</h2><p className="text-lg font-black font-mono mt-1">Meta: {selectedOrder.targetAmount} {recipes.find(r => r.id === selectedOrder.recipeId)?.formato_venta === 'Kg' ? 'Kilos' : 'Unidades'}</p></div><div className="text-center"><div className="border-4 border-slate-900 p-2 rounded-xl"><QrCode size={80} /></div><p className="text-[8px] font-mono font-black mt-2">QR KANBAN</p></div></div>
                            <div className="flex-1 mb-8"><table className="w-full text-left border-2 border-slate-200"><thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-600"><tr><th className="p-3 w-10 text-center">OK</th><th className="p-3">Insumo / WIP</th><th className="p-3 text-right">Cant. Físico</th><th className="p-3 text-center">Ubicación</th><th className="p-3 text-center">Lote FEFO</th></tr></thead><tbody className="divide-y border-t-2 border-slate-200 text-xs font-bold text-slate-800">{recipes.find(r => r.id === selectedOrder.recipeId)?.details?.map((d, i) => { const recipe = recipes.find(r => r.id === selectedOrder.recipeId); const ing = ingredients.find(ing => ing.id === d.ingredientId); let baseYield = recipe.peso_final || 1; if (recipe.formato_venta === 'Unidad' || !recipe.formato_venta) { baseYield = recipe.peso_final / (recipe.peso_unidad || 100); } else if (recipe.formato_venta === 'Kg') { baseYield = recipe.peso_final / 1000; } const factor = selectedOrder.targetAmount / baseYield; const gramosReales = Number(d.gramos) * factor; const displayGramos = gramosReales >= 1000 ? `${(gramosReales / 1000).toFixed(2)} Kg` : `${gramosReales.toFixed(0)} g`; return (<tr key={i}><td className="p-3 text-center"><Square size={16} className="text-slate-300 mx-auto" /></td><td className="p-3 uppercase">{ing?.name}</td><td className="p-3 text-right font-mono text-blue-700 text-sm bg-blue-50/50">{displayGramos}</td><td className="p-3 text-center"><span className="px-2 py-1 rounded text-[9px] uppercase bg-slate-50 border"><MapPin size={10} className="inline mr-1" />{getLocation(ing)}</span></td><td className="p-3 text-center font-mono text-[10px]">{getFefoLot(ing?.id)}</td></tr>); })}</tbody></table></div>
                            <div className="grid grid-cols-2 gap-8 border-t-2 border-dashed pt-8 mb-8 opacity-50"><div className="border-b-2 border-slate-900 pb-1 text-center"><p className="text-[10px] font-black uppercase">Firma Pañolero</p></div><div className="border-b-2 border-slate-900 pb-1 text-center"><p className="text-[10px] font-black uppercase">Firma Supervisor</p></div></div>
                            <div className="flex justify-end gap-4 print:hidden mt-auto border-t pt-6"><Button variant="secondary" onClick={() => window.print()}><Printer size={16} /> Imprimir Hoja</Button><Button variant="success" onClick={() => activateOrder(selectedOrder.id)}>Activar Kanban</Button></div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

function KanbanView({ orders, recipes, setOrders, qualityLogs, setQualityLogs }) {
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState({ temp: '', units: '', reason: '' });

    const moveOrder = (id, newStatus) => { setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o)); };

    const handleFinalize = () => {
        if (!form.temp || !form.units) return;
        setQualityLogs([...qualityLogs, { id: `q${Date.now()}`, orderId: selected.id, temperature: Number(form.temp), status: Number(form.temp) >= 85 ? 'APROBADO' : 'RECHAZADO', timestamp: new Date().toISOString() }]);
        setOrders(orders.map(o => o.id === selected.id ? { ...o, status: 'TERMINADO', realAmount: form.units } : o));
        setSelected(null); setForm({ temp: '', units: '', reason: '' });
    };

    return (
        <div className="flex gap-4 h-[calc(100vh-220px)] overflow-x-auto pb-4">
            {ETAPAS_KANBAN.map(etapa => (
                <div key={etapa.id} className="w-72 flex-shrink-0 flex flex-col bg-slate-100 rounded-2xl border-2 border-slate-200 shadow-inner">
                    <div className="p-4 bg-white border-b-4 border-slate-200 flex justify-between items-center rounded-t-2xl"><div className="flex items-center gap-2 font-black text-[10px] uppercase text-slate-800">{etapa.icon} {etapa.nombre}</div><span className="text-[10px] font-black text-white bg-slate-900 px-2 py-0.5 rounded-full">{orders.filter(o => o.status === etapa.id).length}</span></div>
                    <div className="flex-1 p-3 overflow-y-auto space-y-3">
                        {orders.filter(o => o.status === etapa.id).map(o => {
                            const rec = recipes.find(r => r.id === o.recipeId);
                            return (
                                <Card key={o.id} className="p-5 hover:border-orange-500 transition-all border-2 border-transparent group shadow-md bg-white">
                                    <div className="flex justify-between items-center mb-3"><span className="text-[9px] font-mono font-bold text-slate-400">{o.id}</span></div>
                                    <h5 className="font-black text-sm uppercase text-slate-800 leading-tight mb-4 italic">{rec?.nombre_producto || 'Cargando...'}</h5>
                                    <div className="flex justify-between items-end border-t pt-3 mt-2"><div><p className="text-[8px] font-black uppercase text-slate-400">Meta Lote</p><p className="text-sm font-black text-blue-700 font-mono leading-none mt-1">{o.targetAmount}</p></div>{etapa.id !== 'TERMINADO' && (<button onClick={() => etapa.id === 'CALIDAD' ? setSelected(o) : moveOrder(o.id, ETAPAS_KANBAN[ETAPAS_KANBAN.findIndex(e => e.id === etapa.id) + 1].id)} className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white p-2 rounded-lg hover:bg-orange-500 shadow-md"><ArrowRight size={14} /></button>)}</div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            ))}
            {selected && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-8 z-50 animate-in fade-in"><Card className="max-w-xl w-full p-10 border-[8px] border-slate-900 shadow-2xl"><h3 className="text-2xl font-black uppercase italic mb-8 border-b pb-4">Auditoría HACCP y Cierre</h3><div className="space-y-6"><div className="grid grid-cols-2 gap-6"><Input label="Temp. Salida Horno (°C)" type="number" value={form.temp} onChange={v => setForm({ ...form, temp: v })} required /><Input label="Unidades Reales" type="number" value={form.units} onChange={v => setForm({ ...form, units: v })} required /></div>{Number(form.temp) > 0 && Number(form.temp) < 85 && (<div className="bg-red-50 p-4 rounded-xl border-2 border-red-200 text-red-700 flex items-center gap-4"><ShieldCheck size={24} /><p className="text-[10px] font-black uppercase">Bloqueo Sanitario.</p></div>)}<div className="bg-slate-50 p-5 rounded-xl border"><p className="text-[10px] font-black uppercase text-slate-400 mb-3">Clasificar Merma</p><div className="grid grid-cols-2 gap-2">{['Scrap Amasado', 'Quemado', 'Falla Estética', 'Consumo'].map(r => (<button key={r} onClick={() => setForm({ ...form, reason: r })} className={`p-3 text-left rounded-lg border-2 font-black uppercase text-[9px] transition-all ${form.reason === r ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400'}`}>{r}</button>))}</div></div><div className="flex gap-4 pt-4"><Button onClick={handleFinalize} variant="success" className="flex-1 py-4" disabled={Number(form.temp) < 85 || !form.units || !form.reason}>Finalizar Producción</Button><Button onClick={() => setSelected(null)} variant="secondary" className="px-8">Cancelar</Button></div></div></Card></div>
            )}
        </div>
    );
}

function LogisticsView({ recipes, logistics, setLogistics, branches }) {
    const [destination, setDestination] = useState('');
    const [currentItem, setCurrentItem] = useState({ recipeId: '', amount: '' });
    const [cart, setCart] = useState([]);
    const [selectedDispatch, setSelectedDispatch] = useState(null);

    const addToCart = (e) => { e.preventDefault(); if (!currentItem.recipeId || !currentItem.amount) return; const rec = recipes.find(r => r.id === currentItem.recipeId); setCart([...cart, { recipeId: currentItem.recipeId, nombre_producto: rec.nombre_producto, amount: Number(currentItem.amount) }]); setCurrentItem({ recipeId: '', amount: '' }); };
    const saveDispatch = () => { if (!destination || cart.length === 0) return; const dispatchId = `DESP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`; setLogistics([{ id: dispatchId, dispatchId, destination, items: cart, timestamp: new Date().toISOString() }, ...logistics]); setDestination(''); setCart([]); };

    if (selectedDispatch) {
        return (
            <Card className="max-w-3xl mx-auto p-10 bg-white border-2 shadow-2xl flex flex-col animate-in zoom-in-95">
                <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-6"><div><h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none text-slate-900">Remito Traslado</h1><p className="text-sm font-bold uppercase text-slate-500 mt-2 tracking-[0.2em]">ID: {selectedDispatch.dispatchId}</p><h2 className="text-xl font-black uppercase mt-4 text-blue-600">Destino: {selectedDispatch.destination}</h2></div></div>
                <div className="flex-1 mb-8"><table className="w-full text-left border-2 border-slate-200"><thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-600"><tr><th className="p-3">Producto</th><th className="p-3 text-right">Cantidad</th></tr></thead><tbody className="divide-y border-t-2 border-slate-200 text-sm font-bold text-slate-800">{selectedDispatch.items?.map((item, i) => (<tr key={i}><td className="p-4 uppercase italic text-sm">{item.nombre_producto}</td><td className="p-4 text-right font-mono text-blue-700">{item.amount} U</td></tr>))}</tbody></table></div>
                <div className="flex justify-end gap-4 print:hidden"><Button variant="secondary" onClick={() => window.print()}><Printer size={16} /> Imprimir</Button><Button variant="primary" onClick={() => setSelectedDispatch(null)}>Cerrar</Button></div>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left animate-in fade-in">
            <div className="lg:col-span-2 space-y-6">
                <Card className="p-8 border-t-8 border-blue-600 bg-white shadow-xl">
                    <h4 className="text-2xl font-black uppercase italic mb-8 border-b pb-4 flex items-center gap-3 text-slate-800"><Truck className="text-blue-600" size={28} /> Armar Remito</h4>
                    <div className="mb-8">
                        <select className="w-full border-2 rounded-xl p-3 font-bold bg-slate-50 outline-none text-sm focus:border-blue-500" value={destination} onChange={e => setDestination(e.target.value)}>
                            <option value="">Elegir Sucursal...</option>
                            {branches?.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-4 items-end bg-slate-50 p-6 rounded-2xl border mb-8"><div className="flex-1"><select className="w-full border-2 rounded-lg p-2 font-bold bg-white text-xs outline-none" value={currentItem.recipeId} onChange={e => setCurrentItem({ ...currentItem, recipeId: e.target.value })}><option value="">Seleccionar Producto...</option>{recipes.map(r => <option key={r.id} value={r.id}>{r.nombre_producto}</option>)}</select></div><div className="w-32"><Input label="Cantidad" type="number" value={currentItem.amount} onChange={v => setCurrentItem({ ...currentItem, amount: v })} /></div><Button variant="primary" className="py-2.5" onClick={addToCart}>Agregar</Button></div>
                    {cart.length > 0 && (<div className="space-y-6"><Button variant="success" className="w-full py-4" onClick={saveDispatch}>Emitir Remito Oficial</Button></div>)}
                </Card>
            </div>
            <div className="space-y-6"><Card className="p-6 bg-slate-900 text-white shadow-2xl"><h4 className="font-black uppercase italic mb-6 border-b border-slate-800 pb-3 text-orange-500">Historial</h4><div className="space-y-3">{logistics.slice(0, 8).map(l => (<div className="p-3 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer" key={l.id} onClick={() => setSelectedDispatch(l)}><p className="text-[9px] font-mono text-blue-400">{l.dispatchId}</p><p className="text-xs font-black uppercase text-white truncate">{l.destination}</p></div>))}</div></Card></div>
        </div>
    );
}

function SettingsView({ config, setConfig }) {
    const [companyName, setCompanyName] = useState(config.companyName);
    const [appName, setAppName] = useState(config.appName);
    const [newBranch, setNewBranch] = useState('');

    const saveCompanyData = () => {
        setConfig({ ...config, companyName, appName });
        alert("Datos de la empresa actualizados correctamente.");
    };

    const addBranch = (e) => {
        e.preventDefault();
        if (!newBranch.trim()) return;
        if (!config.branches.includes(newBranch.trim())) {
            setConfig({ ...config, branches: [...config.branches, newBranch.trim()] });
        }
        setNewBranch('');
    };

    const removeBranch = (branchToRemove) => {
        if (confirm(`¿Eliminar la sucursal ${branchToRemove}?`)) {
            setConfig({ ...config, branches: config.branches.filter(b => b !== branchToRemove) });
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in max-w-4xl">
            <Card className="p-8 border-t-8 border-slate-900 bg-white shadow-xl">
                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                    <Building className="text-slate-800" size={28} />
                    <h4 className="text-2xl font-black uppercase italic text-slate-800">Datos de la Empresa</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <Input label="Nombre de la Empresa / Marca" value={companyName} onChange={setCompanyName} />
                    <Input label="Subtítulo / Versión del Sistema" value={appName} onChange={setAppName} />
                    <div className="md:col-span-2 flex justify-end mt-2">
                        <Button variant="success" onClick={saveCompanyData} className="px-8 py-3">Guardar Datos Principales</Button>
                    </div>
                </div>
            </Card>

            <Card className="p-8 border-t-8 border-orange-500 bg-white shadow-xl">
                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                    <Store className="text-orange-500" size={28} />
                    <h4 className="text-2xl font-black uppercase italic text-slate-800">Locales y Sucursales</h4>
                </div>

                <form onSubmit={addBranch} className="flex gap-4 items-end bg-slate-50 p-6 rounded-2xl border mb-8">
                    <div className="flex-1">
                        <Input label="Nombre de la Nueva Sucursal" placeholder="Ej. Local Norte, Punto Belgrano..." value={newBranch} onChange={setNewBranch} />
                    </div>
                    <Button variant="primary" type="submit" className="py-2.5 px-6"><Plus size={16} /> Agregar Sucursal</Button>
                </form>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {config.branches.map(branch => (
                        <div key={branch} className="flex justify-between items-center bg-white border-2 border-slate-200 p-4 rounded-xl shadow-sm hover:border-orange-300 transition-colors group">
                            <span className="font-bold text-sm text-slate-700 uppercase tracking-wide truncate pr-2">{branch}</span>
                            <button onClick={() => removeBranch(branch)} className="text-slate-300 hover:text-red-500 transition-colors p-2 rounded-lg group-hover:bg-red-50" title="Eliminar Sucursal">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    {config.branches.length === 0 && (
                        <div className="col-span-full p-6 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-dashed">
                            No hay sucursales configuradas. Agrega una arriba.
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}