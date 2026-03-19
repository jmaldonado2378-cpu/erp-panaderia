'use client';
import { useGlobalContext } from '../../../components/context/GlobalContext';
import PurchasesView from '../../../components/views/PurchasesView';

export default function PurchasesPage() {
    const { providers, ingredients, setIngredients, pagosProveedores, setPagosProveedores, lots, setLots, showToast } = useGlobalContext();
    return <PurchasesView providers={providers} ingredients={ingredients} setIngredients={setIngredients} pagosProveedores={pagosProveedores} setPagosProveedores={setPagosProveedores} lots={lots} setLots={setLots} showToast={showToast} />;
}
