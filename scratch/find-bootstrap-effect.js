const fs = require('fs');
const path = require('path');

const dcPath = path.join(__dirname, '..', 'src', 'context', 'DataContext.tsx');
const content = fs.readFileSync(dcPath, 'utf-8');
const lines = content.split('\n');

lines.forEach((l, idx) => {
    if (l.includes('bootstrap') || l.includes('useEffect') || l.includes('setInterval')) {
        console.log(`Line ${idx + 1}: ${l.trim()}`);
    }
});
