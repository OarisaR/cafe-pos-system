-- =========================================================================
-- ⚠️⚠️  সব অর্ডারের রেকর্ড মুছে ফেলা  ⚠️⚠️
--
-- এটা পরীক্ষার ডেটা পরিষ্কার করার স্ক্রিপ্ট। যা মুছবে:
--     bills        — সব বিল
--     order_items  — সব অর্ডারের আইটেম
--     orders       — সব অর্ডার
--
-- যা মুছবে না:
--     menu_items, menu_categories, ingredients, recipe  (মেনু অক্ষত)
--     profiles, auth.users                              (অ্যাকাউন্ট অক্ষত)
--     restaurant_tables                                 (টেবিল থাকবে, শুধু
--                                                        সব EMPTY হয়ে যাবে)
--
-- 🔴 মোছা ফেরানো যাবে না। চালানোর আগে নিশ্চিত হয়ে নিন।
-- 🔴 ইনগ্রেডিয়েন্টের stock ফেরত আসবে না — অর্ডারে যা খরচ দেখানো হয়েছিল
--    সেটা stock থেকে কমেই আছে। দরকার হলে Inventory পেজ থেকে
--    "Set count" দিয়ে আসল সংখ্যা বসিয়ে নেবেন।
--
-- চালানোর নিয়ম: Supabase → SQL Editor → New query → paste → Run
-- =========================================================================

-- ---- মোছার আগে কী আছে দেখে নিন ----
SELECT 'before' AS stage,
       (SELECT COUNT(*) FROM public.orders)      AS orders,
       (SELECT COUNT(*) FROM public.order_items) AS order_items,
       (SELECT COUNT(*) FROM public.bills)       AS bills;


-- ---- মোছা (সন্তান আগে, পিতা পরে) ----
-- trigger গুলো এই সময় বন্ধ রাখা হয়, নাহলে "settled অর্ডার বদলানো যাবে না"
-- ধরনের নিয়মে এই পরিষ্কার করার কাজটাই আটকে যাবে।
DO $$
BEGIN
  EXECUTE 'ALTER TABLE public.order_items DISABLE TRIGGER USER';
  EXECUTE 'ALTER TABLE public.orders      DISABLE TRIGGER USER';

  BEGIN
    DELETE FROM public.bills;
    DELETE FROM public.order_items;
    DELETE FROM public.orders;
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'ALTER TABLE public.order_items ENABLE TRIGGER USER';
    EXECUTE 'ALTER TABLE public.orders      ENABLE TRIGGER USER';
    RAISE;
  END;

  EXECUTE 'ALTER TABLE public.order_items ENABLE TRIGGER USER';
  EXECUTE 'ALTER TABLE public.orders      ENABLE TRIGGER USER';
END $$;


-- ---- সব টেবিল খালি করে দেওয়া (কোনো অর্ডারই তো আর নেই) ----
UPDATE public.restaurant_tables
SET status = 'empty'
WHERE status <> 'empty';


-- ---- order_number আবার ১০০১ থেকে শুরু করা ----
ALTER TABLE public.orders ALTER COLUMN order_number RESTART WITH 1001;


-- ---- মোছার পর ----
SELECT 'after' AS stage,
       (SELECT COUNT(*) FROM public.orders)      AS orders,
       (SELECT COUNT(*) FROM public.order_items) AS order_items,
       (SELECT COUNT(*) FROM public.bills)       AS bills,
       (SELECT COUNT(*) FROM public.restaurant_tables WHERE status = 'empty') AS empty_tables;
