# Handover — Perbaikan & Fitur Baru FinSyariah Kalkulator

Dokumen ini untuk dieksekusi di Claude Code. Berisi semua keputusan desain, rumus, dan angka uji yang sudah disepakati. Tampilan acuan ada di `preview.html` (mockup statis, angka contoh sudah diverifikasi).

---

## 1. Konteks

- File sumber yang dianalisis adalah **salinan "Save Page As" dari browser**, sehingga mengandung injeksi Cloudflare:
  - `onclick="if (!window.__cfRLUnblockHandlers) return false; ..."` (Rocket Loader)
  - skrip `__CF$cv$params`, iframe tersembunyi, dan beacon `cdn-cgi`.
  - **Gunakan file sumber asli dari repo/hosting, bukan salinan ini.** Jika hanya ada salinan ini, bersihkan semua injeksi Cloudflare terlebih dulu.
- Target pengguna: **umum, semua bank/lembaga pembiayaan syariah**. Jangan menyebut nama bank tertentu di UI, preset, maupun contoh.

## 2. Ruang lingkup

**Dikerjakan sekarang**
1. Fitur 1: tambah Margin Efektif p.a. (anuitas) + input angsuran desimal.
2. Fitur 2: perbaiki bug mode Margin Total, ganti nama skema, ganti kolom sisa.
3. Fitur 3 (baru): simulasi angsuran berjenjang (step-up).
4. Seragamkan istilah di seluruh UI.
5. Tampilan responsif HP & tablet.

**Tidak dikerjakan sekarang**
- Cek DSR.
- Skema efektif menurun (pokok tetap, angsuran turun) — **sengaja ditiadakan**: pembiayaan syariah pada praktiknya berangsuran tetap.
- Pembanding pembiayaan konvensional, pembiayaan lain, dan paylater (rencana berikutnya, lihat §9).

## 3. Istilah baku (wajib konsisten di seluruh UI)

| Konsep | Pakai | Jangan pakai |
|---|---|---|
| Pembayaran bulanan | **Angsuran** (Angsuran per Bulan, Jadwal Angsuran, Total Angsuran) | Cicilan |
| Persentase biaya | **Margin** (Margin p.a., Margin Efektif, Margin Flat, Margin Total) | Rate, bunga |
| Nilai yang dibiayai | **Pokok Pembiayaan** | Pinjaman |
| Skema anuitas | **Efektif (Anuitas)** | "Anuitas / Efektif", "Efektif" saja |
| Pembanding step-up | **Margin tetap (single price)** | rate tetap, cicilan tetap |
| Margin flat di Fitur 1 | keterangan **"Angka konversi, dihitung dari pokok awal"** | "setara", "rate konversi" |
| Sisa di skema Flat | **Sisa Pokok Pembiayaan** | Sisa Pokok Pinjaman |
| Sisa di Efektif (Anuitas) & Step-Up | **Sisa Kewajiban** | Sisa Harga Jual (terlalu spesifik murabahah) |

Label tab: `Fitur 1: Hitung Margin dari Data Angsuran`, `Fitur 2: Angsuran & Jadwal Angsuran`, `Fitur 3: Step-Up / Berjenjang`. Di HP: `Margin`, `Angsuran`, `Step-Up`.

Hal yang **tidak** boleh ditulis di UI: rujukan Fatwa DSN-MUI 84/2012 (fatwa itu mengatur pengakuan keuntungan di pembukuan lembaga, bukan cara menghitung angsuran), dan istilah "IRR".

## 4. Rumus inti

Gunakan presisi penuh untuk semua perhitungan; bulatkan hanya saat ditampilkan.

```
i = margin_pa / 12

Anuitas  : A = P · i(1+i)^n / ((1+i)^n − 1)     ; jika i = 0 → A = P/n
           margin_bulan_k = sisa_pokok_(k−1) · i
           pokok_bulan_k  = A − margin_bulan_k

Flat     : margin_bulan = P · margin_pa / 12
           pokok_bulan  = P / n
           A = pokok_bulan + margin_bulan

Sisa Pokok Pembiayaan_k = sisa_pokok_(k−1) − pokok_bulan_k
Sisa Kewajiban_k        = total seluruh angsuran − Σ angsuran s.d. bulan k
Margin Flat p.a.        = (A·n − P) / P / (n/12)
```

