const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const appDir = path.join(rootDir, 'src', 'app');
const apiDir = path.join(appDir, 'api');

function getApiFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            results = results.concat(getApiFiles(full));
        } else if (item.endsWith('.ts') || item.endsWith('.js')) {
            results.push(full);
        }
    }
    return results;
}

const apiFiles = getApiFiles(apiDir);

const apiAudit = [];

apiFiles.forEach(file => {
    const relativePath = file.replace(rootDir, '').replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf-8');

    const methods = [];
    if (content.includes('export async function GET') || content.includes('export function GET')) methods.push('GET');
    if (content.includes('export async function POST') || content.includes('export function POST')) methods.push('POST');
    if (content.includes('export async function PUT') || content.includes('export function PUT')) methods.push('PUT');
    if (content.includes('export async function DELETE') || content.includes('export function DELETE')) methods.push('DELETE');
    if (content.includes('export async function PATCH') || content.includes('export function PATCH')) methods.push('PATCH');

    const checksAuthServerSide = content.includes('supabase.auth.getUser') || content.includes('auth.api.getUser') || content.includes('verifyToken') || content.includes('req.headers.get(\'authorization\')') || content.includes('getSession');
    const checksRole = content.includes('role ===') || content.includes('role ===') || content.includes('isAdmin');
    const checksBranch = content.includes('branch ===') || content.includes('eq(\'branch\'');

    const performsDelete = content.includes('.delete()') || content.includes('DELETE FROM');
    const isSoftDelete = content.includes('is_deleted') || content.includes('deleted_at') || content.includes('status: \'Deleted\'') || content.includes('status = \'Deleted\'');

    const hasValidation = content.includes('zod') || content.includes('if (!') || content.includes('typeof');

    methods.forEach(method => {
        let risk = 'Low';
        if (!checksAuthServerSide && (method === 'POST' || method === 'PATCH' || method === 'DELETE')) {
            risk = method === 'DELETE' ? 'High' : 'Medium';
        }

        apiAudit.push({
            endpoint: relativePath.replace('/src/app', '').replace('/route.ts', '').replace('/route.js', ''),
            method,
            checksAuthServerSide,
            checksRole,
            checksBranch,
            performsDelete,
            isSoftDelete: performsDelete ? isSoftDelete : 'N/A',
            hasValidation,
            risk
        });
    });
});

console.log('=== ADVERSARIAL API AUDIT SUMMARY ===');
console.log('Total Handlers Inspected:', apiAudit.length);
const unauthedMutations = apiAudit.filter(a => !a.checksAuthServerSide && (a.method === 'POST' || a.method === 'PATCH' || a.method === 'DELETE'));
console.log('API Handlers without Server-Side Auth Check:', unauthedMutations.length);

console.log('\n--- Sample Endpoints ---');
console.table(apiAudit.slice(0, 15));
