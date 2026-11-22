import { Link, createFileRoute } from "@tanstack/react-router";
import { LogInIcon, MessageCircleIcon, PanelLeftIcon, SparklesIcon } from "lucide-react";
import { DemoConversation } from "coreply-shared-components/src/components/groups/demo-conversation";
import { RequireSession } from "@server/components/require-session";
import { authClient } from "@server/lib/auth-client";
import { useState } from "react";
import { Button } from "@server/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@server/components/ui/sidebar";

export const Route = createFileRoute("/demo")({ component: ComponentDemo });

function DemoSidebar() {
  const { data: session } = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  async function signOut() {
    setSigningOut(true);
    setSignOutError(null);
    try {
      const result = await authClient.signOut();
      if (result.error) setSignOutError("Couldn't sign out. Try again.");
    } catch {
      setSignOutError("Couldn't connect to sign out. Try again when online.");
    } finally {
      setSigningOut(false);
    }
  }
  const { setOpenMobile } = useSidebar();
  const closeMobileSidebar = () => setOpenMobile(false);

  return (
    <Sidebar aria-label="Demo navigation">
      <SidebarHeader className="px-4 py-5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to="/demo" />} onClick={closeMobileSidebar}>
              <SparklesIcon aria-hidden="true" />
              <span>Coreply Cloud</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Component demos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive render={<Link to="/demo" aria-current="page" />} onClick={closeMobileSidebar}>
                  <PanelLeftIcon aria-hidden="true" />
                  <span>Sidebar + shared chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link to="/onboarding" />} onClick={closeMobileSidebar}>
                  <MessageCircleIcon aria-hidden="true" />
                  <span>Standalone chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link to="/" />} onClick={closeMobileSidebar}>
                  <LogInIcon aria-hidden="true" />
                  <span>Sign-in preview</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="gap-2 p-5">
        <p className="truncate text-sm">{session?.user.email}</p>
        <Button variant="outline" disabled={signingOut} onClick={signOut}>
          {signingOut ? "Signing out..." : "Sign out"}
        </Button>
        {signOutError && <p role="alert" className="text-xs text-destructive">{signOutError}</p>}
        <p className="text-sm font-medium">One shared theme</p>
        <p className="text-xs leading-5 text-muted-foreground">
          shadcn navigation and React Native chat, using the same Coreply colors and font.
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}

function ComponentDemo() {
  return (
    <RequireSession>
    <SidebarProvider>
      <DemoSidebar />
      <SidebarInset className="min-w-0">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-3 sm:px-6">
          <SidebarTrigger />
          <p className="text-sm font-medium">Component preview</p>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-3 sm:px-8 sm:py-12">
          <div className="flex w-full max-w-xl flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">A conversation with Coreply</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Tap a suggestion to add the next word, or hold it to insert the full reply.
            </p>
          </div>
          <section aria-label="Shared demo conversation" className="w-full max-w-xl">
            <DemoConversation chooseThemes />
          </section>
          <p className="w-full max-w-xl text-xs leading-5 text-muted-foreground">
            This is the same chat component used in the app. Replies are local demo suggestions, not live AI responses.
          </p>
        </div>
      </SidebarInset>
    </SidebarProvider>
    </RequireSession>
  );
}
