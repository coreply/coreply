import { createContext, useContext, type ContextType, type ReactNode } from "react";
import type { createAuthClient } from "better-auth/react";

const CloudAuthContext = createContext<{
  authClient: ReturnType<typeof createAuthClient>;
  callbackURL: string;
} | null>(null);

export function CloudAuthProvider({ authClient, callbackURL, children }: NonNullable<ContextType<typeof CloudAuthContext>> & { children: ReactNode }) {
  return <CloudAuthContext.Provider value={{ authClient, callbackURL }}>{children}</CloudAuthContext.Provider>;
}

export function useCloudAuth() {
  const context = useContext(CloudAuthContext);
  if (!context) throw new Error("CloudAuthProvider is required");
  return context;
}
