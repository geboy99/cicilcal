# Changelog — FinSyariah Kalkulator

Catatan perubahan, terbaru di atas. Spesifikasi dan angka uji ada di `docs/`:
`docs/HANDOVER.md` (serah terima awal, Fitur 1–3) dan `docs/SPEK-FITUR-4.md` (Fitur 4).

## [Belum dirilis]

### Diperbaiki
- **Pelunasan dipercepat murabahah (Fitur 4) kini mengikuti teks resmi Fatwa DSN-MUI 153/2022.**
  Yang dibayar = harga saat pelunasan (harga jual tunai + tambahan harga sebanding waktu yang telah
  berjalan) − angsuran yang sudah dibayar, ditambah biaya riil/administrasi bila ada. Menggantikan tampilan
  rentang dan isian "% potongan", yang didasarkan pada ringkasan sekunder (ketentuan lama Fatwa 23/2002).
  Contoh bawaan bulan 60: Rp 300.000.000 (sebelumnya rentang Rp 361,3 jt – Rp 718,8 jt).
- Isian baru di kartu A: *Harga jual tunai di akad* (kosong = harga aset, ditandai asumsi) dan
  *Biaya riil & administrasi pelunasan*.
- Catatan Sisa Kewajiban di Fitur 2, 3, dan 4 disesuaikan (potongan wajib, dihitung dari harga jual tunai).

### Dokumentasi
- `docs/HANDOVER-2.md` diganti nama menjadi `docs/SPEK-FITUR-4.md`; riwayat perubahan dipindah ke
  `CHANGELOG.md` ini. `docs/HANDOVER.md` tetap sebagai dokumen serah terima asli.
- `docs/SPEK-FITUR-4.md` §4 berisi ketentuan Fatwa 153/2022 dan Pedoman MMQ 01/2013 yang diverifikasi dari teks resmi.

## 2026-10-22

### Fitur 4: Bandingkan Syariah (Murabahah) & Konvensional — ditambahkan
- Tab baru (label HP/tablet: **Bandingkan**). A · Murabahah vs B · Kredit Konvensional.
- Kartu per dimensi (total biaya, angsuran awal, kepastian), tabel ringkasan dengan sorotan nilai
  lebih rendah dan kolom **Lebih rendah**, titik impas bunga floating, grafik angsuran per bulan,
  pelunasan dipercepat (slider bulan), jadwal A/B dengan **Sisa Kewajiban** di kedua sisi.
- Mesin hitung baru: `scheduleSegments`, `segmentsFixedThenFloat`, `upfrontFees`,
  `effectiveCostWithFees`, `earlySettlement`, `breakEvenRate`. Step-up (Fitur 3) kini memakai
  `scheduleSegments`; angka Fitur 3 tidak berubah.
- Editor jenjang dipakai bersama Fitur 3 dan Fitur 4. Tombol "Isi dari Fitur 2 / Fitur 3".
- Keputusan selama pengembangan: MMQ ditunda (tidak ada di Fitur 1–3); 2 produk saja; denda sebagai
  keterangan; pelunasan murabahah sebagai rentang (*kemudian dikoreksi, lihat atas*).

### Berlaku untuk semua fitur
- Contoh isian disamakan: harga 500 jt, DP 100 jt (pokok 400 jt), 240 bulan, margin efektif 10,5% p.a.
  (Fitur 1 memakai angsuran 3.993.519,55).
- Label tab disingkat di bawah 1024px (4 tab tidak muat berlabel panjang).
- Catatan Sisa Kewajiban di Fitur 2 dan 3 disesuaikan dengan ketentuan potongan pelunasan.

### Fitur 1
- Keterangan baris Margin Efektif p.a. diringkas menjadi "Dicari dari rumus anuitas\*"; rumus lengkap
  dipindah ke catatan di bawah tabel.

### Istilah
- "Margin Total" diganti **Total Margin (%)** di seluruh UI (Rp: Total Margin; %: Total Margin (%)).
- Label "BARU" dihapus.

### Rilis awal (sesuai `docs/HANDOVER.md`)
- Fitur 1: Margin Efektif p.a. (anuitas) + margin flat; input angsuran desimal format Indonesia.
- Fitur 2: perbaikan bug Margin Total pada skema Efektif (Anuitas) dengan solver; kolom Sisa Kewajiban /
  Sisa Pokok Pembiayaan + sakelar.
- Fitur 3: step-up / berjenjang dengan validasi jenjang, margin efektif gabungan, pembanding margin tetap.
- Istilah diseragamkan, tampilan responsif, cetak/PDF.
- Uji penerimaan otomatis `tests/acceptance.cjs`.
