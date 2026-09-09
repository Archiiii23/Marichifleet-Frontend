
create policy "tenant read own files" on storage.objects for select to authenticated
using (bucket_id in ('pod-files','compliance-docs') and (storage.foldername(name))[1] = public.current_tenant_id()::text);

create policy "tenant upload own files" on storage.objects for insert to authenticated
with check (bucket_id in ('pod-files','compliance-docs') and (storage.foldername(name))[1] = public.current_tenant_id()::text);

create policy "tenant update own files" on storage.objects for update to authenticated
using (bucket_id in ('pod-files','compliance-docs') and (storage.foldername(name))[1] = public.current_tenant_id()::text);

create policy "tenant delete own files" on storage.objects for delete to authenticated
using (bucket_id in ('pod-files','compliance-docs') and (storage.foldername(name))[1] = public.current_tenant_id()::text);
