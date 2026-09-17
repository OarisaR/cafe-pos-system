-- =========================================================================
-- Cafe POS System — POS Schema (Menu, Inventory, Tables, Orders, Bills)
--
-- ERD + User Flow অনুযায়ী বানানো, সাথে Supabase এর জন্য দরকারি সংশোধন।
--
-- চালানোর নিয়ম:
--   1. আগে supabase_setup.sql চালানো থাকতে হবে (profiles টেবিল ওখানে)
--   2. Supabase Dashboard → SQL Editor → New Query → পুরো ফাইল paste → Run
--
-- স্ক্রিপ্টটা আবার চালালেও ক্ষতি নেই (IF NOT EXISTS / OR REPLACE)।
-- এই ফাইলে কোনো DROP TABLE / DELETE / TRUNCATE নেই।
--
-- -------------------------------------------------------------------------
-- ERD থেকে যা বদলানো হয়েছে (টিম মিটিংয়ে দেখে নিন):
--   • users টেবিল বানানো হয়নি → আগে থেকে থাকা profiles ব্যবহার হয়েছে
--     (password Supabase Auth এ থাকে, password_hash কলাম লাগে না)
--   • সব ID string → uuid
--   • order_tables বাদ → orders.table_id (takeaway হলে NULL)
--   • সব টেবিলে created_at / updated_at
--   • order_items এ unit_cost (লাভের হিসাবের জন্য)
--   • bills এ service_charge → service_charge_percent, আর হিসাবকৃত
--     amount কলাম যোগ (discount_amount, vat_amount ইত্যাদি)
--
-- সিদ্ধান্ত যা আমি ধরে নিয়েছি (দরকার হলে বদলান):
--   • বিলের হিসাব: subtotal → discount → service charge → VAT
--     VAT বসে (discount বাদ দেওয়া দাম + service charge) এর উপর
--   • অর্ডার "paid" হলে stock কমে, আর টেবিল "empty" হয় (User Flow অনুযায়ী)
--   • stock শূন্যের নিচে নামতে দেওয়া হয় — counter এ বিল আটকে না যায়;
--     low_stock_ingredients view এ ধরা পড়বে
--   • paid অর্ডার পরে cancel করলে stock ফেরত আসে না
--   • RLS role গুলো অ্যাপের rbac.js এর সাথে মিলিয়ে: owner, manager,
--     cashier, staff
-- -------------------------------------------------------------------------
--
-- টেবিল তৈরির ক্রম (foreign key এর কারণে এই ক্রম জরুরি):
--   ধাপ ০  helper functions                         Person 1
--   ধাপ ১  menu_categories, ingredients             Person 3
--          restaurant_tables                        Person 2
--   ধাপ ২  menu_items                               Person 3
--   ধাপ ৩  menu_item_ingredients                    Person 3
--   ধাপ ৪  orders                                   Person 2
--   ধাপ ৫  order_items                              Person 2
--   ধাপ ৬  bills                                    Person 4
--   ধাপ ৭  business triggers (stock, table, paid)   Person 2 + 3 + 4
--   ধাপ ৮  RLS policies                             প্রত্যেকে নিজের টেবিলের
--   ধাপ ৯  reporting views                          Person 1
--   ধাপ ১০ realtime                                 Person 2
--   ধাপ ১১ demo data                                সবাই
-- =========================================================================


-- profiles না থাকলে এখানেই থেমে যাবে, অর্ধেক টেবিল বানিয়ে ফেলবে না
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'public.profiles নেই। আগে supabase/supabase_setup.sql চালান।';
  END IF;
END $$;


-- =========================================================================
-- ধাপ ০. Helper functions                                         Person 1
-- =========================================================================

