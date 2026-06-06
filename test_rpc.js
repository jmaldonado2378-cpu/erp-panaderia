const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');
let KEY = '';
let URL = '';
lines.forEach(line => {
    if (line.trim().startsWith('NEXT_PUBLIC_SUPABASE_URL=')) URL = line.split('=')[1].trim();
    if (line.trim().startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) KEY = line.split('=')[1].trim();
});

const supabase = createClient(URL, KEY);

async function run() {
    const rpcs = [
        { name: 'exec_sql', args: { sql: 'SELECT 1' } },
        { name: 'execute_sql', args: { sql: 'SELECT 1' } },
        { name: 'run_sql', args: { sql: 'SELECT 1' } },
        { name: 'exec', args: { query: 'SELECT 1' } },
        { name: 'sql', args: { query: 'SELECT 1' } }
    ];

    for (const rpc of rpcs) {
        console.log(`Calling RPC '${rpc.name}'...`);
        const { data, error } = await supabase.rpc(rpc.name, rpc.args);
        if (error) {
            console.log(`❌ RPC '${rpc.name}' failed: ${error.message} (${error.code})`);
        } else {
            console.log(`✅ RPC '${rpc.name}' succeeded! Data:`, data);
        }
    }
}

run();
