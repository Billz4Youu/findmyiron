# Find My Iron | Pelacak Setrika Bersama Asrama

**Find My Iron** adalah aplikasi web *real-time* untuk melacak status peminjaman, lokasi kamar terakhir, antrean bergilir, serta riwayat pemakaian setrika bersama di lingkungan asrama (Lorong 2B). Aplikasi ini dirancang ringan dan praktis tanpa sistem *login* yang merepotkan, namun tetap dilengkapi pengaman PIN 4 digit per antrean serta panel kendali admin tersembunyi.

---

## Fitur Utama

- **Pelacakan Status & Lokasi Real-Time**: Menampilkan apakah setrika sedang **Tersedia**, **Sedang Dipakai** (lengkap dengan nama peminjam dan nomor kamar), atau dalam mode **Perbaikan** berkat sinkronisasi langsung dengan Supabase Realtime.
- **Maskot Interaktif & Pengingat Waktu (Overdue)**: Dilengkapi ilustrasi SVG maskot setrika kawaii yang berubah ekspresi menjadi cemberut saat peminjaman melewati batas estimasi waktu (15 atau 30 menit) maupun saat rusak.
- **Estafet Antrean Otomatis**: Saat peminjam aktif mengembalikan setrika (atau saat setrika selesai diperbaiki), sistem otomatis mengoper status peminjaman ke penghuni urutan pertama di daftar tunggu.
- **Keamanan Batal Antre dengan PIN 4 Digit**: Setiap pendaftar antrean mendapatkan 4 digit PIN unik agar antrean tidak bisa dibatalkan sembarangan oleh penghuni lain.
- **Kalender Riwayat Interaktif**: Filter riwayat peminjaman selama 30 hari terakhir menggunakan *strip* kalender mingguan interaktif.
- **Desain Responsif (Mobile, Tablet, Laptop)**: Tata letak adaptif satu kolom di layar HP dan multi-kolom di layar tablet/laptop dengan gaya *Clean Flat & Soft Pastel*.

---

## Teknologi Utama (Tech Stack)

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router) & React 19
- **Bahasa**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Ikon**: [Lucide React](https://lucide.dev/)
- **Database & Realtime**: [Supabase](https://supabase.com/) (`@supabase/supabase-js`)

---

## Panduan Penggunaan Aplikasi

### 1. Meminjam Setrika (Saat Status Tersedia)
1. Klik tombol **Pinjam Setrika Sekarang** pada kartu status utama.
2. Masukkan **Nama Panggilan**, **Nomor Kamar** (misal: `2.19`), dan pilih **Estimasi Waktu** (`15 Menit` atau `30 Menit`).
3. Klik **Konfirmasi Pinjam**. Status setrika akan langsung berubah di perangkat seluruh penghuni.

### 2. Mengembalikan Setrika & Estafet Otomatis
- Setelah selesai menyetrika, klik tombol **Kembalikan** pada kartu status.
- Jika **tidak ada antrean**, status kembali menjadi **Tersedia** dan lokasi terakhir tetap mencatat nomor kamar peminjam terakhir agar penghuni berikutnya tahu di mana harus mengambil setrika.
- Jika **ada antrean**, setrika otomatis dioper ke penghuni urutan `#1` di daftar antrean.

### 3. Ikut Antrean & Batal Antre
1. Saat setrika sedang dipakai orang lain, klik tombol **Ikut Antrean** lalu isi nama dan nomor kamar.
2. Simpan **4 digit PIN** yang muncul pada banner notifikasi.
3. Untuk membatalkan antrean, klik tombol silang (**X**) di sebelah nama Anda pada kartu Antrean, lalu masukkan 4 digit PIN tersebut.

### 4. Lapor Setrika Bermasalah
- Jika setrika rusak atau kabel bermasalah, klik tombol **Lapor Setrika Bermasalah** di bawah kartu status untuk mengubah tampilan menjadi mode **PERBAIKAN**.
- Setelah selesai diservis, klik **Tandai Sudah Diperbaiki** (sistem akan mengoper ke antrean pertama jika ada, atau mereset lokasi menjadi `-` jika antrean kosong).

### 5. Akses Menu Rahasia: Secret Admin Dashboard
Untuk menangani kendala darurat (seperti penghuni lupa PIN batal antre, lupa menekan tombol kembalikan, atau membersihkan riwayat spam):
1. **Trigger Rahasia**: Ketuk teks judul **"Find My Iron"** di pojok kiri atas header sebanyak **5 kali berturut-turut dengan cepat**.
2. **Autentikasi Master PIN**: Masukkan 4 digit Master PIN: **`9999`** lalu klik **Masuk**.
3. **Fitur Admin**:
   - **Reset Setrika (Force Reset)**: Mengembalikan status setrika secara paksa ke **Tersedia** dan mereset lokasi menjadi tanda strip (`-`).
   - **Manajemen Antrean (Force Cancel)**: Melihat nomor PIN pengguna yang sedang mengantre atau membatalkan antrean mereka secara sepihak lewat tombol **Paksa Batal**.
   - **Manajemen Riwayat (Hapus Data)**: Menghapus baris riwayat peminjaman tertentu secara permanen dari database Supabase menggunakan tombol ikon tong sampah merah.
   - **Export CSV**: Mengunduh seluruh rekaman tabel `borrow_history` dalam format `.csv` melalui tombol **Download CSV**.

---

## Menjalankan Proyek Secara Lokal & Deploy ke Vercel

1. Masuk ke direktori aplikasi dan instal dependensi:
   ```bash
   cd find-my-iron
   npm install
   ```
2. Buat file `.env.local` berisi kredensial Supabase Anda:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://project-id-anda.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-key-supabase-anda
   ```
3. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```
4. Untuk memverifikasi kesiapan *production build* (seperti di Vercel):
   ```bash
   npm run lint
   npm run build
   ```

