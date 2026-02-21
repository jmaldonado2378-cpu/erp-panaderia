'use client';
import React from 'react';
// IMPORTANTE: Esta ruta apunta a tu archivo en la carpeta components
import BakeryMES from '../components/bakery_erp';

export default function Page() {
    return (
        <main className="min-h-screen bg-slate-900">
            <BakeryMES />
        </main>
    );
}