**Solver margin efektif** (dipakai di Fitur 1, Fitur 2 mode Margin Total, dan Fitur 3):
- Cari `r` sehingga `PMT(r, n, P) = A` (Fitur 1) atau `PMT(r, n, P)·n − P = M` (Fitur 2).
- Bisection pada `r ∈ [0, 1.0]` (0–100% p.a.), 200 iterasi, atau Newton dengan fallback bisection. Fungsi monoton naik, jadi bisection aman.
- Kasus tepi: jika total angsuran = pokok → margin 0%. Jika total angsuran < pokok → tampilkan error.

**Margin efektif gabungan step-up**: cari `m` bulanan sehingga `Σ CF_k/(1+m)^k = 0` dengan `CF_0 = −P` dan `CF_k` = angsuran bulan k; tampilkan `m × 12`.

## 5. Spesifikasi per fitur

### Fitur 1 — Hitung Margin dari Data Angsuran

Input: Harga Awal / Plafon Pembiayaan, Uang Muka / DP, Angsuran per Bulan, Tenor (bulan).

- **Input Angsuran per Bulan menerima desimal berformat Indonesia** (`3.800.273,21`): titik = ribuan, koma = desimal. `parseRupiah` versi lama membuang semua non-digit sehingga `3.800.273,21` terbaca `380027321` — **wajib diperbaiki**. Auto-format saat mengetik harus mempertahankan koma desimal (maks 2 digit).
- Hero dua kolom:
  - Kiri (utama): `MARGIN EFEKTIF p.a. (ANUITAS)` + badge BARU, nilai, keterangan **"Margin yang biasa disebut bank syariah"**.
  - Kanan: `MARGIN FLAT p.a.`, nilai, keterangan **"Angka konversi, dihitung dari pokok awal"**.
- Kotak catatan hijau: *"Kenapa dua angka? Keduanya menghasilkan angsuran yang sama persis, hanya cara mengukurnya berbeda. Jangan bandingkan margin flat dengan margin efektif — X% flat tidak lebih murah dari Y% efektif."* (X, Y dinamis.)
- Kartu: Total Margin (Rp), Margin Total (%), Total Pembayaran.
- Tabel rincian: tambahkan baris **Margin Efektif p.a.** dan **Margin Efektif per bulan** (badge BARU), selain baris lama.

### Fitur 2 — Angsuran & Jadwal Angsuran

Input: Pokok Pembiayaan, Tenor, Input Parameter Margin (`Margin p.a. (%)` / `Margin Total (%)`), Skema (`Flat` — "Margin dari pokok awal" / `Efektif (Anuitas)` — "Margin dari sisa pokok").

**Bug yang diperbaiki.** Kode lama mengubah Margin Total ke p.a. secara linier (`total ÷ tenor × 12`) lalu dipakai sebagai rate anuitas. Akibatnya input margin total 27% menghasilkan margin aktual 14,48%. Perbaikan:

| Mode input | Skema Flat | Skema Efektif (Anuitas) |
|---|---|---|
| Margin p.a. | langsung | langsung |
| Margin Total | `p.a. = total ÷ (n/12)` | **solver**: cari r agar margin total = input |

Sinkronisasi dua field (saat ganti mode, ganti tenor, atau ganti skema) juga harus mengikuti skema:
- Flat: `total = p.a. × n/12`.
- Efektif (Anuitas): `total = (PMT(p.a., n, P)·n − P)/P`; `p.a.` dari total via solver.
- Kode lama melakukan konversi linier di `selectRateType` dan handler tenor — keduanya harus diubah.

Output:
- Hero: `ANGSURAN PER BULAN · SKEMA FLAT` / `· SKEMA EFEKTIF (ANUITAS)`, keterangan `Tetap n bulan · margin flat X% p.a.` atau `· margin efektif X% p.a.`
- Saat mode Margin Total + Efektif (Anuitas) aktif, tampilkan juga margin efektif hasil solver di hero.
- Kartu: Total Pembayaran, Total Margin (`x% dari pokok`).
- **Kolom terakhir jadwal:**
  - Flat → `Sisa Pokok Pembiayaan`.
  - Efektif (Anuitas) → `Sisa Kewajiban`, ditambah sakelar **"Tampilkan sisa pokok pembiayaan"** (default mati) yang menambah kolom Sisa Pokok Pembiayaan.
