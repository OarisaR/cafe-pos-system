-- =========================================================================
-- PATCH: স্টক ঋণাত্মক হওয়া বন্ধ + যে আইটেম বানানোর মতো উপকরণ নেই
--        সেটা নিজে থেকেই "out of stock" হয়ে যাওয়া
--
-- কেন দরকার:
--   send_round_to_kitchen() কোনো যাচাই ছাড়াই stock কমিয়ে দিত। তাই দুধ
--   ১০০ ml থাকলেও ৫ কাপ ল্যাটে পাঠানো যেত, আর stock_level হয়ে যেত −৪০০।
--
-- এই patch যা করে:
--   ১. ইতিমধ্যে ঋণাত্মক হয়ে যাওয়া stock কে ০ করে দেয় (একবারের মেরামত)
--   ২. stock_level < 0 আর কখনোই সেভ হতে দেয় না (CHECK constraint)
--   ৩. menu_item_availability — কোন আইটেম কয়টা বানানো যাবে, কোন উপকরণ
--      শেষ বা কমে আসছে; cashier ও এটা পড়তে পারে (ingredients টেবিল সে
--      পড়তে পারে না, কিন্তু এই view এ দাম/খরচ কিছুই নেই — শুধু নাম ও সংখ্যা)
--   ৪. send_round_to_kitchen() — পাঠানোর আগেই হিসাব মিলিয়ে দেখে, না
--      মিললে কোন উপকরণ কতটা কম সেটা লিখে দিয়ে পুরো রাউন্ডটাই আটকে দেয়
--
-- একবার চালালেই হবে। আবার চালালেও কোনো ক্ষতি নেই (idempotent)।
-- =========================================================================


-- =========================================================================
-- ধাপ ১ + ২. ঋণাত্মক stock মেরামত, তারপর দরজা বন্ধ
-- =========================================================================
DO $$
DECLARE
  fixed_rows INT;
BEGIN
  UPDATE public.ingredients
  SET stock_level = 0,
      updated_at  = NOW()
  WHERE stock_level < 0;

  GET DIAGNOSTICS fixed_rows = ROW_COUNT;

  IF fixed_rows > 0 THEN
    RAISE NOTICE 'Repaired % ingredient(s) that had gone below zero — set to 0. Restock them.', fixed_rows;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ingredients_stock_not_negative'
      AND conrelid = 'public.ingredients'::regclass
  ) THEN
    ALTER TABLE public.ingredients
      ADD CONSTRAINT ingredients_stock_not_negative CHECK (stock_level >= 0);
  END IF;
END;
$$;


-- =========================================================================
-- ধাপ ৩. menu_item_availability
--
--   max_servings      = এই মুহূর্তে কয়টা বানানো যাবে (recipe না থাকলে NULL)
--   in_stock          = অন্তত একটা বানানো যায় কিনা
--   is_sellable       = in_stock, আর আইটেমটা ম্যানুয়ালি বন্ধও করা নেই
--   short_ingredients = যেগুলোর জন্য একটাও বানানো যাচ্ছে না
--   low_ingredients   = যেগুলো দিয়ে এখনো চলছে, কিন্তু সীমার নিচে নেমে গেছে
--
-- ⚠️ ইচ্ছাকৃতভাবে security_invoker দেওয়া হয়নি। ingredients টেবিলটা
--    cashier পড়তে পারে না, অথচ কাউন্টারে বসে তারই জানা দরকার কোন আইটেম
--    এখন বানানো যাবে না। এই view এ cost_per_unit বা stock_level কিছুই নেই
--    — শুধু নাম আর সংখ্যা, তাই এটা ফাঁস করার মতো কিছু নয়।
-- =========================================================================
DROP VIEW IF EXISTS public.menu_item_availability;

