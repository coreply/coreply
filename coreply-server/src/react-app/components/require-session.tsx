import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { authClient } from "@server/lib/auth-client";
import { Button } from "@server/components/ui/button";

export function RequireSession({ children }: { children: ReactNode }) {
  const { data: session, isPending, error, refetch } = authClient.useSession();
  if (session) return children;
  if (isPending) return <main className="grid min-h-svh place-items-center">Checking your session...</main>;
  if (error && error.status !== 401) {
    return (
      <main className="grid min-h-svh place-content-center gap-4 p-6">
        <p role="alert">Couldn't check your session. Check your connection.</p>
        <Button onClick={() => { void refetch(); }}>Try again</Button>
      </main>
    );
  }
  return <Navigate to="/" replace />;
}
