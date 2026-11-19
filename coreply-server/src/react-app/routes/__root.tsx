import { Outlet, createRootRoute, useLocation } from "@tanstack/react-router";

import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { TooltipProvider } from "@server/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CloudAuthProvider } from "coreply-shared-components/src/cloud/auth-context";
import { authClient } from "@server/lib/auth-client";

const queryClient = new QueryClient();

import "../styles.css";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const search = useLocation({ select: (location) => location.searchStr });
  const closeTab = new URLSearchParams(search).get("close_tab") === "true";
  const callbackURL = closeTab
    ? "/?close_tab=true"
    : import.meta.env.VITE_COREPLY_CLOUD_CALLBACK_URL || "/";

  return (
    <>
      <TooltipProvider>
        <QueryClientProvider client={queryClient}>
          <CloudAuthProvider
            authClient={authClient}
            callbackURL={callbackURL}
          >
            <Outlet />
          </CloudAuthProvider>
        </QueryClientProvider>
      </TooltipProvider>
      <TanStackDevtools
        config={{
          position: "bottom-right",
        }}
        plugins={[
          {
            name: "TanStack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </>
  );
}
