const fs = require('fs');
const path = require('path');

function findTsxFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(findTsxFiles(fullPath));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(fullPath);
        }
    });
    return results;
}

const appDir = path.join(__dirname, '..', 'src', 'app');
const files = findTsxFiles(appDir);

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    if (content.includes('addJournalEntry')) {
        console.log(`Found addJournalEntry in: ${file.replace(__dirname, '')}`);
        const lines = content.split('\n');
        lines.forEach((l, idx) => {
            if (l.includes('addJournalEntry')) {
                console.log(`  Line ${idx + 1}: ${l.trim()}`);
            }
        });
    }
});
