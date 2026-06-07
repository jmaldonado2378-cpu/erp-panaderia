'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { 
    ThermometerSun, Plus, Scale, Calendar, User, ClipboardList, 
    Droplet, ShieldAlert, Award, FileText, CheckCircle2, QrCode, Play,
    Trash2, Wrench, Info, Clock, ArrowRight, ChevronRight, Coins, AlertTriangle, Check, RotateCcw,
    Eye, ChevronUp, ChevronDown, Search, Printer
} from 'lucide-react';
import { Card, Button, Input, Select } from '../bakery_erp';
import BulkImportModal from '../BulkImportModal';
import { useGlobalContext } from '../context/GlobalContext';

const FAMILIAS_CHARC = {
    fermentado_seco: { id: 'fermentado_seco', nombre: 'Fermentados Secos (Madurados)', color: 'bg-red-700', text: 'text-red-700', border: 'border-red-700' },
    salazon_cruda: { id: 'salazon_cruda', nombre: 'Salazones de Pieza Entera', color: 'bg-amber-600', text: 'text-amber-600', border: 'border-amber-600' },
    emulsion_fina: { id: 'emulsion_fina', nombre: 'Emulsiones Finas Escaldadas', color: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-600' },
    salazon_inyectada: { id: 'salazon_inyectada', nombre: 'Salazones con Inyección (Cocidos)', color: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-600' },
    embutido_fresco: { id: 'embutido_fresco', nombre: 'Embutidos Frescos (Sin Cámara)', color: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-600' }
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
    charcRecetas = [], addCharcReceta, setCharcRecetas, updateCharcReceta, deleteCharcReceta,
    charcLotes = [], addCharcLote, 
    charcLogs = [], addCharcLog, 
    updateCharcLoteEstado,
    ingredients = [], showToast,
    initialTab = 'lotes',
    hideMaduracionTab = false
}) {
    const { config } = useGlobalContext();
    const [tab, setTab] = useState(initialTab);
    const [showAddReceta, setShowAddReceta] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Sorting and searching states for recetas tab
    const [searchTerm, setSearchTerm] = useState('');
    const [sortKey, setSortKey] = useState('nombre');
    const [sortDesc, setSortDesc] = useState(false);

    const handleSort = (key) => {
        if (sortKey === key) {
            setSortDesc(!sortDesc);
        } else {
            setSortKey(key);
            setSortDesc(false);
        }
    };

    const renderSortIndicator = (targetKey) => {
        if (sortKey !== targetKey) return null;
        return sortDesc ? ' ↓' : ' ↑';
    };

    const processedRecetas = useMemo(() => {
        const list = charcRecetas.map(r => {
            const fam = r.familia_tecnologica;
            const curado_salado = fam === 'salazon_cruda' ? Number(r.tiempo_curado_salado_dias || 0) : 0;
            const estufado = fam === 'fermentado_seco' ? Number(r.tiempo_estufado_dias || 0) : 0;
            const curado_salmuera = fam === 'salazon_inyectada' ? Number(r.tiempo_curado_salmuera_dias || 0) : 0;
            const maduracion = (fam === 'salazon_cruda' || fam === 'fermentado_seco') ? Number(r.dias_maduracion || 0) : 0;

            let derivedLeadTime = 0;
            if (fam === 'salazon_cruda') {
                derivedLeadTime = curado_salado + maduracion;
            } else if (fam === 'fermentado_seco') {
                derivedLeadTime = estufado + maduracion;
            } else if (fam === 'salazon_inyectada') {
                derivedLeadTime = curado_salmuera;
            } else if (fam === 'embutido_fresco' || fam === 'emulsion_fina') {
                derivedLeadTime = 1;
            }

            const derivedMerma = (fam === 'emulsion_fina' || fam === 'embutido_fresco') ? 0 : Number(r.merma_secado_objetivo || 0);

            const totalBatchCost = r.details ? r.details.reduce((acc, d) => {
                const ing = ingredients.find(i => i.id === d.ingredientId);
                const costPerGram = Number(ing?.costo_estandar || ing?.costPerGram || 0);
                return acc + (Number(d.gramos || 0) * costPerGram);
            }, 0) : 0;
            const batchWeight = Number(r.tamano_lote_kg || 10) * 1000;
            const t_prep = Number(r.tiempo_preparacion || 30);
            const costo_mo = (t_prep / 60) * (config?.finanzas?.costoHoraHombre || 4500);
            const costo_camara = maduracion * (config?.finanzas?.costoDiaCamara || 150);
            const totalCostOfBatch = totalBatchCost + costo_mo + costo_camara;
            const finalWeightKg = (batchWeight * (1 - derivedMerma / 100)) / 1000;
            const costPerUnit = finalWeightKg > 0 ? totalCostOfBatch / finalWeightKg : 0;

            return {
                ...r,
                lead_time_dias: derivedLeadTime,
                merma_secado_objetivo: derivedMerma,
                totalBatchCost,
                batchWeight,
                t_prep,
                d_maduracion: maduracion,
                costo_mo,
                costo_camara,
                totalCostOfBatch,
                merma: derivedMerma,
                finalWeightKg,
                costPerUnit
            };
        });

        // Filter
        let result = list;
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            result = result.filter(r => 
                r.nombre?.toLowerCase().includes(q) ||
                r.codigo?.toLowerCase().includes(q) ||
                r.familia_tecnologica?.toLowerCase().includes(q)
            );
        }

        // Sort
        if (sortKey) {
            result.sort((a, b) => {
                let valA = a[sortKey];
                let valB = b[sortKey];

                if (sortKey === 'lead_time_dias' || sortKey === 'merma_secado_objetivo' || sortKey === 'costPerUnit') {
                    valA = Number(valA || 0);
                    valB = Number(valB || 0);
                    return sortDesc ? valB - valA : valA - valB;
                }

                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();
                return sortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
            });
        }

        return result;
    }, [charcRecetas, searchTerm, sortKey, sortDesc, config, ingredients]);

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
        id: null,
        codigo: '',
        nombre: '',
        familia_tecnologica: 'fermentado_seco',
        porcentaje_inyeccion: '',
        lead_time_dias: 30,
        merma_secado_objetivo: 35,
        tiempo_preparacion: 30,
        dias_maduracion: 21,
        tiempo_curado_salado_dias: 0,
        tiempo_estufado_dias: 0,
        tiempo_curado_salmuera_dias: 0,
        tiempo_coccion_mins: 0,
        tamano_lote_kg: 10.0,
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

    // --- Estados para Transiciones de Cámaras ---
    const [transitioningLote, setTransitioningLote] = useState(null); // { lote, targetStage }
    const [transitionForm, setTransitionForm] = useState({
        peso_real_g: '',
        temperatura_c: '12',
        humedad_pct: '75',
        pH: '5.7',
        operario: 'Supervisor Planta',
        observaciones: ''
    });

    // --- Estado para etiqueta flotante imprimible ---
    const [printedLabel, setPrintedLabel] = useState(null);

    // --- Estado para expansión de recetas en formato tabla ---
    const [expandedRecipes, setExpandedRecipes] = useState({});
    const toggleRecipeExpanded = (id) => {
        setExpandedRecipes(prev => ({ ...prev, [id]: !prev[id] }));
    };

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

        if (recetaForm.familia_tecnologica === 'fermentado_seco' || recetaForm.familia_tecnologica === 'emulsion_fina' || recetaForm.familia_tecnologica === 'embutido_fresco') {
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

    const handleSaveReceta = async () => {
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
        const baseRef = Number(recetaForm.tamano_lote_kg || 10) * 1000;
        
        const detailsMapped = recetaForm.details
            .filter(d => d.ingredientId && d.porcentaje_base)
            .map(d => ({
                ingredientId: d.ingredientId,
                porcentaje_base: Number(d.porcentaje_base),
                categoria_tecnologica: d.categoria_tecnologica,
                secuencia_mezcla: Number(d.secuencia_mezcla || 1),
                gramos: Number(((Number(d.porcentaje_base) / 100) * baseRef).toFixed(2))
            }));

        const fam = recetaForm.familia_tecnologica;
        const curado_salado = fam === 'salazon_cruda' ? Number(recetaForm.tiempo_curado_salado_dias || 0) : 0;
        const estufado = fam === 'fermentado_seco' ? Number(recetaForm.tiempo_estufado_dias || 0) : 0;
        const curado_salmuera = fam === 'salazon_inyectada' ? Number(recetaForm.tiempo_curado_salmuera_dias || 0) : 0;
        const coccion = (fam === 'salazon_inyectada' || fam === 'emulsion_fina') ? Number(recetaForm.tiempo_coccion_mins || 0) : 0;
        const maduracion = (fam === 'salazon_cruda' || fam === 'fermentado_seco') ? Number(recetaForm.dias_maduracion || 0) : 0;

        let derivedLeadTime = 0;
        if (fam === 'salazon_cruda') {
            derivedLeadTime = curado_salado + maduracion;
        } else if (fam === 'fermentado_seco') {
            derivedLeadTime = estufado + maduracion;
        } else if (fam === 'salazon_inyectada') {
            derivedLeadTime = curado_salmuera;
        }

        const receta = {
            codigo: recetaForm.codigo.toUpperCase(),
            nombre: recetaForm.nombre,
            lead_time_dias: derivedLeadTime,
            merma_secado_objetivo: (fam === 'emulsion_fina' || fam === 'embutido_fresco') ? 0 : Number(recetaForm.merma_secado_objetivo || 0),
            familia_tecnologica: fam,
            porcentaje_inyeccion: fam === 'salazon_inyectada' ? Number(recetaForm.porcentaje_inyeccion) : null,
            tiempo_preparacion: Number(recetaForm.tiempo_preparacion || 30),
            dias_maduracion: maduracion,
            tiempo_curado_salado_dias: curado_salado,
            tiempo_estufado_dias: estufado,
            tiempo_curado_salmuera_dias: curado_salmuera,
            tiempo_coccion_mins: coccion,
            tamano_lote_kg: Number(recetaForm.tamano_lote_kg || 10.0),
            version: 1
        };

        try {
            if (recetaForm.id) {
                await updateCharcReceta(recetaForm.id, receta, detailsMapped);
            } else {
                await addCharcReceta(receta, detailsMapped);
            }
        } catch (err) {
            console.error('Error guardando ficha:', err);
            return; // No cerrar el modal si falló
        }
        setShowAddReceta(false);
        setRecetaForm({
            id: null,
            codigo: '',
            nombre: '',
            familia_tecnologica: 'fermentado_seco',
            porcentaje_inyeccion: '',
            lead_time_dias: 30,
            merma_secado_objetivo: 35,
            tiempo_preparacion: 30,
            dias_maduracion: 21,
            tiempo_curado_salado_dias: 0,
            tiempo_estufado_dias: 0,
            tiempo_curado_salmuera_dias: 0,
            tiempo_coccion_mins: 0,
            tamano_lote_kg: 10.0,
            details: [{ ingredientId: '', categoria_tecnologica: 'magro', porcentaje_base: '', secuencia_mezcla: 1 }]
        });
    };

    const handleEditReceta = (rec) => {
        setRecetaForm({
            id: rec.id,
            codigo: rec.codigo || '',
            nombre: rec.nombre,
            familia_tecnologica: rec.familia_tecnologica || 'fermentado_seco',
            porcentaje_inyeccion: rec.porcentaje_inyeccion || '',
            lead_time_dias: rec.lead_time_dias || 30,
            merma_secado_objetivo: rec.merma_secado_objetivo || 35,
            tiempo_preparacion: rec.tiempo_preparacion || 30,
            dias_maduracion: rec.dias_maduracion || 0,
            tiempo_curado_salado_dias: rec.tiempo_curado_salado_dias || 0,
            tiempo_estufado_dias: rec.tiempo_estufado_dias || 0,
            tiempo_curado_salmuera_dias: rec.tiempo_curado_salmuera_dias || 0,
            tiempo_coccion_mins: rec.tiempo_coccion_mins || 0,
            tamano_lote_kg: rec.tamano_lote_kg || 10.0,
            details: rec.details ? rec.details.map(d => ({
                ingredientId: d.ingredientId || '',
                categoria_tecnologica: d.categoria_tecnologica || 'aditivo',
                porcentaje_base: d.porcentaje_base != null ? d.porcentaje_base.toString() : '',
                secuencia_mezcla: d.secuencia_mezcla || 1
            })) : [{ ingredientId: '', categoria_tecnologica: 'magro', porcentaje_base: '', secuencia_mezcla: 1 }]
        });
        setShowAddReceta(true);
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleDeleteReceta = (id) => {
        if (confirm("¿Eliminar Ficha de Charcutería permanentemente de la Nube?")) {
            deleteCharcReceta(id);
        }
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
        let calculatedBrineDetails = null;

        if (rec.familia_tecnologica === 'fermentado_seco' || rec.familia_tecnologica === 'emulsion_fina' || rec.familia_tecnologica === 'embutido_fresco') {
            // Algoritmo 1: Determinación de la Masa Cárnica Base (MC) con Opción 1 (Peso Total de Mezcla Cárnica)
            const mcTotal = Number(asistente.pesoMagroInput); // peso de mezcla cárnica total (magro + grasa)
            baseWeightG = mcTotal;

            scaled = rec.details.map(d => ({
                ...d,
                gramos_calculados: Math.round((mcTotal * Number(d.porcentaje_base || 0)) / 100)
            }));
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

            calculatedBrineDetails = {
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
            brineDetails: calculatedBrineDetails,
            step: 3
        }));
    };

    const handleSaveLoteAsistente = async () => {
        if (!asistente.codigoLote) {
            showToast("Código de lote es obligatorio", "error");
            return;
        }

        const rec = asistente.recetaSelected;
        const totalFarsaG = asistente.scaledDetails
            .filter(d => d.categoria_tecnologica !== 'empaque')
            .reduce((acc, d) => acc + Number(d.gramos_calculados || 0), 0);

        const lote = {
            receta_id: rec.id,
            codigo_lote: asistente.codigoLote.toUpperCase(),
            peso_inicial_g: Math.round(totalFarsaG),
            peso_actual_g: Math.round(totalFarsaG),
            estado: 'PREPARACION',
            fecha_ingreso: new Date().toISOString(),
            fecha_vencimiento: asistente.fechaVencimiento
        };

        try {
            // Guardar lote y obtener el lote guardado (con su ID persistido)
            const savedLote = await addCharcLote(lote);

            // Si se cargó un valor de control (pH o temp cutter) y el lote se guardó correctamente
            if (asistente.haccpVal && savedLote) {
                await addCharcLog({
                    lote_id: savedLote.id,
                    peso_real_g: Math.round(totalFarsaG),
                    temperatura_c: rec.familia_tecnologica === 'emulsion_fina' ? Number(asistente.haccpVal) : 12.0,
                    humedad_pct: 75.0,
                    operario: 'Sistema MES',
                    observaciones: `Registro inicial de control. PCC inicial cargado: ${asistente.haccpVal} ${rec.familia_tecnologica === 'salazon_cruda' ? 'pH' : '°C cutter'}`
                });
            }

            setAsistente({ active: false, step: 1, recetaSelected: null, scaledDetails: [] });
            setTab('lotes');
        } catch (err) {
            console.error("Error guardando lote asistente:", err);
            showToast("Error al guardar lote en la base de datos: " + (err.message || err), "error");
        }
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
            peso: `${(lote.peso_actual_g || 0).toLocaleString()} g`,
            ingreso: new Date(lote.fecha_ingreso || Date.now()).toLocaleDateString('es-AR'),
            vencimiento: lote.fecha_vencimiento ? new Date(lote.fecha_vencimiento).toLocaleDateString('es-AR') : 'S/D',
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
                    </div>

                    {/* BOARD KANBAN DE 5 ETAPAS */}
                    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 overflow-x-auto pb-6">
                        {[
                            { id: 'PREPARACION', title: '1. Preparación', desc: 'Pesaje y mezclas iniciales' },
                            { id: 'CURADO', title: '2. Curado / Salado', desc: 'Salazón y estabilización' },
                            { id: 'ESTUFADO', title: '3. Estufado', desc: 'Fermentación inicial' },
                            { id: 'MADURACION', title: '4. Maduración', desc: 'Drying y merma objetivo' },
                            { id: 'COCCION', title: '5. Cocción', desc: 'Tratamiento térmico final' }
                        ].map(col => {
                            const lotesEnCol = charcLotes.filter(l => {
                                const rec = charcRecetas.find(r => r.id === l.receta_id);
                                let etapa = l.estado;
                                if (!etapa || etapa === 'EN_SECADO') {
                                    const fam = rec?.familia_tecnologica;
                                    if (fam === 'embutido_fresco') {
                                        etapa = 'CURADO_LISTO';
                                    } else if (fam === 'emulsion_fina' || fam === 'salazon_inyectada') {
                                        etapa = 'COCCION';
                                    } else {
                                        etapa = 'MADURACION';
                                    }
                                }
                                return etapa === col.id;
                            });

                            const getNextStage = (lote, rec) => {
                                const fam = rec?.familia_tecnologica;
                                if (lote.estado === 'PREPARACION') {
                                    if (fam === 'embutido_fresco') return 'CURADO_LISTO';
                                    if (fam === 'salazon_cruda' || fam === 'salazon_inyectada') return 'CURADO';
                                    if (fam === 'fermentado_seco') return 'ESTUFADO';
                                    if (fam === 'emulsion_fina') return 'COCCION';
                                    return 'CURADO';
                                }
                                if (lote.estado === 'CURADO') {
                                    if (fam === 'salazon_cruda') return 'MADURACION';
                                    if (fam === 'salazon_inyectada') return 'COCCION';
                                    return 'MADURACION';
                                }
                                if (lote.estado === 'ESTUFADO') {
                                    return 'MADURACION';
                                }
                                return 'CURADO_LISTO';
                            };

                            return (
                                <div key={col.id} className="bg-slate-100/70 p-3 rounded-2xl border border-slate-200 min-h-[450px] flex flex-col w-full min-w-[240px]">
                                    <div className="mb-3">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-800">{col.title}</h4>
                                            <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-[9px] font-bold">{lotesEnCol.length}</span>
                                        </div>
                                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{col.desc}</p>
                                    </div>

                                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-1">
                                        {lotesEnCol.map(l => {
                                            const rec = charcRecetas.find(r => r.id === l.receta_id);
                                            const pesoInicial = l.peso_inicial_g || 1; // Guard against division by zero
                                            const pesoActual = l.peso_actual_g || 0;
                                            const mermaReal = ((1 - pesoActual / pesoInicial) * 100);
                                            const targetMerma = rec?.merma_secado_objetivo || 35.00;
                                            const percentToGoal = targetMerma > 0 ? (mermaReal / targetMerma) * 100 : 0;
                                            const isCured = mermaReal >= targetMerma;
                                            const familyData = FAMILIAS_CHARC[rec?.familia_tecnologica || 'fermentado_seco'];
                                            
                                            // Time calculations (safe date parsing)
                                            const ingresoParsed = l.fecha_ingreso ? new Date(l.fecha_ingreso).getTime() : Date.now();
                                            const elapsedDays = isMounted ? Math.max(0, Math.floor((Date.now() - ingresoParsed) / (24 * 60 * 60 * 1000))) : 0;
                                            const elapsedMinutes = isMounted ? Math.max(0, Math.floor((Date.now() - ingresoParsed) / 60000)) : 0;

                                            
                                            let timeStatus = "";
                                            let timeTargetMet = false;
                                            
                                            if (col.id === 'CURADO') {
                                                const reqDays = rec?.familia_tecnologica === 'salazon_cruda' ? (rec?.tiempo_curado_salado_dias || 7) : (rec?.tiempo_curado_salmuera_dias || 3);
                                                timeStatus = `${elapsedDays}d / ${reqDays}d curado`;
                                                timeTargetMet = elapsedDays >= reqDays;
                                            } else if (col.id === 'ESTUFADO') {
                                                const reqDays = rec?.tiempo_estufado_dias || 2;
                                                timeStatus = `${elapsedDays}d / ${reqDays}d estufado`;
                                                timeTargetMet = elapsedDays >= reqDays;
                                            } else if (col.id === 'MADURACION') {
                                                const reqDays = rec?.dias_maduracion || 21;
                                                timeStatus = `${elapsedDays}d / ${reqDays}d secado`;
                                                timeTargetMet = elapsedDays >= reqDays;
                                            } else if (col.id === 'COCCION') {
                                                const reqMins = rec?.tiempo_coccion_mins || 90;
                                                timeStatus = `${elapsedMinutes}m / ${reqMins}m cocción`;
                                                timeTargetMet = elapsedMinutes >= reqMins;
                                            }

                                            // Determine next stage
                                            const nextStage = getNextStage(l, rec);

                                            return (
                                                <div key={l.id} className={`bg-white p-3 rounded-xl border shadow-sm transition-all hover:shadow-md ${isCured && col.id === 'MADURACION' ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200'}`}>
                                                    <div className="flex justify-between items-start gap-1.5 border-b pb-1.5 mb-2">
                                                        <div className="min-w-0 flex-1">
                                                            <h5 className="text-[10px] font-black text-slate-800 truncate leading-tight" title={rec?.nombre}>{rec?.nombre || 'Charcutería'}</h5>
                                                            <span className="text-[8px] font-mono text-slate-400 font-bold block mt-0.5">{l.codigo_lote}</span>
                                                        </div>
                                                        <span className={`px-1.5 py-0.5 rounded text-[7px] font-black text-white shrink-0 ${familyData?.color}`}>
                                                            {rec?.codigo || 'LOTE'}
                                                        </span>
                                                    </div>

                                                    <div className="space-y-1.5 text-[9px] font-bold text-slate-600">
                                                        <div className="flex justify-between">
                                                            <span>Peso Crudo:</span>
                                                            <span className="font-mono text-slate-800">{(l.peso_inicial_g || 0).toLocaleString()} g</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Peso Actual:</span>
                                                            <span className="font-mono text-slate-800">{(l.peso_actual_g || 0).toLocaleString()} g</span>
                                                        </div>
                                                        
                                                        {/* Deshidratación / Merma para Maduración */}
                                                        {col.id === 'MADURACION' && (
                                                            <div className="space-y-1 mt-1">
                                                                <div className="flex justify-between text-[8px] text-slate-400 uppercase">
                                                                    <span>Merma:</span>
                                                                    <span className={isCured ? 'text-emerald-600 font-black' : 'text-slate-600'}>
                                                                        {mermaReal.toFixed(1)}% / {targetMerma}%
                                                                    </span>
                                                                </div>
                                                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                    <div className={`h-full rounded-full ${isCured ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${Math.min(100, percentToGoal)}%` }} />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Tiempo transcurrido */}
                                                        {timeStatus && (
                                                            <div className="flex justify-between items-center mt-1 bg-slate-50 px-1 py-0.5 rounded border">
                                                                <span className="text-[8px] uppercase text-slate-400">Tiempo:</span>
                                                                <span className={`font-mono text-[8px] flex items-center gap-1 ${timeTargetMet ? 'text-emerald-600 font-black' : 'text-amber-600'}`}>
                                                                    <Clock size={8} /> {timeStatus}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex gap-1.5 mt-3 pt-2 border-t">
                                                        {/* Button for transition */}
                                                        {col.id === 'PREPARACION' && (
                                                            <Button 
                                                                onClick={() => {
                                                                    setTransitioningLote({ lote: l, targetStage: nextStage });
                                                                    setTransitionForm(prev => ({ ...prev, peso_real_g: l.peso_inicial_g }));
                                                                }}
                                                                className="flex-1 py-1 text-[8px] font-black uppercase"
                                                                variant="primary"
                                                            >
                                                                Confirmar Pesaje
                                                            </Button>
                                                        )}
                                                        {col.id === 'CURADO' && (
                                                            <Button 
                                                                onClick={() => {
                                                                    setTransitioningLote({ lote: l, targetStage: nextStage });
                                                                    setTransitionForm(prev => ({ ...prev, peso_real_g: l.peso_actual_g }));
                                                                }}
                                                                className="flex-1 py-1 text-[8px] font-black uppercase"
                                                                variant={timeTargetMet ? "success" : "warning"}
                                                            >
                                                                {nextStage === 'MADURACION' ? 'A Maduración' : 'A Cocción'}
                                                            </Button>
                                                        )}
                                                        {col.id === 'ESTUFADO' && (
                                                            <Button 
                                                                onClick={() => {
                                                                    setTransitioningLote({ lote: l, targetStage: nextStage });
                                                                    setTransitionForm(prev => ({ ...prev, peso_real_g: l.peso_actual_g }));
                                                                }}
                                                                className="flex-1 py-1 text-[8px] font-black uppercase"
                                                                variant={timeTargetMet ? "success" : "warning"}
                                                            >
                                                                Pasar a Secado
                                                            </Button>
                                                        )}
                                                        {col.id === 'MADURACION' && (
                                                            <Button 
                                                                onClick={() => {
                                                                    setTransitioningLote({ lote: l, targetStage: nextStage });
                                                                    setTransitionForm(prev => ({ ...prev, peso_real_g: l.peso_actual_g }));
                                                                }}
                                                                className="flex-1 py-1 text-[8px] font-black uppercase"
                                                                variant={isCured ? "success" : "secondary"}
                                                            >
                                                                Liberar Lote
                                                            </Button>
                                                        )}
                                                        {col.id === 'COCCION' && (
                                                            <Button 
                                                                onClick={() => {
                                                                    setTransitioningLote({ lote: l, targetStage: nextStage });
                                                                    setTransitionForm(prev => ({ ...prev, peso_real_g: l.peso_actual_g }));
                                                                }}
                                                                className="flex-1 py-1 text-[8px] font-black uppercase"
                                                                variant="success"
                                                            >
                                                                Liberar Lote
                                                            </Button>
                                                        )}
                                                        <Button onClick={() => triggerPrint(l, rec)} className="py-1 px-2 shrink-0" variant="ghost">
                                                            <QrCode size={12} />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {lotesEnCol.length === 0 && (
                                            <p className="text-[9px] text-slate-400 italic text-center py-8">Sin lotes en esta etapa</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* MODAL DE TRANSICIÓN DE ETAPA */}
                    {transitioningLote && (
                        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
                            <Card className="p-8 border-[6px] border-slate-900 bg-white shadow-2xl rounded-3xl max-w-md w-full">
                                <h4 className="text-lg font-black uppercase italic mb-2 text-slate-800">
                                    {transitioningLote.targetStage === 'CURADO_LISTO' ? 'Liberación de Lote' : 'Transición de Etapa'}
                                </h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest border-b pb-3 mb-5">
                                    Lote: {transitioningLote.lote.codigo_lote} | Siguiente Etapa: {transitioningLote.targetStage.replace('_', ' ')}
                                </p>

                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    const { lote, targetStage } = transitioningLote;
                                    const weight = transitionForm.peso_real_g ? Number(transitionForm.peso_real_g) : lote.peso_actual_g;
                                    const temp = transitionForm.temperatura_c ? Number(transitionForm.temperatura_c) : 12.0;
                                    const hum = transitionForm.humedad_pct ? Number(transitionForm.humedad_pct) : 75.0;
                                    const pH = transitionForm.pH ? Number(transitionForm.pH) : null;
                                    const obs = transitionForm.observaciones || '';

                                    // 1. Intentar guardar el log — si falla, NO bloquear la transición
                                    try {
                                        const log = {
                                            lote_id: lote.id,
                                            peso_real_g: weight,
                                            temperatura_c: temp,
                                            humedad_pct: hum,
                                            operario: transitionForm.operario || 'Supervisor Planta',
                                            observaciones: `Transición a ${targetStage}. ${obs} ${pH ? `[pH registrado: ${pH}]` : ''}`
                                        };
                                        await addCharcLog(log);
                                    } catch (logErr) {
                                        console.warn("Log de transición falló, continuando con cambio de estado:", logErr?.message);
                                    }

                                    // 2. Actualizar estado — esto es crítico y SIEMPRE se ejecuta
                                    try {
                                        await updateCharcLoteEstado(lote.id, targetStage, weight);
                                        setTransitioningLote(null);
                                        setTransitionForm({ peso_real_g: '', temperatura_c: '12', humedad_pct: '75', pH: '5.7', operario: 'Supervisor Planta', observaciones: '' });
                                        showToast(`✅ Lote ${lote.codigo_lote} → ${targetStage}`);
                                    } catch (stateErr) {
                                        console.error("Error actualizando estado del lote:", stateErr);
                                        showToast("Error al actualizar estado: " + (stateErr?.message || stateErr), "error");
                                    }
                                }} className="space-y-4">
                                    
                                    {/* 1. If transitioning from PREPARACION or to CURADO_LISTO (final release), we need the measured weight */}
                                    {(transitioningLote.lote.estado === 'PREPARACION' || transitioningLote.targetStage === 'CURADO_LISTO' || transitioningLote.lote.estado === 'COCCION') && (
                                        <Input 
                                            label={transitioningLote.targetStage === 'CURADO_LISTO' ? "Peso Final Post-Proceso (g)" : "Confirmar Peso Inicial (g)"}
                                            type="number"
                                            placeholder="Ej. 10250"
                                            value={transitionForm.peso_real_g}
                                            onChange={v => setTransitionForm({ ...transitionForm, peso_real_g: v })}
                                            required
                                        />
                                    )}

                                    {/* 2. If transitioning to MADURACION (from ESTUFADO) or to CURADO_LISTO (from MADURACION / EN_SECADO), we need pH and chamber data */}
                                    {(transitioningLote.lote.estado === 'ESTUFADO' || transitioningLote.lote.estado === 'MADURACION' || transitioningLote.lote.estado === 'EN_SECADO') && (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input 
                                                    label="Temperatura Cámara (°C)" 
                                                    type="number" 
                                                    step="0.1" 
                                                    value={transitionForm.temperatura_c} 
                                                    onChange={v => setTransitionForm({ ...transitionForm, temperatura_c: v })}
                                                    required
                                                />
                                                <Input 
                                                    label="Humedad Relativa (%)" 
                                                    type="number" 
                                                    value={transitionForm.humedad_pct} 
                                                    onChange={v => setTransitionForm({ ...transitionForm, humedad_pct: v })}
                                                    required
                                                />
                                            </div>
                                            <Input 
                                                label="Medición de pH" 
                                                type="number" 
                                                step="0.01" 
                                                placeholder="Ej. 5.3"
                                                value={transitionForm.pH} 
                                                onChange={v => setTransitionForm({ ...transitionForm, pH: v })}
                                                required
                                            />
                                        </>
                                    )}

                                    <Input 
                                        label="Operario Responsable" 
                                        value={transitionForm.operario} 
                                        onChange={v => setTransitionForm({ ...transitionForm, operario: v })}
                                        required
                                    />
                                    
                                    <div className="flex flex-col gap-1 w-full text-left">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notas del Proceso</label>
                                        <textarea 
                                            className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 outline-none text-sm font-semibold text-slate-800 transition-all focus:border-slate-400" 
                                            rows="2"
                                            placeholder="Observaciones de la transición..."
                                            value={transitionForm.observaciones}
                                            onChange={e => setTransitionForm({ ...transitionForm, observaciones: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex gap-3 justify-end pt-4 border-t">
                                        <Button type="button" onClick={() => setTransitioningLote(null)} variant="secondary" className="px-5">Cancelar</Button>
                                        <Button type="submit" variant="success" className="px-5">Confirmar Transición</Button>
                                    </div>
                                </form>
                            </Card>
                        </div>
                    )}
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
                    <div className="flex justify-between items-center print:hidden">
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
                                        id: null,
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

                    {/* CONTROL BAR */}
                    <div className="flex flex-col md:flex-row gap-3 items-center justify-between mb-5 print:hidden bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="relative w-full md:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Buscar por código, nombre o familia..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-slate-400 bg-slate-50 focus:bg-white transition-all" 
                            />
                        </div>
                        <Button 
                            onClick={() => window.print()} 
                            variant="secondary" 
                            className="w-full md:w-auto py-2 px-4 flex items-center justify-center gap-1.5 text-xs font-black uppercase"
                        >
                            <Printer size={14} /> Imprimir Listado
                        </Button>
                    </div>

                    <div className="w-full">
                        {/* FORMULARIO DE ALTA DE RECETA DE CHARCUTERÍA (MODAL FLOTANTE) */}
                        {showAddReceta && (
                            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 overflow-y-auto">
                                <div className="bg-white border-[8px] border-slate-900 rounded-[2.5rem] p-8 max-w-4xl w-full shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
                                    <h4 className="text-lg font-black uppercase mb-6 italic text-slate-800">{recetaForm.id ? "Editar Ficha Técnica Charcutera" : "Alta de Ficha Técnica Charcutera"}</h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end mb-6">
                                        <Input label="Código Ficha (SKU)" value={recetaForm.codigo} onChange={v => setRecetaForm({ ...recetaForm, codigo: v })} placeholder="Ej: CH-SLM-01" required />
                                        <Input label="Nombre del Chacinado" placeholder="Ej: Salame tipo Milán" value={recetaForm.nombre} onChange={v => setRecetaForm({ ...recetaForm, nombre: v })} required />
                                        
                                        <Select label="Familia Tecnológica" value={recetaForm.familia_tecnologica} onChange={v => {
                                            const isFresh = v === 'embutido_fresco';
                                            const isEmulsion = v === 'emulsion_fina';
                                            const isInjected = v === 'salazon_inyectada';
                                            const isDry = v === 'fermentado_seco' || v === 'salazon_cruda';
                                            setRecetaForm(prev => ({
                                                ...prev,
                                                familia_tecnologica: v,
                                                dias_maduracion: isFresh ? 0 : prev.dias_maduracion,
                                                merma_secado_objetivo: isDry ? 35 : 0,
                                                tiempo_curado_salado_dias: v === 'salazon_cruda' ? 7 : 0,
                                                tiempo_estufado_dias: v === 'fermentado_seco' ? 2 : 0,
                                                tiempo_curado_salmuera_dias: v === 'salazon_inyectada' ? 3 : 0,
                                                tiempo_coccion_mins: (v === 'salazon_inyectada' || v === 'emulsion_fina') ? 90 : 0
                                            }));
                                        }}>
                                            <option value="fermentado_seco">Fermentados Secos (Salame, Chorizo)</option>
                                            <option value="salazon_cruda">Salazones Crudas (Bondiola, Jamón)</option>
                                            <option value="emulsion_fina">Emulsiones Finas (Mortadela, Salchicha)</option>
                                            <option value="salazon_inyectada">Salazones Inyectadas (Jamón Cocido)</option>
                                            <option value="embutido_fresco">Embutidos Frescos (Chorizo Fresco, Salchicha)</option>
                                        </Select>

                                        <Input 
                                            label="Tamaño Lote (Kg)" 
                                            type="number" 
                                            step="0.1" 
                                            value={recetaForm.tamano_lote_kg} 
                                            onChange={v => setRecetaForm({ ...recetaForm, tamano_lote_kg: Number(v) })} 
                                            placeholder="Ej: 10.0" 
                                            required 
                                        />
         
                                        {recetaForm.familia_tecnologica === 'salazon_inyectada' ? (
                                            <Input label="Porcentaje de Inyección (%)" type="number" value={recetaForm.porcentaje_inyeccion} onChange={v => setRecetaForm({ ...recetaForm, porcentaje_inyeccion: v })} placeholder="Ej: 10" required />
                                        ) : (
                                            <div className="text-[10px] font-bold text-slate-400 uppercase h-[42px] flex items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50">Inyección N/A</div>
                                        )}
                                    </div>
         
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-6 space-y-4">
                                        <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Cronometría y Tiempos de Proceso</p>
                                            <span className="text-[9px] text-slate-400 font-bold bg-slate-200 px-2 py-0.5 rounded">
                                                Lead Time Calculado: {(() => {
                                                    const fam = recetaForm.familia_tecnologica;
                                                    if (fam === 'salazon_cruda') return `${Number(recetaForm.tiempo_curado_salado_dias || 0) + Number(recetaForm.dias_maduracion || 0)} días`;
                                                    if (fam === 'fermentado_seco') return `${Number(recetaForm.tiempo_estufado_dias || 0) + Number(recetaForm.dias_maduracion || 0)} días`;
                                                    if (fam === 'salazon_inyectada') return `${Number(recetaForm.tiempo_curado_salmuera_dias || 0)} días`;
                                                    return '0 días';
                                                })()}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                            <Input 
                                                label="Preparación (Minutos)" 
                                                type="number" 
                                                value={recetaForm.tiempo_preparacion} 
                                                onChange={v => setRecetaForm({ ...recetaForm, tiempo_preparacion: Number(v) })} 
                                                suffix="min" 
                                                required 
                                            />

                                            {/* Salazones crudas */}
                                            {recetaForm.familia_tecnologica === 'salazon_cruda' && (
                                                <>
                                                    <Input 
                                                        label="Curado/Salado (días)" 
                                                        type="number" 
                                                        value={recetaForm.tiempo_curado_salado_dias} 
                                                        onChange={v => setRecetaForm({ ...recetaForm, tiempo_curado_salado_dias: Number(v) })} 
                                                        suffix="días" 
                                                        required 
                                                    />
                                                    <Input 
                                                        label="Maduración (días)" 
                                                        type="number" 
                                                        value={recetaForm.dias_maduracion} 
                                                        onChange={v => setRecetaForm({ ...recetaForm, dias_maduracion: Number(v) })} 
                                                        suffix="días" 
                                                        required 
                                                    />
                                                    <Input 
                                                        label="Merma Secado Objetivo (%)" 
                                                        type="number" 
                                                        value={recetaForm.merma_secado_objetivo}
                                                         onChange={v => setRecetaForm({ ...recetaForm, merma_secado_objetivo: Number(v) })} 
                                                        suffix="%" 
                                                        required 
                                                    />
                                                </>
                                            )}

                                            {/* Fermentados secos */}
                                            {recetaForm.familia_tecnologica === 'fermentado_seco' && (
                                                <>
                                                    <Input 
                                                        label="Estufado (días)" 
                                                        type="number" 
                                                        value={recetaForm.tiempo_estufado_dias} 
                                                        onChange={v => setRecetaForm({ ...recetaForm, tiempo_estufado_dias: Number(v) })} 
                                                        suffix="días" 
                                                        required 
                                                    />
                                                    <Input 
                                                        label="Maduración (días)" 
                                                        type="number" 
                                                        value={recetaForm.dias_maduracion} 
                                                        onChange={v => setRecetaForm({ ...recetaForm, dias_maduracion: Number(v) })} 
                                                        suffix="días" 
                                                        required 
                                                    />
                                                    <Input 
                                                        label="Merma Secado Objetivo (%)" 
                                                        type="number" 
                                                        value={recetaForm.merma_secado_objetivo}
                                                         onChange={v => setRecetaForm({ ...recetaForm, merma_secado_objetivo: Number(v) })} 
                                                        suffix="%" 
                                                        required 
                                                    />
                                                </>
                                            )}

                                            {/* Salazones inyectadas */}
                                            {recetaForm.familia_tecnologica === 'salazon_inyectada' && (
                                                <>
                                                    <Input 
                                                        label="Curado/Salmuera (días)" 
                                                        type="number" 
                                                        value={recetaForm.tiempo_curado_salmuera_dias} 
                                                        onChange={v => setRecetaForm({ ...recetaForm, tiempo_curado_salmuera_dias: Number(v) })} 
                                                        suffix="días" 
                                                        required 
                                                    />
                                                    <Input 
                                                        label="Cocción (minutos)" 
                                                        type="number" 
                                                        value={recetaForm.tiempo_coccion_mins} 
                                                        onChange={v => setRecetaForm({ ...recetaForm, tiempo_coccion_mins: Number(v) })} 
                                                        suffix="min" 
                                                        required 
                                                    />
                                                </>
                                            )}

                                            {/* Emulsiones finas */}
                                            {recetaForm.familia_tecnologica === 'emulsion_fina' && (
                                                <>
                                                    <Input 
                                                        label="Cocción (minutos)" 
                                                        type="number" 
                                                        value={recetaForm.tiempo_coccion_mins} 
                                                        onChange={v => setRecetaForm({ ...recetaForm, tiempo_coccion_mins: Number(v) })} 
                                                        suffix="min" 
                                                        required 
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </div>
         
                                    {/* Detalle de componentes de la receta */}
                                    <div className="mb-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                        <div className="flex justify-between items-center mb-4">
                                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Matriz de Formulación (Ingredientes)</p>
                                            <span className="text-[9px] text-slate-400 font-bold italic">Base de cálculo dinámico: % de Baker/Cárnico</span>
                                        </div>
                                        
                                        {(() => {
                                            const baseRef = (recetaForm.familia_tecnologica === 'fermentado_seco' || recetaForm.familia_tecnologica === 'emulsion_fina' || recetaForm.familia_tecnologica === 'embutido_fresco') ? 10000 : 1000;
                                            const totalBatchCost = recetaForm.details.reduce((acc, curr) => {
                                                if (!curr.ingredientId || !curr.porcentaje_base) return acc;
                                                const ing = ingredients.find(i => i.id === curr.ingredientId);
                                                const costPerGram = Number(ing?.costo_estandar || ing?.costPerGram || 0);
                                                const grams = (Number(curr.porcentaje_base) / 100) * baseRef;
                                                return acc + (grams * costPerGram);
                                            }, 0);

                                            return (
                                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white mb-4 max-h-[300px] overflow-y-auto">
                                                    <table className="w-full text-left">
                                                        <thead className="bg-slate-900 text-white text-[9px] uppercase tracking-wider sticky top-0 z-10">
                                                            <tr>
                                                                <th className="px-4 py-3">Insumo</th>
                                                                <th className="px-4 py-3 w-40">Categoría</th>
                                                                <th className="px-4 py-3 w-24 text-center">% Base</th>
                                                                <th className="px-4 py-3 w-28 text-center">Cantidad (g)</th>
                                                                <th className="px-4 py-3 w-20 text-center">Sec.</th>
                                                                <th className="px-4 py-3 w-28 text-right">Costo Insumo</th>
                                                                <th className="px-4 py-3 w-28 text-center">Incidencia %</th>
                                                                <th className="px-4 py-3 w-12 text-center"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {recetaForm.details.map((d, i) => {
                                                                const ing = ingredients.find(x => x.id === d.ingredientId);
                                                                const costPerGram = Number(ing?.costo_estandar || ing?.costPerGram || 0);
                                                                const grams = d.porcentaje_base ? (Number(d.porcentaje_base) / 100) * baseRef : 0;
                                                                const componentCost = grams * costPerGram;
                                                                const incidencePct = totalBatchCost > 0 ? (componentCost / totalBatchCost) * 100 : 0;

                                                                return (
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
                                                                                    <option key={k} value={k}>{v.label.replace('Base Cárnica (', '').replace(')', '').replace('Ligantes / ', '')}</option>
                                                                                ))}
                                                                            </select>
                                                                        </td>
                                                                        <td className="p-2 border-l border-slate-100">
                                                                            <div className="flex items-center justify-center bg-slate-50 border rounded-lg px-2 py-1 w-20 mx-auto">
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
                                                                        <td className="p-2 border-l border-slate-100 text-center font-mono font-black text-slate-700 text-xs w-28">
                                                                            {grams.toLocaleString('es-AR', { maximumFractionDigits: 1 })} g
                                                                        </td>
                                                                        <td className="p-2 border-l border-slate-100">
                                                                            <input 
                                                                                type="number" 
                                                                                className="w-12 mx-auto text-center border rounded-lg px-2 py-1 text-xs font-bold text-slate-700 bg-slate-50"
                                                                                min="1"
                                                                                value={d.secuencia_mezcla}
                                                                                onChange={e => {
                                                                                    const nd = [...recetaForm.details];
                                                                                    nd[i].secuencia_mezcla = e.target.value;
                                                                                    setRecetaForm({ ...recetaForm, details: nd });
                                                                                }}
                                                                            />
                                                                        </td>
                                                                        <td className="p-2 border-l border-slate-100 text-right font-mono font-black text-slate-700 text-xs w-28">
                                                                            {fmtCost(componentCost)}
                                                                        </td>
                                                                        <td className="p-2 border-l border-slate-100 text-center font-mono font-black text-slate-600 text-xs w-28">
                                                                            {incidencePct.toFixed(1)}%
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
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            );
                                        })()}
                                        
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
                                </div>
                            </div>
                        )}
 
                        {/* VISTA DE FICHAS ACTIVAS */}
                        <div className="w-full">
                            <Card id="printable-list-container" className="overflow-hidden border border-slate-200 shadow-sm bg-white rounded-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left font-bold text-xs uppercase text-slate-700">
                                <thead className="bg-slate-900 text-white text-[9px] tracking-widest">
                                    <tr>
                                        <th className="px-4 py-3 cursor-pointer select-none hover:bg-slate-800 transition-colors" onClick={() => handleSort('nombre')}>
                                            SKU / Chacinado {renderSortIndicator('nombre')}
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer select-none hover:bg-slate-800 transition-colors text-center" onClick={() => handleSort('familia_tecnologica')}>
                                            Familia {renderSortIndicator('familia_tecnologica')}
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer select-none hover:bg-slate-800 transition-colors text-center" onClick={() => handleSort('lead_time_dias')}>
                                            Lead Time {renderSortIndicator('lead_time_dias')}
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer select-none hover:bg-slate-800 transition-colors text-center" onClick={() => handleSort('merma_secado_objetivo')}>
                                            Merma Secado {renderSortIndicator('merma_secado_objetivo')}
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer select-none hover:bg-slate-800 transition-colors text-right" onClick={() => handleSort('costPerUnit')}>
                                            Costo / Kg {renderSortIndicator('costPerUnit')}
                                        </th>
                                        <th className="px-4 py-3 text-center w-40 print:hidden">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {processedRecetas.map(r => {
                                        const familyData = FAMILIAS_CHARC[r.familia_tecnologica || 'fermentado_seco'];
                                        const totalBatchCost = r.totalBatchCost;
                                        const batchWeight = r.batchWeight;
                                        const t_prep = r.t_prep;
                                        const d_maduracion = r.dias_maduracion;
                                        const costo_mo = r.costo_mo;
                                        const costo_camara = r.costo_camara;
                                        const totalCostOfBatch = r.totalCostOfBatch;
                                        const merma = r.merma;
                                        const finalWeightKg = r.finalWeightKg;
                                        const costPerUnit = r.costPerUnit;
                                        const isExpanded = !!expandedRecipes[r.id];

                                        return (
                                            <React.Fragment key={r.id}>
                                                <tr className={`hover:bg-slate-50 transition-colors group ${isExpanded ? 'bg-slate-50' : ''}`}>
                                                    <td className="px-4 py-3.5 border-b border-slate-100">
                                                        <p className="text-[11px] font-black text-slate-800 leading-none">{r.nombre}</p>
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            <span className="text-[8px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{r.codigo}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center border-b border-slate-100">
                                                        <span className={`px-2 py-0.5 rounded text-[8px] text-white font-black uppercase ${familyData?.color}`}>{familyData?.nombre?.replace(' (Madurados)', '')?.replace(' (Sin Cámara)', '')}</span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center font-mono text-slate-800 border-b border-slate-100">
                                                        {r.lead_time_dias} días
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center font-mono text-slate-800 border-b border-slate-100">
                                                        {r.merma_secado_objetivo}%
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right font-mono font-black text-emerald-600 border-b border-slate-100">
                                                        {fmtCost(costPerUnit)}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center border-b border-slate-100 print:hidden">
                                                        <div className="flex justify-center items-center gap-1.5">
                                                            <button 
                                                                onClick={() => toggleRecipeExpanded(r.id)} 
                                                                className={`p-1.5 rounded-md transition-colors ${isExpanded ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'}`}
                                                                title="Ver composición"
                                                            >
                                                                {isExpanded ? <ChevronUp size={14} /> : <Eye size={14} />}
                                                            </button>
                                                            <button 
                                                                onClick={() => handleEditReceta(r)} 
                                                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                                                                title="Editar"
                                                            >
                                                                <Wrench size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteReceta(r.id)} 
                                                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr className="bg-slate-50/50 border-b border-slate-200">
                                                        <td colSpan="6" className="px-8 py-5">
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                <div className="md:col-span-2">
                                                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider mb-2">Composición de Receta (%):</p>
                                                                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                                                                        {r.details?.map((d, i) => {
                                                                            const ing = ingredients.find(ing => ing.id === d.ingredientId);
                                                                            const cat = CATEGORIAS_TECNOLOGICAS[d.categoria_tecnologica || 'aditivo'];
                                                                            const costPerGram = Number(ing?.costo_estandar || ing?.costPerGram || 0);
                                                                            const grams = (Number(d.porcentaje_base || 0) / 100) * r.batchWeight;
                                                                            const componentCost = grams * costPerGram;
                                                                            const incidencePct = r.totalBatchCost > 0 ? (componentCost / r.totalBatchCost) * 100 : 0;
                                                                            return (
                                                                                <div key={i} className="px-4 py-2 flex justify-between items-center text-[10px] text-slate-700 hover:bg-slate-50 transition-colors">
                                                                                    <div className="flex items-center gap-2 w-1/2">
                                                                                        <span className={`text-[7px] px-1.5 py-0.5 rounded uppercase font-black ${cat?.color} w-20 text-center shrink-0`}>
                                                                                            {d.categoria_tecnologica.replace('Base Cárnica (', '').replace(')', '').replace('Ligantes / ', '')}
                                                                                        </span>
                                                                                        <span className="font-semibold truncate">{ing?.name || 'Insumo'}</span>
                                                                                    </div>
                                                                                    <div className="font-mono flex items-center justify-between w-1/2 pl-4">
                                                                                        <span className="text-slate-400 text-[9px]">Paso {d.secuencia_mezcla}</span>
                                                                                        <span className="font-black text-slate-900 w-12 text-right">{d.porcentaje_base}%</span>
                                                                                        <span className="font-black text-emerald-600 w-20 text-right">{fmtCost(componentCost)}</span>
                                                                                        <span className="font-black text-slate-600 w-12 text-right">{incidencePct.toFixed(1)}%</span>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="flex flex-col justify-between bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                                                    <div>
                                                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider mb-2">Resumen Operativo</p>
                                                                        <div className="space-y-1.5 text-[10px] text-slate-600">
                                                                            <div className="flex justify-between border-b pb-1"><span>Prep. Labor:</span> <span className="font-mono font-bold">{t_prep} min</span></div>
                                                                            
                                                                            {r.familia_tecnologica === 'salazon_cruda' && (
                                                                                <>
                                                                                    <div className="flex justify-between border-b pb-1"><span>Curado/Salado:</span> <span className="font-mono font-bold">{r.tiempo_curado_salado_dias || 0} días</span></div>
                                                                                    <div className="flex justify-between border-b pb-1"><span>Maduración:</span> <span className="font-mono font-bold">{r.dias_maduracion || 0} días</span></div>
                                                                                    <div className="flex justify-between border-b pb-1"><span>Merma Obj:</span> <span className="font-mono font-bold text-red-600">{merma}%</span></div>
                                                                                </>
                                                                            )}

                                                                            {r.familia_tecnologica === 'fermentado_seco' && (
                                                                                <>
                                                                                    <div className="flex justify-between border-b pb-1"><span>Estufado:</span> <span className="font-mono font-bold">{r.tiempo_estufado_dias || 0} días</span></div>
                                                                                    <div className="flex justify-between border-b pb-1"><span>Maduración:</span> <span className="font-mono font-bold">{r.dias_maduracion || 0} días</span></div>
                                                                                    <div className="flex justify-between border-b pb-1"><span>Merma Obj:</span> <span className="font-mono font-bold text-red-600">{merma}%</span></div>
                                                                                </>
                                                                            )}

                                                                            {r.familia_tecnologica === 'salazon_inyectada' && (
                                                                                <>
                                                                                    <div className="flex justify-between border-b pb-1"><span>Curado/Salmuera:</span> <span className="font-mono font-bold">{r.tiempo_curado_salmuera_dias || 0} días</span></div>
                                                                                    <div className="flex justify-between border-b pb-1"><span>Cocción:</span> <span className="font-mono font-bold">{r.tiempo_coccion_mins || 0} min</span></div>
                                                                                </>
                                                                            )}

                                                                            {r.familia_tecnologica === 'emulsion_fina' && (
                                                                                <>
                                                                                    <div className="flex justify-between border-b pb-1"><span>Cocción:</span> <span className="font-mono font-bold">{r.tiempo_coccion_mins || 0} min</span></div>
                                                                                </>
                                                                            )}

                                                                            {r.familia_tecnologica === 'embutido_fresco' && (
                                                                                <div className="flex justify-between border-b pb-1"><span>Proceso:</span> <span className="font-mono font-bold text-indigo-600">Fresco</span></div>
                                                                            )}
                                                                            
                                                                            <div className="flex justify-between pt-1"><span>Costo Lote ({batchWeight / 1000}kg):</span> <span className="font-mono font-bold text-slate-800">{fmtCost(totalCostOfBatch)}</span></div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                    {processedRecetas.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="py-16 text-center opacity-30 italic text-slate-400 text-xs">
                                                No se han registrado fichas técnicas.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* ESTILO DE IMPRESIÓN */}
                    <style>{`
                        @media print {
                            html, body, main, .h-screen, .overflow-hidden, div {
                                height: auto !important;
                                overflow: visible !important;
                                min-height: 0 !important;
                            }
                            .print\:hidden, aside, header, button, .flex-1.max-w-md {
                                display: none !important;
                            }
                            #printable-list-container {
                                border: none !important;
                                box-shadow: none !important;
                                width: 100% !important;
                                margin: 0 !important;
                                padding: 0 !important;
                            }
                        }
                    `}</style>
                        </div>
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
                                
                                {asistente.recetaSelected.familia_tecnologica === 'fermentado_seco' || asistente.recetaSelected.familia_tecnologica === 'emulsion_fina' || asistente.recetaSelected.familia_tecnologica === 'embutido_fresco' ? (
                                    <div className="max-w-md mx-auto space-y-4">
                                        <h4 className="text-2xl font-black uppercase italic tracking-tight text-slate-800">
                                            ¿Peso de la Base Cárnica (Magro + Grasa)?
                                        </h4>
                                        <p className="text-slate-400 text-[10px] font-bold uppercase leading-normal tracking-wide">
                                            Ingrese el peso total de la mezcla cárnica (magro y grasa combinados). El sistema calculará la cantidad requerida de cada tipo de carne y aditivos en proporción.
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
                                                        {(d.gramos_calculados || 0).toLocaleString('es-AR')}<span className="text-base text-slate-400 font-bold ml-1">g</span>
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
                                        asistente.scaledDetails.reduce((a,b) => a + (b.gramos_calculados || 0), 0).toLocaleString('es-AR')
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
