# Installing Elefant in Microsoft Word

This guide walks you through adding Elefant to Microsoft Word, step by step. You don't need any technical knowledge.

## Before you start

Today, you use Elefant **free, with your own Gemini API key**. You get a key from Google and paste it into Elefant. Your document is reviewed by Google Gemini.

**Coming soon:** signing in to an Elefant account, which will unlock **Clauses** and **Mammoth**.

**If your firm's IT team manages Office for you, ask them to deploy Elefant for you instead of installing it yourself.** It is quicker, and it avoids settings your firm may have switched off.

Pick the section below that matches the version of Word you use:

- [Word on the web](#word-on-the-web)
- [Word for Mac](#word-for-mac)
- [Word for Windows](#word-for-windows)

## Word on the web

1. Download the Elefant file: <https://addin.elefant.legal/manifest.xml>. Save it to your computer. Don't open it in Word.
2. Open a document in Word on the web.
3. On the **Home** tab, select **Add-ins**, then **More Add-ins**.
4. Select **My Add-ins**, then **Manage My Add-ins**, then **Upload My Add-in**.
5. Select **Browse**, choose the `manifest.xml` file you saved, then select **Upload**.

Elefant now appears in Word.

**Don't see an upload option?** Your organisation has turned it off. Contact your IT team.

## Word for Mac

Word for Mac has no upload option, so you place the Elefant file in a special folder instead.

1. Download the Elefant file: <https://addin.elefant.legal/manifest.xml>.

   > **Don't double-click the downloaded file.** Word will open it as a document. If that happens, close it without saving.

2. Open **Finder** and press **Cmd+Shift+G**.
3. Paste this location and press Return:

   ```
   ~/Library/Containers/com.microsoft.Word/Data/Documents/wef
   ```

   If Finder says the folder doesn't exist, go to `~/Library/Containers/com.microsoft.Word/Data/Documents` instead and create a new folder there named `wef`.

4. Copy `manifest.xml` into the `wef` folder.
5. Quit Word completely (**Word → Quit Word**, or Cmd+Q), then open it again.
6. Open a document, then select **Add-ins → My Add-ins → Developer Add-ins → Elefant**.

After you open Elefant for the first time, an **Open Elefant** button appears on the **Home** tab. Use it next time.

## Word for Windows

On Windows, you put the Elefant file in a shared folder and tell Word where to find it.

### Step 1: Make a shared folder

1. Create a folder on your computer, for example `C:\ElefantAddin`.
2. Download the Elefant file (<https://addin.elefant.legal/manifest.xml>) and save it in that folder.
3. Right-click the folder, choose **Properties**, open the **Sharing** tab, select **Share…**, then **Share**.
4. Note the folder's network path. It looks like `\\COMPUTERNAME\ElefantAddin`, where `COMPUTERNAME` is the name of your computer.

If Windows won't let you share a folder, ask your IT team to deploy Elefant instead.

### Step 2: Tell Word about the folder

1. In Word, go to **File → Options → Trust Center → Trust Center Settings → Trusted Add-in Catalogs**.
2. Paste the network path into **Catalog Url**, then select **Add catalog**.
3. Tick **Show in Menu**, then select **OK**.
4. Quit Word completely and open it again.

### Step 3: Add Elefant

1. Open a document.
2. On the **Home** tab, select **Add-ins → More Add-ins**.
3. Select **SHARED FOLDER**, choose **Elefant Legal Assistant**, then select **Add**.

**Using Word LTSC?** These editions don't offer **Upload My Add-in**, so the shared folder above is the way to go. If you can't share a folder on your computer, ask your IT team to deploy Elefant for you.

## First use

### Free: with your own Gemini API key

1. Open Elefant. Select the gear icon (**Settings**) at the top right.
2. Under **API Key (BYOK)**, paste your Gemini API key. You can get a free key from [Google AI Studio](https://aistudio.google.com/apikey).

   Elefant's Settings screen explains what happens to your key and your document:

   > Stored in this browser. When you run a free review, your API key and document content are sent to Google Gemini.
   >
   > Outside the EEA, Switzerland and UK, Google uses prompts and responses sent with unpaid keys to improve its products, and human reviewers may read them (Gemini API terms). Use a paid-tier key for client work.

   The Gemini API terms are at <https://ai.google.dev/gemini-api/terms>.

3. Close Settings and select some text in your document.
4. Choose **Selection** to review just that text, or **Full Document** to review the whole document.
5. Select **Review Document**.

Always check Elefant's suggestions before you rely on them or insert them into your document.

### Signing in to an Elefant account

Signing in to an Elefant account is coming soon. Until then, use Elefant free with your own Gemini API key, as described above.

## Troubleshooting

**Elefant doesn't appear in Word.**

- Quit Word completely and open it again. Closing the document window is not enough.
- **Mac:** check the folder path is exactly `~/Library/Containers/com.microsoft.Word/Data/Documents/wef`, and that `manifest.xml` is inside `wef`.
- **Windows:** in **Trusted Add-in Catalogs**, check that **Show in Menu** is ticked for your folder.

**Word says add-ins have been disabled.**
Your organisation has turned add-ins off. Contact your IT team.

## Removing Elefant

- **Word on the web:** select **Add-ins → More Add-ins → My Add-ins**, find Elefant, open its menu (**…**) and choose **Remove**.
- **Word for Mac:** quit Word, delete `manifest.xml` from `~/Library/Containers/com.microsoft.Word/Data/Documents/wef`, then open Word again.
- **Word for Windows:** go to **File → Options → Trust Center → Trust Center Settings → Trusted Add-in Catalogs**, select your Elefant folder, choose **Remove**, then select **OK** and restart Word. You can then delete the shared folder.

## Support

Need help? Visit <https://elefant.legal/resources/support>.
