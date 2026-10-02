import JSZip from "jszip";
import type { Claim, Establishment } from "@/lib/types";
import { buildPlainText } from "@/lib/plain-text";

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function buildOdt(
  establishment: Establishment,
  claims: Claim[]
): Promise<Uint8Array> {
  const text = buildPlainText(establishment, claims);
  const paragraphs = text
    .split("\n")
    .map((line) => (line.trim() ? `<text:p>${xmlEscape(line)}</text:p>` : `<text:p/>`))
    .join("");

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2">
  <office:body>
    <office:text>
      ${paragraphs}
    </office:text>
  </office:body>
</office:document-content>`;

  const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`;

  const zip = new JSZip();
  zip.file("mimetype", "application/vnd.oasis.opendocument.text", {
    compression: "STORE",
  });
  zip.file("META-INF/manifest.xml", manifest);
  zip.file("content.xml", content);
  return zip.generateAsync({ type: "uint8array" });
}
