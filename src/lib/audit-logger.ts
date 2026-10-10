import { NextRequest } from 'next/server';
import { verifyUserSession, AuthenticatedUser } from './auth-server';
import { supabaseAdmin } from './supabase-server';

export type AuditCategory =
    | 'AUTHENTICATION'
    | 'USER_MANAGEMENT'
    | 'CRM'
    | 'VEHICLES'
    | 'SALES'
    | 'INVOICING'
    | 'PAYMENTS'
    | 'INVENTORY'
    | 'PARTS_POS'
    | 'WORKSHOP'
    | 'FINANCE'
    | 'REPORTING'
    | 'SYSTEM';

export type AuditSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AuditStatus = 'SUCCESS' | 'FAILED' | 'BLOCKED';

export interface AuditLogItem {
    id: string;
    tenant_id: string;
    user_id: string;
    employee_name: string;
    employee_role: string;
    branch: string;
    action: string;
    category: AuditCategory;
    entity_type: string;
    entity_id?: string;
    entity_name?: string;
    description: string;
    old_values?: Record<string, any> | null;
    new_values?: Record<string, any> | null;
    changed_fields?: string[];
    severity: AuditSeverity;
    status: AuditStatus;
    ip_address?: string;
    user_agent?: string;
    created_at: string;
}

export interface LogAuditOptions {
    action: string;
    category: AuditCategory;
    entityType: string;
    entityId?: string;
    entityName?: string;
    description: string;
    oldValues?: Record<string, any> | null;
    newValues?: Record<string, any> | null;
    severity?: AuditSeverity;
    status?: AuditStatus;
    userOverride?: AuthenticatedUser | null;
}

// In-memory fallback cache for audit logs to handle resilient offline/mock mode
const inMemoryAuditLogs: AuditLogItem[] = [];

// Sensitive field keys to strip before logging
const SENSITIVE_KEYS = new Set([
    'password', 'pass', 'password_hash', 'token', 'access_token', 'refresh_token',
    'secret', 'apiKey', 'api_key', 'service_key', 'cvv', 'credit_card'
]);

function sanitizeValues(obj?: Record<string, any> | null): Record<string, any> | null {
    if (!obj || typeof obj !== 'object') return null;
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
        if (SENSITIVE_KEYS.has(k.toLowerCase())) {
            clean[k] = '[REDACTED_SENSITIVE_DATA]';
        } else if (v && typeof v === 'object' && !Array.isArray(v)) {
            clean[k] = sanitizeValues(v);
        } else {
            clean[k] = v;
        }
    }
    return clean;
}

function computeChangedFields(oldVals?: Record<string, any> | null, newVals?: Record<string, any> | null): string[] {
    if (!oldVals || !newVals) return [];
    const changed: string[] = [];
    const allKeys = new Set([...Object.keys(oldVals), ...Object.keys(newVals)]);
    for (const k of allKeys) {
        if (SENSITIVE_KEYS.has(k.toLowerCase())) continue;
        if (JSON.stringify(oldVals[k]) !== JSON.stringify(newVals[k])) {
            changed.push(k);
        }
    }
    return changed;
}

export async function logAuditEvent(req: NextRequest | null, options: LogAuditOptions): Promise<AuditLogItem | null> {
    try {
        let user: AuthenticatedUser | null = options.userOverride || null;
        if (!user && req) {
            user = await verifyUserSession(req);
        }

        const userId = user?.id || 'system-bot';
        const userName = user?.email ? user.email.split('@')[0] : 'System User';
        const userRole = user?.role || 'Admin';
        const userBranch = user?.branch || 'Kampala Main';
        const tenantId = user?.tenantId || '00000000-0000-0000-0000-000000000000';

        const ipAddress = req ? (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1') : '127.0.0.1';
        const userAgent = req ? (req.headers.get('user-agent') || 'Server/API') : 'Server/API';

        const sanitizedOld = sanitizeValues(options.oldValues);
        const sanitizedNew = sanitizeValues(options.newValues);
        const changedFields = computeChangedFields(sanitizedOld, sanitizedNew);

        // Auto-assign severity if not specified
        let severity = options.severity || 'INFO';
        if (!options.severity) {
            if (options.action.includes('DELETE') || options.action.includes('VOID') || options.action.includes('REVERSE') || options.action.includes('ROLE_CHANGED')) {
                severity = 'HIGH';
            } else if (options.action.includes('STATUS_CHANGED') || options.action.includes('UPDATE') || options.action.includes('SOLD')) {
                severity = 'MEDIUM';
            }
        }

        const logRecord: AuditLogItem = {
            id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            tenant_id: tenantId,
            user_id: userId,
            employee_name: userName,
            employee_role: userRole,
            branch: userBranch,
            action: options.action,
            category: options.category,
            entity_type: options.entityType,
            entity_id: options.entityId || '',
            entity_name: options.entityName || '',
            description: options.description,
            old_values: sanitizedOld,
            new_values: sanitizedNew,
            changed_fields: changedFields,
            severity,
            status: options.status || 'SUCCESS',
            ip_address: ipAddress,
            user_agent: userAgent,
            created_at: new Date().toISOString()
        };

        // Cache in memory array
        inMemoryAuditLogs.unshift(logRecord);
        if (inMemoryAuditLogs.length > 500) {
            inMemoryAuditLogs.pop();
        }

        // Persist to Supabase audit_logs table
        try {
            await supabaseAdmin.from('audit_logs').insert([{
                id: logRecord.id,
                tenant_id: logRecord.tenant_id,
                user_id: logRecord.user_id,
                employee_name: logRecord.employee_name,
                employee_role: logRecord.employee_role,
                branch: logRecord.branch,
                action: logRecord.action,
                category: logRecord.category,
                entity_type: logRecord.entity_type,
                entity_id: logRecord.entity_id,
                entity_name: logRecord.entity_name,
                description: logRecord.description,
                old_values: logRecord.old_values,
                new_values: logRecord.new_values,
                changed_fields: logRecord.changed_fields,
                severity: logRecord.severity,
                status: logRecord.status,
                ip_address: logRecord.ip_address,
                user_agent: logRecord.user_agent,
                created_at: logRecord.created_at
            }]);
        } catch {
            // Database failover — in-memory cache handles response seamlessly
        }

        return logRecord;
    } catch (err) {
        console.error('[audit-logger] Error recording audit event:', err);
        return null;
    }
}

export function getInMemoryAuditLogs(): AuditLogItem[] {
    return [...inMemoryAuditLogs];
}
