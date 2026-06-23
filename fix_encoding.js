const fs = require('fs');
let s = fs.readFileSync('src/app/parts/page.tsx', 'utf8');
const lines = s.split('\n');

// Truncate to the correct 1176 lines (the component ends with } on line 1176)
const truncated = lines.slice(0, 1176).join('\n');

// Fix line 734 - the icons declaration was broken by the bad regex
// Find the broken line and fix it
const fixed = truncated.replace(
    /const icons: Record<string, string> = \{ 'Cash': '[^']*'\s*[\r\n]/,
    "const icons: Record<string, string> = { 'Cash': '$', 'MTN Mobile Money': 'MTN', 'Airtel Money': 'ATL', 'Card': 'CRD', 'Credit': 'CR' };\n"
);

fs.writeFileSync('src/app/parts/page.tsx', fixed, 'utf8');

const newLines = fixed.split('\n');
console.log('Total lines:', newLines.length);
console.log('L734:', newLines[733].trim().slice(0, 80));
console.log('L1174:', newLines[1173].trim().slice(0, 60));
console.log('L1175:', newLines[1174].trim().slice(0, 60));
console.log('L1176:', newLines[1175].trim().slice(0, 60));
