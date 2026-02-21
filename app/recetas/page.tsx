"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ChefHat, Plus, Save, Trash2, AlertTriangle } from "lucide-react";

// Supabase client initialization
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function RecetasPage() {
    const [ingredientes, setIngredientes] = useState<any[]>([]);
    const [recetas, setRecetas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // New Recipe State
    const [nombreProducto, setNombreProducto] = useState("");
    const [factorMerma, setFactorMerma] = useState("15"); // default 15%
    const [detalles, setDetalles] = useState<{ id_ingrediente: string; porcentaje: string; isBase: boolean; cantidad: string }[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: ingData } = await supabase.from('dim_ingredientes').select('*').order('nombre');
            if (ingData) setIngredientes(ingData);

            const { data: recData } = await supabase.from('fact_bom_header').select('*, fact_bom_details(*)').order('nombre_producto');
            if (recData) setRecetas(recData);
        } catch (error) {
            console.error('Error fetching recipes:', error);
        } finally {
            setLoading(false);
        }
    };

    const addDetalle = () => {
        setDetalles([...detalles, { id_ingrediente: "", porcentaje: "100", isBase: detalles.length === 0, cantidad: "1000" }]);
    };

    const updateDetalle = (index: number, field: string, value: any) => {
        const newDetalles = [...detalles];
        newDetalles[index] = { ...newDetalles[index], [field]: value };
        setDetalles(newDetalles);
    };

    const removeDetalle = (index: number) => {
        setDetalles(detalles.filter((_, i) => i !== index));
    };

    const handleSaveRecipe = async (e: React.FormEvent) => {
        e.preventDefault();

        // VALIDATION: EXACTLY ONE 100% INGREDIENT
        const baseIngredients = detalles.filter(d => parseFloat(d.porcentaje) === 100);
        if (baseIngredients.length === 0) {
            alert("⚠️ LEY PANADERA: Debe haber al menos un ingrediente con 'Porcentaje Panadero' exactamente igual al 100% (La Base / Harina).");
            return;
        }

        if (!nombreProducto || detalles.length === 0) {
            alert("Falta el nombre de la receta o los ingredientes.");
            return;
        }

        try {
            // Calculate Total Weight Raw (peso_masa_cruda)
            const sumGramos = detalles.reduce((acc, current) => acc + parseFloat(current.cantidad || "0"), 0);
            const factorDesc = parseFloat(factorMerma) / 100;
            const pesoFinal = sumGramos * (1 - factorDesc);

            // Insert Header
            const { data: headerData, error: headerError } = await supabase
                .from('fact_bom_header')
                .insert([{
                    nombre_producto: nombreProducto,
                    peso_masa_cruda: sumGramos,
                    factor_merma_coccion: factorMerma,
                    peso_final_venta: pesoFinal,
                    version: 1
                }])
                .select()
                .single();

            if (headerError) throw headerError;

            // Insert Details
            const detallesToInsert = detalles.map(d => ({
                id_receta: headerData.id_receta,
                id_ingrediente: d.id_ingrediente,
                porcentaje_panadero: parseFloat(d.porcentaje),
                cantidad_teorica_gr: parseFloat(d.cantidad)
            }));

            const { error: detailsError } = await supabase
                .from('fact_bom_details')
                .insert(detallesToInsert);

            if (detailsError) throw detailsError;

            alert("Ficha técnica (BOM) guardada con éxito.");

            // Reset Form
            setNombreProducto("");
            setFactorMerma("15");
            setDetalles([]);
            fetchData();

        } catch (error: any) {
            console.error(error);
            alert("Error al guardar la receta: " + error.message);
        }
    };

    return (
        <div className="p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-orange-500 flex items-center gap-3">
                    <ChefHat className="w-8 h-8" />
                    Fichas Técnicas (BOM)
                </h1>
                <p className="text-zinc-400 mt-2">Crea y administra recetas (Escandallo) con regla estricta de Porcentaje Panadero.</p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* CREATE RECIPE FORM */}
                <div className="border border-zinc-800 bg-zinc-900 rounded-xl p-6">
                    <h2 className="text-xl font-semibold mb-6 text-white">Nueva Ficha Técnica</h2>

                    <form onSubmit={handleSaveRecipe}>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre del Producto (Venta)</label>
                                <input
                                    type="text" required
                                    value={nombreProducto}
                                    onChange={(e) => setNombreProducto(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-orange-500 outline-none"
                                    placeholder="Ej: Pan de Campo 500g"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Merma de Cocción (%)</label>
                                <input
                                    type="number" step="0.1" required
                                    value={factorMerma}
                                    onChange={(e) => setFactorMerma(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-orange-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-2">
                            <h3 className="text-lg font-medium text-orange-400">Escandallo</h3>
                            <button
                                type="button"
                                onClick={addDetalle}
                                className="flex items-center gap-1 text-sm bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded transition-colors"
                            >
                                <Plus size={16} /> Agregar Insumo
                            </button>
                        </div>

                        <div className="space-y-3 mb-6">
                            {detalles.map((detalle, index) => (
                                <div key={index} className="flex gap-3 items-end bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
                                    <div className="flex-1">
                                        <label className="block text-xs text-zinc-500 mb-1">Ingrediente</label>
                                        <select
                                            required
                                            value={detalle.id_ingrediente}
                                            onChange={(e) => updateDetalle(index, 'id_ingrediente', e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-white focus:border-orange-500 outline-none"
                                        >
                                            <option value="" disabled>Seleccionar...</option>
                                            {ingredientes.map(i => (
                                                <option key={i.id_ingrediente} value={i.id_ingrediente}>
                                                    {i.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-24">
                                        <label className="block text-xs text-zinc-500 mb-1">% Panadero</label>
                                        <input
                                            type="number" step="0.01" required
                                            value={detalle.porcentaje}
                                            onChange={(e) => updateDetalle(index, 'porcentaje', e.target.value)}
                                            className={`w-full bg-zinc-900 border rounded p-2 text-sm text-white focus:outline-none ${detalle.porcentaje === "100" ? 'border-emerald-500 text-emerald-400 font-bold' : 'border-zinc-800'}`}
                                        />
                                    </div>
                                    <div className="w-32">
                                        <label className="block text-xs text-zinc-500 mb-1">Gramos (Teórico)</label>
                                        <input
                                            type="number" step="0.1" required
                                            value={detalle.cantidad}
                                            onChange={(e) => updateDetalle(index, 'cantidad', e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-white focus:border-orange-500 outline-none"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeDetalle(index)}
                                        className="h-[38px] px-3 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            {detalles.length === 0 && (
                                <p className="text-zinc-500 text-sm text-center py-4 italic">No hay insumos. Agrega uno para empezar.</p>
                            )}
                        </div>

                        {detalles.length > 0 && !detalles.some(d => parseFloat(d.porcentaje) === 100) && (
                            <div className="bg-orange-950/30 border border-orange-900/50 text-orange-400 p-3 rounded-lg flex gap-3 text-sm mb-6 items-start">
                                <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                                <p>Guardrail: Falta base 100%. Debes asignar 100% de porcentaje panadero a la harina o insumo principal para poder guardar.</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={detalles.length === 0 || !detalles.some(d => parseFloat(d.porcentaje) === 100)}
                            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Save size={20} /> Guardar Ficha Técnica
                        </button>
                    </form>
                </div>

                {/* RECIPES LIST */}
                <div className="border border-zinc-800 bg-zinc-900 rounded-xl p-6">
                    <h2 className="text-xl font-semibold mb-6 text-white">Recetas Activas</h2>
                    {loading ? (
                        <div className="animate-pulse space-y-4">
                            <div className="h-20 bg-zinc-800 rounded-lg"></div>
                            <div className="h-20 bg-zinc-800 rounded-lg"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {recetas.map(receta => (
                                <div key={receta.id_receta} className="border border-zinc-800/80 bg-zinc-950 p-4 rounded-lg hover:border-zinc-700 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-lg text-orange-400">{receta.nombre_producto}</h3>
                                            <p className="text-xs text-zinc-500 font-mono">v{receta.version} | ID: {receta.id_receta.split('-')[0]}...</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium">{Number(receta.peso_final_venta).toFixed(1)}g (Final)</div>
                                            <div className="text-xs text-red-400">-{Number(receta.factor_merma_coccion)}% Merma</div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-zinc-800">
                                        <p className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Composición:</p>
                                        <ul className="text-sm space-y-1">
                                            {receta.fact_bom_details?.map((det: any) => {
                                                const ing = ingredientes.find(i => i.id_ingrediente === det.id_ingrediente);
                                                return (
                                                    <li key={det.id_detalle} className="flex justify-between items-center text-zinc-300">
                                                        <span>{ing?.nombre || 'Desconocido'}</span>
                                                        <div className="flex gap-4 items-center">
                                                            <span className="text-xs text-zinc-500 w-16 text-right">{Number(det.porcentaje_panadero)}%</span>
                                                            <span className="font-mono w-20 text-right">{Number(det.cantidad_teorica_gr)}g</span>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                            {recetas.length === 0 && (
                                <p className="text-zinc-500 text-center py-8">Aún no hay recetas creadas.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
