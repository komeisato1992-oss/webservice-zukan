-- Phase 1 管理者登録用ヘルパー
-- 1. Supabase Authentication でユーザーを作成（Email）
-- 2. 下記 SQL の :user_id / :email を置き換えて実行

-- insert into public.admin_users (id, email, display_name, is_active)
-- values (
--   '<auth.users の uuid>',
--   '<同じメールアドレス>',
--   'Admin',
--   true
-- );

-- 既存 auth ユーザーをメールで追加する例:
-- insert into public.admin_users (id, email, display_name, is_active)
-- select id, email, split_part(email, '@', 1), true
-- from auth.users
-- where email = 'your-admin@example.com'
-- on conflict (id) do update set is_active = true, email = excluded.email;
