-- =========================================================================
-- SECURITY FIX — Supabase Security Advisor এর CRITICAL সমস্যা ও তার চেয়েও
-- গুরুতর খোলা দরজা বন্ধ করা
--
-- কী খোলা ছিল (anon key দিয়ে, লগইন ছাড়াই — key টা ওয়েবসাইটের JS এ থাকে):
--   ১) staff_directory view → সব staff এর email, phone, role, last login পড়া যেত
--      (Advisor: "Exposed Auth Users", "Security Definer View" — CRITICAL)
--   ২) profiles টেবিল → যে কেউ পড়তে, বদলাতে, মুছতে পারত (নিজেকে owner বানানো সহ)
--   ৩) delete_staff_user() → যে কেউ যেকোনো account মুছে ফেলতে পারত
--   ৪) set_user_role() / set_user_group() → যে কেউ যেকোনো user কে owner বানাতে পারত
--   ৫) sync_user_phone() → যে কেউ যেকোনো user এর phone বদলাতে পারত
--
-- এই ফাইল চালানোর পর:
--   • লগইন ছাড়া কেউ profiles / staff_directory / এই function গুলো ছুঁতে পারবে না
--   • লগইন করা user শুধু নিজের profile দেখবে ও বদলাবে (role/group নয়)
--   • owner / manager সবার profile দেখবে; শুধু owner বদলাবে, মুছবে, role দেবে
--   • অ্যাপের কাজ আগের মতোই চলবে (owner এর Staff Management সহ)
--
-- চালানোর নিয়ম: Supabase → SQL Editor → New query → পুরোটা paste → Run
-- আবার চালালেও ক্ষতি নেই। কোনো DROP TABLE / DELETE / TRUNCATE নেই।
-- =========================================================================


-- =========================================================================
-- ১. Helper: লগইন করা user কি owner (বা owner/manager)?
--    SECURITY DEFINER — profiles এর RLS policy এর ভিতর থেকে ডাকলেও
--    নিজের policy তে আটকে (infinite recursion) যায় না
-- =========================================================================
CREATE OR REPLACE FUNCTION public.is_app_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner');
$$;

CREATE OR REPLACE FUNCTION public.is_app_owner_or_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'));
$$;

REVOKE ALL ON FUNCTION public.is_app_owner()            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_app_owner_or_manager() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_app_owner()            TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_app_owner_or_manager() TO authenticated;


-- =========================================================================
-- ২. staff_directory view — CRITICAL ২টা
--    • security_invoker = true → পড়নেওয়ালার অধিকারে চলে (Security Definer View)
--    • anon / authenticated থেকে অনুমতি কেড়ে নেওয়া (Exposed Auth Users)
--    Supabase Dashboard এর Table Editor / SQL Editor এ আগের মতোই দেখা যাবে।
--    অ্যাপ এই view ব্যবহার করে না।
-- =========================================================================
DO $$
BEGIN
  IF to_regclass('public.staff_directory') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.staff_directory SET (security_invoker = true)';
    EXECUTE 'REVOKE ALL ON public.staff_directory FROM PUBLIC, anon, authenticated';
  END IF;
END $$;


-- =========================================================================
-- ৩. profiles টেবিলের RLS — সব পুরনো policy সরিয়ে নতুন করে
-- =========================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

-- anon কোনো policy পায় না → কিছুই পড়তে/লিখতে পারবে না
REVOKE ALL ON public.profiles FROM anon;

-- দেখা: নিজের profile, অথবা owner/manager হলে সবার
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_app_owner_or_manager());

-- তৈরি: নিজের জন্য শুধু cashier হিসেবে (self sign-up), অথবা owner যেকোনো
CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK ((id = auth.uid() AND role = 'cashier') OR public.is_app_owner());

-- বদলানো: নিজের profile, অথবা owner সবার।
-- নিজের role/group বদলানো আটকায় নিচের trigger (policy তে পুরনো মান দেখা যায় না)
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_app_owner())
  WITH CHECK (id = auth.uid() OR public.is_app_owner());

-- মোছা: শুধু owner, নিজেকে নয়
CREATE POLICY profiles_delete ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_app_owner() AND id <> auth.uid());


-- owner ছাড়া কেউ role / permission_group_id বদলাতে পারবে না — নিজেরটাও না।
-- auth.uid() NULL মানে ডেটাবেজ নিজে (signup trigger, SQL Editor) — তখন অনুমতি।
CREATE OR REPLACE FUNCTION public.profiles_guard_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND (NEW.role IS DISTINCT FROM OLD.role
          OR NEW.permission_group_id IS DISTINCT FROM OLD.permission_group_id)
     AND NOT public.is_app_owner()
  THEN
    RAISE EXCEPTION 'Only the owner can change roles or permission groups.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard_role_change ON public.profiles;
CREATE TRIGGER trg_profiles_guard_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_role_change();


