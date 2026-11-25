import { createFileRoute, Navigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LanguageSwitcher, ThemeToggle } from "@server/components/display-preferences";
import { SessionCheckError, SessionSpinner } from "@server/components/session-status";
import { Button } from "@server/components/ui/button";
import { authClient } from "@server/lib/auth-client";
import { CoreplyCloudSignIn } from "coreply-shared-components/src/components/groups/coreply-cloud-sign-in";
import { Trans, useLingui } from "@lingui/react/macro";
export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { t } = useLingui();
  const { data: session, isPending, error, refetch } = authClient.useSession();
  const [sessionChecked, setSessionChecked] = useState(false);
  const search = useLocation({ select: (location) => location.searchStr });
  const closeTab = new URLSearchParams(search).get("close_tab") === "true";

  useEffect(() => {
    if (!isPending) setSessionChecked(true);
  }, [isPending]);

  useEffect(() => {
    if (session && closeTab) window.close();
  }, [session, closeTab]);

  if (session && closeTab) {
    return (
      <main className="grid min-h-svh place-items-center bg-background px-3 text-foreground sm:px-6">
        <p role="status"><Trans>Signed in. You can close this tab.</Trans></p>
      </main>
    );
  }
  if (session) return <Navigate to="/usage" replace />;
  if (!sessionChecked) return <SessionSpinner />;
  return (
    <main className="relative isolate grid min-h-svh grid-rows-[0.8fr_auto_1.2fr] justify-items-center overflow-hidden bg-background p-3 font-sans text-foreground sm:px-12 sm:py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-1/2 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 border-x border-border/50 sm:w-[calc(100%-6rem)]"
      />
      <section
        aria-label={t`Sign in`}
        className="relative row-start-2 w-full max-w-md before:absolute before:top-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 before:border-t before:border-border/50 after:absolute after:bottom-0 after:left-1/2 after:-z-10 after:w-screen after:-translate-x-1/2 after:border-t after:border-border/50 [&_[role=button]]:shadow-none"
      >
        {error && error.status !== 401 && (
          <SessionCheckError onRetry={() => { void refetch(); }} />
        )}
        <CoreplyCloudSignIn configured authClient={authClient} />
        <div aria-hidden="true" className="pointer-events-none absolute -top-1 -left-1 size-2 border border-primary bg-background" />
        <div aria-hidden="true" className="pointer-events-none absolute -top-1 -right-1 size-2 border border-primary bg-background" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-1 -left-1 size-2 border border-primary bg-background" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-1 -bottom-1 size-2 border border-primary bg-background" />
      </section>
      <div className="row-start-3 flex w-full max-w-md items-center gap-1 self-start pl-1 pt-2">
        <ThemeToggle />
        <LanguageSwitcher trigger={<Button variant="ghost" />} align="start" side="bottom" />
      </div>
    </main>
  );
}
