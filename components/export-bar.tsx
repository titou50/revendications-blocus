"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Download, FileText } from "lucide-react";

export function ExportBar({
  establishmentId,
  copyText,
}: {
  establishmentId: string;
  copyText: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/90 p-3 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row">
        <Button type="button" className="flex-1" size="lg" onClick={copy}>
          <Copy />
          {copied ? "Copié" : "Copier pour Insta / Telegram"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="flex-1"
          onClick={() => {
            window.location.href = `/${establishmentId}/export?format=txt`;
          }}
        >
          <FileText />
          Télécharger .txt
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="flex-1"
          onClick={() => {
            window.location.href = `/${establishmentId}/export?format=odt`;
          }}
        >
          <Download />
          Télécharger .odt
        </Button>
      </div>
    </div>
  );
}
