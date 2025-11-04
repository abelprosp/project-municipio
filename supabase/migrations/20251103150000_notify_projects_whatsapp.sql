-- Função para listar mensagens de WhatsApp sobre projetos

create or replace function public.notify_projects_whatsapp()
returns setof text
language plpgsql
security definer
as $$
declare
  v_today date := current_date;
  rec record;
  msg text;
begin
  -- Em análise / Em complementação
  for rec in
    select p.id, p.object, p.year, p.status
    from public.projects p
    where p.status in ('em_analise','em_complementacao')
  loop
    msg := format('Projeto: %s (%s) — status: %s', coalesce(rec.object,'—'), coalesce(rec.year::text,'—'), rec.status);
    return next msg;
  end loop;

  -- Vigência a vencer (60 dias)
  for rec in
    select p.id, p.object, p.end_date
    from public.projects p
    where p.end_date is not null
      and p.end_date::date = (v_today + 60)
  loop
    msg := format('Vigência: %s vence em 60 dias (data: %s)', coalesce(rec.object,'—'), to_char(rec.end_date,'DD/MM/YYYY'));
    return next msg;
  end loop;
end;
$$;

comment on function public.notify_projects_whatsapp() is 'Retorna mensagens de WhatsApp para projetos em análise/complementação e com vigência a 60 dias.';

-- Log simples para envios (opcional, usar numa Edge Function)
create table if not exists public.whatsapp_notifications_log (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  channel text default 'whatsapp',
  sent_to text,
  sent_at timestamp with time zone default now()
);


