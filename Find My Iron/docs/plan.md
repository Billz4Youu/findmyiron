# Find My Iron: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun aplikasi web **Find My Iron** untuk melacak status peminjaman dan antrean satu buah setrika bersama di asrama secara real-time.

**Architecture:** Aplikasi berbasis Next.js (App Router) dengan pendekatan mobile-first container (`max-w-md mx-auto`) bergaya habit tracker modern (dominasi kartu `rounded-2xl` / `rounded-3xl` dan palet warna pastel/ungu bersih). Penyimpanan data dan pembaruan status langsung menggunakan Supabase Database dan Supabase Realtime pada tabel tunggal `iron_status` serta pencatatan log/antrean pada `borrow_history`.

**Tech Stack:** Next.js (App Router, TypeScript), Tailwind CSS, Lucide Icons (`lucide-react`), Supabase (`@supabase/supabase-js`).

---

## 1. Desain UI & Prinsip Visual (Habit Tracker Style)

- **Mobile-First Container:** Seluruh tampilan dibungkus dalam container seukuran layar ponsel (`max-w-md mx-auto min-h-screen bg-violet-50/60 px-4 py-6 shadow-sm`) yang berada tepat di tengah layar saat dibuka di desktop.
- **Card-Based Layout:** Setiap informasi dikelompokkan dalam kartu mandiri dengan sudut membulat besar (`rounded-2xl` hingga `rounded-3xl`), border halus (`border-violet-100`), dan bayangan lembut (`shadow-sm`).
- **Palet Warna Pastel & Ungu Bersih:**
  - **Background Utama:** `bg-[#F8F7FF]` (ungu pastel sangat muda/bersih).
  - **Permukaan Kartu:** `bg-white` dengan aksen kartu utama menggunakan gradasi lembut atau warna solid pastel (`bg-violet-600` untuk CTA utama, `bg-emerald-100 text-emerald-800` saat setrika **Tersedia**, dan `bg-amber-100 text-amber-800` atau `bg-rose-100 text-rose-800` saat **Sedang Dipakai**).
  - **Tipografi & Ikon:** Teks kontras tinggi (`text-slate-900` dan `text-slate-500`) dipadukan dengan ikon `lucide-react` di dalam badge lingkaran pastel (`rounded-2xl bg-violet-100 p-3 text-violet-600`).

---

## 2. App Flow (Alur Aplikasi)

### A. Halaman Utama (`/` : Dashboard Status & Waitlist)

1. **Header Ringkas:**
   - Menampilkan judul aplikasi **Find My Iron**, subjudul lokasi asrama, dan indikator koneksi real-time.
2. **Hero Status Card (`rounded-3xl`):**
   - **Kondisi Tersedia (`is_available = true`):**
     - Menampilkan badge hijau pastel **"Tersedia di Tempat"**, lokasi terakhir/standar, dan tombol utama **"Pinjam Setrika Sekarang"** (Check-in).
   - **Kondisi Sedang Dipinjam (`is_available = false`):**
     - Menampilkan badge ungu/kuning **"Sedang Dipakai"**, nama peminjam aktif (`current_borrower`), nomor kamar (`current_room`), durasi waktu sejak dipinjam (`borrowed_at`), serta dua tombol aksi: **"Kembalikan Setrika"** (Check-out) dan **"Ikut Antrean (Waitlist)"**.
3. **Waitlist / Antrean Berikutnya (`rounded-2xl`):**
   - Menampilkan daftar penghuni asrama yang sedang mengantre untuk memakai setrika setelah peminjam saat ini selesai.
   - Urutan antrean diurutkan berdasarkan waktu pendaftaran paling awal (FIFO). Penghuni di urutan pertama mendapatkan tombol cepat untuk langsung mengambil alih (Check-in) begitu setrika dikembalikan.
4. **Riwayat Peminjaman Bulan Ini (`rounded-2xl`):**
   - Mini calendar strip 7 hari terakhir (hari ini di-highlight), lalu daftar peminjaman 30 hari terakhir dikelompokkan per tanggal (`Hari Ini`, `Kemarin`, `12 Nov`) lengkap dengan nama, nomor kamar, waktu pinjam, dan waktu kembali. Data lebih tua dari 30 hari tidak ditampilkan.

### B. Modal Form Check-in, Check-out, & Waitlist

