# NexusProcure — B2B E-Procurement, Vendor Portal, RFQ Bidding & 3-Way Matching System

Dokumen ini adalah spesifikasi teknis menyeluruh (*blueprint* & *agent instructions*) untuk membangun sistem pengadaan barang/jasa korporat (*Source-to-Pay B2B E-Procurement*), portal penawaran kuotasi vendor (*Request for Quotation / RFQ*), persetujuan anggaran berjenjang (*Budget Control*), serta mesin **Three-Way Matching (Pencocokan Tiga Arah antara Purchase Order, Goods Receipt Note, dan Faktur Tagihan Vendor)** lengkap dengan **Sistem Pendukung Keputusan (DSS)** rantai pasok.

Dirancang dengan standar produksi (*production-grade*), mematuhi kontrak visual `GLOBAL-DASHBOARD-DESIGN.md` (5-Zone Enterprise App Shell), serta mendukung **Dual-Mode Database Adapter (PGlite + PostgreSQL Server)** agar dapat dieksekusi secara mandiri dari awal hingga tuntas oleh *coding agent*.

---

## 1. Identitas Proyek & Tech Stack

* **Nama Sistem:** NexusProcure (Enterprise B2B E-Procurement, Vendor Bidding & 3-Way Invoice Matching System)
* **Domain Masalah:** Perusahaan manufaktur, rumah sakit, konstruksi, dan korporasi menengah-besar yang sering mengalami kebocoran anggaran pengadaan (*maverick spend*), kolusi pemilihan pemasok karena tidak adanya matriks perbandingan tender terbuka, serta kesalahan pembayaran tagihan vendor akibat tagihan (*invoice*) dibayar tanpa dicocokkan terlebih dahulu dengan jumlah fisik barang yang benar-benar diterima di gudang (*Goods Receipt*).
* **Tech Stack Wajib:**
  * **Framework:** Next.js 15 (App Router, React 19, *Server Components*, *Server Actions*, & Route Handlers) + TypeScript ketat (*strict mode*).
  * **Database & ORM:** Drizzle ORM (`src/server/db`) dengan **Dual-Mode Database Adapter** (`@electric-sql/pglite` untuk mode demo/lokal instan tanpa setup, dan `postgres` / PostgreSQL Server untuk mode produksi).
  * **Styling & UI:** Tailwind CSS, arsitektur komponen mengikuti `GLOBAL-DASHBOARD-DESIGN.md` (5-Zone App Shell, 4-Layer KPI Cards, `EnterpriseDataGrid`, `CommandPalette` `Ctrl+K`, `InspectorDrawer`), `lucide-react`, `@tanstack/react-table`, dan `recharts`.
  * **Keamanan & Integritas:** Node.js `crypto` (`SHA-256`) untuk penyegelan kuotasi tender (*Sealed Bid Hash*) dan verifikasi keaslian dokumen Purchase Order (PO).

---

## 2. Peta Modul & Rute Sistem (`src/app`)

