-- =========================================================================
-- FEATURE: Order cancellation — কখন cashier নিজে বাতিল করতে পারবে,
--          আর কখন সেটা Manager এর অনুমোদনে যাবে
--
-- নিয়ম (রান্নাঘরের টিকিটের অবস্থা অনুযায়ী):
--
--   কিছুই পাঠানো হয়নি  →  cashier নিজেই বাতিল করবে
--   queued              →  cashier নিজেই বাতিল করবে
--   preparing           →  কেউ পারবে না — রাঁধুনি রান্না শুরু করে দিয়েছেন,
--                          কাঁচামাল খরচ হয়ে গেছে। ready হওয়া পর্যন্ত অপেক্ষা।
--   ready               →  Manager এর কাছে অনুরোধ যাবে
--   served              →  Manager এর কাছে অনুরোধ যাবে
--   বিল হয়ে গেছে (paid) →  আর বাতিল হবে না
--
-- ⚠️ এই ক্যাফে pay-last: গেস্ট শেষে টাকা দেন। তাই বাতিলের অনুরোধ সবসময়
--    টাকা নেওয়ার আগেই আসে — Manager বাতিল করলে কোনো টাকা ফেরত দেওয়ার
--    দরকার হয় না। Manager শুধু একটা complain/সিদ্ধান্তের বার্তা লেখেন।
--    বিল একবার settle হয়ে গেলে অর্ডারটা আর বাতিল হয় না।
--
-- চালানোর নিয়ম:
--   Supabase Dashboard → SQL Editor → New Query → paste → Run
--   ⚠️ আগে supabase_pos_schema.sql আর supabase_order_flow.sql চালানো থাকতে হবে।
--   আগের সংস্করণ চালানো থাকলেও এটা আবার চালানো নিরাপদ।
--
-- এই ফাইলে কোনো DROP TABLE / DELETE / TRUNCATE নেই — কোনো ডেটা মুছবে না।
-- =========================================================================


-- =========================================================================
-- ১. order_cancellation_requests টেবিল
--    এক অর্ডারে একসাথে একটাই "pending" অনুরোধ থাকতে পারে।
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.order_cancellation_requests (
  request_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES public.orders (order_id) ON DELETE CASCADE,

  -- কে অনুরোধ করেছে (সাধারণত cashier)
  requested_by    UUID NOT NULL DEFAULT auth.uid()
                  REFERENCES public.profiles (id) ON DELETE RESTRICT,
  -- cashier কেন বাতিল করতে চাইছে — গেস্ট কী বলেছেন
  reason          TEXT NOT NULL CHECK (length(btrim(reason)) > 0),
  -- অনুরোধের সময় খাবারটা কোন অবস্থায় ছিল: pass এ তৈরি, নাকি দেওয়া হয়ে গেছে
  stage           TEXT NOT NULL,

  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Manager এর অংশ
  reviewed_by     UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  manager_message TEXT,
  reviewed_at     TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- stage এর CHECK আলাদা করে বসানো হয়, কারণ আগের সংস্করণে ভুল মান ছিল
-- ('paid' ধরা হতো, আর ফাংশন 'request' লিখতে গিয়ে constraint ভাঙত)।
-- ---------------------------------------------------------------------
UPDATE public.order_cancellation_requests SET stage = 'served' WHERE stage NOT IN ('ready', 'served');

ALTER TABLE public.order_cancellation_requests
  DROP CONSTRAINT IF EXISTS order_cancellation_requests_stage_check;

ALTER TABLE public.order_cancellation_requests
  ADD CONSTRAINT order_cancellation_requests_stage_check
  CHECK (stage IN ('ready', 'served'));

-- আগের সংস্করণের refund কলাম গুলো থাকলে সেগুলো আর ব্যবহার হয় না।
-- pay-last ক্যাফেতে বাতিল সবসময় টাকা নেওয়ার আগে, তাই ফেরতের প্রশ্নই নেই।
-- কলাম মুছে ডেটা হারানোর ঝুঁকি নেওয়া হয়নি — শুধু NOT NULL শিথিল করা হলো।
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_cancellation_requests'
      AND column_name = 'refund_amount'
  ) THEN
    EXECUTE 'ALTER TABLE public.order_cancellation_requests ALTER COLUMN refund_amount DROP NOT NULL';
  END IF;
