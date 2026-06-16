const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
const content = fs.readFileSync(pagePath, 'utf8');
const lines = content.split('\n');

console.log("Searching for 'premiumVehicles' in src/app/page.tsx...");
lines.forEach((line, idx) => {
    if (line.includes('premiumVehicles')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
