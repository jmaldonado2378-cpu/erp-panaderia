import {
    ClipboardList, Coins, AlertTriangle, Truck,
    TrendingUp, Package, ShoppingCart,
    Factory, BarChart3, DollarSign, Users
} from 'lucide-react';

/* ======================================================================
   CATÁLOGO CENTRAL DE WIDGETS
   Cada widget tiene: id, label, descripción, categoría, preset membership
   ====================================================================== */
export const WIDGET_CATALOG = [
    {
        id: 'kpi_ordenes',
        label: 'Órdenes de Producción',
        description: 'Total de órdenes activas en planta',
        category: 'produccion',
        icon: ClipboardList,
        color: 'bg-slate-900',
        presets: ['planta', 'control', 'ejecutivo']
    },
    {
        id: 'kpi_stock_valor',
        label: 'Valorización de Stock MP',
        description: 'Valor total del inventario de Materias Primas',
        category: 'stock',
        icon: Coins,
        color: 'bg-emerald-700',
        presets: ['ejecutivo', 'control']
    },
    {
        id: 'kpi_deuda_mp',
        label: 'Deuda con Proveedores',
        description: 'Total pendiente de pago a proveedores',
        category: 'finanzas',
        icon: AlertTriangle,
        color: 'bg-rose-700',
        presets: ['ejecutivo', 'control']
    },
    {
        id: 'kpi_pedidos',
        label: 'Pedidos Pendientes / Despachados',
        description: 'Estado logístico del día',
        category: 'logistica',
        icon: Truck,
        color: 'bg-blue-700',
        presets: ['planta', 'logistica', 'control']
    },
    {
        id: 'kpi_lotes_pt',
        label: 'Lotes Producto Terminado (PT)',
        description: 'Cantidad de lotes de PT disponibles en stock',
        category: 'stock',
        icon: Package,
        color: 'bg-violet-700',
        presets: ['planta', 'logistica', 'control']
    },
    {
        id: 'kpi_ventas_hoy',
        label: 'Ventas Facturadas Hoy',
        description: 'Total facturado en el día a clientes',
        category: 'finanzas',
        icon: DollarSign,
        color: 'bg-orange-600',
        presets: ['ejecutivo', 'control']
    },
    {
        id: 'kpi_recetas',
        label: 'Fichas Técnicas Activas',
        description: 'Total de recetas del catálogo MultiBOM',
        category: 'produccion',
        icon: Factory,
        color: 'bg-teal-700',
        presets: ['ejecutivo']
    },
    {
        id: 'kpi_clientes',
        label: 'Clientes Activos',
        description: 'Total de clientes en el maestro',
        category: 'clientes',
        icon: Users,
        color: 'bg-indigo-700',
        presets: ['ejecutivo']
    },
    {
        id: 'tabla_mermas',
        label: 'Auditoría de Mermas',
        description: 'Tabla comparativa Consumo Teórico vs Real',
        category: 'calidad',
        icon: BarChart3,
        presets: ['planta', 'control']
    },
    {
        id: 'tabla_ordenes_activas',
        label: 'Órdenes Activas en Planta',
        description: 'Listado de órdenes de producción en curso',
        category: 'produccion',
        icon: TrendingUp,
        presets: ['planta', 'control']
    },
    {
        id: 'tabla_pedidos_pendientes',
        label: 'Pedidos Pendientes del Día',
        description: 'Listado de pedidos sin despachar',
        category: 'logistica',
        icon: ShoppingCart,
        presets: ['logistica', 'control']
    },
    {
        id: 'tabla_stock_critico',
        label: 'Alertas de Stock Crítico',
        description: 'Insumos con bajo stock o próximos a vencer',
        category: 'stock',
        icon: AlertTriangle,
        presets: ['planta', 'control']
    }
];

export const PRESETS = {
    planta: {
        label: '🏭 Modo Planta',
        description: 'Enfocado en producción y stock físico',
        color: 'bg-slate-800'
    },
    logistica: {
        label: '🚚 Modo Logística',
        description: 'Pedidos, despachos y producto terminado',
        color: 'bg-blue-700'
    },
    ejecutivo: {
        label: '💼 Modo Ejecutivo',
        description: 'KPIs financieros y resumen gerencial',
        color: 'bg-emerald-700'
    },
    control: {
        label: '🎛️ Modo Control Total',
        description: 'Todos los indicadores clave',
        color: 'bg-orange-600'
    }
};

// Config por defecto si no hay ninguna guardada
export const DEFAULT_DASHBOARD_CONFIG = {
    activePreset: 'control',
    widgets: [
        { id: 'kpi_ordenes', visible: true, order: 0 },
        { id: 'kpi_stock_valor', visible: true, order: 1 },
        { id: 'kpi_deuda_mp', visible: true, order: 2 },
        { id: 'kpi_pedidos', visible: true, order: 3 },
        { id: 'kpi_lotes_pt', visible: false, order: 4 },
        { id: 'kpi_ventas_hoy', visible: false, order: 5 },
        { id: 'kpi_recetas', visible: false, order: 6 },
        { id: 'kpi_clientes', visible: false, order: 7 },
        { id: 'tabla_mermas', visible: true, order: 8 },
        { id: 'tabla_ordenes_activas', visible: true, order: 9 },
        { id: 'tabla_pedidos_pendientes', visible: false, order: 10 },
        { id: 'tabla_stock_critico', visible: false, order: 11 }
    ]
};
