import type { User } from "@supabase/supabase-js";

export interface TRPCContext {
  user: User | null;
}
