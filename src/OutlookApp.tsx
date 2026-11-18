// ABOUTME: Outlook task pane root: the shared providers and header, with the mail actions in place of Word's tabs.
// ABOUTME: Points the shared panels at the open message through the mail host.

import { Layout } from "./components/Layout";
import { Providers } from "./components/Providers";
import { MailPanel } from "./components/panels/MailPanel";
import { HostContext } from "./store/host";
import { MAIL_HOST } from "./lib/mailbox";

export function OutlookApp() {
  return (
    <HostContext value={MAIL_HOST}>
      <Providers>
        {(openSettings) => (
          <Layout onSettingsClick={openSettings}>
            <MailPanel />
          </Layout>
        )}
      </Providers>
    </HostContext>
  );
}
