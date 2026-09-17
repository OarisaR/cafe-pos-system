-- =========================================================================
-- FIX: Permission Group বদলালে role ডেটাবেজে আপডেট হচ্ছিল না
--
-- আসল সমস্যা কোথায় ছিল:
--   role আসলে দুই জায়গায় থাকে —
--     ১) public.profiles.role                  ← এটা ঠিকঠাক বদলাচ্ছিল ✅
--     ২) auth.users.raw_user_meta_data->>'role' ← এটা আটকে ছিল ❌
--
--   ২ নম্বরটা শুধু signUp() এর সময় একবার লেখা হয়, তাই owner যে role দিয়ে
--   অ্যাকাউন্ট বানিয়েছিল সেটাই চিরকাল রয়ে যেত। এটা আপডেট করতে হলে
--   auth schema তে লেখার অধিকার লাগে, যা ব্রাউজার থেকে সম্ভব নয় —
--   তাই একটা SECURITY DEFINER ফাংশন দরকার।
--
--   set_user_role() ফাংশনটা আপনার ডেটাবেজে নেই, তাই অ্যাপ ওটা ডাকলে
--   চুপচাপ ব্যর্থ হচ্ছিল।
--
-- চালানোর নিয়ম:
--   Supabase Dashboard → SQL Editor → New Query → paste → Run
--   (পুরো supabase_setup.sql চালালেও এটা এর ভিতরেই আছে)
-- =========================================================================


-- =========================================================================
-- 1. অনুপস্থিত ফাংশনটা তৈরি করা
--
--    ⚠️ এটা ইচ্ছাকৃতভাবে permission_group_id কে হাত দেয় না।
--    Group টাই মূল নিয়ন্ত্রক — অ্যাপ আগে group লেখে, তারপর এই ফাংশন
--    শুধু role আর auth metadata মিলিয়ে দেয়। এখানে group আবার লিখলে
--    owner এর বেছে নেওয়া কাস্টম group মুছে যেত।
-- =========================================================================
CREATE OR REPLACE FUNCTION public.set_user_role(user_id UUID, new_role TEXT)
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
  WHERE id = user_id;

  -- এই লাইনটাই এতদিন চলছিল না
  UPDATE auth.users
  SET raw_user_meta_data =
        jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', to_jsonb(mapped))
  WHERE id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_role(UUID, TEXT) TO authenticated, anon;


-- =========================================================================
-- 2. এতদিনের জমে থাকা পুরনো metadata একবারে ঠিক করে দেওয়া
--    profiles.role ই সত্য — auth.users কে সেটার সাথে মিলিয়ে দেওয়া হচ্ছে
-- =========================================================================
UPDATE auth.users u
SET raw_user_meta_data =
      jsonb_set(COALESCE(u.raw_user_meta_data, '{}'::jsonb), '{role}', to_jsonb(p.role))
FROM public.profiles p
WHERE u.id = p.id
  AND COALESCE(u.raw_user_meta_data->>'role', '') IS DISTINCT FROM p.role;


-- =========================================================================
-- 3. updated_at স্বয়ংক্রিয় করার trigger (না থাকলে বসবে)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_touch_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- =========================================================================
-- 4. staff_directory view — দুই জায়গার role পাশাপাশি দেখার জন্য
-- =========================================================================
DROP VIEW IF EXISTS public.staff_directory;

CREATE VIEW public.staff_directory AS
SELECT
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.permission_group_id,                        -- owner যে group বসিয়েছে
  p.role                      AS profile_role,  -- profiles টেবিলের role
  u.raw_user_meta_data->>'role' AS auth_role,   -- auth.users metadata এর role
  (p.role = u.raw_user_meta_data->>'role') AS role_in_sync,  -- দুটো মিলছে কিনা
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
-- 5. যাচাই — role_in_sync কলামে সবগুলো true হওয়া উচিত
-- =========================================================================
SELECT full_name, email, permission_group_id, profile_role, auth_role, role_in_sync, updated_at
FROM public.staff_directory;
