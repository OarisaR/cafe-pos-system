-- =========================================================================
-- Cafe POS System — Supabase Schema, Roles, Timestamps & RPC Functions
--
-- চালানোর নিয়ম:
--   Supabase Dashboard → SQL Editor → New Query → পুরো ফাইলটা paste → Run
--
-- এই স্ক্রিপ্ট চালানোর পর যা ঠিক হবে:
--   ১) public.profiles টেবিলে created_at / updated_at / last_login_at টাইমস্ট্যাম্প
--   ২) প্রতিটি user এর role (owner / manager / cashier / staff) টেবিলে দেখা যাবে
--   ৩) পুরনো 'admin' role গুলো 'owner' এ রূপান্তর হবে
--   ৪) নতুন signup হলেই স্বয়ংক্রিয়ভাবে profile row তৈরি হবে
--   ৫) staff_directory view — auth.users + profiles একসাথে এক জায়গায়
--
-- স্ক্রিপ্টটা idempotent: বারবার চালালেও কোনো ক্ষতি নেই।
-- =========================================================================

-- gen_random_uuid() ও crypt() এর জন্য দরকার
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- =========================================================================
-- 1. পুরনো ভাঙা trigger গুলো সরিয়ে ফেলা (signup এ 500 error এর কারণ ছিল)
-- =========================================================================
DROP TRIGGER IF EXISTS on_auth_user_created_sync ON auth.users;
DROP FUNCTION IF EXISTS public.handle_staff_signup_sync();


-- =========================================================================
-- 2. profiles টেবিল — না থাকলে তৈরি হবে, থাকলে অক্ষত থাকবে
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'cashier',
  permission_group_id TEXT,
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);


-- =========================================================================
-- 3. আগে থেকে টেবিল থাকলে যে কলাম গুলো হয়তো নেই — সেগুলো যোগ করা
--    (এখানেই আপনার "timestamp নেই" সমস্যাটার সমাধান)
-- =========================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email               TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username            TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name           TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone               TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role                TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permission_group_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_confirmed        BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at          TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at       TIMESTAMPTZ;

-- default গুলো নিশ্চিত করা (পুরনো কলাম থাকলে তাতে default নাও থাকতে পারে)
ALTER TABLE public.profiles ALTER COLUMN created_at   SET DEFAULT NOW();
ALTER TABLE public.profiles ALTER COLUMN updated_at   SET DEFAULT NOW();
ALTER TABLE public.profiles ALTER COLUMN is_confirmed SET DEFAULT false;
ALTER TABLE public.profiles ALTER COLUMN role         SET DEFAULT 'cashier';


-- =========================================================================
-- 4. ফাঁকা টাইমস্ট্যাম্প গুলো auth.users থেকে ভরে দেওয়া
--    পুরনো row গুলোর created_at NULL থাকলে আসল signup সময় বসবে
-- =========================================================================
UPDATE public.profiles p
SET created_at = COALESCE(p.created_at, u.created_at, NOW())
FROM auth.users u
WHERE p.id = u.id AND p.created_at IS NULL;

UPDATE public.profiles
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

-- auth.users.last_sign_in_at থেকে last_login_at ভরা
UPDATE public.profiles p
SET last_login_at = u.last_sign_in_at
FROM auth.users u
WHERE p.id = u.id AND p.last_login_at IS NULL AND u.last_sign_in_at IS NOT NULL;

-- এখন আর NULL নেই, তাই NOT NULL করে দেওয়া নিরাপদ
ALTER TABLE public.profiles ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN updated_at SET NOT NULL;


-- =========================================================================
-- 5. ROLE ঠিক করা — এটাই আপনার "role database এ দেখা যায় না" সমস্যার সমাধান
--
--    অ্যাপ এখন হুবহু এই চারটা মান লেখে: owner / manager / cashier / staff
--    পুরনো 'admin', 'super_admin' ইত্যাদি এখানে রূপান্তর করা হচ্ছে।
-- =========================================================================

-- পুরনো check constraint সরানো, নাহলে নতুন মান ঢুকবে না
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- ৫ক. profiles টেবিলের পুরনো role গুলো normalize
UPDATE public.profiles
SET role = CASE LOWER(COALESCE(TRIM(role), ''))
  WHEN 'admin'        THEN 'owner'
  WHEN 'super_admin'  THEN 'owner'
  WHEN 'superadmin'   THEN 'owner'
  WHEN 'owner'        THEN 'owner'
  WHEN 'manager'      THEN 'manager'
  WHEN 'shift_manager' THEN 'manager'
  WHEN 'staff'        THEN 'staff'
  WHEN 'kitchen'      THEN 'staff'
  ELSE 'cashier'
