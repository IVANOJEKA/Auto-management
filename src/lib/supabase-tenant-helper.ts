import { supabaseAdmin } from './supabase-server';

// In-memory cache to remember which tables do NOT have tenant_id column
const missingTenantIdCache: Record<string, boolean> = {};

export async function tenantSelect(table: string, tenantId: string, queryBuilder: (q: any) => any = (q) => q) {
    if (missingTenantIdCache[table]) {
        // Column is known to be missing: do not filter by tenant_id
        const q = supabaseAdmin.from(table).select('*');
        return queryBuilder(q);
    }

    const q = supabaseAdmin.from(table).select('*').eq('tenant_id', tenantId);
    const { data, error } = await queryBuilder(q);

    if (error && (error.code === '42703' || error.message?.includes('tenant_id') || error.message?.includes('column'))) {
        missingTenantIdCache[table] = true;
        // Retry without tenant_id filter
        const fallbackQ = supabaseAdmin.from(table).select('*');
        return queryBuilder(fallbackQ);
    }

    return { data, error };
}

export async function tenantInsert(table: string, tenantId: string, payload: any) {
    if (missingTenantIdCache[table]) {
        // Insert without tenant_id
        const { tenant_id, ...cleanPayload } = payload;
        return supabaseAdmin.from(table).insert([cleanPayload]).select();
    }

    const payloadWithTenant = { ...payload, tenant_id: tenantId };
    const { data, error } = await supabaseAdmin.from(table).insert([payloadWithTenant]).select();

    if (error && (error.code === '42703' || error.message?.includes('tenant_id') || error.message?.includes('column'))) {
        missingTenantIdCache[table] = true;
        const { tenant_id, ...cleanPayload } = payload;
        return supabaseAdmin.from(table).insert([cleanPayload]).select();
    }

    return { data, error };
}

export async function tenantUpdate(table: string, tenantId: string, id: string, payload: any, idColumn = 'id') {
    let query = supabaseAdmin.from(table).update(payload).eq(idColumn, id);
    if (!missingTenantIdCache[table]) {
        query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query.select();
    if (error && (error.code === '42703' || error.message?.includes('tenant_id') || error.message?.includes('column'))) {
        missingTenantIdCache[table] = true;
        // Retry without tenant_id
        return supabaseAdmin.from(table).update(payload).eq(idColumn, id).select();
    }

    return { data, error };
}

export async function tenantDelete(table: string, tenantId: string, id: string, idColumn = 'id') {
    let query = supabaseAdmin.from(table).delete().eq(idColumn, id);
    if (!missingTenantIdCache[table]) {
        query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;
    if (error && (error.code === '42703' || error.message?.includes('tenant_id') || error.message?.includes('column'))) {
        missingTenantIdCache[table] = true;
        // Retry without tenant_id
        return supabaseAdmin.from(table).delete().eq(idColumn, id);
    }

    return { data, error };
}
