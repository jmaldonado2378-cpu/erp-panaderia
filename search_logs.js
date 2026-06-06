const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\Usuario\\.gemini\\antigravity\\brain\\f7bb5b55-6abe-45d4-8f03-c04c08213844\\.system_generated\\logs\\transcript.jsonl';

if (!fs.existsSync(logPath)) {
    console.error("Log file not found at " + logPath);
    process.exit(1);
}

const lines = fs.readFileSync(logPath, 'utf8').split('\n');
console.log(`Searching ${lines.length} lines in transcript...`);

const keywords = ['password', 'db', 'postgres', 'token', 'key', 'connection', 'url'];
lines.forEach((line, idx) => {
    const lower = line.toLowerCase();
    if (keywords.some(k => lower.includes(k)) && !lower.includes('supabase_anon_key')) {
        // Output matching lines truncated to avoid printing too much
        if (line.length > 200) {
            console.log(`Line ${idx + 1}: ${line.substring(0, 200)}...`);
        } else {
            console.log(`Line ${idx + 1}: ${line}`);
        }
    }
});
