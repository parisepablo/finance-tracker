create table billing_cycles (
  id uuid primary key default gen_random_uuid(),
  credit_card_id uuid references credit_cards(id) on delete cascade not null,
  closing_date date not null,
  due_date date not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz default now()
);

alter table billing_cycles enable row level security;

create policy "Users can manage own billing cycles"
  on billing_cycles for all
  using (
    auth.uid() = (
      select user_id from credit_cards where id = billing_cycles.credit_card_id
    )
  )
  with check (
    auth.uid() = (
      select user_id from credit_cards where id = billing_cycles.credit_card_id
    )
  );

-- Drop old columns
alter table credit_cards drop column if exists closing_day;
alter table credit_cards drop column if exists due_day;

-- Seed initial open billing cycles for existing cards
-- closing_date = today + 30 days, adjusted to previous weekday
-- due_date = closing_date + 9 weekdays

do $$
declare
  card_rec record;
  raw_closing date;
  actual_closing date;
  actual_due date;
  days_added int;
  dow int;
begin
  for card_rec in select id from credit_cards loop
    -- closing_date = today + 30 days
    raw_closing := current_date + interval '30 days';

    -- Adjust to previous weekday if Saturday or Sunday
    dow := extract(dow from raw_closing);
    if dow = 6 then -- Saturday
      actual_closing := raw_closing - interval '1 day';
    elsif dow = 0 then -- Sunday
      actual_closing := raw_closing - interval '2 days';
    else
      actual_closing := raw_closing;
    end if;

    -- due_date = closing_date + 9 weekdays (skip weekends)
    actual_due := actual_closing;
    days_added := 0;
    while days_added < 9 loop
      actual_due := actual_due + interval '1 day';
      dow := extract(dow from actual_due);
      if dow <> 0 and dow <> 6 then -- not Sunday or Saturday
        days_added := days_added + 1;
      end if;
    end loop;

    insert into billing_cycles (credit_card_id, closing_date, due_date, status)
    values (card_rec.id, actual_closing, actual_due, 'open');
  end loop;
end $$;
