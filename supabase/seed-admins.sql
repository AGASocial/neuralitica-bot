-- Seed admin user. Safe to run multiple times (no-op if row exists).
insert into public.admins (user_id)
values ('5236a86a-3649-4e6a-838c-cfc7be1d4f7f'::uuid)
on conflict (user_id) do nothing;
