const fs = require('fs');
let s = fs.readFileSync('src/app/parts/page.tsx', 'utf8');

// Strip ASCII control chars (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F) — keep \t \n \r
s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

// Fix specific JSX remnants visible in screenshots
s = s.replace(/a"\s*(?=Spare Parts)/g, '');
s = s.replace(/x:\s*(?=Cart)/g, '');
s = s.replace(/S&\s*(?=Ma)/g, '');

// Remove lone non-word remnant chars at the very start of JSX text (>JUNK WORD)
// e.g. >x| Inventory, >x:8 Cart, >k| Search
s = s.replace(/(>)([^a-zA-Z0-9\s"'`{()\[\]\\,.;:!?_\-+=#@\/\r\n]{1,5})(\s*)(?=[A-Z])/g, '$1$3');

fs.writeFileSync('src/app/parts/page.tsx', s, 'utf8');

const idx = s.indexOf('Spare Parts');
console.log('Title:', s.slice(Math.max(0, idx - 12), idx + 20));
const idx2 = s.indexOf('Cart');
console.log('Cart:', s.slice(Math.max(0, idx2 - 10), idx2 + 8));
console.log('Lines:', s.split('\n').length);
