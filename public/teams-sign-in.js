// ABOUTME: Redirects the Teams sign-in popup from the tab's domain to the Elefant Teams callback page.
// ABOUTME: That page signs the user in and reports {"token"} back through Teams authentication.notifySuccess.

location.replace("https://elefant.legal/integrations/teams/callback");
