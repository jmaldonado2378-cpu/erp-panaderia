"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Package, Plus, Search, AlertCircle, Calendar } from "lucide-react";

// Assuming supabase client is initialized elsewhere, but for simplicity here's a direct usage or env read
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function InventarioPage() {
    const [ingredientes, setIngredientes] = useState<any[]>([]);
    const [lotes, setLotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form states
    const [selectedIngrediente, setSelectedIngrediente] = useState("");
    const [cantidad, setCantidad] = useState("");
    const [fechaVencimiento, setFechaVencimiento] = useState("");
    const [costoUnitario, setCostoUnitario] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: ingData, error: ingError } = await supabase
                .from('dim_ingredientes')
                .select('*')
                .order('nombre');

            if (ingError) throw ingError;
            setIngredientes(ingData || []);

            const { data: lotData, error: lotError } = await supabase
                .from('fact_inventory_lots')
                .select('*, dim_ingredientes:id_ingrediente(nombre, unidad_compra)')
                .order('fecha_vencimiento', { ascending: true });

            if (lotError) throw lotError;
            setLotes(lotData || []);

        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddLot = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data, error } = await supabase
                .from('fact_inventory_lots')
                .insert([{
                    id_ingrediente: selectedIngrediente,
                    cantidad_inicial: parseFloat(cantidad),
                    cantidad_actual: parseFloat(cantidad),
                    fecha_vencimiento: fechaVencimiento,
                    costo_unitario_lote: parseFloat(costoUnitario)
                }])
                .select();

            if (error) throw error;

            // Reset form
            setCantidad("");
            setFechaVencimiento("");
            setCostoUnitario("");
            setSelectedIngrediente("");

            // Refresh data
            fetchData();
            alert("Lote asignado exitosamente");
        } catch (error: any) {
            alert("Error al guardar lote: " + error.message);
        }
    };

    return (
        <div className="p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-orange-500 flex items-center gap-3">
                    <Package className="w-8 h-8" />
                    Gestión de Inventario
                </h1>
                <p className="text-zinc-400 mt-2">Panel Maestro para Lotes y Artículos</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Loader section */}
                <div className="lg:col-span-1 border border-zinc-800 bg-zinc-900 rounded-xl p-6">
                    <h2 className="text-xl font-semibold mb-6 flex items-center justify-between">
                        <span>Ingreso de Mercadería</span>
                        <Plus className="text-orange-500 w-5 h-5" />
                    </h2>

                    <form onSubmit={handleAddLot} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Insumo</label>
                            <select
                                required
                                value={selectedIngrediente}
                                onChange={(e) => setSelectedIngrediente(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-orange-500 outline-none"
                            >
                                <option value="" disabled>Seleccionar ingrediente...</option>
                                {ingredientes.map(i => (
                                    <option key={i.id_ingrediente} value={i.id_ingrediente}>
                                        {i.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Cantidad Inicial (Gramos/Unidades)</label>
                            <input
                                type="number" step="0.01" required
                                value={cantidad}
                                onChange={(e) => setCantidad(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-orange-500 outline-none"
                                placeholder="Ej: 25000"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Costo Total del Lote ($)</label>
                            <input
                                type="number" step="0.01" required
                                value={costoUnitario}
                                onChange={(e) => setCostoUnitario(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-orange-500 outline-none"
                                placeholder="Ej: 15500.50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Fecha de Vencimiento</label>
                            <input
                                type="date" required
                                value={fechaVencimiento}
                                onChange={(e) => setFechaVencimiento(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-orange-500 outline-none"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg transition-colors mt-4"
                        >
                            Registrar Ingreso
                        </button>
                    </form>
                </div>

                {/* Table section */}
                <div className="lg:col-span-2 border border-zinc-800 bg-zinc-900 rounded-xl p-6 overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold">Stock y Lotes Activos (FEFO)</h2>
                    </div>

                    <div className="overflow-x-auto flex-1">
                        {loading ? (
                            <div className="animate-pulse flex space-x-4">
                                <div className="flex-1 space-y-4 py-1">
                                    <div className="h-2 bg-zinc-800 rounded"></div>
                                    <div className="h-2 bg-zinc-800 rounded"></div>
                                    <div className="h-2 bg-zinc-800 rounded"></div>
                                </div>
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm text-zinc-300">
                                <thead className="text-xs uppercase bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                                    <tr>
                                        <th className="px-4 py-3">Insumo</th>
                                        <th className="px-4 py-3">Lote ID</th>
                                        <th className="px-4 py-3 text-right">Cantidad Stock</th>
                                        <th className="px-4 py-3 text-center">Vencimiento</th>
                                        <th className="px-4 py-3 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lotes.map((lote) => {
                                        const isExpiringSoon = new Date(lote.fecha_vencimiento) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
                                        const isExpired = new Date(lote.fecha_vencimiento) < new Date();

                                        return (
                                            <tr key={lote.id_lote} className="border-b border-zinc-800/50 hover:bg-zinc-800/50">
                                                <td className="px-4 py-3 font-medium">
                                                    {lote.dim_ingredientes?.nombre || 'Desconocido'}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                                                    {lote.id_lote.split('-')[0]}...
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono">
                                                    {Number(lote.cantidad_actual).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {new Date(lote.fecha_vencimiento).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 flex justify-center">
                                                    {isExpired ? (
                                                        <span className="bg-red-900/50 text-red-500 px-2 flex items-center gap-1 py-1 rounded-md text-xs font-bold">
                                                            <AlertCircle size={14} /> Vencido
                                                        </span>
                                                    ) : isExpiringSoon ? (
                                                        <span className="bg-orange-900/50 text-orange-500 px-2 flex items-center gap-1 py-1 rounded-md text-xs font-bold">
                                                            <Calendar size={14} /> Próximo
                                                        </span>
                                                    ) : (
                                                        <span className="bg-emerald-900/50 text-emerald-500 px-2 py-1 rounded-md text-xs font-bold">
                                                            OK
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {lotes.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                                                No hay lotes en el inventario
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
