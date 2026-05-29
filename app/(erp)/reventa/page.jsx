'use client';
import { useGlobalContext } from '../../../components/context/GlobalContext';
import ReventaView from '../../../components/views/ReventaView';

export default function ReventaPage() {
    const context = useGlobalContext();
    return <ReventaView {...context} />;
}
