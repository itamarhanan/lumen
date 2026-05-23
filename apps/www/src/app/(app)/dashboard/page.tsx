import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {user ? (
        <div className="space-y-2 text-center">
          <p className="text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
          </p>
          <p className="text-xs text-muted-foreground">User ID: {user.id}</p>
          <a
            href="/api/auth/signout"
            className="mt-4 inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Sign out
          </a>
        </div>
      ) : (
        <p className="text-muted-foreground">Not authenticated</p>
      )}
    </div>
  );
}
