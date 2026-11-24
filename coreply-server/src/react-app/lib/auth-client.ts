import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

// Same-origin cookies. Better Auth keeps session data on transient fetch errors.
export const authClient = createAuthClient({ plugins: [emailOTPClient()] });
