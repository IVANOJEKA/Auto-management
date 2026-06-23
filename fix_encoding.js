const fs = require('fs');
const s = fs.readFileSync('src/app/parts/page.tsx', 'utf8');
const lines = s.split('\n');
const bad = [];
lines.forEach((l, i) => {
    // Check for lines with JSX content that have suspicious short non-ASCII-printable chars after >
    const m = l.match(/>([^<a-zA-Z0-9\s{()\[\]\\\/\-+,.;:!?_#@='"~|&*%^$`]{1,5})\s*[A-Z]/);
    if (m) bad.push((i+1) + ': ' + l.trim().slice(0, 90));
});
console.log('Suspect lines:', bad.length);
bad.slice(0, 20).forEach(l => console.log(l));
