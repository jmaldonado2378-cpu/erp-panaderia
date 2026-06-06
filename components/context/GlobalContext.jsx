'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ROLES } from '../bakery_erp';
import { supabase } from '../../lib/supabase';
import { DEFAULT_DASHBOARD_CONFIG } from '../dashboard_config';

/* ====================================================================
   DATOS ESTÁTICOS DE CONFIGURACIÓN Y MOCKS (Resiliencia Offline)
   ==================================================================== */
const INITIAL_CONFIG = {
    companyName: 'ERP Panificadoras',
    appName: 'MES PRO',
    branches: ['Morón Centro', 'Castelar'],
    finanzas: {
        costoHoraHombre: 4500,
        costoHoraHorno: 2500,
        costoDiaCamara: 150,
        margenGanancia: 120,
        costosIndirectosPct: 20
    },
    rrhh: {
        horaInicioPlanta: '05:00',
        horaFinPlanta: '23:00'
    }
};

const DEFAULT_DARK_THEME = {
    displayName: 'Artisan Industrial',
    customColor: '#e9590c',
    font: 'HANKEN_GROTESK',
    roundness: 'ROUND_EIGHT',
    namedColors: {
        background: '#131313',
        surface_container_lowest: '#0e0e0e',
        surface_container: '#201f1f',
        outline: 'rgba(255, 255, 255, 0.08)',
        on_surface: '#e5e2e1',
        on_surface_variant: '#a98a7e',
        on_primary: '#ffffff'
    }
};

const INITIAL_OPERATIVES = [
    { id: 'op1', nombre: 'Juan Pérez', puesto: 'Maestro Panadero', descanso: 'Domingo', inicio: '06:00', fin: '14:00' },
    { id: 'op2', nombre: 'María Gómez', puesto: 'Ayudante de Pastelería', descanso: 'Lunes', inicio: '08:00', fin: '16:00' },
    { id: 'op3', nombre: 'Carlos López', puesto: 'Hornero', descanso: 'Jueves', inicio: '14:00', fin: '22:00' },
    { id: 'op4', nombre: 'Ana Martínez', puesto: 'Laminadora', descanso: 'Martes', inicio: '07:00', fin: '15:00' }
];

const MOCK_CLIENTES = [
    { id: 'c1', codigo: 'CLI-001', nombre: 'Supermercado Vea', cuit: '30-11223344-5', tipo: 'Supermercado', direccion: 'Av. Rivadavia 18000, Morón' },
    { id: 'c2', codigo: 'CLI-002', nombre: 'Dietética La Semilla', cuit: '27-99887766-4', tipo: 'Dietética', direccion: 'Sarmiento 450, Castelar' }
];

const MOCK_PROVIDERS = [
    { id: 'p1', codigo: 'PRV-001', nombre: 'Molinos Cañuelas', cuit: '30-50001020-9', rubro: 'Harinas' },
    { id: 'p2', codigo: 'PRV-002', nombre: 'Distribuidora Lácteos Morón', cuit: '30-77665544-2', rubro: 'Materia Prima Fresca' }
];

const MOCK_INGREDIENTS = [
    { id: 'i1', codigo: 'RAW-HAR-001', name: 'Harina 000 (Fuerza)', unidad_compra: 'Bolsa 25kg', factor_conversion: 25000, unidad_base: 'g', familia: 'Harinas y Polvos', almacen: 'Harinera', alergeno: 'TACC', costo_estandar: 0.0006, tipo: 'insumo' },
    { id: 'i2', codigo: 'RAW-HAR-002', name: 'Harina 0000 (Pastelera)', unidad_compra: 'Bolsa 25kg', factor_conversion: 25000, unidad_base: 'g', familia: 'Harinas y Polvos', almacen: 'Harinera', alergeno: 'TACC', costo_estandar: 0.0008, tipo: 'insumo' },
    { id: 'i3', codigo: 'RAW-OTR-001', name: 'Agua Filtrada', unidad_compra: 'Litros', factor_conversion: 1000, unidad_base: 'ml', familia: 'Otros', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 0.00005, tipo: 'insumo' },
    { id: 'i4', codigo: 'RAW-HAR-003', name: 'Sal Fina', unidad_compra: 'Bolsa 5kg', factor_conversion: 5000, unidad_base: 'g', familia: 'Harinas y Polvos', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 0.0005, tipo: 'insumo' },
    { id: 'i5', codigo: 'RAW-FER-001', name: 'Levadura Fresca', unidad_compra: 'Paquete 500g', factor_conversion: 500, unidad_base: 'g', familia: 'Fermentos', almacen: 'Cámara de Frío 1 (Insumos)', alergeno: '', costo_estandar: 0.006, tipo: 'insumo' },
    { id: 'i6', codigo: 'RAW-CAR-001', name: 'Paleta Cerdo deshuesada', unidad_compra: 'Kg suelto', factor_conversion: 1000, unidad_base: 'g', familia: 'Carnes y Chacinados', almacen: 'Cámara de Frío 1 (Insumos)', alergeno: '', costo_estandar: 0.0045, tipo: 'insumo' },
    { id: 'i7', codigo: 'RAW-ESP-001', name: 'Nuez Mariposa Granel', unidad_compra: 'Bolsa 10 kg', factor_conversion: 10000, unidad_base: 'g', familia: 'Especias y Semillas', almacen: 'Almacén Secos Principal', alergeno: 'Nuez', costo_estandar: 0.012, tipo: 'insumo' },
    { id: 'i8', codigo: 'RAW-CAR-002', name: 'Tocino de Cerdo (Grasa)', unidad_compra: 'Kg suelto', factor_conversion: 1000, unidad_base: 'g', familia: 'Carnes y Chacinados', almacen: 'Cámara de Frío 1 (Insumos)', alergeno: '', costo_estandar: 0.0025, tipo: 'insumo' },
    { id: 'i9', codigo: 'RAW-ADI-001', name: 'Sal de Cura (0.6% Nitrito)', unidad_compra: 'Pote 1kg', factor_conversion: 1000, unidad_base: 'g', familia: 'Aditivos y Esencias', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 0.0015, tipo: 'insumo' },
    { id: 'i10', codigo: 'RAW-ADI-002', name: 'Nitrato de Potasio', unidad_compra: 'Pote 1kg', factor_conversion: 1000, unidad_base: 'g', familia: 'Aditivos y Esencias', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 0.0030, tipo: 'insumo' },
    { id: 'i11', codigo: 'RAW-ADI-003', name: 'Eritorbato de Sodio', unidad_compra: 'Pote 1kg', factor_conversion: 1000, unidad_base: 'g', familia: 'Aditivos y Esencias', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 0.0040, tipo: 'insumo' },
    { id: 'i12', codigo: 'RAW-ESP-002', name: 'Dextrosa Monohidratada', unidad_compra: 'Bolsa 1kg', factor_conversion: 1000, unidad_base: 'g', familia: 'Especias y Semillas', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 0.0020, tipo: 'insumo' },
    { id: 'i13', codigo: 'RAW-ESP-003', name: 'Pimienta Negra Molida', unidad_compra: 'Bolsa 1kg', factor_conversion: 1000, unidad_base: 'g', familia: 'Especias y Semillas', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 0.0050, tipo: 'insumo' },
    { id: 'i14', codigo: 'RAW-CAR-003', name: 'Papada de Cerdo', unidad_compra: 'Kg suelto', factor_conversion: 1000, unidad_base: 'g', familia: 'Carnes y Chacinados', almacen: 'Cámara de Frío 1 (Insumos)', alergeno: '', costo_estandar: 0.0030, tipo: 'insumo' },
    { id: 'i15', codigo: 'RAW-CAR-004', name: 'Carne Vacuna Magra', unidad_compra: 'Kg suelto', factor_conversion: 1000, unidad_base: 'g', familia: 'Carnes y Chacinados', almacen: 'Cámara de Frío 1 (Insumos)', alergeno: '', costo_estandar: 0.0055, tipo: 'insumo' },
    { id: 'i16', codigo: 'RAW-ESP-004', name: 'Almidón de Mandioca', unidad_compra: 'Bolsa 5kg', factor_conversion: 5000, unidad_base: 'g', familia: 'Harinas y Polvos', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 0.0012, tipo: 'insumo' },
    { id: 'i17', codigo: 'RAW-ADI-004', name: 'Tripolifosfato de Sodio', unidad_compra: 'Pote 1kg', factor_conversion: 1000, unidad_base: 'g', familia: 'Aditivos y Esencias', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 0.0028, tipo: 'insumo' },
    { id: 'i18', codigo: 'RAW-ADI-005', name: 'Ascorbato de Sodio', unidad_compra: 'Pote 1kg', factor_conversion: 1000, unidad_base: 'g', familia: 'Aditivos y Esencias', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 0.0042, tipo: 'insumo' },
    { id: 'i19', codigo: 'RAW-ESP-005', name: 'Glutamato Monosódico', unidad_compra: 'Pote 1kg', factor_conversion: 1000, unidad_base: 'g', familia: 'Especias y Semillas', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: 0.0035, tipo: 'insumo' },
    { id: 'emp1', codigo: 'EMP-FLW-001', name: 'Bolsa Flowpack 500g', unidad_compra: 'unidad', factor_conversion: 1, unidad_base: 'u', familia: 'Empaques', almacen: 'Depósito Empaque', alergeno: '', costo_estandar: 15.00, tipo: 'empaque' },
    { id: 'emp2', codigo: 'EMP-BND-002', name: 'Malla para Bondiola (Rollo 50m)', unidad_compra: 'Rollo', factor_conversion: 1, unidad_base: 'u', familia: 'Empaques', almacen: 'Depósito Empaque', alergeno: '', costo_estandar: 1200.00, tipo: 'empaque' }
];

