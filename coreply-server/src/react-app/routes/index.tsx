import { createFileRoute, Navigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { SessionCheckError, SessionSpinner } from "@server/components/session-status";
import { authClient } from "@server/lib/auth-client";
import { CoreplyCloudSignIn } from "coreply-shared-components/src/components/groups/coreply-cloud-sign-in";
import { Trans, useLingui } from "@lingui/react/macro";
export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { t } = useLingui();
  const { data: session, isPending, error, refetch } = authClient.useSession();
  const search = useLocation({ select: (location) => location.searchStr });
  const closeTab = new URLSearchParams(search).get("close_tab") === "true";

  useEffect(() => {
    if (session && closeTab) window.close();
  }, [session, closeTab]);

  if (session && closeTab) {
    return (
      <main className="grid min-h-svh place-items-center bg-background px-6 text-foreground">
        <p role="status"><Trans>Signed in. You can close this tab.</Trans></p>
      </main>
    );
  }
  if (session) return <Navigate to="/usage" replace />;
  if (isPending) return <SessionSpinner />;
  if (error && error.status !== 401) {
    return <SessionCheckError onRetry={() => { void refetch(); }} />;
  }
  return (
    <main className="relative isolate grid min-h-svh grid-rows-[0.8fr_auto_1.2fr] justify-items-center overflow-hidden bg-background px-6 py-16 font-sans text-foreground sm:px-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-1/2 w-[calc(100%-3rem)] max-w-md -translate-x-1/2 border-x border-border/50 sm:w-[calc(100%-6rem)]"
      />
      <section
        aria-label={t`Sign in`}
        className="relative row-start-2 w-full max-w-md before:absolute before:top-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 before:border-t before:border-border/50 after:absolute after:bottom-0 after:left-1/2 after:-z-10 after:w-screen after:-translate-x-1/2 after:border-t after:border-border/50 [&_[role=button]]:shadow-none"
      >
        <CoreplyCloudSignIn configured />
        <div aria-hidden="true" className="pointer-events-none absolute -top-1 -left-1 size-2 border border-primary bg-background" />
        <div aria-hidden="true" className="pointer-events-none absolute -top-1 -right-1 size-2 border border-primary bg-background" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-1 -left-1 size-2 border border-primary bg-background" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-1 -bottom-1 size-2 border border-primary bg-background" />
      </section>
    </main>
  );
}
