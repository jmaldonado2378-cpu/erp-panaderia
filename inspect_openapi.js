const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');
let KEY = '';
let URL = '';
lines.forEach(line => {
    if (line.trim().startsWith('NEXT_PUBLIC_SUPABASE_URL=')) URL = line.split('=')[1].trim();
    if (line.trim().startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) KEY = line.split('=')[1].trim();
});

async function run() {
    const response = await fetch(`${URL}/rest/v1/`, {
        headers: {
            'apikey': KEY,
            'Authorization': `Bearer ${KEY}`
        }
    });
    const schema = await response.json();
    console.log("Schema root keys:", Object.keys(schema));
    if (schema.paths) {
        console.log("Paths count:", Object.keys(schema.paths).length);
        console.log("Paths:", Object.keys(schema.paths).slice(0, 15));
    }
    if (schema.definitions) {
        console.log("Definitions count:", Object.keys(schema.definitions).length);
        console.log("Definitions:", Object.keys(schema.definitions).slice(0, 15));
    }
}

run();
