'use client';
import { useGlobalContext } from '../../../components/context/GlobalContext';
import DashboardView from '../../../components/views/DashboardView';

export default function DashboardPage() {
    const {
        recipes, ingredients, lots, orders, logistics, qualityLogs,
        config, lotesPT, pedidos, clientes, ventas, providers,
        pagosProveedores, dashboardConfig, setDashboardConfig
    } = useGlobalContext();

    return (
        <DashboardView
            recipes={recipes || []}
            ingredients={ingredients || []}
            lots={lots || []}
            orders={orders || []}
            logistics={logistics || []}
            qualityLogs={qualityLogs || []}
            config={config}
            lotesPT={lotesPT || []}
            pedidos={pedidos || []}
            clientes={clientes || []}
            ventas={ventas || []}
            providers={providers || []}
            pagosProveedores={pagosProveedores || []}
            dashboardConfig={dashboardConfig}
            setDashboardConfig={setDashboardConfig}
        />
    );
}
