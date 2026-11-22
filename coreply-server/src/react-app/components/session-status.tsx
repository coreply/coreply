import { Trans } from "@lingui/react/macro";
import { LoaderCircle } from "lucide-react";
import { Button } from "@server/components/ui/button";

export function SessionSpinner() {
  return (
    <main className="grid min-h-svh place-items-center bg-background text-foreground">
      <div role="status">
        <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
        <span className="sr-only"><Trans>Checking your session...</Trans></span>
      </div>
    </main>
  );
}

export function SessionCheckError({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="grid min-h-svh place-content-center gap-4 p-6">
      <p role="alert">Couldn't check your session. Check your connection.</p>
      <Button onClick={onRetry}>Try again</Button>
    </main>
  );
}
