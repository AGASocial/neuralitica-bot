-- Seed default app_settings (single-row). Safe to run multiple times (upsert).
insert into public.app_settings (id, system_instructions)
values (
  1,
  'Extrae la información sólo de los archivos disponbles.
No inventes información
Responde en Markdown
Responde en el mismo idioma que te escriben
Si vas a realizar cálculos matemáticos por favor valida bien antes de dar la respuesta'
)
on conflict (id) do update set
  system_instructions = excluded.system_instructions,
  updated_at = now();
