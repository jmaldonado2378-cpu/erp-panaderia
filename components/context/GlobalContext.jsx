'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ROLES } from '../bakery_erp';
import { supabase } from '../../lib/supabase';
import { DEFAULT_DASHBOARD_CONFIG } from '../dashboard_config';

/* ====================================================================
   DATOS ESTÁTICOS DE CONFIGURACIÓN (no requieren BD por ahora)
   ==================================================================== */
const INITIAL_CONFIG = {
    companyName: 'ERP Panificadoras',
    appName: 'MES PRO',
    branches: ['Morón Centro', 'Castelar'],
    finanzas: {
        costoHoraHombre: 4500,
        margenGanancia: 120,
        costosIndirectosPct: 20
    },
    rrhh: {
        horaInicioPlanta: '05:00',
        horaFinPlanta: '23:00'
    }
};

const INITIAL_OPERATIVES = [
    { id: 'op1', nombre: 'Juan Pérez', puesto: 'Maestro Panadero', descanso: 'Domingo', inicio: '06:00', fin: '14:00' },
    { id: 'op2', nombre: 'María Gómez', puesto: 'Ayudante de Pastelería', descanso: 'Lunes', inicio: '08:00', fin: '16:00' },
    { id: 'op3', nombre: 'Carlos López', puesto: 'Hornero', descanso: 'Jueves', inicio: '14:00', fin: '22:00' },
    { id: 'op4', nombre: 'Ana Martínez', puesto: 'Laminadora', descanso: 'Martes', inicio: '07:00', fin: '15:00' }
];

/* ====================================================================
   CONTEXT
   ==================================================================== */
const GlobalContext = createContext();

export const useGlobalContext = () => useContext(GlobalContext);

