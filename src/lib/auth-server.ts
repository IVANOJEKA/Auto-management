import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabase-server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export interface AuthenticatedUser {
    id: string;
    email: string;
    role: 'Admin' | 'Sales' | 'Finance' | 'Service' | 'Logistics';
    branch: string;
    tenantId: string;
}

export async function verifyUserSession(req: NextRequest): Promise<AuthenticatedUser | null> {
    try {
        // Retrieve Authorization header
        const authHeader = req.headers.get('Authorization') || '';
        if (!authHeader.startsWith('Bearer ')) {
            // Check query string as fallback (for document previews if any)
            const tokenParam = req.nextUrl.searchParams.get('token');
            if (tokenParam) {
                return await validateToken(tokenParam);
            }
            return null;
        }
        const token = authHeader.substring(7);
        return await validateToken(token);
    } catch (err) {
        console.error('[auth-server] Session verification exception:', err);
        return null;
    }
}

async function validateToken(token: string): Promise<AuthenticatedUser | null> {
    if (!token) return null;

    // Check if we are using placeholder/mock credentials for local environment
    const isMockEnv = !supabaseUrl || supabaseUrl.includes('placeholder-url') || !supabaseAnonKey || supabaseAnonKey.includes('placeholder-key');
    if (isMockEnv) {
        console.log('[auth-server] Mock environment detected. Simulating authenticated Admin session.');
        return {
            id: 'mock-admin-id',
            email: 'admin@garisphere.com',
            role: 'Admin',
            branch: 'Kampala Main',
            tenantId: '00000000-0000-0000-0000-000000000000'
        };
    }

    try {
        // Initialize standard anon client to verify user
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { persistSession: false, autoRefreshToken: false }
        });

        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            console.warn('[auth-server] Token validation failed:', error?.message);
            return null;
        }

        // Fetch user profile to retrieve role, branch, and tenantId
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) {
            console.error('[auth-server] Database profile query failed:', profileError.message);
            return null;
        }

        if (!profile) {
            console.warn(`[auth-server] User authenticated but profile missing for ID ${user.id}. Creating default Sales profile.`);
            // Auto-create profile if missing (resilient setup)
            const defaultName = user.email ? user.email.split('@')[0] : 'User';
            const { data: newProfile, error: createError } = await supabaseAdmin
                .from('user_profiles')
                .insert([{
                    id: user.id,
                    tenant_id: '00000000-0000-0000-0000-000000000000',
                    name: defaultName,
                    role: 'Sales',
                    branch: 'Kampala Main'
                }])
                .select()
                .single();

            if (createError) {
                console.error('[auth-server] Failed to auto-provision user profile:', createError.message);
                return null;
            }

            return {
                id: user.id,
                email: user.email || '',
                role: 'Sales',
                branch: 'Kampala Main',
                tenantId: '00000000-0000-0000-0000-000000000000'
            };
        }

        return {
            id: user.id,
            email: user.email || '',
            role: profile.role,
            branch: profile.branch,
            tenantId: profile.tenant_id || '00000000-0000-0000-0000-000000000000'
        };
    } catch (tokenErr: any) {
        console.error('[auth-server] Token parsing failed:', tokenErr.message);
        return null;
    }
}

export function hasRoleAccess(user: AuthenticatedUser, allowedRoles: string[]): boolean {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    return allowedRoles.includes(user.role);
}

export function hasBranchAccess(user: AuthenticatedUser, targetBranch?: string): boolean {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    if (!targetBranch || targetBranch === 'All') return true;
    return user.branch === targetBranch;
}

export async function verifyAtomicVehicleSale(vehicleId: string, tenantId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: vehicle, error } = await supabaseAdmin
            .from('vehicles')
            .select('id, status')
            .eq('id', vehicleId)
            .maybeSingle();

        if (error) {
            return { success: true };
        }

        if (vehicle && vehicle.status === 'Sold') {
            return { success: false, error: 'Vehicle has already been sold and is no longer available for sale.' };
        }

        return { success: true };
    } catch (err: any) {
        return { success: true };
    }
}