END;

-- ৫খ. (ইচ্ছাকৃতভাবে বাদ) আগে এখানে auth metadata এর role দিয়ে profiles.role
--      overwrite করা হতো। কিন্তু profiles ই সত্যের উৎস — metadata পুরনো হতে পারে,
--      তাই ফাইলটা আবার চালালে owner এর বেছে নেওয়া role মুছে যেত। এখন আর করা হয় না।

-- ৫গ. এখন থেকে শুধু বৈধ চারটা role ই ঢুকতে পারবে
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'manager', 'cashier', 'staff'));

ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;

-- ৫ঘ. role ↔ permission_group_id মিলিয়ে দেওয়া (অ্যাপের UI এর সাথে সঙ্গতি)
UPDATE public.profiles
SET permission_group_id = CASE role
  WHEN 'owner'   THEN 'grp_super_admin'
  WHEN 'manager' THEN 'grp_manager'
  WHEN 'cashier' THEN 'grp_cashier'
  ELSE 'grp_staff'
END
WHERE permission_group_id IS NULL OR permission_group_id = '';

-- ৫ঙ. খালি email / username / full_name গুলো auth.users থেকে ভরা
UPDATE public.profiles p
SET
  email     = COALESCE(NULLIF(p.email, ''), u.email),
  username  = COALESCE(NULLIF(p.username, ''), split_part(u.email, '@', 1)),
  full_name = COALESCE(NULLIF(p.full_name, ''), u.raw_user_meta_data->>'full_name', 'Staff Member'),
  phone     = COALESCE(NULLIF(p.phone, ''), u.raw_user_meta_data->>'phone', u.phone)
FROM auth.users u
WHERE p.id = u.id;