-- =========================================================================
-- ৪. Staff management function — ভিতরে owner যাচাই, anon এর অনুমতি বাতিল
--    (SECURITY DEFINER function RLS মানে না, তাই যাচাই ভিতরেই করতে হয়)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.delete_staff_user(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_app_owner() THEN
    RAISE EXCEPTION 'Only the owner can delete staff accounts.' USING ERRCODE = '42501';
  END IF;
  IF user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account.';
  END IF;

  DELETE FROM public.profiles WHERE id = user_id;
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_group(user_id UUID, new_group_id TEXT, new_role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  mapped TEXT;
BEGIN
  IF NOT public.is_app_owner() THEN
    RAISE EXCEPTION 'Only the owner can change permission groups.' USING ERRCODE = '42501';
  END IF;

  mapped := CASE LOWER(COALESCE(new_role, ''))
    WHEN 'admin'       THEN 'owner'
    WHEN 'super_admin' THEN 'owner'
    WHEN 'owner'       THEN 'owner'
    WHEN 'manager'     THEN 'manager'
    WHEN 'staff'       THEN 'staff'
    ELSE 'cashier'
  END;

  UPDATE public.profiles
  SET role = mapped, permission_group_id = new_group_id, updated_at = NOW()
  WHERE id = user_id;

  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('role', mapped, 'permission_group_id', new_group_id)
  WHERE id = user_id;
END;
$$;

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
  IF NOT public.is_app_owner() THEN
    RAISE EXCEPTION 'Only the owner can change roles.' USING ERRCODE = '42501';
  END IF;

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
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('role', mapped, 'permission_group_id', grp)
  WHERE id = user_id;
END;
$$;

-- phone: owner যেকোনো জনের, অন্যরা শুধু নিজের
CREATE OR REPLACE FUNCTION public.sync_user_phone(user_id UUID, new_phone TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  clean_phone TEXT;
BEGIN
  IF auth.uid() IS NULL OR (user_id <> auth.uid() AND NOT public.is_app_owner()) THEN
    RAISE EXCEPTION 'You can only change your own phone number.' USING ERRCODE = '42501';
  END IF;

  clean_phone := regexp_replace(COALESCE(new_phone, ''), '[^0-9+]', '', 'g');

  UPDATE public.profiles SET phone = new_phone, updated_at = NOW() WHERE id = user_id;

  IF clean_phone <> '' THEN
    BEGIN
      UPDATE auth.users
      SET phone              = clean_phone,
          phone_confirmed_at = COALESCE(phone_confirmed_at, NOW()),
          raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{phone}', to_jsonb(new_phone))
      WHERE id = user_id;
    EXCEPTION WHEN OTHERS THEN
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

REVOKE ALL ON FUNCTION public.delete_staff_user(UUID)            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_user_group(UUID, TEXT, TEXT)   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_user_role(UUID, TEXT)          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sync_user_phone(UUID, TEXT)        FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_staff_user(UUID)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_group(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(UUID, TEXT)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_phone(UUID, TEXT)      TO authenticated;


-- =========================================================================
-- ৫. বাকি function থেকে anon এর অনুমতি সরানো (Advisor: "Public Can Execute")
--    Postgres নতুন function এ নিজে থেকেই সবাইকে (PUBLIC) EXECUTE দেয়।
--    Trigger function এর EXECUTE অনুমতি trigger চলার জন্য লাগে না,
--    তাই এগুলো সরালে কোনো trigger বন্ধ হবে না।
-- =========================================================================
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        -- trigger functions
        'touch_updated_at', 'handle_new_user_profile', 'handle_user_confirmed',
        'profiles_guard_role_change', 'orders_before_insert', 'orders_after_insert',
        'order_items_before_write', 'bills_before_write', 'bills_after_insert',
        'orders_after_status_change',
        -- লগইন করা user এর জন্য (anon নয়)
        'app_role', 'has_role', 'restock_ingredient', 'set_menu_item_recipe'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn.sig);
    IF fn.proname IN ('app_role', 'has_role', 'restock_ingredient', 'set_menu_item_recipe') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn.sig);
    END IF;
  END LOOP;
END $$;


-- =========================================================================
-- ৬. "Function Search Path Mutable" — search_path স্থির করা
--    (কেউ অন্য schema তে একই নামের টেবিল বানিয়ে function কে ধোঁকা দিতে না পারে)
--    record_failed_login / record_successful_login আপনার টিমের আগের SQL এর;
--    শুধু search_path বসানো হচ্ছে, ভিতরের কোড বা অনুমতি বদলানো হয়নি।
-- =========================================================================
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('touch_updated_at', 'handle_new_user_profile', 'handle_user_confirmed',
                        'record_failed_login', 'record_successful_login')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, auth', fn.sig);
  END LOOP;
END $$;


-- =========================================================================
-- যাচাই — profiles এর policy গুলো
-- =========================================================================
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;
