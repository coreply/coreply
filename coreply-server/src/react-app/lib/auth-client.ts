import { createAuthClient } from "better-auth/react";

// Same-origin cookies. Better Auth keeps session data on transient fetch errors.
export const authClient = createAuthClient();
