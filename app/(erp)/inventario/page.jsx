'use client';
import { useGlobalContext } from '../../../components/context/GlobalContext';
import InventoryView from '../../../components/views/InventoryView';

export default function InventoryPage() {
    const { ingredients, lots, providers, setLots, showToast, inventoryLogs, setInventoryLogs } = useGlobalContext();
    return <InventoryView ingredients={ingredients} lots={lots} providers={providers} setLots={setLots} showToast={showToast} inventoryLogs={inventoryLogs} setInventoryLogs={setInventoryLogs} />;
}
