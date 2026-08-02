// Entry point referenced by index.html — composition only, real bootstrap
// lives in __main.tsx (template-managed).
import { authClient } from "./lib/auth";

// Complete a returning managed sign-in before rendering routes.
await authClient.managedAuth.handleRedirect();

await import("./__main");
