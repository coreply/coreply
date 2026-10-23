import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChartNoAxesCombinedIcon, CreditCardIcon } from "lucide-react";
import { authClient } from "@server/lib/auth-client";
import { RequireSession } from "./require-session";
import { EllipsisVerticalIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "./ui/sidebar";

function CloudSidebar() {
  const { pathname } = useLocation();
  const { setOpenMobile, isMobile } = useSidebar();
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const signOut = useMutation({
    mutationFn: async () => {
      const result = await authClient.signOut();
      if (result.error)
        throw new Error(
          result.error.message ?? "Couldn't sign out. Please try again.",
        );
    },
    onSuccess: async () => {
      await queryClient.cancelQueries({ queryKey: ["billing"] });
      queryClient.removeQueries({ queryKey: ["billing"] });
    },
  });
  return (
    <Sidebar aria-label="Cloud navigation">
      <SidebarHeader className="px-3 py-3">
        <div className="flex items-center gap-1">
          <img
            src="/coreply-icon.png"
            alt=""
            className="size-9 scale-150 object-cover dark:brightness-0 dark:invert"
          />
          <span className="text-2xl font-bold">Coreply <span className="font-light">Cloud</span></span>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 py-4">
        <SidebarMenu>
          {(
            [
              { to: "/usage", label: "Usage", icon: ChartNoAxesCombinedIcon },
              { to: "/billing", label: "Billing", icon: CreditCardIcon },
            ] as const
          ).map(({ to, label, icon: Icon }) => (
            <SidebarMenuItem key={to}>
              <SidebarMenuButton
                isActive={pathname === to}
                render={
                  <Link
                    to={to}
                    aria-current={pathname === to ? "page" : undefined}
                  />
                }
                onClick={() => setOpenMobile(false)}
              >
                <Icon aria-hidden="true" />
                {label}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="gap-3 p-5">
        {session && <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<SidebarMenuButton size="lg" />}
                disabled={signOut.isPending}
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              >
                <Avatar className="rounded-lg grayscale">
                  <AvatarImage src={session.user.image ?? undefined} alt={session.user.name} />
                  <AvatarFallback className="rounded-lg">{session.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{session.user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{session.user.email}</span>
                </div>
                <EllipsisVerticalIcon className="ml-auto" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side={isMobile ? "bottom" : "top"}>
                <DropdownMenuItem onClick={() => signOut.mutate()}>
                  {signOut.isPending ? "Signing out..." : "Log out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>}
        {signOut.error && (
          <p role="alert" className="text-sm text-destructive">
            {signOut.error.message}
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

export function CloudLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <RequireSession>
      <SidebarProvider>
        <CloudSidebar />
        <SidebarInset>
          <header className="flex h-16 items-center gap-3 border-b px-6">
            <SidebarTrigger />
            <h1 className="text-xl font-medium tracking-tight">{title}</h1>
          </header>
          <main className="mx-auto w-full max-w-4xl space-y-8 px-6 py-10 sm:px-10">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </RequireSession>
  );
}
