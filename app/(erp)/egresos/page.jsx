'use client';
import { useGlobalContext } from '../../../components/context/GlobalContext';
import ExpensesView from '../../../components/views/ExpensesView';

export default function ExpensesPage() {
    const { 
        expenses, addExpense, 
        providers, pagosProveedores, setPagosProveedores,
        ventas, showToast 
    } = useGlobalContext();

    return (
        <ExpensesView 
            expenses={expenses}
            addExpense={addExpense}
            providers={providers}
            pagosProveedores={pagosProveedores}
            setPagosProveedores={setPagosProveedores}
            ventas={ventas}
            showToast={showToast}
        />
    );
}
