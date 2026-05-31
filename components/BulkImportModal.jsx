'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Link2, Clipboard, Check, AlertCircle, Loader2, Download, Table } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CATEGORIAS_INSUMO, UBICACIONES_ALMACEN } from './bakery_erp';

export default function BulkImportModal({
    isOpen,
    onClose,
    type, // 'ingredientes' | 'proveedores' | 'clientes' | 'recetas' | 'charc_recetas'
    onSuccess, // callback to refresh state in parent
    ingredients = [], // current ingredients for reference
    recipes = [], // current recipes for reference
    charcRecetas = [], // charcuteria recipes
    showToast
}) {
    const [activeTab, setActiveTab] = useState('url'); // 'url' | 'file' | 'paste'
    const [googleUrl, setGoogleUrl] = useState('');
    const [pastedText, setPastedText] = useState('');
    const [loading, setLoading] = useState(false);
    const [parsedData, setParsedData] = useState([]);
    const [validationErrors, setValidationErrors] = useState([]);
    const [successMessage, setSuccessMessage] = useState('');
    const fileInputRef = useRef(null);

    // Reset when type or open status changes
    useEffect(() => {
        setGoogleUrl('');
        setPastedText('');
        setParsedData([]);
        setValidationErrors([]);
        setSuccessMessage('');
        setLoading(false);
    }, [isOpen, type]);

    if (!isOpen) return null;

    // Helper: Normalize Headers
    const normalizeHeader = (h) => {
        if (!h) return '';
        return h.toString()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // remove accents
            .replace(/[^a-z0-9_]/g, "") // remove non-alphanumeric, keep underscore
            .replace(/_/g, ""); // remove underscores
    };

    // Robust CSV & TSV Parser
    const parseCSVOrTSV = (text) => {
        let delimiter = ',';
        const firstLine = text.split('\n')[0] || '';
        if (firstLine.includes('\t')) {
            delimiter = '\t';
        } else if (firstLine.includes(';')) {
            delimiter = ';';
        }

        const rows = [];
        let currentRow = [];
        let insideQuotes = false;
        let currentValue = '';

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (insideQuotes) {
                if (char === '"') {
                    if (nextChar === '"') {
                        currentValue += '"';
                        i++;
                    } else {
                        insideQuotes = false;
                    }
                } else {
                    currentValue += char;
                }
            } else {
                if (char === '"') {
                    insideQuotes = true;
                } else if (char === delimiter) {
                    currentRow.push(currentValue.trim());
                    currentValue = '';
                } else if (char === '\r' || char === '\n') {
                    currentRow.push(currentValue.trim());
                    if (currentRow.some(val => val !== '')) {
                        rows.push(currentRow);
                    }
                    currentRow = [];
                    currentValue = '';
                    if (char === '\r' && nextChar === '\n') {
                        i++;
                    }
                } else {
                    currentValue += char;
                }
            }
        }
        if (currentValue !== '' || currentRow.length > 0) {
            currentRow.push(currentValue.trim());
            if (currentRow.some(val => val !== '')) {
                rows.push(currentRow);
            }
        }
        return rows;
    };

    // Map rows to object structure based on type
    const processData = (rawData) => {
        if (rawData.length < 2) {
            setValidationErrors(["El archivo está vacío o no contiene suficientes filas."]);
            return;
        }

        const headers = rawData[0].map(h => normalizeHeader(h));
        const rows = rawData.slice(1);
        const processed = [];
        const errors = [];

        // Dynamic code generation helper counters (derived from current DB states)
        let provCounter = 0;
        if (type === 'proveedores') {
            const numbers = (onSuccess?.providers || []).map(p => {
                const n = parseInt(p.codigo?.split('-').pop());
                return isNaN(n) ? 0 : n;
            });
            provCounter = numbers.length > 0 ? Math.max(...numbers) : 0;
        }

        let cliCounter = 0;
        if (type === 'clientes') {
            const numbers = (onSuccess?.clientes || []).map(c => {
                const n = parseInt(c.codigo?.split('-').pop());
                return isNaN(n) ? 0 : n;
            });
            cliCounter = numbers.length > 0 ? Math.max(...numbers) : 0;
        }

        // Object holding max index for ingredients by prefix to avoid duplicates inside the imported file
        const ingCounters = {};
        const charcCounters = {};

        rows.forEach((row, rowIndex) => {
            const rowNum = rowIndex + 2; // +1 for 1-based index, +1 for header row
            const record = {};
            
            // Map columns by matching header name
            headers.forEach((h, colIndex) => {
                if (h) record[h] = row[colIndex] || '';
            });

            // Map and validate based on import type
            if (type === 'proveedores') {
                const nombre = record.nombre || record.razonsocial || record.proveedor || '';
                const cuit = record.cuit || record.identificacionfiscal || '';
                const rubro = record.rubro || record.categoria || '';
                let codigo = record.codigo || record.sku || record.id || '';

                if (!nombre) {
                    errors.push(`Fila ${rowNum}: Razón Social es requerida.`);
                }
                if (!cuit) {
                    errors.push(`Fila ${rowNum}: CUIT es requerido.`);
                }

                if (!codigo && nombre && cuit) {
                    provCounter++;
                    codigo = `PRV-${String(provCounter).padStart(3, '0')}`;
                }

                processed.push({
                    codigo,
                    razon_social: nombre,
                    cuit,
                    rubro,
                    originalRow: rowNum
                });
            }
            
            else if (type === 'clientes') {
                const nombre = record.nombre || record.razonsocial || record.cliente || '';
                const cuit = record.cuit || record.identificacionfiscal || '';
                const tipoCliente = record.tipo || record.clasificacion || 'Mayorista';
                const direccion = record.direccion || record.zonareparto || record.domicilio || '';
                let codigo = record.codigo || record.sku || record.id || '';

                if (!nombre) {
                    errors.push(`Fila ${rowNum}: Razón Social / Nombre es requerido.`);
                }
                if (!cuit) {
                    errors.push(`Fila ${rowNum}: CUIT es requerido.`);
                }

                if (!codigo && nombre && cuit) {
                    cliCounter++;
                    codigo = `CLI-${String(cliCounter).padStart(3, '0')}`;
                }

                processed.push({
                    codigo,
                    razon_social: nombre,
                    cuit,
                    tipo: tipoCliente,
                    direccion,
                    originalRow: rowNum
                });
            }
            
            else if (type === 'ingredientes') {
                const name = record.nombre || record.insumo || record.ingrediente || record.material || '';
                const itemTipo = (record.tipo || record.clase || 'insumo').toLowerCase();
                const familia = record.familia || record.categoria || (itemTipo === 'empaque' ? 'Empaque' : 'Otros');
                const unidad_compra = record.unidadcompra || record.presentacion || record.presentacioncompra || (itemTipo === 'empaque' ? 'unidad' : 'Bolsa 25 kg');
                const factor_conversion = Number(record.factorconversion || record.factor || record.gramosporpresentacion || (itemTipo === 'empaque' ? 1 : 25000)) || 1;
                const unidad_base = record.unidadbase || record.unidadmedidabase || (itemTipo === 'empaque' ? 'u' : 'g');
                const almacen = record.almacen || record.ubicacion || (itemTipo === 'empaque' ? 'Depósito Empaque' : 'Almacén Secos Principal');
                const alergeno = record.alergeno || record.alergenos || '';
                const costo_presentacion = Number(record.costopresentacion || record.precio || record.costo || 0);
                let codigo = record.codigo || record.sku || record.id || '';

                if (!name) {
                    errors.push(`Fila ${rowNum}: Nombre del insumo es requerido.`);
                }
                if (!CATEGORIAS_INSUMO.includes(familia) && itemTipo !== 'empaque') {
                    // Check if it's not a standard family, warn or fall back
                }

                if (!codigo && name) {
                    const catPrefix = familia ? familia.substring(0, 3).toUpperCase() : 'OTR';
                    const prefix = itemTipo === 'empaque' ? 'EMP-' : `RAW-${catPrefix}-`;
                    
                    if (!ingCounters[prefix]) {
                        // Find current max in database ingredients matching the prefix
                        const numbers = ingredients
                            .filter(i => i.codigo?.startsWith(prefix))
                            .map(i => parseInt(i.codigo.split('-').pop()))
                            .filter(n => !isNaN(n));
                        ingCounters[prefix] = numbers.length > 0 ? Math.max(...numbers) : 0;
                    }
                    ingCounters[prefix]++;
                    codigo = `${prefix}${String(ingCounters[prefix]).padStart(3, '0')}`;
                }

                processed.push({
                    codigo,
                    name,
                    tipo: itemTipo,
                    familia,
                    unidad_compra,
                    factor_conversion,
                    unidad_base,
                    almacen,
                    alergeno: alergeno || null,
                    costo_estandar: costo_presentacion / factor_conversion, // Cost per base unit (g, ml, u)
                    costo_presentacion, // keep reference for preview
                    originalRow: rowNum
                });
            }
            
            else if (type === 'recetas') {
                const receta_codigo = record.recetacodigo || record.recetasku || record.sku || '';
                const receta_nombre = record.recetanombre || record.producto || record.nombre || '';
                const familia = record.familia || 'F';
                const wip = record.wip || record.essubensamble || record.subensamble || 'false';
                const logica_formula = record.logicaformula || record.logica || 'panadero';
                const formato_venta = record.formatoventa || record.formato || 'Unidad';
                const peso_unidad_g = Number(record.pesounidadg || record.pesounidad || record.peso || 100);
                const merma_coccion_pct = Number(record.mermacoccion || record.mermacoccionpct || record.merma || 15);
                const mano_obra_horas = Number(record.manoobrahoras || record.horashombre || record.manoobra || 1);
                const lote_minimo = Number(record.loteminimo || 1);
                const ingrediente_ident = record.ingredientecodigo || record.ingredientesku || record.ingrediente || '';
                const porcentaje = record.porcentaje || record.porcentajepanadero || record.pct || '';
                const gramos = record.gramos || record.cantidad || '';

                if (!receta_codigo) {
                    errors.push(`Fila ${rowNum}: Receta Código es requerido.`);
                }
                if (!receta_nombre) {
                    errors.push(`Fila ${rowNum}: Receta Nombre es requerido.`);
                }
                if (!ingrediente_ident) {
                    errors.push(`Fila ${rowNum}: Código o nombre del ingrediente es requerido.`);
                }

                // Check ingredient reference
                const ing = ingredients.find(i => i.codigo === ingrediente_ident || i.name?.toLowerCase() === ingrediente_ident.toString().toLowerCase());
                if (!ing) {
                    errors.push(`Fila ${rowNum}: El ingrediente "${ingrediente_ident}" no existe en el catálogo.`);
                }

                processed.push({
                    receta_codigo: receta_codigo.toUpperCase(),
                    receta_nombre,
                    familia,
                    wip: wip.toString().toLowerCase() === 'true' || wip.toString().toLowerCase() === 'si' || wip.toString() === '1',
                    logica_formula: logica_formula.toLowerCase() === 'batch' ? 'batch' : 'panadero',
                    formato_venta: formato_venta.toLowerCase() === 'kg' ? 'Kg' : 'Unidad',
                    peso_unidad_g,
                    merma_coccion_pct,
                    mano_obra_horas,
                    lote_minimo,
                    ingrediente_id: ing ? ing.id : null,
                    ingrediente_codigo: ing ? ing.codigo : ingrediente_ident,
                    ingrediente_nombre: ing ? ing.name : 'No Encontrado',
                    porcentaje: porcentaje !== '' ? Number(porcentaje) : null,
                    gramos: gramos !== '' ? Number(gramos) : 0,
                    originalRow: rowNum
                });
            }
            
            else if (type === 'charc_recetas') {
                const receta_codigo = record.recetacodigo || record.recetasku || record.sku || '';
                const receta_nombre = record.recetanombre || record.producto || record.nombre || '';
                const familia_tecnologica = record.familiatecnologica || record.familia || 'fermentado_seco';
                const lead_time_dias = Number(record.leadtimedias || record.leadtime || 30);
                const merma_secado_objetivo = Number(record.mermasecadoobjetivo || record.mermasecado || record.merma || 35);
                const porcentaje_inyeccion = record.porcentajeinyeccion ? Number(record.porcentajeinyeccion) : null;
                const ingrediente_ident = record.ingredientecodigo || record.ingredientesku || record.ingrediente || '';
                const porcentaje_base = record.porcentaje || record.porcentajebase || record.pct || '';
                const categoria_tecnologica = record.categoriatecnologica || record.categoria || 'aditivo';
                const secuencia_mezcla = Number(record.secuenciamezcla || record.secuencia || 1);

                if (!receta_nombre) {
                    errors.push(`Fila ${rowNum}: Nombre del chacinado es requerido.`);
                }
                if (!ingrediente_ident) {
                    errors.push(`Fila ${rowNum}: Insumo es requerido.`);
                }

                // Check ingredient reference
                const ing = ingredients.find(i => i.codigo === ingrediente_ident || i.name?.toLowerCase() === ingrediente_ident.toString().toLowerCase());
                if (!ing) {
                    errors.push(`Fila ${rowNum}: El ingrediente "${ingrediente_ident}" no existe en el catálogo.`);
                }

                let codigo = receta_codigo || '';
                if (!codigo && receta_nombre) {
                    const famKey = familia_tecnologica.toLowerCase();
                    const famPrefix = famKey === 'fermentado_seco' ? 'SEC' :
                                      famKey === 'salazon_cruda' ? 'SLZ' :
                                      famKey === 'emulsion_fina' ? 'EMU' : 'INY';
                    const prefix = `CH-${famPrefix}-`;
                    
                    if (!charcCounters[prefix]) {
                        const numbers = charcRecetas
                            .filter(r => r.codigo?.startsWith(prefix))
                            .map(r => parseInt(r.codigo.split('-').pop()))
                            .filter(n => !isNaN(n));
                        charcCounters[prefix] = numbers.length > 0 ? Math.max(...numbers) : 0;
                    }
                    charcCounters[prefix]++;
                    codigo = `${prefix}${String(charcCounters[prefix]).padStart(3, '0')}`;
                }

                processed.push({
                    receta_codigo: codigo.toUpperCase(),
                    receta_nombre,
                    familia_tecnologica: familia_tecnologica.toLowerCase(),
                    lead_time_dias,
                    merma_secado_objetivo,
                    porcentaje_inyeccion,
                    ingrediente_id: ing ? ing.id : null,
                    ingrediente_codigo: ing ? ing.codigo : ingrediente_ident,
                    ingrediente_nombre: ing ? ing.name : 'No Encontrado',
                    porcentaje_base: porcentaje_base !== '' ? Number(porcentaje_base) : null,
                    categoria_tecnologica: categoria_tecnologica.toLowerCase(),
                    secuencia_mezcla,
                    originalRow: rowNum
                });
            }
        });

        // Unique validation for recipes grouping
        if (type === 'recetas' && errors.length === 0) {
            // Group by recipe code and check formulas rules
            const groups = {};
            processed.forEach(p => {
                if (!groups[p.receta_codigo]) {
                    groups[p.receta_codigo] = {
                        codigo: p.receta_codigo,
                        nombre: p.receta_nombre,
                        logica: p.logica_formula,
                        items: []
                    };
                }
                groups[p.receta_codigo].items.push(p);
            });

            Object.values(groups).forEach(g => {
                if (g.logica === 'panadero') {
                    const has100 = g.items.some(it => it.porcentaje === 100);
                    if (!has100) {
                        errors.push(`Receta ${g.codigo} (${g.nombre}): En la lógica "% Panadero", al menos un ingrediente (generalmente Harina) debe ser exactamente el 100%.`);
                    }
                } else {
                    const totalBatchPct = g.items.reduce((sum, it) => sum + (it.porcentaje || 0), 0);
                    if (Math.abs(totalBatchPct - 100) > 1) {
                        errors.push(`Receta ${g.codigo} (${g.nombre}): En la lógica "% Batch", la suma de porcentajes debe ser exactamente 100% (Suma actual: ${totalBatchPct.toFixed(1)}%).`);
                    }
                }
            });
        }

        if (type === 'charc_recetas' && errors.length === 0) {
            const groups = {};
            processed.forEach(p => {
                if (!groups[p.receta_codigo]) {
                    groups[p.receta_codigo] = {
                        codigo: p.receta_codigo,
                        nombre: p.receta_nombre,
                        familia: p.familia_tecnologica,
                        items: []
                    };
                }
                groups[p.receta_codigo].items.push(p);
            });

            Object.values(groups).forEach(g => {
                if (g.familia === 'fermentado_seco' || g.familia === 'emulsion_fina') {
                    const sumMeatBase = g.items
                        .filter(it => it.categoria_tecnologica === 'magro' || it.categoria_tecnologica === 'grasa')
                        .reduce((sum, it) => sum + (it.porcentaje_base || 0), 0);
                    if (Math.abs(sumMeatBase - 100) > 0.01) {
                        errors.push(`Receta ${g.codigo} (${g.nombre}): La suma de base cárnica (Magro y Grasa) debe ser exactamente 100% (Actual: ${sumMeatBase.toFixed(1)}%).`);
                    }
                }

                const salCuraPct = g.items
                    .filter(it => it.categoria_tecnologica === 'aditivo')
                    .reduce((sum, it) => {
                        if (it.ingrediente_nombre?.toLowerCase().includes('cura') || it.ingrediente_codigo?.toLowerCase().includes('nitri')) {
                            return sum + (it.porcentaje_base || 0);
                        }
                        return sum;
                    }, 0);
                if (salCuraPct > 2.50) {
                    errors.push(`Receta ${g.codigo} (${g.nombre}): PCC Crítico - Sal de cura superior al 2.5% legal (${(salCuraPct * 60).toFixed(0)} ppm residual), excede límites de inocuidad.`);
                }
            });
        }

        setValidationErrors(errors);
        setParsedData(processed);
    };

    // Handler for pasting URL
    const handleUrlFetch = async () => {
        if (!googleUrl) return;
        setLoading(true);
        setValidationErrors([]);
        setSuccessMessage('');

        try {
            const sheetIdMatch = googleUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (!sheetIdMatch) {
                throw new Error("El enlace proporcionado no parece ser un link válido de Google Sheets.");
            }
            const sheetId = sheetIdMatch[1];
            const gidMatch = googleUrl.match(/[#&]gid=([0-9]+)/);
            const gid = gidMatch ? gidMatch[1] : '0';

            // Google spreadsheets public CSV download link
            const fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
            const res = await fetch(fetchUrl);
            
            if (!res.ok) {
                throw new Error("No se pudo obtener el archivo de Google Sheets. Asegúrate de que el documento esté compartido como 'Cualquier persona con el enlace puede leer' (Lector).");
            }
            
            const csvText = await res.text();
            const rawRows = parseCSVOrTSV(csvText);
            processData(rawRows);
        } catch (err) {
            setValidationErrors([err.message]);
        } finally {
            setLoading(false);
        }
    };

    // Handler for File Upload
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);
        setValidationErrors([]);
        setSuccessMessage('');

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const rawRows = parseCSVOrTSV(text);
            processData(rawRows);
            setLoading(false);
        };
        reader.onerror = () => {
            setValidationErrors(["Error leyendo el archivo local."]);
            setLoading(false);
        };
        reader.readAsText(file);
    };

    // Handler for text pasting
    const handleTextPaste = () => {
        if (!pastedText.trim()) return;
        setLoading(true);
        setValidationErrors([]);
        setSuccessMessage('');

        try {
            const rawRows = parseCSVOrTSV(pastedText);
            processData(rawRows);
        } catch (err) {
            setValidationErrors(["Error al procesar el texto pegado: " + err.message]);
        } finally {
            setLoading(false);
        }
    };

    // Execute save to Database
    const handleImportSave = async () => {
        if (parsedData.length === 0 || validationErrors.length > 0) return;
        setLoading(true);
        setValidationErrors([]);

        try {
            if (type === 'proveedores') {
                const inserts = parsedData.map(p => ({
                    codigo: p.codigo,
                    razon_social: p.razon_social,
                    cuit: p.cuit,
                    rubro: p.rubro
                }));

                const { data, error } = await supabase.from('proveedores').insert(inserts).select();
                if (error) throw error;
                
                // Mapear nombre a razon_social para el frontend
                const updatedList = data.map(p => ({ ...p, nombre: p.razon_social }));
                onSuccess.setProviders(prev => [...updatedList, ...prev]);
                showToast(`Se cargaron ${inserts.length} proveedores exitosamente.`);
            } 
            
            else if (type === 'clientes') {
                const inserts = parsedData.map(c => ({
                    codigo: c.codigo,
                    razon_social: c.razon_social,
                    cuit: c.cuit,
                    tipo: c.tipo,
                    direccion: c.direccion
                }));

                const { data, error } = await supabase.from('clientes').insert(inserts).select();
                if (error) throw error;

                const updatedList = data.map(c => ({ ...c, nombre: c.razon_social }));
                onSuccess.setClientes(prev => [...updatedList, ...prev]);
                showToast(`Se cargaron ${inserts.length} clientes exitosamente.`);
            } 
            
            else if (type === 'ingredientes') {
                const inserts = parsedData.map(i => ({
                    codigo: i.codigo,
                    name: i.name,
                    unidad_compra: i.unidad_compra,
                    factor_conversion: i.factor_conversion,
                    unidad_base: i.unidad_base,
                    familia: i.familia,
                    almacen: i.almacen,
                    alergeno: i.alergeno,
                    costo_estandar: i.costo_estandar,
                    tipo: i.tipo,
                    es_subensamble: false
                }));

                const { data, error } = await supabase.from('ingredientes').insert(inserts).select();
                if (error) throw error;

                onSuccess.setIngredients(prev => [...data, ...prev]);
                showToast(`Se cargaron ${inserts.length} insumos exitosamente.`);
            } 
            
            else if (type === 'recetas') {
                // Group by recipe code
                const groups = {};
                parsedData.forEach(r => {
                    if (!groups[r.receta_codigo]) {
                        groups[r.receta_codigo] = {
                            codigo: r.receta_codigo,
                            nombre_producto: r.receta_nombre,
                            familia: r.familia,
                            version: 1,
                            es_subensamble: r.wip,
                            merma: r.merma_coccion_pct,
                            formato_venta: r.formato_venta,
                            peso_unidad: r.formato_venta === 'Unidad' ? r.peso_unidad_g : null,
                            horas_hombre: r.mano_obra_horas,
                            costo_empaque: 0,
                            lote_minimo: r.lote_minimo,
                            unidad_lote: 'kg',
                            logica_formula: r.logica_formula,
                            details: []
                        };
                    }
                    groups[r.receta_codigo].details.push({
                        ingredientId: r.ingrediente_id,
                        porcentaje: r.porcentaje,
                        gramos: r.gramos
                    });
                });

                // Save each recipe and details (sequentially to avoid race conditions and fetch the computed weight values)
                const newRecipesList = [];
                const newWipIngredientsList = [];

                for (const g of Object.values(groups)) {
                    // 1. Calculate weights in grams (replicating EngineeringView logic)
                    const kgLoteFinal = g.formato_venta === 'Unidad' 
                        ? (g.lote_minimo * g.peso_unidad) / 1000 
                        : g.lote_minimo;
                    
                    const mermaFactor = 1 - (g.merma / 100);
                    const kgLoteBruto = mermaFactor > 0 ? kgLoteFinal / mermaFactor : kgLoteFinal;

                    let detailsConGramos = [];
                    if (g.logica_formula === 'batch') {
                        detailsConGramos = g.details.map(d => ({ ...d, gramos: Number(d.gramos || 0) }));
                    } else {
                        // % Panadero: Harina base is scaled to match the crude target weight
                        const sumPct = g.details.reduce((acc, d) => acc + (d.porcentaje || 0), 0);
                        const masaBruta = kgLoteBruto * 1000;
                        const baseHarina = sumPct > 0 ? masaBruta / (sumPct / 100) : 0;
                        detailsConGramos = g.details.map(d => ({
                            ...d,
                            gramos: d.porcentaje > 0 ? Math.round((d.porcentaje / 100) * baseHarina) : 0
                        }));
                    }

                    const peso_crudo = detailsConGramos.reduce((a, b) => a + Number(b.gramos || 0), 0);
                    const peso_final = peso_crudo * (1 - (g.merma / 100));

                    const recipeHeaderData = {
                        codigo: g.codigo,
                        nombre_producto: g.nombre_producto,
                        familia: g.familia,
                        version: g.version,
                        es_subensamble: g.es_subensamble,
                        merma: g.merma,
                        formato_venta: g.formato_venta,
                        peso_unidad: g.peso_unidad,
                        peso_crudo: peso_crudo,
                        peso_final: peso_final,
                        horas_hombre: g.horas_hombre,
                        costo_empaque: 0,
                        lote_minimo: g.lote_minimo,
                        unidad_lote: 'kg',
                        logica_formula: g.logica_formula
                    };

                    // Upsert or Insert recipe header
                    // We check if code exists.
                    const existingRec = recipes.find(r => r.codigo === g.codigo);
                    let recipeId;

                    if (existingRec) {
                        recipeId = existingRec.id;
                        const { error } = await supabase.from('recetas').update(recipeHeaderData).eq('id', recipeId);
                        if (error) throw error;
                        // delete existing ingredients details
                        await supabase.from('receta_ingredientes').delete().eq('receta_id', recipeId);
                    } else {
                        const { data, error } = await supabase.from('recetas').insert([recipeHeaderData]).select();
                        if (error) throw error;
                        recipeId = data[0].id;
                    }

                    // Insert recipe ingredients
                    const detailsToInsert = detailsConGramos.map(d => ({
                        receta_id: recipeId,
                        ingrediente_id: d.ingredientId,
                        porcentaje: d.porcentaje,
                        gramos: d.gramos
                    }));
                    
                    const { error: detError } = await supabase.from('receta_ingredientes').insert(detailsToInsert);
                    if (detError) throw detError;

                    // If WIP, create ingredient item in catalog
                    if (g.es_subensamble) {
                        const existingWip = ingredients.find(i => i.codigo === g.codigo);
                        if (!existingWip) {
                            const wipData = {
                                codigo: g.codigo,
                                name: `[WIP] ${g.nombre_producto}`,
                                unidad_compra: 'Gramos',
                                es_subensamble: true,
                                familia: 'WIP (Producción)',
                                almacen: 'Cámara de Frío 2 (WIP)',
                                costo_estandar: 0
                            };
                            const { data: insertedWip } = await supabase.from('ingredientes').insert([wipData]).select();
                            if (insertedWip) newWipIngredientsList.push(insertedWip[0]);
                        }
                    }

                    newRecipesList.push({
                        id: recipeId,
                        ...recipeHeaderData,
                        loteMinimo: recipeHeaderData.lote_minimo,
                        unidadLote: 'kg',
                        details: detailsConGramos
                    });
                }

                // Update Engineering states
                if (newWipIngredientsList.length > 0) {
                    onSuccess.setIngredients(prev => [...prev, ...newWipIngredientsList]);
                }
                
                onSuccess.setRecipes(prev => {
                    const filtered = prev.filter(p => !newRecipesList.some(n => n.id === p.id));
                    return [...newRecipesList, ...filtered];
                });

                showToast(`Se cargaron/actualizaron ${Object.keys(groups).length} recetas exitosamente.`);
            }
            
            else if (type === 'charc_recetas') {
                // Group by recipe code
                const groups = {};
                parsedData.forEach(r => {
                    if (!groups[r.receta_codigo]) {
                        groups[r.receta_codigo] = {
                            codigo: r.receta_codigo,
                            nombre: r.receta_nombre,
                            familia_tecnologica: r.familia_tecnologica,
                            lead_time_dias: r.lead_time_dias,
                            merma_secado_objetivo: r.merma_secado_objetivo,
                            porcentaje_inyeccion: r.porcentaje_inyeccion,
                            version: 1,
                            details: []
                        };
                    }
                    groups[r.receta_codigo].details.push({
                        ingredientId: r.ingrediente_id,
                        porcentaje_base: r.porcentaje_base,
                        categoria_tecnologica: r.categoria_tecnologica,
                        secuencia_mezcla: r.secuencia_mezcla
                    });
                });

                const newCharcRecipesList = [];

                for (const g of Object.values(groups)) {
                    // Compute grams based on family technology
                    const baseRef = (g.familia_tecnologica === 'fermentado_seco' || g.familia_tecnologica === 'emulsion_fina') ? 10000 : 1000;
                    
                    const detailsMapped = g.details.map(d => ({
                        ...d,
                        gramos: Number(((Number(d.porcentaje_base || 0) / 100) * baseRef).toFixed(2))
                    }));

                    const recipeHeaderData = {
                        codigo: g.codigo,
                        nombre: g.nombre,
                        lead_time_dias: g.lead_time_dias,
                        merma_secado_objetivo: g.merma_secado_objetivo,
                        familia_tecnologica: g.familia_tecnologica,
                        porcentaje_inyeccion: g.familia_tecnologica === 'salazon_inyectada' ? g.porcentaje_inyeccion : null,
                        version: g.version
                    };

                    // Check if exists
                    const existingRec = charcRecetas.find(r => r.codigo === g.codigo);
                    let recipeId;

                    if (existingRec) {
                        recipeId = existingRec.id;
                        const { error } = await supabase.from('charc_recetas').update(recipeHeaderData).eq('id', recipeId);
                        if (error) throw error;
                        await supabase.from('charc_receta_ingredientes').delete().eq('receta_id', recipeId);
                    } else {
                        const { data, error } = await supabase.from('charc_recetas').insert([recipeHeaderData]).select();
                        if (error) throw error;
                        recipeId = data[0].id;
                    }

                    // Save details
                    const detailsToInsert = detailsMapped.map(d => ({
                        receta_id: recipeId,
                        ingrediente_id: d.ingredientId,
                        porcentaje_base: d.porcentaje_base,
                        categoria_tecnologica: d.categoria_tecnologica,
                        secuencia_mezcla: d.secuencia_mezcla,
                        gramos: d.gramos
                    }));

                    const { error: detError } = await supabase.from('charc_receta_ingredientes').insert(detailsToInsert);
                    if (detError) throw detError;

                    newCharcRecipesList.push({
                        id: recipeId,
                        ...recipeHeaderData,
                        details: detailsMapped
                    });
                }

                // Update Charcuteria state
                onSuccess.setCharcRecetas(prev => {
                    const filtered = prev.filter(p => !newCharcRecipesList.some(n => n.id === p.id));
                    return [...newCharcRecipesList, ...filtered];
                });

                showToast(`Se cargaron/actualizaron ${Object.keys(groups).length} recetas de charcutería exitosamente.`);
            }

            setSuccessMessage("¡Carga masiva completada con éxito!");
            setParsedData([]);
            setTimeout(() => {
                onClose();
            }, 1500);

        } catch (err) {
            setValidationErrors(["Error al guardar en base de datos: " + err.message]);
        } finally {
            setLoading(false);
        }
    };

    // Model CSV template generator for direct download
    const downloadTemplate = () => {
        let headers = [];
        let rows = [];

        if (type === 'proveedores') {
            headers = ['Codigo', 'Razon_Social', 'CUIT', 'Rubro'];
            rows = [
                ['', 'Molinos Cañuelas SA', '30-50001020-9', 'Harinas'],
                ['PRV-102', 'Distribuidora Lácteos Oeste', '30-77665544-2', 'Lácteos']
            ];
        } else if (type === 'clientes') {
            headers = ['Codigo', 'Razon_Social', 'CUIT', 'Tipo', 'Direccion'];
            rows = [
                ['', 'Dietética La Abuela', '27-99887766-4', 'Dietética', 'Mitre 250, Castelar'],
                ['CLI-105', 'Supermercado Vea', '30-11223344-5', 'Supermercado', 'Av Rivadavia 18200, Moron']
            ];
        } else if (type === 'ingredientes') {
            headers = ['Codigo', 'Nombre', 'Tipo', 'Familia', 'Unidad_Compra', 'Factor_Conversion', 'Unidad_Base', 'Almacen', 'Alergenos', 'Costo_Presentacion'];
            rows = [
                ['', 'Harina de Centeno Fina', 'insumo', 'Harinas y Polvos', 'Bolsa 25 kg', '25000', 'g', 'Harinera', 'TACC', '22500'],
                ['RAW-FER-010', 'Levadura Seca Paquete', 'insumo', 'Fermentos', 'Paquete 500g', '500', 'g', 'Cámara de Frío 1 (Insumos)', '', '4500'],
                ['', 'Bolsa de Celofán 100u', 'empaque', 'Empaque', 'Unidad', '1', 'u', 'Depósito Empaque', '', '15']
            ];
        } else if (type === 'recetas') {
            headers = ['Receta_Codigo', 'Receta_Nombre', 'Familia', 'Wip', 'Logica_Formula', 'Formato_Venta', 'Peso_Unidad_g', 'Merma_Coccion_Pct', 'Mano_Obra_Horas', 'Lote_Minimo', 'Ingrediente_Codigo_o_Nombre', 'Porcentaje', 'Gramos'];
            rows = [
                ['FG-F-050', 'Pan de Centeno 400g', 'F', 'false', 'panadero', 'Unidad', '400', '15', '1.5', '50', 'Harina 000 (Fuerza)', '100', ''],
                ['FG-F-050', 'Pan de Centeno 400g', 'F', 'false', 'panadero', 'Unidad', '400', '15', '1.5', '50', 'Harina de Centeno Fina', '30', ''],
                ['FG-F-050', 'Pan de Centeno 400g', 'F', 'false', 'panadero', 'Unidad', '400', '15', '1.5', '50', 'Agua Filtrada', '65', ''],
                ['FG-F-050', 'Pan de Centeno 400g', 'F', 'false', 'panadero', 'Unidad', '400', '15', '1.5', '50', 'Sal Fina', '2', ''],
                ['FG-F-050', 'Pan de Centeno 400g', 'F', 'false', 'panadero', 'Unidad', '400', '15', '1.5', '50', 'Levadura Fresca', '2', '']
            ];
        } else if (type === 'charc_recetas') {
            headers = ['Receta_Codigo', 'Receta_Nombre', 'Familia_Tecnologica', 'Lead_Time_Dias', 'Merma_Secado_Objetivo', 'Porcentaje_Inyeccion', 'Ingrediente_Codigo_o_Nombre', 'Porcentaje_Base', 'Categoria_Tecnologica', 'Secuencia_Mezcla'];
            rows = [
                ['', 'Salame Milán Especial', 'fermentado_seco', '45', '35', '', 'Paleta Cerdo deshuesada', '65', 'magro', '1'],
                ['', 'Salame Milán Especial', 'fermentado_seco', '45', '35', '', 'Tocino de Cerdo (Grasa)', '35', 'grasa', '1'],
                ['', 'Salame Milán Especial', 'fermentado_seco', '45', '35', '', 'Sal Fina', '2.6', 'aditivo', '2'],
                ['', 'Salame Milán Especial', 'fermentado_seco', '45', '35', '', 'Sal de Cura (0.6% Nitrito)', '0.3', 'aditivo', '2'],
                ['', 'Salame Milán Especial', 'fermentado_seco', '45', '35', '', 'Dextrosa Monohidratada', '0.4', 'saborizante', '3'],
                ['CH-BND-002', 'Bondiola Casera Premium', 'salazon_cruda', '60', '38', '', 'Paleta Cerdo deshuesada', '100', 'magro', '1'],
                ['CH-BND-002', 'Bondiola Casera Premium', 'salazon_cruda', '60', '38', '', 'Sal Fina', '3', 'aditivo', '2']
            ];
        }

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `plantilla_${type}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getTitle = () => {
        switch (type) {
            case 'proveedores': return 'Carga Masiva de Proveedores';
            case 'clientes': return 'Carga Masiva de Clientes';
            case 'ingredientes': return 'Carga Masiva de Insumos y Packaging';
            case 'recetas': return 'Carga Masiva de Recetas (BOMs)';
            case 'charc_recetas': return 'Carga Masiva de Fichas de Charcutería';
            default: return 'Carga Masiva';
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Modal Header */}
                <div className="px-8 py-5 bg-slate-950 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-base font-black uppercase italic tracking-wider flex items-center gap-2">
                            <Table size={18} className="text-orange-500" />
                            {getTitle()}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Carga desde enlace compartido de Google Sheets, archivo CSV o portapapeles</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-8 overflow-y-auto flex-1 space-y-6">
                    
                    {/* Template Downloader section */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h4 className="text-xs font-black uppercase italic text-slate-800">1. Descarga la Plantilla de Trabajo</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Usa esta estructura exacta para evitar errores de validación. Carga opcionalmente el código; si está vacío, se auto-generará.</p>
                        </div>
                        <button onClick={downloadTemplate} className="shrink-0 flex items-center gap-2 px-4 py-2 border border-slate-300 hover:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-700 hover:bg-slate-900 hover:text-white rounded-xl transition-all shadow-sm active:scale-95">
                            <Download size={14} /> Descargar .CSV Modelo
                        </button>
                    </div>

                    {/* Method Selection tabs */}
                    <div className="space-y-4">
                        <div className="flex gap-2 border-b border-slate-200 pb-1">
                            {[
                                { id: 'url', l: 'Enlace Google Sheets', icon: <Link2 size={14} /> },
                                { id: 'file', l: 'Subir Archivo CSV', icon: <Upload size={14} /> },
                                { id: 'paste', l: 'Copiar y Pegar Celdas', icon: <Clipboard size={14} /> },
                            ].map(t => (
                                <button key={t.id} onClick={() => { setActiveTab(t.id); setParsedData([]); setValidationErrors([]); }} 
                                    className={`px-4 py-2 rounded-t-xl font-black uppercase text-[9px] tracking-wider transition-all flex items-center gap-1.5 border-b-2 -mb-[3px] ${activeTab === t.id ? 'border-orange-500 text-slate-900 bg-orange-50/50' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
                                    {t.icon} {t.l}
                                </button>
                            ))}
                        </div>

                        {/* Input forms based on tabs */}
                        <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6">
                            {activeTab === 'url' && (
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-1 text-left">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Enlace del Google Sheet Compartido</label>
                                        <div className="flex gap-2">
                                            <input type="text" value={googleUrl} onChange={(e) => setGoogleUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0" 
                                                className="flex-1 border border-slate-200 bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 text-xs font-semibold text-slate-800 transition-all shadow-sm" />
                                            <button onClick={handleUrlFetch} disabled={loading || !googleUrl} 
                                                className="px-6 py-3 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-2 disabled:opacity-40">
                                                {loading ? <Loader2 size={14} className="animate-spin" /> : 'Procesar Sheet'}
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide leading-relaxed italic">
                                        ⚠️ **Importante**: El archivo de Google Sheets debe configurarse en compartir como: **"Cualquier persona con el enlace puede ver"** (Acceso público de lectura), de lo contrario, el sistema no tendrá permisos para leerlo.
                                    </p>
                                </div>
                            )}

                            {activeTab === 'file' && (
                                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-slate-400 bg-white rounded-2xl p-8 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                                    <Upload size={32} className="text-slate-400 mb-2" />
                                    <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Arrastra o haz clic para subir tu archivo CSV</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Soporta codificación UTF-8 delimitado por comas, puntos y comas o tabulaciones</p>
                                </div>
                            )}

                            {activeTab === 'paste' && (
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-1 text-left">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pega tus celdas copiadas de Google Sheets o Excel</label>
                                        <textarea value={pastedText} onChange={(e) => setPastedText(e.target.value)} placeholder="Codigo	Nombre	CUIT	Rubro (Copia celdas enteras incluyendo cabeceras y pegalas aquí)" rows={5}
                                            className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 text-xs font-mono text-slate-800 transition-all shadow-sm" />
                                    </div>
                                    <div className="flex justify-end">
                                        <button onClick={handleTextPaste} disabled={loading || !pastedText.trim()} 
                                            className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-2 disabled:opacity-40">
                                            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Procesar Celdas'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Progress indicators / messages */}
                    {loading && (
                        <div className="flex items-center justify-center gap-2 py-4 text-xs font-bold text-slate-500">
                            <Loader2 size={16} className="animate-spin text-orange-500" />
                            Procesando y validando filas en tiempo real...
                        </div>
                    )}

                    {successMessage && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in fade-in duration-300">
                            <Check className="text-emerald-500 shrink-0" size={20} />
                            <p className="font-bold text-sm">{successMessage}</p>
                        </div>
                    )}

                    {/* Validation Errors panel */}
                    {validationErrors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-2xl space-y-2 animate-in fade-in duration-300">
                            <div className="flex items-center gap-2 text-red-700">
                                <AlertCircle size={18} className="shrink-0" />
                                <h5 className="font-black uppercase text-xs">Errores de Validación Encontrados ({validationErrors.length})</h5>
                            </div>
                            <ul className="text-[10px] font-mono leading-relaxed space-y-1 list-disc pl-5 max-h-40 overflow-y-auto">
                                {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                            <p className="text-[9px] text-red-600 font-bold uppercase tracking-wide pt-1">
                                🚫 Corrige los errores en la plantilla y vuelve a intentar el proceso de carga.
                            </p>
                        </div>
                    )}

                    {/* Data Preview Table */}
                    {parsedData.length > 0 && validationErrors.length === 0 && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">2. Vista Previa de Datos a Importar ({parsedData.length} filas detectadas)</h4>
                                <span className="bg-emerald-50 text-emerald-700 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-emerald-200">✓ Validación Aprobada</span>
                            </div>
                            
                            <div className="overflow-hidden border border-slate-200 rounded-2xl max-h-72 overflow-y-auto">
                                <table className="w-full text-left text-[10px] font-bold uppercase text-slate-700">
                                    <thead className="bg-slate-900 text-white text-[8px] tracking-widest sticky top-0">
                                        {type === 'proveedores' && (
                                            <tr>
                                                <th className="px-4 py-2.5">Código SKU</th>
                                                <th className="px-4 py-2.5">Razón Social</th>
                                                <th className="px-4 py-2.5">CUIT</th>
                                                <th className="px-4 py-2.5">Rubro</th>
                                            </tr>
                                        )}
                                        {type === 'clientes' && (
                                            <tr>
                                                <th className="px-4 py-2.5">Código SKU</th>
                                                <th className="px-4 py-2.5">Razón Social</th>
                                                <th className="px-4 py-2.5">CUIT</th>
                                                <th className="px-4 py-2.5">Tipo</th>
                                                <th className="px-4 py-2.5">Dirección / Zona</th>
                                            </tr>
                                        )}
                                        {type === 'ingredientes' && (
                                            <tr>
                                                <th className="px-4 py-2.5">Código SKU</th>
                                                <th className="px-4 py-2.5">Nombre</th>
                                                <th className="px-4 py-2.5">Tipo</th>
                                                <th className="px-4 py-2.5">Familia</th>
                                                <th className="px-4 py-2.5 text-right">U. Compra</th>
                                                <th className="px-4 py-2.5 text-right">F. Conversión</th>
                                                <th className="px-4 py-2.5 text-right">Costo Pres.</th>
                                                <th className="px-4 py-2.5 text-right">Costo Est. base</th>
                                            </tr>
                                        )}
                                        {type === 'recetas' && (
                                            <tr>
                                                <th className="px-4 py-2.5">Receta Cód.</th>
                                                <th className="px-4 py-2.5">Nombre Receta</th>
                                                <th className="px-4 py-2.5">Lógica</th>
                                                <th className="px-4 py-2.5">Ingrediente</th>
                                                <th className="px-4 py-2.5 text-right">Porcentaje</th>
                                                <th className="px-4 py-2.5 text-right">Gramos (Batch)</th>
                                            </tr>
                                        )}
                                        {type === 'charc_recetas' && (
                                            <tr>
                                                <th className="px-4 py-2.5">Receta Cód.</th>
                                                <th className="px-4 py-2.5">Chacinado</th>
                                                <th className="px-4 py-2.5">Familia Tecnológica</th>
                                                <th className="px-4 py-2.5">Ingrediente</th>
                                                <th className="px-4 py-2.5">Categoría</th>
                                                <th className="px-4 py-2.5 text-right">% Base</th>
                                            </tr>
                                        )}
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {parsedData.map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                {type === 'proveedores' && (
                                                    <>
                                                        <td className="px-4 py-2 font-mono text-blue-600 font-black">{row.codigo}</td>
                                                        <td className="px-4 py-2 text-slate-800">{row.razon_social}</td>
                                                        <td className="px-4 py-2 font-mono">{row.cuit}</td>
                                                        <td className="px-4 py-2 text-slate-500">{row.rubro || '-'}</td>
                                                    </>
                                                )}
                                                {type === 'clientes' && (
                                                    <>
                                                        <td className="px-4 py-2 font-mono text-blue-600 font-black">{row.codigo}</td>
                                                        <td className="px-4 py-2 text-slate-800">{row.razon_social}</td>
                                                        <td className="px-4 py-2 font-mono">{row.cuit}</td>
                                                        <td className="px-4 py-2"><span className="bg-emerald-50 text-emerald-700 px-1 rounded text-[8px]">{row.tipo}</span></td>
                                                        <td className="px-4 py-2 text-slate-500 truncate max-w-xs">{row.direccion || '-'}</td>
                                                    </>
                                                )}
                                                {type === 'ingredientes' && (
                                                    <>
                                                        <td className="px-4 py-2 font-mono text-blue-600 font-black">{row.codigo}</td>
                                                        <td className="px-4 py-2 text-slate-800">{row.name}</td>
                                                        <td className="px-4 py-2 lowercase text-slate-500">{row.tipo}</td>
                                                        <td className="px-4 py-2"><span className="bg-slate-100 px-1.5 py-0.5 rounded text-[8px]">{row.familia}</span></td>
                                                        <td className="px-4 py-2 text-right">{row.unidad_compra}</td>
                                                        <td className="px-4 py-2 text-right font-mono">{row.factor_conversion.toLocaleString('es-AR')} {row.unidad_base}</td>
                                                        <td className="px-4 py-2 text-right font-mono text-slate-600">${row.costo_presentacion.toFixed(2)}</td>
                                                        <td className="px-4 py-2 text-right font-mono text-emerald-600 font-black">${row.costo_estandar.toFixed(4)} / {row.unidad_base}</td>
                                                    </>
                                                )}
                                                {type === 'recetas' && (
                                                    <>
                                                        <td className="px-4 py-2 font-mono text-slate-500 font-black">{row.receta_codigo}</td>
                                                        <td className="px-4 py-2 text-slate-800">{row.receta_nombre}</td>
                                                        <td className="px-4 py-2 capitalize"><span className="bg-orange-50 text-orange-700 px-1.5 rounded text-[8px] font-black">{row.logica_formula}</span></td>
                                                        <td className="px-4 py-2 font-sans font-normal lowercase">{row.ingrediente_nombre} <span className="text-[8px] font-mono text-blue-500">({row.ingrediente_codigo})</span></td>
                                                        <td className="px-4 py-2 text-right font-mono">{row.porcentaje !== null ? `${row.porcentaje}%` : '-'}</td>
                                                        <td className="px-4 py-2 text-right font-mono">{row.gramos > 0 ? `${row.gramos} g` : '-'}</td>
                                                    </>
                                                )}
                                                {type === 'charc_recetas' && (
                                                    <>
                                                        <td className="px-4 py-2 font-mono text-slate-500 font-black">{row.receta_codigo}</td>
                                                        <td className="px-4 py-2 text-slate-800">{row.receta_nombre}</td>
                                                        <td className="px-4 py-2 capitalize"><span className="bg-red-50 text-red-700 px-1.5 rounded text-[8px] font-black">{row.familia_tecnologica.replace('_', ' ')}</span></td>
                                                        <td className="px-4 py-2 font-sans font-normal lowercase">{row.ingrediente_nombre} <span className="text-[8px] font-mono text-blue-500">({row.ingrediente_codigo})</span></td>
                                                        <td className="px-4 py-2"><span className="bg-slate-100 px-1.5 rounded text-[8px]">{row.categoria_tecnologica}</span></td>
                                                        <td className="px-4 py-2 text-right font-mono">{row.porcentaje_base !== null ? `${row.porcentaje_base}%` : '-'}</td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-800 text-[10px] font-black uppercase tracking-wider transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleImportSave} disabled={parsedData.length === 0 || validationErrors.length > 0 || loading}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-2">
                        {loading ? <Loader2 size={14} className="animate-spin" /> : 'Confirmar e Importar a Base de Datos'}
                    </button>
                </div>
            </div>
        </div>
    );
}
