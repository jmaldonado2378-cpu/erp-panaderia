'use client';
import { useGlobalContext } from '../../../components/context/GlobalContext';
import ProductionOrdersView from '../../../components/views/ProductionOrdersView';

export default function OrdersPage() {
    const { recipes, ingredients, lots, orders, setOrders, showToast } = useGlobalContext();
    return <ProductionOrdersView recipes={recipes} ingredients={ingredients} lots={lots} orders={orders} setOrders={setOrders} showToast={showToast} />;
}
