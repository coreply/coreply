import { Outlet, createRootRoute } from "@tanstack/react-router";

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
  return (
    <>
      <TooltipProvider>
        <QueryClientProvider client={queryClient}>
          <CloudAuthProvider
            authClient={authClient}
            callbackURL={import.meta.env.VITE_COREPLY_CLOUD_CALLBACK_URL || "/"}
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
