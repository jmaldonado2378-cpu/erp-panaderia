'use client';
import React, { useEffect, useState } from 'react';
import BakeryMES from '../components/bakery_erp';

export default function Page() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Retrasa el renderizado al cliente para evitar hydration mismatch con datos quemados
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <main className="min-h-screen bg-slate-900 m-0 p-0 overflow-hidden">
      <BakeryMES />
    </main>
  );
}
