# Spesifikasi Fitur 4 — Bandingkan Syariah & Konvensional

Lanjutan `HANDOVER.md` §9 (Tahap A). Dokumen ini adalah acuan keputusan, rumus, dan angka uji Fitur 4, dan diperbarui bila keputusan berubah. Riwayat perubahan ada di `CHANGELOG.md`.

---

## 1. Keputusan

| Topik | Keputusan | Alasan |
|---|---|---|
| Ruang lingkup | Tahap A saja: Syariah vs kredit konvensional beragun | Paylater/pinjaman daring berbeda satuan (harian) dan batas OJK belum seragam → Tahap B terpisah |
| Produk syariah | **Hanya Murabahah** (1 jenjang = margin tetap, >1 = step-up) | MMQ tidak ada di Fitur 1–3; menambahkannya hanya di Fitur 4 membingungkan pengguna |
| Jumlah produk | 2: **A · Murabahah** (hijau `#059669`) vs **B · Konvensional** (biru `#3b5bdb`) | Lolos validasi palet (CVD, kontras) |
| Floating | Wajib diisi bila masa tetap < tenor; tidak ada angka bawaan resmi | Acuan pasar berubah; tidak di-hardcode |
| Netralitas | Tidak ada "pemenang" tunggal. Kartu per dimensi + sorotan nilai lebih rendah per baris | Produk lebih murah total ≠ lebih ringan di awal ≠ biaya efektif lebih rendah |
| Denda | Keterangan teks saja, tanpa simulasi | Denda syariah nominal per akad; simulasi menambah input dengan nilai kecil |
| Pelunasan murabahah | **Rentang** sisa pokok – sisa kewajiban; isian potongan opsional (kosong = rentang) | Potongan wajib diberikan tetapi besarnya kebijakan lembaga (lihat §4) |
| Istilah | A: margin, angsuran. B: **bunga**, angsuran. "Cicilan" tetap tidak dipakai | Konsisten dengan HANDOVER §3; "bunga" hanya di sisi B |
| Contoh isian | Sama di semua fitur: harga 500 jt, DP 100 jt (pokok 400 jt), 240 bln, margin efektif 10,5% | Pengguna melihat angka yang saling cocok antar-fitur |
| Label tab | `Fitur 4: Bandingkan Syariah & Konvensional`; HP/tablet: `Bandingkan` | Label singkat dipakai < 1024px karena 4 tab |

## 2. Mesin hitung (fungsi murni di `FinEngine`)

```
scheduleSegments(P, n, segments, { metode: 'anuitas' | 'pokokTetap' })
  segments: [{ dari, sampai, ratePa, pasti }]   // pasti:false = asumsi (floating)
  anuitas    : A_k = PMT(r_k, n − dari_k + 1, sisa pokok)   — sama dengan step-up
  pokokTetap : pokok = P/n, bunga = sisa · r/12 (efektif menurun)
scheduleStepUp(P, n, tiers)          = scheduleSegments(..., anuitas)
segmentsFixedThenFloat(n, fix, fixMonths, float)
upfrontFees(P, { provisiPct, adminRp })
effectiveCostWithFees(res, fees)     = irr([−(P − fees), angsuran...]) × 12
earlySettlement(res, k, { basis: 'sisaKewajiban', potonganPct })   // murabahah
earlySettlement(res, k, { basis: 'sisaPokok', penaltyPct })        // konvensional
  potongan = potonganPct × Σ margin bulan k+1..n (sisa margin belum jatuh tempo)
breakEvenRate(costAt, target)        // bisection; costAt naik monoton
```

Total biaya = total angsuran + biaya di muka. Titik impas = bunga floating B yang membuat total biaya B = total biaya A.

## 3. Tampilan

