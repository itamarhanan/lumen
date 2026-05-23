import type { User } from "@supabase/supabase-js";
import { SiteSwitcher } from "./site-switcher";
import { UserMenu } from "./user-menu";

interface TopBarProps {
  user: User | null;
}

export function TopBar({ user }: TopBarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <SiteSwitcher />
      <UserMenu email={user?.email ?? null} />
    </header>
  );
}
