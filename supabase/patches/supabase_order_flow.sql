-- =========================================================================
-- ORDER · KITCHEN · TABLE FLOW  (Pay-last / running tab)
--
-- সিদ্ধান্তগুলো:
--   • Dine-in: অর্ডার সারা সময় খোলা থাকে, টাকা শেষে
--   • Takeaway: টাকা সাথে সাথেই (একই ব্যবস্থা, cashier তখনই বিল করে)
--   • আইটেম যোগ যেকোনো সময়; কিন্তু kitchen এ পাঠানো আইটেম আর বদলানো যায় না
--   • "Send to kitchen" cashier চাপে → ওই আইটেমগুলো এক রাউন্ড হয়ে যায়
--   • স্টক কমে kitchen এ পাঠানোর সময় (টাকার সময় নয়)
--   • রাউন্ডের অবস্থা: queued → preparing → ready → served
--
-- অর্ডারের অবস্থা:  open → paid        (বিল হলে)
--                    open → cancelled   (kitchen এ কিছু না পাঠানো থাকলেই কেবল)
--   'served' মানটা অর্ডারে আর ব্যবহার হয় না — পরিবেশন এখন রাউন্ড ধরে হয়।
--
-- চালানোর নিয়ম: Supabase → SQL Editor → New query → paste → Run (একবার)
-- আবার চালালেও ক্ষতি নেই। কোনো DROP TABLE / DELETE / TRUNCATE নেই।
-- =========================================================================


-- =========================================================================
-- ১. টোকেন নম্বর — প্রতিদিন ১ থেকে
-- order_number (1001...) হিসাবের জন্য; কাস্টমার ও kitchen টোকেন ব্যবহার করে।
-- =========================================================================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS token_number INT;

CREATE INDEX IF NOT EXISTS idx_orders_token
  ON public.orders (((created_at AT TIME ZONE 'Asia/Dhaka')::DATE), token_number);


-- =========================================================================
-- ২. order_items এ kitchen এর তথ্য
--    sent_at NULL      → এখনো পাঠানো হয়নি, cashier বদলাতে পারে
--    sent_at আছে       → রাউন্ডে চলে গেছে, তালাবদ্ধ
-- =========================================================================
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS round_no INT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS kitchen_status TEXT;

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_kitchen_status_check;
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_kitchen_status_check
  CHECK (kitchen_status IS NULL
         OR kitchen_status IN ('queued', 'preparing', 'ready', 'served'));

CREATE INDEX IF NOT EXISTS idx_order_items_kitchen
  ON public.order_items (kitchen_status, sent_at);


-- =========================================================================
-- ৩. অর্ডার তৈরির সময়: টোকেন + টেবিল যাচাই
-- =========================================================================
CREATE OR REPLACE FUNCTION public.orders_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status TEXT;
BEGIN
  -- দুজন cashier একসাথে অর্ডার নিলেও একই টোকেন যেন না পড়ে
  PERFORM pg_advisory_xact_lock(hashtext('cafe_pos_daily_token'));

  SELECT COALESCE(MAX(token_number), 0) + 1
  INTO NEW.token_number
  FROM public.orders
  WHERE (created_at AT TIME ZONE 'Asia/Dhaka')::DATE
      = (NOW() AT TIME ZONE 'Asia/Dhaka')::DATE;

  IF NEW.order_type = 'takeaway' THEN
    NEW.table_id := NULL;
    RETURN NEW;
  END IF;

  SELECT status INTO current_status
  FROM public.restaurant_tables
  WHERE table_id = NEW.table_id
  FOR UPDATE;

  IF current_status IS NULL THEN
    RAISE EXCEPTION 'Table not found.';
  END IF;

  -- নোংরা টেবিলে বসানো যাবে (ভিড়ের সময় আটকানো ঠিক নয়);
  -- শুধু সত্যিকারের দখল করা টেবিল আটকানো হয়। তবে ওই টেবিলে চলতি
  -- অর্ডার না থাকলে (কাস্টমার বসেছেন, অর্ডার এখনো দেননি) অনুমতি আছে।
  IF current_status = 'occupied'
     AND EXISTS (SELECT 1 FROM public.orders
                 WHERE table_id = NEW.table_id AND status = 'open') THEN
    RAISE EXCEPTION 'This table already has a running order. Open that one instead.';
  END IF;

  RETURN NEW;