| Modul | Rute Halaman (App Router) | Service & Mesin Inti (`src/server` & `src/lib`) | Status Target |
| :--- | :--- | :--- | :--- |
| **Dasbor Komando Pengadaan (CPO)** | `/admin` | `analytics.ts`, `dssEngine.ts` | Wajib Selesai |
| **Kontrol Pagu Anggaran Departemen** | `/budgets` | `budgetEngine.ts` | Wajib Selesai |
| **Purchase Requisition (PR)** | `/requisitions`, `/requisitions/[id]` | `requisitionEngine.ts`, `budgetEngine.ts` | Wajib Selesai |
| **Tender RFQ & Matriks Kuotasi** | `/rfq`, `/rfq/[id]` | `rfqBiddingEngine.ts`, `procurementMath.ts` | Wajib Selesai |
| **Purchase Order (PO) & Kontrak** | `/purchase-orders`, `/purchase-orders/[id]` | `poEngine.ts` | Wajib Selesai |
| **Penerimaan Barang (GRN / Gudang)** | `/goods-receipts`, `/goods-receipts/[id]` | `grnEngine.ts` | Wajib Selesai |
| **Tagihan & Mesin 3-Way Matching** | `/invoices`, `/invoices/[id]` | `threeWayMatchEngine.ts`, `procurementMath.ts` | Wajib Selesai |
| **Direktori & Kinerja Vendor** | `/vendors`, `/vendors/[id]` | `vendorEngine.ts`, `procurementMath.ts` | Wajib Selesai |
| **Portal Eksternal Vendor (B2B)** | `/vendor-portal` | `vendorPortal.ts` | Wajib Selesai |
| **DSS (Keputusan Vendor & Fraud)** | `/dss`, `/dss/vendor-matrix`, `/dss/price-variance`, `/dss/riwayat` | `dssEngine.ts` | Wajib Selesai |
| **Jejak Audit & Kebijakan Toleransi** | `/admin/audit`, `/admin/settings` | `audit.ts`, `settings.ts` | Wajib Selesai |
| **Ekspor CSV (Excel Indonesia)** | `/api/export/po`, `/api/export/three-way-match`, `/api/export/vendors` | `exportHandlers.ts` | Wajib Selesai |
| **Cetak PO Resmi & BA Serah Terima** | `(print)/po/[id]`, `(print)/grn/[id]` | — | Wajib Selesai |

---

## 3. Matriks RBAC (Role-Based Access Control)

Penegakan akses dilakukan pada `src/middleware.ts` (*longest-prefix match*) dan di dalam setiap *Server Action* menggunakan `requireRole()` di `src/server/rbac.ts`.

| Peran | Halaman Pendaratan (`ROLE_HOME`) | Hak Akses Utama |
| :--- | :--- | :--- |
| `SUPER_ADMIN` | `/admin` | Akses penuh ke seluruh modul, pengaturan pagu anggaran, ambang toleransi *3-Way Matching*, manajemen vendor, DSS, dan jejak audit. |
| `PROCUREMENT_OFFICER` | `/admin` | Mengonversi PR yang disetujui menjadi RFQ atau PO, mengundang vendor ke tender RFQ, mengevaluasi matriks perbandingan harga kuotasi, memilih pemenang tender, dan mengakses DSS. |
| `DEPT_APPROVER` | `/requisitions` | Membuat dan menyetujui *Purchase Requisition* (PR) di departemennya sendiri selama pagu anggaran masih mencukupi, serta memantau status barang yang diminta. |
| `WAREHOUSE_RECEIVER` | `/goods-receipts` | Memeriksa barang datang dari vendor terhadap PO, mencatat jumlah diterima (`qty_accepted`) vs jumlah rusak/ditolak (`qty_rejected`) ke dalam dokumen *Goods Receipt Note* (GRN); **dilarang** melihat harga penawaran kompetitor di RFQ. |
| `AP_FINANCE` | `/invoices` | Memproses tagihan vendor (*Vendor Invoice*), menjalankan mesin verifikasi **3-Way Matching (PO vs GRN vs Invoice)**, menyetujui pembayaran tagihan yang `MATCHED`, atau menahan tagihan yang mengalami selisih (`DISCREPANCY_HOLD`). |
| `VENDOR_PARTNER` | `/vendor-portal` | Melihat undangan tender RFQ yang ditujukan kepadanya, mengirimkan penawaran harga (*Quotation*), menerima PO resmi, mengonfirmasi jadwal pengiriman, dan mengunggah faktur tagihan (*Invoice*). |

---

## 4. Skema Database (`src/server/db/schema.ts`)

Gunakan Drizzle ORM. Seluruh nilai uang disimpan sebagai `numeric(14,2)`.

