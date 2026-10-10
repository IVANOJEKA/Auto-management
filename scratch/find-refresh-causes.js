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
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(full);
        }
    });
    return results;
}

const srcDir = path.join(__dirname, '..', 'src');
const files = findTsxFiles(srcDir);

const keywords = ['reload', 'setInterval', 'router.refresh', 'location.href', 'onAuthStateChange', 'router.push'];

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
        keywords.forEach(kw => {
            if (l.includes(kw)) {
                console.log(`${file.replace(__dirname, '')}:${idx + 1} -> [${kw}] ${l.trim()}`);
            }
        });
    });
});