-- updated_at স্বয়ংক্রিয় (supabase_setup.sql এও আছে; নতুন project এর জন্য আবার)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- লগইন করা user এর role (RLS policy গুলো এটা ব্যবহার করে)
-- SECURITY DEFINER: profiles এর RLS এর ভিতরে আটকে না যায়
CREATE OR REPLACE FUNCTION public.app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- has_role('owner','manager') → লগইন করা user এর role এর যেকোনো একটা কিনা
CREATE OR REPLACE FUNCTION public.has_role(VARIADIC allowed TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY (allowed),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.app_role()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT[])    TO authenticated;


-- =========================================================================
-- ধাপ ১ক. menu_categories                                         Person 3
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.menu_categories (
  category_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,
  description  TEXT,
  sort_order   INT  NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================================
-- ধাপ ১খ. ingredients                                             Person 3
--
-- ⚠️ unit এ যা লেখা, menu_item_ingredients.quantity_required ও সেই
--    এককে হতে হবে। যেমন unit = 'ml' হলে recipe তেও ml।
--    এজন্য kg/L নয়, ছোট একক (g, ml, pcs) ব্যবহার করুন।
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.ingredients (
  ingredient_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL UNIQUE,
  unit               TEXT NOT NULL CHECK (unit IN ('g', 'ml', 'pcs')),
  cost_per_unit      NUMERIC(10, 4) NOT NULL DEFAULT 0 CHECK (cost_per_unit >= 0),
  stock_level        NUMERIC(12, 3) NOT NULL DEFAULT 0,
  restock_threshold  NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (restock_threshold >= 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================================
-- ধাপ ১গ. restaurant_tables                                       Person 2
-- ('tables' নাম ব্যবহার করা হয়নি — SQL keyword এর সাথে গুলিয়ে যায়)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  table_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number  INT  NOT NULL UNIQUE CHECK (table_number > 0),
  capacity      INT  NOT NULL CHECK (capacity > 0),
  status        TEXT NOT NULL DEFAULT 'empty'
                CHECK (status IN ('empty', 'occupied', 'reserved', 'cleaning')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================================
-- ধাপ ২. menu_items                                               Person 3
--
-- আইটেম মুছবেন না — status = 'unavailable' করুন। পুরনো অর্ডারে এই আইটেম
-- থাকলে ON DELETE RESTRICT মুছতে দেবে না, যাতে ইতিহাস না ভাঙে।
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.menu_items (
  menu_item_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID NOT NULL REFERENCES public.menu_categories (category_id) ON DELETE RESTRICT,
  name          TEXT NOT NULL UNIQUE,
  description   TEXT,
  price         NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  status        TEXT NOT NULL DEFAULT 'available'
                CHECK (status IN ('available', 'unavailable')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items (category_id);


-- =========================================================================
-- ধাপ ৩. menu_item_ingredients (Recipe / BOM)                     Person 3
-- একই আইটেমে একই ingredient দুবার বসানো যাবে না (composite primary key)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.menu_item_ingredients (
  menu_item_id       UUID NOT NULL REFERENCES public.menu_items (menu_item_id) ON DELETE CASCADE,
  ingredient_id      UUID NOT NULL REFERENCES public.ingredients (ingredient_id) ON DELETE RESTRICT,
  quantity_required  NUMERIC(12, 3) NOT NULL CHECK (quantity_required > 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (menu_item_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_mii_ingredient ON public.menu_item_ingredients (ingredient_id);


-- =========================================================================
-- ধাপ ৪. orders                                                   Person 2
--
-- order_number: receipt এ দেখানোর জন্য ছোট সংখ্যা (#1001, #1002 ...)
-- dine-in হলে table_id লাগবেই, takeaway হলে লাগবে না।
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  order_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number  BIGINT GENERATED ALWAYS AS IDENTITY (START WITH 1001) UNIQUE,
  user_id       UUID NOT NULL DEFAULT auth.uid()
                REFERENCES public.profiles (id) ON DELETE RESTRICT,
  table_id      UUID REFERENCES public.restaurant_tables (table_id) ON DELETE RESTRICT,
  order_type    TEXT NOT NULL DEFAULT 'dine-in'
                CHECK (order_type IN ('dine-in', 'takeaway')),
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'served', 'paid', 'cancelled')),
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT orders_dine_in_needs_table
    CHECK (order_type = 'takeaway' OR table_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_orders_status     ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_table      ON public.orders (table_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);


-- =========================================================================
-- ধাপ ৫. order_items                                              Person 2
--
-- unit_price আর unit_cost অর্ডারের মুহূর্তে "ছবি তুলে" রাখা হয় (trigger)।
-- পরে মেনুর দাম বা ingredient এর খরচ বদলালেও পুরনো অর্ডারের হিসাব ঠিক থাকে।
-- ব্রাউজার থেকে দাম পাঠালেও trigger সেটা মেনুর আসল দামে বদলে দেয়।
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  order_item_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL REFERENCES public.orders (order_id) ON DELETE CASCADE,
  menu_item_id   UUID NOT NULL REFERENCES public.menu_items (menu_item_id) ON DELETE RESTRICT,
  quantity       INT  NOT NULL CHECK (quantity > 0),
  unit_price     NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  unit_cost      NUMERIC(10, 4) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  subtotal       NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order     ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item ON public.order_items (menu_item_id);


-- =========================================================================
-- ধাপ ৬. bills                                                    Person 4
--
-- একটা অর্ডারের একটাই বিল (order_id UNIQUE)।
-- ব্রাউজার শুধু পাঠাবে: order_id, discount_percent, service_charge_percent,
-- payment_method। বাকি সব amount trigger নিজে হিসাব করে।
-- বিল insert হলেই অর্ডার "paid" হয়ে যায় (ধাপ ৭ দেখুন)।
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.bills (
  bill_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                UUID NOT NULL UNIQUE REFERENCES public.orders (order_id) ON DELETE RESTRICT,
  user_id                 UUID NOT NULL DEFAULT auth.uid()
                          REFERENCES public.profiles (id) ON DELETE RESTRICT,
  subtotal                NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_percent        NUMERIC(5, 2)  NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  discount_amount         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  service_charge_percent  NUMERIC(5, 2)  NOT NULL DEFAULT 0 CHECK (service_charge_percent BETWEEN 0 AND 100),
  service_charge_amount   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  vat_percent             NUMERIC(5, 2)  NOT NULL DEFAULT 7.5 CHECK (vat_percent BETWEEN 0 AND 100),
  vat_amount              NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount            NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_method          TEXT NOT NULL
                          CHECK (payment_method IN ('cash', 'card', 'bkash', 'nagad')),
  paid_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bills_paid_at ON public.bills (paid_at DESC);


-- =========================================================================
-- updated_at trigger — সব টেবিলে
-- =========================================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'menu_categories', 'ingredients', 'restaurant_tables', 'menu_items',
    'menu_item_ingredients', 'orders', 'order_items', 'bills'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_touch_updated_at ON public.%1$I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_touch_updated_at
         BEFORE UPDATE ON public.%1$I
         FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()', t);
  END LOOP;
END $$;


-- =========================================================================
-- ধাপ ৭. Business triggers
--
-- User Flow এর ধাপগুলো ডেটাবেজেই চলে, যাতে দুজন cashier একসাথে কাজ
-- করলেও হিসাব ভুল না হয়:
--
--   Create Order + Assign Table  → টেবিল "occupied"          (৭ক)
--   Add Menu Items               → দাম ও খরচ snapshot         (৭খ)
--   Generate Bill                → subtotal/VAT/total হিসাব   (৭গ)
--   Process Payment              → অর্ডার "paid"              (৭ঘ)
--   Order paid                   → stock কমে, টেবিল "empty"   (৭ঙ)
-- =========================================================================

-- ৭ক. অর্ডার তৈরির সময় টেবিল যাচাই ও occupied করা             Person 2
CREATE OR REPLACE FUNCTION public.orders_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status TEXT;
BEGIN
  IF NEW.order_type = 'takeaway' THEN
    NEW.table_id := NULL;
    RETURN NEW;
  END IF;

  SELECT status INTO current_status
  FROM public.restaurant_tables
  WHERE table_id = NEW.table_id
  FOR UPDATE;                       -- একই টেবিলে দুজন একসাথে বসাতে না পারে

  IF current_status IS NULL THEN
    RAISE EXCEPTION 'Table not found.';
  ELSIF current_status IN ('occupied', 'cleaning') THEN
    RAISE EXCEPTION 'This table is currently %. Choose another table.', current_status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.orders_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.table_id IS NOT NULL THEN
    UPDATE public.restaurant_tables SET status = 'occupied' WHERE table_id = NEW.table_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_before_insert ON public.orders;
CREATE TRIGGER trg_orders_before_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_before_insert();

DROP TRIGGER IF EXISTS trg_orders_after_insert ON public.orders;
CREATE TRIGGER trg_orders_after_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_after_insert();


-- ৭খ. order_items: দাম/খরচ snapshot, আর বন্ধ অর্ডারে পরিবর্তন আটকানো  Person 2
CREATE OR REPLACE FUNCTION public.order_items_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_order  UUID;
  order_status  TEXT;
  item_status   TEXT;
BEGIN
  target_order := CASE WHEN TG_OP = 'DELETE' THEN OLD.order_id ELSE NEW.order_id END;

  SELECT status INTO order_status FROM public.orders WHERE order_id = target_order;

  -- অর্ডার নিজেই মুছে গেলে (ON DELETE CASCADE) তার item মুছতে দেওয়া হয়
  IF order_status IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF order_status NOT IN ('open', 'served') THEN
    RAISE EXCEPTION 'Order is already %, its items cannot be changed.', order_status;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.menu_item_id IS DISTINCT FROM OLD.menu_item_id THEN
    SELECT status, price INTO item_status, NEW.unit_price
    FROM public.menu_items
    WHERE menu_item_id = NEW.menu_item_id;

    IF item_status IS DISTINCT FROM 'available' THEN
      RAISE EXCEPTION 'This menu item is currently unavailable.';
    END IF;

    -- এক কাপ/এক পিস বানাতে ingredient এর মোট খরচ
    SELECT COALESCE(SUM(mii.quantity_required * i.cost_per_unit), 0)
    INTO NEW.unit_cost
    FROM public.menu_item_ingredients mii
    JOIN public.ingredients i ON i.ingredient_id = mii.ingredient_id
    WHERE mii.menu_item_id = NEW.menu_item_id;
  ELSE
    -- quantity/note বদলালে পুরনো snapshot অক্ষত থাকে
    NEW.unit_price := OLD.unit_price;
    NEW.unit_cost  := OLD.unit_cost;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_items_before_write ON public.order_items;
CREATE TRIGGER trg_order_items_before_write
  BEFORE INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.order_items_before_write();


-- ৭গ. bills: সব amount হিসাব                                      Person 4
--     subtotal → discount → service charge → VAT → total
CREATE OR REPLACE FUNCTION public.bills_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_status    TEXT;
  item_count      INT;
  after_discount  NUMERIC(12, 2);
BEGIN
  SELECT status INTO order_status FROM public.orders WHERE order_id = NEW.order_id;

  IF order_status IS NULL THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF TG_OP = 'INSERT' AND order_status NOT IN ('open', 'served') THEN
    RAISE EXCEPTION 'Order is already %, it cannot be billed again.', order_status;
  END IF;

  SELECT COUNT(*), COALESCE(SUM(subtotal), 0)
  INTO item_count, NEW.subtotal
  FROM public.order_items
  WHERE order_id = NEW.order_id;

  IF item_count = 0 THEN
    RAISE EXCEPTION 'Cannot bill an order with no items.';
  END IF;

  NEW.discount_amount       := ROUND(NEW.subtotal * NEW.discount_percent / 100, 2);
  after_discount            := NEW.subtotal - NEW.discount_amount;
  NEW.service_charge_amount := ROUND(after_discount * NEW.service_charge_percent / 100, 2);
  NEW.vat_amount            := ROUND((after_discount + NEW.service_charge_amount) * NEW.vat_percent / 100, 2);
  NEW.total_amount          := after_discount + NEW.service_charge_amount + NEW.vat_amount;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bills_before_write ON public.bills;
CREATE TRIGGER trg_bills_before_write
  BEFORE INSERT OR UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.bills_before_write();


-- ৭ঘ. বিল তৈরি হলেই অর্ডার paid                                   Person 4
CREATE OR REPLACE FUNCTION public.bills_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders SET status = 'paid' WHERE order_id = NEW.order_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bills_after_insert ON public.bills;
CREATE TRIGGER trg_bills_after_insert
  AFTER INSERT ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.bills_after_insert();


-- ৭ঙ. অর্ডার paid → stock কমানো (Person 3), paid/cancelled → টেবিল খালি (Person 2)
CREATE OR REPLACE FUNCTION public.orders_after_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Person 3: recipe অনুযায়ী ingredient stock কমানো
  IF NEW.status = 'paid' THEN
    UPDATE public.ingredients i
    SET stock_level = i.stock_level - used.total_used
    FROM (
      SELECT mii.ingredient_id, SUM(oi.quantity * mii.quantity_required) AS total_used
      FROM public.order_items oi
      JOIN public.menu_item_ingredients mii ON mii.menu_item_id = oi.menu_item_id
      WHERE oi.order_id = NEW.order_id
      GROUP BY mii.ingredient_id
    ) AS used
    WHERE i.ingredient_id = used.ingredient_id;
  END IF;

  -- Person 2: Release Table
  IF NEW.status IN ('paid', 'cancelled') AND NEW.table_id IS NOT NULL THEN
    UPDATE public.restaurant_tables SET status = 'empty' WHERE table_id = NEW.table_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_after_status_change ON public.orders;
CREATE TRIGGER trg_orders_after_status_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_after_status_change();


-- =========================================================================
-- ধাপ ৮. Row Level Security
--
-- অ্যাপের src/authentication/constants/rbac.js এর সাথে মিলিয়ে:
--
--   টেবিল                     owner/manager  cashier        staff
--   menu_categories/items     সব             পড়বে          পড়বে
--   ingredients               সব             —              পড়বে+লিখবে
--   menu_item_ingredients     সব             —              পড়বে
--   restaurant_tables         সব             পড়বে+বদলাবে   পড়বে+বদলাবে
--   orders, order_items       সব             পড়বে+লিখবে    পড়বে
--   bills                     সব             পড়বে+বানাবে   —
--
-- লগইন ছাড়া (anon) কেউ কিছুই দেখতে পাবে না।
-- =========================================================================
ALTER TABLE public.menu_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills                 ENABLE ROW LEVEL SECURITY;

-- আবার চালালে পুরনো policy সরিয়ে নতুন করে বসানো
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('menu_categories', 'ingredients', 'restaurant_tables', 'menu_items',
                        'menu_item_ingredients', 'orders', 'order_items', 'bills')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ---- Person 3: menu_categories ----
CREATE POLICY menu_categories_read ON public.menu_categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY menu_categories_admin ON public.menu_categories
  FOR ALL TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

-- ---- Person 3: menu_items ----
CREATE POLICY menu_items_read ON public.menu_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY menu_items_admin ON public.menu_items
  FOR ALL TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

-- ---- Person 3: ingredients ----
CREATE POLICY ingredients_read ON public.ingredients
  FOR SELECT TO authenticated USING (public.has_role('owner', 'manager', 'staff'));
CREATE POLICY ingredients_write ON public.ingredients
  FOR ALL TO authenticated
  USING (public.has_role('owner', 'manager', 'staff'))
  WITH CHECK (public.has_role('owner', 'manager', 'staff'));

-- ---- Person 3: menu_item_ingredients (recipe) ----
CREATE POLICY mii_read ON public.menu_item_ingredients
  FOR SELECT TO authenticated USING (public.has_role('owner', 'manager', 'staff'));
CREATE POLICY mii_admin ON public.menu_item_ingredients
  FOR ALL TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

-- ---- Person 2: restaurant_tables ----
CREATE POLICY tables_read ON public.restaurant_tables
  FOR SELECT TO authenticated USING (true);
CREATE POLICY tables_update_status ON public.restaurant_tables
  FOR UPDATE TO authenticated
  USING (public.has_role('owner', 'manager', 'cashier', 'staff'))
  WITH CHECK (public.has_role('owner', 'manager', 'cashier', 'staff'));
CREATE POLICY tables_admin ON public.restaurant_tables
  FOR ALL TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));

-- ---- Person 2: orders ----
CREATE POLICY orders_read ON public.orders
  FOR SELECT TO authenticated USING (public.has_role('owner', 'manager', 'cashier', 'staff'));
CREATE POLICY orders_insert ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner', 'manager', 'cashier') AND user_id = auth.uid());
CREATE POLICY orders_update ON public.orders
  FOR UPDATE TO authenticated
  USING (public.has_role('owner', 'manager', 'cashier'))
  WITH CHECK (public.has_role('owner', 'manager', 'cashier'));
CREATE POLICY orders_delete ON public.orders
  FOR DELETE TO authenticated USING (public.has_role('owner', 'manager'));

-- ---- Person 2: order_items ----
CREATE POLICY order_items_read ON public.order_items
  FOR SELECT TO authenticated USING (public.has_role('owner', 'manager', 'cashier', 'staff'));
CREATE POLICY order_items_write ON public.order_items
  FOR ALL TO authenticated
  USING (public.has_role('owner', 'manager', 'cashier'))
  WITH CHECK (public.has_role('owner', 'manager', 'cashier'));

-- ---- Person 4: bills (cross-table: orders কে paid করে — trigger এ, RLS এ নয়) ----
CREATE POLICY bills_read ON public.bills
  FOR SELECT TO authenticated USING (public.has_role('owner', 'manager', 'cashier'));
CREATE POLICY bills_insert ON public.bills
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('owner', 'manager', 'cashier') AND user_id = auth.uid());
CREATE POLICY bills_admin ON public.bills
  FOR UPDATE TO authenticated
  USING (public.has_role('owner', 'manager'))
  WITH CHECK (public.has_role('owner', 'manager'));


-- =========================================================================
-- ধাপ ৯. Reporting views                                          Person 1
--
-- security_invoker = true → view পড়ার সময় পড়নেওয়ালার RLS প্রযোজ্য হয়।
-- তার উপর has_role শর্ত: লাভের তথ্য শুধু owner/manager দেখবে।
-- =========================================================================

-- ৯ক. restock দরকার এমন ingredient
CREATE OR REPLACE VIEW public.low_stock_ingredients
WITH (security_invoker = true) AS
SELECT
  ingredient_id,
  name,
  unit,
  stock_level,
  restock_threshold,
  (restock_threshold - stock_level) AS shortfall
FROM public.ingredients
WHERE stock_level <= restock_threshold
ORDER BY (restock_threshold - stock_level) DESC;

-- ৯খ. দৈনিক বিক্রি ও লাভ (Asia/Dhaka তারিখ অনুযায়ী)
CREATE OR REPLACE VIEW public.daily_sales_summary
WITH (security_invoker = true) AS
WITH bill_day AS (
  SELECT
    b.order_id,
    (b.paid_at AT TIME ZONE 'Asia/Dhaka')::DATE AS sales_date,
    b.subtotal,
    b.discount_amount,
    b.service_charge_amount,
    b.vat_amount,
    b.total_amount
  FROM public.bills b
),
order_cost AS (
  SELECT order_id, SUM(quantity * unit_cost) AS cost
  FROM public.order_items
  GROUP BY order_id
)
SELECT
  bd.sales_date,
  COUNT(*)                                             AS orders_paid,
  SUM(bd.subtotal)                                     AS gross_sales,
  SUM(bd.discount_amount)                              AS discounts,
  SUM(bd.service_charge_amount)                        AS service_charges,
  SUM(bd.vat_amount)                                   AS vat_collected,
  SUM(bd.total_amount)                                 AS total_collected,
  ROUND(SUM(COALESCE(oc.cost, 0)), 2)                  AS ingredient_cost,
  ROUND(SUM(bd.subtotal - bd.discount_amount + bd.service_charge_amount
            - COALESCE(oc.cost, 0)), 2)                AS gross_profit
FROM bill_day bd
LEFT JOIN order_cost oc ON oc.order_id = bd.order_id
WHERE public.has_role('owner', 'manager')
GROUP BY bd.sales_date
ORDER BY bd.sales_date DESC;

GRANT SELECT ON public.low_stock_ingredients TO authenticated;
GRANT SELECT ON public.daily_sales_summary   TO authenticated;


-- =========================================================================
-- ধাপ ১০. Realtime                                                 Person 2
-- একজন cashier টেবিল occupied করলে অন্যদের স্ক্রিনে সাথে সাথে বদলাবে
-- =========================================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'supabase_realtime publication নেই — realtime ধাপ বাদ দেওয়া হলো';
    RETURN;
  END IF;

  FOREACH t IN ARRAY ARRAY['restaurant_tables', 'orders', 'order_items']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;


-- =========================================================================
-- ধাপ ১১. Demo data — অ্যাপের বর্তমান mock ডেটার সাথে মিল রেখে
-- (আবার চালালে duplicate হবে না — ON CONFLICT DO NOTHING)
-- =========================================================================

-- ---- Person 3: categories ----
INSERT INTO public.menu_categories (name, description, sort_order) VALUES
  ('Espresso & Coffee', 'Hot espresso-based drinks', 1),
  ('Tea & Chai',        'Tea, matcha and chai',      2),
  ('Artisan Bakery',    'Fresh pastries and bakes',  3),
  ('Cold Brews',        'Iced and cold coffee',      4)
ON CONFLICT (name) DO NOTHING;

-- ---- Person 3: menu items ----
INSERT INTO public.menu_items (category_id, name, description, price)
SELECT c.category_id, v.name, v.description, v.price
FROM (VALUES
  ('Espresso & Coffee', 'Espresso Double',    'Rich 100% Arabica double shot',                 180),
  ('Espresso & Coffee', 'Spanish Latte',      'Sweet condensed milk & espresso',               280),
  ('Espresso & Coffee', 'Caramel Macchiato',  'Vanilla syrup, steamed milk & caramel drizzle', 320),
  ('Tea & Chai',        'Matcha Green Latte', 'Ceremonial Uji matcha with oat milk',           290),
  ('Tea & Chai',        'Masala Spiced Chai', 'Slow-brewed black tea with aromatic spices',    160),
  ('Artisan Bakery',    'Butter Croissant',   'Flaky French layered butter pastry',            180),
  ('Artisan Bakery',    'Fudge Brownie',      'Warm Belgian chocolate brownie',                220),
  ('Cold Brews',        'Nitro Cold Brew',    'Infused with nitrogen for creamy foam',         310)
) AS v (category, name, description, price)
JOIN public.menu_categories c ON c.name = v.category
ON CONFLICT (name) DO NOTHING;

-- ---- Person 3: ingredients (খরচ BDT প্রতি একক) ----
INSERT INTO public.ingredients (name, unit, cost_per_unit, stock_level, restock_threshold) VALUES
  ('Roasted Espresso Blend',       'g',   2.5000, 8400, 1000),
  ('Whole Dairy Milk (Aarong)',    'ml',  0.1200, 2500, 5000),
  ('Oat Milk Barista Edition',     'ml',  0.4500, 6000, 2000),
  ('Madagascar Vanilla Syrup',     'ml',  0.9000, 1200,  300),
  ('Belgian Dark Chocolate Sauce', 'g',   1.1000, 3000,  500),
  ('Sweetened Condensed Milk',     'ml',  0.3500, 2000,  500),
  ('Uji Matcha Powder',            'g',   9.0000,  400,  100),
  ('Black Tea Leaves',             'g',   1.2000, 1500,  300),
  ('Butter Croissant (frozen)',    'pcs', 70.0000,  40,   10),
  ('Fudge Brownie (tray portion)', 'pcs', 85.0000,  30,   10)
ON CONFLICT (name) DO NOTHING;

-- ---- Person 3: recipes (BOM) ----
INSERT INTO public.menu_item_ingredients (menu_item_id, ingredient_id, quantity_required)
SELECT m.menu_item_id, i.ingredient_id, v.qty
FROM (VALUES
  ('Espresso Double',    'Roasted Espresso Blend',        18),
  ('Spanish Latte',      'Roasted Espresso Blend',        18),
  ('Spanish Latte',      'Whole Dairy Milk (Aarong)',    180),
  ('Spanish Latte',      'Sweetened Condensed Milk',      30),
  ('Caramel Macchiato',  'Roasted Espresso Blend',        18),
  ('Caramel Macchiato',  'Whole Dairy Milk (Aarong)',    200),
  ('Caramel Macchiato',  'Madagascar Vanilla Syrup',      15),
  ('Matcha Green Latte', 'Uji Matcha Powder',              4),
  ('Matcha Green Latte', 'Oat Milk Barista Edition',     220),
  ('Masala Spiced Chai', 'Black Tea Leaves',               6),
  ('Masala Spiced Chai', 'Whole Dairy Milk (Aarong)',    150),
  ('Butter Croissant',   'Butter Croissant (frozen)',      1),
  ('Fudge Brownie',      'Fudge Brownie (tray portion)',   1),
  ('Fudge Brownie',      'Belgian Dark Chocolate Sauce',  20),
  ('Nitro Cold Brew',    'Roasted Espresso Blend',        25)
) AS v (item, ingredient, qty)
JOIN public.menu_items  m ON m.name = v.item
JOIN public.ingredients i ON i.name = v.ingredient
ON CONFLICT (menu_item_id, ingredient_id) DO NOTHING;

-- ---- Person 2: restaurant tables (অ্যাপের ৮টা টেবিলের মতো) ----
INSERT INTO public.restaurant_tables (table_number, capacity) VALUES
  (1, 2), (2, 4), (3, 4), (4, 6), (5, 2), (6, 4), (7, 2), (8, 8)
ON CONFLICT (table_number) DO NOTHING;


-- =========================================================================
-- যাচাই — প্রতিটা টেবিলে কতগুলো row
-- =========================================================================
SELECT 'menu_categories'       AS table_name, COUNT(*) AS rows FROM public.menu_categories
UNION ALL SELECT 'menu_items',            COUNT(*) FROM public.menu_items
UNION ALL SELECT 'ingredients',           COUNT(*) FROM public.ingredients
UNION ALL SELECT 'menu_item_ingredients', COUNT(*) FROM public.menu_item_ingredients
UNION ALL SELECT 'restaurant_tables',     COUNT(*) FROM public.restaurant_tables
UNION ALL SELECT 'orders',                COUNT(*) FROM public.orders
UNION ALL SELECT 'order_items',           COUNT(*) FROM public.order_items
UNION ALL SELECT 'bills',                 COUNT(*) FROM public.bills;