export const GlobalProvider = ({ children }) => {
    const [currentRole, setCurrentRole] = useState(ROLES.ADMIN);
    const [config, setConfig] = useState(INITIAL_CONFIG);
    const [operatives, setOperatives] = useState(INITIAL_OPERATIVES);

    // ── Maestros (desde Supabase) ──────────────────────────────────
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
    const [ventas, setVentas] = useState([]); // Ledger de Clientes (deudas_cliente)
    const [pagosProveedores, setPagosProveedores] = useState([]); // Ledger de Proveedores (deudas_proveedor)

    // ── Otros ──────────────────────────────────────────────────────
    const [qualityLogs, setQualityLogs] = useState([]);
    const [inventoryLogs, setInventoryLogs] = useState([]);
    const [logistics, setLogistics] = useState([]);

    // ── UI ─────────────────────────────────────────────────────────
    // ── Monitor Central (Dashboard Configurable) ────────────────
    const [dashboardConfig, setDashboardConfig] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('dashboardConfig');
            return saved ? JSON.parse(saved) : DEFAULT_DASHBOARD_CONFIG;
        }
        return DEFAULT_DASHBOARD_CONFIG;
    });

    // Persistir configuración del dashboard en localStorage cuando cambia
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('dashboardConfig', JSON.stringify(dashboardConfig));
        }
    }, [dashboardConfig]);

    const [toastMsg, setToastMsg] = useState(null);
    const [loading, setLoading] = useState(true);

    /* ==============================================================
       FETCH INICIAL DESDE SUPABASE
       ============================================================== */
    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                // 1. Clientes
                const { data: cData } = await supabase
                    .from('clientes').select('*').order('created_at', { ascending: true });
                if (cData) setClientes(cData.map(c => ({ ...c, nombre: c.razon_social })));

                // 2. Proveedores
                const { data: pData } = await supabase
                    .from('proveedores').select('*').order('created_at', { ascending: true });
                if (pData) setProviders(pData.map(p => ({ ...p, nombre: p.razon_social })));

                // 3. Ingredientes / Insumos
                const { data: iData } = await supabase
                    .from('ingredientes').select('*').order('created_at', { ascending: true });
                if (iData) setIngredients(iData);

                // 4. Recetas con Escandallo (MultiBOM)
                const { data: rData, error: rError } = await supabase
                    .from('recetas')
                    .select(`*, receta_ingredientes(ingrediente_id, porcentaje, gramos)`);
                if (rData && !rError) {
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
                }

                // 5. Órdenes de Producción
                const { data: oData } = await supabase
                    .from('ordenes_produccion').select('*').order('created_at', { ascending: false });
                if (oData) {
                    setOrders(oData.map(o => ({
                        ...o,
                        recipeId: o.receta_id,
                        targetAmount: o.cantidad_objetivo,
                        status: o.estado,
                        date: o.fecha
                    })));
                }

                // 6. Stock de Producto Terminado
                const { data: ptData } = await supabase
                    .from('lotes_pt').select('*').order('created_at', { ascending: false });
                if (ptData) {
                    setLotesPT(ptData.map(l => ({
                        ...l,
                        recipeId: l.receta_id,
                        cantidadInicial: l.cantidad_original,
                        cantidadActual: l.cantidad_actual,
                        fechaTerminado: l.fecha_produccion,
                        vencimiento: l.vencimiento
                    })));
                }

                // 7. Pedidos con sus items
                const { data: pedData } = await supabase
                    .from('pedidos')
                    .select(`*, pedido_items(*)`)
                    .order('created_at', { ascending: false });
                if (pedData) {
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
                }

                // 8. Lotes de Insumos
                const { data: lotData } = await supabase
                    .from('lotes_insumos').select('*').order('created_at', { ascending: false });
                if (lotData) {
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
                }

                // 9. Deudas Proveedor (pagos/compras)
                const { data: dpData } = await supabase
                    .from('deudas_proveedor').select('*').order('created_at', { ascending: false });
                if (dpData) setPagosProveedores(dpData);

                // 10. Deudas Cliente (ventas/cobros)
                const { data: dcData } = await supabase
                    .from('deudas_cliente').select('*').order('created_at', { ascending: false });
                if (dcData) setVentas(dcData);

            } catch (err) {
                console.error('Error cargando datos desde Supabase:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, []);

    /* ==============================================================
       HELPERS
       ============================================================== */
    const showToast = (msg, type = 'success') => {
        setToastMsg({ msg, type });
        setTimeout(() => setToastMsg(null), 4000);
    };

    // Refrescar órdenes desde BD (usado tras guardar una nueva orden)
    const refreshOrders = async () => {
        const { data } = await supabase
            .from('ordenes_produccion').select('*').order('created_at', { ascending: false });
        if (data) {
            setOrders(data.map(o => ({
                ...o,
                recipeId: o.receta_id,
                targetAmount: o.cantidad_objetivo,
                status: o.estado,
                date: o.fecha
            })));
        }
    };

    // Refrescar Stock PT desde BD
    const refreshLotesPT = async () => {
        const { data } = await supabase
            .from('lotes_pt').select('*').order('created_at', { ascending: false });
        if (data) {
            setLotesPT(data.map(l => ({
                ...l,
                recipeId: l.receta_id,
                cantidadInicial: l.cantidad_original,
                cantidadActual: l.cantidad_actual,
                fechaTerminado: l.fecha_produccion,
                vencimiento: l.vencimiento
            })));
        }
    };

    // Refrescar pedidos desde BD
    const refreshPedidos = async () => {
        const { data } = await supabase
            .from('pedidos')
            .select(`*, pedido_items(*)`)
            .order('created_at', { ascending: false });
        if (data) {
            setPedidos(data.map(p => ({
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

            // Producción
            orders, setOrders, refreshOrders,
            lotesPT, setLotesPT, refreshLotesPT,
            lots, setLots,

            // Pedidos y Logística
            pedidos, setPedidos, refreshPedidos,
            logistics, setLogistics,

            // Finanzas
            ventas, setVentas,
            pagosProveedores, setPagosProveedores,

            // Otros
            qualityLogs, setQualityLogs,
            inventoryLogs, setInventoryLogs,

            // UI
            toastMsg, showToast,

            // Dashboard Monitor Central
            dashboardConfig, setDashboardConfig,
        }}>
            {children}
        </GlobalContext.Provider>
    );
};
