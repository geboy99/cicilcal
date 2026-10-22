/*
 * Uji penerimaan HANDOVER §8.
 * Jalankan: NODE_PATH="$(npm root -g)" node tests/acceptance.cjs
 * (butuh paket `playwright` dan Chromium; set CHROMIUM_PATH bila perlu)
 */
const path = require('path');
const { chromium } = require('playwright');

const URL = 'file://' + path.resolve(__dirname, '..', process.env.APP || 'index.html');
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

  const hasF4 = await page.$('#v4') !== null;
  if (hasF4) {
    console.log('F4 Bandingkan Syariah & Konvensional');
    const f4 = async (o) => {
      await page.evaluate(() => FinUI.showTab(4));
      await page.click('#f4Reset');
      await page.fill('#f4Harga', o.harga); await page.fill('#f4Dp', o.dp || '0'); await page.fill('#f4Tenor', o.tenor);
      if (o.tiers) {
        const r = page.locator('#f4ATiers .tier-row');
        await r.nth(0).locator('.t-sampai').fill(o.tenor); await r.nth(0).locator('.t-rate').fill(o.tiers);
      }
      await page.fill('#f4APot', o.pot || '0');
      await page.fill('#f4BFix', o.bFix); await page.fill('#f4BFixM', o.bFixM); await page.fill('#f4BFloat', o.bFloat || '');
      await page.click('#f4BMetode .opt[data-metode="' + (o.metode || 'anuitas') + '"]');
      await page.fill('#f4BPen', o.pen || '0');
      await page.$$eval('#v4 details.fees', (d) => d.forEach((x) => { x.open = true; }));
      for (const id of ['#f4AProv', '#f4BProv']) await page.fill(id, o.prov || '0');
      for (const id of ['#f4AAdmin', '#f4BAdmin']) await page.fill(id, o.admin || '0');
      await page.click('#f4Form button[type=submit]');
    };
    const cmpRow = (label) => page.$$eval('#f4Cmp tbody tr', (t, l) => {
      const tr = t.find((x) => x.cells[0].innerText.trim().startsWith(l)); return tr ? Array.from(tr.cells).map((c) => c.innerText.trim()) : null;
    }, label);

    // Margin 9% tetap vs bunga 9% fixed seluruh tenor, tanpa biaya → identik.
    await f4({ harga: '100.000.000', tenor: '36', tiers: '9', bFix: '9', bFixM: '36' });
    let row = await cmpRow('Total biaya');
    check('9% vs 9% tetap: total biaya sama', row[1] === row[2] && row[3] === 'Sama', true);
    check('9% vs 9% tetap: kartu total biaya "Sama"', await txt(page, '#f4VCost'), contains('Sama'));
    row = await cmpRow('Biaya efektif');
    check('9% vs 9% tetap: biaya efektif 9,00% keduanya', row[1] + ' / ' + row[2], '9,00% / 9,00%');
    check('tanpa floating: catatan tanpa titik impas', await txt(page, '#f4Note'), contains('tidak ada asumsi floating'));

    // Efektif menurun: pokok 120 jt, 120 bln, 12% → bulan 1 = 1 jt + 1,2 jt; bulan 120 = 1 jt + 10 rb.
    await f4({ harga: '120.000.000', tenor: '120', tiers: '12', bFix: '12', bFixM: '120', metode: 'pokokTetap' });
    await page.click('#f4SchedSel .opt[data-s="b"]');
    let c4 = await rowCells(page, '#f4Sched table', 1);
    check('efektif menurun bulan 1 Rp 2.200.000', c4[4], 'Rp 2.200.000');
    c4 = await rowCells(page, '#f4Sched table', 120);
    check('efektif menurun bulan 120 Rp 1.010.000', c4[4], 'Rp 1.010.000');
    check('kolom bunga di jadwal B', await page.$$eval('#f4Sched thead th', (t) => t.map((x) => x.innerText.trim()).join('|')), contains('Angsuran Bunga'));
    c4 = await rowCells(page, '#f4Sched table', 1);
    check('jadwal B punya Sisa Kewajiban (bulan 1)', await page.$$eval('#f4Sched thead th', (t) => t.map((x) => x.innerText.trim()).join('|')), 'Bulan|Periode|Angsuran Pokok|Angsuran Bunga|Total Angsuran|Sisa Kewajiban');
    await page.check('#f4Toggle');
    check('sakelar menambah Sisa Pokok di B', await page.$$eval('#f4Sched thead th', (t) => t.map((x) => x.innerText.trim()).pop()), 'Sisa Pokok');
    const sk = await page.evaluate(() => { const r = FinEngine.scheduleSegments(12e7, 120, [{ dari: 1, sampai: 120, ratePa: 0.12 }], { metode: 'pokokTetap' }); return [r.rows[0].sisaKewajiban, r.totalBayar - r.rows[0].angsuran]; });
    check('sisa kewajiban B bulan 1 = total − angsuran 1', Math.abs(sk[0] - sk[1]) < 1e-6, true);
    await page.uncheck('#f4Toggle');

    // Biaya di muka menaikkan biaya efektif.
    await f4({ harga: '100.000.000', tenor: '36', tiers: '9', bFix: '9', bFixM: '36', prov: '1' });
    row = await cmpRow('Biaya efektif');
    check('provisi 1% → biaya efektif > 9%', row[1], (v) => parseFloat(v.replace(',', '.')) > 9.5);

    // Titik impas konsisten dengan mesin hitung.
    await f4({ harga: '500.000.000', dp: '100.000.000', tenor: '240', tiers: '10,5', bFix: '6,5', bFixM: '36', bFloat: '12' });
    const be = await page.evaluate(() => {
      const E = FinEngine, P = 4e8, n = 240;
      const a = E.scheduleSegments(P, n, [{ dari: 1, sampai: n, ratePa: 0.105 }]).totalBayar;
      const cost = (r) => E.scheduleSegments(P, n, E.segmentsFixedThenFloat(n, 0.065, 36, r)).totalBayar;
      const res = E.breakEvenRate(cost, a);
      return { rate: res.rate, gap: Math.abs(cost(res.rate) - a) };
    });
    check('titik impas: selisih total < Rp 1', be.gap < 1, true);
    check('titik impas tampil = mesin', await txt(page, '#f4BreakEven'), (be.rate * 100).toFixed(2).replace('.', ',') + '%');
    check('angka floating diberi tanda ≈', (await cmpRow('Total biaya'))[2], contains('≈'));
    // Sorotan nilai lebih rendah & kolom "Lebih rendah"
    const winOf = (label) => page.$$eval('#f4Cmp tbody tr', (t, l) => {
      const tr = t.find((x) => x.cells[0].innerText.trim().startsWith(l));
      return tr.cells[1].classList.contains('win') ? 'A' : tr.cells[2].classList.contains('win') ? 'B' : '-';
    }, label);
    check('total biaya: A disorot (lebih rendah)', await winOf('Total biaya'), 'A');
    check('angsuran bulan 1: B disorot (lebih ringan)', await winOf('Angsuran bulan 1'), 'B');
    check('kolom Lebih rendah menyebut A + selisih', (await cmpRow('Total biaya'))[3], (v) => /^≈\s*A · Rp [\d.]+$/.test(v));
    check('kartu total biaya → A', await txt(page, '#f4VCost'), contains('A · Murabahah'));
    check('kartu angsuran awal → B, bulan 1–36', await txt(page, '#f4VA1'), (v) => v.includes('B · Konvensional') && v.includes('bulan 1–36'));
    check('kartu kepastian → A', await txt(page, '#f4VCert'), contains('A · Murabahah'));
    check('catatan beda arah total vs biaya efektif', await page.isVisible('#f4EffNote'), true);

    // Pelunasan: murabahah = sisa kewajiban; potongan 100% sisa margin = sisa pokok. Konvensional = sisa pokok × (1 + penalti).
    const st = await page.evaluate(() => {
      const E = FinEngine, r = E.scheduleSegments(4e8, 240, [{ dari: 1, sampai: 240, ratePa: 0.105 }]);
      const s0 = E.earlySettlement(r, 60, { basis: 'sisaKewajiban', potonganPct: 0 });
      const s1 = E.earlySettlement(r, 60, { basis: 'sisaKewajiban', potonganPct: 1 });
      const b = E.earlySettlement(r, 60, { basis: 'sisaPokok', penaltyPct: 0.05 });
      return [s0.pelunasan - r.rows[59].sisaKewajiban, s1.pelunasan - r.rows[59].sisaPokok, b.pelunasan - r.rows[59].sisaPokok * 1.05];
    });
    check('pelunasan: rumus dasar, potongan, penalti', st.every((d) => Math.abs(d) < 1e-3), true);
    await page.fill('#f4K', '60').catch(() => {});
    await page.$eval('#f4K', (el) => { el.value = '60'; el.dispatchEvent(new Event('input')); });
    check('slider pelunasan bulan 60', await txt(page, '#f4KLabel'), contains('Bulan 60'));

    // Pelunasan murabahah sebagai rentang (bila isian potongan kosong).
    if (((await page.getAttribute('#f4APot', 'placeholder')) || '').includes('rentang')) {
      await page.click('#f4Reset');
      await page.$eval('#f4K', (el) => { el.value = '60'; el.dispatchEvent(new Event('input')); });
      const settle = (l) => page.$$eval('#f4SettleTable tbody tr', (t, x) => {
        const tr = t.find((r) => r.cells[0].innerText.trim().startsWith(x)); return tr ? Array.from(tr.cells).map((c) => c.innerText.replace(/\s+/g, ' ').trim()) : null;
      }, l);
      const ref = await page.evaluate(() => {
        const E = FinEngine, r = E.scheduleSegments(4e8, 240, [{ dari: 1, sampai: 240, ratePa: 0.105 }]);
        const f = (x) => 'Rp ' + String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return { lo: f(r.rows[59].sisaPokok), hi: f(r.rows[59].sisaKewajiban) };
      });
      let srow = await settle('Jumlah pelunasan');
      check('potongan kosong → A rentang sisa pokok – sisa kewajiban', srow[1], ref.lo + ' – ' + ref.hi);
      check('B di atas batas bawah, di bawah batas atas → "Tergantung potongan"', srow[3], 'Tergantung potongan');
      srow = await settle('Batas bawah');
      check('batas bawah A = sisa pokok A', srow[1], ref.lo);
      await page.fill('#f4APot', '100'); await page.click('#f4Form button[type=submit]');
      await page.$eval('#f4K', (el) => { el.value = '60'; el.dispatchEvent(new Event('input')); });
      srow = await settle('Jumlah pelunasan');
      check('potongan 100% → A = sisa pokok, A lebih rendah (B kena penalti)', srow[1] === ref.lo && srow[3].includes('A ·'), true);
      await page.fill('#f4APot', '150'); await page.click('#f4Form button[type=submit]');
      check('potongan > 100% → error', await txt(page, '#f4Alert'), contains('maksimal 100%'));
      await page.click('#f4Reset');
    }

    // Isi dari Fitur 3.
    await f3Setup(page, '400.000.000', '264', [[1, 48, '8,34'], [49, 264, '13,14']]);
    await page.evaluate(() => FinUI.showTab(4));
    await page.click('#f4From3');
    check('isi dari Fitur 3: 2 jenjang', await page.$$eval('#f4ATiers .tier-row', (r) => r.map((x) => x.querySelector('.t-dari').value + '-' + x.querySelector('.t-sampai').value + ':' + x.querySelector('.t-rate').value).join(' ')), '1-48:8,34 49-264:13,14');
    check('isi dari Fitur 3: angsuran awal A = Rp 3.312.133', (await cmpRow('Angsuran bulan 1'))[1], 'Rp 3.312.133');

    // Masa tetap lebih pendek dari tenor tanpa asumsi floating → error.
    await f4({ harga: '100.000.000', tenor: '120', tiers: '9', bFix: '9', bFixM: '36', bFloat: '' });
    check('tanpa asumsi floating → error', await txt(page, '#f4Alert'), contains('B: Asumsi bunga floating belum diisi'));
    check('tidak ada pilihan MMQ', await page.$$eval('#v4', (v) => /MMQ/.test(v[0].textContent)), false);
    await page.click('#f4Reset');
    check('grafik tergambar', await page.$$eval('#f4Chart path', (p) => p.length), (v) => v >= 3);
  }

  console.log('#13 Tidak ada scroll horizontal halaman');
  // Isi tab dengan data terbesar (jadwal 264 bulan, 2 jenjang + sakelar sisa pokok) sebelum mengukur.
  await f3Setup(page, '400.000.000', '264', [[1, 48, '8,34'], [49, 264, '13,14']], '11,98');
  await page.check('#f3Toggle');
  await f2Setup(page, '100.000.000', '36', 'total', '27', 'anuitas');
  await page.check('#f2Toggle');
  for (const w of [390, 820, 1280]) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const t of hasF4 ? [1, 2, 3, 4] : [1, 2, 3]) {
      await page.evaluate((n) => FinUI.showTab(n), t);
      const m = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      check(w + 'px tab ' + t + ' scrollWidth === clientWidth', m[0] + '/' + m[1], () => m[0] === m[1]);
    }
  }

  console.log('Istilah: tidak ada kata terlarang di UI');
  // Fitur 1–3 (sisi syariah): semua istilah terlarang. Seluruh halaman: tanpa "cicilan", "IRR", rujukan fatwa.
  const body = (await page.evaluate(() => ['header', '#v1', '#v2', '#v3'].map((q) => document.querySelector(q).textContent).join(' '))).toLowerCase();
  for (const w of ['cicilan', 'bunga', 'pinjaman', 'irr', 'dsn-mui', 'fatwa', 'rate']) check('F1–F3 tidak memuat "' + w + '"', new RegExp('\\b' + w + '\\b').test(body), false);
  const all = (await page.evaluate(() => document.querySelector('main').textContent)).toLowerCase();
  for (const w of ['cicilan', 'irr', 'dsn-mui', 'fatwa', 'rate']) check('halaman tidak memuat "' + w + '"', new RegExp('\\b' + w + '\\b').test(all), false);

  await page.evaluate(() => FinUI.showTab(1));
  await page.click('#f1Reset');
  check('F1 keterangan margin efektif ringkas', await page.$$eval('#f1Table tbody tr', (t) => t.find((tr) => tr.cells[0].innerText.trim() === 'Margin Efektif p.a.').cells[1].innerText.trim()), 'Dicari dari rumus anuitas*');
  check('F1 catatan rumus anuitas', await txt(page, '#f1Footnote'), contains('Margin efektif p.a. = i × 12'));
  check('tidak memuat "Margin Total"', /margin total/i.test(all), false);
  check('tidak memuat label "BARU"', /\bBARU\b/.test(await page.evaluate(() => document.querySelector('main').textContent)), false);
  check('tidak ada error JavaScript', jsErrors.join('; '), '');
  await browser.close();
  console.log('\n' + passes + ' lolos, ' + failures + ' gagal');
  process.exit(failures ? 1 : 0);
})();
