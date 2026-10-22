/*
 * Uji penerimaan HANDOVER §8.
 * Jalankan: NODE_PATH="$(npm root -g)" node tests/acceptance.cjs
 * (butuh paket `playwright` dan Chromium; set CHROMIUM_PATH bila perlu)
 */
const path = require('path');
const { chromium } = require('playwright');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let failures = 0, passes = 0;

function check(name, actual, expected) {
  const ok = typeof expected === 'function' ? expected(actual) : actual === expected;
  if (ok) { passes++; console.log('  ✓ ' + name + (typeof expected === 'function' ? ' (' + actual + ')' : '')); }
  else { failures++; console.log('  ✗ ' + name + ': dapat ' + JSON.stringify(actual) + (typeof expected === 'function' ? '' : ', harap ' + JSON.stringify(expected))); }
}
const contains = (s) => (a) => typeof a === 'string' && a.includes(s);
const txt = (page, sel) => page.locator(sel).first().innerText().then((s) => s.trim());

async function rowCells(page, tableSel, bulan) {
  return page.$$eval(tableSel + ' tbody tr', (trs, b) => {
    const tr = trs.find((t) => t.cells[0].innerText.trim() === String(b));
    return tr ? Array.from(tr.cells).map((c) => c.innerText.trim()) : null;
  }, bulan);
}

async function f1(page, harga, dp, angsuran, tenor) {
  await page.click('.tab[data-tab="1"]');
  await page.fill('#f1Harga', harga);
  await page.fill('#f1Dp', dp);
  await page.fill('#f1Angsuran', angsuran);
  await page.fill('#f1Tenor', tenor);
  await page.click('#f1Form button[type=submit]');
  const cell = (k) => page.locator('#f1Table td[data-k="' + k + '"]').innerText();
  return { efektif: await cell('efektif'), flat: await cell('flat'), heroEf: await txt(page, '#f1Efektif'), heroFl: await txt(page, '#f1Flat'),
    totalMargin: await txt(page, '#f1TotalMargin'), totalBayar: await txt(page, '#f1TotalBayar') };
}

async function f2Setup(page, pokok, tenor, mode, value, skema) {
  await page.click('.tab[data-tab="2"]');
  await page.click('#f2Mode .opt[data-mode="' + mode + '"]');
  await page.fill('#f2Pokok', pokok);
  await page.fill('#f2Tenor', tenor);
  await page.fill(mode === 'pa' ? '#f2Pa' : '#f2Total', value);
  await page.click('#f2Skema .opt[data-skema="' + skema + '"]');
  await page.click('#f2Form button[type=submit]');
}

