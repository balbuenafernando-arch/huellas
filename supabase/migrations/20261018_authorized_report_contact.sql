-- Allow an authenticated requester to read a report's private contact only
-- after the report owner has explicitly authorized that request.

drop policy if exists "report_private_contacts_select_owner" on public.report_private_contacts;
drop policy if exists "report_private_contacts_select_owner_or_authorized_requester" on public.report_private_contacts;

create policy "report_private_contacts_select_owner_or_authorized_requester"
on public.report_private_contacts
for select
to authenticated
using (
  auth.uid() = owner_id
  or exists (
    select 1
    from public.contact_requests request
    where request.report_id = report_private_contacts.report_id
      and request.owner_id = report_private_contacts.owner_id
      and request.requester_id = auth.uid()
      and request.status = 'autorizada'
  )
);