END;
$$;


-- =========================================================================
-- ৪. এক টেবিলে একসাথে একটাই চলমান (open) হিসাব
-- =========================================================================
CREATE UNIQUE INDEX IF NOT EXISTS uniq_open_order_per_table
  ON public.orders (table_id)
  WHERE status = 'open' AND table_id IS NOT NULL;


-- =========================================================================
-- ৫. অর্ডারের অবস্থা বদলের পাহারাদার
--    open → paid        : বিল তৈরি হলে (trigger নিজেই করে)
--    open → cancelled   : kitchen এ কিছু পাঠানো না থাকলে
-- =========================================================================
CREATE OR REPLACE FUNCTION public.orders_guard_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  sent_count INT;
BEGIN
  IF NEW.status = OLD.status THEN
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
    SELECT COUNT(*) INTO sent_count
    FROM public.order_items
    WHERE order_id = NEW.order_id AND sent_at IS NOT NULL;

    IF sent_count > 0 THEN
      RAISE EXCEPTION 'Food has already gone to the kitchen, so this order cannot be cancelled. Settle the bill instead.'
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
-- ৬. অবস্থা বদলের পর
--    ⚠️ স্টক এখানে আর কমে না — সেটা এখন kitchen এ পাঠানোর সময় হয় (ধাপ ৮)
--    ⚠️ বিল হলে টেবিলও খালি হয় না — কাস্টমার তখনো বসে থাকতে পারেন
-- =========================================================================
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

  -- বাতিল হয় শুধু তখনই যখন kitchen এ কিছু যায়নি → টেবিল সরাসরি খালি
  IF NEW.status = 'cancelled' AND NEW.table_id IS NOT NULL THEN
    UPDATE public.restaurant_tables SET status = 'empty' WHERE table_id = NEW.table_id;
  END IF;

  RETURN NEW;
END;
$$;


-- =========================================================================
-- ৭. আইটেম যোগ/বাদ/বদল — শুধু যেগুলো এখনো kitchen এ যায়নি
-- =========================================================================
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

  -- ছাড় ১: শুধু kitchen এর অবস্থা বদলানো হচ্ছে (queued → preparing → ready
  -- → served)। এটা বিল হয়ে যাওয়ার পরেও চলতে হবে — বিশেষ করে takeaway তে,
  -- যেখানে cashier টাকা নিয়ে ফেলেন আর রাঁধুনি তারপর রান্না শেষ করেন।
  IF TG_OP = 'UPDATE'
     AND OLD.sent_at IS NOT NULL
     AND NEW.order_id     IS NOT DISTINCT FROM OLD.order_id
     AND NEW.menu_item_id IS NOT DISTINCT FROM OLD.menu_item_id
     AND NEW.quantity     IS NOT DISTINCT FROM OLD.quantity
     AND NEW.unit_price   IS NOT DISTINCT FROM OLD.unit_price
     AND NEW.note         IS NOT DISTINCT FROM OLD.note
  THEN
    RETURN NEW;
  END IF;

  SELECT status INTO order_status FROM public.orders WHERE order_id = target_order;

  -- অর্ডার নিজেই মুছে গেলে (ON DELETE CASCADE) তার item মুছতে দেওয়া হয়
  IF order_status IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF order_status <> 'open' THEN
    RAISE EXCEPTION 'The bill for this order is already settled (%), items cannot be changed.', order_status
      USING ERRCODE = '42501';
  END IF;

  -- kitchen এ পাঠানো আইটেম তালাবদ্ধ (রান্না শুরু হয়ে গেছে)।
  -- শুধু kitchen-status বদলের ক্ষেত্রে উপরে ছাড় দেওয়া হয়ে গেছে।
  IF TG_OP <> 'INSERT' AND OLD.sent_at IS NOT NULL THEN
    RAISE EXCEPTION 'This item is already with the kitchen and can no longer be changed.'
      USING ERRCODE = '42501';
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

    SELECT COALESCE(SUM(mii.quantity_required * i.cost_per_unit), 0)
    INTO NEW.unit_cost
    FROM public.menu_item_ingredients mii
    JOIN public.ingredients i ON i.ingredient_id = mii.ingredient_id
    WHERE mii.menu_item_id = NEW.menu_item_id;
  ELSE
    NEW.unit_price := OLD.unit_price;
    NEW.unit_cost  := OLD.unit_cost;
  END IF;

  RETURN NEW;