1. **Kartu per dimensi**: Total biaya lebih rendah · Angsuran awal lebih ringan (berapa bulan) · Angsuran lebih pasti.
2. **Ringkasan Perbandingan**: kolom `Komponen | A · Murabahah | B · Konvensional | Lebih rendah`. Sel nilai lebih rendah ditebalkan, diberi latar tipis + garis kiri warna produk. Kolom "Lebih rendah" menyebut produk + selisih; "Sama" bila setara. Angka bergantung asumsi diberi `≈`. Catatan otomatis bila total biaya dan biaya efektif menunjuk produk berbeda.
3. **Titik impas** (catatan hijau, netral).
4. **Grafik angsuran per bulan** (SVG, garis bertingkat; putus-putus = asumsi; tooltip + panah kiri/kanan).
5. **Pelunasan Dipercepat** (slider bulan k): A sebagai rentang batas bawah–batas atas, atau satu angka bila potongan diisi; B = sisa pokok + penalti. Bila B di dalam rentang A → "Tergantung potongan".
6. **Jadwal** A/B dengan kolom setara: … Total Angsuran, **Sisa Kewajiban** (+ sakelar sisa pokok). Di B judulnya `Sisa Kewajiban ≈` bila ada floating, dengan catatan bahwa pelunasan konvensional dihitung dari sisa pokok + penalti.
7. HP: tabel perbandingan menjadi kartu per baris (A | B berdampingan, "Lebih rendah" di bawah).

## 4. Dasar ketentuan pelunasan (diverifikasi dari teks resmi)

