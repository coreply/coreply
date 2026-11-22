import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { authClient } from "@server/lib/auth-client";
import { SessionCheckError, SessionSpinner } from "./session-status";

export function RequireSession({ children }: { children: ReactNode }) {
  const { data: session, isPending, error, refetch } = authClient.useSession();
  if (session) return children;
  if (isPending) return <SessionSpinner />;
  if (error && error.status !== 401) {
    return <SessionCheckError onRetry={() => { void refetch(); }} />;
  }
  return <Navigate to="/" replace />;
}