### 4.1. Enum Utama
* `user_role`: `'SUPER_ADMIN' | 'PROCUREMENT_OFFICER' | 'DEPT_APPROVER' | 'WAREHOUSE_RECEIVER' | 'AP_FINANCE' | 'VENDOR_PARTNER'`
* `pr_status`: `'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED_FOR_SOURCING' | 'CONVERTED_TO_RFQ_PO' | 'REJECTED'`
* `rfq_status`: `'OPEN_FOR_BIDDING' | 'EVALUATION_LOCKED' | 'AWARDED' | 'CANCELLED'`
* `po_status`: `'ISSUED_SENT' | 'ACKNOWLEDGED_BY_VENDOR' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' | 'CLOSED' | 'CANCELLED'`
* `match_status`: `'UNVERIFIED' | 'MATCHED_PASSED' | 'WITHIN_TOLERANCE_PASSED' | 'PRICE_VARIANCE_HOLD' | 'QTY_VARIANCE_HOLD' | 'PAID'`
* `vendor_tier`: `'PREFERRED_PARTNER' | 'APPROVED' | 'PROBATION' | 'BLACKLISTED'`

### 4.2. Tabel Inti (Minimal 18 Tabel)
1. **`cost_centers_budgets`** (Pagu Anggaran Departemen):
   * `id` (UUID PK), `code` (unique, misal `"CC-IT-2026"`), `department_name`, `fiscal_year` (integer), `total_budget_allocated` (`numeric(14,2)`), `committed_encumbered` (`numeric(14,2)` — dana terkunci saat PR/PO disetujui), `actual_spent_invoiced` (`numeric(14,2)`), `version` (integer).
2. **`catalog_items`** (Master Barang & Jasa Standar):
   * `id` (UUID PK), `item_code` (unique), `name`, `category`, `uom` (`'UNIT' | 'BOX' | 'LICENSE' | 'ROLL' | 'KG'`), `standard_reference_price` (`numeric(14,2)` — Harga Perkiraan Sendiri / HPS), `last_purchase_price` (`numeric(14,2)`).
3. **`vendors`** (Profil Perusahaan Pemasok B2B):
   * `id` (UUID PK), `vendor_code` (unique), `company_name`, `npwp`, `contact_email`, `phone`, `category_specialty`, `tier` (`vendor_tier`).
   * **Metrik Performa Historis:** `on_time_delivery_rate` (`numeric(5,2)`), `quality_acceptance_rate` (`numeric(5,2)`), `price_competitiveness_score` (`numeric(5,2)`), `composite_vendor_score` (`numeric(5,2)`), `bank_account_info`.
4. **`profiles`**: Menghubungkan pengguna internal maupun perwakilan `VENDOR_PARTNER` (`vendor_id` nullable FK).
5. **`purchase_requisitions`** & **`purchase_requisition_items`** (PR):
   * `id` (UUID PK), `pr_number` (unique, `PR-YYYYMM-XXXX`), `requester_id` (FK), `cost_center_id` (FK `cost_centers_budgets.id`), `title`, `justification`, `needed_by_date`, `estimated_total` (`numeric(14,2)`), `status` (`pr_status`), `approved_by`, `approved_at`, `version` (integer).
6. **`rfq_events`**, **`rfq_invited_vendors`**, **`rfq_quotations`**, & **`rfq_quotation_items`** (Tender & Penawaran Vendor):
   * `rfq_number` (`RFQ-YYYYMM-XXXX`), `pr_id` (FK), `title`, `deadline_at`, `status` (`rfq_status`), `awarded_vendor_id` (nullable), `award_justification` (text).
   * Setiap `rfq_quotations` dari vendor menyimpan: `total_bid_amount`, `delivery_lead_time_days` (integer), `warranty_months` (integer), `payment_terms_days` (`30 | 45 | 60`), `technical_compliance_score` (`numeric(5,2)`), dan `weighted_rank_score` (`numeric(5,2)`).