1. **Modal Check-in (Pinjam Setrika):**
   - Muncul ketika pengguna menekan tombol **"Pinjam Setrika Sekarang"** (atau dari urutan pertama antrean).
   - Input:
     - `Nama Peminjam` (wajib, teks)
     - `Nomor Kamar` (wajib, teks/angka, contoh: `A-12` atau `204`)
     - `Estimasi Durasi` (opsional/pilihan cepat pill: `15 mnt`, `30 mnt`, `45 mnt`, `60 mnt`)
   - Submit:
     - Memperbarui baris tunggal di `iron_status` menjadi `is_available = false` beserta detail peminjam.
     - Membuat baris baru di `borrow_history` dengan `borrowed_at = now()` dan `returned_at = null`.
2. **Modal Check-out (Kembalikan Setrika):**
   - Muncul ketika peminjam menekan tombol **"Kembalikan Setrika"**.
   - Menampilkan ringkasan siapa yang meminjam, kamar, dan durasi pemakaian.
   - Konfirmasi pengembalian:
     - Mengisi `returned_at = now()` pada catatan aktif di `borrow_history`.
     - Mengubah baris `iron_status` menjadi `is_available = true` dan mengosongkan `current_borrower`, `current_room`, serta `borrowed_at` (atau mempromosikan antrean berikutnya sesuai aksi pengguna).
3. **Modal Masuk Antrean (Join Waitlist):**
   - Muncul ketika setrika sedang dipakai dan penghuni lain menekan **"Ikut Antrean"**.
   - Input: `Nama` dan `Nomor Kamar`.
   - Menyimpan entri antrean agar penghuni lain tahu siapa yang menunggu giliran berikutnya.

---

## 3. Database Schema (Supabase PostgreSQL)

### A. Tabel `iron_status` (Single-Row Real-Time Status)

Tabel ini hanya memiliki **1 baris tetap** (`id = 1`) sebagai sumber kebenaran tunggal (_single source of truth_) kondisi setrika saat ini.

```sql
create table public.iron_status (
  id integer primary key default 1,
  is_available boolean not null default true,
  current_borrower text,
  current_room text,
  borrowed_at timestamptz,
  active_history_id uuid,
  updated_at timestamptz not null default now(),
  constraint single_row_check check (id = 1)
);

-- Inisialisasi 1 baris awal
insert into public.iron_status (id, is_available, current_borrower, current_room, borrowed_at)
values (1, true, null, null, null)
on conflict (id) do nothing;
```

### B. Tabel `borrow_history` (Riwayat Peminjaman & Antrean)

Tabel ini mencatat seluruh riwayat peminjaman sekaligus antrean (_waitlist_) menggunakan kolom `status` (`waiting`, `borrowed`, `returned`).

```sql
create table public.borrow_history (
  id uuid primary key default gen_random_uuid(),
  borrower_name text not null,
  room_number text not null,
  status text not null default 'borrowed' check (status in ('waiting', 'borrowed', 'returned', 'cancelled')),
  borrowed_at timestamptz,
  returned_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_borrow_history_status_created on public.borrow_history (status, created_at asc);
```

**Penjelasan Siklus Data di `borrow_history`:**

- **`status = 'waiting'`**: Penghuni masuk daftar tunggu (_waitlist_). `borrowed_at` dan `returned_at` bernilai `null`. Diurutkan berdasarkan `created_at ASC`.
- **`status = 'borrowed'`**: Penghuni sedang memakai setrika. `borrowed_at` terisi waktu mulai pinjam, `returned_at` bernilai `null`.
- **`status = 'returned'`**: Setrika sudah dikembalikan. `borrowed_at` dan `returned_at` keduanya terisi.

### C. Row Level Security (RLS) & Realtime

```sql
alter table public.iron_status enable row level security;
alter table public.borrow_history enable row level security;

-- Kebijakan akses publik internal asrama (anon key)
create policy "Allow public read iron_status"
  on public.iron_status for select using (true);

create policy "Allow public update iron_status"
  on public.iron_status for update using (true) with check (id = 1);

create policy "Allow public read borrow_history"
  on public.borrow_history for select using (true);

create policy "Allow public insert borrow_history"
  on public.borrow_history for insert with check (true);

create policy "Allow public update borrow_history"
  on public.borrow_history for update using (true);

-- Aktifkan Supabase Realtime
alter publication supabase_realtime add table public.iron_status;
alter publication supabase_realtime add table public.borrow_history;
```

---

## 4. Struktur File Proyek