async function f3Setup(page, pokok, tenor, tiers, cmp) {
  await page.click('.tab[data-tab="3"]');
  await page.click('#f3Reset');
  await page.fill('#f3Pokok', pokok);
  await page.fill('#f3Tenor', tenor);
  for (let i = 1; i < tiers.length; i++) await page.click('#f3Add');
  const rows = page.locator('#f3Tiers .tier-row');
  for (let i = 0; i < tiers.length; i++) {
    const r = rows.nth(i);
    await r.locator('.t-dari').fill(String(tiers[i][0]));
    await r.locator('.t-sampai').fill(String(tiers[i][1]));
    await r.locator('.t-rate').fill(String(tiers[i][2]));
  }
  await page.fill('#f3Cmp', cmp || '');
  await page.click('#f3Form button[type=submit]');
}

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const jsErrors = [];
  page.on('pageerror', (e) => jsErrors.push(e.message));
  await page.goto(URL);

  console.log('Parser');
  check('parseRupiah("3.800.273,21")', await page.evaluate(() => FinUI.parseRupiah('3.800.273,21')), 3800273.21);
  await page.fill('#f1Angsuran', '');
  await page.type('#f1Angsuran', '380027321');
  await page.type('#f1Angsuran', ',219');
  check('auto-format mempertahankan koma desimal (maks 2 digit)', await page.inputValue('#f1Angsuran'), '380.027.321,21');

  console.log('#1 F1 300jt / 3.800.273,21 / 120');
  let r = await f1(page, '300.000.000', '0', '3.800.273,21', '120');
  check('margin efektif 9,0000%', r.efektif, '9,0000%');
  check('margin flat 5,2011%', r.flat, '5,2011%');
  check('total margin Rp 156.032.785', r.totalMargin, 'Rp 156.032.785');
  check('total bayar Rp 456.032.785', r.totalBayar, 'Rp 456.032.785');

  console.log('#2 F1 300jt / 3.666.832 / 120');
  r = await f1(page, '300.000.000', '0', '3.666.832', '120');
  check('efektif 8,17%', r.heroEf, '8,17%');
  check('flat 4,667%', r.flat, contains('4,667'));

  console.log('#3 F1 150jt / DP 30jt / 4.200.000 / 36');
  r = await f1(page, '150.000.000', '30.000.000', '4.200.000', '36');
  check('flat 8,67%', r.heroFl, '8,67%');
  check('efektif 15,68%', r.heroEf, '15,68%');

  console.log('#4 F1 400jt / 4.306.032 / 264');
  r = await f1(page, '400.000.000', '0', '4.306.032', '264');
  check('efektif 11,98%', r.heroEf, '11,98%');

  console.log('#1b F1 total angsuran < pokok → error');
  await page.fill('#f1Angsuran', '1.000.000');
  await page.click('#f1Form button[type=submit]');
  check('alert tampil', await page.isVisible('#f1Alert'), true);

  console.log('#5 F2 100jt / Total Margin 27% / 36 / Efektif (Anuitas)');
  await f2Setup(page, '100.000.000', '36', 'total', '27', 'anuitas');
  check('margin efektif 16,24%', await txt(page, '#f2Solved'), '16,24%');
  check('angsuran Rp 3.527.778', await txt(page, '#f2Angsuran'), 'Rp 3.527.778');
  check('total margin Rp 27.000.000', await txt(page, '#f2TotalMargin'), 'Rp 27.000.000');
  let c = await rowCells(page, '#f2Sched table', 1);
  check('bulan 1 pokok', c[1], 'Rp 2.174.084');
  check('bulan 1 margin', c[2], 'Rp 1.353.694');
  check('bulan 1 sisa kewajiban', c[4], 'Rp 123.472.222');
  c = await rowCells(page, '#f2Sched table', 36);
  check('bulan 36 pokok', c[1], 'Rp 3.480.660');
  check('bulan 36 margin', c[2], 'Rp 47.117');
  check('kolom terakhir = Sisa Kewajiban', await page.$$eval('#f2Sched thead th', (t) => t.map((x) => x.innerText.trim()).pop()), 'Sisa Kewajiban');
  await page.check('#f2Toggle');
  check('sakelar menambah Sisa Pokok Pembiayaan', await page.$$eval('#f2Sched thead th', (t) => t.map((x) => x.innerText.trim()).pop()), 'Sisa Pokok Pembiayaan');
  await page.uncheck('#f2Toggle');

  console.log('#6 F2 sama, skema Flat');
  await page.click('#f2Skema .opt[data-skema="flat"]');
  check('angsuran Rp 3.527.778', await txt(page, '#f2Angsuran'), 'Rp 3.527.778');
  check('margin flat 9,00%', await txt(page, '.view.active .hero .meta'), contains('margin flat 9,00% p.a.'));
  c = await rowCells(page, '#f2Sched table', 1);
  check('bulan 1 sisa pokok Rp 97.222.222', c[4], 'Rp 97.222.222');
  check('kolom terakhir = Sisa Pokok Pembiayaan', await page.$$eval('#f2Sched thead th', (t) => t.map((x) => x.innerText.trim()).pop()), 'Sisa Pokok Pembiayaan');

  console.log('#7 F2 300jt / 9% p.a. / 120 / Efektif (Anuitas)');
  await f2Setup(page, '300.000.000', '120', 'pa', '9', 'anuitas');
  check('angsuran Rp 3.800.273', await txt(page, '#f2Angsuran'), 'Rp 3.800.273');
  check('presisi 3.800.273,21', await page.evaluate(() => Math.round(FinEngine.pmt(0.09, 120, 3e8) * 100) / 100), 3800273.21);

  console.log('#8 F2 100jt / 9% p.a. / 36 / Anuitas → mode Total Margin (%)');
  await f2Setup(page, '100.000.000', '36', 'pa', '9', 'anuitas');
  await page.click('#f2Mode .opt[data-mode="total"]');
  check('field total 14,48', await page.inputValue('#f2Total'), '14,48');

  console.log('#9 F3 400jt / 264 / [1–48: 8,34%] [49–264: 13,14%]');
  await f3Setup(page, '400.000.000', '264', [[1, 48, '8,34'], [49, 264, '13,14']]);
  check('tanpa error', await page.isVisible('#f3Alert'), false);
  const sum = await page.$$eval('#f3Summary tbody tr', (t) => t.map((tr) => Array.from(tr.cells).map((c) => c.innerText.trim())));
  check('jenjang 1 Rp 3.312.133', sum[0][3], 'Rp 3.312.133');
  check('jenjang 2 Rp 4.475.149', sum[1][3], 'Rp 4.475.149');
  check('lonjakan +Rp 1.163.016 (+35,1%)', sum[1][4], '+Rp 1.163.016 (+35,1%)');
  check('total bayar Rp 1.125.614.625', await txt(page, '#f3TotalBayar'), 'Rp 1.125.614.625');
  check('total margin Rp 725.614.625', await txt(page, '#f3TotalMargin'), 'Rp 725.614.625');
  check('total margin 181,40%', await txt(page, '#f3TotalMargin + .s'), '181,40% dari pokok');
  check('margin efektif gabungan 10,98%', await txt(page, '#f3Gabungan'), '10,98%');
  c = await rowCells(page, '#f3Sched table', 49);
  check('bulan 49 pokok', c[2], 'Rp 425.792');
  check('bulan 49 margin', c[3], 'Rp 4.049.357');
  check('bulan 49 sisa kewajiban', c[5], 'Rp 962.157.069');
  check('bulan 49 disorot', await page.$$eval('#f3Sched tbody tr', (t) => t[48].classList.contains('tier')), true);

  console.log('#10 F3 kasus 9 + pembanding 11,98%');
  await f3Setup(page, '400.000.000', '264', [[1, 48, '8,34'], [49, 264, '13,14']], '11,98');
  const note = await txt(page, '#f3CmpNote');
  check('angsuran tetap ≈ Rp 4.306.032', note, contains('angsuran tetap Rp 4.306.032'));
  check('lebih murah ≈ Rp 11,18 juta', note, (s) => /lebih murah Rp 11\.1\d\d\.\d{3}/.test(s));
  check('lebih ringan Rp 993.899/bulan selama 48 bulan', note, contains('lebih ringan Rp 993.899/bulan selama 48 bulan pertama'));

  console.log('#11 F3 jenjang [1–48] [50–264]');
  await f3Setup(page, '400.000.000', '264', [[1, 48, '8,34'], [50, 264, '13,14']]);
  check('error celah bulan 49', await txt(page, '#f3Alert'), contains('Ada celah di bulan 49'));

  console.log('#12 F3 jenjang [1–48] [49–200], tenor 264');
  await f3Setup(page, '400.000.000', '264', [[1, 48, '8,34'], [49, 200, '13,14']]);
  check('error tidak menutup tenor', await txt(page, '#f3Alert'), contains('Jenjang tidak menutup tenor'));

  console.log('#13 Tidak ada scroll horizontal halaman');
  // Isi tab dengan data terbesar (jadwal 264 bulan, 2 jenjang + sakelar sisa pokok) sebelum mengukur.
  await f3Setup(page, '400.000.000', '264', [[1, 48, '8,34'], [49, 264, '13,14']], '11,98');
  await page.check('#f3Toggle');
  await f2Setup(page, '100.000.000', '36', 'total', '27', 'anuitas');
  await page.check('#f2Toggle');
  for (const w of [390, 820, 1280]) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const t of [1, 2, 3]) {
      await page.evaluate((n) => FinUI.showTab(n), t);
      const m = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      check(w + 'px tab ' + t + ' scrollWidth === clientWidth', m[0] + '/' + m[1], () => m[0] === m[1]);
    }
  }

  console.log('Istilah: tidak ada kata terlarang di UI');
  const body = (await page.evaluate(() => document.querySelector('header').textContent + ' ' + document.querySelector('main').textContent)).toLowerCase();
  for (const w of ['cicilan', 'bunga', 'pinjaman', 'irr', 'dsn-mui', 'fatwa', 'rate']) check('tidak memuat "' + w + '"', new RegExp('\\b' + w + '\\b').test(body), false);

  await page.evaluate(() => FinUI.showTab(1));
  await page.click('#f1Reset');
  check('F1 keterangan margin efektif ringkas', await page.$$eval('#f1Table tbody tr', (t) => t.find((tr) => tr.cells[0].innerText.trim() === 'Margin Efektif p.a.').cells[1].innerText.trim()), 'Dicari dari rumus anuitas*');
  check('F1 catatan rumus anuitas', await txt(page, '#f1Footnote'), contains('Margin efektif p.a. = i × 12'));
  check('tidak memuat "Margin Total"', /margin total/i.test(body), false);
  check('tidak memuat label "BARU"', /\bBARU\b/.test(await page.evaluate(() => document.querySelector('main').textContent)), false);
  check('tidak ada error JavaScript', jsErrors.join('; '), '');
  await browser.close();
  console.log('\n' + passes + ' lolos, ' + failures + ' gagal');
  process.exit(failures ? 1 : 0);
})();
