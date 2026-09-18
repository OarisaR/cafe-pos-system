-- =========================================================================
-- Menu card design এর জন্য menu_items এ দুটো নতুন কলাম        Person 3
--
--   image_url          খাবারের ছবির লিংক (https://...)
--   prep_time_minutes  বানাতে কত মিনিট লাগে
--
-- দুটোই ঐচ্ছিক — খালি থাকলে অ্যাপ category এর icon আর সময় ছাড়া কার্ড দেখায়।
-- এই ফাইল না চালালেও মেনু পেজ কাজ করবে, শুধু ছবি ও সময় সেভ করা যাবে না।
--
-- চালানোর নিয়ম: Supabase → SQL Editor → New query → paste → Run (একবার)
-- আবার চালালেও ক্ষতি নেই। কোনো ডেটা মোছে না।
-- =========================================================================

ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS prep_time_minutes INT;

-- শুধু http(s) লিংক — javascript: বা data: জাতীয় কিছু ঢোকানো যাবে না
ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS menu_items_image_url_check;
ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_image_url_check
  CHECK (image_url IS NULL OR image_url ~* '^https?://');

ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS menu_items_prep_time_check;
ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_prep_time_check
  CHECK (prep_time_minutes IS NULL OR prep_time_minutes BETWEEN 0 AND 600);

-- ডেমো আইটেমগুলোর বানানোর সময়
UPDATE public.menu_items m
SET prep_time_minutes = v.mins
FROM (VALUES
  ('Espresso Double', 3), ('Spanish Latte', 5), ('Caramel Macchiato', 6),
  ('Matcha Green Latte', 5), ('Masala Spiced Chai', 8), ('Butter Croissant', 4),
  ('Fudge Brownie', 4), ('Nitro Cold Brew', 2)
) AS v (name, mins)
WHERE m.name = v.name AND m.prep_time_minutes IS NULL;

-- PostgREST কে নতুন কলাম চিনিয়ে দেওয়া
NOTIFY pgrst, 'reload schema';

SELECT name, prep_time_minutes, image_url FROM public.menu_items ORDER BY name;