- Catatan di bawah tabel: *"Sisa Kewajiban = jumlah seluruh angsuran yang belum dibayar (pokok + margin). Pada akad murabahah, ini adalah sisa harga jual yang terikat di akad; potongan margin saat pelunasan dipercepat mengikuti kebijakan lembaga pembiayaan. Skema Flat menampilkan Sisa Pokok Pembiayaan."*

### Fitur 3 — Step-Up / Berjenjang (baru)

Input: Pokok Pembiayaan, Tenor Total (bulan), daftar **Jenjang Margin Efektif** (Dari bulan, Sampai bulan, Margin p.a.) yang bisa ditambah/dihapus, Pembanding opsional `Margin tetap (single price)`.

Default form: 1 jenjang (bulan 1 s.d. tenor). Tidak ada preset bank.

Validasi (tampilkan di alert-box merah yang sudah ada):
- Jenjang pertama mulai bulan 1; jenjang terakhir berakhir di bulan = tenor.
- Tidak ada celah atau tumpang tindih (`dari_k = sampai_(k−1) + 1`).
- `dari ≤ sampai`; margin ≥ 0.
- Tombol "+ Tambah jenjang" mengisi otomatis `dari` = `sampai` jenjang terakhir + 1.

Perhitungan: di awal jenjang k, `A_k = PMT(r_k/12, n − dari_k + 1, sisa_pokok_saat_itu)`. Angsuran tetap sepanjang jenjang.

Output:
- **Ringkasan per jenjang**: Jenjang, Periode, Margin p.a., Angsuran/bulan, Lonjakan (Rp dan % terhadap jenjang sebelumnya; jenjang 1 = "—"; lonjakan berwarna amber).
- Kartu: Total Pembayaran, Total Margin (% dari pokok), **Margin Efektif Gabungan** dengan keterangan "Margin efektif setara untuk seluruh tenor".
- Jika pembanding diisi: catatan hijau *"vs margin tetap X%: angsuran tetap Rp…, total Rp…. Step-up lebih murah/mahal Rp… dan lebih ringan Rp…/bulan selama N bulan pertama."* (pakai "lebih mahal"/"lebih berat" bila hasilnya sebaliknya; N = panjang jenjang 1).
- **Jadwal**: Bulan, Jenjang (`k · r%`), Angsuran Pokok, Angsuran Margin, Total Angsuran, Sisa Kewajiban (+ sakelar sisa pokok seperti Fitur 2). Baris pertama tiap jenjang baru disorot amber.

## 6. Responsif

Pakai `@media` di aplikasi (preview memakai `@container` hanya agar tombol ukuran layar bisa disimulasikan).

| Lebar | Tata letak |
|---|---|
| ≥ 1024px | 2 kolom (`380px 1fr`) seperti aslinya |
| 700–1023px | 1 kolom; isian formulir 2 kolom berdampingan (field lebar penuh: pilihan margin, skema, jenjang, pembanding) |
| < 700px | 1 kolom; label tab singkat; nav atas & tombol cetak di header disembunyikan; hero lebih kecil dan hero Fitur 1 bertumpuk; kartu menjadi baris ringkas (label kiri, nilai kanan, sub-teks disembunyikan); `font-size: 16px` untuk input (cegah zoom iOS); petunjuk "Geser tabel ke samping →" |

Berlaku di semua ukuran:
- **`.workspace-grid > * { min-width: 0 }`** — tanpa ini tabel lebar mendorong panel keluar layar di HP (terbukti di uji: lebar halaman jadi 577–680px pada viewport 390px).
- Area sentuh minimal 44px (tombol, tab, opsi, input).
- Tabel jadwal: `overflow-x: auto`, kolom pertama (Bulan) `position: sticky; left: 0`.
- Pilihan skema Fitur 2 tetap 2 kolom di semua ukuran.

## 7. Cetak / PDF

Pertahankan perilaku cetak lama (header khusus cetak, semua baris tercetak, panel tanpa bayangan). Tambahan:
- Sticky kolom dan scroll dimatikan saat cetak.
- Kolom Sisa Pokok ikut tercetak hanya jika sakelarnya aktif.
- Petunjuk geser dan sakelar tidak tercetak.

## 8. Uji penerimaan (angka harus cocok)

Tampilan dibulatkan ke rupiah; persentase 2 desimal di kartu, 4 desimal di tabel rincian.

