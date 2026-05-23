import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  const { origin } = new URL(request.url);
  return NextResponse.redirect(new URL("/login", origin));
}
