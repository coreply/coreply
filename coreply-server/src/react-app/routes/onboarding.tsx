import { createFileRoute } from "@tanstack/react-router";
import { DemoConversation } from "coreply-shared-components/src/components/groups/demo-conversation";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

function Onboarding() {
  return (
    <main className="relative isolate grid min-h-svh grid-rows-[0.8fr_auto_1.2fr] justify-items-center overflow-hidden bg-background p-3 font-sans text-foreground sm:p-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-1/2 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 border-x border-border/50 sm:w-[calc(100%-6rem)]"
      />
      <section
        aria-label="Demo conversation"
        className="relative row-start-2 w-full max-w-md before:absolute before:top-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 before:border-t before:border-border/50 after:absolute after:bottom-0 after:left-1/2 after:-z-10 after:w-screen after:-translate-x-1/2 after:border-t after:border-border/50"
      >
        <DemoConversation />
        <div aria-hidden="true" className="pointer-events-none absolute -top-1 -left-1 size-2 border border-primary bg-background" />
        <div aria-hidden="true" className="pointer-events-none absolute -top-1 -right-1 size-2 border border-primary bg-background" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-1 -left-1 size-2 border border-primary bg-background" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-1 -bottom-1 size-2 border border-primary bg-background" />
      </section>
    </main>
  );
}
