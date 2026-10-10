const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'settings', 'page.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log("Searching for 'reset' in settings/page.tsx:");
lines.forEach((line, index) => {
    if (line.toLowerCase().includes('reset') || line.includes('/api/reset')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
