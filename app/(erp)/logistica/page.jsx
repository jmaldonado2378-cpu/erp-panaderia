'use client';
import { useGlobalContext } from '../../../components/context/GlobalContext';
import LogisticsView from '../../../components/views/LogisticsView';

export default function LogisticsPage() {
    const { 
        recipes, charcRecetas, reventaArticulos,
        pedidos, setPedidos, 
        lotesPT, setLotesPT, 
        charcLotes, setCharcLotes,
        reventaLotes, setReventaLotes,
        clientes, 
        ventas, setVentas, 
        showToast, addPedidoConsolidado
    } = useGlobalContext();
    
    return (
        <LogisticsView 
            recipes={recipes} 
            charcRecetas={charcRecetas}
            reventaArticulos={reventaArticulos}
            pedidos={pedidos} 
            setPedidos={setPedidos} 
            lotesPT={lotesPT} 
            setLotesPT={setLotesPT} 
            charcLotes={charcLotes}
            setCharcLotes={setCharcLotes}
            reventaLotes={reventaLotes}
            setReventaLotes={setReventaLotes}
            clientes={clientes} 
            ventas={ventas} 
            setVentas={setVentas} 
            showToast={showToast} 
            addPedidoConsolidado={addPedidoConsolidado}
        />
    );
}
