const fs = require('fs');
const path = require('path');

// Map of page directory → module key
const PAGES = {
    appointments: 'appointments',
    compliance: 'compliance',
    crm: 'crm',
    inventory: 'inventory',
    logistics: 'logistics',
    notifications: 'notifications',
    parts: 'parts',
    quotes: 'quotes',
    sales: 'sales',
    service: 'service',
    suppliers: 'suppliers',
};

const GUARD_IMPORT = `import { usePageGuard } from '../../hooks/usePageGuard';`;

for (const [dir, moduleKey] of Object.entries(PAGES)) {
    const filePath = path.join(__dirname, 'src', 'app', dir, 'page.tsx');
    if (!fs.existsSync(filePath)) { console.warn(`SKIP (not found): ${filePath}`); continue; }

    let src = fs.readFileSync(filePath, 'utf-8');

    // 1. Add import after the last import line if not already present
    if (!src.includes('usePageGuard')) {
        // Find the last import line
        const lines = src.split('\n');
        let lastImportIdx = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trimStart().startsWith('import ')) lastImportIdx = i;
        }
        if (lastImportIdx >= 0) {
            lines.splice(lastImportIdx + 1, 0, GUARD_IMPORT);
            src = lines.join('\n');
        }
    }

    // 2. Add guard call + early return inside the default export function
    // Find the first `const { user` or `const {user` or `const user` that comes from useAuth
    // Insert `const { isAllowed } = usePageGuard('moduleKey');` right after the useAuth hook call
    // Pattern: find `= useAuth();` line and insert guard after it
    const useAuthLineRe = /^(\s+const\s+\{[^}]+\}\s*=\s*useAuth\(\);?\s*)$/m;
    if (!src.includes(`usePageGuard('${moduleKey}')`)) {
        src = src.replace(useAuthLineRe, (match) => {
            return match + `\n    const { isAllowed } = usePageGuard('${moduleKey}');\n    if (!isAllowed) return null;`;
        });
    }

    fs.writeFileSync(filePath, src, 'utf-8');
    console.log(`✅ Guarded: ${dir}/page.tsx → module='${moduleKey}'`);
}

console.log('\nDone.');
