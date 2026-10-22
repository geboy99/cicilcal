# FinSyariah Kalkulator

Kalkulator pembiayaan syariah satu file (`index.html`, tanpa dependensi) — buka langsung di browser.

- **Fitur 1** — Hitung Margin dari Data Angsuran (margin efektif p.a. anuitas + margin flat; input angsuran desimal `3.800.273,21`).
- **Fitur 2** — Angsuran & Jadwal Angsuran (skema Flat / Efektif (Anuitas); mode Total Margin (%) memakai solver).
- **Fitur 3** — Step-Up / Berjenjang (jenjang margin efektif, margin efektif gabungan, pembanding margin tetap).

Mesin hitung (`FinEngine` di `<script id="fin-engine">`) terpisah dari kode DOM: `pmt`, `solveRateFromPayment`,
`solveRateFromTotalMargin`, `irr`, `scheduleFlat`, `scheduleAnnuity`, `scheduleStepUp` — tiap skema mengembalikan objek
seragam `{ angsuranAwal, totalBayar, totalMargin, marginEfektifPa, rows: [...] }`.

## Uji penerimaan

```sh
NODE_PATH="$(npm root -g)" node tests/acceptance.cjs
```

Menjalankan seluruh kasus uji HANDOVER §8 (angka F1–F3, validasi jenjang, tanpa scroll horizontal di 390/820/1280px)
memakai Playwright + Chromium.
