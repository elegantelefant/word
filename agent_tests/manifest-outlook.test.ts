// ABOUTME: Tests the Outlook add-in manifest: its own identity, the mail surfaces, and the pane it opens.
// ABOUTME: The add-in only (XML) manifest, because it is the one Outlook on Mac and mobile load.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(resolve(process.cwd(), name), "utf8");
const outlook = read("manifest.outlook.xml");
const word = read("manifest.xml");
const id = (manifest: string) => manifest.match(/<Id>([^<]+)<\/Id>/)?.[1];

describe("Outlook manifest", () => {
  it("has its own id, separate from the Word add-in", () => {
    expect(id(outlook)).toMatch(/^[0-9a-f-]{36}$/);
    expect(id(outlook)).not.toBe(id(word));
  });

  it("is a mail add-in for the mailbox host", () => {
    expect(outlook).toMatch(/xsi:type="MailApp"/);
  });

  // Outlook supports the Dialog API, which the sign-in popup uses, from Mailbox 1.4.
  it("requires the Mailbox set that carries the sign-in dialog", () => {
    expect(outlook).toMatch(/<Set Name="Mailbox" MinVersion="1.4"\/>/);
    expect(outlook).toMatch(/<bt:Sets DefaultMinVersion="1.4">/);
  });

  it("asks only to read and write the open item", () => {
    expect(outlook).toMatch(/<Permissions>ReadWriteItem<\/Permissions>/);
  });

  it("opens the Outlook pane from both reading and writing a message", () => {
    expect(outlook).toMatch(/<ExtensionPoint xsi:type="MessageReadCommandSurface">/);
    expect(outlook).toMatch(/<ExtensionPoint xsi:type="MessageComposeCommandSurface">/);
    expect(outlook).toMatch(/<bt:Url id="Taskpane.Url" DefaultValue="https:\/\/localhost:3000\/"\/>/);
  });

  it("lets the sign-in dialog reach Elefant", () => {
    expect(outlook).toMatch(/<AppDomain>https:\/\/elefant.legal<\/AppDomain>/);
  });
});
