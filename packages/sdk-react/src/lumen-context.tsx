import { createContext, useContext, type ReactNode } from 'react';
import type { LumenClient } from '@lumen/sdk';

const LumenContext = createContext<LumenClient | null>(null);

export function LumenProvider({
  client,
  children,
}: {
  client: LumenClient;
  children: ReactNode;
}) {
  return (
    <LumenContext.Provider value={client}>
      {children}
    </LumenContext.Provider>
  );
}

export function useLumen(): LumenClient {
  const ctx = useContext(LumenContext);
  if (!ctx) throw new Error('useLumen must be used within <LumenProvider>');
  return ctx;
}