7. **`purchase_orders`** & **`purchase_order_items`** (Dokumen Kontrak PO):
   * `id` (UUID PK), `po_number` (unique, `PO-YYYYMM-XXXX`), `pr_id` (FK), `rfq_id` (nullable FK), `vendor_id` (FK `vendors.id`), `cost_center_id` (FK).
   * `status` (`po_status`), `subtotal`, `tax_amount`, `shipping_cost`, `grand_total` (`numeric(14,2)`), `expected_delivery_date`, `payment_terms_days`, `verification_hash` (SHA-256), `version` (integer).
   * Pada `purchase_order_items`: `item_id`, `description`, `ordered_qty` (integer), `received_accepted_qty` (integer, default $0$), `invoiced_qty` (integer, default $0$), `unit_price_agreed` (`numeric(14,2)`), `line_total` (`numeric(14,2)`).
8. **`goods_receipts`** & **`goods_receipt_items`** (GRN / Bukti Barang Masuk Gudang):
   * `id` (UUID PK), `grn_number` (unique, `GRN-YYYYMM-XXXX`), `po_id` (FK `purchase_orders.id`), `received_by` (FK `profiles.id`), `received_at`, `delivery_note_ref` (nomor surat jalan vendor).
   * Pada `goods_receipt_items`: `po_item_id` (FK), `qty_delivered`, `qty_accepted_good`, `qty_rejected_damaged`, `inspection_notes`.
9. **`vendor_invoices`**, **`vendor_invoice_items`**, & **`three_way_match_logs`** (Faktur Tagihan & Audit 3-Way Match):
   * `id` (UUID PK), `internal_inv_number` (`VINV-YYYYMM-XXXX`), `vendor_invoice_no` (nomor faktur asli dari vendor), `po_id` (FK), `vendor_id` (FK).
   * `invoice_date`, `due_date`, `subtotal_claimed`, `tax_claimed`, `total_claimed` (`numeric(14,2)`).
   * **Hasil Mesin 3-Way Match:** `match_status` (`match_status`), `po_total_reference`, `grn_accepted_value_reference`, `price_variance_amount`, `price_variance_pct`, `qty_variance_units`, `discrepancy_summary` (jsonb), `override_approved_by` (nullable FK), `override_reason` (text), `paid_at`.
10. **`decision_rules`**, **`decision_logs`**, **`audit_logs`**, **`app_settings`**, **`document_sequences`**, **`idempotency_keys`**.

---

## 5. Spesifikasi Mesin Inti (*Core Engines*)

### 5.1. Mesin Matematika Evaluasi Tender & 3-Way Matching (`src/lib/procurementMath.ts`)

Modul murni TypeScript (tanpa dependensi server) yang dapat diuji secara deterministik:

1. **Mesin Verifikasi Three-Way Matching (`evaluateThreeWayMatchPure`)**:
   * Membandingkan **per baris item (`line-by-line`)** antara:
     1. **Dokumen PO (`Purchase Order`)**: Harga satuan yang disepakati ($P_{\text{PO}}$) dan kuantitas pesan ($Q_{\text{PO}}$).
     2. **Dokumen GRN (`Goods Receipt Note`)**: Akumulasi kuantitas fisik barang baik yang benar-benar diterima di gudang ($Q_{\text{GRN\_Accepted}}$).
     3. **Dokumen Faktur (`Vendor Invoice`)**: Harga satuan yang ditagih vendor ($P_{\text{Inv}}$) dan kuantitas yang ditagih ($Q_{\text{Inv}}$).
   * **Aturan Penilaian Ketat:**
     * **Varians Kuantitas ($\Delta Q$):** $\Delta Q = Q_{\text{Inv}} - Q_{\text{GRN\_Accepted}}$. Jika $\Delta Q > 0$ (vendor menagih barang yang belum dikirim atau yang ditolak gudang karena rusak), langsung tetapkan status **`QTY_VARIANCE_HOLD`** (toleransi kuantitas lebih tagih = $0$ unit).
     * **Varians Harga ($\Delta P\%$):**
       $$\Delta P\% = \frac{P_{\text{Inv}} - P_{\text{PO}}}{P_{\text{PO}}} \times 100\%$$
       Jika $\Delta P\% = 0$ dan $\Delta Q \le 0$, status = **`MATCHED_PASSED`**.
       Jika $0 < \Delta P\% \le \text{priceTolerancePct}$ (default pengaturan: $2,0\%$) dan selisih rupiah total $\le \text{maxToleranceIdr}$ (default: $\text{Rp } 100.000$), status = **`WITHIN_TOLERANCE_PASSED`**.
       Jika $\Delta P\% > \text{priceTolerancePct}$, status = **`PRICE_VARIANCE_HOLD`** dan pembayaran otomatis diblokir sampai ada resolusi atau *override* ber-audit dari `SUPER_ADMIN`.
