const fs = require('fs');
const path = require('path');

function findFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat && stat.isDirectory()) {
            results = results.concat(findFiles(full));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
            results.push(full);
        }
    });
    return results;
}

const appDir = path.join(__dirname, '..', 'src');
const files = findFiles(appDir);

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
        if (l.includes('â') || l.includes('Ã') || l.includes('')) {
            console.log(`\n🚨 File: ${file.replace(__dirname, '')}`);
            console.log(`   Line ${idx + 1}: ${l.trim()}`);
        }
    });
});
