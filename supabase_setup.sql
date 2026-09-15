-- =========================================================================
-- Cafe POS System: Permanent Staff Backend Deletion Function
-- Run this script in: Supabase Dashboard -> SQL Editor -> New Query
-- =========================================================================

-- 1. Create a secure RPC function to delete staff from BOTH auth.users and public.profiles
CREATE OR REPLACE FUNCTION delete_staff_user(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with superuser/admin privileges, bypassing RLS
SET search_path = public, auth
AS $$
BEGIN
  -- Delete from public.profiles table
  DELETE FROM public.profiles WHERE id = user_id;

  -- Delete from auth.users (removes from Supabase Authentication Dashboard completely!)
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

-- 2. Grant execute permission so frontend can call this function
GRANT EXECUTE ON FUNCTION delete_staff_user(UUID) TO authenticated, anon;

-- 3. Ensure profiles RLS policy permits deletion
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
END $$;

-- 4. Ensure profiles table has phone, permission_group_id, and is_confirmed columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permission_group_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT false;

-- 5. Drop check constraint on role if present so custom permission group roles are supported
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