CREATE VIEW public.menu_item_availability AS
WITH per_item AS (
  SELECT
    mi.menu_item_id,
    mi.name                                  AS menu_item_name,
    mi.status,
    COUNT(mii.ingredient_id)                 AS recipe_lines,
    MIN(FLOOR(i.stock_level / mii.quantity_required)) AS servings,
    ARRAY_REMOVE(
      ARRAY_AGG(CASE WHEN i.stock_level < mii.quantity_required THEN i.name END),
      NULL
    ) AS short_ingredients,
    ARRAY_REMOVE(
      ARRAY_AGG(CASE
        WHEN i.stock_level >= mii.quantity_required
         AND i.stock_level <= i.restock_threshold
        THEN i.name
      END),
      NULL
    ) AS low_ingredients
  FROM public.menu_items mi
  LEFT JOIN public.menu_item_ingredients mii ON mii.menu_item_id = mi.menu_item_id
  LEFT JOIN public.ingredients i             ON i.ingredient_id  = mii.ingredient_id
  GROUP BY mi.menu_item_id, mi.name, mi.status
)
SELECT
  menu_item_id,
  menu_item_name,
  status,
  recipe_lines,
  -- recipe বসানো না থাকলে স্টক দিয়ে বিচার করা যায় না → NULL মানে "সীমা নেই"
  CASE WHEN recipe_lines = 0 THEN NULL
       ELSE GREATEST(servings, 0)::INT END                        AS max_servings,
  (recipe_lines = 0 OR COALESCE(servings, 0) >= 1)                AS in_stock,
  (status = 'available'
    AND (recipe_lines = 0 OR COALESCE(servings, 0) >= 1))         AS is_sellable,
  short_ingredients,
  low_ingredients
FROM per_item;

REVOKE ALL ON public.menu_item_availability FROM PUBLIC, anon;
GRANT SELECT ON public.menu_item_availability TO authenticated;


-- =========================================================================
-- ধাপ ৪. send_round_to_kitchen — পাঠানোর আগেই হিসাব মিলিয়ে দেখা
--
-- আগের সংস্করণের সাথে পার্থক্য শুধু একটাই: stock কমানোর আগে একটা
-- pre-flight check. কম পড়লে ব্যতিক্রম, আর পুরো transaction ফিরে যায় —
-- অর্ধেক রাউন্ড পাঠানো হয় না।
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
  short_list   TEXT;
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

  -- ---- pre-flight: এই রাউন্ডে যা লাগবে, তা আছে তো? ----
  -- এখনো পাঠানো হয়নি এমন লাইনগুলোই এই রাউন্ডে যাবে।
  -- ingredient সারি লক করা হয় যাতে দুই কাউন্টার একসাথে একই স্টক
  -- খরচ করে ফেলতে না পারে।
  PERFORM 1
  FROM public.ingredients i
  WHERE i.ingredient_id IN (
    SELECT mii.ingredient_id
    FROM public.order_items oi
    JOIN public.menu_item_ingredients mii ON mii.menu_item_id = oi.menu_item_id
    WHERE oi.order_id = p_order_id AND oi.sent_at IS NULL
  )
  ORDER BY i.ingredient_id
  FOR UPDATE;

  SELECT string_agg(
           format('%s (need %s %s, have %s %s)',
                  s.name, TRIM(TO_CHAR(s.needed, 'FM999999990.999')), s.unit,
                  TRIM(TO_CHAR(s.have, 'FM999999990.999')), s.unit),
           ', ' ORDER BY s.name)
  INTO short_list
  FROM (
    SELECT i.name,
           i.unit,
           i.stock_level                              AS have,
           SUM(oi.quantity * mii.quantity_required)   AS needed
    FROM public.order_items oi
    JOIN public.menu_item_ingredients mii ON mii.menu_item_id = oi.menu_item_id
    JOIN public.ingredients i             ON i.ingredient_id  = mii.ingredient_id
    WHERE oi.order_id = p_order_id AND oi.sent_at IS NULL
    GROUP BY i.ingredient_id, i.name, i.unit, i.stock_level
    HAVING SUM(oi.quantity * mii.quantity_required) > i.stock_level
  ) AS s;

  IF short_list IS NOT NULL THEN
    RAISE EXCEPTION 'Not enough stock to cook this order: %. Restock first, or remove those items.', short_list
      USING ERRCODE = '23514';
  END IF;

  -- ---- এবার রাউন্ড নম্বর বসিয়ে রান্নাঘরে পাঠানো ----
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

  -- ---- এই রাউন্ডের ingredient stock কমানো ----
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
-- যাচাই — এই দুটো চালিয়ে দেখে নিতে পারেন
-- =========================================================================
-- SELECT menu_item_name, max_servings, in_stock, short_ingredients, low_ingredients
-- FROM public.menu_item_availability
-- ORDER BY in_stock, menu_item_name;
--
-- SELECT name, stock_level, restock_threshold FROM public.ingredients
-- WHERE stock_level <= restock_threshold ORDER BY stock_level;
