alter table billing_cycles add column opening_date date;

update billing_cycles
set opening_date = closing_date - interval '29 days'
where opening_date is null;

alter table billing_cycles alter column opening_date set not null;
