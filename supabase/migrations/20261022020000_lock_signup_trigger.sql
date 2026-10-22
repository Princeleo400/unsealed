-- Security advisor fix: the sign-up trigger function should not be callable through the public API.
-- Triggers still fire normally; only direct calls via /rest/v1/rpc/handle_new_user are blocked.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
