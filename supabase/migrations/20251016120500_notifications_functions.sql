-- Functions and triggers for activity and deadline notifications

-- Trigger function: when a movement (activity) is inserted, notify creator
create or replace function public.notify_on_movement_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.created_by is null then
    return new;
  end if;

  insert into public.notifications (user_id, title, message, link, type)
  values (
    new.created_by,
    'Nova atividade',
    coalesce(new.description, 'Atividade registrada'),
    '/projects',
    'info'
  );

  return new;
end;
$$;

drop trigger if exists movements_notify_insert on public.movements;
create trigger movements_notify_insert
after insert on public.movements
for each row
execute function public.notify_on_movement_insert();

-- Procedure: generate notifications about upcoming/overdue deadlines
create or replace function public.generate_deadline_notifications(p_user_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Programs nearing deadline (within 7 days)
  insert into public.notifications (user_id, title, message, link, type)
  select p_user_id,
         'Prazo de programa se aproximando',
         'Programa "' || pr.name || '" vence em ' || to_char(pr.deadline, 'DD/MM/YYYY'),
         '/programs',
         'warning'
  from public.programs pr
  where pr.deadline is not null
    and pr.deadline <= (current_date + interval '7 days')
    and pr.deadline >= current_date
    and not exists (
      select 1 from public.notifications n
      where n.user_id = p_user_id
        and n.title = 'Prazo de programa se aproximando'
        and n.message like '%' || pr.name || '%'
        and n.created_at > now() - interval '7 days'
    );

  -- Programs overdue
  insert into public.notifications (user_id, title, message, link, type)
  select p_user_id,
         'Prazo de programa vencido',
         'Programa "' || pr.name || '" venceu em ' || to_char(pr.deadline, 'DD/MM/YYYY'),
         '/programs',
         'error'
  from public.programs pr
  where pr.deadline is not null
    and pr.deadline < current_date
    and not exists (
      select 1 from public.notifications n
      where n.user_id = p_user_id
        and n.title = 'Prazo de programa vencido'
        and n.message like '%' || pr.name || '%'
        and n.created_at > now() - interval '7 days'
    );

  -- Project end_date nearing
  insert into public.notifications (user_id, title, message, link, type)
  select p_user_id,
         'Prazo de término do projeto se aproximando',
         'Projeto "' || coalesce(prj.object, prj.id::text) || '" termina em ' || to_char(prj.end_date, 'DD/MM/YYYY'),
         '/projects',
         'warning'
  from public.projects prj
  where prj.end_date is not null
    and prj.end_date <= (current_date + interval '7 days')
    and prj.end_date >= current_date
    and not exists (
      select 1 from public.notifications n
      where n.user_id = p_user_id
        and n.title = 'Prazo de término do projeto se aproximando'
        and n.message like '%' || coalesce(prj.object, prj.id::text) || '%'
        and n.created_at > now() - interval '7 days'
    );

  -- Project end_date overdue
  insert into public.notifications (user_id, title, message, link, type)
  select p_user_id,
         'Prazo de término do projeto vencido',
         'Projeto "' || coalesce(prj.object, prj.id::text) || '" venceu em ' || to_char(prj.end_date, 'DD/MM/YYYY'),
         '/projects',
         'error'
  from public.projects prj
  where prj.end_date is not null
    and prj.end_date < current_date
    and not exists (
      select 1 from public.notifications n
      where n.user_id = p_user_id
        and n.title = 'Prazo de término do projeto vencido'
        and n.message like '%' || coalesce(prj.object, prj.id::text) || '%'
        and n.created_at > now() - interval '7 days'
    );

  -- Project accountability_date nearing
  insert into public.notifications (user_id, title, message, link, type)
  select p_user_id,
         'Prestação de contas se aproximando',
         'Projeto "' || coalesce(prj.object, prj.id::text) || '" prestação de contas em ' || to_char(prj.accountability_date, 'DD/MM/YYYY'),
         '/projects',
         'warning'
  from public.projects prj
  where prj.accountability_date is not null
    and prj.accountability_date <= (current_date + interval '7 days')
    and prj.accountability_date >= current_date
    and not exists (
      select 1 from public.notifications n
      where n.user_id = p_user_id
        and n.title = 'Prestação de contas se aproximando'
        and n.message like '%' || coalesce(prj.object, prj.id::text) || '%'
        and n.created_at > now() - interval '7 days'
    );

  -- Project accountability_date overdue
  insert into public.notifications (user_id, title, message, link, type)
  select p_user_id,
         'Prestação de contas vencida',
         'Projeto "' || coalesce(prj.object, prj.id::text) || '" prestação de contas venceu em ' || to_char(prj.accountability_date, 'DD/MM/YYYY'),
         '/projects',
         'error'
  from public.projects prj
  where prj.accountability_date is not null
    and prj.accountability_date < current_date
    and not exists (
      select 1 from public.notifications n
      where n.user_id = p_user_id
        and n.title = 'Prestação de contas vencida'
        and n.message like '%' || coalesce(prj.object, prj.id::text) || '%'
        and n.created_at > now() - interval '7 days'
    );

  -- Project document_deadline_date nearing (only when documentation was requested)
  insert into public.notifications (user_id, title, message, link, type)
  select p_user_id,
         'Prazo de documentação se aproximando',
         'Projeto "' || coalesce(prj.object, prj.id::text) || '" prazo de documentação em ' || to_char(prj.document_deadline_date, 'DD/MM/YYYY'),
         '/projects',
         'warning'
  from public.projects prj
  where prj.document_deadline_date is not null
    and prj.status = 'solicitado_documentacao'
    and prj.document_deadline_date <= (current_date + interval '7 days')
    and prj.document_deadline_date >= current_date
    and not exists (
      select 1 from public.notifications n
      where n.user_id = p_user_id
        and n.title = 'Prazo de documentação se aproximando'
        and n.message like '%' || coalesce(prj.object, prj.id::text) || '%'
        and n.created_at > now() - interval '7 days'
    );

  -- Project document_deadline_date overdue (only when documentation was requested)
  insert into public.notifications (user_id, title, message, link, type)
  select p_user_id,
         'Prazo de documentação vencido',
         'Projeto "' || coalesce(prj.object, prj.id::text) || '" prazo de documentação venceu em ' || to_char(prj.document_deadline_date, 'DD/MM/YYYY'),
         '/projects',
         'error'
  from public.projects prj
  where prj.document_deadline_date is not null
    and prj.status = 'solicitado_documentacao'
    and prj.document_deadline_date < current_date
    and not exists (
      select 1 from public.notifications n
      where n.user_id = p_user_id
        and n.title = 'Prazo de documentação vencido'
        and n.message like '%' || coalesce(prj.object, prj.id::text) || '%'
        and n.created_at > now() - interval '7 days'
    );
end;
$$;