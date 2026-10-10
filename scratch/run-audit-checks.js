const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const appDir = path.join(srcDir, 'app');
const apiDir = path.join(appDir, 'api');

// 1. Scan API Endpoints
function scanDir(dir, baseRoute = '') {
    let routes = [];
    if (!fs.existsSync(dir)) return routes;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            routes = routes.concat(scanDir(full, `${baseRoute}/${item}`));
        } else if (item === 'route.ts' || item === 'route.js' || item === 'route.tsx') {
            routes.push(baseRoute || '/');
        }
    }
    return routes;
}

const apiRoutes = scanDir(apiDir, '/api');

// 2. Scan App Pages
function scanPages(dir, baseRoute = '') {
    let pages = [];
    if (!fs.existsSync(dir)) return pages;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        if (item === 'api') continue;
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            pages = pages.concat(scanPages(full, `${baseRoute}/${item}`));
        } else if (item === 'page.tsx' || item === 'page.ts' || item === 'page.js') {
            pages.push(baseRoute || '/');
        }
    }
    return pages;
}

const appPages = scanPages(appDir);

// 3. Inspect Package.json
const pkgPath = path.join(rootDir, 'package.json');
const pkg = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) : {};

// 4. Inspect API Auth Guarding
const apiDetails = [];
function auditApiEndpoint(routePath) {
    const routeDir = path.join(appDir, routePath);
    const routeFile = fs.existsSync(path.join(routeDir, 'route.ts')) 
        ? path.join(routeDir, 'route.ts') 
        : fs.existsSync(path.join(routeDir, 'route.js')) 
        ? path.join(routeDir, 'route.js') 
        : null;

    if (!routeFile) return;
    const code = fs.readFileSync(routeFile, 'utf-8');
    
    const methods = [];
    if (code.includes('export async function GET') || code.includes('export function GET')) methods.push('GET');
    if (code.includes('export async function POST') || code.includes('export function POST')) methods.push('POST');
    if (code.includes('export async function PUT') || code.includes('export function PUT')) methods.push('PUT');
    if (code.includes('export async function DELETE') || code.includes('export function DELETE')) methods.push('DELETE');
    if (code.includes('export async function PATCH') || code.includes('export function PATCH')) methods.push('PATCH');

    const hasAuth = code.includes('supabase.auth.getUser') || code.includes('getHeader') || code.includes('authorization') || code.includes('useAuth') || code.includes('checkAuth');
    const hasTryCatch = code.includes('try {') && code.includes('catch');
    const hasValidation = code.includes('if (!') || code.includes('zod') || code.includes('validate');

    methods.forEach(method => {
        apiDetails.push({
            method,
            endpoint: routePath,
            hasAuth,
            hasTryCatch,
            hasValidation,
            file: routeFile.replace(rootDir, '')
        });
    });
}

apiRoutes.forEach(r => auditApiEndpoint(r));

// 5. Check Tests
let testsFound = [];
function findTests(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory() && item !== 'node_modules' && item !== '.next') {
            findTests(full);
        } else if (item.includes('.test.') || item.includes('.spec.')) {
            testsFound.push(full.replace(rootDir, ''));
        }
    }
}
findTests(rootDir);

console.log('=== AUDIT STATS ===');
console.log('App Pages Count:', appPages.length);
console.log('API Endpoints Count:', apiDetails.length);
console.log('Tests Found:', testsFound.length);
console.log('Dependencies Count:', Object.keys(pkg.dependencies || {}).length);
console.log('DevDependencies Count:', Object.keys(pkg.devDependencies || {}).length);
console.log('\n--- API Details Sample ---');
console.log(JSON.stringify(apiDetails.slice(0, 10), null, 2));
