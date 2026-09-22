-- =========================================================================
-- FIX: Owner এর বানানো custom permission role staff এর ব্রাউজারে পৌঁছাত না
--
-- সমস্যা কী ছিল:
--   custom permission group গুলো শুধু localStorage এ সেভ হতো — অর্থাৎ
--   যে ব্রাউজারে owner role টা বানিয়েছেন, শুধু সেখানেই ওটা থাকত।
--   staff নিজের ল্যাপটপে লগইন করলে অ্যাপ তার permission_group_id এর
--   সংজ্ঞাটাই খুঁজে পেত না, তাই সে base role (staff) এর UI দেখত।
--
-- সমাধান:
--   permission_groups টেবিল — role গুলো এখন সার্ভারে থাকবে, তাই যেকোনো
--   ডিভাইস থেকে লগইন করলেই owner এর সেভ করা access দেখা যাবে।
--
-- চালানোর নিয়ম (শুধু একবার):
--   Supabase Dashboard → SQL Editor → New Query → paste → Run
--
-- এই ফাইলে কোনো DROP TABLE / DELETE / TRUNCATE নেই — কোনো ডেটা মুছবে না।
-- =========================================================================


-- =========================================================================
-- 1. permission_groups টেবিল — না থাকলে তৈরি হবে, থাকলে অক্ষত থাকবে
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.permission_groups (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  -- এই group এ বসানো user এর profiles.role কী হবে (নিরাপদ default = staff)
  role        TEXT NOT NULL DEFAULT 'staff',
  color       TEXT,
  bg_color    TEXT,
  -- { "orders": { "view": true, "edit": false }, ... }
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- আগে থেকে টেবিল থাকলে যে কলাম গুলো হয়তো নেই
ALTER TABLE public.permission_groups ADD COLUMN IF NOT EXISTS name        TEXT;
ALTER TABLE public.permission_groups ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.permission_groups ADD COLUMN IF NOT EXISTS role        TEXT DEFAULT 'staff';
ALTER TABLE public.permission_groups ADD COLUMN IF NOT EXISTS color       TEXT;
ALTER TABLE public.permission_groups ADD COLUMN IF NOT EXISTS bg_color    TEXT;
ALTER TABLE public.permission_groups ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.permission_groups ADD COLUMN IF NOT EXISTS is_default  BOOLEAN DEFAULT false;
ALTER TABLE public.permission_groups ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.permission_groups ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();


-- =========================================================================
-- 2. updated_at নিজে থেকেই আপডেট হবে
--    (touch_updated_at() ফাংশনটা supabase_setup.sql এ তৈরি হয়)
-- =========================================================================
DO $$
BEGIN
  IF to_regprocedure('public.touch_updated_at()') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS permission_groups_touch ON public.permission_groups';
    EXECUTE 'CREATE TRIGGER permission_groups_touch
               BEFORE UPDATE ON public.permission_groups
               FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()';
  END IF;
END $$;


-- =========================================================================
-- 3. RLS — পড়া সবাই পারবে, লেখা শুধু owner
--
--    পড়ার অনুমতি সবার লাগে: staff লগইন করলে তাকে নিজের group এর
--    permission গুলো পড়তে হয়, নাহলে তার sidebar তৈরিই হবে না।
--    এখানে কোনো গোপন তথ্য নেই — শুধু কোন role কী দেখতে পাবে তার তালিকা।
--
--    is_app_owner() ফাংশনটা supabase_setup.sql / supabase_fix_security.sql
--    এ তৈরি হয়। না থাকলে নিচে fallback policy বসে।
-- =========================================================================
ALTER TABLE public.permission_groups ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'permission_groups'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.permission_groups', pol.policyname);
  END LOOP;
END $$;

-- anon কিছুই পাবে না
REVOKE ALL ON public.permission_groups FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permission_groups TO authenticated;

-- দেখা: লগইন করা যে কেউ
CREATE POLICY permission_groups_select ON public.permission_groups
  FOR SELECT TO authenticated
  USING (true);

DO $$
BEGIN
  IF to_regprocedure('public.is_app_owner()') IS NOT NULL THEN
    -- তৈরি / বদলানো / মোছা: শুধু owner
    EXECUTE 'CREATE POLICY permission_groups_insert ON public.permission_groups
               FOR INSERT TO authenticated
               WITH CHECK (public.is_app_owner())';

    EXECUTE 'CREATE POLICY permission_groups_update ON public.permission_groups
               FOR UPDATE TO authenticated
               USING (public.is_app_owner())
               WITH CHECK (public.is_app_owner())';

    -- ডিফল্ট চারটা system role কখনো মোছা যাবে না
    EXECUTE 'CREATE POLICY permission_groups_delete ON public.permission_groups
               FOR DELETE TO authenticated
               USING (public.is_app_owner() AND is_default = false)';
  ELSE
    RAISE NOTICE
      'is_app_owner() পাওয়া যায়নি — আগে supabase_setup.sql চালান, তারপর এই ফাইলটা আবার চালান।';

    EXECUTE 'CREATE POLICY permission_groups_write ON public.permission_groups
               FOR ALL TO authenticated
               USING (true) WITH CHECK (true)';
  END IF;
END $$;


-- =========================================================================
-- 4. চারটা ডিফল্ট system role সার্ভারে বসানো
--    ON CONFLICT DO NOTHING — আগে থেকে থাকলে কিছুই বদলাবে না
-- =========================================================================
INSERT INTO public.permission_groups (id, name, description, role, color, bg_color, is_default, permissions)
VALUES
  (
    'grp_super_admin',
    'Owner (Super Admin)',
    'Master unrestricted control over all modules, staff, financial settings, and permission groups.',
    'owner',
    '#8B9A6E',
    'rgba(139, 154, 110, 0.16)',
    true,
    '{"reports":{"view":true,"edit":true},"orders":{"view":true,"edit":true},"kitchen":{"view":true,"edit":true},"tables":{"view":true,"edit":true},"billing":{"view":true,"edit":true},"menu":{"view":true,"edit":true},"inventory":{"view":true,"edit":true},"cancellations":{"view":true,"edit":true},"staff":{"view":true,"edit":true},"permissions":{"view":true,"edit":true},"settings":{"view":true,"edit":true}}'::jsonb
  ),
  (
    'grp_manager',
    'Shift Manager',
    'Oversees daily shift operations, food costing, inventory reconciliation, and operational reporting.',
    'manager',
    '#626F48',
    'rgba(98, 111, 72, 0.16)',
    true,
    '{"reports":{"view":true,"edit":true},"orders":{"view":true,"edit":true},"kitchen":{"view":true,"edit":true},"tables":{"view":true,"edit":true},"billing":{"view":true,"edit":true},"menu":{"view":true,"edit":true},"inventory":{"view":true,"edit":true},"cancellations":{"view":true,"edit":true},"staff":{"view":false,"edit":false},"permissions":{"view":false,"edit":false},"settings":{"view":false,"edit":false}}'::jsonb
  ),
  (
    'grp_cashier',
    'Frontline Cashier',
    'Counter register terminal for taking guest orders, assigning tables, and settling guest bills.',
    'cashier',
    '#B26A00',
    'rgba(178, 106, 0, 0.16)',
    true,
    '{"reports":{"view":false,"edit":false},"orders":{"view":true,"edit":true},"kitchen":{"view":false,"edit":false},"tables":{"view":true,"edit":true},"billing":{"view":true,"edit":true},"menu":{"view":true,"edit":false},"inventory":{"view":false,"edit":false},"cancellations":{"view":true,"edit":false},"staff":{"view":false,"edit":false},"permissions":{"view":false,"edit":false},"settings":{"view":false,"edit":false}}'::jsonb
  ),
  (
    'grp_staff',
    'Floor & Kitchen Staff',
    'Floor attendance and kitchen stock bay for monitoring table status and pantry inventory.',
    'staff',
    '#3E6B89',
    'rgba(62, 107, 137, 0.16)',
    true,
    '{"reports":{"view":false,"edit":false},"orders":{"view":true,"edit":false},"kitchen":{"view":true,"edit":true},"tables":{"view":true,"edit":true},"billing":{"view":false,"edit":false},"menu":{"view":true,"edit":false},"inventory":{"view":true,"edit":true},"cancellations":{"view":false,"edit":false},"staff":{"view":false,"edit":false},"permissions":{"view":false,"edit":false},"settings":{"view":false,"edit":false}}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;


-- =========================================================================
-- 5. যাচাই — এখানে আপনার সব role দেখা যাবে
-- =========================================================================
SELECT id, name, role, is_default, permissions
FROM public.permission_groups
ORDER BY is_default DESC, created_at;
