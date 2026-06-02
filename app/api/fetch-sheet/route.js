import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetId = searchParams.get('sheetId');
    const gid = searchParams.get('gid') || '0';
    
    if (!sheetId) {
      return NextResponse.json({ error: 'Falta el ID de la hoja de cálculo (sheetId).' }, { status: 400 });
    }
    
    const fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const res = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv,text/plain,application/csv'
      },
      // Evitar que Next.js cachee permanentemente esta petición si cambian los datos de la hoja
      next: { revalidate: 0 }
    });
    
    if (!res.ok) {
      return NextResponse.json({ 
        error: 'No se pudo descargar la hoja. Asegúrate de que esté configurada como "Cualquier persona con el enlace puede ver" (Lector).' 
      }, { status: res.status });
    }
    
    const csvText = await res.text();
    
    // Devolver el texto CSV crudo
    return new NextResponse(csvText, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
      },
    });
    
  } catch (error) {
    console.error('Error al descargar la hoja desde el servidor:', error);
    return NextResponse.json({ error: error.message || 'Error interno al procesar la solicitud en el servidor' }, { status: 500 });
  }
}