2. **Skoring Multi-Kriteria Pemilihan Pemenang RFQ (`computeRfqWeightedScorePure`)**:
   * Menghitung skor objektif kuotasi vendor ($0\text{–}100$) menggunakan metode *Weighted Scoring* (SAW):
     * Bobot Harga ($w_P = 50\%$): $\text{Score}_P = \frac{\min(\text{Semua Harga Kuotasi})}{\text{Harga Kuotasi Vendor}} \times 100$
     * Bobot Kecepatan Pengiriman ($w_D = 20\%$): $\text{Score}_D = \frac{\min(\text{Semua Lead Time})}{\text{Lead Time Vendor}} \times 100$
     * Bobot Kepatuhan Teknis & Garansi ($w_T = 15\%$): $\text{TechnicalScore}$
     * Bobot Rekam Jejak Vendor Historis ($w_V = 15\%$): $\text{CompositeVendorScore}$
     $$\text{TotalScore} = (0,50 \cdot \text{Score}_P) + (0,20 \cdot \text{Score}_D) + (0,15 \cdot \text{Score}_T) + (0,15 \cdot \text{Score}_V)$$

### 5.2. Mesin Kontrol Pagu Anggaran (`src/server/services/budgetEngine.ts`)

* **Validasi Pagu Sebelum Persetujuan PR (`checkAndEncumberBudget`)**:
  * Sisa anggaran tersedia:
    $$\text{AvailableBudget} = \text{TotalBudgetAllocated} - \text{CommittedEncumbered} - \text{ActualSpentInvoiced}$$
  * Jika nilai PR melebihi $\text{AvailableBudget}$, sistem menolak persetujuan PR secara otomatis kecuali dilakukan revisi anggaran. Saat PR/PO disetujui, nominal tersebut langsung mengunci `committed_encumbered` agar tidak dipakai ganda oleh pengajuan lain.

### 5.3. Mesin Pendukung Keputusan Pengadaan / DSS (`src/server/services/dssEngine.ts`)

Menghitung rekomendasi operasional secara langsung saat halaman `/dss` dibuka:
1. **Indikasi Pemecahan Pengadaan / *Split-PO Fraud Detection* (`SPLIT_ORDER_ANOMALY`)**:
   * Mendeteksi pola ketika departemen yang sama membuat beberapa PR/PO ke vendor/kategori yang sama dalam rentang $\le 7$ hari yang masing-masing nilainya berada sedikit di bawah ambang wajib tender RFQ (misal: ambang tender Rp 50.000.000, namun dibuat dua pengajuan masing-masing Rp 48.000.000).
2. **Peringatan Kenaikan Harga di Atas HPS (`PRICE_CREEP_ALERT`)**:
   * Mendeteksi item katalog yang harga penawaran atau PO terbarunya naik $> 10\%$ di atas `standard_reference_price` (HPS).
3. **Evaluasi Penurunan Kinerja Vendor (`VENDOR_DOWNGRADE_RECOMMENDATION`)**:
   * Mendeteksi vendor yang memiliki tingkat ketepatan waktu pengiriman $< 80\%$ atau tingkat penolakan barang rusak di gudang $> 5\%$ untuk direkomendasikan turun status menjadi `PROBATION`.
