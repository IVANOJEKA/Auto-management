const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'logistics', 'page.tsx');
if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    console.log("Checking logistics/page.tsx...");
    lines.forEach((line, idx) => {
        if (line.toLowerCase().includes('car') || line.toLowerCase().includes('vin')) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
    });
} else {
    console.log("logistics/page.tsx does not exist");
}
