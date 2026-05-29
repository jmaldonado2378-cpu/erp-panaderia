'use client';
import React, { useState, useMemo } from 'react';
import { 
    Search, RotateCcw, Printer, Layers, Calendar, XCircle, 
    DollarSign, AlertTriangle, Trash2, ChevronDown, ChevronRight, 
    Tag, Package, Award, QrCode 
} from 'lucide-react';
import { Card, Button, Input } from '../bakery_erp';
import { supabase } from '../../lib/supabase';

// Unifica la misma función de formato que PurchasesView
const fmtCantidad = (cantidad, unidad_base = 'g') => {
    const n = Number(cantidad);
    if (unidad_base === 'g') return n >= 1000 ? `${(n / 1000).toLocaleString('es-AR', { maximumFractionDigits: 2 })} Kg` : `${n.toLocaleString('es-AR')} g`;
    if (unidad_base === 'ml') return n >= 1000 ? `${(n / 1000).toLocaleString('es-AR', { maximumFractionDigits: 2 })} L` : `${n.toLocaleString('es-AR')} ml`;
    return `${n.toLocaleString('es-AR')} ${unidad_base}`;
};

export default function InventoryView({ 
    ingredients, lots, providers, setLots, showToast, inventoryLogs, setInventoryLogs,
    lotesPT = [], recipes = [], charcLotes = [], charcRecetas = [], reventaLotes = [], reventaArticulos = []
}) {
    const [activeTab, setActiveTab] = useState('insumos'); // 'insumos', 'productos'
    const [searchTerm, setSearchTerm] = useState('');
    const [providerFilter, setProviderFilter] = useState('');
    const [adjustModal, setAdjustModal] = useState(null);
    const [deleteModal, setDeleteModal] = useState(null);
    const [newStock, setNewStock] = useState('');
    const [showLogs, setShowLogs] = useState(false);
    const [expandedRows, setExpandedRows] = useState({});
    const [expandedPTRows, setExpandedPTRows] = useState({});
    const [printedLabel, setPrintedLabel] = useState(null);

    // ── CONFIGURACIÓN DE COSTO HORA HOMBRE ──
    const COSTO_HORA_HOMBRE = 4500;
    const CIF_PCT = 0.20;

    // ── CALCULO RECURSIVO DE COSTOS (MULTI-BOM) ──
    const getIngredientCost = React.useCallback((ing, visited = new Set()) => {
        if (!ing) return 0;
        if (visited.has(ing.id)) return 0; // Evitar referencias circulares

        if (!ing.es_subensamble) {
            return Number(ing.costo_estandar || 0);
        }

        // Buscar receta del WIP por código o nombre
        const recipe = recipes.find(r => r.codigo === ing.codigo || r.nombre_producto === ing.name?.replace('[WIP] ', ''));
        if (!recipe) return Number(ing.costo_estandar || 0);

        const visitedNext = new Set(visited);
        visitedNext.add(ing.id);

        let kgLoteFinal;
        if (recipe.formato_venta === 'Unidad') {
            kgLoteFinal = (Number(recipe.lote_minimo || 1) * Number(recipe.peso_unidad || 0)) / 1000;
        } else {
            kgLoteFinal = Number(recipe.lote_minimo || 1);
        }
        const mermaFactor = 1 - Number(recipe.merma || 0) / 100;
        const kgLoteBruto = mermaFactor > 0 ? kgLoteFinal / mermaFactor : kgLoteFinal;

        const details = recipe.details || [];
        let gramosMap;
        if (recipe.logica_formula === 'batch') {
            gramosMap = details.map(d => Number(d.gramos || 0));
        } else {
            const sumPct = details.reduce((acc, d) => acc + Number(d.porcentaje || 0), 0);
            const masaBruta = kgLoteBruto * 1000;
            const baseHarina = sumPct > 0 ? masaBruta / (sumPct / 100) : 0;
            gramosMap = details.map(d => Number(d.porcentaje || 0) > 0
                ? Math.round((Number(d.porcentaje) / 100) * baseHarina) : 0);
        }

        const costo_mp = details.reduce((acc, d, i) => {
            const detailIng = ingredients.find(x => x.id === d.ingredientId);
            const costPerGram = getIngredientCost(detailIng, visitedNext);
            return acc + (gramosMap[i] * costPerGram);
        }, 0);

        const costo_mo = (Number(recipe.horas_hombre) || 0) * COSTO_HORA_HOMBRE;
        const costo_cif = costo_mp * CIF_PCT;
        const costo_total = costo_mp + costo_mo + costo_cif;

        const pesoFinalG = Number(recipe.peso_final) || 1;
        return costo_total / pesoFinalG;
    }, [recipes, ingredients]);

    const getRecipeUnitCost = React.useCallback((recipe) => {
        let kgLoteFinal;
        if (recipe.formato_venta === 'Unidad') {
            kgLoteFinal = (Number(recipe.lote_minimo || 1) * Number(recipe.peso_unidad || 0)) / 1000;
        } else {
            kgLoteFinal = Number(recipe.lote_minimo || 1);
        }
        const mermaFactor = 1 - Number(recipe.merma || 0) / 100;
        const kgLoteBruto = mermaFactor > 0 ? kgLoteFinal / mermaFactor : kgLoteFinal;

        const details = recipe.details || [];
        let gramosMap;
        if (recipe.logica_formula === 'batch') {
            gramosMap = details.map(d => Number(d.gramos || 0));
        } else {
            const sumPct = details.reduce((acc, d) => acc + Number(d.porcentaje || 0), 0);
            const masaBruta = kgLoteBruto * 1000;
            const baseHarina = sumPct > 0 ? masaBruta / (sumPct / 100) : 0;
            gramosMap = details.map(d => Number(d.porcentaje || 0) > 0
                ? Math.round((Number(d.porcentaje) / 100) * baseHarina) : 0);
        }

        const costo_mp = details.reduce((acc, d, i) => {
            const ing = ingredients.find(x => x.id === d.ingredientId);
            return acc + (gramosMap[i] * getIngredientCost(ing));
        }, 0);

        const costo_mo = (Number(recipe.horas_hombre) || 0) * COSTO_HORA_HOMBRE;
        const costo_cif = costo_mp * CIF_PCT;
        const costo_total = costo_mp + costo_mo + costo_cif;

        const unidades_rinde = recipe.formato_venta === 'Unidad'
            ? Number(recipe.lote_minimo || 1)
            : kgLoteFinal;

        return costo_total / (unidades_rinde || 1);
    }, [ingredients, getIngredientCost]);


    // ── PROCESAMIENTO DE STOCK DE INSUMOS ──
    const detailedLots = lots.filter(l => l.amount > 0).map(lot => {
        const ing = ingredients.find(i => i.id === lot.ingredientId);
        const prov = providers.find(p => p.id === lot.providerId);
        return {
            ...lot,
            ingredientName: ing?.name || 'Desconocido',
            unidad_base: ing?.unidad_base || lot.unidad || 'g',
            es_subensamble: ing?.es_subensamble || false,
            providerName: lot.providerId === 'interno' ? 'Producción Interna' : (prov?.nombre || 'S/D'),
            valorLote: Number(lot.amount) * Number(lot.unitPrice || 0)
        };
    }).sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

    const groupedLots = Object.values(detailedLots.reduce((acc, lot) => {
        if (!acc[lot.ingredientId]) {
            acc[lot.ingredientId] = {
                ingredientId: lot.ingredientId,
                ingredientName: lot.ingredientName,
                unidad_base: lot.unidad_base,
                es_subensamble: lot.es_subensamble,
                totalAmount: 0,
                totalValue: 0,
                lots: []
            };
        }
        acc[lot.ingredientId].totalAmount += Number(lot.amount);
        acc[lot.ingredientId].totalValue += lot.valorLote;
        acc[lot.ingredientId].lots.push(lot);
        return acc;
    }, {})).filter(group => {
        const term = searchTerm.toLowerCase();
        const matchSearch = group.ingredientName.toLowerCase().includes(term) ||
            group.lots.some(l => (l.codigo_lote || '').toLowerCase().includes(term) ||
                l.providerName.toLowerCase().includes(term));
        const matchProvider = providerFilter === '' || group.lots.some(l => l.providerId === providerFilter);
        return matchSearch && matchProvider;
    }).sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));

    const valorTotalInsumos = groupedLots.reduce((acc, g) => acc + g.totalValue, 0);


    // ── PROCESAMIENTO DE PRODUCTOS TERMINADOS (UNIFICADO) ──
    const detailedPT = useMemo(() => {
        const list = [];

        // 1. Panificados (lotesPT)
        lotesPT.filter(l => Number(l.cantidadActual || l.cantidad_actual || 0) > 0).forEach(l => {
            const rec = recipes.find(r => r.id === l.recipeId || r.id === l.receta_id);
            if (!rec) return;
            const qty = Number(l.cantidadActual || l.cantidad_actual);
            const unitCost = getRecipeUnitCost(rec);
            list.push({
                id: l.id,
                tipo: 'Panadería',
                productoId: rec.id,
                productoNombre: rec.nombre_producto,
                codigo: rec.codigo,
                codigoLote: l.codigo_lote || l.id.slice(0, 8).toUpperCase(),
                cantidad: qty,
                unidad: rec.formato_venta === 'Kg' ? 'Kg' : 'U',
                vencimiento: l.vencimiento || l.fecha_vencimiento,
                costoUnitario: unitCost,
                valorTotal: qty * unitCost
            });
        });

        // 2. Charcutería (Solo lotes en estado CURADO_LISTO)
        charcLotes.filter(l => l.estado === 'CURADO_LISTO' && Number(l.peso_actual_g || 0) > 0).forEach(l => {
            const rec = charcRecetas.find(r => r.id === l.receta_id);
            if (!rec) return;
            const qtyKg = Number(l.peso_actual_g) / 1000;
            
            // Calcular costo de materias primas de la receta por gramo crudo
            const totalIngG = rec.details?.reduce((acc, d) => {
                const ing = ingredients.find(i => i.id === d.ingredientId);
                if (ing && ing.tipo === 'insumo') return acc + Number(d.gramos || 0);
                return acc;
            }, 0) || 1;
            const costIngredients = rec.details?.reduce((acc, d) => {
                const ing = ingredients.find(i => i.id === d.ingredientId);
                return acc + (Number(d.gramos || 0) * getIngredientCost(ing));
            }, 0) || 0;
            
            const costPerGram = costIngredients / totalIngG;
            const unitCostKg = costPerGram * 1000; // costo por Kilo
            
            list.push({
                id: l.id,
                tipo: 'Charcutería',
                productoId: rec.id,
                productoNombre: rec.nombre,
                codigo: rec.codigo,
                codigoLote: l.codigo_lote,
                cantidad: qtyKg,
                unidad: 'Kg',
                vencimiento: l.fecha_vencimiento,
                costoUnitario: unitCostKg,
                valorTotal: qtyKg * unitCostKg
            });
        });

        // 3. Reventa
        reventaLotes.filter(l => Number(l.cantidad_actual || 0) > 0).forEach(l => {
            const art = reventaArticulos.find(a => a.id === l.articulo_id);
            if (!art) return;
            const qty = Number(l.cantidad_actual);
            const unitCost = Number(art.costo_compra || 0);
            list.push({
                id: l.id,
                tipo: 'Reventa',
                productoId: art.id,
                productoNombre: art.nombre,
                codigo: art.codigo,
                codigoLote: l.codigo_lote,
                cantidad: qty,
                unidad: 'U',
                vencimiento: l.fecha_vencimiento,
                costoUnitario: unitCost,
                valorTotal: qty * unitCost
            });
        });

        return list.sort((a, b) => new Date(a.vencimiento) - new Date(b.vencimiento));
    }, [lotesPT, recipes, charcLotes, charcRecetas, reventaLotes, reventaArticulos, ingredients, getRecipeUnitCost, getIngredientCost]);

    const groupedPT = useMemo(() => {
        return Object.values(detailedPT.reduce((acc, pt) => {
            if (!acc[pt.productoId]) {
                acc[pt.productoId] = {
                    productoId: pt.productoId,
                    productoNombre: pt.productoNombre,
                    codigo: pt.codigo,
                    tipo: pt.tipo,
                    unidad: pt.unidad,
                    totalCantidad: 0,
                    totalValue: 0,
                    lots: []
                };
            }
            acc[pt.productoId].totalCantidad += pt.cantidad;
            acc[pt.productoId].totalValue += pt.valorTotal;
            acc[pt.productoId].lots.push(pt);
            return acc;
        }, {})).filter(group => {
            const term = searchTerm.toLowerCase();
            return group.productoNombre.toLowerCase().includes(term) ||
                group.codigo.toLowerCase().includes(term) ||
                group.tipo.toLowerCase().includes(term) ||
                group.lots.some(l => l.codigoLote.toLowerCase().includes(term));
        }).sort((a, b) => a.productoNombre.localeCompare(b.productoNombre));
    }, [detailedPT, searchTerm]);

    const valorTotalPT = groupedPT.reduce((acc, g) => acc + g.totalValue, 0);

    const valorTotalStock = activeTab === 'insumos' ? valorTotalInsumos : valorTotalPT;

    // ── MANEJADORES DE AJUSTE DE STOCK DE INSUMOS ──
    const handleAdjustStock = async () => {
        if (!adjustModal || newStock === '') return;

        const oldAmount = adjustModal.amount;
        const newAmount = Number(newStock);

        try {
            const { error } = await supabase
                .from('lotes_insumos')
                .update({ cantidad_actual: newAmount })
                .eq('id', adjustModal.id);
            if (error) throw error;

            await supabase.from('ajustes_inventario').insert([{
                lote_id: adjustModal.id,
                ingrediente_id: adjustModal.ingredientId,
                ingrediente_nombre: adjustModal.ingredientName,
                cantidad_anterior: oldAmount,
                cantidad_nueva: newAmount,
                motivo: 'Ajuste manual de inventario físico',
                usuario: 'operador'
            }]);

            const logEntry = {
                id: `adj-${Date.now()}`,
                date: new Date().toISOString(),
                lotId: adjustModal.codigo_lote || adjustModal.id,
                ingredientName: adjustModal.ingredientName,
                oldAmount, newAmount, diff: newAmount - oldAmount
            };
            if (setInventoryLogs) setInventoryLogs([logEntry, ...(inventoryLogs || [])]);

            setLots(lots.map(l => l.id === adjustModal.id ? { ...l, amount: newAmount } : l));
            setAdjustModal(null); setNewStock('');
            showToast(`✅ Lote ${adjustModal.codigo_lote || adjustModal.id} ajustado a ${fmtCantidad(newAmount, adjustModal.unidad_base)} y guardado.`);
        } catch (err) {
            showToast('❌ Error al ajustar: ' + err.message, 'error');
        }
    };

    const handleDeleteLot = async () => {
        if (!deleteModal) return;

        try {
            const { error } = await supabase
                .from('lotes_insumos')
                .update({ cantidad_actual: 0 })
                .eq('id', deleteModal.id);
            if (error) throw error;

            await supabase.from('ajustes_inventario').insert([{
                lote_id: deleteModal.id,
                ingrediente_id: deleteModal.ingredientId,
                ingrediente_nombre: deleteModal.ingredientName,
                cantidad_anterior: deleteModal.amount,
                cantidad_nueva: 0,
                motivo: 'Baja manual de lote (carga de prueba / error)',
                usuario: 'operador'
            }]);

            const logEntry = {
                id: `del-${Date.now()}`,
                date: new Date().toISOString(),
                lotId: deleteModal.codigo_lote || deleteModal.id,
                ingredientName: deleteModal.ingredientName,
                oldAmount: deleteModal.amount, newAmount: 0, diff: -deleteModal.amount
            };
            if (setInventoryLogs) setInventoryLogs([logEntry, ...(inventoryLogs || [])]);

            setLots(lots.map(l => l.id === deleteModal.id ? { ...l, amount: 0 } : l));
            setDeleteModal(null);
            showToast(`🗑️ Lote ${deleteModal.codigo_lote || deleteModal.id} dado de baja (stock 0) con éxito.`, 'success');
        } catch (err) {
            showToast('❌ Error al dar de baja: ' + err.message, 'error');
        }
    };

    const toggleRow = (ingId) => {
        setExpandedRows(prev => ({ ...prev, [ingId]: !prev[ingId] }));
    };

    const togglePTRow = (prodId) => {
        setExpandedPTRows(prev => ({ ...prev, [prodId]: !prev[prodId] }));
    };

    const cargarHistorial = async () => {
        setShowLogs(true);
        const { data } = await supabase
            .from('ajustes_inventario')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        if (data && setInventoryLogs) setInventoryLogs(data.map(d => ({
            id: d.id,
            date: d.created_at,
            lotId: d.lote_id,
            ingredientName: d.ingrediente_nombre,
            oldAmount: d.cantidad_anterior,
            newAmount: d.cantidad_nueva,
            diff: d.diferencia
        })));
    };

    const getStatusColor = (expiryDate) => {
        const days = (new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
        if (days < 0) return 'bg-rose-100 text-rose-700 border-rose-200';
        if (days < 30) return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    };

    const triggerPrintPT = (lot) => {
        setPrintedLabel({
            title: lot.productoNombre,
            sku: lot.codigo,
            lote: lot.codigoLote,
            peso: lot.unidad === 'Kg' ? `${lot.cantidad.toLocaleString('es-AR', { maximumFractionDigits: 3 })} Kg` : `${lot.cantidad.toLocaleString('es-AR')} U`,
            vencimiento: new Date(lot.vencimiento).toLocaleDateString('es-AR'),
            sector: lot.tipo
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* HEADER CARD */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end bg-white p-4 rounded-xl border shadow-sm print:hidden gap-4">
                <div>
                    <h3 className="text-xl font-black uppercase italic text-slate-800">Libro Mayor de Lotes</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Trazabilidad FEFO por Insumo y Proveedor</p>
                </div>
                
                {/* Valorización total visible */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 flex items-center gap-2">
                    <DollarSign size={16} className="text-emerald-600" />
                    <div>
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                            {activeTab === 'insumos' ? 'Valor Stock Insumos' : 'Valor Stock Productos'}
                        </p>
                        <p className="text-lg font-black text-emerald-800 font-mono">${valorTotalStock.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap">
                    {activeTab === 'insumos' && (
                        <select
                            className="border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-600 outline-none focus:border-blue-500 bg-slate-50 cursor-pointer"
                            value={providerFilter} onChange={e => setProviderFilter(e.target.value)}
                        >
                            <option value="">Filtrar: Todos los Proveedores</option>
                            <option value="interno">Producción Interna (WIP)</option>
                            {providers.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                    )}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                            type="text" 
                            placeholder={activeTab === 'insumos' ? "Buscar lote, insumo..." : "Buscar lote, producto..."}
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs font-bold w-48 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all" 
                        />
                    </div>
                    {activeTab === 'insumos' && (
                        <Button variant="secondary" onClick={cargarHistorial}><RotateCcw size={14} /> Historial</Button>
                    )}
                    <Button variant="primary" onClick={() => window.print()}><Printer size={14} /> Planilla Control</Button>
                </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex gap-3 border-b border-slate-200 pb-3 print:hidden">
                <button 
                    onClick={() => { setActiveTab('insumos'); setSearchTerm(''); }} 
                    className={`px-5 py-1.5 rounded-md font-black uppercase text-[9px] transition-all flex items-center gap-1.5 ${activeTab === 'insumos' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <Package size={12} /> Materias Primas e Insumos ({groupedLots.length})
                </button>
                <button 
                    onClick={() => { setActiveTab('productos'); setSearchTerm(''); }} 
                    className={`px-5 py-1.5 rounded-md font-black uppercase text-[9px] transition-all flex items-center gap-1.5 ${activeTab === 'productos' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <Tag size={12} /> Productos Terminados ({groupedPT.length})
                </button>
            </div>

            {/* TABLE CARD - TAB INSUMOS */}
            {activeTab === 'insumos' && (
                <Card className="overflow-hidden border-2 print:border-none print:shadow-none bg-white">
                    <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-2">
                        <h2 className="text-2xl font-black uppercase italic text-slate-900 leading-none">Planilla de Control Físico de Inventario - Insumos</h2>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-2">Fecha: {new Date().toLocaleDateString('es-AR')} | Turno: _______ | Firma Auditor: ______________</p>
                    </div>
                    <table className="w-full text-left print:mt-4">
                        <thead className="bg-slate-900 text-white text-[9px] uppercase tracking-widest print:bg-transparent print:text-slate-800 print:border-b-2 print:border-slate-800">
                            <tr>
                                <th className="px-4 py-2 w-10"></th>
                                <th className="px-4 py-2">SKU / Componente</th>
                                <th className="px-4 py-2">Proveedor Origen / Código Lote</th>
                                <th className="px-4 py-2 text-center print:hidden">Vencimiento</th>
                                <th className="px-4 py-2 text-right print:hidden">Costo / Und. Base</th>
                                <th className="px-4 py-2 text-right">Existencia Sistema</th>
                                <th className="px-4 py-2 text-right print:hidden">Valor Total</th>
                                <th className="px-4 py-2 text-center print:hidden">Acciones</th>
                                <th className="px-4 py-2 text-right hidden print:table-cell w-32 italic">Conteo Real</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700 bg-white">
                            {groupedLots.map(group => (
                                <React.Fragment key={group.ingredientId}>
                                    <tr className="hover:bg-slate-50 border-t border-slate-200 bg-white group/master cursor-pointer transition-colors"
                                        onClick={() => toggleRow(group.ingredientId)}>
                                        <td className="px-4 py-3 text-slate-400">
                                            {expandedRows[group.ingredientId] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                        </td>
                                        <td className="px-4 py-3 font-black uppercase text-[12px] text-slate-800 flex items-center gap-2">
                                            {group.es_subensamble && <Layers size={14} className="text-orange-500 print:hidden" />}
                                            {group.ingredientName}
                                            <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md ml-2 border border-slate-200">{group.lots.length} lote{group.lots.length !== 1 ? 's' : ''}</span>
                                        </td>
                                        <td className="px-4 py-3 text-[10px] text-slate-400 uppercase tracking-widest">— Varios Lotes —</td>
                                        <td className="px-4 py-3 text-center print:hidden"></td>
                                        <td className="px-4 py-3 text-right print:hidden"></td>
                                        <td className="px-4 py-3 text-right font-mono font-black text-slate-900 text-[13px] bg-slate-50/50">
                                            {fmtCantidad(group.totalAmount, group.unidad_base)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-black text-emerald-700 text-[13px] bg-emerald-50/30 print:hidden">
                                            ${group.totalValue.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                                        </td>
                                        <td className="px-4 py-3 text-center print:hidden"></td>
                                        <td className="px-4 py-3 text-right hidden print:table-cell text-slate-300 font-mono">................ {group.unidad_base || 'Kg'}</td>
                                    </tr>

                                    {expandedRows[group.ingredientId] && group.lots.map(lot => (
                                        <tr key={lot.id} className="bg-slate-50/80 hover:bg-slate-100 transition-colors group/lot print:border-b print:border-slate-300 shadow-[inset_4px_0_0_#cbd5e1]">
                                            <td className="px-4 py-1.5"></td>
                                            <td className="px-4 py-1.5 pl-8">
                                                <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 text-[10px]">
                                                    {lot.codigo_lote || lot.id.slice(0, 8).toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-1.5 text-[10px] text-slate-600 font-bold uppercase">{lot.providerName}</td>
                                            <td className="px-4 py-1.5 text-center print:hidden">
                                                <span className={`px-2 py-0.5 rounded border text-[9px] font-bold flex items-center justify-center gap-1 w-max mx-auto ${getStatusColor(lot.expiry)}`}>
                                                    <Calendar size={10} /> {new Date(lot.expiry).toLocaleDateString('es-AR')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-1.5 text-right font-mono text-slate-500 font-bold text-[11px] print:hidden">
                                                {lot.unitPrice ? (
                                                    (lot.unidad_base === 'g' || lot.unidad_base === 'ml')
                                                        ? `$${(Number(lot.unitPrice) * 1000).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${lot.unidad_base === 'g' ? 'Kg' : 'L'}`
                                                        : `$${Number(lot.unitPrice).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} / ${lot.unidad_base}`
                                                ) : '—'}
                                            </td>
                                            <td className="px-4 py-1.5 text-right font-mono text-slate-700 text-[12px]">
                                                {fmtCantidad(lot.amount, lot.unidad_base)}
                                            </td>
                                            <td className="px-4 py-1.5 text-right font-mono text-emerald-600 font-bold text-[11px] print:hidden">
                                                {lot.valorLote > 0 ? `$${lot.valorLote.toLocaleString('es-AR', { minimumFractionDigits: 0 })}` : <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="px-4 py-1.5 text-center print:hidden flex items-center justify-center gap-1 h-full min-h-[38px]">
                                                <button onClick={(e) => { e.stopPropagation(); setAdjustModal(lot); }} title="Ajuste de Conteo Físico" className="px-2 py-1 h-[24px] bg-white border border-slate-200 hover:bg-slate-200 hover:border-slate-300 text-slate-600 rounded text-[9px] uppercase tracking-widest transition-colors opacity-0 group-hover/lot:opacity-100 flex items-center justify-center shadow-sm">Ajustar</button>
                                                <button onClick={(e) => { e.stopPropagation(); setDeleteModal(lot); }} title="Dar de Baja (Borrar)" className="min-w-[28px] h-[24px] bg-white border border-rose-200 hover:bg-rose-500 hover:text-white text-rose-500 rounded transition-colors opacity-0 group-hover/lot:opacity-100 flex items-center justify-center shadow-sm"><Trash2 size={13} /></button>
                                            </td>
                                            <td className="px-4 py-1.5 text-right hidden print:table-cell text-slate-300 font-mono text-[10px]">............. {lot.unidad_base}</td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                            {groupedLots.length === 0 && (
                                <tr><td colSpan="9" className="p-8 text-center text-slate-400 italic bg-slate-50">No hay lotes que coincidan con la búsqueda.</td></tr>
                            )}
                        </tbody>
                    </table>
                </Card>
            )}

            {/* TABLE CARD - TAB PRODUCTOS TERMINADOS */}
            {activeTab === 'productos' && (
                <Card className="overflow-hidden border-2 print:border-none print:shadow-none bg-white">
                    <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-2">
                        <h2 className="text-2xl font-black uppercase italic text-slate-900 leading-none">Planilla de Control Físico - Productos Terminados</h2>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-2">Fecha: {new Date().toLocaleDateString('es-AR')} | Turno: _______ | Firma Auditor: ______________</p>
                    </div>
                    <table className="w-full text-left print:mt-4">
                        <thead className="bg-slate-900 text-white text-[9px] uppercase tracking-widest print:bg-transparent print:text-slate-800 print:border-b-2 print:border-slate-800">
                            <tr>
                                <th className="px-4 py-2 w-10"></th>
                                <th className="px-4 py-2">Código / Producto</th>
                                <th className="px-4 py-2">Sector / Lote PT</th>
                                <th className="px-4 py-2 text-center print:hidden">Vencimiento</th>
                                <th className="px-4 py-2 text-right print:hidden">Costo Est. Unitario</th>
                                <th className="px-4 py-2 text-right">Existencia Sistema</th>
                                <th className="px-4 py-2 text-right print:hidden">Valorización</th>
                                <th className="px-4 py-2 text-center print:hidden">Etiquetas</th>
                                <th className="px-4 py-2 text-right hidden print:table-cell w-32 italic">Conteo Real</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700 bg-white">
                            {groupedPT.map(group => (
                                <React.Fragment key={group.productoId}>
                                    <tr className="hover:bg-slate-50 border-t border-slate-200 bg-white group/master cursor-pointer transition-colors"
                                        onClick={() => togglePTRow(group.productoId)}>
                                        <td className="px-4 py-3 text-slate-400">
                                            {expandedPTRows[group.productoId] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                        </td>
                                        <td className="px-4 py-3 font-black uppercase text-[12px] text-slate-800 flex items-center gap-2">
                                            {group.productoNombre}
                                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{group.codigo}</span>
                                        </td>
                                        <td className="px-4 py-3 text-[9px]">
                                            <span className={`px-2 py-0.5 rounded-full font-black uppercase ${
                                                group.tipo === 'Panadería' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                                group.tipo === 'Charcutería' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                                'bg-orange-50 text-orange-700 border border-orange-200'
                                            }`}>{group.tipo}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center print:hidden"></td>
                                        <td className="px-4 py-3 text-right print:hidden"></td>
                                        <td className="px-4 py-3 text-right font-mono font-black text-slate-900 text-[13px] bg-slate-50/50">
                                            {group.totalCantidad.toLocaleString('es-AR', { maximumFractionDigits: 2 })} {group.unidad}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-black text-emerald-700 text-[13px] bg-emerald-50/30 print:hidden">
                                            ${group.totalValue.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                                        </td>
                                        <td className="px-4 py-3 text-center print:hidden"></td>
                                        <td className="px-4 py-3 text-right hidden print:table-cell text-slate-300 font-mono">................ {group.unidad}</td>
                                    </tr>

                                    {expandedPTRows[group.productoId] && group.lots.map(lot => (
                                        <tr key={lot.id} className="bg-slate-50/80 hover:bg-slate-100 transition-colors group/lot print:border-b print:border-slate-300 shadow-[inset_4px_0_0_#cbd5e1]">
                                            <td className="px-4 py-1.5"></td>
                                            <td className="px-4 py-1.5 pl-8">
                                                <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 text-[10px]">
                                                    {lot.codigoLote}
                                                </span>
                                            </td>
                                            <td className="px-4 py-1.5 text-[9px] uppercase tracking-wider text-slate-400">Lote Interno PT</td>
                                            <td className="px-4 py-1.5 text-center print:hidden">
                                                <span className={`px-2 py-0.5 rounded border text-[9px] font-bold flex items-center justify-center gap-1 w-max mx-auto ${getStatusColor(lot.vencimiento)}`}>
                                                    <Calendar size={10} /> {new Date(lot.vencimiento).toLocaleDateString('es-AR')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-1.5 text-right font-mono text-slate-500 font-bold text-[11px] print:hidden">
                                                ${lot.costoUnitario.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {lot.unidad}
                                            </td>
                                            <td className="px-4 py-1.5 text-right font-mono text-slate-700 text-[12px]">
                                                {lot.cantidad.toLocaleString('es-AR', { maximumFractionDigits: 3 })} {lot.unidad}
                                            </td>
                                            <td className="px-4 py-1.5 text-right font-mono text-emerald-600 font-bold text-[11px] print:hidden">
                                                ${lot.valorTotal.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                                            </td>
                                            <td className="px-4 py-1.5 text-center print:hidden flex items-center justify-center gap-1 h-full min-h-[38px]">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); triggerPrintPT(lot); }} 
                                                    title="Imprimir Etiqueta con Lote" 
                                                    className="px-2 py-1 h-[24px] bg-white border border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900 text-slate-600 rounded text-[9px] uppercase tracking-widest transition-colors opacity-0 group-hover/lot:opacity-100 flex items-center justify-center gap-1 shadow-sm font-black"
                                                >
                                                    <QrCode size={10} /> Etiqueta
                                                </button>
                                            </td>
                                            <td className="px-4 py-1.5 text-right hidden print:table-cell text-slate-300 font-mono text-[10px]">............. {lot.unidad}</td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                            {groupedPT.length === 0 && (
                                <tr><td colSpan="9" className="p-8 text-center text-slate-400 italic bg-slate-50">No hay productos terminados en stock.</td></tr>
                            )}
                        </tbody>
                    </table>
                </Card>
            )}

            {/* Modal Historial Insumos */}
            {showLogs && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-8 z-50 animate-in fade-in">
                    <Card className="max-w-3xl w-full p-6 border border-slate-200 shadow-2xl rounded-2xl max-h-[85vh] flex flex-col bg-white">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-xl font-black uppercase italic text-slate-800 flex items-center gap-2"><RotateCcw size={20} /> Registro Auditoría (Ajustes Insumos)</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Histórico persistente — guardado en BD</p>
                            </div>
                            <button onClick={() => setShowLogs(false)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 rounded-lg"><XCircle size={24} /></button>
                        </div>
                        <div className="overflow-y-auto flex-1 border border-slate-200 rounded-xl">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-500 text-[9px] uppercase tracking-widest sticky top-0 border-b">
                                    <tr>
                                        <th className="px-4 py-3">Fecha y Hora</th>
                                        <th className="px-4 py-3">Insumo</th>
                                        <th className="px-4 py-3 text-right">Anterior</th>
                                        <th className="px-4 py-3 text-right">Nueva</th>
                                        <th className="px-4 py-3 text-right border-l">Desvío</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-bold bg-white text-slate-700">
                                    {(!inventoryLogs || inventoryLogs.length === 0) ? (
                                        <tr><td colSpan="5" className="p-8 text-center text-slate-400 italic">Sin ajustes registrados aún.</td></tr>
                                    ) : inventoryLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-2.5 text-[10px] text-slate-400 font-mono">{new Date(log.date).toLocaleString('es-AR')}</td>
                                            <td className="px-4 py-2.5">
                                                <p className="uppercase text-[11px] text-slate-800">{log.ingredientName}</p>
                                                <span className="text-[9px] text-blue-500 bg-blue-50 px-1 rounded font-mono border border-blue-100">{log.lotId}</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono text-slate-400">{Number(log.oldAmount).toLocaleString('es-AR')}</td>
                                            <td className="px-4 py-2.5 text-right font-mono text-slate-900">{Number(log.newAmount).toLocaleString('es-AR')}</td>
                                            <td className="px-4 py-2.5 text-right font-mono font-black border-l">
                                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${log.diff > 0 ? 'bg-emerald-50 text-emerald-600' : (log.diff < 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500')}`}>
                                                    {log.diff > 0 ? '+' : ''}{Number(log.diff).toLocaleString('es-AR')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* Modal Ajuste de Lote Insumos */}
            {adjustModal && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-8 z-50 animate-in fade-in">
                    <Card className="max-w-md w-full p-8 border border-slate-200 shadow-2xl rounded-2xl bg-white">
                        <h3 className="text-lg font-black uppercase italic mb-4">Ajuste de Lote Específico</h3>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-2 text-xs">
                            <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase">Código Lote:</span> <span className="font-mono font-black">{adjustModal.codigo_lote || '—'}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase">Insumo:</span> <span className="font-black uppercase">{adjustModal.ingredientName}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase">Stock Actual:</span> <span className="font-mono font-black text-blue-600">{fmtCantidad(adjustModal.amount, adjustModal.unidad_base)}</span></div>
                        </div>
                        <Input label={`Nuevo Conteo Físico Real (${adjustModal.unidad_base || 'g'})`} type="number" value={newStock} onChange={setNewStock} placeholder="Ej. 25000" required />
                        <div className="flex gap-4 pt-6">
                            <Button onClick={handleAdjustStock} variant="success" className="flex-1 py-3 h-[38px]">Actualizar Lote</Button>
                            <Button onClick={() => setAdjustModal(null)} variant="secondary" className="px-6 h-[38px]">Cancelar</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Modal Anular Lote Insumos */}
            {deleteModal && (
                <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-8 z-50 animate-in fade-in">
                    <Card className="max-w-md w-full p-8 border border-rose-200 shadow-2xl rounded-2xl relative bg-white">
                        <div className="absolute top-4 right-4 text-rose-200">
                            <AlertTriangle size={48} className="opacity-20" />
                        </div>
                        <h3 className="text-xl font-black uppercase text-rose-600 mb-2 flex items-center gap-2">
                            <Trash2 size={24} /> Dar de Baja Lote
                        </h3>
                        <p className="text-xs text-slate-500 font-bold mb-6">Esta acción pondrá el stock de este lote a 0 y guardará un registro en auditoría. Ideal para deshacer cargas de prueba.</p>
                        
                        <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 mb-6 space-y-2 text-xs">
                            <div className="flex justify-between"><span className="text-rose-400 font-bold uppercase">Código Lote:</span> <span className="font-mono font-black text-rose-700">{deleteModal.codigo_lote || '—'}</span></div>
                            <div className="flex justify-between"><span className="text-rose-400 font-bold uppercase">Insumo:</span> <span className="font-black uppercase text-rose-700">{deleteModal.ingredientName}</span></div>
                            <div className="flex justify-between"><span className="text-rose-400 font-bold uppercase">Stock a Anular:</span> <span className="font-mono font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">{fmtCantidad(deleteModal.amount, deleteModal.unidad_base)}</span></div>
                        </div>
                        
                        <div className="flex gap-4 pt-2">
                            <button onClick={handleDeleteLot} className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-sm transition-all shadow-rose-600/20 hover:shadow-rose-600/40 border border-rose-700">Confirmar Baja</button>
                            <Button onClick={() => setDeleteModal(null)} variant="secondary" className="px-6">Cancelar</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* VISTA DE ETIQUETA IMPRIMIBLE DE PRODUCTOS TERMINADOS (MODAL FLOTANTE) */}
            {printedLabel && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 print:p-0 print:static print:bg-white print:z-auto">
                    <div className="bg-white border-[12px] border-slate-900 rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl print:border-none print:shadow-none print:rounded-none print:p-0">
                        <div className="border-b-[6px] border-slate-900 pb-4 mb-6">
                            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-tight">{printedLabel.title}</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">PRODUCTO LISTO PARA DESPACHO DSD</p>
                        </div>

                        <div className="space-y-3 text-left border-b border-dashed pb-6 mb-6">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-bold uppercase">Sector:</span>
                                <span className="font-black text-slate-800 uppercase text-[10px]">{printedLabel.sector}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-bold uppercase">SKU:</span>
                                <span className="font-mono font-black text-slate-800">{printedLabel.sku}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-bold uppercase">Lote PT:</span>
                                <span className="font-mono font-black text-blue-700">{printedLabel.lote}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-bold uppercase">Existencia:</span>
                                <span className="font-mono font-black text-slate-900">{printedLabel.peso}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-bold uppercase">Vencimiento:</span>
                                <span className="font-mono font-black text-red-600">{printedLabel.vencimiento}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center gap-3">
                            <div className="border border-slate-200 p-3 rounded-2xl bg-slate-50 flex items-center justify-center">
                                <QrCode size={120} className="text-slate-800" />
                            </div>
                            <p className="text-[8px] font-mono text-slate-400 uppercase">Escanear para Picking FEFO</p>
                        </div>

                        <div className="flex gap-3 justify-end mt-8 pt-4 border-t print:hidden">
                            <Button onClick={() => window.print()} variant="success">Imprimir</Button>
                            <Button onClick={() => setPrintedLabel(null)} variant="secondary">Cerrar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}