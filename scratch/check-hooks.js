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
        } else if (file.endsWith('.tsx')) {
            results.push(fullPath);
        }
    });
    return results;
}

const appDir = path.join(__dirname, '..', 'src', 'app');
const files = findTsxFiles(appDir);

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    // Find export default function
    const exportIdx = lines.findIndex(l => l.includes('export default function'));
    if (exportIdx === -1) return;

    let earlyReturnLine = -1;
    let problematicHooks = [];

    for (let i = exportIdx; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (earlyReturnLine === -1) {
            // Early return at function level (e.g. if (!isAllowed...) return null;)
            if (trimmed.match(/^if\s*\([^)]*\)\s*return(\s+null|\s+<|\s*;\s*$)/)) {
                earlyReturnLine = i + 1;
            }
        } else {
            // Check if hook is called after early return
            if (trimmed.match(/^const\s+.*=\s+use[A-Z]/) || trimmed.match(/^use[A-Z]\w*\(/)) {
                problematicHooks.push({ line: i + 1, code: trimmed });
            }
        }
    }

    if (earlyReturnLine !== -1 && problematicHooks.length > 0) {
        console.log(`\n🚨 File: ${file}`);
        console.log(`  Early return at line ${earlyReturnLine}`);
        console.log('  Hooks declared AFTER early return:');
        problematicHooks.forEach(h => console.log(`    Line ${h.line}: ${h.code}`));
    }
});
