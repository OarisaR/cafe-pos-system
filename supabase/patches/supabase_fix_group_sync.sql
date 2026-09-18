-- =========================================================================
-- ⛔ আর চালাবেন না — শুধু ইতিহাসের রেকর্ড।
-- এই ফাইলের function গুলোতে owner যাচাই নেই আর anon কে অনুমতি দেয়।
-- আবার চালালে security hole ফিরে আসবে। নতুন সংস্করণ:
--   supabase/patches/supabase_fix_security.sql
-- =========================================================================

-- =========================================================================
-- FIX: Permission Group বদলালে auth.users metadata তে group আপডেট হচ্ছিল না
--
-- আগের set_user_role() শুধু metadata এর "role" key লিখত।
-- "permission_group_id" key টা signUp এর সময়ের মানেই আটকে থাকত।
--
-- নতুন set_user_group() একসাথে দুটোই লেখে — profiles টেবিলে এবং
-- auth.users metadata তে। অ্যাপ এখন থেকে এই ফাংশনটাই ডাকবে।
--
-- চালানোর নিয়ম (শুধু একবার):
--   Supabase Dashboard → SQL Editor → New Query → paste → Run
--
-- এই ফাইলে কোনো DROP TABLE / DELETE / TRUNCATE নেই।
-- =========================================================================


-- =========================================================================
-- 1. নতুন ফাংশন: group + role একসাথে, দুই জায়গায়
-- =========================================================================
CREATE OR REPLACE FUNCTION public.set_user_group(
  user_id      UUID,
  new_group_id TEXT,
  new_role     TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  mapped TEXT;
BEGIN
  mapped := CASE LOWER(COALESCE(new_role, ''))
    WHEN 'admin'       THEN 'owner'
    WHEN 'super_admin' THEN 'owner'
    WHEN 'owner'       THEN 'owner'
    WHEN 'manager'     THEN 'manager'
    WHEN 'staff'       THEN 'staff'
    ELSE 'cashier'
  END;

  UPDATE public.profiles
  SET role                = mapped,
      permission_group_id = new_group_id,
      updated_at          = NOW()
  WHERE id = user_id;

  -- role আর permission_group_id — দুটো key ই একসাথে লেখা হয়
  UPDATE auth.users
  SET raw_user_meta_data =
        COALESCE(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('role', mapped, 'permission_group_id', new_group_id)
  WHERE id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_group(UUID, TEXT, TEXT) TO authenticated, anon;


-- =========================================================================
-- 2. পুরনো set_user_role() ও এখন group key মিলিয়ে দেবে
--    (কোনো পুরনো কোড এটা ডাকলেও যেন metadata পিছিয়ে না থাকে)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.set_user_role(user_id UUID, new_role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  mapped TEXT;
  grp    TEXT;
BEGIN
  mapped := CASE LOWER(COALESCE(new_role, ''))
    WHEN 'admin'       THEN 'owner'
    WHEN 'super_admin' THEN 'owner'
    WHEN 'owner'       THEN 'owner'
    WHEN 'manager'     THEN 'manager'
    WHEN 'staff'       THEN 'staff'
    ELSE 'cashier'
  END;

  UPDATE public.profiles
  SET role = mapped,
      permission_group_id = COALESCE(
        NULLIF(permission_group_id, ''),
        CASE mapped
          WHEN 'owner'   THEN 'grp_super_admin'
          WHEN 'manager' THEN 'grp_manager'
          WHEN 'cashier' THEN 'grp_cashier'
          ELSE 'grp_staff'
        END
      ),
      updated_at = NOW()
  WHERE id = user_id
  RETURNING permission_group_id INTO grp;

  UPDATE auth.users
  SET raw_user_meta_data =
        COALESCE(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('role', mapped, 'permission_group_id', grp)
  WHERE id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_role(UUID, TEXT) TO authenticated, anon;


-- =========================================================================
-- 3. পুরনো জমে থাকা metadata একবারে ঠিক করা
--    profiles টেবিলই সত্য — role ও group দুটোই সেখান থেকে কপি হয়
-- =========================================================================
UPDATE auth.users u
SET raw_user_meta_data =
      COALESCE(u.raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', p.role, 'permission_group_id', p.permission_group_id)
FROM public.profiles p
WHERE u.id = p.id
  AND (
    COALESCE(u.raw_user_meta_data->>'role', '')                IS DISTINCT FROM COALESCE(p.role, '')
    OR COALESCE(u.raw_user_meta_data->>'permission_group_id', '') IS DISTINCT FROM COALESCE(p.permission_group_id, '')
  );


-- =========================================================================
-- 4. staff_directory view — group ও মিলছে কিনা দেখার কলাম যোগ
-- =========================================================================
DROP VIEW IF EXISTS public.staff_directory;

CREATE VIEW public.staff_directory AS
SELECT
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.permission_group_id                         AS profile_group,
  u.raw_user_meta_data->>'permission_group_id'  AS auth_group,
  p.role                                        AS profile_role,
  u.raw_user_meta_data->>'role'                 AS auth_role,
  (
    COALESCE(p.role, '') = COALESCE(u.raw_user_meta_data->>'role', '')
    AND COALESCE(p.permission_group_id, '') = COALESCE(u.raw_user_meta_data->>'permission_group_id', '')
  ) AS in_sync,
  p.is_confirmed,
  u.last_sign_in_at,
  p.created_at,
  p.updated_at,
  p.last_login_at
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
ORDER BY p.created_at DESC;

GRANT SELECT ON public.staff_directory TO authenticated, anon;


-- =========================================================================
-- 5. যাচাই — in_sync কলামে সবগুলো true হওয়া উচিত
-- =========================================================================
SELECT full_name, profile_group, auth_group, profile_role, auth_role, in_sync
FROM public.staff_directory;
