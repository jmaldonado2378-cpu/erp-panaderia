import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { action, projectId, apiKey } = await request.json();
    
    if (!projectId) {
      return NextResponse.json({ error: 'Falta el ID del Proyecto de Stitch.' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'Falta la API Key de Stitch.' }, { status: 400 });
    }
    
    let methodName = '';
    let methodArgs = {};
    
    if (action === 'get-project') {
      methodName = 'get_project';
      methodArgs = { name: `projects/${projectId}` };
    } else if (action === 'list-design-systems') {
      methodName = 'list_design_systems';
      methodArgs = { projectId: projectId };
    } else {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }
    
    // Consultar el servidor MCP oficial de Stitch
    const response = await fetch('https://stitch.googleapis.com/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: methodName,
          arguments: methodArgs
        },
        id: 1
      })
    });
    
    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Error de la API de Stitch: ${errText}` }, { status: response.status });
    }
    
    const data = await response.json();
    
    if (data.error) {
      return NextResponse.json({ error: data.error.message || 'Error de llamada JSON-RPC en Stitch' }, { status: 500 });
    }
    
    const textResult = data.result?.content?.[0]?.text;
    if (!textResult) {
      return NextResponse.json({ error: 'Respuesta vacía del servidor de Stitch' }, { status: 500 });
    }
    
    const parsedResult = JSON.parse(textResult);
    return NextResponse.json(parsedResult);
    
  } catch (error) {
    console.error('Error en API stitch-sync:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
