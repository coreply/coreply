import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpenIcon, ChartNoAxesCombinedIcon, CreditCardIcon, GlobeIcon, UserIcon } from "lucide-react";
import { Trans, useLingui } from "@lingui/react/macro";
import { setLocale } from "@server/i18n";
import { locales } from "@server/i18n/locales";
import { authClient } from "@server/lib/auth-client";
import { RequireSession } from "./require-session";
import { EllipsisVerticalIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Classic } from "./ui/classic";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "./ui/sidebar";

function ThemeToggle() {
  const { t } = useLingui();
  const [dark, setDark] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "dark" || (savedTheme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });
  useEffect(() => {
    const preference = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) setDark(event.matches);
    };
    preference.addEventListener("change", onChange);
    return () => preference.removeEventListener("change", onChange);
  }, []);
  return (
    <Classic
      toggled={dark}
      onClick={() => {
        const nextTheme = dark ? "light" : "dark";
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(nextTheme);
        localStorage.setItem("theme", nextTheme);
        setDark(!dark);
      }}
      aria-label={t({ message: "Dark mode", comment: "Toggle for the site's dark color theme" })}
      title={t({ message: "Dark mode", comment: "Toggle for the site's dark color theme" })}
      className="flex size-8 shrink-0 items-center justify-center rounded-md text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
    />
  );
}

function CloudSidebar() {
  const { i18n, t } = useLingui();
  const { pathname } = useLocation();
  const { setOpenMobile, isMobile } = useSidebar();
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const signOut = useMutation({
    mutationFn: async () => {
      const result = await authClient.signOut();
      if (result.error)
        throw new Error(
          result.error.message ?? t`Couldn't sign out. Please try again.`,
        );
    },
    onSuccess: async () => {
      await queryClient.cancelQueries({ queryKey: ["billing"] });
      queryClient.removeQueries({ queryKey: ["billing"] });
    },
  });
  return (
    <Sidebar aria-label={t({ message: "Cloud navigation", comment: "Accessible label for the Cloud sidebar navigation" })}>
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
              { to: "/usage", label: t({ message: "Usage", comment: "Cloud usage page title and sidebar link" }), icon: ChartNoAxesCombinedIcon },
              { to: "/billing", label: t({ message: "Billing", comment: "Cloud subscription and payments page title and sidebar link" }), icon: CreditCardIcon },
              { to: "/account", label: t({ message: "Account", comment: "Cloud account settings page and sidebar link" }), icon: UserIcon },
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
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<a href="https://docs.coreply.app" />}>
                  <BookOpenIcon aria-hidden="true" />
                  <Trans comment="Sidebar link to Coreply documentation">Docs</Trans>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<SidebarMenuButton />}
                    aria-label={t({ message: "Language", comment: "Sidebar menu for changing the display language" })}
                  >
                    <GlobeIcon aria-hidden="true" />
                    {locales.find(({ id }) => id === i18n.locale)?.name}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" side={isMobile ? "bottom" : "top"}>
                    <DropdownMenuGroup>
                      {locales.map(({ id, name }) => (
                        <DropdownMenuCheckboxItem key={id} checked={i18n.locale === id} onClick={() => setLocale(id)}>
                          {name}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {session && <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<SidebarMenuButton size="lg" />}
                disabled={signOut.isPending}
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              >
                <Avatar className="grayscale">
                  <AvatarImage src={session.user.image ?? undefined} alt={session.user.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground">{Array.from(session.user.name)[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{session.user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{session.user.email}</span>
                </div>
                <EllipsisVerticalIcon className="ml-auto" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side={isMobile ? "bottom" : "top"}>
                <DropdownMenuItem onClick={() => signOut.mutate()}>
                  {signOut.isPending ? t`Signing out...` : t({ message: "Log out", comment: "Account menu action to sign out of Coreply Cloud" })}
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
            <div className="ml-auto"><ThemeToggle /></div>
          </header>
          <main className="mx-auto w-full max-w-4xl space-y-8 px-6 py-10 sm:px-10">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </RequireSession>
  );
}