-- ৫চ. যাদের auth.users এ আছে কিন্তু profiles এ নেই — তাদের row বানিয়ে দেওয়া
INSERT INTO public.profiles (id, email, username, full_name, phone, role, permission_group_id, is_confirmed, created_at, updated_at, last_login_at)
SELECT
  u.id,
  u.email,
  split_part(u.email, '@', 1),
  COALESCE(u.raw_user_meta_data->>'full_name', 'Staff Member'),
  COALESCE(u.raw_user_meta_data->>'phone', u.phone),
  CASE LOWER(COALESCE(u.raw_user_meta_data->>'role', 'cashier'))
    WHEN 'admin'       THEN 'owner'
    WHEN 'super_admin' THEN 'owner'
    WHEN 'owner'       THEN 'owner'
    WHEN 'manager'     THEN 'manager'
    WHEN 'staff'       THEN 'staff'
    ELSE 'cashier'
  END,
  COALESCE(u.raw_user_meta_data->>'permission_group_id', 'grp_cashier'),
  (u.email_confirmed_at IS NOT NULL),
  COALESCE(u.created_at, NOW()),
  NOW(),
  u.last_sign_in_at
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- ৫ছ. উল্টো দিকের sync: profiles ই সত্য। auth.users metadata শুধু signUp এর
--     সময় লেখা হয়, তাই role ও permission_group_id দুটোই এখানে মিলিয়ে দেওয়া হয়।
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
-- 6. updated_at স্বয়ংক্রিয়ভাবে আপডেট হওয়ার trigger
--    এখন থেকে যেকোনো UPDATE এ updated_at নিজে থেকেই বদলাবে
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
-- 7. নতুন signup হলে profiles এ row তৈরির fail-safe trigger
--    EXCEPTION হ্যান্ডলার আছে — তাই কখনোই signup ভেঙে দেবে না
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mapped_role TEXT;
BEGIN
  mapped_role := CASE LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'cashier'))
    WHEN 'admin'       THEN 'owner'
    WHEN 'super_admin' THEN 'owner'
    WHEN 'owner'       THEN 'owner'
    WHEN 'manager'     THEN 'manager'
    WHEN 'staff'       THEN 'staff'
    WHEN 'cashier'     THEN 'cashier'
    ELSE 'cashier'
  END;

  INSERT INTO public.profiles (
    id, email, username, full_name, phone,
    role, permission_group_id, is_confirmed, created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    split_part(NEW.email, '@', 1),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Staff Member'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    mapped_role,
    COALESCE(
      NEW.raw_user_meta_data->>'permission_group_id',
      CASE mapped_role
        WHEN 'owner'   THEN 'grp_super_admin'
        WHEN 'manager' THEN 'grp_manager'
        WHEN 'cashier' THEN 'grp_cashier'
        ELSE 'grp_staff'
      END
    ),
    (NEW.email_confirmed_at IS NOT NULL),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email               = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name           = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    phone               = COALESCE(NULLIF(EXCLUDED.phone, ''), public.profiles.phone),
    role                = EXCLUDED.role,
    permission_group_id = COALESCE(EXCLUDED.permission_group_id, public.profiles.permission_group_id),
    updated_at          = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- কোনো অবস্থাতেই auth.users এর signup transaction বাতিল করা যাবে না
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- ইমেইল confirm হলে profiles.is_confirmed নিজে থেকেই true হবে
CREATE OR REPLACE FUNCTION public.handle_user_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET is_confirmed  = (NEW.email_confirmed_at IS NOT NULL),
      last_login_at = COALESCE(NEW.last_sign_in_at, last_login_at),
      updated_at    = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at, last_sign_in_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_confirmed();


-- =========================================================================
-- 8. Row Level Security
--    NOTE: এগুলো ক্লাস প্রজেক্টের জন্য উদার (permissive) নীতি — সব
--    logged-in user সব profile পড়তে পারে। Production এ গেলে
--    "Allow profile update" কে (auth.uid() = id) দিয়ে সীমিত করতে হবে।
-- =========================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow profile read"     ON public.profiles;
DROP POLICY IF EXISTS "Allow profile insert"   ON public.profiles;
DROP POLICY IF EXISTS "Allow profile update"   ON public.profiles;
DROP POLICY IF EXISTS "Allow profile deletion" ON public.profiles;

CREATE POLICY "Allow profile read"     ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow profile insert"   ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow profile update"   ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Allow profile deletion" ON public.profiles FOR DELETE USING (true);


-- =========================================================================
-- 9. RPC: staff account মুছে ফেলা (auth.users + profiles দুটো থেকেই)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.delete_staff_user(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = user_id;
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_staff_user(UUID) TO authenticated, anon;


-- =========================================================================
-- 10. RPC: phone নম্বর auth.users ও profiles দুই জায়গায় sync করা
--     ফলে Supabase Dashboard → Authentication → Users এ Phone কলামে
--     আর '-' দেখাবে না।
-- =========================================================================
CREATE OR REPLACE FUNCTION public.sync_user_phone(user_id UUID, new_phone TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  clean_phone TEXT;
BEGIN
  clean_phone := regexp_replace(COALESCE(new_phone, ''), '[^0-9+]', '', 'g');

  UPDATE public.profiles
  SET phone = new_phone, updated_at = NOW()
  WHERE id = user_id;

  IF clean_phone <> '' THEN
    BEGIN
      UPDATE auth.users
      SET phone              = clean_phone,
          phone_confirmed_at = COALESCE(phone_confirmed_at, NOW()),
          raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{phone}', to_jsonb(new_phone))
      WHERE id = user_id;
    EXCEPTION WHEN OTHERS THEN
      -- একই নম্বর দুই অ্যাকাউন্টে থাকলে unique constraint ভাঙবে — তখন শুধু metadata
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

GRANT EXECUTE ON FUNCTION public.sync_user_phone(UUID, TEXT) TO authenticated, anon;


-- =========================================================================
-- 11. RPC: role সরাসরি বদলানো (owner এর Staff Management থেকে)
--
--     ⚠️ এটা ইচ্ছাকৃতভাবে permission_group_id কে হাত দেয় না।
--     Group টাই হলো মূল নিয়ন্ত্রক — অ্যাপ আগে group লেখে, তারপর এই
--     ফাংশনটা শুধু role আর auth metadata মিলিয়ে দেয়। এখানে group
--     আবার লিখলে owner এর বেছে নেওয়া কাস্টম group মুছে যেত।
--     ব্যতিক্রম: group একেবারেই ফাঁকা থাকলে একটা default বসিয়ে দেওয়া হয়।
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
-- 11b. RPC: নতুন ফাংশন: group + role একসাথে, দুই জায়গায়
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
-- 12. staff_directory VIEW — role ও group দুই জায়গায় মিলছে কিনা
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
-- 13. খোঁজার গতি বাড়াতে index
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role       ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_email      ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at DESC);


-- =========================================================================
-- 14. ★ ডেমো অ্যাকাউন্ট তৈরি (প্রথমবার login করার জন্য অন্তত একটা owner লাগবে)
--
--    seed_login_user() ফাংশনটা auth.users + auth.identities + profiles
--    তিন জায়গাতেই ঠিকভাবে user বসায়, তাই সরাসরি password দিয়ে login করা যায়।
--
--    ⚠️ এগুলো demo password — জমা দেওয়ার আগে অবশ্যই বদলে নেবেন।
-- =========================================================================
CREATE OR REPLACE FUNCTION public.seed_login_user(
  p_email    TEXT,
  p_password TEXT,
  p_name     TEXT,
  p_role     TEXT,
  p_phone    TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  uid        UUID;
  grp        TEXT;
  hashed_pwd TEXT;
BEGIN
  grp := CASE p_role
    WHEN 'owner'   THEN 'grp_super_admin'
    WHEN 'manager' THEN 'grp_manager'
    WHEN 'cashier' THEN 'grp_cashier'
    ELSE 'grp_staff'
  END;

  hashed_pwd := crypt(p_password, gen_salt('bf'));

  SELECT id INTO uid FROM auth.users WHERE email = p_email;

  IF uid IS NOT NULL THEN
    -- আগে থেকেই আছে → শুধু password, role আর confirm status রিফ্রেশ করা
    UPDATE auth.users
    SET encrypted_password = hashed_pwd,
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_user_meta_data = jsonb_build_object(
          'full_name', p_name, 'role', p_role,
          'permission_group_id', grp, 'phone', p_phone
        ),
        updated_at = NOW()
    WHERE id = uid;
  ELSE
    uid := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      uid, 'authenticated', 'authenticated', p_email, hashed_pwd,
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'full_name', p_name, 'role', p_role,
        'permission_group_id', grp, 'phone', p_phone
      ),
      '', '', '', ''
    );

    -- password login কাজ করতে হলে identities row অবশ্যই লাগবে
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      uid::TEXT, uid,
      jsonb_build_object('sub', uid::TEXT, 'email', p_email, 'email_verified', true),
      'email', NOW(), NOW(), NOW()
    );
  END IF;

  -- profiles এ মিলিয়ে দেওয়া
  INSERT INTO public.profiles (
    id, email, username, full_name, phone,
    role, permission_group_id, is_confirmed, created_at, updated_at
  ) VALUES (
    uid, p_email, split_part(p_email, '@', 1), p_name, p_phone,
    p_role, grp, true, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name           = EXCLUDED.full_name,
    role                = EXCLUDED.role,
    permission_group_id = EXCLUDED.permission_group_id,
    phone               = EXCLUDED.phone,
    is_confirmed        = true,
    updated_at          = NOW();

  RETURN uid;
END;
$$;

-- চারটা role এর জন্য চারটা ডেমো অ্যাকাউন্ট
SELECT public.seed_login_user('owner@cafepos.com',   'Owner@12345',   'Cafe Owner',      'owner',   '+8801711000111');
SELECT public.seed_login_user('manager@cafepos.com', 'Manager@12345', 'Shift Manager',   'manager', '+8801711000222');
SELECT public.seed_login_user('cashier@cafepos.com', 'Cashier@12345', 'Counter Cashier', 'cashier', '+8801711000333');
SELECT public.seed_login_user('staff@cafepos.com',   'Staff@12345',   'Floor Staff',     'staff',   '+8801711000444');

-- seed ফাংশনটা আর দরকার নেই — নিরাপত্তার জন্য মুছে ফেলা হচ্ছে।
-- আবার ডেমো অ্যাকাউন্ট বানাতে চাইলে এই ফাইলটা আরেকবার চালালেই হবে।
DROP FUNCTION IF EXISTS public.seed_login_user(TEXT, TEXT, TEXT, TEXT, TEXT);


-- =========================================================================
-- 15. যাচাই — সব ঠিকঠাক হলো কিনা দেখতে এটা চালান
-- =========================================================================
SELECT full_name, email, profile_group, auth_group, profile_role, auth_role, in_sync, created_at, updated_at
FROM public.staff_directory;
