'use client';
import React, { useState, useEffect } from 'react';
import { Printer, X, Sliders, Settings, QrCode, FileText, CheckCircle, Tag, Eye } from 'lucide-react';

/**
 * PrintPreviewModal
 * Reusable modal that wraps any printable data in a standardized style,
 * provides custom layout options, and initiates window.print() targeting only the preview content.
 */
export default function PrintPreviewModal({
    isOpen,
    onClose,
    type, // 'label' | 'production_order' | 'inventory_sheet' | 'recipe_list' | 'master_list'
    data, // Data payload specific to the type
    theme: appTheme = 'maldonado-contraste'
}) {
    const [pageSize, setPageSize] = useState('a4'); // 'a4' | '80mm' | '58mm' | '48mm'
    const [showLogo, setShowLogo] = useState(true);
    const [showSignatures, setShowSignatures] = useState(true);
    const [fontSize, setFontSize] = useState('md'); // 'sm' | 'md' | 'lg'
    const [printStyle, setPrintStyle] = useState('artisan'); // 'artisan' (Casa Maldonado serif/sans) | 'industrial' (B&N high contrast) | 'mono' (monospace)
    const [qrSize, setQrSize] = useState('md'); // 'sm' | 'md' | 'lg'
    const [qrCodeUrl, setQrCodeUrl] = useState('');

    useEffect(() => {
        // Auto-select page size based on print type
        if (type === 'label') {
            setPageSize('80mm');
            setPrintStyle('mono');
        } else {
            setPageSize('a4');
            setPrintStyle('artisan');
        }
    }, [type, data]);

    useEffect(() => {
        if (pageSize === '48mm' || pageSize === '58mm') {
            setFontSize('sm');
        } else {
            setFontSize('md');
        }
    }, [pageSize]);

    useEffect(() => {
        if (!data) return;
        let qrText = '';
        if (type === 'label') {
            qrText = `LOTE: ${data.lote || ''}\nSKU: ${data.sku || ''}\nPRODUCTO: ${data.title || ''}\nVENC: ${data.vencimiento || ''}`;
        } else if (type === 'production_order') {
            qrText = `ORDEN: ${data.codigo_orden || ''}\nRECETA: ${data.receta_nombre || ''}\nCANT: ${data.meta_cantidad || ''} ${data.meta_unidad || ''}`;
        } else {
            try {
                qrText = typeof data === 'object' ? JSON.stringify(data).substring(0, 150) : String(data);
            } catch (e) {
                qrText = 'Casa Maldonado';
            }
        }

        import('qrcode').then(QRCode => {
            QRCode.toDataURL(qrText, { 
                margin: 1, 
                scale: 4,
                errorCorrectionLevel: 'M'
            })
            .then(url => setQrCodeUrl(url))
            .catch(err => console.error('Error generating QR:', err));
        }).catch(err => console.error('Failed to load qrcode library:', err));
    }, [data, type]);

    if (!isOpen || !data) return null;

    const handlePrint = () => {
        // Trigger the print dialog
        window.print();
    };

    // Typography sizing maps
    const textSizes = {
        sm: {
            title: 'text-lg',
            subtitle: 'text-[9px]',
            body: 'text-[10px]',
            tableHeader: 'text-[9px]',
            tableBody: 'text-[9px]',
            meta: 'text-[8px]'
        },
        md: {
            title: 'text-xl',
            subtitle: 'text-[10px]',
            body: 'text-xs',
            tableHeader: 'text-[10px]',
            tableBody: 'text-xs',
            meta: 'text-[9px]'
        },
        lg: {
            title: 'text-2xl',
            subtitle: 'text-xs',
            body: 'text-sm',
            tableHeader: 'text-xs',
            tableBody: 'text-sm',
            meta: 'text-[10px]'
        }
    };

    const s = textSizes[fontSize];

    // Determine typography styles
    const fontClass = printStyle === 'mono' 
        ? 'font-mono' 
        : printStyle === 'industrial' 
            ? 'font-sans' 
            : 'font-sans tracking-wide';

    const headerBorderClass = printStyle === 'industrial' 
        ? 'border-b-4 border-black' 
        : 'border-b-2 border-slate-900';

    // RENDER: Label Content
    const renderLabel = (labelData) => {
        const getQrDimensions = () => {
            const base = pageSize === '48mm' ? 44 : pageSize === '58mm' ? 68 : 96;
            if (qrSize === 'sm') return base - 12;
            if (qrSize === 'lg') return base + 20;
            return base;
        };
        const qrDimensions = getQrDimensions();
        const paddingClass = pageSize === '48mm' ? 'p-2 text-center select-none bg-white text-black' : pageSize === '58mm' ? 'p-3 text-center select-none bg-white text-black' : 'p-4 text-center select-none bg-white text-black';
        const logoSize = pageSize === '48mm' ? 'h-8 w-8' : pageSize === '58mm' ? 'h-10 w-10' : 'h-12 w-12';
        const spaceClass = pageSize === '48mm' ? 'space-y-0.5 text-left border-b border-dashed border-slate-300 pb-1.5 mb-1.5' : 'space-y-1.5 text-left border-b border-dashed border-slate-300 pb-3 mb-3';
        const titleFont = pageSize === '48mm' ? 'text-[11px] leading-tight font-black uppercase text-slate-900' : pageSize === '58mm' ? 'text-xs leading-tight font-black uppercase text-slate-900' : `${s.title} font-black uppercase leading-tight text-slate-900`;
        const labelLabelSize = pageSize === '48mm' ? 'text-[8px] font-bold uppercase tracking-wider text-slate-400' : 'text-[10px] text-slate-400 font-bold uppercase tracking-wider';
        const labelValSize = pageSize === '48mm' ? 'text-[9px] font-mono font-black text-slate-800' : 'text-[10px] font-mono font-black text-slate-800';
        const labelValSizeLote = pageSize === '48mm' ? 'text-[9px] font-mono font-black text-slate-900 bg-slate-100 px-0.5 rounded' : 'text-[10px] font-mono font-black text-slate-900 bg-slate-100 px-1 rounded';
        
        return (
            <div className={`${paddingClass} ${fontClass}`}>
                {showLogo && (
                    <div className={`flex flex-col items-center justify-center border-b border-dashed border-slate-300 pb-1 ${pageSize === '48mm' ? 'mb-1.5' : 'mb-3'}`}>
                        <img 
                            src="/logo.png" 
                            alt="Casa Maldonado Logo" 
                            className={`${logoSize} object-contain rounded-full border border-slate-200 ${
                                printStyle === 'industrial' || printStyle === 'mono' ? 'grayscale contrast-200 brightness-95' : ''
                            }`}
                        />
                        {pageSize !== '48mm' && (
                            <span className="text-[8px] text-slate-400 font-mono tracking-widest uppercase mt-1">Casa Maldonado — A Lareira</span>
                        )}
                    </div>
                )}
                
                <div className={`${headerBorderClass} ${pageSize === '48mm' ? 'pb-1 mb-1.5' : 'pb-2 mb-3'}`}>
                    <h2 className={titleFont}>{labelData.title}</h2>
                    {labelData.sector && pageSize !== '48mm' && (
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Sector: {labelData.sector}</p>
                    )}
                </div>

                <div className={spaceClass}>
                    <div className="flex justify-between items-center">
                        <span className={labelLabelSize}>SKU:</span>
                        <span className={labelValSize}>{labelData.sku}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className={labelLabelSize}>Lote:</span>
                        <span className={labelValSizeLote}>{labelData.lote}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className={labelLabelSize}>Cantidad:</span>
                        <span className={labelValSize}>{labelData.peso}</span>
                    </div>
                    {labelData.ingreso && (
                        <div className="flex justify-between items-center">
                            <span className={labelLabelSize}>Envasado:</span>
                            <span className={labelValSize}>{labelData.ingreso}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span className={labelLabelSize}>Vence:</span>
                        <span className={`${labelValSize} text-red-650 font-black`}>{labelData.vencimiento}</span>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-1 mt-1">
                    <div className="border border-slate-200 p-1 rounded-lg bg-white flex items-center justify-center shadow-sm">
                        {qrCodeUrl ? (
                            <img 
                                src={qrCodeUrl} 
                                alt="QR Lote" 
                                style={{ width: `${qrDimensions}px`, height: `${qrDimensions}px` }} 
                                className="object-contain"
                            />
                        ) : (
                            <div 
                                style={{ width: `${qrDimensions}px`, height: `${qrDimensions}px` }} 
                                className="animate-pulse bg-slate-100 flex items-center justify-center text-[7px] text-slate-400 font-mono"
                            >
                                Gen...
                            </div>
                        )}
                    </div>
                    {pageSize !== '48mm' && pageSize !== '58mm' && (
                        <p className="text-[6px] font-mono text-slate-400 uppercase tracking-wider mt-0.5">
                            Escanear para trazabilidad
                        </p>
                    )}
                </div>
            </div>
        );
    };

    // RENDER: Production Order Content
    const renderProductionOrder = (order) => {
        return (
            <div className={`p-8 text-black bg-white ${fontClass} flex flex-col min-h-[550px]`}>
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-5">
                    <div>
                        {showLogo && (
                            <div className="mb-2 flex items-center gap-3">
                                <img 
                                    src="/logo.png" 
                                    alt="Logo" 
                                    className={`h-12 w-12 object-contain rounded-full border border-slate-200 ${
                                        printStyle === 'industrial' || printStyle === 'mono' ? 'grayscale contrast-200 brightness-95' : ''
                                    }`}
                                />
                                <div>
                                    <h4 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-800 leading-none">Casa Maldonado</h4>
                                    <span className="text-[8px] text-slate-400 font-mono tracking-widest uppercase">A Lareira</span>
                                </div>
                            </div>
                        )}
                        <h1 className="text-2xl font-black uppercase italic tracking-tighter leading-none text-slate-900">Hoja de Producción</h1>
                        <p className="text-[9px] font-bold uppercase text-slate-500 mt-1 tracking-widest">{order.codigo_orden}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-mono font-black bg-slate-900 text-white px-2 py-0.5 rounded uppercase">
                            {order.estado || 'PLANIFICADA'}
                        </span>
                        <p className="text-[9px] font-mono mt-1 text-slate-500">Fecha: {new Date(order.fecha_tarea || order.date || Date.now()).toLocaleDateString('es-AR')}</p>
                    </div>
                </div>

                {/* Meta details */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 mb-5">
                    <div>
                        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Producto a Elaborar</p>
                        <p className="text-sm font-black text-slate-900">{order.receta_nombre}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Meta de Producción</p>
                        <p className="text-sm font-black text-slate-900">{order.meta_cantidad} {order.meta_unidad}</p>
                    </div>
                </div>

                {/* Insumos table */}
                <div className="flex-1 mb-6">
                    <h3 className="text-[10px] font-black uppercase tracking-wider mb-2 border-b border-slate-300 pb-1 text-slate-700">Insumos y Trazabilidad FEFO</h3>
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-slate-900 text-[10px] uppercase font-bold text-slate-600 bg-slate-50">
                                <th className="px-3 py-1.5">Ingrediente</th>
                                <th className="px-3 py-1.5 text-right">Cant. Requerida</th>
                                <th className="px-3 py-1.5">Lote FEFO Sugerido</th>
                                <th className="px-3 py-1.5">Ubicación</th>
                                <th className="px-3 py-1.5 text-center">Pesado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {order.insumos && order.insumos.map((ins, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="px-3 py-2 font-bold text-slate-800">{ins.name}</td>
                                    <td className="px-3 py-2 text-right font-mono font-bold">
                                        {Number(ins.cantidad).toLocaleString('es-AR', { maximumFractionDigits: 1 })} {ins.unidad}
                                    </td>
                                    <td className="px-3 py-2">
                                        <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                                            {ins.lote || 'N/A (Verificar)'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-[10px] text-slate-500">{ins.ubicacion || 'Depósito'}</td>
                                    <td className="px-3 py-2 text-center text-slate-300 font-mono text-[11px]">[  ]</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer notes */}
                {order.observaciones && (
                    <div className="mb-6 bg-slate-50 p-3 rounded-lg border border-dashed text-[10px] text-slate-600">
                        <span className="font-bold uppercase block text-slate-800 mb-1">Notas de Producción / Taller:</span>
                        {order.observaciones}
                    </div>
                )}

                {/* Signatures and QR */}
                <div className="flex justify-between items-end border-t border-slate-200 pt-5 mt-auto">
                    {showSignatures ? (
                        <div className="grid grid-cols-2 gap-8 w-2/3">
                            <div className="border-t border-slate-900 pt-1 text-center">
                                <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Firma Operario</p>
                            </div>
                            <div className="border-t border-slate-900 pt-1 text-center">
                                <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Firma Supervisor</p>
                            </div>
                        </div>
                    ) : <div className="w-2/3"></div>}

                    <div className="text-center">
                        <div className="border border-slate-200 p-1 rounded bg-white flex items-center justify-center shadow-sm">
                            {qrCodeUrl ? (
                                <img src={qrCodeUrl} alt="QR Kanban" className="h-10 w-10 object-contain" />
                            ) : (
                                <div className="h-10 w-10 animate-pulse bg-slate-100" />
                            )}
                        </div>
                        <p className="text-[5px] font-mono text-slate-400 mt-1 uppercase leading-none">QR KANBAN</p>
                    </div>
                </div>
            </div>
        );
    };

    // RENDER: Inventory Physical Checklist
    const renderInventorySheet = (sheetData) => {
        return (
            <div className={`p-8 text-black bg-white ${fontClass}`}>
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-5">
                    <div>
                        {showLogo && (
                            <div className="mb-2 flex items-center gap-3">
                                <img 
                                    src="/logo.png" 
                                    alt="Logo" 
                                    className={`h-12 w-12 object-contain rounded-full border border-slate-200 ${
                                        printStyle === 'industrial' || printStyle === 'mono' ? 'grayscale contrast-200 brightness-95' : ''
                                    }`}
                                />
                                <div>
                                    <h4 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-800 leading-none">Casa Maldonado</h4>
                                    <span className="text-[8px] text-slate-400 font-mono tracking-widest uppercase">A Lareira</span>
                                </div>
                            </div>
                        )}
                        <h1 className="text-2xl font-black uppercase italic tracking-tighter leading-none text-slate-900">Planilla de Control Físico</h1>
                        <p className="text-[9px] font-bold uppercase text-slate-500 mt-1 tracking-widest">Auditoría y Recuento de Stock</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-mono font-bold text-slate-800">Fecha: {new Date().toLocaleDateString('es-AR')}</p>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Auditador por: ....................</p>
                    </div>
                </div>

                <table className="w-full text-left text-xs mb-6 border border-slate-200">
                    <thead>
                        <tr className="border-b border-slate-950 text-[10px] uppercase font-bold text-slate-700 bg-slate-50">
                            <th className="px-2 py-2 w-10 text-center">N°</th>
                            <th className="px-2 py-2">SKU</th>
                            <th className="px-2 py-2">Componente / Insumo</th>
                            <th className="px-2 py-2">Lote</th>
                            <th className="px-2 py-2 text-right">Stock Sistema</th>
                            <th className="px-2 py-2 text-center w-36">Conteo Real</th>
                            <th className="px-2 py-2 text-center w-24">Diferencia</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {sheetData.items && sheetData.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-2 py-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                                <td className="px-2 py-2.5 font-mono text-[10px] font-bold text-slate-800">{item.sku}</td>
                                <td className="px-2 py-2.5 font-bold text-slate-900">{item.name}</td>
                                <td className="px-2 py-2.5 font-mono text-[10px]">{item.lote}</td>
                                <td className="px-2 py-2.5 text-right font-mono font-bold text-slate-600">
                                    {Number(item.stock).toLocaleString('es-AR', { maximumFractionDigits: 2 })} {item.unidad}
                                </td>
                                <td className="px-2 py-2.5 text-center font-mono text-slate-300">
                                    .......................... {item.unidad}
                                </td>
                                <td className="px-2 py-2.5 text-center font-mono text-slate-300">
                                    [   ] Ok / ......
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {showSignatures && (
                    <div className="grid grid-cols-2 gap-12 border-t border-slate-200 pt-8 mt-12">
                        <div className="border-t border-slate-900 pt-1 text-center">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Firma Auditor / Pañolero</p>
                        </div>
                        <div className="border-t border-slate-900 pt-1 text-center">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Validado por Supervisor</p>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // RENDER: Recipe Engineering list
    const renderRecipeList = (recipesData) => {
        return (
            <div className={`p-8 text-black bg-white ${fontClass}`}>
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-5">
                    <div>
                        {showLogo && (
                            <div className="mb-2 flex items-center gap-3">
                                <img 
                                    src="/logo.png" 
                                    alt="Logo" 
                                    className={`h-12 w-12 object-contain rounded-full border border-slate-200 ${
                                        printStyle === 'industrial' || printStyle === 'mono' ? 'grayscale contrast-200 brightness-95' : ''
                                    }`}
                                />
                                <div>
                                    <h4 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-800 leading-none">Casa Maldonado</h4>
                                    <span className="text-[8px] text-slate-400 font-mono tracking-widest uppercase">A Lareira</span>
                                </div>
                            </div>
                        )}
                        <h1 className="text-2xl font-black uppercase italic tracking-tighter leading-none text-slate-900">Listado de Fórmulas y Costos</h1>
                        <p className="text-[9px] font-bold uppercase text-slate-500 mt-1 tracking-widest">Fichas de Ingeniería de Producción</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-mono font-bold text-slate-800">Fecha: {new Date().toLocaleDateString('es-AR')}</p>
                    </div>
                </div>

                <table className="w-full text-left text-xs mb-6 border border-slate-200">
                    <thead>
                        <tr className="border-b border-slate-950 text-[10px] uppercase font-bold text-slate-700 bg-slate-50">
                            <th className="px-3 py-2">Receta / Producto</th>
                            <th className="px-3 py-2 text-center">Familia</th>
                            <th className="px-3 py-2 text-right">Rinde Final</th>
                            <th className="px-3 py-2 text-right">Costo Unit.</th>
                            <th className="px-3 py-2 text-right">Margen</th>
                            <th className="px-3 py-2 text-right">Precio Sugerido</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {recipesData.recipes && recipesData.recipes.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-3 py-2.5 font-bold text-slate-900">
                                    {item.name}
                                    {item.sku && <p className="text-[9px] font-mono text-slate-400">{item.sku}</p>}
                                </td>
                                <td className="px-3 py-2.5 text-center font-mono">
                                    <span className="px-1.5 py-0.5 bg-slate-100 border rounded text-[9px] font-bold">
                                        {item.family}
                                    </span>
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono">{item.rinde}</td>
                                <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-700">
                                    ${Number(item.costo).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono font-semibold text-emerald-600">
                                    {item.margen}%
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono font-black text-slate-900">
                                    ${Number(item.precio).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    // RENDER: Master list (General table)
    const renderMasterList = (masterData) => {
        return (
            <div className={`p-8 text-black bg-white ${fontClass}`}>
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-5">
                    <div>
                        {showLogo && (
                            <div className="mb-2 flex items-center gap-3">
                                <img 
                                    src="/logo.png" 
                                    alt="Logo" 
                                    className={`h-12 w-12 object-contain rounded-full border border-slate-200 ${
                                        printStyle === 'industrial' || printStyle === 'mono' ? 'grayscale contrast-200 brightness-95' : ''
                                    }`}
                                />
                                <div>
                                    <h4 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-800 leading-none">Casa Maldonado</h4>
                                    <span className="text-[8px] text-slate-400 font-mono tracking-widest uppercase">A Lareira</span>
                                </div>
                            </div>
                        )}
                        <h1 className="text-xl font-black uppercase italic tracking-tighter leading-none text-slate-900">{masterData.title}</h1>
                        <p className="text-[9px] font-bold uppercase text-slate-500 mt-1 tracking-widest">Listado Maestro de Sistema</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-mono font-bold text-slate-800">Fecha: {new Date().toLocaleDateString('es-AR')}</p>
                    </div>
                </div>

                <table className="w-full text-left text-xs mb-6 border border-slate-200">
                    <thead>
                        <tr className="border-b border-slate-950 text-[10px] uppercase font-bold text-slate-700 bg-slate-50">
                            {masterData.headers && masterData.headers.map((h, idx) => (
                                <th key={idx} className="px-3 py-2">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {masterData.rows && masterData.rows.map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-slate-50 font-medium">
                                {Object.values(row).map((val, colIdx) => (
                                    <td key={colIdx} className="px-3 py-2">{val}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const getPreviewWidthClass = () => {
        if (pageSize === '80mm') return 'w-[302px]'; // 80mm equivalents in web px
        if (pageSize === '58mm') return 'w-[219px]'; // 58mm
        if (pageSize === '48mm') return 'w-[181px]'; // 48mm
        return 'w-[794px] max-w-full'; // A4 width proportion
    };

    const isMaldonadoTheme = appTheme === 'maldonado-contraste';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            
            {/* Main Modal Card */}
            <div className={`flex flex-col lg:flex-row w-full max-w-5xl h-[85vh] rounded-xl overflow-hidden border shadow-2xl ${
                isMaldonadoTheme 
                    ? 'bg-[#121212] border-[#222] text-[#f5f5f5]' 
                    : 'bg-white border-slate-200 text-slate-800'
            }`}>
                
                {/* 1. LEFT PANEL: Controls / Settings */}
                <div className={`w-full lg:w-80 flex flex-col border-b lg:border-b-0 lg:border-r p-6 shrink-0 ${
                    isMaldonadoTheme ? 'bg-[#0a0a0a] border-[#222]' : 'bg-slate-50 border-slate-200'
                }`}>
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <Settings size={18} className={isMaldonadoTheme ? 'text-[#e2c97d]' : 'text-slate-700'} />
                            <h3 className="text-sm font-black uppercase tracking-wider">Ajustes de Impresión</h3>
                        </div>
                        <button 
                            onClick={onClose} 
                            className={`p-1.5 rounded-lg transition-colors ${
                                isMaldonadoTheme ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                            }`}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex-1 space-y-5 overflow-y-auto pr-1 text-left">
                        {/* Selector de Tamaño de Papel */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Formato de Salida</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'a4', label: 'A4 Hojas' },
                                    { id: '80mm', label: '80 mm' },
                                    { id: '58mm', label: '58 mm' },
                                    { id: '48mm', label: '48 mm (Niimbot)' }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setPageSize(opt.id)}
                                        className={`py-1.5 px-1 text-[9px] font-bold rounded-lg border text-center uppercase tracking-wider transition-all ${
                                            pageSize === opt.id
                                                ? isMaldonadoTheme 
                                                    ? 'bg-[#e2c97d]/10 border-[#e2c97d] text-[#e2c97d]' 
                                                    : 'bg-slate-900 border-slate-900 text-white'
                                                : isMaldonadoTheme
                                                    ? 'bg-transparent border-[#222] text-slate-400 hover:border-slate-700'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Diseño y Estética */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Estética del Diseño</label>
                            <div className="grid grid-cols-1 gap-2">
                                {[
                                    { id: 'artisan', label: 'Taller Casa Maldonado (Limpio)' },
                                    { id: 'industrial', label: 'Monocromático Estricto (B&N)' },
                                    { id: 'mono', label: 'Monospace Planta (Monocromo)' }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setPrintStyle(opt.id)}
                                        className={`w-full py-1.5 px-3 text-left text-[9px] font-bold rounded-lg border uppercase tracking-wider transition-all ${
                                            printStyle === opt.id
                                                ? isMaldonadoTheme 
                                                    ? 'bg-[#e2c97d]/10 border-[#e2c97d] text-[#e2c97d]' 
                                                    : 'bg-slate-900 border-slate-900 text-white'
                                                : isMaldonadoTheme
                                                    ? 'bg-transparent border-[#222] text-slate-400 hover:border-slate-700'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tamaño de Letra */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Tamaño de Fuente</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'sm', label: 'Chica' },
                                    { id: 'md', label: 'Mediana' },
                                    { id: 'lg', label: 'Grande' }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setFontSize(opt.id)}
                                        className={`py-1.5 text-center text-[9px] font-bold rounded-lg border uppercase tracking-wider transition-all ${
                                            fontSize === opt.id
                                                ? isMaldonadoTheme 
                                                    ? 'bg-[#e2c97d]/10 border-[#e2c97d] text-[#e2c97d]' 
                                                    : 'bg-slate-900 border-slate-900 text-white'
                                                : isMaldonadoTheme
                                                    ? 'bg-transparent border-[#222] text-slate-400 hover:border-slate-700'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Opciones de Contenido */}
                        <div className="space-y-3 pt-2 border-t border-slate-200/25">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Componentes Visibles</label>
                            
                            <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none">
                                <input 
                                    type="checkbox" 
                                    checked={showLogo} 
                                    onChange={e => setShowLogo(e.target.checked)}
                                    className="rounded accent-slate-900 text-white cursor-pointer w-4 h-4 border-slate-300"
                                />
                                <span className={isMaldonadoTheme ? 'text-slate-300' : 'text-slate-700'}>Incluir Cabecera de Marca</span>
                            </label>

                            {(type === 'production_order' || type === 'inventory_sheet') && (
                                <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={showSignatures} 
                                        onChange={e => setShowSignatures(e.target.checked)}
                                        className="rounded accent-slate-900 text-white cursor-pointer w-4 h-4 border-slate-300"
                                    />
                                    <span className={isMaldonadoTheme ? 'text-slate-300' : 'text-slate-700'}>Firmas de Validación</span>
                                </label>
                            )}

                            {/* Tamaño de QR (si aplica) */}
                            {(type === 'label' || type === 'production_order') && (
                                <div className="space-y-1.5 pt-1.5">
                                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Tamaño Código QR</span>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['sm', 'md', 'lg'].map(sz => (
                                            <button
                                                key={sz}
                                                onClick={() => setQrSize(sz)}
                                                className={`py-1 text-[9px] font-bold rounded-lg border text-center uppercase transition-all ${
                                                    qrSize === sz
                                                        ? isMaldonadoTheme 
                                                            ? 'bg-[#e2c97d]/10 border-[#e2c97d] text-[#e2c97d]' 
                                                            : 'bg-slate-900 border-slate-900 text-white'
                                                        : isMaldonadoTheme
                                                            ? 'bg-transparent border-[#222] text-slate-400'
                                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                {sz}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Botones de acción principales */}
                    <div className="mt-6 pt-4 border-t border-slate-200/25 flex flex-col gap-2">
                        <button
                            onClick={handlePrint}
                            className={`w-full py-2.5 rounded-lg font-black uppercase tracking-wider text-[11px] flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 ${
                                isMaldonadoTheme 
                                    ? 'bg-[#e2c97d] text-[#0c0c0c] hover:bg-[#e8d598]' 
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                        >
                            <Printer size={15} /> Confirmar e Imprimir
                        </button>
                        <button
                            onClick={onClose}
                            className={`w-full py-2 rounded-lg font-black uppercase tracking-wider text-[10px] border transition-colors ${
                                isMaldonadoTheme 
                                    ? 'bg-transparent border-[#222] text-slate-400 hover:bg-slate-900 hover:text-white' 
                                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>

                {/* 2. RIGHT PANEL: Print Preview Sheet */}
                <div className={`flex-1 flex flex-col overflow-hidden ${
                    isMaldonadoTheme ? 'bg-[#181818]' : 'bg-slate-100'
                }`}>
                    <div className="px-6 py-3 border-b flex justify-between items-center shrink-0 border-slate-200/20">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Eye size={14} />
                            <span>Previsualización Interactiva ({pageSize === 'a4' ? 'A4 210mm x 297mm' : `${pageSize} Rollo Térmico`})</span>
                        </div>
                        <div className="text-[10px] font-mono px-2 py-0.5 bg-slate-900/50 text-[#e2c97d] border border-[#e2c97d]/20 rounded uppercase tracking-widest">
                            Alta Fidelidad
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 flex items-start justify-center custom-scrollbar">
                        
                        {/* Printable Target Area */}
                        <div 
                            className={`print-target bg-white shadow-2xl border border-slate-200/60 transition-all rounded ${getPreviewWidthClass()}`}
                            style={{
                                '--print-width': pageSize === 'a4' ? '210mm' : pageSize === '80mm' ? '80mm' : pageSize === '58mm' ? '58mm' : '48mm',
                                width: pageSize === 'a4' ? '100%' : pageSize === '80mm' ? '80mm' : pageSize === '58mm' ? '58mm' : '48mm'
                            }}
                        >
                            {/* Render Dynamic Template based on print type */}
                            {type === 'label' && renderLabel(data)}
                            {type === 'production_order' && renderProductionOrder(data)}
                            {type === 'inventory_sheet' && renderInventorySheet(data)}
                            {type === 'recipe_list' && renderRecipeList(data)}
                            {type === 'master_list' && renderMasterList(data)}
                        </div>
                    </div>
                </div>

            </div>

            {/* Print-specific style override */}
            <style>{`
                @media print {
                    /* Hide everything outside of print-target */
                    body * {
                        visibility: hidden !important;
                    }
                    /* Make only print-target visible */
                    .print-target, .print-target * {
                        visibility: visible !important;
                    }
                    .print-target {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: var(--print-width) !important;
                        background: white !important;
                        color: black !important;
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    
                    /* Page setup for roll/label vs sheet page breaks */
                    @page {
                        margin: ${pageSize === 'a4' ? '10mm' : '0mm'} !important;
                    }
                    
                    /* For thermal roll printers, set auto-height */
                    html, body {
                        background: white !important;
                        color: black !important;
                        height: auto !important;
                        overflow: visible !important;
                        font-size: 11pt !important;
                    }
                }
            `}</style>

        </div>
    );
}