const MOCK_RECIPES = [
    { id: 'r1', codigo: 'FG-F-001', nombre_producto: 'Baguette Francesa', familia: 'F', formato_venta: 'Unidad', peso_unidad: 250, merma: 18, horas_hombre: 1.5, costo_empaque: 0, details: [{ ingredientId: 'i1', porcentaje: 100, gramos: 1000 }, { ingredientId: 'i3', porcentaje: 65, gramos: 650 }, { ingredientId: 'i4', porcentaje: 2, gramos: 20 }, { ingredientId: 'i5', porcentaje: 1.5, gramos: 15 }] }
];

const MOCK_ORDERS = [
    { id: 'o1', recipeId: 'r1', targetAmount: 50, status: 'PLANIFICADA', date: '2026-05-29', created_at: new Date().toISOString() }
];

const MOCK_LOTS_PT = [
    { id: 'lpt1', recipeId: 'r1', cantidadInicial: 100, cantidadActual: 80, fechaTerminado: '2026-05-28', vencimiento: '2026-06-01' }
];

const MOCK_LOTS = [
    { id: 'l1', ingredientId: 'i1', providerId: 'p1', amount: 250000, unitPrice: 0.0006, codigo_lote: 'LOT-HAR-01', unidad: 'g', expiry: '2026-12-31', ingreso: '2026-05-01' },
    { id: 'l2', ingredientId: 'i6', providerId: 'p2', amount: 80000, unitPrice: 0.0045, codigo_lote: 'LOT-CAR-05', unidad: 'g', expiry: '2026-06-15', ingreso: '2026-05-20' },
    { id: 'l3', ingredientId: 'i7', providerId: 'p2', amount: 50000, unitPrice: 0.012, codigo_lote: 'LOT-NUEZ-01', unidad: 'g', expiry: '2027-01-20', ingreso: '2026-05-22' },
    { id: 'lemp1', ingredientId: 'emp1', providerId: 'p2', amount: 500, unitPrice: 15.00, codigo_lote: 'LOT-EMP-01', unidad: 'u', expiry: '2029-12-31', ingreso: '2026-05-01' },
    { id: 'lemp2', ingredientId: 'emp2', providerId: 'p2', amount: 5, unitPrice: 1200.00, codigo_lote: 'LOT-EMP-02', unidad: 'u', expiry: '2029-12-31', ingreso: '2026-05-01' }
];

const MOCK_PEDIDOS = [
    { id: 'p_1', clientId: 'c1', total: 18000, estado: 'DESPACHADO', fecha: '2026-05-28', items: [{ recipeId: 'r1', cantidadPedida: 40, cantidadEnviada: 40, precio: 300, productType: 'bakery' }] }
];

