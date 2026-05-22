-- Performance: add indexes on foreign key columns
CREATE INDEX IF NOT EXISTS idx_api_keys_site_id ON api_keys (site_id);
CREATE INDEX IF NOT EXISTS idx_sessions_site_id ON sessions (site_id);
CREATE INDEX IF NOT EXISTS idx_sites_user_id ON sites (user_id);

-- Security: revoke default Supabase grants on all tables
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON TABLES FROM anon, authenticated;

-- Security: restrict SECURITY DEFINER function execution
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_user_update() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_user_update() TO service_role;