END;
$$;


-- =========================================================================
-- ৮. RPC: "Send to kitchen" — যেসব আইটেম এখনো পাঠানো হয়নি সেগুলো
--    এক রাউন্ড হয়ে kitchen এ যায়, আর তখনই স্টক কমে।
-- =========================================================================
CREATE OR REPLACE FUNCTION public.send_round_to_kitchen(p_order_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_status TEXT;
  next_round   INT;
  sent_count   INT;
BEGIN
  IF NOT public.has_role('owner', 'manager', 'cashier') THEN
    RAISE EXCEPTION 'Only a cashier can send orders to the kitchen.' USING ERRCODE = '42501';
  END IF;

  SELECT status INTO order_status FROM public.orders WHERE order_id = p_order_id FOR UPDATE;

  IF order_status IS NULL THEN
    RAISE EXCEPTION 'Order not found.';
  ELSIF order_status <> 'open' THEN
    RAISE EXCEPTION 'This order is already %.', order_status USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(MAX(round_no), 0) + 1 INTO next_round
  FROM public.order_items WHERE order_id = p_order_id;

  UPDATE public.order_items
  SET round_no       = next_round,
      sent_at        = NOW(),
      kitchen_status = 'queued'
  WHERE order_id = p_order_id AND sent_at IS NULL;

  GET DIAGNOSTICS sent_count = ROW_COUNT;

  IF sent_count = 0 THEN
    RAISE EXCEPTION 'There are no new items to send.';
  END IF;

  -- এই রাউন্ডের জন্য ingredient stock কমানো
  UPDATE public.ingredients i
  SET stock_level = i.stock_level - used.total_used
  FROM (
    SELECT mii.ingredient_id, SUM(oi.quantity * mii.quantity_required) AS total_used
    FROM public.order_items oi
    JOIN public.menu_item_ingredients mii ON mii.menu_item_id = oi.menu_item_id
    WHERE oi.order_id = p_order_id AND oi.round_no = next_round
    GROUP BY mii.ingredient_id
  ) AS used
  WHERE i.ingredient_id = used.ingredient_id;

  RETURN next_round;
END;
$$;

REVOKE ALL ON FUNCTION public.send_round_to_kitchen(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_round_to_kitchen(UUID) TO authenticated;


-- =========================================================================
-- ৯. RPC: রাউন্ডের অবস্থা বদল — queued → preparing → ready → served
--    রাঁধুনি (staff) preparing/ready করে; served করে cashier বা staff।
-- =========================================================================
CREATE OR REPLACE FUNCTION public.set_round_kitchen_status(
  p_order_id UUID,
  p_round_no INT,
  p_status   TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status TEXT;
BEGIN
  IF NOT public.has_role('owner', 'manager', 'cashier', 'staff') THEN
    RAISE EXCEPTION 'You are not allowed to update kitchen status.' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('preparing', 'ready', 'served') THEN
    RAISE EXCEPTION 'Unknown kitchen status: %', p_status;
  END IF;

  SELECT MIN(kitchen_status) INTO current_status
  FROM public.order_items
  WHERE order_id = p_order_id AND round_no = p_round_no;

  IF current_status IS NULL THEN
    RAISE EXCEPTION 'That kitchen ticket was not found.';
  END IF;

  -- শুধু সামনে এগোনো যায়, পেছনে নয়
  IF (p_status = 'preparing' AND current_status <> 'queued')
     OR (p_status = 'ready'  AND current_status <> 'preparing')
     OR (p_status = 'served' AND current_status <> 'ready') THEN
    RAISE EXCEPTION 'This ticket is %, it cannot move to %.', current_status, p_status
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.order_items
  SET kitchen_status = p_status
  WHERE order_id = p_order_id AND round_no = p_round_no;
END;
$$;

REVOKE ALL ON FUNCTION public.set_round_kitchen_status(UUID, INT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_round_kitchen_status(UUID, INT, TEXT) TO authenticated;


-- =========================================================================
-- ১০. বিল — চলমান (open) হিসাবের উপর, আর পাঠানো-না-হওয়া আইটেম থাকলে নয়
-- =========================================================================
CREATE OR REPLACE FUNCTION public.bills_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_status    TEXT;
  item_count      INT;
  pending_count   INT;
  after_discount  NUMERIC(12, 2);
BEGIN
  SELECT status INTO order_status FROM public.orders WHERE order_id = NEW.order_id;

  IF order_status IS NULL THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF TG_OP = 'INSERT' AND order_status <> 'open' THEN
    RAISE EXCEPTION 'This order is already %, it cannot be billed again.', order_status;
  END IF;

  SELECT COUNT(*), COALESCE(SUM(subtotal), 0),
         COUNT(*) FILTER (WHERE sent_at IS NULL)
  INTO item_count, NEW.subtotal, pending_count
  FROM public.order_items
  WHERE order_id = NEW.order_id;

  IF item_count = 0 THEN
    RAISE EXCEPTION 'Cannot bill an order with no items.';
  END IF;

  IF pending_count > 0 THEN
    RAISE EXCEPTION 'There are % item(s) not sent to the kitchen yet. Send or remove them before billing.', pending_count
      USING ERRCODE = '42501';
  END IF;

  NEW.discount_amount       := ROUND(NEW.subtotal * NEW.discount_percent / 100, 2);
  after_discount            := NEW.subtotal - NEW.discount_amount;
  NEW.service_charge_amount := ROUND(after_discount * NEW.service_charge_percent / 100, 2);
  NEW.vat_amount            := ROUND((after_discount + NEW.service_charge_amount) * NEW.vat_percent / 100, 2);
  NEW.total_amount          := after_discount + NEW.service_charge_amount + NEW.vat_amount;

  RETURN NEW;
END;
$$;


-- =========================================================================
-- ১১. পুরনো ডেটা মিলিয়ে নেওয়া
--     • টোকেন বসানো
--     • আগের অর্ডারের আইটেমগুলো "পাঠানো ও পরিবেশিত" ধরা হচ্ছে,
--       নাহলে পুরনো অর্ডারের বিল করা যাবে না
-- =========================================================================
WITH numbered AS (
  SELECT order_id,
         ROW_NUMBER() OVER (
           PARTITION BY (created_at AT TIME ZONE 'Asia/Dhaka')::DATE
           ORDER BY created_at
         ) AS seq
  FROM public.orders
  WHERE token_number IS NULL
)
UPDATE public.orders o
SET token_number = numbered.seq
FROM numbered
WHERE o.order_id = numbered.order_id;

-- ⚠️ এই UPDATE টা উপরের trigger এর নিয়মেই আটকে যায় ("settled অর্ডারের
--    আইটেম বদলানো যাবে না")। কিন্তু এটা পুরনো ডেটা ঠিক করার এককালীন কাজ,
--    ব্যবহারকারীর কোনো পরিবর্তন নয়। তাই trigger টা ক্ষণিকের জন্য বন্ধ রেখে
--    কাজ সেরে আবার চালু করা হয় — ভুল হলেও যেন বন্ধ থেকে না যায়, সেজন্য
--    EXCEPTION এ আবার চালু করা হচ্ছে।
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_order_items_before_write'
      AND tgrelid = 'public.order_items'::regclass
  ) THEN
    RAISE NOTICE 'trigger not found — backfill running without disabling it';
  ELSE
    EXECUTE 'ALTER TABLE public.order_items DISABLE TRIGGER trg_order_items_before_write';
  END IF;

  BEGIN
    UPDATE public.order_items oi
    SET round_no       = COALESCE(oi.round_no, 1),
        sent_at        = COALESCE(oi.sent_at, o.created_at),
        kitchen_status = COALESCE(oi.kitchen_status, 'served')
    FROM public.orders o
    WHERE o.order_id = oi.order_id
      AND o.status <> 'open'
      AND oi.sent_at IS NULL;
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'ALTER TABLE public.order_items ENABLE TRIGGER trg_order_items_before_write';
    RAISE;
  END;

  EXECUTE 'ALTER TABLE public.order_items ENABLE TRIGGER trg_order_items_before_write';
END $$;


-- =========================================================================
-- যাচাই
-- =========================================================================
SELECT o.token_number, o.order_type, o.status,
       oi.round_no, oi.kitchen_status, COUNT(*) AS items
FROM public.orders o
LEFT JOIN public.order_items oi ON oi.order_id = o.order_id
GROUP BY o.token_number, o.order_type, o.status, oi.round_no, oi.kitchen_status
ORDER BY o.token_number DESC NULLS LAST
LIMIT 15;
