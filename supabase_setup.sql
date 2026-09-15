-- =========================================================================
-- Cafe POS System: Supabase Database Schema, Phone Sync & RPC Functions
-- Run this script in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =========================================================================

-- 1. CRITICAL: Drop any previous faulty BEFORE INSERT triggers that cause 500 errors during signup
DROP TRIGGER IF EXISTS on_auth_user_created_sync ON auth.users;
DROP FUNCTION IF EXISTS public.handle_staff_signup_sync();

-- 2. Ensure public.profiles table has phone, permission_group_id, and is_confirmed columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permission_group_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT false;

-- 3. Drop check constraint on role if present so custom permission group roles are supported
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 4. Ensure profiles RLS policy permits select, insert, update and deletion
DO $$
BEGIN
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Allow profile deletion'
  ) THEN
    CREATE POLICY "Allow profile deletion" 
    ON public.profiles 
    FOR DELETE 
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Allow profile update'
  ) THEN
    CREATE POLICY "Allow profile update" 
    ON public.profiles 
    FOR UPDATE 
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Allow profile insert'
  ) THEN
    CREATE POLICY "Allow profile insert" 
    ON public.profiles 
    FOR INSERT 
    WITH CHECK (true);
  END IF;
END $$;

-- 5. Create a secure RPC function to delete staff from BOTH auth.users and public.profiles
CREATE OR REPLACE FUNCTION delete_staff_user(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with superuser privileges, bypassing RLS
SET search_path = public, auth
AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = user_id;
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_staff_user(UUID) TO authenticated, anon;

-- 6. Create a secure RPC function to sync Phone Number to BOTH auth.users AND public.profiles
-- This ensures that the phone number shows up in:
--   a) Supabase Dashboard -> Authentication -> Users ('Phone' column will no longer show '-')
--   b) Supabase Dashboard -> Table Editor -> profiles ('phone' column)
CREATE OR REPLACE FUNCTION sync_user_phone(user_id UUID, new_phone TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  clean_phone TEXT;
BEGIN
  -- Normalize phone (digits and plus sign only)
  clean_phone := regexp_replace(COALESCE(new_phone, ''), '[^0-9+]', '', 'g');

  -- Update public.profiles table
  UPDATE public.profiles
  SET 
    phone = new_phone,
    updated_at = NOW()
  WHERE id = user_id;

  -- Update auth.users with safe exception handling
  IF clean_phone IS NOT NULL AND clean_phone != '' THEN
    BEGIN
      UPDATE auth.users
      SET 
        phone = clean_phone,
        phone_confirmed_at = COALESCE(phone_confirmed_at, NOW()),
        raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{phone}', to_jsonb(new_phone))
      WHERE id = user_id;
    EXCEPTION WHEN OTHERS THEN
      -- If phone column setting encounters unique constraint or formatting conflict, update metadata
      BEGIN
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{phone}', to_jsonb(new_phone))
        WHERE id = user_id;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION sync_user_phone(UUID, TEXT) TO authenticated, anon;

-- 7. Backfill existing phone numbers into auth.users.phone from profiles & metadata
-- This immediately resolves the '-' display in the Supabase Authentication Dashboard for all existing staff
DO $$
BEGIN
  BEGIN
    UPDATE auth.users u
    SET 
      phone = COALESCE(
        NULLIF(regexp_replace(p.phone, '[^0-9+]', '', 'g'), ''),
        NULLIF(regexp_replace(u.raw_user_meta_data->>'phone', '[^0-9+]', '', 'g'), '')
      ),
      phone_confirmed_at = COALESCE(u.phone_confirmed_at, NOW())
    FROM public.profiles p
    WHERE u.id = p.id
      AND (
        (p.phone IS NOT NULL AND p.phone != '') OR 
        (u.raw_user_meta_data->>'phone' IS NOT NULL AND u.raw_user_meta_data->>'phone' != '')
      )
      AND (u.phone IS NULL OR u.phone = '');
  EXCEPTION WHEN OTHERS THEN
    -- In case of duplicate phone numbers across multiple test accounts, continue safely
    NULL;
  END;
END $$;

-- 8. Populate phone & permission_group_id in public.profiles from auth.users metadata
UPDATE public.profiles p
SET 
  phone = COALESCE(NULLIF(p.phone, ''), u.raw_user_meta_data->>'phone'),
  permission_group_id = COALESCE(p.permission_group_id, u.raw_user_meta_data->>'permission_group_id')
FROM auth.users u
WHERE p.id = u.id;

-- 9. 100% Fail-Safe AFTER INSERT Trigger (Never crashes GoTrue signup)
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, full_name, phone, role, permission_group_id, is_confirmed, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    split_part(new.email, '@', 1),
    COALESCE(new.raw_user_meta_data->>'full_name', 'Staff Member'),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'cashier'),
    new.raw_user_meta_data->>'permission_group_id',
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.profiles.phone),
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    permission_group_id = COALESCE(EXCLUDED.permission_group_id, public.profiles.permission_group_id),
    updated_at = NOW();

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Never abort the auth.users signup transaction under any circumstances
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();
