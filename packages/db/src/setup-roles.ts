import postgres from "postgres";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function setup() {
  console.log("Creating database roles...");
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'lumen_api') THEN
        CREATE ROLE lumen_api WITH LOGIN PASSWORD 'lumen_api';
      END IF;
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'lumen_processor') THEN
        CREATE ROLE lumen_processor WITH LOGIN PASSWORD 'lumen_processor';
      END IF;
    END
    $$;
  `);

  console.log("Granting schema usage...");
  await db.execute(sql`GRANT USAGE ON SCHEMA public TO lumen_api, lumen_processor`);
  await db.execute(sql`GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO lumen_api`);
  await db.execute(sql`GRANT SELECT, INSERT, UPDATE ON sessions TO lumen_processor`);

  console.log("Enabling RLS on all tables...");
  for (const table of ["users", "sites", "api_keys", "sessions"]) {
    await db.execute(sql`ALTER TABLE ${sql.identifier(table)} ENABLE ROW LEVEL SECURITY`);
  }

  console.log("Creating RLS policies for lumen_api...");

  await db.execute(sql`DROP POLICY IF EXISTS api_select_users ON users`);
  await db.execute(sql`
    CREATE POLICY "api_select_users" ON users FOR SELECT TO lumen_api
    USING (id = nullif(current_setting('app.current_user_id', true), '')::uuid)
  `);

  await db.execute(sql`DROP POLICY IF EXISTS api_select_sites ON sites`);
  await db.execute(sql`
    CREATE POLICY "api_select_sites" ON sites FOR SELECT TO lumen_api
    USING (user_id = nullif(current_setting('app.current_user_id', true), '')::uuid)
  `);

  await db.execute(sql`DROP POLICY IF EXISTS api_select_api_keys ON api_keys`);
  await db.execute(sql`
    CREATE POLICY "api_select_api_keys" ON api_keys FOR SELECT TO lumen_api
    USING (site_id IN (
      SELECT id FROM sites
      WHERE user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
    ))
  `);

  await db.execute(sql`DROP POLICY IF EXISTS api_select_sessions ON sessions`);
  await db.execute(sql`
    CREATE POLICY "api_select_sessions" ON sessions FOR SELECT TO lumen_api
    USING (site_id IN (
      SELECT id FROM sites
      WHERE user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
    ))
  `);

  console.log("Creating RLS policy for lumen_processor...");
  await db.execute(sql`DROP POLICY IF EXISTS processor_all_sessions ON sessions`);
  await db.execute(sql`
    CREATE POLICY "processor_all_sessions" ON sessions FOR ALL TO lumen_processor
    USING (true) WITH CHECK (true)
  `);

  console.log("Creating auth sync triggers...");

  await db.execute(sql`
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    BEGIN
      INSERT INTO public.users (id, email, name)
      VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
      RETURN NEW;
    END;
    $$;
  `);

  await db.execute(sql`
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users
  `);

  await db.execute(sql`
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()
  `);

  await db.execute(sql`
    CREATE OR REPLACE FUNCTION public.handle_user_update()
    RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    BEGIN
      UPDATE public.users
      SET email = NEW.email,
          name = COALESCE(NEW.raw_user_meta_data->>'full_name', public.users.name),
          updated_at = NOW()
      WHERE id = NEW.id;
      RETURN NEW;
    END;
    $$;
  `);

  await db.execute(sql`
    DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users
  `);

  await db.execute(sql`
    CREATE TRIGGER on_auth_user_updated
      AFTER UPDATE ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_user_update()
  `);

  console.log("✅ RLS setup complete");
  await client.end();
}

setup().catch((err) => {
  console.error("❌ RLS setup failed:", err);
  process.exit(1);
});
