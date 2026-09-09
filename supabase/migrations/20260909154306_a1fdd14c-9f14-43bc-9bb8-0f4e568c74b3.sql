
-- ===== enums =====
create type public.app_role as enum ('owner','manager','dispatcher','driver','accountant','workshop','viewer','client');

-- ===== core tenancy =====
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null default 'India',
  currency text not null default 'INR',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  city text not null,
  lat double precision not null default 0,
  lng double precision not null default 0,
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  segment text not null default 'Manufacturer',
  contact_name text,
  phone text,
  email text,
  city text,
  gstin text,
  credit_days integer not null default 30,
  rate_per_km numeric(10,2) not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key,
  tenant_id uuid references public.tenants(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  title text,
  driver_id uuid,
  client_id uuid references public.clients(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  tenant_id uuid references public.tenants(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- ===== helpers (security definer, bypass RLS) =====
create or replace function public.current_tenant_id()
returns uuid language sql stable security definer set search_path = public as $$
  select tenant_id from public.profiles where id = auth.uid()
$$;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.has_any_role(_roles public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = any(_roles))
$$;

create or replace function public.current_driver_id()
returns uuid language sql stable security definer set search_path = public as $$
  select driver_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_client_id()
returns uuid language sql stable security definer set search_path = public as $$
  select client_id from public.profiles where id = auth.uid()
$$;

-- ===== fleet =====
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  reg_no text not null,
  make text,
  type text not null default 'Truck',
  capacity_tons numeric(8,2) not null default 0,
  status text not null default 'available',
  odometer_km integer not null default 0,
  fuel_pct integer not null default 100,
  lat double precision not null default 0,
  lng double precision not null default 0,
  speed_kph integer not null default 0,
  last_ping_at timestamptz,
  current_trip_id uuid,
  service_due_km integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  user_id uuid,
  name text not null,
  phone text,
  licence_no text,
  licence_expiry date,
  status text not null default 'available',
  rating numeric(3,2) not null default 4.5,
  trips_completed integer not null default 0,
  assigned_vehicle_id uuid references public.vehicles(id) on delete set null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles add constraint profiles_driver_fk foreign key (driver_id) references public.drivers(id) on delete set null;

create table public.rate_cards (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  vehicle_type text not null,
  per_km numeric(10,2) not null default 0,
  min_charge numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ===== operations =====
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  ref text not null,
  client_id uuid not null references public.clients(id) on delete restrict,
  status text not null default 'draft',
  pickup jsonb not null default '{}'::jsonb,
  drop_off jsonb not null default '{}'::jsonb,
  distance_km numeric(10,2) not null default 0,
  cargo text,
  weight_tons numeric(8,2) not null default 0,
  vehicle_type text not null default 'Truck',
  priority text not null default 'standard',
  rate numeric(12,2) not null default 0,
  pickup_at timestamptz,
  notes text,
  trip_id uuid,
  invoice_id uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  ref text not null,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  driver_id uuid references public.drivers(id) on delete set null,
  status text not null default 'planned',
  checkpoints jsonb not null default '[]'::jsonb,
  progress numeric(5,2) not null default 0,
  eta_at timestamptz,
  delay_mins integer not null default 0,
  started_at timestamptz,
  delivered_at timestamptz,
  route jsonb not null default '[]'::jsonb,
  pod_id uuid,
  revenue numeric(12,2) not null default 0,
  fuel_cost numeric(12,2) not null default 0,
  toll_cost numeric(12,2) not null default 0,
  driver_cost numeric(12,2) not null default 0,
  exception jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings add constraint bookings_trip_fk foreign key (trip_id) references public.trips(id) on delete set null;
alter table public.vehicles add constraint vehicles_trip_fk foreign key (current_trip_id) references public.trips(id) on delete set null;

create table public.gps_pings (
  id bigserial primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  speed_kph integer not null default 0,
  heading integer not null default 0,
  source text not null default 'mock',
  recorded_at timestamptz not null default now()
);
create index gps_pings_vehicle_idx on public.gps_pings (vehicle_id, recorded_at desc);

create table public.pods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  receiver_name text not null,
  otp text,
  photo_note text,
  signature_seed text,
  file_path text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.trips add constraint trips_pod_fk foreign key (pod_id) references public.pods(id) on delete set null;

-- ===== finance =====
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  number text not null,
  client_id uuid not null references public.clients(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete set null,
  trip_id uuid references public.trips(id) on delete set null,
  pod_id uuid references public.pods(id) on delete set null,
  status text not null default 'draft',
  subtotal numeric(14,2) not null default 0,
  tax_pct numeric(5,2) not null default 18,
  tax_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  balance numeric(14,2) generated always as (total - amount_paid) stored,
  issue_date date not null default current_date,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings add constraint bookings_invoice_fk foreign key (invoice_id) references public.invoices(id) on delete set null;

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  qty numeric(10,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  amount numeric(14,2) not null default 0
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  amount numeric(14,2) not null,
  method text not null default 'bank_transfer',
  reference text,
  status text not null default 'received',
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.fuel_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete set null,
  driver_id uuid references public.drivers(id) on delete set null,
  litres numeric(10,2) not null,
  amount numeric(12,2) not null,
  odometer_km integer not null default 0,
  station text,
  filled_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ===== workshop / supply =====
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  category text not null default 'Workshop',
  phone text,
  city text,
  rating numeric(3,2) not null default 4,
  created_at timestamptz not null default now()
);

create table public.spare_parts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  sku text,
  stock_qty integer not null default 0,
  min_qty integer not null default 0,
  unit_cost numeric(12,2) not null default 0,
  vendor_id uuid references public.vendors(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.job_cards (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete set null,
  status text not null default 'reported',
  issue text not null,
  parts jsonb not null default '[]'::jsonb,
  cost numeric(12,2) not null default 0,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner_type text not null,
  owner_id uuid not null,
  doc_type text not null,
  doc_number text,
  issue_date date,
  expiry_date date,
  file_path text,
  status text not null default 'valid',
  created_at timestamptz not null default now()
);

-- ===== comms / audit =====
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  event text not null,
  recipient text not null,
  recipient_user_id uuid,
  channel text not null default 'whatsapp',
  template text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  failure_reason text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  read_at timestamptz
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid,
  actor_name text,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ===== grants + RLS (generic tenant read for every tenant-scoped table) =====
do $$
declare t text;
  tabs text[] := array['tenants','branches','clients','vehicles','drivers','rate_cards','bookings','trips',
    'gps_pings','pods','invoices','invoice_lines','payments','fuel_logs','vendors','spare_parts','job_cards',
    'documents','notifications','audit_logs','profiles','user_roles'];
begin
  foreach t in array tabs loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

grant usage, select on sequence public.gps_pings_id_seq to authenticated;
grant all on sequence public.gps_pings_id_seq to service_role;

-- tenants / profiles / roles
create policy "tenant read own" on public.tenants for select to authenticated using (id = public.current_tenant_id());
create policy "tenant create" on public.tenants for insert to authenticated with check (true);
create policy "tenant update by owner" on public.tenants for update to authenticated using (id = public.current_tenant_id() and public.has_any_role(array['owner','manager']::public.app_role[]));

create policy "profile self read" on public.profiles for select to authenticated using (id = auth.uid() or tenant_id = public.current_tenant_id());
create policy "profile self insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profile self update" on public.profiles for update to authenticated using (id = auth.uid() or (tenant_id = public.current_tenant_id() and public.has_any_role(array['owner','manager']::public.app_role[])));

create policy "roles read" on public.user_roles for select to authenticated using (user_id = auth.uid() or tenant_id = public.current_tenant_id());
create policy "roles self bootstrap" on public.user_roles for insert to authenticated with check (user_id = auth.uid() or (tenant_id = public.current_tenant_id() and public.has_any_role(array['owner']::public.app_role[])));
create policy "roles owner manage" on public.user_roles for update to authenticated using (tenant_id = public.current_tenant_id() and public.has_any_role(array['owner']::public.app_role[]));
create policy "roles owner delete" on public.user_roles for delete to authenticated using (tenant_id = public.current_tenant_id() and public.has_any_role(array['owner']::public.app_role[]));

-- generic tenant-scoped read + role-scoped write
do $$
declare t text; roles text;
  spec jsonb := '{
    "branches":"owner,manager",
    "clients":"owner,manager,dispatcher",
    "rate_cards":"owner,manager,accountant",
    "vehicles":"owner,manager,workshop,dispatcher",
    "drivers":"owner,manager,workshop,dispatcher",
    "bookings":"owner,manager,dispatcher",
    "trips":"owner,manager,dispatcher,driver",
    "gps_pings":"owner,manager,dispatcher,driver",
    "pods":"owner,manager,dispatcher,driver",
    "invoices":"owner,manager,accountant",
    "invoice_lines":"owner,manager,accountant",
    "payments":"owner,manager,accountant",
    "fuel_logs":"owner,manager,accountant,driver,workshop",
    "vendors":"owner,manager,workshop",
    "spare_parts":"owner,manager,workshop",
    "job_cards":"owner,manager,workshop",
    "documents":"owner,manager,workshop",
    "notifications":"owner,manager,dispatcher,accountant,workshop,driver",
    "audit_logs":"owner,manager,dispatcher,accountant,workshop,driver"
  }'::jsonb;
begin
  for t, roles in select key, value #>> '{}' from jsonb_each(spec) loop
    execute format('create policy "tenant read" on public.%I for select to authenticated using (tenant_id = public.current_tenant_id())', t);
    execute format('create policy "tenant insert" on public.%I for insert to authenticated with check (tenant_id = public.current_tenant_id() and public.has_any_role(array[%s]::public.app_role[]))', t, (select string_agg(quote_literal(r), ',') from unnest(string_to_array(roles, ',')) r));
    execute format('create policy "tenant update" on public.%I for update to authenticated using (tenant_id = public.current_tenant_id() and public.has_any_role(array[%s]::public.app_role[]))', t, (select string_agg(quote_literal(r), ',') from unnest(string_to_array(roles, ',')) r));
    execute format('create policy "tenant delete" on public.%I for delete to authenticated using (tenant_id = public.current_tenant_id() and public.has_any_role(array[''owner'',''manager'']::public.app_role[]))', t);
  end loop;
end $$;

-- invoice balance maintenance from payments
create or replace function public.recalc_invoice_totals()
returns trigger language plpgsql security definer set search_path = public as $$
declare inv uuid; paid numeric; tot numeric;
begin
  inv := coalesce(new.invoice_id, old.invoice_id);
  select coalesce(sum(amount),0) into paid from public.payments where invoice_id = inv and status <> 'failed';
  select total into tot from public.invoices where id = inv;
  update public.invoices
     set amount_paid = paid,
         status = case
           when status = 'cancelled' then 'cancelled'
           when paid >= tot and tot > 0 then 'paid'
           when paid > 0 then 'partially_paid'
           else status end,
         updated_at = now()
   where id = inv;
  return null;
end $$;

create trigger payments_recalc after insert or update or delete on public.payments
for each row execute function public.recalc_invoice_totals();

-- document status derivation
create or replace function public.set_document_status()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.expiry_date is null then new.status := 'valid';
  elsif new.expiry_date < current_date then new.status := 'expired';
  elsif new.expiry_date < current_date + 30 then new.status := 'expiring';
  else new.status := 'valid';
  end if;
  return new;
end $$;

create trigger documents_status before insert or update on public.documents
for each row execute function public.set_document_status();

-- tenant bootstrap for new sign-ups
create or replace function public.bootstrap_tenant(_company_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare existing uuid; new_tenant uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select tenant_id into existing from public.profiles where id = auth.uid();
  if existing is not null then return existing; end if;

  insert into public.tenants (name) values (coalesce(nullif(_company_name,''), 'My Fleet')) returning id into new_tenant;
  insert into public.profiles (id, tenant_id, full_name, email)
  values (auth.uid(), new_tenant,
          coalesce((auth.jwt() -> 'user_metadata' ->> 'full_name'), split_part(coalesce(auth.jwt() ->> 'email',''), '@', 1)),
          auth.jwt() ->> 'email')
  on conflict (id) do update set tenant_id = excluded.tenant_id;
  insert into public.user_roles (user_id, tenant_id, role) values (auth.uid(), new_tenant, 'owner')
  on conflict (user_id, role) do nothing;
  return new_tenant;
end $$;

grant execute on function public.bootstrap_tenant(text) to authenticated;

-- realtime
alter publication supabase_realtime add table public.gps_pings;
alter publication supabase_realtime add table public.trips;
alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.notifications;
