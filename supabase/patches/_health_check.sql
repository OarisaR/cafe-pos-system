-- =========================================================================
-- HEALTH CHECK — কোন patch চালানো আছে আর কোনটা নেই
--
-- এটা কিছুই বদলায় না, শুধু পড়ে। Supabase → SQL Editor এ পুরোটা পেস্ট
-- করে Run দিন। "installed" কলামে false দেখলে ডান পাশের ফাইলটা চালান।
-- =========================================================================
SELECT * FROM (
  VALUES
    (1, 'Auth & profiles',
        (to_regclass('public.profiles') IS NOT NULL),
        'supabase_setup.sql'),

    (2, 'POS tables (menu, orders, bills)',
        (to_regclass('public.orders') IS NOT NULL
         AND to_regclass('public.bills') IS NOT NULL),
        'supabase_pos_schema.sql'),

    (3, 'Security hardening',
        EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role'),
        'patches/supabase_fix_security.sql'),

    (4, 'Menu card fields (image, prep time)',
        EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'menu_items'
                  AND column_name = 'prep_time_minutes'),
        'patches/supabase_menu_card_fields.sql'),

    (5, 'Pay-last order flow (token, rounds, kitchen)',
        EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'send_round_to_kitchen')
        AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'orders'
                      AND column_name = 'token_number'),
        'patches/supabase_order_flow.sql'),

    (6, 'Permission groups (saved on the server)',
        (to_regclass('public.permission_groups') IS NOT NULL),
        'patches/supabase_permission_groups.sql'),

    (7, 'Cancellation requests',
        (to_regclass('public.order_cancellation_requests') IS NOT NULL),
        'patches/supabase_order_cancellations.sql'),

    (8, 'Stock can never go negative',
        EXISTS (SELECT 1 FROM pg_constraint
                WHERE conname = 'ingredients_stock_not_negative'),
        'patches/supabase_stock_guard.sql'),

    (9, 'Menu availability view (auto out-of-stock)',
        (to_regclass('public.menu_item_availability') IS NOT NULL),
        'patches/supabase_stock_guard.sql'),

    (10, 'Kitchen send checks stock first',
        EXISTS (SELECT 1 FROM pg_proc p
                WHERE p.proname = 'send_round_to_kitchen'
                  AND pg_get_functiondef(p.oid) LIKE '%Not enough stock%'),
        'patches/supabase_stock_guard.sql')
) AS t(step, piece, installed, run_this_file)
ORDER BY step;


-- =========================================================================
-- এখন কোনো উপকরণ ঋণাত্মক আছে কিনা (থাকলে stock guard এখনো চালানো হয়নি)
-- =========================================================================
SELECT name, stock_level, unit, restock_threshold
FROM public.ingredients
WHERE stock_level <= restock_threshold
ORDER BY stock_level;
