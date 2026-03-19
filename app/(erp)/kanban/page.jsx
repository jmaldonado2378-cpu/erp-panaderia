'use client';
import { useGlobalContext } from '../../../components/context/GlobalContext';
import KanbanView from '../../../components/views/KanbanView';

export default function KanbanPage() {
    const { orders, recipes, setOrders, qualityLogs, setQualityLogs, lotesPT, setLotesPT, showToast } = useGlobalContext();
    return <KanbanView orders={orders} recipes={recipes} setOrders={setOrders} qualityLogs={qualityLogs} setQualityLogs={setQualityLogs} lotesPT={lotesPT} setLotesPT={setLotesPT} showToast={showToast} />;
}