```text
src/
├── app/
│   ├── layout.tsx              # Root layout, font, dan wrapper mobile-first
│   ├── page.tsx                # Halaman utama Dashboard (Status, Waitlist, History)
│   └── globals.css             # Tailwind directives & variabel warna pastel
├── components/
│   ├── HeaderCard.tsx          # Header aplikasi & indikator live
│   ├── IronStatusCard.tsx      # Kartu utama status setrika (Tersedia / Dipakai)
│   ├── WaitlistCard.tsx        # Kartu daftar antrean (Waitlist)
│   ├── BorrowHistoryCard.tsx   # Kartu riwayat peminjaman terakhir
│   └── ActionModal.tsx         # Modal form Check-in, Check-out, & Join Waitlist
├── lib/
│   ├── supabase.ts             # Inisialisasi Supabase client
│   └── ironService.ts          # Fungsi query & mutasi (checkIn, checkOut, joinWaitlist)
└── types/
    └── iron.ts                 # Definisi tipe TypeScript (IronStatus, BorrowHistory)
```

---

## 5. Fase Pengerjaan (Phase 0 hingga Phase 5)

### Phase 0: Inisialisasi Proyek & Konfigurasi Dasar

- [x] **Step 1: Inisialisasi proyek Next.js (App Router) dengan Tailwind CSS dan TypeScript**
  - Jalankan `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` (atau pastikan struktur proyek telah siap).
- [x] **Step 2: Instalasi dependensi utama**
  - Jalankan `npm install @supabase/supabase-js lucide-react clsx tailwind-merge`.
- [x] **Step 3: Konfigurasi tema pastel & mobile-first layout di `src/app/globals.css` dan `src/app/layout.tsx`**
  - Atur background luar `bg-violet-50/70`, teks utama `text-slate-900`, dan bungkus `children` di dalam container mobile-first `max-w-md mx-auto min-h-screen bg-[#F8F7FF] px-4 py-6`.
- [x] **Step 4: Buat tipe data dasar di `src/types/iron.ts`**
  - Definisikan interface `IronStatus` dan `BorrowHistory` sesuai skema tabel Supabase.

### Phase 1: Pembuatan Komponen UI Statis Berbasis Kartu (Habit Tracker Style)

- [x] **Step 1: Buat komponen `HeaderCard.tsx`**
  - Tampilkan ikon setrika/kilau (`Sparkles` / `Shirt` dari `lucide-react`) dalam kotak `rounded-2xl bg-violet-100 p-2.5 text-violet-600`, judul aplikasi, dan badge status live.
- [x] **Step 2: Buat komponen `IronStatusCard.tsx` dengan mock state** (baru state Tersedia; state Sedang Dipakai menyusul di Phase 3)
  - Desain kartu utama `rounded-3xl p-6 shadow-sm` yang memiliki tampilan berbeda saat **Tersedia** (aksen hijau pastel lembut & tombol utama ungu `bg-violet-600 rounded-2xl`) dan saat **Sedang Dipakai** (menampilkan nama peminjam, nomor kamar, timer durasi berjalan, tombol Check-out, dan tombol Ikut Antrean).
- [x] **Step 3: Buat komponen `WaitlistCard.tsx`**
  - Desain kartu antrean `rounded-3xl bg-white p-5 border border-violet-100` dengan daftar nomor urut pill (`#1`, `#2`), nama, nomor kamar, dan empty state yang ramah jika antrean kosong.
- [x] **Step 4: Buat komponen `BorrowHistoryCard.tsx`**
  - Desain kartu daftar riwayat peminjaman selesai (`status = 'returned'`) lengkap dengan informasi kamar dan waktu pengembalian.
- [x] **Step 5: Buat komponen `ActionModal.tsx`**
  - Desain modal bottom-sheet / centered card (`rounded-3xl`) untuk form input Nama & Nomor Kamar saat Check-in, Join Waitlist, maupun konfirmasi Check-out.

### Phase 2: Setup Database Supabase & Konfigurasi Client

- [x] **Step 1: Eksekusi SQL Schema di Supabase SQL Editor**
  - Jalankan script pembuatan tabel `iron_status` (beserta 1 baris default `id = 1`), tabel `borrow_history`, RLS policies, dan publikasi Realtime.
- [x] **Step 2: Konfigurasi Environment Variables (`.env.local`)**
  - Tambahkan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [x] **Step 3: Buat inisialisasi client di `src/lib/supabase.ts`**
  - Ekspor instance `supabase` menggunakan `createClient(supabaseUrl, supabaseAnonKey)`.

### Phase 3: Integrasi Fitur Check-in & Check-out ke Supabase