const MOCK_CHARC_RECETAS = [
    { 
        id: 'cr1', 
        codigo: 'CH-SLM-001', 
        nombre: 'Salame Milán Artesanal', 
        lead_time_dias: 45, 
        merma_secado_objetivo: 35.00, 
        familia_tecnologica: 'fermentado_seco',
        porcentaje_inyeccion: null,
        tiempo_preparacion: 30,
        dias_maduracion: 43,
        tiempo_curado_salado_dias: 0,
        tiempo_estufado_dias: 2,
        tiempo_curado_salmuera_dias: 0,
        tiempo_coccion_mins: 0,
        tamano_lote_kg: 10.0000,
        version: 1, 
        details: [
            { ingredientId: 'i6', gramos: 6500, porcentaje_base: 65.00, categoria_tecnologica: 'magro', secuencia_mezcla: 1 },
            { ingredientId: 'i8', gramos: 3500, porcentaje_base: 35.00, categoria_tecnologica: 'grasa', secuencia_mezcla: 1 },
            { ingredientId: 'i4', gramos: 260, porcentaje_base: 2.60, categoria_tecnologica: 'aditivo', secuencia_mezcla: 2 },
            { ingredientId: 'i9', gramos: 30, porcentaje_base: 0.30, categoria_tecnologica: 'aditivo', secuencia_mezcla: 2 },
            { ingredientId: 'i10', gramos: 10, porcentaje_base: 0.10, categoria_tecnologica: 'aditivo', secuencia_mezcla: 2 },
            { ingredientId: 'i11', gramos: 5, porcentaje_base: 0.05, categoria_tecnologica: 'aditivo', secuencia_mezcla: 2 },
            { ingredientId: 'i12', gramos: 40, porcentaje_base: 0.40, categoria_tecnologica: 'saborizante', secuencia_mezcla: 3 },
            { ingredientId: 'i13', gramos: 25, porcentaje_base: 0.25, categoria_tecnologica: 'saborizante', secuencia_mezcla: 3 },
            { ingredientId: 'emp2', gramos: 1, porcentaje_base: null, categoria_tecnologica: 'empaque', secuencia_mezcla: 4 }
        ] 
    },
    { 
        id: 'cr2', 
        codigo: 'CH-BND-002', 
        nombre: 'Bondiola Casera', 
        lead_time_dias: 60, 
        merma_secado_objetivo: 38.00, 
        familia_tecnologica: 'salazon_cruda',
        porcentaje_inyeccion: null,
        tiempo_preparacion: 30,
        dias_maduracion: 53,
        tiempo_curado_salado_dias: 7,
        tiempo_estufado_dias: 0,
        tiempo_curado_salmuera_dias: 0,
        tiempo_coccion_mins: 0,
        tamano_lote_kg: 1.0000,
        version: 1, 
        details: [
            { ingredientId: 'i6', gramos: 1000, porcentaje_base: 100.00, categoria_tecnologica: 'magro', secuencia_mezcla: 1 },
            { ingredientId: 'i4', gramos: 30, porcentaje_base: 3.00, categoria_tecnologica: 'aditivo', secuencia_mezcla: 2 },
            { ingredientId: 'i9', gramos: 4, porcentaje_base: 0.40, categoria_tecnologica: 'aditivo', secuencia_mezcla: 2 },
            { ingredientId: 'i10', gramos: 1.5, porcentaje_base: 0.15, categoria_tecnologica: 'aditivo', secuencia_mezcla: 2 },
            { ingredientId: 'i18', gramos: 0.6, porcentaje_base: 0.06, categoria_tecnologica: 'aditivo', secuencia_mezcla: 2 },
            { ingredientId: 'i12', gramos: 10, porcentaje_base: 1.00, categoria_tecnologica: 'saborizante', secuencia_mezcla: 3 },
            { ingredientId: 'emp2', gramos: 1, porcentaje_base: null, categoria_tecnologica: 'empaque', secuencia_mezcla: 4 }
        ] 
    }
];

const MOCK_CHARC_LOTES = [
    { id: 'cl1', receta_id: 'cr1', codigo_lote: 'L-CH-SLM-001', peso_inicial_g: 12000, peso_actual_g: 10200, estado: 'EN_SECADO', fecha_ingreso: '2026-05-14T10:00:00Z', fecha_vencimiento: '2026-08-14' },
    { id: 'cl2', receta_id: 'cr2', codigo_lote: 'L-CH-BND-003', peso_inicial_g: 2800, peso_actual_g: 1850, estado: 'CURADO_LISTO', fecha_ingreso: '2026-03-28T11:30:00Z', fecha_vencimiento: '2026-09-28' }
];

const MOCK_CHARC_LOGS = [
    { id: 'clg1', lote_id: 'cl1', fecha_registro: '2026-05-15T09:00:00Z', peso_real_g: 11800, temperatura_c: 13.5, humedad_pct: 75.0, operario: 'Juan Pérez', observaciones: 'Primer pesaje de control.' },
    { id: 'clg2', lote_id: 'cl1', fecha_registro: '2026-05-22T09:30:00Z', peso_real_g: 11000, temperatura_c: 14.0, humedad_pct: 72.0, operario: 'Juan Pérez', observaciones: 'Secando bien.' },
    { id: 'clg3', lote_id: 'cl1', fecha_registro: '2026-05-28T10:00:00Z', peso_real_g: 10200, temperatura_c: 13.8, humedad_pct: 74.0, operario: 'Juan Pérez', observaciones: 'Evolución normal.' }
];

const MOCK_FRACC_TAREAS = [
    { id: 'ft1', insumo_granel_id: 'i7', cantidad_granel_consumida_g: 10000, empaque_id: 'emp1', formato_bolsa_g: 250, cantidad_bolsas_obtenidas: 40, lote_pt_generado: 'L-FR-NUEZ-001', estado: 'COMPLETADO', fecha_tarea: '2026-05-20T14:00:00Z' },
    { id: 'ft2', insumo_granel_id: 'i7', cantidad_granel_consumida_g: 5000, empaque_id: 'emp1', formato_bolsa_g: 100, cantidad_bolsas_obtenidas: 0, lote_pt_generado: 'L-FR-NUEZ-002', estado: 'PENDIENTE', fecha_tarea: '2026-05-28T16:00:00Z' }
];

const MOCK_REVENTA_ARTICULOS = [
    { id: 'ra1', codigo: 'REV-BER-001', nombre: 'Berenjenas al Escabeche (Frasco 500g)', categoria: 'Conservas', costo_compra: 1200.00, margen_ganancia_pct: 50.00, precio_venta: 1800.00 },
    { id: 'ra2', codigo: 'REV-QSO-002', nombre: 'Queso Sardo Estacionado (Horma 1kg)', categoria: 'Quesos', costo_compra: 4500.00, margen_ganancia_pct: 40.00, precio_venta: 6300.00 }
];

const MOCK_REVENTA_LOTES = [
    { id: 'rl1', articulo_id: 'ra1', codigo_lote: 'L-RV-BER-010', cantidad_actual: 45, fecha_vencimiento: '2027-05-01', fecha_ingreso: '2026-05-01T09:00:00Z' },
    { id: 'rl2', articulo_id: 'ra2', codigo_lote: 'L-RV-QSO-024', cantidad_actual: 12, fecha_vencimiento: '2026-11-20', fecha_ingreso: '2026-05-10T10:30:00Z' }
];

const MOCK_EXPENSES = [
    { id: 'exp1', categoria: 'Salarios', monto: 1200000.00, fecha: '2026-05-01', descripcion: 'Sueldos planta producción panaderos' },
    { id: 'exp2', categoria: 'Alquiler', monto: 350000.00, fecha: '2026-05-02', descripcion: 'Alquiler local comercial Morón Centro' },
    { id: 'exp3', categoria: 'Servicios', monto: 78000.00, fecha: '2026-05-05', descripcion: 'Factura energía eléctrica EDENOR' },
    { id: 'exp4', categoria: 'Servicios', monto: 45000.00, fecha: '2026-05-06', descripcion: 'Factura gas natural Metrogas' }
];