4. **Optimalisasi Arus Kas Jatuh Tempo Faktur (`EARLY_PAYMENT_OR_HOLD_QUEUE`)**:
   * Mengurutkan faktur yang sudah `MATCHED_PASSED` berdasarkan tenggat jatuh tempo dan potensi diskon pembayaran dipercepat (*early payment discount*).

---

## 6. Standar Antarmuka, Dual-Mode DB & Pengujian Otomatis (Wajib)

1. **Kepatuhan Desain Visual (`GLOBAL-DASHBOARD-DESIGN.md`)**:
   * Wajib menerapkan **5-Zone Enterprise App Shell** di seluruh rute.
   * Pada halaman detail `/invoices/[id]`, bangun antarmuka **Side-by-Side 3-Column Comparison Workbench** yang menyejajarkan angka **Kolom 1: Purchase Order (PO)** $\leftrightarrow$ **Kolom 2: Goods Receipt (GRN)** $\leftrightarrow$ **Kolom 3: Vendor Invoice** per baris barang dengan sorotan warna semantik otomatis (hijau jika cocok, merah terang jika terdapat selisih harga atau kuantitas).
   * Pada halaman `/rfq/[id]`, bangun **Side-by-Side Quotation Comparison Matrix** yang menampilkan perbandingan kuotasi dari 3 vendor berdampingan lengkap dengan lencana **"Rekomendasi Pemenang DSS"** di skor tertinggi.
2. **Dual-Mode Database Adapter & Keamanan Kunci**:
   * Gunakan PGlite (`.data/pglite`) sebagai *default* lokal dan PostgreSQL Server ketika `DATABASE_URL` diawali `postgres://`.
3. **Data Seed Realistis (`scripts/seed.mjs`)**:
   * Kata sandi semua akun demo: `nexus123`.
   * **6 Akun Demo:** `cpo@nexusprocure.id` (`SUPER_ADMIN`), `buyer@nexusprocure.id` (`PROCUREMENT_OFFICER`), `it.head@nexusprocure.id` (`DEPT_APPROVER`), `receiving@nexusprocure.id` (`WAREHOUSE_RECEIVER`), `ap.finance@nexusprocure.id` (`AP_FINANCE`), dan `sales@mitrateknologi.co.id` (`VENDOR_PARTNER`).
   * **Skenario Seed Wajib:** 4 Anggaran Departemen, 10 Item Katalog B2B, 5 Perusahaan Vendor, 4 Purchase Requisition (PR), **2 Tender RFQ** (1 sedang evaluasi dengan 3 penawaran kuotasi vendor yang siap dibandingkan), **5 Purchase Order (PO)**, **4 Goods Receipt Note (GRN)** (termasuk 1 pengiriman yang 2 unit server/laptop-nya ditolak karena cacat fisik), serta **4 Faktur Tagihan Vendor** (1 `MATCHED_PASSED`, 1 `WITHIN_TOLERANCE_PASSED`, 1 `QTY_VARIANCE_HOLD` karena vendor tetap menagih barang yang ditolak gudang, dan 1 `PRICE_VARIANCE_HOLD` karena harga ditagih lebih mahal $8\%$ dari PO).
4. **Verifikasi Akhir & Inisialisasi Git (`scripts/e2e-verify.mjs`)**:
   * Buat skrip pengujian otomatis yang memverifikasi mesin `evaluateThreeWayMatchPure` (keempat skenario status *match*), perhitungan matriks skor RFQ, pemotongan pagu anggaran (`budgetEngine.ts`), deteksi anomali DSS, RBAC untuk 6 peran, dan ekspor CSV (`\uFEFF` BOM + `;`).
   * Pastikan `npm run db:migrate && npm run db:seed && npx tsc --noEmit && npm run build && node scripts/e2e-verify.mjs` lulus dengan **0 error**, lalu inisialisasi Git (`git init -b main`).