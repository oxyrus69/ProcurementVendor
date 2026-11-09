"use client";

import { Printer } from "lucide-react";

/** Tombol cetak untuk dokumen A4. Berjalan di sisi klien agar dialog cetak terbuka. */
export function PrintButton({ label = "Cetak dokumen" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-primary">
      <Printer className="size-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}
