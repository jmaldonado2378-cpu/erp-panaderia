'use client';
import React, { useState, useEffect } from 'react';
import {
    TrendingDown, Package, Layers, ShieldCheck, Settings,
    ShoppingBag, Plus, Trash2, Coins, Factory, Briefcase,
    Warehouse, ThermometerSun, ArrowRight, Truck, Layout,
    Clock, ClipboardList, Printer, QrCode, Square, MapPin,
    AlertTriangle, Hash, Search, Calendar, Wrench, Building,
    Store, CheckCircle2, XCircle
} from 'lucide-react';

// ============================================================================
// DATOS MAESTROS INDUSTRIALES (Ampliados y Complejos)
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

// 2+ Proveedores por Insumo
const INITIAL_PROVIDERS = [
    { id: 'p1', nombre: 'Molino Cañuelas', cuit: '30-12345678-1', rubro: 'Harinas' },
    { id: 'p2', nombre: 'Molino Campodónico', cuit: '30-22345678-1', rubro: 'Harinas' },
    { id: 'p3', nombre: 'Lácteos La Serenísima', cuit: '30-87654321-2', rubro: 'Lácteos' },
    { id: 'p4', nombre: 'Lácteos Vacalin', cuit: '30-97654321-2', rubro: 'Lácteos y DDL' },
    { id: 'p5', nombre: 'Levaduras Calsa', cuit: '30-11122233-3', rubro: 'Fermentos' },
    { id: 'p6', nombre: 'Levaduras Lesaffre', cuit: '30-21122233-3', rubro: 'Fermentos y Aditivos' },
    { id: 'p7', nombre: 'Puratos Argentina', cuit: '30-33344455-4', rubro: 'Aditivos y Mejoradores' },
    { id: 'p8', nombre: 'Margarinas Dánica', cuit: '30-55566677-5', rubro: 'Grasas y Aceites' },
    { id: 'p9', nombre: 'Huevos San Juan', cuit: '30-99988877-5', rubro: 'Huevos' }
];

const INITIAL_INGREDIENTS = [
    // Materias Primas Base
    { id: 'i1', name: 'Harina 000 (Fuerza)', unidad_compra: 'Bolsa 25kg', familia: 'Harinas y Polvos', almacen: 'Harinera', alergeno: 'TACC', costo_estandar: 0.8 },
    { id: 'i2', name: 'Harina 0000 (Pastelera)', unidad_compra: 'Bolsa 25kg', familia: 'Harinas y Polvos', almacen: 'Harinera', alergeno: 'TACC', costo_estandar: 1.2 },
    { id: 'i3', name: 'Agua Filtrada', unidad_compra: 'Litros', familia: 'Otros', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 0.05 },
    { id: 'i4', name: 'Sal Fina', unidad_compra: 'Bolsa 5kg', familia: 'Harinas y Polvos', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 0.5 },
    { id: 'i5', name: 'Levadura Fresca', unidad_compra: 'Paquete 500g', familia: 'Fermentos', almacen: 'Cámara de Frío 1 (Insumos)', alergeno: '', costo_estandar: 3.0 },
    { id: 'i6', name: 'Manteca Extrafina', unidad_compra: 'Caja 20kg', familia: 'Grasas y Aceites', almacen: 'Cámara de Frío 1 (Insumos)', alergeno: 'Lácteo', costo_estandar: 8.5 },
    { id: 'i7', name: 'Margarina Hojaldre Alta Fusión', unidad_compra: 'Caja 10kg', familia: 'Grasas y Aceites', almacen: 'Almacén Secos Principal', alergeno: 'Lácteo', costo_estandar: 6.8 },
    { id: 'i8', name: 'Azúcar Común', unidad_compra: 'Bolsa 50kg', familia: 'Azúcares y Dulces', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 1.0 },
    { id: 'i9', name: 'Huevo Líquido Pasteurizado', unidad_compra: 'Sachet 5L', familia: 'Huevos', almacen: 'Cámara de Frío 1 (Insumos)', alergeno: 'Huevo', costo_estandar: 4.2 },
    { id: 'i10', name: 'Dulce de Leche Repostero', unidad_compra: 'Tacho 10kg', familia: 'Azúcares y Dulces', almacen: 'Almacén Secos Principal', alergeno: 'Lácteo', costo_estandar: 5.5 },
    { id: 'i11', name: 'Chocolate Cobertura Semiamargo', unidad_compra: 'Caja 5kg', familia: 'Azúcares y Dulces', almacen: 'Heladera de Tránsito', alergeno: 'Lácteo', costo_estandar: 15.0 },
    // Aditivos y Mejoradores Químicos
    { id: 'i12', name: 'Mejorador Pan Francés (Ácido Ascórbico)', unidad_compra: 'Bolsa 5kg', familia: 'Aditivos y Esencias', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 25.0 },
    { id: 'i13', name: 'Propionato de Calcio (Antimoho)', unidad_compra: 'Bolsa 5kg', familia: 'Aditivos y Esencias', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 18.0 },
    { id: 'i14', name: 'Polvo de Hornear Doble Acción', unidad_compra: 'Tarro 2kg', familia: 'Harinas y Polvos', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 6.0 },
    { id: 'i15', name: 'Extracto de Malta Líquido', unidad_compra: 'Bidón 5kg', familia: 'Aditivos y Esencias', almacen: 'Almacén Secos Principal', alergeno: 'TACC', costo_estandar: 8.0 },
    { id: 'i16', name: 'Esencia de Vainilla Concentrada', unidad_compra: 'Botella 1L', familia: 'Aditivos y Esencias', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 12.0 },

    // WIPs (Sub-ensambles para todas las familias)
    { id: 'wip_F1', name: '[WIP] Masa Madre Activa (Poolish)', unidad_compra: 'Gramos', familia: 'WIP (Producción)', almacen: 'Cámara de Frío 2 (WIP)', alergeno: 'TACC', costo_estandar: 1.5, es_subensamble: true },
    { id: 'wip_A1', name: '[WIP] Cremado Base Vainilla', unidad_compra: 'Gramos', familia: 'WIP (Producción)', almacen: 'Cámara de Frío 2 (WIP)', alergeno: 'TACC, Lácteo, Huevo', costo_estandar: 3.5, es_subensamble: true },
    { id: 'wip_B1', name: '[WIP] Plancha Pan de Miga Blanca', unidad_compra: 'Gramos', familia: 'WIP (Producción)', almacen: 'Almacén Secos Principal', alergeno: 'TACC', costo_estandar: 2.5, es_subensamble: true },
    { id: 'wip_C1', name: '[WIP] Crema Pastelera Horneable', unidad_compra: 'Gramos', familia: 'WIP (Producción)', almacen: 'Cámara de Frío 2 (WIP)', alergeno: 'Lácteo, Huevo', costo_estandar: 4.0, es_subensamble: true },
    { id: 'wip_D1', name: '[WIP] Bastón Hojaldre (Empaste)', unidad_compra: 'Gramos', familia: 'WIP (Producción)', almacen: 'Cámara de Frío 2 (WIP)', alergeno: 'TACC, Lácteo', costo_estandar: 5.5, es_subensamble: true },
    { id: 'wip_E1', name: '[WIP] Masa Sablee Base', unidad_compra: 'Gramos', familia: 'WIP (Producción)', almacen: 'Cámara de Frío 2 (WIP)', alergeno: 'TACC, Lácteo', costo_estandar: 3.8, es_subensamble: true }
];

const INITIAL_LOTS = [
    // Lotes mezclados de distintos proveedores para probar trazabilidad
    { id: 'L-H00-CAÑ', ingredientId: 'i1', providerId: 'p1', amount: 500000, expiry: '2026-12-01', ingreso: '2025-10-01' },
    { id: 'L-H00-CAM', ingredientId: 'i1', providerId: 'p2', amount: 200000, expiry: '2026-10-15', ingreso: '2025-11-20' },
    { id: 'L-H04-CAÑ', ingredientId: 'i2', providerId: 'p1', amount: 300000, expiry: '2026-11-15', ingreso: '2025-09-10' },
    { id: 'L-LEV-CAL', ingredientId: 'i5', providerId: 'p5', amount: 25000, expiry: '2026-03-20', ingreso: '2026-01-05' },
    { id: 'L-LEV-LES', ingredientId: 'i5', providerId: 'p6', amount: 15000, expiry: '2026-04-10', ingreso: '2026-01-20' },
    { id: 'L-DDL-VAC', ingredientId: 'i10', providerId: 'p4', amount: 80000, expiry: '2026-08-30', ingreso: '2026-01-10' },
    { id: 'L-MEJ-PUR', ingredientId: 'i12', providerId: 'p7', amount: 10000, expiry: '2027-01-01', ingreso: '2026-01-15' },
    { id: 'WIP-MM-01', ingredientId: 'wip_F1', providerId: 'interno', amount: 45000, expiry: '2026-02-28', ingreso: '2026-02-20' },
    { id: 'WIP-HOJ-01', ingredientId: 'wip_D1', providerId: 'interno', amount: 60000, expiry: '2026-03-05', ingreso: '2026-02-21' }
];