**Fatwa DSN-MUI No. 153/DSN-MUI/VI/2022** — Pelunasan Utang Pembiayaan Murabahah Sebelum Jatuh Tempo (24 Juni 2022):
- Ketentuan Umum: *Tsaman Naqdy* = harga jual tunai; *Qimah Ismiyyah* = harga jual tidak tunai yang disepakati saat akad; *Qimah Haliyyah* = harga saat pelunasan = harga jual tunai + tambahan harga berdasarkan waktu yang telah dilewati.
- Ketiga.1: saat akad **harus disepakati** harga perolehan, harga jual tunai, dan harga jual tidak tunai.
- Ketiga.3: bila dilunasi sebelum jatuh tempo (atas kehendak nasabah maupun LKS), LKS **wajib** memberi potongan dari *Qimah Ismiyyah*.
- Ketiga.4: sisa yang dibayar = *Qimah Haliyyah* − angsuran yang telah dibayar.
- Ketiga.5: bila atas kehendak nasabah, LKS boleh mengenakan biaya riil dan biaya administrasi pengakhiran akad (mengacu Fatwa 134/2020).
- Contoh di konsideran (Ibnu 'Abidin / al-Mishri): harga tunai 10, harga tangguh 20 untuk 10 bulan (angsuran 2/bulan). Pelunasan di bulan ke-5 → harga wajib 10 + 10 × 5/10 = 15; sudah dibayar 8 (4 bulan) → sisa 7. Tambahan harga dihitung **sebanding waktu** (1/bulan).
- Fatwa ini mengubah Fatwa 23/2002, yang dulu menyatakan potongan *boleh*, besarnya kebijakan LKS, dan tidak diperjanjikan dalam akad.

Rumus untuk kalkulator (n = tenor, k = bulan pelunasan setelah angsuran ke-k, TN = harga jual tunai bagian yang dibiayai, QI = total angsuran):
```
Qimah Haliyyah_k = TN + (QI − TN) × k / n
Pelunasan_k      = Qimah Haliyyah_k − Σ angsuran 1..k  (+ biaya riil/administrasi, opsional)
```
Bila TN = pokok dan angsuran tetap, hasilnya = pokok × (n − k)/n, lebih kecil dari sisa pokok anuitas (karena porsi margin anuitas lebih besar di awal).

**Status implementasi: belum sesuai.** `index.html` saat ini menampilkan rentang sisa pokok – sisa kewajiban dengan catatan "besarnya ditetapkan lembaga dan tidak diperjanjikan di akad". Menunggu keputusan koreksi.

**Pedoman Implementasi DSN-MUI No. 01/DSN-MUI/X/2013** — Musyarakah Mutanaqishah (4 November 2013):
- 5.j: nasabah boleh mengalihkan hishshah bank dengan jangka waktu dipercepat **atas persetujuan bank**.
- 7.b.i: kewajiban nasabah = sisa hishshah bank (outstanding pokok) + sisa pendapatan yang belum diselesaikan sebagaimana diperjanjikan dalam akad.
- 7.b.ii: bank *boleh* memberi discount (tanazulul haqq).
- 7.a: denda keterlambatan (ta'zir) diakui sebagai dana kebajikan; ganti rugi (ta'widh) berupa biaya penagihan dan eksekusi berdasarkan biaya historis nyata.

Nomor fatwa **tidak** ditampilkan di UI.

## 5. Uji penerimaan (otomatis di `tests/acceptance.cjs`)

| # | Input | Hasil yang diharapkan |
|---|---|---|
| F4-1 | Pokok 100 jt, 36 bln; A 9% tetap; B 9% fixed 36 bln; tanpa biaya | Total biaya sama ("Sama"), biaya efektif 9,00% / 9,00%, tanpa titik impas |
| F4-2 | 120 jt, 120 bln, B 12% fixed seluruh tenor, efektif menurun | Angsuran B bulan 1 Rp 2.200.000, bulan 120 Rp 1.010.000; jadwal B berkolom Angsuran Bunga + Sisa Kewajiban |
| F4-3 | F4-1 + provisi 1% | Biaya efektif > 9% (9,69%) |
| F4-4 | Contoh bawaan: 500/100 jt, 240 bln, A 10,5%, B 6,5% fixed 36 bln lalu 12%, provisi 1% + admin Rp 1 jt keduanya | A angsuran Rp 3.993.520; B bulan 1 Rp 2.982.293, tertinggi ≈ Rp 4.232.736 (bln 37); total biaya A Rp 963.444.691 vs ≈ Rp 975.840.670 → A lebih rendah ≈ Rp 12.395.979; biaya efektif 10,69% vs ≈ 10,17% (B lebih rendah, catatan beda arah tampil); titik impas 11,75% (selisih total < Rp 1 terhadap mesin); kartu angsuran awal: B lebih ringan bulan 1–36 |
| F4-5 | F4-4, pelunasan bulan 60, potongan kosong | A Rp 361.274.058 – Rp 718.833.519; B Rp 370.312.535 → "Tergantung potongan". Total keluar A Rp 605.885.231 – Rp 963.444.691 vs B ≈ Rp 584.260.730 → B lebih rendah min. Rp 21.624.501 |
| F4-6 | F4-5, potongan 100% | A = sisa pokok Rp 361.274.058, A lebih rendah dari B (B kena penalti 5%) |
| F4-7 | Potongan 150% | Error "maksimal 100% sisa margin" |
| F4-8 | B masa tetap 36 < tenor 120, floating kosong | Error "B: Asumsi bunga floating belum diisi." |
| F4-9 | Isi dari Fitur 3 (kasus §8 #9) | Jenjang 1–48: 8,34 / 49–264: 13,14; angsuran bulan 1 A Rp 3.312.133 |
| F4-10 | Viewport 390/820/1280, tab 4 | Tanpa scroll horizontal halaman |
| — | Semua uji §8 HANDOVER pertama | Tetap lolos (mesin step-up kini lewat `scheduleSegments`) |

## 6. Berikutnya (belum dikerjakan)

- **Tahap B**: pinjaman daring / paylater (satuan harian, `config.regulatoryCaps` dengan sumber & tanggal berlaku).
- **MMQ** sebagai produk bila Fitur 1–3 juga mendukungnya (mesin sudah siap lewat `segmentsFixedThenFloat`).
