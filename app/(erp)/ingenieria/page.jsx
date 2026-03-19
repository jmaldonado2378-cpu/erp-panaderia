'use client';
import { useGlobalContext } from '../../../components/context/GlobalContext';
import EngineeringView from '../../../components/views/EngineeringView';

export default function EngineeringPage() {
    const { recipes, ingredients, setRecipes, setIngredients, showToast, config } = useGlobalContext();
    return <EngineeringView recipes={recipes} ingredients={ingredients} setRecipes={setRecipes} setIngredients={setIngredients} showToast={showToast} config={config} />;
}
