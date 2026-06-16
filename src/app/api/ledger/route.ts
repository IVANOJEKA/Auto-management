import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-server';
import { getTenantId } from '../../../lib/tenant-server';

export async function GET(req: NextRequest) {
    try {
        const tenantId = await getTenantId(req);
        const { data, error } = await supabaseAdmin
            .from('ledger_entries')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('date', { ascending: false });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        
        const mappedData = data.map(item => ({
            id: item.id,
            date: item.date,
            accountId: item.account_id,
            accountName: item.account_name,
            type: item.type,
            amount: Number(item.amount),
            entryType: item.entry_type,
            description: item.description,
            referenceId: item.reference_id,
            branch: item.branch
        }));
        
        return NextResponse.json(mappedData);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const tenantId = await getTenantId(req);
        const body = await req.json();
        // Support both { entries: [...] } wrapper and flat array/object formats
        let itemsToInsert: any[];
        if (body.entries && Array.isArray(body.entries)) {
            itemsToInsert = body.entries;
        } else if (Array.isArray(body)) {
            itemsToInsert = body;
        } else {
            itemsToInsert = [body];
        }

        const dbPayloads = itemsToInsert.map(item => ({
            tenant_id: tenantId,
            account_id: item.accountId,
            account_name: item.accountName,
            type: item.type,
            amount: item.amount,
            entry_type: item.entryType,
            description: item.description,
            reference_id: item.referenceId,
            branch: item.branch
        }));

        const { data, error } = await supabaseAdmin
            .from('ledger_entries')
            .insert(dbPayloads)
            .select();
            
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        
        const mappedResponse = data.map(item => ({
            id: item.id,
            date: item.date,
            accountId: item.account_id,
            accountName: item.account_name,
            type: item.type,
            amount: Number(item.amount),
            entryType: item.entry_type,
            description: item.description,
            referenceId: item.reference_id,
            branch: item.branch
        }));
        
        return NextResponse.json(mappedResponse, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
