#!/bin/bash
# Elefant Word Add-in Installer for Mac
# Downloads the manifest to Word's sideload folder.

MANIFEST_URL="https://elefant-word-245916757771.us-central1.run.app/manifest.xml"
WEF_DIR="$HOME/Library/Containers/com.microsoft.Word/Data/Documents/wef"

echo "Installing Elefant Word Add-in..."
echo ""

mkdir -p "$WEF_DIR"
curl -fsSL "$MANIFEST_URL" -o "$WEF_DIR/manifest.xml"

if [ $? -eq 0 ]; then
    echo "Done! Restart Word, then click Home > Open Elefant."
else
    echo "Download failed. Check your internet connection and try again."
    exit 1
fi
