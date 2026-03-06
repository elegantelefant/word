# Elefant Word Add-in — Installation Guide

> **No admin rights, no App Store, no coding required.**
> Install in under 2 minutes on any platform.

---

## Option A: Word Online (Recommended — Free, Simplest)

Works in any browser. No software to install.

### Steps

1. **Download the manifest file**
   → [Click here to download manifest.xml](https://elefant-word-245916757771.us-central1.run.app/manifest.xml)
   *(Save it somewhere you can find it, e.g. Downloads)*

2. **Open Word Online**
   → Go to [word.new](https://word.new) or [office.com](https://office.com) and open any document

3. **Upload the add-in**
   - Click **Home** tab in the ribbon
   - Click **Add-ins** (on the right side of the ribbon)
   - Click **Upload My Add-in** (bottom-left of the dialog)
   - Click **Browse**, select the `manifest.xml` file you downloaded
   - Click **Upload**

4. **Done!**
   The Elefant panel appears on the right side of your document.
   You'll see the **Open Elefant** button in the Home tab from now on.

---

## Option B: Word Desktop (Mac)

### Steps

1. **Download the installer**
   → [Click here to download the Mac installer](https://elefant-word-245916757771.us-central1.run.app/install-mac.command)

2. **Run the installer**
   - Find the downloaded `install-mac.command` file (usually in Downloads)
   - Double-click it
   - If macOS asks "Are you sure?", click **Open**
   - The Terminal window will show "Done!" and close

3. **Restart Word**
   - Quit Word completely (Cmd+Q)
   - Reopen Word

4. **Open the add-in**
   - Click **Home** tab → **Open Elefant** button in the ribbon
   - The Elefant panel appears on the right

### Manual alternative

If you prefer not to run the installer script:

1. Download [manifest.xml](https://elefant-word-245916757771.us-central1.run.app/manifest.xml)
2. Open Finder → Go → Go to Folder → paste:
   ```
   ~/Library/Containers/com.microsoft.Word/Data/Documents/wef
   ```
3. If the `wef` folder doesn't exist, create it
4. Copy `manifest.xml` into the `wef` folder
5. Restart Word

---

## Option C: Word Desktop (Windows)

### Steps

1. **Download the installer**
   → [Click here to download the Windows installer](https://elefant-word-245916757771.us-central1.run.app/install-windows.bat)

2. **Run the installer**
   - Find the downloaded `install-windows.bat` file (usually in Downloads)
   - Double-click it
   - If Windows asks to confirm, click **Yes** / **Run anyway**
   - The command window will show "Done!" and close

3. **Restart Word**
   - Close Word completely
   - Reopen Word

4. **Open the add-in**
   - Click **Home** tab → **Open Elefant** button in the ribbon
   - The Elefant panel appears on the right

### Manual alternative

If you prefer not to run the installer script:

1. Download [manifest.xml](https://elefant-word-245916757771.us-central1.run.app/manifest.xml)
2. Open File Explorer and navigate to:
   ```
   \\localhost\c$\Users\<YourUsername>\AppData\Local\Microsoft\Office\16.0\Wef
   ```
   Or create a network share pointing to that folder.
3. Copy `manifest.xml` into the folder
4. Restart Word

---

## Getting Started After Install

1. Open any Word document
2. Click **Open Elefant** in the Home tab (or find it under Add-ins)
3. Enter your Gemini API key when prompted
   - Get a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
4. Select text in your document and click **Review** to analyze it

---

## Troubleshooting

**"Open Elefant" button doesn't appear**
→ Make sure you restarted Word after installing

**"We can't open this add-in from localhost"**
→ You may have the development manifest instead of the production one. Re-download from the link above.

**Add-in panel is blank or shows an error**
→ Check your internet connection. The add-in loads from the cloud.

**Need help?**
→ Contact support at [elefant.legal/support](https://elefant.legal/support)
