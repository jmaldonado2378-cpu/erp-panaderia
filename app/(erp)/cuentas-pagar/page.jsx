'use client';
import { useGlobalContext } from '../../../components/context/GlobalContext';
import SupplierAccountsView from '../../../components/views/SupplierAccountsView';

export default function SupplierAccountsPage() {
    const { providers, purchases, pagosProveedores, setPagosProveedores, showToast } = useGlobalContext();
    return <SupplierAccountsView providers={providers} purchases={purchases} pagosProveedores={pagosProveedores} setPagosProveedores={setPagosProveedores} showToast={showToast} />;
}