END $$;

-- একই অর্ডারে দুটো pending অনুরোধ আটকানো
CREATE UNIQUE INDEX IF NOT EXISTS idx_ocr_one_pending_per_order
  ON public.order_cancellation_requests (order_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_ocr_status      ON public.order_cancellation_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ocr_reviewed_at ON public.order_cancellation_requests (reviewed_at DESC);

-- updated_at নিজে থেকেই আপডেট হবে
DO $$
BEGIN
  IF to_regprocedure('public.touch_updated_at()') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS ocr_touch ON public.order_cancellation_requests';
    EXECUTE 'CREATE TRIGGER ocr_touch
               BEFORE UPDATE ON public.order_cancellation_requests
               FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()';
  END IF;
END $$;


-- =========================================================================
-- ২. একটা অর্ডার এই মুহূর্তে কোন ধাপে আছে — বাতিলের নিয়ম ঠিক করার
--    একমাত্র জায়গা। ব্রাউজার আর ডেটাবেজ দুজনেই এটাই মেনে চলে।
--
--    ⚠️ এটা "কে পারবে" বলে — অনুরোধের row তে যে stage লেখা হয়
--       ('ready' / 'served') সেটা আলাদা জিনিস, নিচে ৪ নম্বরে।
--
--    'free'    → cashier নিজেই বাতিল করতে পারবে
--    'locked'  → রান্না চলছে, কেউ বাতিল করতে পারবে না
--    'request' → Manager এর অনুমোদন লাগবে
--    'settled' → বিল হয়ে গেছে, আর বাতিল হবে না
--    'closed'  → অর্ডারটা আগেই বাতিল হয়ে গেছে
-- =========================================================================
CREATE OR REPLACE FUNCTION public.order_cancel_stage(p_order_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_status TEXT;
  has_preparing BOOLEAN;
  has_ready_or_served BOOLEAN;
BEGIN
  SELECT status INTO order_status FROM public.orders WHERE order_id = p_order_id;

  IF order_status IS NULL THEN
    RAISE EXCEPTION 'Order not found.' USING ERRCODE = 'P0002';
  END IF;

  IF order_status = 'cancelled' THEN
    RETURN 'closed';
  END IF;

  -- টাকা নেওয়া হয়ে গেছে — pay-last ক্যাফেতে এটাই শেষ ধাপ।
  -- এরপর বাতিল করলে টাকা ফেরত দিতে হতো, যেটা এই ক্যাফের নিয়মে নেই।
  IF order_status = 'paid' THEN
    RETURN 'settled';
  END IF;

  SELECT
    bool_or(kitchen_status = 'preparing'),
    bool_or(kitchen_status IN ('ready', 'served'))
  INTO has_preparing, has_ready_or_served
  FROM public.order_items
  WHERE order_id = p_order_id AND sent_at IS NOT NULL;

  -- রান্না চলছে — এই অবস্থায় কেউই বাতিল করতে পারে না
  IF COALESCE(has_preparing, false) THEN
    RETURN 'locked';
  END IF;

  IF COALESCE(has_ready_or_served, false) THEN
    RETURN 'request';
  END IF;

  -- কিছুই পাঠানো হয়নি, অথবা সব টিকিট এখনো queued
  RETURN 'free';
END;
$$;

REVOKE ALL ON FUNCTION public.order_cancel_stage(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.order_cancel_stage(UUID) TO authenticated;


-- =========================================================================
-- ৩. status পাহারাদার নতুন করে — supabase_order_flow.sql এর সংস্করণটা
--    যেকোনো sent_at কে বাধা ধরত। এখন queued পর্যন্ত cashier পারবে,
--    আর Manager এর অনুমোদিত বাতিল ready/served ধাপেও পার হতে পারবে।
-- =========================================================================
CREATE OR REPLACE FUNCTION public.orders_guard_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  stage TEXT;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Manager অনুমোদন করেছেন — resolve_order_cancellation() এই পতাকা তোলে
  IF NEW.status = 'cancelled'
     AND COALESCE(current_setting('app.cancel_approved', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF OLD.status <> 'open' THEN
    RAISE EXCEPTION 'This order is already %, it cannot be changed.', OLD.status
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status = 'paid' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'cancelled' THEN
    stage := public.order_cancel_stage(NEW.order_id);

    IF stage = 'locked' THEN
      RAISE EXCEPTION 'The kitchen has started cooking this order, so it cannot be cancelled right now. Wait until the ticket is marked Ready, then send a cancellation request to the Manager.'
        USING ERRCODE = '42501';
    END IF;

    IF stage = 'request' THEN
      RAISE EXCEPTION 'This order has already reached the guest, so only a Manager can cancel it. Send a cancellation request instead.'
        USING ERRCODE = '42501';
    END IF;

    IF stage = 'settled' THEN
      RAISE EXCEPTION 'The bill for this order is already settled, so it can no longer be cancelled.'
        USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Order cannot go from % to %.', OLD.status, NEW.status
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_guard_status ON public.orders;
CREATE TRIGGER trg_orders_guard_status
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_guard_status();


-- =========================================================================
-- ৪. cashier অনুরোধ পাঠায়
--
--    ⚠️ এখানেই আগের bug ছিল: order_cancel_stage() এর ফেরত ('request')
--       সরাসরি stage কলামে লেখা হতো, কিন্তু কলামটা 'ready' / 'served'
--       ছাড়া কিছু নেয় না। তাই এখন দুটো আলাদা করে হিসাব করা হয়।
-- =========================================================================
CREATE OR REPLACE FUNCTION public.request_order_cancellation(
  p_order_id UUID,
  p_reason   TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gate        TEXT;   -- কে পারবে: free / locked / request / settled / closed
  food_stage  TEXT;   -- row এ যা লেখা হবে: ready / served
  new_id      UUID;
  already     UUID;
BEGIN
  IF NOT public.has_role('owner', 'manager', 'cashier', 'staff') THEN
    RAISE EXCEPTION 'You are not allowed to raise a cancellation request.'
      USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Write why the guest wants this order cancelled.'
      USING ERRCODE = '22023';
  END IF;

  gate := public.order_cancel_stage(p_order_id);

  IF gate = 'closed' THEN
    RAISE EXCEPTION 'This order is already cancelled.' USING ERRCODE = '42501';
  END IF;

  IF gate = 'settled' THEN
    RAISE EXCEPTION 'The bill is already settled, so this order can no longer be cancelled.'
      USING ERRCODE = '42501';
  END IF;

  IF gate = 'locked' THEN
    RAISE EXCEPTION 'The kitchen is cooking this order right now. Wait until the ticket is Ready, then request a cancellation.'
      USING ERRCODE = '42501';
  END IF;

  IF gate = 'free' THEN
    RAISE EXCEPTION 'Nothing has reached the guest yet, so you can cancel this order yourself — no Manager approval needed.'
      USING ERRCODE = '42501';
  END IF;

  -- খাবারটা কি গেস্টের হাতে চলে গেছে, নাকি শুধু pass এ তৈরি হয়ে আছে
  SELECT CASE
           WHEN bool_or(kitchen_status = 'served') THEN 'served'
           ELSE 'ready'
         END
  INTO food_stage
  FROM public.order_items
  WHERE order_id = p_order_id AND sent_at IS NOT NULL;

  SELECT request_id INTO already
  FROM public.order_cancellation_requests
  WHERE order_id = p_order_id AND status = 'pending';

  IF already IS NOT NULL THEN
    RAISE EXCEPTION 'A cancellation request for this order is already waiting with the Manager.'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.order_cancellation_requests (order_id, requested_by, reason, stage)
  VALUES (p_order_id, auth.uid(), btrim(p_reason), COALESCE(food_stage, 'ready'))
  RETURNING request_id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_order_cancellation(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_order_cancellation(UUID, TEXT) TO authenticated;


-- =========================================================================
-- ৫. Manager সিদ্ধান্ত জানায় — বার্তা বাধ্যতামূলক
--    অনুমোদন করলে: অর্ডার বাতিল হয় আর টেবিল খালি হয়।
--    টাকা নেওয়ার আগেই বাতিল হচ্ছে, তাই refund এর কোনো ধাপ নেই।
-- =========================================================================

-- আগের সংস্করণে refund এর দুটো প্যারামিটার ছিল — সেই signature টা সরানো
DROP FUNCTION IF EXISTS public.resolve_order_cancellation(UUID, BOOLEAN, TEXT, NUMERIC, TEXT);

CREATE OR REPLACE FUNCTION public.resolve_order_cancellation(
  p_request_id UUID,
  p_approve    BOOLEAN,
  p_message    TEXT
)
RETURNS public.order_cancellation_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req    public.order_cancellation_requests;
  tbl_id UUID;
BEGIN
  IF NOT public.has_role('owner', 'manager') THEN
    RAISE EXCEPTION 'Only the Owner or a Manager can decide a cancellation request.'
      USING ERRCODE = '42501';
  END IF;

  IF p_message IS NULL OR length(btrim(p_message)) = 0 THEN
    RAISE EXCEPTION 'Write a note explaining your decision before saving it.'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO req
  FROM public.order_cancellation_requests
  WHERE request_id = p_request_id
  FOR UPDATE;

  IF req.request_id IS NULL THEN
    RAISE EXCEPTION 'Cancellation request not found.' USING ERRCODE = 'P0002';
  END IF;

  IF req.status <> 'pending' THEN
    RAISE EXCEPTION 'This request was already %.', req.status USING ERRCODE = '42501';
  END IF;

  IF p_approve THEN
    -- পাহারাদারকে জানিয়ে দেওয়া যে এই বাতিলটা অনুমোদিত
    PERFORM set_config('app.cancel_approved', 'on', true);

    UPDATE public.orders
    SET status = 'cancelled'
    WHERE order_id = req.order_id
    RETURNING table_id INTO tbl_id;

    PERFORM set_config('app.cancel_approved', 'off', true);

    IF tbl_id IS NOT NULL THEN
      UPDATE public.restaurant_tables SET status = 'empty' WHERE table_id = tbl_id;
    END IF;
  END IF;

  UPDATE public.order_cancellation_requests
  SET status          = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
      reviewed_by     = auth.uid(),
      manager_message = btrim(p_message),
      reviewed_at     = NOW()
  WHERE request_id = p_request_id
  RETURNING * INTO req;

  RETURN req;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_order_cancellation(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_order_cancellation(UUID, BOOLEAN, TEXT) TO authenticated;


-- =========================================================================
-- ৬. RLS — পড়া যাবে, কিন্তু লেখা শুধু উপরের দুটো ফাংশন দিয়ে
--    (ফাংশন দুটো SECURITY DEFINER, তাই তারা RLS এর বাইরে থেকে লেখে)
-- =========================================================================
ALTER TABLE public.order_cancellation_requests ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'order_cancellation_requests'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.order_cancellation_requests', pol.policyname);
  END LOOP;
END $$;

REVOKE ALL ON public.order_cancellation_requests FROM anon;
GRANT SELECT ON public.order_cancellation_requests TO authenticated;

-- নিজের পাঠানো অনুরোধ cashier দেখতে পাবে (Manager কী লিখলেন সেটাও),
-- আর owner/manager সব দেখতে পাবেন।
CREATE POLICY ocr_select ON public.order_cancellation_requests
  FOR SELECT TO authenticated
  USING (requested_by = auth.uid() OR public.has_role('owner', 'manager'));


-- =========================================================================
-- ৭. যাচাই
-- =========================================================================
SELECT status, stage, COUNT(*) AS total
FROM public.order_cancellation_requests
GROUP BY status, stage;
