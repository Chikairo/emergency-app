import { createAuthClient } from "better-auth/react";

// Client for sign-in/sign-up forms. Same-origin /api/auth endpoints.
export const authClient = createAuthClient();
