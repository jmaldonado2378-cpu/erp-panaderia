'use client';
import { useGlobalContext } from '../../../components/context/GlobalContext';
import PricingView from '../../../components/views/PricingView';

export default function PreciosPage() {
    const { 
        recipes, 
        ingredients, 
        config, 
        showToast,
        charcRecetas,
        reventaArticulos,
        fraccTareas
    } = useGlobalContext();
    
    return (
        <PricingView
            recipes={recipes || []}
            ingredients={ingredients || []}
            config={config}
            showToast={showToast}
            charcRecetas={charcRecetas || []}
            reventaArticulos={reventaArticulos || []}
            fraccTareas={fraccTareas || []}
        />
    );
}