| # | Fitur | Input | Hasil yang diharapkan |
|---|---|---|---|
| 1 | F1 | Plafon 300.000.000, DP 0, Angsuran **3.800.273,21**, 120 bln | Margin efektif **9,0000%**, flat **5,2011%**, total margin Rp156.032.785, total bayar Rp456.032.785 |
| 2 | F1 | 300.000.000, DP 0, 3.666.832, 120 | Efektif **8,17%**, flat 4,667% |
| 3 | F1 | 150.000.000, DP 30.000.000, 4.200.000, 36 (default lama) | Flat **8,67%**, efektif **15,68%** |
| 4 | F1 | 400.000.000, DP 0, 4.306.032, 264 | Efektif **11,98%** |
| 5 | F2 | 100.000.000, Margin Total 27%, 36, Efektif (Anuitas) | Margin efektif **16,24%**, angsuran **Rp3.527.778**, total margin **Rp27.000.000**. Bulan 1: pokok 2.174.084, margin 1.353.694, sisa kewajiban 123.472.222. Bulan 36: pokok 3.480.660, margin 47.117 |
| 6 | F2 | sama, skema Flat | Angsuran Rp3.527.778, margin flat 9,00%, bulan 1 sisa pokok 97.222.222 |
| 7 | F2 | 300.000.000, Margin p.a. 9%, 120, Efektif (Anuitas) | Angsuran **Rp3.800.273** (presisi 3.800.273,21) |
| 8 | F2 | 100.000.000, Margin p.a. 9%, 36, Efektif (Anuitas) → pindah ke mode Margin Total | Field total menampilkan **14,48%**, bukan 27% |
| 9 | F3 | 400.000.000, tenor 264, jenjang [1–48: 8,34%] [49–264: 13,14%] | Jenjang 1 **Rp3.312.133**, jenjang 2 **Rp4.475.149**, lonjakan +Rp1.163.016 (+35,1%). Total bayar **Rp1.125.614.625**, total margin Rp725.614.625 (181,40%), margin efektif gabungan **10,98%**. Bulan 49: pokok 425.792, margin 4.049.357, sisa kewajiban 962.157.069 |
| 10 | F3 | kasus 9 + pembanding 11,98% | Angsuran tetap ≈ Rp4.306.032; step-up lebih murah ≈ Rp11,18 juta (selisih kecil karena pembulatan rate pembanding wajar); lebih ringan Rp993.899/bulan selama 48 bulan pertama |
| 11 | F3 | jenjang [1–48] [50–264] | Error validasi: ada celah di bulan 49 |
| 12 | F3 | jenjang [1–48] [49–200], tenor 264 | Error validasi: jenjang tidak menutup tenor |
| 13 | Semua | viewport 390, 820, 1280px, ketiga tab | `document.documentElement.scrollWidth === clientWidth` (tidak ada scroll horizontal halaman) |

## 9. Rencana berikutnya (jangan dikerjakan sekarang, tapi siapkan strukturnya)

Pembanding ke **pembiayaan konvensional, pembiayaan lainnya, dan paylater**. Agar mudah ditambahkan:
- Pisahkan mesin hitung dari kode DOM. Tiap skema mengembalikan objek seragam:
  ```js
  { angsuranAwal, totalBayar, totalMargin, marginEfektifPa,
    rows: [{ bulan, jenjang, pokok, margin, angsuran, sisaPokok, sisaKewajiban }] }
  ```
- Fungsi murni: `pmt()`, `solveRateFromPayment()`, `solveRateFromTotalMargin()`, `irr()`, `scheduleFlat()`, `scheduleAnnuity()`, `scheduleStepUp()`.
- Catatan untuk nanti: di konvensional dan paylater, pelunasan dipercepat dihitung dari **sisa pokok** — itu alasan kolom sisa pokok dipertahankan lewat sakelar, bukan dihapus. Di sana juga skema efektif menurun lazim dipakai, jadi mungkin perlu dihidupkan kembali khusus untuk pembanding.

## 10. Lampiran

- `preview.html` — mockup statis tiga tab dengan tombol simulasi ukuran Desktop / Tablet 820px / HP 390px. Gunakan sebagai acuan tampilan dan teks; angkanya sudah diverifikasi dan sama dengan tabel uji di §8.
