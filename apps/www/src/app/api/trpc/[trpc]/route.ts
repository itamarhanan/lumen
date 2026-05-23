import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { appRouter } from "@/lib/trpc/router";
import type { TRPCContext } from "@/lib/trpc/context";

const handler = async (req: Request) => {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const createContext = (): TRPCContext => ({ user });

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
  });
};

export { handler as GET, handler as POST };
