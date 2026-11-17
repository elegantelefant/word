// ABOUTME: Redirects the Teams sign-in popup from the tab's domain to the Elefant Teams callback page.
// ABOUTME: That page reports {"token"} through Teams authentication.notifySuccess; its origin is SIGN_IN_ORIGIN in scripts/teams-package.mjs.

location.replace("https://elefant.legal/integrations/teams/callback");
