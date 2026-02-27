-- Seed user_profiles. Safe to run multiple times (upsert by id).
insert into public.user_profiles (id, email, full_name, role, is_active, created_at, subscription_expires_at)
values
  (
    '5236a86a-3649-4e6a-838c-cfc7be1d4f7f'::uuid,
    'byagasocial@gmail.com',
    'AGA Social',
    'ADMIN',
    true,
    '2025-09-28 18:12:04.068383+00'::timestamptz,
    null
  ),
  (
    'ad707f07-abaa-4842-963c-06c1008f6bdc'::uuid,
    'vegahoffmann@gmail.com',
    'Gabriel Vega',
    'USER',
    true,
    '2025-11-07 15:07:19.026246+00'::timestamptz,
    '2025-12-07 06:00:00+00'::timestamptz
  ),
  (
    'de13cd80-bf4d-448c-9490-d9436a828883'::uuid,
    'gaveho@gmail.com',
    'Gabriel Vega',
    'USER',
    true,
    '2025-11-17 15:46:28.013128+00'::timestamptz,
    null
  )
on conflict (id) do update set
  email = excluded.email,
  full_name = excluded.full_name,
  role = excluded.role,
  is_active = excluded.is_active,
  subscription_expires_at = excluded.subscription_expires_at;
