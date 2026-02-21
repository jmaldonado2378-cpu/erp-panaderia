
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { ArrowLeft, Play, AlertTriangle, CheckCircle } from 'lucide-react';

export default function NewOrderPage() {
    const [loading, setLoading] = useState(false);
    const [recipes, setRecipes] = useState<any[]>([]);
    const [selectedRecipe, setSelectedRecipe] = useState('');
    const [quantity, setQuantity] = useState(10);
    const [orderResult, setOrderResult] = useState<any>(null);
    const [allocationResult, setAllocationResult] = useState<any>(null);

    useEffect(() => {
        // Fetch recipes
        async function loadRecipes() {
            const { data } = await supabase.from('fact_bom_header').select('*');
            if (data) setRecipes(data);
        }
        loadRecipes();
    }, []);

    const handleCreateOrder = async () => {
        if (!selectedRecipe) return;
        setLoading(true);
        setAllocationResult(null);

        // 1. Create Order
        const { data: orderData, error: orderError } = await supabase
            .from('fact_production_orders')
            .insert({
                id_receta: selectedRecipe,
                cantidad_programada: quantity,
                estado: 'PLANEADA'
            })
            .select()
            .single();

        if (orderError) {
            alert('Error creating order: ' + orderError.message);
            setLoading(false);
            return;
        }

        setOrderResult(orderData);

        // 2. Trigger FEFO Allocation (Client-Side Logic simulation or RPC call)
        // We need to know WHICH ingredient to allocate. For the test, we assume we want to allocate "Levadura".
        // We should fetch ingredients for this recipe, but for the TEST we can hardcode looking for 'Levadura'.

        // Fetch Levadura ID
        const { data: ingData } = await supabase.from('dim_ingredientes').select('id_ingrediente').eq('nombre', 'Levadura Fresca').single();

        if (ingData) {
            // Call RPC
            // Let's say we need 500g per unit. So quantity * 500.
            const amountNeeded = quantity * 500;

            const { data: rpcData, error: rpcError } = await supabase.rpc('allocate_stock_fefo', {
                p_id_orden: orderData.id_orden,
                p_id_ingrediente: ingData.id_ingrediente,
                p_cantidad_necesaria: amountNeeded
            });

            if (rpcError) {
                console.error(rpcError);
                alert('Error in FEFO: ' + rpcError.message);
            } else {
                setAllocationResult(rpcData);
            }
        }

        setLoading(false);
    };

    return (
        <div className="p-8 bg-zinc-950 min-h-screen text-zinc-50 font-sans">
            <Link href="/kiosk" className="flex items-center text-zinc-400 hover:text-orange-500 mb-6">
                <ArrowLeft className="w-5 h-5 mr-2" /> Volver al Kiosco
            </Link>

            <h1 className="text-3xl font-bold text-orange-500 mb-8">Nueva Orden de Producción (Test FEFO)</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Form */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                    <div className="mb-4">
                        <label className="block text-zinc-400 mb-2">Receta</label>
                        <select
                            className="w-full bg-zinc-950 border border-zinc-700 rounded p-3 text-zinc-200"
                            value={selectedRecipe}
                            onChange={(e) => setSelectedRecipe(e.target.value)}
                        >
                            <option value="">Seleccionar Receta...</option>
                            {recipes.map(r => (
                                <option key={r.id_receta} value={r.id_receta}>
                                    {r.nombre_producto} (Ver: {r.version})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-6">
                        <label className="block text-zinc-400 mb-2">Cantidad a Producir</label>
                        <input
                            type="number"
                            className="w-full bg-zinc-950 border border-zinc-700 rounded p-3 text-zinc-200"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                        />
                    </div>

                    <button
                        onClick={handleCreateOrder}
                        disabled={loading || !selectedRecipe}
                        className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                        {loading ? 'Procesando...' : (
                            <>
                                <Play className="w-5 h-5" /> EJECUTAR FEFO
                            </>
                        )}
                    </button>
                </div>

                {/* Results */}
                <div className="space-y-6">
                    {orderResult && (
                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                            <h3 className="text-xl font-bold text-green-500 mb-2 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5" /> Orden Creada
                            </h3>
                            <p className="text-zinc-400">ID: {orderResult.id_orden}</p>
                            <p className="text-zinc-400">Estado: {orderResult.estado}</p>
                        </div>
                    )}

                    {allocationResult && (
                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                            <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                                Resultados FEFO
                            </h3>

                            {allocationResult.status === 'SUCCESS' ? (
                                <div className="bg-green-900/20 border border-green-800 p-4 rounded text-green-400 mb-4">
                                    Asignación Exitosa. Stock reservado correctamente.
                                </div>
                            ) : (
                                <div className="bg-red-900/20 border border-red-800 p-4 rounded text-red-400 mb-4 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" />
                                    {allocationResult.status}: Falta {allocationResult.missing_amount}g
                                </div>
                            )}

                            <h4 className="font-semibold text-zinc-300 mb-2">Lotes Asignados:</h4>
                            <ul className="space-y-2">
                                {allocationResult.allocations.map((alloc: any, idx: number) => (
                                    <li key={idx} className="bg-zinc-950 p-3 rounded border border-zinc-800 flex justify-between">
                                        <div>
                                            <span className="block text-orange-400 font-bold">{alloc.nro_lote}</span>
                                            <span className="text-xs text-zinc-500">{alloc.id_lote}</span>
                                        </div>
                                        <span className="text-xl font-mono text-zinc-200">{alloc.cantidad} g</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
