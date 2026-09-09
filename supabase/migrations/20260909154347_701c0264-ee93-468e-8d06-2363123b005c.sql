
revoke execute on function public.current_tenant_id() from public, anon;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.has_any_role(public.app_role[]) from public, anon;
revoke execute on function public.current_driver_id() from public, anon;
revoke execute on function public.current_client_id() from public, anon;
revoke execute on function public.recalc_invoice_totals() from public, anon, authenticated;
revoke execute on function public.set_document_status() from public, anon, authenticated;
revoke execute on function public.bootstrap_tenant(text) from public, anon;

grant execute on function public.current_tenant_id() to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.has_any_role(public.app_role[]) to authenticated;
grant execute on function public.current_driver_id() to authenticated;
grant execute on function public.current_client_id() to authenticated;
grant execute on function public.bootstrap_tenant(text) to authenticated;
