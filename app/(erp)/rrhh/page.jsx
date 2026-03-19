'use client';
import { useGlobalContext } from '../../../components/context/GlobalContext';
import RRHHView from '../../../components/views/RRHHView';

export default function RRHHPage() {
    const { operatives, setOperatives, config, showToast } = useGlobalContext();
    return <RRHHView operatives={operatives} setOperatives={setOperatives} config={config} showToast={showToast} />;
}
