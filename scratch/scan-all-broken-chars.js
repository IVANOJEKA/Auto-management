const fs = require('fs');
const path = require('path');

function findTsxFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat && stat.isDirectory()) {
            results = results.concat(findTsxFiles(full));
        } else if (file.endsWith('.tsx')) {
            results.push(full);
        }
    });
    return results;
}

const appDir = path.join(__dirname, '..', 'src', 'app');
const files = findTsxFiles(appDir);

let count = 0;
files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
        if (l.includes('â') || l.includes('Ã')) {
            console.log(`File: ${file.replace(__dirname, '')}:${idx + 1}`);
            console.log(`  Line: ${l.trim()}`);
            count++;
        }
    });
});

console.log(`\nTotal broken character occurrences: ${count}`);
