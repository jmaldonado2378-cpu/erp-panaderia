'use client';
import { useGlobalContext } from '../../../components/context/GlobalContext';
import MasterDataView from '../../../components/views/MasterDataView';

export default function MasterDataPage() {
    const { ingredients, setIngredients, providers, setProviders, clientes, setClientes, showToast } = useGlobalContext();
    return <MasterDataView ingredients={ingredients} setIngredients={setIngredients} providers={providers} setProviders={setProviders} clientes={clientes} setClientes={setClientes} showToast={showToast} />;
}
