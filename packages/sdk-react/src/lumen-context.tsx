import { createContext, useContext, useEffect, useCallback, useState, type ReactNode } from 'react';
import type { LumenClient, EventProperties } from '@lumen/sdk';

const LumenContext = createContext<LumenClient | null>(null);

export function LumenProvider({
  client,
  children,
}: {
  client: LumenClient;
  children: ReactNode;
}) {
  useEffect(() => () => client.destroy(), [client]);

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

export function useIdentify() {
  const client = useLumen();
  const [isIdentifying, setIsIdentifying] = useState(false);

  const identify = useCallback(
    (personId: string, properties?: EventProperties) => {
      setIsIdentifying(true);
      try {
        client.identify(personId, properties);
      } finally {
        setIsIdentifying(false);
      }
    },
    [client],
  );

  return { identify, isIdentifying };
}

export function useSetPersonProperties() {
  const client = useLumen();
  const [isSetting, setIsSetting] = useState(false);

  const setProperties = useCallback(
    (properties: EventProperties) => {
      setIsSetting(true);
      try {
        client.setPersonProperties(properties);
      } finally {
        setIsSetting(false);
      }
    },
    [client],
  );

  return { setProperties, isSetting };
}
