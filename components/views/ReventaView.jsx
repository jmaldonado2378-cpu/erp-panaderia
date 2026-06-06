'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { 
    Store, Plus, Package, DollarSign, Tag, TrendingUp, 
    Calendar, ClipboardList, CheckCircle2, QrCode, Trash2, ArrowRight
} from 'lucide-react';
import { Card, Button, Input, Select } from '../bakery_erp';

export default function ReventaView({ 
    reventaArticulos, addReventaArticulo,
    reventaLotes, addReventaLote, addStockReventaLote,
    providers, showToast 
}) {
    const [tab, setTab] = useState('articulos'); // articulos, lotes, nuevo_art, nuevo_lot
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);
    const [showAddArt, setShowAddArt] = useState(false);
    const [showAddLot, setShowAddLot] = useState(false);

    // Formulario de artículo
    const [artForm, setArtForm] = useState({
        codigo: '',
        nombre: '',
        categoria: 'Conservas',
        costo_compra: '',
        margen_ganancia_pct: 50
    });

    // Formulario de lote
    const [loteForm, setLoteForm] = useState({
        articulo_id: '',
        codigo_lote: '',
        cantidad_actual: '',
        fecha_vencimiento: ''
    });

    const handleSaveArt = () => {
        if (!artForm.codigo || !artForm.nombre || !artForm.costo_compra) {
            showToast("Complete los campos obligatorios", "error");
            return;
        }

        const cost = Number(artForm.costo_compra);
        const margin = Number(artForm.margen_ganancia_pct);
        const price = cost * (1 + margin / 100);

        const articulo = {
            codigo: artForm.codigo.toUpperCase(),
            nombre: artForm.nombre,
            categoria: artForm.categoria,
            costo_compra: cost,
            margen_ganancia_pct: margin,
            precio_venta: price
        };

        addReventaArticulo(articulo);
        setShowAddArt(false);
        setArtForm({
            codigo: '',
            nombre: '',
            categoria: 'Conservas',
            costo_compra: '',
            margen_ganancia_pct: 50
        });
    };

    const handleSaveLote = () => {
        if (!loteForm.articulo_id || !loteForm.codigo_lote || !loteForm.cantidad_actual || !loteForm.fecha_vencimiento) {
            showToast("Complete los campos del lote", "error");
            return;
        }

        const lote = {
            articulo_id: loteForm.articulo_id,
            codigo_lote: loteForm.codigo_lote.toUpperCase(),
            cantidad_actual: Number(loteForm.cantidad_actual),
            fecha_vencimiento: loteForm.fecha_vencimiento
        };

        addReventaLote(lote);
        setShowAddLot(false);
        setLoteForm({
            articulo_id: '',
            codigo_lote: '',
            cantidad_actual: '',
            fecha_vencimiento: ''
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* TABS */}
            <div className="flex gap-3 border-b border-slate-200 pb-3 print:hidden">
                <button onClick={() => setTab('articulos')} className={`px-5 py-1.5 rounded-md font-black uppercase text-[9px] transition-all ${tab === 'articulos' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                    Catálogo de Reventa ({reventaArticulos.length})
                </button>
                <button onClick={() => setTab('lotes')} className={`px-5 py-1.5 rounded-md font-black uppercase text-[9px] transition-all ${tab === 'lotes' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                    Stock de Lotes ({reventaLotes.length})
                </button>
            </div>

            {/* TAB: CATALOGO / ARTICULOS */}
            {tab === 'articulos' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h4 className="text-base font-black uppercase italic text-slate-800">Catálogo de Artículos Distribuidos</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Línea directa de compra y reventa (Conservas, Quesos, Harinas de origen).</p>
                        </div>
                        <Button onClick={() => setShowAddArt(!showAddArt)} variant={showAddArt ? "secondary" : "accent"}>
                            {showAddArt ? "Cancelar" : <><Plus size={14} /> Registrar Artículo</>}
                        </Button>
                    </div>

                    {showAddArt && (
                        <Card className="p-6 border border-slate-200 bg-white mb-6 shadow-sm">
                            <h4 className="text-xs font-black uppercase mb-4 italic">Alta de Artículo de Reventa</h4>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                                <Input label="SKU / Código" placeholder="ej. REV-BER-01" value={artForm.codigo} onChange={v => setArtForm({ ...artForm, codigo: v })} required />
                                <div className="md:col-span-2">
                                    <Input label="Nombre del Producto" placeholder="ej. Queso Parmesano entero" value={artForm.nombre} onChange={v => setArtForm({ ...artForm, nombre: v })} required />
                                </div>
                                <Select label="Categoría" value={artForm.categoria} onChange={v => setArtForm({ ...artForm, categoria: v })}>
                                    <option value="Conservas">Conservas y Salsas</option>
                                    <option value="Quesos">Quesos y Lácteos</option>
                                    <option value="Harinas origen">Harinas Especiales</option>
                                    <option value="Otros">Otros</option>
                                </Select>
                                <Input label="Costo de Compra ($)" type="number" placeholder="ej. 1500" value={artForm.costo_compra} onChange={v => setArtForm({ ...artForm, costo_compra: v })} required />
                                <Input label="Margen Ganancia (%)" type="number" placeholder="ej. 50" value={artForm.margen_ganancia_pct} onChange={v => setArtForm({ ...artForm, margen_ganancia_pct: v })} required />
                            </div>
                            <div className="flex justify-end mt-4"><Button onClick={handleSaveArt} variant="success" className="py-2 px-6">Guardar</Button></div>
                        </Card>
                    )}

                    <div className="overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm">
                        <table className="w-full text-left font-bold text-xs uppercase text-slate-700">
                            <thead className="bg-slate-900 text-white text-[9px] tracking-widest">
                                <tr>
                                    <th className="px-4 py-3">Código / Nombre</th>
                                    <th className="px-4 py-3 text-center">Categoría</th>
                                    <th className="px-4 py-3 text-right">Costo Compra</th>
                                    <th className="px-4 py-3 text-center">Margen</th>
                                    <th className="px-4 py-3 text-right">Precio Venta (PVP)</th>
                                    <th className="px-4 py-3 text-center">Stock Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {reventaArticulos.map(a => {
                                    const lotes = reventaLotes.filter(l => l.articulo_id === a.id);
                                    const totalStock = lotes.reduce((acc, curr) => acc + Number(curr.cantidad_actual), 0);
                                    
                                    return (
                                        <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="text-slate-800 font-black">{a.nombre}</span>
                                                <span className="block text-[8px] font-mono text-slate-400 mt-0.5">{a.codigo}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-slate-500">{a.categoria}</td>
                                            <td className="px-4 py-3 text-right font-mono text-slate-600">
                                                ${Number(a.costo_compra).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-emerald-600">
                                                +{a.margen_ganancia_pct}%
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-black text-slate-900">
                                                ${Number(a.precio_venta).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono">
                                                <span className={`px-2 py-0.5 rounded text-xs font-black ${
                                                    totalStock === 0 ? 'bg-red-50 text-red-600 border border-red-100' : 
                                                    totalStock < 10 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-50 text-slate-800'
                                                }`}>
                                                    {totalStock} u
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {reventaArticulos.length === 0 && (
                                    <tr><td colSpan="6" className="p-8 text-center text-slate-400 italic">No hay artículos registrados en el catálogo.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: STOCK / LOTES */}
            {tab === 'lotes' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h4 className="text-base font-black uppercase italic text-slate-800">Control de Lotes de Distribución</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestión de inventario por fecha de vencimiento (FEFO) para artículos comprados.</p>
                        </div>
                        <Button onClick={() => setShowAddLot(!showAddLot)} variant={showAddLot ? "secondary" : "accent"}>
                            {showAddLot ? "Cancelar" : <><Plus size={14} /> Registrar Recepción de Lote</>}
                        </Button>
                    </div>

                    {showAddLot && (
                        <Card className="p-6 border border-slate-200 bg-white mb-6 shadow-sm">
                            <h4 className="text-xs font-black uppercase mb-4 italic">Recepción de Insumos / Artículos</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <Select label="Seleccione Artículo" value={loteForm.articulo_id} onChange={v => setLoteForm({ ...loteForm, articulo_id: v })}>
                                    <option value="" disabled>Seleccione artículo...</option>
                                    {reventaArticulos.map(a => (
                                        <option key={a.id} value={a.id}>{a.nombre} ({a.codigo})</option>
                                    ))}
                                </Select>
                                <Input label="Código del Lote del Proveedor" placeholder="ej. LOT-RV-001" value={loteForm.codigo_lote} onChange={v => setLoteForm({ ...loteForm, codigo_lote: v })} required />
                                <Input label="Cantidad de Unidades" type="number" placeholder="ej. 50" value={loteForm.cantidad_actual} onChange={v => setLoteForm({ ...loteForm, cantidad_actual: v })} required />
                                <Input label="Fecha de Vencimiento" type="date" value={loteForm.fecha_vencimiento} onChange={v => setLoteForm({ ...loteForm, fecha_vencimiento: v })} required />
                            </div>
                            <div className="flex justify-end mt-4"><Button onClick={handleSaveLote} variant="success" className="py-2 px-6">Ingresar a Almacén</Button></div>
                        </Card>
                    )}

                    <div className="overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm">
                        <table className="w-full text-left font-bold text-xs uppercase text-slate-700">
                            <thead className="bg-slate-900 text-white text-[9px] tracking-widest">
                                <tr>
                                    <th className="px-4 py-3">Lote Interno / Artículo</th>
                                    <th className="px-4 py-3 text-center">Ingreso</th>
                                    <th className="px-4 py-3 text-center">Vencimiento</th>
                                    <th className="px-4 py-3 text-right">Cantidad Stock</th>
                                    <th className="px-4 py-3 text-center w-36">Ajuste Rápido</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {reventaLotes.map(l => {
                                    const art = reventaArticulos.find(a => a.id === l.articulo_id);
                                    const daysToExpiry = isMounted ? Math.ceil((new Date(l.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
                                    
                                    return (
                                        <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="font-mono font-black text-blue-700">{l.codigo_lote}</span>
                                                <p className="text-[10px] text-slate-800 font-bold mt-0.5">{art?.nombre || 'Artículo'}</p>
                                            </td>
                                            <td className="px-4 py-3 text-center text-slate-500">
                                                {isMounted ? new Date(l.fecha_ingreso || Date.now()).toLocaleDateString('es-AR') : '--'}
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono">
                                                <span className={daysToExpiry < 15 ? 'text-red-600 animate-pulse font-black' : 'text-slate-700'}>
                                                    {isMounted ? new Date(l.fecha_vencimiento).toLocaleDateString('es-AR') : '--'}
                                                </span>
                                                <span className="block text-[8px] text-slate-400 mt-0.5">({daysToExpiry} días restantes)</span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-sm font-black text-slate-900">
                                                {l.cantidad_actual} u
                                            </td>
                                            <td className="px-4 py-3 text-center flex gap-1 justify-center">
                                                <button onClick={() => addStockReventaLote(l.id, 10)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[9px] px-2 py-1 rounded transition-all active:scale-95 border">
                                                    +10 u
                                                </button>
                                                <button onClick={() => addStockReventaLote(l.id, -1)} className="bg-red-50 hover:bg-red-100 text-red-600 font-black text-[9px] px-2 py-1 rounded transition-all active:scale-95 border border-red-200">
                                                    -1 u (Muestra)
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {reventaLotes.length === 0 && (
                                    <tr><td colSpan="5" className="p-8 text-center text-slate-400 italic">No hay lotes ingresados en stock.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
