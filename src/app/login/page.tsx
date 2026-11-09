import { LoginForm } from "@/components/LoginForm";
import { Database, KeyRound, ShieldCheck } from "lucide-react";
import Link from "next/link";

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: "Pencocokan tiga dokumen",
    detail: "Invoice diverifikasi terhadap purchase order dan berita acara penerimaan sebelum boleh dibayar.",
  },
  {
    icon: KeyRound,
    title: "Kontrol akses per peran",
    detail: "Setiap modul hanya terbuka untuk peran yang berwenang, dari approver sampai mitra vendor.",
  },
  {
    icon: Database,
    title: "Jejak audit utuh",
    detail: "Persetujuan, penetapan pemenang, penerimaan, dan pelunasan semuanya meninggalkan catatan.",
  },
];

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_420px]">
      <section className="hidden flex-col justify-between border-r border-[var(--border)] bg-slate-950 p-10 text-slate-300 lg:flex">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-md bg-blue-600 font-mono text-sm font-bold text-white">N</div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-white">NexusProcure</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Source-to-Pay Console</div>
            </div>
          </div>
          <h1 className="mt-12 max-w-md text-2xl font-semibold leading-tight tracking-tight text-white">
            Pengadaan korporat dengan verifikasi berlapis, bukan asumsi.
          </h1>
          <p className="mt-3 max-w-md text-[13px] leading-6 text-slate-400">
            Satu konsol untuk pengajuan, tender, penerimaan barang, dan pelunasan tagihan. Setiap keputusan finansial mengunci pagu dan
            meninggalkan jejak audit.
          </p>
        </div>

        <ul className="space-y-5">
          {HIGHLIGHTS.map((item) => (
            <li key={item.title} className="flex gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-800 bg-slate-900">
                <item.icon className="size-3.5 text-slate-400" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-slate-200">{item.title}</div>
                <div className="mt-0.5 text-[11px] leading-4 text-slate-500">{item.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-md bg-slate-950 font-mono text-sm font-bold text-white">N</div>
              <div>
                <div className="text-sm font-semibold tracking-tight text-slate-950">NexusProcure</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Source-to-Pay Console</div>
              </div>
            </div>
          </div>

          <h2 className="mt-8 text-xl font-semibold tracking-tight text-slate-950 lg:mt-0">Masuk ke konsol</h2>
          <p className="mt-1.5 text-[13px] leading-5 text-slate-500">
            Pakai akun demo di bawah. Kata sandi untuk semua akun demo adalah <span className="font-mono text-slate-700">nexus123</span>.
          </p>

          <LoginForm />

          <div className="mt-6 rounded-md border border-[var(--border)] bg-slate-50 px-3 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Akun demo</div>
            <ul className="mt-2 space-y-1 font-mono text-[11px] text-slate-600">
              <li>cpo@nexusprocure.id — Chief Procurement Officer</li>
              <li>buyer@nexusprocure.id — Procurement Buyer</li>
              <li>it.head@nexusprocure.id — Department Head</li>
              <li>receiving@nexusprocure.id — Warehouse Receiver</li>
              <li>ap.finance@nexusprocure.id — AP Finance</li>
              <li>sales@mitrateknologi.co.id — Vendor Partner</li>
            </ul>
          </div>

          <p className="mt-6 text-[11px] leading-4 text-slate-400">
            Sesi berlaku 8 jam. Keluar dari perangkat bersama setelah selesai menggunakan konsol.{" "}
            <Link href="/admin" className="font-medium text-[var(--interactive)] hover:underline">
              Lanjut ke dasbor
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