// Fórmulas Base Maestras (Altamente detalladas con Aditivos y WIPs)
const BASE_RECIPES = [
    // F: Panificados
    { nombre_producto: 'Baguette Francesa', familia: 'F', merma: 18, details: [{ ingredientId: 'i1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i3', porcentaje: 65, gramos: 650 }, { ingredientId: 'i4', porcentaje: 2, gramos: 20 }, { ingredientId: 'i5', porcentaje: 1.5, gramos: 15 }, { ingredientId: 'i12', porcentaje: 1, gramos: 10 }] },
    { nombre_producto: 'Pan de Molde Larga Vida', familia: 'F', merma: 10, details: [{ ingredientId: 'i1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i3', porcentaje: 55, gramos: 550 }, { ingredientId: 'i6', porcentaje: 8, gramos: 80 }, { ingredientId: 'i5', porcentaje: 3, gramos: 30 }, { ingredientId: 'i13', porcentaje: 0.5, gramos: 5 }] },
    { nombre_producto: 'Ciabatta Rústica', familia: 'F', merma: 15, details: [{ ingredientId: 'i1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'wip_F1', porcentaje: 30, gramos: 300 }, { ingredientId: 'i3', porcentaje: 80, gramos: 800 }, { ingredientId: 'i4', porcentaje: 2.2, gramos: 22 }] },
    { nombre_producto: 'Pan Integral con Malta', familia: 'F', merma: 12, details: [{ ingredientId: 'i1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i15', porcentaje: 5, gramos: 50 }, { ingredientId: 'i3', porcentaje: 68, gramos: 680 }, { ingredientId: 'i5', porcentaje: 4, gramos: 40 }] },

    // A: Batidos
    { nombre_producto: 'Budín Húmedo de Vainilla', familia: 'A', merma: 8, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i8', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i9', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i7', porcentaje: 80, gramos: 800 }, { ingredientId: 'i14', porcentaje: 4, gramos: 40 }, { ingredientId: 'i16', porcentaje: 2, gramos: 20 }, { ingredientId: 'i13', porcentaje: 0.3, gramos: 3 }] },
    { nombre_producto: 'Muffins de Chocolate', familia: 'A', merma: 10, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i8', porcentaje: 90, gramos: 900 }, { ingredientId: 'i9', porcentaje: 85, gramos: 850 }, { ingredientId: 'i11', porcentaje: 25, gramos: 250 }, { ingredientId: 'i14', porcentaje: 5, gramos: 50 }] },
    { nombre_producto: 'Pionono Clásico', familia: 'A', merma: 5, details: [{ ingredientId: 'wip_A1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i2', porcentaje: 40, gramos: 400 }, { ingredientId: 'i15', porcentaje: 10, gramos: 100 }] },
    { nombre_producto: 'Bizcochuelo Premium', familia: 'A', merma: 12, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i8', parse: 100, gramos: 1000 }, { ingredientId: 'i9', porcentaje: 120, gramos: 1200 }, { ingredientId: 'i16', porcentaje: 1.5, gramos: 15 }] },

    // B: Ensamblados
    { nombre_producto: 'Sándwich Miga Triple J&Q', familia: 'B', merma: 0, details: [{ ingredientId: 'wip_B1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i6', porcentaje: 15, gramos: 150 }] },
    { nombre_producto: 'Fosforito Relleno', familia: 'B', merma: 2, details: [{ ingredientId: 'wip_D1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i8', porcentaje: 10, gramos: 100 }] },
    { nombre_producto: 'Pebete Relleno Especial', familia: 'B', merma: 0, details: [{ ingredientId: 'wip_B1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i6', porcentaje: 8, gramos: 80 }] },
    { nombre_producto: 'Chips de Almuerzo', familia: 'B', merma: 5, details: [{ ingredientId: 'i1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i3', porcentaje: 50, gramos: 500 }, { ingredientId: 'i6', porcentaje: 10, gramos: 100 }, { ingredientId: 'i5', porcentaje: 4, gramos: 40 }] },

    // C: Pastelería
    { nombre_producto: 'Torta Selva Negra', familia: 'C', merma: 5, details: [{ ingredientId: 'wip_A1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i11', porcentaje: 40, gramos: 400 }, { ingredientId: 'i8', porcentaje: 50, gramos: 500 }] },
    { nombre_producto: 'Lemon Pie Clásico', familia: 'C', merma: 8, details: [{ ingredientId: 'wip_E1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'wip_C1', porcentaje: 150, gramos: 1500 }, { ingredientId: 'i8', porcentaje: 80, gramos: 800 }] },
    { nombre_producto: 'Cheesecake Horneado', familia: 'C', merma: 10, details: [{ ingredientId: 'wip_E1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i9', porcentaje: 40, gramos: 400 }, { ingredientId: 'i8', porcentaje: 60, gramos: 600 }] },
    { nombre_producto: 'Tarta Cabsha', familia: 'C', merma: 5, details: [{ ingredientId: 'wip_E1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i10', porcentaje: 200, gramos: 2000 }, { ingredientId: 'i11', porcentaje: 50, gramos: 500 }] },

    // D: Hojaldres
    { nombre_producto: 'Medialuna de Manteca', familia: 'D', merma: 20, details: [{ ingredientId: 'wip_D1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i8', porcentaje: 15, gramos: 150 }, { ingredientId: 'i3', porcentaje: 45, gramos: 450 }, { ingredientId: 'i5', porcentaje: 4, gramos: 40 }] },
    { nombre_producto: 'Cañoncito de DDL', familia: 'D', merma: 15, details: [{ ingredientId: 'wip_D1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i10', porcentaje: 80, gramos: 800 }] },
    { nombre_producto: 'Palmera Caramelizada', familia: 'D', merma: 12, details: [{ ingredientId: 'wip_D1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i8', porcentaje: 60, gramos: 600 }] },
    { nombre_producto: 'Vigilante', familia: 'D', merma: 18, details: [{ ingredientId: 'wip_D1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i16', porcentaje: 2, gramos: 20 }] },

    // E: Secos
    { nombre_producto: 'Alfajor de Maicena', familia: 'E', merma: 6, details: [{ ingredientId: 'wip_E1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i10', porcentaje: 150, gramos: 1500 }, { ingredientId: 'i14', porcentaje: 3, gramos: 30 }] },
    { nombre_producto: 'Galletas Pepas', familia: 'E', merma: 8, details: [{ ingredientId: 'wip_E1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i10', porcentaje: 50, gramos: 500 }, { ingredientId: 'i14', porcentaje: 2, gramos: 20 }] },
    { nombre_producto: 'Polvorones Caseros', familia: 'E', merma: 10, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i6', porcentaje: 60, gramos: 600 }, { ingredientId: 'i8', porcentaje: 50, gramos: 500 }, { ingredientId: 'i14', porcentaje: 4, gramos: 40 }] },
    { nombre_producto: 'Lengüitas de Gato', familia: 'E', merma: 5, details: [{ ingredientId: 'i2', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i6', porcentaje: 80, gramos: 800 }, { ingredientId: 'i8', porcentaje: 80, gramos: 800 }, { ingredientId: 'i9', porcentaje: 30, gramos: 300 }, { ingredientId: 'i16', porcentaje: 3, gramos: 30 }] }
];

// Generador Procedimental de las 120 Recetas (20 por Familia)
const GENERATE_RECIPES = () => {
    const extended = [];
    let rId = 1;
    const FORMATOS = [
        { f: 'Unidad', p: 80, s: 'Mini' },
        { f: 'Unidad', p: 250, s: 'Estándar' },
        { f: 'Unidad', p: 500, s: 'Familiar' },
        { f: 'Unidad', p: 1000, s: 'Extra Grande' },
        { f: 'Kg', p: null, s: 'a Granel' }
    ];

    Object.keys(FAMILIAS).forEach(famKey => {
        const bases = BASE_RECIPES.filter(r => r.familia === famKey);
        bases.forEach(base => {
            // Por cada una de las 4 bases de la familia, creamos 5 variantes = 20 fichas
            FORMATOS.forEach((fmt, idx) => {
                const pesoCrudo = base.details.reduce((a, b) => a + Number(b.gramos || 0), 0);
                extended.push({
                    ...base,
                    id: `R-${famKey}-${String(rId).padStart(3, '0')}`,
                    codigo: `BOM-${famKey}${idx + 1}-${String(rId).padStart(3, '0')}`,
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
    { id: 'OP-17084', recipeId: 'R-F-002', targetAmount: 500, status: 'PLANIFICADA' },
    { id: 'OP-17085', recipeId: 'R-D-082', targetAmount: 300, status: 'FERMENTACION' },
    { id: 'OP-17086', recipeId: 'R-A-025', targetAmount: 150, status: 'AMASADO' }
];

const INITIAL_LOGISTICS = [
    { id: 'l1', dispatchId: 'DESP-8A9X', destination: 'Local Morón Centro', timestamp: '2026-02-20T08:30:00Z', items: [{ nombre_producto: 'Baguette Francesa Estándar', amount: 200 }] }
];

const INITIAL_CONFIG = { companyName: 'IMPERIO', appName: 'MES PRO V11', branches: ['Morón Centro', 'Castelar'] };

// ============================================================================
// COMPONENTES UI (Widgets)
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

const Input = ({ label, type = "text", value, onChange, placeholder, required = false, disabled = false }) => (
    <div className="flex flex-col gap-1 w-full text-left">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label} {required && "*"}</label>
        <input type={type} value={value} required={required} disabled={disabled} onChange={(e) => onChange ? onChange(e.target.value) : null} placeholder={placeholder} className={`border border-slate-200 bg-white rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 text-sm font-semibold text-slate-800 transition-all shadow-sm ${disabled ? 'opacity-50 bg-slate-100' : ''}`} />
    </div>
);

const Select = ({ label, value, onChange, required = false, children, disabled = false }) => (
    <div className="flex flex-col gap-1 w-full text-left">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label} {required && "*"}</label>
        <select value={value} required={required} disabled={disabled} onChange={(e) => onChange ? onChange(e.target.value) : null} className={`border border-slate-200 bg-white rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 text-sm font-semibold text-slate-800 transition-all shadow-sm cursor-pointer ${disabled ? 'opacity-50 bg-slate-100' : ''}`}>
            {children}
        </select>
    </div>
);

// Componente para Notificaciones (Reemplaza a los alert)
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
    const [view, setView] = useState('engineering'); // Empezamos en Ingeniería para ver las 120 recetas

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
        { id: 'engineering', label: 'Ingeniería MultiBOM', icon: <Layers size={18} /> },
        { id: 'logistics', label: 'Despacho Locales', icon: <Truck size={18} /> },
        { id: 'master_data', label: 'Maestros Base', icon: <Briefcase size={18} /> },
        { id: 'settings', label: 'Configuración', icon: <Settings size={18} /> },
    ];

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden text-left">
            <Toast message={toastMsg?.msg} type={toastMsg?.type} onClose={() => setToastMsg(null)} />

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

                {view === 'dashboard' && <DashboardView recipes={recipes} ingredients={ingredients} lots={lots} orders={orders} logistics={logistics} quality={qualityLogs} />}
                {view === 'inventory' && <InventoryView ingredients={ingredients} lots={lots} providers={providers} setLots={setLots} showToast={showToast} />}
                {view === 'purchases' && <PurchasesView providers={providers} ingredients={ingredients} purchases={purchases} setPurchases={setPurchases} lots={lots} setLots={setLots} showToast={showToast} />}
                {view === 'orders' && <ProductionOrdersView recipes={recipes} ingredients={ingredients} lots={lots} orders={orders} setOrders={setOrders} showToast={showToast} />}
                {view === 'kanban' && <KanbanView orders={orders} recipes={recipes} setOrders={setOrders} qualityLogs={qualityLogs} setQualityLogs={setQualityLogs} showToast={showToast} />}
                {view === 'engineering' && <EngineeringView recipes={recipes} ingredients={ingredients} setRecipes={setRecipes} setIngredients={setIngredients} showToast={showToast} />}
                {view === 'logistics' && <LogisticsView recipes={recipes} logistics={logistics} setLogistics={setLogistics} branches={config.branches} showToast={showToast} />}
                {view === 'master_data' && <MasterDataView ingredients={ingredients} setIngredients={setIngredients} providers={providers} setProviders={setProviders} showToast={showToast} />}
                {view === 'settings' && <SettingsView config={config} setConfig={setConfig} showToast={showToast} />}
            </main>
        </div>
    );
}

// ============================================================================
// VISTAS 
// ============================================================================

function DashboardView({ recipes, ingredients, lots, orders, logistics, quality }) {
    const stockMetrics = ingredients.map(ing => {
        const totalGrams = lots.filter(l => l.ingredientId === ing.id).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
        return { ...ing, stock: totalGrams };
    });

    const totalValue = stockMetrics.reduce((acc, curr) => acc + (curr.stock * (curr.costo_estandar || 0)), 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-slate-900 text-white p-6 relative overflow-hidden">
                    <div className="absolute -right-2 -top-2 opacity-10"><ClipboardList size={64} /></div>
                    <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Batchs Activos</p>
                    <h3 className="text-3xl font-black italic">{orders.filter(o => o.status !== 'TERMINADO').length}</h3>
                </Card>
                <Card className="bg-emerald-700 text-white p-6 relative overflow-hidden">
                    <div className="absolute -right-2 -top-2 opacity-10"><Coins size={64} /></div>
                    <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Valorización Stock</p>
                    <h3 className="text-2xl font-black italic mt-1">${totalValue.toLocaleString('es-AR')}</h3>
                </Card>
                <Card className="bg-blue-700 text-white p-6 relative overflow-hidden">
                    <div className="absolute -right-2 -top-2 opacity-10"><Truck size={64} /></div>
                    <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Envíos a Locales</p>
                    <h3 className="text-3xl font-black italic">{logistics.length}</h3>
                </Card>
                <Card className="bg-red-600 text-white p-6 relative overflow-hidden">
                    <div className="absolute -right-2 -top-2 opacity-10"><AlertTriangle size={64} /></div>
                    <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Fallas Calidad</p>
                    <h3 className="text-3xl font-black italic">{quality.filter(q => q.status === 'RECHAZADO').length}</h3>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 p-8 border-t-4 border-slate-800">
                    <div className="flex justify-between items-end border-b-2 pb-2 mb-6">
                        <h4 className="text-lg font-black uppercase italic text-slate-800">Resumen de Inventario (Agrupado)</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Para detalle de Lotes, ver pestaña Inventario</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                                <tr>
                                    <th className="p-4 rounded-l-lg">Insumo Central</th>
                                    <th className="p-4 text-center">Tipo</th>
                                    <th className="p-4 text-right rounded-r-lg">Stock Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-xs font-bold">
                                {stockMetrics.sort((a, b) => b.stock - a.stock).slice(0, 8).map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 flex items-center gap-2">
                                            {s.es_subensamble && <Layers size={14} className="text-orange-500" />}
                                            {s.name}
                                        </td>
                                        <td className="p-4 text-center opacity-40 text-[10px] uppercase">{s.es_subensamble ? 'WIP' : 'RAW'}</td>
                                        <td className="p-4 text-right font-mono text-blue-700 text-sm">
                                            {s.stock >= 1000 ? `${(s.stock / 1000).toLocaleString('es-AR')} Kg` : `${s.stock.toLocaleString('es-AR')} g`}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card className="p-8 bg-slate-900 text-white">
                    <h4 className="text-xs font-black uppercase text-orange-500 mb-6 tracking-widest border-b border-slate-800 pb-2">Catálogo Ingeniería</h4>
                    <div className="space-y-4">
                        {recipes.slice(0, 7).map(r => (
                            <div key={r.id} className="p-3 bg-slate-800 rounded-lg border border-slate-700 flex justify-between items-center">
                                <div>
                                    <p className="text-[11px] font-black uppercase text-slate-200">{r.nombre_producto}</p>
                                    <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Merma: -{r.merma}%</p>
                                </div>
                                <span className={`text-[9px] font-black text-white px-2 py-1 rounded uppercase ${FAMILIAS[r.familia]?.color}`}>{FAMILIAS[r.familia]?.id}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}

function EngineeringView({ recipes, ingredients, setRecipes, setIngredients, showToast }) {
    const [showAdd, setShowAdd] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [form, setForm] = useState({
        id: null, codigo: '', nombre: '', familia: 'F', ver: 1, wip: false, merma: 15, formato_venta: 'Unidad', peso_unidad: 100, details: []
    });

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
            codigo: form.codigo.toUpperCase(), nombre_producto: form.nombre, familia: form.familia, version: form.ver, es_subensamble: form.wip, merma: form.merma, formato_venta: form.formato_venta, peso_unidad: form.formato_venta === 'Unidad' ? Number(form.peso_unidad) : null, peso_crudo: pesoCrudo, peso_final: pesoFinal, details: form.details
        };

        if (form.id) {
            setRecipes(recipes.map(r => r.id === form.id ? { ...r, ...recipeData, id: r.id } : r));
            showToast("Ficha técnica actualizada correctamente");
        } else {
            const newId = `R-NVO-${Date.now()}`;
            setRecipes([{ id: newId, ...recipeData }, ...recipes]);
            if (form.wip) {
                setIngredients([...ingredients, { id: `wip${Date.now()}`, name: `[WIP] ${form.nombre}`, unidad_compra: 'Gramos', factor_conversion: 1, es_subensamble: true, familia: 'WIP (Producción)', almacen: 'Cámara de Frío 2 (WIP)', costo_estandar: 0 }]);
            }
            showToast("Nueva ficha técnica creada");
        }

        setShowAdd(false);
        setForm({ id: null, codigo: '', nombre: '', familia: 'F', ver: 1, wip: false, merma: 15, formato_venta: 'Unidad', peso_unidad: 100, details: [] });
    };

    const handleEdit = (rec) => {
        setForm({
            id: rec.id, codigo: rec.codigo || '', nombre: rec.nombre_producto, familia: rec.familia, ver: (rec.version || 1) + 1, wip: !!rec.es_subensamble, merma: rec.merma || 15, formato_venta: rec.formato_venta || 'Unidad', peso_unidad: rec.peso_unidad || 100, details: rec.details ? [...rec.details] : []
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
            <div className="bg-white p-6 rounded-2xl border shadow-sm flex justify-between items-center gap-6">
                <div>
                    <h3 className="text-xl font-black uppercase italic text-slate-800">Catálogo MultiBOM</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Fichas: {recipes.length}</p>
                </div>
                <div className="flex-1 max-w-md relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Buscar por código o nombre..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-orange-500 bg-slate-50 focus:bg-white transition-all" />
                </div>
                <Button onClick={() => { setShowAdd(!showAdd); if (!showAdd) setForm({ id: null, codigo: '', nombre: '', familia: 'F', ver: 1, wip: false, merma: 15, formato_venta: 'Unidad', peso_unidad: 100, details: [] }); }} variant={showAdd ? "secondary" : "accent"}>
                    {showAdd ? "Cancelar Edición" : <><Plus size={16} /> Nueva Ficha</>}
                </Button>
            </div>

            {showAdd && (
                <Card className="p-10 border-[6px] border-slate-900 bg-white shadow-2xl animate-in slide-in-from-top-4">
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 space-y-6">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-2">
                            <Hash size={18} className="text-slate-400" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-600">Datos de Identificación</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            <div className="md:col-span-4 lg:col-span-3"><Input label="Código SKU" value={form.codigo} onChange={v => setForm({ ...form, codigo: v })} placeholder="Ej. PAN-001" required /></div>
                            <div className="md:col-span-8 lg:col-span-9"><Input label="Nombre del Producto o WIP" value={form.nombre} onChange={v => setForm({ ...form, nombre: v })} placeholder="Ej. Baguette Clásica" required /></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                            <div className="md:col-span-5 lg:col-span-4"><Select label="Familia" value={form.familia} onChange={e => setForm({ ...form, familia: e })}>{Object.values(FAMILIAS).map(f => <option key={f.id} value={f.id}>{f.id} - {f.nombre}</option>)}</Select></div>
                            <div className="md:col-span-3 lg:col-span-3"><Select label="Formato Venta" value={form.formato_venta} onChange={e => setForm({ ...form, formato_venta: e })}><option value="Unidad">Por Unidad (U)</option><option value="Kg">Por Kilo (Kg)</option></Select></div>
                            <div className="md:col-span-2 lg:col-span-2">
                                {form.formato_venta === 'Unidad' ? (<Input label="Peso Unidad (g)" type="number" value={form.peso_unidad} onChange={v => setForm({ ...form, peso_unidad: v })} required />) : (<div className="text-[10px] font-bold text-slate-400 uppercase h-[42px] flex items-center justify-center border border-dashed border-slate-200 rounded-lg bg-slate-100/50">Granel</div>)}
                            </div>
                            <div className="md:col-span-2 lg:col-span-3">
                                <label className="flex items-center justify-center gap-3 p-2 bg-white rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:border-orange-400 transition-colors h-[42px]"><input type="checkbox" checked={form.wip} onChange={e => setForm({ ...form, wip: e.target.checked })} className="w-5 h-5 accent-orange-600" /><span className="text-[10px] font-black uppercase text-slate-700 leading-tight">Es Sub-ensamble?<br /><span className="text-[8px] text-slate-400 tracking-widest">(Genera WIP)</span></span></label>
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
                                    <tr><th className="p-3">Componente</th><th className="p-3 w-32 text-center">% Panadero</th><th className="p-3 w-32 text-center">Gramos Teór.</th><th className="p-3 w-12 text-center"></th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {form.details.map((l, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-2 border-r border-slate-100">
                                                <select className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer p-2" value={l.ingredientId} onChange={e => { const nd = [...form.details]; nd[i].ingredientId = e.target.value; setForm({ ...form, details: nd }) }}>
                                                    <option value="" disabled>Seleccionar Componente...</option>{ingredients.map(ing => (<option key={ing.id} value={ing.id}>{ing.name}</option>))}
                                                </select>
                                            </td>
                                            <td className="p-2 border-r border-slate-100"><div className="flex items-center justify-center bg-slate-100 rounded-md border border-slate-200 px-2 py-1 focus-within:border-orange-500 focus-within:bg-white transition-all"><input type="number" className="w-full bg-transparent text-xs font-black text-center outline-none text-slate-800" value={l.porcentaje} onChange={e => { const v = e.target.value; const nd = [...form.details]; nd[i].porcentaje = v; nd[i].gramos = Number(v) * 10; setForm({ ...form, details: nd }) }} placeholder="0" /><span className="text-[10px] text-slate-400 font-bold ml-1">%</span></div></td>
                                            <td className="p-2 border-r border-slate-100"><div className="flex items-center justify-center bg-slate-100 rounded-md border border-slate-200 px-2 py-1 focus-within:border-orange-500 focus-within:bg-white transition-all"><input type="number" className="w-full bg-transparent text-xs font-black text-center outline-none text-slate-800" value={l.gramos} onChange={e => { const v = e.target.value; const nd = [...form.details]; nd[i].gramos = v; setForm({ ...form, details: nd }) }} placeholder="0" /><span className="text-[10px] text-slate-400 font-bold ml-1">g</span></div></td>
                                            <td className="p-2 text-center"><button type="button" onClick={() => { const nd = [...form.details]; nd.splice(i, 1); setForm({ ...form, details: nd }) }} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button></td>
                                        </tr>
                                    ))}
                                    {form.details.length === 0 && (<tr><td colSpan="4" className="p-8 text-center text-slate-400 text-xs italic bg-slate-50/50">No hay ingredientes en esta receta. Haz clic en "Agregar Componente" para empezar.</td></tr>)}
                                </tbody>
                            </table>
                            <div className="p-2 bg-slate-50 border-t border-slate-200"><button type="button" onClick={() => setForm({ ...form, details: [...form.details, { ingredientId: '', porcentaje: '', gramos: '' }] })} className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:bg-slate-200 hover:text-slate-800 hover:border-slate-400 transition-all flex items-center justify-center gap-2"><Plus size={14} /> Agregar Componente</button></div>
                        </div>
                    </div>

                    {!hasFlourBase && form.details.length > 0 && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-xs font-black uppercase flex items-center gap-2 border border-red-200"><AlertTriangle size={16} /> Falla BOM: Se requiere un ingrediente base al 100% (Ej. Harina)</div>}

                    <div className="p-6 bg-slate-900 text-white rounded-2xl flex justify-between items-center shadow-inner">
                        <div><p className="text-[10px] uppercase opacity-50 font-black tracking-widest mb-1">Rendimiento Estimado ({form.formato_venta})</p><div className="flex items-end gap-3"><p className="text-3xl font-black font-mono text-emerald-400">{pesoFinal.toFixed(0)} <span className="text-lg text-emerald-600">g</span></p>{form.formato_venta === 'Unidad' && form.peso_unidad > 0 && (<p className="text-lg font-black text-slate-300 italic mb-1">≈ {Math.floor(pesoFinal / form.peso_unidad)} Unid.</p>)}</div></div>
                        <div className="flex gap-4"><Button onClick={save} variant="success" className="py-4 px-8 shadow-lg shadow-emerald-900/50" disabled={!hasFlourBase || !form.nombre || !form.codigo}>{form.id ? "Actualizar Ficha" : "Guardar Ficha"}</Button></div>
                    </div>
                </Card>
            )}

            <Card className="overflow-hidden border-2">
                <table className="w-full text-left font-bold text-xs uppercase text-slate-700">
                    <thead className="bg-slate-900 text-white text-[9px] tracking-widest">
                        <tr><th className="p-4">Código / ID</th><th className="p-4">Producto</th><th className="p-4 text-center">Familia</th><th className="p-4 text-center">Formato</th><th className="p-4 text-center">Peso Unid.</th><th className="p-4 text-right">Rinde Final</th><th className="p-4 text-center">Acciones</th></tr>
                    </thead>
                    <tbody className="divide-y bg-white">
                        {filteredRecipes.map(r => {
                            const familiaData = FAMILIAS[r.familia] || FAMILIAS.F;
                            return (
                                <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-4"><p className="text-xs font-black text-slate-800">{r.codigo || 'S/C'}</p><p className="text-[9px] font-mono text-slate-400 mt-0.5">{r.id}</p></td>
                                    <td className="p-4"><span className="font-black italic text-sm text-slate-800 block">{r.nombre_producto}</span>{r.details?.length > 0 && <span className="text-[9px] text-slate-400 lowercase italic">{r.details.length} componentes</span>}</td>
                                    <td className="p-4 text-center"><span className={`px-2 py-1 rounded text-[9px] text-white ${familiaData.color}`}>{familiaData.id}</span></td>
                                    <td className="p-4 text-center"><span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded text-[9px]">{r.formato_venta || 'Unidad'}</span></td>
                                    <td className="p-4 text-center font-mono text-orange-600">{r.formato_venta === 'Unidad' ? `${r.peso_unidad || 100}g` : '-'}</td>
                                    <td className="p-4 text-right font-mono text-slate-800">{Number(r.peso_final || 0).toFixed(0)} g</td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleEdit(r)} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors opacity-0 group-hover:opacity-100" title="Editar Ficha"><Wrench size={14} /></button>
                                            <button onClick={() => handleDelete(r.id)} className="p-1.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100" title="Eliminar"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredRecipes.length === 0 && (
                            <tr><td colSpan="7" className="p-10 text-center text-slate-400 italic bg-slate-50">No hay fichas que coincidan con la búsqueda.</td></tr>
                        )}
                    </tbody>
                </table>
            </Card>
        </div>
    );
}

function InventoryView({ ingredients, lots, providers, setLots, showToast }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [adjustModal, setAdjustModal] = useState(null);
    const [newStock, setNewStock] = useState('');

    const detailedLots = lots.filter(l => l.amount > 0).map(lot => {
        const ing = ingredients.find(i => i.id === lot.ingredientId);
        const prov = providers.find(p => p.id === lot.providerId);
        return { ...lot, ingredientName: ing?.name || 'Desconocido', es_subensamble: ing?.es_subensamble || false, providerName: lot.providerId === 'interno' ? 'Producción Interna' : (prov?.nombre || 'S/D') };
    }).sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

    const filteredLots = detailedLots.filter(l => l.ingredientName.toLowerCase().includes(searchTerm.toLowerCase()) || l.id.toLowerCase().includes(searchTerm.toLowerCase()) || l.providerName.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleAdjustStock = () => {
        if (!adjustModal || newStock === '') return;
        setLots(lots.map(l => l.id === adjustModal.id ? { ...l, amount: Number(newStock) } : l));
        setAdjustModal(null); setNewStock('');
        showToast(`Stock del lote ${adjustModal.id} actualizado a ${newStock}g`);
    };

    const getStatusColor = (expiryDate) => {
        const days = (new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
        if (days < 0) return 'bg-rose-100 text-rose-700 border-rose-200';
        if (days < 30) return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-end bg-white p-6 rounded-xl border shadow-sm print:hidden">
                <div><h3 className="text-xl font-black uppercase italic text-slate-800">Libro Mayor de Lotes</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Trazabilidad FEFO por Insumo y Proveedor</p></div>
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Buscar insumo, lote o prov..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold w-64 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all" /></div>
            </div>

            <Card className="overflow-hidden border-2 print:border-none print:shadow-none">
                <table className="w-full text-left">
                    <thead className="bg-slate-900 text-white text-[9px] uppercase tracking-widest">
                        <tr><th className="p-4">ID Lote</th><th className="p-4">SKU / Componente</th><th className="p-4">Proveedor Origen</th><th className="p-4 text-center">Vencimiento</th><th className="p-4 text-right">Existencia Fís.</th><th className="p-4 text-center print:hidden">Acciones</th></tr>
                    </thead>
                    <tbody className="divide-y text-xs font-bold text-slate-700">
                        {filteredLots.map(lot => (
                            <tr key={lot.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="p-4"><span className="font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">{lot.id}</span></td>
                                <td className="p-4 flex items-center gap-2 uppercase">{lot.es_subensamble && <Layers size={14} className="text-orange-500" />}{lot.ingredientName}</td>
                                <td className="p-4 text-[10px] text-slate-500 uppercase">{lot.providerName}</td>
                                <td className="p-4 text-center"><span className={`px-2 py-1 rounded border text-[10px] flex items-center justify-center gap-1 w-max mx-auto ${getStatusColor(lot.expiry)}`}><Calendar size={12} /> {new Date(lot.expiry).toLocaleDateString('es-AR')}</span></td>
                                <td className="p-4 text-right font-mono text-slate-900 text-sm">{lot.amount >= 1000 ? `${(lot.amount / 1000).toLocaleString('es-AR')} Kg` : `${lot.amount.toLocaleString('es-AR')} g`}</td>
                                <td className="p-4 text-center print:hidden"><button onClick={() => setAdjustModal(lot)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[9px] uppercase tracking-widest transition-colors opacity-0 group-hover:opacity-100">Ajustar</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            {adjustModal && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-8 z-50 animate-in fade-in">
                    <Card className="max-w-md w-full p-8 border-4 border-slate-900">
                        <h3 className="text-lg font-black uppercase italic mb-4">Ajuste de Lote Específico</h3>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-2 text-xs">
                            <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase">Lote:</span> <span className="font-mono font-black">{adjustModal.id}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase">Insumo:</span> <span className="font-black uppercase">{adjustModal.ingredientName}</span></div>
                        </div>
                        <Input label="Nuevo Conteo Físico Real (Gramos)" type="number" value={newStock} onChange={setNewStock} placeholder="Ej. 25000" required />
                        <div className="flex gap-4 pt-6"><Button onClick={handleAdjustStock} variant="success" className="flex-1 py-3">Actualizar Lote</Button><Button onClick={() => setAdjustModal(null)} variant="secondary" className="px-6">Cancelar</Button></div>
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
            const grams = Number(item.amount) * Number(ing?.factor_conversion || 1000); // Simplificación
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
            <Card className="p-8 border-t-8 border-blue-600">
                <h4 className="text-xl font-black uppercase italic mb-6 border-b pb-4 text-slate-800">Entrada de Insumos (Remitos)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 bg-slate-50 p-6 rounded-xl border">
                    <Select label="Proveedor Principal" value={form.providerId} onChange={e => setForm({ ...form, providerId: e })} required><option value="">Seleccionar...</option>{providers.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</Select>
                    <Input label="Costo Total Factura ($)" type="number" value={form.costTotal} onChange={v => setForm({ ...form, costTotal: v })} />
                    <Input label="N° Remito" value={form.remito} onChange={v => setForm({ ...form, remito: v })} />
                </div>
                <h5 className="font-black text-xs text-slate-500 uppercase mb-3 ml-1">Agregar Insumos al Lote</h5>
                <form onSubmit={addToCart} className="flex gap-4 items-end bg-white p-5 rounded-xl border mb-6 shadow-sm">
                    <div className="flex-1"><Select label="Insumo" value={currentItem.ingredientId} onChange={e => setCurrentItem({ ...currentItem, ingredientId: e })} required><option value="">Seleccionar...</option>{ingredients.filter(i => !i.es_subensamble).map(i => <option key={i.id} value={i.id}>{i.name} ({i.unidad_compra})</option>)}</Select></div>
                    <div className="w-32"><Input label="Cant. Unidades" type="number" value={currentItem.amount} onChange={v => setCurrentItem({ ...currentItem, amount: v })} required /></div>
                    <div className="w-40"><Input label="Vencimiento" type="date" value={currentItem.expiry} onChange={v => setCurrentItem({ ...currentItem, expiry: v })} required /></div>
                    <Button type="submit" variant="primary" className="py-2.5 h-[42px]">Agregar</Button>
                </form>
                {cart.length > 0 && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-4">
                        <table className="w-full text-left border rounded-xl overflow-hidden"><thead className="bg-slate-900 text-white text-[9px] uppercase tracking-widest"><tr><th className="p-3">Insumo</th><th className="p-3 text-center">Vencimiento</th><th className="p-3 text-right">Cantidad</th><th className="p-3 text-center">Acción</th></tr></thead><tbody className="divide-y bg-white font-bold text-xs">{cart.map((item, idx) => (<tr key={idx}><td className="p-3 uppercase text-slate-800">{item.name}</td><td className="p-3 text-center font-mono text-orange-600">{new Date(item.expiry).toLocaleDateString('es-AR')}</td><td className="p-3 text-right text-blue-600 font-mono">{item.amount} {item.unit}</td><td className="p-3 text-center"><button onClick={() => removeFromCart(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={14} className="mx-auto" /></button></td></tr>))}</tbody></table>
                        <Button variant="success" className="w-full py-4" onClick={savePurchase} disabled={!form.providerId}>{form.providerId ? "Confirmar Ingreso a Almacén" : "Falta seleccionar Proveedor arriba"}</Button>
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
                    <Card className="p-6">
                        <h4 className="text-sm font-black uppercase mb-4 italic text-slate-800">1. Crear Orden</h4>
                        <form onSubmit={createOrder} className="space-y-4">
                            <Select label="Ficha Técnica" value={form.recipeId} onChange={e => setForm({ ...form, recipeId: e })} required>
                                <option value="">Seleccionar Producto...</option>
                                {recipes.map(r => <option key={r.id} value={r.id}>{r.nombre_producto}</option>)}
                            </Select>
                            <Input label={labelMeta} type="number" value={form.amount} onChange={v => setForm({ ...form, amount: v })} required />
                            <Button type="submit" variant="primary" className="w-full py-3">Generar Orden</Button>
                        </form>
                    </Card>
                    <Card className="p-4">
                        <h4 className="text-xs font-black uppercase mb-4 italic border-b pb-2 text-slate-800">2. Pendientes</h4>
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                            {orders.filter(o => o.status === 'PLANIFICADA').map(o => {
                                const rec = recipes.find(r => r.id === o.recipeId);
                                const unitLabel = rec?.formato_venta === 'Kg' ? 'Kg' : 'U';
                                return (
                                    <div key={o.id} onClick={() => setSelectedOrder(o)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedOrder?.id === o.id ? 'bg-orange-50 border-orange-400 shadow-md' : 'hover:bg-slate-50 border-slate-100'}`}>
                                        <p className="text-[10px] font-mono font-bold text-slate-400">{o.id}</p>
                                        <p className="text-xs font-black uppercase italic mt-1 text-slate-800 truncate">{rec?.nombre_producto}</p>
                                        <p className="text-[10px] font-black text-blue-600 mt-2 bg-blue-50 inline-block px-2 py-1 rounded">{o.targetAmount} {unitLabel}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>

                <Card className="lg:col-span-2 p-10 bg-white border-2 border-slate-200 shadow-xl print:shadow-none print:border-none min-h-[600px] flex flex-col">
                    {!selectedOrder ? (<div className="flex-1 flex flex-col items-center justify-center text-slate-300 print:hidden"><ClipboardList size={64} className="mb-4 opacity-50" /><p className="text-xl font-black uppercase tracking-widest italic">Seleccioná una orden</p></div>) : (
                        <div className="flex-1 flex flex-col animate-in fade-in">
                            <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-8">
                                <div>
                                    <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">Hoja de Producción</h1>
                                    <p className="text-sm font-bold uppercase text-slate-500 mt-2 tracking-[0.2em]">{selectedOrder.id}</p>
                                    <h2 className="text-2xl font-black uppercase mt-4 text-orange-600">{recipes.find(r => r.id === selectedOrder.recipeId)?.nombre_producto}</h2>
                                    <p className="text-lg font-black font-mono mt-1">Meta: {selectedOrder.targetAmount} {recipes.find(r => r.id === selectedOrder.recipeId)?.formato_venta === 'Kg' ? 'Kilos' : 'Unidades'}</p>
                                </div>
                                <div className="text-center">
                                    <div className="border-4 border-slate-900 p-2 rounded-xl"><QrCode size={80} /></div>
                                    <p className="text-[8px] font-mono font-black mt-2">QR KANBAN</p>
                                </div>
                            </div>

                            <div className="flex-1 mb-8">
                                <table className="w-full text-left border-2 border-slate-200">
                                    <thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-600">
                                        <tr><th className="p-3 w-10 text-center">OK</th><th className="p-3">Insumo / WIP</th><th className="p-3 text-right">Cant. Físico</th><th className="p-3 text-center">Ubicación</th><th className="p-3 text-center">Lote Sugerido</th></tr>
                                    </thead>
                                    <tbody className="divide-y border-t-2 border-slate-200 text-xs font-bold text-slate-800">
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
                                                    <td className="p-3 text-center"><Square size={16} className="text-slate-300 mx-auto" /></td>
                                                    <td className="p-3 uppercase">{ing?.name}</td>
                                                    <td className="p-3 text-right font-mono text-blue-700 text-sm bg-blue-50/50">{displayGramos}</td>
                                                    <td className="p-3 text-center"><span className="px-2 py-1 rounded text-[9px] uppercase bg-slate-50 border flex items-center justify-center gap-1"><MapPin size={10} /> {getLocation(ing)}</span></td>
                                                    <td className="p-3 text-center font-mono text-[10px] text-orange-600">{getFefoLot(ing?.id)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="grid grid-cols-2 gap-8 border-t-2 border-dashed pt-8 mb-8 opacity-50">
                                <div className="border-b-2 border-slate-900 pb-1 text-center"><p className="text-[10px] font-black uppercase">Firma Pañolero</p></div>
                                <div className="border-b-2 border-slate-900 pb-1 text-center"><p className="text-[10px] font-black uppercase">Firma Supervisor</p></div>
                            </div>

                            <div className="flex justify-end gap-4 print:hidden mt-auto border-t pt-6">
                                <Button variant="secondary" onClick={() => window.print()}><Printer size={16} /> Imprimir Hoja</Button>
                                <Button variant="success" onClick={() => activateOrder(selectedOrder.id)}>Activar Kanban</Button>
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
                <div key={etapa.id} className="w-72 flex-shrink-0 flex flex-col bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
                    <div className="p-4 bg-white border-b-4 border-slate-200 flex justify-between items-center rounded-t-2xl">
                        <div className="flex items-center gap-2 font-black text-[10px] uppercase text-slate-800">{etapa.icon} {etapa.nombre}</div>
                        <span className="text-[10px] font-black text-white bg-slate-900 px-2 py-0.5 rounded-full">{orders.filter(o => o.status === etapa.id).length}</span>
                    </div>
                    <div className="flex-1 p-3 overflow-y-auto space-y-3">
                        {orders.filter(o => o.status === etapa.id).map(o => {
                            const rec = recipes.find(r => r.id === o.recipeId);
                            return (
                                <Card key={o.id} className="p-5 hover:border-orange-500 transition-all border-2 border-transparent group shadow-md bg-white">
                                    <div className="flex justify-between items-center mb-3"><span className="text-[9px] font-mono font-bold text-slate-400">{o.id}</span></div>
                                    <h5 className="font-black text-sm uppercase text-slate-800 leading-tight mb-4 italic truncate" title={rec?.nombre_producto}>{rec?.nombre_producto || 'Cargando...'}</h5>
                                    <div className="flex justify-between items-end border-t pt-3 mt-2">
                                        <div><p className="text-[8px] font-black uppercase text-slate-400">Meta Lote</p><p className="text-sm font-black text-blue-700 font-mono leading-none mt-1">{o.targetAmount}</p></div>
                                        {etapa.id !== 'TERMINADO' && (<button onClick={() => etapa.id === 'CALIDAD' ? setSelected(o) : moveOrder(o.id, ETAPAS_KANBAN[ETAPAS_KANBAN.findIndex(e => e.id === etapa.id) + 1].id)} className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white p-2 rounded-lg hover:bg-orange-500 shadow-md"><ArrowRight size={14} /></button>)}
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            ))}
            {selected && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-8 z-50 animate-in fade-in">
                    <Card className="max-w-xl w-full p-10 border-[8px] border-slate-900 shadow-2xl">
                        <h3 className="text-2xl font-black uppercase italic mb-8 border-b pb-4">Auditoría HACCP y Cierre</h3>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <Input label="Temp. Salida Horno (°C)" type="number" value={form.temp} onChange={v => setForm({ ...form, temp: v })} required />
                                <Input label="Unidades Reales" type="number" value={form.units} onChange={v => setForm({ ...form, units: v })} required />
                            </div>
                            {Number(form.temp) > 0 && Number(form.temp) < 85 && (
                                <div className="bg-red-50 p-4 rounded-xl border-2 border-red-200 text-red-700 flex items-center gap-4"><ShieldCheck size={24} /><p className="text-[10px] font-black uppercase">Bloqueo Sanitario Activo.</p></div>
                            )}
                            <div className="bg-slate-50 p-5 rounded-xl border">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-3">Clasificar Merma</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Scrap Amasado', 'Quemado', 'Falla Estética', 'Consumo'].map(r => (<button key={r} onClick={() => setForm({ ...form, reason: r })} className={`p-3 text-left rounded-lg border-2 font-black uppercase text-[9px] transition-all ${form.reason === r ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400'}`}>{r}</button>))}
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4"><Button onClick={handleFinalize} variant="success" className="flex-1 py-4" disabled={Number(form.temp) < 85 || !form.units || !form.reason}>Finalizar Producción</Button><Button onClick={() => setSelected(null)} variant="secondary" className="px-8">Cancelar</Button></div>
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
            <Card className="max-w-3xl mx-auto p-10 bg-white border-2 shadow-2xl flex flex-col animate-in zoom-in-95">
                <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-6">
                    <div><h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none text-slate-900">Remito Traslado</h1><p className="text-sm font-bold uppercase text-slate-500 mt-2 tracking-[0.2em]">ID: {selectedDispatch.dispatchId}</p><h2 className="text-xl font-black uppercase mt-4 text-blue-600">Destino: {selectedDispatch.destination}</h2></div>
                    <div className="text-center"><div className="border-4 border-slate-900 p-2 rounded-xl bg-white"><QrCode size={80} /></div><p className="text-[8px] font-mono font-black mt-2">QR RECEPCIÓN</p></div>
                </div>
                <div className="flex-1 mb-8">
                    <table className="w-full text-left border-2 border-slate-200"><thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-600"><tr><th className="p-3 w-12">Ctrl</th><th className="p-3">Producto</th><th className="p-3 text-right">Cantidad</th></tr></thead><tbody className="divide-y border-t-2 border-slate-200 text-sm font-bold text-slate-800">{selectedDispatch.items?.map((item, i) => (<tr key={i}><td className="p-4"><Square size={16} className="text-slate-300" /></td><td className="p-4 uppercase italic">{item.nombre_producto}</td><td className="p-4 text-right font-mono text-blue-700">{item.amount} U</td></tr>))}</tbody></table>
                </div>
                <div className="flex justify-end gap-4 print:hidden"><Button variant="secondary" onClick={() => window.print()}><Printer size={16} /> Imprimir</Button><Button variant="primary" onClick={() => setSelectedDispatch(null)}>Cerrar</Button></div>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left animate-in fade-in">
            <div className="lg:col-span-2 space-y-6">
                <Card className="p-8 border-t-8 border-blue-600 bg-white shadow-xl">
                    <h4 className="text-2xl font-black uppercase italic mb-8 border-b pb-4 flex items-center gap-3 text-slate-800"><Truck className="text-blue-600" size={28} /> Armar Remito</h4>
                    <div className="mb-8"><Select label="Elegir Sucursal Destino" value={destination} onChange={e => setDestination(e)}><option value="">Seleccionar...</option>{branches?.map(b => <option key={b} value={b}>{b}</option>)}</Select></div>
                    <div className="flex gap-4 items-end bg-slate-50 p-6 rounded-2xl border mb-8"><div className="flex-1"><Select label="Producto Terminado" value={currentItem.recipeId} onChange={e => setCurrentItem({ ...currentItem, recipeId: e })}><option value="">Seleccionar...</option>{recipes.filter(r => !r.es_subensamble).map(r => <option key={r.id} value={r.id}>{r.nombre_producto}</option>)}</Select></div><div className="w-32"><Input label="Cantidad" type="number" value={currentItem.amount} onChange={v => setCurrentItem({ ...currentItem, amount: v })} /></div><Button variant="primary" className="py-2.5 h-[42px]" onClick={addToCart}>Agregar</Button></div>
                    {cart.length > 0 && (<div className="space-y-6"><Button variant="success" className="w-full py-4" onClick={saveDispatch}>Emitir Remito Oficial</Button></div>)}
                </Card>
            </div>
            <div className="space-y-6">
                <Card className="p-6 bg-slate-900 text-white shadow-2xl">
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

    // Estado para Proveedores
    const [form, setForm] = useState({ id: null, nombre: '', cuit: '', rubro: '' });
    const [showAdd, setShowAdd] = useState(false);

    // Estado para Insumos
    const [ingForm, setIngForm] = useState({ id: null, name: '', unidad_compra: 'Bolsa 25kg', familia: 'Harinas y Polvos', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: '' });
    const [showAddIng, setShowAddIng] = useState(false);

    const saveProvider = () => {
        if (!form.nombre || !form.cuit) return;
        if (form.id) {
            setProviders(providers.map(p => p.id === form.id ? form : p));
            showToast("Proveedor actualizado.");
        } else {
            setProviders([{ ...form, id: `p${Date.now()}` }, ...providers]);
            showToast("Nuevo proveedor registrado.");
        }
        setForm({ id: null, nombre: '', cuit: '', rubro: '' }); setShowAdd(false);
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
        setIngForm({ id: null, name: '', unidad_compra: 'Bolsa 25kg', familia: 'Harinas y Polvos', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: '' });
        setShowAddIng(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="flex gap-4 border-b border-slate-200 pb-4">
                {[
                    { id: 'prov', l: 'Catálogo de Proveedores' },
                    { id: 'ing', l: 'Insumos y WIP' },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} className={`px-6 py-2 rounded-lg font-black uppercase text-[10px] transition-all ${tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                        {t.l}
                    </button>
                ))}
            </div>

            {tab === 'prov' && (
                <Card className="p-8 bg-slate-50">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-lg font-black uppercase italic text-slate-800">Directorio de Proveedores</h4>
                        <Button onClick={() => { setShowAdd(!showAdd); setForm({ id: null, nombre: '', cuit: '', rubro: '' }); }} variant={showAdd ? "secondary" : "accent"}>{showAdd ? "Cancelar" : <><Plus size={16} /> Nuevo Proveedor</>}</Button>
                    </div>

                    {showAdd && (
                        <Card className="p-8 border-4 border-slate-900 bg-white mb-8"><h4 className="text-sm font-black uppercase mb-6 italic">{form.id ? 'Editar Proveedor' : 'Alta Proveedor'}</h4><div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end"><Input label="Razón Social" value={form.nombre} onChange={v => setForm({ ...form, nombre: v })} required /><Input label="CUIT" value={form.cuit} onChange={v => setForm({ ...form, cuit: v })} required /><Input label="Rubro" value={form.rubro} onChange={v => setForm({ ...form, rubro: v })} /><Button onClick={saveProvider} variant="success" className="py-2.5 h-[42px]">Guardar Cambios</Button></div></Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {providers.map(p => (
                            <Card key={p.id} className="p-5 bg-white shadow-sm flex items-center justify-between border group">
                                <div className="flex items-center gap-4">
                                    <div className="bg-slate-100 p-3 rounded-lg text-slate-500"><Briefcase size={24} /></div>
                                    <div>
                                        <h5 className="font-black uppercase italic text-slate-800 text-sm">{p.nombre}</h5>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">CUIT: {p.cuit}</p>
                                        <p className="text-[9px] font-black text-orange-500 uppercase mt-1 tracking-widest bg-orange-50 inline-block px-2 py-0.5 rounded">{p.rubro}</p>
                                    </div>
                                </div>
                                <button onClick={() => { setForm(p); setShowAdd(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Wrench size={16} /></button>
                            </Card>
                        ))}
                    </div>
                </Card>
            )}

            {tab === 'ing' && (
                <Card className="p-8 bg-slate-50">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-lg font-black uppercase italic text-slate-800">Catálogo de Insumos</h4>
                        <Button onClick={() => { setShowAddIng(!showAddIng); setIngForm({ id: null, name: '', unidad_compra: 'Bolsa 25kg', alergeno: '', reqFrio: false, costo_estandar: '' }); }} variant={showAddIng ? "secondary" : "accent"}>{showAddIng ? "Cancelar" : <><Plus size={16} /> Nuevo Insumo</>}</Button>
                    </div>

                    {showAddIng && (
                        <Card className="p-8 border-4 border-slate-900 bg-white mb-8">
                            <h4 className="text-sm font-black uppercase mb-6 italic">{ingForm.id ? 'Editar Insumo' : 'Alta de Insumo (RAW)'}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                                <div className="md:col-span-2"><Input label="Nombre del Insumo" value={ingForm.name} onChange={v => setIngForm({ ...ingForm, name: v })} required /></div>
                                <Select label="Familia / Categoría" value={ingForm.familia} onChange={e => setIngForm({ ...ingForm, familia: e })}>
                                    {CATEGORIAS_INSUMO.map(c => <option key={c} value={c}>{c}</option>)}
                                </Select>
                                <Input label="Unidad Compra/Stock" placeholder="Ej. Bolsa 25kg, L..." value={ingForm.unidad_compra} onChange={v => setIngForm({ ...ingForm, unidad_compra: v })} required />

                                <div className="md:col-span-2"><Select label="Ubicación (Almacén)" value={ingForm.almacen} onChange={e => setIngForm({ ...ingForm, almacen: e })}>
                                    {UBICACIONES_ALMACEN.map(u => <option key={u} value={u}>{u}</option>)}
                                </Select></div>
                                <Input label="Alérgenos (Opcional)" placeholder="Ej. TACC, Lácteo" value={ingForm.alergeno} onChange={v => setIngForm({ ...ingForm, alergeno: v })} />
                                <Input label="Costo Est. ($)" type="number" value={ingForm.costo_estandar} onChange={v => setIngForm({ ...ingForm, costo_estandar: v })} required />
                            </div>
                            <div className="flex items-center justify-end mt-6 pt-6 border-t border-slate-100">
                                <Button onClick={saveIngredient} variant="success" className="py-3 px-8 h-[42px]">Guardar Insumo</Button>
                            </div>
                        </Card>
                    )}

                    <div className="overflow-hidden border-2 rounded-xl">
                        <table className="w-full text-left font-bold text-xs uppercase text-slate-700">
                            <thead className="bg-slate-900 text-white text-[9px] tracking-widest">
                                <tr>
                                    <th className="p-4">SKU Nombre</th>
                                    <th className="p-4 text-center">Familia</th>
                                    <th className="p-4 text-center">Ubicación</th>
                                    <th className="p-4 text-center">Alérgeno</th>
                                    <th className="p-4 text-right">Costo Est.</th>
                                    <th className="p-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y bg-white">
                                {ingredients.map(i => (
                                    <tr key={i.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4 font-black flex items-center gap-2">
                                            {i.es_subensamble && <Layers size={14} className="text-orange-500" />}
                                            {i.name}
                                            <span className="text-[9px] text-slate-400 font-normal lowercase block">({i.unidad_compra})</span>
                                        </td>
                                        <td className="p-4 text-center text-[10px] text-slate-500">{i.familia || 'Otros'}</td>
                                        <td className="p-4 text-center">
                                            <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded text-[9px]">{i.almacen || 'Sin Asignar'}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            {i.alergeno ? <span className="bg-red-50 text-red-600 border border-red-100 px-2 py-1 rounded text-[9px]">{i.alergeno}</span> : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="p-4 text-right font-mono text-emerald-600">${i.costo_estandar || 0}</td>
                                        <td className="p-4 text-center">
                                            {!i.es_subensamble && (
                                                <button onClick={() => { setIngForm({ id: i.id, name: i.name, unidad_compra: i.unidad_compra, familia: i.familia || 'Harinas y Polvos', almacen: i.almacen || 'Almacén Secos Principal', alergeno: i.alergeno, costo_estandar: i.costo_estandar }); setShowAddIng(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors opacity-0 group-hover:opacity-100"><Wrench size={14} /></button>
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
    const [companyName, setCompanyName] = useState(config.companyName);
    const [appName, setAppName] = useState(config.appName);
    const [newBranch, setNewBranch] = useState('');

    const saveCompanyData = () => {
        setConfig({ ...config, companyName, appName });
        showToast("Datos de la empresa actualizados correctamente.");
    };

    const addBranch = (e) => {
        e.preventDefault();
        if (!newBranch.trim() || config.branches.includes(newBranch.trim())) return;
        setConfig({ ...config, branches: [...config.branches, newBranch.trim()] });
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
                <div className="flex items-center gap-3 mb-6 border-b pb-4"><Building className="text-slate-800" size={28} /><h4 className="text-2xl font-black uppercase italic text-slate-800">Datos de la Empresa</h4></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end"><Input label="Nombre de la Empresa / Marca" value={companyName} onChange={setCompanyName} /><Input label="Subtítulo / Versión del Sistema" value={appName} onChange={setAppName} /><div className="md:col-span-2 flex justify-end mt-2"><Button variant="success" onClick={saveCompanyData} className="px-8 py-3">Guardar Datos Principales</Button></div></div>
            </Card>

            <Card className="p-8 border-t-8 border-orange-500 bg-white shadow-xl">
                <div className="flex items-center gap-3 mb-6 border-b pb-4"><Store className="text-orange-500" size={28} /><h4 className="text-2xl font-black uppercase italic text-slate-800">Locales y Sucursales</h4></div>
                <form onSubmit={addBranch} className="flex gap-4 items-end bg-slate-50 p-6 rounded-2xl border mb-8"><div className="flex-1"><Input label="Nombre de la Nueva Sucursal" placeholder="Ej. Local Norte..." value={newBranch} onChange={setNewBranch} /></div><Button variant="primary" type="submit" className="py-2.5 px-6 h-[42px]"><Plus size={16} /> Agregar</Button></form>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {config.branches.map(branch => (
                        <div key={branch} className="flex justify-between items-center bg-white border-2 border-slate-200 p-4 rounded-xl shadow-sm hover:border-orange-300 transition-colors group"><span className="font-bold text-sm text-slate-700 uppercase tracking-wide truncate pr-2">{branch}</span><button onClick={() => removeBranch(branch)} className="text-slate-300 hover:text-red-500 p-2 rounded-lg group-hover:bg-red-50"><Trash2 size={16} /></button></div>
                    ))}
                </div>
            </Card>
        </div>
    );
}