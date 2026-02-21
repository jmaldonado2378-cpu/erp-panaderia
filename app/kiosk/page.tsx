
import Link from 'next/link';
import { ClipboardList, Package } from 'lucide-react';

export default function KioskDashboard() {
    return (
        <div className="p-8 bg-zinc-950 min-h-screen text-zinc-50 font-sans">
            <header className="mb-8 border-b border-zinc-800 pb-4">
                <h1 className="text-4xl font-bold text-orange-500">TERMINAL DE PLANTA</h1>
                <p className="text-zinc-400">Sistema MES - Panadería Artesanal</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Link href="/kiosk/orders/new" className="block">
                    <div className="group hover:bg-zinc-900 transition-colors cursor-pointer border border-zinc-800 bg-zinc-900/50 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <ClipboardList className="w-8 h-8 text-orange-400" />
                            <h2 className="text-2xl font-semibold text-orange-400">Nueva Orden</h2>
                        </div>
                        <p className="text-zinc-400">Crear una orden de producción y asignar lotes (FEFO).</p>
                    </div>
                </Link>

                {/* Placeholder for scanning */}
                <div className="opacity-50 pointer-events-none border border-zinc-800 bg-zinc-900/50 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Package className="w-8 h-8 text-zinc-500" />
                        <h2 className="text-2xl font-semibold text-zinc-500">Escanear QR</h2>
                    </div>
                    <p className="text-zinc-500">Simulación de cámara para inicio de amasado.</p>
                </div>
            </div>
        </div>
    );
}
