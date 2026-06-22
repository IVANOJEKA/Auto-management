const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'page.tsx');
const content = fs.readFileSync(filePath, 'utf-8');
// Preserve original line endings
const eol = content.includes('\r\n') ? '\r\n' : '\n';
const lines = content.split(/\r?\n/);

// 1. Find the blank line before the mockup comment (or the comment itself)
let startIdx = lines.findIndex(l => l.includes('Right side interactive dashboard mockup'));
if (startIdx === -1) { console.error('Mockup comment not found!'); process.exit(1); }
if (startIdx > 0 && lines[startIdx - 1].trim() === '') startIdx--;

// 2. Find the closing </div> of the right-side outer div.
//    It has exactly 16 spaces indentation - same level as the opening div.
const closingRe = /^                <\/div>/;
let endIdx = -1;
for (let i = startIdx + 2; i < lines.length; i++) {
    if (closingRe.test(lines[i])) {
        endIdx = i;
        break;
    }
}
if (endIdx === -1) { console.error('Could not find closing div!'); process.exit(1); }

console.log(`Removing lines ${startIdx + 1}–${endIdx + 1} (${endIdx - startIdx + 1} lines)`);
console.log('First removed:', lines[startIdx]);
console.log('Last  removed:', lines[endIdx]);

const newLines = [...lines.slice(0, startIdx), ...lines.slice(endIdx + 1)];
fs.writeFileSync(filePath, newLines.join(eol), 'utf-8');
console.log('Done. New line count:', newLines.length);
