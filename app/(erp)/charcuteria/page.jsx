'use client';
import { useGlobalContext } from '../../../components/context/GlobalContext';
import CharcuteriaView from '../../../components/views/CharcuteriaView';

export default function CharcuteriaPage() {
    const context = useGlobalContext();
    return <CharcuteriaView {...context} />;
}
