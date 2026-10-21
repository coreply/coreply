import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@server/lib/auth-client";
import { RequireSession } from "./require-session";
import { Button } from "./ui/button";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "./ui/sidebar";

function CloudSidebar() {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const signOut = useMutation({
    mutationFn: async () => {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message ?? "Couldn't sign out. Please try again.");
    },
    onSuccess: async () => {
      await queryClient.cancelQueries({ queryKey: ["billing"] });
      queryClient.removeQueries({ queryKey: ["billing"] });
    },
  });
  return <Sidebar aria-label="Cloud navigation">
    <SidebarHeader className="px-5 py-6"><span className="text-lg font-semibold">Coreply Cloud</span></SidebarHeader>
    <SidebarContent className="px-3 py-4"><SidebarMenu>
      {([{ to: "/usage", label: "Usage" }, { to: "/billing", label: "Billing" }] as const).map(({ to, label }) =>
        <SidebarMenuItem key={to}><SidebarMenuButton isActive={pathname === to} render={<Link to={to} aria-current={pathname === to ? "page" : undefined} />} onClick={() => setOpenMobile(false)}>{label}</SidebarMenuButton></SidebarMenuItem>
      )}
    </SidebarMenu></SidebarContent>
    <SidebarFooter className="gap-3 p-5">
      <p className="truncate text-sm text-muted-foreground">{session?.user.email}</p>
      <Button variant="outline" onClick={() => signOut.mutate()} disabled={signOut.isPending}>{signOut.isPending ? "Signing out..." : "Sign out"}</Button>
      {signOut.error && <p role="alert" className="text-sm text-destructive">{signOut.error.message}</p>}
    </SidebarFooter>
  </Sidebar>;
}

export function CloudLayout({ title, children }: { title: string; children: ReactNode }) {
  return <RequireSession><SidebarProvider><CloudSidebar /><SidebarInset>
    <header className="flex h-16 items-center gap-3 border-b px-6"><SidebarTrigger /><span className="text-sm text-muted-foreground">Coreply Cloud / {title}</span></header>
    <main className="mx-auto w-full max-w-4xl space-y-8 px-6 py-10 sm:px-10"><h1 className="text-3xl font-semibold tracking-tight">{title}</h1>{children}</main>
  </SidebarInset></SidebarProvider></RequireSession>;
}
