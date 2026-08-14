"use client";

import { useState } from "react";
import { Download, FileCheck2, FileJson, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RateBookExports({
  books,
  role,
}: {
  books: { id: string; code: string; name: string }[];
  role: "ADMIN" | "OPERATOR" | "VIEWER";
}) {
  const [sending, setSending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  async function download(book: { id: string; code: string }) {
    const response = await fetch(`/api/v1/ratebooks/${book.id}/export.csv`, {
      cache: "no-store",
    });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${book.code.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  async function downloadRatewarePackage(book: { id: string; code: string }) {
    const response = await fetch(
      `/api/v1/integration/rateware/ratebooks/${book.id}`,
      { cache: "no-store" },
    );
    if (!response.ok) return;
    const payload = await response.json();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fcm-rateware-ratebook-${book.code.toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
  async function downloadDeliveryEvidence(book: { id: string; code: string }) {
    const response = await fetch(
      `/api/v1/integration/rateware/ratebooks/${book.id}/deliveries/evidence.csv`,
      { cache: "no-store" },
    );
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fcm-rateware-evidence-${book.code.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  async function deliver(book: { id: string; code: string }) {
    setSending(book.id);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/v1/integration/rateware/ratebooks/${book.id}/deliver`,
        { method: "POST", cache: "no-store" },
      );
      const data = (await response.json().catch(() => ({}))) as {
        duplicate?: boolean;
        delivery?: { receiptId?: string | null; error?: string | null };
        error?: string;
      };
      if (!response.ok)
        throw new Error(
          data.error ??
            data.delivery?.error ??
            `No se pudo entregar el RateBook (${response.status}).`,
        );
      setMessage(
        data.duplicate
          ? `${book.code}: Rateware ya había confirmado esta versión.`
          : `${book.code}: recibido por Rateware${data.delivery?.receiptId ? ` · recibo ${data.delivery.receiptId}` : ""}.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo entregar el RateBook.",
      );
    } finally {
      setSending(null);
    }
  }
  if (!books.length) return null;
  return (
    <section className="mb-4 flex flex-wrap items-center justify-end gap-2">
      <span className="text-xs text-muted-foreground">
        Exportar o entregar tarifario publicado:
      </span>
      {books.map((book) => (
        <span key={book.id} className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => download(book)}>
            <Download className="mr-1 h-4 w-4" />
            {book.code} CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadRatewarePackage(book)}
          >
            <FileJson className="mr-1 h-4 w-4" />
            Rateware JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadDeliveryEvidence(book)}
          >
            <FileCheck2 className="mr-1 h-4 w-4" />
            Evidencia
          </Button>
          {role === "ADMIN" && (
            <Button
              size="sm"
              onClick={() => deliver(book)}
              disabled={sending === book.id}
            >
              <Send className="mr-1 h-4 w-4" />
              {sending === book.id ? "Entregando…" : "Enviar a Rateware"}
            </Button>
          )}
        </span>
      ))}
      {message && (
        <p
          role="status"
          className="w-full text-right text-xs text-muted-foreground"
        >
          {message}
        </p>
      )}
      <p className="w-full text-right text-xs text-muted-foreground">
        La entrega requiere una solicitud aprobada en un segundo paso explícito
        y crea una recepción trazable; no publica ni modifica tarifas en Rateware.
      </p>
    </section>
  );
}