/* ====================================================================
   CONTEXT
   ==================================================================== */
const GlobalContext = createContext();

export const useGlobalContext = () => useContext(GlobalContext);

export const GlobalProvider = ({ children }) => {
    const [currentRole, setCurrentRole] = useState(ROLES.ADMIN);
    const [config, setConfig] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('erpConfig');
            return saved ? JSON.parse(saved) : INITIAL_CONFIG;
        }
        return INITIAL_CONFIG;
    });
    const [operatives, setOperatives] = useState(INITIAL_OPERATIVES);

    // ── Maestros (desde Supabase / Mocks) ─────────────────────────────
    const [clientes, setClientes] = useState([]);
    const [providers, setProviders] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [recipes, setRecipes] = useState([]);

    // ── Operativo: Producción ──────────────────────────────────────
    const [orders, setOrders] = useState([]);       // órdenes de producción
    const [lotesPT, setLotesPT] = useState([]);     // stock de producto terminado
    const [lots, setLots] = useState([]);            // lotes de insumos (almacén)

    // ── Operativo: Pedidos y Despacho ──────────────────────────────
    const [pedidos, setPedidos] = useState([]);

    // ── Financiero ─────────────────────────────────────────────────
    const [ventas, setVentas] = useState([]); 
    const [pagosProveedores, setPagosProveedores] = useState([]); 

    // ── Charcutería ────────────────────────────────────────────────
    const [charcRecetas, setCharcRecetas] = useState([]);
    const [charcLotes, setCharcLotes] = useState([]);
    const [charcLogs, setCharcLogs] = useState([]);

    // ── Fraccionamiento ────────────────────────────────────────────
    const [fraccTareas, setFraccTareas] = useState([]);

    // ── Reventa ────────────────────────────────────────────────────
    const [reventaArticulos, setReventaArticulos] = useState([]);
    const [reventaLotes, setReventaLotes] = useState([]);

    // ── Egresos Varios ─────────────────────────────────────────────
    const [expenses, setExpenses] = useState([]);

    // ── Otros ──────────────────────────────────────────────────────
    const [qualityLogs, setQualityLogs] = useState([]);
    const [inventoryLogs, setInventoryLogs] = useState([]);
    const [logistics, setLogistics] = useState([]);

    // ── UI / Config ────────────────────────────────────────────────
    const [dashboardConfig, setDashboardConfig] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('dashboardConfig');
            return saved ? JSON.parse(saved) : DEFAULT_DASHBOARD_CONFIG;
        }
        return DEFAULT_DASHBOARD_CONFIG;
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('dashboardConfig', JSON.stringify(dashboardConfig));
        }
    }, [dashboardConfig]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('erpConfig', JSON.stringify(config));
        }
    }, [config]);

    const [toastMsg, setToastMsg] = useState(null);
    const [loading, setLoading] = useState(true);

    const showToast = (msg, type = 'success') => {
        setToastMsg({ msg, type });
        setTimeout(() => setToastMsg(null), 4000);
    };

    const [theme, setTheme] = useState('classic');
    const [stitchProjectId, setStitchProjectId] = useState('15115760904171156066');
    const [stitchApiKey, setStitchApiKey] = useState('');
    const [stitchDesignSystems, setStitchDesignSystems] = useState([]);
    const [stitchThemeConfig, setStitchThemeConfig] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('stitchThemeConfig');
            return saved ? JSON.parse(saved) : DEFAULT_DARK_THEME;
        }
        return DEFAULT_DARK_THEME;
    });
    const [stitchActiveTheme, setStitchActiveTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('stitchActiveTheme');
            return saved ? JSON.parse(saved) : DEFAULT_DARK_THEME;
        }
        return DEFAULT_DARK_THEME;
    });

    const applyStitchTheme = (themeConfig) => {
        if (!themeConfig) return;
        const root = document.documentElement;
        
        // namedColors mapping
        const colors = themeConfig.namedColors || themeConfig.theme?.namedColors || {};
        
        root.style.setProperty('--background', colors.background || '#131313');
        root.style.setProperty('--sidebar-bg', colors.surface_container_lowest || '#0e0e0e');
        root.style.setProperty('--card-bg', colors.surface_container || '#201f1f');
        root.style.setProperty('--card-border', colors.outline || 'rgba(255, 255, 255, 0.08)');
        root.style.setProperty('--accent', themeConfig.customColor || themeConfig.theme?.customColor || '#e9590c');
        root.style.setProperty('--text-primary', colors.on_surface || '#e5e2e1');
        root.style.setProperty('--text-secondary', colors.on_surface_variant || '#a98a7e');
        root.style.setProperty('--btn-text', colors.on_primary || '#ffffff');
        
        // Roundness
        let radius = '8px';
        const roundness = themeConfig.roundness || themeConfig.theme?.roundness;
        if (roundness === 'ROUND_ZERO') radius = '0px';
        else if (roundness === 'ROUND_FOUR') radius = '4px';
        else if (roundness === 'ROUND_EIGHT') radius = '8px';
        else if (roundness === 'ROUND_SIXTEEN') radius = '16px';
        else if (roundness === 'ROUND_FULL') radius = '9999px';
        root.style.setProperty('--border-radius', radius);
        
        // Font Family
        let font = 'Inter, sans-serif';
        const fontVal = themeConfig.font || themeConfig.theme?.font;
        if (fontVal === 'SPACE_MONO') font = 'Space Mono, monospace';
        else if (fontVal === 'HANKEN_GROTESK') font = 'Hanken Grotesk, sans-serif';
        else if (fontVal === 'OUTFIT') font = 'Outfit, sans-serif';
        else if (fontVal === 'MANROPE') font = 'Manrope, sans-serif';
        root.style.setProperty('--font-family', font);
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('erpTheme');
            if (savedTheme) {
                setTheme(savedTheme);
                document.documentElement.setAttribute('data-theme', savedTheme);
                
                if (savedTheme === 'stitch-custom') {
                    const savedStitchConfig = localStorage.getItem('stitchThemeConfig');
                    if (savedStitchConfig) {
                        try {
                            const parsed = JSON.parse(savedStitchConfig);
                            setStitchThemeConfig(parsed);
                            // Se ejecuta después de un breve delay para que la UI se monte
                            setTimeout(() => applyStitchTheme(parsed), 50);
                        } catch (e) {
                            console.error("Error cargando el diseño guardado de Stitch", e);
                        }
                    }
                }
            }
            
            // Cargar datos persistidos de Stitch
            const savedProjId = localStorage.getItem('stitchProjectId');
            if (savedProjId) setStitchProjectId(savedProjId);
            
            const savedApiKey = localStorage.getItem('stitchApiKey');
            if (savedApiKey) setStitchApiKey(savedApiKey);
            
            const savedSystems = localStorage.getItem('stitchDesignSystems');
            if (savedSystems) {
                try {
                    setStitchDesignSystems(JSON.parse(savedSystems));
                } catch (e) {}
            }
            
            const savedActiveTheme = localStorage.getItem('stitchActiveTheme');
            if (savedActiveTheme) {
                try {
                    setStitchActiveTheme(JSON.parse(savedActiveTheme));
                } catch (e) {}
            }
        }
    }, []);

    // Effect to run when theme or stitchThemeConfig changes
    useEffect(() => {
        if (theme === 'stitch-custom' && stitchThemeConfig) {
            applyStitchTheme(stitchThemeConfig);
        } else {
            const root = document.documentElement;
            root.style.removeProperty('--background');
            root.style.removeProperty('--sidebar-bg');
            root.style.removeProperty('--card-bg');
            root.style.removeProperty('--card-border');
            root.style.removeProperty('--accent');
            root.style.removeProperty('--text-primary');
            root.style.removeProperty('--text-secondary');
            root.style.removeProperty('--border-radius');
            root.style.removeProperty('--font-family');
            root.style.removeProperty('--btn-text');
        }
    }, [theme, stitchThemeConfig]);

    const changeTheme = (newTheme) => {
        setTheme(newTheme);
        localStorage.setItem('erpTheme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    /* ==============================================================
       FETCH INICIAL DESDE SUPABASE / FALLBACK MOCKS
       ============================================================== */
    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                // 1. Clientes
                const { data: cData } = await supabase.from('clientes').select('*').order('created_at', { ascending: true });
                if (cData && cData.length > 0) setClientes(cData.map(c => ({ ...c, nombre: c.razon_social })));
                else setClientes(MOCK_CLIENTES);

                // 2. Proveedores
                const { data: pData } = await supabase.from('proveedores').select('*').order('created_at', { ascending: true });
                if (pData && pData.length > 0) setProviders(pData.map(p => ({ ...p, nombre: p.razon_social })));
                else setProviders(MOCK_PROVIDERS);

                // 3. Ingredientes / Insumos
                const { data: iData } = await supabase.from('ingredientes').select('*').order('created_at', { ascending: true });
                if (iData && iData.length > 0) setIngredients(iData);
                else setIngredients(MOCK_INGREDIENTS);

                // 4. Recetas
                const { data: rData } = await supabase.from('recetas').select(`*, receta_ingredientes(ingrediente_id, porcentaje, gramos)`);
                if (rData && rData.length > 0) {
                    setRecipes(rData.map(r => ({
                        ...r,
                        loteMinimo: r.lote_minimo,
                        unidadLote: r.unidad_lote,
                        details: (r.receta_ingredientes || []).map(d => ({
                            ingredientId: d.ingrediente_id,
                            porcentaje: d.porcentaje,
                            gramos: d.gramos
                        }))
                    })));
                } else {
                    setRecipes(MOCK_RECIPES);
                }

                // 5. Órdenes
                const { data: oData } = await supabase.from('ordenes_produccion').select('*').order('created_at', { ascending: false });
                if (oData && oData.length > 0) {
                    setOrders(oData.map(o => ({
                        ...o,
                        recipeId: o.receta_id,
                        targetAmount: o.cantidad_objetivo,
                        status: o.estado,
                        date: o.fecha
                    })));
                } else setOrders(MOCK_ORDERS);

                // 6. Lotes PT
                const { data: ptData } = await supabase.from('lotes_pt').select('*').order('created_at', { ascending: false });
                if (ptData && ptData.length > 0) {
                    setLotesPT(ptData.map(l => ({
                        ...l,
                        recipeId: l.receta_id,
                        cantidadInicial: l.cantidad_original,
                        cantidadActual: l.cantidad_actual,
                        fechaTerminado: l.fecha_produccion,
                        vencimiento: l.vencimiento
                    })));
                } else setLotesPT(MOCK_LOTS_PT);

                // 7. Pedidos
                const { data: pedData } = await supabase.from('pedidos').select(`*, pedido_items(*)`).order('created_at', { ascending: false });
                if (pedData && pedData.length > 0) {
                    setPedidos(pedData.map(p => ({
                        ...p,
                        clientId: p.cliente_id,
                        fecha: p.fecha_creacion,
                        items: (p.pedido_items || []).map(it => ({
                            ...it,
                            recipeId: it.receta_id || it.recipe_id,
                            cantidadPedida: it.cantidad_solicitada,
                            cantidadEnviada: it.cantidad_enviada,
                            faltante: it.faltante
                        }))
                    })));
                } else setPedidos(MOCK_PEDIDOS);

                // 8. Lotes Insumos
                const { data: lotData } = await supabase.from('lotes_insumos').select('*').order('created_at', { ascending: false });
                if (lotData && lotData.length > 0) {
                    setLots(lotData.map(l => ({
                        ...l,
                        ingredientId: l.ingrediente_id,
                        providerId: l.proveedor_id,
                        amount: l.cantidad_actual,
                        unitPrice: l.costo_unitario,
                        codigo_lote: l.codigo_lote,
                        unidad: l.unidad,
                        expiry: l.fecha_vencimiento,
                        ingreso: l.fecha_ingreso
                    })));
                } else setLots(MOCK_LOTS);

                // 9. Deudas Proveedor
                const { data: dpData } = await supabase.from('deudas_proveedor').select('*').order('created_at', { ascending: false });
                if (dpData) setPagosProveedores(dpData);

                // 10. Deudas Cliente
                const { data: dcData } = await supabase.from('deudas_cliente').select('*').order('created_at', { ascending: false });
                if (dcData) setVentas(dcData);

                // ── Módulos Nuevos ─────────────────────────────────────────
                // 11. Charcutería Recetas
                const { data: crData } = await supabase.from('charc_recetas').select(`*, charc_receta_ingredientes(*)`).order('created_at', { ascending: true });
                if (crData && crData.length > 0) {
                    setCharcRecetas(crData.map(r => ({
                        ...r,
                        details: (r.charc_receta_ingredientes || []).map(d => ({
                            ingredientId: d.ingrediente_id,
                            gramos: d.gramos,
                            porcentaje_base: d.porcentaje_base,
                            categoria_tecnologica: d.categoria_tecnologica,
                            secuencia_mezcla: d.secuencia_mezcla
                        }))
                    })));
                } else setCharcRecetas(MOCK_CHARC_RECETAS);

                // 12. Charcutería Lotes
                const { data: clData } = await supabase.from('charc_lotes_maduracion').select('*').order('created_at', { ascending: false });
                if (clData && clData.length > 0) setCharcLotes(clData);
                else setCharcLotes(MOCK_CHARC_LOTES);

                // 13. Charcutería Logs
                const { data: clgData } = await supabase.from('charc_maduracion_log').select('*').order('fecha_registro', { ascending: false });
                if (clgData && clgData.length > 0) setCharcLogs(clgData);
                else setCharcLogs(MOCK_CHARC_LOGS);

                // 14. Fraccionamiento Tareas
                const { data: ftData } = await supabase.from('fracc_tareas').select('*').order('created_at', { ascending: false });
                if (ftData && ftData.length > 0) setFraccTareas(ftData);
                else setFraccTareas(MOCK_FRACC_TAREAS);

                // 15. Reventa Artículos
                const { data: raData } = await supabase.from('reventa_articulos').select('*').order('created_at', { ascending: true });
                if (raData && raData.length > 0) setReventaArticulos(raData);
                else setReventaArticulos(MOCK_REVENTA_ARTICULOS);

                // 16. Reventa Lotes
                const { data: rlData } = await supabase.from('reventa_lotes').select('*').order('created_at', { ascending: false });
                if (rlData && rlData.length > 0) setReventaLotes(rlData);
                else setReventaLotes(MOCK_REVENTA_LOTES);

                // 17. Egresos Varios
                const { data: expData } = await supabase.from('egresos_varios').select('*').order('fecha', { ascending: false });
                if (expData && expData.length > 0) setExpenses(expData);
                else setExpenses(MOCK_EXPENSES);

            } catch (err) {
                console.error('Error cargando datos desde Supabase:', err);
                // Si la conexión falla, los valores ya están cargados con mocks en el catch mediante states de fallback
                setClientes(MOCK_CLIENTES);
                setProviders(MOCK_PROVIDERS);
                setIngredients(MOCK_INGREDIENTS);
                setRecipes(MOCK_RECIPES);
                setOrders(MOCK_ORDERS);
                setLotesPT(MOCK_LOTS_PT);
                setLots(MOCK_LOTS);
                setPedidos(MOCK_PEDIDOS);
                setCharcRecetas(MOCK_CHARC_RECETAS);
                setCharcLotes(MOCK_CHARC_LOTES);
                setCharcLogs(MOCK_CHARC_LOGS);
                setFraccTareas(MOCK_FRACC_TAREAS);
                setReventaArticulos(MOCK_REVENTA_ARTICULOS);
                setReventaLotes(MOCK_REVENTA_LOTES);
                setExpenses(MOCK_EXPENSES);
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, []);

    /* ==============================================================
       MÉTODOS DE MUTACIÓN Y PERSISTENCIA (RESILIENCIA OFFLINE)
       ============================================================== */
    
    // ── CHARCUTERÍA ────────────────────────────────────────────────
    const addCharcReceta = async (receta, details) => {
        try {
            let data, error;
            const res = await supabase.from('charc_recetas').insert([receta]).select();
            data = res.data;
            error = res.error;
            
            if (error && (error.code === '42703' || error.message.includes('tamano_lote_kg'))) {
                console.warn("Columna 'tamano_lote_kg' no existe en DB, reintentando sin ella");
                const { tamano_lote_kg, ...cleanReceta } = receta;
                const retry = await supabase.from('charc_recetas').insert([cleanReceta]).select();
                if (retry.error) throw retry.error;
                data = retry.data;
            } else if (error) {
                throw error;
            }
            
            const newId = data[0].id;
            
            // Guardar detalles
            const detInserts = details.map(d => ({ 
                receta_id: newId, 
                ingrediente_id: d.ingredientId, 
                gramos: Number(d.gramos || 0),
                porcentaje_base: d.porcentaje_base !== '' && d.porcentaje_base != null ? Number(d.porcentaje_base) : null,
                categoria_tecnologica: d.categoria_tecnologica || 'aditivo',
                secuencia_mezcla: d.secuencia_mezcla !== '' && d.secuencia_mezcla != null ? Number(d.secuencia_mezcla) : 1
            }));
            await supabase.from('charc_receta_ingredientes').insert(detInserts);

            setCharcRecetas(prev => [{ ...data[0], tamano_lote_kg: receta.tamano_lote_kg, details: details }, ...prev]);
            showToast("Receta de charcutería guardada.");
        } catch (err) {
            console.warn("Fallo persistencia, guardando localmente:", err.message);
            const localRec = { id: 'cr_' + Date.now(), ...receta, details };
            setCharcRecetas(prev => [localRec, ...prev]);
            showToast("Guardado localmente (Offline)");
        }
    };

    const updateCharcReceta = async (id, receta, details) => {
        try {
            const { error } = await supabase.from('charc_recetas').update(receta).eq('id', id);
            if (error && (error.code === '42703' || error.message.includes('tamano_lote_kg'))) {
                console.warn("Columna 'tamano_lote_kg' no existe en DB, reintentando sin ella");
                const { tamano_lote_kg, ...cleanReceta } = receta;
                const retry = await supabase.from('charc_recetas').update(cleanReceta).eq('id', id);
                if (retry.error) throw retry.error;
            } else if (error) {
                throw error;
            }
            
            // Eliminar detalles viejos e insertar los nuevos
            const { error: delError } = await supabase.from('charc_receta_ingredientes').delete().eq('receta_id', id);
            if (delError) throw delError;

            const detInserts = details.map(d => ({ 
                receta_id: id, 
                ingrediente_id: d.ingredientId, 
                gramos: Number(d.gramos || 0),
                porcentaje_base: d.porcentaje_base !== '' && d.porcentaje_base != null ? Number(d.porcentaje_base) : null,
                categoria_tecnologica: d.categoria_tecnologica || 'aditivo',
                secuencia_mezcla: d.secuencia_mezcla !== '' && d.secuencia_mezcla != null ? Number(d.secuencia_mezcla) : 1
            }));
            const { error: insError } = await supabase.from('charc_receta_ingredientes').insert(detInserts);
            if (insError) throw insError;

            setCharcRecetas(prev => prev.map(r => r.id === id ? { ...r, ...receta, details } : r));
            showToast("Receta de charcutería actualizada.");
        } catch (err) {
            console.error("Error actualizando receta:", err.message);
            showToast("Error BD: " + err.message, "error");
        }
    };

    const deleteCharcReceta = async (id) => {
        try {
            const { error } = await supabase.from('charc_recetas').delete().eq('id', id);
            if (error) throw error;
            setCharcRecetas(prev => prev.filter(r => r.id !== id));
            showToast("Ficha de charcutería eliminada.", "error");
        } catch (err) {
            console.error("Error eliminando receta:", err.message);
            showToast("Error BD: " + err.message, "error");
        }
    };

    const addCharcLote = async (lote) => {
        try {
            const { data, error } = await supabase.from('charc_lotes_maduracion').insert([lote]).select();
            if (error) throw error;
            setCharcLotes(prev => [data[0], ...prev]);
            showToast("Lote de charcutería registrado en secado.");
        } catch (err) {
            console.warn("Fallo persistencia, guardando localmente:", err.message);
            const localLot = { id: 'cl_' + Date.now(), ...lote, fecha_ingreso: new Date().toISOString() };
            setCharcLotes(prev => [localLot, ...prev]);
            showToast("Lote guardado localmente (Offline)");
        }
    };

    const addCharcLog = async (log) => {
        try {
            const { data, error } = await supabase.from('charc_maduracion_log').insert([log]).select();
            if (error) throw error;
            setCharcLogs(prev => [data[0], ...prev]);
            // Actualizar peso actual en el lote
            setCharcLotes(prev => prev.map(l => l.id === log.lote_id ? { ...l, peso_actual_g: Number(log.peso_real_g) } : l));
            showToast("Medición registrada.");
        } catch (err) {
            console.warn("Fallo persistencia, guardando localmente:", err.message);
            const localLog = { id: 'clg_' + Date.now(), ...log, fecha_registro: new Date().toISOString() };
            setCharcLogs(prev => [localLog, ...prev]);
            setCharcLotes(prev => prev.map(l => l.id === log.lote_id ? { ...l, peso_actual_g: Number(log.peso_real_g) } : l));
            showToast("Medición registrada localmente (Offline)");
        }
    };

    const updateCharcLoteEstado = async (loteId, nuevoEstado) => {
        try {
            await supabase.from('charc_lotes_maduracion').update({ estado: nuevoEstado }).eq('id', loteId);
            setCharcLotes(prev => prev.map(l => l.id === loteId ? { ...l, estado: nuevoEstado } : l));
            showToast(`Lote actualizado a ${nuevoEstado}`);
        } catch (err) {
            setCharcLotes(prev => prev.map(l => l.id === loteId ? { ...l, estado: nuevoEstado } : l));
            showToast("Actualizado localmente (Offline)");
        }
    };

    // ── FRACCIONAMIENTO ────────────────────────────────────────────
    const addFraccTarea = async (tarea, granelLoteId, empaqueLoteId, newLotInsumo) => {
        try {
            // 1. Insert/Update task in fracc_tareas
            let data, error;
            if (tarea.id && !String(tarea.id).startsWith('ft_') && !String(tarea.id).startsWith('o_')) {
                const res = await supabase.from('fracc_tareas').update({
                    cantidad_granel_consumida_g: tarea.cantidad_granel_consumida_g,
                    cantidad_bolsas_obtenidas: tarea.cantidad_bolsas_obtenidas,
                    estado: 'COMPLETADO',
                    fecha_tarea: new Date().toISOString()
                }).eq('id', tarea.id).select();
                data = res.data;
                error = res.error;
            } else {
                const res = await supabase.from('fracc_tareas').insert([tarea]).select();
                data = res.data;
                error = res.error;
            }
            if (error) throw error;
            
            // 2. Update stock of consumed lots in DB
            if (granelLoteId) {
                const granelL = lots.find(l => l.id === granelLoteId);
                if (granelL) {
                    const newAmt = Math.max(0, granelL.amount - tarea.cantidad_granel_consumida_g);
                    await supabase.from('lotes_insumos').update({ cantidad_actual: newAmt }).eq('id', granelLoteId);
                }
            }
            if (empaqueLoteId) {
                const empaqueL = lots.find(l => l.id === empaqueLoteId);
                if (empaqueL) {
                    const newAmt = Math.max(0, empaqueL.amount - tarea.cantidad_bolsas_obtenidas);
                    await supabase.from('lotes_insumos').update({ cantidad_actual: newAmt }).eq('id', empaqueLoteId);
                }
            }

            // 3. Insert new lot in DB
            let insertedLot = null;
            if (newLotInsumo) {
                const { data: lotData, error: lotErr } = await supabase.from('lotes_insumos').insert([newLotInsumo]).select();
                if (lotErr) throw lotErr;
                if (lotData) insertedLot = lotData[0];
            }

            // 4. Update corresponding production order in DB and local state
            try {
                const { data: ords } = await supabase.from('ordenes_produccion').select('id, observaciones');
                if (ords) {
                    const match = ords.find(o => {
                        try {
                            const obs = JSON.parse(o.observaciones);
                            return obs.linea === 'fraccionamiento' && String(obs.lote_pt_generado).toUpperCase() === String(tarea.lote_pt_generado).toUpperCase();
                        } catch(e) { return false; }
                    });
                    if (match) {
                        await supabase.from('ordenes_produccion').update({ estado: 'COMPLETADO' }).eq('id', match.id);
                        setOrders(prev => prev.map(o => o.id === match.id ? { ...o, estado: 'COMPLETADO', status: 'COMPLETADO' } : o));
                    }
                }
            } catch(e) {
                console.warn("Error matching production order:", e.message);
            }

            // 5. Update local state
            setFraccTareas(prev => {
                const taskToSave = data && data[0] ? data[0] : tarea;
                const exists = prev.some(t => t.id === taskToSave.id);
                if (exists) {
                    return prev.map(t => t.id === taskToSave.id ? taskToSave : t);
                }
                return [taskToSave, ...prev];
            });

            setLots(prev => {
                let step1 = prev.map(l => {
                    if (l.id === granelLoteId) {
                        return { ...l, amount: Math.max(0, l.amount - tarea.cantidad_granel_consumida_g) };
                    }
                    if (l.id === empaqueLoteId) {
                        return { ...l, amount: Math.max(0, l.amount - tarea.cantidad_bolsas_obtenidas) };
                    }
                    return l;
                });
                if (insertedLot) {
                    const mappedLot = {
                        id: insertedLot.id,
                        codigo_lote: insertedLot.codigo_lote,
                        ingredientId: insertedLot.ingrediente_id,
                        providerId: insertedLot.proveedor_id,
                        amount: insertedLot.cantidad_actual,
                        unitPrice: insertedLot.costo_unitario,
                        expiry: insertedLot.fecha_vencimiento,
                        ingreso: insertedLot.fecha_ingreso,
                        unidad: insertedLot.unidad
                    };
                    return [mappedLot, ...step1];
                } else if (newLotInsumo) {
                    const localMappedLot = {
                        id: 'l_' + Date.now(),
                        codigo_lote: newLotInsumo.codigo_lote,
                        ingredientId: newLotInsumo.ingrediente_id,
                        providerId: null,
                        amount: newLotInsumo.cantidad_actual,
                        unitPrice: newLotInsumo.costo_unitario,
                        expiry: newLotInsumo.fecha_vencimiento,
                        ingreso: newLotInsumo.fecha_ingreso,
                        unidad: newLotInsumo.unidad
                    };
                    return [localMappedLot, ...step1];
                }
                return step1;
            });

            showToast("✅ Fraccionamiento completado e inventario actualizado.");
        } catch (err) {
            console.warn("Fallo persistencia, guardando localmente:", err.message);
            const localTask = { id: tarea.id || 'ft_' + Date.now(), ...tarea, estado: 'COMPLETADO', fecha_tarea: new Date().toISOString() };
            
            // Local update for matching order
            setOrders(prev => prev.map(o => {
                try {
                    const obs = JSON.parse(o.observaciones);
                    if (obs.linea === 'fraccionamiento' && String(obs.lote_pt_generado).toUpperCase() === String(tarea.lote_pt_generado).toUpperCase()) {
                        return { ...o, estado: 'COMPLETADO', status: 'COMPLETADO' };
                    }
                } catch(e) {}
                return o;
            }));

            setFraccTareas(prev => {
                const exists = prev.some(t => t.id === localTask.id);
                if (exists) {
                    return prev.map(t => t.id === localTask.id ? localTask : t);
                }
                return [localTask, ...prev];
            });

            setLots(prev => {
                let step1 = prev.map(l => {
                    if (l.id === granelLoteId) {
                        return { ...l, amount: Math.max(0, l.amount - tarea.cantidad_granel_consumida_g) };
                    }
                    if (l.id === empaqueLoteId) {
                        return { ...l, amount: Math.max(0, l.amount - tarea.cantidad_bolsas_obtenidas) };
                    }
                    return l;
                });
                if (newLotInsumo) {
                    const localMappedLot = {
                        id: 'l_' + Date.now(),
                        codigo_lote: newLotInsumo.codigo_lote,
                        ingredientId: newLotInsumo.ingrediente_id,
                        providerId: null,
                        amount: newLotInsumo.cantidad_actual,
                        unitPrice: newLotInsumo.costo_unitario,
                        expiry: newLotInsumo.fecha_vencimiento,
                        ingreso: newLotInsumo.fecha_ingreso,
                        unidad: newLotInsumo.unidad
                    };
                    return [localMappedLot, ...step1];
                }
                return step1;
            });
            
            showToast("✅ Fraccionamiento guardado localmente (Offline).");
        }
    };

    // Ayudante de deducción de stock
    const deductIngredientStock = (ingId, cantidad) => {
        setLots(prev => {
            let rest = Number(cantidad);
            return prev.map(l => {
                if (l.ingredientId === ingId && l.amount > 0 && rest > 0) {
                    const amt = Number(l.amount);
                    if (amt >= rest) {
                        const newAmt = amt - rest;
                        rest = 0;
                        return { ...l, amount: newAmt };
                    } else {
                        rest -= amt;
                        return { ...l, amount: 0 };
                    }
                }
                return l;
            });
        });
    };

    // ── REVENTA ────────────────────────────────────────────────────
    const addReventaArticulo = async (articulo) => {
        try {
            const { data, error } = await supabase.from('reventa_articulos').insert([articulo]).select();
            if (error) throw error;
            setReventaArticulos(prev => [...prev, data[0]]);
            showToast("Artículo de reventa registrado.");
        } catch (err) {
            const localArt = { id: 'ra_' + Date.now(), ...articulo };
            setReventaArticulos(prev => [...prev, localArt]);
            showToast("Guardado localmente (Offline)");
        }
    };

    const addReventaLote = async (lote) => {
        try {
            const { data, error } = await supabase.from('reventa_lotes').insert([lote]).select();
            if (error) throw error;
            setReventaLotes(prev => [data[0], ...prev]);
            showToast("Lote de reventa ingresado a stock.");
        } catch (err) {
            const localLot = { id: 'rl_' + Date.now(), ...lote, fecha_ingreso: new Date().toISOString() };
            setReventaLotes(prev => [localLot, ...prev]);
            showToast("Lote guardado localmente (Offline)");
        }
    };

    const addStockReventaLote = (loteId, qty) => {
        setReventaLotes(prev => prev.map(l => l.id === loteId ? { ...l, cantidad_actual: Number(l.cantidad_actual) + Number(qty) } : l));
        showToast("Stock ajustado correctamente.");
    };

    // ── EGRESOS VARIOS ─────────────────────────────────────────────
    const addExpense = async (expense) => {
        try {
            const { data, error } = await supabase.from('egresos_varios').insert([expense]).select();
            if (error) throw error;
            setExpenses(prev => [data[0], ...prev]);
            showToast("Egreso registrado correctamente.");
        } catch (err) {
            console.warn("Fallo persistencia, guardando localmente:", err.message);
            const localExpense = { id: 'exp_' + Date.now(), ...expense };
            setExpenses(prev => [localExpense, ...prev]);
            showToast("✅ Egreso guardado localmente (Offline)");
        }
    };

    // ── PEDIDOS Y VENTAS CONSOLIDADOS ────────────────────────────────
    const addPedidoConsolidado = async (pedido, items) => {
        try {
            const { data, error } = await supabase.from('pedidos').insert([pedido]).select();
            if (error) throw error;
            const newPedId = data[0].id;
            
            const itemInserts = items.map(it => ({ ...it, pedido_id: newPedId }));
            await supabase.from('pedido_items').insert(itemInserts);
            
            setPedidos(prev => [{ ...data[0], items }, ...prev]);
            showToast("Pedido de reparto despachado.");
        } catch (err) {
            const localPed = { id: 'p_' + Date.now(), ...pedido, items };
            setPedidos(prev => [localPed, ...prev]);
            showToast("Pedido cargado localmente (Offline)");
        }
    };

    /* ==============================================================
       PROVIDER
       ============================================================== */
    return (
        <GlobalContext.Provider value={{
            // Rol y Config
            currentRole, setCurrentRole,
            config, setConfig,
            operatives, setOperatives,
            loading,

            // Maestros
            ingredients, setIngredients,
            recipes, setRecipes,
            providers, setProviders,
            clientes, setClientes,

            // Producción Panadería
            orders, setOrders,
            lotesPT, setLotesPT,
            lots, setLots,

            // Pedidos y Logística
            pedidos, setPedidos,
            logistics, setLogistics,
            addPedidoConsolidado,

            // Finanzas
            ventas, setVentas,
            pagosProveedores, setPagosProveedores,

            // Charcutería
            charcRecetas, setCharcRecetas, addCharcReceta, updateCharcReceta, deleteCharcReceta,
            charcLotes, setCharcLotes, addCharcLote,
            charcLogs, setCharcLogs, addCharcLog,
            updateCharcLoteEstado,

            // Fraccionamiento
            fraccTareas, setFraccTareas, addFraccTarea,

            // Reventa
            reventaArticulos, setReventaArticulos, addReventaArticulo,
            reventaLotes, setReventaLotes, addReventaLote, addStockReventaLote,

            // Egresos Varios
            expenses, setExpenses, addExpense,

            // Otros
            qualityLogs, setQualityLogs,
            inventoryLogs, setInventoryLogs,

            // UI
            toastMsg, showToast,
            dashboardConfig, setDashboardConfig,
            theme, changeTheme,
            stitchProjectId, setStitchProjectId,
            stitchApiKey, setStitchApiKey,
            stitchDesignSystems, setStitchDesignSystems,
            stitchThemeConfig, setStitchThemeConfig,
            stitchActiveTheme, setStitchActiveTheme,
            applyStitchTheme
        }}>
            {children}
        </GlobalContext.Provider>
    );
};
