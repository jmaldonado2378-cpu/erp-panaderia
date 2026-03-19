'use client';
import { useGlobalContext } from '../../../components/context/GlobalContext';
import ClientAccountsView from '../../../components/views/ClientAccountsView';

export default function ClientAccountsPage() {
    const { clientes, ventas, setVentas, cobrosClientes, setCobrosClientes, showToast } = useGlobalContext();
    return <ClientAccountsView clientes={clientes} ventas={ventas} setVentas={setVentas} cobrosClientes={cobrosClientes} setCobrosClientes={setCobrosClientes} showToast={showToast} />;
}
