-- Notificações de responsável por tarefa e prazos futuros

-- 1) Função e trigger: dispara notificação quando a tarefa receber/alterar responsável
create or replace function public.notify_task_responsible()
returns trigger
language plpgsql
security definer
as $$
begin
  if (TG_OP = 'INSERT' and NEW.responsible is not null)
     or (TG_OP = 'UPDATE' and NEW.responsible is distinct from OLD.responsible and NEW.responsible is not null) then
    insert into public.notifications (id, user_id, title, message, link, type, created_at)
    values (
      gen_random_uuid(),
      NEW.responsible,
      'Você recebeu uma tarefa',
      coalesce(NEW.title,'Tarefa') || coalesce(' — prazo: ' || to_char(NEW.due_date,'DD/MM'), ''),
      '/tasks',
      'info',
      now()
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_task_responsible on public.user_tasks;
create trigger trg_notify_task_responsible
after insert or update on public.user_tasks
for each row execute function public.notify_task_responsible();

-- 2) Tabela de log para evitar notificações duplicadas no job diário
create table if not exists public.task_notifications_log (
  task_id uuid not null,
  date_key date not null,
  sent_at timestamp with time zone default now(),
  primary key (task_id, date_key)
);

-- 3) Função diária: notifica tarefas com prazo em 3 dias, amanhã e hoje
create or replace function public.notify_upcoming_tasks()
returns void
language plpgsql
security definer
as $$
declare
  v_today date := current_date;
begin
  with candidates as (
    select t.id, t.responsible, t.title, t.due_date::date as d
    from public.user_tasks t
    where t.responsible is not null
      and t.due_date is not null
      and t.due_date::date in (v_today, v_today + 1, v_today + 3)
  ),
  unsent as (
    select c.*
    from candidates c
    left join public.task_notifications_log l
      on l.task_id = c.id and l.date_key = c.d
    where l.task_id is null
  )
  insert into public.notifications(id, user_id, title, message, link, type, created_at)
  select gen_random_uuid(), u.responsible,
         case when u.d = v_today then 'Tarefa vence hoje'
              when u.d = v_today + 1 then 'Tarefa vence amanhã'
              else 'Tarefa vence em 3 dias' end,
         coalesce(u.title, 'Tarefa') || ' — prazo: ' || to_char(u.d, 'DD/MM'),
         '/tasks', 'warning', now()
  from unsent u;

  insert into public.task_notifications_log(task_id, date_key)
  select id, d from unsent on conflict do nothing;
end;
$$;

comment on function public.notify_upcoming_tasks() is 'Executar diariamente via scheduler para avisos de prazos de tarefas (D-3, D-1, D0).';


