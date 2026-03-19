'use client';
import { useGlobalContext } from '../../../components/context/GlobalContext';
import LogisticsView from '../../../components/views/LogisticsView';

export default function LogisticsPage() {
    const { 
        recipes, 
        pedidos, setPedidos, 
        lotesPT, setLotesPT, 
        clientes, 
        ventas, setVentas, 
        showToast 
    } = useGlobalContext();
    
    return (
        <LogisticsView 
            recipes={recipes} 
            pedidos={pedidos} 
            setPedidos={setPedidos} 
            lotesPT={lotesPT} 
            setLotesPT={setLotesPT} 
            clientes={clientes} 
            ventas={ventas} 
            setVentas={setVentas} 
            showToast={showToast} 
        />
    );
}
