'use client';
import { useGlobalContext } from '../../../components/context/GlobalContext';
import FraccionamientoView from '../../../components/views/FraccionamientoView';

export default function FraccionamientoPage() {
    const context = useGlobalContext();
    return <FraccionamientoView {...context} />;
}
