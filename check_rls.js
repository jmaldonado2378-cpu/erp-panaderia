
const { createClient } = require('@supabase/supabase-js');
// Hardcoding for test script since require('dotenv') is not installed in package.json by default for frontend? 
// No, Next.js uses .env internally.
// But running node directly needs dotenv.
// Let's check environment.
// Actually can I pass env via command line?
// Or read .env.local manually.

const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');
let KEY = '';
let URL = '';

lines.forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) URL = line.split('=')[1].trim();
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) KEY = line.split('=')[1].trim();
});

console.log('Connecting to Supabase:', URL);
const supabase = createClient(URL, KEY);

async function test() {
    try {
        const { data, error } = await supabase.from('dim_ingredientes').select('*').limit(1);
        if (error) {
            console.error('ERROR from Supabase:', error);
            process.exit(1);
        }
        console.log('SUCCESS! Retrieved data:', data);
        process.exit(0); // Success
    } catch (err) {
        console.error('EXCEPTION:', err);
        process.exit(1);
    }
}

test();
