-- ============================================================
-- AutoSphere DMS — Seed Admin User Profile
-- Run this in the Supabase SQL Editor AFTER creating the
-- admin@autosphere.com user in Authentication > Users
-- ============================================================

-- Step 1: Find the auth user ID for admin@autosphere.com
-- (You can also look this up in Authentication > Users in the dashboard)
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Look up the admin user's UUID from auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'admin@autosphere.com'
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'No auth user found with email admin@autosphere.com. Create the user first in Authentication > Users.';
        RETURN;
    END IF;

    -- Insert or update the profile
    INSERT INTO public.user_profiles (id, name, role, branch)
    VALUES (v_user_id, 'System Administrator', 'Admin', 'Kampala Main')
    ON CONFLICT (id) DO UPDATE
        SET name = 'System Administrator',
            role = 'Admin',
            branch = 'Kampala Main';

    RAISE NOTICE 'Admin profile upserted for user ID: %', v_user_id;
END $$;

-- ── Optional: View all user profiles ──────────────────────────
SELECT 
    up.id,
    up.name,
    up.role,
    up.branch,
    au.email,
    up.created_at
FROM public.user_profiles up
JOIN auth.users au ON au.id = up.id
ORDER BY up.created_at DESC;