- [x] **Step 1: Implementasikan fungsi layanan data di `src/lib/ironService.ts`**
  - `getDashboardData()`: Mengambil baris `iron_status` (`id = 1`), daftar waitlist (`status = 'waiting'`), dan riwayat (`status = 'returned'`) **khusus 30 hari terakhir**.
    - **Aturan wajib (retensi tampilan 1 bulan):** query riwayat ke `borrow_history` WAJIB memakai filter `.gte('created_at', oneMonthAgo)`, dengan `const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()`. Data lebih tua dari 30 hari tidak ditarik sehingga otomatis hilang dari UI (data tetap tersimpan di database, hanya disembunyikan).
    - Contoh: `supabase.from('borrow_history').select('*').eq('status', 'returned').gte('created_at', oneMonthAgo).order('returned_at', { ascending: false })`.
    - Index `idx_borrow_history_status_created (status, created_at)` sudah mendukung filter ini.
    - UI `BorrowHistoryCard` mengelompokkan hasil per tanggal (`Hari Ini`, `Kemarin`, `12 Nov`) via `src/lib/historyDates.ts`, dan mini calendar strip memakai tanggal hari ini yang sebenarnya (zona `Asia/Jakarta`), menggantikan `MOCK_TODAY`.
  - `checkInIron(borrowerName, roomNumber, waitlistId?)`: Memastikan setrika tersedia, memasukkan/memperbarui baris di `borrow_history` menjadi `borrowed`, lalu mengupdate `iron_status` (`is_available = false`, `current_borrower`, `current_room`, `borrowed_at`).
  - `checkOutIron(activeHistoryId?)`: Mengupdate baris aktif di `borrow_history` (`status = 'returned'`, `returned_at = now()`) dan mereset `iron_status` (`is_available = true`, field peminjam `null`).
- [x] **Step 2: Hubungkan `src/app/page.tsx` dengan `ironService.ts`**
  - Ganti data statis dengan state dari Supabase, tambahkan indikator loading skeleton (`rounded-3xl animate-pulse`), validasi input kosong, serta pesan error apabila gagal menyimpan.

### Phase 4: Finalisasi Logika Antrean (Waitlist) & Realtime Subscription

- [x] **Step 1: Implementasikan fungsi antrean di `src/lib/ironService.ts`**
  - `joinWaitlist(borrowerName, roomNumber)`: Menambahkan baris baru ke `borrow_history` dengan `status = 'waiting'`.
  - `cancelWaitlist(id)`: Mengubah status entri antrean menjadi `cancelled` jika penghuni batal mengantre.
  - `claimFromWaitlist(waitlistEntry)`: Saat setrika sudah berstatus **Tersedia**, penghuni di urutan `#1` pada daftar tunggu dapat menekan tombol **"Ambil Giliran"** untuk langsung melakukan Check-in otomatis menggunakan nama dan nomor kamar dari antrean.
- [x] **Step 2: Pasang Supabase Realtime di `src/app/page.tsx`**
  - Subscribe ke perubahan tabel `iron_status` dan `borrow_history` menggunakan `supabase.channel('custom-all-channel')` sehingga setiap kali ada penghuni yang meminjam, mengembalikan, atau masuk antrean, layar semua penghuni lain langsung terbarui tanpa perlu refresh halaman.

### Phase 5: Pemolesan Akhir, Validasi Edge Cases, & Verifikasi

- [x] **Step 1: Tangani kondisi balapan (_Race Condition_), estafet otomatis antrean, & notifikasi toast**
  - Saat `checkOutIron` dipanggil, cek pengantre teratas (`status = 'waiting'`). Jika ada, langsung promosikan ke `borrowed` dan oper `iron_status` ke peminjam berikutnya; jika kosong, kembalikan ke `is_available = true` dengan menyimpan `current_room` terakhir.
  - Tampilkan notifikasi pop-up (toast) kustom saat pengembalian normal maupun saat setrika otomatis dioper ke pengantre berikutnya.
- [x] **Step 2: Audit Aksesibilitas, Kontras, & Responsivitas Mobile**
  - Pastikan semua tombol memiliki ukuran sentuh minimal `44px`, modal dapat ditutup dengan tombol `Escape` atau klik backdrop, dan kontras teks di atas latar pastel memenuhi standar keterbacaan.
- [x] **Step 3: Pengujian End-to-End & Build Produksi**
  - Jalankan verifikasi dan uji alur lengkap: kondisi awal tersedia -> Peminjam A Check-in -> Peminjam B masuk Waitlist -> Peminjam A Check-out -> otomatis estafet ke Peminjam B -> verifikasi riwayat tercatat rapi.
