#!/bin/bash
# ABOUTME: Elefant Word Add-in Installer for Mac, for running from Terminal (`bash install-mac.command`):
# ABOUTME: downloads the production manifest into the wef folder Word on Mac sideloads from.

MANIFEST_URL="https://addin.elefant.legal/manifest.xml"
WEF_DIR="$HOME/Library/Containers/com.microsoft.Word/Data/Documents/wef"

echo "Installing Elefant Word Add-in..."
echo ""

mkdir -p "$WEF_DIR"
curl -fsSL "$MANIFEST_URL" -o "$WEF_DIR/manifest.xml"

if [ $? -eq 0 ]; then
    echo "Done. Quit Word (Cmd+Q) and open it again, then choose Home > Add-ins and select Elefant Legal Assistant."
else
    echo "Download failed. Check your internet connection and try again."
    exit 1
fi
