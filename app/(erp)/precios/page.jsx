'use client';
import { useGlobalContext } from '../../../components/context/GlobalContext';
import PricingView from '../../../components/views/PricingView';

export default function PreciosPage() {
    const { recipes, ingredients, config, showToast } = useGlobalContext();
    return (
        <PricingView
            recipes={recipes || []}
            ingredients={ingredients || []}
            config={config}
            showToast={showToast}
        />
    );
}
