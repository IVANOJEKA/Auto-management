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

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
        if (l.includes('<form')) {
            console.log(`File: ${file.replace(__dirname, '')}:${idx + 1}`);
            console.log(`  ${l.trim()}`);
        }
    });
});
