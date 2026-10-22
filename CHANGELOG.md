# Changelog — FinSyariah Kalkulator

Catatan perubahan, terbaru di atas. Spesifikasi dan angka uji ada di `docs/`:
`docs/HANDOVER.md` (serah terima awal, Fitur 1–3) dan `docs/SPEK-FITUR-4.md` (Fitur 4).

## [Belum dirilis]

### Ditemukan (menunggu keputusan)
- **Teks resmi Fatwa DSN-MUI 153/2022 berbeda dari ringkasan sekunder** yang dipakai sebelumnya.
  Potongan pelunasan murabahah tidak "besarnya kebijakan lembaga, tidak diperjanjikan di akad". Fatwa
  menetapkan rumusnya: sisa yang dibayar = *qimah haliyyah* (harga jual tunai + tambahan harga sesuai
  waktu yang telah dilewati) − angsuran yang telah dibayar, dengan harga perolehan, harga jual tunai,
  dan harga jual tidak tunai disepakati saat akad. Tampilan rentang di Fitur 4 dan catatan kakinya perlu
  dikoreksi. Lihat `docs/SPEK-FITUR-4.md` §4.

### Dokumentasi
- `docs/HANDOVER-2.md` diganti nama menjadi `docs/SPEK-FITUR-4.md`; riwayat perubahan dipindah ke
  `CHANGELOG.md` ini. `docs/HANDOVER.md` tetap sebagai dokumen serah terima asli.

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
  keterangan; pelunasan murabahah sebagai rentang (*perlu koreksi, lihat atas*).

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
