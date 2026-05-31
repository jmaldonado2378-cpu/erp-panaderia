'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { 
    ThermometerSun, Plus, Scale, Calendar, User, ClipboardList, 
    Droplet, ShieldAlert, Award, FileText, CheckCircle2, QrCode, Play,
    Trash2, Wrench, Info, Clock, ArrowRight, ChevronRight, Coins, AlertTriangle, Check, RotateCcw
} from 'lucide-react';
import { Card, Button, Input, Select } from '../bakery_erp';
import BulkImportModal from '../BulkImportModal';

const FAMILIAS_CHARC = {
    fermentado_seco: { id: 'fermentado_seco', nombre: 'Fermentados Secos (Madurados)', color: 'bg-red-700', text: 'text-red-700', border: 'border-red-700' },
    salazon_cruda: { id: 'salazon_cruda', nombre: 'Salazones de Pieza Entera', color: 'bg-amber-600', text: 'text-amber-600', border: 'border-amber-600' },
    emulsion_fina: { id: 'emulsion_fina', nombre: 'Emulsiones Finas Escaldadas', color: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-600' },
    salazon_inyectada: { id: 'salazon_inyectada', nombre: 'Salazones con Inyección (Cocidos)', color: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-600' }
};

const CATEGORIAS_TECNOLOGICAS = {
    magro: { label: 'Base Cárnica (Magro)', color: 'bg-rose-100 text-rose-800' },
    grasa: { label: 'Base Cárnica (Grasa)', color: 'bg-orange-100 text-orange-800' },
    aditivo: { label: 'Aditivos (PCC)', color: 'bg-red-100 text-red-800 font-bold' },
    saborizante: { label: 'Saborizantes', color: 'bg-amber-100 text-amber-800' },
    vector_liquido: { label: 'Vector Líquido', color: 'bg-blue-100 text-blue-800' },
    espesante: { label: 'Ligantes / Espesantes', color: 'bg-violet-100 text-violet-800' },
    empaque: { label: 'Tripa / Envoltura', color: 'bg-slate-100 text-slate-800' }
};

const fmtCost = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CharcuteriaView({ 
    charcRecetas = [], addCharcReceta, setCharcRecetas,
    charcLotes = [], addCharcLote, 
    charcLogs = [], addCharcLog, 
    updateCharcLoteEstado,
    ingredients = [], showToast,
    initialTab = 'lotes',
    hideMaduracionTab = false
}) {
    const [tab, setTab] = useState(initialTab);
    const [showAddReceta, setShowAddReceta] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);

    useEffect(() => {
        if (hideMaduracionTab) {
            setTab('recetas');
        } else if (initialTab) {
            setTab(initialTab);
        }
    }, [initialTab, hideMaduracionTab]);
    
    // --- Estado para el Asistente de Pesaje y Colgado de Lote ---
    const [asistente, setAsistente] = useState({
        active: false,
        step: 1, // 1: receta, 2: peso inicial, 3: pesaje checklist, 4: pcc inocuidad, 5: finalizado
        recetaSelected: null,
        pesoMagroInput: '', // para fermentados/emulsiones
        pesoPiezaInput: '', // para salazones (W_i o W_m)
        checklistCompleted: {}, // ingredientId -> boolean
        haccpVal: '', // temperatura o pH inicial
        codigoLote: '',
        fechaVencimiento: '',
        scaledDetails: [],
        brineDetails: null // para inyectados
    });

    // --- Formulario de Ficha Técnica (Receta) ---
    const [recetaForm, setRecetaForm] = useState({
        codigo: '',
        nombre: '',
        familia_tecnologica: 'fermentado_seco',
        porcentaje_inyeccion: '',
        lead_time_dias: 30,
        merma_secado_objetivo: 35,
        details: [
            { ingredientId: '', categoria_tecnologica: 'magro', porcentaje_base: '', secuencia_mezcla: 1 }
        ]
    });

    // --- Formulario de Medición Manual ---
    const [activeLoteForLog, setActiveLoteForLog] = useState(null);
    const [logForm, setLogForm] = useState({
        peso_real_g: '',
        temperatura_c: '',
        humedad_pct: '',
        operario: 'Supervisor Planta',
        observaciones: ''
    });

    // --- Estado para etiqueta flotante imprimible ---
    const [printedLabel, setPrintedLabel] = useState(null);

    // --- Cálculo de Costo por Ficha ---
    const getRecipeCost = (detailsList) => {
        return detailsList.reduce((acc, d) => {
            const ing = ingredients.find(i => i.id === d.ingredientId);
            const costPerGram = Number(ing?.costo_estandar || ing?.costPerGram || 0);
            // Si es panadero, usamos los gramos simulados de referencia (base 10000g de MC o 1000g de pieza)
            return acc + (Number(d.gramos || 0) * costPerGram);
        }, 0);
    };

    // --- Guardrails y validaciones de recetas ---
    const validateRecipeForm = useMemo(() => {
        const details = recetaForm.details.filter(d => d.ingredientId && d.porcentaje_base);
        const sumMeatBase = details
            .filter(d => d.categoria_tecnologica === 'magro' || d.categoria_tecnologica === 'grasa')
            .reduce((acc, d) => acc + Number(d.porcentaje_base), 0);

        const hasSalCura = details.some(d => d.categoria_tecnologica === 'aditivo' && Number(d.porcentaje_base) > 0);
        const salCuraPct = details
            .filter(d => d.categoria_tecnologica === 'aditivo')
            .reduce((acc, d) => {
                const ing = ingredients.find(i => i.id === d.ingredientId);
                if (ing?.name?.toLowerCase().includes('cura') || ing?.name?.toLowerCase().includes('nitri')) {
                    return acc + Number(d.porcentaje_base);
                }
                return acc;
            }, 0);

        const commonSalPct = details
            .filter(d => d.categoria_tecnologica === 'aditivo')
            .reduce((acc, d) => {
                const ing = ingredients.find(i => i.id === d.ingredientId);
                if (ing?.name?.toLowerCase().includes('sal fina') || ing?.name?.toLowerCase().includes('sal común') || ing?.name?.toLowerCase().includes('sal marina')) {
                    return acc + Number(d.porcentaje_base);
                }
                return acc;
            }, 0);

        const alerts = [];
        let blockSave = false;

        if (recetaForm.familia_tecnologica === 'fermentado_seco' || recetaForm.familia_tecnologica === 'emulsion_fina') {
            if (Math.abs(sumMeatBase - 100) > 0.01) {
                alerts.push({ type: 'danger', msg: `Base Cárnica Desbalanceada: La suma de Magro y Grasa debe ser exactamente 100% (Actual: ${sumMeatBase.toFixed(1)}%).` });
                blockSave = true;
            }
        }

        if (salCuraPct > 2.50) {
            alerts.push({ type: 'danger', msg: `PCC Crítico: Sal de cura superior al 2.5% legal (${(salCuraPct * 60).toFixed(0)} ppm de Nitrito residual), excede límites de inocuidad.` });
            blockSave = true;
        }

        if (recetaForm.familia_tecnologica === 'fermentado_seco') {
            if (commonSalPct > 0 && commonSalPct < 2.40) {
                alerts.push({ type: 'warning', msg: `Inestabilidad de aw: Sal Común menor al 2.4% recomendado, riesgo microbiológico alto.` });
            }
            const hasSugars = details.some(d => d.categoria_tecnologica === 'saborizante' && (
                ingredients.find(i => i.id === d.ingredientId)?.name?.toLowerCase().includes('dextrosa') ||
                ingredients.find(i => i.id === d.ingredientId)?.name?.toLowerCase().includes('azúcar') ||
                ingredients.find(i => i.id === d.ingredientId)?.name?.toLowerCase().includes('sacarosa')
            ));
            if (!hasSugars) {
                alerts.push({ type: 'warning', msg: `Fermentación Inestable: No se detectaron azúcares (dextrosa/sacarosa) indispensables para alimentar las bacterias acidófilas.` });
            }
        }

        if (recetaForm.familia_tecnologica === 'salazon_inyectada') {
            if (!recetaForm.porcentaje_inyeccion || Number(recetaForm.porcentaje_inyeccion) <= 0) {
                alerts.push({ type: 'danger', msg: 'Debe ingresar un porcentaje de inyección objetivo.' });
                blockSave = true;
            }
            // Control de secuencia: fosfatos antes que la sal
            const salSeq = details.find(d => ingredients.find(i => i.id === d.ingredientId)?.name?.toLowerCase().includes('sal'))?.secuencia_mezcla;
            const phosSeq = details.find(d => ingredients.find(i => i.id === d.ingredientId)?.name?.toLowerCase().includes('fosfa'))?.secuencia_mezcla;
            if (salSeq && phosSeq && Number(phosSeq) >= Number(salSeq)) {
                alerts.push({ type: 'warning', msg: 'PCC Químico: Los polifosfatos alcalinos deben disolverse antes de la sal común para evitar la precipitación.' });
            }
        }

        return { alerts, blockSave };
    }, [recetaForm, ingredients]);

    const handleSaveReceta = () => {
        if (!recetaForm.codigo || !recetaForm.nombre) {
            showToast("Código y nombre son requeridos", "error");
            return;
        }
        if (validateRecipeForm.blockSave) {
            showToast("Corrija los errores de la receta antes de guardar", "error");
            return;
        }

        // Simular gramos para el guardado (base de referencia para asegurar constraint NOT NULL en DB)
        // Base de 10 kg (10,000g) para fermentados/emulsiones o 1 kg (1000g) para salazones
        const baseRef = (recetaForm.familia_tecnologica === 'fermentado_seco' || recetaForm.familia_tecnologica === 'emulsion_fina') ? 10000 : 1000;
        
        const detailsMapped = recetaForm.details
            .filter(d => d.ingredientId && d.porcentaje_base)
            .map(d => ({
                ingredientId: d.ingredientId,
                porcentaje_base: Number(d.porcentaje_base),
                categoria_tecnologica: d.categoria_tecnologica,
                secuencia_mezcla: Number(d.secuencia_mezcla || 1),
                gramos: Number(((Number(d.porcentaje_base) / 100) * baseRef).toFixed(2))
            }));

        const receta = {
            codigo: recetaForm.codigo.toUpperCase(),
            nombre: recetaForm.nombre,
            lead_time_dias: Number(recetaForm.lead_time_dias),
            merma_secado_objetivo: Number(recetaForm.merma_secado_objetivo),
            familia_tecnologica: recetaForm.familia_tecnologica,
            porcentaje_inyeccion: recetaForm.familia_tecnologica === 'salazon_inyectada' ? Number(recetaForm.porcentaje_inyeccion) : null,
            version: 1
        };

        addCharcReceta(receta, detailsMapped);
        setShowAddReceta(false);
        setRecetaForm({
            codigo: '',
            nombre: '',
            familia_tecnologica: 'fermentado_seco',
            porcentaje_inyeccion: '',
            lead_time_dias: 30,
            merma_secado_objetivo: 35,
            details: [{ ingredientId: '', categoria_tecnologica: 'magro', porcentaje_base: '', secuencia_mezcla: 1 }]
        });
    };

    // --- Lógica de Escalabilidad del Asistente ---
    const handleStartAsistente = (receta) => {
        setAsistente({
            active: true,
            step: 2,
            recetaSelected: receta,
            pesoMagroInput: '',
            pesoPiezaInput: '',
            checklistCompleted: {},
            haccpVal: '',
            codigoLote: `${receta.codigo}-${new Date().toISOString().slice(2,7).replace('-','')}`,
            fechaVencimiento: new Date(Date.now() + receta.lead_time_dias * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            scaledDetails: [],
            brineDetails: null
        });
        setTab('asistente');
    };

    const handleScaleIngredients = () => {
        const rec = asistente.recetaSelected;
        let baseWeightG = 0;
        let scaled = [];

        if (rec.familia_tecnologica === 'fermentado_seco' || rec.familia_tecnologica === 'emulsion_fina') {
            // Algoritmo 1: Determinación de la Masa Cárnica Base (MC)
            const magroInput = Number(asistente.pesoMagroInput); // ej: magro ingresado
            const magroDetail = rec.details.find(d => d.categoria_tecnologica === 'magro');
            const magroPct = magroDetail ? Number(magroDetail.porcentaje_base) : 65;

            // MC = (M_magro * 100) / % Magro Teórico
            const mcTotal = (magroInput * 100) / magroPct;
            baseWeightG = mcTotal;

            scaled = rec.details.map(d => {
                let calculatedG = 0;
                if (d.categoria_tecnologica === 'magro') {
                    calculatedG = magroInput;
                } else if (d.categoria_tecnologica === 'grasa') {
                    calculatedG = mcTotal - magroInput; // M_grasa = MC - M_magro
                } else {
                    // M_ingrediente = MC * P_ing / 100
                    calculatedG = (mcTotal * Number(d.porcentaje_base)) / 100;
                }
                return {
                    ...d,
                    gramos_calculados: Math.round(calculatedG)
                };
            });
        } else if (rec.familia_tecnologica === 'salazon_cruda') {
            // Base Variable W_i
            const w_i = Number(asistente.pesoPiezaInput);
            baseWeightG = w_i;

            scaled = rec.details.map(d => ({
                ...d,
                gramos_calculados: d.categoria_tecnologica === 'magro' ? w_i : Math.round((w_i * Number(d.porcentaje_base)) / 100)
            }));
        } else if (rec.familia_tecnologica === 'salazon_inyectada') {
            // Base Variable W_m
            const w_m = Number(asistente.pesoPiezaInput);
            baseWeightG = w_m;
            const injPct = Number(rec.porcentaje_inyeccion || 10);
            
            // W_salmuera = W_m * % Inyeccion
            const w_salmuera = (w_m * injPct) / 100;

            // Calcular aditivos y saborizantes en gramos
            let totalAditivosG = 0;
            const ingredientsScaled = rec.details
                .filter(d => d.categoria_tecnologica !== 'magro' && d.categoria_tecnologica !== 'empaque')
                .map(d => {
                    const g = Math.round((w_m * Number(d.porcentaje_base)) / 100);
                    totalAditivosG += g;
                    return {
                        ...d,
                        gramos_calculados: g
                    };
                });

            // Agua Helada = W_salmuera - Suma aditivos
            const waterG = w_salmuera - totalAditivosG;

            // Agregar el agua al principio como secuencia 1
            const waterDetail = {
                ingredientId: 'i3', // Agua filtrada/helada
                porcentaje_base: null,
                categoria_tecnologica: 'vector_liquido',
                secuencia_mezcla: 1,
                gramos_calculados: Math.round(waterG)
            };

            scaled = [
                rec.details.find(d => d.categoria_tecnologica === 'magro'), // el músculo original
                waterDetail,
                ...ingredientsScaled
            ].filter(Boolean);

            asistente.brineDetails = {
                w_salmuera: Math.round(w_salmuera),
                waterG: Math.round(waterG),
                aditivosG: Math.round(totalAditivosG)
            };
        }

        // Ordenar ingredientes por secuencia de mezcla
        scaled.sort((a, b) => Number(a.secuencia_mezcla || 1) - Number(b.secuencia_mezcla || 1));

        setAsistente(prev => ({
            ...prev,
            scaledDetails: scaled,
            step: 3
        }));
    };

    const handleSaveLoteAsistente = () => {
        if (!asistente.codigoLote) {
            showToast("Código de lote es obligatorio", "error");
            return;
        }

        const rec = asistente.recetaSelected;
        const totalFarsaG = asistente.scaledDetails
            .filter(d => d.categoria_tecnologica !== 'empaque')
            .reduce((acc, d) => acc + Number(d.gramos_calculados || 0), 0);

        // M_final_batch = M_tot_farsa * (1 - % merma / 100)
        const finalExpectedG = totalFarsaG * (1 - Number(rec.merma_secado_objetivo) / 100);

        const lote = {
            receta_id: rec.id,
            codigo_lote: asistente.codigoLote.toUpperCase(),
            peso_inicial_g: Math.round(totalFarsaG),
            peso_actual_g: Math.round(totalFarsaG),
            estado: 'EN_SECADO',
            fecha_ingreso: new Date().toISOString(),
            fecha_vencimiento: asistente.fechaVencimiento
        };

        // Agregar log inicial con el control HACCP ingresado
        addCharcLote(lote);

        // Si se cargó un valor de control (pH o temp cutter)
        if (asistente.haccpVal) {
            setTimeout(() => {
                const logsForRec = charcLotes.find(l => l.codigo_lote === lote.codigo_lote);
                if (logsForRec) {
                    addCharcLog({
                        lote_id: logsForRec.id,
                        peso_real_g: Math.round(totalFarsaG),
                        temperatura_c: rec.familia_tecnologica === 'emulsion_fina' ? Number(asistente.haccpVal) : 12.0,
                        humedad_pct: 75.0,
                        operario: 'Sistema MES',
                        observaciones: `Registro inicial de control. PCC inicial cargado: ${asistente.haccpVal} ${rec.familia_tecnologica === 'salazon_cruda' ? 'pH' : '°C cutter'}`
                    });
                }
            }, 1000);
        }

        setAsistente({ active: false, step: 1, recetaSelected: null, scaledDetails: [] });
        setTab('lotes');
    };

    // --- Registrar medición manual de control ---
    const handleSaveLog = () => {
        if (!logForm.peso_real_g || !logForm.temperatura_c || !logForm.humedad_pct) {
            showToast("Complete los datos de la medición", "error");
            return;
        }
        const log = {
            lote_id: activeLoteForLog.id,
            peso_real_g: Number(logForm.peso_real_g),
            temperatura_c: Number(logForm.temperatura_c),
            humedad_pct: Number(logForm.humedad_pct),
            operario: logForm.operario,
            observaciones: logForm.observaciones
        };
        addCharcLog(log);
        setActiveLoteForLog(null);
        setLogForm({ peso_real_g: '', temperatura_c: '', humedad_pct: '', operario: 'Supervisor Planta', observaciones: '' });
    };

    const triggerPrint = (lote, receta) => {
        setPrintedLabel({
            title: receta?.nombre || 'Producto Charcutería',
            sku: receta?.codigo || 'SKU-UNKNOWN',
            lote: lote.codigo_lote,
            peso: `${lote.peso_actual_g.toLocaleString()} g`,
            ingreso: new Date(lote.fecha_ingreso || Date.now()).toLocaleDateString('es-AR'),
            vencimiento: new Date(lote.fecha_vencimiento).toLocaleDateString('es-AR'),
            status: lote.estado
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            {/* TABS DE SECCIÓN PREMIUM */}
            {!hideMaduracionTab && (
                <div className="flex gap-4 border-b border-slate-200 pb-3 print:hidden justify-between items-center">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => { setTab('lotes'); setAsistente(p => ({ ...p, active: false })); }} 
                            className={`px-6 py-2.5 rounded-xl font-black uppercase text-xs tracking-wider transition-all ${tab === 'lotes' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            Cámaras de Maduración ({charcLotes.length})
                        </button>
                        <button 
                            onClick={() => { setTab('recetas'); setAsistente(p => ({ ...p, active: false })); }} 
                            className={`px-6 py-2.5 rounded-xl font-black uppercase text-xs tracking-wider transition-all ${tab === 'recetas' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            Fichas Técnicas ({charcRecetas.length})
                        </button>
                    </div>
                    {asistente.active && (
                        <span className="bg-red-50 text-red-700 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border border-red-200 animate-pulse">
                            Asistente Activo (Paso {asistente.step}/5)
                        </span>
                    )}
                </div>
            )}

            {/* TAB: MONITOREO DE SECADO / CÁMARAS */}
            {tab === 'lotes' && !activeLoteForLog && (
                <div className="space-y-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-2xl font-black uppercase italic text-slate-800 tracking-tighter">Monitoreo de Secado Artesanal</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Parámetros de Inocuidad: Humedad 70-75% | Temp 12-15°C | Trazabilidad FEFO</p>
                        </div>
                        <Button onClick={() => {
                            if (charcRecetas.length === 0) {
                                showToast("Cargue al menos una ficha técnica antes de colgar lotes", "error");
                                return;
                            }
                            setAsistente({ active: true, step: 1 });
                            setTab('asistente');
                        }} variant="accent" className="py-3 px-6 rounded-xl italic">
                            <Plus size={16} /> Colgar Lote en Cámara
                        </Button>
                    </div>

                    {/* LOTES ACTIVOS EN CÁMARAS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {charcLotes.map(l => {
                            const rec = charcRecetas.find(r => r.id === l.receta_id);
                            const mermaReal = ((1 - l.peso_actual_g / l.peso_inicial_g) * 100);
                            const targetMerma = rec?.merma_secado_objetivo || 35.00;
                            const percentToGoal = (mermaReal / targetMerma) * 100;
                            const isCured = mermaReal >= targetMerma;
                            const logs = charcLogs.filter(lg => lg.lote_id === l.id);
                            const lastLog = logs[0] || null;
                            const familyData = FAMILIAS_CHARC[rec?.familia_tecnologica || 'fermentado_seco'];

                            return (
                                <Card key={l.id} className={`border-2 transition-all hover:shadow-lg rounded-2xl ${isCured && l.estado === 'EN_SECADO' ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200'}`}>
                                    {/* Cabecera del lote */}
                                    <div className="p-6 border-b flex justify-between items-start bg-slate-900 text-white rounded-t-2xl">
                                        <div>
                                            <h5 className="font-black text-sm uppercase italic tracking-tight">{rec?.nombre || 'Charcutería'}</h5>
                                            <div className="flex gap-2 items-center mt-1.5">
                                                <span className="text-[9px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700">{l.codigo_lote}</span>
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg uppercase ${
                                                    l.estado === 'CURADO_LISTO' ? 'bg-emerald-600 text-white' : 
                                                    l.estado === 'RECHAZADO' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white animate-pulse'
                                                }`}>{l.estado.replace('_', ' ')}</span>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-[8px] font-black text-white ${familyData?.color}`}>
                                            {rec?.codigo}
                                        </span>
                                    </div>

                                    {/* Detalles de Peso y Secado */}
                                    <div className="p-6 space-y-5">
                                        <div className="grid grid-cols-2 gap-4 text-xs">
                                            <div>
                                                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Masa Cruda Inicial</p>
                                                <p className="font-mono font-black text-slate-800 text-lg">{l.peso_inicial_g.toLocaleString('es-AR')} g</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Masa Actual</p>
                                                <p className="font-mono font-black text-slate-900 text-lg">{l.peso_actual_g.toLocaleString('es-AR')} g</p>
                                            </div>
                                        </div>

                                        {/* Barra de progreso de deshidratación */}
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-end text-[9px] font-black uppercase text-slate-500 tracking-wider">
                                                <span>Deshidratación (Merma)</span>
                                                <span className={isCured ? 'text-emerald-600 font-black' : 'text-slate-700 font-mono font-bold'}>
                                                    {mermaReal.toFixed(1)}% / {targetMerma}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-200">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-500 ${isCured ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'}`} 
                                                    style={{ width: `${Math.min(100, percentToGoal)}%` }}
                                                />
                                            </div>
                                            {isCured && l.estado === 'EN_SECADO' && (
                                                <p className="text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg font-bold uppercase text-center flex items-center justify-center gap-1.5 shadow-sm">
                                                    <Award size={12} /> ¡Llegó al rendimiento objetivo de maduración!
                                                </p>
                                            )}
                                        </div>

                                        {/* Clima e Historial */}
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-[10px] space-y-2">
                                            <p className="font-black text-slate-500 uppercase text-[8px] tracking-wider border-b pb-1.5 flex justify-between items-center">
                                                <span>Última Inspección</span>
                                                {lastLog && <span className="font-mono text-slate-400 font-normal">{new Date(lastLog.fecha_registro).toLocaleDateString('es-AR')}</span>}
                                            </p>
                                            {lastLog ? (
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="flex flex-col"><span className="text-slate-400 uppercase text-[7px] font-bold">Peso</span><b className="text-slate-800 font-mono text-sm">{lastLog.peso_real_g.toLocaleString('es-AR')}g</b></div>
                                                    <div className="flex flex-col"><span className="text-slate-400 uppercase text-[7px] font-bold">Temp.</span><b className="text-amber-600 font-mono text-sm">{lastLog.temperatura_c}°C</b></div>
                                                    <div className="flex flex-col"><span className="text-slate-400 uppercase text-[7px] font-bold">Humedad</span><b className="text-blue-600 font-mono text-sm">{lastLog.humedad_pct}%</b></div>
                                                </div>
                                            ) : (
                                                <p className="text-slate-400 italic text-center py-1">Sin inspecciones registradas aún</p>
                                            )}
                                        </div>

                                        {/* Botones de acción del lote */}
                                        <div className="flex gap-2 pt-2">
                                            {l.estado === 'EN_SECADO' && (
                                                <Button onClick={() => {
                                                    setActiveLoteForLog(l);
                                                    setLogForm({ ...logForm, peso_real_g: l.peso_actual_g });
                                                }} className="flex-1 py-2 text-[10px]" variant="secondary">
                                                    Registrar Control
                                                </Button>
                                            )}
                                            {isCured && l.estado === 'EN_SECADO' && (
                                                <Button onClick={() => updateCharcLoteEstado(l.id, 'CURADO_LISTO')} className="flex-1 py-2 text-[10px]" variant="success">
                                                    Liberar Lote
                                                </Button>
                                            )}
                                            <Button onClick={() => triggerPrint(l, rec)} className="py-2 px-4" variant="ghost">
                                                <QrCode size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                        {charcLotes.length === 0 && (
                            <div className="col-span-full py-24 border-4 border-dashed rounded-3xl text-center opacity-40">
                                <ThermometerSun size={64} className="mx-auto text-slate-300 mb-4 animate-spin duration-3000" />
                                <p className="font-black uppercase italic text-lg tracking-widest text-slate-500">Cámaras vacías. Cuelgue su primer lote.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* PLANILLA DE REGISTRO MANUAL DE CONTROL */}
            {activeLoteForLog && (
                <div className="max-w-xl mx-auto py-4">
                    <Card className="p-8 border border-slate-200 bg-white shadow-xl rounded-2xl">
                        <h4 className="text-lg font-black uppercase italic mb-1 text-slate-800">Planilla de Control Físico</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest border-b pb-4 mb-6">
                            Lote: {activeLoteForLog.codigo_lote} | Peso inicial crudo: {activeLoteForLog.peso_inicial_g}g
                        </p>
                        
                        <div className="space-y-5">
                            <Input 
                                label="Peso Real Actual (gramos)" 
                                type="number" 
                                placeholder="Coloque la pieza en la balanza"
                                value={logForm.peso_real_g} 
                                onChange={v => setLogForm({ ...logForm, peso_real_g: v })} 
                                required 
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input 
                                    label="Temperatura de Cámara (°C)" 
                                    type="number" 
                                    step="0.1" 
                                    placeholder="Lectura termómetro"
                                    value={logForm.temperatura_c} 
                                    onChange={v => setLogForm({ ...logForm, temperatura_c: v })} 
                                    required 
                                />
                                <Input 
                                    label="Humedad Relativa (%)" 
                                    type="number" 
                                    placeholder="Lectura higrómetro"
                                    value={logForm.humedad_pct} 
                                    onChange={v => setLogForm({ ...logForm, humedad_pct: v })} 
                                    required 
                                />
                            </div>
                            <Input 
                                label="Inspector de Control" 
                                value={logForm.operario} 
                                onChange={v => setLogForm({ ...logForm, operario: v })} 
                            />
                            <div className="flex flex-col gap-1 w-full text-left">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observaciones / Inspección Sensorial</label>
                                <textarea 
                                    className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none text-sm font-semibold text-slate-800 transition-all focus:border-slate-400" 
                                    rows="3"
                                    placeholder="Ingrese indicios de moho, aromas, endurecimiento de corteza..."
                                    value={logForm.observaciones}
                                    onChange={e => setLogForm({ ...logForm, observaciones: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end mt-8 pt-4 border-t">
                            <Button onClick={() => setActiveLoteForLog(null)} variant="secondary" className="px-6">Volver</Button>
                            <Button onClick={handleSaveLog} variant="success" className="px-6">Guardar Inspección</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB: FICHAS TÉCNICAS (RECETAS) */}
            {tab === 'recetas' && (
                <div className="space-y-8 animate-in fade-in">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-2xl font-black uppercase italic text-slate-800 tracking-tighter">Recetas y Dosificación Industrial</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Definición de fichas técnicas en base cárnica, aditivos y tiempos de curing.</p>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => setShowBulkImport(true)} variant="secondary"><Plus size={16} /> Carga Masiva</Button>
                            <Button onClick={() => {
                                setShowAddReceta(!showAddReceta);
                                if (!showAddReceta) {
                                    setRecetaForm({
                                        codigo: '',
                                        nombre: '',
                                        familia_tecnologica: 'fermentado_seco',
                                        porcentaje_inyeccion: '',
                                        lead_time_dias: 30,
                                        merma_secado_objetivo: 35,
                                        details: [{ ingredientId: '', categoria_tecnologica: 'magro', porcentaje_base: '', secuencia_mezcla: 1 }]
                                    });
                                }
                            }} variant={showAddReceta ? "secondary" : "accent"} className="py-3 px-6 rounded-xl italic">
                                {showAddReceta ? "Cancelar" : <><Plus size={16} /> Nueva Ficha Charcutería</>}
                            </Button>
                        </div>
                    </div>

                    {/* FORMULARIO DE ALTA DE RECETA DE CHARCUTERÍA */}
                    {showAddReceta && (
                        <Card className="p-8 border-t-8 border-slate-900 bg-white shadow-2xl rounded-2xl animate-in slide-in-from-top-6">
                            <h4 className="text-lg font-black uppercase mb-6 italic text-slate-800">Alta de Ficha Técnica Charcutera</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end mb-6">
                                <Input label="Código Ficha (SKU)" value={recetaForm.codigo} onChange={v => setRecetaForm({ ...recetaForm, codigo: v })} placeholder="Ej: CH-SLM-01" required />
                                <Input label="Nombre del Chacinado" placeholder="Ej: Salame tipo Milán" value={recetaForm.nombre} onChange={v => setRecetaForm({ ...recetaForm, nombre: v })} required />
                                
                                <Select label="Familia Tecnológica" value={recetaForm.familia_tecnologica} onChange={v => setRecetaForm({ ...recetaForm, familia_tecnologica: v })}>
                                    <option value="fermentado_seco">Fermentados Secos (Salame, Chorizo)</option>
                                    <option value="salazon_cruda">Salazones Crudas (Bondiola, Jamón)</option>
                                    <option value="emulsion_fina">Emulsiones Finas (Mortadela, Salchicha)</option>
                                    <option value="salazon_inyectada">Salazones Inyectadas (Jamón Cocido)</option>
                                </Select>

                                {recetaForm.familia_tecnologica === 'salazon_inyectada' ? (
                                    <Input label="Porcentaje de Inyección (%)" type="number" value={recetaForm.porcentaje_inyeccion} onChange={v => setRecetaForm({ ...recetaForm, porcentaje_inyeccion: v })} placeholder="Ej: 10" required />
                                ) : (
                                    <div className="text-[10px] font-bold text-slate-400 uppercase h-[42px] flex items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50">Inyección N/A</div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <Input label="Lead Time Estimado de Maduración (Días)" type="number" value={recetaForm.lead_time_dias} onChange={v => setRecetaForm({ ...recetaForm, lead_time_dias: v })} required />
                                <Input label="Merma / Pérdida de Peso Objetivo (%)" type="number" value={recetaForm.merma_secado_objetivo} onChange={v => setRecetaForm({ ...recetaForm, merma_secado_objetivo: v })} required />
                            </div>

                            {/* Detalle de componentes de la receta */}
                            <div className="mb-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Matriz de Formulación (Ingredientes)</p>
                                    <span className="text-[9px] text-slate-400 font-bold italic">Base de cálculo dinámico: % de Baker/Cárnico</span>
                                </div>
                                
                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white mb-4">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-900 text-white text-[9px] uppercase tracking-wider">
                                            <tr>
                                                <th className="px-4 py-3">Insumo</th>
                                                <th className="px-4 py-3 w-48">Categoría Tecnológica</th>
                                                <th className="px-4 py-3 w-32 text-center">% de Base</th>
                                                <th className="px-4 py-3 w-32 text-center">Secuencia Mezcla</th>
                                                <th className="px-4 py-3 w-16 text-center"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {recetaForm.details.map((d, i) => (
                                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-2">
                                                        <select 
                                                            className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer py-1.5"
                                                            value={d.ingredientId}
                                                            onChange={e => {
                                                                const nd = [...recetaForm.details];
                                                                nd[i].ingredientId = e.target.value;
                                                                setRecetaForm({ ...recetaForm, details: nd });
                                                            }}
                                                        >
                                                            <option value="" disabled>Seleccione ingrediente...</option>
                                                            {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="p-2 border-l border-slate-100">
                                                        <select 
                                                            className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer py-1.5"
                                                            value={d.categoria_tecnologica}
                                                            onChange={e => {
                                                                const nd = [...recetaForm.details];
                                                                nd[i].categoria_tecnologica = e.target.value;
                                                                setRecetaForm({ ...recetaForm, details: nd });
                                                            }}
                                                        >
                                                            {Object.entries(CATEGORIAS_TECNOLOGICAS).map(([k, v]) => (
                                                                <option key={k} value={k}>{v.label}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="p-2 border-l border-slate-100">
                                                        <div className="flex items-center justify-center bg-slate-50 border rounded-lg px-2 py-1 w-24 mx-auto">
                                                            <input 
                                                                type="number" 
                                                                step="0.01" 
                                                                className="w-full bg-transparent text-xs font-black text-center outline-none text-slate-800"
                                                                placeholder="0"
                                                                value={d.porcentaje_base} 
                                                                onChange={e => {
                                                                    const nd = [...recetaForm.details];
                                                                    nd[i].porcentaje_base = e.target.value;
                                                                    setRecetaForm({ ...recetaForm, details: nd });
                                                                }} 
                                                            />
                                                            <span className="text-[9px] text-slate-400 font-bold ml-1">%</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 border-l border-slate-100">
                                                        <input 
                                                            type="number" 
                                                            className="w-16 mx-auto text-center border rounded-lg px-2 py-1 text-xs font-bold text-slate-700 bg-slate-50"
                                                            min="1"
                                                            value={d.secuencia_mezcla}
                                                            onChange={e => {
                                                                const nd = [...recetaForm.details];
                                                                nd[i].secuencia_mezcla = e.target.value;
                                                                setRecetaForm({ ...recetaForm, details: nd });
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <button 
                                                            type="button"
                                                            className="text-red-300 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                                            onClick={() => {
                                                                const nd = [...recetaForm.details];
                                                                nd.splice(i, 1);
                                                                setRecetaForm({ ...recetaForm, details: nd });
                                                            }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <Button 
                                    onClick={() => setRecetaForm({ ...recetaForm, details: [...recetaForm.details, { ingredientId: '', categoria_tecnologica: 'aditivo', porcentaje_base: '', secuencia_mezcla: recetaForm.details.length + 1 }] })}
                                    variant="secondary"
                                    className="w-full py-2.5 rounded-xl border border-dashed text-xs flex justify-center items-center gap-2"
                                >
                                    + Agregar Insumo a la Mezcla
                                </Button>
                            </div>

                            {/* Alertas de validación de inocuidad */}
                            {validateRecipeForm.alerts.map((al, idx) => (
                                <div key={idx} className={`p-4 rounded-xl border-l-4 mb-4 text-xs font-semibold flex items-start gap-3 shadow-sm ${
                                    al.type === 'danger' ? 'bg-red-50 border-red-500 text-red-800' : 'bg-amber-50 border-amber-500 text-amber-800'
                                }`}>
                                    <AlertTriangle size={18} className="shrink-0" />
                                    <span>{al.msg}</span>
                                </div>
                            ))}

                            <div className="flex gap-4 justify-end pt-4 border-t">
                                <Button onClick={() => setShowAddReceta(false)} variant="secondary" className="px-6 py-2.5 rounded-xl">Cancelar</Button>
                                <Button onClick={handleSaveReceta} variant="success" className="px-8 py-2.5 rounded-xl" disabled={validateRecipeForm.blockSave}>Guardar Ficha Técnica</Button>
                            </div>
                        </Card>
                    )}

                    {/* VISTA DE FICHAS ACTIVAS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {charcRecetas.map(r => {
                            const familyData = FAMILIAS_CHARC[r.familia_tecnologica || 'fermentado_seco'];
                            const totalBatchCost = getRecipeCost(r.details || []);
                            const batchWeight = (r.familia_tecnologica === 'fermentado_seco' || r.familia_tecnologica === 'emulsion_fina') ? 10000 : 1000;
                            const costPerUnit = totalBatchCost / (batchWeight / 1000); // Costo por kg

                            return (
                                <Card key={r.id} className="p-6 border bg-white shadow-sm flex flex-col justify-between rounded-2xl hover:shadow-md transition-shadow">
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h5 className="font-black text-base uppercase italic text-slate-800 leading-none">{r.nombre}</h5>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-[9px] font-mono text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">{r.codigo}</span>
                                                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black text-white ${familyData?.color}`}>
                                                        {familyData?.nombre}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="bg-slate-100 p-2.5 rounded-xl text-slate-500"><FileText size={20} /></div>
                                        </div>
                                        
                                        <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 text-center">
                                            <div>
                                                <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider">Lead Time</p>
                                                <p className="font-mono font-black text-slate-800 text-sm mt-1">{r.lead_time_dias} días</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider">Merma Secado</p>
                                                <p className="font-mono font-black text-red-600 text-sm mt-1">{r.merma_secado_objetivo}%</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider">Costo / Kg</p>
                                                <p className="font-mono font-black text-emerald-600 text-sm mt-1">{fmtCost(costPerUnit)}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider">Composición de Receta (%):</p>
                                            <div className="divide-y divide-slate-100 text-[10px]">
                                                {r.details?.map((d, i) => {
                                                    const ing = ingredients.find(ing => ing.id === d.ingredientId);
                                                    const cat = CATEGORIAS_TECNOLOGICAS[d.categoria_tecnologica || 'aditivo'];
                                                    return (
                                                        <div key={i} className="py-2 flex justify-between items-center text-slate-700">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[7px] px-1.5 py-0.5 rounded uppercase font-black ${cat?.color}`}>
                                                                    {d.categoria_tecnologica}
                                                                </span>
                                                                <span className="font-semibold">{ing?.name || 'Insumo'}</span>
                                                            </div>
                                                            <div className="font-mono flex items-center gap-3">
                                                                <span className="text-slate-400">Paso {d.secuencia_mezcla}</span>
                                                                <span className="font-black text-slate-900">{d.porcentaje_base}%</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t pt-4 mt-6">
                                        <Button onClick={() => handleStartAsistente(r)} variant="primary" className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider italic flex items-center justify-center gap-2">
                                            <Play size={14} className="fill-current" /> Pesar y Colgar Lote
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })}
                        {charcRecetas.length === 0 && (
                            <div className="col-span-full py-16 text-center opacity-30 italic text-slate-400 text-xs">
                                No se han registrado fichas técnicas.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB: ASISTENTE DE PESAJE Y ENTRADA INDUSTRIAL (MODO KIOSCO) */}
            {tab === 'asistente' && asistente.active && (
                <div className="max-w-4xl mx-auto py-2 animate-in zoom-in-95 duration-300">
                    <Card className="border-[8px] border-slate-900 shadow-2xl rounded-3xl overflow-hidden bg-white">
                        
                        {/* Cabecera del Kiosco */}
                        <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                            <div>
                                <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                                    Balanza en Planta (Kiosco)
                                </span>
                                <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none mt-2">
                                    {asistente.recetaSelected?.nombre}
                                </h3>
                                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.2em] mt-1.5">
                                    Línea: Cámara de Curing y Chacinados | Lote: {asistente.codigoLote}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">Familia</p>
                                <span className="text-sm font-black uppercase text-orange-500">
                                    {asistente.recetaSelected?.codigo}
                                </span>
                            </div>
                        </div>

                        {/* STEP 2: INGRESO DE MATERIA PRIMA (ENTRADA BALANZA) */}
                        {asistente.step === 2 && (
                            <div className="p-10 space-y-8 text-center">
                                <div className="bg-orange-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-orange-600 border border-orange-200 shadow-sm">
                                    <Scale size={48} />
                                </div>
                                
                                {asistente.recetaSelected.familia_tecnologica === 'fermentado_seco' || asistente.recetaSelected.familia_tecnologica === 'emulsion_fina' ? (
                                    <div className="max-w-md mx-auto space-y-4">
                                        <h4 className="text-2xl font-black uppercase italic tracking-tight text-slate-800">
                                            ¿Cuánta carne magra tienes?
                                        </h4>
                                        <p className="text-slate-400 text-[10px] font-bold uppercase leading-normal tracking-wide">
                                            El sistema calculará automáticamente la cantidad de grasa necesaria para completar el 100% de la Base Cárnica ($MC$), escalando los aditivos en proporción.
                                        </p>
                                        <div className="flex items-end justify-center gap-2">
                                            <input 
                                                type="number"
                                                className="text-6xl font-mono font-black w-72 text-center border-b-8 border-slate-900 outline-none text-slate-800"
                                                placeholder="0"
                                                value={asistente.pesoMagroInput}
                                                onChange={e => setAsistente(p => ({ ...p, pesoMagroInput: e.target.value }))}
                                                autoFocus
                                            />
                                            <span className="text-3xl font-black text-slate-300 italic mb-2">g</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="max-w-md mx-auto space-y-4">
                                        <h4 className="text-2xl font-black uppercase italic tracking-tight text-slate-800">
                                            Peso Inicial de la Pieza ($W_i$ o $W_m$)
                                        </h4>
                                        <p className="text-slate-400 text-[10px] font-bold uppercase leading-normal tracking-wide">
                                            Coloque el músculo limpio en la balanza. Los ingredientes se calcularán de manera lineal sobre el peso neto de esta pieza.
                                        </p>
                                        <div className="flex items-end justify-center gap-2">
                                            <input 
                                                type="number"
                                                className="text-6xl font-mono font-black w-72 text-center border-b-8 border-slate-900 outline-none text-slate-800"
                                                placeholder="0"
                                                value={asistente.pesoPiezaInput}
                                                onChange={e => setAsistente(p => ({ ...p, pesoPiezaInput: e.target.value }))}
                                                autoFocus
                                            />
                                            <span className="text-3xl font-black text-slate-300 italic mb-2">g</span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-4 max-w-md mx-auto pt-6">
                                    <Button onClick={() => setAsistente({ active: false, step: 1 })} variant="secondary" className="flex-1 py-4 text-xs font-black uppercase">
                                        Abortar
                                    </Button>
                                    <Button 
                                        onClick={handleScaleIngredients} 
                                        variant="success" 
                                        className="flex-1 py-4 text-xs font-black uppercase"
                                        disabled={!(asistente.pesoMagroInput || asistente.pesoPiezaInput)}
                                    >
                                        Continuar <ArrowRight size={14} />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: INTERACTIVE WEIGHING CHECKLIST */}
                        {asistente.step === 3 && (
                            <div className="p-8">
                                <h4 className="text-xl font-black uppercase italic text-center mb-2 text-slate-800">
                                    Orden de Pesada Secuencial
                                </h4>
                                <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-6">
                                    Pese los insumos en el orden y cantidad indicados. Presione el botón verde para confirmar cada ingrediente.
                                </p>

                                {/* Brine Summary if Injected */}
                                {asistente.brineDetails && (
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-6 grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <span className="text-slate-400 text-[8px] font-black uppercase">Volumen Salmuera</span>
                                            <p className="font-mono font-black text-slate-700 mt-0.5">{asistente.brineDetails.w_salmuera} g</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 text-[8px] font-black uppercase">Agua Helada (Mixer)</span>
                                            <p className="font-mono font-black text-blue-700 mt-0.5">{asistente.brineDetails.waterG} g</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 text-[8px] font-black uppercase">Aditivos disueltos</span>
                                            <p className="font-mono font-black text-slate-700 mt-0.5">{asistente.brineDetails.aditivosG} g</p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {asistente.scaledDetails.map((d, i) => {
                                        const ing = ingredients.find(ing => ing.id === d.ingredientId);
                                        const isCompleted = !!asistente.checklistCompleted[d.ingredientId];
                                        const cat = CATEGORIAS_TECNOLOGICAS[d.categoria_tecnologica || 'aditivo'];
                                        
                                        return (
                                            <div 
                                                key={i} 
                                                onClick={() => {
                                                    setAsistente(p => ({
                                                        ...p,
                                                        checklistCompleted: {
                                                            ...p.checklistCompleted,
                                                            [d.ingredientId]: !isCompleted
                                                        }
                                                    }));
                                                }}
                                                className={`p-5 rounded-2xl border-2 flex justify-between items-center transition-all cursor-pointer ${
                                                    isCompleted 
                                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 opacity-60' 
                                                        : 'bg-white border-slate-100 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                                                        isCompleted ? 'bg-emerald-600 border-emerald-700 text-white' : 'border-slate-300 bg-slate-50'
                                                    }`}>
                                                        {isCompleted ? <Check size={16} /> : <span className="text-xs font-mono font-bold">{d.secuencia_mezcla || i+1}</span>}
                                                    </div>
                                                    <div>
                                                        <div className="flex gap-2 items-center">
                                                            <span className="font-black text-sm uppercase italic text-slate-800">
                                                                {ing?.name || 'Agua Filtrada/Helada'}
                                                            </span>
                                                            <span className={`text-[7px] px-1.5 py-0.5 rounded uppercase font-black ${cat?.color}`}>
                                                                {d.categoria_tecnologica}
                                                            </span>
                                                        </div>
                                                        {asistente.recetaSelected.familia_tecnologica === 'salazon_inyectada' && d.secuencia_mezcla && (
                                                            <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">
                                                                {d.secuencia_mezcla === 1 && "Paso 1: Cargar en el mixer vaciando hielo/agua."}
                                                                {d.secuencia_mezcla === 2 && "Paso 2: Disolver completamente antes de ingresar sal."}
                                                                {d.secuencia_mezcla === 3 && "Paso 3: Añadir una vez disueltos los fosfatos."}
                                                                {d.secuencia_mezcla >= 4 && "Paso 4+: Incorporar solutos restantes en agitación lenta."}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right flex items-center gap-4">
                                                    <p className="font-mono text-3xl font-black">
                                                        {d.gramos_calculados.toLocaleString('es-AR')}<span className="text-base text-slate-400 font-bold ml-1">g</span>
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex gap-4 pt-8">
                                    <Button onClick={() => setAsistente(p => ({ ...p, step: 2 }))} variant="secondary" className="flex-1 py-4 text-xs font-black uppercase">
                                        Atrás (Peso Base)
                                    </Button>
                                    <Button 
                                        onClick={() => setAsistente(p => ({ ...p, step: 4 }))} 
                                        variant="success" 
                                        className="flex-1 py-4 text-xs font-black uppercase"
                                        disabled={
                                            asistente.scaledDetails
                                                .filter(d => d.categoria_tecnologica !== 'magro')
                                                .some(d => !asistente.checklistCompleted[d.ingredientId])
                                        }
                                    >
                                        Ir a Control HACCP <ArrowRight size={14} />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: QUALITY & INOCUIDAD CHECKS (HACCP INITIAL LOG) */}
                        {asistente.step === 4 && (
                            <div className="p-10 max-w-xl mx-auto text-center space-y-8">
                                <div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-red-600 border border-red-200 shadow-sm">
                                    <ShieldAlert size={48} />
                                </div>

                                {asistente.recetaSelected.familia_tecnologica === 'salazon_cruda' || asistente.recetaSelected.familia_tecnologica === 'salazon_inyectada' ? (
                                    <div className="space-y-4">
                                        <h4 className="text-2xl font-black uppercase italic tracking-tight text-slate-800">
                                            Punto Crítico: Medición de pH Inicial
                                        </h4>
                                        <p className="text-slate-400 text-[10px] font-bold uppercase leading-normal tracking-wide">
                                            El pH del músculo intacto debe estar regulado antes de colgar en cámara o inyectar salmuera. Rango requerido: **5.5 y 5.9**.
                                        </p>
                                        <div className="flex items-end justify-center gap-2">
                                            <input 
                                                type="number"
                                                step="0.01"
                                                className="text-6xl font-mono font-black w-72 text-center border-b-8 border-slate-900 outline-none text-slate-800"
                                                placeholder="5.7"
                                                value={asistente.haccpVal}
                                                onChange={e => setAsistente(p => ({ ...p, haccpVal: e.target.value }))}
                                                autoFocus
                                            />
                                            <span className="text-3xl font-black text-slate-200 italic mb-2">pH</span>
                                        </div>
                                        {asistente.haccpVal && (Number(asistente.haccpVal) < 5.5 || Number(asistente.haccpVal) > 5.9) && (
                                            <div className="bg-red-100 text-red-800 p-4 rounded-xl border border-red-200 text-[10px] font-black uppercase flex items-center justify-center gap-2 animate-bounce">
                                                <AlertTriangle size={16} /> ¡PCC Crítico! pH fuera de rango inocuo.
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <h4 className="text-2xl font-black uppercase italic tracking-tight text-slate-800">
                                            Punto Crítico: Control de Temperatura de Farsa
                                        </h4>
                                        <p className="text-slate-400 text-[10px] font-bold uppercase leading-normal tracking-wide">
                                            Para evitar desestabilización coloidal (fusión de grasas), la emulsión en cutter no debe exceder los **12°C**.
                                        </p>
                                        <div className="flex items-end justify-center gap-2">
                                            <input 
                                                type="number"
                                                step="0.1"
                                                className="text-6xl font-mono font-black w-72 text-center border-b-8 border-slate-900 outline-none text-slate-800"
                                                placeholder="8.5"
                                                value={asistente.haccpVal}
                                                onChange={e => setAsistente(p => ({ ...p, haccpVal: e.target.value }))}
                                                autoFocus
                                            />
                                            <span className="text-3xl font-black text-slate-200 italic mb-2">°C</span>
                                        </div>
                                        {asistente.haccpVal && Number(asistente.haccpVal) > 12 && (
                                            <div className="bg-red-100 text-red-800 p-4 rounded-xl border border-red-200 text-[10px] font-black uppercase flex items-center justify-center gap-2 animate-bounce">
                                                <AlertTriangle size={16} /> ¡PCC Crítico! Temperatura de emulsión superior a 12°C.
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col text-left gap-1">
                                        <label className="text-[9px] text-slate-400 uppercase font-black ml-1">Código del Lote a Registrar</label>
                                        <input 
                                            type="text" 
                                            className="border rounded-lg px-3 py-2 text-sm font-semibold bg-slate-50 uppercase font-mono"
                                            value={asistente.codigoLote} 
                                            onChange={e => setAsistente(p => ({ ...p, codigoLote: e.target.value }))} 
                                        />
                                    </div>
                                    <div className="flex flex-col text-left gap-1">
                                        <label className="text-[9px] text-slate-400 uppercase font-black ml-1">Vencimiento Calculado</label>
                                        <input 
                                            type="date" 
                                            className="border rounded-lg px-3 py-2 text-sm font-semibold bg-slate-50 font-mono"
                                            value={asistente.fechaVencimiento} 
                                            onChange={e => setAsistente(p => ({ ...p, fechaVencimiento: e.target.value }))} 
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <Button onClick={() => setAsistente(p => ({ ...p, step: 3 }))} variant="secondary" className="flex-1 py-4 text-xs font-black uppercase">
                                        Atrás (Verificación)
                                    </Button>
                                    <Button 
                                        onClick={() => setAsistente(p => ({ ...p, step: 5 }))} 
                                        variant="success" 
                                        className="flex-1 py-4 text-xs font-black uppercase"
                                    >
                                        Confirmar Mezclado <ArrowRight size={14} />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* STEP 5: CONFIRMACION DE COLGADO / ETIQUETADO */}
                        {asistente.step === 5 && (
                            <div className="p-10 text-center space-y-8 max-w-xl mx-auto">
                                <div className="bg-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-200 shadow-inner">
                                    <CheckCircle2 size={56} />
                                </div>
                                <h4 className="text-3xl font-black uppercase italic tracking-tight text-slate-800">
                                    ¡Mezcla y Formulación Listas!
                                </h4>
                                <p className="text-slate-400 text-xs font-bold leading-normal">
                                    Se ha auditado la inocuidad y la dosificación cárnica. Al finalizar, el lote se colgará virtualmente en la cámara de secado con el estado **EN SECADO** y se actualizará el stock de insumos mediante descuento FEFO.
                                </p>

                                <div className="bg-slate-50 border p-5 rounded-2xl text-left space-y-3 font-medium text-xs text-slate-700">
                                    <div className="flex justify-between border-b pb-2"><b>Lote:</b> <span className="font-mono text-blue-700 font-bold">{asistente.codigoLote}</span></div>
                                    <div className="flex justify-between border-b pb-2"><b>Carga inicial:</b> <span className="font-mono text-slate-900 font-bold">{
                                        asistente.scaledDetails.reduce((a,b) => a + b.gramos_calculados, 0).toLocaleString('es-AR')
                                    } g</span></div>
                                    <div className="flex justify-between pb-1"><b>Curing Lead Time:</b> <span className="font-mono text-slate-900 font-bold">{asistente.recetaSelected.lead_time_dias} días</span></div>
                                </div>

                                <div className="flex gap-4">
                                    <Button onClick={() => setAsistente(p => ({ ...p, step: 4 }))} variant="secondary" className="flex-1 py-4 text-xs font-black">
                                        Atrás (HACCP)
                                    </Button>
                                    <Button onClick={handleSaveLoteAsistente} variant="success" className="flex-1 py-4 text-xs font-black">
                                        Colgar Lote en Cámara
                                    </Button>
                                </div>
                            </div>
                        )}

                    </Card>
                </div>
            )}

            {/* VISTA DE ETIQUETA IMPRIMIBLE (MODAL FLOTANTE) */}
            {printedLabel && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 print:p-0 print:static print:bg-white print:z-auto">
                    <div className="bg-white border-[12px] border-slate-900 rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl print:border-none print:shadow-none print:rounded-none print:p-0">
                        <div className="border-b-[6px] border-slate-900 pb-4 mb-6">
                            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">{printedLabel.title}</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">PRODUCTO CERTIFICADO ARTESANAL</p>
                        </div>

                        <div className="space-y-3 text-left border-b border-dashed pb-6 mb-6">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-bold uppercase">SKU:</span>
                                <span className="font-mono font-black text-slate-800">{printedLabel.sku}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-bold uppercase">Lote:</span>
                                <span className="font-mono font-black text-blue-700">{printedLabel.lote}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-bold uppercase">Peso Neto:</span>
                                <span className="font-mono font-black text-slate-900">{printedLabel.peso}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-bold uppercase">Elaborado:</span>
                                <span className="font-mono font-black text-slate-800">{printedLabel.ingreso}</span>
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
                            <p className="text-[8px] font-mono text-slate-400 uppercase">Escanear para trazabilidad FEFO</p>
                        </div>

                        <div className="flex gap-3 justify-end mt-8 pt-4 border-t print:hidden">
                            <Button onClick={() => window.print()} variant="success">Imprimir</Button>
                            <Button onClick={() => setPrintedLabel(null)} variant="secondary">Cerrar</Button>
                        </div>
                    </div>
                </div>
            )}

            <BulkImportModal
                isOpen={showBulkImport}
                onClose={() => setShowBulkImport(false)}
                type="charc_recetas"
                ingredients={ingredients}
                charcRecetas={charcRecetas}
                showToast={showToast}
                onSuccess={{ setCharcRecetas }}
            />
        </div>
    );
}
