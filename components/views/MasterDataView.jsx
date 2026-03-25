import React, { useState, useEffect } from 'react';
import { Plus, Briefcase, Wrench, Layers, Building, Store } from 'lucide-react';
import { Card, Button, Input, Select, CATEGORIAS_INSUMO, UBICACIONES_ALMACEN, PRESENTACIONES_COMPRA } from '../bakery_erp';
import { supabase } from '../../lib/supabase';

export default function MasterDataView({ ingredients, setIngredients, providers, setProviders, clientes, setClientes, showToast }) {
    const [tab, setTab] = useState('prov');
    const [form, setForm] = useState({ id: null, codigo: '', nombre: '', cuit: '', rubro: '' });
    const [showAdd, setShowAdd] = useState(false);

    const [ingForm, setIngForm] = useState({ id: null, codigo: '', name: '', unidad_compra: 'Bolsa 25 kg', factor_conversion: 25000, unidad_base: 'g', familia: 'Harinas y Polvos', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: '', tipo: 'insumo' });
    const [showAddIng, setShowAddIng] = useState(false);

    const [cliForm, setCliForm] = useState({ id: null, codigo: '', nombre: '', cuit: '', tipo: 'Mayorista', direccion: '' });
    const [showAddCli, setShowAddCli] = useState(false);

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
        
        const iData = {
            codigo: ingForm.codigo,
            name: ingForm.name,
            unidad_compra: ingForm.unidad_compra,
            factor_conversion: Number(ingForm.factor_conversion) || 1,
            unidad_base: ingForm.unidad_base || 'g',
            familia: ingForm.familia,
            almacen: ingForm.almacen,
            alergeno: ingForm.alergeno || null,
            costo_estandar: Number(ingForm.costo_estandar),
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
                    <div className="flex justify-between items-center mb-5">
                        <h4 className="text-base font-black uppercase italic text-slate-800">Directorio de Proveedores</h4>
                        <Button onClick={() => { setShowAdd(!showAdd); setForm({ id: null, codigo: '', nombre: '', cuit: '', rubro: '' }); }} variant={showAdd ? "secondary" : "accent"}>{showAdd ? "Cancelar" : <><Plus size={14} /> Nuevo Proveedor</>}</Button>
                    </div>

                    {showAdd && (
                        <Card className="fall-target p-6 border-4 border-slate-900 bg-white mb-6">
                            <h4 className="text-xs font-black uppercase mb-4 italic">{form.id ? 'Editar Proveedor' : 'Alta Proveedor'}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                                <div className="md:col-span-1"><Input label="Cod. Prov. (Auto)" value={form.codigo} disabled required /></div>
                                <div className="md:col-span-2"><Input label="Razón Social" value={form.nombre} onChange={v => setForm({ ...form, nombre: v })} required /></div>
                                <Input label="CUIT" value={form.cuit} onChange={v => setForm({ ...form, cuit: v })} required />
                                <Input label="Rubro" value={form.rubro} onChange={v => setForm({ ...form, rubro: v })} />
                            </div>
                            <div className="flex justify-end mt-4"><Button onClick={saveProvider} variant="success" className="py-2 px-6">Guardar</Button></div>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {providers.map(p => (
                            <Card key={p.id} className="p-4 bg-white shadow-sm flex items-center justify-between border group">
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-100 p-2 rounded-md text-slate-500"><Briefcase size={18} /></div>
                                    <div>
                                        <h5 className="font-black uppercase italic text-slate-800 text-xs">{p.nombre}</h5>
                                        <div className="flex gap-2 items-center mt-0.5">
                                            <span className="text-[8px] font-mono text-blue-500 bg-blue-50 px-1 rounded">{p.codigo}</span>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">CUIT: {p.cuit}</p>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => { setForm(p); setShowAdd(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors opacity-0 group-hover:opacity-100"><Wrench size={14} /></button>
                            </Card>
                        ))}
                    </div>
                </Card>
            )}

            {tab === 'ing' && (
                <Card className="p-6 bg-slate-50">
                    <div className="flex justify-between items-center mb-5">
                        <h4 className="text-base font-black uppercase italic text-slate-800">Catálogo de Insumos</h4>
                        <Button onClick={() => { setShowAddIng(!showAddIng); setIngForm({ id: null, codigo: '', name: '', unidad_compra: 'Bolsa 25kg', familia: 'Harinas y Polvos', almacen: 'Almacén Secos Principal', alergeno: '', costo_estandar: '' }); }} variant={showAddIng ? "secondary" : "accent"}>{showAddIng ? "Cancelar" : <><Plus size={14} /> Nuevo Insumo</>}</Button>
                    </div>

                    {showAddIng && (
                        <Card className="p-6 border-4 border-slate-900 bg-white mb-6">
                            <h4 className="text-xs font-black uppercase mb-4 italic">{ingForm.id ? 'Editar Insumo' : 'Alta de Insumo (RAW)'}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
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
                                <Input label="Costo Est. ($)" type="number" value={ingForm.costo_estandar} onChange={v => setIngForm({ ...ingForm, costo_estandar: v })} required />
                            </div>
                            <div className="flex justify-end mt-4 pt-4 border-t border-slate-100">
                                <Button onClick={saveIngredient} variant="success" className="py-2 px-6">Guardar Insumo</Button>
                            </div>
                        </Card>
                    )}

                    <div className="overflow-hidden border-2 rounded-xl">
                        <table className="w-full text-left font-bold text-xs uppercase text-slate-700">
                            <thead className="bg-slate-900 text-white text-[9px] tracking-widest">
                                <tr>
                                    <th className="px-4 py-2">SKU / Nombre</th>
                                    <th className="px-4 py-2 text-center">Familia</th>
                                    <th className="px-4 py-2 text-center">Ubicación</th>
                                    <th className="px-4 py-2 text-center">Alérgeno</th>
                                    <th className="px-4 py-2 text-right">Costo Est.</th>
                                    <th className="px-4 py-2 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {ingredients.filter(i => !i.tipo || i.tipo === 'insumo').map(i => (
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
                                                : <span className="text-emerald-600">${Number(i.costo_estandar).toLocaleString('es-AR', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}/{i.unidad_base || 'g'}</span>
                                            }
                                         </td>
                                        <td className="px-4 py-1.5 text-center">
                                            {!i.es_subensamble && (
                                                 <button onClick={() => { setIngForm({ id: i.id, codigo: i.codigo, name: i.name, unidad_compra: i.unidad_compra, factor_conversion: i.factor_conversion ?? 25000, unidad_base: i.unidad_base || 'g', familia: i.familia || 'Harinas y Polvos', almacen: i.almacen || 'Almacén Secos Principal', alergeno: i.alergeno || '', costo_estandar: i.costo_estandar, tipo: i.tipo || 'insumo' }); setShowAddIng(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors opacity-0 group-hover:opacity-100"><Wrench size={12} /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {tab === 'cli' && (
                <Card className="fall-target p-6 bg-slate-50">
                    <div className="flex justify-between items-center mb-5">
                        <h4 className="text-base font-black uppercase italic text-slate-800">Directorio de Clientes</h4>
                        <Button onClick={() => { setShowAddCli(!showAddCli); setCliForm({ id: null, codigo: '', nombre: '', cuit: '', tipo: 'Mayorista', direccion: '' }); }} variant={showAddCli ? "secondary" : "accent"}>{showAddCli ? "Cancelar" : <><Plus size={14} /> Nuevo Cliente</>}</Button>
                    </div>

                    {showAddCli && (
                        <Card className="fall-target p-6 border-4 border-slate-900 bg-white mb-6">
                            <h4 className="text-xs font-black uppercase mb-4 italic">{cliForm.id ? 'Editar Cliente' : 'Alta Cliente'}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
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
                            <div className="flex justify-end mt-4"><Button onClick={saveClient} variant="success" className="py-2 px-6">Guardar</Button></div>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {clientes?.map(c => (
                            <Card key={c.id} className="p-4 bg-white shadow-sm flex items-center justify-between border group">
                                <div className="flex items-center gap-3">
                                    <div className="bg-orange-100 p-2 rounded-md text-orange-600"><Store size={18} /></div>
                                    <div>
                                        <h5 className="font-black uppercase italic text-slate-800 text-xs">{c.nombre}</h5>
                                        <div className="flex gap-2 items-center mt-0.5">
                                            <span className="text-[8px] font-mono text-emerald-600 bg-emerald-50 px-1 rounded border border-emerald-200">{c.tipo}</span>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">CUIT: {c.cuit}</p>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => { setCliForm(c); setShowAddCli(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors opacity-0 group-hover:opacity-100"><Wrench size={14} /></button>
                            </Card>
                        ))}
                    </div>
                </Card>
            )}

            {tab === 'emp' && (
                <Card className="fall-target p-6 bg-slate-50">
                    <div className="flex justify-between items-center mb-5">
                        <div>
                            <h4 className="text-base font-black uppercase italic text-slate-800">Empaques y Materiales de Packaging</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-widest">Estos materiales se compran por Ingreso Insumos y figuran en el Inventario de Lotes.</p>
                        </div>
                        <Button onClick={() => { setIngForm({ id: null, codigo: '', name: '', unidad_compra: 'unidad', familia: 'Empaques', almacen: 'Almacén Empaques', alergeno: '', costo_estandar: '', tipo: 'empaque' }); setShowAddIng(!showAddIng); }} variant={showAddIng ? 'secondary' : 'accent'}>
                            {showAddIng ? 'Cancelar' : <><Plus size={14} /> Nuevo Empaque</>}
                        </Button>
                    </div>

                    {showAddIng && (
                        <Card className="p-6 border-4 border-emerald-600 bg-white mb-6">
                            <h4 className="text-xs font-black uppercase mb-4 italic text-emerald-700">{ingForm.id ? 'Editar Material de Empaque' : 'Alta de Material de Empaque'}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <div className="md:col-span-1"><Input label="SKU (Auto)" value={ingForm.codigo} disabled required /></div>
                                <div className="md:col-span-2"><Input label="Nombre del Material" placeholder="Ej. Bolsa Flowpack 500g" value={ingForm.name} onChange={v => setIngForm({ ...ingForm, name: v })} required /></div>
                                <Input label="Presentación / Unidad" placeholder="ej. unidad, rollo, caja" value={ingForm.unidad_compra} onChange={v => setIngForm({ ...ingForm, unidad_compra: v })} required />
                                <Input label="Costo por Unidad ($)" type="number" placeholder="Ej. 12.50" value={ingForm.costo_estandar} onChange={v => setIngForm({ ...ingForm, costo_estandar: v })} required />
                            </div>
                            <div className="flex justify-end mt-4 pt-4 border-t border-slate-100">
                                <Button onClick={saveIngredient} variant="success" className="py-2 px-6">Guardar Empaque</Button>
                            </div>
                        </Card>
                    )}

                    <div className="overflow-hidden border-2 rounded-xl">
                        <table className="w-full text-left font-bold text-xs uppercase text-slate-700">
                            <thead className="bg-emerald-900 text-white text-[9px] tracking-widest">
                                <tr>
                                    <th className="px-4 py-2">SKU / Nombre del Material</th>
                                    <th className="px-4 py-2 text-center">Unidad / Presentación</th>
                                    <th className="px-4 py-2 text-right">Costo Unitario</th>
                                    <th className="px-4 py-2 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {ingredients.filter(i => i.tipo === 'empaque').map(i => (
                                    <tr key={i.id} className="hover:bg-emerald-50/40 transition-colors group">
                                        <td className="px-4 py-2">
                                            <div className="font-black text-slate-800">{i.name}</div>
                                            <span className="text-[8px] font-mono text-emerald-600 bg-emerald-50 px-1 rounded">{i.codigo}</span>
                                        </td>
                                        <td className="px-4 py-2 text-center text-slate-500 lowercase">{i.unidad_compra}</td>
                                        <td className="px-4 py-2 text-right font-mono font-black text-emerald-600">${Number(i.costo_estandar || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-2 text-center">
                                            <button onClick={() => { setIngForm({ id: i.id, codigo: i.codigo, name: i.name, unidad_compra: i.unidad_compra, familia: i.familia || 'Empaques', almacen: i.almacen || 'Almacén Empaques', alergeno: i.alergeno, costo_estandar: i.costo_estandar, tipo: 'empaque' }); setShowAddIng(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors opacity-0 group-hover:opacity-100"><Wrench size={12} /></button>
                                        </td>
                                    </tr>
                                ))}
                                {ingredients.filter(i => i.tipo === 'empaque').length === 0 && (
                                    <tr><td colSpan="4" className="p-6 text-center text-slate-400 text-xs italic">No hay materiales de empaque registrados. Usá el botón "Nuevo Empaque" para cargar la primera bolsa o etiqueta.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
}