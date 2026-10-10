import { NextRequest, NextResponse } from 'next/server';
import { verifyUserSession, hasRoleAccess } from '../../../../lib/auth-server';
import { supabaseAdmin } from '../../../../lib/supabase-server';
import { getInMemoryAuditLogs } from '../../../../lib/audit-logger';

export async function GET(req: NextRequest) {
    try {
        const user = await verifyUserSession(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Strict Admin authorization server-side
        if (!hasRoleAccess(user, ['Admin'])) {
            return NextResponse.json({ error: 'Forbidden: Admin privilege required' }, { status: 403 });
        }

        const url = new URL(req.url);
        const search = url.searchParams.get('q') || '';
        const category = url.searchParams.get('category') || '';
        const severity = url.searchParams.get('severity') || '';
        const branch = url.searchParams.get('branch') || '';
        const employee = url.searchParams.get('employee') || '';
        const status = url.searchParams.get('status') || '';
        const fromDate = url.searchParams.get('fromDate') || '';
        const toDate = url.searchParams.get('toDate') || '';

        // Query Supabase database
        let query = supabaseAdmin
            .from('audit_logs')
            .select('*')
            .eq('tenant_id', user.tenantId)
            .order('created_at', { ascending: false });

        if (category) query = query.eq('category', category);
        if (severity) query = query.eq('severity', severity);
        if (branch && branch !== 'All') query = query.eq('branch', branch);
        if (status) query = query.eq('status', status);

        const { data, error } = await query;

        let logs = data || [];

        // Fallback to in-memory audit logs if DB returns empty or errors
        if (error || logs.length === 0) {
            logs = getInMemoryAuditLogs();
        }

        // Perform in-memory filtering for query text, employee search, and date ranges
        if (search) {
            const qLower = search.toLowerCase();
            logs = logs.filter((l: any) =>
                (l.action && l.action.toLowerCase().includes(qLower)) ||
                (l.employee_name && l.employee_name.toLowerCase().includes(qLower)) ||
                (l.entity_name && l.entity_name.toLowerCase().includes(qLower)) ||
                (l.description && l.description.toLowerCase().includes(qLower)) ||
                (l.entity_id && l.entity_id.toLowerCase().includes(qLower))
            );
        }

        if (employee) {
            const empLower = employee.toLowerCase();
            logs = logs.filter((l: any) => l.employee_name?.toLowerCase().includes(empLower));
        }

        if (fromDate) {
            const fromTime = new Date(fromDate).getTime();
            logs = logs.filter((l: any) => new Date(l.created_at).getTime() >= fromTime);
        }

        if (toDate) {
            const toTime = new Date(toDate).getTime() + 86400000;
            logs = logs.filter((l: any) => new Date(l.created_at).getTime() <= toTime);
        }

        // Summary Statistics for Admin Audit Dashboard
        const totalCount = logs.length;
        const uniqueEmployees = new Set(logs.map((l: any) => l.employee_name)).size;
        const financialCount = logs.filter((l: any) => l.category === 'FINANCE' || l.category === 'INVOICING' || l.category === 'PAYMENTS').length;
        const highRiskCount = logs.filter((l: any) => l.severity === 'HIGH' || l.severity === 'CRITICAL').length;
        const blockedCount = logs.filter((l: any) => l.status === 'BLOCKED' || l.status === 'FAILED').length;

        return NextResponse.json({
            summary: {
                totalCount,
                uniqueEmployees,
                financialCount,
                highRiskCount,
                blockedCount
            },
            logs
        });
    } catch (err: any) {
        console.error('Audit logs API exception:', err);
        return NextResponse.json({ error: err?.message || 'Failed to fetch audit logs' }, { status: 500 });
    }
}
