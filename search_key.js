const fs = require('fs');
const path = require('path');

const content = fs.readFileSync('components/views/PricingView.jsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('charc_config') || line.includes('fracc_config')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
