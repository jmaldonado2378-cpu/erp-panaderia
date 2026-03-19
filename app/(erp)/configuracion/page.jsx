'use client';
import { useGlobalContext } from '../../../components/context/GlobalContext';
import SettingsView from '../../../components/views/SettingsView';

export default function SettingsPage() {
    const { config, setConfig, showToast, dashboardConfig, setDashboardConfig } = useGlobalContext();
    return (
        <SettingsView
            config={config}
            setConfig={setConfig}
            showToast={showToast}
            dashboardConfig={dashboardConfig}
            setDashboardConfig={setDashboardConfig}
        />
    );
}
