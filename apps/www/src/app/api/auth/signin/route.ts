import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { provider } = (await request.json()) as {
      provider: "google" | "github";
    };

    if (!["google", "github"].includes(provider)) {
      return Response.json({ error: "Invalid provider" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${new URL(request.url).origin}/api/auth/callback`,
      },
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ url: data.url });
  } catch {
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
