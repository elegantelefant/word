# Deploying Elefant for your organisation

This guide is for IT administrators who want to make Elefant available to Word users across a firm. If you are installing Elefant for yourself, see [User installation](../README.md#user-installation) in the README.

## Overview

Elefant Legal Assistant is a Microsoft Word task-pane add-in for reviewing legal documents. It is a web application served from `https://addin.elefant.legal/` and loaded inside Word through Office.js.

| | |
|---|---|
| Manifest URL | <https://addin.elefant.legal/manifest.xml> |
| Add-in name | Elefant Legal Assistant |
| Publisher (`ProviderName`) | Elegant Elephant Pte Ltd |
| Host application | Word only (`<Host Name="Document"/>`) |
| Permission requested | `ReadWriteDocument`, Microsoft's "read/write document" permission level |
| `<Requirements>` element | None. The manifest does not declare minimum Office API requirement sets. |
| Ribbon button | **Open Elefant**, in an **Elefant** group on the **Home** tab |

The manifest declares no minimum Office version. Before deploying, check Microsoft's requirements against the Office versions your firm runs: [Determine if centralized deployment of Office Add-ins works for your organization](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/centralized-deployment-of-add-ins).

## Option 1 (recommended): Microsoft 365 admin centre

Centralised deployment pushes Elefant to the users and groups you choose. Users don't need to install anything themselves.

1. Sign in to the Microsoft 365 admin centre.
2. Go to **Settings → Integrated apps**, then select the **Add-ins** link.
3. Select **Deploy Add-in**, then **Next**.
4. Choose to upload a custom add-in. Either choose the manifest file (download it from <https://addin.elefant.legal/manifest-download.xml>), or provide its URL: `https://addin.elefant.legal/manifest.xml`. Then select **Upload**.
5. Choose who gets the add-in: **Everyone**, **Specific users/groups**, or **Just me**.
6. Select **Deploy**.

We recommend choosing **Just me** first to test. Then roll out in phases, assigning the add-in by group.

Once deployed:

- **Timing:** users may need to relaunch Word. Microsoft says add-ins can take 24–72 hours to appear on the ribbon.
- **Account:** Deployment assigns Elefant to accounts in your organisation, so users need to be signed in to Office with their work account.

Microsoft's guide: [Manage deployment of add-ins in the Microsoft 365 admin center](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/manage-deployment-of-add-ins).

## Option 2: shared-folder catalogue (Windows only)

This suits small offices or testing. Each user's copy of Word is pointed at a network share that contains the manifest. Your organisation's policy may block individual installs like this, which Option 1 avoids.

### Step 1: Make a shared folder

1. Create a folder, for example `C:\ElefantAddin`.
2. Download <https://addin.elefant.legal/manifest-download.xml> and save it in that folder. If your browser shows the file's text instead of saving it, press Ctrl+S and save it as manifest.xml.
3. Right-click the folder, choose **Properties**, open the **Sharing** tab, select **Share…**, then **Share**.
4. Note the folder's network path, for example `\\COMPUTERNAME\ElefantAddin`.

### Step 2: Add the catalogue in Word (on each computer)

1. In Word, go to **File → Options → Trust Center → Trust Center Settings → Trusted Add-in Catalogs**.
2. Paste the network path into **Catalog Url**, then select **Add catalog**.
3. Tick **Show in Menu**, then select **OK**.
4. Quit Word completely and open it again.

### Step 3: Add Elefant

1. Open a document.
2. On the **Home** tab, select **Add-ins → More Add-ins**.
3. Select **SHARED FOLDER**, choose **Elefant Legal Assistant**, then select **Add**.

## Network requirements

Allow these domains for the add-in to work. They are taken from the add-in's Content Security Policy and source code:

| Domain | Used for |
|---|---|
| `addin.elefant.legal` | The add-in itself: the task-pane app, its scripts, icons and the manifest |
| `elefant.legal` | Elefant account services (the Elefant API) and the support pages |
| `generativelanguage.googleapis.com` | Google Gemini, which runs free reviews with the user's own API key |
| `appsforoffice.microsoft.com` | Office.js, Microsoft's add-in library, which the task pane loads |

The following were **observed during sign-in testing**. This is not a complete list:

- `accounts.google.com`
- Cloudflare's verification check

Word itself also needs Microsoft 365's standard network endpoints.

## Data and privacy

### Free reviews (the user's own Gemini API key)

The user's Gemini API key and the document text go directly from Word to Google Gemini (`generativelanguage.googleapis.com`). They do not pass through Elefant's servers. The add-in's Settings screen tells users:

> Stored in this browser. When you run a free review, your API key and document content are sent to Google Gemini.
>
> Outside the EEA, Switzerland and UK, Google uses prompts and responses sent with unpaid keys to improve its products, and human reviewers may read them (Gemini API terms). Use a paid-tier key for client work.

The Gemini API terms are at <https://ai.google.dev/gemini-api/terms>.

The add-in stores the key locally, in the add-in's browser storage on that user's computer. For Word on the web, that is the user's own browser.

If your firm does not want document text sent to Google, blocking `generativelanguage.googleapis.com` stops free reviews from running.

### Elefant accounts

Signing in to an Elefant account is coming soon.

## Updating and removing the add-in

### Option 1: Microsoft 365 admin centre

- **Updating:** Elefant's own code is served from `addin.elefant.legal`, so improvements reach users without redeploying. Only manifest changes need an update. Microsoft states that an uploaded manifest must be re-uploaded to pick up manifest changes: select the add-in, then **Update**.
- **Removing:** In **Settings → Integrated apps → Add-ins**, select Elefant Legal Assistant to change who it's assigned to, or remove it. See Microsoft's guide: [Manage add-ins in the Microsoft 365 admin center](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/manage-addins-in-the-admin-center).

### Option 2: shared-folder catalogue

- **Updating:** Elefant's own code is served from `addin.elefant.legal`, so improvements reach users automatically. For manifest changes, replace `manifest.xml` in the shared folder and have users restart Word.
- **Removing:** on each computer, go to **File → Options → Trust Center → Trust Center Settings → Trusted Add-in Catalogs**. Select the Elefant folder, choose **Remove**, select **OK**, and restart Word. You can then delete the shared folder.

## Support

<https://elefant.legal/resources/support>
