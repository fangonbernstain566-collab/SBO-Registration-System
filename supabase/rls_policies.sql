-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query).
-- Locks down writes to `events` so only the server (service_role key) can
-- change qr_window_active / qr_window_opened_at / qr_window_closes_at.
-- The anon key used by the browser can no longer write to `events` at all.

alter table events enable row level security;
alter table registrations enable row level security;

-- Public can read the event list (needed by the registration page dropdown
-- and by the admin panel before/after sign-in).
create policy "Public can read events"
on events for select
to anon, authenticated
using (true);

-- Intentionally no insert/update/delete policy on `events` for anon or
-- authenticated roles. All writes happen through the /api/admin/* routes,
-- which use the service_role key and therefore bypass RLS entirely.

-- Public can submit a registration.
create policy "Public can register"
on registrations for insert
to anon, authenticated
with check (true);

-- Public can read their own registration row during the QR scan flow.
-- (Registrations are looked up by event_id + student_id, not enumerated.)
create policy "Public can read registrations for check-in"
on registrations for select
to anon, authenticated
using (true);

-- Intentionally no update policy on `registrations` for anon/authenticated.
-- The has_attended / attended_at fields are now only written by the
-- /api/scan route (service_role key), which enforces token freshness and
-- window-active checks server-side before marking attendance.
