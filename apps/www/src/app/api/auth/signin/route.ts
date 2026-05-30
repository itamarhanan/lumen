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

    const requestOrigin = new URL(request.url).origin;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${requestOrigin}/api/auth/callback`,
      },
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    if (!data.url) {
      return Response.json({ error: "No OAuth URL returned" }, { status: 500 });
    }

    const hostname = new URL(request.url).hostname;
    const url = data.url.replace(/localhost|127\.0\.0\.1/g, hostname);

    return Response.json({ url });
  } catch {
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
