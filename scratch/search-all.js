const fs = require('fs');
const path = require('path');

function searchDir(dir, query) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            searchDir(fullPath, query);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
                if (line.includes(query)) {
                    console.log(`${path.relative(path.join(__dirname, '..'), fullPath)} Line ${idx + 1}: ${line.trim()}`);
                }
            });
        }
    }
}

console.log("Searching for 'premiumVehicles'...");
searchDir(path.join(__dirname, '..', 'src'), 'premiumVehicles');
console.log("Searching for 'vehicles.filter'...");
searchDir(path.join(__dirname, '..', 'src'), 'vehicles.filter');
