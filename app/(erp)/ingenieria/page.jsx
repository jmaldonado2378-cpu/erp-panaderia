'use client';
import { useGlobalContext } from '../../../components/context/GlobalContext';
import EngineeringView from '../../../components/views/EngineeringView';

export default function EngineeringPage() {
    const context = useGlobalContext();
    return <EngineeringView {...context} />;
}
