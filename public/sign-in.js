// ABOUTME: Redirects the Office sign-in dialog from the pane's domain to the Elefant callback page.
// ABOUTME: Passes this page's origin as `parent` so the callback can target its messages back to the pane.

location.replace(
  "https://elefant.legal/integrations/word/callback?parent=" + encodeURIComponent(location.origin),
);
