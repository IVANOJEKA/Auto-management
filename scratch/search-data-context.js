const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'context', 'DataContext.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log("Searching for 'localStorage' keys in DataContext.tsx:");
lines.forEach((line, index) => {
    if (line.includes('localStorage') || line.includes('getItem') || line.includes('setItem')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
