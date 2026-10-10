const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

// Check Middleware
const mwPath1 = path.join(rootDir, 'middleware.ts');
const mwPath2 = path.join(srcDir, 'middleware.ts');
const hasMiddleware = fs.existsSync(mwPath1) || fs.existsSync(mwPath2);
const mwContent = hasMiddleware ? fs.readFileSync(fs.existsSync(mwPath1) ? mwPath1 : mwPath2, 'utf-8') : '';

// Check Supabase setup
const sbPath = path.join(srcDir, 'lib', 'supabase.ts');
const sbContent = fs.existsSync(sbPath) ? fs.readFileSync(sbPath, 'utf-8') : '';

// Check DataContext
const dcPath = path.join(srcDir, 'context', 'DataContext.tsx');
const dcContent = fs.existsSync(dcPath) ? fs.readFileSync(dcPath, 'utf-8') : '';

// Check AuthContext
const acPath = path.join(srcDir, 'context', 'AuthContext.tsx');
const acContent = fs.existsSync(acPath) ? fs.readFileSync(acPath, 'utf-8') : '';

// Check PermissionsContext
const pcPath = path.join(srcDir, 'context', 'PermissionsContext.tsx');
const pcContent = fs.existsSync(pcPath) ? fs.readFileSync(pcPath, 'utf-8') : '';

console.log('=== MIDDLEWARE ANALYSIS ===');
console.log('Middleware file exists:', hasMiddleware);
if (hasMiddleware) {
    console.log('Middleware length:', mwContent.length);
    console.log('Middleware snippet:', mwContent.slice(0, 300));
}

console.log('\n=== SUPABASE ANALYSIS ===');
console.log('Supabase file exists:', fs.existsSync(sbPath));
console.log('Supabase uses Service Role Key:', sbContent.includes('SUPABASE_SERVICE_ROLE_KEY') || sbContent.includes('service_role'));

console.log('\n=== DATA CONTEXT ANALYSIS ===');
console.log('DataContext length:', dcContent.length, 'bytes');
console.log('Has offline local storage fallback:', dcContent.includes('localStorage'));
console.log('Has Supabase real-time / DB sync:', dcContent.includes('supabase') || dcContent.includes('fetch'));

console.log('\n=== AUTH & RBAC ANALYSIS ===');
console.log('AuthContext stores session in:', acContent.includes('localStorage') ? 'localStorage' : 'Cookies/Session');
console.log('PermissionsContext modules count:', (pcContent.match(/label:/g) || []).length);
