import React, { useState, useEffect } from 'react';
import { Plus, Briefcase, Wrench, Layers, Building, Store, Printer, Search } from 'lucide-react';
import { Card, Button, Input, Select, CATEGORIAS_INSUMO, UBICACIONES_ALMACEN, PRESENTACIONES_COMPRA } from '../bakery_erp';
import { supabase } from '../../lib/supabase';
import BulkImportModal from '../BulkImportModal';

export default function MasterDataView({ ingredients, setIngredients, providers, setProviders, clientes, setClientes, showToast }) {
    const [tab, setTab] = useState('prov');
    const [form, setForm] = useState({ id: null, codigo: '', nombre: '', cuit: '', rubro: '' });
    const [showAdd, setShowAdd] = useState(false);

    const [ingForm, setIngForm] = useState({ id: null, codigo: '', name: '', unidad_compra: 'Bolsa 25 kg', factor_conversion: 25000, unidad_base: 'g', familia: 'Harinas y Polvos', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: '', tipo: 'insumo' });
    const [showAddIng, setShowAddIng] = useState(false);

    const [cliForm, setCliForm] = useState({ id: null, codigo: '', nombre: '', cuit: '', tipo: 'Mayorista', direccion: '' });
    const [showAddCli, setShowAddCli] = useState(false);

    const [showBulkImport, setShowBulkImport] = useState(false);
    const [bulkImportType, setBulkImportType] = useState('proveedores'); // 'ingredientes' | 'proveedores' | 'clientes'

    // Filtros y Ordenamiento
    const [provSearch, setProvSearch] = useState('');
    const [provSortKey, setProvSortKey] = useState('razon_social');
    const [provSortDesc, setProvSortDesc] = useState(false);

    const [cliSearch, setCliSearch] = useState('');
    const [cliSortKey, setCliSortKey] = useState('razon_social');
    const [cliSortDesc, setCliSortDesc] = useState(false);

    const [ingSearch, setIngSearch] = useState('');
    const [ingSortKey, setIngSortKey] = useState('name');
    const [ingSortDesc, setIngSortDesc] = useState(false);

    const [empSearch, setEmpSearch] = useState('');
    const [empSortKey, setEmpSortKey] = useState('name');
    const [empSortDesc, setEmpSortDesc] = useState(false);

    const handleSort = (tabType, key) => {
        if (tabType === 'prov') {
            if (provSortKey === key) {
                setProvSortDesc(!provSortDesc);
            } else {
                setProvSortKey(key);
                setProvSortDesc(false);
            }
        } else if (tabType === 'cli') {
            if (cliSortKey === key) {
                setCliSortDesc(!cliSortDesc);
            } else {
                setCliSortKey(key);
                setCliSortDesc(false);
            }
        } else if (tabType === 'ing') {
            if (ingSortKey === key) {
                setIngSortDesc(!ingSortDesc);
            } else {
                setIngSortKey(key);
                setIngSortDesc(false);
            }
        } else if (tabType === 'emp') {
            if (empSortKey === key) {
                setEmpSortDesc(!empSortDesc);
            } else {
                setEmpSortKey(key);
                setEmpSortDesc(false);
            }
        }
    };

    const renderSortIndicator = (currentKey, targetKey, desc) => {
        if (currentKey !== targetKey) return null;
        return desc ? ' ↓' : ' ↑';
    };

    const filteredAndSortedProviders = React.useMemo(() => {
        let result = [...providers];
        if (provSearch) {
            const q = provSearch.toLowerCase();
            result = result.filter(p => 
                p.razon_social?.toLowerCase().includes(q) || 
                p.nombre?.toLowerCase().includes(q) || 
                p.codigo?.toLowerCase().includes(q) || 
                p.cuit?.toLowerCase().includes(q) || 
                p.rubro?.toLowerCase().includes(q)
            );
        }
        if (provSortKey) {
            result.sort((a, b) => {
                const valA = String(a[provSortKey] || a.razon_social || '').toLowerCase();
                const valB = String(b[provSortKey] || b.razon_social || '').toLowerCase();
                return provSortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
            });
        }
        return result;
    }, [providers, provSearch, provSortKey, provSortDesc]);

    const filteredAndSortedClientes = React.useMemo(() => {
        let result = clientes ? [...clientes] : [];
        if (cliSearch) {
            const q = cliSearch.toLowerCase();
            result = result.filter(c => 
                c.razon_social?.toLowerCase().includes(q) || 
                c.nombre?.toLowerCase().includes(q) || 
                c.codigo?.toLowerCase().includes(q) || 
                c.cuit?.toLowerCase().includes(q) || 
                c.tipo?.toLowerCase().includes(q) || 
                c.direccion?.toLowerCase().includes(q)
            );
        }
        if (cliSortKey) {
            result.sort((a, b) => {
                const valA = String(a[cliSortKey] || a.razon_social || '').toLowerCase();
                const valB = String(b[cliSortKey] || b.razon_social || '').toLowerCase();
                return cliSortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
            });
        }
        return result;
    }, [clientes, cliSearch, cliSortKey, cliSortDesc]);

    const filteredAndSortedInsumos = React.useMemo(() => {
        let result = ingredients.filter(i => !i.tipo || i.tipo === 'insumo');
        if (ingSearch) {
            const q = ingSearch.toLowerCase();
            result = result.filter(i => 
                i.name?.toLowerCase().includes(q) || 
                i.codigo?.toLowerCase().includes(q) || 
                i.familia?.toLowerCase().includes(q) || 
                i.almacen?.toLowerCase().includes(q) || 
                i.alergeno?.toLowerCase().includes(q)
            );
        }
        if (ingSortKey) {
            result.sort((a, b) => {
                let valA = a[ingSortKey];
                let valB = b[ingSortKey];
                if (ingSortKey === 'costo_estandar') {
                    valA = Number(valA || 0);
                    valB = Number(valB || 0);
                    return ingSortDesc ? valB - valA : valA - valB;
                }
                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();
                return ingSortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
            });
        }
        return result;
    }, [ingredients, ingSearch, ingSortKey, ingSortDesc]);

    const filteredAndSortedEmpaques = React.useMemo(() => {
        let result = ingredients.filter(i => i.tipo === 'empaque');
        if (empSearch) {
            const q = empSearch.toLowerCase();
            result = result.filter(i => 
                i.name?.toLowerCase().includes(q) || 
                i.codigo?.toLowerCase().includes(q) || 
                i.unidad_compra?.toLowerCase().includes(q)
            );
        }
        if (empSortKey) {
            result.sort((a, b) => {
                let valA = a[empSortKey];
                let valB = b[empSortKey];
                if (empSortKey === 'costo_estandar') {
                    valA = Number(valA || 0);
                    valB = Number(valB || 0);
                    return empSortDesc ? valB - valA : valA - valB;
                }
                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();
                return empSortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
            });
        }
        return result;
    }, [ingredients, empSearch, empSortKey, empSortDesc]);


    useEffect(() => {
        if (!form.id && showAdd) {
            const prefix = `PRV`;
            let max = 0;
            providers.forEach(p => {
                if (p.codigo && p.codigo.startsWith(prefix)) {
                    const num = parseInt(p.codigo.split('-').pop());
                    if (!isNaN(num) && num > max) max = num;
                }
            });
            setForm(prev => ({ ...prev, codigo: `${prefix}-${String(max + 1).padStart(3, '0')}` }));
        }
    }, [showAdd, providers]);

    useEffect(() => {
        if (!ingForm.id && showAddIng) {
            const catPrefix = ingForm.familia ? ingForm.familia.substring(0, 3).toUpperCase() : 'OTR';
            const prefix = `RAW-${catPrefix}`;
            let max = 0;
            ingredients.forEach(i => {
                if (i.codigo && i.codigo.startsWith(prefix)) {
                    const num = parseInt(i.codigo.split('-').pop());
                    if (!isNaN(num) && num > max) max = num;
                }
            });
            setIngForm(prev => ({ ...prev, codigo: `${prefix}-${String(max + 1).padStart(3, '0')}` }));
        }
    }, [ingForm.familia, showAddIng, ingredients]);

    useEffect(() => {
        if (!cliForm.id && showAddCli && clientes) {
            const prefix = `CLI`;
            let max = 0;
            clientes.forEach(c => {
                if (c.codigo && c.codigo.startsWith(prefix)) {
                    const num = parseInt(c.codigo.split('-').pop());
                    if (!isNaN(num) && num > max) max = num;
                }
            });
            setCliForm(prev => ({ ...prev, codigo: `${prefix}-${String(max + 1).padStart(3, '0')}` }));
        }
    }, [showAddCli, clientes]);

    const saveProvider = async () => {
        if (!form.nombre || !form.cuit) return;

        const pData = {
            codigo: form.codigo,
            razon_social: form.nombre,
            cuit: form.cuit,
            rubro: form.rubro
        };

        if (form.id && typeof form.id === 'string' && form.id.includes('-')) {
            // Es un UUID de Supabase (UPDATE)
            const { error } = await supabase.from('proveedores').update(pData).eq('id', form.id);
            if (error) { showToast("Error BD: " + error.message, "error"); return; }
            setProviders(providers.map(p => p.id === form.id ? { ...p, ...pData, nombre: pData.razon_social } : p));
            showToast("Proveedor actualizado remotamente.");
        } else {
            // INSERT
            const { data, error } = await supabase.from('proveedores').insert([pData]).select();
            if (error) { showToast("Error BD: " + error.message, "error"); return; }
            setProviders([{ ...data[0], nombre: data[0].razon_social }, ...providers]);
            showToast("Nuevo proveedor registrado remotamente.");
        }
        setForm({ id: null, codigo: '', nombre: '', cuit: '', rubro: '' }); setShowAdd(false);
    };

    const saveIngredient = async () => {
        if (!ingForm.name || !ingForm.unidad_compra) return;
        
        const finalFactor = Number(ingForm.factor_conversion) || 1;
        const iData = {
            codigo: ingForm.codigo,
            name: ingForm.name,
            unidad_compra: ingForm.unidad_compra,
            factor_conversion: finalFactor,
            unidad_base: ingForm.unidad_base || 'g',
            familia: ingForm.familia,
            almacen: ingForm.almacen,
            alergeno: ingForm.alergeno || null,
            costo_estandar: Number(ingForm.costo_estandar) / finalFactor,
            tipo: ingForm.tipo || 'insumo',
            es_subensamble: false
        };

        if (ingForm.id && typeof ingForm.id === 'string' && ingForm.id.includes('-')) {
            const { error } = await supabase.from('ingredientes').update(iData).eq('id', ingForm.id);
            if (error) { showToast("Error BD: " + error.message, "error"); return; }
            setIngredients(ingredients.map(i => i.id === ingForm.id ? { ...i, ...iData } : i));
            showToast("Insumo actualizado remotamente.");
        } else {
            const { data, error } = await supabase.from('ingredientes').insert([iData]).select();
            if (error) { showToast("Error BD: " + error.message, "error"); return; }
            setIngredients([{ ...data[0] }, ...ingredients]);
            showToast("Nuevo insumo registrado remotamente.");
        }
        setIngForm({ id: null, codigo: '', name: '', unidad_compra: 'Bolsa 25 kg', factor_conversion: 25000, unidad_base: 'g', familia: 'Harinas y Polvos', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: '', tipo: 'insumo' });
        setShowAddIng(false);
    };

    const saveClient = async () => {
        if (!cliForm.nombre || !cliForm.cuit) return;
        
        const clientData = {
            codigo: cliForm.codigo,
            razon_social: cliForm.nombre,
            cuit: cliForm.cuit,
            tipo: cliForm.tipo,
            direccion: cliForm.direccion
        };

        if (cliForm.id && typeof cliForm.id === 'string' && cliForm.id.includes('-')) {
            const { error } = await supabase.from('clientes').update(clientData).eq('id', cliForm.id);
            if (error) { showToast("Error BD: " + error.message, "error"); return; }
            setClientes(clientes.map(c => c.id === cliForm.id ? { ...c, ...clientData, nombre: clientData.razon_social } : c));
            showToast("Cliente actualizado remotamente.");
        } else {
            const { data, error } = await supabase.from('clientes').insert([clientData]).select();
            if (error) { showToast("Error BD: " + error.message, "error"); return; }
            setClientes([{ ...data[0], nombre: data[0].razon_social }, ...clientes]);
            showToast("Nuevo cliente registrado remotamente.");
        }
        setCliForm({ id: null, codigo: '', nombre: '', cuit: '', tipo: 'Mayorista', direccion: '' }); 
        setShowAddCli(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex gap-3 border-b border-slate-200 pb-3">
                {[
                    { id: 'prov', l: 'Catálogo Proveedores' },
                    { id: 'cli', l: 'Clientes y Sucursales' },
                    { id: 'ing', l: 'Insumos y WIP' },
                    { id: 'emp', l: 'Empaques / Packaging' },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} className={`px-5 py-1.5 rounded-md font-black uppercase text-[9px] transition-all ${tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                        {t.l}
                    </button>
                ))}
            </div>

            {tab === 'prov' && (
                <Card className="fall-target p-6 bg-slate-50">
                    <div className="flex justify-between items-center mb-5 print:hidden">
                        <h4 className="text-base font-black uppercase italic text-slate-800">Directorio de Proveedores</h4>
                        <div className="flex gap-2">
                            <Button onClick={() => { setBulkImportType('proveedores'); setShowBulkImport(true); }} variant="secondary"><Plus size={14} /> Carga Masiva</Button>
                            <Button onClick={() => { setShowAdd(!showAdd); setForm({ id: null, codigo: '', nombre: '', cuit: '', rubro: '' }); }} variant={showAdd ? "secondary" : "accent"}>{showAdd ? "Cancelar" : <><Plus size={14} /> Nuevo Proveedor</>}</Button>
                        </div>
                    </div>

                    {/* CONTROL BAR */}
                    <div className="flex flex-col md:flex-row gap-3 items-center justify-between mb-5 print:hidden bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="relative w-full md:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Buscar por código, nombre, CUIT o rubro..." 
                                value={provSearch} 
                                onChange={e => setProvSearch(e.target.value)} 
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

                    {showAdd && (
                        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 overflow-y-auto">
                            <div className="bg-white border-[8px] border-slate-900 rounded-[2.5rem] p-8 max-w-4xl w-full shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="text-sm font-black uppercase italic text-slate-800">{form.id ? 'Editar Proveedor' : 'Alta Proveedor'}</h4>
                                    <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xs uppercase bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">Cerrar</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-6">
                                    <div className="md:col-span-1"><Input label="Cod. Prov. (Auto)" value={form.codigo} disabled required /></div>
                                    <div className="md:col-span-2"><Input label="Razón Social" value={form.nombre} onChange={v => setForm({ ...form, nombre: v })} required /></div>
                                    <Input label="CUIT" value={form.cuit} onChange={v => setForm({ ...form, cuit: v })} required />
                                    <Input label="Rubro" value={form.rubro} onChange={v => setForm({ ...form, rubro: v })} />
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                    <Button onClick={() => setShowAdd(false)} variant="secondary" className="py-2 px-6">Cancelar</Button>
                                    <Button onClick={saveProvider} variant="success" className="py-2 px-6">Guardar</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div id="printable-list-container" className="overflow-hidden border-2 rounded-xl bg-white shadow-sm">
                        <table className="w-full text-left font-bold text-xs uppercase text-slate-700">
                            <thead className="bg-slate-900 text-white text-[9px] tracking-widest">
                                <tr>
                                    <th className="px-4 py-2 cursor-pointer select-none hover:bg-slate-800 transition-colors" onClick={() => handleSort('prov', 'codigo')}>
                                        SKU / Código {renderSortIndicator(provSortKey, 'codigo', provSortDesc)}
                                    </th>
                                    <th className="px-4 py-2 cursor-pointer select-none hover:bg-slate-800 transition-colors" onClick={() => handleSort('prov', 'razon_social')}>
                                        Razón Social {renderSortIndicator(provSortKey, 'razon_social', provSortDesc)}
                                    </th>
                                    <th className="px-4 py-2 cursor-pointer select-none hover:bg-slate-800 transition-colors" onClick={() => handleSort('prov', 'cuit')}>
                                        CUIT {renderSortIndicator(provSortKey, 'cuit', provSortDesc)}
                                    </th>
                                    <th className="px-4 py-2 cursor-pointer select-none hover:bg-slate-800 transition-colors" onClick={() => handleSort('prov', 'rubro')}>
                                        Rubro {renderSortIndicator(provSortKey, 'rubro', provSortDesc)}
                                    </th>
                                    <th className="px-4 py-2 text-center print:hidden">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredAndSortedProviders.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-mono text-[10px] text-blue-600 font-bold">{p.codigo}</td>
                                        <td className="px-4 py-3 font-black text-slate-800">{p.nombre || p.razon_social}</td>
                                        <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">{p.cuit}</td>
                                        <td className="px-4 py-3 text-slate-500">{p.rubro || '-'}</td>
                                        <td className="px-4 py-3 text-center print:hidden">
                                            <button 
                                                onClick={() => { setForm(p); setShowAdd(true); }} 
                                                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                                                title="Editar"
                                            >
                                                <Wrench size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredAndSortedProviders.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-400 italic text-xs bg-white">
                                            No hay proveedores registrados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {tab === 'ing' && (
                <Card className="p-6 bg-slate-50">
                    <div className="flex justify-between items-center mb-5 print:hidden">
                        <h4 className="text-base font-black uppercase italic text-slate-800">Catálogo de Insumos</h4>
                        <div className="flex gap-2">
                            <Button onClick={() => { setBulkImportType('ingredientes'); setShowBulkImport(true); }} variant="secondary"><Plus size={14} /> Carga Masiva</Button>
                            <Button onClick={() => { setShowAddIng(!showAddIng); setIngForm({ id: null, codigo: '', name: '', unidad_compra: 'Bolsa 25kg', familia: 'Harinas y Polvos', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: '' }); }} variant={showAddIng ? "secondary" : "accent"}>{showAddIng ? "Cancelar" : <><Plus size={14} /> Nuevo Insumo</>}</Button>
                        </div>
                    </div>

                    {/* CONTROL BAR */}
                    <div className="flex flex-col md:flex-row gap-3 items-center justify-between mb-5 print:hidden bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="relative w-full md:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Buscar por SKU, nombre, familia, almacén o alérgenos..." 
                                value={ingSearch} 
                                onChange={e => setIngSearch(e.target.value)} 
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

                    {showAddIng && (
                        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 overflow-y-auto">
                            <div className="bg-white border-[8px] border-slate-900 rounded-[2.5rem] p-8 max-w-4xl w-full shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="text-sm font-black uppercase italic text-slate-800">{ingForm.id ? 'Editar Insumo' : 'Alta de Insumo (RAW)'}</h4>
                                    <button onClick={() => setShowAddIng(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xs uppercase bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">Cerrar</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-6">
                                    <div className="md:col-span-1"><Input label="SKU (Auto)" value={ingForm.codigo} disabled required /></div>
                                    <div className="md:col-span-2"><Input label="Nombre del Insumo" value={ingForm.name} onChange={v => setIngForm({ ...ingForm, name: v })} required /></div>
                                    <Select label="Familia" value={ingForm.familia} onChange={e => setIngForm({ ...ingForm, familia: e })}>
                                        {CATEGORIAS_INSUMO.map(c => <option key={c} value={c}>{c}</option>)}
                                    </Select>
                                    <Select label="Presentación de Compra" value={ingForm.unidad_compra} onChange={v => {
                                        const preset = PRESENTACIONES_COMPRA.find(p => p.label === v);
                                        setIngForm({ ...ingForm, unidad_compra: v, factor_conversion: preset?.factor ?? ingForm.factor_conversion, unidad_base: preset?.unidad_base ?? ingForm.unidad_base });
                                    }}>
                                        {PRESENTACIONES_COMPRA.map(p => <option key={p.label} value={p.label}>{p.label} {p.factor ? `(${p.factor.toLocaleString('es-AR')} ${p.unidad_base})` : ''}</option>)}
                                    </Select>
                                    {ingForm.unidad_compra === 'Personalizada' && (
                                        <Input label="Factor (unidades base/presentación)" type="number" placeholder="Ej: 4500 para tarro 4.5kg" value={ingForm.factor_conversion} onChange={v => setIngForm({ ...ingForm, factor_conversion: Number(v) })} required />
                                    )}

                                    <div className="md:col-span-2"><Select label="Ubicación (Almacén)" value={ingForm.almacen} onChange={e => setIngForm({ ...ingForm, almacen: e })}>
                                        {UBICACIONES_ALMACEN.map(u => <option key={u} value={u}>{u}</option>)}
                                    </Select></div>
                                    <div className="md:col-span-2"><Input label="Alérgenos" placeholder="Ej. TACC, Lácteo" value={ingForm.alergeno} onChange={v => setIngForm({ ...ingForm, alergeno: v })} /></div>
                                    <Input label="Costo x Presentación ($)" type="number" placeholder="Ej. precio de la bolsa entera" value={ingForm.costo_estandar} onChange={v => setIngForm({ ...ingForm, costo_estandar: v })} required />
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                    <Button onClick={() => setShowAddIng(false)} variant="secondary" className="py-2 px-6">Cancelar</Button>
                                    <Button onClick={saveIngredient} variant="success" className="py-2 px-6">Guardar Insumo</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div id="printable-list-container" className="overflow-hidden border-2 rounded-xl bg-white shadow-sm">
                        <table className="w-full text-left font-bold text-xs uppercase text-slate-700">
                            <thead className="bg-slate-900 text-white text-[9px] tracking-widest">
                                <tr>
                                    <th className="px-4 py-2 cursor-pointer select-none hover:bg-slate-800 transition-colors" onClick={() => handleSort('ing', 'name')}>
                                        SKU / Nombre {renderSortIndicator(ingSortKey, 'name', ingSortDesc)}
                                    </th>
                                    <th className="px-4 py-2 cursor-pointer select-none hover:bg-slate-800 transition-colors text-center" onClick={() => handleSort('ing', 'familia')}>
                                        Familia {renderSortIndicator(ingSortKey, 'familia', ingSortDesc)}
                                    </th>
                                    <th className="px-4 py-2 cursor-pointer select-none hover:bg-slate-800 transition-colors text-center" onClick={() => handleSort('ing', 'almacen')}>
                                        Ubicación {renderSortIndicator(ingSortKey, 'almacen', ingSortDesc)}
                                    </th>
                                    <th className="px-4 py-2 cursor-pointer select-none hover:bg-slate-800 transition-colors text-center" onClick={() => handleSort('ing', 'alergeno')}>
                                        Alérgeno {renderSortIndicator(ingSortKey, 'alergeno', ingSortDesc)}
                                    </th>
                                    <th className="px-4 py-2 cursor-pointer select-none hover:bg-slate-800 transition-colors text-right" onClick={() => handleSort('ing', 'costo_estandar')}>
                                        Costo Est. {renderSortIndicator(ingSortKey, 'costo_estandar', ingSortDesc)}
                                    </th>
                                    <th className="px-4 py-2 text-center print:hidden">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredAndSortedInsumos.map(i => (
                                    <tr key={i.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-4 py-1.5">
                                            <div className="font-black flex items-center gap-1.5 text-slate-800">
                                                {i.es_subensamble && <Layers size={12} className="text-orange-500" />}
                                                {i.name}
                                            </div>
                                            <div className="flex gap-2 items-center mt-0.5">
                                                <span className="text-[8px] font-mono text-blue-500 bg-blue-50 px-1 rounded">{i.codigo}</span>
                                                <span className="text-[8px] text-slate-400 font-normal lowercase block">({i.unidad_compra})</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-1.5 text-center text-[9px] text-slate-500">{i.familia || 'Otros'}</td>
                                        <td className="px-4 py-1.5 text-center">
                                            <span className="bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded text-[8px]">{i.almacen || 'Sin Asignar'}</span>
                                        </td>
                                        <td className="px-4 py-1.5 text-center">
                                            {i.alergeno ? <span className="bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded text-[8px]">{i.alergeno}</span> : <span className="text-slate-300">-</span>}
                                        </td>
                                         <td className="px-4 py-1.5 text-right font-mono">
                                            {Number(i.costo_estandar) === 0
                                                ? <span className="text-amber-500 font-black text-[9px] bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">⚠ Sin precio</span>
                                                : <div className="flex flex-col items-end">
                                                      <span className="text-emerald-600 font-bold">${Number(i.costo_estandar * (i.factor_conversion || 1)).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                      <span className="text-[8px] text-slate-400 capitalize -mt-0.5">/ {i.unidad_compra}</span>
                                                  </div>
                                            }
                                         </td>
                                        <td className="px-4 py-1.5 text-center print:hidden">
                                            {!i.es_subensamble && (
                                                 <button onClick={() => { setIngForm({ id: i.id, codigo: i.codigo, name: i.name, unidad_compra: i.unidad_compra, factor_conversion: i.factor_conversion ?? 25000, unidad_base: i.unidad_base || 'g', familia: i.familia || 'Harinas y Polvos', almacen: i.almacen || 'Almacén Secos Principal', alergeno: i.alergeno || '', costo_estandar: Number(i.costo_estandar || 0) * Number(i.factor_conversion || 1), tipo: i.tipo || 'insumo' }); setShowAddIng(true); }} className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors" title="Editar"><Wrench size={12} /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredAndSortedInsumos.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-8 text-center text-slate-400 italic text-xs">
                                            No hay insumos registrados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {tab === 'cli' && (
                <Card className="fall-target p-6 bg-slate-50">
                    <div className="flex justify-between items-center mb-5 print:hidden">
                        <h4 className="text-base font-black uppercase italic text-slate-800">Directorio de Clientes</h4>
                        <div className="flex gap-2">
                            <Button onClick={() => { setBulkImportType('clientes'); setShowBulkImport(true); }} variant="secondary"><Plus size={14} /> Carga Masiva</Button>
                            <Button onClick={() => { setShowAddCli(!showAddCli); setCliForm({ id: null, codigo: '', nombre: '', cuit: '', tipo: 'Mayorista', direccion: '' }); }} variant={showAddCli ? "secondary" : "accent"}>{showAddCli ? "Cancelar" : <><Plus size={14} /> Nuevo Cliente</>}</Button>
                        </div>
                    </div>

                    {/* CONTROL BAR */}
                    <div className="flex flex-col md:flex-row gap-3 items-center justify-between mb-5 print:hidden bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="relative w-full md:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Buscar por código, nombre, CUIT, tipo o dirección..." 
                                value={cliSearch} 
                                onChange={e => setCliSearch(e.target.value)} 
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

                    {showAddCli && (
                        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 overflow-y-auto">
                            <div className="bg-white border-[8px] border-slate-900 rounded-[2.5rem] p-8 max-w-4xl w-full shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="text-sm font-black uppercase italic text-slate-800">{cliForm.id ? 'Editar Cliente' : 'Alta Cliente'}</h4>
                                    <button onClick={() => setShowAddCli(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xs uppercase bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">Cerrar</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-6">
                                    <div className="md:col-span-1"><Input label="Cod. Cliente" value={cliForm.codigo} disabled required /></div>
                                    <div className="md:col-span-2"><Input label="Razón Social / Nombre Fantasía" value={cliForm.nombre} onChange={v => setCliForm({ ...cliForm, nombre: v })} required /></div>
                                    <Input label="CUIT" value={cliForm.cuit} onChange={v => setCliForm({ ...cliForm, cuit: v })} required />
                                    <Select label="Tipo de Cliente" value={cliForm.tipo} onChange={v => setCliForm({ ...cliForm, tipo: v })}>
                                        <option value="Mayorista">Mayorista</option>
                                        <option value="Supermercado">Supermercado</option>
                                        <option value="Panadería">Panadería</option>
                                        <option value="Dietética">Dietética</option>
                                        <option value="Sucursal Propia">Sucursal Propia</option>
                                        <option value="Otros">Otros</option>
                                    </Select>
                                    <div className="md:col-span-5"><Input label="Dirección / Zona de Reparto" value={cliForm.direccion} onChange={v => setCliForm({ ...cliForm, direccion: v })} /></div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                    <Button onClick={() => setShowAddCli(false)} variant="secondary" className="py-2 px-6">Cancelar</Button>
                                    <Button onClick={saveClient} variant="success" className="py-2 px-6">Guardar</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div id="printable-list-container" className="overflow-hidden border-2 rounded-xl bg-white shadow-sm">
                        <table className="w-full text-left font-bold text-xs uppercase text-slate-700">
                            <thead className="bg-slate-900 text-white text-[9px] tracking-widest">
                                <tr>
                                    <th className="px-4 py-2 cursor-pointer select-none hover:bg-slate-800 transition-colors" onClick={() => handleSort('cli', 'codigo')}>
                                        Código {renderSortIndicator(cliSortKey, 'codigo', cliSortDesc)}
                                    </th>
                                    <th className="px-4 py-2 cursor-pointer select-none hover:bg-slate-800 transition-colors" onClick={() => handleSort('cli', 'razon_social')}>
                                        Razón Social {renderSortIndicator(cliSortKey, 'razon_social', cliSortDesc)}
                                    </th>
                                    <th className="px-4 py-2 cursor-pointer select-none hover:bg-slate-800 transition-colors" onClick={() => handleSort('cli', 'cuit')}>
                                        CUIT {renderSortIndicator(cliSortKey, 'cuit', cliSortDesc)}
                                    </th>
                                    <th className="px-4 py-2 cursor-pointer select-none hover:bg-slate-800 transition-colors text-center" onClick={() => handleSort('cli', 'tipo')}>
                                        Tipo {renderSortIndicator(cliSortKey, 'tipo', cliSortDesc)}
                                    </th>
                                    <th className="px-4 py-2 cursor-pointer select-none hover:bg-slate-800 transition-colors" onClick={() => handleSort('cli', 'direccion')}>
                                        Dirección / Zona {renderSortIndicator(cliSortKey, 'direccion', cliSortDesc)}
                                    </th>
                                    <th className="px-4 py-2 text-center print:hidden">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredAndSortedClientes.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-mono text-[10px] text-blue-600 font-bold">{c.codigo}</td>
                                        <td className="px-4 py-3 font-black text-slate-800">{c.nombre || c.razon_social}</td>
                                        <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">{c.cuit}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">{c.tipo}</span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 lowercase font-medium">{c.direccion || '-'}</td>
                                        <td className="px-4 py-3 text-center print:hidden">
                                            <button 
                                                onClick={() => { setCliForm(c); setShowAddCli(true); }} 
                                                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                                                title="Editar"
                                            >
                                                <Wrench size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredAndSortedClientes.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-8 text-center text-slate-400 italic text-xs">
                                            No hay clientes registrados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {tab === 'emp' && (
                <Card className="fall-target p-6 bg-slate-50">
                    <div className="flex justify-between items-center mb-5 print:hidden">
                        <div>
                            <h4 className="text-base font-black uppercase italic text-slate-800">Empaques y Materiales de Packaging</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-widest">Estos materiales se compran por Ingreso Insumos y figuran en el Inventario de Lotes.</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <Button onClick={() => { setBulkImportType('ingredientes'); setShowBulkImport(true); }} variant="secondary"><Plus size={14} /> Carga Masiva</Button>
                            <Button onClick={() => { setIngForm({ id: null, codigo: '', name: '', unidad_compra: 'unidad', familia: 'Empaques', almacen: 'Almacén Empaques', alergeno: '', costo_estandar: '', tipo: 'empaque' }); setShowAddIng(!showAddIng); }} variant={showAddIng ? 'secondary' : 'accent'}>
                                {showAddIng ? 'Cancelar' : <><Plus size={14} /> Nuevo Empaque</>}
                            </Button>
                        </div>
                    </div>

                    {/* CONTROL BAR */}
                    <div className="flex flex-col md:flex-row gap-3 items-center justify-between mb-5 print:hidden bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="relative w-full md:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Buscar por SKU, nombre del material o presentación..." 
                                value={empSearch} 
                                onChange={e => setEmpSearch(e.target.value)} 
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

                    {showAddIng && (
                        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 overflow-y-auto">
                            <div className="bg-white border-[8px] border-emerald-900 rounded-[2.5rem] p-8 max-w-4xl w-full shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="text-sm font-black uppercase italic text-emerald-800">{ingForm.id ? 'Editar Material de Empaque' : 'Alta de Material de Empaque'}</h4>
                                    <button onClick={() => setShowAddIng(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xs uppercase bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">Cerrar</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-6">
                                    <div className="md:col-span-1"><Input label="SKU (Auto)" value={ingForm.codigo} disabled required /></div>
                                    <div className="md:col-span-2"><Input label="Nombre del Material" placeholder="Ej. Bolsa Flowpack 500g" value={ingForm.name} onChange={v => setIngForm({ ...ingForm, name: v })} required /></div>
                                    <Input label="Presentación / Unidad" placeholder="ej. unidad, rollo, caja" value={ingForm.unidad_compra} onChange={v => setIngForm({ ...ingForm, unidad_compra: v })} required />
                                    <Input label="Costo por Unidad ($)" type="number" placeholder="Ej. 12.50" value={ingForm.costo_estandar} onChange={v => setIngForm({ ...ingForm, costo_estandar: v })} required />
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                    <Button onClick={() => setShowAddIng(false)} variant="secondary" className="py-2 px-6">Cancelar</Button>
                                    <Button onClick={saveIngredient} variant="success" className="py-2 px-6">Guardar Empaque</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div id="printable-list-container" className="overflow-hidden border-2 rounded-xl bg-white shadow-sm">
                        <table className="w-full text-left font-bold text-xs uppercase text-slate-700">
                            <thead className="bg-emerald-900 text-white text-[9px] tracking-widest">
                                <tr>
                                    <th className="px-4 py-2 cursor-pointer select-none hover:bg-emerald-800 transition-colors" onClick={() => handleSort('emp', 'name')}>
                                        SKU / Nombre del Material {renderSortIndicator(empSortKey, 'name', empSortDesc)}
                                    </th>
                                    <th className="px-4 py-2 cursor-pointer select-none hover:bg-emerald-800 transition-colors text-center" onClick={() => handleSort('emp', 'unidad_compra')}>
                                        Unidad / Presentación {renderSortIndicator(empSortKey, 'unidad_compra', empSortDesc)}
                                    </th>
                                    <th className="px-4 py-2 cursor-pointer select-none hover:bg-emerald-800 transition-colors text-right" onClick={() => handleSort('emp', 'costo_estandar')}>
                                        Costo Unitario {renderSortIndicator(empSortKey, 'costo_estandar', empSortDesc)}
                                    </th>
                                    <th className="px-4 py-2 text-center print:hidden">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredAndSortedEmpaques.map(i => (
                                    <tr key={i.id} className="hover:bg-emerald-50/40 transition-colors group">
                                        <td className="px-4 py-2">
                                            <div className="font-black text-slate-800">{i.name}</div>
                                            <span className="text-[8px] font-mono text-emerald-600 bg-emerald-50 px-1 rounded">{i.codigo}</span>
                                        </td>
                                        <td className="px-4 py-2 text-center text-slate-500 lowercase">{i.unidad_compra}</td>
                                        <td className="px-4 py-2 text-right font-mono font-black text-emerald-600">${Number(i.costo_estandar || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-2 text-center print:hidden">
                                            <button onClick={() => { setIngForm({ id: i.id, codigo: i.codigo, name: i.name, unidad_compra: i.unidad_compra, familia: i.familia || 'Empaques', almacen: i.almacen || 'Almacén Empaques', alergeno: i.alergeno, costo_estandar: i.costo_estandar, tipo: 'empaque' }); setShowAddIng(true); }} className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Editar"><Wrench size={12} /></button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredAndSortedEmpaques.length === 0 && (
                                    <tr><td colSpan="4" className="p-6 text-center text-slate-400 text-xs italic">No hay materiales de empaque registrados. Usá el botón "Nuevo Empaque" para cargar la primera bolsa o etiqueta.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <BulkImportModal
                isOpen={showBulkImport}
                onClose={() => setShowBulkImport(false)}
                type={bulkImportType}
                ingredients={ingredients}
                showToast={showToast}
                onSuccess={{ setProviders, setClientes, setIngredients }}
            />

            {/* ESTILO DE IMPRESIÓN */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-list-container, #printable-list-container * {
                        visibility: visible;
                    }
                    #printable-list-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                        border: none !important;
                        box-shadow: none !important;
                    }
                    .print\:hidden {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}