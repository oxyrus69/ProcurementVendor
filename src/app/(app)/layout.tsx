import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";

/**
 * Shell aplikasi 5 zona (Zona A-E). Hanya rute di dalam grup (app)
 * yang memakai kerangka ini; halaman login dan dokumen cetak berdiri sendiri.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-7 lg:py-6">{children}</main>
      </div>
    </div>
  );
}
