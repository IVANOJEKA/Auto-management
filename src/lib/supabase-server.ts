import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseUrl = (rawUrl && rawUrl.startsWith('http')) ? rawUrl : 'https://placeholder-url.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

const baseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// Cache to remember which tables do NOT have tenant_id column
const missingTenantIdTables = new Set<string>();

function wrapBuilder(builder: any, table: string, actions: any[] = []): any {
    return new Proxy(builder, {
        get(target, prop, receiver) {
            // Intercept execution (Promise then)
            if (prop === 'then') {
                return function(onFulfilled: any, onRejected: any) {
                    return target.then(async (res: any) => {
                        if (res && res.error && (res.error.code === '42703' || res.error.message?.includes('tenant_id') || res.error.message?.includes('column'))) {
                            console.warn(`[Supabase Proxy] Column "tenant_id" missing on table "${table}". Retrying query without tenant_id...`);
                            missingTenantIdTables.add(table);
                            
                            // Rebuild the query builder without tenant_id
                            let rebuilt: any = baseClient.from(table);
                            for (const action of actions) {
                                if (action.prop === 'eq' && action.args[0] === 'tenant_id') {
                                    continue;
                                }
                                if (action.prop === 'insert') {
                                    const payload = action.args[0];
                                    const cleanPayload = Array.isArray(payload)
                                        ? payload.map(({ tenant_id, ...rest }) => rest)
                                        : (() => { const { tenant_id, ...rest } = payload; return rest; })();
                                    rebuilt = rebuilt.insert(cleanPayload);
                                    continue;
                                }
                                if (action.prop === 'update') {
                                    const { tenant_id, ...cleanPayload } = action.args[0];
                                    rebuilt = rebuilt.update(cleanPayload);
                                    continue;
                                }
                                rebuilt = rebuilt[action.prop](...action.args);
                            }
                            
                            const finalRes = await rebuilt;
                            return onFulfilled ? onFulfilled(finalRes) : finalRes;
                        }
                        return onFulfilled ? onFulfilled(res) : res;
                    }, (err: any) => {
                        return onRejected ? onRejected(err) : Promise.reject(err);
                    });
                };
            }

            const value = Reflect.get(target, prop, receiver);
            if (typeof value === 'function') {
                return function(...args: any[]) {
                    // If we already know the table lacks tenant_id, skip adding it
                    if (missingTenantIdTables.has(table)) {
                        if (prop === 'eq' && args[0] === 'tenant_id') {
                            // Return self-wrapped builder without adding to actions list
                            return wrapBuilder(target, table, actions);
                        }
                        if (prop === 'insert') {
                            const payload = args[0];
                            const cleanPayload = Array.isArray(payload)
                                ? payload.map(({ tenant_id, ...rest }) => rest)
                                : (() => { const { tenant_id, ...rest } = payload; return rest; })();
                            args[0] = cleanPayload;
                        }
                        if (prop === 'update') {
                            const { tenant_id, ...cleanPayload } = args[0];
                            args[0] = cleanPayload;
                        }
                    }

                    const nextBuilder = value.apply(target, args);
                    const newActions = [...actions, { prop, args }];
                    return wrapBuilder(nextBuilder, table, newActions);
                };
            }
            return value;
        }
    });
}

// Wrap the client.from method
const originalFrom = baseClient.from.bind(baseClient);
const proxiedFrom = function(table: string) {
    const builder = originalFrom(table);
    return wrapBuilder(builder, table, []);
};

export const supabaseAdmin = new Proxy(baseClient, {
    get(target, prop, receiver) {
        if (prop === 'from') {
            return proxiedFrom;
        }
        return Reflect.get(target, prop, receiver);
    }
});

